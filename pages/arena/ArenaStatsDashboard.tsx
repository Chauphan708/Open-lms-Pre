import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../services/supabaseClient';
import { 
  Brain, Trophy, Target, Search, Users, ChevronRight, ChevronDown, 
  TrendingUp, BarChart3, Clock, AlertTriangle, CheckCircle, RefreshCw, X, ShieldAlert, Download 
} from 'lucide-react';
import MathText from '../../components/MathText';

interface StudentArenaData {
  id: string;
  elo_rating: number;
  total_xp: number;
  wins: number;
  losses: number;
  tower_floor: number;
  topic_mastery?: Record<string, number>;
  avatar_class: string;
  unlocked_badges?: string[];
  profiles?: {
    name: string;
    class_name: string;
    avatar?: string;
  } | null;
}

interface TowerAttempt {
  id: string;
  student_id: string;
  subject: string;
  topic: string;
  grade: string;
  xp_gained: number;
  elo_change: number;
  end_floor: number;
  is_victory: boolean;
  correct_answers: number;
  total_questions: number;
  created_at: string;
  student_name?: string;
  student_class?: string;
}

interface MatchHistory {
  id: string;
  player1_id: string;
  player2_id: string;
  status: string;
  winner_id: string;
  player1_score: number;
  player2_score: number;
  player1_hp: number;
  player2_hp: number;
  filter_subject?: string;
  filter_grade?: string;
  created_at: string;
  player1_name?: string;
  player2_name?: string;
}

const ARENA_BADGES = [
  { id: 'math_genius', name: 'Thiên Tài Trí Tuệ', desc: 'Đúng 10 câu liên tiếp', emoji: '🌟' },
  { id: 'tower_master', name: 'Bậc Thầy Chinh Phục', desc: 'Làm chủ 100% chuyên đề đầu tiên', emoji: '🏆' },
  
  // Nhóm Elo
  { id: 'elo_10', name: 'Tập Sự Khởi Đầu', desc: 'Đạt thứ hạng Elo >= 10', emoji: '🥉' },
  { id: 'elo_20', name: 'Cao Thủ Thực Thụ', desc: 'Đạt thứ hạng Elo >= 20', emoji: '🥈' },
  { id: 'elo_30', name: 'Chiến Binh Ưu Tú', desc: 'Đạt thứ hạng Elo >= 30', emoji: '🥇' },
  { id: 'elo_50', name: 'Nhà Thông Thái Vô Song', desc: 'Đạt thứ hạng Elo >= 50', emoji: '👑' },
  { id: 'elo_80', name: 'Kỷ Lục Gia Đấu Trường', desc: 'Đạt thứ hạng Elo >= 80', emoji: '💎' },
  { id: 'elo_100', name: 'Thần Thoại Đấu Trí', desc: 'Đạt thứ hạng Elo >= 100', emoji: '✨' },
  { id: 'elo_150', name: 'Đại Sư Đấu Trường', desc: 'Đạt thứ hạng Elo >= 150', emoji: '🔮' },
  { id: 'elo_200', name: 'Huyền Thoại Bất Bại', desc: 'Đạt thứ hạng Elo >= 200', emoji: '🌀' },
  { id: 'elo_300', name: 'Chúa Tể Đấu Trường', desc: 'Đạt thứ hạng Elo >= 300', emoji: '🌌' },
  { id: 'elo_500', name: 'Đấng Sáng Tạo Trí Tuệ', desc: 'Đạt thứ hạng Elo >= 500', emoji: '🕉' },

  // Nhóm XP
  { id: 'xp_1000', name: 'Tích Tiểu Thành Đại', desc: 'Đạt từ 1,000 XP trở lên', emoji: '🌱' },
  { id: 'xp_accumulator', name: 'Học Giả Uyên Bác', desc: 'Đạt từ 5,000 XP trở lên', emoji: '⚡' },
  { id: 'xp_10000', name: 'Đại Học Giả', desc: 'Đạt từ 10,000 XP trở lên', emoji: '☄️' },
  { id: 'xp_30000', name: 'Đỉnh Cao Tri Thức', desc: 'Đạt từ 30,000 XP trở lên', emoji: '🌌' },
  { id: 'xp_50000', name: 'Kho Tàng Tri Thức', desc: 'Đạt từ 50,000 XP trở lên', emoji: '🌠' },
  { id: 'xp_100000', name: 'Vũ Trụ Trí Tuệ', desc: 'Đạt từ 100,000 XP trở lên', emoji: '🪐' },

  // Nhóm Tháp & PvP
  { id: 'tower_floor_5', name: 'Bản Lĩnh Leo Tháp', desc: 'Chinh phục Tầng 5 tháp leo cấp', emoji: '🧗' },
  { id: 'tower_floor_10', name: 'Chinh Phục Đỉnh Cao', desc: 'Chinh phục Tầng 10 tháp leo cấp', emoji: '🏰' },
  { id: 'pvp_rookie', name: 'Tân Binh Đấu Trường', desc: 'Tham gia 1 trận PvP 1v1', emoji: '🛡️' },
  { id: 'pvp_conqueror', name: 'Chiến Thần Võ Đài', desc: 'Thắng 5 trận PvP 1v1', emoji: '⚔️' },
  { id: 'pvp_master', name: 'Độc Cô Cầu Bại', desc: 'Thắng 15 trận PvP 1v1', emoji: '🥇' },
  { id: 'perfect_win', name: 'Chiến Thắng Tuyệt Đối', desc: 'Thắng 1 trận PvP với 100% HP', emoji: '💯' },

  // Nhóm Chuyên đề & Khám phá & Cửa hàng
  { id: 'multi_topic_3', name: 'Tam Bảo Tri Thức', desc: 'Làm chủ 100% ít nhất 3 chuyên đề', emoji: '🍀' },
  { id: 'multi_topic_5', name: 'Học Giả Đa Năng', desc: 'Làm chủ 100% ít nhất 5 chuyên đề', emoji: '📚' },
  { id: 'multi_topic_10', name: 'Học Giả Vượt Trội', desc: 'Làm chủ 100% ít nhất 10 chuyên đề', emoji: '📕' },
  { id: 'multi_topic_20', name: 'Học Giả Siêu Cấp', desc: 'Làm chủ 100% ít nhất 20 chuyên đề', emoji: '📘' },
  { id: 'multi_topic_50', name: 'Huyền Thoại Trí Thức', desc: 'Làm chủ 100% ít nhất 50 chuyên đề', emoji: '📜' },
  { id: 'topic_explorer_15', name: 'Nhà Thám Hiểm Chủ Đề', desc: 'Leo tháp ở ít nhất 15 chuyên đề', emoji: '🗺️' },
  { id: 'topic_explorer_30', name: 'Nhà Thám Hiểm Vĩ Đại', desc: 'Leo tháp ở ít nhất 30 chuyên đề', emoji: '🧭' },
  { id: 'shop_collector', name: 'Nhà Sưu Tầm Trang Bị', desc: 'Sở hữu ít nhất 3 vật phẩm trong túi đồ', emoji: '🎒' }
];

export const ArenaStatsDashboard: React.FC = () => {
  const [students, setStudents] = useState<StudentArenaData[]>([]);
  const [towerAttempts, setTowerAttempts] = useState<TowerAttempt[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Revenge Assignment States
  const [showHallOfFameModal, setShowHallOfFameModal] = useState(false);
  const [revengeModalTopic, setRevengeModalTopic] = useState<any | null>(null);
  const [revengeAssignedSuccess, setRevengeAssignedSuccess] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [studentDetailTab, setStudentDetailTab] = useState<Record<string, 'năng_lực' | 'lịch_sử' | 'huy_hiệu' | 'trang_bị'>>({});
  const [logFilter, setLogFilter] = useState<'all' | 'tower' | 'pvp' | 'tournament'>('all');
  const [selectedExportIds, setSelectedExportIds] = useState<Set<string>>(new Set());
  
  // Expanded Student Inventory
  const [expandedStudentInventory, setExpandedStudentInventory] = useState<any[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Fetch expanded student inventory from Database
  const fetchStudentInventory = async (studentId: string) => {
    setLoadingInventory(true);
    try {
      const { data, error } = await supabase
        .from('arena_inventory')
        .select(`
          *,
          arena_shop_items:item_id (*)
        `)
        .eq('student_id', studentId);
      if (!error && data) {
        setExpandedStudentInventory(data);
      }
    } catch (err) {
      console.error("Error loading student inventory:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    if (expandedStudentId) {
      fetchStudentInventory(expandedStudentId);
    } else {
      setExpandedStudentInventory([]);
    }
  }, [expandedStudentId]);

  // Load stats
  const loadData = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch arena profiles with user profile metadata
      const { data: profileData, error: profileErr } = await supabase
        .from('arena_profiles')
        .select(`
          *,
          profiles:id (
            name,
            class_name,
            avatar
          )
        `);
      
      if (profileErr) throw profileErr;
      setStudents((profileData as any[]) || []);

      // 2. Fetch tower attempts
      const { data: towerData, error: towerErr } = await supabase
        .from('arena_tower_attempts')
        .select('*')
        .order('created_at', { ascending: false });

      if (!towerErr && towerData) {
        setTowerAttempts(towerData as TowerAttempt[]);
      }

      // 3. Fetch PvP matches
      const { data: matchData, error: matchErr } = await supabase
        .from('arena_matches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!matchErr && matchData) {
        setMatchHistory(matchData as MatchHistory[]);
      }

    } catch (err) {
      console.error("Lỗi khi tải dữ liệu thống kê Arena:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates for tower attempts
    const towerChannel = supabase
      .channel('arena_tower_attempts_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'arena_tower_attempts' },
        (payload) => {
          console.log("Realtime INSERT on arena_tower_attempts:", payload.new);
          setTowerAttempts(prev => {
            // Avoid duplicate additions
            if (prev.some(t => t.id === payload.new.id)) return prev;
            return [payload.new as TowerAttempt, ...prev];
          });
        }
      )
      .subscribe();

    // Subscribe to realtime updates for matches
    const matchChannel = supabase
      .channel('arena_matches_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'arena_matches' },
        (payload) => {
          console.log("Realtime change on arena_matches:", payload);
          if (payload.eventType === 'INSERT') {
            setMatchHistory(prev => {
              if (prev.some(m => m.id === payload.new.id)) return prev;
              return [payload.new as MatchHistory, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMatchHistory(prev => prev.map(m => m.id === payload.new.id ? (payload.new as MatchHistory) : m));
          } else if (payload.eventType === 'DELETE') {
            setMatchHistory(prev => prev.filter(m => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(towerChannel);
      supabase.removeChannel(matchChannel);
    };
  }, []);

  // Filter list of classes & grades from students list
  const classesList = useMemo(() => {
    const list = students.map(s => s.profiles?.class_name?.trim() || '').filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [students]);

  const gradesList = useMemo(() => {
    const list = students.map(s => {
      const cls = s.profiles?.class_name || '';
      const match = cls.match(/^(\d+)/);
      return match ? match[1] : '';
    }).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [students]);

  // Enrich Tower Attempts & Matches with student names
  const enrichedAttempts = useMemo(() => {
    return towerAttempts.map(attempt => {
      const stud = students.find(s => s.id === attempt.student_id);
      return {
        ...attempt,
        student_name: stud?.profiles?.name || 'Học sinh ẩn danh',
        student_class: stud?.profiles?.class_name || 'Khác'
      };
    });
  }, [towerAttempts, students]);

  const enrichedMatches = useMemo(() => {
    return matchHistory.map(match => {
      const p1 = students.find(s => s.id === match.player1_id);
      const p2 = students.find(s => s.id === match.player2_id);
      return {
        ...match,
        player1_name: p1?.profiles?.name || 'Học sinh 1',
        player2_name: p2?.profiles?.name || 'Học sinh 2'
      };
    });
  }, [matchHistory, students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const name = (s.profiles?.name || '').toLowerCase();
      const cls = (s.profiles?.class_name || '').toLowerCase();
      
      const matchesSearch = name.includes(searchQuery.toLowerCase()) || cls.includes(searchQuery.toLowerCase());
      
      let matchesGrade = true;
      if (selectedGrade) {
        matchesGrade = cls.startsWith(selectedGrade.toLowerCase());
      }
      
      let matchesClass = true;
      if (selectedClass) {
        matchesClass = cls === selectedClass.toLowerCase();
      }

      return matchesSearch && matchesGrade && matchesClass;
    }).sort((a, b) => b.elo_rating - a.elo_rating);
  }, [students, searchQuery, selectedGrade, selectedClass]);

  // KPI Calculations
  const statsSummary = useMemo(() => {
    const totalStudents = students.length;
    if (totalStudents === 0) {
      return { avgElo: 1000, totalPvP: 0, totalTower: 0, winRate: 0, activeStudentsCount: 0 };
    }

    const totalElo = students.reduce((sum, s) => sum + s.elo_rating, 0);
    const avgElo = Math.round(totalElo / totalStudents);

    // Filter PvP matches and tower runs in the current data
    const totalPvP = matchHistory.filter(m => m.status === 'finished').length;
    const totalTower = towerAttempts.length;

    // Active students: logged in and did at least 1 run or pvp
    const activeIds = new Set([
      ...towerAttempts.map(t => t.student_id),
      ...matchHistory.map(m => m.player1_id),
      ...matchHistory.map(m => m.player2_id)
    ]);
    const activeStudentsCount = students.filter(s => activeIds.has(s.id)).length;

    // PvP Win rate
    const wins = students.reduce((sum, s) => sum + s.wins, 0);
    const losses = students.reduce((sum, s) => sum + s.losses, 0);
    const totalWinsLosses = wins + losses;
    const winRate = totalWinsLosses > 0 ? Math.round((wins / totalWinsLosses) * 100) : 0;

    // Count students with at least one 100% mastered topic
    const masteredCount = students.filter(s => s.topic_mastery && Object.values(s.topic_mastery).some(v => v >= 100)).length;
    
    // Gifted students: Tower floor >= 3 or Elo >= 1200
    const giftedStudentsCount = students.filter(s => s.tower_floor >= 3 || s.elo_rating >= 1200).length;

    return { avgElo, totalPvP, totalTower, winRate, activeStudentsCount, masteredCount, giftedStudentsCount };
  }, [students, towerAttempts, matchHistory]);

  // Radar chart data for 6 subjects
  const subjectRadarData = useMemo(() => {
    const subjects = [
      { key: 'math', label: 'Toán' },
      { key: 'vietnamese', label: 'Tiếng Việt' },
      { key: 'english', label: 'Tiếng Anh' },
      { key: 'science', label: 'Khoa học' },
      { key: 'technology', label: 'Công nghệ' },
      { key: 'history_geography', label: 'Sử - Địa' }
    ];

    return subjects.map(s => {
      const matchingAttempts = towerAttempts.filter(t => t.subject === s.key);
      let avgAcc = 75; // default fallback percentage
      if (matchingAttempts.length > 0) {
        const totalCorrect = matchingAttempts.reduce((acc, curr) => acc + curr.correct_answers, 0);
        const totalQ = matchingAttempts.reduce((acc, curr) => acc + curr.total_questions, 0);
        avgAcc = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 75;
      }
      return { label: s.label, val: avgAcc };
    });
  }, [towerAttempts]);

  // Topic-wise analytics (Mastery & Failure rates)
  const topicStats = useMemo(() => {
    const map: Record<string, { topic: string; subject: string; totalAttempts: number; failures: number; totalQuestions: number; correctQuestions: number; sumMastery: number; countMastery: number; masteredCount: number }> = {};

    // 1. Process Tower Attempts for failure rates
    towerAttempts.forEach(t => {
      const key = `${t.subject}-${t.topic}`;
      if (!map[key]) {
        map[key] = {
          topic: t.topic,
          subject: t.subject,
          totalAttempts: 0,
          failures: 0,
          totalQuestions: 0,
          correctQuestions: 0,
          sumMastery: 0,
          countMastery: 0,
          masteredCount: 0
        };
      }
      map[key].totalAttempts += 1;
      if (!t.is_victory) {
        map[key].failures += 1;
      }
      map[key].totalQuestions += t.total_questions;
      map[key].correctQuestions += t.correct_answers;
    });

    // 2. Process student's current mastery levels
    students.forEach(s => {
      if (s.topic_mastery) {
        Object.entries(s.topic_mastery).forEach(([topic, mastery]) => {
          let subject = 'math';
          if (topic.includes('Luyện từ') || topic.includes('Chính tả') || topic.includes('văn')) subject = 'vietnamese';
          else if (topic.includes('Môi trường') || topic.includes('Sinh sản') || topic.includes('Năng lượng') || topic.includes('Không khí')) subject = 'science';
          else if (topic.includes('Internet') || topic.includes('Phần mềm') || topic.includes('Cứng') || topic.includes('An toàn')) subject = 'technology';
          else if (topic.includes('Vocabulary') || topic.includes('Grammar')) subject = 'english';
          else if (topic.includes('Địa lí') || topic.includes('Lịch sử')) subject = 'history_geography';

          const key = `${subject}-${topic}`;
          if (!map[key]) {
            map[key] = {
              topic,
              subject,
              totalAttempts: 0,
              failures: 0,
              totalQuestions: 0,
              correctQuestions: 0,
              sumMastery: 0,
              countMastery: 0,
              masteredCount: 0
            };
          }
          map[key].sumMastery += mastery;
          map[key].countMastery += 1;
          if (mastery >= 100) {
            map[key].masteredCount += 1;
          }
        });
      }
    });

    return Object.values(map).map(item => {
      const errorRate = item.totalQuestions > 0 ? Math.round(((item.totalQuestions - item.correctQuestions) / item.totalQuestions) * 100) : (item.totalAttempts > 0 ? Math.round((item.failures / item.totalAttempts) * 100) : 0);
      const avgMastery = item.countMastery > 0 ? Math.round(item.sumMastery / item.countMastery) : 0;
      return {
        ...item,
        errorRate,
        avgMastery
      };
    }).sort((a, b) => b.errorRate - a.errorRate); // Sort by highest error rate first (weakest topics)
  }, [towerAttempts, students]);

  // Expand helper
  const toggleStudentExpand = (id: string) => {
    setExpandedStudentId(expandedStudentId === id ? null : id);
  };

  // Export tower data as CSV
  const exportTowerCSV = (studentIds: string[]) => {
    const rows: string[][] = [];
    const headers = ['Họ tên', 'Lớp', 'Ngày giờ', 'Chủ đề', 'Môn học', 'Khối', 'Tầng đạt được', 'Số đúng', 'Tổng câu hỏi', 'Tỉ lệ đúng (%)', 'Kết quả', 'XP nhận', 'ELO thay đổi'];

    studentIds.forEach(sid => {
      const stud = students.find(s => s.id === sid);
      const name = stud?.profiles?.name || 'Học sinh ẩn danh';
      const cls = stud?.profiles?.class_name || 'Chưa xếp lớp';
      const attempts = enrichedAttempts.filter(a => a.student_id === sid);

      if (attempts.length === 0) {
        rows.push([
          `"${name}"`, `"${cls}"`, '', '', '', '', '', '', '', '', 'Chưa có dữ liệu leo tháp', '', ''
        ]);
      } else {
        attempts.forEach(a => {
          const accuracy = a.total_questions > 0 ? Math.round((a.correct_answers / a.total_questions) * 100) : 0;
          rows.push([
            `"${name}"`,
            `"${cls}"`,
            `"${new Date(a.created_at).toLocaleString('vi-VN')}"`,
            `"${(a.topic || 'general').replace(/"/g, '""')}"`,
            `"${a.subject || ''}"`,
            `"${a.grade || ''}"`,
            String(a.end_floor),
            String(a.correct_answers),
            String(a.total_questions),
            String(accuracy),
            a.is_victory ? 'Chiến thắng' : 'Thất bại',
            String(a.xp_gained),
            String(a.elo_change >= 0 ? `+${a.elo_change}` : a.elo_change)
          ]);
        });
      }
    });

    const csvContent = '\ufeff' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateStr = new Date().toLocaleDateString('vi-VN').replace(/\//g, '-');
    const label = studentIds.length === 1 
      ? (students.find(s => s.id === studentIds[0])?.profiles?.name || 'hoc_sinh').replace(/\s+/g, '_')
      : `${studentIds.length}_hoc_sinh`;
    link.download = `leo_thap_${label}_${dateStr}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  const toggleExportSelect = (id: string) => {
    setSelectedExportIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllExport = () => {
    if (selectedExportIds.size === filteredStudents.length) {
      setSelectedExportIds(new Set());
    } else {
      setSelectedExportIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Đang tổng hợp dữ liệu đấu trí...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Top Header Overview */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Brain className="h-7 w-7 text-indigo-400 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-black tracking-tight">Dashboard Thống Kê & Chẩn Đoán Arena</h2>
          </div>
          <p className="text-xs text-indigo-200 mt-1">Phân tích năng lực chuyên đề thích ứng, theo dõi lượt bài tập đúng/sai và xuất báo cáo phụ huynh.</p>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button 
            onClick={() => setShowHallOfFameModal(true)}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Trophy className="h-4 w-4" /> Bảng Vinh Danh (Hall of Fame)
          </button>
          
          <button 
            onClick={loadData}
            disabled={refreshing}
            className="px-4 py-2.5 bg-indigo-800/80 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors border border-indigo-700/50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      {/* Primary KPI Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Học sinh đã tham gia</div>
          <div className="text-2xl md:text-3xl font-black text-indigo-600 dark:text-indigo-400">
            {statsSummary.activeStudentsCount} <span className="text-xs font-normal text-gray-400">/ {students.length}</span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">ELO Trung bình</div>
          <div className="text-2xl md:text-3xl font-black text-amber-500">{statsSummary.avgElo}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Đạt 100% Mastery</div>
          <div className="text-2xl md:text-3xl font-black text-emerald-500">{statsSummary.masteredCount} <span className="text-xs font-normal text-gray-400">HS</span></div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Lượt Leo Tháp</div>
          <div className="text-2xl md:text-3xl font-black text-cyan-600 dark:text-cyan-400">{statsSummary.totalTower}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Trận PvP (1v1)</div>
          <div className="text-2xl md:text-3xl font-black text-purple-600 dark:text-purple-400">{statsSummary.totalPvP}</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 p-4 shadow-sm text-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">HS Năng khiếu (Tầng 3-4)</div>
          <div className="text-2xl md:text-3xl font-black text-rose-500">{statsSummary.giftedStudentsCount} <span className="text-xs font-normal text-gray-400">HS</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WEAKEST TOPICS DIAGNOSTICS */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col space-y-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Chẩn đoán kiến thức yếu
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Danh sách các chuyên đề học sinh trả lời sai nhiều nhất (cần ôn tập thêm).</p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar">
            {topicStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-gray-400 text-sm italic">
                Chưa ghi nhận lượt chơi nào để chẩn đoán.
              </div>
            ) : (
              topicStats.slice(0, 5).map((t, idx) => {
                const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-amber-400', 'bg-indigo-400'];
                return (
                  <div key={idx} className="p-3 bg-gray-50/50 hover:bg-gray-50 border rounded-2xl transition-all">
                    <div className="flex justify-between items-start gap-2 mb-1.5">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {t.subject === 'math' ? 'Toán' : t.subject === 'science' ? 'Khoa học' : t.subject === 'technology' ? 'Công nghệ' : t.subject === 'vietnamese' ? 'Tiếng Việt' : t.subject === 'english' ? 'Tiếng Anh' : 'Lịch sử & Địa lí'}
                        </div>
                        <div className="text-sm font-bold text-gray-900 truncate" title={t.topic}>{t.topic}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100">
                          {t.errorRate}% Lỗi
                        </span>
                      </div>
                    </div>
                    {/* Error rate progress bar */}
                    <div className="w-full bg-gray-200/80 rounded-full h-2">
                      <div className={`h-2 rounded-full ${colors[idx % colors.length]}`} style={{ width: `${t.errorRate}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1.5 font-medium">
                      <span>Lượt chơi: {t.totalAttempts}</span>
                      <span>Độ am hiểu TB: {t.avgMastery}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RECENT ACTIVITY LOG */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                <Clock className="h-5 w-5 text-indigo-500" /> Nhật ký Đấu trường gần đây
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Các hoạt động PvP và Leo tháp thời gian thực của học sinh.</p>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setLogFilter('all')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${logFilter === 'all' ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>Tất cả</button>
              <button onClick={() => setLogFilter('tower')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${logFilter === 'tower' ? 'bg-white shadow text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}>Leo tháp</button>
              <button onClick={() => setLogFilter('pvp')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${logFilter === 'pvp' ? 'bg-white shadow text-rose-600' : 'text-gray-500 hover:text-gray-700'}`}>1v1 (PvP)</button>
              <button onClick={() => setLogFilter('tournament')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${logFilter === 'tournament' ? 'bg-white shadow text-amber-600' : 'text-gray-500 hover:text-gray-700'}`}>Giải đấu GV</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[360px] pr-1 custom-scrollbar space-y-3">
            {enrichedAttempts.length === 0 && enrichedMatches.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-gray-400 text-sm italic">
                Chưa có hoạt động nào trong sảnh đấu gần đây.
              </div>
            ) : (
              // Merge PvP and Tower Mode and sort by date
              [
                ...enrichedAttempts.map(a => ({
                  type: 'tower' as const,
                  date: new Date(a.created_at),
                  data: a
                })),
                ...enrichedMatches.filter(m => m.status === 'finished').map(m => ({
                  type: 'pvp' as const,
                  date: new Date(m.created_at),
                  data: m
                }))
              ]
              .filter(activity => {
                if (logFilter === 'all') return true;
                if (logFilter === 'tower') return activity.type === 'tower';
                if (logFilter === 'pvp') return activity.type === 'pvp' && !(activity.data as any).source?.startsWith('tournament');
                if (logFilter === 'tournament') return activity.type === 'pvp' && (activity.data as any).source?.startsWith('tournament');
                return true;
              })
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .map((activity, index) => {
                if (activity.type === 'tower') {
                  const t = activity.data as typeof enrichedAttempts[0];
                  return (
                    <div key={`t-${t.id}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50/40 border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 rounded-2xl transition-all">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${t.is_victory ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50/80 text-rose-500'}`}>
                        <Trophy className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900">
                          {t.student_name} <span className="text-xs font-normal text-gray-500">lớp {t.student_class}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          Môn: <span className="text-indigo-600 font-semibold">{t.subject === 'math' ? 'Toán' : t.subject === 'science' ? 'Khoa học' : t.subject === 'technology' ? 'Công nghệ' : t.subject === 'vietnamese' ? 'Tiếng Việt' : t.subject === 'english' ? 'Tiếng Anh' : t.subject === 'history_geography' ? 'Lịch sử & Địa lí' : t.subject}</span> • Chủ đề: <span className="text-indigo-600 font-semibold">{t.topic}</span> (Khối {t.grade})
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.is_victory ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {t.is_victory ? '🏆 Chiến Thắng' : `❌ Thất bại (Tầng ${t.end_floor})`}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            Đúng {t.correct_answers}/{t.total_questions} câu • ELO: {t.elo_change >= 0 ? `+${t.elo_change}` : t.elo_change}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap self-start mt-0.5">
                        {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                } else {
                  const m = activity.data as typeof enrichedMatches[0];
                  const p1Win = m.winner_id === m.player1_id;
                  return (
                    <div key={`m-${m.id}-${index}`} className="flex items-center gap-3 p-3 bg-gray-50/40 border border-gray-100 hover:border-purple-100 hover:bg-purple-50/10 rounded-2xl transition-all">
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-xl flex-shrink-0">
                        <Brain className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-gray-900">
                          {m.player1_name} vs {m.player2_name}
                        </div>
                        <div className="text-xs text-gray-500 font-medium mt-0.5">
                          Trận Đấu Trí 1v1 • Môn: {m.filter_subject === 'math' ? 'Toán' : m.filter_subject === 'science' ? 'Khoa học' : 'Đấu Trí'} (Lớp {m.filter_grade})
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[10px] bg-purple-100 text-purple-700 font-black px-2 py-0.5 rounded-full">
                            ⚔️ PvP Kết thúc
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            Thắng: <strong className="text-purple-600">{p1Win ? m.player1_name : m.player2_name}</strong> ({p1Win ? m.player1_score : m.player2_score} - {p1Win ? m.player2_score : m.player1_score} điểm)
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-400 font-bold whitespace-nowrap self-start mt-0.5">
                        {activity.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>

      </div>

      {/* STUDENT TABLE AREA */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
              <Users className="h-5 w-5 text-indigo-500" /> Bảng năng lực Học sinh
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Danh sách toàn bộ học sinh lớp học trong hệ thống Arena.</p>
          </div>

          {/* Table Toolbar */}
          <div className="flex gap-2 flex-wrap items-center w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Tìm học sinh, lớp học..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full md:w-60 pl-9 pr-8 py-2 border rounded-xl text-xs outline-none focus:border-indigo-500 bg-gray-50/50 hover:bg-gray-50/80 transition-all font-semibold"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Grade Filter */}
            <select
              value={selectedGrade}
              onChange={e => { setSelectedGrade(e.target.value); setSelectedClass(''); }}
              className="px-3 py-2 border rounded-xl text-xs outline-none font-semibold bg-white"
            >
              <option value="">-- Tất cả khối --</option>
              {gradesList.map(g => (
                <option key={g} value={g}>Khối {g}</option>
              ))}
            </select>

            {/* Class Filter */}
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="px-3 py-2 border rounded-xl text-xs outline-none font-semibold bg-white"
            >
              <option value="">-- Tất cả lớp --</option>
              {classesList.map(c => (
                <option key={c} value={c}>Lớp {c}</option>
              ))}
            </select>

            {/* Export Tower Data Button */}
            <button
              onClick={() => {
                const ids = selectedExportIds.size > 0 ? Array.from(selectedExportIds) : filteredStudents.map(s => s.id);
                if (ids.length === 0) return;
                exportTowerCSV(ids);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all"
              title={selectedExportIds.size > 0 ? `Xuất dữ liệu leo tháp của ${selectedExportIds.size} HS đã chọn` : 'Xuất dữ liệu leo tháp tất cả HS đang hiển thị'}
            >
              <Download className="h-3.5 w-3.5" />
              {selectedExportIds.size > 0 ? `Xuất leo tháp (${selectedExportIds.size} HS)` : 'Xuất leo tháp'}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-gray-400 uppercase font-black tracking-wider">
                <th className="p-4 w-10">
                  <input 
                    type="checkbox" 
                    checked={filteredStudents.length > 0 && selectedExportIds.size === filteredStudents.length}
                    onChange={toggleSelectAllExport}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Chọn tất cả để xuất dữ liệu"
                  />
                </th>
                <th className="p-4 w-8"></th>
                <th className="p-4">Học Sinh</th>
                <th className="p-4 text-center">Khối Lớp</th>
                <th className="p-4 text-center">Điểm ELO</th>
                <th className="p-4 text-center">Tầng Tháp</th>
                <th className="p-4 text-center">PvP (Thắng/Thua)</th>
                <th className="p-4 text-center">Tổng XP Arena</th>
                <th className="p-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400 font-medium italic">
                    Không tìm thấy học sinh nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => {
                  const isExpanded = expandedStudentId === s.id;
                  const winPvP = s.wins;
                  const lossPvP = s.losses;
                  const totalPvP = winPvP + lossPvP;
                  const pvpWinRate = totalPvP > 0 ? Math.round((winPvP / totalPvP) * 100) : 0;

                  // ELO Badge Level
                  let eloLevel = 'Đồng';
                  let eloColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  if (s.elo_rating >= 2200) {
                    eloLevel = 'Thách Đấu';
                    eloColor = 'bg-red-500 text-white border-red-600 animate-pulse';
                  } else if (s.elo_rating >= 1800) {
                    eloLevel = 'Cao Thủ';
                    eloColor = 'bg-purple-100 text-purple-800 border-purple-200';
                  } else if (s.elo_rating >= 1500) {
                    eloLevel = 'Kim Cương';
                    eloColor = 'bg-cyan-50 text-cyan-700 border-cyan-100';
                  } else if (s.elo_rating >= 1200) {
                    eloLevel = 'Bạch Kim';
                    eloColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  } else if (s.elo_rating >= 1000) {
                    eloLevel = 'Vàng';
                    eloColor = 'bg-yellow-50 text-yellow-800 border-yellow-100';
                  }

                  return (
                    <React.Fragment key={s.id}>
                      {/* Standard Table Row */}
                      <tr 
                        onClick={() => toggleStudentExpand(s.id)}
                        className={`border-b border-gray-100/80 hover:bg-indigo-50/20 cursor-pointer transition-all ${isExpanded ? 'bg-indigo-50/30' : ''}`}
                      >
                        <td className="p-4 text-center" onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={selectedExportIds.has(s.id)}
                            onChange={() => toggleExportSelect(s.id)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 text-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4.5 w-4.5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4.5 w-4.5 text-gray-500" />
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                              {s.profiles?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{s.profiles?.name || 'Học sinh'}</div>
                              <div className="text-[10px] text-gray-400 font-semibold">{s.profiles?.class_name || 'Chưa xếp lớp'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center font-bold text-gray-700">
                          {s.profiles?.class_name?.match(/^(\d+)/)?.[1] || '5'}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-black text-gray-900">{s.elo_rating}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black border ${eloColor}`}>
                              {eloLevel}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="font-black text-emerald-600">Tầng {s.tower_floor}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-semibold text-gray-700">{winPvP}W - {lossPvP}L</span>
                            {totalPvP > 0 && (
                              <span className="text-[9px] text-gray-400 font-medium">WR: {pvpWinRate}%</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center font-black text-indigo-600">
                          {s.total_xp.toLocaleString()}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); exportTowerCSV([s.id]); }}
                              className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 font-bold rounded-lg transition-colors border border-emerald-200/50 text-[10px] flex items-center gap-1"
                              title="Xuất dữ liệu leo tháp của học sinh này"
                            >
                              <Download className="h-3 w-3" /> Xuất
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleStudentExpand(s.id); }}
                              className="px-3 py-1.5 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 font-bold rounded-lg transition-colors border border-gray-200/50 text-[10px]"
                            >
                              {isExpanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details Row */}
                      {isExpanded && (() => {
                        const activeTab = studentDetailTab[s.id] || 'năng_lực';
                        const setActiveTab = (tab: 'năng_lực' | 'lịch_sử' | 'huy_hiệu' | 'trang_bị') => 
                          setStudentDetailTab(prev => ({ ...prev, [s.id]: tab }));

                        // Class skill details based on role
                        const getSkillDetails = (cls: string) => {
                          switch (cls) {
                            case 'scholar': return { name: '📖 Sách Loại Trừ 50/50', desc: 'Loại bỏ 2 phương án sai khi trả lời trắc nghiệm.', status: 'Đặc quyền Scholar' };
                            case 'scientist': return { name: '⏱️ Kính Nhìn Tương Lai (+15s)', desc: 'Cộng thêm 15 giây vào đồng hồ đếm ngược.', status: 'Đặc quyền Scientist' };
                            case 'artist': return { name: '🛡️ Khiên Nghệ Thuật', desc: 'Chống đỡ sát thương, bảo vệ 1 mạng khi trả lời sai.', status: 'Đặc quyền Artist' };
                            case 'explorer': return { name: '🧪 Bình HP Hồi Sinh (+1 mạng)', desc: 'Cộng thêm 1 mạng sinh mệnh khi leo tháp.', status: 'Đặc quyền Explorer' };
                            default: return { name: '📖 Kính Nhìn Thấu', desc: 'Mở khóa đặc quyền.', status: 'Đã mua' };
                          }
                        };
                        const skill = getSkillDetails(s.avatar_class);

                        return (
                          <tr className="bg-gray-50/40 border-b border-gray-100 animate-in slide-in-from-top duration-300">
                            <td colSpan={9} className="p-5">
                              {/* Sub-tab selection */}
                              <div className="flex gap-4 border-b border-gray-200/60 pb-2.5 mb-4 text-[10px] sm:text-xs font-bold">
                                <button 
                                  onClick={() => setActiveTab('năng_lực')}
                                  className={`pb-1.5 px-1 relative transition-colors ${activeTab === 'năng_lực' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  {activeTab === 'năng_lực' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                  🎯 Năng Lực & Gợi Ý AI
                                </button>
                                <button 
                                  onClick={() => setActiveTab('lịch_sử')}
                                  className={`pb-1.5 px-1 relative transition-colors ${activeTab === 'lịch_sử' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  {activeTab === 'lịch_sử' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                  🏆 Lịch Sử Đấu Trường
                                </button>
                                <button 
                                  onClick={() => setActiveTab('huy_hiệu')}
                                  className={`pb-1.5 px-1 relative transition-colors ${activeTab === 'huy_hiệu' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  {activeTab === 'huy_hiệu' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                  🏅 Huy Hiệu ({s.unlocked_badges?.length || 0})
                                </button>
                                <button 
                                  onClick={() => setActiveTab('trang_bị')}
                                  className={`pb-1.5 px-1 relative transition-colors ${activeTab === 'trang_bị' ? 'text-indigo-600 font-extrabold' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  {activeTab === 'trang_bị' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-full" />}
                                  🎒 Trang Bị & Vật Phẩm ({expandedStudentId === s.id ? (expandedStudentInventory?.length || 0) + 1 : 1})
                                </button>
                              </div>

                              {/* Tab Content 1: Topic Mastery & AI Advice */}
                              {activeTab === 'năng_lực' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {/* Left: Mastery per topic */}
                                  <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                      🎯 Độ am hiểu chuyên đề leo tháp
                                    </h4>
                                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                      {!s.topic_mastery || Object.keys(s.topic_mastery).length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-[10px] italic">
                                          Học sinh chưa hoàn thành chuyên đề nào.
                                        </div>
                                      ) : (
                                        Object.entries(s.topic_mastery).map(([topic, mastery]) => {
                                          let masteryColor = 'bg-rose-500';
                                          let masteryText = 'Mới bắt đầu';
                                          if (mastery >= 90) {
                                            masteryColor = 'bg-emerald-500';
                                            masteryText = 'Làm chủ (Master)';
                                          } else if (mastery >= 60) {
                                            masteryColor = 'bg-indigo-500';
                                            masteryText = 'Khá tốt';
                                          } else if (mastery >= 30) {
                                            masteryColor = 'bg-amber-500';
                                            masteryText = 'Cần luyện tập thêm';
                                          }

                                          return (
                                            <div key={topic} className="space-y-1">
                                              <div className="flex justify-between text-[11px] font-bold">
                                                <span className="text-gray-700 truncate max-w-[200px] flex items-center gap-1">
                                                  {topic} {mastery >= 100 && <span title="Đã làm chủ 100%">🏆</span>}
                                                </span>
                                                <span className="text-gray-900">{mastery}%</span>
                                              </div>
                                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                                <div className={`h-1.5 rounded-full ${masteryColor}`} style={{ width: `${mastery}%` }} />
                                              </div>
                                              <div className="text-[9px] text-gray-400 font-semibold">{masteryText}</div>
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: AI Gợi ý */}
                                  <div className="bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between space-y-3">
                                    <div className="space-y-2">
                                      <h4 className="font-bold text-gray-900 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                        💡 Chẩn đoán & Gợi ý từ AI
                                      </h4>
                                      <div className="text-[11px] text-gray-600 font-medium leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                                        {s.elo_rating >= 1800 ? (
                                          <span>Học sinh xuất sắc! Kỹ năng giải quyết bài tập thích ứng (Adaptive) cực kỳ tốt. Đề xuất cho phép học vượt khối cấp trên và giao các thử thách nâng cao Mức 4.</span>
                                        ) : s.elo_rating < 1000 ? (
                                          <span>Học sinh còn gặp khó khăn ở các chuyên đề cơ bản. Giáo viên nên giao các bài tập đơn giản (Mức 1 & 2) trong ngân hàng câu hỏi để học sinh củng cố kiến thức trước khi leo tháp.</span>
                                        ) : (
                                          <span>Tiến trình phát triển ổn định. Khả năng tư duy nhanh tốt. Đề xuất củng cố các chuyên đề có tỉ lệ trả lời sai cao hoặc tăng thời gian thực hành leo tháp hàng ngày.</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                      <div className="text-[10px] text-gray-400 font-semibold">Tỷ lệ PvP thắng:</div>
                                      <div className="text-[11px] font-black text-rose-500">{pvpWinRate}% ({winPvP} trận thắng)</div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab Content 2: Match History & Tower Runs */}
                              {activeTab === 'lịch_sử' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                  {/* Left: Recent Tower Runs */}
                                  <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                      🏰 Lượt leo tháp gần đây
                                    </h4>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                      {enrichedAttempts.filter(a => a.student_id === s.id).length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-[10px] italic">
                                          Không có lịch sử leo tháp gần đây.
                                        </div>
                                      ) : (
                                        enrichedAttempts
                                          .filter(a => a.student_id === s.id)
                                          .slice(0, 5)
                                          .map((a, idx) => (
                                            <div key={idx} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center">
                                              <div className="min-w-0">
                                                <div className="text-[11px] font-bold text-gray-800 truncate" title={a.topic}>{a.topic}</div>
                                                <div className="text-[9px] text-gray-400 font-semibold mt-0.5">
                                                  {new Date(a.created_at).toLocaleDateString()} • Khối {a.grade} • Tầng {a.end_floor}
                                                </div>
                                              </div>
                                              <div className="text-right flex-shrink-0 ml-2">
                                                <div className={`text-[10px] font-black ${a.is_victory ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                  {a.is_victory ? '🏆 Chiến thắng' : `Thất bại`}
                                                </div>
                                                <div className="text-[9px] text-gray-400 font-medium">
                                                  Đúng {a.correct_answers}/{a.total_questions} ({a.elo_change >= 0 ? `+${a.elo_change}` : a.elo_change} ELO)
                                                </div>
                                              </div>
                                            </div>
                                          ))
                                      )}
                                    </div>
                                  </div>

                                  {/* Right: Recent PvP Matches */}
                                  <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                                    <h4 className="font-bold text-gray-900 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                      ⚔️ Lịch sử đấu trí 1v1 PvP
                                    </h4>
                                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                      {enrichedMatches.filter(m => m.player1_id === s.id || m.player2_id === s.id).length === 0 ? (
                                        <div className="text-center py-10 text-gray-400 text-[10px] italic">
                                          Không có trận đấu PvP nào gần đây.
                                        </div>
                                      ) : (
                                        enrichedMatches
                                          .filter(m => m.player1_id === s.id || m.player2_id === s.id)
                                          .slice(0, 5)
                                          .map((m, idx) => {
                                            const isP1 = m.player1_id === s.id;
                                            const isWin = (m.winner_id === s.id);
                                            const opponentName = isP1 ? m.player2_name : m.player1_name;
                                            const myScore = isP1 ? m.player1_score : m.player2_score;
                                            const opScore = isP1 ? m.player2_score : m.player1_score;
                                            
                                            return (
                                              <div key={idx} className="p-2.5 bg-gray-50/50 rounded-xl border border-gray-100 flex justify-between items-center">
                                                <div>
                                                  <div className="text-[11px] font-bold text-gray-800">
                                                    Đối thủ: <span className="text-indigo-600">{opponentName}</span>
                                                  </div>
                                                  <div className="text-[9px] text-gray-400 font-semibold mt-0.5">
                                                    {new Date(m.created_at).toLocaleDateString()} • Lớp {m.filter_grade || 'Chung'}
                                                  </div>
                                                </div>
                                                <div className="text-right">
                                                  <div className={`text-[10px] font-black ${isWin ? 'text-emerald-600' : 'text-rose-500'}`}>
                                                    {isWin ? '🏆 Thắng' : '❌ Thua'}
                                                  </div>
                                                  <div className="text-[9px] text-gray-400 font-semibold">
                                                    Tỉ số: {myScore} - {opScore} điểm
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab Content 3: Badges Achieved */}
                              {activeTab === 'huy_hiệu' && (
                                <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4 animate-in fade-in flex flex-col max-h-[500px]">
                                  <h4 className="font-bold text-gray-950 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                    🏆 Bộ sưu tập Huy hiệu danh dự ({s.unlocked_badges?.length || 0}/32)
                                  </h4>
                                  <div className="overflow-y-auto pr-1 flex-1 max-h-[380px] custom-scrollbar">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                      {ARENA_BADGES.map(badge => {
                                        const isUnlocked = s.unlocked_badges?.includes(badge.id);
                                        return (
                                          <div 
                                            key={badge.id}
                                            className={`p-3 rounded-2xl border flex flex-col items-center text-center transition-all duration-300 ${
                                              isUnlocked 
                                                ? 'border-purple-200 bg-purple-50/40 text-gray-900 shadow-sm' 
                                                : 'border-gray-100 bg-gray-50/30 text-gray-400 opacity-50'
                                            }`}
                                          >
                                            <span className={`text-2xl mb-1.5 ${isUnlocked ? 'animate-pulse' : 'filter grayscale'}`}>{badge.emoji}</span>
                                            <h5 className="font-bold text-xs text-gray-950 truncate w-full">{badge.name}</h5>
                                            <p className="text-[9px] text-gray-500 mt-1 leading-normal line-clamp-2 h-7 flex items-center justify-center">{badge.desc}</p>
                                            {isUnlocked ? (
                                              <span className="text-[7px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded mt-2.5 font-bold border border-emerald-500/20 whitespace-nowrap">🏆 ĐÃ ĐẠT</span>
                                            ) : (
                                              <span className="text-[7px] bg-gray-200/50 text-gray-400 px-1.5 py-0.5 rounded mt-2.5 font-bold whitespace-nowrap">CHƯA ĐẠT</span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Tab Content 4: Items & Purchases */}
                              {activeTab === 'trang_bị' && (
                                <div className="bg-white rounded-2xl border p-5 shadow-sm space-y-4 animate-in fade-in">
                                  <h4 className="font-bold text-gray-950 flex items-center gap-1 text-[11px] uppercase tracking-wider text-gray-400">
                                    🎒 Hành trang vật phẩm & Trang bị đặc quyền
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* 1. Class Special skill (Equipped) */}
                                    <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 text-gray-900 shadow-sm flex flex-col justify-between">
                                      <div className="text-center">
                                        <span className="text-3xl block mb-2">🛡️</span>
                                        <h5 className="font-bold text-xs text-gray-950">{skill.name}</h5>
                                        <p className="text-[10px] text-gray-500 mt-1.5 leading-normal">{skill.desc}</p>
                                      </div>
                                      <span className="text-[8px] bg-indigo-500/20 text-indigo-700 px-2 py-0.5 rounded mt-4 font-bold border border-indigo-500/20 text-center uppercase">
                                        🎒 ĐẶC QUYỀN (ĐÃ SỬ DỤNG)
                                      </span>
                                    </div>

                                    {/* Dynamic purchased items from inventory */}
                                    {loadingInventory ? (
                                      <div className="col-span-3 flex items-center justify-center py-8">
                                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                    ) : expandedStudentInventory.length === 0 ? (
                                      <div className="col-span-3 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                                        <span className="text-2xl mb-1">🛒</span>
                                        <p className="text-xs font-bold text-gray-400">Chưa mua vật phẩm nào</p>
                                        <p className="text-[10px] text-gray-400">Học sinh chưa thực hiện giao dịch nào trong Cửa Hàng.</p>
                                      </div>
                                    ) : (
                                      expandedStudentInventory.map(invItem => {
                                        const item = invItem.arena_shop_items;
                                        if (!item) return null;
                                        return (
                                          <div 
                                            key={invItem.id} 
                                            className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                                              invItem.is_equipped 
                                                ? 'border-purple-200 bg-purple-50/30 text-gray-900 shadow-sm' 
                                                : 'border-gray-100 bg-white text-gray-900 shadow-sm'
                                            }`}
                                          >
                                            <div className="text-center">
                                              <span className="text-3xl block mb-2">{item.emoji || '📦'}</span>
                                              <h5 className="font-bold text-xs text-gray-950">{item.name}</h5>
                                              <p className="text-[10px] text-gray-500 mt-1.5 leading-normal">{item.description}</p>
                                            </div>
                                            <div className="mt-4 flex flex-col gap-1 items-center">
                                              <span className={`text-[8px] px-2 py-0.5 rounded font-bold uppercase ${
                                                invItem.is_equipped 
                                                  ? 'bg-purple-500/20 text-purple-700 border border-purple-500/20' 
                                                  : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                              }`}>
                                                {invItem.is_equipped ? '🎒 ĐÃ TRANG BỊ' : `🛒 ĐÃ MUA (SL: ${invItem.quantity})`}
                                              </span>
                                              <span className="text-[8px] text-gray-400 font-semibold">Đã sử dụng: {invItem.times_used || 0} lần</span>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              )}

                            </td>
                          </tr>
                        );
                      })()}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
