/**
 * Interprétation des résultats — 26 sept. 2026 (sans IA).
 *
 * Kory a annulé la clé IA : les résultats des sondages et des formulaires sont
 * lus par des règles simples et transparentes, calculées ici. Aucune donnée ne
 * quitte le serveur. Chaque phrase affichée se vérifie à la main à partir des
 * chiffres : pas de « tendance » inventée sous un seuil minimal de réponses.
 *
 * Module PUR (aucun accès base) : testé par `scripts/verify-interpretation.ts`.
 */

export type Ton = "positif" | "neutre" | "alerte";
export type Icone = "participation" | "consensus" | "partage" | "satisfaction" | "alerte" | "mots" | "nps" | "rythme" | "profil";
export type Constat = { ton: Ton; icone: Icone; titre: string; texte: string };

/** En dessous, on montre les chiffres sans en tirer de conclusion. */
export const MIN_REPONSES = 3;

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0);
const virgule = (n: number, d = 1) => n.toFixed(d).replace(".", ",");
const pluriel = (n: number, mot: string, motPluriel = `${mot}s`) => `${n} ${n > 1 ? motPluriel : mot}`;

/* ═══════════════════════ Participation ═══════════════════════ */

export type LectureParticipation = {
  taux: number;
  niveau: "excellente" | "bonne" | "moyenne" | "faible" | "inconnue";
  constat: Constat;
};

export function lireParticipation(repondants: number, destinataires: number | null): LectureParticipation {
  if (!destinataires) {
    return {
      taux: 0,
      niveau: "inconnue",
      constat: { ton: "neutre", icone: "participation", titre: `${pluriel(repondants, "réponse")}`, texte: "Nombre de destinataires inconnu." },
    };
  }
  const taux = pct(repondants, destinataires);
  const manque = Math.max(0, destinataires - repondants);
  if (taux >= 75)
    return {
      taux,
      niveau: "excellente",
      constat: { ton: "positif", icone: "participation", titre: `Participation excellente : ${taux} %`, texte: `${repondants} sur ${destinataires} ont répondu. Les résultats sont représentatifs.` },
    };
  if (taux >= 50)
    return {
      taux,
      niveau: "bonne",
      constat: { ton: "positif", icone: "participation", titre: `Bonne participation : ${taux} %`, texte: `Plus de la moitié a répondu. Une relance peut aller chercher les ${manque} restants.` },
    };
  if (taux >= 25)
    return {
      taux,
      niveau: "moyenne",
      constat: { ton: "neutre", icone: "participation", titre: `Participation moyenne : ${taux} %`, texte: `${manque} personnes n'ont pas encore répondu. Relancez avant de tirer des conclusions.` },
    };
  return {
    taux,
    niveau: "faible",
    constat: {
      ton: "alerte",
      icone: "participation",
      titre: `Participation faible : ${taux} %`,
      texte: `Seulement ${repondants} sur ${destinataires}. Les résultats ne reflètent pas encore l'avis du plus grand nombre : relancez.`,
    },
  };
}

/* ═══════════════════════ Choix (sondage, choix unique, cases) ═══════════════════════ */

export type Verdict = "unanime" | "nette-majorite" | "majorite" | "en-tete" | "partage" | "egalite" | "trop-tot";
export type LectureChoix = {
  total: number;
  classement: { label: string; votes: number; part: number }[];
  verdict: Verdict;
  /** Phrase courte : « Samedi matin l'emporte nettement (64 %). » */
  phrase: string;
  constat: Constat | null;
};

/**
 * `repondants` = nombre de personnes (pas de votes). Pour les choix multiples,
 * la part d'une option = personnes qui l'ont cochée / répondants.
 */
export function lireChoix(options: { label: string; votes: number }[], repondants: number, multiple = false, sujet?: string): LectureChoix {
  const base = multiple ? repondants : options.reduce((t, o) => t + o.votes, 0);
  const classement = [...options]
    .map((o) => ({ label: o.label, votes: o.votes, part: pct(o.votes, base) }))
    .sort((a, b) => b.votes - a.votes);
  const [a, b] = classement;
  const ecart = a && b ? a.part - b.part : a?.part ?? 0;
  const q = sujet ? ` — « ${sujet} »` : "";

  if (repondants < MIN_REPONSES || !a || a.votes === 0) {
    return { total: repondants, classement, verdict: "trop-tot", phrase: "Trop peu de réponses pour dégager une tendance.", constat: null };
  }
  if (b && a.votes === b.votes) {
    const ex = classement.filter((o) => o.votes === a.votes).map((o) => `« ${o.label} »`);
    return {
      total: repondants,
      classement,
      verdict: "egalite",
      phrase: `Égalité parfaite entre ${ex.join(" et ")} (${a.part} %).`,
      constat: { ton: "neutre", icone: "partage", titre: `Égalité${q}`, texte: `${ex.join(" et ")} font jeu égal. Une question de départage peut aider à trancher.` },
    };
  }
  if (multiple) {
    const populaires = classement.filter((o) => o.part >= 50);
    const phrase = populaires.length
      ? `« ${a.label} » est cochée par ${a.part} % des répondants${populaires.length > 1 ? `, suivie de « ${b!.label} » (${b!.part} %)` : ""}.`
      : `Aucune option ne réunit la moitié des répondants ; « ${a.label} » arrive en tête (${a.part} %).`;
    return {
      total: repondants,
      classement,
      verdict: a.part >= 50 ? "majorite" : "partage",
      phrase,
      constat: { ton: "neutre", icone: a.part >= 50 ? "consensus" : "partage", titre: `« ${a.label} » en tête${q}`, texte: phrase },
    };
  }
  let verdict: Verdict;
  let phrase: string;
  if (a.part >= 90) {
    verdict = "unanime";
    phrase = `Quasi-unanimité pour « ${a.label} » (${a.part} %).`;
  } else if (a.part >= 60 && ecart >= 20) {
    verdict = "nette-majorite";
    phrase = `« ${a.label} » l'emporte nettement (${a.part} %).`;
  } else if (a.part > 50) {
    verdict = "majorite";
    phrase = `« ${a.label} » obtient la majorité (${a.part} %), devant « ${b?.label} » (${b?.part} %).`;
  } else if (ecart < 10) {
    verdict = "partage";
    phrase = `Avis partagés : « ${a.label} » (${a.part} %) et « ${b?.label} » (${b?.part} %) sont au coude à coude.`;
  } else {
    verdict = "en-tete";
    phrase = `« ${a.label} » arrive en tête (${a.part} %) sans majorité absolue.`;
  }
  const consensus = verdict === "unanime" || verdict === "nette-majorite";
  return {
    total: repondants,
    classement,
    verdict,
    phrase,
    constat: {
      ton: verdict === "partage" ? "neutre" : "positif",
      icone: consensus ? "consensus" : "partage",
      titre: consensus ? `Choix clair${q}` : verdict === "partage" ? `Avis partagés${q}` : `Tendance${q}`,
      texte: phrase,
    },
  };
}

/* ═══════════════════════ Échelle 1 à 5 ═══════════════════════ */

export type LectureEchelle = {
  n: number;
  moyenne: number | null;
  repartition: number[]; // index 0 → note 1
  satisfaits: number; // % de 4 et 5
  mecontents: number; // % de 1 et 2
  humeur: "😍" | "🙂" | "😐" | "🙁" | "😟" | "—";
  phrase: string;
  constat: Constat | null;
};

export function lireEchelle(valeurs: number[], sujet?: string): LectureEchelle {
  const v = valeurs.filter((x) => Number.isInteger(x) && x >= 1 && x <= 5);
  const repartition = [1, 2, 3, 4, 5].map((k) => v.filter((x) => x === k).length);
  const n = v.length;
  if (!n) return { n, moyenne: null, repartition, satisfaits: 0, mecontents: 0, humeur: "—", phrase: "Pas encore de note.", constat: null };
  const moyenne = v.reduce((t, x) => t + x, 0) / n;
  const satisfaits = pct(repartition[3] + repartition[4], n);
  const mecontents = pct(repartition[0] + repartition[1], n);
  const humeur = moyenne >= 4.5 ? "😍" : moyenne >= 3.75 ? "🙂" : moyenne >= 3 ? "😐" : moyenne >= 2.25 ? "🙁" : "😟";
  const m = `${virgule(moyenne)}/5`;
  let phrase: string;
  if (moyenne >= 4) phrase = `Très bonne note (${m}) : ${satisfaits} % donnent 4 ou 5.`;
  else if (moyenne >= 3.25) phrase = `Note correcte (${m}), avec une marge de progrès : ${mecontents} % donnent 1 ou 2.`;
  else if (moyenne >= 2.5) phrase = `Note mitigée (${m}) : ${mecontents} % sont peu satisfaits.`;
  else phrase = `Note basse (${m}) : ${mecontents} % donnent 1 ou 2. Point à traiter en priorité.`;
  const polarise = satisfaits >= 35 && mecontents >= 35;
  if (polarise) phrase = `Avis très tranchés (${m}) : ${satisfaits} % satisfaits mais ${mecontents} % mécontents.`;
  const q = sujet ? `« ${sujet} »` : "Note";
  const constat: Constat | null =
    n < MIN_REPONSES
      ? null
      : {
          ton: moyenne >= 3.75 && !polarise ? "positif" : moyenne < 2.75 || mecontents >= 40 ? "alerte" : "neutre",
          icone: moyenne < 2.75 || mecontents >= 40 ? "alerte" : "satisfaction",
          titre: `${humeur} ${q} : ${m}`,
          texte: phrase,
        };
  return { n, moyenne, repartition, satisfaits, mecontents, humeur, phrase, constat };
}

/* ═══════════════════════ Recommandation 0 à 10 (NPS) ═══════════════════════ */

export type LectureNps = {
  n: number;
  score: number | null; // -100 à +100
  promoteurs: number; // %
  passifs: number;
  detracteurs: number;
  phrase: string;
  constat: Constat | null;
};

/** Question « Recommanderiez-vous l'école ? » : 9-10 promoteurs, 7-8 passifs, 0-6 détracteurs. */
export function lireNps(valeurs: number[], sujet?: string): LectureNps {
  const v = valeurs.filter((x) => Number.isInteger(x) && x >= 0 && x <= 10);
  const n = v.length;
  if (!n) return { n, score: null, promoteurs: 0, passifs: 0, detracteurs: 0, phrase: "Pas encore de réponse.", constat: null };
  const promoteurs = pct(v.filter((x) => x >= 9).length, n);
  const detracteurs = pct(v.filter((x) => x <= 6).length, n);
  const passifs = 100 - promoteurs - detracteurs;
  const score = promoteurs - detracteurs;
  const s = `${score > 0 ? "+" : ""}${score}`;
  const phrase =
    score >= 50
      ? `Score ${s} : excellent, les familles recommandent l'école avec enthousiasme.`
      : score >= 20
        ? `Score ${s} : bon, plus d'ambassadeurs (${promoteurs} %) que de déçus (${detracteurs} %).`
        : score >= 0
          ? `Score ${s} : fragile, beaucoup d'avis neutres (${passifs} %). À surveiller.`
          : `Score ${s} : plus de déçus (${detracteurs} %) que d'ambassadeurs (${promoteurs} %). À traiter.`;
  return {
    n,
    score,
    promoteurs,
    passifs,
    detracteurs,
    phrase,
    constat:
      n < MIN_REPONSES
        ? null
        : { ton: score >= 20 ? "positif" : score >= 0 ? "neutre" : "alerte", icone: "nps", titre: `Recommandation${sujet ? ` — « ${sujet} »` : ""} : ${s}`, texte: phrase },
  };
}

/* ═══════════════════════ Textes libres ═══════════════════════ */

const VIDES = new Set(
  (
    "le la les un une des du de d l et ou en au aux a à est sont être été avoir ai as avons avez ont ce ces cet cette " +
    "que qui quoi dont où pour par sur sous dans avec sans plus moins très trop peu bien pas ne n ni non oui si " +
    "je tu il elle on nous vous ils elles me te se mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs " +
    "y c s qu j m t lui eux ça cela ceci tout tous toute toutes aussi mais donc car comme quand alors encore déjà " +
    "fait faire faut peut merci svp etc lors chez entre depuis avant après cest ca parce afin chaque autre autres"
  ).split(/\s+/),
);

/** Mots les plus fréquents des réponses libres (mots vides retirés). */
export function motsFrequents(textes: string[], limite = 14): { mot: string; n: number }[] {
  const compte = new Map<string, { n: number; forme: string }>();
  for (const t of textes) {
    const vus = new Set<string>();
    for (const brut of t.toLowerCase().split(/[^\p{L}\p{N}'’-]+/u)) {
      const mot = brut.replace(/^[’'-]+|[’'-]+$/g, "").replace(/^[a-z][’']/, "");
      if (mot.length < 3 || VIDES.has(mot) || /^\d+$/.test(mot)) continue;
      const cle = mot.normalize("NFD").replace(/\p{M}/gu, "").replace(/s$/, "");
      if (vus.has(cle)) continue; // une réponse compte une fois par mot
      vus.add(cle);
      const e = compte.get(cle);
      compte.set(cle, { n: (e?.n ?? 0) + 1, forme: e?.forme ?? mot });
    }
  }
  return [...compte.values()]
    .filter((x) => x.n >= (textes.length >= 6 ? 2 : 1))
    .sort((a, b) => b.n - a.n || a.forme.localeCompare(b.forme, "fr"))
    .slice(0, limite)
    .map((x) => ({ mot: x.forme, n: x.n }));
}

/* ═══════════════════════ Rythme des réponses ═══════════════════════ */

export type Rythme = { parJour: { jour: string; n: number }[]; heuresMediane: number | null; phrase: string | null };

export function lireRythme(dates: string[], envoi: string): Rythme {
  const t0 = new Date(envoi).getTime();
  const ts = dates.map((d) => new Date(d).getTime()).filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const parJourMap = new Map<string, number>();
  for (const t of ts) {
    const j = new Date(t).toISOString().slice(0, 10);
    parJourMap.set(j, (parJourMap.get(j) ?? 0) + 1);
  }
  const parJour = [...parJourMap.entries()].sort().map(([jour, n]) => ({ jour, n }));
  if (ts.length < MIN_REPONSES) return { parJour, heuresMediane: null, phrase: null };
  const med = ts[Math.floor((ts.length - 1) / 2)];
  const heures = Math.max(0, (med - t0) / 3_600_000);
  const delai = heures < 1 ? "moins d'une heure" : heures < 48 ? `${Math.round(heures)} h` : `${Math.round(heures / 24)} jours`;
  const pic = parJour.reduce((m, x) => (x.n > m.n ? x : m), parJour[0]);
  const jourPic = new Date(`${pic.jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return {
    parJour,
    heuresMediane: heures,
    phrase: `La moitié des réponses est arrivée en ${delai}. Jour le plus actif : ${jourPic} (${pluriel(pic.n, "réponse")}).`,
  };
}

/* ═══════════════════════ Formulaire complet ═══════════════════════ */

export type QuestionLue = { id: string; type: string; titre: string; options: string[] };
export type ReponseLue = { answers: Record<string, string | string[]>; profil: string | null; date: string };

export type LectureQuestion =
  | { id: string; type: "choix" | "cases"; n: number; choix: LectureChoix }
  | { id: string; type: "echelle"; n: number; echelle: LectureEchelle; parProfil: { profil: string; moyenne: number; n: number }[] }
  | { id: string; type: "nps"; n: number; nps: LectureNps }
  | { id: string; type: "court" | "long"; n: number; mots: { mot: string; n: number }[]; textes: string[] }
  | { id: string; type: "date"; n: number; dates: { date: string; n: number }[] };

export type LectureFormulaire = {
  participation: LectureParticipation;
  questions: Record<string, LectureQuestion>;
  aRetenir: Constat[];
  rythme: Rythme;
  /** Indice global de satisfaction (moyenne des échelles ramenée sur 100), si le formulaire en contient. */
  indice: number | null;
};

export function lireFormulaire(questions: QuestionLue[], reponses: ReponseLue[], destinataires: number | null, envoi: string): LectureFormulaire {
  const participation = lireParticipation(reponses.length, destinataires);
  const lu: Record<string, LectureQuestion> = {};
  const constats: { poids: number; c: Constat }[] = [];
  const echelles: { titre: string; moyenne: number }[] = [];

  for (const q of questions) {
    const valeurs = reponses.map((r) => r.answers[q.id]).filter((v) => v !== undefined && v !== "" && !(Array.isArray(v) && !v.length));
    const n = valeurs.length;
    if (q.type === "choix" || q.type === "cases") {
      const opts = q.options.map((o) => ({ label: o, votes: valeurs.filter((v) => (Array.isArray(v) ? v.includes(o) : v === o)).length }));
      const choix = lireChoix(opts, n, q.type === "cases", q.titre);
      lu[q.id] = { id: q.id, type: q.type, n, choix };
      if (choix.constat) constats.push({ poids: choix.verdict === "partage" || choix.verdict === "egalite" ? 3 : 2, c: choix.constat });
    } else if (q.type === "echelle") {
      const nums = valeurs.map(Number);
      const echelle = lireEchelle(nums, q.titre);
      const profils = new Map<string, number[]>();
      for (const r of reponses) {
        const v = Number(r.answers[q.id]);
        if (!r.profil || !(v >= 1 && v <= 5)) continue;
        profils.set(r.profil, [...(profils.get(r.profil) ?? []), v]);
      }
      const parProfil = [...profils.entries()]
        .filter(([, v]) => v.length >= MIN_REPONSES)
        .map(([profil, v]) => ({ profil, n: v.length, moyenne: v.reduce((t, x) => t + x, 0) / v.length }))
        .sort((a, b) => b.moyenne - a.moyenne);
      lu[q.id] = { id: q.id, type: "echelle", n, echelle, parProfil };
      if (echelle.constat) constats.push({ poids: echelle.constat.ton === "alerte" ? 5 : 2, c: echelle.constat });
      if (echelle.moyenne !== null && n >= MIN_REPONSES) echelles.push({ titre: q.titre, moyenne: echelle.moyenne });
      if (parProfil.length >= 2) {
        const [haut, bas] = [parProfil[0], parProfil[parProfil.length - 1]];
        if (haut.moyenne - bas.moyenne >= 0.8) {
          constats.push({
            poids: 4,
            c: {
              ton: "neutre",
              icone: "profil",
              titre: `Écart entre profils — « ${q.titre} »`,
              texte: `${haut.profil} : ${virgule(haut.moyenne)}/5, contre ${virgule(bas.moyenne)}/5 pour ${bas.profil.toLowerCase()}. Les attentes ne sont pas les mêmes.`,
            },
          });
        }
      }
    } else if (q.type === "nps") {
      const nps = lireNps(valeurs.map(Number), q.titre);
      lu[q.id] = { id: q.id, type: "nps", n, nps };
      if (nps.constat) constats.push({ poids: nps.constat.ton === "alerte" ? 5 : 3, c: nps.constat });
    } else if (q.type === "court" || q.type === "long") {
      const textes = valeurs.map(String);
      const mots = motsFrequents(textes);
      lu[q.id] = { id: q.id, type: q.type, n, mots, textes };
      if (q.type === "long" && n >= MIN_REPONSES && mots.length >= 3) {
        constats.push({
          poids: 1,
          c: {
            ton: "neutre",
            icone: "mots",
            titre: `Ce qui revient — « ${q.titre} »`,
            texte: `Mots les plus cités : ${mots.slice(0, 4).map((m) => `« ${m.mot} » (${m.n})`).join(", ")}.`,
          },
        });
      }
    } else if (q.type === "date") {
      const m = new Map<string, number>();
      for (const v of valeurs) m.set(String(v), (m.get(String(v)) ?? 0) + 1);
      lu[q.id] = { id: q.id, type: "date", n, dates: [...m.entries()].map(([date, k]) => ({ date, n: k })).sort((a, b) => b.n - a.n) };
    }
  }

  // Point fort / point faible parmi les échelles.
  if (echelles.length >= 2) {
    const tri = [...echelles].sort((a, b) => b.moyenne - a.moyenne);
    const fort = tri[0];
    const faible = tri[tri.length - 1];
    if (fort.moyenne - faible.moyenne >= 0.5) {
      constats.push({ poids: 4, c: { ton: "positif", icone: "satisfaction", titre: "Point fort", texte: `« ${fort.titre} » est la mieux notée (${virgule(fort.moyenne)}/5).` } });
      constats.push({
        poids: 4.5,
        c: { ton: faible.moyenne < 3 ? "alerte" : "neutre", icone: "alerte", titre: "Piste d'amélioration", texte: `« ${faible.titre} » est la moins bien notée (${virgule(faible.moyenne)}/5).` },
      });
    }
  }

  const rythme = lireRythme(
    reponses.map((r) => r.date),
    envoi,
  );
  const indice = echelles.length ? Math.round(((echelles.reduce((t, e) => t + e.moyenne, 0) / echelles.length - 1) / 4) * 100) : null;

  const aRetenir = [
    participation.constat,
    ...constats.sort((a, b) => b.poids - a.poids).map((x) => x.c),
    ...(rythme.phrase ? [{ ton: "neutre" as const, icone: "rythme" as const, titre: "Rythme des réponses", texte: rythme.phrase }] : []),
  ]
    // Pas de doublon de titre (ex. point faible = alerte d'échelle).
    .filter((c, i, t) => t.findIndex((x) => x.texte === c.texte) === i)
    .slice(0, 6);

  return { participation, questions: lu, aRetenir, rythme, indice };
}

/* ═══════════════════════ Sondage (publication) ═══════════════════════ */

export function lireSondage(
  s: { question: string; multiple: boolean; votants: number; options: { label: string; votes: number }[] },
  destinataires: number | null,
): { participation: LectureParticipation; choix: LectureChoix } {
  return { participation: lireParticipation(s.votants, destinataires), choix: lireChoix(s.options, s.votants, s.multiple) };
}
