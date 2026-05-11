"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadDocumentPdf, type DocumentPdfPayload } from "@/lib/pdf/document-pdf";

export function DownloadPdfButton({ payload }: { payload: DocumentPdfPayload }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      await downloadDocumentPdf(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      disabled={loading}
      onClick={handleClick}
    >
      <Download className="h-4 w-4" />
      {loading ? "Generando…" : "Descargar PDF"}
    </Button>
  );
}
