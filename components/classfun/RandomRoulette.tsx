import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../../types';
import { ClassGroup } from '../../services/classFunStore';
import { Trophy, X, Play, RotateCcw, Users } from 'lucide-react';
import { playTickSound, playVictorySound } from '../../utils/audio';
import { Confetti } from './Confetti';

interface RandomRouletteProps {
    students: User[];
    groups?: ClassGroup[];
    groupMembers?: { student_id: string, group_id: string }[];
    onComplete: (winners: User[]) => void;
    onClose: () => void;
}

export const RandomRoulette: React.FC<RandomRouletteProps> = ({ students, groups = [], groupMembers = [], onComplete, onClose }) => {
    const [count, setCount] = useState(1);
    const [groupId, setGroupId] = useState<string>('all');
    const [phase, setPhase] = useState<'SETUP' | 'SPINNING' | 'RESULT'>('SETUP');
    const [winners, setWinners] = useState<User[]>([]);

    // For spinning visual
    const [flashingNames, setFlashingNames] = useState<string[]>([]);

    const availablePool = useMemo(() => {
        if (groupId === 'all') return students;
        const validStudentIds = groupMembers.filter(m => m.group_id === groupId).map(m => m.student_id);
        return students.filter(s => validStudentIds.includes(s.id));
    }, [students, groupId, groupMembers]);

    const startSpin = () => {
        if (availablePool.length === 0) return;
        setPhase('SPINNING');

        // determine winners immediately
        const shuffled = [...availablePool].sort(() => 0.5 - Math.random());
        const actualWinners = shuffled.slice(0, Math.min(count, availablePool.length));
        setWinners(actualWinners);

        setFlashingNames(Array(actualWinners.length).fill('???'));

        let ticks = 0;
        const maxTicks = 40 + Math.random() * 20; // total ticks
        let speed = 40; // fast initially

        const tick = () => {
            ticks++;
            playTickSound();

            // Generate random flashing names
            const randomFlash = [];
            for (let i = 0; i < actualWinners.length; i++) {
                const randStudent = availablePool[Math.floor(Math.random() * availablePool.length)];
                randomFlash.push(randStudent.name);
            }
            setFlashingNames(randomFlash);

            if (ticks < maxTicks) {
                speed *= 1.06; // slow down factor
                setTimeout(tick, speed);
            } else {
                setPhase('RESULT');
                playVictorySound();
            }
        };
        setTimeout(tick, speed);
    };

    const handleSelectWinners = () => {
        onComplete(winners);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {phase === 'RESULT' && <Confetti />}
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 transition-all duration-300">
                <div className="bg-indigo-600 p-4 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-400 via-indigo-600 to-indigo-800"></div>
                    <h2 className="text-xl font-black flex items-center gap-2 relative z-10">
                        🎲 GỌI NGẪU NHIÊN
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition relative z-10">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {phase === 'SETUP' && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Chọn nhóm đối tượng</label>
                                <select
                                    className="w-full border rounded-xl p-3 text-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                                    value={groupId}
                                    onChange={e => setGroupId(e.target.value)}
                                >
                                    <option value="all">Cả danh sách ({students.length})</option>
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Số lượng cần chọn</label>
                                <div className="flex gap-3">
                                    {[1, 2, 4].map(num => (
                                        <button
                                            key={num}
                                            onClick={() => setCount(num)}
                                            className={`flex-1 py-3 rounded-xl border-2 font-bold transition ${count === num ? 'border-indigo-600 bg-indigo-50 text-indigo-700 scale-105 shadow-sm' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                                        >
                                            {num} HS
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={startSpin} disabled={availablePool.length === 0} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-md transition disabled:opacity-50 flex justify-center items-center gap-2 mt-4">
                                <Play className="h-5 w-5 fill-current" /> BẮT ĐẦU CHỌN ({Math.min(count, availablePool.length)} HS)
                            </button>
                        </div>
                    )}

                    {phase === 'SPINNING' && (
                        <div className="space-y-4 min-h-[250px] flex flex-col justify-center">
                            {flashingNames.map((name, idx) => (
                                <div key={idx} className="bg-gray-50 p-4 rounded-xl text-center border-2 border-indigo-200 shadow-inner">
                                    <span className="text-2xl font-black text-indigo-500 tracking-wide uppercase truncate block blur-[1px]">{name}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {phase === 'RESULT' && (
                        <div className="space-y-6 min-h-[250px] flex flex-col justify-center animate-in zoom-in-95 duration-500">
                            <div className="text-center mb-2">
                                <Trophy className="h-14 w-14 text-amber-500 mx-auto mb-3 animate-bounce" />
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Học sinh được chọn</h3>
                            </div>

                            <div className="space-y-3">
                                {winners.map((w, idx) => (
                                    <div key={idx} className="bg-emerald-50 border-2 border-emerald-400 p-4 rounded-xl text-center shadow-lg relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-emerald-400/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                                        <span className="text-2xl font-black text-emerald-700 tracking-wide uppercase relative z-10 drop-shadow-sm">{w.name}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 space-y-3">
                                <button onClick={handleSelectWinners} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl shadow-md transition active:scale-95 flex items-center justify-center gap-2">
                                    <Trophy className="h-5 w-5" /> Xác nhận {winners.length} học sinh
                                </button>

                                <button onClick={() => setPhase('SETUP')} className="w-full text-center text-gray-500 font-bold text-sm tracking-wide hover:text-gray-700 transition">
                                    ← Quay lại chọn thêm
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
