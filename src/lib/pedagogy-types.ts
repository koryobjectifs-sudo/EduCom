export type SchoolTypeOption = "MATERNELLE" | "PRIMAIRE" | "MATERNELLE_PRIMAIRE" | "COLLEGE" | "LYCEE";

export const SCHOOL_TYPE_CLASSES: Record<
  SchoolTypeOption,
  { name: string; cycle: "MATERNELLE" | "ELEMENTAIRE" | "COLLEGE" | "LYCEE" }[]
> = {
  MATERNELLE: [
    { name: "Petite Section", cycle: "MATERNELLE" },
    { name: "Moyenne Section", cycle: "MATERNELLE" },
    { name: "Grande Section", cycle: "MATERNELLE" },
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
    { name: "Petite Section", cycle: "MATERNELLE" },
    { name: "Moyenne Section", cycle: "MATERNELLE" },
    { name: "Grande Section", cycle: "MATERNELLE" },
    { name: "CI", cycle: "ELEMENTAIRE" },
    { name: "CP", cycle: "ELEMENTAIRE" },
    { name: "CE1", cycle: "ELEMENTAIRE" },
    { name: "CE2", cycle: "ELEMENTAIRE" },
    { name: "CM1", cycle: "ELEMENTAIRE" },
    { name: "CM2", cycle: "ELEMENTAIRE" },
  ],
  COLLEGE: [
    { name: "6ème", cycle: "COLLEGE" },
    { name: "5ème", cycle: "COLLEGE" },
    { name: "4ème", cycle: "COLLEGE" },
    { name: "3ème", cycle: "COLLEGE" },
  ],
  LYCEE: [
    { name: "Seconde", cycle: "LYCEE" },
    { name: "Première", cycle: "LYCEE" },
    { name: "Terminale", cycle: "LYCEE" },
  ],
};

export type PedagogySetupPayload = {
  classes: { name: string; cycle: "MATERNELLE" | "ELEMENTAIRE" | "COLLEGE" | "LYCEE" }[];
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
