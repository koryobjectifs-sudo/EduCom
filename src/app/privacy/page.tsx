import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { PRIVACY_POLICY } from "@/lib/legal/terms";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-sunk py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-surface rounded-2xl border border-rule/50 p-6 sm:p-10 shadow-sm">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 text-sm font-semibold text-text-soft hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;inscription
        </Link>

        <div className="flex items-center gap-3 pb-6 border-b border-rule">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">{PRIVACY_POLICY.title}</h1>
            <p className="text-xs text-text-soft mt-0.5">
              Version {PRIVACY_POLICY.version} · Conforme Loi n° 2008-12 (CDP Sénégal)
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-6 text-role-body text-text-soft leading-relaxed">
          {PRIVACY_POLICY.sections.map((section) => (
            <div key={section.id} className="space-y-2">
              <h2 className="text-base font-bold text-text">{section.title}</h2>
              <p className="whitespace-pre-line">{section.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
