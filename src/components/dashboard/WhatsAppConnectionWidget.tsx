"use client";

import { useState } from "react";
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
  const connectionStatus = school.whatsappConnectionStatus || "NOT_CONNECTED";

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

      if (typeof window === "undefined" || !window.FB) {
        throw new Error("SDK Meta non chargé. Vérifiez NEXT_PUBLIC_META_APP_ID.");
      }

      window.FB.login((response: any) => {
        if (response.authResponse) {
          const { accessToken } = response.authResponse;
          finalizeWhatsAppConnection(accessToken).then((res) => {
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
          if (process.env.NEXT_PUBLIC_META_APP_ID) {
            window.fbAsyncInit = function() {
              window.FB.init({
                appId      : process.env.NEXT_PUBLIC_META_APP_ID!,
                cookie     : true,
                xfbml      : true,
                version    : 'v19.0'
              });
            };
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
