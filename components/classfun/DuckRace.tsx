import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Trophy, Play, RotateCcw, X } from 'lucide-react';
import { User } from '../../types';
import { useClassFunStore } from '../../services/classFunStore';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';
import toast from 'react-hot-toast';

interface DuckRaceProps {
    students: User[];
    classId?: string;
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

export const DuckRace: React.FC<DuckRaceProps> = ({ students, classId, onComplete, onClose }) => {
    const { addBehaviorLog } = useClassFunStore();
    const [racers, setRacers] = useState<Racer[]>([]);
    const [phase, setPhase] = useState<'SETUP' | 'COUNTDOWN' | 'RACING' | 'RESULT'>('SETUP');
    const [countdown, setCountdown] = useState(3);
    const [speedSetting, setSpeedSetting] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
    const [winner, setWinner] = useState<User | null>(null);
    const [commentary, setCommentary] = useState<string>('Chào mừng các bạn đến với Giải Đua Vịt lớp học!');
    const [rewardPoints, setRewardPoints] = useState<number | null>(null);
    const [isSavingReward, setIsSavingReward] = useState(false);
    
    const countdownTimerRef = useRef<any>();

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
        setRewardPoints(null);
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
                        return 0;
                    }
                    playTickSound();
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
        };
    }, [phase]);

    // Stable interval-based racing animation loop
    useEffect(() => {
        let raceInterval: any = null;

        if (phase === 'RACING') {
            setCommentary('XUẤT PHÁT!!!');
            
            raceInterval = setInterval(() => {
                setRacers(prevRacers => {
                    let someoneWon = false;
                    let newWinner: any = null;

                    const updated = prevRacers.map(racer => {
                        if (someoneWon) return racer;
                        if (racer.progress >= 100) return racer;

                        let speedMultiplier = 1.0;
                        if (speedSetting === 'SLOW') speedMultiplier = 0.6;
                        if (speedSetting === 'FAST') speedMultiplier = 1.8;

                        const baseIncrement = Math.random() * 0.95 + 0.15;
                        const increment = baseIncrement * speedMultiplier;
                        let newProgress = racer.progress + increment;

                        if (newProgress >= 100) {
                            newProgress = 100;
                            someoneWon = true;
                            newWinner = racer.student;
                        }

                        return { ...racer, progress: newProgress };
                    });

                    if (someoneWon && newWinner) {
                        setPhase('RESULT');
                        setWinner(newWinner);
                        setCommentary(`Chúc mừng Vịt ${newWinner.name} đã giành chiến thắng! 🏆`);
                        playVictorySound();
                        clearInterval(raceInterval);
                    }

                    return updated;
                });
            }, 40);
        }

        return () => {
            if (raceInterval) clearInterval(raceInterval);
        };
    }, [phase, speedSetting]);

    const startRace = () => {
        playTickSound(); 
        setPhase('COUNTDOWN');
    };

    const handleSelectWinner = () => {
        if (winner) {
            onComplete(winner);
        }
    };

    const handleReward = async (points: number) => {
        if (!winner || !classId) return;
        setIsSavingReward(true);
        try {
            await addBehaviorLog({
                student_id: winner.id,
                class_id: classId,
                behavior_id: null,
                points: points,
                reason: `Thắng trò chơi Trợ Lý Sư Phạm AI: Đua Vịt Lớp Học`,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <style>{`
                @keyframes wave-flow-slow {
                    0% { background-position-x: 0px; }
                    100% { background-position-x: 1000px; }
                }
                @keyframes wave-flow-fast {
                    0% { background-position-x: 0px; }
                    100% { background-position-x: -800px; }
                }
                .animate-wave-slow {
                    animation: wave-flow-slow 15s linear infinite;
                }
                .animate-wave-fast {
                    animation: wave-flow-fast 10s linear infinite;
                }
            `}</style>

            <div className="bg-slate-900 border border-slate-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[90vh] relative">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-400 via-indigo-655 to-indigo-900"></div>
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
                    <p className="text-xs font-semibold text-slate-350 truncate">
                        {commentary}
                    </p>
                </div>

                {/* Main Race Track Screen (Single Open Pool, No Rows, No Scrollbars) */}
                <div className="flex-1 bg-gradient-to-b from-blue-900 via-sky-900 to-blue-950 relative overflow-hidden p-6 select-none flex flex-col justify-center">
                    
                    {/* Animated Ocean Wave Layers (Fixed %23 URL Encoding) */}
                    <div className="absolute inset-0 z-0 opacity-25 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 120%22 preserveAspectRatio=%22none%22><path d=%22M0,40 C150,90 350,90 500,40 C650,90 850,90 1000,40 C1150,90 1350,90 1500,40 L1500,120 L0,120 Z%22 fill=%22%230ea5e9%22 opacity=%220.3%22/></svg>')] bg-repeat-x bg-[length:1000px_100%] animate-wave-slow" />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 1200 120%22 preserveAspectRatio=%22none%22><path d=%22M0,60 C150,110 350,110 500,60 C650,110 850,110 1000,60 C1150,110 1350,110 1500,60 L1500,120 L0,120 Z%22 fill=%22%2338bdf8%22 opacity=%220.4%22/></svg>')] bg-repeat-x bg-[length:800px_100%] animate-wave-fast" />
                    </div>

                    {phase === 'SETUP' && (
                        <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-lg text-center z-25">
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
                            {/* Finish Line Banner (Dashed line positioned at exactly 92% of the width) */}
                            <div className="absolute left-[92%] top-0 bottom-0 w-2.5 border-r-4 border-dashed border-red-500/50 flex flex-col justify-center items-center z-0 opacity-60">
                                <div className="text-[10px] font-black text-red-405 uppercase rotate-90 tracking-widest bg-slate-950 px-2.5 py-1 rounded-full border border-red-500/20 shadow">ĐÍCH ĐẾN</div>
                            </div>

                            {/* Render all ducks together in one open pool area */}
                            {racers.map((racer, idx) => {
                                const isLead = currentLeader?.id === racer.id;

                                // Dynamically space out positions vertically in the pool
                                const topPercent = (idx / (racers.length - 1 || 1)) * 82 + 5; 
                                
                                // SCALE SIZE: Upgraded size to meet user requirements (Student names larger, ducks larger)
                                let duckScaleClass = 'text-4xl';
                                let nameTagClass = 'text-[11px] px-2 py-0.5';

                                if (racers.length <= 12) {
                                    duckScaleClass = 'text-6xl';
                                    nameTagClass = 'text-[13px] px-2.5 py-1';
                                } else if (racers.length <= 22) {
                                    duckScaleClass = 'text-5xl';
                                    nameTagClass = 'text-[12px] px-2 py-0.5';
                                } else {
                                    duckScaleClass = 'text-3.5xl';
                                    nameTagClass = 'text-[10px] px-1.5 py-0';
                                }

                                // POSITION CALCULATION: Scale precisely so duck touches the finish line (92%) when progress is 100
                                const finalLeftPercent = racer.progress * 0.88 + 4; // Starts at 4% and ends exactly at 92% (touching finish line)

                                return (
                                    <div
                                        key={racer.id}
                                        className="absolute transition-all duration-300 z-20 flex flex-col items-center"
                                        style={{
                                            left: `${finalLeftPercent}%`, 
                                            top: `${topPercent}%`,
                                        }}
                                    >
                                        {/* Floating name tag directly above duck */}
                                        <span className={`font-black bg-slate-950/90 rounded text-white border border-slate-800 tracking-wide select-none whitespace-nowrap mb-0.5 ${nameTagClass}`}>
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
                                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce text-sm">
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
                                    <p className="text-base font-black text-emerald-400 tracking-wide uppercase">{winner.name}</p>
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

                {/* GIANT CENTRAL WINNER OVERLAY CARD (Tên người chiến thắng to đùng ở giữa màn hình) */}
                {phase === 'RESULT' && winner && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-slate-900 border-4 border-amber-400 p-10 rounded-3xl text-center shadow-2xl max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
                            
                            <Trophy className="h-20 w-20 text-amber-400 mx-auto mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.5)]" />
                            
                            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1">
                                🏆 NHÀ VÔ ĐỊCH HÔM NAY 🏆
                            </h3>
                            
                            <h2 className="text-5xl sm:text-6xl font-black text-emerald-400 tracking-widest uppercase mb-8 drop-shadow-[0_0_25px_rgba(52,211,153,0.5)] animate-pulse">
                                {winner.name}
                            </h2>

                            {/* Direct reward points XP system */}
                            {classId && (
                                <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-4 mb-8">
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
                                                    className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-black rounded-xl border border-slate-700 transition active:scale-95 flex items-center justify-center gap-1.5 text-sm shadow"
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
                            )}

                            <div className="flex flex-col gap-3.5">
                                <button 
                                    onClick={handleSelectWinner}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-650 hover:from-emerald-550 hover:to-teal-550 text-white font-black rounded-xl transition active:scale-95 shadow-lg shadow-emerald-700/20 text-sm"
                                >
                                    Xác nhận và Chọn học sinh
                                </button>
                                
                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => { initRacers(); setPhase('SETUP'); }}
                                        className="flex-1 py-3 bg-slate-850 hover:bg-slate-750 text-slate-300 font-bold rounded-xl border border-slate-800 transition active:scale-95 text-xs"
                                    >
                                        Tái đấu
                                    </button>
                                    <button 
                                        onClick={onClose}
                                        className="flex-1 py-3 bg-slate-800/40 hover:bg-slate-800 text-slate-400 font-bold rounded-xl border border-slate-800/40 transition active:scale-95 text-xs"
                                    >
                                        Đóng lại
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {winner && <Confetti />}
        </div>
    );
};
