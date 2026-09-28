import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePathAccess } from "@/lib/documentContext";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import FormulaireAide from "@/components/aide/FormulaireAide";
import RepondreEcole from "./Fil";

const TYPE: Record<string, string> = { QUESTION: "Question", PROBLEME: "Problème", CHANGEMENT: "Changement" };
const STATUT: Record<string, { nom: string; ton: string }> = {
  OUVERT: { nom: "Envoyée", ton: "bg-sunk text-text-soft" },
  EN_COURS: { nom: "En cours", ton: "bg-primary/10 text-primary" },
  RESOLU: { nom: "Résolue", ton: "bg-success/10 text-success" },
};

/** Aide & support (27 sept. 2026) : mes demandes à l'équipe EduCom et leurs réponses. */
export default async function Aide({ searchParams }: { searchParams: Promise<{ t?: string; nouveau?: string }> }) {
  const ctx = await requirePathAccess("/dashboard/aide");
  const { t, nouveau } = await searchParams;
  const direction = ctx.role === "OWNER" || ctx.role === "ADMIN";
  const where = { schoolId: ctx.schoolId, ...(direction ? {} : { userId: ctx.user.id }) };
  const tickets = await prisma.supportTicket.findMany({ where, orderBy: { lastMessageAt: "desc" }, take: 100 }).catch(() => []);
  const choisi = t ? await prisma.supportTicket.findFirst({ where: { ...where, id: t }, include: { messages: { orderBy: { createdAt: "asc" } } } }).catch(() => null) : null;
  const auteurs = new Map(
    (await prisma.user.findMany({ where: { id: { in: [...new Set([...tickets.map((x) => x.userId), ...(choisi?.messages.map((m) => m.authorId) ?? [])])] } }, select: { id: true, firstName: true, lastName: true } })).map((u) => [u.id, `${u.firstName} ${u.lastName}`]),
  );
  const nouvelle = nouveau === "1" || (!choisi && tickets.length === 0);

  return (
    <div className="space-y-5 pb-10">
      <PageHeader
        breadcrumb={[{ label: "Accueil", href: "/dashboard" }, { label: "Aide" }]}
        title="Aide & support"
        description="Une question, un problème, un changement ? L'équipe EduCom vous répond ici."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/aide/guide"
              className="inline-flex h-8.5 items-center gap-1.5 rounded-control border border-rule bg-surface px-3 text-role-label font-semibold text-text hover:bg-sunk transition-colors"
            >
              <span>Guide de mon métier</span>
            </Link>
            {!nouvelle && (
              <Link
                href="/dashboard/aide?nouveau=1"
                className="inline-flex h-8.5 items-center rounded-control bg-primary-ink px-3 text-role-label font-semibold text-white"
              >
                Nouvelle demande
              </Link>
            )}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card flush title={`${direction ? "Demandes de l'école" : "Mes demandes"} · ${tickets.length}`}>
          {tickets.length === 0 ? (
            <p className="px-4 py-6 text-center text-role-body text-text-soft">Aucune demande pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y divide-rule">
              {tickets.map((x) => {
                const nonLu = !x.schoolReadAt || x.schoolReadAt < x.lastMessageAt;
                return (
                  <li key={x.id}>
                    <Link href={`/dashboard/aide?t=${x.id}`} className={`block px-4 py-2.5 hover:bg-sunk ${x.id === t ? "bg-primary/5" : ""}`}>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`truncate text-role-label ${nonLu ? "font-bold text-text" : "font-medium text-text"}`}>{nonLu && <span className="mr-1 inline-block h-2 w-2 rounded-full bg-danger" />}{x.subject}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${STATUT[x.status]?.ton ?? ""}`}>{STATUT[x.status]?.nom ?? x.status}</span>
                      </div>
                      <p className="text-role-meta text-text-faint">{TYPE[x.kind] ?? x.kind} · {x.lastMessageAt.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}{direction && x.userId !== ctx.user.id ? ` · ${auteurs.get(x.userId) ?? ""}` : ""}</p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title={nouvelle ? "Écrire à l'équipe EduCom" : choisi ? choisi.subject : undefined}>
          {nouvelle ? (
            <FormulaireAide pageForcee="/dashboard/aide" />
          ) : !choisi ? (
            <p className="py-12 text-center text-role-body text-text-soft">Choisissez une demande à gauche.</p>
          ) : (
            <div className="space-y-3">
              {choisi.messages.map((m) => (
                <div key={m.id} className={`max-w-[85%] rounded-xl px-3 py-2 text-role-body ${m.fromEduCom ? "bg-primary/10 text-text" : "ml-auto bg-sunk text-text"}`}>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="mt-0.5 text-[10.5px] text-text-faint">{m.fromEduCom ? "Équipe EduCom" : (auteurs.get(m.authorId) ?? "")} · {m.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              ))}
              <RepondreEcole ticketId={choisi.id} resolu={choisi.status === "RESOLU"} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
