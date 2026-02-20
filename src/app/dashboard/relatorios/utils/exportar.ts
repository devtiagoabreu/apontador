import { toast } from '@/components/ui/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function exportarPDF(dados: any[], tipo: string, periodo: { inicio: Date; fim: Date }) {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text(`Relatório de ${tipo}`, 14, 22);
    
    // Período
    doc.setFontSize(10);
    doc.text(
      `Período: ${periodo.inicio.toLocaleDateString('pt-BR')} a ${periodo.fim.toLocaleDateString('pt-BR')}`,
      14,
      30
    );

    // Tabela
    const headers = Object.keys(dados[0] || {}).map(key => ({
      header: key.toUpperCase(),
      dataKey: key,
    }));

    autoTable(doc, {
      startY: 35,
      head: [headers.map(h => h.header)],
      body: dados.map(item => headers.map(h => item[h.dataKey] || '-')),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Salvar
    doc.save(`relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.pdf`);

    toast({
      title: 'Sucesso',
      description: 'PDF gerado com sucesso',
    });
  } catch (error) {
    toast({
      title: 'Erro',
      description: 'Erro ao gerar PDF',
      variant: 'destructive',
    });
  }
}

export async function exportarExcel(dados: any[], tipo: string, periodo: { inicio: Date; fim: Date }) {
  try {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Relatório');

    // Título
    worksheet.mergeCells('A1', 'F1');
    const titleRow = worksheet.getCell('A1');
    titleRow.value = `Relatório de ${tipo}`;
    titleRow.font = { size: 16, bold: true };
    titleRow.alignment = { horizontal: 'center' };

    // Período
    worksheet.mergeCells('A2', 'F2');
    const periodRow = worksheet.getCell('A2');
    periodRow.value = `Período: ${periodo.inicio.toLocaleDateString('pt-BR')} a ${periodo.fim.toLocaleDateString('pt-BR')}`;
    periodRow.font = { size: 12 };
    periodRow.alignment = { horizontal: 'center' };

    // Cabeçalhos
    if (dados.length > 0) {
      const headers = Object.keys(dados[0]);
      const headerRow = worksheet.addRow(headers.map(h => h.toUpperCase()));
      headerRow.font = { bold: true };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF3B82F6' },
        };
        cell.font = { color: { argb: 'FFFFFFFF' }, bold: true };
      });
    }

    // Dados
    dados.forEach(item => {
      worksheet.addRow(Object.values(item));
    });

    // Ajustar largura das colunas
    worksheet.columns.forEach(column => {
      column.width = 20;
    });

    // Gerar arquivo
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `relatorio-${tipo}-${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: 'Sucesso',
      description: 'Excel gerado com sucesso',
    });
  } catch (error) {
    toast({
      title: 'Erro',
      description: 'Erro ao gerar Excel',
      variant: 'destructive',
    });
  }
}