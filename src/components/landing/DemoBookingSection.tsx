"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageSquare, PhoneCall, CheckCircle2, ArrowRight, ShieldCheck, Clock } from "lucide-react";

const WHATSAPP_EQUIPE = "221773024844";

export default function DemoBookingSection() {
  const [formSent, setFormSent] = useState(false);
  const [ecole, setEcole] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [cycle, setCycle] = useState("primaire");
  const [ville, setVille] = useState("Dakar");

  const whatsappMessage = encodeURIComponent(
    `Bonjour, je suis responsable d'établissement au Sénégal (${ecole || "Mon école"}) et je souhaite planifier une démonstration de 20 minutes d'EduCom.`
  );

  /**
   * ⚠️ 23 septembre 2026 — le formulaire ne transmettait RIEN. `handleSubmit`
   * se contentait d'afficher « Demande bien reçue ! » : chaque directeur qui le
   * remplissait croyait être rappelé, et la demande était perdue. En pleine
   * campagne de prospection, c'est la fuite de conversion la plus coûteuse de
   * la page.
   *
   * Correctif sans base ni migration : la demande part sur le WhatsApp de
   * l'équipe (même numéro que le bouton de gauche), pré-remplie avec toutes les
   * réponses. Le message de confirmation dit la vérité : il faut appuyer sur
   * « Envoyer » dans WhatsApp. Une vraie table de prospects demandera une
   * migration — décision de Kory.
   */
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cycles: Record<string, string> = {
      primaire: "Élémentaire (CI à CM2)",
      moyen: "Moyen (6e à 3e)",
      secondaire: "Secondaire (2nde à Tle)",
      multi: "Plusieurs cycles",
    };
    const texte = [
      "Bonjour EduCom, je souhaite être rappelé pour une démonstration.",
      `École : ${ecole}`,
      `Nom et rôle : ${nom}`,
      `Téléphone : ${telephone}`,
      `Ville : ${ville || "—"}`,
      `Cycles : ${cycles[cycle] ?? cycle}`,
    ].join("\n");
    window.open(`https://wa.me/${WHATSAPP_EQUIPE}?text=${encodeURIComponent(texte)}`, "_blank", "noopener,noreferrer");
    setFormSent(true);
  }

  return (
    <section id="demo" className="scroll-mt-20 bg-m-paper-deep py-20 lg:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3.5 py-1 text-[12px] font-semibold text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            Démonstration personnalisée · 20 minutes
          </div>
          <h2 className="mt-4 font-display text-[2rem] font-semibold leading-[1.1] tracking-[-0.03em] text-m-ink sm:text-[2.75rem]">
            Voyez comment EduCom fonctionne avec les cas réels de votre école.
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-m-ink-soft">
            Échangez avec notre équipe à Dakar ou en visio. Nous vous montrons la saisie des notes,
            les bulletins officiels et la facturation en direct.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Option 1 : Contact direct WhatsApp (Canal privilégié au Sénégal) */}
          <div className="flex flex-col justify-between rounded-[20px] border border-emerald-200 bg-white p-7 sm:p-9 shadow-sm lg:col-span-5">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                <MessageSquare className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-display text-[1.25rem] font-semibold text-m-ink">
                Échangez directement sur WhatsApp
              </h3>
              <p className="mt-2.5 text-[14px] leading-[1.65] text-m-ink-soft">
                Vous préférez un échange rapide sans remplir de formulaire ? Discutez directement avec un spécialiste EduCom sur WhatsApp.
              </p>

              <div className="mt-6 space-y-2.5 border-t border-m-line-soft pt-6 text-[13px] text-m-ink-soft">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Réponse sous quelques minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Sans engagement, adapté à vos disponibilités</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <a
                href={`https://wa.me/${WHATSAPP_EQUIPE}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 hover:shadow-md"
              >
                <MessageSquare className="h-4 w-4" />
                Réserver via WhatsApp
              </a>
            </div>
          </div>

          {/* Option 2 : Formulaire de demande de rappel rapide */}
          <div className="rounded-[20px] border border-m-line bg-m-card p-7 sm:p-9 shadow-xs lg:col-span-7">
            {formSent ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-display text-[1.35rem] font-semibold text-m-ink">
                  Plus qu&apos;une étape : envoyez le message
                </h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-m-ink-soft">
                  Merci <strong>{nom || "Monsieur/Madame"}</strong>. WhatsApp s&apos;est ouvert avec votre demande déjà rédigée :
                  appuyez sur <strong>Envoyer</strong> et notre équipe vous rappelle au <strong>{telephone}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setFormSent(false)}
                  className="mt-4 min-h-11 text-[13px] font-medium text-m-ink-soft underline underline-offset-4 hover:text-m-ink"
                >
                  WhatsApp ne s&apos;est pas ouvert ? Réessayer
                </button>
                <div className="mt-6">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 text-[14px] font-semibold text-m-accent-deep hover:underline"
                  >
                    Ou commencez à explorer par vous-même
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center gap-2 pb-1 text-[13px] font-bold uppercase tracking-wider text-m-ink-faint">
                  <PhoneCall className="h-4 w-4 text-m-accent-deep" />
                  Être rappelé par notre équipe
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="demo-ecole" className="block text-[12.5px] font-medium text-m-ink">
                      Nom de l&apos;établissement *
                    </label>
                    <input
                      id="demo-ecole"
                      type="text"
                      required
                      value={ecole}
                      onChange={(e) => setEcole(e.target.value)}
                      placeholder="Ex: Groupe Scolaire ..."
                      className="mt-1.5 w-full rounded-control border border-m-line bg-white px-3.5 py-2.5 text-[14px] text-m-ink placeholder:text-m-ink-faint focus:border-m-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="demo-nom" className="block text-[12.5px] font-medium text-m-ink">
                      Votre nom & rôle *
                    </label>
                    <input
                      id="demo-nom"
                      type="text"
                      required
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Ex: M. Diop, Directeur"
                      className="mt-1.5 w-full rounded-control border border-m-line bg-white px-3.5 py-2.5 text-[14px] text-m-ink placeholder:text-m-ink-faint focus:border-m-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <label htmlFor="demo-tel" className="block text-[12.5px] font-medium text-m-ink">
                      Numéro Téléphone / WhatsApp *
                    </label>
                    <input
                      id="demo-tel"
                      type="tel"
                      required
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      placeholder="+221 77 ..."
                      className="mt-1.5 w-full rounded-control border border-m-line bg-white px-3.5 py-2.5 text-[14px] text-m-ink placeholder:text-m-ink-faint focus:border-m-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="demo-ville" className="block text-[12.5px] font-medium text-m-ink">
                      Ville
                    </label>
                    <input
                      id="demo-ville"
                      type="text"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      placeholder="Dakar, Thiès..."
                      className="mt-1.5 w-full rounded-control border border-m-line bg-white px-3.5 py-2.5 text-[14px] text-m-ink placeholder:text-m-ink-faint focus:border-m-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="demo-cycle" className="block text-[12.5px] font-medium text-m-ink">
                    Cycles concernés
                  </label>
                  <select
                    id="demo-cycle"
                    value={cycle}
                    onChange={(e) => setCycle(e.target.value)}
                    className="mt-1.5 w-full rounded-control border border-m-line bg-white px-3.5 py-2.5 text-[14px] text-m-ink focus:border-m-ink focus:outline-none"
                  >
                    <option value="primaire">Élémentaire / Primaire (CI à CM2)</option>
                    <option value="moyen">Collège / Cycle Moyen (6e à 3e)</option>
                    <option value="secondaire">Lycée / Secondaire (2nde à Tle)</option>
                    <option value="multi">Groupe Scolaire (Plusieurs cycles)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-control bg-m-ink px-6 text-[15px] font-semibold text-white transition-all hover:bg-m-ink/85 hover:shadow-sm"
                  >
                    Demander à être rappelé
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <p className="mt-2 text-center text-[11.5px] text-m-ink-faint">
                    La demande part sur notre WhatsApp. Nous vous rappelons sous 24 h ouvrées ; vos données ne sont jamais partagées.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
