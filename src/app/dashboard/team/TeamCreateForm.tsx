"use client";

import { useActionState } from "react";
import { createStaffMember } from "./actions";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { ROLE_LABELS, type RoleType } from "@/lib/permissions";

/**
 * Rôles qu'un administrateur peut attribuer.
 *
 * `OWNER` est exclu : il ne s'attribue pas depuis un formulaire. `PARENT` aussi —
 * un parent est créé par l'admission d'un élève, pas par la gestion d'équipe.
 */
const ASSIGNABLE: RoleType[] = ["TEACHER", "SECRETARY", "ACCOUNTANT", "ASSISTANT", "ADMIN"];

export default function TeamCreateForm({ managers }: { managers: any[] }) {
  const [state, formAction, isPending] = useActionState<any, any>(
    async (prevState: any, formData: FormData) => {
      return await createStaffMember(formData);
    },
    { error: "", success: false }
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Prénom" required type="text" id="firstName" name="firstName" placeholder="Jean" />
        <Input label="Nom" required type="text" id="lastName" name="lastName" placeholder="Dupont" />
      </div>

      <Input label="Adresse email" required type="email" id="email" name="email" placeholder="jean.dupont@ecole.fr" />

      <Select label="Rôle" required id="role" name="role" defaultValue="TEACHER">
        {/* Options tirées de ROLE_LABELS : un rôle ajouté au système apparaît
            ici automatiquement, avec son libellé français. */}
        {ASSIGNABLE.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r].label} — {ROLE_LABELS[r].description}
          </option>
        ))}
      </Select>

      <Select label="Responsable hiérarchique" id="managerId" name="managerId" defaultValue="">
        <option value="">Aucun responsable (au sommet)</option>
        {managers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.firstName} {m.lastName} ({ROLE_LABELS[m.role as RoleType]?.label})
          </option>
        ))}
      </Select>

      <Input
        label="Mot de passe provisoire"
        required
        type="text"
        id="password"
        name="password"
        defaultValue="educom2026"
        hint="Le collaborateur pourra le modifier plus tard."
      />

      {state?.error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 rounded-xl bg-green-50 border border-green-100 text-sm text-green-700">
          Compte créé avec succès ! Le membre est ajouté à l'équipe.
        </div>
      )}

      <Button type="submit" block loading={isPending} icon={<UserPlus aria-hidden="true" className="w-4 h-4" />}>
        {isPending ? "Création en cours..." : "Créer le compte"}
      </Button>
    </form>
  );
}
