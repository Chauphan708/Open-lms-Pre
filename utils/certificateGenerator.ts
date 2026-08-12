import jsPDF from 'jspdf';

/**
 * Generates a professional course completion certificate as a PDF.
 * Uses jsPDF (already installed in the project).
 */
export function generateCertificatePDF(params: {
  studentName: string;
  courseName: string;
  teacherName: string;
  completionDate: string;
  totalXP: number;
  totalStudyTime: number;
}): void {
  const { studentName, courseName, teacherName, completionDate, totalXP, totalStudyTime } = params;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // ── Background ──────────────────────────────────────────────
  doc.setFillColor(250, 250, 252);
  doc.rect(0, 0, W, H, 'F');

  // ── Border frame ────────────────────────────────────────────
  doc.setDrawColor(99, 102, 241); // indigo-500
  doc.setLineWidth(2);
  doc.rect(10, 10, W - 20, H - 20);
  doc.setLineWidth(0.5);
  doc.rect(14, 14, W - 28, H - 28);

  // ── Corner decorations ──────────────────────────────────────
  const cornerSize = 18;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  // Top-left
  doc.line(18, 18, 18 + cornerSize, 18);
  doc.line(18, 18, 18, 18 + cornerSize);
  // Top-right
  doc.line(W - 18, 18, W - 18 - cornerSize, 18);
  doc.line(W - 18, 18, W - 18, 18 + cornerSize);
  // Bottom-left
  doc.line(18, H - 18, 18 + cornerSize, H - 18);
  doc.line(18, H - 18, 18, H - 18 - cornerSize);
  // Bottom-right
  doc.line(W - 18, H - 18, W - 18 - cornerSize, H - 18);
  doc.line(W - 18, H - 18, W - 18, H - 18 - cornerSize);

  // ── Title ───────────────────────────────────────────────────
  let y = 42;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(99, 102, 241);
  doc.text('OPEN LMS — EDULEARN', W / 2, y, { align: 'center' });

  y += 14;
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('CHỨNG NHẬN HOÀN THÀNH', W / 2, y, { align: 'center' });

  // ── Divider ─────────────────────────────────────────────────
  y += 8;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(W / 2 - 50, y, W / 2 + 50, y);

  // ── Subtitle ────────────────────────────────────────────────
  y += 12;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Chứng nhận rằng', W / 2, y, { align: 'center' });

  // ── Student name ────────────────────────────────────────────
  y += 16;
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(studentName, W / 2, y, { align: 'center' });

  // ── Underline under name ────────────────────────────────────
  y += 3;
  const nameWidth = doc.getTextWidth(studentName);
  doc.setDrawColor(199, 210, 254); // indigo-200
  doc.setLineWidth(0.5);
  doc.line(W / 2 - nameWidth / 2, y, W / 2 + nameWidth / 2, y);

  // ── Course info ─────────────────────────────────────────────
  y += 14;
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Đã hoàn thành xuất sắc khóa học', W / 2, y, { align: 'center' });

  y += 12;
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  // Truncate long course names
  const truncatedName = courseName.length > 60 ? courseName.substring(0, 57) + '...' : courseName;
  doc.text(`"${truncatedName}"`, W / 2, y, { align: 'center' });

  // ── Stats row ───────────────────────────────────────────────
  y += 18;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);

  const studyHours = Math.floor(totalStudyTime / 3600);
  const studyMins = Math.floor((totalStudyTime % 3600) / 60);
  const timeStr = studyHours > 0 ? `${studyHours} giờ ${studyMins} phút` : `${studyMins} phút`;

  const statsText = `XP đạt được: ${totalXP}  •  Thời gian học: ${timeStr}`;
  doc.text(statsText, W / 2, y, { align: 'center' });

  // ── Bottom section ──────────────────────────────────────────
  y = H - 48;

  // Left: Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Ngày cấp', 60, y, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(formatDate(completionDate), 60, y + 8, { align: 'center' });

  // Center: Seal circle
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1);
  doc.circle(W / 2, y + 2, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('EDULEARN', W / 2, y, { align: 'center' });
  doc.setFontSize(6);
  doc.text('VERIFIED', W / 2, y + 4, { align: 'center' });

  // Right: Teacher
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Giáo viên phụ trách', W - 60, y, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(teacherName, W - 60, y + 8, { align: 'center' });

  // ── Signature lines ─────────────────────────────────────────
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.line(30, y + 12, 90, y + 12);
  doc.line(W - 90, y + 12, W - 30, y + 12);

  // ── Save ────────────────────────────────────────────────────
  const safeFileName = courseName.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, '').substring(0, 40).trim();
  doc.save(`Chung_nhan_${safeFileName}.pdf`);
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return isoString;
  }
}
