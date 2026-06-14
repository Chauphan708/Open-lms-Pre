import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Calendar, Trash2, Download, ArrowRight, Plus, Search, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export const DiscussionList: React.FC = () => {
    const { discussionSessions, deleteDiscussionSession, user, fetchDiscussions } = useStore();

    useEffect(() => {
        if (user) {
            fetchDiscussions();
        }
    }, [user, fetchDiscussions]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const sessions = discussionSessions.filter(s =>
        s.teacherId === user?.id &&
        s.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()); // Mock sort by ID/Date

    const handleExportDocx = (session: any) => {
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        text: `Biên bản thảo luận: ${session.title}`,
                        heading: HeadingLevel.HEADING_1,
                        spacing: { after: 200 }
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: `Mã phòng: ${session.id}`, bold: true }),
                            new TextRun({ text: `\nGiáo viên: ${user?.name}` }),
                            new TextRun({ text: `\nSố lượng tham gia: ${session.participants.length}` }),
                            new TextRun({ text: `\nTrạng thái: ${session.status}` }),
                        ],
                        spacing: { after: 300 }
                    }),

                    // Polls Section
                    new Paragraph({
                        text: "Kết quả bình chọn",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 200, after: 100 }
                    }),
                    ...session.polls.flatMap((poll: any) => [
                        new Paragraph({
                            text: `Q: ${poll.question}`,
                            bullet: { level: 0 }
                        }),
                        ...poll.options.map((opt: any) =>
                            new Paragraph({
                                text: `- ${opt.text}: ${opt.voteCount} phiếu`,
                                indent: { left: 720 }
                            })
                        )
                    ]),

                    // Chat Transcript
                    new Paragraph({
                        text: "Nội dung thảo luận chi tiết",
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 400, after: 200 }
                    }),
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: [
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thời gian", bold: true })] })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Người gửi", bold: true })] })] }),
                                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung", bold: true })] })] }),
                                ]
                            }),
                            ...session.messages.map((msg: any) =>
                                new TableRow({
                                    children: [
                                        new TableCell({
                                            children: [new Paragraph(new Date(msg.timestamp).toLocaleTimeString())],
                                            width: { size: 15, type: WidthType.PERCENTAGE }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph(msg.senderName)],
                                            width: { size: 20, type: WidthType.PERCENTAGE }
                                        }),
                                        new TableCell({
                                            children: [new Paragraph(msg.type === 'IMAGE' ? '[Hình ảnh]' : msg.type === 'STICKER' ? `[Sticker: ${msg.content}]` : msg.content)],
                                            width: { size: 65, type: WidthType.PERCENTAGE }
                                        }),
                                    ]
                                })
                            )
                        ]
                    })
                ]
            }]
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `Bien_ban_thao_luan_${session.id}.docx`);
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm("LƯU Ý QUAN TRỌNG:\n\nHành động này sẽ xóa vĩnh viễn toàn bộ tin nhắn và dữ liệu của phiên thảo luận này.\nBạn nên TẢI VỀ biên bản trước khi xóa.\n\nBạn có chắc chắn muốn xóa không?")) {
            const success = await deleteDiscussionSession(id);
            if (success) alert("Đã xóa thành công.");
            else alert("Xóa thất bại. Vui lòng thử lại.");
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MessageSquare className="h-8 w-8 text-indigo-600" /> Quản lý Thảo luận
                    </h1>
                    <p className="text-gray-500 mt-1">Danh sách các phòng thảo luận đã tạo</p>
                </div>
                <button
                    onClick={() => navigate('/teacher/discussions/create')}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-md flex items-center gap-2 transition-transform hover:scale-105"
                >
                    <Plus className="h-5 w-5" /> Tạo phòng mới
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <input
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Tìm kiếm theo tên phòng..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4">
                {sessions.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed text-gray-400">
                        Chưa có phiên thảo luận nào. Hãy tạo mới!
                    </div>
                )}

                {sessions.map(session => (
                    <div key={session.id} className="bg-white p-5 rounded-2xl border hover:border-indigo-300 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-bold text-lg text-gray-900">{session.title}</h3>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${session.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {session.status === 'ACTIVE' ? 'Đang diễn ra' : 'Đã kết thúc'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded font-mono text-xs">PIN: {session.id}</span>
                                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(session.rounds[0]?.createdAt || Date.now()).toLocaleDateString()}</span>
                                    <span>• {session.messages.length} tin nhắn</span>
                                    <span>• {session.participants.length} thành viên</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0">
                                <button
                                    onClick={() => navigate(`/discussion/room/${session.id}`)}
                                    className="flex-1 md:flex-none bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg font-bold hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    Vào phòng <ArrowRight className="h-4 w-4" />
                                </button>

                                <div className="w-px h-8 bg-gray-200 hidden md:block mx-1"></div>

                                <button
                                    onClick={() => handleExportDocx(session)}
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Tải biên bản (Word)"
                                >
                                    <FileText className="h-5 w-5" />
                                </button>

                                <button
                                    onClick={() => handleDelete(session.id)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Xóa vĩnh viễn"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
