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
    
    let processed = text;
    // 1. Clean unbalanced dollar signs first
    const dollarCount = (processed.match(/\$/g) || []).length;
    if (dollarCount % 2 !== 0) {
        processed = processed.replaceAll('$', '');
    }
    
    // 2. Wrap \frac, \sqrt, \times, \div, exponents etc. in $ if they aren't wrapped
    // First wrap all occurrences
    processed = processed.replace(/(\\frac\s*\{[^{}]*?\}\{[^{}]*?\}|\\sqrt\s*\{[^{}]*?\}|cm\^[23]|m\^[23]|\\times|\\div)/g, '$$$1$$');
    // Normalize nested or consecutive dollar signs
    processed = processed.replace(/\$\$(\\frac\s*\{[^{}]*?\}\{[^{}]*?\}|\\sqrt\s*\{[^{}]*?\}|cm\^[23]|m\^[23]|\\times|\\div)\$\$/g, '$$$1$$');
    processed = processed.replace(/\$\$\$/g, '$$');
    
    return processed;
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
            MCQ_MULTIPLE: ' (Chọn nhiều đáp án)',
            ORDERING: ' (Sắp xếp theo thứ tự đúng)',
            SENTENCE_SCRAMBLE: ' (Xếp từ thành câu)',
            MATCHING: ' (Nối cột)',
            DRAG_DROP: ' (Điền khuyết)',
            WORD_CLASSIFY: ' (Phân loại từ)',
            FILL_IN_PASSAGE: ' (Điền vào đoạn văn)',
            INLINE_DROPDOWN: ' (Trắc nghiệm thả xuống)'
        };

        let displayContent = q.content;
        if (q.type === 'INLINE_DROPDOWN' && q.options) {
            let blankIndex = 0;
            displayContent = q.content.replace(/\[__\]/g, () => {
                const optString = q.options[blankIndex] || '';
                const parts = optString.split('|||');
                const correct = parts[0]?.trim();
                const distractorsStr = parts[1]?.trim();
                const distractors = distractorsStr ? distractorsStr.split('|').map((s: string) => s.trim()) : [];
                let allOpts = [correct, ...distractors].filter(Boolean);
                allOpts.sort(); // Predictable sort for paper export
                blankIndex++;
                return `(${allOpts.join(' / ')})`;
            });
        }

        sections.push(new Paragraph({
            children: [
                new TextRun({ text: `Câu ${idx + 1}: `, bold: true }),
                ...parseContentWithMath(displayContent),
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
        if ((q.type === 'ORDERING' || q.type === 'SENTENCE_SCRAMBLE') && q.options?.length) {
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

        // --- WORD_CLASSIFY: Phân loại từ ---
        if (q.type === 'WORD_CLASSIFY' && q.options?.length) {
            const words = q.options.map(opt => {
                const parts = opt.split('|||');
                return (parts[1] || opt).trim();
            });
            const categories = Array.from(new Set(q.options.map(opt => {
                const parts = opt.split('|||');
                return (parts[0] || '_NONE_').trim();
            }).filter(c => c !== '_NONE_')));

            sections.push(new Paragraph({
                children: [
                    new TextRun({ text: '   Các từ cần phân loại: ', italics: true, bold: true }),
                    ...words.flatMap((opt, i) => [
                        new TextRun({ text: opt, bold: true }),
                        ...(i < words.length - 1 ? [new TextRun({ text: '   /   ' })] : [])
                    ])
                ],
                indent: { left: 720 },
                spacing: { before: 80 }
            }));
            
            categories.forEach(cat => {
                sections.push(new Paragraph({
                    children: [new TextRun({ text: `   Nhóm [${cat}]: ................................................................` })],
                    indent: { left: 720 },
                    spacing: { before: 80 }
                }));
            });
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
            } else if (q.type === 'ORDERING' || q.type === 'SENTENCE_SCRAMBLE') {
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
                const numBlanks = (q.content.match(/\[__\]/g) || []).length;
                const correctOpts = q.options?.slice(0, numBlanks) || [];
                const distractorOpts = q.options?.slice(numBlanks) || [];
                let text = correctOpts.join(', ');
                if (distractorOpts.length > 0) {
                    text += ` (Từ nhiễu: ${distractorOpts.join(', ')})`;
                }
                answerParts.push(...parseContentWithMath(text));
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
