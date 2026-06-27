import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, X, Zap } from 'lucide-react';
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

interface Particle {
    id: number;
    x: number;
    y: number;
    color: string;
    size: number;
    speedY: number;
    speedX: number;
    life: number;
}

export const SurvivalArenaSelector: React.FC<SurvivalArenaSelectorProps> = ({ students, classId, onClose }) => {
    const { addBehaviorLog } = useClassFunStore();
    const [phase, setPhase] = useState<'SETUP' | 'BATTLE' | 'RESULT'>('SETUP');
    const [eliminatedIds, setEliminatedIds] = useState<Set<string>>(new Set());
    const [justEliminatedIds, setJustEliminatedIds] = useState<Set<string>>(new Set());
    const [winner, setWinner] = useState<User | null>(null);
    const [rewardPoints, setRewardPoints] = useState<number | null>(null);
    const [isSavingReward, setIsSavingReward] = useState(false);
    const [roundName, setRoundName] = useState<string>('');
    const [isLightningActive, setIsLightningActive] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);

    const activeTimers = useRef<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const particleIdCounter = useRef(0);

    useEffect(() => {
        return () => {
            activeTimers.current.forEach(clearTimeout);
        };
    }, []);

    // Particle Animation Loop
    useEffect(() => {
        if (phase !== 'BATTLE') return;
        let animId: number;

        const updateParticles = () => {
            setParticles(prev => 
                prev
                    .map(p => ({
                        ...p,
                        x: p.x + p.speedX,
                        y: p.y + p.speedY,
                        life: p.life - 0.02
                    }))
                    .filter(p => p.life > 0)
            );
            animId = requestAnimationFrame(updateParticles);
        };

        animId = requestAnimationFrame(updateParticles);
        return () => cancelAnimationFrame(animId);
    }, [phase]);

    // Function to spawn particles at a card's coordinate
    const spawnExplosionParticles = (studentId: string) => {
        const element = document.getElementById(`arena-card-${studentId}`);
        if (!element || !containerRef.current) return;

        const rect = element.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        
        const cardCenterX = rect.left - containerRect.left + rect.width / 2;
        const cardCenterY = rect.top - containerRect.top + rect.height / 2;

        const colors = ['#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#f43f5e'];
        const newParticles: Particle[] = [];

        for (let i = 0; i < 15; i++) {
            particleIdCounter.current++;
            newParticles.push({
                id: particleIdCounter.current * 100 + i,
                x: cardCenterX,
                y: cardCenterY,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 4 + 3,
                speedX: (Math.random() - 0.5) * 6,
                speedY: (Math.random() - 0.5) * 6 - 2, // Drift slightly upwards
                life: 1.0
            });
        }

        setParticles(prev => [...prev, ...newParticles]);
    };

    const triggerLightningFlash = () => {
        setIsLightningActive(true);
        setTimeout(() => setIsLightningActive(false), 150);
        setTimeout(() => {
            setIsLightningActive(true);
            setTimeout(() => setIsLightningActive(false), 100);
        }, 250);
    };

    const startBattle = () => {
        if (students.length === 0) return;
        setPhase('BATTLE');
        setWinner(null);
        setRewardPoints(null);
        setEliminatedIds(new Set());
        setJustEliminatedIds(new Set());
        setParticles([]);
        activeTimers.current = [];

        // Pre-determine target winner
        const randomWinner = students[Math.floor(Math.random() * students.length)];
        const nonWinners = students.filter(s => s.id !== randomWinner.id);
        const shuffledEliminations = [...nonWinners].sort(() => 0.5 - Math.random());

        const totalNonWinners = shuffledEliminations.length;
        const round1Cut = Math.floor(totalNonWinners * 0.4);
        const round2Cut = Math.floor(totalNonWinners * 0.75);
        const round3Cut = Math.max(0, totalNonWinners - 3);

        const currentEliminated = new Set<string>();

        const runEliminationRound = (startIdx: number, endIdx: number, roundTitle: string, nextDelay: number, onRoundFinish: () => void) => {
            setRoundName(roundTitle);
            triggerLightningFlash();
            playTickSound();

            const roundEliminated = new Set<string>();
            for (let i = startIdx; i < endIdx; i++) {
                const sId = shuffledEliminations[i].id;
                currentEliminated.add(sId);
                roundEliminated.add(sId);
            }

            // Trigger shake/vibration on just eliminated cards
            setJustEliminatedIds(roundEliminated);
            
            // Spawn explosion particles for each eliminated card
            setTimeout(() => {
                roundEliminated.forEach(spawnExplosionParticles);
                setEliminatedIds(new Set(currentEliminated));
                setJustEliminatedIds(new Set());
                
                const tNext = setTimeout(onRoundFinish, nextDelay);
                activeTimers.current.push(tNext);
            }, 500);
        };

        // Round 1
        runEliminationRound(0, round1Cut, '⚡ BÃO SÉT CẤP 1: QUÉT SẠCH 40% BÀI THI', 2000, () => {
            // Round 2
            runEliminationRound(round1Cut, round2Cut, '⚡ BÃO TỪ TRƯỜNG CẤP 2: LASER ĐIỆN TỪ PHÂN RÃ', 2000, () => {
                // Round 3
                runEliminationRound(round2Cut, round3Cut, '⚡ ĐỢT SÓNG THẦN CUỐI CÙNG: TOP 4 CHIẾN BINH', 2000, () => {
                    // Final Duel
                    runEliminationRound(round3Cut, totalNonWinners, '🔥 QUYẾT CHIẾN: CHỈ MỘT CHIẾN BINH SỐNG SÓT', 2500, () => {
                        // Winner Reveal
                        setPhase('RESULT');
                        setWinner(randomWinner);
                        playVictorySound();
                    });
                });
            });
        });
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
            
            {/* Lightning Flash Overlay screen */}
            {isLightningActive && (
                <div className="absolute inset-0 bg-indigo-500/25 z-70 pointer-events-none transition-all duration-75 mix-blend-screen" />
            )}

            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col relative z-10 overflow-hidden h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-750 via-indigo-800 to-slate-900 p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500 via-slate-900 to-slate-950"></div>
                    <h2 className="text-xl font-black flex items-center gap-2 relative z-10 tracking-widest uppercase italic">
                        ⚡ ĐẤU TRƯỜNG SINH TỒN: BÃO PHÂN RÃ
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Arena Board */}
                <div 
                    ref={containerRef}
                    className="flex-1 overflow-hidden p-6 bg-slate-950 flex flex-col justify-center items-center relative min-h-[350px]"
                >
                    {/* Laser scanning sweep line */}
                    {phase === 'BATTLE' && (
                        <div 
                            className="absolute top-0 bottom-0 w-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_20px_rgba(244,63,94,0.8)] pointer-events-none z-30"
                            style={{
                                left: '0%',
                                animation: 'horizontal-laser-sweep 2.5s infinite linear'
                            }}
                        />
                    )}

                    {/* Custom canvas-like particles overlay */}
                    {phase === 'BATTLE' && particles.map(p => (
                        <div
                            key={p.id}
                            className="absolute rounded-full pointer-events-none z-40 transition-all duration-75 shadow-lg"
                            style={{
                                left: `${p.x}px`,
                                top: `${p.y}px`,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                                backgroundColor: p.color,
                                opacity: p.life,
                                boxShadow: `0 0 10px ${p.color}`
                            }}
                        />
                    ))}

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
                        <div className="w-full h-full flex flex-col items-center justify-between py-2 z-20">
                            {/* Live Battle Banner */}
                            <div className="mb-4 text-center shrink-0">
                                <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest bg-red-500/10 text-red-400 animate-pulse border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]">
                                    <Zap className="h-4 w-4 text-amber-500 animate-bounce" /> {roundName}
                                </span>
                            </div>

                            {/* Arena Grid cards (Scroll-free grid list) */}
                            <div className="flex-1 w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 items-center justify-center p-2 overflow-y-auto">
                                {students.map((student) => {
                                    const isEliminated = eliminatedIds.has(student.id);
                                    const isJustEliminated = justEliminatedIds.has(student.id);

                                    return (
                                        <div
                                            key={student.id}
                                            id={`arena-card-${student.id}`}
                                            className={`relative p-4 rounded-2xl border text-center transition-all duration-300 flex flex-col justify-center items-center h-20 shadow-sm
                                                ${isJustEliminated 
                                                    ? 'bg-red-950/40 border-red-500 text-red-400 scale-105 animate-shake ring-2 ring-red-500 z-10' 
                                                    : isEliminated 
                                                        ? 'bg-slate-950/40 border-slate-900/60 text-slate-700 opacity-10 grayscale scale-95 blur-[0.5px] line-through decoration-red-950/30' 
                                                        : 'bg-slate-900 border-indigo-950 text-slate-100 font-extrabold ring-1 ring-indigo-500/5 hover:border-indigo-500'
                                                }`}
                                        >
                                            {isJustEliminated && (
                                                <div className="absolute top-1.5 right-2 text-[9px] font-black uppercase text-red-450 animate-ping">
                                                    PHÂN RÃ
                                                </div>
                                            )}
                                            {isEliminated && !isJustEliminated && (
                                                <div className="absolute top-1.5 right-2 text-[8px] font-black uppercase text-slate-800 tracking-wider">
                                                    HỦY
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
                            <h2 className="text-3xl font-black text-slate-100 tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)] mb-6 animate-pulse">
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
