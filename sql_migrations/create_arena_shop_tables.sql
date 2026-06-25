-- Create Arena Shop Items table
CREATE TABLE IF NOT EXISTS public.arena_shop_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  xp_price INT NOT NULL DEFAULT 0,
  elo_price INT NOT NULL DEFAULT 0,
  min_elo_requirement INT NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL,
  effect_type TEXT NOT NULL,
  effect_value INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Arena Inventory table
CREATE TABLE IF NOT EXISTS public.arena_inventory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES public.arena_shop_items(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  is_equipped BOOLEAN DEFAULT FALSE,
  times_used INT DEFAULT 0 CHECK (times_used >= 0),
  purchased_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_student_item UNIQUE (student_id, item_id)
);

-- Enable RLS
ALTER TABLE public.arena_shop_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arena_inventory ENABLE ROW LEVEL SECURITY;

-- RLS for shop items
CREATE POLICY "Anyone authenticated can view shop items"
  ON public.arena_shop_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/Teacher can manage shop items"
  ON public.arena_shop_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid()::text 
      AND role IN ('TEACHER', 'ADMIN')
    )
  );

-- RLS for inventory
CREATE POLICY "Anyone authenticated can view inventory"
  ON public.arena_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Students can insert own inventory"
  ON public.arena_inventory FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = student_id);

CREATE POLICY "Students can update own inventory"
  ON public.arena_inventory FOR UPDATE TO authenticated
  USING (auth.uid()::text = student_id)
  WITH CHECK (auth.uid()::text = student_id);

CREATE POLICY "Students can delete own inventory"
  ON public.arena_inventory FOR DELETE TO authenticated
  USING (auth.uid()::text = student_id);

-- Seed shop items
INSERT INTO public.arena_shop_items (id, name, description, tier, xp_price, elo_price, min_elo_requirement, emoji, effect_type, effect_value)
VALUES
  -- Tier 1
  ('small_hp_potion', 'Bình HP Nhỏ', 'Hồi lại 1 mạng sinh mệnh (trái tim) khi đang leo tháp.', 1, 500, 0, 0, '🧪', 'heal', 1),
  ('hourglass_5s', 'Đồng Hồ Cát (+5s)', 'Cộng thêm 5 giây suy nghĩ cho câu hỏi hiện tại.', 1, 300, 0, 0, '⏱️', 'time_add', 5),
  ('arena_ticket', 'Vé Đấu Trường', 'Vé đăng ký tham gia các giải đấu PvP đặc biệt do Giáo viên tổ chức.', 1, 600, 0, 0, '🎫', 'ticket', 1),
  ('streak_shield', 'Thẻ Bảo Vệ Chuỗi', 'Bảo toàn chuỗi trả lời đúng hiện tại nếu lỡ trả lời sai 1 câu (khi leo tháp).', 1, 800, 0, 0, '🛡️', 'streak_protection', 1),
  
  -- Tier 2
  ('scholar_book', 'Sách Học Giả', 'Nội tại: Tăng vĩnh viễn 10% XP nhận được khi làm bài hoặc leo tháp.', 2, 2500, 0, 1200, '📖', 'xp_boost', 10),
  ('apprentice_shield', 'Khiên Gỗ Tập Sự', 'Nội tại: Giảm 10% sát thương HP nhận phải từ câu hỏi sai đầu tiên trong trận 1v1.', 2, 3000, 0, 1250, '🛡️', 'first_damage_reduction', 10),
  ('nav_compass', 'La Bàn Định Hướng', 'Nội tại: Tăng 15% tỷ lệ xuất hiện câu hỏi dễ ở các tầng tháp cao.', 2, 2200, 0, 1200, '🧭', 'easy_question_rate', 15),
  ('focus_gloves', 'Găng Tay Tập Trung', 'Nội tại: Rút ngắn thời gian chờ chuyển tiếp câu hỏi tự động đi 1 giây.', 2, 3500, 0, 1280, '🧤', 'cooldown_reduction', 1),

  -- Tier 3
  ('wisdom_kaleidoscope', 'Kính Vạn Hoa Trí Tuệ', 'Tự động loại bỏ 1 phương án sai ở tất cả câu hỏi trung bình trở xuống.', 3, 8000, 0, 1400, '🔍', 'remove_wrong_choice', 1),
  ('speed_boots', 'Giày Tốc Độ', 'Trong 1v1: Rút ngắn 2.5 giây thời gian chuyển câu tiếp theo khi trả lời đúng.', 3, 7500, 0, 1450, '⚡', 'speed_boost', 25),
  ('intellect_armor', 'Giáp Trí Tuệ', 'Nội tại: Giảm 20% sát thương HP nhận phải từ mọi câu trả lời sai trong trận 1v1.', 3, 9000, 0, 1420, '🧥', 'damage_reduction', 20),
  ('soul_ring', 'Nhẫn Hút Hồn', 'Nội tại: Mỗi khi đối thủ trả lời sai trong trận 1v1, hồi phục 5% HP tối đa cho bản thân.', 3, 10000, 0, 1480, '💍', 'lifesteal_on_miss', 5),

  -- Tier 4
  ('wisdom_crown', 'Vương Miện Trí Tuệ', 'Nội tại: Tăng 30% sát thương HP lên đối thủ trong 1v1 nếu trả lời đúng dưới 3 giây.', 4, 25000, 250, 1600, '👑', 'fast_answer_dmg', 30),
  ('time_staff', 'Trượng Thời Không', 'Kích hoạt trong 1v1: Đóng băng đồng hồ đối thủ trong 5 giây (1 lần/trận).', 4, 30000, 300, 1650, '🌀', 'freeze_opponent', 5),
  ('ultimate_counter_shield', 'Khiên Phản Đòn Tối Thượng', 'Nội tại: Nếu cả hai cùng sai, bạn không mất HP và phản lại 25% sát thương lên đối thủ.', 4, 28000, 280, 1620, '🛡️', 'counter_attack_both_miss', 25),
  ('illusion_cloak', 'Áo Choàng Ảo Ảnh', 'Nội tại: Ẩn hoàn toàn lượng HP và tiến trình của bạn trong 5 câu đầu tiên của trận 1v1.', 4, 32000, 320, 1680, '🧥', 'stealth_start', 5),

  -- Tier 5
  ('wisdom_chalice', 'Chén Thánh Tri Thức', 'Nội tại: Nhân 3 XP nhận được vĩnh viễn; miễn trừ mất chuỗi khi giải sai câu đầu tiên mỗi ngày.', 5, 80000, 600, 1800, '🏆', 'triple_xp_day_shield', 1),
  ('genesis_staff', 'Quyền Trượng Sáng Thế', 'Kích hoạt trong 1v1: Một lần mỗi trận, hoán đổi câu hỏi sang chuyên đề sở trường nhất.', 5, 95000, 750, 1850, '🔱', 'swap_question_mastery', 1),
  ('infinity_mirror', 'Gương Vô Cực', 'Kích hoạt trong 1v1: Một lần mỗi trận, hoán đổi đáp án đã chọn của đối thủ cho câu hỏi hiện tại.', 5, 100000, 800, 1900, '🪞', 'copy_opponent_choice', 1),
  ('mind_stone', 'Đá Tâm Linh', 'Kích hoạt: Hiển thị trực tiếp đáp án chính xác của câu hỏi hiện tại (1 lần/trận/leo tháp).', 5, 120000, 1000, 1950, '💎', 'reveal_correct_answer', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  tier = EXCLUDED.tier,
  xp_price = EXCLUDED.xp_price,
  elo_price = EXCLUDED.elo_price,
  min_elo_requirement = EXCLUDED.min_elo_requirement,
  emoji = EXCLUDED.emoji,
  effect_type = EXCLUDED.effect_type,
  effect_value = EXCLUDED.effect_value;

-- Secure Transaction Function to Buy Items
CREATE OR REPLACE FUNCTION public.buy_arena_item(p_item_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id TEXT;
  v_xp_price INT;
  v_elo_price INT;
  v_min_elo INT;
  v_student_xp INT;
  v_student_elo INT;
  v_item_name TEXT;
  v_result JSONB;
BEGIN
  -- Get active user ID
  v_student_id := auth.uid()::text;
  IF v_student_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Unauthorized access');
  END IF;

  -- Get item info
  SELECT name, xp_price, elo_price, min_elo_requirement
  INTO v_item_name, v_xp_price, v_elo_price, v_min_elo
  FROM public.arena_shop_items
  WHERE id = p_item_id;

  IF v_item_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Item not found');
  END IF;

  -- Get student current profile
  SELECT total_xp, elo_rating
  INTO v_student_xp, v_student_elo
  FROM public.arena_profiles
  WHERE id = v_student_id;

  IF v_student_xp IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Arena profile not found');
  END IF;

  -- Verify conditions
  IF v_student_elo < v_min_elo THEN
    RETURN jsonb_build_object('success', false, 'message', 'Yêu cầu Elo tối thiểu là ' || v_min_elo);
  END IF;

  IF v_student_xp < v_xp_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không đủ XP (Cần ' || v_xp_price || ' XP)');
  END IF;

  IF v_elo_price > 0 AND v_student_elo <= v_elo_price THEN
    RETURN jsonb_build_object('success', false, 'message', 'Elo quá thấp để khấu trừ (Cần nhiều hơn ' || v_elo_price || ' Elo)');
  END IF;

  -- Deduct XP and Elo from profile
  UPDATE public.arena_profiles
  SET 
    total_xp = total_xp - v_xp_price,
    elo_rating = elo_rating - v_elo_price
  WHERE id = v_student_id;

  -- Insert/update inventory
  INSERT INTO public.arena_inventory (student_id, item_id, quantity, updated_at)
  VALUES (v_student_id, p_item_id, 1, now())
  ON CONFLICT (student_id, item_id) DO UPDATE SET
    quantity = public.arena_inventory.quantity + 1,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Mua thành công ' || v_item_name,
    'new_xp', v_student_xp - v_xp_price,
    'new_elo', v_student_elo - v_elo_price
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
