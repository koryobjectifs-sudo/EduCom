export type SchoolTypeOption = "MATERNELLE" | "PRIMAIRE" | "MATERNELLE_PRIMAIRE" | "COLLEGE" | "LYCEE";

export const SCHOOL_TYPE_CLASSES: Record<
  SchoolTypeOption,
  { name: string; cycle: "PRESCOLAIRE" | "ELEMENTAIRE" | "MOYEN" | "SECONDAIRE" }[]
> = {
  MATERNELLE: [
    { name: "Petite Section", cycle: "PRESCOLAIRE" },
    { name: "Moyenne Section", cycle: "PRESCOLAIRE" },
    { name: "Grande Section", cycle: "PRESCOLAIRE" },
  ],
  PRIMAIRE: [
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
  ],
  MATERNELLE_PRIMAIRE: [
    { name: "Petite Section", cycle: "PRESCOLAIRE" },
    { name: "Moyenne Section", cycle: "PRESCOLAIRE" },
    { name: "Grande Section", cycle: "PRESCOLAIRE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
  ],
  COLLEGE: [
    { name: "6ème", cycle: "MOYEN" },
    { name: "5ème", cycle: "MOYEN" },
    { name: "4ème", cycle: "MOYEN" },
    { name: "3ème", cycle: "MOYEN" },
  ],
  LYCEE: [
    { name: "Seconde", cycle: "SECONDAIRE" },
    { name: "Première", cycle: "SECONDAIRE" },
    { name: "Terminale", cycle: "SECONDAIRE" },
  ],
};

export type PedagogySetupPayload = {
  classes: { name: string; cycle: "PRESCOLAIRE" | "ELEMENTAIRE" | "MOYEN" | "SECONDAIRE" }[];
  academicYear?: string;
};

export type PedagogySetupResult = {
  classesCreated: number;
  classesExisting: number;
  subjectsCreated: number;
  linksCreated: number;
  termsCreated: number;
  evaluationsCreated: number;
  totalClasses: number;
  nonMaternelleClasses: number;
};
