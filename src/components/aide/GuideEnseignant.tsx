export default function GuideEnseignant() {
  return (
    <div className="space-y-4 text-sm text-text">
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <h4 className="font-semibold text-primary">1. Consulter vos classes et matières</h4>
        <p className="text-xs text-text-soft mt-1">
          Retrouvez l&apos;ensemble de vos affectations dans l&apos;onglet Mes Classes. Vos élèves y sont déjà répartis.
        </p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <h4 className="font-semibold text-primary">2. Saisie des notes et évaluations</h4>
        <p className="text-xs text-text-soft mt-1">
          Enregistrez les notes de devoirs et compositions directement par classe pour générer automatiquement les moyennes.
        </p>
      </div>
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <h4 className="font-semibold text-primary">3. Feuilles de présence</h4>
        <p className="text-xs text-text-soft mt-1">
          Faites l&apos;appel en un clic au début de chaque heure de cours.
        </p>
      </div>
    </div>
  );
}
