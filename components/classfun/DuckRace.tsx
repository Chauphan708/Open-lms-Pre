import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Play, RotateCcw, X } from 'lucide-react';
import { User } from '../../types';
import { playVictorySound } from '../../utils/audio';
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
}

export const DuckRace: React.FC<DuckRaceProps> = ({ students, onComplete, onClose }) => {
    const [racers, setRacers] = useState<Racer[]>([]);
    const [phase, setPhase] = useState<'SETUP' | 'RACING' | 'RESULT'>('SETUP');
    const [speedSetting, setSpeedSetting] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
    const [winner, setWinner] = useState<User | null>(null);
    const requestRef = useRef<number>();
    const lastTimeRef = useRef<number>();

    // Initialize racers
    useEffect(() => {
        if (students.length > 0) {
            initRacers();
        }
    }, [students]);

    const initRacers = () => {
        const initialRacers = students.map(s => ({
            id: s.id,
            student: s,
            progress: 0,
            speed: Math.random() * 2 + 1 // Random initial speed
        }));
        setRacers(initialRacers);
        setWinner(null);
    };

    const runRace = (time: number) => {
        if (lastTimeRef.current != undefined) {
            const deltaTime = time - lastTimeRef.current;

            setRacers(prevRacers => {
                let someoneWon = false;
                let newWinner: User | null = null;

                const updated = prevRacers.map(racer => {
                    if (someoneWon) return racer; // Stop others if won
                    if (racer.progress >= 100) { // Already finished
                        return racer;
                    }

                    let newSpeed = racer.speed;

                    // 1.5% chance per frame (approx once per second at 60fps) to drastically change behavior
                    if (Math.random() < 0.015) {
                        const roll = Math.random();
                        if (roll < 0.2) {
                            newSpeed = Math.random() * 1.5 + 0.1; // Stall (very slow)
                        } else if (roll > 0.8) {
                            newSpeed = Math.random() * 5 + 6; // Burst (very fast)
                        } else {
                            newSpeed = Math.random() * 4 + 2; // Normal range
                        }
                    } else {
                        // Smooth drift
                        newSpeed = Math.max(0.5, Math.min(10, newSpeed + (Math.random() - 0.5) * 0.4));
                    }

                    // Base factor based on user selection
                    let baseFactor = 0.0015; // Normal (~20s)
                    if (speedSetting === 'SLOW') baseFactor = 0.001; // Slow (~30s)
                    if (speedSetting === 'FAST') baseFactor = 0.003; // Fast (~10s)

                    let newProgress = racer.progress + (newSpeed * deltaTime * baseFactor);

                    if (newProgress >= 100) {
                        newProgress = 100;
                        if (!someoneWon) { // Only set the first one to cross the line as winner
                            someoneWon = true;
                            newWinner = racer.student;
                        }
                    }
                    return { ...racer, progress: newProgress, speed: newSpeed };
                });

                // If someone just won in this frame
                if (someoneWon && newWinner) {
                    setPhase('RESULT');
                    setWinner(newWinner);
                    playVictorySound(); // Play victory sound
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
        if (phase === 'RACING' && !winner) {
            requestRef.current = requestAnimationFrame(runRace);
        }
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [phase, winner]);

    const startRace = () => {
        setPhase('RACING');
        lastTimeRef.current = undefined; // Reset time so we don't jump
    };

    const handleSelectWinner = () => {
        if (winner) {
            onComplete(winner);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center relative overflow-hidden">
                    {/* Water waves background effect */}
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-indigo-600 to-indigo-800"></div>

                    <h2 className="text-2xl font-black italic flex items-center gap-2 relative z-10">
                        <span className="text-3xl">🦆</span> GIẢI ĐUA VỊT LỚP HỌC
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Race Track or Setup */}
                <div className="flex-1 overflow-y-auto p-6 bg-sky-50 relative">
                    {phase === 'SETUP' && (
                        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border mt-4 text-center">
                            <h3 className="font-bold text-gray-800 mb-4 text-lg">Cấu hình giải đua</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Tốc độ trận đấu</label>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setSpeedSetting('SLOW')}
                                            className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold transition text-xs sm:text-sm ${speedSetting === 'SLOW' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            🐢 Chậm (~30s)
                                        </button>
                                        <button
                                            onClick={() => setSpeedSetting('NORMAL')}
                                            className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold transition text-xs sm:text-sm ${speedSetting === 'NORMAL' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            🦆 Vừa (~20s)
                                        </button>
                                        <button
                                            onClick={() => setSpeedSetting('FAST')}
                                            className={`flex-1 py-3 px-2 rounded-xl border-2 font-bold transition text-xs sm:text-sm ${speedSetting === 'FAST' ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm scale-105' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            ⚡ Nhanh (~10s)
                                        </button>
                                    </div>
                                </div>

                                <button onClick={startRace} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-xl shadow-md transition active:scale-95 flex justify-center items-center gap-2 mt-6 text-lg">
                                    <Play className="h-6 w-6 fill-current" /> BẮT ĐẦU ĐUA ({racers.length} HS)
                                </button>
                            </div>
                        </div>
                    )}

                    {phase !== 'SETUP' && (
                        <>
                            {/* Finish Line Indicator (visual only) */}
                            <div className="absolute right-6 top-6 bottom-6 w-8 border-l-4 border-dashed border-red-500 flex flex-col justify-center items-center opacity-50 z-0">
                                <div className="text-xs font-bold text-red-500 uppercase rotate-90 tracking-widest whitespace-nowrap">Đích Đến</div>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {racers.map((racer, idx) => {
                                    // Calculate bobbing effect based on progress and id
                                    const bobY = phase === 'RACING' ? Math.sin((racer.progress * 0.5) + Number(racer.id.replace(/\D/g, '') || idx)) * 4 : 0;

                                    return (
                                        <div key={racer.id} className="relative h-14 bg-white/50 rounded-full border border-sky-200 shadow-inner overflow-hidden flex items-center px-2">
                                            {/* Water effect */}
                                            <div className="absolute left-0 top-0 bottom-0 bg-sky-200/50 transition-all duration-75" style={{ width: `${racer.progress}%` }}></div>

                                            <div className="font-bold text-blue-900 w-32 truncate text-sm z-10 mix-blend-color-burn">
                                                {idx + 1}. {racer.student.name}
                                            </div>

                                            {/* Duck */}
                                            <div
                                                className="absolute transition-all duration-75 z-10"
                                                style={{
                                                    left: `calc(${racer.progress}% - ${racer.progress === 100 ? '40px' : '20px'})`,
                                                    transform: `translateY(${bobY}px)`
                                                }}
                                            >
                                                <div className="relative">
                                                    <span
                                                        className={`text-4xl filter drop-shadow-md ${winner && winner.id !== racer.id ? 'opacity-50 grayscale' : ''}`}
                                                        style={{ transform: 'scaleX(-1)', display: 'inline-block' }}
                                                    >
                                                        🦆
                                                    </span>
                                                    {winner?.id === racer.id && (
                                                        <Trophy className="absolute -top-4 -right-2 h-6 w-6 text-amber-500 fill-amber-500 drop-shadow-md animate-bounce" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Winner Announcement & Controls */}
                <div className="p-4 bg-gray-50 border-t flex items-center justify-between">
                    <div className="flex-1">
                        {winner ? (
                            <div className="animate-bounce flex items-center gap-3 text-emerald-600">
                                <Trophy className="h-8 w-8 text-amber-500" />
                                <div>
                                    <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Người chiến thắng</p>
                                    <p className="text-xl font-black">{winner.name}!</p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Sẵn sàng đua...</p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {phase === 'RESULT' && (
                            <button onClick={() => { initRacers(); setPhase('SETUP'); }} className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2.5 rounded-xl font-bold transition">
                                <RotateCcw className="h-5 w-5" /> Đua lại
                            </button>
                        )}
                        {winner && (
                            <button onClick={handleSelectWinner} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-md hover:shadow-lg active:scale-95 animate-pulse">
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
