
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { ArenaTournament, TournamentParticipant } from '../../types';
import { ArrowLeft, Swords, Trophy, Crown, Users, Shield, Eye } from 'lucide-react';

export const TournamentLobby: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, arenaProfile, joinTournament, fetchTournamentParticipants, updateParticipant, eliminateParticipant, createMatch } = useStore();

    const [tournament, setTournament] = useState<ArenaTournament | null>(null);
    const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
    const [myParticipant, setMyParticipant] = useState<TournamentParticipant | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [challengingId, setChallengingId] = useState<string | null>(null);

    const pollRef = useRef<any>(null);

    useEffect(() => {
        if (!id || !user) return;
        loadAll();
        pollRef.current = setInterval(loadAll, 3000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [id, user]);

    const loadAll = async () => {
        if (!id || !user) return;
        const { data: t } = await supabase.from('arena_tournaments').select('*').eq('id', id).single();
        if (t) setTournament(t as any);

        const p = await fetchTournamentParticipants(id);
        setParticipants(p);

        const me = p.find(pp => pp.student_id === user!.id);
        if (me) setMyParticipant(me);
        setLoading(false);
    };

    const handleJoin = async () => {
        if (!id || !user) return;
        setJoining(true);
        const p = await joinTournament(id, user.id);
        if (p) setMyParticipant(p);
        else {
            // Already joined, find existing
            const all = await fetchTournamentParticipants(id);
            const me = all.find(pp => pp.student_id === user.id);
            if (me) setMyParticipant(me);
        }
        setJoining(false);
    };

    const handleChallenge = async (targetParticipant: TournamentParticipant) => {
        if (!user || !myParticipant || !tournament) return;
        setChallengingId(targetParticipant.id);

        // Get question pool for current round if specified
        let pool = tournament.question_ids;
        if (tournament.round_questions && tournament.current_round && (tournament.round_questions as any)[tournament.current_round]) {
            const roundPool = (tournament.round_questions as any)[tournament.current_round];
            if (roundPool.length > 0) pool = roundPool;
        }

        // Create a PvP match with tournament settings
        const match = await createMatch(user.id, {
            source: tournament.question_source,
            subject: tournament.filter_subject,
            providedQuestionIds: pool,
            count: tournament.questions_per_match
        });

        if (match) {
            // Update both participants as fighting
            await updateParticipant(myParticipant.id, { status: 'fighting', current_match_id: match.id });
            await updateParticipant(targetParticipant.id, { status: 'fighting', current_match_id: match.id });

            // Challenge the target student to this match
            await supabase.from('arena_matches').update({
                player2_id: targetParticipant.student_id,
                status: 'playing',
                source: tournament.question_source,
                filter_subject: tournament.filter_subject,
            }).eq('id', match.id);

            navigate(`/arena/battle/${match.id}`);
        }
        setChallengingId(null);
    };

    const activeParticipants = participants.filter(p => p.status === 'active' && p.student_id !== user?.id);
    const eliminatedParticipants = participants.filter(p => p.status === 'eliminated');
    const isEliminated = myParticipant?.status === 'eliminated';
    const isChampion = myParticipant?.status === 'champion';
    const ranking = [...participants.filter(p => p.status !== 'eliminated'), ...participants.filter(p => p.status === 'eliminated').sort((a, b) => (b.eliminated_at || '').localeCompare(a.eliminated_at || ''))];

    if (loading) {
        return (
            <div className="max-w-md mx-auto text-center py-16">
                <div className="w-16 h-16 mx-auto border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-medium">Đang tải đấu trường...</p>
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="max-w-md mx-auto text-center py-16">
                <div className="text-4xl mb-4">😕</div>
                <p className="text-gray-500 font-medium">Đấu trường không tồn tại</p>
                <button onClick={() => navigate('/arena')} className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200">Quay lại</button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
                @keyframes glow-border { 0%, 100% { border-color: rgba(139,92,246,0.3); } 50% { border-color: rgba(139,92,246,0.8); } }
            `}</style>

            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <button onClick={() => navigate('/arena')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
                <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">⚔️ {tournament.title}</h1>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${tournament.status === 'active' ? 'bg-emerald-100 text-emerald-700' : tournament.status === 'finished' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                    {tournament.status === 'active' ? '🟢 Đang diễn ra' : tournament.status === 'finished' ? '🏆 Kết thúc' : '⏳ Chờ bắt đầu'}
                </span>
            </div>

            {/* Not joined yet */}
            {!myParticipant && tournament.status !== 'finished' && (
                <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl p-8 text-white text-center mb-6" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    <div className="text-5xl mb-4" style={{ animation: 'float 3s ease-in-out infinite' }}>⚔️</div>
                    <h2 className="text-2xl font-black mb-2">{tournament.title}</h2>
                    <p className="text-white/60 mb-6 text-sm">Tham gia đấu trường với biệt danh bí ẩn. Đánh bại tất cả để trở thành Nhà Vô Địch!</p>
                    <button onClick={handleJoin} disabled={joining}
                        className="px-8 py-3 bg-white text-purple-900 font-black rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50">
                        {joining ? 'Đang vào...' : '⚔️ Tham gia Đấu Trường'}
                    </button>
                </div>
            )}

            {/* My info */}
            {myParticipant && (
                <div className={`rounded-2xl p-4 mb-6 flex items-center gap-4 border-2 ${isEliminated ? 'bg-gray-50 border-gray-200' : isChampion ? 'bg-yellow-50 border-yellow-300' : 'bg-purple-50 border-purple-200'}`}
                    style={!isEliminated && !isChampion ? { animation: 'glow-border 2s ease-in-out infinite' } : {}}>
                    <span className="text-3xl">{myParticipant.alias_emoji}</span>
                    <div className="flex-1">
                        <div className="font-bold text-gray-900">{myParticipant.alias} <span className="text-xs text-purple-500">(Bạn)</span></div>
                        <div className="text-xs text-gray-500">
                            {myParticipant.wins}W · {isChampion ? '👑 Nhà Vô Địch!' : isEliminated ? '❌ Đã bị loại - Chế độ Khán giả' : '⚔️ Sẵn sàng chiến đấu'}
                        </div>
                    </div>
                    {isEliminated && <span className="text-xs bg-gray-200 text-gray-600 font-bold px-3 py-1 rounded-full flex items-center gap-1"><Eye className="h-3 w-3" /> Khán giả</span>}
                </div>
            )}

            {/* Choose opponent */}
            {myParticipant && !isEliminated && !isChampion && tournament.status === 'active' && (
                <div className="mb-6">
                    <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Swords className="h-5 w-5 text-purple-500" /> Chọn đối thủ ({activeParticipants.length})</h2>
                    {activeParticipants.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center">
                            <div className="text-3xl mb-3">⏳</div>
                            <p className="text-gray-500 font-medium">Đang chờ đối thủ sẵn sàng...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {activeParticipants.map(p => (
                                <button key={p.id} onClick={() => handleChallenge(p)} disabled={challengingId === p.id}
                                    className="bg-white border-2 rounded-2xl p-4 text-center hover:border-purple-400 hover:bg-purple-50 hover:shadow-md transition-all group active:scale-95"
                                    style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform" style={{ animation: 'float 3s ease-in-out infinite' }}>{p.alias_emoji}</div>
                                    <div className="font-bold text-sm text-gray-900">{p.alias}</div>
                                    <div className="text-xs text-gray-400 mb-2">{p.wins}W</div>
                                    <div className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full group-hover:bg-purple-100">
                                        {challengingId === p.id ? '⏳...' : '⚔️ Thách đấu'}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Ranking */}
            <div className="bg-white rounded-2xl border shadow-sm">
                <div className="p-4 border-b">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" /> Bảng Xếp Hạng</h2>
                </div>
                <div className="divide-y">
                    {ranking.slice(0, 8).map((p, i) => (
                        <div key={p.id} className={`flex items-center gap-3 p-3 ${p.status === 'eliminated' ? 'opacity-50' : ''} ${p.student_id === user?.id ? 'bg-purple-50' : ''}`}>
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-500 text-white' : i === 1 ? 'bg-gray-400 text-white' : i === 2 ? 'bg-amber-700 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {i + 1}
                            </div>
                            <span className="text-lg">{p.alias_emoji}</span>
                            <div className="flex-1">
                                <span className="font-bold text-sm text-gray-900">{p.alias}</span>
                                <span className="text-xs text-gray-400 ml-2">{p.wins}W</span>
                            </div>
                            <span className="text-xs font-bold">
                                {p.status === 'champion' ? '👑' : p.status === 'eliminated' ? '❌' : p.status === 'fighting' ? '🔥' : '⚔️'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
