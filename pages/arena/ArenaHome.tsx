
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { AvatarClass } from '../../types';
import { Brain, Trophy, GraduationCap, BookOpen, Sparkles, Target, Heart, ArrowLeft, Star, Zap, HelpCircle, X, ShoppingBag } from 'lucide-react';
import { getLeagueInfo } from './TowerMode';
import toast from 'react-hot-toast';

const AVATAR_CLASSES: { id: AvatarClass; name: string; icon: any; color: string; desc: string; emoji: string; lore: string }[] = [
    { id: 'scholar', name: 'Nhà Thông Thái', icon: BookOpen, color: '#6366f1', desc: 'Trí tuệ uyên bác', emoji: '📖', lore: '"Đọc vạn quyển sách, hiểu vạn lẽ đời"' },
    { id: 'scientist', name: 'Nhà Khoa Học', icon: Sparkles, color: '#8b5cf6', desc: 'Khám phá & sáng tạo', emoji: '🔬', lore: '"Khám phá bí ẩn của tự nhiên"' },
    { id: 'artist', name: 'Nghệ Sĩ', icon: Target, color: '#10b981', desc: 'Sáng tạo vô hạn', emoji: '🎨', lore: '"Sáng tạo là sức mạnh vô hạn"' },
    { id: 'explorer', name: 'Nhà Thám Hiểm', icon: Heart, color: '#f59e0b', desc: 'Dũng cảm khám phá', emoji: '🌍', lore: '"Mỗi câu hỏi là một vùng đất mới"' },
];

export const ArenaHome: React.FC = () => {
    const { user, arenaProfile, fetchArenaProfile, createArenaProfile, updateArenaProfile } = useStore();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const [selectedClass, setSelectedClass] = useState<AvatarClass | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const loadProfile = async () => {
        if (!user) return;
        setFetchError(null);
        setLoading(true);
        try {
            await fetchArenaProfile(user.id);
        } catch (err: any) {
            console.error("Failed loading arena profile:", err);
            setFetchError(err.message || 'Lỗi kết nối máy chủ');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadProfile();
    }, [user]);

    // Automatically check and unlock ELO and PvP badges when profile updates
    useEffect(() => {
        if (!arenaProfile) return;
        
        let needsUpdate = false;
        const badges = [...(arenaProfile.unlocked_badges || [])];
        
        // 1. Check Elo Champion (Elo >= 1500)
        if (arenaProfile.elo_rating >= 1500 && !badges.includes('elo_champion')) {
            badges.push('elo_champion');
            needsUpdate = true;
        }
        
        // 2. Check PvP Conqueror (wins >= 5)
        if (arenaProfile.wins >= 5 && !badges.includes('pvp_conqueror')) {
            badges.push('pvp_conqueror');
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            updateArenaProfile({
                id: arenaProfile.id,
                unlocked_badges: badges
            }).catch(err => console.error("Lỗi khi tự động mở khóa huy hiệu:", err));
        }
    }, [arenaProfile, updateArenaProfile]);

    const handleCreateProfile = async () => {
        if (!user || !selectedClass) return;
        setLoading(true);
        try {
            await createArenaProfile(user.id, selectedClass);
        } catch (err: any) {
            toast.error("Không thể khởi tạo nhân vật: " + (err.message || "Lỗi mạng"));
        } finally {
            setLoading(false);
        }
    };

    if (fetchError) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center bg-[#030712] text-gray-100 rounded-3xl border border-white/5 shadow-2xl">
                <div className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-4 rounded-2xl max-w-md mb-6 dark:border-slate-800">
                    <h2 className="text-xl font-bold mb-2">⚠️ Lỗi tải dữ liệu đấu trường</h2>
                    <p className="text-sm opacity-90">{fetchError}</p>
                    <p className="text-xs opacity-75 mt-2">Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.</p>
                </div>
                <button
                    onClick={loadProfile}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
                >
                    🔄 Thử lại
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full dark:border-slate-800" style={{ animation: 'spin 1s linear infinite' }}></div>
                    <p className="mt-4 text-gray-500 dark:text-slate-500">Đang tải Đấu Trí...</p>
                </div>
            </div>
        );
    }

    // Chưa có Arena Profile → Chọn nhân vật
    if (!arenaProfile) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center">
                <style>{`
          @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); } 70% { box-shadow: 0 0 0 15px rgba(139,92,246,0); } }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
                <div className="w-full max-w-2xl px-4" style={{ animation: 'fadeIn 0.6s ease-out' }}>
                    <div className="text-center mb-4">
                        <h1 className="text-3xl font-black text-gray-900 mb-2 dark:text-slate-100">🧠 Chọn Vai Trò Học Tập</h1>
                        <p className="text-gray-500 dark:text-slate-500">Hãy chọn vai trò để bắt đầu Hành Trình Tri Thức!</p>
                    </div>

                    {/* Lore intro */}
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 mb-6 text-center dark:border-indigo-900/30" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                        <p className="text-sm text-indigo-700 italic">
                            ✨ Trên đỉnh núi Thông Thái, có một ngôi trường huyền thoại nơi các học giả từ khắp nơi đến để thi tài kiến thức...
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        {AVATAR_CLASSES.map((cls, idx) => {
                            const Icon = cls.icon;
                            const isSelected = selectedClass === cls.id;
                            return (
                                <button
                                    key={cls.id}
                                    onClick={() => setSelectedClass(cls.id)}
                                    className={`relative p-6 rounded-2xl border-2 transition-all duration-300 text-left group hover:shadow-lg dark:border-slate-800 ${isSelected
                                        ? 'border-purple-500 bg-purple-50 shadow-lg shadow-purple-100 scale-[1.02]'
                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                        } `}
                                    style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.1}s both` }}
                                >
                                    {isSelected && (
                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                                    )}
                                    <div
                                        className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 text-white text-2xl"
                                        style={{ backgroundColor: cls.color, animation: isSelected ? 'float 2s ease-in-out infinite' : 'none' }}
                                    >
                                        {cls.emoji}
                                    </div>
                                    <h3 className="font-bold text-gray-900 text-lg dark:text-slate-100">{cls.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1 dark:text-slate-500">{cls.desc}</p>
                                    <p className="text-xs text-indigo-500 mt-2 italic">{cls.lore}</p>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={handleCreateProfile}
                        disabled={!selectedClass}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${selectedClass
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-200 hover:-translate-y-0.5'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            } `}
                    >
                        🚀 Bắt đầu Hành Trình Tri Thức!
                    </button>
                </div>
            </div>
        );
    }

    // Đã có profile → Trang chủ Arena
    const avatarInfo = AVATAR_CLASSES.find(c => c.id === arenaProfile.avatar_class) || AVATAR_CLASSES[0];

    return (
        <div className="max-w-4xl mx-auto bg-[#030712] rounded-3xl p-6 md:p-8 text-gray-100 relative border border-white/5 shadow-2xl shadow-purple-950/20 overflow-hidden min-h-[85vh] dark:border-slate-800">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 20px rgba(139,92,246,0.3); } 50% { box-shadow: 0 0 40px rgba(139,92,246,0.6); } }
        .glass-card { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
        .neon-border { transition: all 0.3s ease; }
        .neon-border:hover { box-shadow: 0 0 25px var(--neon-color); border-color: var(--neon-color); }
      `}</style>

            {/* Glowing background ambiance */}
            <div className="absolute top-0 left-1/4 w-80 h-80 rounded-full opacity-10 blur-[90px] pointer-events-none" style={{ backgroundColor: avatarInfo.color }}></div>
            <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-10 blur-[90px] pointer-events-none" style={{ backgroundColor: avatarInfo.color }}></div>

            {/* Hero Card */}
            <div
                className="relative overflow-hidden rounded-2xl mb-8 p-8 border border-white/10 dark:border-slate-800"
                style={{
                    background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #4c1d95 100%)',
                    animation: 'fadeIn 0.5s ease-out',
                    boxShadow: `0 0 30px ${avatarInfo.color}15`
                }}
            >
                <div className="absolute inset-0 opacity-15" style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 40%)'
                }}></div>

                {/* Help button */}
                <button onClick={() => setShowHelp(true)} className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/5 dark:border-slate-800" title="Hướng dẫn">
                    <HelpCircle className="h-5 w-5 text-white/80" />
                </button>

                <div className="relative flex items-center gap-6">
                    <div
                        className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl shadow-lg border border-white/15 dark:border-slate-800"
                        style={{ backgroundColor: avatarInfo.color, animation: 'float 3s ease-in-out infinite', boxShadow: `0 0 25px ${avatarInfo.color}40` }}
                    >
                        {avatarInfo.emoji}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-purple-300 text-sm font-semibold tracking-wider uppercase" style={{ color: avatarInfo.color }}>{avatarInfo.name}</p>
                            <span className="text-[10px] bg-white/10 px-2.5 py-0.5 rounded border border-white/10 text-purple-300 font-bold uppercase dark:border-slate-800">
                                {arenaProfile.active_title || 'Học Giả Tập Sự'}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black mb-3 text-white tracking-wide">{user?.name}</h1>
                        <div className="flex flex-wrap gap-3 text-sm">
                            <span className="flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/5 dark:border-slate-800">
                                <span className="text-sm">{getLeagueInfo(arenaProfile.elo_rating).badge}</span>
                                <span className="font-bold text-yellow-400">{arenaProfile.elo_rating}</span> Elo ({getLeagueInfo(arenaProfile.elo_rating).name})
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/5 dark:border-slate-800">
                                <Star className="h-4 w-4 text-emerald-400" />
                                <span className="font-bold text-emerald-400">{arenaProfile.total_xp}</span> XP
                            </span>
                            <span className="flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/5 dark:border-slate-800">
                                <Zap className="h-4 w-4 text-blue-400" />
                                <span className="font-semibold text-blue-300">{arenaProfile.wins}W / {arenaProfile.losses}L</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Game Modes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
                {/* AI Dashboard */}
                <button
                    onClick={() => navigate('/arena/dashboard')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border border-pink-500/10 glass-card neon-border dark:border-slate-800"
                    style={{ '--neon-color': 'rgba(244,63,94,0.3)', animation: 'fadeIn 0.5s ease-out 0.05s both' } as any}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Sparkles className="w-full h-full text-pink-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-pink-900/40 group-hover:scale-110 transition-transform">
                            🤖
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-pink-400 transition-colors">Trạm AI</h3>
                        <p className="text-xs text-gray-400">Phân tích & gợi ý học tập</p>
                    </div>
                </button>

                {/* PvP */}
                <button
                    onClick={() => navigate('/arena/pvp')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border border-indigo-500/10 glass-card neon-border dark:border-slate-800"
                    style={{ '--neon-color': 'rgba(99,102,241,0.3)', animation: 'fadeIn 0.5s ease-out 0.1s both' } as any}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Brain className="w-full h-full text-indigo-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-indigo-900/40 group-hover:scale-110 transition-transform">
                            🧠
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-indigo-400 transition-colors">Đấu Trí 1v1</h3>
                        <p className="text-xs text-gray-400">Thách đấu PvP thời gian thực</p>
                    </div>
                </button>

                {/* Tower */}
                <button
                    onClick={() => navigate('/arena/tower')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border border-amber-500/10 glass-card neon-border dark:border-slate-800"
                    style={{ '--neon-color': 'rgba(245,158,11,0.3)', animation: 'fadeIn 0.5s ease-out 0.2s both' } as any}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <GraduationCap className="w-full h-full text-amber-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-amber-900/40 group-hover:scale-110 transition-transform">
                            🎓
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-amber-400 transition-colors">Leo Cấp</h3>
                        <p className="text-xs text-gray-400">Tầng {arenaProfile.tower_floor} • Vượt tháp PvE</p>
                    </div>
                </button>

                {/* Shop */}
                <button
                    onClick={() => navigate('/arena/shop')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border border-purple-500/10 glass-card neon-border dark:border-slate-800"
                    style={{ '--neon-color': 'rgba(168,85,247,0.3)', animation: 'fadeIn 0.5s ease-out 0.25s both' } as any}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <ShoppingBag className="w-full h-full text-purple-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-purple-900/40 group-hover:scale-110 transition-transform">
                            🏪
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-purple-400 transition-colors">Cửa Hàng</h3>
                        <p className="text-xs text-gray-400">Mua trang bị, hỗ trợ đấu trí 1v1</p>
                    </div>
                </button>

                {/* Leaderboard */}
                <button
                    onClick={() => navigate('/arena/leaderboard')}
                    className="relative overflow-hidden p-6 rounded-2xl text-left group transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 border border-emerald-500/10 glass-card neon-border dark:border-slate-800"
                    style={{ '--neon-color': 'rgba(16,185,129,0.3)', animation: 'fadeIn 0.5s ease-out 0.3s both' } as any}
                >
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                        <Trophy className="w-full h-full text-emerald-500" />
                    </div>
                    <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white text-2xl mb-4 shadow-lg shadow-emerald-900/40 group-hover:scale-110 transition-transform">
                            🏆
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-emerald-400 transition-colors">Xếp Hạng</h3>
                        <p className="text-xs text-gray-400">Xem bảng vàng học giả ELO võ đài</p>
                    </div>
                </button>
            </div>
 
            {/* Daily Quests & Badge Collection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                {/* Column 1: Daily Quests */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 dark:border-slate-800">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                        🎯 Nhiệm Vụ Hàng Ngày
                    </h3>
                    <div className="space-y-4">
                        {(arenaProfile.daily_quests || [
                            { id: 'q1', text: 'Vượt tháp thích ứng: Trả lời đúng 5 câu liên tiếp', target: 5, current: 0, reward_xp: 30, completed: false, type: 'correct_streak' },
                            { id: 'q2', text: 'Tích lũy tri thức: Đạt 100% Mastery ở chuyên đề bất kỳ', target: 1, current: 0, reward_xp: 50, completed: false, type: 'mastery_100' },
                            { id: 'q3', text: 'Quyết chiến võ đài: Tham gia 1 trận PvP 1v1', target: 1, current: 0, reward_xp: 30, completed: false, type: 'pvp_match' }
                        ]).map((quest: any) => (
                            <div key={quest.id} className="p-3 bg-[#080d16] rounded-xl border border-white/5 space-y-2 dark:border-slate-800">
                                <div className="flex justify-between items-start gap-2">
                                    <p className={`text-xs font-bold leading-relaxed ${quest.completed ? 'text-gray-500 line-through' : 'text-gray-200'} `}>
                                        {quest.text}
                                    </p>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded whitespace-nowrap ${quest.completed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'} `}>
                                        +{quest.reward_xp} XP
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${(quest.current / quest.target) * 100}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">{quest.current}/{quest.target}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Column 2: Badge Collection */}
                <div className="glass-card rounded-2xl p-6 border border-white/5 dark:border-slate-800">
                    <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                        🏆 Bộ Sưu Tập Huy Hiệu
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { id: 'math_genius', name: 'Thiên Tài Trí Tuệ', desc: 'Đúng 10 câu liên tiếp', emoji: '🌟' },
                            { id: 'tower_master', name: 'Bậc Thầy Chinh Phục', desc: 'Làm chủ 100% chuyên đề', emoji: '🏆' },
                            { id: 'elo_champion', name: 'Nhà Thông Thái Vô Song', desc: 'Đạt thứ hạng Elo >= 1500', emoji: '👑' },
                            { id: 'pvp_conqueror', name: 'Chiến Thần Võ Đài', desc: 'Thắng 5 trận PvP 1v1', emoji: '⚔️' }
                        ].map(badge => {
                            const isUnlocked = arenaProfile.unlocked_badges?.includes(badge.id);
                            return (
                                <div 
                                    key={badge.id}
                                    className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all dark:border-slate-800 ${
                                        isUnlocked 
                                            ? 'border-purple-500/30 bg-purple-950/10 text-white shadow-md shadow-purple-950/20' 
                                            : 'border-white/5 bg-white/5 text-gray-500 opacity-40'
                                    } `}
                                >
                                    <span className={`text-3xl mb-1.5 ${isUnlocked ? 'animate-pulse' : 'filter grayscale'} `}>{badge.emoji}</span>
                                    <h4 className="text-xs font-black truncate w-full">{badge.name}</h4>
                                    <p className="text-[9px] text-gray-400 mt-1 leading-tight">{badge.desc}</p>
                                    {isUnlocked ? (
                                        <span className="text-[8px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded mt-1.5 font-bold uppercase">Đã mở khóa</span>
                                    ) : (
                                        <span className="text-[8px] bg-white/5 text-gray-500 px-1.5 py-0.5 rounded mt-1.5 font-bold uppercase dark:text-slate-500">Chưa mở khóa</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
                    <div className="bg-[#090d16] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto dark:border-slate-800" onClick={e => e.stopPropagation()} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                        <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#090d16] z-10 rounded-t-2xl dark:border-slate-800">
                            <h3 className="font-bold text-lg text-white flex items-center gap-2">
                                <HelpCircle className="h-5 w-5 text-purple-400" /> Hướng dẫn Đấu Trường
                            </h3>
                            <button onClick={() => setShowHelp(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4 text-gray-300">
                            {/* Elo */}
                            <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Trophy className="h-5 w-5 text-yellow-400" />
                                    <h4 className="font-bold text-yellow-300">Elo — Điểm Xếp Hạng</h4>
                                </div>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Bắt đầu với <strong className="text-yellow-400">1000 Elo</strong></li>
                                    <li>• <span className="text-emerald-400 font-bold">Thắng PvP</span> → Elo tăng · <span className="text-red-400 font-bold">Thua</span> → Elo giảm</li>
                                    <li className="text-xs text-gray-400 italic">💡 Thắng đối thủ Elo cao hơn → nhận nhiều điểm hơn!</li>
                                </ul>
                            </div>

                            {/* XP */}
                            <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Star className="h-5 w-5 text-emerald-400" />
                                    <h4 className="font-bold text-emerald-300">XP — Điểm Kinh Nghiệm</h4>
                                </div>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Trả lời đúng → +XP · Chỉ <strong>tăng, không giảm</strong></li>
                                    <li>• Leo Cấp: +10 XP + bonus tầng · PvP: thắng trận → +XP</li>
                                </ul>
                            </div>

                            {/* W/L */}
                            <div className="bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-5 w-5 text-blue-400" />
                                    <h4 className="font-bold text-blue-300">W / L — Thắng / Thua</h4>
                                </div>
                                <p className="text-sm text-gray-300"><strong className="text-emerald-400">W</strong> = Số trận thắng · <strong className="text-red-400">L</strong> = Số trận thua PvP 1v1</p>
                            </div>

                            {/* Streak Combo */}
                            <div className="bg-orange-950/30 border border-orange-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🔥</span>
                                    <h4 className="font-bold text-orange-300">Streak Combo — Chuỗi đúng</h4>
                                </div>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• 2 câu đúng liên tiếp → 🔥 <strong className="text-orange-400">Combo x1.5</strong> sát thương</li>
                                    <li>• 3 câu đúng liên tiếp → 🔥🔥 <strong className="text-orange-300">Combo x2</strong></li>
                                    <li>• 4+ câu đúng liên tiếp → ⚡ <strong className="text-red-400 font-bold">ULTIMATE x3!</strong></li>
                                    <li className="text-xs text-gray-400 italic">💡 Tập trung trả lời đúng liên tiếp để gây sát thương khủng!</li>
                                </ul>
                            </div>

                            {/* Speed Bonus */}
                            <div className="bg-cyan-950/30 border border-cyan-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">⚡</span>
                                    <h4 className="font-bold text-cyan-300">Speed Bonus — Tốc độ</h4>
                                </div>
                                <ul className="text-sm text-gray-300 space-y-1">
                                    <li>• Trả lời dưới 3s → ⚡ <strong className="text-cyan-400">"Tia Chớp!" x2.0</strong></li>
                                    <li>• Trả lời dưới 5s → 🏃 <strong>"Nhanh Trí!" x1.5</strong></li>
                                    <li>• Trả lời sau 10s → sát thương <strong className="text-red-400">giảm 20%</strong></li>
                                </ul>
                            </div>

                            {/* Skill theo vai trò */}
                            <div className="bg-violet-950/30 border border-violet-500/20 rounded-xl p-4 dark:border-slate-800">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">🃏</span>
                                    <h4 className="font-bold text-violet-300">Kỹ năng đặc biệt (1 lần/trận)</h4>
                                </div>
                                <div className="text-sm text-gray-300 space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <span>📖</span>
                                        <span><strong>Nhà Thông Thái</strong> → <span className="text-indigo-400 font-bold">50/50</span>: Loại 2 đáp án sai</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🔬</span>
                                        <span><strong>Nhà Khoa Học</strong> → <span className="text-purple-400 font-bold">+5 giây</span>: Thêm thời gian</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🎨</span>
                                        <span><strong>Nghệ Sĩ</strong> → <span className="text-emerald-400 font-bold">Lá Chắn</span>: Sai không mất HP</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span>🌍</span>
                                        <span><strong>Nhà Thám Hiểm</strong> → <span className="text-amber-400 font-bold">Hồi HP</span>: Hồi 15 HP</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
