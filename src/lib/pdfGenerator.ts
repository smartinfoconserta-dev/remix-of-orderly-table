/**
 * PDF generation utility using jsPDF + jspdf-autotable.
 * Branded reports with dark header, primary accent line, tables, and summary boxes.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

interface PdfHeaderInput {
  nomeRestaurante: string;
  cnpj?: string;
  titulo: string;
  periodo: string;
}

export function createPdf(input: PdfHeaderInput): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Dark header band
  doc.setFillColor(25, 25, 30);
  doc.rect(0, 0, pageW, 32, "F");

  // Restaurant name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(input.nomeRestaurante, 14, 14);

  // CNPJ
  if (input.cnpj) {
    doc.setFontSize(9);
    doc.setTextColor(180, 180, 180);
    doc.text(`CNPJ: ${input.cnpj}`, 14, 20);
  }

  // Primary accent line
  doc.setFillColor(249, 115, 22); // orange-500 as default primary
  doc.rect(0, 32, pageW, 1.5, "F");

  // Title + period
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(input.titulo, 14, 42);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Período: ${input.periodo}`, 14, 48);

  // Generated at
  const now = new Date().toLocaleString("pt-BR");
  doc.text(`Gerado em: ${now}`, pageW - 14, 48, { align: "right" });

  // Set cursor for content
  (doc as any).__cursorY = 56;

  return doc;
}

export function addTableToPdf(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  options?: { startY?: number; title?: string },
) {
  let y = options?.startY ?? (doc as any).__cursorY ?? 56;

  if (options?.title) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(options.title, 14, y);
    y += 6;
  }

  autoTable(doc, {
    startY: y,
    head: [headers],
    body: rows.map(r => r.map(String)),
    theme: "grid",
    headStyles: {
      fillColor: [35, 35, 40],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.3,
      cellPadding: 3,
    },
    margin: { left: 14, right: 14 },
  });

  (doc as any).__cursorY = (doc as any).lastAutoTable?.finalY + 8 || y + 20;
}

export function addSummaryBox(
  doc: jsPDF,
  items: { label: string; value: string }[],
  options?: { startY?: number; title?: string },
) {
  const pageW = doc.internal.pageSize.getWidth();
  let y = options?.startY ?? (doc as any).__cursorY ?? 56;

  if (options?.title) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(options.title, 14, y);
    y += 6;
  }

  const boxW = pageW - 28;
  const boxH = items.length * 8 + 8;

  doc.setFillColor(245, 245, 248);
  doc.roundedRect(14, y, boxW, boxH, 3, 3, "F");

  doc.setFontSize(9);
  let iy = y + 7;
  items.forEach((item) => {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(item.label, 18, iy);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(item.value, pageW - 18, iy, { align: "right" });

    iy += 8;
  });

  (doc as any).__cursorY = y + boxH + 6;
}

export function savePdf(doc: jsPDF, filename: string) {
  doc.save(filename);
}
