import { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export interface GradingRecordExport {
    studentName: string;
    title: string;
    category: string;
    subject?: string;
    score: number | null;
    advantages: string;
    limitations: string;
    improvements: string;
    timestamp: string;
}

export interface ClassAnalyticsExport {
    studentName: string;
    className: string;
    totalExams: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    completionRate: number;
    conductCount?: number;
}

/**
 * Filter records by time period (day, week, month, or all)
 */
export const filterRecordsByTime = <T extends { timestamp?: string; createdAt?: string }>(
    records: T[],
    timeFilter: 'day' | 'week' | 'month' | 'all'
): T[] => {
    if (timeFilter === 'all') return records;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return records.filter(r => {
        const dateStr = r.timestamp || r.createdAt;
        if (!dateStr) return true;
        const itemDate = new Date(dateStr);

        if (timeFilter === 'day') {
            return itemDate >= startOfToday;
        } else if (timeFilter === 'week') {
            const startOfWeek = new Date(startOfToday);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday as start
            return itemDate >= startOfWeek;
        } else if (timeFilter === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return itemDate >= startOfMonth;
        }
        return true;
    });
};

/**
 * 1. Export AI Grading Reviews to Word (.docx) format
 */
export const exportGradingReviewsToDocx = async (
    records: GradingRecordExport[],
    timeFilter: 'day' | 'week' | 'month' | 'all' = 'all',
    className?: string
) => {
    const filtered = filterRecordsByTime(records, timeFilter);
    const filterTextMap = {
        day: 'Hôm Nay',
        week: 'Tuần Này',
        month: 'Tháng Này',
        all: 'Tất Cả Thời Gian'
    };

    const docChildren: any[] = [
        // Header
        new Paragraph({
            text: "TRƯỜNG TIỂU HỌC / THCS: ....................................",
            alignment: AlignmentType.LEFT,
            spacing: { after: 100 }
        }),
        new Paragraph({
            text: "BÁO CÁO MINH CHỨNG ĐÁNH GIÁ HỌC SINH BẰNG AI",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: `Phục vụ Hồ sơ Sáng kiến Kinh nghiệm | Lọc theo: `, italics: true }),
                new TextRun({ text: filterTextMap[timeFilter], bold: true, italics: true }),
                new TextRun({ text: className ? ` | Lớp: ${className}` : '', italics: true }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
        })
    ];

    if (filtered.length === 0) {
        docChildren.push(
            new Paragraph({
                text: "Không có dữ liệu bài chấm trong khoảng thời gian đã chọn.",
                alignment: AlignmentType.CENTER,
                spacing: { before: 400 }
            })
        );
    } else {
        filtered.forEach((rec, idx) => {
            const dateFormatted = new Date(rec.timestamp).toLocaleString('vi-VN');

            docChildren.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${idx + 1}. Học Sinh: `, bold: true, size: 24 }),
                        new TextRun({ text: rec.studentName, bold: true, color: "1E40AF", size: 24 }),
                        new TextRun({ text: ` — Bài: "${rec.title}" (${rec.category})` }),
                    ],
                    spacing: { before: 200, after: 100 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Thời gian chấm: ${dateFormatted} | Điểm số: `, italics: true }),
                        new TextRun({ text: rec.score !== null ? `${rec.score}/100` : 'Không ghi điểm', bold: true, color: rec.score !== null && rec.score >= 80 ? "059669" : "DC2626" })
                    ],
                    spacing: { after: 150 }
                }),
                // Table of AI evaluation
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ children: [new TextRun({ text: "Ưu điểm đạt được", bold: true, color: "047857" })] })]
                                }),
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ text: rec.advantages || "Chưa có ghi nhận" })]
                                })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ children: [new TextRun({ text: "Hạn chế cần khắc phục", bold: true, color: "B91C1C" })] })]
                                }),
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ text: rec.limitations || "Chưa có ghi nhận" })]
                                })
                            ]
                        }),
                        new TableRow({
                            children: [
                                new TableCell({
                                    width: { size: 30, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ children: [new TextRun({ text: "Lời khuyên cải thiện", bold: true, color: "4F46E5" })] })]
                                }),
                                new TableCell({
                                    width: { size: 70, type: WidthType.PERCENTAGE },
                                    children: [new Paragraph({ text: rec.improvements || "Chưa có ghi nhận" })]
                                })
                            ]
                        })
                    ]
                }),
                new Paragraph({ text: "", spacing: { after: 200 } })
            );
        });
    }

    // Footer signature block
    docChildren.push(
        new Paragraph({
            children: [
                new TextRun({ text: `Ngày ..... tháng ..... năm 20...`, italics: true })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 400, after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "GIÁO VIÊN BÁO CÁO", bold: true })
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { after: 500 }
        })
    );

    const doc = new Document({
        sections: [{
            properties: {},
            children: docChildren
        }]
    });

    const blob = await docxSaveBlob(doc);
    saveAs(blob, `Phieu_Nhan_Xet_AI_${timeFilter}_${Date.now()}.docx`);
};

// Helper for docx blob saving
const docxSaveBlob = async (doc: Document): Promise<Blob> => {
    const { Packer } = await import('docx');
    return await Packer.toBlob(doc);
};

/**
 * 2. Export Class Analytics & Student Results to Excel (.xlsx)
 */
export const exportClassAnalyticsToExcel = (
    data: ClassAnalyticsExport[],
    timeFilter: 'day' | 'week' | 'month' | 'all' = 'all',
    className: string = 'Lớp'
) => {
    const filterTextMap = {
        day: 'Theo Ngày',
        week: 'Theo Tuần',
        month: 'Theo Tháng',
        all: 'Tất Cả Thời Gian'
    };

    // Sheet 1: Bảng tổng hợp điểm số & tỷ lệ hoàn thành
    const sheet1Data = data.map((item, index) => ({
        "STT": index + 1,
        "Họ và Tên Học Sinh": item.studentName,
        "Lớp Học": item.className,
        "Số Bài Thi/Bài Tập Nộp": item.totalExams,
        "Điểm Trung Bình": item.avgScore ? Number(item.avgScore.toFixed(2)) : 0,
        "Điểm Cao Nhất": item.highestScore || 0,
        "Điểm Thấp Nhất": item.lowestScore || 0,
        "Tỷ Lệ Hoàn Thành (%)": `${(item.completionRate || 0).toFixed(1)}%`,
        "Đánh Giá Loại": item.avgScore >= 8.0 ? "Hoàn thành tốt" : item.avgScore >= 5.0 ? "Hoàn thành" : "Cần cố gắng"
    }));

    const worksheet1 = XLSX.utils.json_to_sheet(sheet1Data);

    // Set column widths for better visual layout
    worksheet1['!cols'] = [
        { wch: 6 },
        { wch: 25 },
        { wch: 12 },
        { wch: 22 },
        { wch: 16 },
        { wch: 15 },
        { wch: 15 },
        { wch: 22 },
        { wch: 18 },
    ];

    // Sheet 2: Thống kê tổng hợp báo cáo SKKN
    const totalStudents = data.length;
    const avgClassScore = data.length > 0 ? (data.reduce((acc, curr) => acc + (curr.avgScore || 0), 0) / data.length).toFixed(2) : 0;
    const goodStudents = data.filter(d => d.avgScore >= 8.0).length;
    const passStudents = data.filter(d => d.avgScore >= 5.0 && d.avgScore < 8.0).length;
    const needImprovement = data.filter(d => d.avgScore < 5.0).length;

    const sheet2Data = [
        { "Tỷ Lệ / Chỉ Số": "Mốc Thời Gian Lọc", "Giá Trị": filterTextMap[timeFilter] },
        { "Tỷ Lệ / Chỉ Số": "Tên Lớp", "Giá Trị": className },
        { "Tỷ Lệ / Chỉ Số": "Tổng Số Học Sinh", "Giá Trị": totalStudents },
        { "Tỷ Lệ / Chỉ Số": "Điểm Trung Bình Cả Lớp", "Giá Trị": avgClassScore },
        { "Tỷ Lệ / Chỉ Số": "Số Học Sinh Hoàn Thành Tốt (≥ 8.0)", "Giá Trị": `${goodStudents} (${totalStudents ? ((goodStudents/totalStudents)*100).toFixed(1) : 0}%)` },
        { "Tỷ Lệ / Chỉ Số": "Số Học Sinh Hoàn Thành (5.0 - 7.9)", "Giá Trị": `${passStudents} (${totalStudents ? ((passStudents/totalStudents)*100).toFixed(1) : 0}%)` },
        { "Tỷ Lệ / Chỉ Số": "Số Học Sinh Cần Cố Gắng (< 5.0)", "Giá Trị": `${needImprovement} (${totalStudents ? ((needImprovement/totalStudents)*100).toFixed(1) : 0}%)` }
    ];

    const worksheet2 = XLSX.utils.json_to_sheet(sheet2Data);
    worksheet2['!cols'] = [{ wch: 40 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet1, "Danh Sách Chi Tiết");
    XLSX.utils.book_append_sheet(workbook, worksheet2, "Thống Kê Báo Cáo SKKN");

    XLSX.writeFile(workbook, `Bao_Cao_Minh_Chung_SKKN_${className}_${timeFilter}_${Date.now()}.xlsx`);
};
