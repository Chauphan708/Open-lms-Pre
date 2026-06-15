import fs from 'fs';
import pg from 'pg';

const runMigration = async () => {
  // Lấy connection string trực tiếp từ biến môi trường
  const connectionString = process.env.DATABASE_URL || "postgresql://postgres:Chauphan708@db.qukuafjaqkcmcegksovp.supabase.co:5432/postgres";
  const pool = new pg.Pool({ connectionString });
  
  try {
    const migrationSql = fs.readFileSync('sql_migrations/optimize_evaluation_indexes.sql', 'utf-8');
    console.log('Đang thực hiện tối ưu hóa Index...');
    await pool.query(migrationSql);
    console.log('Tạo Composite Index thành công!');
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
