import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { generateArenaStudyGuide } from '../../services/geminiService';
import { ArrowLeft, Sparkles, Brain, Target, Bot, AlertTriangle, ChevronRight, TrendingUp, HelpCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Core topics mapping for dynamic SVG knowledge graph
const KNOWLEDGE_NODES = [
  { id: 'fractions', label: 'Phân Số', x: 70, y: 70, topic: 'Phân số', subject: 'math' },
  { id: 'decimals', label: 'Số Thập Phân', x: 200, y: 50, topic: 'Số thập phân', subject: 'math' },
  { id: 'geometry', label: 'Hình Học', x: 110, y: 170, topic: 'Hình học', subject: 'math' },
  { id: 'measurement', label: 'Số Đo Thời Gian', x: 280, y: 130, topic: 'Số đo thời gian', subject: 'math' },
  { id: 'motion', label: 'Chuyển Động Đều', x: 230, y: 210, topic: 'Chuyển động đều', subject: 'math' },
];

const KNOWLEDGE_LINKS = [
  { from: 'fractions', to: 'decimals' },
  { from: 'decimals', to: 'measurement' },
  { from: 'fractions', to: 'geometry' },
  { from: 'geometry', to: 'motion' },
  { from: 'measurement', to: 'motion' },
];

export const ArenaDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, attempts, exams, questionBank } = useStore();
    const [analytics, setAnalytics] = useState<any>(null);
    const [aiGuide, setAiGuide] = useState<string>('');
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [selectedNode, setSelectedNode] = useState<any>(null);

    useEffect(() => {
        if (!user) return;
        // Tính toán dựa trên 30 ngày gần nhất
        const result = computeStudentAnalytics(user.id, attempts, exams, questionBank, 30);
        setAnalytics(result);

        // Mặc định chọn node yếu nhất khi vừa tải trang
        if (result.weakTopics && result.weakTopics.length > 0) {
            const weakest = result.weakTopics[0];
            const matchingNode = KNOWLEDGE_NODES.find(n => weakest.topic.toLowerCase().includes(n.topic.toLowerCase())) || KNOWLEDGE_NODES[0];
            setSelectedNode(matchingNode);
            fetchAiGuide(weakest.topic, weakest.subject, weakest.incorrectRate);
        } else {
            setSelectedNode(KNOWLEDGE_NODES[0]);
            fetchAiGuide(KNOWLEDGE_NODES[0].topic, KNOWLEDGE_NODES[0].subject, 0);
        }
    }, [user, attempts, exams, questionBank]);

    const fetchAiGuide = async (topic: string, subject: string, incorrectRate: number) => {
        setIsLoadingAi(true);
        try {
            const guide = await generateArenaStudyGuide(topic, subject, incorrectRate);
            setAiGuide(guide);
        } catch (error) {
            console.error(error);
            setAiGuide("AI đang bận hoặc vượt quá giới hạn truy cập. Em vui lòng thử lại sau nhé!");
        } finally {
            setIsLoadingAi(false);
        }
    };

    if (!user || !analytics) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center bg-[#030712]">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 dark:border-slate-800"></div>
            </div>
        );
    }

    const { weakTopics, avgScore, totalAttempts, byDifficulty } = analytics;

    return (
        <div className="max-w-4xl mx-auto pb-12 px-4 bg-[#030712] rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden min-h-[90vh] text-gray-100 dark:border-slate-800">
            <style>{`
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-slide-up { animation: slideUp 0.5s ease-out forwards; }
                .markdown-body ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
                .markdown-body p { margin-bottom: 0.75rem !important; }
                .markdown-body strong { color: #818cf8; }
                .glass-panel { background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.08); }
            `}</style>

            {/* Glowing ambient dots */}
            <div className="absolute top-0 right-1/4 w-80 h-80 bg-purple-500/5 rounded-full blur-[90px] pointer-events-none"></div>
            <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[90px] pointer-events-none"></div>
            
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5 mt-4 dark:border-slate-800">
                <button onClick={() => navigate('/arena')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-xl font-black text-white flex items-center gap-2">
                        <Brain className="h-6 w-6 text-purple-400" />
                        Trạm Phân Tích AI
                    </h1>
                    <p className="text-sm text-gray-400">Xem sơ đồ tri thức SVG động & Kê đơn học tập thích ứng</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
                
                {/* Left Column: Stats & Weaknesses */}
                <div className="col-span-1 space-y-6">
                    {/* Overview Stats */}
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-lg animate-slide-up border border-white/10 dark:border-slate-800">
                        <div className="text-purple-200 text-sm mb-4 font-semibold tracking-wide uppercase">Tổng quan (30 ngày)</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-3xl font-black text-white">{avgScore.toFixed(1)}</div>
                                <div className="text-xs text-purple-200 mt-1">Điểm Trung Bình</div>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-white">{totalAttempts}</div>
                                <div className="text-xs text-purple-200 mt-1">Trận Đấu & Bài Tập</div>
                            </div>
                        </div>
                    </div>

                    {/* Weak Topics */}
                    <div className="glass-panel rounded-2xl p-5 border-red-500/10 animate-slide-up dark:border-slate-800" style={{ animationDelay: '0.1s' }}>
                        <div className="flex items-center gap-2 mb-4">
                            <Target className="h-5 w-5 text-rose-500" />
                            <h2 className="font-bold text-white">Cảnh báo Lỗ hổng</h2>
                        </div>
                        
                        {weakTopics.length > 0 ? (
                            <div className="space-y-4">
                                {weakTopics.slice(0, 3).map((topic: any, idx: number) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-semibold text-gray-200 truncate pr-2 flex-1">{topic.topic}</span>
                                            <span className="text-rose-400 font-bold whitespace-nowrap">Sai {topic.incorrectRate}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 dark:border-slate-800">
                                            <div 
                                                className="h-full bg-gradient-to-r from-red-500 to-rose-600 rounded-full"
                                                style={{ width: `${topic.incorrectRate}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-emerald-400 bg-emerald-950/20 rounded-xl border border-emerald-500/10 dark:border-slate-800">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-80" />
                                <p className="font-bold text-sm">Tuyệt vời! Kiến thức đang rất vững chắc.</p>
                            </div>
                        )}
                    </div>

                    {/* Difficulty Stats */}
                    <div className="glass-panel rounded-2xl p-5 border-white/5 animate-slide-up dark:border-slate-800" style={{ animationDelay: '0.2s' }}>
                        <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                            Mức độ chinh phục
                        </h2>
                        <div className="space-y-3">
                            {byDifficulty.map((diff: any) => (
                                <div key={diff.level} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 dark:border-slate-800">
                                    <span className="text-sm font-semibold text-gray-300">{diff.label}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-gray-400">{diff.correctQuestions}/{diff.totalQuestions} đúng</span>
                                        <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${diff.correctRate > 70 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : diff.correctRate > 40 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'} `}>
                                            {diff.correctRate}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: AI Personalization & SVG Graph */}
                <div className="col-span-1 md:col-span-2 space-y-6">
                    {/* SVG Tri thức */}
                    <div className="glass-panel rounded-3xl p-6 border-white/5 animate-slide-up dark:border-slate-800" style={{ animationDelay: '0.25s' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-base flex items-center gap-1.5">
                                <Sparkles className="h-4.5 w-4.5 text-purple-400" /> Bản đồ Tri thức của con
                            </h3>
                            <span className="text-xs text-gray-400 italic">Nhấn vào từng node để chẩn đoán</span>
                        </div>
                        
                        <div className="relative">
                            <svg viewBox="0 0 350 240" className="w-full h-auto bg-[#070b13] rounded-2xl border border-white/5 p-4 shadow-inner dark:border-slate-800">
                                <defs>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="6" result="blur" />
                                        <feMerge>
                                            <feMergeNode in="blur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                
                                {/* Links lines */}
                                {KNOWLEDGE_LINKS.map((link, idx) => {
                                    const fromNode = KNOWLEDGE_NODES.find(n => n.id === link.from)!;
                                    const toNode = KNOWLEDGE_NODES.find(n => n.id === link.to)!;
                                    return (
                                        <line 
                                            key={idx}
                                            x1={fromNode.x}
                                            y1={fromNode.y}
                                            x2={toNode.x}
                                            y2={toNode.y}
                                            stroke="rgba(255, 255, 255, 0.08)"
                                            strokeWidth="2.5"
                                            strokeDasharray="4 4"
                                        />
                                    );
                                })}

                                {/* Active connection glowing paths */}
                                {selectedNode && KNOWLEDGE_LINKS.filter(l => l.from === selectedNode.id || l.to === selectedNode.id).map((link, idx) => {
                                    const fromNode = KNOWLEDGE_NODES.find(n => n.id === link.from)!;
                                    const toNode = KNOWLEDGE_NODES.find(n => n.id === link.to)!;
                                    return (
                                        <line 
                                            key={`act-${idx}`}
                                            x1={fromNode.x}
                                            y1={fromNode.y}
                                            x2={toNode.x}
                                            y2={toNode.y}
                                            stroke="rgba(139, 92, 246, 0.3)"
                                            strokeWidth="3.5"
                                            filter="url(#glow)"
                                        />
                                    );
                                })}
                                
                                {/* Nodes */}
                                {KNOWLEDGE_NODES.map(node => {
                                    const weakInfo = weakTopics.find((t: any) => t.topic.toLowerCase().includes(node.topic.toLowerCase()));
                                    const incorrect = weakInfo ? weakInfo.incorrectRate : 0;
                                    const correct = 100 - incorrect;
                                    
                                    let color = '#ef4444'; // weak
                                    if (correct >= 80) color = '#10b981'; // mastered
                                    else if (correct >= 40) color = '#f59e0b'; // progressing
                                    
                                    const isSelected = selectedNode?.id === node.id;
                                    
                                    return (
                                        <g 
                                            key={node.id} 
                                            className="cursor-pointer group"
                                            onClick={() => {
                                                setSelectedNode(node);
                                                fetchAiGuide(node.topic, node.subject, incorrect);
                                            }}
                                        >
                                            {/* Outer Ring */}
                                            <circle 
                                                cx={node.x}
                                                cy={node.y}
                                                r={isSelected ? 22 : 16}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth={isSelected ? 4 : 2}
                                                opacity={isSelected ? 0.9 : 0.4}
                                                filter={isSelected ? "url(#glow)" : ""}
                                                className="transition-all duration-300 group-hover:opacity-90"
                                            />
                                            {/* Center Dot */}
                                            <circle 
                                                cx={node.x}
                                                cy={node.y}
                                                r={isSelected ? 9 : 7}
                                                fill={color}
                                                className="transition-all duration-300 group-hover:scale-125"
                                            />
                                            {/* Topic Name */}
                                            <text 
                                                x={node.x}
                                                y={node.y + 28}
                                                textAnchor="middle"
                                                fill={isSelected ? "#ffffff" : "#9ca3af"}
                                                className="text-[10px] font-bold select-none transition-colors duration-300 group-hover:fill-white"
                                            >
                                                {node.label}
                                            </text>
                                            {/* Score */}
                                            <text 
                                                x={node.x}
                                                y={node.y - 18}
                                                textAnchor="middle"
                                                fill={color}
                                                className="text-[9px] font-black select-none opacity-80"
                                            >
                                                {correct}%
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        </div>
                    </div>

                    {/* Bác sĩ học tập AI */}
                    <div className="glass-panel rounded-3xl p-6 border-white/5 animate-slide-up dark:border-slate-800" style={{ animationDelay: '0.3s' }}>
                        <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 dark:border-slate-800">
                            <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 dark:border-slate-800">
                                <Bot className="h-7 w-7 text-white animate-bounce" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-white">Bác Sĩ Học Tập AI</h2>
                                <p className="text-xs text-gray-400">Kê đơn tư vấn hướng dẫn lý thuyết cá nhân hóa</p>
                            </div>
                        </div>

                        <div>
                            {selectedNode && (
                                <div>
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-950/40 text-purple-400 rounded-full text-xs font-bold mb-6 border border-purple-500/20 dark:border-slate-800">
                                        <AlertTriangle className="h-4 w-4" />
                                        Đang chẩn đoán mảng: {selectedNode.topic}
                                    </div>
                                    
                                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/5 dark:border-slate-800">
                                        {isLoadingAi ? (
                                            <div className="py-12 flex flex-col items-center">
                                                <div className="w-16 h-16 relative mb-4">
                                                    <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin dark:border-slate-800"></div>
                                                    <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin dark:border-slate-800" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                                                    <Bot className="absolute inset-0 m-auto h-6 w-6 text-indigo-400" />
                                                </div>
                                                <p className="text-indigo-400 text-sm font-semibold animate-pulse">Bác sĩ AI đang lục lại dữ liệu cache và lập bài giảng cho em...</p>
                                            </div>
                                        ) : (
                                            <div className="prose prose-invert max-w-none markdown-body text-gray-200 text-[14px] leading-relaxed">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                >
                                                    {aiGuide}
                                                </ReactMarkdown>
                                                
                                                <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between dark:border-slate-800">
                                                    <span className="text-[10px] text-gray-500 italic dark:text-slate-500">Phản hồi được sinh tự động và tối ưu hóa cache bởi AI OpenLMS</span>
                                                    <button 
                                                        onClick={() => {
                                                            const weakInfo = weakTopics.find((t: any) => t.topic.toLowerCase().includes(selectedNode.topic.toLowerCase()));
                                                            fetchAiGuide(selectedNode.topic, selectedNode.subject, weakInfo ? weakInfo.incorrectRate : 0);
                                                        }}
                                                        className="text-xs font-bold flex items-center gap-1 text-purple-400 hover:text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-colors dark:border-slate-800"
                                                    >
                                                        ✨ Nhờ AI chẩn đoán lại
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => navigate('/arena/tower')}
                                        className="mt-6 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 group transition-all shadow-md shadow-indigo-900/30"
                                    >
                                        Luyện tập Phục thù mảng này tại Tháp Arena
                                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
