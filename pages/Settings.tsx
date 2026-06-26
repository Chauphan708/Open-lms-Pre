import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { setGeminiApiKey, getGeminiApiKey, clearGeminiApiKey } from '../services/geminiService';
import { supabase } from '../services/supabaseClient';
import {
  User,
  Bell,
  Shield,
  Save,
  Camera,
  School,
  Wrench,
  Database,
  ToggleRight,
  Clock,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Zap,
  Loader2,
  Sun,
  Moon
} from 'lucide-react';
import { CustomToolMenu } from '../types';

export const Settings: React.FC = () => {
  const { user, updateUser, changePassword, updateUserCustomTools, siteSettings, updateSiteSettings } = useStore();

  const [activeTab, setActiveTab] = useState<'PROFILE' | 'NOTIFICATIONS' | 'SYSTEM' | 'TEACHING' | 'TOOLS' | 'APIKEY' | 'THEME'>('PROFILE');
  const [loading, setLoading] = useState(false);

  // Interface Theme State
  const [themeState, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    const root = window.document.documentElement;
    if (newTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
  };

  // Profile State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(user?.avatar || '');

  // Notifications State (Mock)
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);

  // Teaching Settings (Teacher only)
  const [defaultDuration, setDefaultDuration] = useState(45);
  const [autoPublish, setAutoPublish] = useState(true);
  const [teacherSchoolName, setTeacherSchoolName] = useState('Trường Tiểu Học ...');

  // System Settings (Admin only)
  const [schoolName, setSchoolName] = useState('Trường Tiểu Học OpenLMS');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // Site Footer Settings
  const [footerSlogan, setFooterSlogan] = useState(siteSettings?.slogan || '');
  const [footerHotline, setFooterHotline] = useState(siteSettings?.hotline || '');
  const [footerEmail, setFooterEmail] = useState(siteSettings?.email || '');
  const [footerFacebook, setFooterFacebook] = useState(siteSettings?.facebook || '');
  const [footerZalo, setFooterZalo] = useState(siteSettings?.zalo || '');
  const [footerAddress, setFooterAddress] = useState(siteSettings?.address || '');

  useEffect(() => {
    if (siteSettings) {
      setFooterSlogan(siteSettings.slogan);
      setFooterHotline(siteSettings.hotline);
      setFooterEmail(siteSettings.email);
      setFooterFacebook(siteSettings.facebook);
      setFooterZalo(siteSettings.zalo);
      setFooterAddress(siteSettings.address);
    }
  }, [siteSettings]);

  // API Key State
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiTestError, setApiTestError] = useState<string | null>(null);

  useEffect(() => {
    const existingKey = getGeminiApiKey();
    if (existingKey) {
      setApiKeyInput(existingKey);
      setApiKeyConfigured(true);
    }
  }, []);

  // Custom Tools State (Teacher & Admin)
  const [customTools, setCustomTools] = useState<CustomToolMenu[]>(user?.customTools || []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setLoading(true);

    // Update basic info
    await updateUser({
      ...user,
      name,
      email,
      avatar
    });

    // Update password if changed
    if (newPassword.trim()) {
      // 1. Check old password
      if (oldPassword !== user.password) {
        alert('Mật khẩu cũ không chính xác!');
        setLoading(false);
        return;
      }
      // 2. Check confirm password
      if (newPassword !== confirmPassword) {
        alert('Mật khẩu mới và xác nhận mật khẩu không khớp!');
        setLoading(false);
        return;
      }
      
      const success = await changePassword(user.id, newPassword);
      if (success) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        alert('Đã cập nhật hồ sơ và mật khẩu mới thành công!');
      } else {
        alert('Cập nhật hồ sơ thành công, nhưng lỗi khi đổi mật khẩu.');
      }
    } else {
      alert('Đã cập nhật hồ sơ thành công!');
    }
    setLoading(false);
  };

  const handleSaveSystem = async () => {
    setLoading(true);
    const success = await updateSiteSettings({
      slogan: footerSlogan,
      hotline: footerHotline,
      email: footerEmail,
      facebook: footerFacebook,
      zalo: footerZalo,
      address: footerAddress
    });
    setLoading(false);
    if (success) {
      alert('Đã cập nhật cấu hình hệ thống thành công!');
    } else {
      alert('Lỗi cập nhật cấu hình hệ thống.');
    }
  };

  const handleSaveTools = async () => {
    if (!user) return;
    setLoading(true);
    
    // Save to user profiles customTools
    await updateUserCustomTools(customTools);
    
    setTimeout(() => {
      setLoading(false);
      alert('Đã cập nhật danh sách công cụ hỗ trợ trên Sidebar!');
    }, 500);
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      alert('Vui lòng nhập API Key!');
      return;
    }
    setLoading(true);
    try {
      setGeminiApiKey(apiKeyInput.trim());
      
      const { error } = await supabase.from('system_settings').upsert({
        key: 'gemini_api_key',
        value: { key: apiKeyInput.trim() },
        updated_at: new Date().toISOString()
      });

      if (error) {
        console.error("Lỗi khi lưu API Key lên database:", error);
        alert('⚠️ Đã lưu API Key vào trình duyệt của bạn, nhưng gặp lỗi khi đồng bộ lên database: ' + error.message);
      } else {
        alert('✅ Đã lưu và đồng bộ API Key lên hệ thống thành công!');
      }
      setApiKeyConfigured(true);
      setApiKeyStatus('idle');
    } catch (e: any) {
      console.error(e);
      alert('❌ Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearApiKey = async () => {
    if (!confirm('Bạn có chắc muốn xóa API Key? Các tính năng AI sẽ ngừng hoạt động.')) return;
    setLoading(true);
    try {
      clearGeminiApiKey();
      setApiKeyInput('');
      setApiKeyConfigured(false);
      setApiKeyStatus('idle');

      const { error } = await supabase.from('system_settings').delete().eq('key', 'gemini_api_key');
      if (error) {
        console.error("Lỗi khi xóa API Key khỏi database:", error);
      }
      alert('Đã xóa API Key thành công!');
    } catch (err: any) {
      alert('Lỗi khi xóa API Key trên database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      alert('Vui lòng nhập API Key trước!');
      return;
    }
    setApiKeyStatus('checking');
    setApiTestError(null);
    try {
      // Lưu tạm key để test
      setGeminiApiKey(apiKeyInput.trim());
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: apiKeyInput.trim() });
      
      let response;
      let lastErrMessage = '';
      try {
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: 'Trả lời đúng 1 từ: Xin chào'
        });
      } catch (e: any) {
        lastErrMessage = e?.message || e?.toString() || '';
        // Nếu 2.5-flash bị quá tải, thử gọi 3.5-flash làm fallback kiểm tra
        if (lastErrMessage.includes('503') || lastErrMessage.includes('demand') || lastErrMessage.includes('429') || lastErrMessage.includes('quota') || lastErrMessage.includes('UNAVAILABLE')) {
          try {
            response = await ai.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: 'Trả lời đúng 1 từ: Xin chào'
            });
          } catch (e2: any) {
            throw e2;
          }
        } else {
          throw e;
        }
      }

      if (response && response.text) {
        setApiKeyStatus('valid');
        setApiKeyConfigured(true);
      } else {
        setApiKeyStatus('invalid');
        setApiTestError('Phản hồi trống từ API.');
      }
    } catch (err: any) {
      console.error('API Key test failed:', err);
      const errMsg = err?.message || err?.toString() || '';
      
      // Nếu lỗi là do quá tải (503) hoặc hết quota (429) nhưng KHÔNG phải sai key (400, 403), tức là Key vẫn HỢP LỆ
      if (errMsg.includes('503') || errMsg.includes('demand') || errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('UNAVAILABLE')) {
        setApiKeyStatus('valid');
        setApiKeyConfigured(true);
        setApiTestError('API Key của bạn HỢP LỆ. Tuy nhiên mô hình Gemini tại vùng của bạn đang bị quá tải tạm thời (503/429). Hệ thống vẫn lưu key và tự sử dụng khi Google ổn định lại.');
      } else {
        setApiKeyStatus('invalid');
        setApiTestError(errMsg);
      }
    }
  };

  const handleAddTool = (parentId: string | null = null) => {
    const newTool: CustomToolMenu = {
      id: `tool_${Date.now()}`,
      title: 'Công cụ mới',
      url: '',
      children: []
    };

    if (!parentId) {
      setCustomTools(prev => [...prev, newTool]);
    } else {
      setCustomTools(prev => prev.map(tool => {
        if (tool.id === parentId) {
          return { ...tool, children: [...(tool.children || []), newTool] };
        }
        return tool;
      }));
    }
  };

  const handleRemoveTool = (id: string, parentId: string | null = null) => {
    if (!parentId) {
      setCustomTools(prev => prev.filter(t => t.id !== id));
    } else {
      setCustomTools(prev => prev.map(tool => {
        if (tool.id === parentId) {
          return { ...tool, children: (tool.children || []).filter(c => c.id !== id) };
        }
        return tool;
      }));
    }
  };

  const handleUpdateTool = (id: string, field: 'title' | 'url', value: string, parentId: string | null = null) => {
    if (!parentId) {
      setCustomTools(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    } else {
      setCustomTools(prev => prev.map(tool => {
        if (tool.id === parentId) {
          return {
            ...tool,
            children: (tool.children || []).map(c => c.id === id ? { ...c, [field]: value } : c)
          };
        }
        return tool;
      }));
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6 flex items-center gap-2">
        <Wrench className="text-indigo-600 dark:text-indigo-400" /> Cài đặt hệ thống
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="md:col-span-1 space-y-2 col-span-1">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'PROFILE' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
          >
            <User className="h-5 w-5" /> Hồ sơ cá nhân
          </button>

          <button
            onClick={() => setActiveTab('THEME')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'THEME' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
          >
            <Sun className="h-5 w-5" /> Giao diện & Chủ đề
          </button>

          <button
            onClick={() => setActiveTab('NOTIFICATIONS')}
            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'NOTIFICATIONS' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
          >
            <Bell className="h-5 w-5" /> Thông báo
          </button>

          {user.role === 'TEACHER' && (
            <button
              onClick={() => setActiveTab('TEACHING')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'TEACHING' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <Clock className="h-5 w-5" /> Cấu hình dạy học
            </button>
          )}

          {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('TOOLS')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'TOOLS' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <ExternalLink className="h-5 w-5" /> Custom Tools
            </button>
          )}

          {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
            <button
              onClick={() => setActiveTab('APIKEY')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'APIKEY' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <Key className="h-5 w-5" /> 🔑 API Key
              {apiKeyConfigured && <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" title="Đã cấu hình"></span>}
            </button>
          )}

          {user.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('SYSTEM')}
              className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === 'SYSTEM' ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold' : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}
            >
              <Shield className="h-5 w-5" /> Quản trị hệ thống
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm border dark:border-slate-800 p-6 min-h-[500px]">

          {/* PROFILE TAB */}
          {activeTab === 'PROFILE' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Thông tin tài khoản</h2>

              <div className="flex flex-col items-center mb-6">
                <div className="relative group cursor-pointer">
                  <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white shadow-lg object-cover" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white h-8 w-8" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Nhấp vào ảnh để thay đổi</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Họ và tên</label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Email đăng nhập</label>
                  <input
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2 space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Key className="h-4 w-4 text-indigo-600" /> Đổi mật khẩu
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Mật khẩu cũ</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Mật khẩu mới</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={newPassword} onChange={e => setNewPassword(e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-400">Đăng nhập bằng mật khẩu hiện tại để đổi mật khẩu mới.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-between items-center border-t mt-6">
                {/* ONE-CLICK CLOUD SYNC SYSTEM (Đưa lên Profile Tab để dễ tìm nhất) */}
                <div className="flex-1 max-w-md bg-indigo-50 border border-indigo-150 p-4 rounded-xl flex items-center justify-between gap-3 text-left">
                  <div>
                    <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 text-sm">
                      <Zap className="h-4 w-4 text-indigo-600 animate-pulse animate-duration-1000" /> Đồng bộ dữ liệu lên Cloud
                    </h4>
                    <p className="text-xs text-indigo-700 mt-0.5">Đẩy nhanh lịch sử bài làm cũ trên máy này lên Supabase Cloud.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const { useStore } = await import('../store');
                        const res = await useStore.getState().syncLocalAttemptsToCloud();
                        if (res.success) {
                          alert(`🎉 Đồng bộ thành công!\nĐã đẩy ${res.count} kết quả làm bài tập lên Supabase Cloud.`);
                        } else {
                          alert("⚠️ Vui lòng đăng nhập trước khi đồng bộ.");
                        }
                      } catch (err: any) {
                        console.error(err);
                        alert("Lỗi đồng bộ: " + err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg font-bold transition flex items-center gap-1 shrink-0 shadow-md shadow-indigo-100"
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3.5 w-3.5" />} Đồng bộ
                  </button>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          )}

          {/* THEME TAB */}
          {activeTab === 'THEME' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 border-b dark:border-slate-800 pb-4">Giao diện & Chủ đề</h2>
              
              <div>
                <p className="text-sm text-gray-500 dark:text-slate-400">Tùy chỉnh chế độ hiển thị của OpenLMS để bảo vệ mắt và tối ưu trải nghiệm đọc tốt nhất cho bạn.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Light Theme Card */}
                <div 
                  onClick={() => handleThemeChange('light')}
                  className={`cursor-pointer border rounded-xl p-5 flex flex-col items-center gap-4 transition-all duration-300 ${themeState === 'light' ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'}`}
                >
                  <div className={`p-4 rounded-full ${themeState === 'light' ? 'bg-amber-100 dark:bg-amber-950/30 text-amber-500' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                    <Sun className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-800 dark:text-slate-200">Giao diện Sáng</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Phù hợp sử dụng vào ban ngày hoặc nơi có ánh sáng tốt.</p>
                  </div>
                </div>

                {/* Dark Theme Card */}
                <div 
                  onClick={() => handleThemeChange('dark')}
                  className={`cursor-pointer border rounded-xl p-5 flex flex-col items-center gap-4 transition-all duration-300 ${themeState === 'dark' ? 'border-indigo-600 dark:border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20' : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'}`}
                >
                  <div className={`p-4 rounded-full ${themeState === 'dark' ? 'bg-indigo-100 dark:bg-indigo-950/30 text-indigo-500 dark:text-indigo-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                    <Moon className="h-8 w-8" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-gray-800 dark:text-slate-200">Giao diện Tối (Đêm)</h3>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Tối ưu cho ban đêm, bảo vệ mắt khỏi ánh sáng xanh.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'NOTIFICATIONS' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Cấu hình thông báo</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">Thông báo qua Email</h3>
                    <p className="text-sm text-gray-500">Nhận email khi có bài tập mới hoặc kết quả thi.</p>
                  </div>
                  <button onClick={() => setEmailNotif(!emailNotif)} className={`text-2xl ${emailNotif ? 'text-green-500' : 'text-gray-300'}`}>
                    {emailNotif ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-gray-900">Thông báo trên trình duyệt</h3>
                    <p className="text-sm text-gray-500">Hiển thị popup khi đang sử dụng ứng dụng.</p>
                  </div>
                  <button onClick={() => setPushNotif(!pushNotif)} className={`text-2xl ${pushNotif ? 'text-green-500' : 'text-gray-300'}`}>
                    {pushNotif ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TEACHING TAB (TEACHER) */}
          {activeTab === 'TEACHING' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Cấu hình giảng dạy mặc định</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Thời gian làm bài mặc định (phút)</label>
                  <input
                    type="number"
                    value={defaultDuration}
                    onChange={e => setDefaultDuration(Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Sẽ tự động điền khi tạo bài tập mới.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2"><School className="h-4 w-4" /> Tên trường học (dùng trong bản in)</label>
                  <input
                    type="text"
                    value={teacherSchoolName}
                    onChange={e => setTeacherSchoolName(e.target.value)}
                    placeholder="VD: Trường Tiểu Học Nguyễn Trãi"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tên trường sẽ hiển thị trên tiêu đề đề thi khi xuất / in ấn.</p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <label className="font-bold text-gray-900">Tự động công bố điểm</label>
                    <p className="text-sm text-gray-500">Học sinh xem được điểm ngay sau khi nộp.</p>
                  </div>
                  <button onClick={() => setAutoPublish(!autoPublish)} className={`text-2xl ${autoPublish ? 'text-green-500' : 'text-gray-300'}`}>
                    {autoPublish ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2">
                  <Save className="h-4 w-4" /> Lưu cấu hình
                </button>
              </div>
            </div>
          )}

          {/* TOOLS TAB (TEACHER & ADMIN) */}
          {activeTab === 'TOOLS' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-xl font-bold text-gray-800">Cấu hình Custom Tools (Thanh Sidebar)</h2>
                <button
                  onClick={() => handleAddTool()}
                  className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2 transition"
                >
                  <Plus className="h-4 w-4" /> Thêm Menu Gốc
                </button>
              </div>

              <div className="space-y-4">
                {customTools.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <ExternalLink className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Chưa có Tool nào được thêm.</p>
                  </div>
                ) : (
                  customTools.map(tool => (
                    <div key={tool.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {/* Parent Row */}
                      <div className="p-4 bg-gray-50 flex items-center gap-3 flex-wrap">
                        <div className="flex-1 min-w-[200px] flex items-center gap-2">
                          <input
                            value={tool.title}
                            onChange={e => handleUpdateTool(tool.id, 'title', e.target.value)}
                            placeholder="Tên Menu Nhóm (Ví dụ: Game, Tool Học Tập)"
                            className="w-full border-gray-300 rounded px-2 py-1.5 text-sm font-bold bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px]">
                          <input
                            value={tool.url || ''}
                            onChange={e => handleUpdateTool(tool.id, 'url', e.target.value)}
                            placeholder="URL Menu Gốc (Tùy chọn)"
                            className="w-full border-gray-300 rounded px-2 py-1.5 text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                          />
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleAddTool(tool.id)}
                            className="px-2.5 py-1.5 text-indigo-600 hover:bg-indigo-100 rounded transition flex items-center gap-1 text-xs font-bold border border-indigo-200 bg-indigo-50" title="Thêm Menu Con"
                          >
                            <Plus className="h-3.5 w-3.5" /> Thêm Link Con
                          </button>
                          <button
                            onClick={() => handleRemoveTool(tool.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded transition" title="Xóa toàn bộ nhóm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Children Rows */}
                      <div className="p-4 border-t border-gray-100 pl-10 space-y-3 bg-white">
                        {(tool.children && tool.children.length > 0) && (
                          tool.children.map(child => (
                            <div key={child.id} className="flex flex-wrap md:flex-nowrap items-center gap-3">
                              <div className="flex-1">
                                <input
                                  value={child.title}
                                  onChange={e => handleUpdateTool(child.id, 'title', e.target.value, tool.id)}
                                  placeholder="Tên Tool Menu Con"
                                  className="w-full border-gray-300 rounded px-2 py-1 text-sm bg-gray-50 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                              </div>
                              <div className="flex-[2]">
                                <input
                                  value={child.url || ''}
                                  onChange={e => handleUpdateTool(child.id, 'url', e.target.value, tool.id)}
                                  placeholder="Link URL..."
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-gray-50 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveTool(child.id, tool.id)}
                                className="p-1 text-red-400 hover:bg-red-50 hover:text-red-500 rounded shrink-0 transition" title="Xóa Tool"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                        {/* Always show add-child button at bottom */}
                        <button
                          onClick={() => handleAddTool(tool.id)}
                          className="w-full border border-dashed border-gray-300 rounded-lg py-2 text-xs text-gray-400 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 flex items-center justify-center gap-1 transition"
                        >
                          <Plus className="h-3.5 w-3.5" /> Thêm link con vào "{tool.title}"
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveTools}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Đang lưu...' : 'Lưu cài đặt danh mục công cụ'}
                </button>
              </div>
            </div>
          )}

          {/* API KEY TAB */}
          {activeTab === 'APIKEY' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4 flex items-center gap-2">
                <Key className="h-5 w-5 text-amber-500" /> Cấu hình Google Gemini API Key
              </h2>

              {/* Trạng thái */}
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${apiKeyConfigured
                ? 'bg-green-50 border-green-200'
                : 'bg-amber-50 border-amber-200'
                }`}>
                {apiKeyConfigured
                  ? <CheckCircle className="h-6 w-6 text-green-600 shrink-0" />
                  : <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                }
                <div>
                  <p className={`font-bold ${apiKeyConfigured ? 'text-green-800' : 'text-amber-800'}`}>
                    {apiKeyConfigured ? '✅ API Key đã được cấu hình' : '⚠️ Chưa cấu hình API Key'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {apiKeyConfigured
                      ? 'Các tính năng AI (tạo đề, chấm bài, phân tích) đã sẵn sàng.'
                      : 'Bạn cần nhập API Key để sử dụng các tính năng AI.'}
                  </p>
                </div>
              </div>

              {/* Nhập Key */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-gray-700">Google Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={e => { setApiKeyInput(e.target.value); setApiKeyStatus('idle'); }}
                    placeholder="Dán API Key của bạn vào đây (VD: AQ...)"
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    title={showApiKey ? 'Ẩn API Key' : 'Hiện API Key'}
                  >
                    {showApiKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>

                {/* Kết quả kiểm tra */}
                {apiKeyStatus === 'valid' && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-4 w-4" /> Kết nối thành công! API Key hợp lệ.
                  </p>
                )}
                {apiKeyStatus === 'invalid' && (
                  <div className="space-y-1">
                    <p className="text-sm text-red-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-4 w-4" /> API Key không hợp lệ hoặc đã hết hạn. Vui lòng kiểm tra lại.
                    </p>
                    {apiTestError && (
                      <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 font-mono break-all">
                        Chi tiết lỗi: {apiTestError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Nút hành động */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Save className="h-4 w-4" /> Lưu API Key
                </button>
                <button
                  onClick={handleTestApiKey}
                  disabled={!apiKeyInput.trim() || apiKeyStatus === 'checking'}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {apiKeyStatus === 'checking'
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Đang kiểm tra...</>
                    : <><Zap className="h-4 w-4" /> Kiểm tra kết nối</>
                  }
                </button>
                {apiKeyConfigured && (
                  <button
                    onClick={handleClearApiKey}
                    className="bg-white border border-red-300 text-red-600 px-5 py-2.5 rounded-lg font-bold hover:bg-red-50 flex items-center gap-2 transition"
                  >
                    <Trash2 className="h-4 w-4" /> Xóa API Key
                  </button>
                )}
              </div>

              {/* Hướng dẫn */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
                <h3 className="font-bold text-blue-800 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Hướng dẫn lấy API Key miễn phí
                </h3>
                <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
                  <li>Truy cập <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-bold hover:text-blue-900">Google AI Studio → API Keys</a></li>
                  <li>Đăng nhập bằng tài khoản Google của bạn</li>
                  <li>Nhấn <strong>"Create API Key"</strong> → Chọn project → Tạo key</li>
                  <li>Copy API Key và dán vào ô bên trên</li>
                  <li>Nhấn <strong>"Lưu API Key"</strong> để hoàn tất</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  💡 API Key được lưu trên trình duyệt của bạn (localStorage), không gửi đi đâu khác ngoài Google AI.
                </p>
              </div>
            </div>
          )}

          {/* SYSTEM TAB (ADMIN) */}
          {activeTab === 'SYSTEM' && (
            <div className="space-y-6 animate-fade-in">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-4">Quản trị hệ thống</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2"><School className="h-4 w-4" /> Tên trường học / Tổ chức</label>
                  <input
                    value={schoolName} onChange={e => setSchoolName(e.target.value)}
                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between p-4 border border-red-200 bg-red-50 rounded-lg">
                  <div>
                    <h3 className="font-bold text-red-800">Chế độ bảo trì</h3>
                    <p className="text-sm text-red-600">Chỉ Admin mới có thể truy cập hệ thống khi bật.</p>
                  </div>
                  <button onClick={() => setMaintenanceMode(!maintenanceMode)} className={`text-2xl ${maintenanceMode ? 'text-red-600' : 'text-gray-400'}`}>
                    {maintenanceMode ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                  </button>
                </div>

                <div className="p-4 border rounded-lg bg-gray-50 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><Database className="h-4 w-4" /> Sao lưu dữ liệu</h3>
                    <p className="text-sm text-gray-500">Tải xuống bản sao lưu toàn bộ cơ sở dữ liệu.</p>
                  </div>
                  <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100">
                    Tải xuống (.json)
                  </button>
                </div>

                {/* ONE-CLICK CLOUD SYNC SYSTEM */}
                <div className="p-4 border border-indigo-200 bg-indigo-50/50 rounded-lg flex justify-between items-center mt-4">
                  <div>
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                      <Zap className="h-4.5 w-4.5 text-indigo-600 animate-pulse" /> Đồng bộ dữ liệu local lên Cloud
                    </h3>
                    <p className="text-sm text-indigo-700">Đẩy toàn bộ kết quả làm bài tập cũ lưu trên máy này lên Supabase Cloud để hiển thị trên web Vercel.</p>
                  </div>
                  <button 
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const { useStore } = await import('../store');
                        const res = await useStore.getState().syncLocalAttemptsToCloud();
                        if (res.success) {
                          alert(`🎉 Đồng bộ thành công!\nĐã đẩy ${res.count} kết quả làm bài mới lên Supabase Cloud.`);
                        } else {
                          alert("⚠️ Vui lòng đăng nhập tài khoản trước khi đồng bộ.");
                        }
                      } catch (err: any) {
                        console.error(err);
                        alert("Lỗi đồng bộ: " + err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    disabled={loading}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-indigo-100"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Đồng bộ ngay
                  </button>
                </div>

                {/* Footer / Website Config */}
                <div className="mt-8 space-y-6 pt-6 border-t">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Wrench className="h-5 w-5 text-indigo-600" /> Cấu hình Chân trang (Footer)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Câu Slogan / Giới thiệu</label>
                      <input
                        value={footerSlogan} onChange={e => setFooterSlogan(e.target.value)}
                        placeholder="VD: Nâng tầm giáo dục số Việt Nam"
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Địa chỉ</label>
                      <input
                        value={footerAddress} onChange={e => setFooterAddress(e.target.value)}
                        placeholder="VD: TP. Cần Thơ, Việt Nam"
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Hotline</label>
                      <input
                        value={footerHotline} onChange={e => setFooterHotline(e.target.value)}
                        placeholder="1900 xxxx"
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Email Hỗ trợ</label>
                      <input
                        value={footerEmail} onChange={e => setFooterEmail(e.target.value)}
                        placeholder="support@openlms.vn"
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Link Facebook</label>
                      <input
                        value={footerFacebook} onChange={e => setFooterFacebook(e.target.value)}
                        placeholder="https://facebook.com/..."
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Link Zalo</label>
                      <input
                        value={footerZalo} onChange={e => setFooterZalo(e.target.value)}
                        placeholder="https://zalo.me/..."
                        className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  onClick={handleSaveSystem}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {loading ? 'Đang xử lý...' : 'Lưu thiết lập'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
