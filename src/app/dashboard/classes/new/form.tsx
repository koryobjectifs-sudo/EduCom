"use client";

import { useActionState } from "react";
import { createClass, updateClass } from "../actions";
import Link from "next/link";
import { ArrowLeft, BookOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";

export function ClassForm({ teachers, initialData }: { teachers: any[], initialData?: any }) {
  const [state, formAction, isPending] = useActionState<any, any>(
    async (prevState: any, formData: FormData) => {
      if (initialData?.id) {
        return await updateClass(initialData.id, formData);
      } else {
        return await createClass(formData);
      }
    },
    { error: "" }
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 pb-2">
        <Link
          href={initialData ? `/dashboard/classes/${initialData.id}` : "/dashboard/classes"}
          className="rounded-full p-2 text-text-muted hover:bg-secondary hover:text-text-primary transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {initialData ? "Modifier la Classe" : "Nouvelle Classe"}
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {initialData ? "Modifiez les informations de cette classe." : "Créez une nouvelle classe et assignez-lui un professeur principal."}
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-8">
        <div className="rounded-3xl border border-border bg-white shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <BookOpen className="w-5 h-5"/>
            </div>
            <h2 className="text-lg font-semibold text-text-primary">
              Informations de la Classe
            </h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input
              label="Nom de la classe"
              required
              type="text"
              name="name"
              id="name"
              defaultValue={initialData?.name}
              placeholder="Ex: CP, CE1, 6ème A..."
            />
            <Select
              label="Cycle éducatif"
              required
              name="cycle"
              id="cycle"
              defaultValue={initialData?.cycle || ""}
              hint="Détermine le regroupement de la classe sur la page Classes."
            >
              <option value="" disabled>Choisir un cycle...</option>
              <option value="MATERNELLE">Maternelle</option>
              <option value="ELEMENTAIRE">Élémentaire</option>
              <option value="COLLEGE">Collège</option>
              <option value="LYCEE">Lycée</option>
            </Select>
            <Select
              label="Professeur Principal"
              name="teacherId"
              id="teacherId"
              defaultValue={initialData?.teacherId || ""}
            >
              <option value="">Aucun professeur assigné</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </Select>
          </div>
        </div>

        {state?.error && (
          <p className="text-sm text-error font-medium bg-error/10 p-4 rounded-2xl">{state.error}</p>
        )}

        <div className="flex justify-end gap-3 pt-6">
          <Link
            href={initialData ? `/dashboard/classes/${initialData.id}` : "/dashboard/classes"}
            className="px-6 py-3 text-sm font-medium text-text-primary bg-white border border-border rounded-xl hover:bg-secondary transition-colors"
          >
            Annuler
          </Link>
          <Button
            type="submit"
            size="lg"
            loading={isPending}
            icon={<Save aria-hidden="true" className="w-4 h-4" />}
          >
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
