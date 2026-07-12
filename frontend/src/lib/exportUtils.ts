import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        return val ?? '';
      }).join(',')
    ),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(title: string, columns: string[], data: any[][], filename: string) {
  const doc = new jsPDF('landscape');
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

  autoTable(doc, {
    startY: 36,
    head: [columns],
    body: data,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] }, // Match standard UI dark colors
    styles: { fontSize: 9, cellPadding: 4 },
  });

  doc.save(filename);
}
