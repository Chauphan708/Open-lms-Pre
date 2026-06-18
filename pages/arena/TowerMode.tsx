import { supabase } from '../../services/supabaseClient';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../../store';
import { ArenaQuestion, ArenaProfile } from '../../types';
import { 
  ArrowLeft, Heart, Star, Zap, GraduationCap, CheckCircle, XCircle, Bot, Sparkles, 
  AlertTriangle, Shield, ShieldCheck, ShieldAlert, Award, Play, BookOpen, Clock, 
  RotateCcw, ChevronRight, HelpCircle, Trophy 
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import MathText from '../../components/MathText';
import { 
  explainQuestionError, 
  generateQuestionsByTopic, 
  generateRevengeQuestions,
  generateArenaStudyGuide
} from '../../services/geminiService';

// League calculation based on ELO rating
export const getLeagueInfo = (elo: number) => {
  if (elo < 1100) return { name: 'Đồng (Bronze)', badge: '🥉', color: '#cd7f32', border: 'border-amber-700/30', bg: 'bg-amber-950/20 text-amber-300' };
  if (elo < 1300) return { name: 'Bạc (Silver)', badge: '🥈', color: '#c0c0c0', border: 'border-slate-400/30', bg: 'bg-slate-900/20 text-slate-300' };
  if (elo < 1500) return { name: 'Vàng (Gold)', badge: '🥇', color: '#ffd700', border: 'border-yellow-500/30', bg: 'bg-yellow-950/20 text-yellow-300' };
  if (elo < 1700) return { name: 'Bạch Kim (Platinum)', badge: '💎', color: '#e5e4e2', border: 'border-cyan-400/30', bg: 'bg-cyan-950/20 text-cyan-300' };
  return { name: 'Kim Cương (Diamond)', badge: '👑', color: '#a855f7', border: 'border-purple-500/30', bg: 'bg-purple-950/20 text-purple-300' };
};

// Preset list of standard subjects and fallback topics if database is empty
const DEFAULT_TOPICS_BY_SUBJECT: Record<string, { topic: string; label: string }[]> = {
  math: [
    { topic: 'Phân số & Số thập phân', label: '📐 Phân số & Số thập phân' },
    { topic: 'Hình học', label: '📐 Hình học lớp 5' },
    { topic: 'Tỉ số phần trăm', label: '📐 Tỉ số phần trăm' },
    { topic: 'Vận tốc', label: '📐 Vận tốc & Chuyển động' },
  ],
  science: [
    { topic: 'Sự sinh sản', label: '🔬 Sự sinh sản & Phát triển' },
    { topic: 'Năng lượng', label: '🔬 Năng lượng tái tạo' },
    { topic: 'Môi trường', label: '🔬 Ô nhiễm môi trường' },
    { topic: 'Biến đổi chất', label: '🔬 Biến đổi lý hóa' },
  ],
  technology: [
    { topic: 'Phần cứng', label: '💻 Thiết bị máy tính' },
    { topic: 'Phần mềm', label: '💻 Phần mềm soạn thảo & Trình chiếu' },
    { topic: 'Internet', label: '💻 Mạng máy tính thế giới' },
  ],
  vietnamese: [
    { topic: 'Luyện từ và câu', label: '📝 Luyện từ và câu' },
    { topic: 'Tập làm văn', label: '📝 Tập làm văn' },
    { topic: 'Chính tả', label: '📝 Quy tắc chính tả' }
  ],
  english: [
    { topic: 'Vocabulary', label: '🌐 English Vocabulary' },
    { topic: 'Grammar', label: '🌐 Grammar & Tenses' }
  ],
  history_geography: [
    { topic: 'Địa lí Việt Nam', label: '⏳ Địa lí tự nhiên & Dân cư' },
    { topic: 'Lịch sử thế kỉ XX', label: '⏳ Lịch sử Việt Nam hiện đại' },
    { topic: 'Triều Nguyễn', label: '⏳ Lịch sử triều Nguyễn' }
  ]
};

export const TowerMode: React.FC = () => {
  const navigate = useNavigate();
  const [customTopics, setCustomTopics] = useState<{ id: string; subject: string; topic: string }[]>([]);
  const { 
    user, 
    arenaProfile, 
    arenaQuestions, 
    fetchArenaQuestions, 
    updateArenaProfile, 
    exams,
    fetchArenaProfile
  } = useStore();

  // Mode & Selection States
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('math');
  const [availableTopics, setAvailableTopics] = useState<{ topic: string; label: string; subject: string }[]>([]);

  // Adaptive gameplay states
  const [lives, setLives] = useState(3);
  const [maxLives, setMaxLives] = useState(3);
  const [currentDifficulty, setCurrentDifficulty] = useState(1); // 1 = NHAN_BIET, 2 = KET_NOI, 3 = VAN_DUNG
  const [masteryScore, setMasteryScore] = useState(0); // Progress 0 -> 100
  const [streakCombo, setStreakCombo] = useState(0); // Run-wide consecutive correct streak
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0); // Consecutive correct at current level (target = 3 for level-up)
  const [consecutiveWrong, setConsecutiveWrong] = useState(0); // Consecutive wrong at current level (target = 2 for level-down)
  
  // Question selection & state
  const [questionPool, setQuestionPool] = useState<ArenaQuestion[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentQ, setCurrentQ] = useState<ArenaQuestion | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  
  const { hint, explanation } = React.useMemo(() => {
    if (!currentQ) return { hint: '', explanation: '' };
    const guideText = currentQ.guide;
    const explanationText = currentQ.explanation;
    if (!guideText) return { hint: '', explanation: explanationText || '' };
    
    const keywords = [
      'lời giải chi tiết:',
      'lời giải:',
      'giải thích:',
      'hướng dẫn giải:'
    ];
    
    const lowerText = guideText.toLowerCase();
    let splitIndex = -1;
    let matchedKeywordLength = 0;
    
    for (const kw of keywords) {
      const idx = lowerText.indexOf(kw);
      if (idx !== -1 && (splitIndex === -1 || idx < splitIndex)) {
        splitIndex = idx;
        matchedKeywordLength = kw.length;
      }
    }
    
    if (splitIndex !== -1) {
      const parsedHint = guideText.substring(0, splitIndex).trim();
      const parsedExpl = guideText.substring(splitIndex + matchedKeywordLength).trim();
      
      const finalExplanation = explanationText 
        ? explanationText.trim() + '\n\n' + parsedExpl
        : parsedExpl;
        
      return { hint: parsedHint, explanation: finalExplanation };
    }
    
    return { hint: guideText.trim(), explanation: explanationText || '' };
  }, [currentQ]);
  const [isCorrect, setIsCorrect] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [eloGained, setEloGained] = useState(0);
  const [timer, setTimer] = useState(30);
  const [baseTimerLimit, setBaseTimerLimit] = useState(30);

  // Gamification Active Perks
  const [skillUsed, setSkillUsed] = useState(false);
  const [shieldActive, setShieldActive] = useState(false);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [unlockedBadgeSession, setUnlockedBadgeSession] = useState<string | null>(null);

  // AI Assistant states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  const [aiGeneratingFallback, setAiGeneratingFallback] = useState(false);

  // End of run states
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [aiGuide, setAiGuide] = useState('');
  const [aiGuideLoading, setAiGuideLoading] = useState(false);

  // AI Revenge challenges
  const [revengeActive, setRevengeActive] = useState(false);
  const [revengeQuestions, setRevengeQuestions] = useState<ArenaQuestion[]>([]);
  const [revengeIndex, setRevengeIndex] = useState(0);
  const [revengeWrongCount, setRevengeWrongCount] = useState(0);
  const [revengeCompleted, setRevengeCompleted] = useState(false);

  // Load questions and profiles on start
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchArenaProfile(user.id),
        fetchArenaQuestions(),
        supabase.from('arena_topics').select('*').then(({ data }) => { if (data) setCustomTopics(data); })
      ]).then(() => setLoading(false));
    }
  }, [user]);

  // Extract unique topics dynamically from bank + exams
  useEffect(() => {
    if (loading) return;

    // Combine preset topics and dynamically found topics
    const dynamicTopics: { topic: string; label: string; subject: string }[] = [];
    
    // Look in arenaQuestions
    arenaQuestions.forEach(q => {
      if (q.topic && q.topic !== 'general') {
        const exists = dynamicTopics.some(t => t.topic.toLowerCase() === q.topic!.toLowerCase());
        if (!exists) {
          dynamicTopics.push({
            topic: q.topic,
            label: `📋 Chuyên đề: ${q.topic}`,
            subject: q.subject || 'math'
          });
        }
      }
    });

    // Look in exams
    exams.forEach(exam => {
      if (exam.status === 'PUBLISHED' && exam.topic) {
        const exists = dynamicTopics.some(t => t.topic.toLowerCase() === exam.topic!.toLowerCase());
        if (!exists) {
          dynamicTopics.push({
            topic: exam.topic,
            label: `📋 Chuyên đề: ${exam.topic}`,
            subject: exam.subject || 'math'
          });
        }
      }
    });

    // Look in customTopics
    customTopics.forEach(ct => {
      const exists = dynamicTopics.some(t => t.topic.toLowerCase() === ct.topic.toLowerCase());
      if (!exists) {
        dynamicTopics.push({
          topic: ct.topic,
          label: `📋 Chuyên đề: ${ct.topic}`,
          subject: ct.subject
        });
      }
    });

    // Merge default presets and dynamic ones
    const merged: { topic: string; label: string; subject: string }[] = [];
    Object.entries(DEFAULT_TOPICS_BY_SUBJECT).forEach(([sub, list]) => {
      list.forEach(item => {
        merged.push({ topic: item.topic, label: item.label, subject: sub });
      });
    });

    dynamicTopics.forEach(dt => {
      const exists = merged.some(m => m.topic.toLowerCase() === dt.topic.toLowerCase());
      if (!exists) {
        merged.push(dt);
      }
    });

    setAvailableTopics(merged);
    
    // Default select first topic for math
    const firstMath = merged.find(t => t.subject === 'math');
    if (firstMath) setSelectedTopic(firstMath.topic);
  }, [loading, arenaQuestions, exams]);

  // Timer loop
  useEffect(() => {
    if (!currentQ || showResult || gameOver || victory || !started || revengeActive) return;
    if (timer <= 0) {
      handleAnswer(-1); // timeout is incorrect answer
      return;
    }
    const t = setTimeout(() => setTimer(prev => prev - 1), 1000);
    return () => clearTimeout(t);
  }, [timer, currentQ, showResult, gameOver, victory, started, revengeActive]);

  // Progress daily quests
  const progressQuests = async (type: string, increment: number = 1) => {
    if (!arenaProfile || !arenaProfile.daily_quests) return;
    let extraXp = 0;
    const updatedQuests = arenaProfile.daily_quests.map(q => {
      if (q.type === type && !q.completed) {
        const newCurrent = Math.min(q.target, q.current + increment);
        const completed = newCurrent >= q.target;
        if (completed) {
          extraXp += q.reward_xp;
        }
        return { ...q, current: newCurrent, completed };
      }
      return q;
    });

    await updateArenaProfile({
      id: arenaProfile.id,
      daily_quests: updatedQuests,
      total_xp: arenaProfile.total_xp + extraXp
    });
  };

  // Check and unlock badges / titles at end of run
  const checkBadgeUnlock = async (finalMastery: number) => {
    if (!arenaProfile) return null;
    const badges = [...(arenaProfile.unlocked_badges || [])];
    let title = arenaProfile.active_title || 'Học Giả Tập Sự';
    let newUnlock = false;
    let unlockedName = '';

    if (streakCombo >= 10 && !badges.includes('math_genius')) {
      badges.push('math_genius');
      title = 'Thiên Tài Trí Tuệ';
      newUnlock = true;
      unlockedName = 'Thiên Tài Trí Tuệ 🌟 (Chuỗi 10 câu đúng)';
    }
    if (finalMastery >= 100 && !badges.includes('tower_master')) {
      badges.push('tower_master');
      title = 'Bậc Thầy Chinh Phục';
      newUnlock = true;
      unlockedName = 'Bậc Thầy Chinh Phục 🏆 (Làm chủ 100% chuyên đề)';
    }

    if (newUnlock) {
      await updateArenaProfile({
        id: arenaProfile.id,
        unlocked_badges: badges,
        active_title: title
      });
      setUnlockedBadgeSession(unlockedName);
      return unlockedName;
    }
    return null;
  };

  // Compile all questions available for selected topic & subject
  const buildQuestionPool = (): ArenaQuestion[] => {
    const pool: ArenaQuestion[] = [];

    // 1. Pull from arena_questions
    arenaQuestions
      .filter(q => q.subject === selectedSubject && q.topic?.toLowerCase() === selectedTopic.toLowerCase())
      .forEach(q => pool.push(q));

    // 2. Pull from published exams questions with same topic & subject
    exams
      .filter(e => e.status === 'PUBLISHED' && e.subject === selectedSubject)
      .forEach(exam => {
        exam.questions
          .filter(q => q.type === 'MCQ' && q.options.length >= 4 && q.correctOptionIndex !== undefined && (q.topic?.toLowerCase() === selectedTopic.toLowerCase() || exam.topic?.toLowerCase() === selectedTopic.toLowerCase()))
          .forEach(q => {
            const mappedDiff = q.level === 'VAN_DUNG' ? 3 : q.level === 'KET_NOI' ? 2 : 1;
            // Avoid duplicate content
            const duplicate = pool.some(p => p.content.toLowerCase().trim() === q.content.toLowerCase().trim());
            if (!duplicate) {
              pool.push({
                id: `exam_${exam.id}_${q.id}`,
                content: q.content,
                answers: q.options.slice(0, 4),
                correct_index: q.correctOptionIndex!,
                difficulty: mappedDiff,
                subject: selectedSubject,
                topic: selectedTopic
              });
            }
          });
      });

    return pool;
  };

  // Start the adaptive tower run
  const handleStart = async () => {
    let pool = buildQuestionPool();
    
    // If pool is empty, trigger AI to generate questions dynamically
    if (pool.length === 0) {
      setAiGeneratingFallback(true);
      try {
        // Generate 3 basic questions (Level 1) of selected topic via AI
        const generated = await generateQuestionsByTopic(
          selectedTopic, 
          '5', 
          'MCQ', 
          'Nhận biết (Dễ)', 
          3, 
          `Môn học ${selectedSubject === 'math' ? 'Toán' : selectedSubject === 'science' ? 'Khoa học' : selectedSubject === 'technology' ? 'Công nghệ' : selectedSubject === 'vietnamese' ? 'Tiếng Việt' : selectedSubject === 'english' ? 'Tiếng Anh' : 'Lịch sử và Địa lí'}. Hãy đặt các phương án A, B, C, D rõ ràng.`
        );
        
        const mappedGenerated = generated.map((q, idx) => ({
          id: `ai_gen_${Date.now()}_${idx}`,
          content: q.content,
          answers: q.options,
          correct_index: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
          difficulty: 1,
          subject: selectedSubject,
          topic: selectedTopic
        }));

        pool = mappedGenerated;
      } catch (err) {
        console.error("Failed to generate fallback questions", err);
        alert("Không có đủ câu hỏi trong hệ thống cho chuyên đề này và AI đang quá tải. Hãy thử chuyên đề khác nhé!");
        setAiGeneratingFallback(false);
        return;
      } finally {
        setAiGeneratingFallback(false);
      }
    }

    setQuestionPool(pool);
    setStarted(true);
    setLives(3);
    setMaxLives(3);
    setMasteryScore(0);
    setCurrentDifficulty(1);
    setConsecutiveCorrect(0);
    setConsecutiveWrong(0);
    setStreakCombo(0);
    setUsedIds(new Set());
    setSkillUsed(false);
    setShieldActive(false);
    setGameOver(false);
    setVictory(false);
    setUnlockedBadgeSession(null);

    // Pick first question
    pickNextQuestion(pool, 1, new Set());
  };

  // Select next question adaptively
  const pickNextQuestion = async (
    pool: ArenaQuestion[], 
    targetDiff: number, 
    used: Set<string>
  ) => {
    setSelectedOption(null);
    setShowResult(false);
    setShowAiExplanation(false);
    setAiExplanation('');
    setEliminatedOptions([]);

    // Filter questions matching target difficulty that haven't been used yet
    let available = pool.filter(q => q.difficulty === targetDiff && !used.has(q.id));

    // Fallback: If no unused question at target difficulty, search in adjacent difficulties
    if (available.length === 0) {
      available = pool.filter(q => q.difficulty !== targetDiff && !used.has(q.id));
    }

    // If completely dry of questions in pool, ask AI to generate more on the fly!
    if (available.length === 0) {
      setAiGeneratingFallback(true);
      try {
        const diffLabel = targetDiff === 4 ? 'Mức nâng cao' : targetDiff === 3 ? 'Mức 3' : targetDiff === 2 ? 'Mức 2' : 'Mức 1';
        const generated = await generateQuestionsByTopic(
          selectedTopic, 
          '5', 
          'MCQ', 
          diffLabel, 
          3, 
          `Hãy tạo câu hỏi khác hoàn toàn các câu hỏi trước đây. Chuyên đề ${selectedTopic}.`
        );
        
        const mappedGenerated = generated.map((q, idx) => ({
          id: `ai_dynamic_${Date.now()}_${idx}`,
          content: q.content,
          answers: q.options,
          correct_index: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
          difficulty: targetDiff,
          subject: selectedSubject,
          topic: selectedTopic
        }));

        // Add to pool
        const updatedPool = [...pool, ...mappedGenerated];
        setQuestionPool(updatedPool);
        
        const nextQ = mappedGenerated[0];
        setCurrentQ(nextQ);
        setUsedIds(prev => new Set([...prev, nextQ.id]));
        setTimer(baseTimerLimit);
      } catch (err) {
        console.error("Failed to generate dynamic question", err);
        // Fallback: recycle used questions
        const recycled = pool.filter(q => q.difficulty === targetDiff);
        if (recycled.length > 0) {
          const randomQ = recycled[Math.floor(Math.random() * recycled.length)];
          setCurrentQ(randomQ);
        } else {
          // If no questions at all, declare victory
          handleVictory(masteryScore);
        }
      } finally {
        setAiGeneratingFallback(false);
      }
      return;
    }

    // Pick random question from available list
    const chosen = available[Math.floor(Math.random() * available.length)];
    setCurrentQ(chosen);
    setUsedIds(prev => new Set([...prev, chosen.id]));
    setTimer(baseTimerLimit);
  };

  // Submit Answer
  const handleAnswer = async (idx: number) => {
    if (showResult || !currentQ || !arenaProfile) return;
    setSelectedOption(idx);
    const correct = idx === currentQ.correct_index;
    setIsCorrect(correct);
    setShowResult(true);

    let finalLives = lives;
    let finalDifficulty = currentDifficulty;
    let newStreak = streakCombo;
    let newConsecutiveCorrect = consecutiveCorrect;
    let newConsecutiveWrong = consecutiveWrong;
    let masteryChange = 0;

    if (correct) {
      newStreak += 1;
      newConsecutiveCorrect += 1;
      newConsecutiveWrong = 0;
      setStreakCombo(newStreak);
      setConsecutiveCorrect(newConsecutiveCorrect);
      setConsecutiveWrong(0);

      // Mastery Reward: Level 1 -> +15, Level 2 -> +20, Level 3 -> +25
      let masteryGain = currentDifficulty === 1 ? 15 : currentDifficulty === 2 ? 20 : 25;
      
      // Artist Passive Perk: +15% XP/Mastery reward on Level 3 questions
      if (arenaProfile.avatar_class === 'artist' && currentDifficulty === 3) {
        masteryGain = Math.round(masteryGain * 1.15);
      }

      masteryChange = masteryGain;
      const newMastery = Math.min(100, masteryScore + masteryGain);
      setMasteryScore(newMastery);

      // XP reward based on difficulty and streak multiplier
      let xpMultiplier = 1.0;
      if (newStreak === 2) xpMultiplier = 1.5;
      else if (newStreak === 3) xpMultiplier = 2.0;
      else if (newStreak >= 4) xpMultiplier = 3.0;

      const baseXP = currentDifficulty === 1 ? 10 : currentDifficulty === 2 ? 15 : currentDifficulty === 3 ? 20 : 30;
      const xp = Math.round(baseXP * xpMultiplier);
      setXpGained(xp);

      const elo = currentDifficulty * 5;
      setEloGained(elo);

      // Check level up (VioEdu logic: 3 consecutive correct answers)
      if (newConsecutiveCorrect >= 3) {
        if (currentDifficulty < 4) {
          finalDifficulty = currentDifficulty + 1;
          setCurrentDifficulty(finalDifficulty);
          setConsecutiveCorrect(0); // reset streak at new level
        }
      }

      // Check victory
      if (newMastery >= 100) {
        handleVictory(newMastery);
        return;
      }

      // Quest checks
      if (newStreak >= 5) {
        progressQuests('correct_streak', 5);
      }

    } else {
      // Incorrect answer
      newStreak = 0;
      newConsecutiveCorrect = 0;
      newConsecutiveWrong += 1;
      setStreakCombo(0);
      setConsecutiveCorrect(0);
      setConsecutiveWrong(newConsecutiveWrong);

      // Deduct mastery points slightly (punishment)
      const newMastery = Math.max(0, masteryScore - 5);
      setMasteryScore(newMastery);
      masteryChange = -5;
      setXpGained(0);
      setEloGained(-3);

      // check if shield is active
      if (shieldActive) {
        setShieldActive(false); // consume shield
      } else {
        finalLives = lives - 1;
        setLives(finalLives);
        if (finalLives <= 0) {
          handleGameOver(newMastery);
          return;
        }
      }

      // Check level down (VioEdu logic: 2 consecutive incorrect answers)
      if (newConsecutiveWrong >= 2) {
        if (currentDifficulty > 1) {
          finalDifficulty = currentDifficulty - 1;
          setCurrentDifficulty(finalDifficulty);
          setConsecutiveWrong(0); // reset
        }
      }
    }

    // Save progress to Supabase
    await updateArenaProfile({
      id: arenaProfile.id,
      total_xp: arenaProfile.total_xp + (correct ? xpGained : 0),
      elo_rating: Math.max(500, arenaProfile.elo_rating + (correct ? eloGained : -3))
    });
  };

  // Next Question trigger
  const handleNext = () => {
    if (gameOver || victory) return;
    pickNextQuestion(questionPool, currentDifficulty, usedIds);
  };

  // Handle game over (lives depleted)
  const handleGameOver = async (finalMastery: number) => {
    setGameOver(true);
    setLives(0);
    setAiGuideLoading(true);

    // Update profile ELO/losses
    if (arenaProfile) {
      const updatedMastery = { ...(arenaProfile.topic_mastery || {}), [selectedTopic]: finalMastery };
      await updateArenaProfile({
        id: arenaProfile.id,
        losses: arenaProfile.losses + 1,
        topic_mastery: updatedMastery
      });
    }

    // Fetch AI study advice based on performance
    try {
      const advice = await generateArenaStudyGuide(selectedTopic, selectedSubject, 60); // 60% error rate
      setAiGuide(advice);
    } catch (e) {
      setAiGuide("AI chẩn đoán: Em cần xem lại định lý và thực hành thêm các câu hỏi nhận biết của chuyên đề này nhé!");
    } finally {
      setAiGuideLoading(false);
    }
  };

  // Handle victory (Mastery = 100%)
  const handleVictory = async (finalMastery: number) => {
    setVictory(true);
    setAiGuideLoading(true);

    if (arenaProfile) {
      const updatedMastery = { ...(arenaProfile.topic_mastery || {}), [selectedTopic]: 100 };
      await updateArenaProfile({
        id: arenaProfile.id,
        wins: arenaProfile.wins + 1,
        topic_mastery: updatedMastery
      });

      // Complete Daily Quest q2: "Tích lũy tri thức: Đạt 100% Mastery ở chuyên đề bất kỳ"
      progressQuests('mastery_100', 1);

      // Check badge unlock
      checkBadgeUnlock(100);
    }

    // Fetch AI recommendations & suggestions for advanced study
    try {
      const advice = await generateArenaStudyGuide(selectedTopic, selectedSubject, 0); // 0% error
      setAiGuide(advice);
    } catch (e) {
      setAiGuide("AI chẩn đoán: Tuyệt vời! Em đã hoàn toàn làm chủ chuyên đề này. Thầy cô khuyên em nên tiến thẳng tới các bài thi chuyên sâu tiếp theo!");
    } finally {
      setAiGuideLoading(false);
    }
  };

  // Fetch real-time AI hint for current wrong answer
  const handleAskAi = async () => {
    if (!currentQ || selectedOption === null) return;
    setAiLoading(true);
    setShowAiExplanation(true);
    try {
      const wrongText = currentQ.answers[selectedOption] || "Không trả lời";
      const correctText = currentQ.answers[currentQ.correct_index || 0];
      const explanation = await explainQuestionError(currentQ.content, wrongText, correctText);
      setAiExplanation(explanation);
    } catch (e) {
      setAiExplanation("AI Gia sư hiện đang bận hoặc quá tải. Thầy cô gợi ý em đọc kỹ đề bài và xem lại cách giải chuẩn nhé!");
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger Class Skill (usable once per run)
  const handleActivateSkill = () => {
    if (skillUsed || !arenaProfile || !currentQ || showResult) return;
    setSkillUsed(true);

    const charClass = arenaProfile.avatar_class;

    if (charClass === 'scholar') {
      // 50/50: remove 2 wrong answers
      const correctIdx = currentQ.correct_index || 0;
      const wrongIndices = [0, 1, 2, 3].filter(i => i !== correctIdx);
      const toEliminate = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
      setEliminatedOptions(toEliminate);
    } 
    else if (charClass === 'scientist') {
      // Add 15s to clock
      setTimer(prev => prev + 15);
    } 
    else if (charClass === 'artist') {
      // Activate shield
      setShieldActive(true);
    } 
    else if (charClass === 'explorer') {
      // Heal 1 heart
      setLives(prev => Math.min(maxLives, prev + 1));
    }
  };

  // Generate 3 advanced questions for high performing students
  const handleTriggerRevenge = async () => {
    if (!currentQ) return;
    setAiGuideLoading(true);
    try {
      // Call generateRevengeQuestions in geminiService
      const result = await generateRevengeQuestions([{ content: currentQ.content, topic: selectedTopic, subject: selectedSubject }]);
      if (result.questions && result.questions.length > 0) {
        const mappedQuestions: ArenaQuestion[] = result.questions.map((q: any, idx: number) => ({
          id: q.id || `revenge_${Date.now()}_${idx}`,
          content: q.content,
          answers: q.options || [],
          correct_index: q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0,
          difficulty: 3,
          subject: selectedSubject,
          topic: selectedTopic
        }));
        setRevengeQuestions(mappedQuestions);
        setRevengeActive(true);
        setRevengeIndex(0);
        setRevengeWrongCount(0);
        setRevengeCompleted(false);
      } else {
        alert("Không thể sinh câu hỏi thử thách lúc này. Vui lòng thử lại!");
      }
    } catch (e) {
      alert("Không thể sinh câu hỏi thử thách nâng cao lúc này.");
    } finally {
      setAiGuideLoading(false);
    }
  };

  // Answer a revenge question
  const handleRevengeAnswer = (idx: number) => {
    const activeRevengeQ = revengeQuestions[revengeIndex];
    if (!activeRevengeQ) return;

    const correct = idx === activeRevengeQ.correct_index;
    if (!correct) {
      setRevengeWrongCount(prev => prev + 1);
    }

    if (revengeIndex < revengeQuestions.length - 1) {
      setRevengeIndex(prev => prev + 1);
    } else {
      setRevengeCompleted(true);
      // Give bonus ELO/XP for completing revenge!
      if (arenaProfile) {
        const rewardXp = correct && revengeWrongCount === 0 ? 50 : 20;
        updateArenaProfile({
          id: arenaProfile.id,
          total_xp: arenaProfile.total_xp + rewardXp,
          elo_rating: arenaProfile.elo_rating + 20
        });
      }
    }
  };

  // Restart Tower Run
  const handleRestart = () => {
    setLives(3);
    setMasteryScore(0);
    setGameOver(false);
    setVictory(false);
    setStarted(false);
    setRevengeActive(false);
    setRevengeQuestions([]);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-[#030712] text-gray-100">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-t-2 border-amber-500 animate-spin"></div>
          <GraduationCap className="absolute inset-0 m-auto h-8 w-8 text-amber-500 animate-pulse" />
        </div>
        <p className="text-gray-400 text-sm font-bold">Đang cấu hình đấu trường thích ứng...</p>
      </div>
    );
  }

  // SCREEN 1: Setup & Topic Selector
  if (!started) {
    const league = getLeagueInfo(arenaProfile?.elo_rating || 1000);
    
    // Group topics by subject
    const mathTopics = availableTopics.filter(t => t.subject === 'math');
    const scienceTopics = availableTopics.filter(t => t.subject === 'science');
    const techTopics = availableTopics.filter(t => t.subject === 'technology');

    return (
      <div className="max-w-2xl mx-auto pb-12 px-4 bg-[#030712] text-gray-100 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden min-h-[85vh]">
        <style>{`
          @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }
          .glow-active { box-shadow: 0 0 25px rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.3); }
        `}</style>

        {/* Ambient glowing dot */}
        <div className="absolute top-0 right-1/4 w-72 h-72 rounded-full opacity-[0.03] blur-[90px] pointer-events-none bg-amber-500"></div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5 mt-4 animate-fade-in">
          <button onClick={() => navigate('/arena')} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-amber-500" /> Leo Tháp Thích Ứng (VioEdu)
            </h1>
            <p className="text-sm text-gray-400">Chinh phục chuyên đề theo độ khó tăng dần của AI</p>
          </div>
        </div>

        {/* ELO & Character details */}
        {arenaProfile && (
          <div className="grid grid-cols-2 gap-4 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className={`p-4 rounded-2xl bg-[#080d16] border ${league.border} flex items-center gap-3`}>
              <span className="text-3xl">{league.badge}</span>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black">Xếp hạng Võ Đài</p>
                <p className="font-bold text-white text-sm">{league.name}</p>
                <p className="text-xs font-semibold text-amber-400">{arenaProfile.elo_rating} Elo</p>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-[#080d16] border border-white/5 flex items-center gap-3">
              <span className="text-3xl">
                {arenaProfile.avatar_class === 'scholar' ? '📖' : arenaProfile.avatar_class === 'scientist' ? '🔬' : arenaProfile.avatar_class === 'artist' ? '🎨' : '🌍'}
              </span>
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black">Lớp nhân vật</p>
                <p className="font-bold text-white text-sm">
                  {arenaProfile.avatar_class === 'scholar' ? 'Nhà Thông Thái' : arenaProfile.avatar_class === 'scientist' ? 'Nhà Khoa Học' : arenaProfile.avatar_class === 'artist' ? 'Nghệ Sĩ' : 'Nhà Thám Hiểm'}
                </p>
                <p className="text-xs text-purple-400 font-semibold">{arenaProfile.active_title || 'Học Giả'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Topic Selector */}
        <div className="bg-[#080d16] rounded-2xl p-6 border border-white/5 space-y-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div>
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-400" />
              1. Lựa chọn môn học & Chuyên đề
            </h3>

            {/* Subject Selector Buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button 
                onClick={() => {
                  setSelectedSubject('math');
                  const list = availableTopics.filter(t => t.subject === 'math');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'math' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                📐 Toán học
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('science');
                  const list = availableTopics.filter(t => t.subject === 'science');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'science' ? 'bg-purple-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🔬 Khoa học
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('technology');
                  const list = availableTopics.filter(t => t.subject === 'technology');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'technology' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                💻 Công nghệ
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('vietnamese');
                  const list = availableTopics.filter(t => t.subject === 'vietnamese');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'vietnamese' ? 'bg-rose-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                📝 Tiếng Việt
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('english');
                  const list = availableTopics.filter(t => t.subject === 'english');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'english' ? 'bg-teal-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                🌐 Tiếng Anh
              </button>
              <button 
                onClick={() => {
                  setSelectedSubject('history_geography');
                  const list = availableTopics.filter(t => t.subject === 'history_geography');
                  if (list.length > 0) setSelectedTopic(list[0].topic);
                }}
                className={`py-2 rounded-xl text-xs font-black transition-all ${selectedSubject === 'history_geography' ? 'bg-amber-600 text-white shadow-md' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                ⏳ Lịch sử & Địa lí
              </button>
            </div>

            {/* Topic List */}
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {availableTopics.filter(t => t.subject === selectedSubject).map((topicObj) => {
                const mastery = arenaProfile?.topic_mastery?.[topicObj.topic] || 0;
                const isSelected = selectedTopic === topicObj.topic;
                
                return (
                  <button
                    key={topicObj.topic}
                    onClick={() => setSelectedTopic(topicObj.topic)}
                    className={`w-full p-4 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected ? 'border-amber-500/50 bg-amber-500/10 glow-active' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                  >
                    <div className="flex-1 pr-4">
                      <p className={`text-sm font-bold ${isSelected ? 'text-amber-400' : 'text-gray-200'}`}>{topicObj.label}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${mastery}%` }}></div>
                        </div>
                        <span className="text-[10px] font-black text-gray-400">{mastery}% Mastery</span>
                      </div>
                    </div>
                    {mastery >= 100 && (
                      <span className="text-xl bg-yellow-500/10 p-1.5 rounded-lg border border-yellow-500/20" title="Đã làm chủ">🏆</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Info Card */}
          <div className="bg-gradient-to-r from-indigo-950/20 to-purple-950/20 border border-indigo-500/20 rounded-xl p-4 flex gap-3 text-xs text-indigo-300">
            <Bot className="h-5 w-5 text-indigo-400 flex-shrink-0 animate-bounce" />
            <p className="leading-relaxed">
              <strong>Gia sư AI gợi ý:</strong> Sau khi bắt đầu, bạn cần trả lời đúng <strong>liên tiếp 3 câu hỏi</strong> cùng độ khó để thăng cấp. Bất kỳ câu sai nào cũng reset chuỗi, hạ cấp độ khó và kích hoạt gợi ý chẩn đoán lý thuyết của AI ngay lập tức!
            </p>
          </div>

          {/* Action Trigger */}
          {aiGeneratingFallback ? (
            <div className="py-4 text-center text-amber-500 font-bold animate-pulse flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 animate-spin" /> Đang nhờ AI tạo câu hỏi chuyên đề thích ứng...
            </div>
          ) : (
            <button
              onClick={handleStart}
              className="w-full py-4 rounded-xl font-black text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-orange-950/30 transition-all active:scale-[0.99]"
            >
              🚀 Bắt đầu chinh phục!
            </button>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 2: End of Run (Victory or Game Over)
  if (victory || gameOver) {
    const league = getLeagueInfo(arenaProfile?.elo_rating || 1000);
    return (
      <div className="max-w-2xl mx-auto pb-12 px-4 bg-[#030712] text-gray-100 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden min-h-[85vh]">
        <style>{`
          @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
          .animate-pop { animation: popIn 0.4s ease-out forwards; }
          .prose ul { list-style-type: disc !important; padding-left: 1.5rem !important; margin-bottom: 0.5rem !important; }
          .prose li { margin-bottom: 0.25rem !important; }
        `}</style>

        {victory && (
          <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none"></div>
        )}

        <div className="text-center py-10 animate-pop">
          <span className="text-6xl inline-block mb-3 animate-bounce">
            {victory ? '🏆' : '💀'}
          </span>
          <h2 className={`text-2xl font-black tracking-wide ${victory ? 'text-yellow-400' : 'text-rose-500'}`}>
            {victory ? 'CHINH PHỤC THÀNH CÔNG!' : 'HỎNG MẠNG TẦNG THÁP!'}
          </h2>
          <p className="text-gray-400 text-sm mt-1">Chuyên đề: <strong className="text-white">{selectedTopic}</strong></p>

          {unlockedBadgeSession && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 rounded-full text-xs font-black animate-pulse">
              <Award className="h-4 w-4" /> Mở khóa danh hiệu: {unlockedBadgeSession}
            </div>
          )}
        </div>

        {/* Stats card */}
        <div className="bg-[#080d16] rounded-2xl p-5 border border-white/5 grid grid-cols-2 gap-4 mb-6">
          <div className="text-center border-r border-white/5 py-2">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">XP Nhận được</span>
            <span className="text-2xl font-black text-emerald-400">+{victory ? 100 : 20} XP</span>
          </div>
          <div className="text-center py-2">
            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Xếp Hạng Võ Đài</span>
            <span className="text-2xl font-black text-amber-400">{arenaProfile?.elo_rating || 1000} Elo</span>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-[#080d16] rounded-2xl p-6 border border-white/5 space-y-4 mb-6">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-indigo-400 animate-pulse" />
            Báo cáo sư phạm từ Cố vấn AI
          </h3>

          {aiGuideLoading ? (
            <div className="py-8 flex flex-col items-center justify-center text-xs text-gray-400">
              <Clock className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
              Đang lập báo cáo và kiến thức bổ trợ...
            </div>
          ) : (
            <div className="bg-white/5 rounded-xl p-5 border border-white/5 text-sm leading-relaxed prose prose-invert text-gray-300">
              <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                {aiGuide}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions panel */}
        <div className="space-y-3">
          {victory && !aiGuideLoading && (
            <button
              onClick={handleTriggerRevenge}
              className="w-full py-4 rounded-xl font-black text-base bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg flex items-center justify-center gap-2 group transition-all"
            >
              🔥 Tham gia Thử thách AI nâng cao!
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRestart}
              className="py-4 bg-[#080d16] border border-white/10 hover:bg-white/5 rounded-xl font-bold text-sm text-gray-300 transition-all"
            >
              🔄 Leo tháp tiếp
            </button>
            <button
              onClick={() => navigate('/arena')}
              className="py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-sm text-gray-300 transition-all"
            >
              Quay lại sảnh
            </button>
          </div>
        </div>

        {/* AI Revenge Challenge overlay */}
        {revengeActive && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-[#090d16] border border-white/10 rounded-3xl shadow-2xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <h3 className="font-bold text-lg text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-400 animate-pulse" />
                  Thử thách AI nâng cao (Mức 3)
                </h3>
                <span className="text-xs bg-purple-500/10 px-3 py-1 rounded-full text-purple-400 border border-purple-500/20 font-black">
                  Câu hỏi {revengeIndex + 1}/3
                </span>
              </div>

              {revengeCompleted ? (
                <div className="text-center py-6 space-y-4">
                  <div className="text-5xl">⚡</div>
                  <h4 className="font-bold text-white text-lg">
                    {revengeWrongCount === 0 ? '🏆 HOÀN HẢO! +50 XP THƯỞNG' : 'THÀNH CÔNG! +20 XP THƯỞNG'}
                  </h4>
                  <p className="text-sm text-gray-400">Bạn đã hoàn thành thử thách nâng cao từ AI.</p>
                  <button onClick={() => setRevengeActive(false)} className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl font-bold text-sm text-white">
                    Đóng thử thách
                  </button>
                </div>
              ) : revengeQuestions[revengeIndex] ? (
                <div>
                  <div className="bg-white/5 rounded-2xl p-5 border border-white/5 mb-5 text-base font-bold text-white leading-relaxed">
                    <MathText>{revengeQuestions[revengeIndex].content}</MathText>
                  </div>
                  <div className="space-y-2.5">
                    {revengeQuestions[revengeIndex].answers.map((ans, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRevengeAnswer(idx)}
                        className="w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:border-purple-500/30 hover:bg-purple-950/10 text-left font-medium text-gray-300 transition-all"
                      >
                        {String.fromCharCode(65 + idx)}. <MathText>{ans}</MathText>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  // SCREEN 3: Active Gameplay Loop
  const league = getLeagueInfo(arenaProfile?.elo_rating || 1000);
  const charClass = arenaProfile?.avatar_class || 'scholar';

  return (
    <div className="max-w-2xl mx-auto pb-12 px-4 bg-[#030712] text-gray-100 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden min-h-[85vh]">
      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slide { animation: slideIn 0.3s ease-out forwards; }
        .glass-hud { background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.05); }
        .glow-heart { filter: drop-shadow(0 0 4px rgba(244, 63, 94, 0.5)); }
      `}</style>

      {/* Ambient glowing dot */}
      <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full opacity-[0.03] blur-[90px] pointer-events-none bg-indigo-500"></div>

      {/* Header HUD */}
      <div className="flex items-center justify-between py-4 border-b border-white/5 mb-5 relative z-10">
        <button onClick={handleRestart} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="h-4 w-4" /> Thoát
        </button>

        {/* Lives */}
        <div className="flex items-center gap-1">
          {[...Array(maxLives)].map((_, i) => (
            <Heart 
              key={i} 
              className={`h-5 w-5 transition-all duration-300 ${i < lives ? 'text-rose-500 fill-rose-500 glow-heart' : 'text-gray-700'}`} 
            />
          ))}
        </div>

        {/* ELO League badge */}
        <div className={`px-3 py-1 rounded-full font-bold text-[10px] flex items-center gap-1 border ${league.border} ${league.bg}`}>
          <span>{league.badge}</span> {league.name}
        </div>
      </div>

      {/* Mastery Progress Bar */}
      <div className="mb-6 relative z-10">
        <div className="flex justify-between items-center text-xs mb-1.5">
          <span className="font-black text-gray-400 uppercase tracking-wider">Làm chủ Chuyên đề: {selectedTopic}</span>
          <span className="text-amber-400 font-black">{masteryScore}% Mastery</span>
        </div>
        <div className="h-3.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-500 ease-out" 
            style={{ width: `${masteryScore}%` }}
          />
        </div>
      </div>

      {/* VioEdu Difficulty Level Indicator & Combo HUD */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative z-10">
        <div className="glass-hud rounded-xl p-3 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-indigo-400" />
          <div>
            <p className="text-[9px] text-gray-500 uppercase font-black">Mức độ thích ứng</p>
            <p className="text-xs font-black text-indigo-300">
              {currentDifficulty === 4 ? 'Mức nâng cao' : currentDifficulty === 3 ? 'Mức 3' : currentDifficulty === 2 ? 'Mức 2' : 'Mức 1'}
            </p>
          </div>
        </div>

        <div className="glass-hud rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 animate-pulse" />
            <div>
              <p className="text-[9px] text-gray-500 uppercase font-black">Chuỗi lên cấp</p>
              <p className="text-xs font-black text-amber-300">{consecutiveCorrect}/3 câu đúng</p>
            </div>
          </div>
          {streakCombo >= 2 && (
            <span className="text-xs font-black bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-lg text-orange-400 animate-bounce">
              🔥 Combo x{streakCombo >= 4 ? 3.0 : streakCombo === 3 ? 2.0 : 1.5}
            </span>
          )}
        </div>
      </div>

      {/* Active Skill & Buff Panel */}
      <div className="mb-5 relative z-10 flex gap-2">
        <button
          onClick={handleActivateSkill}
          disabled={skillUsed || showResult}
          className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
            skillUsed 
              ? 'border-white/5 bg-white/5 text-gray-500 cursor-not-allowed' 
              : showResult
                ? 'border-white/5 bg-white/5 text-gray-400 cursor-not-allowed'
                : 'border-purple-500/30 bg-purple-950/20 text-purple-300 hover:border-purple-500/50 hover:bg-purple-950/40 active:scale-[0.98]'
          }`}
        >
          {charClass === 'scholar' && (
            <>
              <BookOpen className="h-4.5 w-4.5" />
              <span className="text-xs font-bold">📖 Kỹ năng Scholar: 50/50</span>
            </>
          )}
          {charClass === 'scientist' && (
            <>
              <Clock className="h-4.5 w-4.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="text-xs font-bold">🔬 Kỹ năng Scientist: +15 Giây</span>
            </>
          )}
          {charClass === 'artist' && (
            <>
              <Shield className="h-4.5 w-4.5" />
              <span className="text-xs font-bold">🎨 Kỹ năng Artist: Khiên bảo vệ</span>
            </>
          )}
          {charClass === 'explorer' && (
            <>
              <Heart className="h-4.5 w-4.5 text-rose-500" />
              <span className="text-xs font-bold">🌍 Kỹ năng Explorer: Sơ Cứu (+1 ❤️)</span>
            </>
          )}
          {skillUsed && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-gray-500">Đã dùng</span>}
        </button>
        {shieldActive && (
          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-1.5 text-xs font-black animate-pulse">
            <ShieldCheck className="h-4.5 w-4.5" /> Khiên bảo vệ đang kích hoạt
          </div>
        )}
      </div>

      {/* Timer Bar */}
      {currentQ && !showResult && (
        <div className="mb-5 relative z-10">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full rounded-full transition-all duration-1000 ease-linear" 
              style={{ 
                width: `${(timer / 30) * 100}%`, 
                backgroundColor: timer > 15 ? '#10b981' : timer > 5 ? '#f59e0b' : '#ef4444' 
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-bold">
            <span>⏱️ Còn {timer} giây</span>
            <span>Thời gian đếm ngược</span>
          </div>
        </div>
      )}

      {/* Main Question Display */}
      {aiGeneratingFallback ? (
        <div className="py-12 text-center text-amber-500 font-bold animate-pulse flex flex-col items-center justify-center gap-2 relative z-10 bg-[#080d16] border border-white/5 rounded-2xl">
          <Clock className="h-8 w-8 animate-spin" />
          <p>AI đang biên soạn câu hỏi thích ứng tiếp theo...</p>
        </div>
      ) : currentQ ? (
        <div className="animate-slide relative z-10">
          {/* Question Stem */}
          <div className="bg-[#080d16] border border-white/5 rounded-2xl p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-0.5 rounded-full text-[10px] font-black uppercase">
                {selectedSubject === 'math' ? '📐 Toán' : selectedSubject === 'science' ? '🔬 Khoa học' : '💻 Công nghệ'}
              </span>
              <span className="text-[10px] font-black text-gray-500">
                Difficulty: {currentQ.difficulty}/3
              </span>
            </div>
            <div className="text-lg font-bold text-white leading-relaxed">
              <MathText>{currentQ.content}</MathText>
            </div>
            {hint && !showResult && (
              <div className="mt-4 border-t border-white/5 pt-3">
                <details className="group cursor-pointer select-none">
                  <summary className="text-xs font-black text-indigo-400 hover:text-indigo-300 flex items-center gap-1 outline-none">
                    <span>💡 Xem gợi ý cách làm</span>
                  </summary>
                  <div className="text-xs text-gray-400 mt-2 pl-4 border-l border-indigo-500/30 leading-relaxed">
                    <MathText>{hint}</MathText>
                  </div>
                </details>
              </div>
            )}
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {currentQ.answers.map((answer, idx) => {
              const isEliminated = eliminatedOptions.includes(idx);
              let btnStyle = 'border-white/5 bg-white/5 text-gray-300 hover:border-indigo-500/30 hover:bg-indigo-950/10';
              
              if (showResult) {
                if (idx === currentQ.correct_index) {
                  btnStyle = 'border-emerald-500/50 bg-emerald-950/30 text-emerald-300';
                } else if (idx === selectedOption && !isCorrect) {
                  btnStyle = 'border-rose-500/50 bg-rose-950/30 text-rose-300';
                } else {
                  btnStyle = 'border-white/5 bg-white/5 text-gray-600 opacity-40';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showResult || isEliminated}
                  className={`w-full p-4 rounded-xl border text-left font-semibold transition-all flex items-center gap-3 ${btnStyle} ${isEliminated ? 'opacity-20 cursor-not-allowed line-through' : ''}`}
                >
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${showResult && idx === currentQ.correct_index ? 'bg-emerald-500 text-white shadow-md' : showResult && idx === selectedOption && !isCorrect ? 'bg-rose-500 text-white shadow-md' : 'bg-white/10 text-gray-400'}`}>
                    {showResult && idx === currentQ.correct_index ? <CheckCircle className="h-4.5 w-4.5" /> : showResult && idx === selectedOption && !isCorrect ? <XCircle className="h-4.5 w-4.5" /> : String.fromCharCode(65 + idx)}
                  </span>
                  <MathText>{answer}</MathText>
                </button>
              );
            })}
          </div>

          {/* Result card & Next trigger */}
          {showResult && (
            <div className="mt-6 space-y-4 animate-slide">
              <div className={`p-4 rounded-xl border flex items-center gap-3 justify-between ${isCorrect ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400' : 'bg-rose-950/20 border-rose-500/20 text-rose-400'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{isCorrect ? '🎉' : '💔'}</span>
                  <div>
                    <p className="font-black text-sm">
                      {isCorrect ? `Đúng rồi! +${xpGained} XP` : `Làm sai rồi! Mất 1 mạng (Còn ${lives} ❤️)`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {isCorrect ? 'Thăng hạng kiến thức rộng mở!' : 'Mạng sống giữ vững, hãy ôn tập lý thuyết.'}
                    </p>
                  </div>
                </div>
                {!isCorrect && (
                  <button 
                    onClick={handleAskAi}
                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 text-xs font-black flex items-center gap-1 transition-colors"
                  >
                    <Bot className="h-4 w-4" /> Trợ lý AI giải thích
                  </button>
                )}
              </div>

              {/* Quick AI explanation box */}
              {showAiExplanation && (
                <div className="bg-[#080d16] border border-indigo-500/20 rounded-2xl p-5 space-y-3 animate-slide">
                  <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                    <Bot className="h-4.5 w-4.5 text-indigo-400 animate-bounce" />
                    AI Gia Sư giải thích nhanh
                  </h4>
                  {aiLoading ? (
                    <div className="py-4 flex flex-col items-center justify-center text-xs text-indigo-400 font-bold animate-pulse">
                      <Clock className="h-5 w-5 animate-spin mb-1" /> Đang chuẩn bị chẩn đoán lý thuyết...
                    </div>
                  ) : (
                    <div className="text-xs text-gray-300 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                      <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                        {aiExplanation}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* Solution/Explanation */}
              {explanation ? (
                <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-xs">
                  <p className="font-black text-indigo-400">📖 Lời giải chi tiết:</p>
                  <p className="mt-1.5 text-gray-300 leading-relaxed whitespace-pre-wrap"><MathText>{explanation}</MathText></p>
                </div>
              ) : (
                !isCorrect && currentQ.correct_index !== undefined && (
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-xs text-gray-400">
                    <p className="font-black text-gray-300">Lời giải tham chiếu:</p>
                    <p className="mt-1 leading-relaxed"><MathText>{currentQ.answers[currentQ.correct_index]}</MathText></p>
                  </div>
                )
              )}

              <button
                onClick={handleNext}
                className="w-full py-4 rounded-xl font-black text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg shadow-indigo-950/20 transition-all active:scale-[0.99]"
              >
                {isCorrect ? 'Tiếp tục chinh phục →' : 'Làm câu tiếp theo →'}
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
