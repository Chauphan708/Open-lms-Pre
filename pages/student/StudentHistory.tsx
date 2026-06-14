import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Clock, CheckCircle, Search, ArrowRight, MessageSquareQuote, FileText, Bot, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StudentHistory: React.FC = () => {
   const { attempts, exams, user, fetchAttempts, fetchExams } = useStore();

   useEffect(() => {
      if (user) {
         fetchAttempts();
         fetchExams();
      }
   }, [user, fetchAttempts, fetchExams]);
   const [activeTab, setActiveTab] = useState<'quiz' | 'ai'>('quiz');

   if (!user || user.role !== 'STUDENT') return <div>Truy cập bị từ chối</div>;

   // Phân trang (Pagination) tối ưu cho 1000+ records làm bài
   const [currentPage, setCurrentPage] = useState(1);
   const recordsPerPage = 10; // Giới hạn 10 dòng mỗi trang để tải siêu tốc

   // Reset trang về 1 khi lọc thay đổi
   useEffect(() => {
      setCurrentPage(1);
   }, [attempts]);

   // Filter attempts for this student
   const myAttempts = attempts
      .filter(a => a.studentId === user.id)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

   const totalRecords = myAttempts.length;
   const totalPages = Math.ceil(totalRecords / recordsPerPage);

   // Lấy danh sách record của trang hiện tại
   const indexOfLastRecord = currentPage * recordsPerPage;
   const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
   const currentRecords = myAttempts.slice(indexOfFirstRecord, indexOfLastRecord);

   // Demo AI Submissions (Chờ dữ liệu thật từ DB)
   const myAISubmissions: any[] = [];

   return (
      <div className="max-w-6xl mx-auto space-y-6">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div>
               <h1 className="text-2xl font-bold text-gray-900">Hồ Sơ Học Tập</h1>
               <p className="text-gray-500 mt-1">Xem lại kết quả Trắc nghiệm và Tự luận (AI chấm).</p>
            </div>
         </div>

         {/* Tabs Navigation */}
         <div className="flex border-b border-gray-200">
            <button
               onClick={() => setActiveTab('quiz')}
               className={`py-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'quiz' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <CheckCircle className="h-5 w-5" /> Trắc Nghiệm Online
            </button>
            <button
               onClick={() => setActiveTab('ai')}
               className={`py-3 px-6 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ai' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
               <Bot className="h-5 w-5" /> Trợ Lý AI Chấm Tự Luận
            </button>
         </div>

         {activeTab === 'quiz' && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
               {myAttempts.length === 0 ? (
                  <div className="p-16 text-center text-gray-400">
                     <CheckCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                     <p>Bạn chưa hoàn thành bài thi trắc nghiệm nào.</p>
                  </div>
               ) : (
                  <div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-gray-50 text-gray-700 uppercase">
                              <tr>
                                 <th className="px-6 py-4">Bài tập</th>
                                 <th className="px-6 py-4">Thời gian nộp</th>
                                 <th className="px-6 py-4 text-center">Điểm số</th>
                                 <th className="px-6 py-4">Nhận xét</th>
                                 <th className="px-6 py-4 text-center">Thao tác</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100">
                              {currentRecords.map(att => {
                                 const exam = exams.find(e => e.id === att.examId);
                                 const hasFeedback = !!att.teacherFeedback;

                                 return (
                                    <tr key={att.id} className="hover:bg-gray-50 transition-colors">
                                       <td className="px-6 py-4">
                                          <div className="font-bold text-gray-900">{exam?.title || 'Bài tập đã xóa'}</div>
                                          <div className="text-xs text-gray-500">{exam?.subject || 'Tổng hợp'}</div>
                                       </td>
                                       <td className="px-6 py-4 text-gray-600">
                                          <div className="flex items-center gap-2">
                                             <Clock className="h-3 w-3" />
                                             {new Date(att.submittedAt).toLocaleString('vi-VN')}
                                          </div>
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <span className={`inline-block w-10 py-1 rounded font-bold ${(att.score || 0) >= 8 ? 'bg-green-100 text-green-700' :
                                             (att.score || 0) >= 5 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                             }`}>
                                             {(att.score || 0).toFixed(1).replace('.', ',')}
                                          </span>
                                       </td>
                                       <td className="px-6 py-4">
                                          {hasFeedback ? (
                                             <span className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">
                                                <MessageSquareQuote className="h-3 w-3" /> GV đã phản hồi
                                             </span>
                                          ) : (
                                             <span className="text-xs text-gray-400 italic">...</span>
                                          )}
                                       </td>
                                       <td className="px-6 py-4 text-center">
                                          <Link
                                             to={`/exam/${att.examId}/take?assign=${att.assignmentId || ''}&attempt=${att.id}`}
                                             className="text-indigo-600 hover:text-indigo-800 font-medium text-xs flex items-center justify-center gap-1 group"
                                          >
                                             Xem chi tiết <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                                          </Link>
                                       </td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>

                     {/* Phân trang UI Điều khiển */}
                     {totalPages > 1 && (
                        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-150">
                           <div className="text-xs text-gray-500">
                              Hiển thị <span className="font-bold text-gray-700">{indexOfFirstRecord + 1}</span> - <span className="font-bold text-gray-700">{Math.min(indexOfLastRecord, totalRecords)}</span> trên tổng số <span className="font-bold text-gray-700">{totalRecords}</span> bài làm
                           </div>
                           <div className="flex gap-2">
                              <button
                                 onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                 disabled={currentPage === 1}
                                 className="px-3 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                              >
                                 Trước
                              </button>
                              <div className="flex items-center gap-1">
                                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    // Thuật toán hiển thị các trang xung quanh trang hiện tại
                                    let pageNum = i + 1;
                                    if (currentPage > 3 && totalPages > 5) {
                                       pageNum = currentPage - 3 + i;
                                       if (pageNum + (4 - i) > totalPages) {
                                          pageNum = totalPages - 4 + i;
                                       }
                                    }
                                    return (
                                       <button
                                          key={pageNum}
                                          onClick={() => setCurrentPage(pageNum)}
                                          className={`h-7 w-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${currentPage === pageNum ? 'bg-indigo-600 text-white shadow-sm' : 'border bg-white text-gray-700 hover:bg-gray-50'}`}
                                       >
                                          {pageNum}
                                       </button>
                                    );
                                 })}
                              </div>
                              <button
                                 onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                 disabled={currentPage === totalPages}
                                 className="px-3 py-1.5 rounded-lg border bg-white text-xs font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                              >
                                 Sau
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )}
            </div>
         )}

         {activeTab === 'ai' && (
            <div className="space-y-4">
               <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-gray-700">Các bài tự luận đã được AI chấm</h3>
                  <button className="text-sm flex items-center gap-1 text-gray-500 hover:text-indigo-600">
                     <RefreshCw className="h-4 w-4" /> Làm mới
                  </button>
               </div>

               {myAISubmissions.length === 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {/* DEMO CARD (Chờ dữ liệu thật) */}
                     <div className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                           <span className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 text-emerald-700 font-bold text-lg border-2 border-white shadow-sm">
                              85
                           </span>
                        </div>

                        <div className="mb-4 pr-16">
                           <div className="flex gap-2 items-center text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                              <FileText className="h-4 w-4" /> Bài Tập Nhà
                           </div>
                           <h4 className="text-lg font-bold text-gray-900 line-clamp-2">Đề Cương Ôn Tập Chương 2</h4>
                           <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> 20/11/2026 - 14:30
                           </p>
                        </div>

                        <div className="flex-1 space-y-4 text-sm mt-2">
                           {/* Ưu điểm */}
                           <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                              <strong className="text-green-800 block mb-1">Ưu điểm:</strong>
                              <p className="text-gray-700 line-clamp-3">Bài làm tốt, chữ viết rõ ràng. Xác định đúng hướng giải quyết vấn đề.</p>
                           </div>

                           {/* Hạn chế */}
                           <div className="bg-red-50 p-3 rounded-xl border border-red-100">
                              <strong className="text-red-800 block mb-1">Hạn chế:</strong>
                              <p className="text-gray-700 line-clamp-3">Còn sai sót lỗi chính tả ở mục 2. Nên chú ý trình bày cẩn thận hơn.</p>
                           </div>

                           {/* Cải thiện */}
                           <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                              <strong className="text-blue-800 block mb-1">Lời khuyên:</strong>
                              <p className="text-gray-700 line-clamp-3">Hãy đọc thêm tài liệu tham khảo sách giáo khoa trang 45.</p>
                           </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100">
                           <button className="w-full py-2.5 rounded-xl bg-gray-50 text-indigo-600 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 group">
                              Xem Ảnh Bài Nộp <ExternalLink className="h-4 w-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                           </button>
                        </div>
                     </div>
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                     {/* Items will be mapped here once data connects */}
                  </div>
               )}
            </div>
         )}
      </div>
   );
};