import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import {
   Send, Image as ImageIcon, MessageSquare, PieChart,
   HelpCircle, Menu, X, Check, Hand
} from 'lucide-react';
import { ChatMessage, MessageVisibility } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Whiteboard } from '../../components/Whiteboard';

export const StudentDiscussionRoom: React.FC = () => {
   const { pin } = useParams();
   const navigate = useNavigate();
   const {
      discussionSessions,
      user,
      joinDiscussion,
      sendDiscussionMessage,
      votePoll,
      toggleHandRaise,
      fetchInitialData,
      fetchDiscussionMessages,
      fetchDiscussions
   } = useStore();

   const [hasJoined, setHasJoined] = useState(false);
   const [msgText, setMsgText] = useState('');
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const [activeTab, setActiveTab] = useState<'CHAT' | 'INFO'>('CHAT'); // Mobile Tabs
   const [middleMode, setMiddleMode] = useState<'CHAT' | 'WHITEBOARD'>('CHAT');

   const session = discussionSessions.find(s => s.id === pin);

   // REALTIME SUBSCRIPTION & INITIAL FETCH
   useEffect(() => {
      if (!pin) return;

      // Tải dữ liệu phòng và tin nhắn lần đầu khi mở phòng chat
      fetchDiscussions();
      fetchDiscussionMessages(pin);

      const channel = supabase.channel(`student-session-${pin}`)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_messages', filter: `session_id=eq.${pin}` }, () => {
            // Chỉ tải lại tin nhắn một cách tối ưu (Lazy)
            fetchDiscussionMessages(pin);
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_polls', filter: `session_id=eq.${pin}` }, () => {
            fetchDiscussions();
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_participants', filter: `session_id=eq.${pin}` }, () => {
            fetchDiscussions();
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_sessions', filter: `id=eq.${pin}` }, () => {
            fetchDiscussions();
         })
         .subscribe();

      return () => {
         supabase.removeChannel(channel);
      };
   }, [pin, fetchDiscussions, fetchDiscussionMessages]);

   useEffect(() => {
      if (session && user) {
         joinDiscussion(session.id, user).then(success => {
            if (success) setHasJoined(true);
         });
      }
   }, [session, user, joinDiscussion]);

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [session?.messages, activeTab]);

   if (!session) return <div className="p-8 text-center">Đang tải phòng...</div>;
   if (!user) return <div className="p-8 text-center">Vui lòng đăng nhập.</div>;

   const myParticipant = session.participants.find(p => p.studentId === user.id);
   const myRoomId = myParticipant?.currentRoomId || 'MAIN';
   const myRoomName = myRoomId === 'MAIN' ? 'Phòng chính' : session.breakoutRooms?.find(r => r.id === myRoomId)?.name || 'Nhóm';

   // Filter Messages: 1. By Room, 2. By Round, 3. By Visibility
   const visibleMessages = session.messages.filter(m => {
      if (m.roomId !== myRoomId) return false;
      if (m.roundId !== session.activeRoundId) return false;
      return true;
   }).map(m => {
      // Apply Visibility Rules for Students
      if (m.senderId === user.id || m.senderId === 'teacher' || m.senderId === session.teacherId || m.type === 'SYSTEM') return m;

      if (session.visibility === 'HIDDEN_ALL') return { ...m, senderName: 'Ẩn danh', content: '...' };
      if (session.visibility === 'NAME_ONLY') return { ...m, content: '...' };
      if (session.visibility === 'CONTENT_ONLY') return { ...m, senderName: 'Người giấu mặt' };

      return m;
   });

   const activePolls = session.polls.filter(p => p.isActive);

   const handleSendMessage = () => {
      if (!msgText.trim() || session.status !== 'ACTIVE') return;
      const msg: ChatMessage = {
         id: `msg_${Date.now()}`,
         senderId: user.id,
         senderName: user.name,
         content: msgText,
         type: 'TEXT',
         timestamp: new Date().toISOString(),
         roomId: myRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
      setMsgText('');
   };

   const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '👏', '✅', '❌', '🙋‍♂️'];

   const handleSendSticker = (sticker: string) => {
      if (session.status !== 'ACTIVE') return;
      const msg: ChatMessage = {
         id: `sticker_${Date.now()}`,
         senderId: user.id,
         senderName: user.name,
         content: sticker,
         type: 'STICKER',
         timestamp: new Date().toISOString(),
         roomId: myRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
   };

   return (
      <div className="flex flex-col h-screen bg-gray-100">
         {/* Header */}
         <div className="bg-white px-4 py-3 border-b flex justify-between items-center shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-3">
               <button onClick={() => navigate('/')} className="hover:bg-gray-100 p-2 rounded-full"><X className="h-5 w-5 text-gray-500" /></button>
               <div>
                  <h1 className="font-bold text-gray-900 text-sm md:text-base leading-tight">{session.title}</h1>
                  <div className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                     <span className="bg-indigo-50 px-2 py-0.5 rounded">{myRoomName}</span>
                     {session.status === 'FINISHED' && <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded">Đã kết thúc</span>}
                  </div>
               </div>
            </div>
            <div>
               {myParticipant && (
                  <button
                     onClick={() => toggleHandRaise(session.id, user.id)}
                     className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${myParticipant.isHandRaised ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                     <Hand className="h-4 w-4" /> {myParticipant.isHandRaised ? 'Đang giơ tay' : 'Giơ tay'}
                  </button>
               )}
            </div>
         </div>

         {/* Body */}
         <div className="flex-1 overflow-hidden relative flex">

            {/* Chat Area */}
            <div className={`flex-1 flex flex-col bg-white relative ${activeTab === 'INFO' ? 'hidden md:flex' : 'flex'}`}>
               {/* Mode switcher (Chat vs Whiteboard) */}
               <div className="bg-gray-50 border-b px-4 py-2 flex items-center justify-end">
                  <div className="flex bg-gray-200/80 p-0.5 rounded-xl border border-gray-300/30 shadow-inner">
                     <button
                        onClick={() => setMiddleMode('CHAT')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${middleMode === 'CHAT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                        Trò chuyện
                     </button>
                     <button
                        onClick={() => setMiddleMode('WHITEBOARD')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${middleMode === 'WHITEBOARD' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                     >
                        Bảng tương tác
                     </button>
                  </div>
               </div>

               {middleMode === 'WHITEBOARD' ? (
                  <div className="flex-1 p-4 bg-gray-100/50">
                     <Whiteboard pin={session.id} roomId={myRoomId} isTeacher={false} />
                  </div>
               ) : (
                  <>
                     <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f0f2f5]">
                        <div className="text-center text-xs text-gray-400 mb-4">Chào mừng {user.name} tham gia thảo luận</div>

                        {visibleMessages.length === 0 && (
                           <div className="text-center text-gray-400 mt-10">Chưa có tin nhắn nào...</div>
                        )}

                        {visibleMessages.map(m => (
                           <div key={m.id} className={`flex ${m.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                              {m.type === 'SYSTEM' ? (
                                 <div className="w-full text-center my-2"><span className="bg-black/10 text-gray-600 text-[10px] px-2 py-1 rounded-full">{m.content}</span></div>
                              ) : (
                                 <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-3 py-2 text-sm shadow-sm ${m.senderId === user.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'}`}>
                                    {m.senderId !== user.id && <div className="text-[10px] font-bold opacity-75 mb-1 text-indigo-600">{m.senderName}</div>}

                                    {m.type === 'STICKER' ? (
                                       <div className="text-4xl">{m.content}</div>
                                    ) : m.content === '...' ? (
                                       <div className="italic opacity-50">Tin nhắn bị ẩn</div>
                                    ) : (
                                       <div className="whitespace-pre-wrap">{m.content}</div>
                                    )}
                                    <div className="text-[9px] opacity-60 text-right mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                 </div>
                              )}
                           </div>
                        ))}
                        <div ref={messagesEndRef} />
                     </div>

                     {/* Chat Input */}
                     {session.status === 'ACTIVE' && (
                        <div className="p-3 bg-white border-t">
                           <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-2">
                              {STICKERS.map(s => <button key={s} onClick={() => handleSendSticker(s)} className="text-xl p-2 hover:bg-gray-100 rounded-lg">{s}</button>)}
                           </div>
                           <div className="flex gap-2 items-center">
                              <input
                                 value={msgText}
                                 onChange={e => setMsgText(e.target.value)}
                                 onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                                 placeholder="Nhập tin nhắn..."
                                 className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                              <button onClick={handleSendMessage} className="p-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50"><Send className="h-5 w-5" /></button>
                           </div>
                        </div>
                     )}
                  </>
               )}
            </div>

            {/* Polls & Info Area */}
            <div className={`w-full md:w-80 bg-gray-50 border-l flex flex-col ${activeTab === 'CHAT' ? 'hidden md:flex' : 'flex'}`}>
               <div className="p-4 border-b bg-white font-bold text-gray-700 flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-indigo-600" /> Hoạt động
               </div>
               <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activePolls.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">Chưa có bình chọn nào</div>}

                  {activePolls.map(poll => (
                     <div key={poll.id} className="bg-white p-4 rounded-xl shadow-sm border">
                        <h3 className="font-bold text-sm mb-3">{poll.question}</h3>
                        <div className="space-y-2">
                           {poll.options.map(opt => {
                              const hasVoted = opt.voterIds.includes(user.id);
                              const totalVotes = poll.options.reduce((a, b) => a + b.voteCount, 0);
                              const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;

                              return (
                                 <button
                                    key={opt.id}
                                    onClick={() => votePoll(session.id, poll.id, opt.id, user.id)}
                                    disabled={poll.options.some(o => o.voterIds.includes(user.id))}
                                    className={`w-full text-left p-2 rounded-lg border text-xs relative overflow-hidden transition-all ${hasVoted ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}
                                 >
                                    <div className="absolute top-0 left-0 bottom-0 bg-indigo-100/50 transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                    <div className="relative flex justify-between z-10">
                                       <span className="font-medium">{opt.text}</span>
                                       <span>{percent}%</span>
                                    </div>
                                    {hasVoted && <div className="relative z-10 text-[9px] text-indigo-600 font-bold mt-1 flex items-center gap-1"><Check className="h-3 w-3" /> Đã chọn</div>}
                                 </button>
                              );
                           })}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2 text-right">
                           {poll.isAnonymous ? 'Bình chọn ẩn danh' : 'Bình chọn công khai'}
                        </div>
                     </div>
                  ))}
               </div>
            </div>

         </div>

         {/* Mobile Bottom Nav */}
         <div className="md:hidden bg-white border-t flex justify-around p-2 pb-safe z-50">
            <button onClick={() => setActiveTab('CHAT')} className={`flex flex-col items-center p-2 rounded-lg ${activeTab === 'CHAT' ? 'text-blue-600' : 'text-gray-400'}`}>
               <MessageSquare className="h-6 w-6" />
               <span className="text-[10px] font-bold">Tin nhắn</span>
            </button>
            <button onClick={() => setActiveTab('INFO')} className={`flex flex-col items-center p-2 rounded-lg relative ${activeTab === 'INFO' ? 'text-blue-600' : 'text-gray-400'}`}>
               <PieChart className="h-6 w-6" />
               <span className="text-[10px] font-bold">Bình chọn</span>
               {activePolls.length > 0 && <span className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
            </button>
         </div>
      </div>
   );
};