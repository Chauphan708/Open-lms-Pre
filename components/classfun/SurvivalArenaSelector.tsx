import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, X, Sparkles, ShieldAlert, Zap } from 'lucide-react';
import { User } from '../../types';
import { useClassFunStore } from '../../services/classFunStore';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';
import toast from 'react-hot-toast';

interface SurvivalArenaSelectorProps {
    students: User[];
    classId: string;
    onClose: () => void;
}

export const SurvivalArenaSelector: React.FC<SurvivalArenaSelectorProps> = ({ students, classId, onClose }) => {
    const { addBehaviorLog } = useClassFunStore();
    const [phase, setPhase] = useState<'SETUP' | 'BATTLE' | 'RESULT'>('SETUP');
    const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
    const [winner, setWinner] = useState<User | null>(null);
    const [rewardPoints, setRewardPoints] = useState<number | null>(null);
    const [isSavingReward, setIsSavingReward] = useState(false);
    const [roundName, setRoundName] = useState<string>('');

    const activeTimers = useRef<any[]>([]);

    useEffect(() => {
        return () => {
            activeTimers.current.forEach(clearTimeout);
        };
    }, []);

    const startBattle = () => {
        if (students.length === 0) return;
        setPhase('BATTLE');
        setWinner(null);
        setRewardPoints(null);
        setEliminatedIds(new Set());
        activeTimers.current = [];

        // Determine the final winner first
        const randomWinner = students[Math.floor(Math.random() * students.length)];
        const nonWinners = students.filter(s => s.id !== randomWinner.id);
        
        // Shuffle non-winners for elimination order
        const shuffledEliminations = [...nonWinners].sort(() => 0.5 - Math.random());

        // We will run 4 elimination rounds
        // Round 1: eliminate 40% of non-winners
        // Round 2: eliminate another 30% of non-winners
        // Round 3: eliminate all but 4 survivors (including winner)
        // Round 4: eliminate all but the winner!
        const totalNonWinners = shuffledEliminations.length;
        const round1Cut = Math.floor(totalNonWinners * 0.4);
        const round2Cut = Math.floor(totalNonWinners * 0.75);
        const round3Cut = Math.max(0, totalNonWinners - 3); // Keep 3 non-winners + 1 winner = 4 survivors

        const nextEliminated = new Set<string>();

        // Schedule Round 1
        setRoundName('ĐỢT QUÉT 1: LOẠI BỎ 40% BÀI BÁO CÁO');
        const t1 = setTimeout(() => {
            playTickSound();
            for (let i = 0; i < round1Cut; i++) {
                nextEliminated.add(shuffledEliminations[i].id);
            }
            setEliminatedIds(new Set(nextEliminated));

            // Schedule Round 2
            setRoundName('ĐỢT QUÉT 2: CƠN BÃO KHÍ PHÂN RÃ CẬT LỰC');
            const t2 = setTimeout(() => {
                playTickSound();
                for (let i = round1Cut; i < round2Cut; i++) {
                    nextEliminated.add(shuffledEliminations[i].id);
                }
                setEliminatedIds(new Set(nextEliminated));

                // Schedule Round 3
                setRoundName('ĐỢT QUÉT BAN ĐÊM: TOP 4 CHIẾN BINH MẠNH NHẤT');
                const t3 = setTimeout(() => {
                    playTickSound();
                    for (let i = round2Cut; i < round3Cut; i++) {
                        nextEliminated.add(shuffledEliminations[i].id);
                    }
                    setEliminatedIds(new Set(nextEliminated));

                    // Schedule Round 4 (Final Showdown)
                    setRoundName('TRẬN QUYẾT CHIẾN: CHIẾN BINH CUỐI CÙNG SỐNG SÓT');
                    const t4 = setTimeout(() => {
                        playTickSound();
                        for (let i = round3Cut; i < totalNonWinners; i++) {
                            nextEliminated.add(shuffledEliminations[i].id);
                        }
                        setEliminatedIds(new Set(nextEliminated));

                        // Final winner revealed
                        const tFinal = setTimeout(() => {
                            setPhase('RESULT');
                            setWinner(randomWinner);
                            playVictorySound();
                        }, 1500);
                        activeTimers.current.push(tFinal);

                    }, 2000);
                    activeTimers.current.push(t4);

                }, 2000);
                activeTimers.current.push(t3);

            }, 2000);
            activeTimers.current.push(t2);

        }, 2000);
        activeTimers.current.push(t1);
    };

    const handleReward = async (points: number) => {
        if (!winner) return;
        setIsSavingReward(true);
        try {
            await addBehaviorLog({
                student_id: winner.id,
                class_id: classId,
                behavior_id: null,
                points: points,
                reason: `Thắng trò chơi Trợ Lý Sư Phạm AI: Đấu Trường Sinh Tồn`,
                recorded_by: null
            });
            setRewardPoints(points);
            toast.success(`Đã cộng +${points} XP cho ${winner.name}!`);
        } catch (e) {
            toast.error('Không thể cộng điểm thi đua.');
        } finally {
            setIsSavingReward(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            {phase === 'RESULT' && <Confetti />}
            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col relative z-10 transition-all overflow-hidden h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-750 via-indigo-800 to-slate-900 p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-950"></div>
                    <h2 className="text-xl font-black flex items-center gap-2 relative z-10 tracking-widest uppercase">
                        ⚡ ĐẤU TRƯỜNG SINH TỒN: BÃO PHÂN RÃ
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Arena Board */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950 flex flex-col justify-center items-center relative min-h-[350px]">
                    {phase === 'SETUP' && (
                        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl text-center z-10">
                            <div className="text-6xl mb-4 animate-bounce">⚡</div>
                            <h3 className="font-black text-slate-200 mb-2 text-xl tracking-wide uppercase">Cơn Bão Loại Trừ</h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                Toàn bộ học sinh sẽ xuất hiện trên bản đồ mạng lưới. Cơn bão bão laser sẽ quét phân rã ngẫu nhiên từng đợt để tìm ra người duy nhất còn sống sót!
                            </p>
                            <button 
                                onClick={startBattle}
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-650 hover:from-violet-500 hover:to-indigo-550 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-indigo-900/25 transition active:scale-95 flex justify-center items-center gap-2 text-lg tracking-wider"
                            >
                                <Play className="h-6 w-6 fill-current animate-pulse" /> BẮT ĐẦU ĐỢT QUÉT LASER SINH TỒN
                            </button>
                        </div>
                    )}

                    {phase === 'BATTLE' && (
                        <div className="w-full h-full flex flex-col items-center justify-between py-2">
                            {/* Live Battle Banner */}
                            <div className="mb-4 text-center shrink-0">
                                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-red-500/10 text-red-400 animate-pulse border border-red-500/20">
                                    <Zap className="h-3.5 w-3.5" /> {roundName}
                                </span>
                            </div>

                            {/* Arena Grid cards */}
                            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 items-center justify-center p-2 overflow-y-auto">
                                {students.map((student) => {
                                    const isEliminated = eliminatedIds.has(student.id);

                                    return (
                                        <div
                                            key={student.id}
                                            className={`relative p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col justify-center items-center h-20 shadow-sm
                                                ${isEliminated 
                                                    ? 'bg-slate-950/40 border-slate-900/60 text-slate-650 opacity-15 grayscale scale-95 blur-[0.5px] line-through decoration-red-900/40' 
                                                    : 'bg-slate-900 border-indigo-950 text-slate-100 font-extrabold ring-1 ring-indigo-500/5 animate-pulse'
                                                }`}
                                        >
                                            {isEliminated && (
                                                <div className="absolute top-1 right-2 text-[8px] font-black uppercase text-red-500/40 tracking-wider">
                                                    LOẠI
                                                </div>
                                            )}
                                            <span className="text-sm tracking-wide truncate w-full">{student.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {phase === 'RESULT' && winner && (
                        <div className="max-w-md w-full bg-slate-900 border-2 border-indigo-500 p-8 rounded-3xl shadow-2xl text-center z-10 animate-in zoom-in-95 duration-300">
                            <span className="text-6xl mb-4 block animate-bounce">⚡</span>
                            <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-1">CHIẾN BINH CUỐI CÙNG</h3>
                            <h2 className="text-3xl font-black text-slate-100 tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)] mb-6">
                                {winner.name}
                            </h2>

                            {/* Reward system */}
                            <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    Thưởng điểm thi đua sư phạm
                                </p>
                                
                                {rewardPoints === null ? (
                                    <div className="flex gap-2.5">
                                        {[1, 3, 5].map(pts => (
                                            <button
                                                key={pts}
                                                disabled={isSavingReward}
                                                onClick={() => handleReward(pts)}
                                                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5 text-sm"
                                            >
                                                +{pts} XP
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-emerald-950/20 border border-emerald-500/20 py-3 rounded-xl text-emerald-400 font-bold text-sm">
                                        🎉 Đã cộng +{rewardPoints} XP thành công!
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 space-y-3">
                                <button 
                                    onClick={startBattle}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition active:scale-95 shadow-md shadow-indigo-900/20 text-sm"
                                >
                                    Quay tiếp ngẫu nhiên
                                </button>
                                <button 
                                    onClick={onClose}
                                    className="w-full text-slate-500 hover:text-slate-350 font-bold text-sm transition"
                                >
                                    Đóng trò chơi
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
