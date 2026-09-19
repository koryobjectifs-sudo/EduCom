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

  // Un enseignant saisit les notes et fait l'appel de ses classes :
  // il n'a pas accès au registre administratif (/dashboard/students, /dashboard/classes).
  TEACHER: [
    "/dashboard$",
    "/dashboard/grades",
    "/dashboard/communications",

    // ⚠️ BUG CORRIGÉ (3 septembre 2026). `/dashboard/attendance` a toute une
    // branche dédiée à l'enseignant (choix de SA classe, appel) et la
    // sidebar déclare l'entrée « Présences » sous « Enseignement ».
    "/dashboard/attendance",

    // ═══ Lot 15 — centre documentaire ═══
    "/dashboard/documents/centre",

    // Lot 12 — rapport enseignant : ses classes, ses saisies.
    "/dashboard/admin/reports",
  ],

  // ═══ LISTE BLANCHE STRICTE POUR LE RÔLE PARENT (Fail-Closed) ═══
  // Un parent n'a accès qu'aux routes EXPLICITEMENT listées avec terminaison exacte ($).
  // Toute nouvelle route créée sur /dashboard est INTERDITE par défaut aux parents.
  PARENT: [
    // Espace Famille dédié (Phase 3)
    "/famille",

    // Compatibilité ascendante dashboard existant
    "/dashboard/grades$",
    "/dashboard/payments$",
    "/dashboard/documents$",
    "/dashboard/documents/centre$",
    "/dashboard/settings$",
    "/dashboard/students$",
    "/dashboard/students/[id]$",
    "/dashboard/students/[id]/dossier$",
  ],


  // Le comptable travaille dans Finance : factures, reçus et relances de paiement.
  // Il n'a rien à faire dans le centre documentaire général (certificats, scolarité).
  ACCOUNTANT: [
    "/dashboard$",
    "/dashboard/payments",
    "/dashboard/documents/reminder",
    "/dashboard/documents/centre",
    "/dashboard/communications",
    "/dashboard/admin/reports",
  ],

  SECRETARY: [
    "/dashboard$",
    "/dashboard/students",
    "/dashboard/classes",
    "/dashboard/directory",
    "/dashboard/communications",

    // ⚠️ BUG CORRIGÉ (3 septembre 2026), même défaut que pour `TEACHER`
    // ci-dessus. `/dashboard/attendance` a une vue dédiée pour ce rôle —
    // « Opérations Quotidiennes », avec le récapitulatif des classes en
    // attente d'appel et le bouton de notification aux parents pour chaque
    // absence — commentée dans le code même comme « DIRECTOR / SECRETARY
    // View ». Ce chemin manquait : le secrétariat ne pouvait ni voir ni
    // notifier une absence, alors que l'écran a été construit pour lui.
    "/dashboard/attendance",
    "/dashboard/documents",
    "/dashboard/grades/validation",
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
    "/dashboard/grades/validation",
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
    "/dashboard/payments/tarifs",

    // ═══ Espace Parent — Exclusion de toute action ou écran d'administration ═══
    "/dashboard/grades/saisie",
    "/dashboard/grades/bulletin",
    "/dashboard/grades/difficultes",
    "/dashboard/settings/pedagogie",
    "/dashboard/settings/documents",
    "/dashboard/settings/reinscription",
    "/dashboard/settings/fees",
    "/dashboard/settings/academic-years",
    "/dashboard/students/dossiers/review",
    "/dashboard/students/new",
    "/dashboard/students/import",
    "/dashboard/students/export",
  ],

  // Le comptable prépare et transmet ; il n'approuve pas son propre travail.
  // Le bureau de revue lui est donc refusé, alors qu'il a bien `/dashboard/payments`.
  // Exactement le principe qui empêche un enseignant d'approuver ses bulletins.
  ACCOUNTANT: [
    "/dashboard/documents/validation",
    "/dashboard/grades/validation",
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
    "/dashboard/grades/validation",
    "/dashboard/documents/centre/gestion",
  ],
  TEACHER: [
    "/dashboard/documents/validation",
    "/dashboard/grades/validation",
    "/dashboard/documents/centre/gestion",
    // Lot 18/3 — le conseil de classe (distinctions, sanctions, orientation)
    // est réservé à la direction. `TEACHER` hérite de `/dashboard/grades` par
    // préfixe pour la saisie ; ce sous-chemin précis lui reste fermé.
    "/dashboard/grades/conseil",
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
      const rawPattern = allowed.slice(0, -1);
      // Identifiant dynamique d'élève : exclut les mots-clés réservés d'administration
      const idPattern = "(?!(?:new|import|export|dossiers|review|classes|batch-delete|tarifs|statement|receipt|invoice)$)[a-zA-Z0-9_-]+";
      const regexStr = "^" + rawPattern.replace(/\[[a-zA-Z0-9_-]+\]/g, idPattern) + "$";
      return new RegExp(regexStr).test(path);
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
/**
 * Pages d'accueil explicites par rôle.
 * ⚠️ Règle absolue : Ne jamais laisser l'ordre d'une liste blanche décider de la
 * page d'atterrissage. Un parent atterrit sur ses bulletins/notes, jamais sur "students".
 */
export const ROLE_HOME_PATHS: Partial<Record<RoleType, string>> = {
  PARENT: "/famille", // Espace Famille dédié (Phase 3)
  TEACHER: "/dashboard",

  ACCOUNTANT: "/dashboard",
  SECRETARY: "/dashboard",
  ASSISTANT: "/dashboard",
  ADMIN: "/dashboard",
  OWNER: "/dashboard",
};

export function firstAllowedPath(role: RoleType | string): string {
  // Page d'accueil explicite par rôle
  const explicit = ROLE_HOME_PATHS[role as RoleType];
  if (explicit) return explicit;

  const permissions = ROLE_PERMISSIONS[role as RoleType];
  if (!permissions || permissions.length === 0) return "/login";
  if (permissions.includes("*")) return "/dashboard";

  const first = permissions[0];
  return first.endsWith("$") ? first.slice(0, -1) : first;
}
