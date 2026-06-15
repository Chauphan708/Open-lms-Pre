import fs from 'fs';
import pg from 'pg';

const runMigration = async () => {
  const env = fs.readFileSync('.env', 'utf-8');
  // Lấy connection string từ biến môi trường
  const dbUrlMatch = env.match(/DATABASE_URL=(.+)/);
  if (!dbUrlMatch) {
    console.error('Không tìm thấy DATABASE_URL trong file .env');
    process.exit(1);
  }
  
  const connectionString = dbUrlMatch[1].trim();
  const pool = new pg.Pool({ connectionString });
  
  try {
    const migrationSql = fs.readFileSync('sql_migrations/allow_multiple_daily_evaluations.sql', 'utf-8');
    console.log('Đang thực hiện migration SQL...');
    await pool.query(migrationSql);
    console.log('Thực hiện migration thành công! Đã xóa bỏ constraint unique_record.');
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error);
  } finally {
    await pool.end();
  }
};

runMigration();
