"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getFamilyDocumentUrl } from "./actions";

export default function DownloadDocButton({
  documentId,
  fileName,
}: {
  documentId: string;
  fileName: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await getFamilyDocumentUrl(documentId);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      if (res.data?.url) {
        window.open(res.data.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      alert("Erreur lors de la récupération du document.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-surface px-3 py-1.5 text-xs font-semibold text-text hover:bg-sunk hover:text-primary transition-colors shrink-0 disabled:opacity-60"
      title={`Télécharger ${fileName}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <Download className="h-3.5 w-3.5 text-primary" />
      )}
      <span>Télécharger</span>
    </button>
  );
}
