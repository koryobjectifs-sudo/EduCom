import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy du pilotage : laisse passer (la session est vérifiée côté serveur,
 * `lib/acces.ts`). ⚠️ Sa présence est aussi NÉCESSAIRE : sans lui, Next
 * reprenait le `src/proxy.ts` d'EduCom quand le pilotage tourne avec les
 * dépendances de la racine du dépôt.
 */
export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
