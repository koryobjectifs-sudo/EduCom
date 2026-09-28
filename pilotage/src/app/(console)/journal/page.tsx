import Link from "next/link";
import { journalPilotage } from "@/lib/donnees";
import { Bloc, EnTete, ilYa } from "@/components/ui";

const ACTION: Record<string, string> = {
  offrir_jours: "Jours offerts", paiement_manuel: "Paiement enregistré", renvoyer_acces: "Accès renvoyé", annonce: "Message aux écoles",
  repondre: "Réponse au support", statut_resolu: "Demande résolue", statut_en_cours: "Demande en cours", statut_ouvert: "Demande rouverte", creer: "Nouvelle demande", message: "Message d'une école",
};

export default async function Journal() {
  const rows = await journalPilotage();
  return (
    <div className="space-y-4">
      <EnTete titre="Journal" sous="Chaque geste fait depuis le pilotage, et chaque demande de support : qui, quand, sur quelle école." />
      <Bloc>
        {rows.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-text-soft">Rien pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-rule text-[12.5px]">
            {rows.map((r) => {
              let d: Record<string, unknown> = {};
              try { d = JSON.parse(r.details ?? "{}"); } catch { /* ligne illisible */ }
              const detail = [d.jours && `${d.jours} j`, d.montant !== undefined && `${Number(d.montant).toLocaleString("fr-FR")} F CFA`, d.motif, d.reference, d.titre, d.par].filter(Boolean).join(" · ");
              return (
                <li key={r.id} className="flex justify-between gap-3 py-1.5">
                  <span className="min-w-0"><b>{ACTION[r.action] ?? r.action}</b> · <Link href={`/ecoles/${r.schoolId}`} className="hover:text-primary">{r.ecole}</Link><div className="truncate text-[11.5px] text-text-faint">{detail}</div></span>
                  <span className="shrink-0 text-text-faint">{ilYa(r.createdAt)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Bloc>
    </div>
  );
}
