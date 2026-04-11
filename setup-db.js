/**
 * setup-db.js — One-time database setup script
 * Run with: node setup-db.js
 */
require('dotenv').config();
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');

async function setup() {
  console.log('🔧 Setting up Student Feedback Analyzer database...\n');

  // Connect WITHOUT specifying a database first
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    multipleStatements: true
  });

  console.log('✅ Connected to MySQL successfully!');

  // Read schema.sql and execute it
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  console.log('📋 Running schema.sql...');
  await conn.query(sql);

  console.log('✅ Database "student_feedback_db" created!');
  console.log('✅ Tables "users" and "feedbacks" created!');
  console.log('✅ Feedbacks table ready (starts empty)!');

  // ─── Seed Users with bcrypt-hashed passwords ────────────────────────────
  console.log('\n👤 Seeding user accounts...');

  await conn.query('USE student_feedback_db');

  const adminPwd   = await bcrypt.hash('admin123', 10);
  const teacherPwd = await bcrypt.hash('teacher123', 10);

  const users = [
    // Admin
    { name: 'Admin',          email: 'admin@college.edu',        password: adminPwd,   role: 'admin',   courses: null },
    // Teachers — each with their assigned courses
    { name: 'Dr. Sharma',     email: 'sharma@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['oop', 'dsa']) },
    { name: 'Prof. Mehta',    email: 'mehta@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['oop']) },
    { name: 'Dr. Kapoor',     email: 'kapoor@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['oop', 'dsa']) },
    { name: 'Dr. Rao',        email: 'rao@college.edu',          password: teacherPwd, role: 'teacher', courses: JSON.stringify(['os']) },
    { name: 'Prof. Iyer',     email: 'iyer@college.edu',         password: teacherPwd, role: 'teacher', courses: JSON.stringify(['os']) },
    { name: 'Dr. Nair',       email: 'nair@college.edu',         password: teacherPwd, role: 'teacher', courses: JSON.stringify(['cn']) },
    { name: 'Prof. Singh',    email: 'singh@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['cn']) },
    { name: 'Dr. Joshi',      email: 'joshi@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['cn']) },
    { name: 'Dr. Verma',      email: 'verma@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['aiml', 'ml']) },
    { name: 'Prof. Pandey',   email: 'pandey@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['aiml', 'ml']) },
    { name: 'Dr. Saxena',     email: 'saxena@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['ml']) },
    { name: 'Dr. Gupta',      email: 'gupta@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['dbms']) },
    { name: 'Prof. Reddy',    email: 'reddy@college.edu',        password: teacherPwd, role: 'teacher', courses: JSON.stringify(['dbms']) },
    { name: 'Prof. Mishra',   email: 'mishra@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['dsa']) },
    { name: 'Prof. Thakur',   email: 'thakur@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['se']) },
    { name: 'Dr. Das',        email: 'das@college.edu',          password: teacherPwd, role: 'teacher', courses: JSON.stringify(['se']) },
    { name: 'Dr. Bose',       email: 'bose@college.edu',         password: teacherPwd, role: 'teacher', courses: JSON.stringify(['cc']) },
    { name: 'Prof. Chawla',   email: 'chawla@college.edu',       password: teacherPwd, role: 'teacher', courses: JSON.stringify(['cc']) },
  ];

  for (const u of users) {
    await conn.execute(
      'INSERT INTO users (name, email, password, role, courses) VALUES (?, ?, ?, ?, ?)',
      [u.name, u.email, u.password, u.role, u.courses]
    );
  }

  console.log(`✅ Seeded ${users.length} user accounts!`);
  console.log('   Admin:   admin@college.edu / admin123');
  console.log('   Teachers: <name>@college.edu / teacher123\n');
  console.log('✅ Settings table created with default feedback password: feedback2026');
  console.log('   Admin can change this from the Dashboard.\n');
  console.log('🚀 Setup complete! Now run: node server.js');
  console.log('   Then open: http://localhost:3000\n');

  await conn.end();
}

setup().catch(err => {
  console.error('❌ Setup failed:', err.message);
  console.error('\nTips:');
  console.error('  - Make sure MySQL is running');
  console.error('  - Check DB_USER and DB_PASSWORD in .env');
  process.exit(1);
});
