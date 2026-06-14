import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Square, Plus, Repeat, Bell, VolumeX } from 'lucide-react';

type TimerMode = 'NORMAL' | 'STUDY';

interface TimerStep {
    id: string;
    label: string;
    hours: number;
    minutes: number;
    seconds: number;
    sound: string;
}

export const CountdownTimer: React.FC = () => {
    const [mode, setMode] = useState<TimerMode>('NORMAL');

    // Normal Mode State
    const [normalHours, setNormalHours] = useState<number>(0);
    const [normalMinutes, setNormalMinutes] = useState<number>(10);
    const [normalSeconds, setNormalSeconds] = useState<number>(0);
    const [normalSound, setNormalSound] = useState<string>('alarm1');
    const [normalLabel, setNormalLabel] = useState<string>('Đồng hồ hẹn giờ');

    // Study Mode State
    const [studySteps, setStudySteps] = useState<TimerStep[]>([
        { id: '1', label: 'Học', hours: 0, minutes: 25, seconds: 0, sound: 'none' },
        { id: '2', label: 'Nghỉ', hours: 0, minutes: 5, seconds: 0, sound: 'alarm1' }
    ]);
    const [isRepeat, setIsRepeat] = useState<boolean>(false);

    // Running State
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);

    // Core timing logic
    const [timeRemaining, setTimeRemaining] = useState<number>(0); // in seconds
    const [totalDuration, setTotalDuration] = useState<number>(0); // for circle progress

    // Post-timer state
    const [isFinished, setIsFinished] = useState<boolean>(false);

    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [currentLabel, setCurrentLabel] = useState<string>('');

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const finishedTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Audio Maps
    const sounds = [
        { id: 'none', name: 'Im lặng', url: '' },
        { id: 'alarm1', name: 'Đồng hồ báo thức 1', url: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
        { id: 'bell1', name: 'Chuông kêu', url: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
        { id: 'digital', name: 'Beep điện tử', url: 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3' },
        { id: 'bomb', name: 'Tiếng bom nổ', url: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3' }
    ];

    // Presets
    const presets = [
        { label: '15 giây', h: 0, m: 0, s: 15 },
        { label: '30 giây', h: 0, m: 0, s: 30 },
        { label: '45 giây', h: 0, m: 0, s: 45 },
        { label: '1 phút', h: 0, m: 1, s: 0 },
        { label: '5 phút', h: 0, m: 5, s: 0 },
        { label: '10 phút', h: 0, m: 10, s: 0 },
        { label: '15 phút', h: 0, m: 15, s: 0 },
        { label: '30 phút', h: 0, m: 30, s: 0 },
    ];

    const stopAllTimeoutsAndAudio = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (finishedTimeoutRef.current) clearTimeout(finishedTimeoutRef.current);
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.loop = false;
        }
    }, []);

    const handleNextStep = useCallback(() => {
        stopAllTimeoutsAndAudio();

        if (mode === 'NORMAL') {
            setIsRunning(false);
            setIsFinished(false);
        } else {
            // Move to next step
            const nextIndex = currentStepIndex + 1;
            if (nextIndex < studySteps.length) {
                startStudyStep(nextIndex);
            } else if (isRepeat) {
                startStudyStep(0); // Loop back
            } else {
                setIsRunning(false);
                setIsFinished(false);
            }
        }
    }, [mode, currentStepIndex, studySteps, isRepeat, stopAllTimeoutsAndAudio]);

    const handleStart = () => {
        stopAllTimeoutsAndAudio();
        if (mode === 'NORMAL') {
            const totalSeconds = normalHours * 3600 + normalMinutes * 60 + normalSeconds;
            if (totalSeconds === 0) return;
            setTimeRemaining(totalSeconds);
            setTotalDuration(totalSeconds);
            setCurrentLabel(normalLabel);
        } else {
            if (studySteps.length === 0) return;
            startStudyStep(0);
            return; // startStudyStep already handles isRunning
        }
        setIsRunning(true);
        setIsPaused(false);
        setIsFinished(false);
    };

    const startStudyStep = (index: number) => {
        const step = studySteps[index];
        const totalSeconds = step.hours * 3600 + step.minutes * 60 + step.seconds;
        setTimeRemaining(totalSeconds);
        setTotalDuration(totalSeconds);
        setCurrentLabel(step.label);
        setCurrentStepIndex(index);

        setIsRunning(true);
        setIsPaused(false);
        setIsFinished(false);
    };

    const playSound = useCallback((soundId: string) => {
        if (audioTimeoutRef.current) clearTimeout(audioTimeoutRef.current);
        if (soundId === 'none') return;
        const soundObj = sounds.find(s => s.id === soundId);
        if (soundObj && soundObj.url) {
            if (audioRef.current) {
                audioRef.current.src = soundObj.url;
                audioRef.current.loop = true;
                audioRef.current.play().catch(e => console.log('Audio play failed:', e));

                audioTimeoutRef.current = setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.currentTime = 0;
                        audioRef.current.loop = false;
                    }
                }, 10000); // Max safe fallback (10s limit)
            }
        }
    }, [sounds]);

    const handleStop = () => {
        setIsRunning(false);
        setIsPaused(false);
        setIsFinished(false);
        stopAllTimeoutsAndAudio();
    };

    const handlePauseResume = () => {
        setIsPaused(!isPaused);
    };

    // Main Timer Interval
    useEffect(() => {
        if (isRunning && !isPaused && !isFinished && timeRemaining > 0) {
            timerRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        return 0; // stop exactly at 0
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, isPaused, isFinished]);

    // Handle when time hits 0
    useEffect(() => {
        if (isRunning && !isPaused && !isFinished && timeRemaining === 0) {
            setIsFinished(true);

            const soundToPlay = mode === 'NORMAL' ? normalSound : studySteps[currentStepIndex].sound;
            playSound(soundToPlay);

            // Wait 5 seconds, then auto-proceed
            finishedTimeoutRef.current = setTimeout(() => {
                handleNextStep();
            }, 5000);
        }
    }, [timeRemaining, isRunning, isPaused, isFinished, mode, normalSound, studySteps, currentStepIndex, playSound, handleNextStep]);


    // Utility functions formatting output
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const testAudio = (soundId: string) => {
        stopAllTimeoutsAndAudio();
        playSound(soundId);
    };

    // SVG Circular Progress Calculations
    const CIRCLE_RADIUS = 48; // Viewbox is 0 0 100 100, center 50, radius 48
    const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS; // ~301.59
    const progressRatio = totalDuration > 0 ? (timeRemaining / totalDuration) : 0;
    const strokeDashoffset = CIRCLE_CIRCUMFERENCE - (progressRatio * CIRCLE_CIRCUMFERENCE);
    const timeStr = formatTime(timeRemaining);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col font-sans">
            <audio ref={audioRef} />

            {/* Header */}
            {!isRunning && (
                <header className="p-6 text-center border-b border-gray-200 bg-white">
                    <h1 className="text-3xl font-bold tracking-wide">Đồng hồ đếm ngược</h1>
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center p-4">

                {/* RUNNING VIEW */}
                {isRunning ? (
                    <div className="w-full flex justify-center items-center py-8 animate-fade-in">
                        <div className="w-full max-w-2xl flex flex-col items-center text-center">

                            <div className="mb-4 md:mb-8 text-2xl md:text-4xl text-gray-600 font-medium tracking-wider h-10">
                                {currentLabel}
                            </div>

                            {/* Circular Progress + Time display */}
                            <div className="relative w-full max-w-[280px] md:max-w-[420px] aspect-square flex items-center justify-center">
                                {/* SVG Circle */}
                                <svg
                                    viewBox="0 0 100 100"
                                    className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-sm"
                                >
                                    {/* Background Track */}
                                    <circle
                                        cx="50" cy="50" r={CIRCLE_RADIUS}
                                        fill="none"
                                        className="stroke-gray-200"
                                        strokeWidth="3"
                                    />
                                    {/* Animated Progress Track */}
                                    <circle
                                        cx="50" cy="50" r={CIRCLE_RADIUS}
                                        fill="none"
                                        className={`${isFinished || (timeRemaining <= 10 && timeRemaining > 0) ? 'stroke-red-500' : 'stroke-[#29b6f6]'} transition-all duration-1000 ease-linear`}
                                        strokeWidth="3"
                                        strokeDasharray={CIRCLE_CIRCUMFERENCE}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                    />
                                </svg>

                                {/* Timer Text */}
                                <div className={`z-10 font-black leading-none tabular-nums tracking-tighter flex items-center justify-center w-full px-4
                                    ${timeStr.length > 5 ? 'text-6xl md:text-8xl' : 'text-[80px] md:text-[120px]'}
                                    ${isFinished || (timeRemaining <= 10 && timeRemaining > 0) ? 'text-red-500 animate-pulse' : 'text-gray-900'}
                                `}>
                                    {timeStr}
                                </div>
                            </div>

                            {mode === 'STUDY' && (
                                <div className="mt-8 text-gray-500 text-lg font-medium tracking-widest uppercase h-8">
                                    Bước {currentStepIndex + 1} / {studySteps.length}
                                </div>
                            )}

                            {/* Controls */}
                            <div className="mt-12 md:mt-16 flex items-center justify-center gap-6 h-[88px]">
                                {isFinished ? (
                                    <button
                                        onClick={handleNextStep}
                                        className="flex items-center gap-3 px-8 py-5 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition font-bold text-xl shadow-sm animate-bounce"
                                        title="Tắt âm báo ngay lập tức"
                                    >
                                        <VolumeX className="h-8 w-8" />
                                        Tắt âm báo
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleStop}
                                            className="p-5 rounded-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 transition shadow-sm"
                                            title="Hủy"
                                        >
                                            <Square className="h-8 w-8" />
                                        </button>
                                        <button
                                            onClick={handlePauseResume}
                                            className={`p-7 rounded-full transition shadow-lg shadow-black/10 ${isPaused ? 'bg-blue-500 hover:bg-blue-400 text-white' : 'bg-[#29b6f6] hover:bg-[#039be5] text-white'}`}
                                        >
                                            {isPaused ? <Play className="h-10 w-10 fill-current ml-1" /> : <Pause className="h-10 w-10 fill-current" />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setTimeRemaining(prev => prev + 60);
                                                setTotalDuration(prev => prev + 60); // visually extend the circle
                                            }}
                                            className="p-5 rounded-full bg-white border border-gray-300 hover:bg-gray-100 text-gray-600 transition shadow-sm font-bold text-xl"
                                            title="Cộng thêm 1 phút"
                                        >
                                            +1m
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SETUP VIEW */
                    <div className="w-full max-w-4xl animate-fade-in">

                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold">Đặt một đồng hồ hẹn giờ</h2>
                            <button
                                onClick={() => setMode(mode === 'NORMAL' ? 'STUDY' : 'NORMAL')}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition border ${mode === 'STUDY' ? 'bg-[#29b6f6] text-white border-[#29b6f6]' : 'border-[#29b6f6] text-[#29b6f6] hover:bg-[#29b6f6]/10'}`}
                            >
                                Chế độ học
                            </button>
                        </div>

                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200">

                            {mode === 'NORMAL' && (
                                <div className="space-y-8">
                                    {/* Time Selectors */}
                                    <div className="grid grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-gray-500 text-sm mb-2 font-bold uppercase tracking-wider">Số giờ</label>
                                            <select
                                                value={normalHours} onChange={e => setNormalHours(Number(e.target.value))}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 text-xl font-medium appearance-none focus:outline-none focus:border-[#29b6f6] focus:ring-2 focus:ring-[#29b6f6]/20 transition-all cursor-pointer"
                                            >
                                                {Array.from({ length: 100 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 text-sm mb-2 font-bold uppercase tracking-wider">Số phút</label>
                                            <select
                                                value={normalMinutes} onChange={e => setNormalMinutes(Number(e.target.value))}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 text-xl font-medium appearance-none focus:outline-none focus:border-[#29b6f6] focus:ring-2 focus:ring-[#29b6f6]/20 transition-all cursor-pointer"
                                            >
                                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-500 text-sm mb-2 font-bold uppercase tracking-wider">Số giây</label>
                                            <select
                                                value={normalSeconds} onChange={e => setNormalSeconds(Number(e.target.value))}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 text-xl font-medium appearance-none focus:outline-none focus:border-[#29b6f6] focus:ring-2 focus:ring-[#29b6f6]/20 transition-all cursor-pointer"
                                            >
                                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Presets */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {presets.map(p => (
                                            <button
                                                key={p.label}
                                                onClick={() => { setNormalHours(p.h); setNormalMinutes(p.m); setNormalSeconds(p.s); }}
                                                className="flex items-center gap-2 text-[#29b6f6] hover:text-[#039be5] transition group font-bold bg-blue-50/50 hover:bg-blue-50 py-2 px-3 rounded-lg border border-transparent hover:border-[#29b6f6]/30"
                                            >
                                                <Bell className="h-4 w-4" />
                                                <span>{p.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Settings */}
                                    <div className="space-y-6 pt-6 border-t border-gray-100">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <label className="text-gray-700 font-bold text-base">Âm báo</label>
                                                <button onClick={() => testAudio(normalSound)} className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-1 font-medium transition-colors">
                                                    <Play className="h-3 w-3" /> Kiểm tra âm thanh
                                                </button>
                                            </div>
                                            <select
                                                value={normalSound} onChange={e => setNormalSound(e.target.value)}
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-[#29b6f6] focus:ring-2 focus:ring-[#29b6f6]/20 transition-all cursor-pointer"
                                            >
                                                {sounds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-gray-700 font-bold text-base mb-2">Tên đồng hồ hẹn giờ</label>
                                            <input
                                                value={normalLabel} onChange={e => setNormalLabel(e.target.value)}
                                                placeholder="Đồng hồ hẹn giờ"
                                                className="w-full bg-gray-50 border border-gray-300 rounded-lg p-3 text-gray-900 focus:outline-none focus:border-[#29b6f6] focus:ring-2 focus:ring-[#29b6f6]/20 transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mode === 'STUDY' && (
                                <div className="space-y-6">
                                    {/* Headers */}
                                    <div className="flex text-gray-500 text-sm font-bold border-b border-gray-200 pb-3 uppercase tracking-wider">
                                        <div className="w-12 text-center">#</div>
                                        <div className="w-32 md:w-56 pl-2">Nhãn</div>
                                        <div className="flex-1 text-center">Thời gian</div>
                                        <div className="w-32 md:w-56 pl-2">Âm báo</div>
                                        <div className="w-10"></div>
                                    </div>

                                    {/* Steps List */}
                                    <div className="space-y-3 pt-2">
                                        {studySteps.map((step, index) => (
                                            <div key={step.id} className="flex flex-wrap md:flex-nowrap items-center gap-2 md:gap-4 bg-gray-50/80 p-3 md:p-3 rounded-xl border border-gray-200 hover:border-[#29b6f6]/50 transition-colors">
                                                <div className="w-6 md:w-8 text-center text-gray-400 font-mono text-base font-bold">{index + 1}</div>
                                                <div className="w-32 md:w-56">
                                                    <input
                                                        value={step.label} onChange={e => {
                                                            const newSteps = [...studySteps];
                                                            newSteps[index].label = e.target.value;
                                                            setStudySteps(newSteps);
                                                        }}
                                                        placeholder="Vd: Tự học"
                                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 font-medium focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6] transition-all"
                                                    />
                                                </div>
                                                <div className="flex-1 flex justify-center items-center font-mono font-medium">
                                                    <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1">
                                                        <input type="number" min="0" max="99" value={step.hours.toString().padStart(2, '0')}
                                                            onChange={e => { const newSteps = [...studySteps]; newSteps[index].hours = Number(e.target.value); setStudySteps(newSteps); }}
                                                            className="w-10 md:w-12 bg-transparent text-center rounded p-1.5 focus:outline-none focus:text-[#29b6f6] transition-colors"
                                                        />
                                                        <span className="text-gray-300 font-bold">:</span>
                                                        <input type="number" min="0" max="59" value={step.minutes.toString().padStart(2, '0')}
                                                            onChange={e => { const newSteps = [...studySteps]; newSteps[index].minutes = Number(e.target.value); setStudySteps(newSteps); }}
                                                            className="w-10 md:w-12 bg-transparent text-center rounded p-1.5 focus:outline-none focus:text-[#29b6f6] transition-colors"
                                                        />
                                                        <span className="text-gray-300 font-bold">:</span>
                                                        <input type="number" min="0" max="59" value={step.seconds.toString().padStart(2, '0')}
                                                            onChange={e => { const newSteps = [...studySteps]; newSteps[index].seconds = Number(e.target.value); setStudySteps(newSteps); }}
                                                            className="w-10 md:w-12 bg-transparent text-center rounded p-1.5 focus:outline-none focus:text-[#29b6f6] transition-colors"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="w-32 md:w-56">
                                                    <select
                                                        value={step.sound} onChange={e => {
                                                            const newSteps = [...studySteps];
                                                            newSteps[index].sound = e.target.value;
                                                            setStudySteps(newSteps);
                                                        }}
                                                        className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 text-sm font-medium focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6] transition-all cursor-pointer"
                                                    >
                                                        {sounds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                    </select>
                                                </div>
                                                <div className="w-8 md:w-10 flex justify-center">
                                                    <button
                                                        onClick={() => {
                                                            setStudySteps(studySteps.filter((_, i) => i !== index));
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Xóa khoảng thời gian này"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Controls */}
                                    <div className="flex justify-between items-center pt-6 border-t border-gray-100">
                                        <button
                                            onClick={() => {
                                                setStudySteps([...studySteps, { id: Date.now().toString(), label: 'Mới', hours: 0, minutes: 0, seconds: 0, sound: 'none' }]);
                                            }}
                                            className="flex items-center gap-2 bg-[#29b6f6]/10 text-[#039be5] hover:bg-[#29b6f6]/20 px-5 py-2.5 rounded-lg font-bold text-sm transition-colors border border-transparent hover:border-[#29b6f6]/30"
                                        >
                                            <Plus className="h-5 w-5" /> Thêm hẹn giờ mới
                                        </button>

                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <span className="font-bold text-gray-600 group-hover:text-gray-900 transition-colors uppercase tracking-wide text-sm">Lặp lại</span>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shadow-sm ${isRepeat ? 'border-[#29b6f6] bg-[#29b6f6]' : 'border-gray-300 bg-white group-hover:border-gray-400'}`}>
                                                {isRepeat && <div className="w-2.5 h-2.5 rounded-full bg-white"></div>}
                                            </div>
                                            {/* hidden checkbox for accessibility/logic toggle */}
                                            <input type="checkbox" className="hidden" checked={isRepeat} onChange={e => setIsRepeat(e.target.checked)} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Global Start Button */}
                            <button
                                onClick={handleStart}
                                className="w-full mt-10 bg-[#29b6f6] hover:bg-[#039be5] text-white font-black uppercase tracking-widest py-4 rounded-xl text-lg transition-all shadow-lg shadow-[#29b6f6]/30 hover:shadow-[#039be5]/40 hover:-translate-y-0.5"
                            >
                                Bắt đầu
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

// SVG Icon for closing / deleting
const X = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);
