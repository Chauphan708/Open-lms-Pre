import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle,
  AlignmentType,
  VerticalAlign
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * Xuất hồ sơ học tập ra file Word (.docx) chuyên nghiệp
 */
export const exportPortfolioToWord = async (
  studentName: string,
  className: string,
  data: {
    avgScore: number;
    totalAttempts: number;
    studyStreak: number;
    behaviorScore: number;
    behaviorPositive: number;
    behaviorNegative: number;
    arenaElo: number;
    arenaWins: number;
    arenaLosses: number;
    towerFloor: number;
    attendance: { present: number; absent: number; total: number };
    weakTopics: { topic: string; subject: string; incorrectRate: number }[];
    aiAnalysis?: string;
    teacherNotes: { category: string; title: string; content: string; date: string }[];
  }
) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            text: "HỒ SƠ HỌC TẬP TOÀN DIỆN",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Học sinh: `, bold: true }),
              new TextRun(studentName),
              new TextRun({ text: `    Lớp: `, bold: true }),
              new TextRun(className),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),

          // 1. Chỉ số tổng quan
          new Paragraph({
            text: "1. CHỈ SỐ TỔNG QUAN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 120 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Điểm TB", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Điểm Hành vi", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Elo Arena", bold: true })], alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tầng Tháp", bold: true })], alignment: AlignmentType.CENTER })] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: data.avgScore.toFixed(1), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: (data.behaviorScore >= 0 ? "+" : "") + data.behaviorScore, alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: String(data.arenaElo), alignment: AlignmentType.CENTER })] }),
                  new TableCell({ children: [new Paragraph({ text: String(data.towerFloor), alignment: AlignmentType.CENTER })] }),
                ],
              }),
            ],
          }),

          // 2. Kết quả học tập
          new Paragraph({
            text: "2. CHI TIẾT HỌC TẬP",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Tổng số nhiệm vụ đã hoàn thành: `, bold: true }),
              new TextRun(String(data.totalAttempts)),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Chuỗi ngày học tập: `, bold: true }),
              new TextRun(`${data.studyStreak} ngày`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `• Tỷ lệ chuyên cần: `, bold: true }),
              new TextRun(`${data.attendance.present}/${data.attendance.total} buổi`),
            ],
          }),

          // 3. Chủ đề cần cải thiện
          new Paragraph({
            text: "3. CHỦ ĐỀ CẦN CẢI THIỆN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 120 },
          }),
          ...(data.weakTopics.length > 0 ? [
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Môn học", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chủ đề", bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tỷ lệ sai (%)", bold: true })], alignment: AlignmentType.CENTER })] }),
                  ],
                }),
                ...data.weakTopics.map(t => new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(t.subject)] }),
                    new TableCell({ children: [new Paragraph(t.topic)] }),
                    new TableCell({ children: [new Paragraph({ text: `${t.incorrectRate}%`, alignment: AlignmentType.CENTER })] }),
                  ],
                })),
              ],
            })
          ] : [new Paragraph("Chưa có dữ liệu cần lưu ý.")]),

          // 4. Ghi chú của Giáo viên
          new Paragraph({
            text: "4. GHI CHÚ BỔ SUNG TỪ GIÁO VIÊN",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 120 },
          }),
          ...(data.teacherNotes.length > 0 ? 
            data.teacherNotes.map(n => new Paragraph({
              children: [
                new TextRun({ text: `[${n.date}] ${n.title}: `, bold: true }),
                new TextRun(n.content),
              ],
              spacing: { after: 100 },
            })) : [new Paragraph("Không có ghi chú bổ sung.")]),

          // 5. Phân tích AI
          ...(data.aiAnalysis ? [
            new Paragraph({
              text: "5. PHÂN TÍCH TỔNG HỢP TỪ TRỢ LÝ AI",
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 400, after: 120 },
            }),
            ...data.aiAnalysis.split('\n').filter(line => line.trim()).map(line => {
              const isHeading = line.startsWith('###');
              const cleanLine = line.replace(/###\s*/, '').replace(/\*\*/g, '');
              return new Paragraph({
                text: cleanLine,
                heading: isHeading ? HeadingLevel.HEADING_3 : undefined,
                spacing: { after: 100 },
              });
            })
          ] : []),

          // Footer
          new Paragraph({
            text: `Ngày xuất báo cáo: ${new Date().toLocaleDateString('vi-VN')}`,
            alignment: AlignmentType.RIGHT,
            spacing: { before: 600 },
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "XÁC NHẬN CỦA GIÁO VIÊN CHỦ NHIỆM", bold: true })],
            spacing: { after: 400 },
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Ho_So_Hoc_Tap_${studentName.replace(/\s+/g, '_')}.docx`);
};
