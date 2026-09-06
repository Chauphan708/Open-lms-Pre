import React from 'react';

export const PageSkeleton: React.FC = () => {
  return (
    <div className="w-full min-h-[60vh] p-4 md:p-6 lg:p-8 space-y-6 animate-pulse" role="status" aria-label="Đang tải trang">
      {/* Top Banner Skeleton */}
      <div className="bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl h-28 md:h-36 w-full flex flex-col justify-center px-6 space-y-3">
        <div className="h-6 md:h-7 bg-slate-300/80 dark:bg-slate-700/80 rounded-lg w-1/3 max-w-xs"></div>
        <div className="h-4 bg-slate-300/60 dark:bg-slate-700/60 rounded-md w-1/2 max-w-sm"></div>
      </div>

      {/* Action / Filter Bar Skeleton */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-2">
        <div className="h-10 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl w-64 max-w-full"></div>
        <div className="flex items-center gap-2">
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl w-28"></div>
          <div className="h-10 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl w-32"></div>
        </div>
      </div>

      {/* Grid Content Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded w-full"></div>
              <div className="h-3.5 bg-slate-100 dark:bg-slate-800/60 rounded w-5/6"></div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-24"></div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Đang tải nội dung...</span>
    </div>
  );
};
