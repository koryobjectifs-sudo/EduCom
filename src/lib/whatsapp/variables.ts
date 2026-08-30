export type VariableContext = {
  parent?: { firstName: string; lastName: string };
  student?: { firstName: string; lastName: string };
  school?: { name: string };
  invoice?: { amount: number; dueDate: Date };
  actionLinkToken?: string;
  reportCard?: { evaluationName: string; termName: string };
};

export const AVAILABLE_VARIABLES = [
  { id: "PARENT_FIRST_NAME", label: "Prénom du parent" },
  { id: "PARENT_LAST_NAME", label: "Nom du parent" },
  { id: "STUDENT_FIRST_NAME", label: "Prénom de l'enfant" },
  { id: "STUDENT_LAST_NAME", label: "Nom de l'enfant" },
  { id: "SCHOOL_NAME", label: "Nom de l'établissement" },
  { id: "INVOICE_AMOUNT", label: "Montant de la facture" },
  { id: "INVOICE_DUE_DATE", label: "Date d'échéance" },
  { id: "ACTION_LINK", label: "Lien d'action sécurisé (Token)" },
  { id: "REPORT_CARD_EVAL", label: "Nom de l'évaluation" },
  { id: "REPORT_CARD_TERM", label: "Nom du trimestre" },
] as const;

export type VariableId = typeof AVAILABLE_VARIABLES[number]["id"];

/**
 * Résout une variable EduCom à partir du contexte fourni.
 */
export function resolveVariable(varId: VariableId, context: VariableContext): string {
  switch (varId) {
    case "PARENT_FIRST_NAME":
      return context.parent?.firstName ?? "";
    case "PARENT_LAST_NAME":
      return context.parent?.lastName ?? "";
    case "STUDENT_FIRST_NAME":
      return context.student?.firstName ?? "";
    case "STUDENT_LAST_NAME":
      return context.student?.lastName ?? "";
    case "SCHOOL_NAME":
      return context.school?.name ?? "";
    case "INVOICE_AMOUNT":
      // A simple format for now, in a real case we'd use formatting utilities
      return context.invoice?.amount ? `${context.invoice.amount} FCFA` : "";
    case "INVOICE_DUE_DATE":
      return context.invoice?.dueDate 
        ? new Date(context.invoice.dueDate).toLocaleDateString("fr-FR") 
        : "";
    case "ACTION_LINK":
      return context.actionLinkToken ?? "";
    case "REPORT_CARD_EVAL":
      return context.reportCard?.evaluationName ?? "";
    case "REPORT_CARD_TERM":
      return context.reportCard?.termName ?? "";
    default:
      return "";
  }
}

export type TemplateMapping = {
  // e.g. "body": { "1": "PARENT_FIRST_NAME", "2": "INVOICE_AMOUNT" }
  [componentType: string]: Record<string, VariableId>;
};

/**
 * Construit l'objet `components` attendu par l'API Meta WhatsApp Cloud
 * en fonction du mapping configuré et du contexte métier.
 */
export function buildMetaComponents(mapping: TemplateMapping, context: VariableContext) {
  const metaComponents: any[] = [];

  for (const [componentType, varMap] of Object.entries(mapping)) {
    // Sort keys just in case (1, 2, 3...)
    const indices = Object.keys(varMap).sort((a, b) => parseInt(a) - parseInt(b));
    
    if (indices.length === 0) continue;

    const parameters = indices.map(indexStr => {
      const varId = varMap[indexStr];
      const resolvedValue = resolveVariable(varId, context);

      // Meta expect different types, but for basic placeholders, text is used.
      // For dynamic button URLs, the type is usually 'text' appended to the URL base.
      return {
        type: "text",
        text: resolvedValue || " " // Meta API usually rejects empty strings
      };
    });

    // Sub_type is required for URL buttons in some versions of API, 
    // but typically `type: "body"`, `type: "header"`, `type: "button"`
    metaComponents.push({
      type: componentType, // "body", "header", "button"
      parameters
    });
  }

  return metaComponents;
}
