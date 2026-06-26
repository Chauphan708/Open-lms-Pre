import fs from 'fs';
import pg from 'pg';

const runMigration = async () => {
  const connectionString = "postgresql://postgres:Chauphan708@db.qukuafjaqkcmcegksovp.supabase.co:5432/postgres";
  const pool = new pg.Pool({ connectionString });
  
  try {
    const migrationSql = fs.readFileSync('ai_requests_schema.sql', 'utf-8');
    console.log('Đang chạy SQL migration tạo bảng ai_requests...');
    await pool.query(migrationSql);
    console.log('Đã tạo bảng ai_requests thành công!');
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
