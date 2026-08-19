"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Link2, Check } from "lucide-react";

export default function CopyLinkButton({ surveyId }: { surveyId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const url = `${window.location.origin}/s/${surveyId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      aria-label={copied ? "Lien copié" : "Copier le lien du sondage"}
      icon={copied
        ? <Check aria-hidden="true" className="h-4 w-4 text-success" />
        : <Link2 aria-hidden="true" className="h-4 w-4" />}
    />
  );
}
