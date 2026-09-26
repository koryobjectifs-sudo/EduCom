/**
 * IA de la Communauté — 26 sept. 2026 (rédiger, résumer un sondage ou un
 * formulaire, récapituler un canal). API Messages d'Anthropic, appelée côté
 * serveur uniquement : la clé ne quitte jamais le serveur.
 *
 * Variables : ANTHROPIC_API_KEY (obligatoire pour activer l'IA),
 * EDUCOM_IA_MODELE (facultatif, défaut « claude-haiku-4-5-20251001 » :
 * rapide et économique pour des textes courts).
 *
 * ⚠️ Canal honnête : sans clé, rien n'est appelé et l'écran le dit.
 * ⚠️ Données : on n'envoie que le strict nécessaire (textes des publications,
 * totaux, réponses libres SANS les noms).
 */
const API = "https://api.anthropic.com/v1/messages";

export const iaConfiguree = () => Boolean(process.env.ANTHROPIC_API_KEY?.trim());

// Garde-fou de coût : 40 demandes par personne et par heure (mémoire du serveur).
const quotas = new Map<string, number[]>();
export function quotaIA(userId: string): boolean {
  const maintenant = Date.now();
  const recents = (quotas.get(userId) ?? []).filter((t) => maintenant - t < 3600_000);
  if (recents.length >= 40) return false;
  recents.push(maintenant);
  quotas.set(userId, recents);
  return true;
}

export async function demanderIA(system: string, prompt: string, maxTokens = 700): Promise<string> {
  const cle = process.env.ANTHROPIC_API_KEY?.trim();
  if (!cle) throw new Error("IA non configurée.");
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "x-api-key": cle,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.EDUCOM_IA_MODELE?.trim() || "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 200);
    console.error(`[ia] ${res.status} : ${detail}`);
    throw new Error(res.status === 401 ? "Clé d'IA refusée." : "L'IA n'a pas répondu. Réessayez dans un instant.");
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
}

export const SYSTEME_ECOLE = `Tu es l'assistant de communication d'une école au Sénégal, dans l'application EduCom.
Tu écris en français clair, chaleureux et respectueux, pour des parents et une équipe éducative.
Phrases courtes, pas de jargon, pas d'emojis excessifs (un ou deux au plus), pas de markdown (ni #, ni **).
Tu n'inventes jamais de date, d'heure, de montant ou de nom qui ne figure pas dans la demande.`;
