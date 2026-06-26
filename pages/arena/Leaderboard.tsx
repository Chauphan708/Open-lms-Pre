
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaProfile } from '../../types';
import { ArrowLeft, Trophy, Medal, Crown, TrendingUp, Brain } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = {
    scholar: '📖', scientist: '🔬', artist: '🎨', explorer: '🌍'
};
const AVATAR_NAMES: Record<string, string> = {
    scholar: 'Nhà Thông Thái', scientist: 'Nhà Khoa Học', artist: 'Nghệ Sĩ', explorer: 'Nhà Thám Hiểm'
};

export const Leaderboard: React.FC = () => {
    const { fetchLeaderboard, users } = useStore();
    const navigate = useNavigate();
    const [rankings, setRankings] = useState<(ArenaProfile & { name?: string })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard().then(profiles => {
            const enriched = profiles.map(p => ({
                ...p,
                name: users.find(u => u.id === p.id)?.name || 'Ẩn danh'
            }));
            setRankings(enriched);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full dark:border-slate-800" style={{ animation: 'spin 1s linear infinite' }}></div>
                    <p className="mt-4 text-gray-500 dark:text-slate-500">Đang tải bảng xếp hạng...</p>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const top3 = rankings.slice(0, 3);
    const rest = rankings.slice(3);

    return (
        <div className="max-w-3xl mx-auto">
            <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-5px); } }
        @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes crown { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
      `}</style>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6" style={{ animation: 'fadeIn 0.4s ease-out' }}>
                <button onClick={() => navigate('/arena')} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="h-5 w-5" /></button>
                <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 dark:text-slate-100">
                    <Trophy className="h-7 w-7 text-amber-500" /> Bảng Xếp Hạng Học Giả
                </h1>
            </div>

            {/* Top 3 Podium */}
            {top3.length > 0 && (
                <div className="flex items-end justify-center gap-3 mb-8 px-4" style={{ animation: 'fadeIn 0.5s ease-out 0.1s both' }}>
                    {/* 2nd */}
                    {top3[1] && (
                        <div className="flex-1 text-center">
                            <div className="bg-gradient-to-b from-gray-100 to-gray-200 rounded-t-2xl p-4 border border-gray-200 dark:border-slate-800">
                                <Medal className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                                <div className="w-14 h-14 mx-auto rounded-xl bg-gray-600 text-3xl flex items-center justify-center mb-2 shadow-lg">
                                    {AVATAR_EMOJIS[top3[1].avatar_class] || '📖'}
                                </div>
                                <p className="font-bold text-gray-900 text-sm truncate dark:text-slate-100">{top3[1].name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-500">{AVATAR_NAMES[top3[1].avatar_class] || 'Học giả'}</p>
                                <p className="text-lg font-black text-indigo-600 mt-1">{top3[1].elo_rating}</p>
                            </div>
                            <div className="bg-gray-300 text-gray-700 py-2 font-bold text-2xl rounded-b-xl dark:text-slate-300">2</div>
                        </div>
                    )}

                    {/* 1st */}
                    {top3[0] && (
                        <div className="flex-1 text-center">
                            <div className="bg-gradient-to-b from-amber-50 to-amber-100 rounded-t-2xl p-5 border-2 border-amber-300 relative dark:border-slate-800">
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2" style={{ animation: 'crown 2s ease-in-out infinite' }}>
                                    <Crown className="h-8 w-8 text-amber-500 fill-amber-500" />
                                </div>
                                <div className="w-20 h-20 mx-auto rounded-xl bg-amber-600 text-4xl flex items-center justify-center mb-2 shadow-xl" style={{ animation: 'float 2s ease-in-out infinite' }}>
                                    {AVATAR_EMOJIS[top3[0].avatar_class] || '📖'}
                                </div>
                                <p className="font-bold text-gray-900 truncate dark:text-slate-100">{top3[0].name}</p>
                                <p className="text-xs text-amber-600">{AVATAR_NAMES[top3[0].avatar_class] || 'Học giả'}</p>
                                <p className="text-xl font-black text-amber-600 mt-1">{top3[0].elo_rating}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-500">{top3[0].wins}W/{top3[0].losses}L</p>
                            </div>
                            <div className="bg-amber-400 text-amber-900 py-2 font-black text-2xl rounded-b-xl">🏆 1</div>
                        </div>
                    )}

                    {/* 3rd */}
                    {top3[2] && (
                        <div className="flex-1 text-center">
                            <div className="bg-gradient-to-b from-orange-50 to-orange-100 rounded-t-2xl p-4 border border-orange-200 dark:border-slate-800">
                                <Medal className="h-6 w-6 mx-auto text-orange-400 mb-2" />
                                <div className="w-14 h-14 mx-auto rounded-xl bg-orange-500 text-3xl flex items-center justify-center mb-2 shadow-lg">
                                    {AVATAR_EMOJIS[top3[2].avatar_class] || '📖'}
                                </div>
                                <p className="font-bold text-gray-900 text-sm truncate dark:text-slate-100">{top3[2].name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-500">{AVATAR_NAMES[top3[2].avatar_class] || 'Học giả'}</p>
                                <p className="text-lg font-black text-orange-600 mt-1">{top3[2].elo_rating}</p>
                            </div>
                            <div className="bg-orange-300 text-orange-800 py-2 font-bold text-2xl rounded-b-xl">3</div>
                        </div>
                    )}
                </div>
            )}

            {/* Main Rankings */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden dark:bg-slate-900 dark:border-slate-800" style={{ animation: 'fadeIn 0.5s ease-out 0.2s both' }}>
                <div className="p-4 border-b bg-gray-50 dark:border-slate-800 dark:bg-slate-900/50">
                    <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide dark:text-slate-300">Tất cả học giả</h3>
                </div>
                <div className="divide-y">
                    {rankings.map((profile, idx) => (
                        <div key={profile.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-slate-850/50"
                            style={{ animation: `fadeIn 0.3s ease-out ${0.3 + idx * 0.03}s both` }}>
                            <span className={`w-8 text-center font-bold text-sm ${idx < 3 ? 'text-amber-500' : 'text-gray-400'}`}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                            </span>
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg dark:bg-slate-850">
                                {AVATAR_EMOJIS[profile.avatar_class] || '📖'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate dark:text-slate-100">{profile.name}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-500">{AVATAR_NAMES[profile.avatar_class] || 'Học giả'} • {profile.wins}W/{profile.losses}L</p>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-indigo-600">{profile.elo_rating}</p>
                                <p className="text-xs text-gray-400">{profile.total_xp} XP</p>
                            </div>
                        </div>
                    ))}
                    {rankings.length === 0 && (
                        <div className="p-8 text-center text-gray-400">
                            <Brain className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            Chưa có học giả nào!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
