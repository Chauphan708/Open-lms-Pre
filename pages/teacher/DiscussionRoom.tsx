import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import {
   Users, MessageSquare, Hand, PieChart, Layers,
   Send, Plus, ArrowLeft, Image as ImageIcon,
   Eye, EyeOff, User, Check, Power, ChevronDown, X, Menu,
   FileDown, Trash2
} from 'lucide-react';
import { ChatMessage, Poll, MessageVisibility } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Whiteboard } from '../../components/Whiteboard';
import { uploadDiscussionImage } from '../../services/discussionImageHelper';

export const DiscussionRoom: React.FC = () => {
   const { pin } = useParams();
   const navigate = useNavigate();
   const {
      discussionSessions,
      user,
      sendDiscussionMessage,
      toggleHandRaise,
      createPoll,
      togglePollStatus,
      createBreakoutRooms,
      assignToRoom,
      setDiscussionVisibility,
      createDiscussionRound,
      setActiveRound,
      endDiscussionSession,
      deleteDiscussionSession,
      fetchInitialData,
      fetchDiscussionMessages,
      fetchDiscussions
   } = useStore();

   const session = discussionSessions.find(s => s.id === pin);

   // Tabs: CHAT, POLLS, PARTICIPANTS, BREAKOUT
   const [activeTab, setActiveTab] = useState<'CHAT' | 'POLLS' | 'PARTICIPANTS' | 'BREAKOUT'>('CHAT');
   const [middleMode, setMiddleMode] = useState<'CHAT' | 'WHITEBOARD'>('CHAT');

   const [isRoundMenuOpen, setIsRoundMenuOpen] = useState(false);
   const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
   const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
   const [isExportingPDF, setIsExportingPDF] = useState(false);

   const roundMenuRef = useRef<HTMLDivElement>(null);
   const visibilityMenuRef = useRef<HTMLDivElement>(null);

   const [msgText, setMsgText] = useState('');
   const [currentViewRoomId, setCurrentViewRoomId] = useState('MAIN');
   const messagesEndRef = useRef<HTMLDivElement>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [viewedRoundId, setViewedRoundId] = useState<string | null>(null);

   const [pollQuestion, setPollQuestion] = useState('');
   const [pollOptions, setPollOptions] = useState(['Đồng ý', 'Không đồng ý']);
   const [pollAnonymous, setPollAnonymous] = useState(false);

   const [newRoomCount, setNewRoomCount] = useState(2);
   const [newRoundName, setNewRoundName] = useState('');
   const [showRoundModal, setShowRoundModal] = useState(false);

   // REALTIME SUBSCRIPTION & INITIAL FETCH
   useEffect(() => {
      if (!pin) return;

      // Tải dữ liệu phòng và tin nhắn lần đầu khi mở phòng chat
      fetchDiscussions();
      fetchDiscussionMessages(pin);

      // Subscribe to changes for this session
      const channel = supabase.channel(`session-${pin}`)
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_messages', filter: `session_id=eq.${pin}` }, (payload) => {
            // Tải lại tin nhắn của phòng nhanh chóng (Lazy) thay vì tải toàn bộ hệ thống
            fetchDiscussionMessages(pin);
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_participants', filter: `session_id=eq.${pin}` }, () => {
            fetchDiscussions();
         })
         .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_polls', filter: `session_id=eq.${pin}` }, () => {
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

   // Click Outside
   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (roundMenuRef.current && !roundMenuRef.current.contains(event.target as Node)) setIsRoundMenuOpen(false);
         if (visibilityMenuRef.current && !visibilityMenuRef.current.contains(event.target as Node)) setIsVisibilityMenuOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   useEffect(() => {
      if (session?.activeRoundId) setViewedRoundId(session.activeRoundId);
   }, [session?.activeRoundId]);

   useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   }, [session?.messages, currentViewRoomId, viewedRoundId]);

   if (!session) return <div className="p-8 text-center">Đang tải dữ liệu phòng thảo luận...</div>;

   const currentRoundId = viewedRoundId || session.activeRoundId;
   const currentMessages = session.messages.filter(m =>
      m.roomId === currentViewRoomId && m.roundId === currentRoundId
   );

   const raisedHands = session.participants.filter(p => p.isHandRaised);
   const viewingRoundData = session.rounds.find(r => r.id === currentRoundId);

   const canChat = session.status === 'ACTIVE' && currentRoundId === session.activeRoundId;

   const handleSendMessage = () => {
      if (!msgText.trim() || !canChat) return;
      const msg: ChatMessage = {
         id: `msg_${Date.now()}`,
         senderId: user?.id || 'teacher',
         senderName: user?.name || 'Giáo viên',
         content: msgText,
         type: 'TEXT',
         timestamp: new Date().toISOString(),
         roomId: currentViewRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
      setMsgText('');
   };

   const handleSendSticker = (sticker: string) => {
      if (!canChat) return;
      const msg: ChatMessage = {
         id: `sticker_${Date.now()}`,
         senderId: user?.id || 'teacher',
         senderName: user?.name || 'Giáo viên',
         content: sticker,
         type: 'STICKER',
         timestamp: new Date().toISOString(),
         roomId: currentViewRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
   };

   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!canChat) return;
      const file = e.target.files?.[0];
      if (!file) return;

      const publicUrl = await uploadDiscussionImage(file, session.id);
      if (!publicUrl) {
         alert("Không thể tải hoặc nén ảnh. Vui lòng thử lại.");
         return;
      }

      const msg: ChatMessage = {
         id: `img_${Date.now()}`,
         senderId: user?.id || 'teacher',
         senderName: user?.name || 'Giáo viên',
         content: publicUrl,
         type: 'IMAGE',
         timestamp: new Date().toISOString(),
         roomId: currentViewRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleTriggerImageUpload = () => fileInputRef.current?.click();

   const handleExportPDF = async () => {
      setIsExportingPDF(true);
      try {
         const { jsPDF } = await import('jspdf');
         const html2canvas = (await import('html2canvas')).default;

         const element = document.getElementById('discussion-report-pdf');
         if (!element) return;

         const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
         });

         const imgData = canvas.toDataURL('image/png');
         const pdf = new jsPDF('p', 'mm', 'a4');
         const imgWidth = 210;
         const pageHeight = 295;
         const imgHeight = (canvas.height * imgWidth) / canvas.width;
         let heightLeft = imgHeight;
         let position = 0;

         pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
         heightLeft -= pageHeight;

         while (heightLeft >= 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
         }

         pdf.save(`Bao_cao_thao_luan_${session.title.replace(/\s+/g, '_')}_${session.id}.pdf`);
      } catch (err) {
         console.error("PDF Export Error:", err);
         alert("Lỗi khi xuất báo cáo PDF.");
      } finally {
         setIsExportingPDF(false);
      }
   };

   const handleDeleteSession = async () => {
      if (confirm("Bạn có chắc chắn muốn xóa vĩnh viễn phiên thảo luận này cùng tất cả dữ liệu liên quan? Hành động này không thể hoàn tác.")) {
         const success = await deleteDiscussionSession(session.id);
         if (success) {
            alert("Đã xóa phiên thảo luận thành công.");
            navigate('/teacher/discussions');
         } else {
            alert("Có lỗi xảy ra khi xóa phiên thảo luận.");
         }
      }
   };

   const handleCreatePoll = () => {
      if (!pollQuestion.trim()) return;
      const newPoll: Poll = {
         id: `poll_${Date.now()}`,
         question: pollQuestion,
         options: pollOptions.filter(o => o.trim()).map((txt, i) => ({
            id: `opt_${i}`, text: txt, voteCount: 0, voterIds: []
         })),
         isAnonymous: pollAnonymous,
         isActive: true,
         createdAt: new Date().toISOString()
      };
      createPoll(session.id, newPoll);
      setPollQuestion('');
      setPollOptions(['', '']);
   };

   const handleCreateRooms = () => {
      const rooms = Array.from({ length: newRoomCount }, (_, i) => ({
         id: `room_${i + 1}`,
         name: `Nhóm ${i + 1}`
      }));
      createBreakoutRooms(session.id, rooms);
      session.participants.forEach((s, idx) => {
         const roomId = rooms[idx % rooms.length].id;
         assignToRoom(session.id, s.studentId, roomId);
      });
      alert(`Đã chia thành ${newRoomCount} nhóm ngẫu nhiên.`);
   };

   const handleInviteSpeak = (studentName: string) => {
      if (!canChat) return;
      const msg: ChatMessage = {
         id: `sys_${Date.now()}`,
         senderId: 'SYSTEM',
         senderName: 'Hệ thống',
         content: `Giáo viên mời bạn ${studentName} phát biểu!`,
         type: 'SYSTEM',
         timestamp: new Date().toISOString(),
         roomId: currentViewRoomId,
         roundId: session.activeRoundId
      };
      sendDiscussionMessage(session.id, msg);
   };

   const handleAddRound = () => {
      if (!newRoundName.trim()) return;
      createDiscussionRound(session.id, newRoundName);
      setNewRoundName('');
      setShowRoundModal(false);
      setIsRoundMenuOpen(false);
   };

   const handleEndSession = () => {
      if (confirm("Bạn có chắc chắn muốn kết thúc phiên thảo luận? Mọi người sẽ không thể nhắn tin nữa.")) {
         endDiscussionSession(session.id);
      }
   };

   const STICKERS = ['👍', '❤️', '😂', '😮', '😢', '👏', '🎉', '✅', '❌', '🤔'];
   const VisibilityIcon = { 'FULL': Eye, 'HIDDEN_ALL': EyeOff, 'NAME_ONLY': User, 'CONTENT_ONLY': MessageSquare }[session.visibility] || Eye;

   return (
      <div className="h-screen bg-gray-50 dark:bg-slate-850 flex flex-col">
         {/* Header */}
         <div className="bg-white border-b px-4 md:px-6 py-3 flex justify-between items-center shadow-sm z-50 relative">
            <div className="flex items-center gap-2 md:gap-4">
               <button onClick={() => navigate('/teacher/discussions')} className="hover:bg-gray-100 p-2 rounded-full transition-colors"><ArrowLeft className="h-5 w-5" /></button>
               <div>
                  <h1 className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2">
                     <div className="truncate max-w-[150px] md:max-w-xs">{session.title}</div>
                     {session.status === 'FINISHED' && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded flex-shrink-0">Kết thúc</span>}
                  </h1>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                     <span className="font-mono bg-gray-100 px-2 py-0.5 rounded border">PIN: {session.id}</span>
                     <span className="hidden md:inline">• {session.participants.length} thành viên</span>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
               {/* Round Selector */}
               <div className="relative" ref={roundMenuRef}>
                  <button
                     onClick={() => setIsRoundMenuOpen(!isRoundMenuOpen)}
                     className={`flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg text-sm font-medium transition-all ${isRoundMenuOpen ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500 ring-offset-1' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                  >
                     <Layers className="h-4 w-4" />
                     <span className="max-w-[80px] md:max-w-[120px] truncate">{viewingRoundData?.name}</span>
                     <ChevronDown className={`h-3 w-3 transition-transform ${isRoundMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isRoundMenuOpen && (
                     <div className="absolute top-full right-0 mt-2 w-72 bg-white border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 px-2 py-1">Lịch sử vòng thảo luận</h4>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                           {session.rounds.map(r => (
                              <div key={r.id} className="flex items-center gap-1">
                                 <button
                                    onClick={() => { setViewedRoundId(r.id); setIsRoundMenuOpen(false); }}
                                    className={`flex-1 text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center transition-colors ${viewedRoundId === r.id ? 'bg-gray-100 font-bold text-gray-900' : 'hover:bg-gray-50 dark:bg-slate-850 text-gray-700'}`}
                                 >
                                    <span className="truncate">{r.name}</span>
                                    {session.activeRoundId === r.id && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded ml-2 font-bold whitespace-nowrap">Active</span>}
                                 </button>
                                 {session.activeRoundId !== r.id && session.status === 'ACTIVE' && (
                                    <button
                                       onClick={() => { setActiveRound(session.id, r.id); setViewedRoundId(r.id); setIsRoundMenuOpen(false); }}
                                       className="text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-100 border border-indigo-100 font-medium"
                                       title="Mở lại vòng này"
                                    >
                                       Mở
                                    </button>
                                 )}
                              </div>
                           ))}
                        </div>
                        {session.status === 'ACTIVE' && (
                           <div className="border-t mt-2 pt-2">
                              <button onClick={() => { setShowRoundModal(true); setIsRoundMenuOpen(false); }} className="w-full text-center text-xs text-indigo-600 font-bold py-2 hover:bg-indigo-50 rounded-lg flex items-center justify-center gap-1 transition-colors">
                                 <Plus className="h-3 w-3" /> Tạo vòng mới
                              </button>
                           </div>
                        )}
                     </div>
                  )}
               </div>

               {/* Visibility Selector */}
               <div className="relative hidden md:block" ref={visibilityMenuRef}>
                  <button
                     onClick={() => setIsVisibilityMenuOpen(!isVisibilityMenuOpen)}
                     className={`flex items-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium transition-all ${isVisibilityMenuOpen ? 'bg-gray-100 border-gray-400 text-gray-900' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-850'}`}
                  >
                     <VisibilityIcon className="h-4 w-4" />
                     <span>Hiển thị</span>
                     <ChevronDown className={`h-3 w-3 transition-transform ${isVisibilityMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isVisibilityMenuOpen && (
                     <div className="absolute top-full right-0 mt-2 w-60 bg-white border rounded-xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2 px-2 py-1">Chế độ xem của HS</div>
                        {[
                           { id: 'FULL', label: 'Hiện đầy đủ', icon: Eye },
                           { id: 'HIDDEN_ALL', label: 'Ẩn tất cả (Chỉ hiện số)', icon: EyeOff },
                           { id: 'NAME_ONLY', label: 'Chỉ hiện tên (Che tin nhắn)', icon: User },
                           { id: 'CONTENT_ONLY', label: 'Ẩn danh (Che tên)', icon: MessageSquare },
                        ].map((mode) => (
                           <button
                              key={mode.id}
                              onClick={() => { setDiscussionVisibility(session.id, mode.id as MessageVisibility); setIsVisibilityMenuOpen(false); }}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 transition-colors ${session.visibility === mode.id ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50 dark:bg-slate-850 text-gray-700'}`}
                           >
                              <mode.icon className="h-4 w-4" /> {mode.label}
                              {session.visibility === mode.id && <Check className="h-4 w-4 ml-auto" />}
                           </button>
                        ))}
                     </div>
                  )}
               </div>

               <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>

               {session.status === 'ACTIVE' ? (
                  <button
                     onClick={handleEndSession}
                     className="hidden md:flex bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 hover:border-red-300 items-center gap-2 transition-all shadow-sm hover:shadow"
                  >
                     <Power className="h-4 w-4" /> Kết thúc
                  </button>
               ) : (
                  <span className="hidden md:inline text-sm font-bold text-gray-500 bg-gray-100 border border-gray-200 px-4 py-2 rounded-lg">Đã đóng</span>
               )}

               <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                  <Menu className="h-6 w-6" />
               </button>
            </div>
         </div>

         {/* Body */}
         <div className="flex-1 flex overflow-hidden relative">
            <div className="flex-1 flex flex-col bg-white relative">
               {/* Room Selector & Tab Toggle */}
               <div className="bg-gray-50 dark:bg-slate-850 border-b px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                  <div className="flex gap-2">
                     <button
                        onClick={() => setCurrentViewRoomId('MAIN')}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentViewRoomId === 'MAIN' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                     >
                        Phòng chính
                     </button>
                     {session.breakoutRooms?.map(r => (
                        <button
                           key={r.id}
                           onClick={() => setCurrentViewRoomId(r.id)}
                           className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${currentViewRoomId === r.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'}`}
                        >
                           {r.name}
                        </button>
                     ))}
                  </div>
                  
                  {/* Mode switcher (Chat vs Whiteboard) */}
                  <div className="flex bg-gray-200/80 p-0.5 rounded-xl border border-gray-300/30 flex-shrink-0 shadow-inner">
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
                     <Whiteboard pin={session.id} roomId={currentViewRoomId} isTeacher={true} />
                  </div>
               ) : (
                  <>
                     {/* Messages */}
                     <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-slate-850">
                        <div className="text-center mb-6">
                           <span className={`text-xs px-3 py-1.5 rounded-full font-bold border shadow-sm ${currentRoundId === session.activeRoundId ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              Đang xem: {viewingRoundData?.name} {currentRoundId !== session.activeRoundId && '(Lịch sử)'}
                           </span>
                        </div>

                        {session.visibility !== 'FULL' && (
                           <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg text-xs text-center text-yellow-800 font-medium mb-4 mx-auto max-w-md shadow-sm">
                              ⚠️ Học sinh đang thấy chế độ: {session.visibility}
                           </div>
                        )}

                        {currentMessages.map(m => (
                           <div key={m.id} className={`flex ${m.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                              {m.type === 'SYSTEM' ? (
                                 <div className="w-full text-center my-2">
                                    <span className="bg-gray-200 text-gray-600 text-xs px-4 py-1.5 rounded-full font-medium">{m.content}</span>
                                 </div>
                              ) : (
                                 <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${m.senderId === user?.id ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}>
                                    {m.senderId !== user?.id && <div className="text-xs font-bold opacity-70 mb-1">{m.senderName}</div>}
                                    {m.type === 'STICKER' ? (
                                       <div className="text-5xl my-1">{m.content}</div>
                                    ) : m.type === 'IMAGE' ? (
                                       <img src={m.content} alt="Sent" className="max-w-full rounded-lg my-1 border border-white/20" />
                                    ) : (
                                       <div className="whitespace-pre-wrap text-sm md:text-base">{m.content}</div>
                                    )}
                                    <div className="text-[10px] opacity-60 text-right mt-1">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                 </div>
                              )}
                           </div>
                        ))}
                        <div ref={messagesEndRef} />
                     </div>

                     {/* Input Area */}
                     <div className="p-3 md:p-4 border-t bg-white">
                        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                        <div className="flex gap-2 mb-3 overflow-x-auto pb-2 no-scrollbar">
                           {STICKERS.map(s => (
                              <button key={s} onClick={() => handleSendSticker(s)} className="text-2xl hover:bg-gray-100 p-2 rounded-xl transition-colors">{s}</button>
                           ))}
                        </div>
                        <div className="flex gap-2 md:gap-3">
                           <button onClick={handleTriggerImageUpload} className="p-3 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors flex-shrink-0">
                              <ImageIcon className="h-6 w-6" />
                           </button>
                           <input
                              value={msgText}
                              onChange={e => setMsgText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                              placeholder={`Nhập tin nhắn (${currentViewRoomId === 'MAIN' ? 'Chính' : 'Nhóm'})...`}
                              className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-shadow"
                           />
                           <button onClick={handleSendMessage} className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-md hover:scale-105 transition-all flex-shrink-0"><Send className="h-5 w-5" /></button>
                        </div>
                     </div>
                  </>
               )}
            </div>

            {/* Sidebar */}
            {isMobileSidebarOpen && <div className="absolute inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm animate-in fade-in" onClick={() => setIsMobileSidebarOpen(false)} />}

            <div className={`
             absolute inset-y-0 right-0 z-40 w-80 bg-white border-l shadow-2xl transform transition-transform duration-300 ease-in-out md:static md:transform-none md:shadow-none md:border-l md:flex md:flex-col
             ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:translate-x-0
          `}>
               {/* Mobile Close */}
               <div className="md:hidden p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-slate-850">
                  <h3 className="font-bold text-gray-700">Công cụ quản lý</h3>
                  <button onClick={() => setIsMobileSidebarOpen(false)} className="p-1 hover:bg-gray-200 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
               </div>

               <div className="flex border-b">
                  <button onClick={() => setActiveTab('PARTICIPANTS')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'PARTICIPANTS' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-slate-850'}`}><Users className="h-4 w-4 mx-auto mb-1" /> Danh sách</button>
                  <button onClick={() => setActiveTab('POLLS')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'POLLS' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-slate-850'}`}><PieChart className="h-4 w-4 mx-auto mb-1" /> Bình chọn</button>
                  <button onClick={() => setActiveTab('BREAKOUT')} className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'BREAKOUT' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:bg-slate-850'}`}><Layers className="h-4 w-4 mx-auto mb-1" /> Chia nhóm</button>
               </div>

               <div className="flex-1 overflow-y-auto p-4 bg-white">
                  {activeTab === 'PARTICIPANTS' && (
                     <div className="space-y-4">
                        {raisedHands.length > 0 && (
                           <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                              <h3 className="text-xs font-bold text-yellow-800 uppercase mb-2 flex items-center gap-1"><Hand className="h-3 w-3" /> Đang giơ tay ({raisedHands.length})</h3>
                              <div className="space-y-2">
                                 {raisedHands.map(p => (
                                    <div key={p.studentId} className="flex justify-between items-center bg-white p-2 rounded shadow-sm text-sm border">
                                       <span>{p.name}</span>
                                       <div className="flex gap-1">
                                          <button onClick={() => handleInviteSpeak(p.name)} className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-200">Mời nói</button>
                                          <button onClick={() => toggleHandRaise(session.id, p.studentId)} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Hạ tay</button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        )}

                        <h3 className="font-bold text-gray-700 text-sm">Tất cả ({session.participants.length})</h3>
                        <div className="space-y-2">
                           {session.participants.map(p => (
                              <div key={p.studentId} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:bg-slate-850 rounded-lg text-sm transition-colors">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{p.name.charAt(0)}</div>
                                    <div>
                                       <div className="font-medium text-gray-900">{p.name}</div>
                                       <div className="text-[10px] text-gray-500">{p.currentRoomId === 'MAIN' ? 'Phòng chính' : session.breakoutRooms?.find(r => r.id === p.currentRoomId)?.name}</div>
                                    </div>
                                 </div>
                                 {!p.isHandRaised && <button onClick={() => handleInviteSpeak(p.name)} className="text-gray-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50"><MessageSquare className="h-4 w-4" /></button>}
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {activeTab === 'POLLS' && (
                     <div className="space-y-6">
                        <div className="bg-gray-50 dark:bg-slate-850 p-4 rounded-xl border">
                           <h3 className="font-bold text-sm mb-3 text-gray-800">Tạo bình chọn mới</h3>
                           <input className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Câu hỏi..." value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} />
                           {pollOptions.map((opt, i) => (
                              <input key={i} className="w-full border border-gray-300 bg-white text-gray-900 p-2 rounded-lg text-sm mb-2 focus:ring-1 focus:ring-indigo-500 outline-none" placeholder={`Lựa chọn ${i + 1}`} value={opt} onChange={e => {
                                 const newOpts = [...pollOptions]; newOpts[i] = e.target.value; setPollOptions(newOpts);
                              }} />
                           ))}
                           <button onClick={() => setPollOptions([...pollOptions, ''])} className="text-xs text-indigo-600 flex items-center gap-1 mb-4 font-medium"><Plus className="h-3 w-3" /> Thêm lựa chọn</button>
                           <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer"><input type="checkbox" checked={pollAnonymous} onChange={e => setPollAnonymous(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" /> Ẩn danh</label>
                           <button onClick={handleCreatePoll} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">Phát hành</button>
                        </div>

                        <div className="space-y-4">
                           {session.polls.map(poll => (
                              <div key={poll.id} className="border rounded-xl p-4 bg-white shadow-sm">
                                 <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-bold text-sm text-gray-900">{poll.question}</h4>
                                    <button onClick={() => togglePollStatus(session.id, poll.id, !poll.isActive)} className={`text-[10px] px-2 py-1 rounded-full font-bold ${poll.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{poll.isActive ? 'Đang mở' : 'Đã đóng'}</button>
                                 </div>
                                 <div className="space-y-3">
                                    {poll.options.map(opt => {
                                       const totalVotes = poll.options.reduce((a, b) => a + b.voteCount, 0);
                                       const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                                       return (
                                          <div key={opt.id} className="text-xs">
                                             <div className="flex justify-between mb-1 text-gray-700 font-medium"><span>{opt.text}</span><span>{opt.voteCount} ({percent}%)</span></div>
                                             <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${percent}%` }}></div></div>
                                          </div>
                                       );
                                    })}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {activeTab === 'BREAKOUT' && (
                     <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-slate-850 p-4 rounded-xl border">
                           <h3 className="font-bold text-sm mb-3 text-gray-800">Chia nhóm tự động</h3>
                           <div className="flex items-center gap-3 mb-4">
                              <span className="text-sm text-gray-600">Số lượng nhóm:</span>
                              <input type="number" min="2" max="10" value={newRoomCount} onChange={e => setNewRoomCount(Number(e.target.value))} className="w-20 border border-gray-300 bg-white text-gray-900 rounded-lg p-1.5 text-sm text-center font-bold" />
                           </div>
                           <button onClick={handleCreateRooms} className="w-full bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 shadow-sm">Bắt đầu chia nhóm</button>
                        </div>

                        {session.breakoutRooms?.length > 0 && (
                           <div className="space-y-2">
                              <h3 className="font-bold text-sm text-gray-700">Danh sách nhóm</h3>
                              {session.breakoutRooms.map(r => (
                                 <div key={r.id} className="border rounded-lg p-3 bg-white text-sm hover:border-indigo-300 transition-colors">
                                    <div className="font-bold text-indigo-700 flex justify-between items-center">{r.name} <button onClick={() => setCurrentViewRoomId(r.id)} className="text-xs bg-indigo-50 px-3 py-1 rounded-full hover:bg-indigo-100 text-indigo-700 font-medium">Vào xem</button></div>
                                    <div className="text-xs text-gray-500 mt-2 truncate">{session.participants.filter(p => p.currentRoomId === r.id).map(p => p.name).join(', ') || 'Chưa có thành viên'}</div>
                                 </div>
                              ))}
                              <div className="pt-4 border-t mt-2">
                                 <button onClick={() => { createBreakoutRooms(session.id, []); session.participants.forEach(p => assignToRoom(session.id, p.studentId, 'MAIN')); setCurrentViewRoomId('MAIN'); }} className="w-full bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">Giải tán tất cả nhóm</button>
                              </div>
                           </div>
                        )}
                     </div>
                  )}
               </div>

               {/* Mobile Sidebar Footer */}
               <div className="p-4 border-t bg-gray-50 dark:bg-slate-850 md:hidden space-y-3">
                  <button onClick={() => setIsVisibilityMenuOpen(!isVisibilityMenuOpen)} className="w-full flex items-center justify-between bg-white border border-gray-300 px-4 py-3 rounded-lg text-sm font-medium text-gray-700">
                     <div className="flex items-center gap-2"><VisibilityIcon className="h-4 w-4" /><span>Hiển thị</span></div>
                     <ChevronDown className={`h-4 w-4 transition-transform ${isVisibilityMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isVisibilityMenuOpen && (
                     <div className="bg-white border rounded-lg p-2 space-y-1 animate-in slide-in-from-top-2">
                        {[{ id: 'FULL', label: 'Hiện đầy đủ', icon: Eye }, { id: 'HIDDEN_ALL', label: 'Ẩn tất cả', icon: EyeOff }, { id: 'NAME_ONLY', label: 'Chỉ hiện tên', icon: User }, { id: 'CONTENT_ONLY', label: 'Ẩn danh', icon: MessageSquare }].map((mode) => (
                           <button key={mode.id} onClick={() => { setDiscussionVisibility(session.id, mode.id as MessageVisibility); setIsVisibilityMenuOpen(false); }} className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 ${session.visibility === mode.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}><mode.icon className="h-4 w-4" /> {mode.label}</button>
                        ))}
                     </div>
                  )}
                  {session.status === 'ACTIVE' && <button onClick={handleEndSession} className="w-full bg-red-100 text-red-600 border border-red-200 px-4 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2"><Power className="h-4 w-4" /> Kết thúc phiên</button>}
               </div>

               {/* Common Sidebar Actions */}
               <div className="p-4 border-t bg-gray-50 dark:bg-slate-850 space-y-2">
                  <button
                     onClick={handleExportPDF}
                     disabled={isExportingPDF}
                     className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                     <FileDown className="h-4 w-4" /> {isExportingPDF ? 'Đang tạo PDF...' : 'Xuất báo cáo PDF'}
                  </button>
                  <button
                     onClick={handleDeleteSession}
                     className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                     <Trash2 className="h-4 w-4" /> Xóa phiên thảo luận
                  </button>
               </div>
            </div>
         </div>

         {showRoundModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-900">Tạo vòng thảo luận mới</h3>
                  <input autoFocus className="w-full border border-gray-300 bg-white text-gray-900 rounded-xl p-3 mb-6 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm" placeholder="Tên vòng (VD: Tranh biện...)" value={newRoundName} onChange={e => setNewRoundName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddRound()} />
                  <div className="flex justify-end gap-3">
                     <button onClick={() => setShowRoundModal(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">Hủy</button>
                     <button onClick={handleAddRound} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-all hover:scale-105">Tạo & Mở</button>
                  </div>
               </div>
            </div>
         )}

         {/* Hidden Report Container for PDF Generation */}
         <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <div id="discussion-report-pdf" className="w-[800px] bg-white p-8 text-gray-900 border" style={{ fontFamily: 'sans-serif' }}>
               <div className="border-b-2 border-indigo-600 pb-4 mb-6">
                  <h1 className="text-2xl font-bold text-indigo-900 mb-2">BÁO CÁO PHIÊN THẢO LUẬN</h1>
                  <p className="text-sm text-gray-600">Hệ thống Open LMS - Pre</p>
               </div>
               
               <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                     <p className="mb-1"><strong>Tên phiên:</strong> {session.title}</p>
                     <p className="mb-1"><strong>Mã PIN:</strong> {session.id}</p>
                     <p className="mb-1"><strong>Trạng thái:</strong> {session.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã kết thúc'}</p>
                  </div>
                  <div>
                     <p className="mb-1"><strong>Tổng số học sinh tham gia:</strong> {session.participants.length}</p>
                     <p className="mb-1"><strong>Thời gian xuất báo cáo:</strong> {new Date().toLocaleString('vi-VN')}</p>
                  </div>
               </div>

               <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-800 border-b pb-2 mb-3">Danh sách thành viên tham gia</h2>
                  <div className="grid grid-cols-3 gap-2">
                     {session.participants.map((p, idx) => (
                        <div key={p.studentId} className="text-xs bg-gray-50 dark:bg-slate-850 p-2 rounded border truncate">
                           {idx + 1}. {p.name}
                        </div>
                     ))}
                  </div>
               </div>

               {session.polls && session.polls.length > 0 && (
                  <div className="mb-6">
                     <h2 className="text-base font-bold text-gray-800 border-b pb-2 mb-3">Kết quả các cuộc bình chọn</h2>
                     <div className="space-y-4">
                        {session.polls.map((poll, idx) => (
                           <div key={poll.id} className="p-3 bg-indigo-50/50 rounded-lg border">
                              <h3 className="font-bold text-xs text-indigo-900 mb-2">{idx + 1}. {poll.question}</h3>
                              <div className="space-y-2">
                                 {poll.options.map(opt => {
                                    const totalVotes = poll.options.reduce((a, b) => a + b.voteCount, 0);
                                    const percent = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
                                    return (
                                       <div key={opt.id} className="text-[11px]">
                                          <div className="flex justify-between font-medium text-gray-700">
                                             <span>{opt.text}</span>
                                             <span>{opt.voteCount} lượt ({percent}%)</span>
                                          </div>
                                          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-1">
                                             <div className="bg-indigo-600 h-full" style={{ width: `${percent}%` }}></div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               <div className="mb-6">
                  <h2 className="text-base font-bold text-gray-800 border-b pb-2 mb-3">Lịch sử trò chuyện</h2>
                  <div className="space-y-3">
                     {session.messages.map(m => {
                        const roundName = session.rounds.find(r => r.id === m.roundId)?.name || 'Vòng chung';
                        const roomName = m.roomId === 'MAIN' ? 'Phòng chính' : session.breakoutRooms?.find(r => r.id === m.roomId)?.name || 'Nhóm';
                        return (
                           <div key={m.id} className="text-xs border-b pb-2">
                              <div className="flex justify-between text-gray-500 mb-1">
                                 <span className="font-bold text-indigo-700">{m.senderName} ({roomName} - {roundName})</span>
                                 <span>{new Date(m.timestamp).toLocaleTimeString('vi-VN')}</span>
                              </div>
                              {m.type === 'IMAGE' ? (
                                 <div className="mt-1">
                                    <img src={m.content} alt="Attachment" className="max-w-[200px] rounded border" />
                                 </div>
                              ) : (
                                 <p className="whitespace-pre-wrap text-gray-800 mt-1">{m.content}</p>
                              )}
                           </div>
                        );
                     })}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
};