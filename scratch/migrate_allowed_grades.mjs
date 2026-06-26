import fs from 'fs';
import pg from 'pg';

const runMigration = async () => {
  const connectionString = "postgresql://postgres:Chauphan708@db.qukuafjaqkcmcegksovp.supabase.co:5432/postgres";
  const pool = new pg.Pool({ connectionString });
  
  try {
    const migrationSql = fs.readFileSync('add_allowed_grades.sql', 'utf-8');
    console.log('Đang chạy SQL migration bổ sung cột allowed_grades...');
    await pool.query(migrationSql);
    console.log('Đã cập nhật cấu trúc bảng profiles thành công!');
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
