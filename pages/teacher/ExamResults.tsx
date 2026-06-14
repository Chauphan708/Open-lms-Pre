import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../../store';
import { analyzeClassPerformance, analyzeStudentAttempt } from '../../services/geminiService';
import { BarChart3, ArrowLeft, Users, BrainCircuit, Sparkles, TrendingUp, TrendingDown, Clock, Settings, X, CheckCircle, XCircle, Search, Send, Save, Eye, EyeOff, ChevronDown, ChevronRight, RefreshCw, Zap, Loader2, Target, BookOpen, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Attempt, Exam } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { computeStudentAnalytics } from '../../utils/analyticsEngine';
import { getRecommendations, getRecentExamIds } from '../../utils/recommendationEngine';

export const ExamResults: React.FC = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const assignmentIdFromUrl = searchParams.get('assign');
    const navigate = useNavigate();
    const { exams, attempts, users, assignments, classes, user, saveUserPrompt, updateAttemptFeedback, fetchAttempts, addNotification } = useStore();
   
   const [isRefreshing, setIsRefreshing] = useState(false);

   const handleManualRefresh = async () => {
      setIsRefreshing(true);
      await fetchAttempts();
      setTimeout(() => setIsRefreshing(false), 800);
   };

    const storeExam = exams.find(e => String(e.id) === String(id));
    const [fetchedExam, setFetchedExam] = useState<Exam | null>(null);
    const [isLoadingDirect, setIsLoadingDirect] = useState(false);

    const exam = fetchedExam || storeExam;

    // Robust direct fetching in case store is empty or deep link
    useEffect(() => {
       const loadExamDirectly = async () => {
          if (!id || exam) return;
          setIsLoadingDirect(true);
          try {
             const { data: eData } = await supabase.from('exams').select('*').eq('id', id).single();
             if (eData) {
                const mapped = {
                   ...eData,
                   id: String(eData.id),
                   teacherId: String(eData.teacherId || eData.teacher_id || eData.teacherid),
                   createdAt: eData.createdAt || eData.created_at || eData.createdat,
                   updatedAt: eData.updatedAt || eData.updated_at || eData.updatedat,
                   questionCount: eData.questionCount || eData.question_count || eData.questioncount,
                   category: eData.category || (String(eData.id).startsWith('exam_matrix_') ? 'EXAM' : 'TASK'),
                   classId: String(eData.classId || eData.class_id || eData.classid || '')
                };
                setFetchedExam(mapped as Exam);
             }
          } catch (err) {
             console.error("ExamResults: Error loading exam directly:", err);
          } finally {
             setIsLoadingDirect(false);
          }
       };
       loadExamDirectly();
    }, [id, exam]);

    const examAttempts = attempts.filter(a => {
        const matchesExam = String(a.examId) === String(id);
        const matchesAssign = !assignmentIdFromUrl || String(a.assignmentId) === String(assignmentIdFromUrl);
        return matchesExam && matchesAssign;
    });

   // Class Analysis State
   const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [showConfigModal, setShowConfigModal] = useState(false);
   const [customPrompt, setCustomPrompt] = useState('');

   // Student Detail Modal State
   const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
   const [studentAiFeedback, setStudentAiFeedback] = useState<string>(''); // Edited Feedback Content
   const [isStudentAnalyzing, setIsStudentAnalyzing] = useState(false);
   const [isEditingFeedback, setIsEditingFeedback] = useState(true);

   // Toggle states
   const [showQuestionStats, setShowQuestionStats] = useState(false);
   const [showStudentStats, setShowStudentStats] = useState(false);
   const [showRecommendPanel, setShowRecommendPanel] = useState(false);
   const [activeModalTab, setActiveModalTab] = useState<'feedback' | 'recommend'>('feedback');

   // New State for Feedback Settings
   const [allowViewSolution, setAllowViewSolution] = useState(true);

   // Load existing feedback when opening student modal
   useEffect(() => {
      if (selectedAttemptId) {
         const att = attempts.find(a => a.id === selectedAttemptId);
         if (att) {
            setStudentAiFeedback(att.teacherFeedback || '');
            setAllowViewSolution(att.feedbackAllowViewSolution ?? true); // Default to true if not set previously
            setIsEditingFeedback(!att.teacherFeedback); // If exists, show preview first
         }
      }
   }, [selectedAttemptId, attempts]);

   // Helper to format score
   const fmt = (n: number) => n.toFixed(1).replace('.', ',');



   const stats = useMemo(() => {
      if (examAttempts.length === 0) return null;

      const scores = examAttempts.map(a => a.score || 0);
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const max = Math.max(...scores);
      const min = Math.min(...scores);

      // Detailed Distribution (0-10) for Bell Curve
      const detailedDistribution = Array.from({ length: 11 }, (_, i) => {
         const matchingAttempts = examAttempts.filter(att => Math.round(att.score || 0) === i);
         const studentNamesRaw = matchingAttempts.map(att => {
            const u = users.find(u => u.id === att.studentId);
            return u?.name || 'HS Ẩn danh';
         });
         // Deduplicate names in case a student has multiple attempts with the same score
         const studentNames = Array.from(new Set(studentNamesRaw));
         return { label: i.toString(), count: matchingAttempts.length, studentNames };
      });
      const maxDistributionCount = Math.max(...detailedDistribution.map(d => d.count), 1);

      return { avg, max, min, detailedDistribution, maxDistributionCount, count: scores.length };
   }, [examAttempts, users]);

   const handleClassAnalyze = async () => {
      if (!exam || !stats) return;
      setIsAnalyzing(true);
      try {
         const result = await analyzeClassPerformance(exam.title, exam.questions, examAttempts, customPrompt);
         setAiAnalysis(result);
         if (customPrompt) saveUserPrompt(customPrompt); // Save the prompt
         setShowConfigModal(false);
      } catch (e) {
         setAiAnalysis("Có lỗi xảy ra khi phân tích.");
      } finally {
         setIsAnalyzing(false);
      }
   };

   const handleStudentAnalyze = async (att: Attempt) => {
      if (!exam) return;
      setIsStudentAnalyzing(true);
      try {
         const feedback = await analyzeStudentAttempt(exam.title, exam.questions, att.answers, att.score || 0);
         setStudentAiFeedback(feedback);
         setIsEditingFeedback(true); // Switch to edit mode to let teacher review
      } catch (e) {
         setStudentAiFeedback("Lỗi khi phân tích.");
      } finally {
         setIsStudentAnalyzing(false);
      }
   };

   const handleSendFeedback = () => {
      if (!selectedAttemptId) return;
      updateAttemptFeedback(selectedAttemptId, studentAiFeedback, allowViewSolution);
      setIsEditingFeedback(false);
      alert("Đã gửi nhận xét cho học sinh!");
   };

   const openStudentDetail = (attId: string) => {
      setSelectedAttemptId(attId);
   };

   const [isSendingRec, setIsSendingRec] = useState(false);

   const handleSendRecommendations = async () => {
      if (!selectedAttempt || !selectedStudent || !studentRecommendations) return;
      setIsSendingRec(true);
      try {
         const recCount = studentRecommendations.recommendedExams.length;
         const titles = studentRecommendations.recommendedExams.map(r => r.exam.title).slice(0, 2).join(', ') + (recCount > 2 ? '...' : '');
         
         await addNotification({
            id: `notif_rec_${Date.now()}`,
            userId: selectedStudent.id,
            type: 'INFO',
            title: 'Gợi ý học tập mới',
            message: `Giáo viên đã gửi cho bạn ${recCount} gợi ý bài tập mới: ${titles}. Hãy xem trong mục Phân tích học tập!`,
            isRead: false,
            createdAt: new Date().toISOString(),
            link: '/student/analytics'
         });
         alert(`Đã gửi thông báo cho học sinh ${selectedStudent.name}!`);
      } catch (err) {
         console.error("Error sending recommendations:", err);
         alert("Lỗi khi gửi thông báo.");
      } finally {
         setIsSendingRec(false);
      }
   };

   const selectedAttempt = attempts.find(a => a.id === selectedAttemptId);
   const selectedStudent = users.find(u => u.id === selectedAttempt?.studentId);

   // Tính gợi ý bài tập cho HS đang chọn trong modal
   const studentRecommendations = useMemo(() => {
      if (!selectedAttempt || !selectedStudent) return null;
      const analytics = computeStudentAnalytics(
         selectedAttempt.studentId,
         attempts,
         exams,
         [], // questionBank không cần thiết ở đây
         90  // phân tích 3 tháng gần nhất
      );
      const recentExamIds = getRecentExamIds(selectedAttempt.studentId, attempts, 7);
      return getRecommendations(analytics, exams, [], recentExamIds, 4, 0);
   }, [selectedAttempt, selectedStudent, attempts, exams]);

   // Tính danh sách HS cần được gợi ý (điểm < 6.5)
   const studentsNeedingHelp = useMemo(() => {
      if (examAttempts.length === 0) return [];
      return Array.from(new Set(examAttempts.map(a => a.studentId)))
         .map(studentId => {
            const studentAttempts = examAttempts.filter(a => a.studentId === studentId);
            const avgScore = studentAttempts.reduce((s, a) => s + (a.score || 0), 0) / studentAttempts.length;
            const student = users.find(u => u.id === studentId);
            // Phân tích câu hay sai
            const wrongTopics = new Set<string>();
            studentAttempts.forEach(att => {
               exam?.questions.forEach(q => {
                  const userAns = att.answers[q.id];
                  let correct = false;
                  if (!q.type || q.type === 'MCQ') correct = userAns === q.correctOptionIndex;
                  if (!correct && q.topic) wrongTopics.add(q.topic);
               });
            });
            // Gợi ý bài từ exams có chủ đề liên quan
            const topicSet = wrongTopics;
            const suggested = exams
               .filter(e => e.id !== exam?.id && !e.deletedAt)
               .filter(e => Array.isArray(e.questions) && e.questions.some(q => q.topic && topicSet.has(q.topic)))
               .slice(0, 3);
            return { student, avgScore, wrongTopics: [...wrongTopics].slice(0, 3), suggested };
         })
         .filter(s => s.avgScore < 6.5 && s.student)
         .sort((a, b) => a.avgScore - b.avgScore);
   }, [examAttempts, exams, exam, users]);

    if (isLoadingDirect) return (
       <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
             <Loader2 className="h-10 w-10 text-indigo-600 animate-spin mx-auto mb-4" />
             <p className="text-gray-500 font-medium tracking-tight">Đang tải dữ liệu bài tập...</p>
          </div>
       </div>
    );

   if (!exam) return <div className="p-8 text-center">Không tìm thấy bài tập.</div>;

   return (
      <div className="max-w-6xl mx-auto pb-10">
         <div className="mb-6">
            <button onClick={() => navigate('/exams')} className="text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-2 transition-colors">
               <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
            </button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
               <div>
                  <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
                  <p className="text-gray-500 text-sm">Thống kê kết quả lớp học</p>
               </div>
                <div className="flex flex-wrap items-center gap-2">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-green-700 text-xs font-bold mr-2">
                      <Zap className="h-3 w-3 animate-pulse" />
                      Realtime Active
                   </div>
                   <button
                      onClick={handleManualRefresh}
                      disabled={isRefreshing}
                      className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center disabled:opacity-50"
                      title="Tải lại kết quả"
                   >
                      <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                   </button>
                   <button
                      onClick={() => setShowConfigModal(true)}
                      disabled={isAnalyzing || examAttempts.length === 0}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <Sparkles className="h-5 w-5" />
                      {isAnalyzing ? 'AI đang phân tích...' : 'Phân tích lớp học với AI'}
                   </button>
                </div>
            </div>
         </div>

         {examAttempts.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
               <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-gray-400" />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Chưa có dữ liệu bài làm</h3>
               <p className="text-gray-500">Hãy đợi học sinh nộp bài để xem thống kê.</p>
            </div>
         ) : (
            <div className="space-y-6">
               {/* Stats Cards */}
               <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Số lượng bài nộp</p>
                     <p className="text-3xl font-bold text-gray-900">{stats?.count}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><Users className="h-3 w-3" /> Tổng học sinh</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm trung bình</p>
                     <p className="text-3xl font-bold text-indigo-600">{fmt(stats?.avg || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400">Thang điểm 10</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm cao nhất</p>
                     <p className="text-3xl font-bold text-green-600">{fmt(stats?.max || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Xuất sắc</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border shadow-sm">
                     <p className="text-sm font-medium text-gray-500 mb-1">Điểm thấp nhất</p>
                     <p className="text-3xl font-bold text-red-500">{fmt(stats?.min || 0)}</p>
                     <div className="mt-2 text-xs text-gray-400 flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Cần cải thiện</div>
                  </div>
               </div>

               {/* Distribution Chart - Bar Chart */}
               <div className="bg-white p-6 rounded-xl border shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-2">Phổ điểm</h3>
                  <p className="text-xs text-gray-400 mb-4">Số lượng học sinh đạt điểm tương ứng (tổng: {stats?.count} bài)</p>
                  <div className="flex items-end gap-1 md:gap-3" style={{ height: '250px', paddingBottom: '32px' }}>
                     {stats!.detailedDistribution.map((item, idx) => {
                        const maxBarHeight = 190; // pixels
                        const barHeight = stats!.maxDistributionCount > 0
                           ? Math.max((item.count / stats!.maxDistributionCount) * maxBarHeight, item.count > 0 ? 8 : 3)
                           : 3;

                        let bgClass = "from-red-400 to-red-300";
                        if (idx >= 5 && idx <= 6) bgClass = "from-yellow-400 to-yellow-300";
                        else if (idx >= 7 && idx <= 8) bgClass = "from-blue-400 to-blue-300";
                        else if (idx >= 9) bgClass = "from-emerald-400 to-emerald-300";

                        return (
                           <div key={idx} className="flex-1 flex flex-col justify-end items-center">
                              {/* Count label on top */}
                              <span className={`text-xs font-bold mb-1 ${item.count > 0 ? 'text-gray-700' : 'text-gray-300'}`}>
                                 {item.count}
                              </span>
                              {/* Bar wrapper with relative group for tooltip */}
                              <div className="relative group w-full flex justify-center">
                                 <div
                                    className={`w-full max-w-[36px] md:max-w-[44px] bg-gradient-to-t ${bgClass} rounded-t-md transition-all duration-300 hover:opacity-80 hover:shadow-md cursor-pointer`}
                                    style={{ height: `${barHeight}px` }}
                                 />

                                 {/* Tooltip */}
                                 {item.count > 0 && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[220px] bg-gray-900 text-white text-xs rounded-lg p-2.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 shadow-xl">
                                       <p className="font-bold border-b border-gray-700 pb-1 mb-1.5 text-center text-indigo-200">Điểm {item.label} ({item.count} học sinh)</p>
                                       <ul className="max-h-32 overflow-y-auto custom-scrollbar text-left space-y-1">
                                          {item.studentNames?.map((name, i) => (
                                             <li key={i} className="truncate text-gray-100">• {name}</li>
                                          ))}
                                       </ul>
                                       <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900 pointer-events-none"></div>
                                    </div>
                                 )}
                              </div>
                              {/* X-axis label */}
                              <div className="text-xs font-bold text-gray-500 mt-2">{item.label}</div>
                           </div>
                        );
                     })}
                  </div>
               </div>

               {/* Statistics by Question */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
                  <div
                     className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                     onClick={() => setShowQuestionStats(!showQuestionStats)}
                  >
                     <h3 className="font-bold text-gray-800">Thống kê theo câu hỏi</h3>
                     <div className="text-gray-400">
                        {showQuestionStats ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                     </div>
                  </div>
                  {showQuestionStats && (
                     <div className="px-6 pb-6 pt-2 space-y-4 border-t border-gray-100">
                        {exam.questions.map((q, idx) => {
                           let correctCount = 0;
                           let incorrectCount = 0;
                           examAttempts.forEach(att => {
                              const userAns = att.answers[q.id];

                              let isCorrect = false;
                              if (userAns !== undefined && userAns !== null && userAns !== '') {
                                 if (q.type === 'MCQ') {
                                    isCorrect = userAns === q.correctOptionIndex;
                                 } else if (q.type === 'SHORT_ANSWER') {
                                    const sAns = String(userAns || '').trim().toLowerCase().replace(/\s+/g, '');
                                    const solString = String(q.solution || '').trim();
                                    const isSolutionShort = solString !== '' && solString.split(/\s+/).length < 10;

                                    isCorrect = (q.options && q.options.length > 0)
                                       ? q.options.some(opt => String(opt).trim().toLowerCase().replace(/\s+/g, '') === sAns)
                                       : (isSolutionShort && sAns === solString.toLowerCase().replace(/\s+/g, ''));
                                 } else if (['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(q.type)) {
                                    if (Array.isArray(userAns) && userAns.length === q.options.length) {
                                       let isAllCorrect = true;
                                       for (let i = 0; i < q.options.length; i++) {
                                          const expected = q.options[i];
                                          const actual = userAns[i];
                                          const normExpected = String(expected || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                                          const normActual = String(actual || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                                          if (normActual !== normExpected) {
                                             isAllCorrect = false;
                                             break;
                                          }
                                       }
                                       isCorrect = isAllCorrect;
                                    }
                                 }
                              }

                              if (isCorrect) {
                                 correctCount++;
                              } else {
                                 incorrectCount++;
                              }
                           });
                           const total = correctCount + incorrectCount;
                           const correctPercent = total > 0 ? (correctCount / total) * 100 : 0;
                           const incorrectPercent = total > 0 ? (incorrectCount / total) * 100 : 0;

                           return (
                              <div key={q.id}>
                                 <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">Câu {idx + 1}</span>
                                    <span className="text-gray-500">
                                       <span className="text-green-600 font-medium">{correctCount} đúng</span> / <span className="text-red-500">{incorrectCount} sai</span>
                                    </span>
                                 </div>
                                 <div className="w-full bg-gray-200 rounded-full h-2.5 flex overflow-hidden">
                                    <div className="bg-green-500 h-2.5" style={{ width: `${correctPercent}%` }}></div>
                                    <div className="bg-red-500 h-2.5" style={{ width: `${incorrectPercent}%` }}></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>

               {/* Statistics by Student */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden transition-all">
                  <div
                     className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                     onClick={() => setShowStudentStats(!showStudentStats)}
                  >
                     <div className="flex items-center gap-3">
                        <h3 className="font-bold text-gray-800">Thống kê theo từng học sinh</h3>
                        <div className="text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                           {(() => {
                              const submittedStudents = new Set(examAttempts.map(a => a.studentId)).size;
                              const examAssignments = assignments.filter(a => a.examId === id);
                              const examClassIds = new Set<string>();
                              if (exam.classId) examClassIds.add(exam.classId);
                              examAssignments.forEach(a => examClassIds.add(a.classId));
                              const expectedStudentIds = new Set<string>();
                              examClassIds.forEach(classId => {
                                 const cls = classes.find(c => c.id === classId);
                                 if (cls) cls.studentIds.forEach(stId => expectedStudentIds.add(stId));
                              });
                              const totalExpected = expectedStudentIds.size > 0 ? expectedStudentIds.size : submittedStudents;
                              return `${submittedStudents}/${totalExpected} học sinh`;
                           })()}
                        </div>
                     </div>
                     <div className="text-gray-400">
                        {showStudentStats ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                     </div>
                  </div>
                  {showStudentStats && (
                     <div className="p-6 pt-2 border-t border-gray-100 space-y-6">
                        {/* Missing Students */}
                        {(() => {
                           const submittedStudentIds = new Set(examAttempts.map(a => a.studentId));
                           const examAssignments = assignments.filter(a => a.examId === id);
                           const examClassIds = new Set<string>();
                           if (exam.classId) examClassIds.add(exam.classId);
                           examAssignments.forEach(a => examClassIds.add(a.classId));
                           const expectedStudentIds = new Set<string>();
                           examClassIds.forEach(classId => {
                              const cls = classes.find(c => c.id === classId);
                              if (cls) cls.studentIds.forEach(stId => expectedStudentIds.add(stId));
                           });
                           const missingIds = Array.from(expectedStudentIds).filter(sid => !submittedStudentIds.has(sid));
                           const missingStudents = missingIds.map(sid => users.find(u => u.id === sid)).filter(Boolean);

                           if (expectedStudentIds.size > 0 && missingStudents.length > 0) {
                              return (
                                 <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                       <div className="bg-red-100 text-red-600 px-2.5 py-1 rounded-full text-xs font-bold">
                                          {missingStudents.length} HS chưa làm bài
                                       </div>
                                       <span className="text-xs text-gray-500">/ {expectedStudentIds.size} tổng</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                       {missingStudents.map((s: any) => (
                                          <div key={s.id} className="flex items-center gap-2 bg-white border border-red-100 rounded-lg px-3 py-1.5 shadow-sm">
                                             <img src={s.avatar} alt="" className="w-5 h-5 rounded-full border" />
                                             <span className="text-sm font-medium text-red-700">{s.name}</span>
                                          </div>
                                       ))}
                                    </div>
                                 </div>
                              );
                           }
                           if (expectedStudentIds.size > 0 && missingStudents.length === 0) {
                              return (
                                 <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                    <span className="text-green-700 font-bold text-sm">✅ Tất cả học sinh đã nộp bài!</span>
                                 </div>
                              );
                           }
                           return null;
                        })()}

                        {/* Student Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {Array.from(new Set(examAttempts.map(a => a.studentId))).map(studentId => {
                              const student = users.find(u => u.id === studentId);
                              const studentAttempts = examAttempts.filter(a => a.studentId === studentId);
                              const attemptCount = studentAttempts.length;
                              const scores = studentAttempts.map(a => a.score || 0);
                              const maxScore = Math.max(...scores);
                              const minScore = Math.min(...scores);
                              const avgScore = scores.reduce((a, b) => a + b, 0) / attemptCount;

                              // Percentage based on a max score of 10
                              const maxPercent = (maxScore / 10) * 100;
                              const minPercent = (minScore / 10) * 100;
                              const avgPercent = (avgScore / 10) * 100;

                              return (
                                 <div key={studentId} className="border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                                       <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
                                          {student?.name.charAt(0) || '?'}
                                       </div>
                                       {student?.name || 'Khách'}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Số lần làm</div>
                                          <div className="font-bold text-gray-800">{attemptCount}</div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">ĐTB</div>
                                          <div className="font-bold text-indigo-600">{fmt(avgScore)} <span className="text-xs font-normal text-gray-500">({Math.round(avgPercent)}%)</span></div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Cao nhất</div>
                                          <div className="font-bold text-green-600">{fmt(maxScore)} <span className="text-xs font-normal text-gray-500">({Math.round(maxPercent)}%)</span></div>
                                       </div>
                                       <div className="bg-gray-50 p-2 rounded">
                                          <div className="text-xs text-gray-500">Thấp nhất</div>
                                          <div className="font-bold text-red-500">{fmt(minScore)} <span className="text-xs font-normal text-gray-500">({Math.round(minPercent)}%)</span></div>
                                       </div>
                                    </div>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}
               </div>

               {/* AI Analysis Section */}
               {aiAnalysis && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 p-6 rounded-xl shadow-sm animate-fade-in">
                     <h3 className="font-bold text-indigo-800 text-lg flex items-center gap-2 mb-4">
                        <BrainCircuit className="h-6 w-6 text-purple-600" /> Báo cáo phân tích từ AI
                     </h3>
                     <div className="prose prose-sm max-w-none text-gray-800 bg-white/50 p-4 rounded-lg">
                        <ReactMarkdown
                           remarkPlugins={[remarkMath]}
                           rehypePlugins={[rehypeKatex]}
                        >
                           {aiAnalysis}
                        </ReactMarkdown>
                     </div>
                  </div>
               )}

               {/* Student List Table */}
               <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                     <h3 className="font-bold text-gray-800">Danh sách bài làm chi tiết</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-600 border-b">
                           <tr>
                              <th className="px-6 py-3 font-medium">Học sinh</th>
                              <th className="px-6 py-3 font-medium text-center">Thời gian</th>
                              <th className="px-6 py-3 font-medium text-center">Cảnh báo AI</th>
                              <th className="px-6 py-3 font-medium text-center">Số câu đúng</th>
                              <th className="px-6 py-3 font-medium text-right">Điểm số</th>
                              <th className="px-6 py-3 font-medium text-center">Trạng thái</th>
                              <th className="px-6 py-3 font-medium text-center">Thao tác</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {examAttempts.map(att => {
                              const student = users.find(u => u.id === att.studentId);
                              const scoredQuestionCount = exam.questions.filter(q => !q.isNotScored).length;
                              // Use the score to accurately determine correct count to avoid recalculation discrepancies
                              const correctCount = Math.round(((att.score || 0) / 10) * scoredQuestionCount);

                              return (
                                 <tr key={att.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => openStudentDetail(att.id)}>
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                                          {student?.name.charAt(0) || '?'}
                                       </div>
                                       <div>
                                          <div className="font-bold">{student?.name || 'Khách'}</div>
                                          <div className="text-[10px] text-gray-500">{new Date(att.submittedAt).toLocaleString('vi-VN')}</div>
                                       </div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                       {att.totalTimeSpentSec ? (
                                          <span className="text-gray-600 bg-gray-100 px-2 py-1 rounded text-sm font-medium flex items-center justify-center gap-1">
                                             <Clock className="h-3 w-3" />
                                             {Math.floor(att.totalTimeSpentSec / 60)}p {att.totalTimeSpentSec % 60}s
                                          </span>
                                       ) : (
                                          <span className="text-gray-400 text-xs">-</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       {(att.cheatWarnings || 0) > 0 ? (
                                          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold flex items-center justify-center gap-1 w-max mx-auto">
                                             <XCircle className="h-3 w-3" /> {att.cheatWarnings} lần
                                          </span>
                                       ) : (
                                          <span className="text-xs text-gray-400">-</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <span className="font-bold text-green-600">{correctCount}</span> / {exam.questions.filter(q => !q.isNotScored).length}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                       <span className={`font-bold text-lg ${(att.score || 0) >= 8 ? 'text-green-600' : (att.score || 0) >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                                          {fmt(att.score || 0)}
                                       </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       {att.teacherFeedback ? (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Đã nhận xét</span>
                                       ) : (
                                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Chưa nhận xét</span>
                                       )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                       <button className="text-indigo-600 hover:bg-indigo-50 p-2 rounded-full transition-colors" title="Xem chi tiết">
                                          <Search className="h-4 w-4" />
                                       </button>
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* Panel gợi ý bài tập cho HS điểm thấp */}
         {exam && exam.questions && examAttempts.length > 0 && (
            <div className="mt-6 bg-white rounded-xl border shadow-sm overflow-hidden">
               <div
                  className="p-5 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setShowRecommendPanel(!showRecommendPanel)}
               >
                  <div className="flex items-center gap-3">
                     <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-500" />
                        Gợi ý bài tập cho học sinh cần cải thiện
                     </h3>
                     {studentsNeedingHelp.length > 0 && (
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                           {studentsNeedingHelp.length} HS cần lưu ý
                        </span>
                     )}
                  </div>
                  {showRecommendPanel ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
               </div>

               {showRecommendPanel && (
                  <div className="px-6 pb-6 border-t pt-4">
                     {studentsNeedingHelp.length === 0 ? (
                        <div className="py-8 text-center text-gray-400">
                           <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                           <p className="text-sm">Tất cả học sinh đạt điểm tốt (≥6,5). Tuyệt vời!</p>
                        </div>
                     ) : (
                        <div className="space-y-4">
                           {studentsNeedingHelp.map((item, idx) => (
                              <div key={idx} className="border border-orange-100 rounded-xl p-4 bg-gradient-to-br from-orange-50/40 to-white hover:from-orange-50 transition">
                                 <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-2">
                                       <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                                          {item.student?.name.charAt(0) || '?'}
                                       </div>
                                       <div>
                                          <div className="font-bold text-gray-900">{item.student?.name}</div>
                                          <div className="text-xs text-gray-500">Điểm bài này: <span className="text-red-600 font-bold">{item.avgScore.toFixed(1)}/10</span></div>
                                       </div>
                                    </div>
                                    {item.wrongTopics.length > 0 && (
                                       <div className="flex flex-wrap gap-1 justify-end">
                                          <span className="text-xs text-gray-500 self-center">Chủ đề yếu:</span>
                                          {item.wrongTopics.map((t, ti) => (
                                             <span key={ti} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{t}</span>
                                          ))}
                                       </div>
                                    )}
                                 </div>
                                 {item.suggested.length > 0 ? (
                                    <div>
                                       <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
                                          <BookOpen className="h-3 w-3" /> Bài tập liên quan gợi ý:
                                       </p>
                                       <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                          {item.suggested.map(e => (
                                             <div key={e.id} className="bg-white rounded-lg border border-indigo-100 p-3 shadow-sm hover:border-indigo-300 transition">
                                                <div className="font-bold text-xs text-gray-800 truncate">{e.title}</div>
                                                <div className="text-[10px] text-gray-500 mt-0.5">{e.subject} • {e.durationMinutes} phút</div>
                                             </div>
                                          ))}
                                       </div>
                                    </div>
                                 ) : (
                                    <p className="text-xs text-gray-400 italic">Chưa có bài tập liên quan trong kho đề.</p>
                                 )}
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}
            </div>
         )}

         {/* AI Config Modal */}
         {showConfigModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-indigo-600" /> Cấu hình phân tích AI
                     </h3>
                     <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
                  </div>

                  {/* Saved Prompts */}
                  {user?.savedPrompts && user.savedPrompts.length > 0 && (
                     <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Mẫu yêu cầu đã lưu</label>
                        <select
                           className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                           onChange={(e) => setCustomPrompt(e.target.value)}
                        >
                           <option value="">-- Chọn mẫu --</option>
                           {user.savedPrompts.map((p, i) => (
                              <option key={i} value={p}>{p.substring(0, 50)}...</option>
                           ))}
                        </select>
                     </div>
                  )}

                  <div className="mb-4">
                     <label className="block text-sm font-medium text-gray-700 mb-2">Yêu cầu tùy chỉnh</label>
                     <textarea
                        className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-gray-900"
                        rows={4}
                        placeholder="VD: Tập trung phân tích các lỗi sai về hình học. Đưa ra nhận xét nghiêm khắc hơn..."
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                     />
                     <p className="text-xs text-gray-500 mt-2">AI sẽ phân tích dựa trên dữ liệu bài làm và yêu cầu này. Yêu cầu mới sẽ được tự động lưu lại.</p>
                  </div>
                  <button
                     onClick={handleClassAnalyze}
                     className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                     Bắt đầu phân tích
                  </button>
               </div>
            </div>
         )}

         {/* Student Detail Modal */}
         {selectedAttempt && selectedStudent && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                  <div className="p-5 border-b flex justify-between items-center bg-white z-10">
                     <div>
                        <h3 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h3>
                        <p className="text-sm text-gray-500">Điểm số: <span className="font-bold text-indigo-600">{fmt(selectedAttempt.score || 0)}</span></p>
                     </div>
                     <div className="flex gap-2">
                        <button
                           onClick={() => handleStudentAnalyze(selectedAttempt)}
                           disabled={isStudentAnalyzing}
                           className="flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-lg font-bold hover:bg-purple-100 transition-colors border border-purple-100"
                        >
                           <Sparkles className="h-4 w-4" /> {isStudentAnalyzing ? 'Đang phân tích...' : 'AI Phân tích riêng'}
                        </button>
                        <button onClick={() => setSelectedAttemptId(null)} className="p-2 hover:bg-gray-100 rounded-full"><X className="h-6 w-6 text-gray-500" /></button>
                     </div>
                  </div>

               {/* Tab Navigation trong Modal */}
               <div className="flex border-b border-gray-200 bg-white px-5">
                  <button
                     onClick={() => setActiveModalTab('feedback')}
                     className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeModalTab === 'feedback' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                     <BrainCircuit className="h-4 w-4" /> Nhận xét &amp; Bài làm
                  </button>
                  <button
                     onClick={() => setActiveModalTab('recommend')}
                     className={`py-2.5 px-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeModalTab === 'recommend' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                     <Target className="h-4 w-4" /> Gợi ý Bài tập
                  </button>
               </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                     {activeModalTab === 'feedback' ? (
                     <>
                     {/* Feedback Section */}
                     <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm mb-6 animate-fade-in">
                        <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                           <BrainCircuit className="h-5 w-5" /> Nhận xét cho học sinh
                           <div className="ml-auto flex gap-2 items-center">
                              {isEditingFeedback ? (
                                 <>
                                    <label className="flex items-center gap-2 cursor-pointer mr-2 bg-gray-50 px-2 py-1 rounded border border-gray-200 hover:bg-gray-100 transition">
                                       <input
                                          type="checkbox"
                                          checked={allowViewSolution}
                                          onChange={e => setAllowViewSolution(e.target.checked)}
                                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                       />
                                       <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
                                          {allowViewSolution ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                                          Xem đáp án
                                       </span>
                                    </label>
                                    <button onClick={handleSendFeedback} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 flex items-center gap-1 shadow-sm">
                                       <Send className="h-3 w-3" /> Gửi nhận xét
                                    </button>
                                 </>
                              ) : (
                                 <button onClick={() => setIsEditingFeedback(true)} className="text-xs bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200">
                                    Chỉnh sửa
                                 </button>
                              )}
                           </div>
                        </h4>

                        {isEditingFeedback ? (
                           <textarea
                              className="w-full border border-gray-300 rounded-lg p-3 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                              rows={6}
                              value={studentAiFeedback}
                              onChange={e => setStudentAiFeedback(e.target.value)}
                              placeholder="Nhập nhận xét của bạn hoặc sử dụng AI để tạo..."
                           />
                        ) : (
                           <div className="prose prose-sm max-w-none text-gray-800 bg-gray-50 p-4 rounded-lg border">
                              {studentAiFeedback ? (
                                 <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                    {studentAiFeedback}
                                 </ReactMarkdown>
                              ) : (
                                 <span className="text-gray-400 italic">Chưa có nhận xét.</span>
                              )}
                              {/* Feedback Status Badge */}
                              <div className="mt-2 pt-2 border-t flex justify-end">
                                 <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${allowViewSolution ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {allowViewSolution ? 'Học sinh ĐƯỢC xem đáp án' : 'Học sinh KHÔNG ĐƯỢC xem đáp án'}
                                 </span>
                              </div>
                           </div>
                        )}
                     </div>

                     <div className="space-y-4">
                        {exam.questions.map((q, idx) => {
                           const userAns = selectedAttempt.answers[q.id];

                           let isCorrect = false;
                           if (userAns !== undefined && userAns !== null && userAns !== '') {
                              if (!q.type || q.type === 'MCQ') {
                                 isCorrect = userAns === q.correctOptionIndex;
                              } else if (q.type === 'SHORT_ANSWER') {
                                 const sAns = String(userAns || '').trim().toLowerCase();
                                 const solString = String(q.solution || '').trim();
                                 const isSolutionShort = solString !== '' && solString.split(/\s+/).length < 10;

                                 isCorrect = (q.options && q.options.length > 0)
                                    ? q.options.some(opt => String(opt).trim().toLowerCase() === sAns)
                                    : (isSolutionShort && sAns === solString.toLowerCase());
                              } else if (['MATCHING', 'ORDERING', 'DRAG_DROP'].includes(q.type)) {
                                 if (Array.isArray(userAns) && userAns.length === q.options.length) {
                                    let isAllCorrect = true;
                                    for (let i = 0; i < q.options.length; i++) {
                                       const expected = q.options[i];
                                       const actual = userAns[i];
                                       const normExpected = String(expected || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                                       const normActual = String(actual || '').trim().toLowerCase().replace(/\s*\|\|\|\s*/g, '|||');
                                       if (normActual !== normExpected) {
                                          isAllCorrect = false;
                                          break;
                                       }
                                    }
                                    isCorrect = isAllCorrect;
                                 }
                              }
                           }

                           return (
                              <div key={q.id} className={`bg-white p-4 rounded-xl border ${isCorrect ? 'border-green-200' : 'border-red-200'} shadow-sm`}>
                                 <div className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                       {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                                    </div>
                                    <div className="flex-1">
                                       <div className="font-medium text-gray-900 mb-2">
                                          <div className="flex justify-between items-center mb-1">
                                             <span className="font-bold text-gray-500 mr-2">Câu {idx + 1}:</span>
                                             {selectedAttempt.timeSpentPerQuestion && selectedAttempt.timeSpentPerQuestion[q.id] ? (
                                                <span className="text-xs text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded">
                                                   <Clock className="h-3 w-3" /> {selectedAttempt.timeSpentPerQuestion[q.id]}s
                                                </span>
                                             ) : null}
                                          </div>
                                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{q.content}</ReactMarkdown>
                                       </div>

                                       {q.imageUrl && (
                                          <img src={q.imageUrl} alt="Question" className="my-2 rounded-lg border max-h-40 object-contain" />
                                       )}

                                       {(!q.type || q.type === 'MCQ') ? (
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                             {q.options.map((opt, i) => {
                                                let optionClass = "p-2 rounded border ";
                                                if (i === q.correctOptionIndex) optionClass += "bg-green-50 border-green-500 text-green-800 font-bold";
                                                else if (i === userAns && !isCorrect) optionClass += "bg-red-50 border-red-500 text-red-800 font-bold";
                                                else optionClass += "bg-white border-gray-200 text-gray-500 opacity-70";

                                                return (
                                                   <div key={i} className={optionClass}>
                                                      <span className="mr-2">{String.fromCharCode(65 + i)}.</span>
                                                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]} className="inline">{opt}</ReactMarkdown>
                                                   </div>
                                                );
                                             })}
                                          </div>
                                       ) : q.type === 'SHORT_ANSWER' ? (
                                          <div className="space-y-2 mt-3 text-sm">
                                             <div className={`p-3 rounded border ${isCorrect ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'} font-medium`}>
                                                <span className="text-gray-500 mr-2 text-xs uppercase tracking-wider">Học sinh trả lời:</span>
                                                <div className="mt-1 font-bold text-base">{userAns !== undefined && userAns !== null && userAns !== '' ? String(userAns) : <span className="text-gray-400 italic font-normal">Chưa trả lời</span>}</div>
                                             </div>
                                             <div className="p-3 rounded border bg-blue-50 border-blue-500 text-blue-800 font-medium">
                                                <span className="text-gray-500 mr-2 text-xs uppercase tracking-wider">Đáp án đúng:</span>
                                                <div className="mt-1 font-bold text-base">{q.options && q.options.length > 0 ? q.options.join(' hoặc ') : q.solution || String(q.correctOptionIndex ?? '')}</div>
                                             </div>
                                          </div>
                                       ) : (
                                          <div className="space-y-2 mt-3 text-sm">
                                             <div className={`p-3 rounded border ${isCorrect ? 'bg-green-50 border-green-500 text-green-800' : 'bg-red-50 border-red-500 text-red-800'} font-medium`}>
                                                <span className="text-gray-500 mr-2 text-xs uppercase tracking-wider">Học sinh trả lời:</span>
                                                <div className="mt-1 font-bold text-base">
                                                   {(userAns === undefined || userAns === null || userAns === '') ? 
                                                      <span className="text-gray-400 italic font-normal">Chưa trả lời</span> : 
                                                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                         {Array.isArray(userAns) ? userAns.join(' | ') : String(userAns)}
                                                      </ReactMarkdown>
                                                   }
                                                </div>
                                             </div>
                                             <div className="p-3 rounded border bg-blue-50 border-blue-500 text-blue-800 font-medium">
                                                <span className="text-gray-500 mr-2 text-xs uppercase tracking-wider">Đáp án đúng:</span>
                                                <div className="mt-1 font-bold text-base">
                                                   <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                                                      {q.options ? q.options.join(' | ') : ''}
                                                   </ReactMarkdown>
                                                </div>
                                             </div>
                                          </div>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                     </>
                     ) : (
                     /* Tab Gợi ý Bài tập */
                     <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 flex justify-between items-center">
                           <div>
                              <h4 className="font-bold text-purple-800 text-sm mb-1 flex items-center gap-2">
                                 <Target className="h-4 w-4" /> Gợi ý dành riêng cho {selectedStudent?.name}
                              </h4>
                              <p className="text-xs text-purple-600">Dựa trên lịch sử 3 tháng gần nhất của học sinh</p>
                           </div>
                           <button
                              onClick={handleSendRecommendations}
                              disabled={isSendingRec || !studentRecommendations || studentRecommendations.recommendedExams.length === 0}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm no-print"
                           >
                              {isSendingRec ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                              Gửi cho HS
                           </button>
                        </div>

                        {studentRecommendations && studentRecommendations.recommendedExams.length > 0 ? (
                           <div className="grid grid-cols-1 gap-3">
                              {studentRecommendations.recommendedExams.map((rec, i) => (
                                 <div key={rec.exam.id} className="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition">
                                    <div className="flex items-start gap-3">
                                       <div className="bg-purple-100 text-purple-700 font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                                          #{i + 1}
                                       </div>
                                       <div className="flex-1 min-w-0">
                                          <div className="font-bold text-gray-900 text-sm truncate">{rec.exam.title}</div>
                                          <div className="flex flex-wrap gap-1.5 mt-1">
                                             <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{rec.exam.subject}</span>
                                             <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">{rec.difficulty}</span>
                                          </div>
                                          <div className="text-xs text-gray-500 mt-1.5">
                                             {rec.reasons.map((r, ri) => (
                                                <div key={ri} className="flex items-start gap-1">
                                                   <span className="text-purple-400">•</span>
                                                   <span>{r}</span>
                                                </div>
                                             ))}
                                          </div>
                                       </div>
                                       <div className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                                          <Clock className="h-3 w-3" />{rec.exam.durationMinutes}p
                                       </div>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="py-10 text-center text-gray-400">
                              <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">Chưa có bài tập phù hợp để gợi ý.</p>
                           </div>
                        )}
                     </div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};