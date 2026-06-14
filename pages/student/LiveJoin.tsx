import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import { QrCode, ArrowRight, UserCircle } from 'lucide-react';

export const LiveJoin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { joinLiveSession, user, setUser } = useStore();
  
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [guestName, setGuestName] = useState('');
  const [error, setError] = useState('');

  // Auto-fill guest name if logged in
  useEffect(() => {
    if (user) {
        setGuestName(user.name);
    }
  }, [user]);

  const handleJoin = () => {
    if (!pin) {
        setError('Vui lòng nhập mã PIN');
        return;
    }
    if (!user && !guestName) {
        setError('Vui lòng nhập tên của bạn');
        return;
    }

    // If not logged in, create a temporary guest user
    let currentUser = user;
    if (!currentUser) {
        currentUser = {
            id: `guest_${Date.now()}`,
            name: guestName,
            email: 'guest@temp.com',
            role: 'STUDENT',
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(guestName)}&background=random`
        };
        setUser(currentUser);
    }

    const success = joinLiveSession(pin, currentUser);
    if (success) {
        navigate(`/live/lobby/${pin}`);
    } else {
        setError('Không tìm thấy phòng thi hoặc mã PIN không đúng.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
           <QrCode className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tham gia thi trực tuyến</h1>
        <p className="text-gray-500 mb-8 text-sm">Nhập mã PIN giáo viên cung cấp để vào phòng.</p>

        <div className="space-y-4 text-left">
           <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Mã PIN phòng thi</label>
              <input 
                type="text" 
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="VD: 123456"
                className="w-full border border-gray-300 rounded-xl p-4 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none uppercase text-gray-900 bg-white"
              />
           </div>

           {!user && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Tên của bạn</label>
                <div className="relative">
                   <UserCircle className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                   <input 
                     type="text"
                     value={guestName}
                     onChange={e => setGuestName(e.target.value)}
                     placeholder="Nhập họ và tên..."
                     className="w-full border border-gray-300 rounded-xl pl-12 pr-4 py-3 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                </div>
              </div>
           )}
           
           {error && <p className="text-red-500 text-sm font-medium text-center">{error}</p>}

           <button 
             onClick={handleJoin}
             className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 shadow-lg transition-all flex items-center justify-center gap-2 group"
           >
             Vào phòng chờ <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};