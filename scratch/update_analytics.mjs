import fs from 'fs';
import path from 'path';

const filePath = 'e:/antigravity_projects/ptchau1708/Open-lms-Pre/pages/teacher/TeacherAnalytics.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. RateBar & WeakTopicCard
const rateBarOrig = `const RateBar: React.FC<{ label: string; rate: number; color: string }> = ({ label, rate, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="font-bold text-gray-900">{rate}%</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-3">`;

const rateBarNew = `const RateBar: React.FC<{ label: string; rate: number; color: string }> = ({ label, rate, color }) => (
  <div>
    <div className="flex justify-between text-sm mb-1">
      <span className="font-medium text-gray-700 dark:text-slate-350">{label}</span>
      <span className="font-bold text-gray-900 dark:text-slate-105">{rate}%</span>
    </div>
    <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-3">`;

content = content.replace(rateBarOrig, rateBarNew);

const weakTopicOrig = `const WeakTopicCard: React.FC<{ topic: string; subject: string; rate: number; attempts: number }> = ({ topic, subject, rate, attempts }) => (
  <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-xl">
    <div className="min-w-0">
      <div className="font-bold text-red-800 text-sm truncate">{topic}</div>
      <div className="text-xs text-red-650">{subject} • {attempts} lần làm</div>
    </div>
    <div className="ml-3 flex-shrink-0">
      <span className="inline-block bg-red-100 text-red-700 font-bold text-xs px-2 py-1 rounded-full">{rate}% sai</span>
    </div>
  </div>
);`;

const weakTopicNew = `const WeakTopicCard: React.FC<{ topic: string; subject: string; rate: number; attempts: number }> = ({ topic, subject, rate, attempts }) => (
  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 rounded-xl">
    <div className="min-w-0">
      <div className="font-bold text-red-800 dark:text-red-400 text-sm truncate">{topic}</div>
      <div className="text-xs text-red-650 dark:text-red-300/80">{subject} • {attempts} lần làm</div>
    </div>
    <div className="ml-3 flex-shrink-0">
      <span className="inline-block bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-bold text-xs px-2 py-1 rounded-full">{rate}% sai</span>
    </div>
  </div>
);`;

content = content.replace(weakTopicOrig, weakTopicNew);

// 2. ComparisonView container & table styles
content = content.replace(
  `      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-gray-50/50">`,
  `      <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">`
);

content = content.replace(
  `<tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">`,
  `<tr className="bg-gray-50 dark:bg-slate-850 text-gray-505 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">`
);

content = content.replace(
  `<tbody className="divide-y divide-gray-100">`,
  `<tbody className="divide-y divide-gray-100 dark:divide-slate-800">`
);

content = content.replace(
  `<tr key={i} className="hover:bg-gray-50/50 transition-colors">`,
  `<tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-slate-850/50 transition-colors">`
);

content = content.replace(
  `<div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">`,
  `<div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">`
);

content = content.replace(
  `<div className="font-bold text-gray-900 text-sm">{item.student.name}</div>`,
  `<div className="font-bold text-gray-900 dark:text-slate-100 text-sm">{item.student.name}</div>`
);

content = content.replace(
  `<td className="px-6 py-4 text-center text-sm font-medium text-gray-600">{item.stats.totalAttempts}</td>`,
  `<td className="px-6 py-4 text-center text-sm font-medium text-gray-650 dark:text-slate-400">{item.stats.totalAttempts}</td>`
);

content = content.replace(
  `item.stats.avgScore >= 8 ? 'bg-emerald-100 text-emerald-700' :
                      item.stats.avgScore >= 5 ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-700'`,
  `item.stats.avgScore >= 8 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-755 dark:text-emerald-300' :
                      item.stats.avgScore >= 5 ? 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-755 dark:text-indigo-300' : 'bg-red-100 dark:bg-red-950/40 text-red-755 dark:text-red-300'`
);

content = content.replace(
  `<td className="px-6 py-4 text-center text-sm font-bold text-gray-700">{fmt(item.stats.maxScore)}</td>`,
  `<td className="px-6 py-4 text-center text-sm font-bold text-gray-700 dark:text-slate-300">{fmt(item.stats.maxScore)}</td>`
);

content = content.replace(
  `<td className="px-6 py-4 text-center text-sm font-medium text-gray-505">#{i + 1}</td>`,
  `<td className="px-6 py-4 text-center text-sm font-medium text-gray-500 dark:text-slate-500">#{i + 1}</td>`
);

// Charts grid in ComparisonView
content = content.replace(
  `<div key={i} className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col h-full">`,
  `<div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 flex flex-col h-full">`
);

content = content.replace(
  `<h3 className="font-bold text-gray-800 mb-4 flex items-center justify-between">`,
  `<h3 className="font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center justify-between">`
);

content = content.replace(
  `<span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">TB: {fmt(item.stats.avgScore)}</span>`,
  `<span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-1 rounded-lg">TB: {fmt(item.stats.avgScore)}</span>`
);

// Group recommendations in ComparisonView
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6 no-print">
          <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 no-print">
          <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-6 flex items-center gap-2">`
);

content = content.replace(
  `<div className="flex items-center gap-2 border-b pb-2">`,
  `<div className="flex items-center gap-2 border-b dark:border-slate-800 pb-2">`
);

content = content.replace(
  `<div className="h-6 w-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">`,
  `<div className="h-6 w-6 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-[10px] font-bold">`
);

content = content.replace(
  `<span className="text-sm font-bold text-gray-700">{gr.student.name}</span>`,
  `<span className="text-sm font-bold text-gray-700 dark:text-slate-300">{gr.student.name}</span>`
);

content = content.replace(
  `<div key={rIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition-all">`,
  `<div key={rIdx} className="p-3 bg-gray-50 dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-850 hover:border-purple-200 dark:hover:border-purple-900/40 transition-all">`
);

content = content.replace(
  `<div className="text-xs font-bold text-gray-900 mb-1 line-clamp-1">{rec.exam.title}</div>`,
  `<div className="text-xs font-bold text-gray-900 dark:text-slate-100 mb-1 line-clamp-1">{rec.exam.title}</div>`
);

content = content.replace(
  `<div className="text-[10px] text-purple-600 font-medium uppercase mb-1">{rec.exam.subject}</div>`,
  `<div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium uppercase mb-1">{rec.exam.subject}</div>`
);

content = content.replace(
  `<div className="text-[10px] text-gray-500 italic line-clamp-2">"{rec.reasons[0]}"</div>`,
  `<div className="text-[10px] text-gray-500 dark:text-slate-400 italic line-clamp-2">"{rec.reasons[0]}"</div>`
);

// 3. ArenaClassAnalytics loading/empty states
content = content.replace(
  `<div className="flex flex-col items-center justify-center p-16 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu Đấu Trường từ Cloud...</p>
      </div>`,
  `<div className="flex flex-col items-center justify-center p-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm animate-pulse text-gray-900 dark:text-slate-100">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-gray-500 dark:text-slate-400 font-medium">Đang tổng hợp dữ liệu Đấu Trường từ Cloud...</p>
      </div>`
);

content = content.replace(
  `<div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center">
        <Trophy className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-bold text-gray-600">Đấu Trường Arena</h3>
        <p className="text-gray-400">Không có học sinh nào trong lớp để hiển thị báo cáo.</p>
      </div>`,
  `<div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-250 dark:border-slate-800 p-16 text-center text-gray-900 dark:text-slate-105">
        <Trophy className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
        <h3 className="text-xl font-bold text-gray-600 dark:text-slate-300">Đấu Trường Arena</h3>
        <p className="text-gray-400 dark:text-slate-500">Không có học sinh nào trong lớp để hiển thị báo cáo.</p>
      </div>`
);

// Top Cards Summary
content = content.replace(
  `<div className="space-y-6 animate-in fade-in duration-500">`,
  `<div className="space-y-6 animate-in fade-in duration-500 text-gray-900 dark:text-slate-100">`
);

content = content.replace(
  `<div className="bg-gradient-to-br from-amber-50 to-white p-5 rounded-2xl border border-amber-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Elo Trung Bình</span>
            <Trophy className="h-5 w-5 text-amber-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-950">{avgElo}</div>
          <div className="text-[10px] text-amber-600/80 font-medium mt-1">Tổng điểm học lực cả lớp</div>
        </div>`,
  `<div className="bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Elo Trung Bình</span>
            <Trophy className="h-5 w-5 text-amber-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-950 dark:text-amber-300">{avgElo}</div>
          <div className="text-[10px] text-amber-600/80 dark:text-amber-400/80 font-medium mt-1">Tổng điểm học lực cả lớp</div>
        </div>`
);

content = content.replace(
  `<div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-2xl border border-emerald-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Tỷ Lệ Thắng Lớp</span>
            <Award className="h-5 w-5 text-emerald-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-950">{avgWinRate}%</div>
          <div className="text-[10px] text-emerald-600/80 font-medium mt-1">Trung bình tỉ lệ thắng PvP</div>
        </div>`,
  `<div className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Tỷ Lệ Thắng Lớp</span>
            <Award className="h-5 w-5 text-emerald-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-950 dark:text-emerald-300">{avgWinRate}%</div>
          <div className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-medium mt-1">Trung bình tỉ lệ thắng PvP</div>
        </div>`
);

content = content.replace(
  `<div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Tầng Vượt Tháp</span>
            <TrendingUp className="h-5 w-5 text-indigo-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-indigo-950">Tầng {avgFloor}</div>
          <div className="text-[10px] text-indigo-600/80 font-medium mt-1">Độ cao trung bình Vượt tháp</div>
        </div>`,
  `<div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Tầng Vượt Tháp</span>
            <TrendingUp className="h-5 w-5 text-indigo-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-indigo-950 dark:text-indigo-300">Tầng {avgFloor}</div>
          <div className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 font-medium mt-1">Độ cao trung bình Vượt tháp</div>
        </div>`
);

content = content.replace(
  `<div className="bg-gradient-to-br from-purple-50 to-white p-5 rounded-2xl border border-purple-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wider">Tổng Trận PvP</span>
            <Zap className="h-5 w-5 text-purple-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-purple-950">{totalGames}</div>
          <div className="text-[10px] text-purple-600/80 font-medium mt-1">Tổng lượt thi đấu PvP tích lũy</div>
        </div>`,
  `<div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/30 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Tổng Trận PvP</span>
            <Zap className="h-5 w-5 text-purple-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-purple-950 dark:text-purple-300">{totalGames}</div>
          <div className="text-[10px] text-purple-600/80 dark:text-purple-400/80 font-medium mt-1">Tổng lượt thi đấu PvP tích lũy</div>
        </div>`
);

content = content.replace(
  `<div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Giải Đấu Đã Tạo</span>
            <Trophy className="h-5 w-5 text-rose-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-950">{tournaments.length}</div>
          <div className="text-[10px] text-rose-600/80 font-medium mt-1">Tổng số giải đấu Arena tổ chức</div>
        </div>`,
  `<div className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-slate-900 p-5 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-xs relative overflow-hidden group hover:shadow-md transition-all duration-300">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/5 rounded-bl-full group-hover:scale-110 transition-transform duration-300" />
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Giải Đấu Đã Tạo</span>
            <Trophy className="h-5 w-5 text-rose-500 group-hover:rotate-12 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-950 dark:text-rose-300">{tournaments.length}</div>
          <div className="text-[10px] text-rose-600/80 dark:text-rose-400/80 font-medium mt-1">Tổng số giải đấu Arena tổ chức</div>
        </div>`
);

// Charts sections
content = content.replace(
  `<div className="bg-white p-6 rounded-2xl border shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-1.5">`,
  `<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-4 flex items-center gap-1.5">`
);

content = content.replace(
  `<div className="flex justify-between text-xs font-bold text-gray-500 mb-1">`,
  `<div className="flex justify-between text-xs font-bold text-gray-500 dark:text-slate-450 mb-1">`
);

content = content.replace(
  `<div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">`,
  `<div className="w-full bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">`
);

content = content.replace(
  `bg-amber-500 h-full rounded-full`,
  `bg-amber-500 h-full rounded-full`
);

content = content.replace(
  `<div className="bg-white p-6 rounded-2xl border shadow-xs">
          <h3 className="font-bold text-gray-800 text-sm mb-4 flex items-center gap-1.5">`,
  `<div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-xs">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm mb-4 flex items-center gap-1.5">`
);

content = content.replace(
  `<div className="text-center text-xs text-gray-400 italic py-8">Lớp chưa tích lũy độ thành thạo chuyên đề nào.</div>`,
  `<div className="text-center text-xs text-gray-400 dark:text-slate-500 italic py-8">Lớp chưa tích lũy độ thành thạo chuyên đề nào.</div>`
);

content = content.replace(
  `<div className="flex justify-between text-[11px] font-bold text-gray-605 mb-0.5">`,
  `<div className="flex justify-between text-[11px] font-bold text-gray-650 dark:text-slate-400 mb-0.5">`
);

content = content.replace(
  `<div className="flex justify-between text-[11px] font-bold text-gray-600 mb-0.5">`,
  `<div className="flex justify-between text-[11px] font-bold text-gray-650 dark:text-slate-400 mb-0.5">`
);

content = content.replace(
  `<div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">`,
  `<div className="w-full bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">`
);

// Leaderboard container
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm flex items-center gap-2">`
);

content = content.replace(
  `<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm tên học sinh..."
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />`,
  `<Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 dark:text-slate-500" />
              <input 
                type="text" 
                placeholder="Tìm tên học sinh..."
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-9 pr-4 py-2 border dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
              />`
);

content = content.replace(
  `<button onClick={handleExportCSV} className="px-3.5 py-2 border text-gray-600 bg-white rounded-xl text-xs font-bold hover:bg-gray-50 active:scale-95 transition-all flex items-center gap-1.5">`,
  `<button onClick={handleExportCSV} className="px-3.5 py-2 border dark:border-slate-800 text-gray-650 dark:text-slate-350 bg-white dark:bg-slate-900 rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm">`
);

content = content.replace(
  `<tr className="bg-gray-50 text-gray-500 font-bold uppercase border-b select-none">`,
  `<tr className="bg-gray-50 dark:bg-slate-850 text-gray-500 dark:text-slate-400 font-bold uppercase border-b dark:border-slate-800 select-none">`
);

content = content.replace(
  `cursor-pointer hover:bg-gray-100`,
  `cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800`
);

content = content.replace(
  `<tbody className="divide-y divide-gray-100">`,
  `<tbody className="divide-y divide-gray-100 dark:divide-slate-800">`
);

content = content.replace(
  `className={\`hover:bg-indigo-55/20 cursor-pointer transition-colors \${isExpanded ? 'bg-indigo-50/10' : ''}\`}`,
  `className={\`hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors \${isExpanded ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''}\`}`
);

content = content.replace(
  `className={\`hover:bg-indigo-50/20 cursor-pointer transition-colors \${isExpanded ? 'bg-indigo-50/10' : ''}\`}`,
  `className={\`hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors \${isExpanded ? 'bg-indigo-50/10 dark:bg-indigo-950/10' : ''}\`}`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-bold text-gray-505">`,
  `<td className="px-5 py-4 text-center font-bold text-gray-500 dark:text-slate-500">`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-bold text-gray-500">`,
  `<td className="px-5 py-4 text-center font-bold text-gray-500 dark:text-slate-500">`
);

content = content.replace(
  `<img src={item.student.avatar || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(item.student.name)}\`} alt="" className="w-7 h-7 rounded-full border shadow-xs" />`,
  `<img src={item.student.avatar || \`https://ui-avatars.com/api/?name=\${encodeURIComponent(item.student.name)}\`} alt="" className="w-7 h-7 rounded-full border dark:border-slate-850 shadow-xs" />`
);

content = content.replace(
  `<div className="font-bold text-gray-808 text-[13px]">{item.student.name}</div>`,
  `<div className="font-bold text-gray-800 dark:text-slate-200 text-[13px]">{item.student.name}</div>`
);

content = content.replace(
  `<div className="font-bold text-gray-800 text-[13px]">{item.student.name}</div>`,
  `<div className="font-bold text-gray-800 dark:text-slate-200 text-[13px]">{item.student.name}</div>`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-black text-yellow-600 text-sm">{item.elo} ELO</td>`,
  `<td className="px-5 py-4 text-center font-black text-yellow-600 dark:text-yellow-500 text-sm">{item.elo} ELO</td>`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-bold text-purple-600">Tầng {item.floor}</td>`,
  `<td className="px-5 py-4 text-center font-bold text-purple-600 dark:text-purple-400">Tầng {item.floor}</td>`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-semibold text-gray-600">{item.games} trận</td>`,
  `<td className="px-5 py-4 text-center font-semibold text-gray-650 dark:text-slate-400">{item.games} trận</td>`
);

content = content.replace(
  `item.winrate >= 60 ? 'bg-emerald-100 text-emerald-800' :
                          item.winrate >= 40 ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'`,
  `item.winrate >= 60 ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-350' :
                          item.winrate >= 40 ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-350' : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-350'`
);

content = content.replace(
  `<td className="px-5 py-4 text-center font-bold text-emerald-600">+{item.xp} XP</td>`,
  `<td className="px-5 py-4 text-center font-bold text-emerald-600 dark:text-emerald-400">+{item.xp} XP</td>`
);

// Match history expandable row
content = content.replace(
  `<td colSpan={7} className="px-8 py-4 bg-gray-50/50 border-y">`,
  `<td colSpan={7} className="px-8 py-4 bg-gray-50/50 dark:bg-slate-850/50 border-y dark:border-slate-800">`
);

content = content.replace(
  `<h4 className="font-black text-gray-700 text-[11px] uppercase tracking-wider">Lịch sử thi đấu gần nhất</h4>`,
  `<h4 className="font-black text-gray-700 dark:text-slate-350 text-[11px] uppercase tracking-wider">Lịch sử thi đấu gần nhất</h4>`
);

content = content.replace(
  `<p className="text-xs text-gray-400 italic">Chưa phát sinh trận đấu nào gần đây trong Đấu Trường.</p>`,
  `<p className="text-xs text-gray-400 dark:text-slate-500 italic">Chưa phát sinh trận đấu nào gần đây trong Đấu Trường.</p>`
);

content = content.replace(
  `<div key={m.id} className="p-3 bg-white border rounded-xl flex items-center justify-between shadow-xs">`,
  `<div key={m.id} className="p-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl flex items-center justify-between shadow-xs">`
);

content = content.replace(
  `<div className="text-[10px] text-gray-400 font-medium">Đối đầu với:</div>`,
  `<div className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">Đối đầu với:</div>`
);

content = content.replace(
  `<div className="text-xs font-bold text-gray-700">{oppName}</div>`,
  `<div className="text-xs font-bold text-gray-700 dark:text-slate-300">{oppName}</div>`
);

content = content.replace(
  `<div className="text-xs font-extrabold text-gray-900 mt-0.5">{myScore} - {oppScore} HP</div>`,
  `<div className="text-xs font-extrabold text-gray-900 dark:text-slate-100 mt-0.5">{myScore} - {oppScore} HP</div>`
);

// Tournaments container
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
          <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
          <h3 className="font-bold text-gray-800 dark:text-slate-200 text-sm flex items-center gap-2">`
);

content = content.replace(
  `<span className="text-xs bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-full">`,
  `<span className="text-xs bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 font-bold px-2.5 py-1 rounded-full">`
);

content = content.replace(
  `<div className="text-center py-8 text-gray-400 text-xs italic">`,
  `<div className="text-center py-8 text-gray-400 dark:text-slate-500 text-xs italic">`
);

content = content.replace(
  `t.status === 'finished' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                  t.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse' : 
                  'bg-amber-50 text-amber-700 border-amber-200';`,
  `t.status === 'finished' ? 'bg-gray-100 dark:bg-slate-850 text-gray-600 dark:text-slate-350 border-gray-200 dark:border-slate-800' :
                  t.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30 animate-pulse' : 
                  'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/30';`
);

content = content.replace(
  `<div key={t.id} className="p-4 border rounded-xl bg-gray-50/30 hover:border-purple-200 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">`,
  `<div key={t.id} className="p-4 border dark:border-slate-800 rounded-xl bg-gray-50/30 dark:bg-slate-955/40 hover:border-purple-200 dark:hover:border-purple-900/40 hover:shadow-xs transition-all flex flex-col justify-between space-y-3">`
);

content = content.replace(
  `<div className="font-bold text-sm text-gray-808 line-clamp-1">{t.title}</div>`,
  `<div className="font-bold text-sm text-gray-808 dark:text-slate-200 line-clamp-1">{t.title}</div>`
);

content = content.replace(
  `<div className="font-bold text-sm text-gray-800 line-clamp-1">{t.title}</div>`,
  `<div className="font-bold text-sm text-gray-800 dark:text-slate-200 line-clamp-1">{t.title}</div>`
);

content = content.replace(
  `<div className="text-[11px] text-gray-500 space-y-1">`,
  `<div className="text-[11px] text-gray-500 dark:text-slate-400 space-y-1">`
);

content = content.replace(
  `<div>Môn học: <span className="font-semibold text-gray-700">{t.filter_subject || 'Tất cả'}</span></div>`,
  `<div>Môn học: <span className="font-semibold text-gray-700 dark:text-slate-300">{t.filter_subject || 'Tất cả'}</span></div>`
);

content = content.replace(
  `<div>Khối lớp: <span className="font-semibold text-gray-700">{t.filter_grade ? \`Khối \${t.filter_grade}\` : 'Tất cả'}</span></div>`,
  `<div>Khối lớp: <span className="font-semibold text-gray-700 dark:text-slate-300">{t.filter_grade ? \`Khối \${t.filter_grade}\` : 'Tất cả'}</span></div>`
);

content = content.replace(
  `<div>Thể thức: <span className="font-semibold text-gray-700">{t.questions_per_match} câu/trận • {t.time_per_question} giây/câu</span></div>`,
  `<div>Thể thức: <span className="font-semibold text-gray-700 dark:text-slate-300">{t.questions_per_match} câu/trận • {t.time_per_question} giây/câu</span></div>`
);

content = content.replace(
  `<div className="pt-1.5 border-t border-dashed text-[10px] text-gray-400">`,
  `<div className="pt-1.5 border-t border-dashed dark:border-slate-800 text-[10px] text-gray-400 dark:text-slate-505">`
);

// 4. Main TeacherAnalytics view wrapper & selections
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6 no-print">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 no-print">`
);

content = content.replace(
  `<label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <School className="h-4 w-4" /> Chọn Lớp học
            </label>`,
  `<label className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
              <School className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Chọn Lớp học
            </label>`
);

content = content.replace(
  `className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"`,
  `className="w-full p-2.5 border border-gray-300 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"`
);

content = content.replace(
  `<label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Chọn Học sinh
                </label>`,
  `<label className="text-sm font-bold text-gray-700 dark:text-slate-350 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-605 dark:text-indigo-400" /> Chọn Học sinh
                </label>`
);

content = content.replace(
  `className="w-full flex items-center justify-between p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-55 text-sm h-[46px]"`,
  `className="w-full flex items-center justify-between p-2.5 border border-gray-300 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 disabled:bg-gray-50 dark:disabled:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm h-[46px]"`
);

content = content.replace(
  `className="w-full flex items-center justify-between p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-gray-50 text-sm h-[46px]"`,
  `className="w-full flex items-center justify-between p-2.5 border border-gray-300 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-950 disabled:bg-gray-50 dark:disabled:bg-slate-900 text-gray-900 dark:text-slate-100 text-sm h-[46px]"`
);

content = content.replace(
  `className="absolute z-50 mt-2 w-[300px] md:w-[600px] right-0 md:left-0 bg-white border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"`,
  `className="absolute z-50 mt-2 w-[300px] md:w-[600px] right-0 md:left-0 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"`
);

content = content.replace(
  `<div className="flex justify-between items-center p-4 bg-gray-50 border-b">`,
  `<div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-slate-850 border-b dark:border-slate-800">`
);

content = content.replace(
  `<h4 className="font-bold text-gray-700 text-sm">Danh sách học sinh</h4>`,
  `<h4 className="font-bold text-gray-700 dark:text-slate-300 text-sm">Danh sách học sinh</h4>`
);

content = content.replace(
  `selectedStudentIds.includes(s.id) 
                                  ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200' 
                                  : 'bg-white border-gray-100 hover:border-indigo-100 hover:bg-gray-50'`,
  `selectedStudentIds.includes(s.id) 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-900/50 text-indigo-900 dark:text-indigo-300' 
                                  : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-805 hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:bg-gray-50 dark:hover:bg-slate-850 text-gray-700 dark:text-slate-300'`
);

content = content.replace(
  `<span className="text-xs font-semibold text-gray-750 truncate" title={s.name}>{s.name}</span>`,
  `<span className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate" title={s.name}>{s.name}</span>`
);

content = content.replace(
  `<span className="text-xs font-semibold text-gray-700 truncate" title={s.name}>{s.name}</span>`,
  `<span className="text-xs font-semibold text-gray-700 dark:text-slate-300 truncate" title={s.name}>{s.name}</span>`
);

content = content.replace(
  `<label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Thời gian
                </label>`,
  `<label className="text-sm font-bold text-gray-700 dark:text-slate-350 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Thời gian
                </label>`
);

content = content.replace(
  `className="w-full p-2.5 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white h-[46px]"`,
  `className="w-full p-2.5 border border-gray-300 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-955 text-gray-900 dark:text-slate-100 text-sm h-[46px]"`
);

content = content.replace(
  `className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 no-print transition-all"`,
  `className="bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-slate-800 no-print transition-all"`
);

// Tab bar
content = content.replace(
  `<div className="flex border-b border-gray-200 no-print mb-4">`,
  `<div className="flex border-b border-gray-200 dark:border-slate-800 no-print mb-4">`
);

content = content.replace(
  `activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'`,
  `activeTab === 'exams'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-650 dark:hover:text-slate-300'`
);

content = content.replace(
  `activeTab === 'arena'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'`,
  `activeTab === 'arena'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'`
);

content = content.replace(
  `activeTab === 'ai_requests'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-400 hover:text-gray-600'`,
  `activeTab === 'ai_requests'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'`
);

// Fallbacks
content = content.replace(
  `<div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center no-print">
          <School className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-600">Phân tích học tập lớp học</h3>
          <p className="text-gray-400">Vui lòng chọn lớp học ở phía trên để bắt đầu xem báo cáo phân tích.</p>
        </div>`,
  `<div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-250 dark:border-slate-800 p-16 text-center no-print text-gray-900 dark:text-slate-100">
          <School className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-600 dark:text-slate-300">Phân tích học tập lớp học</h3>
          <p className="text-gray-400 dark:text-slate-500">Vui lòng chọn lớp học ở phía trên để bắt đầu xem báo cáo phân tích.</p>
        </div>`
);

content = content.replace(
  `<div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center no-print">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-655">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400">Vui lòng chọn ít nhất một học sinh để xem báo cáo hoặc chuyển sang tab Đấu Trường.</p>
        </div>`,
  `<div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-250 dark:border-slate-800 p-16 text-center no-print text-gray-900 dark:text-slate-100">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-650 dark:text-slate-300">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400 dark:text-slate-500">Vui lòng chọn ít nhất một học sinh để xem báo cáo hoặc chuyển sang tab Đấu Trường.</p>
        </div>`
);

content = content.replace(
  `<div className="bg-gray-50 rounded-2xl border border-dashed p-16 text-center no-print">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold text-gray-600">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400">Vui lòng chọn ít nhất một học sinh để xem báo cáo hoặc chuyển sang tab Đấu Trường.</p>
        </div>`,
  `<div className="bg-gray-50 dark:bg-slate-900 rounded-2xl border border-dashed border-gray-250 dark:border-slate-800 p-16 text-center no-print text-gray-900 dark:text-slate-100">
          <BarChart3 className="h-16 w-16 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
          <h3 className="text-xl font-bold text-gray-650 dark:text-slate-300">Phân tích học tập chi tiết</h3>
          <p className="text-gray-400 dark:text-slate-500">Vui lòng chọn ít nhất một học sinh để xem báo cáo hoặc chuyển sang tab Đấu Trường.</p>
        </div>`
);

// AI request approval panels
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 space-y-6">`
);

content = content.replace(
  `<div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Brain className="h-5.5 w-5.5 text-indigo-600" /> Phê duyệt yêu cầu sử dụng AI từ Học sinh
              </h2>
              <p className="text-xs text-gray-500">Giáo viên phê duyệt các yêu cầu phân tích học tập cá nhân và gợi ý học tập từ học sinh</p>
            </div>
            <button 
              onClick={fetchAiRequests}
              disabled={loadingAiRequests}
              className="text-xs bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition no-print"
            >`,
  `<div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                <Brain className="h-5.5 w-5.5 text-indigo-650 dark:text-indigo-400" /> Phê duyệt yêu cầu sử dụng AI từ Học sinh
              </h2>
              <p className="text-xs text-gray-550 dark:text-slate-450">Giáo viên phê duyệt các yêu cầu phân tích học tập cá nhân và gợi ý học tập từ học sinh</p>
            </div>
            <button 
              onClick={fetchAiRequests}
              disabled={loadingAiRequests}
              className="text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-bold hover:bg-indigo-100 dark:hover:bg-indigo-950/60 px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition no-print border border-transparent dark:border-indigo-900/40"
            >`
);

content = content.replace(
  `<div className="text-center py-16 text-gray-400">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Chưa có yêu cầu sử dụng AI nào từ học sinh.</p>
            </div>`,
  `<div className="text-center py-16 text-gray-400 dark:text-slate-500">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="font-medium">Chưa có yêu cầu sử dụng AI nào từ học sinh.</p>
            </div>`
);

content = content.replace(
  `className={\`border rounded-xl p-5 transition-all shadow-sm \${req.status === 'pending' ? 'bg-amber-50/30 border-amber-200' : req.status === 'approved' ? 'bg-green-50/20 border-green-200' : 'bg-gray-50 border-gray-200'}\`}`,
  `className={\`border rounded-xl p-5 transition-all shadow-sm \${req.status === 'pending' ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-250 dark:border-amber-900/30' : req.status === 'approved' ? 'bg-green-50/20 dark:bg-green-950/10 border-green-250 dark:border-green-900/30' : 'bg-gray-50 dark:bg-slate-850 border-gray-200 dark:border-slate-850'}\`}`
);

content = content.replace(
  `<span className="font-bold text-gray-900 text-sm">{req.student_name}</span>`,
  `<span className="font-bold text-gray-900 dark:text-slate-100 text-sm">{req.student_name}</span>`
);

content = content.replace(
  `className={\`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase \${req.status === 'pending' ? 'bg-amber-100 text-amber-800' : req.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}\`}`,
  `className={\`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase \${req.status === 'pending' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' : req.status === 'approved' ? 'bg-green-100 dark:bg-green-950 text-green-850 dark:text-green-300' : 'bg-red-100 dark:bg-red-950 text-red-850 dark:text-red-300'}\`}`
);

content = content.replace(
  `<p className="text-xs text-gray-500 mt-1.5">
                        Chức năng: <strong className="text-indigo-700">{req.feature_name === 'portfolio_analysis' ? 'Phân tích hồ sơ' : 'Gợi ý học tập'}</strong> • Gửi lúc {new Date(req.created_at).toLocaleString('vi-VN')}
                      </p>`,
  `<p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
                        Chức năng: <strong className="text-indigo-700 dark:text-indigo-400">{req.feature_name === 'portfolio_analysis' ? 'Phân tích hồ sơ' : 'Gợi ý học tập'}</strong> • Gửi lúc {new Date(req.created_at).toLocaleString('vi-VN')}
                      </p>`
);

content = content.replace(
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 text-red-606 rounded-lg text-xs font-bold bg-white hover:bg-red-50 transition"
                        >`,
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-955/20 transition"
                        >`
);

content = content.replace(
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-bold bg-white hover:bg-red-55 transition"
                        >`,
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-955/20 transition"
                        >`
);

content = content.replace(
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 text-red-600 rounded-lg text-xs font-bold bg-white hover:bg-red-50 transition"
                        >`,
  `<button
                          onClick={() => handleRejectRequest(req)}
                          className="px-3.5 py-1.5 border border-red-300 dark:border-red-900/40 text-red-650 dark:text-red-400 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-955/20 transition"
                        >`
);

content = content.replace(
  `<div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 text-xs text-gray-700 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed italic border-l-4 border-indigo-400">`,
  `<div className="mt-4 p-4 bg-white dark:bg-slate-955 rounded-xl border border-gray-100 dark:border-slate-850 text-xs text-gray-700 dark:text-slate-350 max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed italic border-l-4 border-indigo-400 dark:border-l-indigo-500">`
);

// Detailed Analytics Cards
content = content.replace(
  `{[
              { icon: Target, label: 'Bài đã nộp', value: analytics.totalAttempts, color: 'bg-indigo-100 text-indigo-600' },
              { icon: Star, label: 'Điểm TB', value: \`\${fmt(analytics.avgScore)}/10\`, color: 'bg-amber-100 text-amber-600' },
              { icon: TrendingUp, label: 'Điểm cao nhất', value: \`\${fmt(analytics.maxScore)}/10\`, color: 'bg-emerald-100 text-emerald-600' },
              { icon: Zap, label: 'Chuỗi ngày học', value: \`\${analytics.studyStreak} ngày\`, color: 'bg-purple-100 text-purple-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
                <div className={\`p-3 rounded-xl \${card.color}\`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 font-medium">{card.label}</div>
                  <div className="text-xl font-bold text-gray-900">{card.value}</div>
                </div>
              </div>
            ))}`,
  `{[
              { icon: Target, label: 'Bài đã nộp', value: analytics.totalAttempts, color: 'bg-indigo-100 text-indigo-600' },
              { icon: Star, label: 'Điểm TB', value: \`\${fmt(analytics.avgScore)}/10\`, color: 'bg-amber-100 text-amber-600' },
              { icon: TrendingUp, label: 'Điểm cao nhất', value: \`\${fmt(analytics.maxScore)}/10\`, color: 'bg-emerald-100 text-emerald-600' },
              { icon: Zap, label: 'Chuỗi ngày học', value: \`\${analytics.studyStreak} ngày\`, color: 'bg-purple-100 text-purple-600' },
            ].map((card, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 rounded-xl border dark:border-slate-800 shadow-sm p-4 flex items-center gap-3">
                <div className={\`p-3 rounded-xl \${card.color}\`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-slate-400 font-medium">{card.label}</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-slate-100">{card.value}</div>
                </div>
              </div>
            ))`
);

// Tiến độ học tập & AI Comment
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-505" /> Tiến độ học tập
                </h2>`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Tiến độ học tập
                </h2>`
);

content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Tiến độ học tập
                </h2>`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-500" /> Tiến độ học tập
                </h2>`
);

content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6 border-l-4 border-l-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" /> AI Nhận xét Sư phạm
                  </h2>
                  <button
                    onClick={handleGetAIInsight}
                    disabled={isLoadingAI}
                    className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 transition-all no-print"
                  >`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 border-l-4 border-l-purple-500">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" /> AI Nhận xét Sư phạm
                  </h2>
                  <button
                    onClick={handleGetAIInsight}
                    disabled={isLoadingAI}
                    className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-950/60 transition-all no-print border border-transparent dark:border-purple-900/30"
                  >`
);

content = content.replace(
  `<div className="bg-purple-50 rounded-xl p-4 text-sm text-gray-800 leading-relaxed italic">`,
  ` <div className="bg-purple-55 dark:bg-purple-955/20 rounded-xl p-4 text-sm text-gray-805 dark:text-slate-200 leading-relaxed italic">`
);

content = content.replace(
  `<p className="text-gray-400 text-sm text-center py-6 border border-dashed rounded-xl no-print">`,
  `<p className="text-gray-400 dark:text-slate-500 text-sm text-center py-6 border border-dashed dark:border-slate-800 rounded-xl no-print">`
);

content = content.replace(
  `<div className="mt-6 pt-6 border-t space-y-3 no-print">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" /> Nhận xét & Gợi ý gửi học sinh
                  </label>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Nhập nhận xét hoặc chỉnh sửa gợi ý từ AI để gửi cho học sinh..."
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />`,
  `<div className="mt-6 pt-6 border-t dark:border-slate-800 space-y-3 no-print">
                  <label className="text-sm font-bold text-gray-700 dark:text-slate-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-indigo-500" /> Nhận xét & Gợi ý gửi học sinh
                  </label>
                  <textarea
                    value={teacherComment}
                    onChange={(e) => setTeacherComment(e.target.value)}
                    placeholder="Nhập nhận xét hoặc chỉnh sửa gợi ý từ AI để gửi cho học sinh..."
                    className="w-full p-4 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />`
);

// Weak topics & breakdown
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 text-red-600">`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2 text-red-650">`
);

content = content.replace(
  `<p className="text-gray-400 text-xs italic">Học sinh này đang làm rất tốt, chưa có chủ đề yếu cụ thể.</p>`,
  `<p className="text-gray-400 dark:text-slate-500 text-xs italic">Học sinh này đang làm rất tốt, chưa có chủ đề yếu cụ thể.</p>`
);

content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-505" /> Kết quả theo môn
                </h2>`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Kết quả theo môn
                </h2>`
);

content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Kết quả theo môn
                </h2>`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-indigo-500" /> Kết quả theo môn
                </h2>`
);

content = content.replace(
  `<span className="font-bold text-gray-707">{s.subject}</span>`,
  `<span className="font-bold text-gray-700 dark:text-slate-350">{s.subject}</span>`
);

content = content.replace(
  `<span className="font-bold text-gray-700">{s.subject}</span>`,
  `<span className="font-bold text-gray-700 dark:text-slate-350">{s.subject}</span>`
);

content = content.replace(
  `<span className="font-bold">{fmt(s.avgScore)}</span>`,
  `<span className="font-bold text-gray-900 dark:text-slate-100">{fmt(s.avgScore)}</span>`
);

content = content.replace(
  `<div className="w-full bg-gray-100 rounded-full h-2">`,
  `<div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2">`
);

// Recommendations
content = content.replace(
  `<div className="bg-white rounded-2xl border shadow-sm p-6 no-print">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" /> Bài tập can thiệp đề xuất
              </h2>`,
  `<div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm p-6 no-print">
              <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" /> Bài tập can thiệp đề xuất
              </h2>`
);

content = content.replace(
  `<div key={rec.exam.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 italic mb-2">`,
  `<div key={rec.exam.id} className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-950/40">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-655 dark:text-indigo-400 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 dark:text-slate-405 italic mb-2">`
);

content = content.replace(
  `<div key={rec.exam.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                    <h4 className="font-bold text-sm text-gray-900 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-600 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 italic mb-2">`,
  `<div key={rec.exam.id} className="border border-gray-100 dark:border-slate-800 rounded-xl p-4 bg-gray-50/50 dark:bg-slate-955/40">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-slate-100 mb-1">{rec.exam.title}</h4>
                    <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-2 uppercase">{rec.exam.subject} • {rec.difficulty}</p>
                    <div className="text-xs text-gray-500 dark:text-slate-450 italic mb-2">`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('TeacherAnalytics.tsx successfully updated!');
