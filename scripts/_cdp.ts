/**
 * Pilotage réel de Chrome par le protocole DevTools — outil partagé des sondes.
 *
 * ═══ POURQUOI CE MODULE EXISTE ═══
 *
 * ⚠️ La technique du lot 14 (`verify-responsive.ts`) enregistrait le HTML dans un
 * fichier et le faisait photographier par Chrome. Depuis `file://`, le
 * JavaScript de Next ne s'exécute pas : React n'hydrate rien, et la capture ne
 * montre qu'une coquille. Pire, `--screenshot` n'attend jamais une page dont la
 * WebSocket de rechargement à chaud reste ouverte — Chrome écrit l'image puis
 * ne rend pas la main.
 *
 * Ici, Chrome est **piloté** : vraie URL, vrai cookie de session, JavaScript
 * exécuté, actions serveur qui répondent. On mesure ensuite le DOM réellement
 * peint. `WebSocket` est celui de Node — **aucune dépendance ajoutée**, ce qui
 * compte dans un dépôt servi sur des connexions sénégalaises.
 *
 * ⚠️ Une sonde qui utilise ce module doit **refuser de conclure** si le marqueur
 * d'hydratation n'apparaît pas, au lieu d'annoncer « responsive OK » sur une
 * page vide. Le marqueur doit être **unique à l'état attendu** : au lot 16.1,
 * attendre « pièce(s) » — une chaîne déjà présente ailleurs — a produit un faux
 * vert avant d'être corrigé.
 *
 * Extrait de `verify-responsive-export.ts` (lot 16.1) au lot 17, sans changer
 * la technique : deux copies auraient divergé.
 */
import { execFile, type ChildProcess } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

export const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export function chromeAvailable(): boolean {
  return existsSync(CHROME);
}

/* ═══════════════════ client DevTools minimal ═══════════════════ */

type Cmd = { id: number; method: string; params?: unknown; sessionId?: string };

export class CDP {
  private ws!: WebSocket;
  private seq = 0;
  private waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private listeners: { method: string; resolve: () => void }[] = [];

  static async open(url: string): Promise<CDP> {
    const c = new CDP();
    c.ws = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      c.ws.addEventListener("open", () => resolve(), { once: true });
      c.ws.addEventListener("error", () => reject(new Error("WebSocket DevTools refusée")), { once: true });
    });
    c.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String((ev as MessageEvent).data)) as { id?: number; result?: unknown; error?: { message: string }; method?: string };
      if (msg.id !== undefined) {
        const w = c.waiting.get(msg.id);
        if (!w) return;
        c.waiting.delete(msg.id);
        if (msg.error) w.reject(new Error(msg.error.message)); else w.resolve(msg.result);
        return;
      }
      if (msg.method) {
        for (const l of [...c.listeners]) {
          if (l.method === msg.method) { c.listeners.splice(c.listeners.indexOf(l), 1); l.resolve(); }
        }
      }
    });
    return c;
  }

  send<T = Record<string, unknown>>(method: string, params?: unknown, sessionId?: string): Promise<T> {
    const id = ++this.seq;
    const cmd: Cmd = { id, method, params, sessionId };
    return new Promise<T>((resolve, reject) => {
      this.waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.ws.send(JSON.stringify(cmd));
      setTimeout(() => {
        if (this.waiting.delete(id)) reject(new Error(`${method} sans réponse après 30 s`));
      }, 30_000);
    });
  }

  once(method: string, timeoutMs = 20_000): Promise<void> {
    return new Promise<void>((resolve) => {
      const entry = { method, resolve };
      this.listeners.push(entry);
      setTimeout(() => {
        const i = this.listeners.indexOf(entry);
        if (i >= 0) { this.listeners.splice(i, 1); resolve(); }
      }, timeoutMs);
    });
  }

  close() { try { this.ws.close(); } catch { /* déjà fermée */ } }
}

/** Démarre Chrome sans interface et rend la main quand DevTools répond. */
export async function launchChrome(port: number, profileDir: string): Promise<{ chrome: ChildProcess; wsUrl: string } | null> {
  // ⚠️ `--headless=old` : `--headless=new` se bloque indéfiniment sur cette
  // machine, y compris sur une page triviale. Constaté au lot 16.1.
  const chrome = execFile(CHROME, [
    "--headless=old", "--disable-gpu", "--no-sandbox", "--no-first-run",
    "--disable-background-networking", "--disable-extensions", "--no-default-browser-check",
    `--remote-debugging-port=${port}`, `--user-data-dir=${profileDir}`, "about:blank",
  ]);
  let wsUrl = "";
  for (let i = 0; i < 40 && !wsUrl; i++) {
    try {
      const v = await fetch(`http://127.0.0.1:${port}/json/version`).then((r) => r.json() as Promise<{ webSocketDebuggerUrl: string }>);
      wsUrl = v.webSocketDebuggerUrl;
    } catch { await new Promise((r) => setTimeout(r, 500)); }
  }
  if (!wsUrl) { chrome.kill(); return null; }
  return { chrome, wsUrl };
}

/** Évalue une expression dans la page et renvoie sa valeur. */
export async function evaluate<T>(cdp: CDP, session: string, expression: string): Promise<T> {
  const r = await cdp.send<{ result: { value: T }; exceptionDetails?: { text: string } }>(
    "Runtime.evaluate",
    { expression, returnByValue: true, awaitPromise: true },
    session,
  );
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}

/** Attend qu'une condition soit vraie DANS la page — preuve que React a rendu. */
export async function waitFor(cdp: CDP, session: string, expression: string, ms = 20_000): Promise<boolean> {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    try { if (await evaluate<boolean>(cdp, session, `!!(${expression})`)) return true; }
    catch { /* la page navigue encore */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

/* ═══════════════════ session applicative réelle ═══════════════════ */

/**
 * Ouvre une vraie session Supabase et renvoie les cookies que Next attend.
 *
 * ⚠️ Sans cette étape, on mesure la page de connexion et on croit mesurer
 * l'écran. Le compte est créé par la sonde et supprimé après.
 */
export async function sessionCookies(email: string, password: string) {
  const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw new Error(error?.message ?? "session absente");
  const jar = new Map<string, string>();
  const ssr = createServerClient(URL_, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (l) => { for (const c of l) jar.set(c.name, c.value); },
    },
  });
  await ssr.auth.setSession({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  return [...jar].map(([name, value]) => ({ name, value }));
}

/* ═══════════════════ mesures du DOM peint ═══════════════════ */

/**
 * Expression évaluée dans la page.
 *
 * ⚠️ `tapH` mesure la **cible tactile** — le `label` ou le `button` englobant —
 * et non le dessin du contrôle. Une case de 20 px dans un label de 44 px se
 * touche parfaitement ; mesurer la case aurait fait échouer un écran correct,
 * et « corriger » ce faux échec aurait abîmé la mise en page pour rien.
 */
export const MEASURE = `(() => {
  // ⚠️ PIÈGE CORRIGÉ LE 19 AOÛT 2026 — \`getBoundingClientRect()\` est relatif au
  // VIEWPORT. Si la page a défilé horizontalement (un champ qui prend le focus
  // suffit), un bloc de 800 px commençant à x = -457 rend \`right = 390\` : il
  // n'était donc PAS signalé, alors que \`scrollWidth\` valait bien 847. La sonde
  // annonçait « aucun élément hors de l'écran » en même temps qu'un débordement
  // de 457 px — deux résultats contradictoires produits par le même bug.
  // Correction : on revient à l'origine AVANT de mesurer, et on raisonne en
  // coordonnées DOCUMENT (\`right + scrollX\`), pas en coordonnées écran.
  window.scrollTo(0, 0);
  const vw = window.innerWidth;
  const sx = window.scrollX;
  const docRight = (e) => e.getBoundingClientRect().right + sx;
  const all = [...document.querySelectorAll("body *")];
  const offenders = all
    .filter((e) => {
      const r = e.getBoundingClientRect();
      if (r.width <= 0) return false;
      // Un élément peut légitimement dépasser s'il est confiné dans un ancêtre
      // qui défile : c'est le cas de l'aperçu A4 du générateur. On ne retient
      // que ce qui élargit réellement la PAGE.
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox === "auto" || ox === "scroll" || ox === "hidden") return false;
      }
      return docRight(e) > vw + 1;
    })
    .slice(0, 8)
    .map((e) => e.tagName.toLowerCase() + "." + String(e.className || "").split(" ")[0] + " → " + Math.round(docRight(e)) + "px");
  const buttons = [...document.querySelectorAll("button, a[href], input, select")].map((b) => {
    const r = b.getBoundingClientRect();
    const target = b.closest("label, button") || b;
    const tr = target.getBoundingClientRect();
    return {
      text: (b.getAttribute("aria-label") || b.textContent || b.tagName).trim().slice(0, 32),
      w: Math.round(r.width), h: Math.round(r.height),
      tapH: Math.round(tr.height), kind: b.tagName.toLowerCase(),
      inside: r.right <= vw + 1 && r.left >= -1,
      visible: r.width > 0 && r.height > 0,
    };
  });
  const tronques = all.filter((e) => {
    const r = e.getBoundingClientRect();
    // ⚠️ Un élément \`sr-only\` mesure 1 px et masque son contenu : il est
    // tronqué EXPRÈS, pour les lecteurs d'écran. Le compter comme défaut
    // produirait un échec qu'on ne peut corriger qu'en abîmant l'accessibilité.
    if (r.width <= 2 || r.height <= 2) return false;
    return e.children.length === 0 && (e.textContent || "").trim().length > 0 && e.scrollWidth > e.clientWidth + 2;
  });
  const etiquette = (e) => (e.textContent || "").trim().slice(0, 40);
  // ⚠️ Certaines troncatures sont des DÉCISIONS, pas des défauts : un nom
  // d'école dans une barre de 64 px de haut ne peut pas passer à la ligne. Le
  // marqueur \`data-tronque-volontaire\` les sort du verdict — mais elles sont
  // renvoyées à part, et affichées, pour qu'aucune ne disparaisse en silence.
  // Le poser sans que la valeur complète soit lisible ailleurs serait une
  // triche : c'est la seule règle attachée à cet attribut.
  const clipped = tronques.filter((e) => !e.closest("[data-tronque-volontaire]")).slice(0, 5).map(etiquette);
  const clippedAssume = tronques.filter((e) => e.closest("[data-tronque-volontaire]")).slice(0, 5).map(etiquette);
  return {
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    vw, offenders, buttons, clipped, clippedAssume,
    // ⚠️ C'était 4 000 caractères. La page d'accueil en fait ~9 000 : la
    // sonde déclarait « les tarifs n'apparaissent pas sur l'accueil » alors
    // qu'ils y étaient, simplement au-delà de la troncature. Une limite de
    // l'instrument lue comme un défaut du produit — le pire genre de faux
    // positif, parce qu'il pousse à « corriger » du code qui va bien.
    text: document.body.innerText.replace(/\\s+/g, " ").slice(0, 40000),
    tables: document.querySelectorAll("table").length,
  };
})()`;

export type Measure = {
  scrollWidth: number; clientWidth: number; vw: number;
  offenders: string[];
  buttons: { text: string; w: number; h: number; tapH: number; kind: string; inside: boolean; visible: boolean }[];
  clipped: string[];
  /** Troncatures explicitement assumées (voir MEASURE). Jamais un échec, jamais tues. */
  clippedAssume: string[];
  text: string;
  tables: number;
};

export async function measure(cdp: CDP, session: string): Promise<Measure> {
  return evaluate<Measure>(cdp, session, MEASURE);
}

export async function shot(cdp: CDP, session: string, dir: string, name: string): Promise<string> {
  const r = await cdp.send<{ data: string }>("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, session);
  const file = join(dir, `${name}.png`);
  writeFileSync(file, Buffer.from(r.data, "base64"));
  return file;
}

export const MOBILE = { width: 390, height: 844, label: "mobile 390 × 844" };
export const DESKTOP = { width: 1440, height: 900, label: "bureau 1440 × 900" };
