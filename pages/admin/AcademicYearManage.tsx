import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { AcademicYear, AcademicYearProposal } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { 
  CalendarRange, Plus, Save, Edit2, Trash2, Star, CheckCircle2, 
  AlertCircle, X, Clock, Info, Send, Inbox, Check, XCircle, 
  History, MessageSquare, ShieldCheck, UserCheck, CheckSquare
} from 'lucide-react';

interface TimeStatus {
  label: string;
  badgeClass: string;
  dotClass: string;
  detail?: string;
}

const getYearTimeStatus = (year: AcademicYear): TimeStatus => {
  const today = new Date().toISOString().split('T')[0];
  const sem1 = year.semesters?.[0];
  const sem2 = year.semesters?.[1];

  const start = sem1?.startDate || '';
  const end = sem2?.endDate || sem1?.endDate || '';

  if (!start) {
    return {
      label: 'Chưa thiết lập',
      badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dotClass: 'bg-gray-400'
    };
  }

  if (today < start) {
    return {
      label: 'Sắp diễn ra',
      badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
      dotClass: 'bg-blue-500'
    };
  }

  if (end && today > end) {
    return {
      label: 'Đã kết thúc',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dotClass: 'bg-gray-400'
    };
  }

  // Đang trong thời gian năm học
  if (sem1?.startDate && sem1?.endDate && today >= sem1.startDate && today <= sem1.endDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Học kì 1',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      dotClass: 'bg-emerald-600'
    };
  }

  if (sem2?.startDate && sem2?.endDate && today >= sem2.startDate && today <= sem2.endDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Học kì 2',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
      dotClass: 'bg-emerald-600'
    };
  }

  if (sem1?.endDate && sem2?.startDate && today > sem1.endDate && today < sem2.startDate) {
    return {
      label: 'Đang diễn ra',
      detail: 'Nghỉ giữa kỳ',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
      dotClass: 'bg-amber-500'
    };
  }

  return {
    label: 'Đang diễn ra',
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    dotClass: 'bg-emerald-600'
  };
};

export const AcademicYearManage: React.FC = () => {
  const { 
    academicYears, 
    classes, 
    user,
    users,
    addAcademicYear, 
    updateAcademicYear, 
    setActiveAcademicYear, 
    deleteAcademicYear,
    fetchClasses
  } = useStore();

  const isAdmin = user?.role === 'ADMIN';

  // Tabs: 'YEARS' (Official academic years) | 'PROPOSALS' (Proposals list)
  const [activeTab, setActiveTab] = useState<'YEARS' | 'PROPOSALS'>('YEARS');

  // Proposal State
  const [proposals, setProposals] = useState<AcademicYearProposal[]>([]);
  const [isProposalsLoading, setIsProposalsLoading] = useState(false);

  // Status Notification
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin Direct Create Modal
  const [isCreating, setIsCreating] = useState(false);
  // Admin Direct Edit Modal
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);

  // Teacher Proposal Modal (Create new or Update existing)
  const [isProposing, setIsProposing] = useState(false);
  const [proposalAction, setProposalAction] = useState<'CREATE' | 'UPDATE'>('CREATE');
  const [proposalYearId, setProposalYearId] = useState<string | undefined>(undefined);
  const [proposalReason, setProposalReason] = useState('');

  // Admin Reject Proposal Modal
  const [rejectingProposal, setRejectingProposal] = useState<AcademicYearProposal | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [sem1Start, setSem1Start] = useState('');
  const [sem1End, setSem1End] = useState('');
  const [sem2Start, setSem2Start] = useState('');
  const [sem2End, setSem2End] = useState('');
  const [isDefaultActive, setIsDefaultActive] = useState(false);

  // Edit Form State (for Admin)
  const [editName, setEditName] = useState('');
  const [editSem1Start, setEditSem1Start] = useState('');
  const [editSem1End, setEditSem1End] = useState('');
  const [editSem2Start, setEditSem2Start] = useState('');
  const [editSem2End, setEditSem2End] = useState('');
  const [editIsActive, setEditIsActive] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  const loadProposals = async () => {
    try {
      setIsProposalsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('payload->>category', 'ACADEMIC_YEAR_PROPOSAL')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: AcademicYearProposal[] = data.map((n: any) => ({
          id: String(n.id),
          proposalId: n.payload?.proposalId || n.id,
          action: n.payload?.action || 'CREATE',
          yearId: n.payload?.yearId,
          name: n.payload?.name || '',
          semesters: Array.isArray(n.payload?.semesters) ? n.payload.semesters : [],
          proposerId: n.payload?.proposerId || '',
          proposerName: n.payload?.proposerName || 'Giáo viên',
          proposerEmail: n.payload?.proposerEmail,
          reason: n.payload?.reason || '',
          status: n.payload?.status || 'PENDING',
          adminNote: n.payload?.adminNote || '',
          createdAt: n.created_at || new Date().toISOString(),
          reviewedAt: n.payload?.reviewedAt
        }));
        setProposals(mapped);
      }
    } catch (e) {
      console.error("Error loading proposals", e);
    } finally {
      setIsProposalsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    loadProposals();
  }, [fetchClasses]);

  const resetForm = () => {
    setName('');
    setSem1Start('');
    setSem1End('');
    setSem2Start('');
    setSem2End('');
    setIsDefaultActive(false);
    setProposalReason('');
    setProposalYearId(undefined);
    setProposalAction('CREATE');
  };

  // --- ADMIN DIRECT ACTIONS ---
  const handleAdminCreate = async () => {
    if (!name.trim()) {
      showNotification('error', 'Vui lòng nhập tên năm học (VD: 2026-2027)');
      return;
    }
    if (!sem1Start || !sem1End) {
      showNotification('error', 'Vui lòng chọn ngày bắt đầu và kết thúc của Học kì 1');
      return;
    }

    const newYear: AcademicYear = {
      id: `ay_${Date.now()}`,
      name: name.trim(),
      isActive: isDefaultActive,
      semesters: [
        { id: `s1_${Date.now()}`, name: 'Học kì 1', startDate: sem1Start, endDate: sem1End },
        { id: `s2_${Date.now()}`, name: 'Học kì 2', startDate: sem2Start || sem1End, endDate: sem2End || sem1End },
      ]
    };
    
    await addAcademicYear(newYear);
    setIsCreating(false);
    resetForm();
    showNotification('success', `Admin đã thêm thành công năm học ${newYear.name}`);
  };

  const startEdit = (year: AcademicYear) => {
    setEditingYear(year);
    setEditName(year.name);
    setEditSem1Start(year.semesters?.[0]?.startDate || '');
    setEditSem1End(year.semesters?.[0]?.endDate || '');
    setEditSem2Start(year.semesters?.[1]?.startDate || '');
    setEditSem2End(year.semesters?.[1]?.endDate || '');
    setEditIsActive(Boolean(year.isActive));
  };

  const handleSaveEdit = async () => {
    if (!editingYear) return;
    if (!editName.trim()) {
      showNotification('error', 'Vui lòng nhập tên năm học');
      return;
    }

    const updated: AcademicYear = {
      ...editingYear,
      name: editName.trim(),
      isActive: editIsActive,
      semesters: [
        { 
          id: editingYear.semesters?.[0]?.id || `s1_${Date.now()}`, 
          name: 'Học kì 1', 
          startDate: editSem1Start, 
          endDate: editSem1End 
        },
        { 
          id: editingYear.semesters?.[1]?.id || `s2_${Date.now()}`, 
          name: 'Học kì 2', 
          startDate: editSem2Start || editSem1End, 
          endDate: editSem2End || editSem1End 
        },
      ]
    };

    await updateAcademicYear(updated);
    setEditingYear(null);
    showNotification('success', `Đã cập nhật thông tin năm học ${updated.name}`);
  };

  const handleToggleActive = async (year: AcademicYear) => {
    if (year.isActive) {
      showNotification('error', `Năm học ${year.name} đang là năm học hiện hành.`);
      return;
    }

    const success = await setActiveAcademicYear(year.id);
    if (success) {
      showNotification('success', `Đã kích hoạt năm học ${year.name} làm năm học hiện hành toàn trường.`);
    }
  };

  const handleDelete = async (year: AcademicYear) => {
    const linked = classes.filter(c => c.academicYearId === year.id);
    if (linked.length > 0) {
      showNotification('error', `Không thể xóa năm học ${year.name} vì đang có ${linked.length} lớp học trực thuộc.`);
      return;
    }

    if (window.confirm(`Bạn có chắc chắn muốn xóa năm học "${year.name}"?`)) {
      const success = await deleteAcademicYear(year.id);
      if (success) {
        showNotification('success', `Đã xóa thành công năm học ${year.name}`);
      }
    }
  };

  // --- TEACHER PROPOSAL ACTIONS ---
  const startTeacherCreateProposal = () => {
    resetForm();
    setProposalAction('CREATE');
    setIsProposing(true);
  };

  const startTeacherUpdateProposal = (year: AcademicYear) => {
    resetForm();
    setProposalAction('UPDATE');
    setProposalYearId(year.id);
    setName(year.name);
    setSem1Start(year.semesters?.[0]?.startDate || '');
    setSem1End(year.semesters?.[0]?.endDate || '');
    setSem2Start(year.semesters?.[1]?.startDate || '');
    setSem2End(year.semesters?.[1]?.endDate || '');
    setIsProposing(true);
  };

  const handleTeacherSubmitProposal = async () => {
    if (!name.trim()) {
      showNotification('error', 'Vui lòng nhập tên năm học đề xuất');
      return;
    }
    if (!sem1Start || !sem1End) {
      showNotification('error', 'Vui lòng chọn ngày bắt đầu và kết thúc của Học kì 1');
      return;
    }

    const proposalId = `ay_prop_${Date.now()}`;
    const newProposalPayload = {
      category: 'ACADEMIC_YEAR_PROPOSAL',
      proposalId,
      action: proposalAction,
      yearId: proposalYearId,
      name: name.trim(),
      semesters: [
        { id: `s1_${Date.now()}`, name: 'Học kì 1', startDate: sem1Start, endDate: sem1End },
        { id: `s2_${Date.now()}`, name: 'Học kì 2', startDate: sem2Start || sem1End, endDate: sem2End || sem1End },
      ],
      proposerId: user?.id,
      proposerName: user?.name || 'Giáo viên',
      proposerEmail: user?.email,
      reason: proposalReason.trim(),
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const notifRow = {
      id: `notif_${proposalId}`,
      user_id: user?.id,
      type: 'INFO',
      title: proposalAction === 'CREATE' ? `Đề xuất năm học mới: ${name.trim()}` : `Đề xuất điều chỉnh năm học: ${name.trim()}`,
      message: `Đề xuất ${proposalAction === 'CREATE' ? 'thêm mới' : 'điều chỉnh'} năm học ${name.trim()} từ GV ${user?.name || ''}`,
      link: '/admin/years',
      payload: newProposalPayload
    };

    const { error } = await supabase.from('notifications').insert(notifRow);

    if (!error) {
      // Gửi thông báo đến Admin
      const admins = users.filter(u => u.role === 'ADMIN');
      if (admins.length > 0) {
        const adminAlerts = admins.map(adm => ({
          id: `notif_adm_alert_${Date.now()}_${adm.id.substr(0, 6)}`,
          user_id: adm.id,
          type: 'INFO',
          title: `🔔 Đề xuất năm học từ GV ${user?.name || ''}`,
          message: `GV ${user?.name || ''} đề xuất ${proposalAction === 'CREATE' ? 'thêm năm học mới' : 'điều chỉnh năm học'} ${name.trim()}. Vui lòng xem và phê duyệt.`,
          link: '/admin/years',
          payload: { category: 'ADMIN_ALERT_YEAR_PROPOSAL', proposalId }
        }));
        await supabase.from('notifications').insert(adminAlerts);
      }

      setIsProposing(false);
      resetForm();
      showNotification('success', `Đã gửi đề xuất năm học "${name.trim()}" tới Ban Giám hiệu / Admin thành công!`);
      await loadProposals();
    } else {
      showNotification('error', 'Lỗi khi gửi đề xuất: ' + error.message);
    }
  };

  // --- ADMIN APPROVE & REJECT ACTIONS ---
  const handleApproveProposal = async (proposal: AcademicYearProposal) => {
    if (!window.confirm(`Bạn có chắc chắn muốn PHÊ DUYỆT và tạo chính thức năm học "${proposal.name}"?`)) {
      return;
    }

    try {
      // 1. Áp dụng năm học vào CSDL
      if (proposal.action === 'CREATE') {
        const newYear: AcademicYear = {
          id: proposal.yearId || `ay_${Date.now()}`,
          name: proposal.name,
          isActive: false,
          semesters: proposal.semesters
        };
        await addAcademicYear(newYear);
      } else if (proposal.action === 'UPDATE' && proposal.yearId) {
        const targetYear = academicYears.find(y => y.id === proposal.yearId);
        const updatedYear: AcademicYear = {
          id: proposal.yearId,
          name: proposal.name,
          isActive: Boolean(targetYear?.isActive),
          semesters: proposal.semesters
        };
        await updateAcademicYear(updatedYear);
      }

      // 2. Cập nhật trạng thái bản ghi đề xuất
      await supabase.from('notifications').update({
        payload: {
          category: 'ACADEMIC_YEAR_PROPOSAL',
          proposalId: proposal.proposalId,
          action: proposal.action,
          yearId: proposal.yearId,
          name: proposal.name,
          semesters: proposal.semesters,
          proposerId: proposal.proposerId,
          proposerName: proposal.proposerName,
          proposerEmail: proposal.proposerEmail,
          reason: proposal.reason,
          status: 'APPROVED',
          reviewedAt: new Date().toISOString()
        }
      }).eq('id', proposal.id);

      // 3. Gửi thông báo kết quả cho giáo viên đề xuất
      if (proposal.proposerId) {
        await supabase.from('notifications').insert({
          id: `notif_app_${Date.now()}`,
          user_id: proposal.proposerId,
          type: 'SUCCESS',
          title: '🎉 Đề xuất năm học đã được duyệt',
          message: `Admin đã phê duyệt đề xuất năm học ${proposal.name}. Năm học đã chính thức được áp dụng trên hệ thống!`,
          link: '/admin/years',
          payload: { category: 'YEAR_PROPOSAL_RESULT', status: 'APPROVED' }
        });
      }

      showNotification('success', `Đã phê duyệt và chính thức áp dụng năm học "${proposal.name}"!`);
      await loadProposals();
    } catch (e: any) {
      showNotification('error', 'Lỗi khi phê duyệt: ' + e.message);
    }
  };

  const handleRejectProposal = async () => {
    if (!rejectingProposal) return;

    try {
      // 1. Cập nhật trạng thái bản ghi đề xuất
      await supabase.from('notifications').update({
        payload: {
          category: 'ACADEMIC_YEAR_PROPOSAL',
          proposalId: rejectingProposal.proposalId,
          action: rejectingProposal.action,
          yearId: rejectingProposal.yearId,
          name: rejectingProposal.name,
          semesters: rejectingProposal.semesters,
          proposerId: rejectingProposal.proposerId,
          proposerName: rejectingProposal.proposerName,
          proposerEmail: rejectingProposal.proposerEmail,
          reason: rejectingProposal.reason,
          status: 'REJECTED',
          adminNote: rejectReason.trim(),
          reviewedAt: new Date().toISOString()
        }
      }).eq('id', rejectingProposal.id);

      // 2. Gửi thông báo cho giáo viên
      if (rejectingProposal.proposerId) {
        await supabase.from('notifications').insert({
          id: `notif_rej_${Date.now()}`,
          user_id: rejectingProposal.proposerId,
          type: 'WARNING',
          title: 'Đề xuất năm học chưa được phê duyệt',
          message: `Admin đã từ chối đề xuất năm học ${rejectingProposal.name}.${rejectReason.trim() ? ` Lý do: ${rejectReason.trim()}` : ''}`,
          link: '/admin/years',
          payload: { category: 'YEAR_PROPOSAL_RESULT', status: 'REJECTED', adminNote: rejectReason.trim() }
        });
      }

      showNotification('success', `Đã từ chối đề xuất năm học "${rejectingProposal.name}".`);
      setRejectingProposal(null);
      setRejectReason('');
      await loadProposals();
    } catch (e: any) {
      showNotification('error', 'Lỗi khi từ chối đề xuất: ' + e.message);
    }
  };

  // Filter proposals
  const pendingProposals = proposals.filter(p => p.status === 'PENDING');
  const myProposals = proposals.filter(p => p.proposerId === user?.id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarRange className="w-7 h-7 text-indigo-600 dark:text-indigo-400" /> Quản lý Năm Học
            </h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isAdmin 
                ? 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' 
                : 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
            }`}>
              {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              {isAdmin ? 'Quyền Admin (Phê duyệt)' : 'Giáo viên (Đề xuất)'}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {isAdmin 
              ? 'Toàn quyền thêm mới trực tiếp, duyệt các đề xuất năm học từ Giáo viên và thiết lập niên khóa hiện hành.'
              : 'Xem niên khóa chính thức, tiến độ học kỳ và gửi đề xuất năm học mới lên Ban Giám hiệu / Admin phê duyệt.'
            }
          </p>
        </div>

        {/* Action Button on Header */}
        <div>
          {isAdmin ? (
            <button 
              onClick={() => { setIsCreating(true); setEditingYear(null); }}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" /> Thêm Năm Học Mới (Admin)
            </button>
          ) : (
            <button 
              onClick={startTeacherCreateProposal}
              className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Send className="h-4 w-4" /> Gửi Đề Xuất Năm Học Mới
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab('YEARS')}
          className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'YEARS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>Năm Học Chính Thức</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
            {academicYears.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PROPOSALS')}
          className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'PROPOSALS'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {isAdmin ? <Inbox className="w-4 h-4" /> : <History className="w-4 h-4" />}
          <span>{isAdmin ? 'Đề Xuất Từ Giáo Viên' : 'Lịch Sử Đề Xuất Của Tôi'}</span>
          {isAdmin && pendingProposals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
              {pendingProposals.length} chờ duyệt
            </span>
          )}
          {!isAdmin && myProposals.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
              {myProposals.length}
            </span>
          )}
        </button>
      </div>

      {/* Notification Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl flex items-center justify-between border ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300' 
            : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300'
        } transition-all`}>
          <div className="flex items-center gap-2 font-medium text-sm">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: OFFICIAL ACADEMIC YEARS */}
      {activeTab === 'YEARS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Info Callout */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 flex items-start gap-3 dark:bg-indigo-950/30 dark:border-indigo-900/50">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5 dark:text-indigo-400" />
            <div className="text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
              <p className="font-semibold text-indigo-950 dark:text-indigo-100 mb-0.5">
                {isAdmin 
                  ? 'Quy trình vận hành niên khóa:'
                  : 'Quy định đề xuất niên khóa dành cho Giáo viên:'
                }
              </p>
              <ul className="list-disc list-inside space-y-1 text-indigo-800 dark:text-indigo-300">
                {isAdmin ? (
                  <>
                    <li>Admin có quyền tạo trực tiếp, điều chỉnh học kì và kích hoạt <strong>Năm học hiện hành</strong> toàn trường.</li>
                    <li>Khi có Giáo viên đề xuất thêm mới hoặc điều chỉnh năm học, Admin vào tab <strong>"Đề xuất từ Giáo viên"</strong> để xem xét duyệt hoặc từ chối.</li>
                  </>
                ) : (
                  <>
                    <li>Để đảm bảo tính thống nhất dữ liệu trong nhà trường, chỉ <strong>Admin</strong> mới có quyền tạo năm học chính thức.</li>
                    <li>Thầy/Cô có thể gửi <strong>Đề xuất năm học mới</strong> hoặc <strong>Đề xuất điều chỉnh thời gian học kỳ</strong>. Ban Giám hiệu sẽ xem xét và phê duyệt để đưa vào hệ thống.</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Admin Direct Create Form */}
          {isAdmin && isCreating && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-md animate-fade-in space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" /> Thêm mới năm học (Trực tiếp bởi Admin)
                </h3>
                <button onClick={() => setIsCreating(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Tên năm học <span className="text-rose-500">*</span></label>
                  <input 
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-medium" 
                    placeholder="VD: 2026-2027"
                    value={name} 
                    onChange={e => setName(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Định dạng khuyên dùng: Năm Bắt Đầu - Năm Kết Thúc</p>
                </div>

                <div className="flex items-center pt-2 md:pt-7">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={isDefaultActive} 
                      onChange={e => setIsDefaultActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      ⭐ Đặt làm năm học hiện hành cho toàn trường
                    </span>
                  </label>
                </div>
                 
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 1
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem1Start} 
                        onChange={e => setSem1Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem1End} 
                        onChange={e => setSem1End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 2
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem2Start} 
                        onChange={e => setSem2Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem2End} 
                        onChange={e => setSem2End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5 justify-end border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-semibold text-sm transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAdminCreate} 
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Save className="h-4 w-4" /> Lưu Năm Học
                </button>
              </div>
            </div>
          )}

          {/* Admin Direct Edit Modal */}
          {isAdmin && editingYear && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900 shadow-md animate-fade-in space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-indigo-600" /> Chỉnh sửa năm học: {editingYear.name}
                </h3>
                <button onClick={() => setEditingYear(null)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Tên năm học <span className="text-rose-500">*</span></label>
                  <input 
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-medium" 
                    value={editName} 
                    onChange={e => setEditName(e.target.value)}
                  />
                </div>

                <div className="flex items-center pt-2 md:pt-7">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={editIsActive} 
                      onChange={e => setEditIsActive(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                      ⭐ Đặt làm năm học hiện hành cho toàn trường
                    </span>
                  </label>
                </div>
                 
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 1
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={editSem1Start} 
                        onChange={e => setEditSem1Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={editSem1End} 
                        onChange={e => setEditSem1End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 2
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={editSem2Start} 
                        onChange={e => setEditSem2Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={editSem2End} 
                        onChange={e => setEditSem2End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5 justify-end border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setEditingYear(null)} 
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-semibold text-sm transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Save className="h-4 w-4" /> Cập Nhật Năm Học
                </button>
              </div>
            </div>
          )}

          {/* Teacher Proposal Form Modal */}
          {!isAdmin && isProposing && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900 shadow-md animate-fade-in space-y-5">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
                <h3 className="font-bold text-gray-900 dark:text-slate-100 text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-600" />
                  {proposalAction === 'CREATE' ? 'Gửi đề xuất thêm năm học mới' : `Đề xuất điều chỉnh năm học: ${name}`}
                </h3>
                <button onClick={() => setIsProposing(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-300">
                💡 <strong>Ghi chú:</strong> Đề xuất của thầy/cô sẽ được chuyển đến Ban Giám hiệu / Admin để phê duyệt trước khi chính thức áp dụng.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Tên năm học đề xuất <span className="text-rose-500">*</span></label>
                  <input 
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-medium" 
                    placeholder="VD: 2027-2028"
                    value={name} 
                    onChange={e => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">Lý do / Ghi chú đề xuất</label>
                  <input 
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm font-medium" 
                    placeholder="VD: Chuẩn bị kế hoạch giảng dạy cho khối mới"
                    value={proposalReason} 
                    onChange={e => setProposalReason(e.target.value)}
                  />
                </div>
                 
                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 1
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem1Start} 
                        onChange={e => setSem1Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem1End} 
                        onChange={e => setSem1End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl space-y-2">
                  <p className="font-bold text-sm text-indigo-900 dark:text-indigo-400 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" /> Thời gian Học kì 2
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày bắt đầu:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem2Start} 
                        onChange={e => setSem2Start(e.target.value)} 
                      />
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 block mb-1">Ngày kết thúc:</span>
                      <input 
                        type="date" 
                        className="border border-gray-300 dark:border-slate-700 p-2 rounded-lg w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 text-sm" 
                        value={sem2End} 
                        onChange={e => setSem2End(e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex gap-2.5 justify-end border-t border-gray-100 dark:border-slate-800">
                <button 
                  onClick={() => setIsProposing(false)} 
                  className="px-4 py-2 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl font-semibold text-sm transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleTeacherSubmitProposal} 
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl flex items-center gap-2 font-bold text-sm shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <Send className="h-4 w-4" /> Gửi Đề Xuất Đến Admin
                </button>
              </div>
            </div>
          )}

          {/* Main Official Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600 dark:text-slate-300">
                <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-slate-200 text-xs uppercase font-bold border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4">Tên năm học</th>
                    <th className="px-6 py-4">Tiến độ thời gian</th>
                    <th className="px-6 py-4">Năm học hiện hành</th>
                    <th className="px-6 py-4">Học kì 1</th>
                    <th className="px-6 py-4">Học kì 2</th>
                    <th className="px-6 py-4">Lớp học</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {academicYears.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-gray-400">
                        Chưa có năm học nào trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    academicYears.map(year => {
                      const timeStatus = getYearTimeStatus(year);
                      const linkedClasses = classes.filter(c => c.academicYearId === year.id);

                      return (
                        <tr key={year.id} className={`hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors ${year.isActive ? 'bg-amber-50/20 dark:bg-amber-950/20' : ''}`}>
                          {/* Name */}
                          <td className="px-6 py-4 font-bold text-gray-900 dark:text-slate-100">
                            <div className="flex items-center gap-2">
                              <span>{year.name}</span>
                              {year.isActive && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Hiện hành
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Smart Time Status */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${timeStatus.badgeClass}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${timeStatus.dotClass}`}></span>
                                {timeStatus.label}
                              </span>
                              {timeStatus.detail && (
                                <span className="text-[11px] text-gray-500 dark:text-slate-400 font-medium ml-1">
                                  ({timeStatus.detail})
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Active Status & Quick Toggle */}
                          <td className="px-6 py-4">
                            {year.isActive ? (
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Đang áp dụng
                              </div>
                            ) : isAdmin ? (
                              <button
                                onClick={() => handleToggleActive(year)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 dark:text-slate-300 bg-gray-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 transition-colors"
                                title="Đặt làm năm học hiện hành cho toàn trường"
                              >
                                <Star className="w-3.5 h-3.5 text-gray-400 hover:text-indigo-600" />
                                Đặt làm hiện hành
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">Không kích hoạt</span>
                            )}
                          </td>

                          {/* HK1 */}
                          <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200 text-xs">
                            {year.semesters?.[0]?.startDate ? (
                              <span>
                                {year.semesters[0].startDate} &rarr; {year.semesters[0].endDate}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Chưa đặt</span>
                            )}
                          </td>

                          {/* HK2 */}
                          <td className="px-6 py-4 font-medium text-gray-800 dark:text-slate-200 text-xs">
                            {year.semesters?.[1]?.startDate ? (
                              <span>
                                {year.semesters[1].startDate} &rarr; {year.semesters[1].endDate}
                              </span>
                            ) : (
                              <span className="text-gray-400 italic">Chưa đặt</span>
                            )}
                          </td>

                          {/* Linked Classes Count */}
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300">
                              {linkedClasses.length} lớp
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            {isAdmin ? (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEdit(year)}
                                  className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                  title="Chỉnh sửa thông tin năm học (Admin)"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(year)}
                                  disabled={linkedClasses.length > 0}
                                  className={`p-1.5 rounded-lg transition-colors ${
                                    linkedClasses.length > 0 
                                      ? 'text-gray-300 dark:text-slate-700 cursor-not-allowed' 
                                      : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                                  }`}
                                  title={
                                    linkedClasses.length > 0 
                                      ? `Không thể xóa vì có ${linkedClasses.length} lớp trực thuộc` 
                                      : 'Xóa năm học này'
                                  }
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => startTeacherUpdateProposal(year)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors"
                                title="Gửi đề xuất điều chỉnh thời gian HK1, HK2 về Admin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Đề xuất sửa HK</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PROPOSALS (ADMIN APPROVAL VIEW OR TEACHER HISTORY VIEW) */}
      {activeTab === 'PROPOSALS' && (
        <div className="space-y-6 animate-fade-in">
          {/* Reject Reason Modal for Admin */}
          {rejectingProposal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xl max-w-md w-full space-y-4 animate-scale-up">
                <div className="flex justify-between items-center border-b pb-2 dark:border-slate-800">
                  <h3 className="font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-rose-600" /> Từ chối đề xuất năm học
                  </h3>
                  <button onClick={() => setRejectingProposal(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-600 dark:text-slate-400">
                  Từ chối đề xuất năm học <strong>{rejectingProposal.name}</strong> từ giáo viên <strong>{rejectingProposal.proposerName}</strong>.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1">Lý do từ chối (tùy chọn):</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-xl p-2.5 text-xs bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    placeholder="VD: Đã có kế hoạch năm học mới ban hành bởi nhà trường..."
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t dark:border-slate-800">
                  <button onClick={() => setRejectingProposal(null)} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg">
                    Hủy
                  </button>
                  <button onClick={handleRejectProposal} className="px-4 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-sm">
                    Xác nhận từ chối
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Proposals List Header */}
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                {isAdmin ? <Inbox className="w-5 h-5 text-indigo-600" /> : <History className="w-5 h-5 text-indigo-600" />}
                {isAdmin ? 'Danh sách đề xuất từ Giáo viên' : 'Lịch sử đề xuất của bạn'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {isAdmin 
                  ? 'Xem xét phê duyệt hoặc từ chối các đề xuất năm học do giáo viên gửi lên.' 
                  : 'Theo dõi tiến trình phê duyệt của Ban Giám hiệu / Admin đối với các đề xuất của bạn.'
                }
              </p>
            </div>
            {!isAdmin && (
              <button
                onClick={startTeacherCreateProposal}
                className="bg-indigo-600 text-white px-3.5 py-2 rounded-xl flex items-center gap-1.5 text-xs font-semibold hover:bg-indigo-700 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" /> Gửi đề xuất mới
              </button>
            )}
          </div>

          {/* Proposals Content */}
          {isProposalsLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Đang tải danh sách đề xuất...
            </div>
          ) : (isAdmin ? proposals : myProposals).length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12 text-center text-gray-400 dark:text-slate-500 space-y-2">
              <Inbox className="w-10 h-10 mx-auto text-gray-300 dark:text-slate-600" />
              <p className="text-sm font-medium">
                {isAdmin ? 'Hiện chưa có đề xuất năm học nào từ giáo viên.' : 'Bạn chưa gửi đề xuất năm học nào.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(isAdmin ? proposals : myProposals).map(prop => (
                <div 
                  key={prop.id} 
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 shadow-sm transition-all ${
                    prop.status === 'PENDING'
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                      : prop.status === 'APPROVED'
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/10'
                      : 'border-gray-200 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-base text-gray-900 dark:text-slate-100">
                          {prop.name}
                        </span>

                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                          {prop.action === 'CREATE' ? 'Đề xuất thêm mới' : 'Đề xuất điều chỉnh'}
                        </span>

                        {/* Status Badge */}
                        {prop.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:text-amber-300">
                            <Clock className="w-3.5 h-3.5" /> Chờ Admin duyệt
                          </span>
                        )}
                        {prop.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt & Tạo chính thức
                          </span>
                        )}
                        {prop.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/50 dark:text-rose-300">
                            <XCircle className="w-3.5 h-3.5" /> Bị từ chối
                          </span>
                        )}
                      </div>

                      {/* Proposer Info */}
                      <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-3 flex-wrap">
                        <span>Người đề xuất: <strong>{prop.proposerName}</strong> {prop.proposerEmail && `(${prop.proposerEmail})`}</span>
                        <span>•</span>
                        <span>Thời gian: {new Date(prop.createdAt).toLocaleString('vi-VN')}</span>
                      </div>

                      {/* Semester Dates */}
                      <div className="flex gap-4 text-xs font-medium text-gray-700 dark:text-slate-300 pt-1">
                        <div>
                          <span className="text-gray-400 mr-1">HK1:</span>
                          <span className="font-semibold">{prop.semesters[0]?.startDate || '---'} đến {prop.semesters[0]?.endDate || '---'}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 mr-1">HK2:</span>
                          <span className="font-semibold">{prop.semesters[1]?.startDate || '---'} đến {prop.semesters[1]?.endDate || '---'}</span>
                        </div>
                      </div>

                      {/* Reason / Admin note */}
                      {prop.reason && (
                        <div className="text-xs text-gray-600 dark:text-slate-300 bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-gray-100 dark:border-slate-700">
                          <span className="font-semibold text-gray-700 dark:text-slate-200">Ghi chú của GV:</span> {prop.reason}
                        </div>
                      )}

                      {prop.adminNote && (
                        <div className="text-xs text-rose-800 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900">
                          <span className="font-semibold">Phản hồi từ Admin:</span> {prop.adminNote}
                        </div>
                      )}
                    </div>

                    {/* Admin Approval Actions */}
                    {isAdmin && prop.status === 'PENDING' && (
                      <div className="flex items-center gap-2 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-slate-800">
                        <button
                          onClick={() => setRejectingProposal(prop)}
                          className="px-3 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900 transition-colors flex items-center gap-1.5"
                          title="Từ chối đề xuất này"
                        >
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Từ chối</span>
                        </button>

                        <button
                          onClick={() => handleApproveProposal(prop)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1.5"
                          title="Phê duyệt và áp dụng năm học này vào hệ thống"
                        >
                          <CheckCircle2 className="w-4 h-4 text-white" />
                          <span>Duyệt & Tạo Năm Học</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};