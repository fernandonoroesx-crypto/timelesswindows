import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, QuoteLineItem } from './types';
import { getItemSellingBreakdown, calculateQuoteSummary, formatCurrency, calculateSm } from './pricing';
import { getProjectPricing } from './context';

export function exportQuotePdf(project: Project, clientAddress?: string) {
  const doc = new jsPDF();
  const pricing = getProjectPricing(project);
  const summary = calculateQuoteSummary(project.lineItems, project.settings, pricing);

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  let y = 20;

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', margin, y);

  // Status badge
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const statusText = project.status.toUpperCase();
  const statusWidth = doc.getTextWidth(statusText) + 8;
  doc.setFillColor(34, 55, 92);
  doc.roundedRect(pageWidth - margin - statusWidth, y - 7, statusWidth, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(statusText, pageWidth - margin - statusWidth + 4, y);
  doc.setTextColor(0, 0, 0);

  y += 12;

  // Project info row
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Project Ref:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(project.projectRef || '—', margin + 28, y);

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', margin + 80, y);
  doc.setFont('helvetica', 'normal');
  doc.text(project.date || '—', margin + 92, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Client:', margin, y);
  doc.setFont('helvetica', 'normal');
  doc.text(project.client || '—', margin + 28, y);

  if (clientAddress) {
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(clientAddress, margin + 28, y);
    doc.setTextColor(0, 0, 0);
  }

  y += 10;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Items table
  const tableBody = project.lineItems.map((item, i) => {
    const breakdown = getItemSellingBreakdown(item, project.settings, pricing);
    const sm = calculateSm(item.widthMm, item.heightMm);
    return [
      (i + 1).toString(),
      item.itemRef || `Item ${i + 1}`,
      item.type,
      `${item.widthMm} × ${item.heightMm}`,
      sm.toFixed(2),
      item.qty.toString(),
      formatCurrency(breakdown.unitTotal),
      formatCurrency(breakdown.total),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['#', 'Ref', 'Type', 'Size (mm)', 'SM', 'Qty', 'Unit Price', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [34, 55, 92],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // Check if we need a new page for summary
  if (y > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    y = 20;
  }

  // Summary box
  const boxWidth = 80;
  const boxX = pageWidth - margin - boxWidth;

  doc.setFillColor(245, 245, 248);
  doc.roundedRect(boxX, y, boxWidth, 52, 3, 3, 'F');

  doc.setFontSize(9);
  const summaryItems = [
    ['Total Items:', summary.totalItems.toString()],
    ['Total SM:', summary.totalSm.toFixed(2)],
    ['Selling Price:', formatCurrency(summary.sellingPrice.total)],
    ['Cost Price:', formatCurrency(summary.costPrice.total)],
    ['Profit:', formatCurrency(summary.profit)],
    ['Margin:', `${summary.margin.toFixed(1)}%`],
  ];

  let sy = y + 8;
  for (const [label, val] of summaryItems) {
    const isBold = label === 'Selling Price:' || label === 'Profit:';
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.text(label, boxX + 4, sy);
    doc.text(val, boxX + boxWidth - 4, sy, { align: 'right' });
    sy += 7;
  }

  // Settings note
  y += 58;
  if (y < doc.internal.pageSize.getHeight() - 30) {
    doc.setFontSize(7);
    doc.setTextColor(140, 140, 140);
    const notes: string[] = [];
    if (project.settings.supplyOnly) notes.push('Supply Only');
    if (project.settings.includeWasteDisposal) notes.push('Inc. Waste Disposal');
    if (project.settings.includeInternalMakingGood) notes.push('Inc. Internal Making Good');
    if (project.settings.includeExternalMakingGood) notes.push('Inc. External Making Good');
    if (notes.length > 0) {
      doc.text(`Notes: ${notes.join(' • ')}`, margin, y);
    }
    doc.setTextColor(0, 0, 0);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, margin, pageHeight - 10);
  doc.text(`Page 1`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  // Save
  const filename = `Quote-${project.projectRef || project.id}.pdf`;
  doc.save(filename);
}
