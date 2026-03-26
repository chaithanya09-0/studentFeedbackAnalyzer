require('dotenv').config();
const mysql = require('mysql2/promise');
(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'student_feedback_db'
  });
  await c.query('TRUNCATE TABLE feedbacks');
  console.log('✅ All feedback cleared. Database is now empty.');
  await c.end();
})().catch(e => { console.error('Error:', e.message); process.exit(1); });
