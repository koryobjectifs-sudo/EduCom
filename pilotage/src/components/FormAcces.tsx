"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";

type Action = (etat: { error: string } | undefined, fd: FormData) => Promise<{ error: string } | undefined>;

export default function FormAcces({ action, installation }: { action: Action; installation?: boolean }) {
  const [etat, envoyer, enCours] = useActionState(action, undefined);
  const champ = "h-10 w-full rounded-lg border border-rule bg-surface px-3 text-[14px]";
  return (
    <form action={envoyer} className="space-y-3">
      <label className="block text-[12.5px] font-medium text-text-soft">E-mail<input name="email" type="email" required autoComplete="username" className={champ} /></label>
      <label className="block text-[12.5px] font-medium text-text-soft">Mot de passe<input name="motDePasse" type="password" required autoComplete={installation ? "new-password" : "current-password"} className={champ} /></label>
      {installation && (
        <label className="block text-[12.5px] font-medium text-text-soft">Confirmer le mot de passe<input name="confirmation" type="password" required autoComplete="new-password" className={champ} /></label>
      )}
      {etat?.error && <p role="alert" className="text-[12.5px] text-danger">{etat.error}</p>}
      <Button type="submit" loading={enCours} className="w-full">{installation ? "Créer mon accès" : "Se connecter"}</Button>
    </form>
  );
}
