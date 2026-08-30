export type RoleType = "OWNER" | "ADMIN" | "TEACHER" | "PARENT" | "SECRETARY" | "ACCOUNTANT" | "ASSISTANT";

/**
 * Libellés français des rôles.
 *
 * Les écrans affichaient l'énumération brute — « OWNER », « ACCOUNTANT » — dans
 * une interface entièrement en français, avec six familles de couleur tirées au
 * hasard. Le vocabulaire vit ici, avec les rôles : c'est le même raisonnement
 * que `src/lib/status.ts` pour les statuts, pas un système parallèle.
 *
 * `description` sert aux écrans qui doivent expliquer ce qu'un rôle autorise
 * (invitation, création de compte).
 */
export const ROLE_LABELS: Record<RoleType, { label: string; description: string }> = {
  OWNER:      { label: "Propriétaire",  description: "Accès total, y compris les réglages de l'établissement" },
  ADMIN:      { label: "Administrateur", description: "Accès total, y compris les réglages de l'établissement" },
  SECRETARY:  { label: "Secrétaire",    description: "Élèves, classes, documents, communications, équipe" },
  ACCOUNTANT: { label: "Comptable",     description: "Paiements, documents et rapports" },
  TEACHER:    { label: "Enseignant",    description: "Ses classes, ses élèves et la saisie des notes" },
  ASSISTANT:  { label: "Assistant",     description: "Élèves, documents, communications et rapports" },
  PARENT:     { label: "Parent",        description: "Paiements et documents de ses enfants" },
};

/**
 * Vérifie si le rôle de l'utilisateur l'autorise à envoyer des communications
 * externes (WhatsApp, SMS, Email) aux parents.
 * 
 * ⚠️ Règle absolue : Les enseignants (TEACHER) n'ont JAMAIS le droit de
 * déclencher des communications externes depuis EduCom.
 */
export function canSendExternalWhatsApp(role: RoleType | string): boolean {
  if (role === "TEACHER") return false;
  // ACCOUNTANT peut envoyer des rappels, SECRETARY/ADMIN/OWNER ont l'accès global,
  // ASSISTANT peut aussi selon le mapping.
  const allowedRoles = ["OWNER", "ADMIN", "SECRETARY", "ACCOUNTANT", "ASSISTANT"];
  return allowedRoles.includes(role);
}

/** Libellé français d'un rôle, ou la valeur brute si elle est inconnue. */
export function roleLabel(role: RoleType | string): string {
  return ROLE_LABELS[role as RoleType]?.label ?? role;
}

/**
 * Permissions d'accès aux chemins du tableau de bord.
 *
 * ═══ CONVENTIONS ═══
 *
 *   "*"                 accès total
 *   "/dashboard/x"      ce chemin ET tous ses sous-chemins (correspondance par préfixe)
 *   "/dashboard/x$"     ce chemin EXACTEMENT, sans ses sous-chemins
 *
 * Le suffixe `$` existe pour un cas précis : l'accueil du tableau de bord.
 * L'écrire sans `$` donnerait `/dashboard` comme préfixe autorisé, donc
 * l'accès à **tout** ce qui se trouve dessous — l'inverse de l'intention.
 *
 * ⚠️ Ce fichier est la SEULE source de vérité des permissions. La sidebar, la
 * navigation mobile, les server actions (`requireActionContext`) et les gardes
 * de page passent tous par `hasAccess()`. Ne pas créer de table parallèle.
 */
export const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  OWNER: ["*"],
  ADMIN: ["*"],

  // Un enseignant saisit les notes : `/dashboard/grades` manquait, ce qui
  // verrouillait la rubrique pour les seuls utilisateurs à qui l'écran est
  // destiné — tout le module leur était inaccessible.
  TEACHER: [
    "/dashboard$",
    "/dashboard/students",
    "/dashboard/classes",
    /**
     * ⚠️ RÉGRESSION CORRIGÉE (22 août 2026). L'« Annuaire »
     * (`/dashboard/directory`) a REMPLACÉ les rubriques « Élèves » et
     * « Classes » dans la navigation, mais cette table n'a pas suivi :
     * l'écran principal du secrétariat était devenu invisible à tout le monde
     * sauf à la direction, alors que ces rôles gardaient l'accès aux mêmes
     * données par `/dashboard/students`.
     *
     * Cette ligne ne donne donc AUCUN droit nouveau — elle rétablit l'accès à
     * une vue fusionnée de ce qui est déjà autorisé juste en dessous. La portée
     * des données reste bornée par `studentScope()` et le périmètre de classes.
     */
    "/dashboard/directory",
    "/dashboard/grades",
    "/dashboard/communications",

    // ═══ Lot 15 — centre documentaire ═══
    //
    // ⚠️ **Accordé explicitement, et à ce seul chemin.** `TEACHER` n'a PAS
    // `/dashboard/documents` : sans cette ligne, le centre lui serait fermé,
    // alors que la liste de fournitures de sa classe fait partie de son travail.
    // Il n'obtient pas pour autant le hub de génération — le chemin est plus
    // précis que le préfixe, et c'est voulu.
    //
    // ⚠️ Ce que l'enseignant VOIT est ensuite borné ligne par ligne par
    // `documentScope()` : documents publiés, de portée établissement ou de SES
    // classes. Le chemin ouvre la porte, la portée décide du contenu.
    "/dashboard/documents/centre",

    // Lot 12 — l'enseignant a son propre rapport : ses classes, ses saisies,
    // l'état de ses bulletins. `buildReport()` borne la vue à ses classes
    // (affectation ou titularité) ; il n'accède à aucun chiffre financier,
    // aucune section « finance » n'étant produite pour son rôle.
    "/dashboard/admin/reports",
  ],

  // Un parent ne voit que ce qui le concerne. Pas d'accès à l'accueil : le
  // tableau de bord expose les finances de tout l'établissement.
  PARENT: [
    "/dashboard/payments",
    "/dashboard/documents",

    // Lot 12 — le parent voit un rapport strictement familial : ses enfants,
    // SES factures (via `invoiceScope()`, qui couvre les deux chemins parent →
    // facture), ses versements, ses messages.
    //
    // ⚠️ Aucun total d'établissement n'y entre : `familySections()` n'appelle
    // pas `financeSnapshot()`, qui agrège toute l'école. C'est la seule raison
    // pour laquelle cette entrée est sûre — la retirer du rapport familial
    // rendrait cette permission dangereuse.
    "/dashboard/admin/reports",
  ],

  // Le comptable édite factures et reçus : ils vivent dans `/dashboard/documents`,
  // qui lui manquait. `/dashboard/invoices` a été retiré — cette route n'existe
  // pas dans l'application, l'entrée était morte.
  ACCOUNTANT: [
    "/dashboard$",
    "/dashboard/payments",
    "/dashboard/documents",
    "/dashboard/communications",
    "/dashboard/admin/reports",
  ],

  SECRETARY: [
    "/dashboard$",
    "/dashboard/students",
    "/dashboard/classes",
    "/dashboard/directory",
    "/dashboard/communications",
    "/dashboard/documents",
    "/dashboard/team",

    /**
     * ═══ Configuration pédagogique (22 août 2026) ═══
     *
     * ⚠️ **Ce chemin est plus précis que `/dashboard/settings`, et c'est tout
     * l'enjeu.** `hasAccess()` compare par préfixe : autoriser
     * `/dashboard/settings/pedagogie` n'ouvre PAS `/dashboard/settings`, qui
     * porte le nom, le logo, le cachet et la signature de l'établissement et
     * reste réservé à la direction. Le secrétariat obtient exactement une
     * chose : le calendrier scolaire, le programme et les affectations.
     *
     * Pourquoi lui : Kory l'a posé en toutes lettres — « si une directrice ou
     * secrétaire modifie une date d'évaluation ». C'est le secrétariat qui
     * tient le calendrier au quotidien ; l'en fermer dehors obligerait à
     * déranger la direction pour déplacer un contrôle.
     *
     * Pourquoi pas l'enseignant : déplacer une composition ou repondérer une
     * matière change le bulletin de toute une classe, et le sien n'est qu'un
     * point de vue parmi d'autres. Il garde la saisie, pas le cadre.
     */
    "/dashboard/settings/pedagogie",

    // Lot 12 — le secrétariat a son rapport : dossiers élèves, demandes de
    // documents, bulletins à relire, communications. Aucune section financière.
    "/dashboard/admin/reports",
  ],

  ASSISTANT: [
    "/dashboard$",
    "/dashboard/students",
    "/dashboard/directory",
    "/dashboard/documents",
    "/dashboard/communications",
    "/dashboard/admin/reports",
  ],
};

/**
 * Chemins interdits à certains rôles, MÊME si un préfixe autorisé les couvre.
 *
 * `hasAccess` raisonne par préfixe : `PARENT` ayant `/dashboard/documents`,
 * il hériterait automatiquement de tout sous-chemin — y compris l'espace de
 * validation, qui expose des notes non encore relues par le secrétariat.
 * Ces refus sont donc évalués AVANT les autorisations.
 */
export const ROLE_DENIALS: Partial<Record<RoleType, string[]>> = {
  // ⚠️ `PARENT` a `/dashboard/payments` pour consulter les factures de ses
  // enfants. Sans ces refus, il héritait par préfixe de TOUT l'atelier financier
  // du lot 11 — dépenses, trésorerie, solde de l'établissement. Même mécanisme
  // et même raison que le refus sur l'espace de validation.
  PARENT: [
    "/dashboard/documents/validation",
    "/dashboard/payments/expenses",
    "/dashboard/payments/statement",
    "/dashboard/payments/review",

    // ═══ Lot 11.1 — surfaces qui ÉMETTENT des factures ═══
    //
    // Un parent consulte ses factures ; il n'en produit pas. Ces quatre écrans
    // chargeaient l'intégralité des élèves ou des factures de l'établissement :
    //
    //   payments/new        formulaire d'émission — listait tous les élèves inscrits
    //   documents/invoice   générateur de factures — idem
    //   documents/receipt   générateur de reçus — idem
    //   documents/reminder  toutes les factures échues, AVEC le nom, le téléphone
    //                       et l'e-mail du parent de chaque famille
    //
    // Filtrer leur contenu par parent n'aurait pas de sens : ce sont des outils
    // d'émission. Le refus est la correction juste, et il est ici — pas dans une
    // règle locale à chaque écran.
    "/dashboard/payments/new",
    "/dashboard/payments/invoice",
    "/dashboard/payments/receipt",
    "/dashboard/documents/reminder",

    // ═══ 22 août 2026 — LES CINQ GÉNÉRATEURS OUBLIÉS ═══
    //
    // ⚠️ **Fuite mesurée, pas théorique.** Les quatre refus ci-dessus ont été
    // posés aux lots 11.1 et 12.2 ; **cinq écrans de la même famille y ont
    // échappé**, et aucun d'eux ne portait de garde de chemin non plus. Un
    // parent authentifié qui tapait `/dashboard/grades/report-card` lisait
    // donc **les bulletins de tous les élèves de l'établissement** — notes,
    // moyennes, rangs, appréciations du conseil.
    //
    // Même raison que pour les factures : ce sont des outils d'ÉMISSION. Ils
    // chargent l'intégralité des élèves ou des classes de l'école, et les
    // filtrer par famille n'aurait aucun sens — un parent ne produit pas les
    // bulletins de l'établissement, il reçoit ceux de ses enfants.
    //
    // ⚠️ Ce refus ne suffit PAS à lui seul : `hasAccess()` ne protège que ce
    // qui l'appelle, et ces cinq pages ne l'appelaient pas. Chacune reçoit
    // aussi sa garde (`redirect`). Les deux sont nécessaires.
    "/dashboard/grades/report-card",
    "/dashboard/documents/certificate",
    "/dashboard/documents/info-sheet",
    "/dashboard/documents/timetable",
    "/dashboard/documents/drafts",

    // ═══ Lot 15 — gestion du centre documentaire ═══
    //
    // Un parent consulte les documents qui lui sont destinés ; il n'en publie
    // aucun. Même raison que les quatre refus ci-dessus.
    "/dashboard/documents/centre/gestion",

    // ═══ Lot 12.2 — consultation de la grille tarifaire ═══
    //
    // ⚠️ `/dashboard/payments/tarifs` expose la grille officielle de
    // l'établissement (tous les frais, toutes les classes) et le formulaire de
    // demande de modification. Un parent possède `/dashboard/payments` pour
    // consulter SES factures : sans ce refus il héritait de l'écran par préfixe,
    // exactement comme il héritait de l'atelier financier au lot 11.1.
    "/dashboard/payments/tarifs",
  ],

  // Le comptable prépare et transmet ; il n'approuve pas son propre travail.
  // Le bureau de revue lui est donc refusé, alors qu'il a bien `/dashboard/payments`.
  // Exactement le principe qui empêche un enseignant d'approuver ses bulletins.
  ACCOUNTANT: [
    "/dashboard/documents/validation",
    "/dashboard/payments/review",
    // Lot 15 — voir ci-dessous : publier un document officiel est un acte de
    // direction, pas une tâche de service.
    "/dashboard/documents/centre/gestion",
  ],

  // ═══ Lot 15 — publier engage l'établissement ═══
  //
  // ⚠️ `/dashboard/documents/centre/gestion` couvre publication, dépublication
  // et archivage. Il est refusé à TOUS les rôles sauf la direction, qui l'a par
  // `"*"`. Sans ces refus, secrétariat, assistance et comptabilité en
  // hériteraient par le préfixe `/dashboard/documents` — exactement la fuite
  // corrigée aux lots 11.1 et 12.2.
  //
  // Ils gardent la **préparation** : créer un brouillon, le modifier, le
  // soumettre à validation. C'est la séparation déjà en place pour les
  // bulletins — celui qui prépare n'approuve pas.
  ASSISTANT: [
    "/dashboard/documents/validation",
    "/dashboard/documents/centre/gestion",
  ],
  TEACHER: [
    "/dashboard/documents/validation",
    "/dashboard/documents/centre/gestion",
  ],
  SECRETARY: ["/dashboard/documents/centre/gestion"],
};

/**
 * Rôles auxquels le centre documentaire est **destiné** (lot 15).
 *
 * ⚠️ Cette constante n'accorde rien : `hasAccess()` reste seul juge. Elle écrit
 * l'INTENTION, pour qu'un vérificateur puisse la comparer à ce que le moteur de
 * permissions produit réellement. Sans elle, l'accès de quatre rôles ne
 * viendrait que de l'héritage du préfixe `/dashboard/documents` — vrai par
 * accident, et personne ne s'en apercevrait le jour où il devient faux.
 */
export const CENTRE_INTENDED: Record<RoleType, { read: boolean; manage: boolean }> = {
  OWNER:      { read: true,  manage: true  },
  ADMIN:      { read: true,  manage: true  },
  SECRETARY:  { read: true,  manage: false },
  ASSISTANT:  { read: true,  manage: false },
  ACCOUNTANT: { read: true,  manage: false },
  TEACHER:    { read: true,  manage: false },
  PARENT:     { read: true,  manage: false },
};

/**
 * Vrai si le rôle a accès au chemin.
 *
 * `/dashboard/settings` n'est listé par aucun rôle : seuls `OWNER` et `ADMIN`
 * y accèdent, via `"*"`. C'est voulu — les réglages portent le nom, le logo, le
 * cachet et la signature de l'établissement.
 */
export function hasAccess(role: RoleType | string, path: string): boolean {
  const denied = ROLE_DENIALS[role as RoleType];
  if (denied?.some((p) => path === p || path.startsWith(`${p}/`))) return false;

  const permissions = ROLE_PERMISSIONS[role as RoleType];
  if (!permissions) return false;

  if (permissions.includes("*")) return true;

  return permissions.some((allowed) => {
    if (allowed.endsWith("$")) {
      // Correspondance exacte : le chemin ne doit pas ouvrir ses descendants.
      return path === allowed.slice(0, -1);
    }
    return path === allowed || path.startsWith(`${allowed}/`);
  });
}

/**
 * Premier chemin réellement accessible au rôle.
 *
 * ⚠️ Corrige une boucle de redirection. La coquille renvoyait tout accès refusé
 * vers `/dashboard` — or `PARENT` n'a pas accès à `/dashboard` non plus, donc
 * la redirection échouait à son tour et se relançait indéfiniment. Rediriger
 * vers le premier chemin autorisé du rôle garantit une cible atteignable, sans
 * accorder aucun droit supplémentaire.
 */
export function firstAllowedPath(role: RoleType | string): string {
  const permissions = ROLE_PERMISSIONS[role as RoleType];
  if (!permissions || permissions.length === 0) return "/login";
  if (permissions.includes("*")) return "/dashboard";

  const first = permissions[0];
  return first.endsWith("$") ? first.slice(0, -1) : first;
}
