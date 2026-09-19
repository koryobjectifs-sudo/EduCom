"use server";

import { requireActionContext } from "@/lib/actionContext";
import { schoolDocUrl } from "@/lib/schoolDocuments";
import { recordAudit } from "@/lib/audit";

export async function getFamilyDocumentUrl(documentId: string) {
  const auth = await requireActionContext("/famille");
  if (!auth.ok) return { error: auth.error };

  const res = await schoolDocUrl(auth.ctx, documentId, 180);
  if ("error" in res) return { error: res.error };

  await recordAudit(auth.ctx, {
    action: "schoolDocument.download",
    entity: "schoolDocument",
    entityId: documentId,
    outcome: "success",
    details: { fileName: res.fileName },
  });

  return { data: res };
}
