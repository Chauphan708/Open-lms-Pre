
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { supabase } from '../../services/supabaseClient';
import { ArenaQuestion, ArenaMatch } from '../../types';
import { Brain, Clock, Zap, BookOpen, CheckCircle, XCircle, Shield, Wand2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathText from '../../components/MathText';



const AVATAR_EMOJIS: Record<string, string> = {
    scholar: '📖', scientist: '🔬', artist: '🎨', explorer: '🌍'
};

const BATTLE_LORE = [
    'Hai học giả gặp nhau tại Đỉnh Trí Tuệ...',
    'Cuộc đấu trí bắt đầu dưới Cây Sách Thần...',
    'Thư Viện Cổ rung chuyển khi hai bộ óc đối đầu...',
    'Ai sẽ chinh phục đỉnh cao kiến thức hôm nay?',
    'Trận đấu trí tuệ đang chờ đợi người chiến thắng...',
    'Cánh cổng tri thức mở ra cho trận đấu huyền thoại...',
];

const QUESTIONS_PER_MATCH = 5;
const TIME_PER_QUESTION = 15;

export const PvPBattle: React.FC = () => {
    const { id: matchId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, arenaProfile, submitArenaAnswer, updateMatchHp, finishMatch, users, exams } = useStore();

    const [match, setMatch] = useState<ArenaMatch | null>(null);
    const [questions, setQuestions] = useState<ArenaQuestion[]>([]);
    const [currentQIdx, setCurrentQIdx] = useState(0);
    const [timer, setTimer] = useState(TIME_PER_QUESTION);
    const [myHp, setMyHp] = useState(100);
    const [opHp, setOpHp] = useState(100);
    const [selected, setSelected] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [lastDamage, setLastDamage] = useState(0);
    const [opDamageAnim, setOpDamageAnim] = useState(false);
    const [myDamageAnim, setMyDamageAnim] = useState(false);
    const [finished, setFinished] = useState(false);
    const [loading, setLoading] = useState(true);
    const [answeredThisQ, setAnsweredThisQ] = useState(false);
    const [battleLore] = useState(() => BATTLE_LORE[Math.floor(Math.random() * BATTLE_LORE.length)]);

    // Combat Mechanics
    const [streak, setStreak] = useState(0);
    const [streakLabel, setStreakLabel] = useState('');
    const [speedLabel, setSpeedLabel] = useState('');
    const [skillUsed, setSkillUsed] = useState(false);
    const [shieldActive, setShieldActive] = useState(false);
    const [hiddenAnswers, setHiddenAnswers] = useState<Set<number>>(new Set());
    const [skillAnim, setSkillAnim] = useState('');

    const shieldActiveRef = useRef(false);
    const channelRef = useRef<any>(null);
    const isPlayer1 = useRef(false);
    const opponentName = useRef('Đối thủ');
    const opponentAvatar = useRef('scholar');
    const timerStartRef = useRef(Date.now());

    // Load match data
    useEffect(() => {
        if (!matchId || !user) return;
        loadMatch();
        return () => {
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, [matchId, user]);

    const loadMatch = async () => {
        const { data: m } = await supabase.from('arena_matches').select('*').eq('id', matchId).single();
        if (!m) return navigate('/arena');

        setMatch(m as ArenaMatch);
        isPlayer1.current = m.player1_id === user!.id;

        // Load opponent info
        const opId = isPlayer1.current ? m.player2_id : m.player1_id;
        const opUser = users.find(u => u.id === opId);
        opponentName.current = opUser?.name || 'Đối thủ';

        const { data: opProfile } = await supabase.from('arena_profiles').select('*').eq('id', opId).single();
        if (opProfile) opponentAvatar.current = opProfile.avatar_class;

        // Load questions based on source
        if (m.source === 'exam' && m.question_ids?.length > 0) {
            // Parse exam questions from IDs like "exam_examId_questionId"
            const examQuestions: ArenaQuestion[] = [];
            m.question_ids.forEach((qid: string) => {
                if (qid.startsWith('exam_')) {
                    const parts = qid.split('_');
                    const examId = parts.slice(1, -1).join('_');
                    const questionId = parts[parts.length - 1];
                    const exam = exams.find(e => e.id === examId);
                    const q = exam?.questions.find(q => q.id === questionId);
                    if (q) {
                        if (q.type === 'MCQ' && q.correctOptionIndex !== undefined) {
                            examQuestions.push({
                                id: qid,
                                content: q.content,
                                answers: q.options.slice(0, 4),
                                correct_index: q.correctOptionIndex,
                                difficulty: exam?.difficulty === 'NHAN_BIET' ? 1 : exam?.difficulty === 'KET_NOI' ? 2 : 3,
                                subject: exam?.subject || 'general',
                                type: 'MCQ'
                            });
                        } else if (q.type === 'MCQ_MULTIPLE' && q.correctOptionIndices !== undefined) {
                            examQuestions.push({
                                id: qid,
                                content: q.content,
                                answers: q.options.slice(0, 4),
                                correct_indices: q.correctOptionIndices,
                                difficulty: exam?.difficulty === 'NHAN_BIET' ? 1 : exam?.difficulty === 'KET_NOI' ? 2 : 3,
                                subject: exam?.subject || 'general',
                                type: 'MCQ_MULTIPLE'
                            });
                        } else if (q.type === 'SHORT_ANSWER') {
                            // find solution or correct answers from options
                            const correctAns = q.options[0] || '';
                            examQuestions.push({
                                id: qid,
                                content: q.content,
                                answers: [],
                                correct_answer_string: correctAns,
                                difficulty: exam?.difficulty === 'NHAN_BIET' ? 1 : exam?.difficulty === 'KET_NOI' ? 2 : 3,
                                subject: exam?.subject || 'general',
                                type: 'SHORT_ANSWER'
                            });
                        }
                    }
                }
            });
            setQuestions(examQuestions);
        } else if (m.question_ids && m.question_ids.length > 0) {
            const { data: qs } = await supabase.from('arena_questions').select('*').in('id', m.question_ids);
            if (qs) {
                const ordered = m.question_ids.map((qid: string) => qs.find((q: any) => q.id === qid)).filter(Boolean);
                setQuestions(ordered.map((q: any) => ({
                    ...q,
                    answers: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers,
                    correct_indices: typeof q.correct_indices === 'string' ? JSON.parse(q.correct_indices) : q.correct_indices
                })));
            }
        }

        // Set initial HP
        setMyHp(isPlayer1.current ? m.player1_hp : m.player2_hp);
        setOpHp(isPlayer1.current ? m.player2_hp : m.player1_hp);

        // Subscribe to match events
        const channel = supabase.channel(`battle-${matchId}`)
            .on('broadcast', { event: 'damage' }, (payload) => {
                if (payload.payload.targetId === user!.id) {
                    if (shieldActiveRef.current) {
                        // Shield blocks the damage
                        setShieldActive(false);
                        shieldActiveRef.current = false;
                        return;
                    }
                    const dmg = payload.payload.amount;
                    setMyHp(prev => Math.max(0, prev - dmg));
                    setMyDamageAnim(true);
                    setTimeout(() => setMyDamageAnim(false), 600);
                }
            })
            .on('postgres_changes', {
                event: 'UPDATE', schema: 'public', table: 'arena_matches', filter: `id=eq.${matchId}`
            }, (payload: any) => {
                if (payload.new.status === 'finished') {
                    setFinished(true);
                }
            })
            .subscribe();

        channelRef.current = channel;
        timerStartRef.current = Date.now();
        setLoading(false);
    };

    // Timer countdown
    useEffect(() => {
        if (loading || finished || showResult) return;
        if (timer <= 0) { handleTimeout(); return; }
        const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
        return () => clearTimeout(t);
    }, [timer, loading, finished, showResult]);

    const handleTimeout = async () => {
        if (answeredThisQ || !matchId || !user) return;
        setAnsweredThisQ(true);
        setStreak(0); setStreakLabel(''); setSpeedLabel('');
        await submitArenaAnswer(matchId, user.id, currentQIdx, -1, TIME_PER_QUESTION, false);
        advanceQuestion();
    };

    // Extra states for MCQ_MULTIPLE and SHORT_ANSWER
    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
    const [shortAnswerText, setShortAnswerText] = useState('');

    const handleAnswer = async (idxPayload: number | number[] | string) => {
        if (showResult || answeredThisQ || !questions[currentQIdx] || !matchId || !user) return;
        setAnsweredThisQ(true);

        const q = questions[currentQIdx];
        const qType = q.type || 'MCQ';

        let correct = false;
        let finalAnswerIndex = -1;

        if (qType === 'MCQ') {
            const idx = idxPayload as number;
            setSelected(idx);
            correct = idx === q.correct_index;
            finalAnswerIndex = idx;
        } else if (qType === 'MCQ_MULTIPLE') {
            const indices = idxPayload as number[];
            // So sánh 2 mảng correct_indices và indices
            const correctIndices = q.correct_indices || [];
            if (correctIndices.length === indices.length && correctIndices.every(val => indices.includes(val))) {
                correct = true;
            }
            finalAnswerIndex = indices.length > 0 ? indices[0] : -1; // Fallback index
        } else if (qType === 'SHORT_ANSWER') {
            const ansStr = idxPayload as string;
            const cleanUser = ansStr.trim().toLowerCase().replace(/\s+/g, '');
            const cleanCorrect = (q.correct_answer_string || '').trim().toLowerCase().replace(/\s+/g, '');
            correct = cleanUser === cleanCorrect;
            finalAnswerIndex = correct ? 0 : -1;
        }

        setIsCorrect(correct);
        setShowResult(true);

        const timeTaken = TIME_PER_QUESTION - timer;

        if (correct) {
            // Update streak
            const newStreak = streak + 1;
            setStreak(newStreak);

            // Base damage
            let baseDmg = 20;

            // Speed Bonus
            let speedMult = 1;
            if (timeTaken <= 3) { speedMult = 2.0; setSpeedLabel('⚡ Tia Chớp! x2'); }
            else if (timeTaken <= 5) { speedMult = 1.5; setSpeedLabel('🏃 Nhanh Trí! x1.5'); }
            else if (timeTaken > 10) { speedMult = 0.8; setSpeedLabel('🐢 Chậm -20%'); }
            else { setSpeedLabel(''); }

            // Streak Combo
            let streakMult = 1;
            if (newStreak >= 4) { streakMult = 3; setStreakLabel('⚡ ULTIMATE x3!'); }
            else if (newStreak >= 3) { streakMult = 2; setStreakLabel('🔥🔥 Combo x2'); }
            else if (newStreak >= 2) { streakMult = 1.5; setStreakLabel('🔥 Combo x1.5'); }
            else { setStreakLabel(''); }

            const damage = Math.round(baseDmg * speedMult * streakMult);
            setLastDamage(damage);

            setOpHp(prev => Math.max(0, prev - damage));
            setOpDamageAnim(true);
            setTimeout(() => setOpDamageAnim(false), 600);

            const targetId = isPlayer1.current ? match?.player2_id : match?.player1_id;
            if (channelRef.current) {
                channelRef.current.send({
                    type: 'broadcast', event: 'damage',
                    payload: { targetId, amount: damage }
                });
            }

            const newOpHp = Math.max(0, (isPlayer1.current ? (match?.player2_hp || 100) : (match?.player1_hp || 100)) - damage);
            if (isPlayer1.current) {
                await updateMatchHp(matchId, myHp, newOpHp);
            } else {
                await updateMatchHp(matchId, newOpHp, myHp);
            }
        } else {
            // Wrong answer
            setStreak(0);
            setStreakLabel('');
            setSpeedLabel('');
            setLastDamage(0);

            // Shield (Artist skill) protects from opponent damage effect
            if (shieldActiveRef.current) {
                setShieldActive(false);
                shieldActiveRef.current = false;
            }
        }

        await submitArenaAnswer(matchId, user.id, currentQIdx, finalAnswerIndex, timeTaken, correct);
        setTimeout(() => advanceQuestion(), 2000);
    };

    const advanceQuestion = () => {
        const nextIdx = currentQIdx + 1;
        if (nextIdx >= QUESTIONS_PER_MATCH || nextIdx >= questions.length || myHp <= 0 || opHp <= 0) {
            endMatch();
        } else {
            setCurrentQIdx(nextIdx);
            setSelected(null);
            setSelectedIndices([]);
            setShortAnswerText('');
            setShowResult(false);
            setTimer(TIME_PER_QUESTION);
            setAnsweredThisQ(false);
            setHiddenAnswers(new Set());
            timerStartRef.current = Date.now();
        }
    };

    // ====== SKILL SYSTEM ======
    const getSkillInfo = () => {
        const cls = arenaProfile?.avatar_class || 'scholar';
        switch (cls) {
            case 'scholar': return { name: '50/50', emoji: '📖', desc: 'Loại 2 đáp án sai', color: 'bg-indigo-500' };
            case 'scientist': return { name: '+5 Giây', emoji: '🔬', desc: 'Thêm 5 giây', color: 'bg-purple-500' };
            case 'artist': return { name: 'Lá Chắn', emoji: '🎨', desc: 'Sai không mất HP', color: 'bg-emerald-500' };
            case 'explorer': return { name: 'Hồi HP', emoji: '🌍', desc: 'Hồi 15 HP', color: 'bg-amber-500' };
            default: return { name: 'Skill', emoji: '✨', desc: '', color: 'bg-gray-500' };
        }
    };

    const handleUseSkill = () => {
        if (skillUsed || showResult || !currentQuestion) return;
        setSkillUsed(true);
        setSkillAnim('skill-activate');
        setTimeout(() => setSkillAnim(''), 1000);

        const cls = arenaProfile?.avatar_class || 'scholar';
        switch (cls) {
            case 'scholar': {
                // 50/50: hide 2 wrong answers
                const correctIdx = currentQuestion.correct_index;
                const wrongIdxs = [0, 1, 2, 3].filter(i => i !== correctIdx);
                const shuffled = wrongIdxs.sort(() => Math.random() - 0.5);
                setHiddenAnswers(new Set([shuffled[0], shuffled[1]]));
                break;
            }
            case 'scientist': {
                // +5s
                setTimer(prev => prev + 5);
                break;
            }
            case 'artist': {
                // Shield
                setShieldActive(true);
                shieldActiveRef.current = true;
                break;
            }
            case 'explorer': {
                // Heal 15 HP
                setMyHp(prev => Math.min(100, prev + 15));
                break;
            }
        }
    };

    const skillInfo = getSkillInfo();

    const endMatch = async () => {
        if (!matchId || !user || !match) return;
        setFinished(true);
        let winnerId: string | null = null;
        if (myHp > opHp) winnerId = user.id;
        else if (opHp > myHp) winnerId = isPlayer1.current ? match.player2_id : match.player1_id;
        await finishMatch(matchId, winnerId);
        setTimeout(() => {
            navigate(`/arena/result/${matchId}?winner=${winnerId || 'draw'}&myHp=${myHp}&opHp=${opHp}`);
        }, 2000);
    };

    useEffect(() => {
        if (loading || finished) return;
        if (myHp <= 0 || opHp <= 0) { endMatch(); }
    }, [myHp, opHp]);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <Brain className="h-12 w-12 text-indigo-500 mx-auto mb-4" style={{ animation: 'pulse 1s ease-in-out infinite' }} />
                    <p className="text-gray-500 font-bold">Đang tải trận đấu...</p>
                    <p className="text-sm text-indigo-400 mt-2 italic">✨ {battleLore}</p>
                </div>
                <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            </div>
        );
    }

    const currentQuestion = questions[currentQIdx];

    return (
        <div className="max-w-3xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes damage-flash { 0% { background-color: rgba(239,68,68,0.3); } 100% { background-color: transparent; } }
        @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes hp-glow { 0%, 100% { box-shadow: 0 0 5px rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 15px rgba(239,68,68,0.6); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes skill-activate { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.7); } 50% { transform: scale(1.1); box-shadow: 0 0 20px 10px rgba(139,92,246,0); } 100% { transform: scale(1); } }
        @keyframes streak-fire { 0% { text-shadow: 0 0 5px #f59e0b; } 50% { text-shadow: 0 0 20px #ef4444, 0 0 40px #f59e0b; } 100% { text-shadow: 0 0 5px #f59e0b; } }
      `}</style>

            {/* Lore Banner */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl px-4 py-2 mb-4 text-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <p className="text-xs text-indigo-600 italic">✨ {battleLore}</p>
            </div>

            {/* Battle HUD */}
            <div className="grid grid-cols-3 gap-4 mb-6 items-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
                {/* My Avatar */}
                <div className={`text-center p-4 rounded-2xl border-2 transition-all ${myDamageAnim ? 'border-red-500' : 'border-indigo-200'}`}
                    style={myDamageAnim ? { animation: 'shake 0.5s ease-in-out, damage-flash 0.5s ease-out' } : {}}>
                    <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl mb-2"
                        style={{ background: 'linear-gradient(135deg, #312e81, #4c1d95)' }}>
                        {AVATAR_EMOJIS[arenaProfile?.avatar_class || 'scholar']}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                    <div className="mt-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden relative"
                            style={myHp < 30 ? { animation: 'hp-glow 1s ease-in-out infinite' } : {}}>
                            <div className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${myHp}%`,
                                    background: myHp > 60 ? 'linear-gradient(90deg, #10b981, #059669)' : myHp > 30 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)'
                                }}></div>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mt-1">{myHp} HP</p>
                    </div>
                </div>

                {/* VS / Timer */}
                <div className="text-center">
                    <div className="text-2xl font-black text-gray-300 mb-2">VS</div>
                    <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center font-black text-lg ${timer > 10 ? 'bg-gray-100 text-gray-600' : timer > 5 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}
                        style={timer <= 5 ? { animation: 'pulse 0.5s ease-in-out infinite' } : {}}>
                        {timer}s
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Câu {currentQIdx + 1}/{Math.min(QUESTIONS_PER_MATCH, questions.length)}</p>
                    {/* Streak indicator */}
                    {streak >= 2 && (
                        <div className="mt-1 text-xs font-black" style={{ animation: 'streak-fire 1s ease-in-out infinite', color: streak >= 4 ? '#ef4444' : '#f59e0b' }}>
                            {streak >= 4 ? '⚡ ULTIMATE' : streak >= 3 ? '🔥🔥 x2' : '🔥 x1.5'}
                        </div>
                    )}
                </div>

                {/* Opponent Avatar */}
                <div className={`text-center p-4 rounded-2xl border-2 transition-all ${opDamageAnim ? 'border-red-500' : 'border-purple-100'}`}
                    style={opDamageAnim ? { animation: 'shake 0.5s ease-in-out, damage-flash 0.5s ease-out' } : {}}>
                    <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-3xl mb-2 bg-gray-800">
                        {AVATAR_EMOJIS[opponentAvatar.current]}
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{opponentName.current}</p>
                    <div className="mt-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden relative"
                            style={opHp < 30 ? { animation: 'hp-glow 1s ease-in-out infinite' } : {}}>
                            <div className="h-full rounded-full transition-all duration-500 ease-out"
                                style={{
                                    width: `${opHp}%`,
                                    background: opHp > 60 ? 'linear-gradient(90deg, #10b981, #059669)' : opHp > 30 ? 'linear-gradient(90deg, #f59e0b, #d97706)' : 'linear-gradient(90deg, #ef4444, #dc2626)'
                                }}></div>
                        </div>
                        <p className="text-xs font-bold text-gray-500 mt-1">{opHp} HP</p>
                    </div>
                    {opDamageAnim && lastDamage > 0 && (
                        <div className="text-red-500 font-black text-lg" style={{ animation: 'pop 0.3s ease-out' }}>
                            -{lastDamage} ⚡
                        </div>
                    )}
                </div>
            </div>

            {/* Finished Overlay */}
            {finished && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <div className="text-center text-white" style={{ animation: 'pop 0.5s ease-out' }}>
                        <div className="text-6xl mb-4">{myHp > opHp ? '🏆' : myHp < opHp ? '😔' : '🤝'}</div>
                        <h2 className="text-3xl font-black">{myHp > opHp ? 'CHIẾN THẮNG!' : myHp < opHp ? 'THẤT BẠI!' : 'HÒA!'}</h2>
                        <p className="text-white/60 mt-2">Đang xử lý kết quả...</p>
                    </div>
                </div>
            )}

            {/* Skill Button */}
            {currentQuestion && !finished && (
                <div className="flex items-center justify-center gap-3 mb-4" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                    <button
                        onClick={handleUseSkill}
                        disabled={skillUsed || showResult}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${skillUsed ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : `${skillInfo.color} text-white hover:shadow-lg hover:scale-105 active:scale-95`}`}
                        style={skillAnim ? { animation: 'skill-activate 0.5s ease-out' } : {}}
                    >
                        <Wand2 className="h-4 w-4" />
                        {skillInfo.emoji} {skillInfo.name}
                        {!skillUsed && <span className="text-xs opacity-75">({skillInfo.desc})</span>}
                        {skillUsed && <span className="text-xs">Đã dùng</span>}
                    </button>
                    {shieldActive && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">🛡️ Lá Chắn ON</span>}
                    {streakLabel && <span className="text-xs font-black" style={{ animation: 'streak-fire 1s ease-in-out infinite', color: streak >= 4 ? '#ef4444' : '#f59e0b' }}>{streakLabel}</span>}
                </div>
            )}

            {/* Question */}
            {currentQuestion && (
                <>
                    {/* Question type tag */}
                    <div className="bg-white rounded-2xl shadow-sm border p-6 mb-4" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {currentQuestion.subject === 'math' ? '📐 Toán' : currentQuestion.subject === 'science' ? '🔬 Khoa học' : currentQuestion.subject === 'technology' ? '💻 Công nghệ' : '📋 ' + currentQuestion.subject}
                            </span>
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-full text-xs font-bold">
                                {currentQuestion.type === 'MCQ_MULTIPLE' ? '☑ Chọn nhiều đáp án' : currentQuestion.type === 'SHORT_ANSWER' ? '✏ Trả lời ngắn' : '🔘 Trắc nghiệm 1 đáp án'}
                            </span>
                        </div>
                        <div className="text-lg font-bold text-gray-900 leading-relaxed">
                            <MathText>{currentQuestion.content}</MathText>
                        </div>
                    </div>

                    {/* RENDER MCQ */}
                    {(currentQuestion.type === 'MCQ' || !currentQuestion.type) && (
                        <div className="grid grid-cols-2 gap-3">
                            {currentQuestion.answers.map((answer, idx) => {
                                const isHidden = hiddenAnswers.has(idx);
                                let btnClass = 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 text-gray-700';
                                if (isHidden) btnClass = 'bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed';
                                else if (showResult) {
                                    if (idx === currentQuestion.correct_index) btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                                    else if (idx === selected && !isCorrect) btnClass = 'bg-red-50 border-red-500 text-red-700';
                                    else btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                                }
                                const colors = ['bg-blue-500', 'bg-orange-500', 'bg-green-500', 'bg-purple-500'];
                                return (
                                    <button key={idx} onClick={() => !isHidden && handleAnswer(idx)} disabled={showResult || answeredThisQ || isHidden}
                                        className={`p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${btnClass} ${!showResult && !answeredThisQ && !isHidden ? 'hover:shadow-md active:scale-95' : ''}`}
                                        style={{ animation: `fadeIn 0.3s ease-out ${idx * 0.05}s both`, opacity: isHidden ? 0.4 : 1 }}>
                                        <div className="flex items-start gap-2">
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ${showResult && idx === currentQuestion.correct_index ? 'bg-emerald-500' : showResult && idx === selected && !isCorrect ? 'bg-red-500' : isHidden ? 'bg-gray-300' : colors[idx]}`}>
                                                {isHidden ? '✗' : showResult && idx === currentQuestion.correct_index ? '✓' : showResult && idx === selected && !isCorrect ? '✗' : String.fromCharCode(65 + idx)}
                                            </span>
                                            <span className="text-sm leading-relaxed">{isHidden ? <span className="line-through">Đã loại</span> : <MathText>{answer}</MathText>}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* RENDER MCQ_MULTIPLE */}
                    {currentQuestion.type === 'MCQ_MULTIPLE' && (
                        <div>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {currentQuestion.answers.map((answer, idx) => {
                                    const isSelected = selectedIndices.includes(idx);
                                    const correctIndices = currentQuestion.correct_indices || [];
                                    const isCorrectOpt = correctIndices.includes(idx);

                                    let btnClass = isSelected 
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-700' 
                                        : 'bg-white border-gray-200 hover:border-indigo-400 text-gray-700';

                                    if (showResult) {
                                        if (isCorrectOpt) {
                                            btnClass = 'bg-emerald-50 border-emerald-500 text-emerald-700';
                                        } else if (isSelected && !isCorrectOpt) {
                                            btnClass = 'bg-red-50 border-red-500 text-red-700';
                                        } else {
                                            btnClass = 'bg-gray-50 border-gray-200 text-gray-400';
                                        }
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            onClick={() => {
                                                if (showResult) return;
                                                setSelectedIndices(prev => 
                                                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                                );
                                            }}
                                            disabled={showResult || answeredThisQ}
                                            className={`p-4 rounded-xl border-2 text-left font-medium transition-all duration-200 ${btnClass} ${!showResult && !answeredThisQ ? 'hover:shadow-md active:scale-95' : ''}`}
                                        >
                                            <div className="flex items-start gap-2">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected}
                                                    readOnly
                                                    disabled={showResult}
                                                    className="w-4 h-4 mt-1 rounded text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span className="text-sm leading-relaxed"><MathText>{answer}</MathText></span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                            {!showResult && (
                                <button
                                    onClick={() => handleAnswer(selectedIndices)}
                                    disabled={selectedIndices.length === 0}
                                    className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Xác nhận lựa chọn ({selectedIndices.length})
                                </button>
                            )}
                        </div>
                    )}

                    {/* RENDER SHORT_ANSWER */}
                    {currentQuestion.type === 'SHORT_ANSWER' && (
                        <div className="bg-white rounded-2xl shadow-sm border p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-600 mb-2">Nhập đáp án của bạn:</label>
                                <input
                                    type="text"
                                    value={shortAnswerText}
                                    onChange={(e) => setShortAnswerText(e.target.value)}
                                    disabled={showResult || answeredThisQ}
                                    placeholder="Điền từ, số hoặc cụm từ đáp án chính xác..."
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-semibold"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && shortAnswerText.trim()) {
                                            handleAnswer(shortAnswerText);
                                        }
                                    }}
                                />
                            </div>

                            {showResult && (
                                <div className="p-4 rounded-xl mb-4 bg-gray-50 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Đáp án của bạn:</span>
                                        <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {shortAnswerText || '(Không trả lời)'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Đáp án đúng:</span>
                                        <span className="font-bold text-emerald-600">
                                            {currentQuestion.correct_answer_string}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {!showResult && (
                                <button
                                    onClick={() => handleAnswer(shortAnswerText)}
                                    disabled={!shortAnswerText.trim()}
                                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Nộp câu trả lời
                                </button>
                            )}
                        </div>
                    )}

                    {/* Damage / Speed feedback */}
                    {showResult && isCorrect && (speedLabel || streakLabel) && (
                        <div className="mt-3 flex items-center justify-center gap-3" style={{ animation: 'pop 0.3s ease-out' }}>
                            {speedLabel && <span className="text-sm font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">{speedLabel}</span>}
                            {streakLabel && <span className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">{streakLabel}</span>}
                            <span className="text-sm font-black text-red-500">-{lastDamage} HP!</span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
