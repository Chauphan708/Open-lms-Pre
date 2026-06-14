import React, { useState } from 'react';
import { 
  X, 
  LayoutDashboard, 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  Trophy, 
  Clock, 
  ChevronRight,
  Monitor,
  CheckCircle2,
  FileText,
  Users,
  Brain,
  Zap,
  Layout,
  Dices
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!isOpen) return null;

  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'exams', label: 'Bài tập & Đề thi', icon: BookOpen },
    { id: 'classes', label: 'Lớp học & Thi đua', icon: GraduationCap },
    { id: 'reports', label: 'Chấm bài & Thống kê', icon: BarChart3 },
    { id: 'extra', label: 'Tiện ích & Đấu trí', icon: Zap },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex gap-4 items-start">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <Monitor className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-indigo-900">Chào mừng GV đến với OpenLMS!</h3>
                <p className="text-sm text-indigo-700 mt-1">Hệ thống quản lý học tập thông minh, giúp bạn số hóa bài giảng và theo dõi học sinh hiệu quả.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl hover:shadow-md transition-shadow bg-white">
                <h4 className="font-bold flex items-center gap-2 mb-2 text-gray-800">
                  <LayoutDashboard className="h-4 w-4 text-indigo-500" />
                  Dashboard
                </h4>
                <p className="text-xs text-gray-600">Xem nhanh số lượng đề thi, lớp học và các hoạt động nộp bài mới nhất của học sinh.</p>
              </div>
              <div className="p-4 border rounded-xl hover:shadow-md transition-shadow bg-white">
                <h4 className="font-bold flex items-center gap-2 mb-2 text-gray-800">
                  <Users className="h-4 w-4 text-purple-500" />
                  Quản lý học sinh
                </h4>
                <p className="text-xs text-gray-600">Thêm học sinh thủ công hoặc nhập từ Excel để bắt đầu giao bài và quản lý thi đua.</p>
              </div>
            </div>
          </div>
        );
      case 'exams':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Quản lý Khảo thí & Bài tập</h3>
            <div className="space-y-4">
              <div className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="bg-blue-100 p-2 rounded-lg text-blue-600 mt-1">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Tạo bài tập & Đề thi</h4>
                  <p className="text-xs text-gray-600 mt-1">Sử dụng công cụ "Tạo Bài tập" hoặc "Ma trận đề" để thiết kế nội dung thi nhanh chóng từ ngân hàng câu hỏi.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="bg-green-100 p-2 rounded-lg text-green-600 mt-1">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Giao bài linh hoạt</h4>
                  <p className="text-xs text-gray-600 mt-1">Giao bài cho toàn lớp hoặc chọn danh sách từng học sinh cụ thể để bồi dưỡng riêng biệt.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className="bg-amber-100 p-2 rounded-lg text-amber-600 mt-1">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">Kiểm soát thời gian</h4>
                  <p className="text-xs text-gray-600 mt-1">Cài đặt thời điểm mở đề, hạn nộp bài và thời gian làm bài chính xác đến từng phút.</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'classes':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Lớp học & Thi đua ClassFun</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl bg-gradient-to-br from-indigo-50 to-white">
                <Trophy className="h-8 w-8 text-yellow-500 mb-3" />
                <h4 className="font-bold text-sm mb-2">Thưởng XP & Huy hiệu</h4>
                <p className="text-xs text-gray-600">Ghi nhận tích cực của học sinh qua hệ thống tích điểm kinh nghiệm (XP) và đổi quà ảo.</p>
              </div>
              <div className="p-4 border rounded-xl bg-gradient-to-br from-purple-50 to-white">
                <Users className="h-8 w-8 text-purple-500 mb-3" />
                <h4 className="font-bold text-sm mb-2">Điểm danh thông minh</h4>
                <p className="text-xs text-gray-600">Thực hiện điểm danh nhanh chóng ngay trên ứng dụng và tự động lưu lịch sử cho phụ huynh.</p>
              </div>
            </div>
            <div className="bg-white border p-4 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-indigo-900">
                  <Layout className="h-4 w-4 text-indigo-500" />
                  Sơ đồ lớp
                </h4>
                <p className="text-xs text-gray-600">Sắp xếp vị trí chỗ ngồi của học sinh một cách trực quan để dễ dàng quản lý và ghi nhớ mặt học sinh.</p>
              </div>
              <div>
                <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-orange-600">
                  <Dices className="h-4 w-4 text-orange-500" />
                  Gọi tên ngẫu nhiên
                </h4>
                <p className="text-xs text-gray-600">Kích thích sự tập trung của cả lớp bằng công cụ chọn học sinh trả lời bài ngẫu nhiên, công bằng.</p>
              </div>
            </div>
            
            <div className="bg-white border p-4 rounded-xl">
              <h4 className="font-bold text-sm mb-2 flex items-center gap-2 text-red-600">
                <ChevronRight className="h-4 w-4 text-red-500" />
                Cảnh báo hành vi
              </h4>
              <p className="text-xs text-gray-600">Nhắc nhở kịp thời các trường hợp vi phạm nội quy lớp học bằng các thông báo trực quan.</p>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Chấm bài & Thống kê AI</h3>
            <div className="space-y-3">
              <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl relative overflow-hidden">
                <Brain className="absolute -right-4 -bottom-4 h-24 w-24 text-indigo-200 opacity-50" />
                <h4 className="font-bold text-indigo-900 mb-1">Trợ lý chấm bài AI</h4>
                <p className="text-xs text-indigo-800">Tự động hóa việc chấm các bài trắc nghiệm và gợi ý nhận xét cho bài tự luận, giúp tiết kiệm 70% thời gian.</p>
              </div>
              <div className="p-4 border rounded-xl bg-white">
                <h4 className="font-bold mb-1 flex items-center gap-2 text-gray-800">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Phân tích phổ điểm
                </h4>
                <p className="text-xs text-gray-600">Xem thống kê chi tiết tỉ lệ % điểm giỏi, khá, trung bình và nhận biết nhanh các câu hỏi gây khó khăn cho học sinh.</p>
              </div>
            </div>
          </div>
        );
      case 'extra':
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <h3 className="font-bold text-lg text-gray-800 mb-4">Tiện ích & Giải trí</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-xl hover:border-indigo-300 transition-colors bg-white group">
                <Zap className="h-6 w-6 text-indigo-500 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm">Đấu trí (Arena)</h4>
                <p className="text-xs text-gray-600">Tổ chức các cuộc đấu trí thời gian thực (1vs1 hoặc Giải đấu) để kích thích tinh thần học tập.</p>
              </div>
              <div className="p-4 border rounded-xl hover:border-purple-300 transition-colors bg-white group">
                <Clock className="h-6 w-6 text-purple-500 mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-bold text-sm">Đồng hồ đếm ngược</h4>
                <p className="text-xs text-gray-600">Công cụ hỗ trợ các hoạt động thảo luận nhóm và làm bài tập tại lớp.</p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 bg-gray-50 border-r p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="font-black text-gray-900 tracking-tight">HƯỚNG DẪN</span>
          </div>
          
          <nav className="space-y-1 flex-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-[1.02]' 
                      : 'text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm'}`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
          
          <div className="mt-8 pt-6 border-t font-medium text-[10px] text-gray-400 text-center uppercase tracking-widest leading-relaxed">
            OpenLMS System v2.0
          </div>
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-6 border-b flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-900">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {renderContent()}
          </div>
          
          <div className="p-6 border-t bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
            <span>Mẹo: Bạn có thể nhấn <b>Esc</b> để đóng nhanh hướng dẫn.</span>
            <button 
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl font-bold hover:bg-indigo-600 transition-colors shadow-lg shadow-gray-200"
            >
              Đã hiểu!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuideModal;
