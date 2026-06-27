import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '../../types';
import { ClassGroup } from '../../services/classFunStore';
import { Trophy, X, Play, RotateCcw, Sparkles } from 'lucide-react';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';

interface RandomRouletteProps {
    students: User[];
    groups?: ClassGroup[];
    groupMembers?: { student_id: string, group_id: string }[];
    onComplete: (winners: User[]) => void;
    onClose: () => void;
}

interface ReelState {
    status: 'IDLE' | 'SPINNING' | 'FINISHED';
    currentName: string;
    winner: User | null;
}

export const RandomRoulette: React.FC<RandomRouletteProps> = ({ students, groups = [], groupMembers = [], onComplete, onClose }) => {
    const [count, setCount] = useState(1);
    const [groupId, setGroupId] = useState<string>('all');
    const [phase, setPhase] = useState<'SETUP' | 'SPINNING' | 'RESULT'>('SETUP');
    const [winners, setWinners] = useState<User[]>([]);

    // State for each slot reel
    const [reels, setReels] = useState<ReelState[]>([]);

    const availablePool = useMemo(() => {
        if (groupId === 'all') return students;
        const validStudentIds = groupMembers.filter(m => m.group_id === groupId).map(m => m.student_id);
        return students.filter(s => validStudentIds.includes(s.id));
    }, [students, groupId, groupMembers]);

    // Active timeouts/intervals references to clear on unmount
    const activeTimers = useRef<any[]>([]);

    useEffect(() => {
        return () => {
            activeTimers.current.forEach(timer => {
                if (typeof timer === 'number' || timer.constructor?.name === 'Timeout') {
                    clearTimeout(timer);
                } else if (timer.interval) {
                    clearInterval(timer.interval);
                }
            });
        };
    }, []);

    const startSpin = () => {
        if (availablePool.length === 0) return;
        setPhase('SPINNING');
        activeTimers.current = [];

        // Determine winners immediately
        const shuffled = [...availablePool].sort(() => 0.5 - Math.random());
        const actualWinners = shuffled.slice(0, Math.min(count, availablePool.length));
        setWinners(actualWinners);

        // Initialize reels
        const initialReels = actualWinners.map((w, idx) => ({
            status: 'SPINNING' as const,
            currentName: '???',
            winner: w
        }));
        setReels(initialReels);

        // Start independent spin cycle for each reel
        actualWinners.forEach((winnerStudent, idx) => {
            const stopTime = 3000 + idx * 2000; // Staggered stop time: Reel 0 stops at 3s, Reel 1 stops at 5s, Reel 2 stops at 7s...
            let currentSpeed = 30 + Math.random() * 20; // Initial speed in ms
            let elapsedTime = 0;
            let reelTimer: any = null;

            const runReelTick = () => {
                elapsedTime += currentSpeed;
                playTickSound();

                // Select a random student from the pool for visual flash
                const randomStudent = availablePool[Math.floor(Math.random() * availablePool.length)];
                
                setReels(prev => {
                    const next = [...prev];
                    if (next[idx]) {
                        next[idx].currentName = randomStudent.name;
                    }
                    return next;
                });

                if (elapsedTime < stopTime) {
                    // Decelerate as we get closer to the stopTime
                    const progress = elapsedTime / stopTime;
                    if (progress > 0.6) {
                        currentSpeed *= 1.15; // Slow down faster near the end
                    } else {
                        currentSpeed *= 1.03; // Light deceleration
                    }

                    reelTimer = setTimeout(runReelTick, currentSpeed);
                    activeTimers.current.push(reelTimer);
                } else {
                    // Stop on actual winner
                    setReels(prev => {
                        const next = [...prev];
                        if (next[idx]) {
                            next[idx].status = 'FINISHED';
                            next[idx].currentName = winnerStudent.name;
                        }
                        return next;
                    });
                    playVictorySound();

                    // Check if this was the last reel to stop
                    if (idx === actualWinners.length - 1) {
                        const finalResultTimer = setTimeout(() => {
                            setPhase('RESULT');
                        }, 1200);
                        activeTimers.current.push(finalResultTimer);
                    }
                }
            };

            reelTimer = setTimeout(runReelTick, currentSpeed);
            activeTimers.current.push(reelTimer);
        });
    };

    const handleSelectWinners = () => {
        onComplete(winners);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            {phase === 'RESULT' && <Confetti />}
            <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col relative z-10 transition-all duration-300">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-800 p-5 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-indigo-600 to-indigo-800"></div>
                    <h2 className="text-xl font-black flex items-center gap-2 relative z-10 tracking-wider">
                        🎲 HỘP SỐ QUAY NGẪU NHIÊN AI
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-8">
                    {phase === 'SETUP' && (
                        <div className="space-y-6">
                            <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700/50">
                                <label className="block text-sm font-bold text-slate-300 mb-2.5">Chọn nhóm đối tượng học sinh</label>
                                <select
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-base"
                                    value={groupId}
                                    onChange={e => setGroupId(e.target.value)}
                                >
                                    <option value="all">Cả danh sách ({students.length} học sinh)</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-3">Số lượng học sinh cần chọn</label>
                                <div className="flex gap-4">
                                    {[1, 2, 3, 4].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setCount(num)}
                                            className={`flex-1 py-4 rounded-2xl border-2 font-black text-lg transition-all duration-200 ${count === num ? 'border-indigo-500 bg-indigo-600 text-white scale-105 shadow-lg shadow-indigo-600/25' : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-250'}`}
                                        >
                                            {num} HS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={startSpin} 
                                disabled={availablePool.length === 0} 
                                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all duration-300 disabled:opacity-50 flex justify-center items-center gap-2 mt-6 text-lg tracking-wider"
                            >
                                <Play className="h-5 w-5 fill-current" /> BẮT ĐẦU QUAY SỐ ({Math.min(count, availablePool.length)} HS)
                            </button>
                        </div>
                    )}

                    {phase === 'SPINNING' && (
                        <div className="space-y-6 py-6 min-h-[300px] flex flex-col justify-center">
                            <div className="text-center mb-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 animate-pulse border border-amber-500/20">
                                    <Sparkles className="h-3 w-3" /> Đang chọn ngẫu nhiên...
                                </span>
                            </div>

                            {/* Slot Machine Reels Grid */}
                            <div className={`grid gap-4 w-full ${reels.length === 1 ? 'grid-cols-1' : reels.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
                                {reels.map((reel, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`relative bg-slate-950 p-6 rounded-2xl text-center border-2 shadow-inner h-32 flex flex-col justify-center items-center transition-all duration-300 overflow-hidden
                                            ${reel.status === 'FINISHED' 
                                                ? 'border-emerald-500 ring-4 ring-emerald-500/15 bg-slate-900/60 shadow-emerald-500/5' 
                                                : 'border-slate-800 ring-2 ring-indigo-500/10'}`}
                                    >
                                        {/* Row Label */}
                                        <div className="absolute top-2 left-3 bg-slate-800/80 px-2 py-0.5 rounded text-[10px] font-bold text-slate-400">
                                            VỊ TRÍ #{idx + 1}
                                        </div>

                                        {reel.status === 'FINISHED' && (
                                            <div className="absolute top-2 right-3">
                                                <Trophy className="h-4 w-4 text-emerald-400 animate-bounce" />
                                            </div>
                                        )}

                                        <span className={`text-2xl sm:text-3xl font-black uppercase tracking-wide truncate w-full transition-all duration-150 block
                                            ${reel.status === 'FINISHED' 
                                                ? 'text-emerald-400 font-extrabold animate-in zoom-in-95 scale-110 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                                : 'text-amber-400 blur-[0.5px] opacity-90 animate-pulse'}`}
                                        >
                                            {reel.currentName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {phase === 'RESULT' && (
                        <div className="space-y-6 min-h-[300px] flex flex-col justify-center animate-in zoom-in-95 duration-500">
                            <div className="text-center mb-2">
                                <Trophy className="h-16 w-16 text-amber-500 mx-auto mb-4 animate-bounce drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]" />
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Học sinh được chọn</h3>
                            </div>

                            <div className="space-y-3.5 max-w-md mx-auto w-full">
                                {winners.map((w, idx) => (
                                    <div key={idx} className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border-2 border-emerald-500/50 p-4.5 rounded-2xl text-center shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-3 left-4 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                                            Học sinh #{idx + 1}
                                        </div>
                                        <span className="text-2xl font-black text-emerald-400 tracking-wide uppercase relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{w.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-6 space-y-3 max-w-md mx-auto w-full">
                                <button onClick={handleSelectWinners} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center justify-center gap-2 text-base">
                                    <Trophy className="h-5 w-5" /> Xác nhận {winners.length} học sinh
                                </button>

                                <button onClick={() => setPhase('SETUP')} className="w-full text-center text-slate-400 hover:text-slate-200 font-bold text-sm tracking-wide transition">
                                    ← Quay lại cấu hình chọn
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
