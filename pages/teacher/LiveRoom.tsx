import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { Play, Pause, Users, Copy, QrCode, Music, Trophy, Clock, StopCircle, ArrowLeft } from 'lucide-react';
import { LiveSessionStatus } from '../../types';

// Royalty-free background music for concentration (Loop)
const MUSIC_URL = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112762.mp3";

export const LiveRoom: React.FC = () => {
  const { pin } = useParams();
  const navigate = useNavigate();
  const { liveSessions, updateLiveSessionStatus, exams } = useStore();
  const session = liveSessions.find(s => s.id === pin);
  const exam = exams.find(e => e.id === session?.examId);

  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlayingMusic) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(e => console.error("Audio play failed:", e));
    }
    setIsPlayingMusic(!isPlayingMusic);
  };

  const handleStart = () => {
    if (pin) updateLiveSessionStatus(pin, 'RUNNING');
  };

  const handleFinish = () => {
    if (confirm("Bạn có chắc chắn muốn kết thúc bài thi?")) {
      if (pin) updateLiveSessionStatus(pin, 'FINISHED');
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/live/join?pin=${pin}`;
    navigator.clipboard.writeText(link);
    alert("Đã sao chép link phòng thi!");
  };

  if (!session || !exam) return <div className="p-8 text-center">Không tìm thấy phòng thi.</div>;

  // --- LOBBY VIEW (Waiting) ---
  if (session.status === 'WAITING') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          {/* Header */}
          <div className="bg-indigo-600 p-6 text-white text-center relative">
            <button onClick={() => navigate('/exams')} className="absolute left-6 top-6 hover:bg-white/20 p-2 rounded-full transition">
               <ArrowLeft className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
            <p className="opacity-90">ID Phòng: <span className="font-mono text-2xl font-bold bg-white/20 px-3 py-1 rounded ml-2">{session.id}</span></p>
          </div>

          <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* QR & Info */}
            <div className="flex flex-col items-center space-y-6">
              <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-300 shadow-sm">
                 <img 
                   src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/live/join?pin=${pin}`)}`} 
                   alt="QR Code" 
                   className="w-48 h-48"
                 />
              </div>
              <div className="space-y-3 w-full">
                 <button onClick={copyLink} className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg font-medium transition">
                    <Copy className="h-5 w-5" /> Sao chép liên kết
                 </button>
                 <button onClick={toggleMusic} className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition ${isPlayingMusic ? 'bg-pink-50 text-pink-600 border border-pink-200' : 'bg-gray-100 text-gray-600'}`}>
                    {isPlayingMusic ? <Pause className="h-5 w-5" /> : <Music className="h-5 w-5" />} 
                    {isPlayingMusic ? 'Tắt nhạc nền' : 'Bật nhạc nền'}
                 </button>
              </div>
            </div>

            {/* Participants */}
            <div className="h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Users className="h-6 w-6 text-indigo-600" /> 
                    Người tham gia ({session.participants.length})
                 </h2>
                 <span className="animate-pulse flex h-3 w-3 bg-green-500 rounded-full"></span>
              </div>
              <div className="flex-1 bg-gray-50 rounded-xl border p-4 overflow-y-auto max-h-[300px]">
                 {session.participants.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <p>Đang chờ học sinh tham gia...</p>
                      <p className="text-sm">Hãy chia sẻ mã QR hoặc Link.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-2 gap-3">
                      {session.participants.map(p => (
                        <div key={p.studentId} className="bg-white p-3 rounded-lg border shadow-sm flex items-center gap-3 animate-fade-in">
                           <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                              {p.name.charAt(0)}
                           </div>
                           <span className="font-medium text-gray-900 truncate">{p.name}</span>
                        </div>
                      ))}
                   </div>
                 )}
              </div>
              <button 
                onClick={handleStart}
                disabled={session.participants.length === 0}
                className="mt-6 w-full bg-indigo-600 text-white py-4 rounded-xl text-xl font-bold hover:bg-indigo-700 shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Bắt đầu làm bài
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RUNNING DASHBOARD VIEW ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Control */}
        <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-20">
           <div>
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                 <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Đang diễn ra</span>
                 <span className="flex items-center gap-1 font-mono bg-gray-100 px-2 rounded">PIN: {session.id}</span>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <button onClick={toggleMusic} className={`p-3 rounded-full transition ${isPlayingMusic ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-600'}`}>
                 {isPlayingMusic ? <Pause className="h-5 w-5" /> : <Music className="h-5 w-5" />}
              </button>
              <button onClick={handleFinish} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2">
                 <StopCircle className="h-5 w-5" /> Kết thúc
              </button>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
           <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-gray-500 text-sm">Tổng thí sinh</p>
              <p className="text-3xl font-bold text-gray-900">{session.participants.length}</p>
           </div>
           <div className="bg-white p-4 rounded-xl border shadow-sm">
              <p className="text-gray-500 text-sm">Đã nộp bài</p>
              <p className="text-3xl font-bold text-green-600">
                {session.participants.filter(p => p.progress.answeredCount === exam.questionCount).length}
              </p>
           </div>
           {/* Add more aggregate stats here if needed */}
        </div>

        {/* Live Leaderboard / Progress Table */}
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
           <div className="p-4 border-b bg-gray-50 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <h3 className="font-bold text-gray-800">Tiến độ làm bài</h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full text-left text-sm">
               <thead className="bg-white text-gray-600 border-b">
                 <tr>
                   <th className="px-6 py-3 font-medium">Hạng</th>
                   <th className="px-6 py-3 font-medium">Học sinh</th>
                   <th className="px-6 py-3 font-medium">Tiến độ</th>
                   <th className="px-6 py-3 font-medium text-center">Đúng</th>
                   <th className="px-6 py-3 font-medium text-center">Sai</th>
                   <th className="px-6 py-3 font-medium text-center">Còn lại</th>
                   <th className="px-6 py-3 font-medium text-right">Điểm tạm tính</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {[...session.participants]
                   .sort((a, b) => b.progress.score - a.progress.score) // Sort by score
                   .map((p, index) => {
                     const progressPercent = Math.round((p.progress.answeredCount / exam.questionCount) * 100);
                     return (
                       <tr key={p.studentId} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4 font-bold text-gray-500">#{index + 1}</td>
                         <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                         <td className="px-6 py-4 w-1/4">
                            <div className="flex items-center gap-2">
                               <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                               </div>
                               <span className="text-xs text-gray-500 w-8">{progressPercent}%</span>
                            </div>
                         </td>
                         <td className="px-6 py-4 text-center text-green-600 font-bold">{p.progress.correctCount}</td>
                         <td className="px-6 py-4 text-center text-red-500 font-bold">{p.progress.wrongCount}</td>
                         <td className="px-6 py-4 text-center text-gray-400">{exam.questionCount - p.progress.answeredCount}</td>
                         <td className="px-6 py-4 text-right font-bold text-indigo-700">{p.progress.score.toFixed(1).replace('.', ',')}</td>
                       </tr>
                     );
                   })}
               </tbody>
             </table>
           </div>
        </div>
      </div>
    </div>
  );
};