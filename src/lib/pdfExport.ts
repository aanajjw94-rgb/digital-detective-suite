import jsPDF from 'jspdf';
import 'jspdf-autotable';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

export interface ReportSection {
  title: string;
  content?: string;
  table?: {
    headers: string[];
    rows: string[][];
  };
}

export interface ForensicReport {
  toolName: string;
  toolNameAr: string;
  generatedAt: Date;
  fileName?: string;
  sections: ReportSection[];
  summary?: string;
}

const COLORS = {
  primary: [0, 255, 136],      // #00FF88 - cyber green
  secondary: [0, 212, 255],    // #00D4FF - cyan
  dark: [10, 15, 20],          // dark background
  text: [255, 255, 255],       // white text
  muted: [150, 150, 150],      // gray
  accent: [255, 107, 107],     // red for warnings
};

export const generateForensicPDF = (report: ForensicReport): void => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Background
  doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header with cyber design
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Header gradient effect
  doc.setFillColor(0, 200, 100);
  doc.rect(0, 32, pageWidth, 3, 'F');

  // Logo/Title
  doc.setTextColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('FORENSICLAB', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Digital Forensics Report', margin, 26);

  // Tool name (right aligned)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(report.toolName, pageWidth - margin, 18, { align: 'right' });

  yPos = 45;

  // Report metadata box
  doc.setFillColor(20, 25, 35);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'F');

  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setFontSize(9);
  doc.text('Generated:', margin + 5, yPos + 8);
  doc.text('Tool:', margin + 5, yPos + 15);
  if (report.fileName) {
    doc.text('File:', margin + 5, yPos + 22);
  }

  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(report.generatedAt.toLocaleString('en-US'), margin + 30, yPos + 8);
  doc.text(report.toolName, margin + 30, yPos + 15);
  if (report.fileName) {
    doc.text(report.fileName, margin + 30, yPos + 22);
  }

  // Case ID (right side)
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  doc.setFontSize(8);
  const caseId = `CASE-${Date.now().toString(36).toUpperCase()}`;
  doc.text(`Case ID: ${caseId}`, pageWidth - margin - 5, yPos + 8, { align: 'right' });

  yPos = 80;

  // Sections
  report.sections.forEach((section) => {
    // Check if we need a new page
    if (yPos > pageHeight - 50) {
      doc.addPage();
      // Add background to new page
      doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = margin;
    }

    // Section title with accent line
    doc.setFillColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.rect(margin, yPos, 3, 8, 'F');

    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin + 6, yPos + 6);

    yPos += 12;

    // Section content
    if (section.content) {
      doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');

      const lines = doc.splitTextToSize(section.content, pageWidth - 2 * margin);
      doc.text(lines, margin, yPos + 5);
      yPos += lines.length * 5 + 10;
    }

    // Table data
    if (section.table && section.table.rows.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [section.table.headers],
        body: section.table.rows,
        margin: { left: margin, right: margin },
        styles: {
          fillColor: [20, 25, 35],
          textColor: [255, 255, 255],
          fontSize: 8,
          cellPadding: 3,
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [25, 30, 40],
        },
        columnStyles: {
          0: { cellWidth: 'auto' },
        },
      });

      yPos = doc.lastAutoTable.finalY + 10;
    }

    yPos += 5;
  });

  // Summary box at the end
  if (report.summary) {
    if (yPos > pageHeight - 60) {
      doc.addPage();
      doc.setFillColor(COLORS.dark[0], COLORS.dark[1], COLORS.dark[2]);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      yPos = margin;
    }

    doc.setFillColor(30, 35, 45);
    doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'F');

    doc.setFillColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.rect(margin, yPos, 3, 30, 'F');

    doc.setTextColor(COLORS.accent[0], COLORS.accent[1], COLORS.accent[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', margin + 8, yPos + 8);

    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const summaryLines = doc.splitTextToSize(report.summary, pageWidth - 2 * margin - 16);
    doc.text(summaryLines, margin + 8, yPos + 15);
  }

  // Footer on each page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);

    // Footer text
    doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
    doc.setFontSize(7);
    doc.text('ForensicLab - Digital Forensics Platform', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  // Save the PDF
  const fileName = `ForensicLab_${report.toolName.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  doc.save(fileName);
};

// Helper function for hash analyzer
export const generateHashReport = (
  hashes: { md5: string; sha1: string; sha256: string; sha512: string },
  fileName?: string,
  inputText?: string
): void => {
  const report: ForensicReport = {
    toolName: 'Hash Analyzer',
    toolNameAr: 'محلل Hash',
    generatedAt: new Date(),
    fileName,
    sections: [
      {
        title: 'Input Data',
        content: fileName 
          ? `File: ${fileName}` 
          : `Text input (${inputText?.length || 0} characters)`,
      },
      {
        title: 'Hash Values',
        table: {
          headers: ['Algorithm', 'Hash Value'],
          rows: [
            ['MD5', hashes.md5],
            ['SHA-1', hashes.sha1],
            ['SHA-256', hashes.sha256],
            ['SHA-512', hashes.sha512],
          ],
        },
      },
    ],
    summary: 'Hash values calculated successfully. Use these values for file integrity verification and evidence validation.',
  };

  generateForensicPDF(report);
};

// Helper for File Carver
export interface CarvedFileInfo {
  type: string;
  extension: string;
  offset: number;
  size: number;
  category: string;
  confidence: number;
}

export const generateFileCarverReport = (
  diskImageName: string,
  diskImageSize: number,
  carvedFiles: CarvedFileInfo[]
): void => {
  const categoryCounts = carvedFiles.reduce((acc, file) => {
    acc[file.category] = (acc[file.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const report: ForensicReport = {
    toolName: 'File Carver',
    toolNameAr: 'أداة File Carving',
    generatedAt: new Date(),
    fileName: diskImageName,
    sections: [
      {
        title: 'Disk Image Information',
        table: {
          headers: ['Property', 'Value'],
          rows: [
            ['File Name', diskImageName],
            ['Size', formatBytes(diskImageSize)],
            ['Files Recovered', carvedFiles.length.toString()],
          ],
        },
      },
      {
        title: 'Recovery Summary by Category',
        table: {
          headers: ['Category', 'Count'],
          rows: Object.entries(categoryCounts).map(([cat, count]) => [cat, count.toString()]),
        },
      },
      {
        title: 'Recovered Files Details',
        table: {
          headers: ['Type', 'Offset (Hex)', 'Size', 'Confidence'],
          rows: carvedFiles.map(file => [
            `${file.type} (.${file.extension})`,
            `0x${file.offset.toString(16).toUpperCase()}`,
            formatBytes(file.size),
            `${file.confidence}%`,
          ]),
        },
      },
    ],
    summary: `Total ${carvedFiles.length} files recovered from disk image. High confidence files (>80%) are most reliable for forensic evidence.`,
  };

  generateForensicPDF(report);
};

// Helper for Android Log Analyzer
export interface LogAnalysisInfo {
  totalLines: number;
  errors: number;
  warnings: number;
  suspiciousActivities: Array<{ timestamp: string; tag: string; message: string }>;
  sensitiveData: Array<{ timestamp: string; tag: string; message: string }>;
  crashLogs: number;
  networkActivities: number;
  timeRange: { start: string; end: string };
  topApps: Array<[string, number]>;
}

export const generateAndroidLogReport = (analysis: LogAnalysisInfo): void => {
  const report: ForensicReport = {
    toolName: 'Android Log Analyzer',
    toolNameAr: 'محلل سجلات Android',
    generatedAt: new Date(),
    sections: [
      {
        title: 'Analysis Overview',
        table: {
          headers: ['Metric', 'Value'],
          rows: [
            ['Total Log Lines', analysis.totalLines.toString()],
            ['Time Range', `${analysis.timeRange.start} - ${analysis.timeRange.end}`],
            ['Errors', analysis.errors.toString()],
            ['Warnings', analysis.warnings.toString()],
            ['Suspicious Activities', analysis.suspiciousActivities.length.toString()],
            ['Sensitive Data Leaks', analysis.sensitiveData.length.toString()],
            ['Crash Logs', analysis.crashLogs.toString()],
            ['Network Activities', analysis.networkActivities.toString()],
          ],
        },
      },
      {
        title: 'Top Active Applications',
        table: {
          headers: ['Application/Tag', 'Activity Count'],
          rows: analysis.topApps.slice(0, 15).map(([app, count]) => [app, count.toString()]),
        },
      },
      {
        title: 'Suspicious Activities',
        table: {
          headers: ['Timestamp', 'Tag', 'Message'],
          rows: analysis.suspiciousActivities.slice(0, 30).map(s => [s.timestamp, s.tag, s.message.slice(0, 80)]),
        },
      },
      {
        title: 'Sensitive Data Exposures',
        table: {
          headers: ['Timestamp', 'Tag', 'Message'],
          rows: analysis.sensitiveData.slice(0, 20).map(s => [s.timestamp, s.tag, s.message.slice(0, 80)]),
        },
      },
    ],
    summary: `Analysis complete. Found ${analysis.suspiciousActivities.length} suspicious activities and ${analysis.sensitiveData.length} potential data leaks. Priority investigation recommended for high-risk findings.`,
  };

  generateForensicPDF(report);
};

// Generic report generator
export const generateGenericReport = (
  toolName: string,
  toolNameAr: string,
  data: Record<string, any>,
  fileName?: string
): void => {
  const sections: ReportSection[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      sections.push({
        title: key,
        table: {
          headers: Object.keys(value[0]),
          rows: value.map(item => Object.values(item).map(v => String(v))),
        },
      });
    } else if (typeof value === 'object' && value !== null) {
      sections.push({
        title: key,
        table: {
          headers: ['Property', 'Value'],
          rows: Object.entries(value).map(([k, v]) => [k, String(v)]),
        },
      });
    } else {
      sections.push({
        title: key,
        content: String(value),
      });
    }
  });

  const report: ForensicReport = {
    toolName,
    toolNameAr,
    generatedAt: new Date(),
    fileName,
    sections,
  };

  generateForensicPDF(report);
};
