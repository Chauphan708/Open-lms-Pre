import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Loader2, UserCheck, Music } from 'lucide-react';

export const LiveLobby: React.FC = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { liveSessions, user } = useStore();
  
  // Find session and participant info
  const session = liveSessions.find(s => s.id === pin);
  
  // Check session status constantly
  useEffect(() => {
    if (!session) {
        navigate('/live/join'); 
        return;
    }

    if (session.status === 'RUNNING') {
        // Redirect to exam take page with live mode
        navigate(`/exam/${session.examId}/take?live=${pin}`);
    } else if (session.status === 'FINISHED') {
        alert("Buổi thi đã kết thúc.");
        navigate('/exams');
    }
  }, [session, navigate, pin]);

  if (!session || !user) return null;

  return (
    <div className="min-h-screen bg-indigo-600 flex flex-col items-center justify-center p-4 text-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white blur-3xl"></div>
         <div className="absolute bottom-10 right-10 w-64 h-64 rounded-full bg-white blur-3xl"></div>
      </div>

      <div className="z-10 text-center max-w-lg w-full">
         <div className="mb-8">
            <h1 className="text-4xl font-extrabold mb-2">Phòng Chờ</h1>
            <p className="text-indigo-200 text-lg">Đang đợi giáo viên bắt đầu...</p>
         </div>

         <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
            <div className="flex flex-col items-center">
               <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                  <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
               </div>
               
               <h2 className="text-xl font-bold mb-1">{user.name}</h2>
               <div className="flex items-center gap-2 text-indigo-200 text-sm mb-6">
                  <UserCheck className="h-4 w-4" /> Đã sẵn sàng
               </div>

               <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-1/3 animate-[loading_2s_ease-in-out_infinite]"></div>
               </div>
               <p className="mt-4 text-sm opacity-70 italic">
                  "Hãy chuẩn bị tinh thần, bài thi sắp bắt đầu!"
               </p>
            </div>
         </div>
         
         <div className="mt-8 flex items-center justify-center gap-2 text-indigo-200 text-sm opacity-60">
            <Music className="h-4 w-4" /> Giáo viên đang điều khiển nhạc nền
         </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};