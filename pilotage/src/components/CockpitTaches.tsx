import Link from "next/link";
import type { LigneEcole } from "@/lib/donnees";
import { fcfa } from "@/lib/calculs";
import { CheckCircle2, Clock, MessageSquare, PhoneCall, Sparkles, UserX } from "lucide-react";
import { Bloc } from "@/components/ui";

export type DonneesTaches = {
  orphelines: LigneEcole[];
  finEssai: LigneEcole[];
  silencieuses: LigneEcole[];
  ticketsNonLus: { id: string; subject: string; kind: string; ecole: string }[];
  paiementsEnAttente: { id: string; schoolId: string; amountXof: number; school: { name: string } }[];
  erreurs24h: number;
};

export default function CockpitTaches({ taches }: { taches: DonneesTaches }) {
  const nbTotal =
    taches.orphelines.length +
    taches.finEssai.length +
    taches.ticketsNonLus.length +
    taches.paiementsEnAttente.length;

  return (
    <Bloc
      titre={
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Actions prioritaires du jour</span>
          <span className="rounded-full bg-sunk px-2 py-0.2 text-[10.5px] font-semibold text-text-soft">
            {nbTotal === 0 ? "À jour" : `${nbTotal} à traiter`}
          </span>
        </div>
      }
    >
      <div className="grid gap-3 md:grid-cols-2">
        {/* 1. Écoles bloquées : 0 prof assigné */}
        <div className="rounded-lg border border-rule bg-sunk/40 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-text">
              <UserX className="h-3.5 w-3.5 text-amber-600" />
              Classes sans prof ({taches.orphelines.length})
            </span>
            <span className="text-[10.5px] text-text-faint">Bloque les notes</span>
          </div>

          {taches.orphelines.length === 0 ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Toutes les classes ont un enseignant.
            </p>
          ) : (
            <ul className="mt-1.5 divide-y divide-rule text-[11.5px]">
              {taches.orphelines.slice(0, 3).map((e) => {
                const tel = e.proprietaire?.telephone?.replace(/\D/g, "");
                const msg = `Bonjour ${e.proprietaire?.nom || "Directeur"}, vos classes sont créées sur EduCom mais aucun professeur n'est encore assigné. Souhaitez-vous que nous vous guidions en 2 minutes pour leur ouvrir l'accès aux notes ?`;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0 truncate">
                      <Link href={`/ecoles/${e.id}`} className="font-semibold text-text hover:text-primary truncate block">
                        {e.nom}
                      </Link>
                      <span className="text-[10px] text-text-faint">
                        {e.classes} classes · {e.eleves} élèves
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {tel && (
                        <a
                          href={`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-emerald-600 px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700"
                        >
                          WhatsApp
                        </a>
                      )}
                      <Link
                        href={`/ecoles/${e.id}`}
                        className="rounded border border-rule bg-surface px-1.5 py-0.5 text-[10.5px] font-medium text-text-soft hover:text-text"
                      >
                        Fiche
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 2. Essais se terminant dans < 72h */}
        <div className="rounded-lg border border-rule bg-sunk/40 p-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-text">
              <Clock className="h-3.5 w-3.5 text-rose-600" />
              Fin d&apos;essai imminente ({taches.finEssai.length})
            </span>
            <span className="text-[10.5px] text-text-faint">&le; 3 jours</span>
          </div>

          {taches.finEssai.length === 0 ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3 w-3" /> Aucun essai n&apos;expire sous 72 h.
            </p>
          ) : (
            <ul className="mt-1.5 divide-y divide-rule text-[11.5px]">
              {taches.finEssai.slice(0, 3).map((e) => {
                const tel = e.proprietaire?.telephone?.replace(/\D/g, "");
                const msg = `Bonjour ${e.proprietaire?.nom || "Directeur"}, votre essai EduCom expire dans ${e.joursRestants ?? 0} jour(s). Souhaitez-vous que nous fassions le point ou activer votre abonnement ?`;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                    <div className="min-w-0 truncate">
                      <Link href={`/ecoles/${e.id}`} className="font-semibold text-text hover:text-primary truncate block">
                        {e.nom}
                      </Link>
                      <span className="text-[10px] text-rose-700 font-medium">
                        J-{e.joursRestants} · {e.eleves} élèves
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {tel && (
                        <a
                          href={`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-emerald-600 px-2 py-0.5 text-[10.5px] font-semibold text-white hover:bg-emerald-700"
                        >
                          Relancer
                        </a>
                      )}
                      <Link
                        href={`/ecoles/${e.id}`}
                        className="rounded border border-rule bg-surface px-1.5 py-0.5 text-[10.5px] font-medium text-text-soft hover:text-text"
                      >
                        Offrir 7 j
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 3. Support client non lu */}
        {taches.ticketsNonLus.length > 0 && (
          <div className="rounded-lg border border-rule bg-sunk/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-text">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Support en attente ({taches.ticketsNonLus.length})
              </span>
              <Link href="/support" className="text-[10.5px] font-semibold text-primary hover:underline">
                Ouvrir →
              </Link>
            </div>
            <ul className="mt-1.5 divide-y divide-rule text-[11.5px]">
              {taches.ticketsNonLus.slice(0, 2).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="truncate"><b>{t.ecole}</b> : {t.subject}</span>
                  <Link href={`/support?t=${t.id}`} className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Répondre
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 4. Paiements Wave en attente */}
        {taches.paiementsEnAttente.length > 0 && (
          <div className="rounded-lg border border-rule bg-sunk/40 p-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-text">
                <PhoneCall className="h-3.5 w-3.5 text-sky-600" />
                Paiements Wave en attente ({taches.paiementsEnAttente.length})
              </span>
            </div>
            <ul className="mt-1.5 divide-y divide-rule text-[11.5px]">
              {taches.paiementsEnAttente.slice(0, 2).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="truncate"><b>{p.school.name}</b> · {fcfa(p.amountXof)}</span>
                  <Link href={`/ecoles/${p.schoolId}`} className="rounded bg-sky-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    Vérifier
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Bloc>
  );
}
