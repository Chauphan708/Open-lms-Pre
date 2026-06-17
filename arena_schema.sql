-- ============================================
-- EDUQUEST ARENA - Database Schema (v2 - Education Theme)
-- Chạy file này trong Supabase SQL Editor
-- ============================================

-- 1. Arena Profiles (liên kết với profiles hiện tại)
CREATE TABLE IF NOT EXISTS public.arena_profiles (
  id TEXT PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  avatar_class TEXT DEFAULT 'scholar' CHECK (avatar_class IN ('scholar', 'scientist', 'artist', 'explorer')),
  elo_rating INT DEFAULT 1000,
  total_xp INT DEFAULT 0,
  wins INT DEFAULT 0,
  losses INT DEFAULT 0,
  tower_floor INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Arena Questions (bộ câu hỏi riêng Arena - cho import/nhập tay)
CREATE TABLE IF NOT EXISTS public.arena_questions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  content TEXT NOT NULL,
  answers JSONB NOT NULL, -- ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"]
  correct_index INT NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  difficulty INT DEFAULT 1 CHECK (difficulty >= 1 AND difficulty <= 3),
  subject TEXT DEFAULT 'math',
  topic TEXT DEFAULT 'general', -- Chủ đề (VD: 'Phân số', 'Hình học')
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Arena Matches (Trận đấu PvP)
CREATE TABLE IF NOT EXISTS public.arena_matches (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  player1_id TEXT REFERENCES public.profiles(id),
  player2_id TEXT REFERENCES public.profiles(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'challenged', 'playing', 'finished')),
  question_ids TEXT[] DEFAULT '{}',
  current_question INT DEFAULT 0,
  player1_hp INT DEFAULT 100,
  player2_hp INT DEFAULT 100,
  player1_score INT DEFAULT 0,
  player2_score INT DEFAULT 0,
  winner_id TEXT,
  source TEXT DEFAULT 'arena' CHECK (source IN ('exam', 'arena')),
  filter_subject TEXT,
  filter_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Arena Match Events (Realtime broadcast)
CREATE TABLE IF NOT EXISTS public.arena_match_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  match_id TEXT REFERENCES public.arena_matches(id) ON DELETE CASCADE,
  player_id TEXT REFERENCES public.profiles(id),
  event_type TEXT NOT NULL, -- 'answer_correct', 'answer_wrong', 'timeout', 'finish'
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.arena_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena profiles public access" ON public.arena_profiles;
CREATE POLICY "Authenticated read access" ON public.arena_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "User update own profile" ON public.arena_profiles FOR ALL TO authenticated USING (auth.uid()::text = id) WITH CHECK (auth.uid()::text = id);

ALTER TABLE public.arena_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena questions public access" ON public.arena_questions;
DROP POLICY IF EXISTS "Authenticated read access" ON public.arena_questions;
DROP POLICY IF EXISTS "Teacher full access" ON public.arena_questions;
CREATE POLICY "Authenticated read access" ON public.arena_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teacher full access" ON public.arena_questions FOR ALL TO authenticated 
  USING ((SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER'))
  WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()::text) IN ('ADMIN', 'TEACHER'));

ALTER TABLE public.arena_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena matches public access" ON public.arena_matches;
CREATE POLICY "Authenticated read access" ON public.arena_matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Players can update match" ON public.arena_matches FOR ALL TO authenticated USING (auth.uid()::text = player1_id OR auth.uid()::text = player2_id) WITH CHECK (auth.uid()::text = player1_id OR auth.uid()::text = player2_id);

ALTER TABLE public.arena_match_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Arena match events public access" ON public.arena_match_events;
CREATE POLICY "Authenticated read access" ON public.arena_match_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Players create events" ON public.arena_match_events FOR ALL TO authenticated USING (auth.uid()::text = player_id) WITH CHECK (auth.uid()::text = player_id);

-- ============================================
-- REALTIME PUBLICATION
-- ============================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_matches;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arena_match_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- MIGRATION: Nếu đã có bảng cũ, CHẠY ĐOẠN NÀY trong Supabase SQL Editor
-- ============================================

-- Bước 1: Thêm cột mới
ALTER TABLE public.arena_questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT 'general';
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'arena';
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS filter_subject TEXT;
ALTER TABLE public.arena_matches ADD COLUMN IF NOT EXISTS filter_grade TEXT;

-- Bước 2: XÓA CHECK constraint cũ (warrior/mage/archer/healer) và thêm CHECK mới
ALTER TABLE public.arena_profiles DROP CONSTRAINT IF EXISTS arena_profiles_avatar_class_check;
ALTER TABLE public.arena_profiles ADD CONSTRAINT arena_profiles_avatar_class_check
  CHECK (avatar_class IN ('scholar', 'scientist', 'artist', 'explorer'));

-- Bước 3: Đổi default value
ALTER TABLE public.arena_profiles ALTER COLUMN avatar_class SET DEFAULT 'scholar';

-- Bước 4: Cập nhật dữ liệu cũ (nếu có)
UPDATE public.arena_profiles SET avatar_class = 'scholar' WHERE avatar_class = 'warrior';
UPDATE public.arena_profiles SET avatar_class = 'scientist' WHERE avatar_class = 'mage';
UPDATE public.arena_profiles SET avatar_class = 'artist' WHERE avatar_class = 'archer';
UPDATE public.arena_profiles SET avatar_class = 'explorer' WHERE avatar_class = 'healer';

-- Bước 5: Cập nhật CHECK constraint cho arena_matches
ALTER TABLE public.arena_matches DROP CONSTRAINT IF EXISTS arena_matches_status_check;
ALTER TABLE public.arena_matches ADD CONSTRAINT arena_matches_status_check 
  CHECK (status IN ('waiting', 'challenged', 'playing', 'finished'));

ALTER TABLE public.arena_matches DROP CONSTRAINT IF EXISTS arena_matches_source_check;
ALTER TABLE public.arena_matches ADD CONSTRAINT arena_matches_source_check 
  CHECK (source IN ('exam', 'arena'));

-- ============================================
-- SEED DATA: 20 câu hỏi lớp 5 (Kết nối tri thức với cuộc sống)
-- Toán (8 câu) + Khoa học (7 câu) + Công nghệ (5 câu)
-- ============================================

-- === TOÁN LỚP 5 ===
INSERT INTO public.arena_questions (content, answers, correct_index, difficulty, subject, topic) VALUES

-- Phân số & Số thập phân
('Phân số 3/4 viết dưới dạng số thập phân là bao nhiêu?',
 '["0,25", "0,5", "0,75", "0,34"]', 2, 1, 'math', 'Phân số & Số thập phân'),

('Kết quả của phép tính 2/5 + 1/10 bằng bao nhiêu?',
 '["3/15", "1/2", "3/10", "2/10"]', 1, 1, 'math', 'Phân số & Số thập phân'),

('Số thập phân 0,125 viết dưới dạng phân số tối giản là:',
 '["125/100", "1/8", "1/4", "12/100"]', 1, 2, 'math', 'Phân số & Số thập phân'),

-- Hình học
('Diện tích hình thang có đáy lớn 8cm, đáy nhỏ 5cm, chiều cao 4cm là bao nhiêu?',
 '["26 cm²", "52 cm²", "20 cm²", "32 cm²"]', 0, 2, 'math', 'Hình học'),

('Diện tích hình tròn có bán kính 7cm là bao nhiêu? (lấy π ≈ 3,14)',
 '["21,98 cm²", "43,96 cm²", "153,86 cm²", "49 cm²"]', 2, 2, 'math', 'Hình học'),

('Thể tích hình hộp chữ nhật có chiều dài 5cm, chiều rộng 3cm, chiều cao 4cm là:',
 '["12 cm³", "60 cm³", "47 cm³", "30 cm³"]', 1, 1, 'math', 'Hình học'),

-- Tỉ số phần trăm & Vận tốc
('25% của 200 bằng bao nhiêu?',
 '["25", "50", "75", "100"]', 1, 1, 'math', 'Tỉ số phần trăm'),

('Một ô tô đi quãng đường 180km trong 3 giờ. Vận tốc ô tô là bao nhiêu?',
 '["50 km/giờ", "60 km/giờ", "90 km/giờ", "45 km/giờ"]', 1, 1, 'math', 'Vận tốc'),

-- === KHOA HỌC LỚP 5 ===

-- Sự sinh sản
('Trứng của gà nở thành gà con sau khoảng bao nhiêu ngày ấp?',
 '["7 ngày", "14 ngày", "21 ngày", "30 ngày"]', 2, 1, 'science', 'Sự sinh sản'),

('Ở người, thai nhi phát triển trong bụng mẹ khoảng bao lâu?',
 '["6 tháng", "7 tháng", "9 tháng", "12 tháng"]', 2, 1, 'science', 'Sự sinh sản'),

-- Môi trường & Năng lượng
('Nguồn năng lượng nào sau đây là năng lượng tái tạo?',
 '["Than đá", "Dầu mỏ", "Năng lượng mặt trời", "Khí đốt tự nhiên"]', 2, 1, 'science', 'Năng lượng'),

('Tác hại chính của ô nhiễm không khí đối với sức khỏe con người là gì?',
 '["Răng sâu", "Bệnh về đường hô hấp", "Đau chân", "Suy dinh dưỡng"]', 1, 1, 'science', 'Môi trường'),

('Sự biến đổi nào sau đây là sự biến đổi hoá học?',
 '["Nước đá tan thành nước", "Đường hoà tan vào nước", "Sắt bị gỉ", "Xé giấy thành nhiều mảnh"]', 2, 2, 'science', 'Biến đổi chất'),

-- Chuỗi thức ăn & Sinh vật
('Trong chuỗi thức ăn: Cỏ → Châu chấu → Ếch → Rắn, sinh vật nào là sinh vật tiêu thụ bậc 1?',
 '["Cỏ", "Châu chấu", "Ếch", "Rắn"]', 1, 2, 'science', 'Chuỗi thức ăn'),

('Chất nào chiếm phần lớn trong không khí?',
 '["Ôxi", "Nitơ", "Cacbonic", "Hơi nước"]', 1, 1, 'science', 'Không khí'),

-- === CÔNG NGHỆ LỚP 5 ===

('Bộ phận nào của máy tính dùng để xử lý thông tin?',
 '["Màn hình", "Bàn phím", "Bộ xử lý (CPU)", "Chuột"]', 2, 1, 'technology', 'Phần cứng'),

('Phần mềm nào thường được dùng để soạn thảo văn bản?',
 '["Microsoft Excel", "Microsoft Word", "Microsoft PowerPoint", "Paint"]', 1, 1, 'technology', 'Phần mềm'),

('Internet là gì?',
 '["Một phần mềm máy tính", "Mạng kết nối các máy tính trên toàn thế giới", "Một loại máy tính", "Một trò chơi điện tử"]', 1, 1, 'technology', 'Internet'),

('Khi sử dụng máy tính, em nên ngồi cách màn hình ít nhất bao xa?',
 '["20 cm", "50 cm", "1 mét", "2 mét"]', 1, 1, 'technology', 'An toàn'),

('Để tạo một bài trình chiếu (thuyết trình), em nên dùng phần mềm nào?',
 '["Word", "Excel", "PowerPoint", "Paint"]', 2, 1, 'technology', 'Phần mềm');
