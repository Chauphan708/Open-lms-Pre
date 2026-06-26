import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import { Brain, Home, Trophy, TrendingUp, TrendingDown, HelpCircle, Check, X, Sparkles, Zap, Bot, ArrowRight, Loader } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';
import { generateRevengeQuestions } from '../../services/geminiService';
import MathText from '../../components/MathText';

const RESULT_LORE = {
    win: [
        'Trí tuệ của bạn đã chinh phục đỉnh cao!',
        'Kiến thức là sức mạnh - và bạn đã chứng minh điều đó!',
        'Nhà vô địch tri thức hôm nay là bạn!',
    ],
    lose: [
        'Mỗi trận đấu là một bài học quý giá.',
        'Đừng nản, kiến thức cần thời gian để tích lũy!',
        'Lần sau sẽ khác - hãy tiếp tục học hỏi!',
    ],
    draw: [
        'Hai bộ óc ngang tài ngang sức!',
        'Trận đấu cân bằng - cả hai đều xuất sắc!',
    ],
};

export const MatchResult: React.FC = () => {
    const { id: matchId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, arenaProfile, updateArenaProfile } = useStore();

    const winner = searchParams.get('winner');
    const myHp = parseInt(searchParams.get('myHp') || '0');
    const opHp = parseInt(searchParams.get('opHp') || '0');

    const isWin = winner === user?.id;
    const isDraw = winner === 'draw' || winner === null;

    const lorePool = isDraw ? RESULT_LORE.draw : isWin ? RESULT_LORE.win : RESULT_LORE.lose;
    const lore = lorePool[Math.floor(Math.random() * lorePool.length)];

    // State for AI Revenge
    const [wrongQuestions, setWrongQuestions] = useState<any[]>([]);
    const [isLoadingWrong, setIsLoadingWrong] = useState(true);
    const [showRevenge, setShowRevenge] = useState(false);
    const [isLoadingRevenge, setIsLoadingRevenge] = useState(false);
    const [revengeData, setRevengeData] = useState<{ topic: string, summary: string, questions: any[] } | null>(null);
    const [currentRevengeIndex, setCurrentRevengeIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [revengeAnswers, setRevengeAnswers] = useState<Record<number, boolean>>({});
    const [revengeSubmitted, setRevengeSubmitted] = useState(false);
    const [revengeCompleted, setRevengeCompleted] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        const fetchWrongQuestions = async () => {
            if (!matchId || !user) return;
            try {
                // 1. Get match details
                const { data: match } = await supabase
                    .from('arena_matches')
                    .select('*')
                    .eq('id', matchId)
                    .single();
                
                if (!match) return;

                // 2. Get wrong events for the current user
                const { data: events } = await supabase
                    .from('arena_match_events')
                    .select('*')
                    .eq('match_id', matchId)
                    .eq('player_id', user.id)
                    .eq('event_type', 'answer_wrong');

                if (!events || events.length === 0) {
                    setIsLoadingWrong(false);
                    return;
                }

                const wrongIndices = events.map(evt => evt.payload?.question_index);
                
                // Fetch all match questions
                const { data: questions } = await supabase
                    .from('arena_questions')
                    .select('*')
                    .in('id', match.question_ids);

                if (questions) {
                    // Map questions to match order
                    const orderedQuestions = match.question_ids.map((qid: string) => questions.find((q: any) => q.id === qid)).filter(Boolean);
                    // Filter wrong ones
                    const wrong = orderedQuestions.filter((q: any, idx: number) => wrongIndices.includes(idx));
                    setWrongQuestions(wrong);
                }
            } catch (err) {
                console.error("Error fetching wrong questions:", err);
            } finally {
                setIsLoadingWrong(false);
            }
        };
        fetchWrongQuestions();
    }, [matchId, user]);

    const handleStartRevenge = async () => {
        if (wrongQuestions.length === 0) return;
        setIsLoadingRevenge(true);
        setShowRevenge(true);
        try {
            const data = await generateRevengeQuestions(wrongQuestions);
            setRevengeData(data);
        } catch (err) {
            console.error("Error generating revenge questions:", err);
            alert("Lỗi khi kết nối với máy chủ AI. Vui lòng thử lại!");
            setShowRevenge(false);
        } finally {
            setIsLoadingRevenge(false);
        }
    };

    const handleSubmitRevengeAnswer = () => {
        if (selectedOption === null || !revengeData) return;
        const currentQ = revengeData.questions[currentRevengeIndex];
        const correct = selectedOption === currentQ.correctOptionIndex;
        
        setRevengeAnswers(prev => ({ ...prev, [currentRevengeIndex]: correct }));
        setRevengeSubmitted(true);
    };

    const handleNextRevenge = () => {
        if (!revengeData) return;
        if (currentRevengeIndex < revengeData.questions.length - 1) {
            setCurrentRevengeIndex(prev => prev + 1);
            setSelectedOption(null);
            setRevengeSubmitted(false);
        } else {
            // Check if all correct
            const allCorrect = Object.values(revengeAnswers).every(v => v === true) && Object.keys(revengeAnswers).length === revengeData.questions.length;
            if (allCorrect && arenaProfile) {
                // Reward student with +20 XP
                updateArenaProfile({ id: arenaProfile.id, total_xp: arenaProfile.total_xp + 20 });
                setShowConfetti(true);
            }
            setRevengeCompleted(true);
        }
    };

    return (
        <div className="max-w-md mx-auto text-center py-12 px-4 bg-[#030712] rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden min-h-[80vh] flex flex-col justify-center dark:border-slate-800">
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
                .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
                .glow-button { transition: all 0.3s ease; box-shadow: 0 0 15px rgba(239, 68, 68, 0.2); }
                .glow-button:hover { box-shadow: 0 0 25px rgba(239, 68, 68, 0.5); }
                @keyframes celebrate {
                    0% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
                    50% { transform: scale(1.1); filter: drop-shadow(0 0 20px rgba(16, 185, 129, 0.6)); }
                    100% { transform: scale(1); filter: drop-shadow(0 0 0px rgba(16, 185, 129, 0)); }
                }
                .victory-anim { animation: celebrate 2s ease-in-out infinite; }
            `}</style>

            {/* Glowing background ambiance */}
            <div className={`absolute top-0 left-1/4 w-72 h-72 rounded-full opacity-10 blur-[80px] pointer-events-none ${isWin ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            {!showRevenge ? (
                <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
                    {/* Result Icon */}
                    <div className="text-7xl mb-4" style={{ animation: 'pop 0.6s ease-out' }}>
                        {isDraw ? '🤝' : isWin ? '🏆' : '💀'}
                    </div>

                    <h1 className={`text-3xl font-black mb-2 tracking-wide ${isWin ? 'text-emerald-400 victory-anim' : isDraw ? 'text-gray-400' : 'text-rose-500'}`}>
                        {isDraw ? 'HÒA CÂN SỨC!' : isWin ? 'CHIẾN THẮNG!' : 'BẠI TRẬN!'}
                    </h1>

                    {/* Lore */}
                    <p className="text-purple-300 italic text-sm mb-6 px-4">✨ {lore}</p>

                    {/* Stats Card */}
                    <div className="glass-panel rounded-2xl p-6 mb-6 text-left" style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 dark:border-slate-800">
                                <p className="text-xs text-gray-400">HP còn lại</p>
                                <p className="text-2xl font-black text-white">{myHp}</p>
                            </div>
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 dark:border-slate-800">
                                <p className="text-xs text-gray-400">HP đối thủ</p>
                                <p className="text-2xl font-black text-white">{opHp}</p>
                            </div>
                        </div>

                        <div className="border-t border-white/10 pt-4 space-y-3 dark:border-slate-800">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2 text-sm text-gray-300">
                                    {isWin ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-rose-400" />}
                                    Elo thay đổi
                                </span>
                                <span className={`font-bold ${isWin ? 'text-emerald-400' : isDraw ? 'text-gray-400' : 'text-rose-400'}`}>
                                    {isWin ? '+16 ~ +32' : isDraw ? '±0' : '-16 ~ -32'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">🌟 XP kiếm được</span>
                                <span className="font-bold text-amber-400">+{isWin ? 50 : 10} XP</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-300">📊 Elo hiện tại</span>
                                <span className="font-bold text-indigo-400">{arenaProfile?.elo_rating || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-3" style={{ animation: 'fadeIn 0.5s ease-out 0.4s both' }}>
                        {wrongQuestions.length > 0 && (
                            <button 
                                onClick={handleStartRevenge}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 text-white font-black rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 glow-button text-base tracking-wide"
                            >
                                <Bot className="h-5 w-5 animate-bounce" /> 🔥 AI PHỤC THÙ (VÁ LỖ HỔNG)
                            </button>
                        )}

                        <div className="flex gap-3">
                            <button onClick={() => navigate('/arena/pvp')} className="flex-1 py-3.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 dark:border-slate-800">
                                <Brain className="h-5 w-5" /> Chơi lại
                            </button>
                            <button onClick={() => navigate('/arena')} className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/5 dark:border-slate-800">
                                <Home className="h-5 w-5" /> Sảnh đấu
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
                    <div className="flex items-center gap-2 mb-4 text-left border-b border-white/10 pb-3 dark:border-slate-800">
                        <Bot className="h-6 w-6 text-red-500 animate-pulse" />
                        <div>
                            <h2 className="text-lg font-black text-white">AI Phục Thù</h2>
                            <p className="text-xs text-gray-400">Khắc phục lỗ hổng kiến thức</p>
                        </div>
                    </div>

                    {isLoadingRevenge ? (
                        <div className="py-16 flex flex-col items-center">
                            <Loader className="h-12 w-12 text-rose-500 animate-spin mb-4" />
                            <p className="text-rose-400 font-bold animate-pulse text-sm">Bác sĩ học tập AI đang đúc kết sai lầm và sinh đề phục thù...</p>
                        </div>
                    ) : revengeCompleted ? (
                        <div className="space-y-6 text-center animate-in zoom-in">
                            <div className="text-6xl animate-bounce">
                                {showConfetti ? '👑' : '📚'}
                            </div>
                            
                            <h3 className="text-2xl font-black text-white">
                                {showConfetti ? 'VÁ KIẾN THỨC THÀNH CÔNG!' : 'HOÀN THÀNH ÔN TẬP!'}
                            </h3>
                            
                            <p className="text-sm text-gray-400 px-4">
                                {showConfetti 
                                    ? 'Tuyệt vời! Em đã xuất sắc hoàn thành trọn vẹn cả 3 câu hỏi phục thù của AI và nhận được phần thưởng!'
                                    : 'Em đã nỗ lực hoàn thành bài tập phục thù. Hãy tiếp tục rèn luyện thêm để tuyến phòng thủ kiến thức thêm vững vàng nhé!'
                                }
                            </p>

                            {showConfetti && (
                                <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between text-left max-w-sm mx-auto dark:border-slate-800">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xl font-bold">
                                            🌟
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-white text-sm">Phần Thưởng Kiêu Hùng</h4>
                                            <p className="text-xs text-gray-400">Cộng XP vào Hồ sơ Arena</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-emerald-400">+20 XP</span>
                                </div>
                            )}

                            <button onClick={() => navigate('/arena')} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
                                <Home className="h-5 w-5" /> Về Sảnh Đấu Trường
                            </button>
                        </div>
                    ) : revengeData ? (
                        <div className="text-left space-y-5 animate-in fade-in">
                            {/* AI Summary Concept */}
                            {currentRevengeIndex === 0 && (
                                <div className="bg-red-950/20 border border-red-500/25 rounded-2xl p-5 mb-2 dark:border-slate-800">
                                    <h4 className="font-bold text-red-400 text-sm flex items-center gap-1.5 mb-2">
                                        <Sparkles className="h-4 w-4" /> Điểm yếu phát hiện: {revengeData.topic}
                                    </h4>
                                    <p className="text-sm text-gray-300 leading-relaxed italic">
                                        "{revengeData.summary}"
                                    </p>
                                </div>
                            )}

                            {/* Progress bar */}
                            <div className="flex items-center justify-between text-xs text-gray-400">
                                <span>Thử thách {currentRevengeIndex + 1} / {revengeData.questions.length}</span>
                                <div className="flex gap-1">
                                    {revengeData.questions.map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={`h-2 w-8 rounded-full transition-colors ${
                                                i === currentRevengeIndex 
                                                    ? 'bg-red-500' 
                                                    : i < currentRevengeIndex 
                                                        ? (revengeAnswers[i] ? 'bg-emerald-500' : 'bg-rose-500')
                                                        : 'bg-white/10'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Current Question */}
                            <div className="glass-panel rounded-2xl p-5">
                                <p className="text-sm text-gray-400 mb-2 font-semibold">CÂU HỎI PHỤC THÙ:</p>
                                <div className="text-white font-bold text-base leading-relaxed">
                                    <MathText>{revengeData.questions[currentRevengeIndex].content}</MathText>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="space-y-3">
                                {revengeData.questions[currentRevengeIndex].options.map((option: string, idx: number) => {
                                    let btnClass = 'bg-white/5 border-white/5 text-gray-300 hover:bg-white/10 hover:border-white/20';
                                    const isCorrect = idx === revengeData.questions[currentRevengeIndex].correctOptionIndex;
                                    
                                    if (revengeSubmitted) {
                                        if (isCorrect) {
                                            btnClass = 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300';
                                        } else if (idx === selectedOption) {
                                            btnClass = 'bg-rose-950/40 border-rose-500/50 text-rose-300';
                                        } else {
                                            btnClass = 'bg-white/5 border-white/5 text-gray-500 opacity-60';
                                        }
                                    } else if (selectedOption === idx) {
                                        btnClass = 'bg-red-950/30 border-red-500/50 text-red-300';
                                    }

                                    return (
                                        <button 
                                            key={idx}
                                            disabled={revengeSubmitted}
                                            onClick={() => setSelectedOption(idx)}
                                            className={`w-full p-4 rounded-xl border text-left font-medium transition-all flex items-center gap-3 ${btnClass}`}
                                        >
                                            <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                                                revengeSubmitted && isCorrect 
                                                    ? 'bg-emerald-500 text-white' 
                                                    : revengeSubmitted && idx === selectedOption 
                                                        ? 'bg-rose-500 text-white' 
                                                        : 'bg-white/10 text-gray-400'
                                            }`}>
                                                {String.fromCharCode(65 + idx)}
                                            </span>
                                            <MathText>{option}</MathText>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Action Control */}
                            <div className="pt-2">
                                {!revengeSubmitted ? (
                                    <button 
                                        disabled={selectedOption === null}
                                        onClick={handleSubmitRevengeAnswer}
                                        className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                                            selectedOption !== null 
                                                ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-lg' 
                                                : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                                        }`}
                                    >
                                        Nộp đáp án <ArrowRight className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <div className="space-y-4">
                                        <div className={`p-4 rounded-xl text-sm leading-relaxed border ${
                                            revengeAnswers[currentRevengeIndex]
                                                ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                                                : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                                        }`}>
                                            <p className="font-bold flex items-center gap-1.5 mb-1.5">
                                                {revengeAnswers[currentRevengeIndex] 
                                                    ? <><Check className="h-4.5 w-4.5 text-emerald-400" /> Tuyệt vời! Em làm đúng rồi!</>
                                                    : <><X className="h-4.5 w-4.5 text-rose-400" /> Rất tiếc, câu trả lời chưa chính xác.</>
                                                }
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                <strong>Lời giải:</strong> {revengeData.questions[currentRevengeIndex].solution}
                                            </p>
                                        </div>

                                        <button 
                                            onClick={handleNextRevenge}
                                            className="w-full py-4 bg-white text-gray-900 hover:bg-gray-100 rounded-xl font-black transition-all flex items-center justify-center gap-2 text-sm tracking-wider uppercase dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                                        >
                                            {currentRevengeIndex < revengeData.questions.length - 1 ? 'Câu tiếp theo' : 'Hoàn thành thử thách'}
                                            <ArrowRight className="h-5 w-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
};
