import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Play, RotateCcw, X, Sparkles } from 'lucide-react';
import { User } from '../../types';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';

interface DuckRaceProps {
    students: User[];
    onComplete: (winner: User) => void;
    onClose: () => void;
}

interface Racer {
    id: string;
    student: User;
    progress: number; // 0 to 100
    speed: number;
    wobbleOffset: number;
}

export const DuckRace: React.FC<DuckRaceProps> = ({ students, onComplete, onClose }) => {
    const [racers, setRacers] = useState<Racer[]>([]);
    const [phase, setPhase] = useState<'SETUP' | 'COUNTDOWN' | 'RACING' | 'RESULT'>('SETUP');
    const [countdown, setCountdown] = useState(3); // 3, 2, 1, 0 (GO)
    const [speedSetting, setSpeedSetting] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
    const [winner, setWinner] = useState<User | null>(null);
    const [commentary, setCommentary] = useState<string>('Chào mừng các bạn đến với Giải Đua Vịt siêu cúp lớp học!');
    
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();
    const countdownTimerRef = useRef<any>();

    // Refs to avoid React closure stale states in requestAnimationFrame
    const phaseRef = useRef(phase);
    const winnerRef = useRef(winner);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        winnerRef.current = winner;
    }, [winner]);

    // Dynamic Commentary templates
    const commentaryTemplates = [
        "Vịt của [NAME] đang bứt tốc ngoạn mục!",
        "Vịt của [NAME] đang dẫn đầu với phong thái rất tự tin!",
        "[NAME] bơi rất bền bỉ, đang thu hẹp khoảng cách!",
        "Một pha lội ngược dòng bất ngờ đang được tạo ra bởi [NAME]!",
        "Vịt của [NAME] bơi thong thả nhưng cực kỳ chắc chắn!",
        "Các đối thủ đang bám đuổi sát sao sau vịt [NAME]!",
        "Vịt [NAME] vừa thực hiện cú bứt phá ngoạn mục đầy kịch tính!"
    ];

    // Dynamic Layout sizing parameters based on student count to prevent scrollbars
    const { laneHeightClass, textSizeClass, duckSizeClass, crownSizeClass, gapClass } = useMemo(() => {
        const count = students.length;
        if (count <= 8) {
            return {
                laneHeightClass: 'h-14 px-4 py-1.5',
                textSizeClass: 'text-sm w-36',
                duckSizeClass: 'text-4xl',
                crownSizeClass: 'text-xl -top-5',
                gapClass: 'space-y-3'
            };
        } else if (count <= 14) {
            return {
                laneHeightClass: 'h-10 px-3 py-1',
                textSizeClass: 'text-xs w-28',
                duckSizeClass: 'text-2xl',
                crownSizeClass: 'text-base -top-3.5',
                gapClass: 'space-y-2'
            };
        } else if (count <= 22) {
            return {
                laneHeightClass: 'h-8 px-2 py-0.5',
                textSizeClass: 'text-[10px] w-24',
                duckSizeClass: 'text-xl',
                crownSizeClass: 'text-xs -top-2.5',
                gapClass: 'space-y-1'
            };
        } else {
            return {
                laneHeightClass: 'h-6.5 px-2 py-0',
                textSizeClass: 'text-[9px] w-20',
                duckSizeClass: 'text-base',
                crownSizeClass: 'text-[10px] -top-2.5',
                gapClass: 'space-y-0.5'
            };
        }
    }, [students]);

    // Initialize racers
    useEffect(() => {
        if (students.length > 0) {
            initRacers();
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [students]);

    const initRacers = () => {
        const initialRacers = students.map((s) => ({
            id: s.id,
            student: s,
            progress: 0,
            speed: Math.random() * 2 + 1,
            wobbleOffset: Math.random() * 100
        }));
        setRacers(initialRacers);
        setWinner(null);
        setCommentary('Vận động viên đang khởi động tại vạch xuất phát...');
    };

    // Calculate the current leader
    const currentLeader = useMemo(() => {
        if (racers.length === 0) return null;
        let lead = racers[0];
        racers.forEach(r => {
            if (r.progress > lead.progress) {
                lead = r;
            }
        });
        return lead.progress > 0 ? lead : null;
    }, [racers]);

    // Live commentary update based on leader change
    const leaderName = currentLeader?.student.name || '';
    useEffect(() => {
        if (phase === 'RACING' && leaderName) {
            const randomTemplate = commentaryTemplates[Math.floor(Math.random() * commentaryTemplates.length)];
            setCommentary(randomTemplate.replace('[NAME]', leaderName));
        }
    }, [leaderName, phase]);

    // Countdown effect
    useEffect(() => {
        if (phase === 'COUNTDOWN') {
            setCountdown(3);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

            countdownTimerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev === 1) {
                        // Transition to racing
                        clearInterval(countdownTimerRef.current);
                        setPhase('RACING');
                        lastTimeRef.current = performance.now();
                        requestRef.current = requestAnimationFrame(runRace);
                        setCommentary('XUẤT PHÁT!!! Các đấu thủ lao ra vây làn nước!');
                        return 0;
                    }
                    playTickSound();
                    return prev - 1;
                });
            }, 1000);
            playTickSound();
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [phase]);

    const runRace = (time: number) => {
        // Safe deltaTime calculation to prevent high-res timestamp mismatches
        const now = performance.now();
        const deltaTime = lastTimeRef.current ? now - lastTimeRef.current : 16.67;
        lastTimeRef.current = now;

        setRacers(prevRacers => {
            let someoneWon = false;
            let newWinner: any = null;

            const updated = prevRacers.map(racer => {
                if (someoneWon) return racer;
                if (racer.progress >= 100) return racer;

                let newSpeed = racer.speed;

                // 2% chance per frame to change speed drastically
                if (Math.random() < 0.02) {
                    const roll = Math.random();
                    if (roll < 0.25) {
                        newSpeed = Math.random() * 1.2 + 0.1; // Stall
                    } else if (roll > 0.82) {
                        newSpeed = Math.random() * 6 + 7; // Super Burst
                    } else {
                        newSpeed = Math.random() * 3.5 + 2.2; // Normal swim
                    }
                } else {
                    // Smooth drift speed
                    newSpeed = Math.max(0.4, Math.min(12, newSpeed + (Math.random() - 0.5) * 0.55));
                }

                // Speed base factors
                let baseFactor = 0.0016; 
                if (speedSetting === 'SLOW') baseFactor = 0.0011;
                if (speedSetting === 'FAST') baseFactor = 0.0035;

                let newProgress = racer.progress + (newSpeed * deltaTime * baseFactor);

                if (newProgress >= 100) {
                    newProgress = 100;
                    if (!someoneWon) {
                        someoneWon = true;
                        newWinner = racer.student;
                    }
                }
                return { ...racer, progress: newProgress, speed: newSpeed };
            });

            if (someoneWon && newWinner) {
                setPhase('RESULT');
                setWinner(newWinner);
                setCommentary(`Chúc mừng Chiến Binh Vịt ${newWinner.name} đã cán đích xuất sắc giành ngôi Quán Quân! 🏆`);
                playVictorySound();
            }

            return updated;
        });

        // Run next animation frame using Ref to avoid closure stale value
        if (phaseRef.current === 'RACING' && !winnerRef.current) {
            requestRef.current = requestAnimationFrame(runRace);
        }
    };

    const startRace = () => {
        setPhase('COUNTDOWN');
    };

    const handleSelectWinner = () => {
        if (winner) {
            onComplete(winner);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-655 to-indigo-900"></div>
                    <h2 className="text-xl font-black italic flex items-center gap-2.5 relative z-10 tracking-wide uppercase">
                        🦆 SIÊU ĐUA VỊT KHÔNG GIAN
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Live Commentary Ticket */}
                <div className="bg-slate-950 px-6 py-2 border-y border-slate-800/80 flex items-center gap-3 shrink-0">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0">
                        Bình Luận Viên
                    </span>
                    <p className="text-xs font-semibold text-slate-350 truncate tracking-wide">
                        {commentary}
                    </p>
                </div>

                {/* Race Track Screen */}
                <div className="flex-1 p-4 bg-slate-950 relative flex flex-col justify-center overflow-hidden">
                    
                    {phase === 'SETUP' && (
                        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg text-center z-20">
                            <div className="text-5xl mb-3">🏁</div>
                            <h3 className="font-black text-slate-200 mb-5 text-lg tracking-wide uppercase">Cấu hình Đấu Trường</h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-450 uppercase tracking-widest mb-2.5">Tốc độ trận đấu</label>
                                    <div className="flex gap-2">
                                        {[
                                            { key: 'SLOW', label: '🐢 Chậm' },
                                            { key: 'NORMAL', label: '🦆 Vừa' },
                                            { key: 'FAST', label: '⚡ Siêu Tốc' }
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setSpeedSetting(item.key as any)}
                                                className={`flex-1 py-2.5 px-2 rounded-xl border-2 font-bold transition text-xs ${speedSetting === item.key ? 'border-cyan-500 bg-cyan-600 text-white shadow-md' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={startRace} 
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-3.5 rounded-xl shadow-lg transition active:scale-95 flex justify-center items-center gap-2 text-base"
                                >
                                    KHAI CUỘC ĐUA ({racers.length} VĐV)
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'COUNTDOWN' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30">
                            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
                                <div className="flex gap-4">
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 transition-all ${countdown === 3 ? 'bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]' : 'bg-red-950/30'}`} />
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 transition-all ${countdown === 2 ? 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)]' : 'bg-amber-950/30'}`} />
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 transition-all ${countdown === 1 ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.8)]' : 'bg-emerald-950/30'}`} />
                                </div>
                                <h1 className="text-7xl font-black text-slate-100 tracking-widest animate-ping">
                                    {countdown}
                                </h1>
                            </div>
                        </div>
                    )}

                    {phase !== 'SETUP' && (
                        <div className="relative w-full h-full flex flex-col justify-center">
                            {/* Finish Line Indicator */}
                            <div className="absolute right-12 top-0 bottom-0 w-8 border-l-2 border-dashed border-red-500/40 flex flex-col justify-center items-center opacity-60 z-0">
                                <div className="text-[9px] font-black text-red-500 uppercase rotate-90 tracking-widest whitespace-nowrap bg-slate-950 px-2 py-1 rounded-full border border-red-500/10">ĐÍCH ĐẾN</div>
                            </div>

                            {/* Water Lanes container (Fits dynamically within viewport, no scrollbar) */}
                            <div className={`w-full flex flex-col ${gapClass} relative z-10`}>
                                {racers.map((racer, idx) => {
                                    // Smooth floating wave motion
                                    const bobY = phase === 'RACING' 
                                        ? Math.sin((racer.progress * 0.45) + racer.wobbleOffset) * 4.5 
                                        : 0;
                                    const tilt = phase === 'RACING'
                                        ? Math.cos((racer.progress * 0.45) + racer.wobbleOffset) * 5
                                        : 0;
                                    
                                    const isLead = currentLeader?.id === racer.id;

                                    return (
                                        <div 
                                            key={racer.id} 
                                            className={`relative rounded-xl border flex items-center transition-all duration-300 overflow-hidden shadow-inner
                                                bg-gradient-to-r from-slate-900/90 via-slate-850/40 to-slate-900/90
                                                ${laneHeightClass}
                                                ${isLead ? 'border-amber-500/40 shadow-amber-500/5' : 'border-slate-850'}
                                            `}
                                        >
                                            {/* Water Wave Scrolling Background simulation */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600/10 via-blue-500/15 to-indigo-500/10 transition-all duration-75"
                                                style={{ width: `${racer.progress}%` }}
                                            />

                                            {/* Student Name */}
                                            <div className={`font-black text-slate-350 truncate z-10 flex items-center gap-1.5 shrink-0 ${textSizeClass}`}>
                                                <span className="opacity-40 font-mono text-[9px]">#{idx + 1}</span>
                                                <span className={isLead ? 'text-amber-300 drop-shadow-sm' : ''}>{racer.student.name}</span>
                                            </div>

                                            {/* Duck Wrapper with progressive movement */}
                                            <div
                                                className="absolute transition-all duration-75 z-20 flex items-center"
                                                style={{
                                                    left: `calc(${racer.progress}% - (2 * ${textSizeClass.split(' ')[1]}) + 100px)`,
                                                    transform: `translateY(${bobY}px) rotate(${tilt}deg)`
                                                }}
                                            >
                                                <div className="relative">
                                                    {/* Duck Avatar with crown */}
                                                    <div className="relative flex items-center justify-center">
                                                        <span
                                                            className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all ${duckSizeClass}
                                                                ${winner && winner.id !== racer.id ? 'opacity-30 grayscale blur-[0.5px]' : ''}
                                                            `}
                                                            style={{ transform: 'scaleX(-1)', display: 'inline-block' }}
                                                        >
                                                            🦆
                                                        </span>

                                                        {/* Water splash behind moving duck */}
                                                        {phase === 'RACING' && racer.progress > 0 && racer.progress < 100 && (
                                                            <div className="absolute -left-2.5 bottom-0 text-[8px] animate-ping opacity-60 text-cyan-300 select-none">💦</div>
                                                        )}
                                                    </div>

                                                    {/* King crown for the current leader */}
                                                    {isLead && racer.progress > 0 && (
                                                        <div className={`absolute left-1/2 -translate-x-1/2 animate-bounce ${crownSizeClass}`}>
                                                            <span className="drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)]">👑</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls / Winner block */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 z-20">
                    <div className="flex-1">
                        {winner ? (
                            <div className="animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3 text-emerald-400">
                                <Trophy className="h-8 w-8 text-amber-500 fill-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-bounce" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nhà Vô Địch</p>
                                    <p className="text-lg font-black text-emerald-450 tracking-wide uppercase">{winner.name}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-xs font-semibold tracking-wide italic">
                                {phase === 'RACING' ? '🚴 Cuộc đua đang diễn ra vô cùng ác liệt...' : '🏁 Chuẩn bị vào làn đua...'}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {phase === 'RESULT' && (
                            <button 
                                onClick={() => { initRacers(); setPhase('SETUP'); }} 
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl font-black transition active:scale-95 text-xs"
                            >
                                Tái đấu
                            </button>
                        )}
                        {winner && (
                            <button 
                                onClick={handleSelectWinner} 
                                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-5 py-2.5 rounded-xl font-black transition shadow-md active:scale-95 animate-pulse text-xs"
                            >
                                Chọn học sinh này
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {winner && <Confetti />}
        </div>
    );
};
