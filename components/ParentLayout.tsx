import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, Home, Key, User, FileText, Activity } from 'lucide-react';
import { useParentStore } from '../services/parentStore';

export const ParentLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentParent, parentLogout } = useParentStore();
  const navigate = useNavigate();
  const location = useLocation();

  const MENU = [
    { name: 'Tổng quan', path: '/parent/dashboard', icon: Home },
    { name: 'Nhận xét TT27', path: '/parent/evaluations', icon: FileText },
    { name: 'Điểm hành vi', path: '/parent/behavior', icon: Activity },
    { name: 'Lịch sử học tập', path: '/parent/exams', icon: FileText }
  ];

  const handleLogout = () => {
    parentLogout();
    navigate('/parent/login');
  };

  return (
    <div className="min-h-screen bg-emerald-50/50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-emerald-800 text-white flex flex-col shadow-xl flex-shrink-0">
        <div className="p-6 border-b border-emerald-700">
          <div className="flex items-center gap-3 font-bold text-xl">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-emerald-100" />
            </div>
            <span>Cổng Phụ Huynh</span>
          </div>
          {currentParent && (
            <div className="mt-4 text-sm text-emerald-200">
              Xin chào, <br/>
              <span className="font-bold text-white text-base">{currentParent.name}</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {MENU.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium
                  ${isActive 
                    ? 'bg-emerald-600 text-white shadow-md' 
                    : 'text-emerald-100 hover:bg-emerald-700/50 hover:text-white'
                  }`}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-emerald-700">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-4 py-3 text-emerald-200 hover:bg-emerald-700 rounded-xl transition-colors font-medium text-sm"
          >
            <LogOut className="h-5 w-5" /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-full overflow-hidden flex flex-col min-h-screen">
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
