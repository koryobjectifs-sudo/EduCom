/**
 * Gestion universelle des filtres temporels & agrégations pour le Cockpit de pilotage EduCom.
 */

export type ClePeriode = "jour" | "hier" | "7j" | "30j" | "mois" | "annee" | "perso";

export type IntervallePeriode = {
  cle: ClePeriode;
  label: string;
  debut: Date;
  fin: Date;
  granularite: "heure" | "jour" | "semaine" | "mois";
};

const JOUR_MS = 86_400_000;

export function calculerIntervalle(
  cleParam?: string | null,
  debutParam?: string | null,
  finParam?: string | null,
  maintenant = new Date()
): IntervallePeriode {
  const cle = (cleParam as ClePeriode) || "30j";

  // Si personnalisé avec dates valides
  if (cle === "perso" && debutParam) {
    const debut = new Date(`${debutParam}T00:00:00.000Z`);
    const fin = finParam ? new Date(`${finParam}T23:59:59.999Z`) : new Date(maintenant);
    if (!isNaN(debut.getTime()) && !isNaN(fin.getTime())) {
      const diffJours = Math.max(1, Math.round((fin.getTime() - debut.getTime()) / JOUR_MS));
      return {
        cle: "perso",
        label: `Du ${debut.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${fin.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`,
        debut,
        fin,
        granularite: diffJours <= 2 ? "heure" : diffJours <= 60 ? "jour" : "semaine",
      };
    }
  }

  // Début et fin du jour courant
  const debutAujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 0, 0, 0, 0);
  const finAujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate(), 23, 59, 59, 999);

  switch (cle) {
    case "jour":
      return {
        cle: "jour",
        label: "Aujourd'hui",
        debut: debutAujourdhui,
        fin: maintenant,
        granularite: "heure",
      };

    case "hier": {
      const debutHier = new Date(debutAujourdhui.getTime() - JOUR_MS);
      const finHier = new Date(debutAujourdhui.getTime() - 1);
      return {
        cle: "hier",
        label: "Hier",
        debut: debutHier,
        fin: finHier,
        granularite: "heure",
      };
    }

    case "7j": {
      const debut7j = new Date(maintenant.getTime() - 7 * JOUR_MS);
      return {
        cle: "7j",
        label: "7 derniers jours",
        debut: debut7j,
        fin: maintenant,
        granularite: "jour",
      };
    }

    case "mois": {
      const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1, 0, 0, 0, 0);
      return {
        cle: "mois",
        label: `Ce mois-ci (${maintenant.toLocaleDateString("fr-FR", { month: "long" })})`,
        debut: debutMois,
        fin: maintenant,
        granularite: "jour",
      };
    }

    case "annee": {
      // Année scolaire en cours : commence le 1er sept.
      const anneeDebut = maintenant.getMonth() >= 8 ? maintenant.getFullYear() : maintenant.getFullYear() - 1;
      const debutAnneeScolaire = new Date(anneeDebut, 8, 1, 0, 0, 0, 0);
      return {
        cle: "annee",
        label: `Année scolaire ${anneeDebut}-${anneeDebut + 1}`,
        debut: debutAnneeScolaire,
        fin: maintenant,
        granularite: "mois",
      };
    }

    case "30j":
    default: {
      const debut30j = new Date(maintenant.getTime() - 30 * JOUR_MS);
      return {
        cle: "30j",
        label: "30 derniers jours",
        debut: debut30j,
        fin: maintenant,
        granularite: "jour",
      };
    }
  }
}
