import { ROLE_LABELS, type RoleType } from "@/lib/permissions";

/**
 * À qui EduCom s'adresse — addendum PLG. Remplace `ChaosToControl`,
 * `ParentExperience` et `CommunicationSection` sur `/solutions`.
 *
 * ═══ CE QUE CES TROIS COMPOSANTS AFFIRMAIENT, ET QUI EST FAUX ═══
 *
 * ⚠️ `CommunicationSection` : « **Envoyez sur WhatsApp, SMS et portail parent en
 *    un clic** » et « Sachez exactement quel parent a lu quelle annonce ». Le
 *    lot 17 a établi qu'**aucun canal ne peut émettre** — compte Twilio d'essai
 *    sans numéro, zéro message émis depuis la création, aucun service d'e-mail
 *    (`rappel.md` §30 à §32). Il n'existe évidemment aucun accusé de lecture.
 * ⚠️ `ParentExperience` : « Bulletins, **absences**, paiements et messages » et
 *    « **alertes instantanées** ». Aucune donnée de présence au schéma, aucune
 *    notification sortante.
 *
 * ═══ CE QUI LES REMPLACE, ET POURQUOI C'EST PLUS SOLIDE ═══
 *
 * La liste ci-dessous **n'est pas rédigée** : elle est lue dans
 * `src/lib/permissions.ts`, le module qui gouverne réellement ce que chaque rôle
 * voit dans le produit. Une page marketing branchée sur la matrice de droits ne
 * peut pas dériver : si un rôle change de périmètre, la page change avec lui, et
 * si un rôle est inventé ici, la compilation le refuse.
 *
 * ⚠️ Ne jamais remplacer cet import par une liste recopiée « pour pouvoir
 * mieux formuler ». La formulation approximative est le prix de l'exactitude
 * garantie, et c'est un bon prix.
 */

/** L'ordre d'affichage : de la direction vers la famille. */
const ORDRE: RoleType[] = [
  "OWNER",
  "ADMIN",
  "SECRETARY",
  "TEACHER",
  "ACCOUNTANT",
  "ASSISTANT",
  "PARENT",
];

export default function RolesSection() {
  return (
    <section className="bg-m-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-m-ink-faint">
            Les rôles
          </p>
          <h2 className="mt-5 font-display text-[2rem] font-bold leading-[1.15] tracking-[-0.015em] text-m-ink sm:text-[2.5rem]">
            Chacun ne voit que ce qui le concerne.
          </h2>
          <p className="mt-6 text-[16px] leading-[1.7] text-m-ink-soft">
            Sept rôles, définis dans le produit et non sur cette page. Un enseignant ne voit
            pas les impayés ; un comptable ne saisit pas les notes ; un parent ne voit que
            ses propres enfants.
          </p>
        </div>

        <dl className="mt-14 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
          {ORDRE.map((r) => (
            <div key={r} className="border-b border-m-line py-6">
              <dt className="text-[17px] font-semibold text-m-ink">{ROLE_LABELS[r].label}</dt>
              <dd className="mt-2 text-[15px] leading-[1.7] text-m-ink-soft">
                {ROLE_LABELS[r].description}
              </dd>
            </div>
          ))}
        </dl>

        {/* ⚠️ La phrase que le marketing supprime toujours en premier. */}
        <p className="mt-10 max-w-3xl text-[15px] leading-[1.7] text-m-ink-soft">
          Le cloisonnement n&apos;est pas seulement un affichage : il est appliqué à chaque
          requête, et vérifié rôle par rôle par des contrôles automatiques avant chaque
          livraison. Un compte de parent qui demanderait le dossier d&apos;un autre enfant
          reçoit la même réponse que si cet enfant n&apos;existait pas.
        </p>
      </div>
    </section>
  );
}
