"use client";

import { useEffect, useState } from "react";
import { BellRing, Share } from "lucide-react";
import { enregistrerAbonnementPush } from "@/app/dashboard/communications/communaute/actions";

/**
 * « Recevoir les notifications » — phase 4, 25 sept. 2026.
 * S'affiche tant que l'appareil n'est pas abonné ; disparaît ensuite.
 * iPhone : Apple n'autorise les notifications web qu'une fois EduCom ajouté à
 * l'écran d'accueil — on le dit, avec le geste exact, au lieu d'échouer en silence.
 */
const CLE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function cleEnOctets(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

type Etat = "chargement" | "inutile" | "ios-installer" | "proposer" | "refuse" | "actif";

export default function ActiverNotifications() {
  const [etat, setEtat] = useState<Etat>("chargement");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!CLE) return setEtat("inutile");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const installe = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setEtat(ios && !installe ? "ios-installer" : "inutile");
      }
      if (Notification.permission === "denied") return setEtat("refuse");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        // Réenregistre au besoin (changement d'école ou de compte sur l'appareil).
        await enregistrerAbonnementPush({ ...(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }), userAgent: navigator.userAgent });
        return setEtat("actif");
      }
      setEtat("proposer");
    })().catch(() => setEtat("inutile"));
  }, []);

  const activer = async () => {
    setErreur(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setEtat("refuse");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: cleEnOctets(CLE) });
      const r = await enregistrerAbonnementPush({ ...(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }), userAgent: navigator.userAgent });
      if (!r.ok) throw new Error(r.error);
      setEtat("actif");
    } catch (e) {
      setErreur((e as Error).message || "Activation impossible.");
    }
  };

  if (etat === "chargement" || etat === "inutile" || etat === "actif") return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-surface border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-text">
      <BellRing aria-hidden="true" className="h-5 w-5 shrink-0 text-primary" />
      {etat === "proposer" && (
        <>
          <span className="min-w-0 flex-1">Soyez prévenu sur ce téléphone à chaque annonce ou message de l&apos;école.</span>
          <button type="button" onClick={activer} className="min-h-10 rounded-control bg-primary px-4 text-sm font-semibold text-white">
            Activer les notifications
          </button>
        </>
      )}
      {etat === "ios-installer" && (
        <span className="min-w-0 flex-1">
          Sur iPhone : touchez <Share aria-label="Partager" className="inline h-4 w-4 align-text-bottom" /> puis
          « Sur l&apos;écran d&apos;accueil », ouvrez EduCom depuis l&apos;icône, et activez les notifications.
        </span>
      )}
      {etat === "refuse" && (
        <span className="min-w-0 flex-1">
          Les notifications sont bloquées pour EduCom. Réactivez-les dans les réglages du navigateur pour être prévenu.
        </span>
      )}
      {erreur && <p role="alert" className="w-full text-xs font-medium text-danger">{erreur}</p>}
    </div>
  );
}
