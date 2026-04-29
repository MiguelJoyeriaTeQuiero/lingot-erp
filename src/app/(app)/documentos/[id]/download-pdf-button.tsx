"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadDocumentPdf, type DocumentPdfPayload } from "@/lib/pdf/document-pdf";

export function DownloadPdfButton({ payload }: { payload: DocumentPdfPayload }) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => downloadDocumentPdf(payload)}
    >
      <Download className="h-4 w-4" />
      Descargar PDF
    </Button>
  );
}
