import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

async function runCheck() {
  console.log("=================================================================");
  console.log("      QUY TRÌNH KIỂM TRA TOÀN DIỆN DỰ ÁN (PROJECT HEALTH CHECK)  ");
  console.log("=================================================================\n");

  // 1. Kiểm tra file .env
  console.log("1. KIỂM TRA BIẾN MÔI TRƯỜNG (.env)...");
  if (!fs.existsSync('.env')) {
    console.error("❌ Thất bại: Không tìm thấy file .env!");
    return;
  }
  const envContent = fs.readFileSync('.env', 'utf-8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL=(.+)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

  if (!urlMatch || !keyMatch) {
    console.error("❌ Thất bại: Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env!");
    return;
  }
  
  const supabaseUrl = urlMatch[1].trim();
  const supabaseKey = keyMatch[1].trim();
  console.log("✅ File .env tồn tại.");
  console.log(`   - URL: ${supabaseUrl}`);
  console.log(`   - Key: ${supabaseKey.substring(0, 8)}...${supabaseKey.slice(-8)}\n`);

  // 2. Kiểm tra kết nối Supabase và trạng thái các bảng chính
  console.log("2. KIỂM TRA KẾT NỐI VÀ DỮ LIỆU SUPABASE...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const tablesToCheck = [
    'profiles',
    'classes',
    'exams',
    'attempts',
    'arena_profiles',
    'arena_questions',
    'arena_matches',
    'system_settings'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error(`❌ Bảng [${table}]: Lỗi truy vấn - ${error.message}`);
      } else {
        console.log(`✅ Bảng [${table}]: OK (Tổng số dòng: ${count})`);
      }
    } catch (err) {
      console.error(`❌ Bảng [${table}]: Lỗi kết nối - ${err.message}`);
    }
  }
  console.log("");

  // 3. Kiểm tra các tệp cấu hình quan trọng của dự án
  console.log("3. KIỂM TRA CẤU HÌNH DỰ ÁN...");
  const filesToCheck = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.js'
  ];

  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      console.log(`✅ File [${file}] tồn tại.`);
    } else {
      console.warn(`⚠️ Cảnh báo: Không tìm thấy file [${file}]`);
    }
  }
  console.log("\n=========================================================");
  console.log("               HOÀN THÀNH QUY TRÌNH KIỂM TRA             ");
  console.log("=========================================================");
}

runCheck().catch(err => {
  console.error("Đã xảy ra lỗi trong quá trình kiểm tra:", err);
});
