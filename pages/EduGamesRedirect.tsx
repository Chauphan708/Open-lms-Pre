import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useStore } from '../store';
import { Loader2 } from 'lucide-react';

export const EduGamesRedirect = () => {
  const { user, isDataLoading } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [waiting, setWaiting] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (isCancelled) return;

    // Đợi 1.5 giây để đảm bảo Store đã nạp User xong (tránh lỗi cache/delay)
    const timer = setTimeout(() => {
      setWaiting(false);
      if (!user && !isDataLoading) {
        setError('Hệ thống không nhận diện được tài khoản. Vui lòng thử Đăng xuất và Đăng nhập lại.');
      }
    }, 1500);

    if (user) {
      try {
        // Lấy API Key từ localStorage của LMS (nếu có)
        const geminiApiKey = localStorage.getItem('gemini_api_key');

        // Tạo Payload "Mock JWT" chứa thông tin cơ bản
        const mockPayload = {
          id: user.id || 'guest',
          name: user.name || 'Người dùng LMS',
          role: (user.role || 'STUDENT').toLowerCase(),
          email: user.email || '',
          class_id: user.className || '',
          gemini_api_key: geminiApiKey // Gửi kèm API Key
        };

        const base64Token = btoa(encodeURIComponent(JSON.stringify(mockPayload)));
        const GAME_BASE_URL = window.location.hostname === 'localhost' 
              ? 'http://localhost:5174' 
              : 'https://edu-games-gamma.vercel.app'; 

        const targetPath = user.role === 'STUDENT' ? '/arena' : '/teacher';
        const bridgeUrl = `${GAME_BASE_URL}${targetPath}?lms_token=${base64Token}`;
        
        window.location.href = bridgeUrl;
      } catch (err: any) {
        setError('Lỗi mã hóa SSO: ' + err.message);
      }
    }

    return () => clearTimeout(timer);
  }, [user, isDataLoading, isCancelled]);

  if (isCancelled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white min-h-[60vh]">
         <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 shadow-xl max-w-md">
            <h2 className="text-3xl font-black text-indigo-700 mb-4">Đã hủy chuyển hướng!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">Bạn đã hủy kết nối tới hệ thống trò chơi.</p>
            <button 
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all hover:scale-105" 
              onClick={() => window.location.href = '/'}
            >
               Quay về Trang chủ LMS
            </button>
         </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white min-h-[60vh]">
         <div className="bg-red-50 p-8 rounded-3xl border border-red-100 shadow-xl max-w-md">
            <h2 className="text-3xl font-black text-red-600 mb-4">Rất tiếc!</h2>
            <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
            <button 
              className="px-8 py-3 bg-red-600 text-white rounded-2xl font-bold shadow-lg shadow-red-200 hover:bg-red-700 transition-all hover:scale-105" 
              onClick={() => window.location.href = '/'}
            >
               Quay về Trang chủ
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-indigo-50/30 min-h-[60vh]">
      <div className="relative">
        <Loader2 className="h-20 w-20 text-indigo-600 animate-spin mb-6" />
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-3 w-3 bg-indigo-400 rounded-full animate-ping"></div>
        </div>
      </div>
      <h2 className="text-3xl font-black text-gray-800 mb-2">Đang kết nối Trò Chơi...</h2>
      <p className="text-indigo-500 font-medium animate-pulse">
        {waiting ? "Đang xác thực bảo mật tài khoản..." : "Mã hóa thông tin thành công, đang chuyển hướng..."}
      </p>
      
      {/* Nút bấm dừng khẩn cấp tránh bị kẹt */}
      <button 
        onClick={() => setIsCancelled(true)}
        className="mt-6 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors underline"
      >
        Hủy chuyển hướng & Quay về Trang chủ
      </button>

      <div className="mt-8 flex gap-2">
         {[1,2,3].map(i => <div key={i} className={`h-2 w-2 rounded-full bg-indigo-200 animate-bounce delay-${i}00`}></div>)}
      </div>
    </div>
  );
};
