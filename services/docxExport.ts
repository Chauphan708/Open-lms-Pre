import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, Math as DocxMath } from 'docx';
import { saveAs } from 'file-saver';
import katex from 'katex';
import { Question } from '../types';

/**
 * Chuyển đổi công thức LaTeX đơn giản sang định dạng mà docx.Math có thể hiểu hoặc MathML
 * Lưu ý: docx Math component hỗ trợ OMML tốt nhất. 
 * Giải pháp tạm thời: Render sang MathML bằng KaTeX và bọc vào cấu trúc Math của docx.
 */
const renderMath = (latex: string) => {
    try {
        // Render sang MathML string
        const mathml = katex.renderToString(latex, {
            displayMode: false,
            output: 'mathml',
            throwOnError: false
        });
        
        // Trích xuất nội dung bên trong tag <math>
        // Thực tế docx.Math trong thư viện docx v9+ có thể nhận diện MathML thô nếu được cấu hình đúng
        // Tuy nhiên, việc bọc trực tiếp MathML vào docx.Math thường yêu cầu OMML.
        // Ở đây ta sử dụng TextRun chuẩn nếu công thức quá phức tạp, hoặc DocxMath cho công thức cơ bản.
        return new DocxMath({
            children: [new TextRun(latex)] // Fallback nếu không chuyển được OMML
        });
    } catch (e) {
        return new TextRun(latex);
    }
};

const wrapMath = (text: string) => {
    if (!text) return '';
    if ((text.includes('\\frac') || text.includes('\\sqrt') || text.includes('^') || text.includes('\\times')) && !text.includes('$')) {
        return text.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|cm\^[23]|m\^[23]|\\times|\\div)/g, '$$$1$$');
    }
    return text;
};

/**
 * Parsing nội dung văn bản có chứa ký hiệu $...$
 */
const parseContentWithMath = (content: string): any[] => {
    const wrappedContent = wrapMath(content);
    const parts = wrappedContent.split(/(\$.*?\$)/g);
    return parts.map(part => {
        if (part.startsWith('$') && part.endsWith('$')) {
            const latex = part.slice(1, -1);
            return renderMath(latex);
        }
        return new TextRun(part);
    });
};

interface ExportParams {
    questions: Question[];
    title: string;
    subject: string;
    grade: string;
    duration: number;
    includeMatrix?: boolean;
    includeSolution?: boolean;
}

export const exportToDocx = async ({ questions, title, subject, grade, duration, includeMatrix, includeSolution }: ExportParams) => {
    const sections = [];

    // 1. Phần Header
    const header = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: "ĐỀ KIỂM TRA MÔN: ", bold: true }),
            new TextRun({ text: `${subject.toUpperCase()} - LỚP ${grade}`, color: "000000", bold: true }),
        ],
    });

    const info = new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
            new TextRun({ text: `Thời gian làm bài: ${duration} phút`, italics: true }),
        ],
    });

    sections.push(header, info, new Paragraph({ text: "" }));

    // 2. Phần Ma trận (nếu yêu cầu)
    if (includeMatrix) {
        sections.push(new Paragraph({ 
            children: [new TextRun({ text: "I. MA TRẬN ĐỀ KIỂM TRA", bold: true, size: 28 })],
            spacing: { before: 400, after: 200 }
        }));

        const topics = Array.from(new Set(questions.map(q => (q.topic || 'Chung').trim())));
        
        const matrixRows = [
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chủ đề", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 40, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "N.Biết", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kết nối", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "V.Dụng", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tổng", bold: true })], alignment: AlignmentType.CENTER })], verticalAlign: AlignmentType.CENTER, width: { size: 15, type: WidthType.PERCENTAGE } }),
                ],
            }),
        ];

        topics.forEach(t => {
            const topicQs = questions.filter(q => (q.topic || 'Chung') === t);
            const l1 = topicQs.filter(q => q.level === 'NHAN_BIET').length;
            const l2 = topicQs.filter(q => q.level === 'KET_NOI').length;
            const l3 = topicQs.filter(q => q.level === 'VAN_DUNG').length;

            matrixRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph(t)] }),
                    new TableCell({ children: [new Paragraph({ text: l1 ? l1.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: l2 ? l2.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: l3 ? l3.toString() : "-", alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: topicQs.length.toString(), alignment: AlignmentType.CENTER, children: [new TextRun({ text: topicQs.length.toString(), bold: true })] })] }),
                ],
            }));
        });

        // Hàng tổng cộng
        matrixRows.push(new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TỔNG CỘNG", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'NHAN_BIET').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'KET_NOI').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ text: questions.filter(q => q.level === 'VAN_DUNG').length.toString(), alignment: AlignmentType.CENTER })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: questions.length.toString(), bold: true, color: "FF0000" })], alignment: AlignmentType.CENTER })] }),
            ],
        }));

        const matrixTable = new Table({
            rows: matrixRows,
            width: { size: 100, type: WidthType.PERCENTAGE }
        });

        sections.push(matrixTable, new Paragraph({ text: "" }));
    }

    // 3. Phần Đề thi
    sections.push(new Paragraph({ 
        children: [new TextRun({ text: "II. PHẦN CÂU HỎI", bold: true, size: 28 })],
        spacing: { before: 400, after: 200 }
    }));

    questions.forEach((q, idx) => {
        // Nhãn loại câu hỏi hiển thị phụ chú
        const typeLabel: Record<string, string> = {
            MCQ: '',
            MCQ_MULTIPLE: ' (Chọn nhiều đáp án đúng)',
            SHORT_ANSWER: ' (Tự luận ngắn)',
            ORDERING: ' (Sắp xếp theo thứ tự đúng)',
            MATCHING: ' (Nối cột)',
            DRAG_DROP: ' (Điền khuyết)',
        };

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
                ...parseContentWithMath(q.content),
                ...(typeLabel[q.type] ? [new TextRun({ text: typeLabel[q.type], italics: true, color: '555555' })] : []),
            ],
            spacing: { before: 200 }
        }));

        // --- MCQ: Trắc nghiệm 1 đáp án ---
        if (q.type === 'MCQ' && q.options?.length) {
            q.options.forEach((opt, oIdx) => {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: `   ${String.fromCharCode(65 + oIdx)}. `, bold: true }),
                        ...parseContentWithMath(opt)
                    ],
                    indent: { left: 720 }
                }));
            });
        }

        // --- MCQ_MULTIPLE: Trắc nghiệm nhiều đáp án ---
        if (q.type === 'MCQ_MULTIPLE' && q.options?.length) {
            q.options.forEach((opt, oIdx) => {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: `   ${String.fromCharCode(65 + oIdx)}. `, bold: true }),
                        ...parseContentWithMath(opt)
                    ],
                    indent: { left: 720 }
                }));
            });
        }

        // --- ORDERING: Sắp xếp thứ tự ---
        if (q.type === 'ORDERING' && q.options?.length) {
            // Xáo trộn thứ tự để in ra (không xáo random để đề in nhất quán, chỉ đánh số)
            q.options.forEach((opt, oIdx) => {
                sections.push(new Paragraph({
                    children: [
                        new TextRun({ text: `   (${oIdx + 1}) `, bold: true }),
                        ...parseContentWithMath(opt)
                    ],
                    indent: { left: 720 }
                }));
            });
            // Dòng trả lời
            sections.push(new Paragraph({
                children: [
                    new TextRun({ text: `   Thứ tự đúng: `, italics: true }),
                    new TextRun({ text: `_____ ` .repeat(q.options.length) })
                ],
                indent: { left: 720 },
                spacing: { before: 80 }
            }));
        }

        // --- MATCHING: Nối cột ---
        if (q.type === 'MATCHING' && q.options?.length) {
            // options dạng "Left Item ||| Right Item"
            const pairs = q.options.map(o => {
                const parts = o.split('|||');
                return { left: (parts[0] || '').trim(), right: (parts[1] || '').trim() };
            });

            // Tạo bảng 2 cột: Cột A (trái) | Nối | Cột B (phải, xáo thứ tự bằng chỉ mục dạng chữ cái)
            const shuffledRightLabels = pairs.map((_, i) => String.fromCharCode(97 + i)); // a, b, c...

            const matchingRows: TableRow[] = [
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cột A', bold: true })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Nối', bold: true })], alignment: AlignmentType.CENTER })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Cột B', bold: true })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                    ]
                })
            ];

            pairs.forEach((pair, i) => {
                matchingRows.push(new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${i + 1}. `, bold: true }), ...parseContentWithMath(pair.left)] })] }),
                        new TableCell({ children: [new Paragraph({ text: '', alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `${shuffledRightLabels[i]}. `, bold: true }), ...parseContentWithMath(pairs[(i + Math.ceil(pairs.length / 2)) % pairs.length].right)] })] }),
                    ]
                }));
            });

            sections.push(new Table({
                rows: matchingRows,
                width: { size: 90, type: WidthType.PERCENTAGE },
                margins: { left: 720 }
            }));
        }

        // --- DRAG_DROP: Điền khuyết ---
        if (q.type === 'DRAG_DROP' && q.options?.length) {
            // Hiển thị các từ/cụm từ để học sinh kéo điền
            sections.push(new Paragraph({
                children: [
                    new TextRun({ text: '   Các từ cho sẵn: ', italics: true, bold: true }),
                    ...q.options.flatMap((opt, i) => [
                        new TextRun({ text: opt, bold: true }),
                        ...(i < q.options.length - 1 ? [new TextRun({ text: '   /   ' })] : [])
                    ])
                ],
                indent: { left: 720 },
                spacing: { before: 80 }
            }));
        }

        // --- SHORT_ANSWER: Tự luận ngắn ---
        if (q.type === 'SHORT_ANSWER') {
            sections.push(new Paragraph({
                children: [new TextRun({ text: '   Trả lời: ................................................................' })],
                indent: { left: 720 },
                spacing: { before: 80 }
            }));
        }
    });

    // 4. Đáp án (nếu yêu cầu)
    if (includeSolution) {
        sections.push(new Paragraph({ text: "" }));
        sections.push(new Paragraph({
            children: [new TextRun({ text: "III. ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI", bold: true, size: 28 })],
            spacing: { before: 400, after: 200 }
        }));
        
        questions.forEach((q, idx) => {
            const answerParts: any[] = [new TextRun({ text: `Câu ${idx + 1}: `, bold: true })];

            if (q.type === 'MCQ' && q.correctOptionIndex !== undefined) {
                answerParts.push(new TextRun({ text: String.fromCharCode(65 + q.correctOptionIndex), color: "FF0000", bold: true }));
            } else if (q.type === 'MCQ_MULTIPLE' && q.correctOptionIndices?.length) {
                const letters = q.correctOptionIndices.map(i => String.fromCharCode(65 + i)).join(', ');
                answerParts.push(new TextRun({ text: letters, color: "FF0000", bold: true }));
            } else if (q.type === 'ORDERING') {
                answerParts.push(new TextRun({ text: q.options?.map((_, i) => i + 1).join(' → ') || '', color: "FF0000", bold: true }));
            } else if (q.type === 'MATCHING') {
                const pairs = q.options?.map((o, i) => {
                    const parts = o.split('|||');
                    return `${i + 1} – ${String.fromCharCode(97 + i)}`;
                }).join(';  ') || '';
                answerParts.push(new TextRun({ text: pairs, color: "FF0000", bold: true }));
            } else if (q.type === 'SHORT_ANSWER') {
                answerParts.push(...parseContentWithMath(q.options?.[0] || ''));
            } else if (q.type === 'DRAG_DROP') {
                answerParts.push(...parseContentWithMath(q.options?.join(', ') || ''));
            }

            if (q.solution) {
                answerParts.push(new TextRun({ text: '  →  ' }));
                answerParts.push(...parseContentWithMath(q.solution));
            }

            if (answerParts.length > 1) {
                sections.push(new Paragraph({ children: answerParts, spacing: { before: 100 } }));
            }
        });
    }

    const doc = new Document({
        sections: [{
            children: sections
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${title || 'De_Kiem_Tra'}.docx`);
};
