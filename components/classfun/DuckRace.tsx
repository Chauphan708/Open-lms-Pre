import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Play, RotateCcw, X, Volume2, VolumeX, Sparkles } from 'lucide-react';
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

    // Dynamic Commentary triggers
    const commentaryTemplates = [
        "Vịt của [NAME] đang bứt tốc ngoạn mục!",
        "Vịt của [NAME] đang dẫn đầu với phong thái rất tự tin!",
        "[NAME] bơi rất bền bỉ, đang thu hẹp khoảng cách!",
        "Một pha lội ngược dòng bất ngờ đang được tạo ra bởi [NAME]!",
        "Vịt của [NAME] bơi thong thả nhưng cực kỳ chắc chắn!",
        "Các đối thủ đang bám đuổi sát sao sau vịt [NAME]!",
        "Vịt [NAME] vừa thực hiện cú bứt phá ngoạn mục đầy kịch tính!"
    ];

    // Initialize racers
    useEffect(() => {
        if (students.length > 0) {
            initRacers();
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [students]);

    const initRacers = () => {
        const initialRacers = students.map((s, idx) => ({
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
                        // transition to racing
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
            playTickSound(); // First beep
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [phase]);

    const runRace = (time: number) => {
        if (lastTimeRef.current !== undefined) {
            const deltaTime = time - lastTimeRef.current;

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
                            newSpeed = Math.random() * 3.5 + 2.2; // Normal bơi
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
        }

        lastTimeRef.current = time;
        if (phase === 'RACING' && !winner) {
            requestRef.current = requestAnimationFrame(runRace);
        }
    };

    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

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
            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-5 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-650 to-indigo-900"></div>

                    <h2 className="text-2xl font-black italic flex items-center gap-2.5 relative z-10 tracking-wide uppercase">
                        🦆 SIÊU ĐUA VỊT KHÔNG GIAN
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Live Commentary Ticket */}
                <div className="bg-slate-950 px-6 py-2.5 border-y border-slate-800/80 flex items-center gap-3">
                    <span className="bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse shrink-0">
                        Bình Luận Viên
                    </span>
                    <p className="text-sm font-semibold text-slate-300 truncate tracking-wide">
                        {commentary}
                    </p>
                </div>

                {/* Race Track Screen */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-950 relative min-h-[350px]">
                    
                    {phase === 'SETUP' && (
                        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-lg mt-8 text-center">
                            <div className="text-5xl mb-4">🏁</div>
                            <h3 className="font-black text-slate-200 mb-6 text-xl tracking-wide uppercase">Cấu hình Đấu Trường</h3>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Tốc độ trận đấu</label>
                                    <div className="flex gap-3">
                                        {[
                                            { key: 'SLOW', label: '🐢 Chậm' },
                                            { key: 'NORMAL', label: '🦆 Vừa' },
                                            { key: 'FAST', label: '⚡ Siêu Tốc' }
                                        ].map(item => (
                                            <button
                                                key={item.key}
                                                onClick={() => setSpeedSetting(item.key as any)}
                                                className={`flex-1 py-3 px-2 rounded-2xl border-2 font-bold transition text-xs sm:text-sm ${speedSetting === item.key ? 'border-cyan-500 bg-cyan-600 text-white shadow-lg shadow-cyan-600/25 scale-105' : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'}`}
                                            >
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button 
                                    onClick={startRace} 
                                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-emerald-600/20 transition active:scale-95 flex justify-center items-center gap-2 mt-6 text-lg tracking-wider"
                                >
                                    <Play className="h-6 w-6 fill-current animate-pulse" /> KHAI CUỘC ĐUA ({racers.length} VĐV)
                                </button>
                            </div>
                        </div>
                    )}

                    {phase === 'COUNTDOWN' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm z-30">
                            {/* Traffic Lights Countdown Graphic */}
                            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl flex flex-col items-center gap-6 shadow-2xl">
                                <div className="flex gap-4">
                                    {/* Red Light */}
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 shadow-inner transition-all duration-300 ${countdown === 3 ? 'bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.8)]' : 'bg-red-950/30'}`} />
                                    {/* Yellow Light */}
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 shadow-inner transition-all duration-300 ${countdown === 2 ? 'bg-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.8)]' : 'bg-amber-950/30'}`} />
                                    {/* Green Light */}
                                    <div className={`w-12 h-12 rounded-full border-4 border-slate-950 shadow-inner transition-all duration-300 ${countdown === 1 ? 'bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.8)]' : 'bg-emerald-950/30'}`} />
                                </div>
                                <h1 className="text-7xl font-black text-slate-100 tracking-widest animate-ping">
                                    {countdown}
                                </h1>
                                <p className="text-xs uppercase tracking-widest font-black text-slate-500">Chuẩn bị xuất phát...</p>
                            </div>
                        </div>
                    )}

                    {phase !== 'SETUP' && (
                        <div className="relative">
                            {/* Finish Line Indicator */}
                            <div className="absolute right-10 top-0 bottom-0 w-8 border-l-4 border-dashed border-red-500/60 flex flex-col justify-center items-center opacity-70 z-0">
                                <div className="text-xs font-black text-red-500 uppercase rotate-90 tracking-widest whitespace-nowrap bg-slate-950 px-4 py-1.5 rounded-full border border-red-500/20">ĐÍCH ĐẾN</div>
                            </div>

                            {/* Water Lanes container */}
                            <div className="space-y-4 relative z-10 pb-6">
                                {racers.map((racer, idx) => {
                                    // Complex floating wave motion
                                    const bobY = phase === 'RACING' 
                                        ? Math.sin((racer.progress * 0.4) + racer.wobbleOffset) * 5.5 
                                        : 0;
                                    const tilt = phase === 'RACING'
                                        ? Math.cos((racer.progress * 0.4) + racer.wobbleOffset) * 6
                                        : 0;
                                    
                                    const isLead = currentLeader?.id === racer.id;

                                    return (
                                        <div 
                                            key={racer.id} 
                                            className={`relative h-15 rounded-2xl border transition-all duration-300 flex items-center px-4 overflow-hidden shadow-inner
                                                bg-gradient-to-r from-slate-900/90 via-slate-800/40 to-slate-900/90
                                                ${isLead ? 'border-amber-500/40 shadow-amber-500/5' : 'border-slate-800/80'}
                                            `}
                                        >
                                            {/* Water Wave Scrolling Background simulation */}
                                            <div 
                                                className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-cyan-600/10 via-blue-500/15 to-indigo-500/10 transition-all duration-75"
                                                style={{ width: `${racer.progress}%` }}
                                            />

                                            <div className="font-extrabold text-slate-300 w-36 truncate text-sm z-10 flex items-center gap-2">
                                                <span className="text-xs text-slate-500 font-mono">#{idx + 1}</span>
                                                <span className={isLead ? 'text-amber-300 drop-shadow-sm' : ''}>{racer.student.name}</span>
                                            </div>

                                            {/* Duck Wrapper with progressive movement */}
                                            <div
                                                className="absolute transition-all duration-75 z-20"
                                                style={{
                                                    left: `calc(${racer.progress}% - ${racer.progress === 100 ? '48px' : '24px'} + 120px)`,
                                                    transform: `translateY(${bobY}px) rotate(${tilt}deg)`
                                                }}
                                            >
                                                <div className="relative">
                                                    {/* Duck Avatar with crown */}
                                                    <div className="relative flex items-center justify-center">
                                                        <span
                                                            className={`text-4xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transition-all
                                                                ${winner && winner.id !== racer.id ? 'opacity-30 grayscale blur-[0.5px]' : ''}
                                                                ${isLead ? 'scale-115' : ''}
                                                            `}
                                                            style={{ transform: 'scaleX(-1)', display: 'inline-block' }}
                                                        >
                                                            🦆
                                                        </span>

                                                        {/* Water splash behind moving duck */}
                                                        {phase === 'RACING' && racer.progress > 0 && racer.progress < 100 && (
                                                            <div className="absolute -left-3 bottom-0 text-[10px] animate-ping opacity-60 text-cyan-300 select-none">💦</div>
                                                        )}
                                                    </div>

                                                    {/* King crown for the current leader */}
                                                    {isLead && racer.progress > 0 && (
                                                        <div className="absolute -top-5 left-1/2 -translate-x-1/2 animate-bounce">
                                                            <span className="text-xl drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]">👑</span>
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
                <div className="p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between z-20">
                    <div className="flex-1">
                        {winner ? (
                            <div className="animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-3 text-emerald-400">
                                <Trophy className="h-10 w-10 text-amber-500 fill-amber-500 drop-shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-bounce" />
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nhà Vô Địch</p>
                                    <p className="text-2xl font-black text-emerald-400 tracking-wide uppercase drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{winner.name}</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-slate-500 text-sm font-semibold tracking-wide italic">
                                {phase === 'RACING' ? '🚴 Cuộc đua đang diễn ra vô cùng ác liệt...' : '🏁 Chuẩn bị vào làn đua...'}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-4">
                        {phase === 'RESULT' && (
                            <button 
                                onClick={() => { initRacers(); setPhase('SETUP'); }} 
                                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-5 py-3 rounded-2xl font-black transition-all active:scale-95 text-sm"
                            >
                                <RotateCcw className="h-5 w-5" /> Tái đấu
                            </button>
                        )}
                        {winner && (
                            <button 
                                onClick={handleSelectWinner} 
                                className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-7 py-3 rounded-2xl font-black transition-all shadow-lg shadow-emerald-600/20 active:scale-95 animate-pulse text-sm"
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
