import React from 'react';
import { Question } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface PrintableContentProps {
    type: 'MATRIX' | 'EXAM' | 'ALL'; // MATRIX: Chỉ ma trận, EXAM: Đề + HDC, ALL: Ma trận + Đề + HDC
    questions: Question[];
    title: string;
    subject: string;
    grade: string;
    duration?: number;
    schoolName?: string;
    academicYear?: string;
}

export const PrintableContent: React.FC<PrintableContentProps> = ({ type, questions, title, subject, grade, duration, schoolName, academicYear }) => {
    const displaySchoolName = schoolName || 'Trường Tiểu Học ........................';
    const displayYear = academicYear || `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;
    const displayDuration = duration || '...';

    // Helper to ensure LaTeX is wrapped in $ delimiters if needed
    const wrapMath = (text: string) => {
        if (!text) return '';
        // Wrap common patterns if they don't have $
        // 1. \frac{...}{...}
        // 2. ^2, ^3 (for units like cm^2, m^3)
        // 3. common math symbols like \times, \div if they appear with backslash
        let processed = text;
        
        // Match \frac{...}{...} that isn't already inside $ or $$
        // This is a simple version: wrap if it contains \frac, \sqrt, etc and no $
        if ((text.includes('\\frac') || text.includes('\\sqrt') || text.includes('^') || text.includes('\\times')) && !text.includes('$')) {
            // Check if it's a simple case of a single expression or mixed text
            // For safety, let's wrap specific patterns
            processed = processed.replace(/(\\frac\{[^{}]*\}\{[^{}]*\}|\\sqrt\{[^{}]*\}|cm\^[23]|m\^[23]|\\times|\\div)/g, '$$$1$$');
        }
        return processed;
    };

    const SchoolHeader = () => (
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
            <div className="text-center font-bold">
                <p className="uppercase">{displaySchoolName}</p>
                <p>Tổ: {subject}</p>
            </div>
            <div className="text-center">
                <p className="font-bold uppercase">ĐỀ KIỂM TRA MÔN: {subject} - LỚP {grade}</p>
                <p className="italic">Năm học: {displayYear}</p>
                <p className="italic">Thời gian làm bài: {displayDuration} phút</p>
            </div>
            <div className="text-center font-bold">
                <p>Họ tên: .......................................</p>
                <p>Lớp: ............. SBD: ......................</p>
            </div>
        </div>
    );

    const TitleHeader = ({ text }: { text: string }) => (
        <h1 className="text-xl font-bold text-center uppercase mb-6">{text}</h1>
    );

    const renderExam = (isEssayOnly: boolean) => {
        const list = isEssayOnly ? questions.filter(q => q.type === 'SHORT_ANSWER') : questions;
        if (list.length === 0) return <p className="italic text-center my-10">Không có câu hỏi phù hợp.</p>;

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                {!isEssayOnly && <SchoolHeader />}
                {isEssayOnly && <TitleHeader text="PHẦN THI TỰ LUẬN" />}
                {!isEssayOnly && <TitleHeader text={title || "BÀI TẬP TRẮC NGHIỆM"} />}

                <div className="space-y-6 text-justify">
                    {list.map((q, idx) => (
                        <div key={q.id || idx} className="question-item break-inside-avoid">
                            <div className="font-bold mb-1 flex gap-1">
                                <span className="whitespace-nowrap">Câu {idx + 1}:</span>
                                <span className="font-normal">
                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(q.content)}</ReactMarkdown>
                                </span>
                            </div>

                            {q.imageUrl && (
                                <div className="my-2">
                                    <img src={q.imageUrl} alt="img" className="max-h-48 object-contain mx-auto border border-gray-300" />
                                </div>
                            )}

                            {/* Options if MCQ or MCQ_MULTIPLE */}
                            {(q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE') && q.options && q.options.length > 0 && (
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 ml-4 mt-2">
                                    {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex gap-1 break-inside-avoid">
                                            <span className="font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                                            <span><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(opt)}</ReactMarkdown></span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Options if MATCHING */}
                            {q.type === 'MATCHING' && q.options && q.options.length > 0 && (
                                <div className="space-y-2 ml-4 mt-2 mb-4">
                                    {q.options.map((opt, oIdx) => {
                                        const [left, right] = opt.split('|||');
                                        return (
                                            <div key={oIdx} className="flex gap-4 items-center break-inside-avoid text-gray-800">
                                                <div className="flex-1 p-2 border border-gray-300 rounded text-center">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{left?.trim() || ''}</ReactMarkdown>
                                                </div>
                                                <div className="font-bold">... nối với ...</div>
                                                <div className="flex-1 p-2 border border-gray-300 rounded text-center">
                                                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{right?.trim() || ''}</ReactMarkdown>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Essay spacing */}
                            {(q.type === 'SHORT_ANSWER' || isEssayOnly) && (
                                <div className="h-32 border-b border-dotted border-gray-400 mt-4"></div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderSolution = () => {
        const mcqQuestions = questions.filter(q => q.type === 'MCQ' || q.type === 'MCQ_MULTIPLE');
        // render all MCQs in rows of 10
        const rows: typeof mcqQuestions[] = [];
        for (let i = 0; i < mcqQuestions.length; i += 10) {
            rows.push(mcqQuestions.slice(i, i + 10));
        }

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                <TitleHeader text="ĐÁP ÁN VÀ HƯỚNG DẪN GIẢI" />
                <div className="mb-4 text-center italic">{title}</div>

                {/* Bảng tổng hợp đáp án trắc nghiệm */}
                {mcqQuestions.length > 0 && (
                    <>
                        <h3 className="font-bold mb-2">I. ĐÁP ÁN TRẮC NGHIỆM</h3>
                        {rows.map((row, rIdx) => (
                            <table key={rIdx} className="w-full border-collapse border border-black text-center mb-2 break-inside-avoid">
                                <tbody>
                                    <tr className="bg-gray-100 font-bold">
                                        {row.map((_, i) => <td key={i} className="border border-black p-1">{rIdx * 10 + i + 1}</td>)}
                                    </tr>
                                    <tr>
                                        {row.map((q, i) => (
                                            <td key={i} className="border border-black p-1 font-bold text-red-600">
                                                {q.type === 'MCQ_MULTIPLE' && q.correctOptionIndices && q.correctOptionIndices.length > 0 
                                                  ? q.correctOptionIndices.map(idx => String.fromCharCode(65 + idx)).join(', ') 
                                                  : q.correctOptionIndex !== undefined ? String.fromCharCode(65 + q.correctOptionIndex) : ''}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        ))}
                    </>
                )}

                {/* Lời giải chi tiết */}
                <h3 className="font-bold mb-2 mt-6">II. HƯỚNG DẪN GIẢI CHI TIẾT</h3>
                <div className="space-y-4">
                    {questions.map((q, idx) => {
                        if (!q.solution && !q.hint) return null;
                        return (
                            <div key={q.id || idx} className="break-inside-avoid border-b border-dashed border-gray-300 pb-2">
                                <div className="font-bold">Câu {idx + 1}:</div>
                                {q.solution && (
                                    <div className="text-gray-800 ml-4"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(q.solution)}</ReactMarkdown></div>
                                )}
                                {q.hint && !q.solution && (
                                    <div className="text-gray-800 ml-4 italic"><ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{wrapMath(q.hint)}</ReactMarkdown></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMatrix = () => {
        const topics = Array.from(new Set(questions.map(q => (q.topic || 'Chung').trim())));

        return (
            <div className="print-section mb-10 pb-10 page-break-after">
                <TitleHeader text="BẢNG MA TRẬN ĐỀ KIỂM TRA" />
                <div className="mb-6 text-center italic">{title} - Môn: {subject} - Khối: {grade}</div>

                <table className="w-full border-collapse border border-black mb-6">
                    <thead className="text-center font-bold bg-gray-100">
                        <tr>
                            <th className="border border-black p-2" rowSpan={2}>Chủ đề</th>
                            <th className="border border-black p-2" colSpan={3}>Mức độ nhận thức</th>
                            <th className="border border-black p-2" rowSpan={2}>Tổng số câu</th>
                        </tr>
                        <tr>
                            <th className="border border-black p-2">Nhận biết</th>
                            <th className="border border-black p-2">Kết nối</th>
                            <th className="border border-black p-2">Vận dụng</th>
                        </tr>
                    </thead>
                    <tbody className="text-center">
                        {topics.map(t => {
                            const topicQs = questions.filter(q => (q.topic || 'Chung') === t);
                            const l1 = topicQs.filter(q => q.level === 'NHAN_BIET').length;
                            const l2 = topicQs.filter(q => q.level === 'KET_NOI').length;
                            const l3 = topicQs.filter(q => q.level === 'VAN_DUNG').length;

                            return (
                                <tr key={t}>
                                    <td className="border border-black p-2 text-left font-medium">{t}</td>
                                    <td className="border border-black p-2">{l1 || '-'}</td>
                                    <td className="border border-black p-2">{l2 || '-'}</td>
                                    <td className="border border-black p-2">{l3 || '-'}</td>
                                    <td className="border border-black p-2 font-bold">{topicQs.length}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="text-center font-bold bg-gray-50">
                        <tr>
                            <td className="border border-black p-2 text-left">TỔNG CỘNG</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'NHAN_BIET').length}</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'KET_NOI').length}</td>
                            <td className="border border-black p-2">{questions.filter(q => q.level === 'VAN_DUNG').length}</td>
                            <td className="border border-black p-2 text-red-600">{questions.length}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        );
    };

    return (
        <div className="print-container bg-white text-black p-8 font-serif" style={{ fontSize: '13pt', lineHeight: 1.5 }}>
            {/* Ẩn trên màn hình, chỉ hiển thị khi in */}
            <style dangerouslySetInnerHTML={{
                __html: `
        @media screen { .print-container { display: none; } }
        @media print {
          @page { margin: 20mm; size: A4; }
          body * { visibility: hidden; }
          .print-layout, .print-layout * { visibility: visible; }
          .print-layout { position: absolute; left: 0; top: 0; width: 100%; }
           .page-break-after { page-break-after: always; }
           .break-inside-avoid { break-inside: avoid; page-break-inside: avoid; }
        }
      `}} />
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />

            <div className="print-layout">
                {(type === 'MATRIX' || type === 'ALL') && renderMatrix()}
                {(type === 'EXAM' || type === 'ALL') && (
                    <>
                        {renderExam(false)}
                        {renderSolution()}
                    </>
                )}
            </div>
        </div>
    );
};
