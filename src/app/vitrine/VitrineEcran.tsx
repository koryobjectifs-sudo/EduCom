"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ChevronRight, FolderOpen, ReceiptText, FileText, AlertTriangle, X } from "lucide-react";
import AppTopBar from "@/components/layout/AppTopBar";
import MobileTabBar from "@/components/layout/MobileTabBar";
import MobileSpaceTabs from "@/components/layout/MobileSpaceTabs";
import { getVisibleSpaces, getActiveSpaceId, type NavSpace } from "@/lib/navigation";
import SecondaireTable from "@/app/dashboard/grades/secondaire/SecondaireTable";
import { TakeAttendanceClient } from "@/app/dashboard/attendance/take/TakeAttendanceClient";
import { AvatarPhoto } from "@/app/dashboard/students/[id]/AvatarPhoto";
import { ScanDialog } from "@/app/dashboard/students/[id]/dossier/ScanDialog";
import FamillesClient from "@/app/dashboard/payments/familles/FamillesClient";
import { NewInvoiceForm } from "@/app/dashboard/payments/new/form";
import type { FamilyRow, FamiliesSummary } from "@/lib/finance/familyService";

import { CHEMIN_VITRINE, ecranPourChemin, type EcranVitrine } from "./ecrans";

const ECOLE = "Groupe Scolaire Excellence";
const MESSAGE_DEMO = "Aperçu d'EduCom : créez votre école pour enregistrer vos propres données.";

/*
 * La vitrine SIMULE un téléphone, quel que soit l'appareil du visiteur :
 *  - `capture` : `ScanDialog` teste `"capture" in input` pour proposer
 *    « Scanner » avec l'appareil photo. Absent des navigateurs de bureau, on
 *    le déclare ici (route vitrine uniquement) pour montrer l'écran du téléphone.
 *  - `pointer-coarse:` : « Prendre une photo » (AvatarPhoto) n'apparaît que sur
 *    écran tactile ; la règle CSS ci-dessous le force dans la vitrine.
 */
if (typeof window !== "undefined" && !("capture" in HTMLInputElement.prototype)) {
  Object.defineProperty(HTMLInputElement.prototype, "capture", { value: "", writable: true, configurable: true });
}
const SIMULATION_TACTILE = `[data-vitrine] .pointer-coarse\\:flex{display:flex!important}`;
/** Messages (sonner) en haut de l'écran : en bas, ils couvriraient la barre d'onglets. */
const MESSAGES_EN_HAUT = `[data-sonner-toaster]{top:64px!important;bottom:auto!important}`;

/**
 * Espaces de l'Administrateur, tels que la barre du bas les affiche. Seule
 * retouche : Finance ouvre « Familles » (la « Vue financière » est un écran
 * serveur branché sur la base, absent de la vitrine).
 */
function espacesVitrine(): NavSpace[] {
  return getVisibleSpaces("OWNER").map((s) =>
    s.id === "finance" ? { ...s, defaultHref: CHEMIN_VITRINE.finances } : s,
  );
}

/** Nom affiché par le produit pour une adresse (onglet, rubrique « Plus »…). */
function nomPourChemin(href: string, spaces: NavSpace[]): string {
  const chemin = href.split(/[?#]/)[0];
  if (chemin === "/dashboard") return "Accueil";
  for (const sp of spaces) {
    if (sp.defaultHref === chemin) return sp.fullLabel ?? sp.label;
    for (const it of sp.sections.flatMap((x) => x.items)) if (it.href.split("?")[0] === chemin) return it.name;
  }
  return "Cet écran";
}

/** L'appel à une server action porte l'en-tête `Next-Action`. */
function estServerAction(init?: RequestInit): boolean {
  const h = init?.headers;
  if (!h) return false;
  if (h instanceof Headers) return h.has("next-action");
  if (Array.isArray(h)) return h.some(([k]) => k.toLowerCase() === "next-action");
  return Object.keys(h).some((k) => k.toLowerCase() === "next-action");
}

export default function VitrineEcran({ ecran }: { ecran: EcranVitrine }) {
  const router = useRouter();
  const [spaces] = useState(espacesVitrine);
  const chemin = CHEMIN_VITRINE[ecran];
  const activeId = getActiveSpaceId(chemin, spaces);
  const activeSpace = spaces.find((s) => s.id === activeId);
  const [tour, setTour] = useState(0);
  const [indispo, setIndispo] = useState<string | null>(null);
  const ecranRef = useRef(ecran);
  useEffect(() => {
    ecranRef.current = ecran;
  }, [ecran]);
  // Chaque écran ouvert (ou rejoué) repart du haut, comme une vraie page.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [ecran, tour]);

  const ouvrir = useCallback(
    (cible: EcranVitrine) => {
      setIndispo(null);
      if (cible === ecranRef.current) setTour((t) => t + 1);
      else router.push(`/vitrine/${cible}`);
    },
    [router],
  );

  /*
   * ═══ VITRINE INTERACTIVE (25 sept. 2026, demande Kory) ═══
   * Le visiteur touche les vrais boutons : barre du bas, onglets, « Plus »,
   * « Encaisser », « Aperçu A4 »… Garde-fous, tous côté navigateur et limités
   * à cette route :
   *  - liens du produit : l'adresse ouvre l'écran de vitrine correspondant
   *    (`ecranPourChemin`), sinon une fiche « disponible dans votre espace » —
   *    jamais la vraie page (elle exigerait une connexion) ;
   *  - envois de formulaire et server actions : bloqués avant tout réseau,
   *    avec un message d'aperçu. Les actions restent de toute façon refusées
   *    côté serveur (`requireActionContext` : pas de session) ;
   *  - impression et fenêtres (`print`, `open` : Télécharger, Envoyer) : neutralisées.
   * Chaque toucher prévient la landing (`vitrine:interaction`) pour suspendre
   * la rotation automatique pendant que le visiteur explore.
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.dataset.vitrineLibre !== undefined) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#") || /^(https?:|mailto:|tel:)/.test(href)) {
        if (!href.startsWith("#")) e.preventDefault();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      const cible = ecranPourChemin(href);
      if (cible) ouvrir(cible);
      else setIndispo(nomPourChemin(href, spaces));
    };
    const onSubmit = (e: SubmitEvent) => {
      e.preventDefault();
      e.stopPropagation();
      toast.info(MESSAGE_DEMO, { duration: 2500 });
    };
    const onPointer = (e: PointerEvent) => {
      if (e.isTrusted && window.parent !== window) {
        window.parent.postMessage({ type: "vitrine:interaction" }, window.location.origin);
      }
    };
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== "vitrine:activer") return;
      const cible = e.data.ecran as EcranVitrine;
      if (cible) ouvrir(cible);
    };

    const fetchOrigine = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (estServerAction(init)) {
        toast.info(MESSAGE_DEMO, { duration: 2500 });
        return Promise.reject(new Error(MESSAGE_DEMO));
      }
      return fetchOrigine(input, init);
    };
    const printOrigine = window.print;
    const openOrigine = window.open;
    window.print = () => toast.info(MESSAGE_DEMO, { duration: 2500 });
    window.open = () => {
      toast.info(MESSAGE_DEMO, { duration: 2500 });
      return null;
    };

    window.addEventListener("click", onClick, true);
    window.addEventListener("submit", onSubmit, true);
    window.addEventListener("pointerdown", onPointer, true);
    window.addEventListener("message", onMessage);
    return () => {
      window.fetch = fetchOrigine;
      window.print = printOrigine;
      window.open = openOrigine;
      window.removeEventListener("click", onClick, true);
      window.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pointerdown", onPointer, true);
      window.removeEventListener("message", onMessage);
    };
  }, [ouvrir, spaces]);

  return (
    <div data-vitrine className="flex min-h-dvh flex-col bg-ground" style={{ backgroundColor: "var(--color-frame-bg, #0E2541)" }}>
      <style>{SIMULATION_TACTILE + MESSAGES_EN_HAUT}</style>
      <AppTopBar schoolName={ECOLE} userRole="OWNER" activeSpace={activeSpace} />
      <main className="flex-1 bg-ground pb-[calc(4rem+env(safe-area-inset-bottom))]">
        {activeSpace && <MobileSpaceTabs space={activeSpace} pathnameOverride={chemin} />}
        <div key={`${ecran}-${tour}`} className="p-3">
          {ecran === "notes" && <SecondaireTable ctx={NOTES} />}
          {ecran === "appel" && (
            <TakeAttendanceClient classId="c-cm2a" className="CM2 A" date="2026-10-06" initialData={APPEL} />
          )}
          {ecran === "profil" && <Profil />}
          {ecran === "scan" && <Scan />}
          {ecran === "finances" && <FamillesClient initialFamilies={FAMILLES} summary={RESUME} canCollect />}
          {ecran === "facture" && <Facture />}
        </div>
      </main>
      <MobileTabBar
        key={`barre-${ecran}-${tour}`}
        spaces={spaces}
        activeSpaceId={activeId}
        userRole="OWNER"
        userName="Mariama Sow"
        schoolName={ECOLE}
        pathnameOverride={chemin}
      />
      {indispo && <FicheIndisponible nom={indispo} onClose={() => setIndispo(null)} />}
    </div>
  );
}

/**
 * Destination sans écran de vitrine : on nomme la vraie page (son nom dans le
 * produit) sans rien en inventer, et on propose de créer son école.
 */
function FicheIndisponible({ nom, onClose }: { nom: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60]">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-label={nom} className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-surface p-5 pb-8 shadow-overlay">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-soft">Dans votre espace EduCom</p>
            <p className="mt-1 text-lg font-bold text-text">{nom}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="flex h-10 w-10 items-center justify-center rounded-full text-text-soft hover:bg-sunk">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-soft">
          Cet écran s&apos;ouvre avec les données de votre établissement. Créez votre école pour y accéder.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <a
            href="/register"
            target="_top"
            data-vitrine-libre
            className="flex min-h-12 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-white"
          >
            Créer mon école
          </a>
          <button type="button" onClick={onClose} className="min-h-11 rounded-xl text-sm font-semibold text-text-soft">
            Continuer l&apos;aperçu
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Facturation : le vrai formulaire « Nouvelle Facture » ─────────────── */

/** Points de passage d'une signature manuscrite, en coordonnées du canevas (400 × 150). */
const SIGNATURE: [number, number][][] = [
  [[58, 100], [70, 50], [92, 28], [104, 48], [86, 88], [72, 112], [92, 104], [116, 72], [130, 62], [134, 88],
   [148, 76], [162, 60], [170, 86], [186, 72], [202, 56], [210, 84], [228, 70], [250, 58], [290, 50], [335, 38]],
  [[78, 122], [160, 114], [250, 110], [345, 100]],
];

/** Lisse chaque trait (Catmull-Rom) pour un geste continu. */
function traceSignature(): { x: number; y: number }[][] {
  return SIGNATURE.map((pts) => {
    const P = [pts[0], ...pts, pts[pts.length - 1]];
    const out: { x: number; y: number }[] = [];
    for (let i = 1; i < P.length - 2; i++) {
      const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
      for (let k = 0; k < 8; k++) {
        const t = k / 8, t2 = t * t, t3 = t2 * t;
        const c = (j: 0 | 1) =>
          0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
            (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3);
        out.push({ x: c(0), y: c(1) });
      }
    }
    const [x, y] = pts[pts.length - 1];
    out.push({ x, y });
    return out;
  });
}

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Saisit une valeur dans un champ contrôlé par React, comme au clavier. */
function saisir(el: HTMLInputElement | null, valeur: string) {
  if (!el) return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(el, valeur);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function Facture() {
  const zone = useRef<HTMLDivElement>(null);

  /*
   * Démonstration jouée sur le VRAI formulaire (`NewInvoiceForm`) : une ligne
   * saisie, la signature tracée au doigt sur le vrai `SignaturePad`, puis
   * l'onglet « Aperçu A4 » ouvert sur la facture signée. Aucune donnée
   * n'est créée. S'arrête dès que le visiteur touche l'écran.
   */
  useEffect(() => {
    let stop = false;
    const arreter = (e: PointerEvent) => {
      if (e.isTrusted) stop = true;
    };
    window.addEventListener("pointerdown", arreter, true);

    (async () => {
      const racine = zone.current;
      if (!racine) return;
      await attendre(700);
      const desc = racine.querySelector<HTMLInputElement>('input[placeholder="Description"]');
      const texte = "Scolarité octobre";
      for (let i = 1; i <= texte.length && !stop; i++) {
        saisir(desc, texte.slice(0, i));
        await attendre(45);
      }
      if (stop) return;
      saisir(racine.querySelector<HTMLInputElement>('input[placeholder="Prix"]'), "35000");
      saisir(racine.querySelector<HTMLInputElement>("#dueDate"), "2026-10-05");
      await attendre(400);

      const canvas = racine.querySelector<HTMLCanvasElement>("canvas");
      if (!canvas || stop) return;
      canvas.scrollIntoView({ block: "center", behavior: "smooth" });
      await attendre(700);
      for (const trait of traceSignature()) {
        if (stop) return;
        const r = canvas.getBoundingClientRect();
        const ev = (type: string, p: { x: number; y: number }) =>
          canvas.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              clientX: r.left + (p.x * r.width) / canvas.width,
              clientY: r.top + (p.y * r.height) / canvas.height,
            }),
          );
        ev("mousedown", trait[0]);
        await attendre(40); // laisse React activer le tracé (`isDrawing`)
        for (const p of trait.slice(1)) {
          if (stop) break;
          ev("mousemove", p);
          await attendre(12);
        }
        ev("mouseup", trait[trait.length - 1]);
        await attendre(150);
      }
      if (stop) return;
      await attendre(700);
      const apercu = Array.from(racine.querySelectorAll("button")).find((b) => b.textContent?.trim() === "Aperçu A4");
      apercu?.click();
      await attendre(400);
      if (stop) return;
      racine.querySelector('img[alt="Signature"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
    })();

    return () => {
      stop = true;
      window.removeEventListener("pointerdown", arreter, true);
    };
  }, []);

  return (
    <div ref={zone}>
      <NewInvoiceForm students={ELEVES} school={ECOLE_FACTURE} initialStudentId="e1" nextInvoiceNumber="FAC-2026-0143" />
    </div>
  );
}

/* ─────────────── Fiche élève : en-tête repris de students/[id]/page.tsx ─────────────── */

const ACTION_BASE =
  "inline-flex items-center justify-center gap-2 rounded-control px-3 h-10 text-role-label font-medium shadow-card transition-colors";
const ACTION_PRINCIPALE = `${ACTION_BASE} bg-white text-band border border-transparent`;
const ACTION_NEUTRE = `${ACTION_BASE} bg-white/10 text-white border border-white/30`;
const SECTIONS = ["Vue générale", "Scolarité", "Présence", "Notes", "Finance", "Famille & urgence", "Documents"];

function Profil() {
  // Ouvre le vrai menu de l'avatar (« Importer une photo », et « Prendre une
  // photo » sur écran tactile) comme le ferait un clic.
  useEffect(() => {
    const t = setTimeout(() => {
      document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')?.click();
    }, 1200);
    return () => clearTimeout(t);
  }, []);

  return (
    <header className="relative rounded-surface bg-band p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-white/70">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        </span>
        <ol className="flex flex-wrap items-center gap-1 text-role-meta text-white/60">
          <li>Accueil</li>
          <li className="flex items-center gap-1"><ChevronRight aria-hidden="true" className="h-3 w-3" />Élèves &amp; dossiers</li>
          <li className="flex items-center gap-1"><ChevronRight aria-hidden="true" className="h-3 w-3" /><span className="text-white/85">Fiche élève</span></li>
        </ol>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="shrink-0">
            <AvatarPhoto studentId="demo-awa" initiales="AD" photoUrl={null} modifiable />
          </div>
          <div className="min-w-0">
            <p className="text-role-meta font-medium uppercase tracking-wide text-white/60">Élève</p>
            <h1 className="mt-1 text-[30px] font-semibold leading-tight tracking-tight text-white">Awa Diop</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 text-role-label">
              <span className="text-white/70"><span className="text-white/50">Matricule</span> <span className="font-medium text-white tabular-nums">A7F3C2</span></span>
              <span className="text-white/70"><span className="text-white/50">Classe</span> <span className="font-medium text-white">CM2 A</span></span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/15 px-2.5 py-1 text-role-meta font-medium text-white ring-1 ring-inset ring-white/25">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-pill bg-white/80" />Inscrit
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-pill bg-warning/20 px-2.5 py-1 text-role-meta font-semibold text-white ring-1 ring-inset ring-warning/40">
                <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" />Dossier 60 % complet
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ACTION_PRINCIPALE}><FolderOpen aria-hidden="true" className="h-4 w-4" /> Dossier</span>
          <span className={ACTION_NEUTRE}><FileText aria-hidden="true" className="h-4 w-4" /> Documents</span>
          <span className={ACTION_NEUTRE}><ReceiptText aria-hidden="true" className="h-4 w-4" /> Facturer</span>
        </div>
      </div>
      <nav className="-mx-5 mt-5 overflow-x-auto px-5">
        <ul className="flex min-w-max items-center gap-6">
          {SECTIONS.map((s, i) => (
            <li key={s}>
              <span className={`inline-flex items-center whitespace-nowrap rounded-t-control px-3 pt-2.5 pb-2 text-role-label font-medium ${i === 0 ? "bg-surface text-band shadow-card" : "text-white/70"}`}>
                {s}
              </span>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

/* ─────────────── Scan : la vraie fenêtre d'ajout de pièce, ouverte en mode scan ─────────────── */

function Scan() {
  const [open, setOpen] = useState(true);
  return (
    <>
      <p className="p-2 text-role-meta text-text-faint">
        <Link href="#">Dossier de Awa Diop</Link>
      </p>
      <ScanDialog
        open={open}
        onClose={() => setOpen(true)}
        studentId="demo-awa"
        studentName="Awa Diop"
        intent="scan"
        defaultCategory="IDENTITE"
        lines={[
          { requirementId: "r1", label: "Extrait de naissance", category: "IDENTITE", hasDocument: false },
          { requirementId: "r2", label: "Bulletin de l'année précédente", category: "SCOLARITE", hasDocument: true },
          { requirementId: "r3", label: "Certificat de scolarité", category: "SCOLARITE", hasDocument: false },
        ]}
      />
    </>
  );
}

/* ─────────────── Données d'exemple ─────────────── */

const NOTES = {
  ok: true as const,
  classId: "c-3a", className: "3e A",
  subjectId: "s-maths", subjectName: "Mathématiques", coefficient: 4,
  termId: "t1", termName: "1er trimestre",
  canEdit: true,
  allTerms: [{ id: "t1", name: "1er trimestre" }, { id: "t2", name: "2e trimestre" }, { id: "t3", name: "3e trimestre" }],
  allSubjects: [{ id: "s-maths", name: "Mathématiques", coefficient: 4 }, { id: "s-fr", name: "Français", coefficient: 4 }],
  allClasses: [{ id: "c-3a", name: "3e A" }],
  lignes: [
    ["Ndiaye", "Aïssatou", [15, 14], 16, 15.25, 15.63],
    ["Diop", "Moussa", [13, 12.5], 14, 12.75, 13.38],
    ["Sarr", "Fatou", [17.5, 18], 18, 17.75, 17.88],
    ["Fall", "Babacar", [11, 12], 12, 11.5, 11.75],
    ["Ba", "Mariama", [14, 15.5], 15, 14.75, 14.88],
  ].map(([lastName, firstName, dv, compo, md, mm], i) => ({
    studentId: `e${i}`,
    firstName: firstName as string,
    lastName: lastName as string,
    devoirs: (dv as number[]).map((value, j) => ({ gradeId: `g${i}${j}`, value })),
    composition: { gradeId: `c${i}`, value: compo as number },
    appreciation: "",
    md: md as number,
    mm: mm as number,
  })),
};

const APPEL = [
  ["Ndiaye", "Aïssatou", "PRESENT"],
  ["Diop", "Moussa", "ABSENT"],
  ["Sarr", "Fatou", "LATE"],
  ["Fall", "Babacar", "PRESENT"],
  ["Ba", "Mariama", "PRESENT"],
  ["Gueye", "Ousmane", "PRESENT"],
].map(([lastName, firstName, status], i) => ({
  student: { id: `e${i}`, firstName, lastName, matricule: `MAT-04${80 + i}` },
  attendance: { status, reason: null },
}));

const d = (j: number) => new Date(2026, 9, j);
const FAMILLES: FamilyRow[] = [
  {
    id: "f1", parentId: "p1", familyName: "Famille Diop", guardianName: "Ibrahima Diop",
    guardianPhone: "+221 77 000 00 01", guardianEmail: null,
    children: [{ id: "e1", firstName: "Awa", lastName: "Diop", matricule: "A7F3C2", className: "CM2 A" }],
    invoices: [], unpaidInvoices: [
      { id: "i1", invoiceNumber: "2026-0142", title: "Scolarité octobre", month: "2026-10", totalAmount: 35000, paidAmount: 0, reliquat: 35000, dueDate: d(5), status: "OVERDUE", studentId: "e1", studentName: "Awa Diop" },
    ],
    totalDue: 35000, totalPaid: 0, reliquat: 35000, status: "OVERDUE", hasOverdue: true,
  },
  {
    id: "f2", parentId: "p2", familyName: "Famille Sarr", guardianName: "Aminata Sarr",
    guardianPhone: "+221 76 000 00 02", guardianEmail: null,
    children: [{ id: "e2", firstName: "Fatou", lastName: "Sarr", matricule: "B21D90", className: "5e A" }],
    invoices: [], unpaidInvoices: [
      { id: "i2", invoiceNumber: "2026-0143", title: "Scolarité octobre", month: "2026-10", totalAmount: 40000, paidAmount: 20000, reliquat: 20000, dueDate: d(10), status: "PARTIAL", studentId: "e2", studentName: "Fatou Sarr" },
    ],
    totalDue: 40000, totalPaid: 20000, reliquat: 20000, status: "PARTIAL", hasOverdue: false,
  },
  {
    id: "f3", parentId: "p3", familyName: "Famille Ba", guardianName: "Moussa Ba",
    guardianPhone: "+221 78 000 00 03", guardianEmail: null,
    children: [{ id: "e3", firstName: "Mariama", lastName: "Ba", matricule: "C44A17", className: "3e A" }],
    invoices: [], unpaidInvoices: [],
    totalDue: 45000, totalPaid: 45000, reliquat: 0, status: "UP_TO_DATE", hasOverdue: false,
  },
];
const RESUME: FamiliesSummary = {
  totalFamilies: 3, upToDateCount: 1, partialCount: 1, overdueCount: 1,
  totalDue: 120000, totalPaid: 65000, totalReliquat: 55000,
};

const ELEVES = [
  ["e1", "Awa", "Diop", "c-cm2a", "CM2 A"],
  ["e2", "Fatou", "Sarr", "c-5a", "5e A"],
  ["e3", "Mariama", "Ba", "c-3a", "3e A"],
].map(([id, firstName, lastName, classId, name]) => ({
  id, firstName, lastName,
  enrollments: [{ classId, class: { id: classId, name } }],
  invoices: [],
}));

/** Établissement d'exemple SANS signature enregistrée : le formulaire propose alors le tracé. */
const ECOLE_FACTURE = {
  name: ECOLE,
  address: "Sicap Liberté 6, Dakar",
  phone: "+221 33 800 00 00",
  email: null,
  signature: null,
  stamp: null,
};
