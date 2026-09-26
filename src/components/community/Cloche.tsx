"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { mesNotifications, marquerNotificationsLues, type NotificationVue } from "@/app/dashboard/communications/communaute/notif-actions";
import { ilYa } from "./outils";

/**
 * Cloche de notifications — 26 sept. 2026 (personnel et familles).
 * Se met à jour toutes les 15 s tant que l'onglet est visible ; un petit
 * « ding » retentit à l'arrivée d'une nouvelle notification. Quand EduCom est
 * fermé, c'est la notification du téléphone / de l'ordinateur (Web Push) qui
 * prend le relais.
 */
function ding() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const note = (freq: number, debut: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + debut);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + debut + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + debut + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + debut);
      o.stop(ctx.currentTime + debut + 0.4);
    };
    note(880, 0);
    note(1320, 0.12);
    setTimeout(() => void ctx.close(), 800);
  } catch {
    /* navigateur sans son : la pastille suffit */
  }
}

export default function Cloche({ variante = "claire", espace = "personnel" }: { variante?: "claire" | "sombre"; espace?: "famille" | "personnel" }) {
  const router = useRouter();
  const [nonLues, setNonLues] = useState(0);
  const [liste, setListe] = useState<NotificationVue[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const precedent = useRef<number | null>(null);

  const charger = useCallback(async () => {
    const r = await mesNotifications(espace).catch(() => null);
    if (!r || !r.ok) return;
    if (precedent.current !== null && r.nonLues > precedent.current) ding();
    precedent.current = r.nonLues;
    setNonLues(r.nonLues);
    setListe(r.liste);
  }, [espace]);

  useEffect(() => {
    const premier = setTimeout(() => void charger(), 0);
    const t = setInterval(() => {
      if (document.visibilityState === "visible") void charger();
    }, 15000);
    return () => {
      clearTimeout(premier);
      clearInterval(t);
    };
  }, [charger]);

  const ouvrir = async (n: NotificationVue) => {
    setOuvert(false);
    if (!n.lue) {
      setNonLues((x) => Math.max(0, x - 1));
      precedent.current = Math.max(0, (precedent.current ?? 1) - 1);
      setListe((l) => l.map((x) => (x.id === n.id ? { ...x, lue: true } : x)));
      await marquerNotificationsLues([n.id], espace);
    }
    if (n.lien) router.push(n.lien);
  };

  const toutLire = async () => {
    setNonLues(0);
    precedent.current = 0;
    setListe((l) => l.map((x) => ({ ...x, lue: true })));
    await marquerNotificationsLues([], espace);
  };

  const sombre = variante === "sombre";
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={nonLues ? `Notifications (${nonLues} non lues)` : "Notifications"}
        aria-expanded={ouvert}
        className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          sombre ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-text-soft hover:bg-sunk hover:text-text"
        }`}
      >
        <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
        {nonLues > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold tabular-nums text-white">
            {nonLues > 99 ? "99+" : nonLues}
          </span>
        )}
      </button>
      {ouvert && (
        <>
          <button type="button" aria-hidden="true" tabIndex={-1} className="fixed inset-0 z-40 cursor-default" onClick={() => setOuvert(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-rule bg-surface text-text shadow-overlay">
            <div className="flex items-center justify-between border-b border-rule px-4 py-3">
              <p className="text-sm font-bold">Notifications</p>
              {nonLues > 0 && (
                <button type="button" onClick={toutLire} className="inline-flex items-center gap-1 text-xs font-semibold text-primary-ink hover:underline">
                  <CheckCheck aria-hidden="true" className="h-3.5 w-3.5" /> Tout marquer comme lu
                </button>
              )}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto">
              {liste.length === 0 && <li className="px-4 py-8 text-center text-sm text-text-soft">Rien de nouveau pour l&apos;instant.</li>}
              {liste.map((n) => (
                <li key={n.id} className="border-b border-rule last:border-0">
                  <button type="button" onClick={() => void ouvrir(n)} className={`flex w-full gap-3 px-4 py-3 text-left hover:bg-sunk/70 ${n.lue ? "" : "bg-primary-ink/[0.04]"}`}>
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.lue ? "bg-transparent" : "bg-primary-ink"}`} />
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm ${n.lue ? "text-text" : "font-bold text-text"}`}>{n.titre}</span>
                      {n.texte && <span className="mt-0.5 line-clamp-2 block text-[13px] text-text-soft">{n.texte}</span>}
                      <span className="mt-1 block text-[11px] text-text-faint">{ilYa(n.date)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
