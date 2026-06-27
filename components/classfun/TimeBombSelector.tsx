import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, X, Sparkles, AlertTriangle } from 'lucide-react';
import { User } from '../../types';
import { useClassFunStore } from '../../services/classFunStore';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';
import toast from 'react-hot-toast';

interface TimeBombSelectorProps {
    students: User[];
    classId: string;
    onClose: () => void;
}

export const TimeBombSelector: React.FC<TimeBombSelectorProps> = ({ students, classId, onClose }) => {
    const { addBehaviorLog } = useClassFunStore();
    const [phase, setPhase] = useState<'SETUP' | 'TICKING' | 'EXPLODED'>('SETUP');
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [winner, setWinner] = useState<User | null>(null);
    const [rewardPoints, setRewardPoints] = useState<number | null>(null);
    const [isSavingReward, setIsSavingReward] = useState(false);

    const activeTimers = useRef<any[]>([]);

    useEffect(() => {
        return () => {
            activeTimers.current.forEach(clearTimeout);
        };
    }, []);

    const startDetonation = () => {
        if (students.length === 0) return;
        setPhase('TICKING');
        setWinner(null);
        setRewardPoints(null);
        activeTimers.current = [];

        // Random duration between 4.5s and 7s
        const totalDuration = 4500 + Math.random() * 2500;
        let elapsedTime = 0;
        let speed = 60; // Initial speed in ms
        let currentIdx = 0;

        const runTick = () => {
            elapsedTime += speed;
            playTickSound();
            
            // Move active index to next student in circle
            currentIdx = (currentIdx + 1) % students.length;
            setActiveIndex(currentIdx);

            if (elapsedTime < totalDuration) {
                // Decelerate (slow down) as we get closer to detonation
                const progress = elapsedTime / totalDuration;
                if (progress > 0.6) {
                    speed *= 1.15; // Slow down rapidly near detonation
                } else {
                    speed *= 1.02; // Slow down gradually
                }
                const t = setTimeout(runTick, speed);
                activeTimers.current.push(t);
            } else {
                // EXPLODE!
                setPhase('EXPLODED');
                setWinner(students[currentIdx]);
                playVictorySound();
            }
        };

        const t = setTimeout(runTick, speed);
        activeTimers.current.push(t);
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
                reason: `Thắng trò chơi Trợ Lý Sư Phạm AI: Gọi Bom Hẹn Giờ`,
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
            {phase === 'EXPLODED' && <Confetti />}
            <div className="bg-slate-900 border border-slate-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col relative z-10 transition-all overflow-hidden h-[90vh]">
                
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 p-4 text-white flex justify-between items-center relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400 via-red-600 to-slate-950"></div>
                    <h2 className="text-xl font-black flex items-center gap-2 relative z-10 tracking-widest uppercase">
                        💣 BOM HẸN GIỜ: ĐƯỜNG BĂNG SINH TỬ
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Arena Arena Board */}
                <div className="flex-1 overflow-auto p-6 bg-slate-950 flex flex-col justify-center items-center relative min-h-[350px]">
                    {phase === 'SETUP' && (
                        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-xl text-center z-10">
                            <div className="text-6xl mb-4 animate-bounce">💣</div>
                            <h3 className="font-black text-slate-200 mb-2 text-xl tracking-wide uppercase">Cảnh Báo Kích Nổ</h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                                Tia lửa ngòi nổ sẽ chạy vòng quanh các tên học sinh. Quả bom hẹn giờ nổ ngẫu nhiên sẽ khóa mục tiêu học sinh may mắn!
                            </p>
                            <button 
                                onClick={startDetonation}
                                className="w-full bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-red-900/25 transition active:scale-95 flex justify-center items-center gap-2 text-lg tracking-wider"
                            >
                                <Play className="h-6 w-6 fill-current animate-pulse" /> KÍCH HOẠT BOM HẸN GIỜ
                            </button>
                        </div>
                    )}

                    {phase === 'TICKING' && (
                        <div className="relative w-full h-full flex items-center justify-center min-h-[400px]">
                            {/* Central Bomb */}
                            <div className="absolute z-10 flex flex-col items-center justify-center">
                                <div className="text-7xl sm:text-8xl animate-pulse animate-shake">💣</div>
                                <span className="mt-3 text-[10px] font-black tracking-widest uppercase text-red-500 bg-red-950/40 border border-red-500/30 px-3 py-1 rounded-full animate-ping">
                                    Đang đếm ngược...
                                </span>
                            </div>

                            {/* Circle layout of students */}
                            <div className="relative w-full max-w-lg h-full max-h-lg aspect-square flex items-center justify-center select-none">
                                {students.map((student, idx) => {
                                    const total = students.length;
                                    const angle = (idx / total) * 2 * Math.PI - Math.PI / 2; // Offset by -90deg so it starts at the top
                                    
                                    // Circular positions
                                    const radiusX = 40; // in %
                                    const radiusY = 40; // in %
                                    const left = 50 + radiusX * Math.cos(angle);
                                    const top = 50 + radiusY * Math.sin(angle);

                                    const isActive = activeIndex === idx;

                                    return (
                                        <div
                                            key={student.id}
                                            className={`absolute -translate-x-1/2 -translate-y-1/2 px-3.5 py-2 rounded-2xl border text-xs font-black tracking-wide transition-all duration-100 flex items-center gap-2 max-w-[140px] truncate
                                                ${isActive 
                                                    ? 'bg-red-500 border-red-400 text-white scale-120 shadow-[0_0_20px_rgba(239,68,68,0.7)] z-25' 
                                                    : 'bg-slate-900 border-slate-800 text-slate-400'
                                                }`}
                                            style={{
                                                left: `${left}%`,
                                                top: `${top}%`,
                                            }}
                                        >
                                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white animate-ping' : 'bg-slate-700'}`} />
                                            <span className="truncate">{student.name}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {phase === 'EXPLODED' && winner && (
                        <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 p-8 rounded-3xl shadow-2xl text-center z-10 animate-in zoom-in-95 duration-300">
                            <span className="text-6xl mb-4 block animate-bounce">💥</span>
                            <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-1">MỤC TIÊU BỊ KÍCH NỔ</h3>
                            <h2 className="text-3xl font-black text-slate-100 tracking-wide uppercase drop-shadow-[0_2px_10px_rgba(239,68,68,0.3)] mb-6">
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
                                    onClick={startDetonation}
                                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition active:scale-95 shadow-md shadow-red-900/20 text-sm"
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
