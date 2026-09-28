import { lesErreurs } from "@/lib/donnees";
import { Bloc, EnTete, ilYa } from "@/components/ui";

const TYPE: Record<string, string> = { render: "affichage", action: "action", route: "API", proxy: "proxy" };

export default async function Erreurs() {
  const groupes = await lesErreurs();
  return (
    <div className="space-y-4">
      <EnTete titre="Erreurs serveur" sous="14 derniers jours, regroupées par page et message. Captées automatiquement (aucun cookie, aucune donnée de formulaire)." />
      <Bloc>
        {groupes.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-text-soft">Aucune erreur serveur. 👌</p>
        ) : (
          <ul className="divide-y divide-rule">
            {groupes.map((g, i) => (
              <li key={i} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <span className="font-semibold text-text">{g.path} <span className="font-normal text-text-faint">· {TYPE[g.routeType ?? ""] ?? g.routeType ?? "?"}</span></span>
                  <span className="text-text-faint"><b className="text-danger">{g.n}×</b> · dernière {ilYa(g.derniere)} · première {ilYa(g.premiere)}</span>
                </div>
                <p className="mt-0.5 break-words font-mono text-[11.5px] text-text-soft">{g.message}</p>
                {g.digest && <p className="text-[10.5px] text-text-faint">digest {g.digest}</p>}
              </li>
            ))}
          </ul>
        )}
      </Bloc>
    </div>
  );
}
