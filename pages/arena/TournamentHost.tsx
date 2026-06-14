
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { ArenaTournament, TournamentParticipant } from '../../types';
import { ArrowLeft, Play, StopCircle, Users, Swords, Trophy, Crown, Monitor, Plus, Settings, Eye, X, BookOpen, Brain, Search, CheckCircle2, Zap } from 'lucide-react';
import MathText from '../../components/MathText';

const SUBJECTS = [
    { value: '', label: '🎲 Tất cả' },
    { value: 'math', label: '📐 Toán' },
    { value: 'science', label: '🔬 Khoa học' },
    { value: 'technology', label: '💻 Công nghệ' },
    { value: 'vietnamese', label: '📝 Tiếng Việt' },
    { value: 'english', label: '🌐 Tiếng Anh' },
];

const REWARDS = [
    { rank: 1, label: '🥇 Hạng 1', xp: 100, elo: 30 },
    { rank: 2, label: '🥈 Hạng 2', xp: 60, elo: 20 },
    { rank: 3, label: '🥉 Hạng 3', xp: 40, elo: 10 },
    { rank: 4, label: '4️⃣ Hạng 4', xp: 40, elo: 10 },
    { rank: 5, label: '5-8', xp: 20, elo: 5 },
];

export const TournamentHost: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, createTournament, updateTournament, fetchTournamentParticipants, updateParticipant, eliminateParticipant, updateArenaProfile, exams } = useStore();

    const [mode, setMode] = useState<'create' | 'manage' | 'projection'>(!id ? 'create' : 'manage');
    const [tournament, setTournament] = useState<ArenaTournament | null>(null);
    const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
    const [loading, setLoading] = useState(false);

    // Create form state
    const [title, setTitle] = useState('Đấu Trường Tri Thức');
    const [source, setSource] = useState<'arena' | 'exam'>('arena');
    const [subject, setSubject] = useState('');
    const [questionsPerMatch, setQuestionsPerMatch] = useState(5);
    const [timePerQuestion, setTimePerQuestion] = useState(15);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [roundQuestions, setRoundQuestions] = useState<Record<number, string[]>>({});
    const [roundIds, setRoundIds] = useState<number[]>([1, 2, 3, 4]);
    const [selectingRound, setSelectingRound] = useState<number | null>(null);
    const [showSelector, setShowSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTopic, setFilterTopic] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState<number | ''>('');

    const pollRef = useRef<any>(null);

    // Poll participants
    useEffect(() => {
        if (id && mode !== 'create') {
            loadTournament();
            pollRef.current = setInterval(loadParticipants, 3000);
            return () => { if (pollRef.current) clearInterval(pollRef.current); };
        }
    }, [id, mode]);

    const loadTournament = async () => {
        if (!id) return;
        const { data } = await supabase.from('arena_tournaments').select('*').eq('id', id).single();
        if (data) setTournament(data as any);
        loadParticipants();
    };

    const loadParticipants = async () => {
        if (!id) return;
        const p = await fetchTournamentParticipants(id);
        setParticipants(p);
    };

    const handleCreate = async () => {
        if (!user) return;
        setLoading(true);
        const t = await createTournament({
            teacher_id: user.id,
            title,
            question_source: source,
            question_ids: selectedIds,
            round_questions: roundQuestions,
            current_round: 1,
            filter_subject: subject || undefined,
            questions_per_match: questionsPerMatch,
            time_per_question: timePerQuestion,
        });
        setLoading(false);
        if (t) {
            setTournament(t);
            setMode('manage');
            navigate(`/arena/tournament/host/${t.id}`, { replace: true });
        } else {
            alert('Không thể tạo đấu trường. Vui lòng kiểm tra lại kết nối hoặc database (Có thể bảng arena_tournaments chưa được tạo).');
        }
    };

    const handleStart = async () => {
        if (!tournament) return;
        await updateTournament(tournament.id, { status: 'active' });
        setTournament({ ...tournament, status: 'active' });
    };

    const handleFinish = async () => {
        if (!tournament) return;
        await updateTournament(tournament.id, { status: 'finished' });
        setTournament({ ...tournament, status: 'finished' });

        // Award rewards to top 8
        const ranked = getRanking();
        for (let i = 0; i < Math.min(ranked.length, 8); i++) {
            const p = ranked[i];
            let xp = 20, elo = 5;
            if (i === 0) { xp = 100; elo = 30; }
            else if (i === 1) { xp = 60; elo = 20; }
            else if (i <= 3) { xp = 40; elo = 10; }

            // Update arena profile
            const { data: profile } = await supabase.from('arena_profiles').select('*').eq('id', p.student_id).single();
            if (profile) {
                await supabase.from('arena_profiles').update({
                    total_xp: (profile.total_xp || 0) + xp,
                    elo_rating: (profile.elo_rating || 1000) + elo,
                }).eq('id', p.student_id);
            }

            // Mark champion
            if (i === 0) {
                await updateParticipant(p.id, { status: 'champion' });
            }
        }
        loadParticipants();
    };

    const getRanking = () => {
        const active = participants.filter(p => p.status === 'active' || p.status === 'champion' || p.status === 'fighting');
        const eliminated = participants.filter(p => p.status === 'eliminated').sort((a, b) => {
            // Later elimination = higher rank
            if (a.eliminated_at && b.eliminated_at) return new Date(b.eliminated_at).getTime() - new Date(a.eliminated_at).getTime();
            return 0;
        });
        return [...active, ...eliminated];
    };

    const activeCount = participants.filter(p => p.status === 'active' || p.status === 'fighting').length;
    const eliminatedCount = participants.filter(p => p.status === 'eliminated').length;
    const ranking = getRanking();

    const addRound = () => {
        const nextId = roundIds.length > 0 ? Math.max(...roundIds) + 1 : 1;
        setRoundIds([...roundIds, nextId]);
    };

    const deleteRound = (idToDelete: number) => {
        const newRoundIds = roundIds.filter(id => id !== idToDelete);
        // Re-index remaining rounds
        const newMapping: Record<number, string[]> = {};
        newRoundIds.sort((a, b) => a - b).forEach((oldId, index) => {
            const newId = index + 1;
            if (roundQuestions[oldId]) {
                newMapping[newId] = roundQuestions[oldId];
            }
        });
        
        // Finalize re-indexed IDs
        setRoundIds(newRoundIds.map((_, i) => i + 1));
        setRoundQuestions(newMapping);
    };

    // ========== CREATE FORM ==========
    if (mode === 'create') {
        return (
            <div className="max-w-lg mx-auto">
                <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => navigate('/arena/admin')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
                    <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">⚔️ Tạo Đấu Trường</h1>
                </div>

                <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-5" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Tên đấu trường</label>
                        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nguồn câu hỏi</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setSource('exam')} className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${source === 'exam' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>📋 Ngân hàng bài tập</button>
                            <button onClick={() => setSource('arena')} className={`p-3 rounded-xl border-2 text-sm font-bold transition-all ${source === 'arena' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600'}`}>🧠 Bộ câu hỏi Arena</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Môn học</label>
                        <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none">
                            {SUBJECTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Câu hỏi/trận</label>
                            <input type="number" min={3} max={10} value={questionsPerMatch} onChange={e => setQuestionsPerMatch(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Thời gian/câu (s)</label>
                            <input type="number" min={5} max={60} value={timePerQuestion} onChange={e => setTimePerQuestion(Number(e.target.value))} className="w-full border rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none" />
                        </div>
                    </div>

                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-purple-700">Dòng câu hỏi: {selectedIds.length > 0 ? `${selectedIds.length} câu đã chọn` : 'Ngẫu nhiên theo môn'}</h3>
                            <button onClick={() => setShowSelector(true)} className="text-xs font-black text-purple-600 underline">
                                {selectedIds.length > 0 ? 'Sửa' : 'Chọn thủ công'}
                            </button>
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-2">
                                {selectedIds.map(qid => (
                                    <div key={qid} className="bg-white px-2 py-0.5 rounded border border-purple-200 text-[10px] flex items-center gap-1">
                                        ID: {qid.split('_').pop()}
                                        <button onClick={() => setSelectedIds(prev => prev.filter(id => id !== qid))} className="text-red-400 hover:text-red-600">×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Round setup */}
                        <div className="pt-2 border-t border-purple-100 flex flex-col gap-2">
                            <h4 className="text-[10px] font-bold text-purple-700 uppercase">Phân bổ theo Vòng (Tùy chọn)</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {roundIds.map(r => (
                                    <div key={r} className="relative group">
                                        <button 
                                            onClick={() => {
                                                setSelectingRound(r);
                                                setShowSelector(true);
                                            }}
                                            className="w-full bg-white p-2 rounded-lg border border-purple-200 text-left hover:border-purple-400 transition-all"
                                        >
                                            <div className="text-[10px] font-bold text-gray-400">VÒNG {r}</div>
                                            <div className="text-xs font-medium text-purple-600">{(roundQuestions[r] || []).length} câu hỏi</div>
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); deleteRound(r); }}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                                <button 
                                    onClick={addRound}
                                    className="p-2 rounded-lg border-2 border-dashed border-purple-200 text-purple-400 flex items-center justify-center gap-1 hover:border-purple-400 hover:text-purple-600 transition-all font-bold text-xs"
                                >
                                    <Plus className="h-4 w-4" /> Thêm vòng
                                </button>
                            </div>
                        </div>

                        <p className="text-[10px] text-purple-600 opacity-70 leading-relaxed">
                            ⚔️ Sau khi tạo, HS đã đăng nhập sẽ vào phòng với <strong>biệt danh ẩn danh</strong>. Người thua rời phòng, người thắng ở lại đến khi còn 1 Nhà Vô Địch!
                        </p>
                    </div>

                    {/* Question Selector Modal */}
                    {showSelector && (
                        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
                            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        {source === 'arena' ? <Brain className="h-5 w-5 text-purple-500" /> : <BookOpen className="h-5 w-5 text-indigo-500" />}
                                        {selectingRound ? `Vòng ${selectingRound}: Chọn câu hỏi (${(roundQuestions[selectingRound] || []).length})` : `Chọn kho câu hỏi (${selectedIds.length})`}
                                    </h3>
                                    <button onClick={() => { setShowSelector(false); setSelectingRound(null); }} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                                </div>

                                <div className="p-4 border-b">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input 
                                            placeholder="Tiềm kiếm nội dung câu hỏi..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>
                                </div>

                                <div className="px-4 pb-4 border-b flex gap-2">
                                    <select 
                                        value={filterTopic} 
                                        onChange={e => setFilterTopic(e.target.value)}
                                        className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Tất cả chủ đề</option>
                                        {Array.from(new Set(
                                            (source === 'arena' ? useStore.getState().arenaQuestions : 
                                            useStore.getState().exams.flatMap(e => e.questions || []))
                                            .map(q => q.topic).filter(Boolean)
                                        )).sort().map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <select 
                                        value={filterDifficulty} 
                                        onChange={e => setFilterDifficulty(e.target.value === '' ? '' : Number(e.target.value))}
                                        className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                    >
                                        <option value="">Tất cả độ khó</option>
                                        <option value="1">Dễ</option>
                                        <option value="2">Trung bình</option>
                                        <option value="3">Khó</option>
                                    </select>
                                </div>

                                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                                    {(source === 'arena' ? useStore.getState().arenaQuestions : 
                                        useStore.getState().exams.flatMap(e => (e.questions || []).filter(q => q.type === 'MCQ').map(q => ({...q, examTitle: e.title, examId: e.id})))
                                    ).filter(q => {
                                        const content = 'content' in q ? q.content : (q as any).question;
                                        const matchesSearch = content?.toLowerCase().includes(searchQuery.toLowerCase());
                                        const matchesTopic = !filterTopic || q.topic === filterTopic;
                                        const qAny = q as any;
                                        const qDiff = qAny.difficulty || (qAny.level === 'NHAN_BIET' ? 1 : qAny.level === 'KET_NOI' ? 2 : 3);
                                        const matchesDiff = filterDifficulty === '' || qDiff === filterDifficulty;
                                        return matchesSearch && matchesTopic && matchesDiff;
                                    }).map((q: any) => {
                                        const qid = q.id.includes('_') ? q.id : (q.examId ? `exam_${q.examId}_${q.id}` : q.id);
                                        const isSelected = selectedIds.includes(qid);
                                        return (
                                            <button 
                                                key={qid}
                                                onClick={() => {
                                                    if (selectingRound) {
                                                        const current = roundQuestions[selectingRound] || [];
                                                        const isNowSelected = current.includes(qid);
                                                        setRoundQuestions({
                                                            ...roundQuestions,
                                                            [selectingRound]: isNowSelected ? current.filter(id => id !== qid) : [...current, qid]
                                                        });
                                                    } else {
                                                        setSelectedIds(prev => isSelected ? prev.filter(id => id !== qid) : [...prev, qid]);
                                                    }
                                                }}
                                                className={`w-full text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start ${isSelected ? 'border-purple-500 bg-purple-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                                            >
                                                <div className={`mt-1 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-gray-300'}`}>
                                                    {isSelected && <CheckCircle2 className="h-4 w-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <MathText className="text-xs font-medium text-gray-900 line-clamp-2" inline>{q.content || q.question}</MathText>
                                                    <div className="flex gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{q.subject || q.examTitle || 'Chung'}</span>
                                                        <span className="text-[10px] font-bold text-purple-400">ID: {qid.split('_').pop()}</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="p-4 border-t flex gap-3">
                                    <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700">Xóa hết</button>
                                    <button onClick={() => setShowSelector(false)} className="flex-1 bg-purple-600 text-white py-2 rounded-xl font-bold">Xác nhận</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={handleCreate} disabled={loading || !title.trim()}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50">
                        {loading ? 'Đang tạo...' : '⚔️ Tạo Đấu Trường'}
                    </button>
                </div>
            </div>
        );
    }

    // ========== PROJECTION MODE ==========
    if (mode === 'projection') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 text-white p-8">
                <style>{`
                    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                    @keyframes glow { 0%, 100% { text-shadow: 0 0 10px rgba(139,92,246,0.5); } 50% { text-shadow: 0 0 30px rgba(139,92,246,0.8), 0 0 50px rgba(168,85,247,0.4); } }
                `}</style>

                <div className="flex items-center justify-between mb-8">
                    <button onClick={() => setMode('manage')} className="text-white/60 hover:text-white flex items-center gap-2"><ArrowLeft className="h-5 w-5" /> Quản lý</button>
                    <h1 className="text-3xl font-black text-center flex-1" style={{ animation: 'glow 2s ease-in-out infinite' }}>⚔️ {tournament?.title || 'Đấu Trường Tri Thức'}</h1>
                    <div className="text-white/40 text-sm">{tournament?.status === 'active' ? '🟢 Đang diễn ra' : tournament?.status === 'finished' ? '🏆 Kết thúc' : '⏳ Chờ'}</div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-6 mb-8">
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                        <Users className="h-8 w-8 mx-auto text-blue-400 mb-2" />
                        <div className="text-3xl font-black">{participants.length}</div>
                        <div className="text-white/60 text-sm">Tổng HS</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                        <Swords className="h-8 w-8 mx-auto text-emerald-400 mb-2" />
                        <div className="text-3xl font-black text-emerald-400">{activeCount}</div>
                        <div className="text-white/60 text-sm">Còn trong trận</div>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
                        <Trophy className="h-8 w-8 mx-auto text-red-400 mb-2" />
                        <div className="text-3xl font-black text-red-400">{eliminatedCount}</div>
                        <div className="text-white/60 text-sm">Đã bị loại</div>
                    </div>
                </div>

                {/* Ranking */}
                <div className="bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
                    <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Crown className="h-6 w-6 text-yellow-400" /> Bảng Xếp Hạng</h2>
                    <div className="space-y-3">
                        {ranking.slice(0, 8).map((p, i) => (
                            <div key={p.id} className={`flex items-center gap-4 p-4 rounded-xl transition-all ${p.status === 'eliminated' ? 'bg-white/5 opacity-60' : 'bg-white/10 border border-white/10'}`}
                                style={{ animation: `fadeIn 0.4s ease-out ${i * 0.05}s both` }}>
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-400 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-white/10'}`}>
                                    {i + 1}
                                </div>
                                <span className="text-2xl">{p.alias_emoji}</span>
                                <div className="flex-1">
                                    <div className="font-bold text-lg">{p.alias}</div>
                                    <div className="text-white/40 text-sm">{p.wins}W · {p.status === 'eliminated' ? '❌ Loại' : p.status === 'champion' ? '👑 Vô Địch' : '⚔️ Đang đấu'}</div>
                                </div>
                                {i < 4 && tournament?.status === 'finished' && (
                                    <div className="text-right text-sm">
                                        <div className="text-emerald-400 font-bold">+{REWARDS.find(r => r.rank === i + 1)?.xp || 20} XP</div>
                                        <div className="text-yellow-400 font-bold">+{REWARDS.find(r => r.rank === i + 1)?.elo || 5} Elo</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ========== MANAGE MODE ==========
    return (
        <div className="max-w-4xl mx-auto">
            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }`}</style>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/arena/admin')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
                    <h1 className="text-xl font-black text-gray-900">⚔️ {tournament?.title || 'Đấu Trường'}</h1>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${tournament?.status === 'active' ? 'bg-emerald-100 text-emerald-700' : tournament?.status === 'finished' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                        {tournament?.current_round && tournament.status === 'active' ? `🔥 Vòng ${tournament.current_round}` : 
                         tournament?.status === 'active' ? '🟢 Đang diễn ra' : 
                         tournament?.status === 'finished' ? '🏆 Kết thúc' : '⏳ Chờ HS vào'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setMode('projection')} className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 font-bold rounded-xl hover:bg-purple-200 transition-all">
                        <Monitor className="h-4 w-4" /> Chiếu
                    </button>
                    {tournament?.status === 'waiting' && (
                        <button onClick={handleStart} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all">
                            <Play className="h-4 w-4" /> Bắt đầu
                        </button>
                    )}
                    {tournament?.status === 'active' && (
                        <div className="flex gap-2">
                             <button 
                                onClick={async () => {
                                    const next = (tournament.current_round || 1) + 1;
                                    await updateTournament(tournament.id, { current_round: next });
                                    setTournament({ ...tournament, current_round: next });
                                }} 
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                            >
                                <Zap className="h-4 w-4" /> Vòng { (tournament.current_round || 1) + 1 }
                            </button>
                            <button onClick={handleFinish} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-all">
                                <StopCircle className="h-4 w-4" /> Kết thúc
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border p-4 text-center">
                    <div className="text-2xl font-black text-gray-900">{participants.length}</div>
                    <div className="text-xs text-gray-500">Tổng HS</div>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
                    <div className="text-2xl font-black text-emerald-600">{activeCount}</div>
                    <div className="text-xs text-emerald-600">Còn lại</div>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
                    <div className="text-2xl font-black text-red-500">{eliminatedCount}</div>
                    <div className="text-xs text-red-500">Bị loại</div>
                </div>
                <div className="bg-purple-50 rounded-xl border border-purple-100 p-4 text-center">
                    <div className="text-2xl font-black text-purple-600">{questionsPerMatch}</div>
                    <div className="text-xs text-purple-600">câu/trận · {timePerQuestion}s</div>
                </div>
            </div>

            {/* Participants */}
            <div className="bg-white rounded-2xl border shadow-sm">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Users className="h-5 w-5 text-purple-500" /> Danh sách HS ({participants.length})</h2>
                </div>
                <div className="divide-y max-h-[60vh] overflow-y-auto">
                    {participants.length === 0 ? (
                        <div className="p-12 text-center text-gray-400">
                            <div className="text-4xl mb-3">⏳</div>
                            <p className="font-medium">Chưa có HS nào vào phòng</p>
                            <p className="text-sm mt-1">HS vào trang Đấu Trí → tham gia đấu trường</p>
                        </div>
                    ) : (
                        participants.map((p, i) => (
                            <div key={p.id} className={`flex items-center gap-4 p-4 transition-all ${p.status === 'eliminated' ? 'opacity-50' : ''}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${p.status === 'champion' ? 'bg-yellow-500 text-white' : p.status === 'eliminated' ? 'bg-gray-200 text-gray-400' : 'bg-purple-100 text-purple-700'}`}>
                                    {i + 1}
                                </div>
                                <span className="text-xl">{p.alias_emoji}</span>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">{p.alias}</div>
                                    <div className="text-xs text-gray-400">{p.wins}W · {p.status === 'active' ? '⚔️ Sẵn sàng' : p.status === 'fighting' ? '🔥 Đang đấu' : p.status === 'champion' ? '👑 Vô Địch' : '❌ Đã loại'}</div>
                                </div>
                                {p.status !== 'eliminated' && p.status !== 'champion' && tournament?.status === 'active' && (
                                    <button onClick={() => eliminateParticipant(p.id).then(loadParticipants)} className="text-xs px-3 py-1 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100">Loại</button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
