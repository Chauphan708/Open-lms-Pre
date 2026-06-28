import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Play, RotateCcw, X } from 'lucide-react';
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
    const [countdown, setCountdown] = useState(3);
    const [speedSetting, setSpeedSetting] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
    const [winner, setWinner] = useState<User | null>(null);
    const [commentary, setCommentary] = useState<string>('Chào mừng các bạn đến với Giải Đua Vịt lớp học!');
    
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();
    const countdownTimerRef = useRef<any>();

    const phaseRef = useRef(phase);
    const winnerRef = useRef(winner);

    useEffect(() => {
        phaseRef.current = phase;
    }, [phase]);

    useEffect(() => {
        winnerRef.current = winner;
    }, [winner]);

    const commentaryTemplates = [
        "Vịt của [NAME] đang bứt tốc ngoạn mục!",
        "Vịt của [NAME] đang tạm thời vươn lên dẫn đầu!",
        "[NAME] bơi rất bền bỉ, đang bám sát phía sau!",
        "Cú tăng tốc bất ngờ từ chú vịt của [NAME]!",
        "Vịt của [NAME] đang bơi rất chắc chắn!",
        "Cả lớp đang cổ vũ cuồng nhiệt cho vịt [NAME]!"
    ];

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
        setCommentary('Các vận động viên vịt đang khởi động tại vạch xuất phát...');
    };

    // Calculate current leader
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

    // Update commentary
    const leaderName = currentLeader?.student.name || '';
    useEffect(() => {
        if (phase === 'RACING' && leaderName) {
            const randomTemplate = commentaryTemplates[Math.floor(Math.random() * commentaryTemplates.length)];
            setCommentary(randomTemplate.replace('[NAME]', leaderName));
        }
    }, [leaderName, phase]);

    // Countdown timer
    useEffect(() => {
        if (phase === 'COUNTDOWN') {
            setCountdown(3);
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

            countdownTimerRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev === 1) {
                        clearInterval(countdownTimerRef.current);
                        setPhase('RACING');
                        lastTimeRef.current = performance.now();
                        requestRef.current = requestAnimationFrame(runRace);
                        setCommentary('XUẤT PHÁT!!!');
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

                if (Math.random() < 0.02) {
                    const roll = Math.random();
                    if (roll < 0.2) {
                        newSpeed = Math.random() * 1.0 + 0.1; 
                    } else if (roll > 0.85) {
                        newSpeed = Math.random() * 6 + 7; 
                    } else {
                        newSpeed = Math.random() * 3.5 + 2.0; 
                    }
                } else {
                    newSpeed = Math.max(0.4, Math.min(12, newSpeed + (Math.random() - 0.5) * 0.5));
                }

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
                setCommentary(`Chúc mừng Vịt ${newWinner.name} đã giành chiến thắng! 🏆`);
                playVictorySound();
            }

            return updated;
        });

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
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-650 to-indigo-900"></div>
                    <h2 className="text-xl font-black italic flex items-center gap-2.5 relative z-10 tracking-wide uppercase">
                        🦆 GIẢI ĐUA VỊT LỚP HỌC
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Live Commentary */}
                <div className="bg-slate-950 px-6 py-2 border-y border-slate-800/80 flex items-center gap-3 shrink-0">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 animate-pulse">
                        Bình Luận Viên
                    </span>
                    <p className="text-xs font-semibold text-slate-300 truncate">
                        {commentary}
                    </p>
                </div>

                {/* Main Race Track Screen (Single Open Pool, No Rows, No Scrollbars) */}
                <div className="flex-1 bg-gradient-to-b from-blue-900 via-sky-900 to-blue-950 relative overflow-hidden p-6 select-none flex flex-col justify-center">
                    
                    {/* Simulated Wave Grid Lines on background */}
                    <div className="absolute inset-0 opacity-10 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-400/40 via-transparent to-transparent" />
                    
                    {/* Wavy SVG Animated backgrounds */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
                        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 0 50 Q 250 80 500 50 T 1000 50" fill="none" stroke="white" strokeWidth="4" className="animate-pulse" />
                            <path d="M 0 150 Q 250 180 500 150 T 1000 150" fill="none" stroke="white" strokeWidth="4" className="animate-pulse" style={{ animationDelay: '1s' }} />
                            <path d="M 0 250 Q 250 280 500 250 T 1000 250" fill="none" stroke="white" strokeWidth="4" className="animate-pulse" style={{ animationDelay: '2s' }} />
                        </svg>
                    </div>

                    {phase === 'SETUP' && (
                        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg text-center z-20">
                            <div className="text-5xl mb-3">🏁</div>
                            <h3 className="font-black text-slate-200 mb-5 text-lg tracking-wide uppercase">Cấu hình Đấu Trường</h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Tốc độ trận đấu</label>
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
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-35">
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
                        <div className="relative w-full h-[65vh]">
                            {/* Finish Line Banner */}
                            <div className="absolute right-6 top-0 bottom-0 w-2.5 border-r-4 border-dashed border-red-500/50 flex flex-col justify-center items-center z-0 opacity-60">
                                <div className="text-[10px] font-black text-red-400 uppercase rotate-90 tracking-widest bg-slate-950 px-2.5 py-1 rounded-full border border-red-500/20 shadow">ĐÍCH ĐẾN</div>
                            </div>

                            {/* Render all ducks together in one open pool area */}
                            {racers.map((racer, idx) => {
                                const bobY = phase === 'RACING' 
                                    ? Math.sin((racer.progress * 0.45) + racer.wobbleOffset) * 4.5 
                                    : 0;
                                const tilt = phase === 'RACING'
                                    ? Math.cos((racer.progress * 0.45) + racer.wobbleOffset) * 5
                                    : 0;
                                
                                const isLead = currentLeader?.id === racer.id;

                                // Dynamically space out positions vertically in the pool
                                const topPercent = (idx / (racers.length - 1 || 1)) * 82 + 5; 
                                
                                // Scale size based on total racer count
                                const duckScaleClass = racers.length <= 12 
                                    ? 'text-3xl' 
                                    : racers.length <= 22 
                                        ? 'text-2xl' 
                                        : 'text-lg';

                                return (
                                    <div
                                        key={racer.id}
                                        className="absolute transition-all duration-75 z-20 flex flex-col items-center"
                                        style={{
                                            left: `${racer.progress * 0.82 + 6}%`, // Scale to fit screen width
                                            top: `${topPercent}%`,
                                            transform: `translateY(${bobY}px) rotate(${tilt}deg)`
                                        }}
                                    >
                                        {/* Floating name tag directly above duck */}
                                        <span className="text-[9px] font-black bg-slate-950/80 px-1.5 py-0.5 rounded text-white border border-slate-800 tracking-wide select-none whitespace-nowrap mb-0.5">
                                            {racer.student.name}
                                        </span>

                                        <div className="relative flex items-center justify-center">
                                            <span
                                                className={`filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all ${duckScaleClass}
                                                    ${winner && winner.id !== racer.id ? 'opacity-30 grayscale blur-[0.5px]' : ''}
                                                    ${isLead ? 'scale-125' : ''}
                                                `}
                                                style={{ transform: 'scaleX(-1)', display: 'inline-block' }}
                                            >
                                                🦆
                                            </span>

                                            {/* Water ripples trailing splash */}
                                            {phase === 'RACING' && racer.progress > 0 && racer.progress < 100 && (
                                                <div className="absolute -left-2.5 bottom-0 text-[8px] animate-ping opacity-60 text-cyan-300 select-none">💦</div>
                                            )}

                                            {/* Golden crown for leader */}
                                            {isLead && racer.progress > 0 && (
                                                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 animate-bounce text-xs">
                                                    <span className="drop-shadow-[0_2px_6px_rgba(245,158,11,0.6)]">👑</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between shrink-0 z-20">
                    <div className="flex-1">
                        {winner ? (
                            <div className="animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3 text-emerald-400">
                                <Trophy className="h-8 w-8 text-amber-500 fill-amber-500 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-bounce" />
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nhà Vô Địch</p>
                                    <p className="text-base font-black text-emerald-450 tracking-wide uppercase">{winner.name}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-550 text-xs font-semibold tracking-wide italic">
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
