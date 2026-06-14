import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { ArenaMatchFilters } from '../../types';
import { ArrowLeft, Brain, X, BookOpen, RefreshCw } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
    scholar: '📖', scientist: '🔬', artist: '🎨', explorer: '🌍'
};

const SUBJECTS = [
    { value: '', label: '🎲 Tất cả môn' },
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
];

export const PvPLobby: React.FC = () => {
    const { user, arenaProfile, fetchWaitingMatches, createMatch, challengeMatch, acceptMatch, rejectMatch, cancelMatchmaking, users, exams } = useStore();
    const navigate = useNavigate();

    const [matches, setMatches] = useState<any[]>([]);
    const [isHosting, setIsHosting] = useState(false);
    const [hostedMatchId, setHostedMatchId] = useState<string | null>(null);
    const [challengerId, setChallengerId] = useState<string | null>(null);

    const [isChallenging, setIsChallenging] = useState(false);
    const [challengingMatchId, setChallengingMatchId] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(3);
    const [matchStarting, setMatchStarting] = useState(false);

    // Filter state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [filterSource, setFilterSource] = useState<'exam' | 'arena'>('arena');
    const [filterSubject, setFilterSubject] = useState('');
    const [filterGrade, setFilterGrade] = useState('');

    const channelRef = useRef<any>(null);

    // Get unique grades from exams
    const availableGrades = [...new Set(exams.filter(e => e.status === 'PUBLISHED').map(e => e.grade))].sort();

    const loadMatches = async () => {
        const m = await fetchWaitingMatches();
        setMatches(m);
    };

    // Auto-cleanup: xóa phòng waiting cũ hơn 30 phút của chính mình
    const cleanupOldRooms = async () => {
        if (!user) return;
        const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        await supabase.from('arena_matches')
            .delete()
            .eq('player1_id', user.id)
            .eq('status', 'waiting')
            .lt('created_at', cutoff);
    };

    useEffect(() => {
        cleanupOldRooms().then(() => loadMatches());
        // Polling match list mỗi 5s (thay vì chỉ dùng Realtime)
        const listPoll = setInterval(loadMatches, 5000);
        return () => { clearInterval(listPoll); };
    }, []);

    const handleCreateRoom = async () => {
        if (!user) return;
        const filters: ArenaMatchFilters = {
            source: filterSource,
            subject: filterSubject || undefined,
            grade: filterGrade || undefined,
        };
        const match = await createMatch(user.id, filters);
        if (match) {
            setIsHosting(true);
            setHostedMatchId(match.id);
            setChallengerId(null);
            setShowCreateModal(false);
            subscribeToMatch(match.id, 'HOST');
        }
    };

    const handleChallenge = async (matchId: string) => {
        if (!user) return;
        const ok = await challengeMatch(matchId, user.id);
        if (!ok) return; // Lỗi sẽ hiện alert từ store
        setIsChallenging(true);
        setChallengingMatchId(matchId);
        subscribeToMatch(matchId, 'CHALLENGER');
    };

    const handleAccept = async () => {
        if (!hostedMatchId) return;
        const ok = await acceptMatch(hostedMatchId);
        if (ok) {
            // Immediately start — không chờ polling
            if (pollingRef.current) clearInterval(pollingRef.current);
            setMatchStarting(true);
        }
    };

    const handleReject = async () => {
        if (!hostedMatchId) return;
        await rejectMatch(hostedMatchId);
        setChallengerId(null);
    };

    const handleCancel = async () => {
        if (hostedMatchId) {
            await cancelMatchmaking(hostedMatchId);
        }
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        setIsHosting(false);
        setHostedMatchId(null);
        setIsChallenging(false);
        setChallengingMatchId(null);
        setChallengerId(null);
    };

    const pollingRef = useRef<any>(null);
    const lastStatusRef = useRef<string>('');
    const rejectedRef = useRef(false);

    const subscribeToMatch = (matchId: string, role: 'HOST' | 'CHALLENGER') => {
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        if (pollingRef.current) clearInterval(pollingRef.current);
        lastStatusRef.current = '';
        rejectedRef.current = false;

        // Realtime subscription
        const channel = supabase.channel(`match-${matchId}-${Date.now()}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'arena_matches', filter: `id=eq.${matchId}` }, (payload: any) => {
                handleMatchUpdate(payload.new, role);
            })
            .subscribe();

        channelRef.current = channel;

        // Polling fallback mỗi 3 giây
        pollingRef.current = setInterval(async () => {
            const { data } = await supabase.from('arena_matches').select('*').eq('id', matchId).single();
            if (data) {
                handleMatchUpdate(data, role);
            } else if (role === 'CHALLENGER' && !rejectedRef.current) {
                // Match bị xóa = chủ phòng hủy
                rejectedRef.current = true;
                if (pollingRef.current) clearInterval(pollingRef.current);
                alert('Chủ phòng đã hủy phòng.');
                handleCancel();
            }
        }, 3000);
    };

    const handleMatchUpdate = (updatedMatch: any, role: 'HOST' | 'CHALLENGER') => {
        // Tránh xử lý trùng status
        if (updatedMatch.status === lastStatusRef.current) return;
        lastStatusRef.current = updatedMatch.status;

        if (role === 'HOST') {
            if (updatedMatch.status === 'challenged' && updatedMatch.player2_id) {
                setChallengerId(updatedMatch.player2_id);
            } else if (updatedMatch.status === 'waiting') {
                setChallengerId(null);
            }
        }

        if (role === 'CHALLENGER') {
            if (updatedMatch.status === 'waiting' && !rejectedRef.current) {
                rejectedRef.current = true;
                if (pollingRef.current) clearInterval(pollingRef.current);
                alert('Chủ phòng đã từ chối lời thách đấu.');
                handleCancel();
            }
        }

        if (updatedMatch.status === 'playing') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setMatchStarting(true);
        }
    };

    useEffect(() => {
        if (!matchStarting) return;
        if (countdown <= 0) {
            navigate(`/arena/battle/${hostedMatchId || challengingMatchId}`);
            return;
        }
        const t = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [matchStarting, countdown]);

    useEffect(() => {
        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    const getPlayerName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown';

    if (matchStarting) {
        return (
            <div className="max-w-xl mx-auto text-center py-12 animate-fade-in">
                <div className="flex items-center justify-center gap-6 mb-8">
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg bg-indigo-900 border-2 border-indigo-500">
                        {AVATAR_EMOJIS[arenaProfile?.avatar_class || 'scholar']}
                    </div>
                    <div className="animate-pulse">
                        <Brain className="h-12 w-12 text-indigo-500" />
                    </div>
                    <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg bg-gray-800 border-2 border-purple-500">
                        🧑‍🎓
                    </div>
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-4 animate-bounce">VÀO TRẬN!</h2>
                <div className="text-7xl font-black text-indigo-500 drop-shadow-lg">{countdown}</div>
            </div>
        );
    }

    if (isHosting) {
        return (
            <div className="max-w-md mx-auto text-center py-8 animate-fade-in">
                <h2 className="text-2xl font-black text-indigo-900 mb-6 flex items-center justify-center gap-2">
                    <BookOpen className="h-6 w-6 text-indigo-500" /> Đang tạo phòng...
                </h2>
                <div className="bg-white rounded-2xl border-2 border-indigo-100 p-8 shadow-xl shadow-indigo-100/50 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>

                    {!challengerId ? (
                        <div className="space-y-6">
                            <div className="w-24 h-24 mx-auto rounded-full bg-indigo-50 flex items-center justify-center border-4 border-indigo-100 border-t-indigo-500 animate-spin">
                                <span className="text-4xl animate-none">{AVATAR_EMOJIS[arenaProfile?.avatar_class || 'scholar']}</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Đang chờ đối thủ thách đấu...</h3>
                                <p className="text-gray-500 text-sm mt-2">Người chơi khác sẽ thấy phòng của bạn ở sảnh chính.</p>
                            </div>
                            <button onClick={handleCancel} className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">
                                Hủy phòng
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in zoom-in-95">
                            <div className="bg-indigo-50 text-indigo-700 font-bold py-2 rounded-lg text-sm mb-4 border border-indigo-200">
                                🧠 Có Lời Thách Đấu Mới!
                            </div>
                            <div className="flex items-center justify-center gap-4">
                                <div className="text-center">
                                    <h4 className="font-black text-xl text-gray-900">{getPlayerName(challengerId)}</h4>
                                    <p className="text-gray-500 text-sm">Muốn thách đấu kiến thức với bạn</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-4 border-t">
                                <button onClick={handleReject} className="py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
                                    Từ chối
                                </button>
                                <button onClick={handleAccept} className="py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                    Chấp nhận
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (isChallenging) {
        return (
            <div className="max-w-md mx-auto text-center py-12 animate-fade-in">
                <div className="w-24 h-24 mx-auto rounded-full bg-indigo-50 flex items-center justify-center border-4 border-indigo-100 border-t-indigo-500 animate-spin mb-6">
                    <Brain className="h-10 w-10 text-indigo-500 animate-none" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Đã gửi lời thách đấu!</h3>
                <p className="text-gray-500 mb-8">Vui lòng chờ chủ phòng chấp nhận...</p>
                <button onClick={handleCancel} className="px-6 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">
                    Rút lại lời thách đấu
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/arena')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium">
                    <ArrowLeft className="h-5 w-5" /> Rời sảnh
                </button>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                    <Brain className="h-7 w-7 text-indigo-500" /> Sảnh Đấu Trí
                </h1>
                <button onClick={loadMatches} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full">
                    <RefreshCw className="h-5 w-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white text-center shadow-lg sticky top-6">
                        <div className="text-6xl mb-4">{AVATAR_EMOJIS[arenaProfile?.avatar_class || 'scholar']}</div>
                        <h2 className="text-xl font-bold mb-1">{user?.name}</h2>
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-bold mb-6">
                            Elo: {arenaProfile?.elo_rating || 1000}
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl transition-all hover:scale-105 shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2"
                        >
                            <BookOpen className="h-5 w-5" /> TẠO PHÒNG
                        </button>
                        <p className="text-xs text-indigo-200 mt-4">Tạo phòng và chờ người khác thách đấu</p>
                    </div>
                </div>

                <div className="md:col-span-2 space-y-4">
                    {/* Phòng của mình (nếu có) */}
                    {matches.filter(m => m.player1_id === user?.id).length > 0 && (
                        <div>
                            <h3 className="font-bold text-gray-700 mb-2">📌 Phòng của bạn</h3>
                            {matches.filter(m => m.player1_id === user?.id).map(match => (
                                <div key={match.id} className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-indigo-900">Phòng của bạn</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">Đang chờ</span>
                                            {match.filter_subject && (
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                                                    {SUBJECTS.find(s => s.value === match.filter_subject)?.label || match.filter_subject}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={async () => { await cancelMatchmaking(match.id); loadMatches(); }}
                                        className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all text-sm"
                                    >
                                        🗑️ Xóa phòng
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <h3 className="font-bold text-gray-700 flex items-center justify-between">
                        Phòng của người khác ({matches.filter(m => m.player1_id !== user?.id).length})
                    </h3>

                    {matches.filter(m => m.player1_id !== user?.id).length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                            <div className="text-4xl mb-4">📚</div>
                            <p className="text-gray-500 font-medium">Sảnh đang vắng... Hãy nhấp "Tạo Phòng" để mời người khác!</p>
                        </div>
                    ) : (
                        matches.filter(m => m.player1_id !== user?.id).map(match => (
                            <div key={match.id} className="bg-white border rounded-xl p-4 flex items-center justify-between hover:border-indigo-300 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl group-hover:bg-indigo-50 transition-colors">
                                        🧑‍🎓
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                                            Phòng của {getPlayerName(match.player1_id)}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-bold text-white bg-green-500 px-2 py-0.5 rounded-full">Đang chờ</span>
                                            {match.filter_subject && (
                                                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                                    {SUBJECTS.find(s => s.value === match.filter_subject)?.label || match.filter_subject}
                                                </span>
                                            )}
                                            {match.source === 'exam' && (
                                                <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">📋 Ngân hàng bài tập</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleChallenge(match.id)}
                                    className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2 group-hover:shadow-md"
                                >
                                    Thách đấu
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Create Room Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg text-gray-900">🧠 Tạo Phòng Đấu Trí</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Source */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Nguồn câu hỏi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setFilterSource('exam')}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${filterSource === 'exam' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                        📋 Ngân hàng bài tập
                                    </button>
                                    <button
                                        onClick={() => setFilterSource('arena')}
                                        className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${filterSource === 'arena' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                    >
                                        🧠 Bộ câu hỏi Arena
                                    </button>
                                </div>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Môn học</label>
                                <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                                    className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                </select>
                            </div>

                            {/* Grade (only for exam source) */}
                            {filterSource === 'exam' && availableGrades.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1">Khối lớp</label>
                                    <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
                                        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                        <option value="">🏫 Tất cả khối</option>
                                        {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Info */}
                            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700">
                                {filterSource === 'exam'
                                    ? '📋 Câu hỏi trắc nghiệm sẽ được lấy từ các bài tập đã xuất bản.'
                                    : '🧠 Câu hỏi từ bộ riêng Arena (do GV nhập hoặc import).'}
                            </div>
                        </div>
                        <div className="p-6 border-t">
                            <button
                                onClick={handleCreateRoom}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                            >
                                🚀 Tạo phòng ngay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
