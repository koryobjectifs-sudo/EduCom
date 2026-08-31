"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { MessageCircle, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { simulateConnectWhatsApp, disconnectWhatsApp, finalizeWhatsAppConnection } from "@/app/dashboard/settings/actions";

export type WhatsAppSchoolInfo = {
  whatsappConnectionStatus: string | null;
  whatsappName: string | null;
  whatsappPhone: string | null;
  whatsappConnectedAt: Date | null;
};

export function WhatsAppConnectionWidget({ school }: { school: WhatsAppSchoolInfo }) {
  const [isConnecting, setIsConnecting] = useState(false);
  // Vrai seulement une fois `FB.init()` réellement exécuté — la présence de
  // `window.FB` ne prouve pas que le SDK est initialisé.
  const [sdkReady, setSdkReady] = useState(false);
  const connectionStatus = school.whatsappConnectionStatus || "NOT_CONNECTED";

  // ══════════════════════════════════════════════════════════════════════════
  // DIAGNOSTIC TEMPORAIRE — LOT 18E. À RETIRER une fois la cause identifiée.
  //
  // Meta publie l'avancement du parcours Embedded Signup par `postMessage`
  // (c'est ce que déclenche `sessionInfoVersion: '3'` plus bas). Sans cet
  // écouteur, une annulation côté Meta est totalement MUETTE : `FB.login` ne
  // rappelle rien d'exploitable et le serveur ne voit rien non plus, puisque
  // aucun code n'est jamais émis. C'est exactement l'angle mort des lots 18B et
  // 18C — on épluchait des logs serveur en attendant une réponse qui, par
  // construction, n'y arrivait pas.
  //
  // Purement additif : cet écouteur n'intercepte rien et ne modifie aucun
  // comportement. Il observe.
  //
  // ⚠️ Aucun secret journalisé. Meta n'envoie ici ni jeton ni code d'échange.
  // Les identifiants WABA et numéro sont malgré tout masqués (4 derniers
  // caractères), ce qui suffit à les reconnaître sans les diffuser.
  // ══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    // Deux domaines : Meta bascule de `www` à `web` selon la session.
    const ORIGINES_META = ["https://www.facebook.com", "https://web.facebook.com"];

    type ChargeMeta = {
      type?: string;
      event?: string;
      version?: number;
      data?: Record<string, unknown>;
    };

    const masquer = (v: unknown) =>
      typeof v === "string" && v.length > 4
        ? `…${v.slice(-4)} (${v.length} car.)`
        : "(absent)";

    const surMessage = (event: MessageEvent) => {
      // La page reçoit quantité de `postMessage` étrangers (HMR, devtools) :
      // on ne retient que ceux qui viennent réellement de Meta.
      if (!ORIGINES_META.includes(event.origin)) return;

      let charge: ChargeMeta;
      try {
        charge = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        // Un message Meta non-JSON peut porter une erreur brute : on le signale
        // plutôt que de l'avaler en silence.
        console.warn(
          "[DIAG 18E] message Meta non-JSON depuis",
          event.origin,
          "→",
          String(event.data).slice(0, 200)
        );
        return;
      }

      if (charge?.type !== "WA_EMBEDDED_SIGNUP") return;

      const d = charge.data ?? {};
      console.log("[DIAG 18E] ── WA_EMBEDDED_SIGNUP ─────────────────────────");
      console.log("[DIAG 18E]   origine         :", event.origin);
      console.log("[DIAG 18E]   event           :", charge.event ?? "(aucun)");
      console.log("[DIAG 18E]   version         :", charge.version ?? "(aucune)");
      console.log("[DIAG 18E]   current_step    :", d.current_step ?? "(aucun)");
      console.log("[DIAG 18E]   error_message   :", d.error_message ?? "(aucun)");
      console.log("[DIAG 18E]   error_id        :", d.error_id ?? "(aucun)");
      console.log("[DIAG 18E]   waba_id         :", masquer(d.waba_id));
      console.log("[DIAG 18E]   phone_number_id :", masquer(d.phone_number_id));
      console.log("[DIAG 18E]   clés de data    :", Object.keys(d).join(", ") || "(vide)");
      console.log("[DIAG 18E] ───────────────────────────────────────────────");
    };

    window.addEventListener("message", surMessage);
    return () => window.removeEventListener("message", surMessage);
  }, []);

  const handleConnectWhatsApp = async () => {
    setIsConnecting(true);
    try {
      const useSimulator = process.env.NEXT_PUBLIC_ENABLE_META_SIMULATOR === "true";
      
      if (useSimulator) {
        const res = await simulateConnectWhatsApp();
        if (res.success) {
          toast.success("WhatsApp connecté avec succès ! (Mode Dev)");
        } else {
          toast.error("Erreur de connexion (Dev)", { description: res.error });
        }
        return;
      }

      if (typeof window === "undefined" || !window.FB || !sdkReady) {
        // Distinguer les deux pannes : le SDK peut être présent sans avoir été
        // initialisé, et l'erreur renvoyée par Meta est alors indéchiffrable.
        throw new Error(
          !window.FB
            ? "SDK Meta non chargé. Vérifiez NEXT_PUBLIC_META_APP_ID et la connexion réseau."
            : "SDK Meta chargé mais non initialisé. Rechargez la page."
        );
      }

      window.FB.login((response: any) => {
        // ⚠️ `response_type: 'code'` ci-dessous : Meta renvoie un CODE à usage
        // unique, jamais un jeton. Lire `accessToken` ici donnait `undefined`.
        // Le code ne vit que 30 secondes — il part au serveur immédiatement.
        const code = response.authResponse?.code;
        if (code) {
          finalizeWhatsAppConnection(code).then((res) => {
            if (res.success) {
              toast.success("WhatsApp connecté avec succès !");
            } else {
              toast.error("Erreur d'association Meta", { description: res.error });
            }
          }).finally(() => setIsConnecting(false));
        } else {
          setIsConnecting(false);
          toast.info("Connexion WhatsApp annulée.");
        }
      }, {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        }
      });
    } catch (e: any) {
      setIsConnecting(false);
      toast.error("Erreur système", { description: e.message || "Une erreur est survenue." });
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setIsConnecting(true);
    const res = await disconnectWhatsApp();
    if (res.success) {
      toast.success("WhatsApp déconnecté.");
    } else {
      toast.error("Erreur de déconnexion", { description: res.error });
    }
    setIsConnecting(false);
  };

  return (
    <div className="relative group flex flex-col items-end z-50">
      {/* Meta SDK Initialization */}
      <Script 
        src="https://connect.facebook.net/en_US/sdk.js" 
        strategy="lazyOnload"
        onLoad={() => {
          // ⚠️ `fbAsyncInit` était assigné ICI, dans `onLoad` — donc APRÈS que le
          // SDK se soit exécuté. Or le SDK appelle `fbAsyncInit` pendant son
          // propre chargement : au moment où il cherchait la fonction, elle
          // n'existait pas encore. `FB.init()` n'était donc JAMAIS appelé.
          // `window.FB` existait quand même, si bien que le garde `!window.FB`
          // passait et que `FB.login` partait sur un SDK non initialisé —
          // Meta annulait la session et renvoyait vers /dialog/oauth/business/cancel.
          //
          // `onLoad` se déclenche une fois le SDK exécuté : on initialise donc
          // directement, sans passer par le rappel.
          if (process.env.NEXT_PUBLIC_META_APP_ID && window.FB) {
            window.FB.init({
              appId      : process.env.NEXT_PUBLIC_META_APP_ID!,
              cookie     : true,
              xfbml      : true,
              version    : 'v19.0'
            });
            setSdkReady(true);
          }
        }}
      />

      <div className="flex items-center gap-2">
        {connectionStatus === "CONNECTED" ? (
          <div className="relative">
            {/* Minimalist Pill (Visible state) */}
            <div className="flex items-center gap-2 bg-white border border-green-200 px-3 py-1.5 rounded-full shadow-sm cursor-help hover:bg-green-50 transition-colors">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              <MessageCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {school.whatsappPhone || "Connecté"}
              </span>
            </div>

            {/* Hover Details Card (Isolated & Invisible until hover) */}
            <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-rule p-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all origin-top-right z-50">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-text">{school.whatsappName || "Compte WhatsApp"}</h4>
                  <p className="text-xs text-dim">{school.whatsappPhone}</p>
                </div>
              </div>
              
              <div className="space-y-2 border-t border-rule mt-3 pt-3">
                <div className="flex justify-between text-xs">
                  <span className="text-dim">Statut</span>
                  <span className="font-medium text-green-600">Actif</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dim">Connecté le</span>
                  <span className="font-medium text-text">
                    {school.whatsappConnectedAt ? new Date(school.whatsappConnectedAt).toLocaleDateString("fr-FR") : "Inconnu"}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDisconnectWhatsApp}
                disabled={isConnecting}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Unlink className="w-3.5 h-3.5" />
                {isConnecting ? "Déconnexion..." : "Déconnecter le numéro"}
              </button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={handleConnectWhatsApp}
            loading={isConnecting}
            icon={<MessageCircle className="w-4 h-4 text-[#25D366]" />}
            className="bg-white border-green-200 shadow-sm text-green-800 hover:bg-green-50 text-sm rounded-full font-medium"
          >
            Connecter WhatsApp
          </Button>
        )}
      </div>
      
      {process.env.NODE_ENV === "development" && connectionStatus !== "CONNECTED" && (
        <div className="mt-1 text-[10px] text-amber-600/60 font-medium">
          Mode Dev : Simulation activée
        </div>
      )}
    </div>
  );
}
