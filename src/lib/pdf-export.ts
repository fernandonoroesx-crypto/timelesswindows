import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Project, QuoteLineItem } from './types';
import { getItemSellingBreakdown, getItemCostBreakdown, calculateQuoteSummary, formatCurrency, calculateSm } from './pricing';
import { getProjectPricing } from './context';

async function loadLogoBase64(): Promise<string | null> {
  try {
    const response = await fetch('/images/timeless-logo.jpg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function exportQuotePdf(project: Project, clientAddress?: string) {
  const doc = new jsPDF();
  const pricing = getProjectPricing(project);
  const summary = calculateQuoteSummary(project.lineItems, project.settings, pricing);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // === HEADER ===
  // Client info (top-left)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  if (project.client) {
    doc.text(project.client, margin, y);
    y += 5;
  }
  if (clientAddress) {
    const addressLines = clientAddress.split(/[,\n]/).map(l => l.trim()).filter(Boolean);
    doc.setFontSize(9);
    for (const line of addressLines) {
      doc.text(line, margin, y);
      y += 4.5;
    }
  }

  // Project ref & date under client
  y += 2;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  if (project.projectRef) {
    doc.text(`Ref: ${project.projectRef}`, margin, y);
    y += 4;
  }
  doc.text(`Date: ${project.date || new Date().toLocaleDateString('en-GB')}`, margin, y);
  doc.setTextColor(0, 0, 0);

  // Company logo (top-right)
  const companyY = 14;
  const logoData = await loadLogoBase64();
  if (logoData) {
    // Logo aspect ratio ~3.7:1, render at ~60mm wide
    const logoW = 60;
    const logoH = logoW / 3.7;
    doc.addImage(logoData, 'JPEG', pageWidth - margin - logoW, companyY, logoW, logoH);
  } else {
    // Fallback to text if logo fails to load
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('TIMELESS', pageWidth - margin, companyY + 8, { align: 'right' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('DOORS & WINDOWS', pageWidth - margin, companyY + 17, { align: 'right' });
  }

  y = Math.max(y, companyY + 20) + 10;

  // Thin divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // === LINE ITEMS TABLE ===
  if (project.lineItems.length > 0) {
    const tableBody = project.lineItems.map((item, i) => {
      const breakdown = getItemSellingBreakdown(item, project.settings, pricing);
      const sm = calculateSm(item.widthMm, item.heightMm);
      return [
        item.itemRef || `${i + 1}`,
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
      head: [['Ref', 'Type', 'Size (mm)', 'SM', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: false as any,
        textColor: [60, 60, 60],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 30, 30],
        cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: 18 },
        3: { halign: 'right' },
        4: { halign: 'center', cellWidth: 14 },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
      didDrawPage: () => {
        // Draw header line under table head
      },
      willDrawCell: (data) => {
        // Draw bottom border on header row
        if (data.section === 'head') {
          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.3);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }
      },
    });

    y = (doc as any).lastAutoTable.finalY + 6;

    // Light line after table
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
  }

  // === SUMMARY SECTION (bottom area) ===
  // Check if we need a new page
  if (y > pageHeight - 80) {
    doc.addPage();
    y = 20;
  }

  // Summary lines - right-aligned like the template
  const summaryX = margin;
  const valueX = pageWidth - margin;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const summaryLines: Array<{ label: string; value: string }> = [
    { label: 'Materials:', value: formatCurrency(summary.sellingPrice.material) },
  ];

  // Only add labour if not supply only
  if (!project.settings.supplyOnly) {
    const labourTotal = summary.sellingPrice.installation
      + summary.sellingPrice.internalMakingGood
      + summary.sellingPrice.externalMakingGood
      + summary.sellingPrice.architrave
      + summary.sellingPrice.trims
      + summary.sellingPrice.mdfReveal
      + summary.sellingPrice.deliveryStock
      + summary.sellingPrice.fensaSurvey;
    summaryLines.push({ label: 'Labour:', value: formatCurrency(labourTotal) });
  }

  if (project.settings.includeWasteDisposal && summary.sellingPrice.wasteDisposal > 0) {
    summaryLines.push({ label: 'Waste Disposal:', value: formatCurrency(summary.sellingPrice.wasteDisposal) });
  }

  if (summary.sellingPrice.extras > 0) {
    summaryLines.push({ label: 'Extras:', value: formatCurrency(summary.sellingPrice.extras) });
  }

  // Draw summary rows
  for (const line of summaryLines) {
    doc.setFont('helvetica', 'normal');
    doc.text(line.label, summaryX, y);
    doc.text(line.value, valueX, y, { align: 'right' });
    y += 6;
  }

  // Notes for extras
  const notes: string[] = [];
  if (project.settings.includeInternalMakingGood) notes.push('Inc. Internal Making Good');
  if (project.settings.includeExternalMakingGood) notes.push('Inc. External Making Good');

  if (notes.length > 0) {
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    for (const note of notes) {
      doc.text(`*${note}`, summaryX, y);
      y += 4;
    }
    doc.setTextColor(0, 0, 0);
    y += 2;
  }

  y += 4;

  // Divider before total
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(summaryX, y, valueX, y);
  y += 8;

  // TOTAL INVOICE
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL INVOICE:', summaryX, y);
  doc.text(formatCurrency(summary.sellingPrice.total), valueX, y, { align: 'right' });

  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('All prices excl. VAT', summaryX, y);
  doc.setTextColor(0, 0, 0);

  // === FOOTER ===
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const pageStr = `Page ${String(pg).padStart(2, '0')} of ${String(totalPages).padStart(2, '0')}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // Save
  const filename = `Quote-${project.projectRef || project.id}.pdf`;
  doc.save(filename);
}

export async function exportInstallationPdf(project: Project) {
  const doc = new jsPDF();
  const pricing = getProjectPricing(project);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = 20;

  // === HEADER ===
  const logoData = await loadLogoBase64();
  if (logoData) {
    const logoW = 60;
    const logoH = logoW / 3.7;
    doc.addImage(logoData, 'JPEG', pageWidth - margin - logoW, 14, logoW, logoH);
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Installation Costs Report', margin, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  if (project.client) {
    doc.text(project.client, margin, y);
    y += 5;
  }
  if (project.projectRef) {
    doc.text(`Ref: ${project.projectRef}`, margin, y);
    y += 5;
  }
  doc.text(`Date: ${project.date || new Date().toLocaleDateString('en-GB')}`, margin, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // Divider
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // === TABLE ===
  if (project.lineItems.length > 0) {
    let grandCostTotal = 0;
    let grandCostTotal = 0;
    const detailBody = project.lineItems.map((item, i) => {
      const costBreakdown = getItemCostBreakdown(item, project.settings, pricing);
      const sellingBreakdown = getItemSellingBreakdown(item, project.settings, pricing);
      const installCost = costBreakdown.installation * item.qty;
      const installSelling = sellingBreakdown.installation * item.qty;
      grandCostTotal += installCost;
      grandSellingTotal += installSelling;

      // Build extras description
      const extraParts: string[] = [];
      if (item.extra1 !== 'none') extraParts.push(item.extra1);
      if (item.extra2 !== 'none') extraParts.push(item.extra2);
      if (item.customExtra > 0) extraParts.push(`Custom (${formatCurrency(item.customExtra)})`);
      const extrasDesc = extraParts.length > 0 ? extraParts.join(', ') : '—';

      return [
        item.itemRef || `${i + 1}`,
        item.type,
        `${item.widthMm} × ${item.heightMm}`,
        item.qty.toString(),
        formatCurrency(installCost),
        formatCurrency(installSelling),
        extrasDesc,
      ];
    });

    // Add total row
    detailBody.push(['', '', '', 'Total:', formatCurrency(grandCostTotal), formatCurrency(grandSellingTotal), '']);

    autoTable(doc, {
      startY: y,
      head: [['Ref', 'Type', 'Size (mm)', 'Qty', 'Install Cost', 'Install Selling', 'Extras']],
      body: detailBody,
      theme: 'plain',
      headStyles: {
        fillColor: false as any,
        textColor: [60, 60, 60],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 30, 30],
        cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      },
      columnStyles: {
        0: { cellWidth: 16 },
        3: { halign: 'center', cellWidth: 14 },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { cellWidth: 40 },
      },
      margin: { left: margin, right: margin },
      willDrawCell: (data) => {
        if (data.section === 'head') {
          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.3);
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
        }
        // Bold the total row
        if (data.section === 'body' && data.row.index === detailBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
  }

  // === FOOTER ===
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    const pageStr = `Page ${String(pg).padStart(2, '0')} of ${String(totalPages).padStart(2, '0')}`;
    doc.text(pageStr, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  const filename = `Installation-${project.projectRef || project.id}.pdf`;
  doc.save(filename);
}
