import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Rafraîchissement de session et garde des routes protégées.
 *
 * ⚠️ **CE FICHIER S'APPELLE `proxy.ts`, PAS `middleware.ts`.** Next 16 a
 * renommé la convention (`node_modules/next/dist/docs/01-app/03-api-reference/
 * 03-file-conventions/proxy.md`). Écrit sous son ancien nom, le fichier est
 * bien exécuté — c'est le piège : les redirections fonctionnaient, si bien
 * qu'on croyait la migration inutile, pendant que **toutes les pages publiques
 * renvoyaient 404**. Ne pas le renommer en arrière.
 *
 * Le `matcher` exclut fichiers statiques, images et polices : leur faire
 * traverser un appel réseau à Supabase à chaque requête ralentirait la page
 * d'accueil, celle-là même qu'on veut rapide depuis Dakar.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|brand/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)',
  ],
}
