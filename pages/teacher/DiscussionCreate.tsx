import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArrowLeft, MessageSquare, Plus } from 'lucide-react';

export const DiscussionCreate: React.FC = () => {
    const navigate = useNavigate();
    const { createDiscussion, user } = useStore();
    const [title, setTitle] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !user) return;

        setIsLoading(true);
        try {
            // Generate a random 6-digit PIN
            const pin = Math.floor(100000 + Math.random() * 900000).toString();

            const roundId = `round_${Date.now()}`;
            const newSession = {
                id: pin,
                title: title.trim(),
                teacherId: user.id,
                status: 'ACTIVE' as const,
                participants: [],
                messages: [],
                polls: [],
                breakoutRooms: [],
                createdAt: new Date().toISOString(),
                rounds: [{
                    id: roundId,
                    name: 'Vòng 1',
                    createdAt: new Date().toISOString()
                }],
                activeRoundId: roundId,
                visibility: 'FULL' as const
            };

            await createDiscussion(newSession);
            navigate(`/discussion/room/${pin}`);
        } catch (error) {
            console.error("Failed to create discussion:", error);
            alert("Có lỗi xảy ra khi tạo phòng. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8">
            <button
                onClick={() => navigate('/teacher/discussions')}
                className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
            >
                <ArrowLeft className="h-5 w-5" /> Quay lại danh sách
            </button>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <MessageSquare className="h-8 w-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold">Tạo Phòng Thảo Luận Mới</h1>
                    <p className="text-indigo-100 mt-2">Tổ chức thảo luận, tranh biện và bình chọn Realtime</p>
                </div>

                <div className="p-8">
                    <form onSubmit={handleCreate} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                Tên chủ đề thảo luận
                            </label>
                            <input
                                type="text"
                                autoFocus
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="VD: Tranh biện về AI trong giáo dục..."
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-lg"
                                required
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={isLoading || !title.trim()}
                                className={`w-full py-3.5 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.02] ${isLoading || !title.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    }`}
                            >
                                {isLoading ? (
                                    <>Đang tạo...</>
                                ) : (
                                    <><Plus className="h-5 w-5" /> Tạo phòng ngay</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
