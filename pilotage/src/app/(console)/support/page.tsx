import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { roleLabel } from "@/lib/educom";
import { Bloc, EnTete, ilYa } from "@/components/ui";
import { Repondre } from "./Conversation";
import Annonce from "./Annonce";

const TYPE: Record<string, { nom: string; ton: string }> = {
  QUESTION: { nom: "Question", ton: "bg-success/10 text-success" },
  PROBLEME: { nom: "Problème", ton: "bg-danger/10 text-danger" },
  CHANGEMENT: { nom: "Changement", ton: "bg-primary/10 text-primary" },
};
const FILTRES = [
  { id: "ACTIFS", nom: "À traiter" },
  { id: "RESOLU", nom: "Résolues" },
  { id: "TOUS", nom: "Toutes" },
];

export default async function Support({ searchParams }: { searchParams: Promise<{ t?: string; f?: string }> }) {
  const { t, f = "ACTIFS" } = await searchParams;
  const where = f === "RESOLU" ? { status: "RESOLU" } : f === "TOUS" ? {} : { status: { not: "RESOLU" } };
  const tickets = await prisma.supportTicket.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: 100 }).catch(() => null);
  if (!tickets) {
    return (
      <div className="mx-auto max-w-3xl">
        <EnTete titre="Support" />
        <Bloc><p className="py-6 text-center text-[13px] text-text-soft">Les tables du support n&apos;existent pas encore : cliquez sur « Mettre à jour la base » dans EduCom.</p></Bloc>
      </div>
    );
  }
  const ids = [...new Set(tickets.map((x) => x.schoolId))];
  const choisi = t ? await prisma.supportTicket.findUnique({ where: { id: t }, include: { messages: { orderBy: { createdAt: "asc" } } } }) : null;
  const userIds = [...new Set([...tickets.map((x) => x.userId), ...(choisi?.messages.map((m) => m.authorId) ?? []), ...(choisi ? [choisi.userId] : [])])];
  const [ecoles, gens] = await Promise.all([
    prisma.school.findMany({ where: { id: { in: [...ids, ...(choisi ? [choisi.schoolId] : [])] } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, firstName: true, lastName: true, role: true, email: true, phone: true } }),
  ]);
  const nomEcole = new Map(ecoles.map((e) => [e.id, e.name]));
  const personne = new Map(gens.map((g) => [g.id, g]));
  const auteur = choisi ? personne.get(choisi.userId) : null;
  const lien = (x: Record<string, string>) => `/support?${new URLSearchParams({ ...(f !== "ACTIFS" ? { f } : {}), ...x })}`;

  return (
    <div className="mx-auto max-w-7xl">
      <EnTete titre="Support" sous="Les demandes envoyées par les écoles avec le bouton « Aide »." actions={<Annonce />} />
      <div className="grid gap-3 lg:grid-cols-[340px_1fr]">
        <div>
          <div className="mb-2 flex gap-1.5">
            {FILTRES.map((x) => (
              <Link key={x.id} href={`/support?${new URLSearchParams(x.id !== "ACTIFS" ? { f: x.id } : {})}`} className={`rounded-full border px-3 py-1 text-[12px] font-medium ${f === x.id ? "border-primary bg-primary text-white" : "border-rule bg-surface text-text-soft"}`}>{x.nom}</Link>
            ))}
          </div>
          <div className="space-y-1.5">
            {tickets.length === 0 && <p className="rounded-xl border border-dashed border-rule p-6 text-center text-[13px] text-text-soft">Aucune demande.</p>}
            {tickets.map((x) => {
              const nonLu = !x.staffReadAt || x.staffReadAt < x.lastMessageAt;
              return (
                <Link key={x.id} href={lien({ t: x.id })} className={`block rounded-xl border px-3 py-2 ${x.id === t ? "border-primary bg-primary/5" : "border-rule bg-surface hover:bg-sunk"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={`truncate text-[13px] ${nonLu ? "font-bold" : "font-medium"}`}>{nonLu && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />}{x.subject}</span>
                    <span className={`shrink-0 rounded-full px-1.5 text-[10.5px] font-semibold ${TYPE[x.kind]?.ton ?? ""}`}>{TYPE[x.kind]?.nom ?? x.kind}</span>
                  </div>
                  <p className="text-[11.5px] text-text-faint">{nomEcole.get(x.schoolId) ?? "?"} · {ilYa(x.lastMessageAt)}{x.status === "EN_COURS" ? " · en cours" : x.status === "RESOLU" ? " · résolue" : ""}</p>
                </Link>
              );
            })}
          </div>
        </div>
        <div>
          {!choisi ? (
            <Bloc><p className="py-16 text-center text-[13px] text-text-soft">Choisissez une demande à gauche.</p></Bloc>
          ) : (
            <Bloc
              titre={choisi.subject}
              actions={<Link href={`/ecoles/${choisi.schoolId}`} className="rounded-lg border border-rule px-2.5 py-1 text-[12px] font-medium hover:bg-sunk">Fiche école</Link>}
            >
              <p className="mb-3 rounded-lg bg-sunk px-2.5 py-1.5 text-[11.5px] text-text-soft">
                {nomEcole.get(choisi.schoolId)} · {auteur ? `${auteur.firstName} ${auteur.lastName} (${roleLabel(auteur.role)})` : "compte supprimé"}
                {auteur?.phone ? ` · ${auteur.phone}` : ""} · page : {choisi.page ?? "—"} · {choisi.createdAt.toLocaleString("fr-FR")}
              </p>
              <div className="mb-3 space-y-2">
                {choisi.messages.map((m) => {
                  const p = personne.get(m.authorId);
                  return (
                    <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-[13px] ${m.fromEduCom ? "ml-auto bg-primary text-white" : "bg-sunk text-text"}`}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={`mt-0.5 text-[10.5px] ${m.fromEduCom ? "text-white/70" : "text-text-faint"}`}>{m.fromEduCom ? "EduCom" : p ? `${p.firstName} ${p.lastName}` : "?"} · {m.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                    </div>
                  );
                })}
              </div>
              <Repondre ticketId={choisi.id} statut={choisi.status} />
            </Bloc>
          )}
        </div>
      </div>
    </div>
  );
}
