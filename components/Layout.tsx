
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  FileText,
  BookOpen,
  LogOut,
  GraduationCap,
  Menu,
  X,
  CalendarRange,
  Users,
  School,
  MessageSquare,
  Settings,
  Bell,
  CheckCircle,
  History,
  Globe,
  Trophy,
  Swords,
  Brain,
  Bot,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  Wrench,
  Clock,
  BarChart3,
  ClipboardList,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Database,
  Layers,
  HelpCircle,
  StickyNote,
  Sun,
  Moon,
  BookOpenCheck
} from 'lucide-react';
import { useStore } from '../store';
import { UserRole, CustomToolMenu } from '../types';
import UserGuideModal from './UserGuideModal';
import { AcceptShareModal } from './AcceptShareModal';
import Footer from './Footer';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, notifications, markNotificationRead, markAllNotificationsRead } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [activeShare, setActiveShare] = useState<{ notifId: string, examId: string } | null>(null);

  // Scroll to top/bottom states
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Dark mode state
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Track window scrolling for top/bottom navigation buttons
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      
      // Show scroll-to-top button if scrolled down by 300px
      setShowScrollTop(scrollTop > 300);
      // Show scroll-to-bottom button if there's still more than 300px to scroll down
      setShowScrollBottom(scrollTop + clientHeight < scrollHeight - 300);
    };

    window.addEventListener('scroll', handleScroll);
    // Initial check
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // State to track expanded custom tools
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  // State for built-in nested menus
  const [isStudyToolsExpanded, setIsStudyToolsExpanded] = useState(false);
  const [expandedNavGroups, setExpandedNavGroups] = useState<Record<string, boolean>>({
    'Khảo thí & Bài tập': true // Expand default group
  });

  const isActive = (path: string) => location.pathname === path;

  const toggleTool = (toolId: string) => {
    setExpandedTools(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const toggleGroup = (title: string) => {
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false);
      setExpandedNavGroups(prev => ({ ...prev, [title]: true }));
    } else {
      setExpandedNavGroups(prev => ({ ...prev, [title]: !prev[title] }));
    }
  };

  // Filter notifications for current user
  const myNotifications = notifications.filter(n => n.userId === user?.id);
  const unreadCount = myNotifications.filter(n => !n.isRead).length;

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const handleNotifClick = (notif: any) => {
    markNotificationRead(notif.id);
    setIsNotifOpen(false);
    
    // Intercept EXAM_SHARE notifications
    if (notif.payload?.type === 'EXAM_SHARE' && notif.payload?.examId) {
      setActiveShare({ notifId: notif.id, examId: notif.payload.examId });
      return;
    }

    if (notif.link) navigate(notif.link);
  };

  interface NavItem {
    label: string;
    path: string;
    icon: any;
    roles?: UserRole[];
  }

  interface NavGroup {
    title?: string;
    roles?: UserRole[];
    icon?: any;
    items: NavItem[];
  }

  const navGroups: NavGroup[] = [
    {
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Sổ tay Giáo viên', path: '/teacher/notes', icon: StickyNote, roles: ['TEACHER', 'ADMIN'] },
      ]
    },
    {
      title: 'Quản lý Hệ thống',
      icon: Settings,
      roles: ['ADMIN'],
      items: [
        { label: 'Quản lý Năm học', path: '/admin/years', icon: CalendarRange, roles: ['ADMIN'] },
        { label: 'Quản lý Giáo viên', path: '/admin/teachers', icon: Users, roles: ['ADMIN'] },
      ]
    },
    {
      title: 'Khảo thí & Bài tập',
      icon: BookOpen,
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      items: [
        { label: 'Kho đề & Nhiệm vụ', path: '/exams', icon: BookOpen, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Thư viện cộng đồng', path: '/library', icon: Globe, roles: ['TEACHER', 'ADMIN'] },
        { label: 'Ngân hàng Câu hỏi', path: '/question-bank', icon: Database, roles: ['TEACHER', 'ADMIN'] },
        { label: 'Tạo Bài tập', path: '/create-exam', icon: FilePlus, roles: ['TEACHER'] },
        { label: 'Tạo Đề kiểm tra', path: '/exam-matrix', icon: BookOpen, roles: ['TEACHER'] },
        { label: 'Quản lý Bài đã giao', path: '/teacher/assignments', icon: ClipboardList, roles: ['TEACHER'] },
        { label: 'Chấm bài AI', path: '/teacher/ai-grading', icon: Bot, roles: ['TEACHER'] },
        { label: 'Lịch sử Làm bài', path: '/student/history', icon: History, roles: ['STUDENT'] },
        { label: 'Phân tích Học tập', path: '/student/analytics', icon: BarChart3, roles: ['STUDENT'] },
        { label: 'Hồ Sơ Của Em', path: '/student/portfolio', icon: Layers, roles: ['STUDENT'] },
        { label: 'Phân tích Học tập', path: '/teacher/analytics', icon: BarChart3, roles: ['TEACHER'] },
      ]
    },
    {
      title: 'Lớp học & Thi đua',
      icon: GraduationCap,
      roles: ['ADMIN', 'TEACHER'],
      items: [
        { label: 'Lớp học của tôi', path: '/teacher/classes', icon: School, roles: ['TEACHER'] },
        { label: 'Quản lý Học sinh', path: '/manage/students', icon: GraduationCap, roles: ['ADMIN', 'TEACHER'] },
        { label: 'Nhận xét Thường xuyên', path: '/teacher/daily-evaluation', icon: FileText, roles: ['TEACHER'] },
        { label: 'Lịch sử Nhận xét', path: '/teacher/evaluation-history', icon: History, roles: ['TEACHER'] },
        { label: 'Thi đua Lớp', path: '/teacher/class-fun', icon: Trophy, roles: ['TEACHER'] },
        { label: 'Điểm danh', path: '/teacher/class-fun/attendance', icon: Users, roles: ['TEACHER'] },
        { label: 'Ghi nhận', path: '/teacher/class-fun/record', icon: CheckCircle, roles: ['TEACHER'] },
        { label: 'Cảnh báo Hành vi', path: '/teacher/class-fun/warning', icon: MessageSquare, roles: ['TEACHER'] },
        { label: ' Thống kê Kinh nghiệm', path: '/teacher/xp-stats', icon: Zap, roles: ['TEACHER'] },
      ]
    },
    {
      title: 'Tương tác & Mở rộng',
      icon: Globe,
      roles: ['ADMIN', 'TEACHER', 'STUDENT'],
      items: [
        { label: 'Kho Tài liệu & Web', path: '/resources', icon: Globe, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Hệ thống Trò chơi', path: '/edu-games', icon: Bot, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Phòng Thảo luận', path: '/teacher/discussions', icon: MessageSquare, roles: ['TEACHER'] },
        { label: 'Phòng Thảo luận', path: '/discussion/join', icon: MessageSquare, roles: ['STUDENT'] },
        { label: 'QL Đấu trí', path: '/arena/admin', icon: Brain, roles: ['ADMIN', 'TEACHER'] },
        { label: 'Tổ chức Giải đấu', path: '/arena/tournament/host', icon: Trophy, roles: ['ADMIN', 'TEACHER'] },
        { label: 'Khóa học Online', path: '/elearning', icon: BookOpenCheck, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
        { label: 'Đấu trí', path: '/arena', icon: Brain, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
      ]
    },
    {
      title: 'Báo cáo & Cài đặt',
      icon: BarChart3,
      roles: ['ADMIN', 'TEACHER'],
      items: [
        { label: 'Thống kê & Backup', path: '/ai-stats', icon: BarChart3, roles: ['TEACHER'] },
        { label: 'Cài đặt', path: '/settings', icon: Settings, roles: ['ADMIN', 'TEACHER'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors duration-300">
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b dark:border-slate-800 p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-2 font-bold text-indigo-600 dark:text-indigo-400">
          <GraduationCap className="h-6 w-6" />
          <span>OpenLMS</span>
        </div>
        <div className="flex gap-4 relative">
          <button onClick={toggleTheme} className="text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Đổi giao diện">
            {theme === 'dark' ? <Sun className="h-6 w-6 text-amber-400" /> : <Moon className="h-6 w-6" />}
          </button>
          <button onClick={() => setIsGuideOpen(true)} className="text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Hướng dẫn sử dụng">
            <HelpCircle className="h-6 w-6" />
          </button>
          <button onClick={() => setIsNotifOpen(!isNotifOpen)} className="relative text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            <Bell className="h-6 w-6" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>}
          </button>
          
          {/* Mobile Notifications Dropdown */}
          {isNotifOpen && (
            <div className="absolute right-12 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-xl shadow-xl border dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 origin-top-right">
              <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50 rounded-t-xl">
                <h3 className="font-bold text-sm text-gray-800 dark:text-slate-200">Thông báo</h3>
                {unreadCount > 0 && (
                  <button onClick={() => user && markAllNotificationsRead(user.id)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                    Đọc tất cả
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {myNotifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 dark:text-slate-500 text-xs">
                    Không có thông báo mới
                  </div>
                ) : (
                  <div className="divide-y dark:divide-slate-800">
                    {myNotifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className="p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <p className={`text-xs ${!n.isRead ? 'font-bold text-gray-900 dark:text-slate-100' : 'text-gray-600 dark:text-slate-400'}`}>{n.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-gray-600 dark:text-slate-400">
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 bg-white dark:bg-slate-900 border-r dark:border-slate-800 shadow-lg transform transition-all duration-300 ease-in-out flex flex-col
        md:sticky md:top-0 md:h-screen md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isSidebarCollapsed ? 'w-20' : 'w-64'}
      `}>
        <div className="h-full flex flex-col">
          <div className={`p-4 border-b dark:border-slate-800 flex items-center h-[73px] ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full' : ''}`}>
              <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-200 flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              {!isSidebarCollapsed && <span className="text-xl font-extrabold text-gray-800 dark:text-slate-200 tracking-tight whitespace-nowrap">OpenLMS</span>}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsSidebarCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                title="Thu gọn menu"
              >
                <PanelLeftClose className="h-5 w-5" />
              </button>
            )}
          </div>

          {isSidebarCollapsed && (
            <div className="hidden md:flex justify-center p-2 border-b border-gray-50 dark:border-slate-800">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-800 dark:hover:text-slate-200 transition-colors"
                title="Mở rộng menu"
              >
                <PanelLeftOpen className="h-5 w-5" />
              </button>
            </div>
          )}

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
            {navGroups.map((group, groupIdx) => {
              if (group.roles && user && !group.roles.includes(user.role)) return null;

              const visibleItems = group.items.filter(item => !item.roles || (user && item.roles.includes(user.role)));
              if (visibleItems.length === 0) return null;

              return (
                <div key={groupIdx} className={`${groupIdx > 0 ? 'pt-2 border-t border-gray-50 dark:border-slate-800' : ''}`}>
                  {group.title ? (
                    <div className="mb-2">
                      <button
                        onClick={() => toggleGroup(group.title!)}
                        title={isSidebarCollapsed ? group.title : undefined}
                        className={`w-full flex items-center py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                           ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}
                           ${expandedNavGroups[group.title] && !isSidebarCollapsed ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-slate-200'}`}
                      >
                        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                          {group.icon && React.createElement(group.icon, {
                            className: `h-5 w-5 flex-shrink-0 transition-all duration-300 ${expandedNavGroups[group.title] && !isSidebarCollapsed ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110'}`
                          })}
                          {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{group.title}</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${expandedNavGroups[group.title] ? 'rotate-90 text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-400'}`} />
                        )}
                        {expandedNavGroups[group.title] && !isSidebarCollapsed && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                        )}
                      </button>

                      {!isSidebarCollapsed && (
                        <div
                          className={`grid transition-all duration-300 ease-in-out ${expandedNavGroups[group.title] ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                        >
                          <div className="overflow-hidden">
                            <div className="pl-3 pr-2 py-1 space-y-1 my-1 ml-4 border-l-2 border-indigo-100/50 dark:border-indigo-950/50">
                              {visibleItems.map(item => {
                                const Icon = item.icon;
                                const active = isActive(item.path);
                                const isExternalRedirect = item.path === '/edu-games';
                                return (
                                  <Link
                                    key={item.path}
                                    to={item.path}
                                    target={isExternalRedirect ? "_blank" : undefined}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 group relative overflow-hidden
                                        ${active
                                        ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 font-bold shadow-sm translate-x-1 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-200 dark:hover:bg-indigo-900/40 hover:text-indigo-900 dark:hover:text-indigo-200'
                                        : 'text-gray-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-800/50 hover:shadow-sm hover:border hover:border-indigo-50 dark:hover:border-slate-800 hover:pl-4'}
                                      `}
                                  >
                                    <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${active ? 'text-indigo-700 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110'}`} />
                                    <span className="relative z-10 truncate">{item.label}</span>
                                    {active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600 rounded-r-md"></div>}
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 mb-2">
                      {visibleItems.map(item => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        const isExternalRedirect = item.path === '/edu-games';
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            target={isExternalRedirect ? "_blank" : undefined}
                            onClick={() => setIsMobileMenuOpen(false)}
                            title={isSidebarCollapsed ? item.label : undefined}
                            className={`
                              flex items-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden shadow-sm
                              ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}
                              ${active
                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' + (!isSidebarCollapsed ? ' translate-x-1' : '')
                                : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-700 dark:hover:text-indigo-300' + (!isSidebarCollapsed ? ' hover:translate-x-1' : '')}
                            `}
                          >
                            <Icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${!active ? 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110' : 'text-white'}`} />
                            {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">{item.label}</span>}
                            {active && !isSidebarCollapsed && <div className="absolute inset-0 bg-white/10 mix-blend-overlay"></div>}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* CÔNG CỤ HỌC TẬP */}
            {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && (
              <div className="pt-2 border-t border-gray-100/50 dark:border-slate-800">
                <button
                  onClick={() => !isSidebarCollapsed && setIsStudyToolsExpanded(!isStudyToolsExpanded)}
                  title={isSidebarCollapsed ? "Công cụ học tập" : undefined}
                  className={`w-full flex items-center py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                    ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}
                    ${location.pathname.startsWith('/tools/') ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-slate-200'}`}
                >
                  <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                    <Wrench className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${location.pathname.startsWith('/tools/') ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110'}`} />
                    {!isSidebarCollapsed && <span className="relative z-10 whitespace-nowrap">Công cụ học tập</span>}
                  </div>
                  {!isSidebarCollapsed && (
                    <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isStudyToolsExpanded ? 'rotate-90 text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-400'}`} />
                  )}
                  {isStudyToolsExpanded && !isSidebarCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                  )}
                </button>

                {!isSidebarCollapsed && (
                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isStudyToolsExpanded ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="pl-3 pr-2 py-1 space-y-1 my-1 ml-4 border-l-2 border-indigo-100/50 dark:border-indigo-950/50">
                        <Link
                          to="/tools/timer"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 group relative overflow-hidden ${isActive('/tools/timer') ? 'text-indigo-700 dark:text-indigo-300 font-bold bg-white dark:bg-slate-800 shadow-sm border border-indigo-50 dark:border-slate-700 translate-x-1' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-800/50 hover:shadow-sm hover:border hover:border-indigo-50 dark:hover:border-slate-700 hover:pl-4'
                            }`}
                        >
                          <Clock className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${isActive('/tools/timer') ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110'}`} />
                          <span className="relative z-10 truncate">Đồng hồ đếm ngược</span>
                          {isActive('/tools/timer') && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-md"></div>}
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* CUSTOM TOOLS RENDERER (TEACHER AND ADMIN) */}
            {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && user.customTools && user.customTools.length > 0 && (
              <div className="pt-2 border-t border-gray-100/50 dark:border-slate-800">
                {!isSidebarCollapsed && (
                  <p className="px-4 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-2 truncate">Các Công Cụ Hỗ Trợ</p>
                )}
                {user.customTools.map(tool => (
                  <div key={tool.id} className="mb-1">
                    {tool.children && tool.children.length > 0 ? (
                      <div>
                        <button
                          onClick={() => !isSidebarCollapsed && toggleTool(tool.id)}
                          title={isSidebarCollapsed ? tool.title : undefined}
                          className={`w-full flex items-center py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden
                            ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-between px-4'}
                            ${expandedTools[tool.id] && !isSidebarCollapsed ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100/80 dark:hover:bg-slate-800/80 hover:text-gray-900 dark:hover:text-slate-200'}`}
                        >
                          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                            <ExternalLink className={`h-5 w-5 flex-shrink-0 transition-transform duration-300 ${expandedTools[tool.id] && !isSidebarCollapsed ? 'text-indigo-600 dark:text-indigo-400 scale-110' : 'text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110'}`} />
                            {!isSidebarCollapsed && <span className="relative z-10 truncate">{tool.title}</span>}
                          </div>
                          {!isSidebarCollapsed && (
                            <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform duration-300 ${expandedTools[tool.id] ? 'rotate-90 text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-gray-600 dark:group-hover:text-slate-400'}`} />
                          )}
                          {expandedTools[tool.id] && !isSidebarCollapsed && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-indigo-600 rounded-r-full shadow-[0_0_8px_rgba(79,70,229,0.5)]"></div>
                          )}
                        </button>
                        {/* Recursive Children Render with Grid Animation */}
                        {!isSidebarCollapsed && (
                          <div
                            className={`grid transition-all duration-300 ease-in-out ${expandedTools[tool.id] ? 'grid-rows-[1fr] opacity-100 mt-1' : 'grid-rows-[0fr] opacity-0 mt-0'}`}
                          >
                            <div className="overflow-hidden">
                              <div className="pl-3 pr-2 py-1 space-y-1 my-1 ml-4 border-l-2 border-indigo-100/50 dark:border-indigo-950/50">
                                {tool.children.map(child => (
                                  <a
                                    key={child.id}
                                    href={child.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-3 py-2.5 rounded-lg text-sm text-gray-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-white dark:hover:bg-slate-800/50 hover:shadow-sm hover:border hover:border-indigo-50 dark:hover:border-slate-700 hover:pl-4 transition-all duration-300 truncate"
                                  >
                                    {child.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Standalone Parent Link
                      <a
                        href={tool.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={isSidebarCollapsed ? tool.title : undefined}
                        className={`flex items-center gap-3 py-3 rounded-xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden shadow-sm bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-700 hover:text-indigo-700 dark:hover:text-indigo-300
                          ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4 hover:translate-x-1'}`}
                      >
                        <ExternalLink className="h-5 w-5 text-gray-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:scale-110 flex-shrink-0 transition-transform duration-300" />
                        {!isSidebarCollapsed && <span className="relative z-10 truncate">{tool.title}</span>}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </nav>

          <div className="mt-auto p-3 border-t dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
            {!isSidebarCollapsed ? (
              <>
                <div className="flex items-center gap-3 mb-3 px-2 py-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-slate-700 hover:shadow-sm">
                  <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white dark:border-slate-800 shadow-sm flex-shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-sm font-bold text-gray-900 dark:text-slate-100 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 font-medium"
                >
                  <LogOut className="h-4 w-4 hover:scale-110 transition-transform" />
                  Đăng Xuất
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3 py-2">
                <img src={user?.avatar || "https://via.placeholder.com/40"} alt="User" title={user?.name} className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white dark:border-slate-800 shadow-sm flex-shrink-0 cursor-pointer" />
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  className="flex items-center justify-center w-10 h-10 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden relative flex flex-col pb-8" >
        {/* Top Bar for Desktop */}
        <div className="hidden md:flex justify-end items-center mb-6 gap-4" >
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border dark:border-slate-800 shadow-sm transition-all"
            title="Đổi giao diện"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* Notifications */}
          <div className="relative" >
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-full bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 border dark:border-slate-800 shadow-sm transition-all"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 font-bold">
                  {unreadCount}
                </span>
              )}
            </button>

            {
              isNotifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-xl border dark:border-slate-800 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                  <div className="p-3 border-b dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-950/50 rounded-t-xl">
                    <h3 className="font-bold text-sm text-gray-800 dark:text-slate-200">Thông báo</h3>
                    {unreadCount > 0 && (
                      <button onClick={() => user && markAllNotificationsRead(user.id)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {myNotifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 dark:text-slate-500 text-sm">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        Không có thông báo mới
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-slate-800">
                        {myNotifications.map(n => (
                          <div
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors ${!n.isRead ? 'bg-indigo-50/50 dark:bg-indigo-950/30' : ''}`}
                          >
                            <div className="flex gap-3">
                              <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${!n.isRead ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-transparent'}`}></div>
                              <div>
                                <p className={`text-sm ${!n.isRead ? 'font-bold text-gray-900 dark:text-slate-100' : 'text-gray-700 dark:text-slate-300'}`}>{n.title}</p>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                                <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-1">{new Date(n.createdAt).toLocaleDateString('vi-VN')} {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            }
          </div>

          {/* User Guide */}
          <button
            onClick={() => setIsGuideOpen(true)}
            className="p-2 rounded-full bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800 border border-indigo-100 dark:border-slate-800 shadow-sm transition-all flex items-center gap-2 px-4 group"
            title="Hướng dẫn sử dụng"
          >
            <HelpCircle className="h-5 w-5 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold">Hướng dẫn</span>
          </button>
        </div>

        {/* Toasts Popup (Bottom Right) */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" >
          {
            myNotifications.filter(n => !n.isRead && new Date(n.createdAt).getTime() > Date.now() - 5000).map(n => (
              <div key={n.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-2xl border dark:border-slate-800 border-l-4 border-l-indigo-500 dark:border-l-indigo-400 w-80 animate-in slide-in-from-right pointer-events-auto flex gap-3">
                <CheckCircle className="h-6 w-6 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-slate-100 text-sm">{n.title}</h4>
                  <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">{n.message}</p>
                  <button onClick={() => handleNotifClick(n)} className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-2 hover:underline">Xem ngay</button>
                </div>
              </div>
            ))
          }
        </div>

        {children}
        
        <Footer isSidebarCollapsed={isSidebarCollapsed} />
        
        <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />

        {activeShare && (
          <AcceptShareModal
            notificationId={activeShare.notifId}
            examId={activeShare.examId}
            isOpen={!!activeShare}
            onClose={() => setActiveShare(null)}
          />
        )}
      </main>

      {/* Scroll to Top / Bottom Buttons */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2 pointer-events-none">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Cuộn lên đầu trang"
          className={`p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none hover:border-indigo-100 dark:hover:border-slate-700 flex items-center justify-center cursor-pointer group relative ${showScrollTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-75 pointer-events-none'}`}
          title="Cuộn lên đầu trang"
        >
          <ChevronUp className="h-5 w-5" />
          <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Cuộn lên đầu
          </span>
        </button>
        <button
          onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}
          aria-label="Cuộn xuống cuối trang"
          className={`p-3 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 motion-reduce:transition-none motion-reduce:transform-none hover:border-indigo-100 dark:hover:border-slate-700 flex items-center justify-center cursor-pointer group relative ${showScrollBottom ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-75 pointer-events-none'}`}
          title="Cuộn xuống cuối trang"
        >
          <ChevronDown className="h-5 w-5" />
          <span className="absolute right-full mr-2 px-2 py-1 bg-gray-900/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            Cuộn xuống cuối
          </span>
        </button>
      </div>

      {/* Mobile Overlay */}
      {
        isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-20 md:hidden transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )
      }
    </div>
  );
};
