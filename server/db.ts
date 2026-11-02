import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'cbt.sqlite');

let dbInstance: Database | null = null;

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();
  let db: Database;
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  dbInstance = db;
  initSchema(db);
  persistDb();
  return db;
}

export function persistDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist database:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT,
      roll_number TEXT UNIQUE,
      password TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      question_id_code TEXT UNIQUE NOT NULL,
      subject_id TEXT NOT NULL,
      topic_id TEXT,
      difficulty TEXT DEFAULT 'medium',
      question_type TEXT DEFAULT 'mcq',
      question_en TEXT NOT NULL,
      question_hi TEXT,
      option_a_en TEXT NOT NULL,
      option_a_hi TEXT,
      option_b_en TEXT NOT NULL,
      option_b_hi TEXT,
      option_c_en TEXT NOT NULL,
      option_c_hi TEXT,
      option_d_en TEXT NOT NULL,
      option_d_hi TEXT,
      correct_answer TEXT NOT NULL,
      marks REAL DEFAULT 1,
      negative_marks REAL DEFAULT 0.25,
      explanation TEXT,
      image_url TEXT,
      option_a_image_url TEXT,
      option_b_image_url TEXT,
      option_c_image_url TEXT,
      option_d_image_url TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      subject_id TEXT,
      duration_minutes INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      total_marks REAL NOT NULL,
      negative_marks REAL DEFAULT 0.25,
      start_datetime TEXT,
      end_datetime TEXT,
      status TEXT DEFAULT 'draft',
      show_result_immediately INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(subject_id) REFERENCES subjects(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS exam_questions (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      UNIQUE(exam_id, question_id),
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS exam_attempts (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      submit_time TEXT,
      status TEXT DEFAULT 'in_progress',
      remaining_seconds INTEGER NOT NULL,
      tab_switches INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      selected_option TEXT,
      is_marked_for_review INTEGER DEFAULT 0,
      is_visited INTEGER DEFAULT 1,
      updated_at TEXT NOT NULL,
      UNIQUE(attempt_id, question_id),
      FOREIGN KEY(attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY(question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS results (
      id TEXT PRIMARY KEY,
      attempt_id TEXT UNIQUE NOT NULL,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      total_questions INTEGER NOT NULL,
      attempted INTEGER NOT NULL,
      correct INTEGER NOT NULL,
      wrong INTEGER NOT NULL,
      unanswered INTEGER NOT NULL,
      marks_obtained REAL NOT NULL,
      negative_marks_deducted REAL NOT NULL,
      final_score REAL NOT NULL,
      percentage REAL NOT NULL,
      accuracy REAL NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      rank INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(attempt_id) REFERENCES exam_attempts(id) ON DELETE CASCADE,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exam_verifications (
      id TEXT PRIMARY KEY,
      exam_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      verification_status TEXT DEFAULT 'pending',
      verified_at TEXT,
      verified_by TEXT,
      entry_token TEXT,
      desk_notes TEXT,
      seat_number TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(exam_id, student_id),
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS pending_registrations (
      email TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT,
      password TEXT NOT NULL,
      otp TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
  `);

  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('student_reg_otp_enabled', 'true')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('site_name', 'Begusarai Digital Center')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('site_title', 'Begusarai Digital Center CBT Examination Portal')");
  db.run("INSERT OR REPLACE INTO settings (key, value) VALUES ('logo_text', 'BDC BEGUSARAI')");

  // Ensure student profile columns exist in users table
  const profileCols = [
    'dob TEXT',
    'gender TEXT',
    'category TEXT',
    'guardian_name TEXT',
    'address TEXT',
    'qualification TEXT',
    'target_exam TEXT',
    'avatar_url TEXT'
  ];
  for (const col of profileCols) {
    try {
      db.run(`ALTER TABLE users ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure result visibility columns exist
  try {
    db.run(`ALTER TABLE results ADD COLUMN is_published INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE exams ADD COLUMN results_published INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE exam_attempts ADD COLUMN question_order TEXT;`);
  } catch {
    // Column already exists
  }
  const qImgCols = [
    'image_url TEXT',
    'option_a_image_url TEXT',
    'option_b_image_url TEXT',
    'option_c_image_url TEXT',
    'option_d_image_url TEXT'
  ];
  for (const col of qImgCols) {
    try {
      db.run(`ALTER TABLE questions ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure student custom exam allocation and admit card columns exist in users table
  const examAllocationCols = [
    'assigned_exam_id TEXT',
    'seat_number TEXT',
    'admit_card_enabled INTEGER DEFAULT 1'
  ];
  for (const col of examAllocationCols) {
    try {
      db.run(`ALTER TABLE users ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure admit_card_enabled exists on exams and student_assigned_exams
  try {
    db.run(`ALTER TABLE exams ADD COLUMN admit_card_enabled INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE student_assigned_exams ADD COLUMN admit_card_enabled INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }

  // Ensure allow_reattempt and max_attempts exist on exams table
  try {
    db.run(`ALTER TABLE exams ADD COLUMN allow_reattempt INTEGER DEFAULT 1;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`ALTER TABLE exams ADD COLUMN max_attempts INTEGER DEFAULT 0;`);
  } catch {
    // Column already exists
  }

  // Ensure email_verified exists on users table (Firebase Auth email verification)
  try {
    db.run(`ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;`);
  } catch {
    // Column already exists
  }
  try {
    db.run(`UPDATE users SET email_verified = 1 WHERE role = 'admin' OR LOWER(email) = 'rudrarock38@gmail.com' OR password = 'google-auth-protected';`);
  } catch {}

  // Ensure default admit card policy setting exists
  try {
    db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('admit_card_policy', 'custom')");
  } catch {
    // Ignore if exists
  }

  // Ensure PYQ and Examination metadata columns exist on questions table
  const pyqCols = [
    'pyq_exam TEXT',           // e.g. 'SSC CGL', 'RRB NTPC', 'SSC CHSL', 'Banking IBPS', 'BSSC'
    'pyq_year INTEGER',        // e.g. 2024, 2023, 2022, 2021, 2020, 2019, 2018
    'pyq_shift TEXT',          // e.g. 'Tier 1 - Shift 1', 'Mains', 'Shift 2'
    'explanation_hi TEXT',     // Hindi explanation for solutions
    'language_mode TEXT DEFAULT "bilingual"' // 'bilingual', 'hi', 'en'
  ];
  for (const col of pyqCols) {
    try {
      db.run(`ALTER TABLE questions ADD COLUMN ${col};`);
    } catch {
      // Column already exists
    }
  }

  // Ensure exam_category, target_year, language_mode exist on exams table
  const examPyqCols = [
    'exam_category TEXT',      // 'SSC CGL', 'RRB NTPC', etc.
    'target_year TEXT',        // '2023', '2022', etc.
    'language_mode TEXT DEFAULT "bilingual"'
  ];
  for (const col of examPyqCols) {
    try {
      db.run(`ALTER TABLE exams ADD COLUMN ${col};`);
    } catch {}
  }

  // Ensure student_assigned_exams table exists for multi-exam mappings
  db.run(`
    CREATE TABLE IF NOT EXISTS student_assigned_exams (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      exam_id TEXT NOT NULL,
      seat_number TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(student_id, exam_id),
      FOREIGN KEY(student_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(exam_id) REFERENCES exams(id) ON DELETE CASCADE
    );
  `);

  db.run("INSERT OR IGNORE INTO settings (key, value) VALUES ('exam_access_mode', 'custom_or_open')");

  seedDefaultData(db);
}

function seedDefaultData(db: Database) {
  // Check if admin user exists
  const adminCheck = db.exec("SELECT id FROM users WHERE role = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const now = new Date().toISOString();
    // Default Admin
    db.run(
      `INSERT INTO users (id, role, name, email, mobile, roll_number, password, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'admin-001',
        'admin',
        'Head Examiner (Admin)',
        'admin@cbt.com',
        '+91 98765 43210',
        'ADM-1001',
        'admin123',
        'active',
        now
      ]
    );

    // Default Demo Students
    db.run(
      `INSERT INTO users (id, role, name, email, mobile, roll_number, password, status, created_at)
       VALUES 
       ('stud-001', 'student', 'Aarav Sharma', 'student@cbt.com', '+91 98123 45678', 'ROLL-2026-001', 'student123', 'active', ?),
       ('stud-002', 'student', 'Priya Patel', 'priya@cbt.com', '+91 98234 56789', 'ROLL-2026-002', 'student123', 'active', ?),
       ('stud-003', 'student', 'Rohan Verma', 'rohan@cbt.com', '+91 98345 67890', 'ROLL-2026-003', 'student123', 'active', ?)`,
      [now, now, now]
    );

    // Default Settings
    const defaultSettings = [
      ['site_name', 'Begusarai Digital Center'],
      ['site_title', 'Begusarai Digital Center CBT Examination Portal'],
      ['logo_text', 'BDC BEGUSARAI'],
      ['default_duration', '60'],
      ['default_marks', '1'],
      ['default_negative_marks', '0.25'],
      ['result_visibility', 'immediate'],
      ['registration_enabled', 'true'],
      ['require_gate_verification', 'true']
    ];
    for (const [k, v] of defaultSettings) {
      db.run(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`, [k, v]);
    }

    // Default Subjects
    const subjects = [
      ['sub-01', 'General Studies', 'History, Polity, Geography, Economy and Current Affairs'],
      ['sub-02', 'General Science', 'Physics, Chemistry and Biology fundamentals'],
      ['sub-03', 'Quantitative Aptitude', 'Arithmetic, Algebra, Data Interpretation'],
      ['sub-04', 'Reasoning & Logic', 'Logical deduction, coding-decoding, series, puzzles']
    ];
    for (const [id, name, desc] of subjects) {
      db.run(`INSERT INTO subjects (id, name, description, created_at) VALUES (?, ?, ?, ?)`, [id, name, desc, now]);
    }

    // Default Topics
    const topics = [
      ['top-01', 'sub-01', 'Indian Polity & Constitution'],
      ['top-02', 'sub-01', 'Modern Indian History'],
      ['top-03', 'sub-02', 'Physics - Mechanics & Energy'],
      ['top-04', 'sub-02', 'Chemistry - Elements & Compounds'],
      ['top-05', 'sub-03', 'Percentages & Profit Loss'],
      ['top-06', 'sub-04', 'Syllogism & Coding-Decoding']
    ];
    for (const [id, subId, name] of topics) {
      db.run(`INSERT INTO topics (id, subject_id, name, created_at) VALUES (?, ?, ?, ?)`, [id, subId, name, now]);
    }

    // Default bilingual Questions
    const sampleQuestions = [
      {
        id: 'q-001',
        code: 'Q1001',
        subject_id: 'sub-01',
        topic_id: 'top-01',
        difficulty: 'medium',
        q_en: 'Which Article of the Indian Constitution guarantees the Right to Equality before Law?',
        q_hi: 'भारतीय संविधान का कौन सा अनुच्छेद कानून के समक्ष समानता के अधिकार की गारंटी देता है?',
        a_en: 'Article 12',
        a_hi: 'अनुच्छेद 12',
        b_en: 'Article 14',
        b_hi: 'अनुच्छेद 14',
        c_en: 'Article 19',
        c_hi: 'अनुच्छेद 19',
        d_en: 'Article 21',
        d_hi: 'अनुच्छेद 21',
        correct: 'B',
        marks: 1.0,
        neg: 0.25,
        exp: 'Article 14 of the Constitution of India provides for equality before the law or equal protection of the laws within the territory of India.'
      },
      {
        id: 'q-002',
        code: 'Q1002',
        subject_id: 'sub-01',
        topic_id: 'top-01',
        difficulty: 'easy',
        q_en: 'Who is known as the Chief Architect of the Constitution of India?',
        q_hi: 'भारत के संविधान के मुख्य वास्तुकार के रूप में किसे जाना जाता है?',
        a_en: 'Mahatma Gandhi',
        a_hi: 'महात्मा गांधी',
        b_en: 'Dr. B. R. Ambedkar',
        b_hi: 'डॉ. बी. आर. अम्बेडकर',
        c_en: 'Jawaharlal Nehru',
        c_hi: 'जवाहरलाल नेहरू',
        d_en: 'Sardar Vallabhbhai Patel',
        d_hi: 'सरदार वल्लभभाई पटेल',
        correct: 'B',
        marks: 1.0,
        neg: 0.25,
        exp: 'Dr. Bhimrao Ramji Ambedkar served as the chairman of the Drafting Committee of the Constituent Assembly.'
      },
      {
        id: 'q-003',
        code: 'Q1003',
        subject_id: 'sub-02',
        topic_id: 'top-03',
        difficulty: 'medium',
        q_en: 'What is the SI unit of electric resistance?',
        q_hi: 'विद्युत प्रतिरोध का SI मात्रक क्या है?',
        a_en: 'Volt',
        a_hi: 'वोल्ट',
        b_en: 'Ampere',
        b_hi: 'एम्पीयर',
        c_en: 'Ohm',
        c_hi: 'ओम',
        d_en: 'Watt',
        d_hi: 'वाट',
        correct: 'C',
        marks: 1.0,
        neg: 0.25,
        exp: 'The ohm (symbol: Ω) is the SI derived unit of electrical resistance, named after German physicist Georg Simon Ohm.'
      },
      {
        id: 'q-004',
        code: 'Q1004',
        subject_id: 'sub-02',
        topic_id: 'top-04',
        difficulty: 'easy',
        q_en: 'What is the chemical formula for common baking soda?',
        q_hi: 'साधारण बेकिंग सोडा का रासायनिक सूत्र क्या है?',
        a_en: 'NaCl',
        a_hi: 'NaCl',
        b_en: 'NaHCO3',
        b_hi: 'NaHCO3',
        c_en: 'Na2CO3',
        c_hi: 'Na2CO3',
        d_en: 'Ca(OH)2',
        d_hi: 'Ca(OH)2',
        correct: 'B',
        marks: 1.0,
        neg: 0.25,
        exp: 'Sodium bicarbonate, commonly known as baking soda or bicarbonate of soda, is a chemical compound with the formula NaHCO3.'
      },
      {
        id: 'q-005',
        code: 'Q1005',
        subject_id: 'sub-03',
        topic_id: 'top-05',
        difficulty: 'hard',
        q_en: 'A shopkeeper marks an item at 25% above cost price and offers a 10% discount. What is his net profit percentage?',
        q_hi: 'एक दुकानदार किसी वस्तु पर क्रय मूल्य से 25% अधिक मूल्य अंकित करता है और 10% की छूट देता है। उसका शुद्ध लाभ प्रतिशत क्या है?',
        a_en: '12.5%',
        a_hi: '12.5%',
        b_en: '15%',
        b_hi: '15%',
        c_en: '10%',
        c_hi: '10%',
        d_en: '14.2%',
        d_hi: '14.2%',
        correct: 'A',
        marks: 1.0,
        neg: 0.25,
        exp: 'Let CP = 100. MP = 125. Discount = 10% of 125 = 12.5. SP = 125 - 12.5 = 112.5. Profit = 12.5%.'
      },
      {
        id: 'q-006',
        code: 'Q1006',
        subject_id: 'sub-04',
        topic_id: 'top-06',
        difficulty: 'medium',
        q_en: 'If in a certain code, "PENCIL" is written as "QFOEJM", how is "ERASER" written in that code?',
        q_hi: 'यदि किसी निश्चित कूट भाषा में "PENCIL" को "QFOEJM" लिखा जाता है, तो उसी कूट भाषा में "ERASER" को क्या लिखा जाएगा?',
        a_en: 'FSBTFS',
        a_hi: 'FSBTFS',
        b_en: 'DQZRDQ',
        b_hi: 'DQZRDQ',
        c_en: 'FSCTFS',
        c_hi: 'FSCTFS',
        d_en: 'FSBTES',
        d_hi: 'FSBTES',
        correct: 'A',
        marks: 1.0,
        neg: 0.25,
        exp: 'Each letter is shifted by +1 in the alphabet: E->F, R->S, A->B, S->T, E->F, R->S.'
      },
      {
        id: 'q-007',
        code: 'Q1007',
        subject_id: 'sub-01',
        topic_id: 'top-02',
        difficulty: 'easy',
        q_en: 'In which year was the historic Dandi March initiated by Mahatma Gandhi?',
        q_hi: 'महात्मा गांधी द्वारा ऐतिहासिक दांडी मार्च किस वर्ष शुरू किया गया था?',
        a_en: '1920',
        a_hi: '1920',
        b_en: '1930',
        b_hi: '1930',
        c_en: '1942',
        c_hi: '1942',
        d_en: '1919',
        d_hi: '1919',
        correct: 'B',
        marks: 1.0,
        neg: 0.25,
        exp: 'The Salt March, also known as the Dandi March, began on 12 March 1930 from Sabarmati Ashram to Dandi.'
      },
      {
        id: 'q-008',
        code: 'Q1008',
        subject_id: 'sub-02',
        topic_id: 'top-03',
        difficulty: 'medium',
        q_en: 'What phenomenon causes the blue color of the sky during daytime?',
        q_hi: 'दिन के समय आकाश का नीला रंग किस घटना के कारण होता है?',
        a_en: 'Total internal reflection',
        a_hi: 'पूर्ण आंतरिक परावर्तन',
        b_en: 'Rayleigh scattering of light',
        b_hi: 'प्रकाश का रैले प्रकीर्णन',
        c_en: 'Refraction of light',
        c_hi: 'प्रकाश का अपवर्तन',
        d_en: 'Diffraction',
        d_hi: 'विवर्तन',
        correct: 'B',
        marks: 1.0,
        neg: 0.25,
        exp: 'Molecules in Earth atmosphere scatter shorter wavelengths of sunlight (blue and violet) more than other colors, known as Rayleigh scattering.'
      }
    ];

    for (const q of sampleQuestions) {
      db.run(
        `INSERT INTO questions 
         (id, question_id_code, subject_id, topic_id, difficulty, question_type, 
          question_en, question_hi, option_a_en, option_a_hi, option_b_en, option_b_hi, 
          option_c_en, option_c_hi, option_d_en, option_d_hi, correct_answer, marks, 
          negative_marks, explanation, image_url, created_at)
         VALUES (?, ?, ?, ?, ?, 'mcq', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          q.id,
          q.code,
          q.subject_id,
          q.topic_id,
          q.difficulty,
          q.q_en,
          q.q_hi,
          q.a_en,
          q.a_hi,
          q.b_en,
          q.b_hi,
          q.c_en,
          q.c_hi,
          q.d_en,
          q.d_hi,
          q.correct,
          q.marks,
          q.neg,
          q.exp,
          null,
          now
        ]
      );
    }

    // Default Exam 1: Live Mock Exam
    const exam1Id = 'exam-001';
    db.run(
      `INSERT INTO exams 
       (id, name, description, subject_id, duration_minutes, total_questions, total_marks, negative_marks, start_datetime, end_datetime, status, show_result_immediately, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'live', 1, ?)`,
      [
        exam1Id,
        'CBT All-India General Mock Test 2026',
        'Comprehensive mock examination covering General Studies, Science, and Logical Reasoning with realistic competitive exam environment.',
        'sub-01',
        15, // 15 mins for easy testing
        sampleQuestions.length,
        8.0,
        0.25,
        new Date(Date.now() - 3600000).toISOString(),
        new Date(Date.now() + 86400000 * 30).toISOString(),
        now
      ]
    );

    // Link questions to exam
    sampleQuestions.forEach((q, idx) => {
      db.run(
        `INSERT INTO exam_questions (id, exam_id, question_id, sort_order) VALUES (?, ?, ?, ?)`,
        [`eq-${exam1Id}-${idx + 1}`, exam1Id, q.id, idx + 1]
      );
    });

    // Sample pre-existing completed attempt for Priya Patel so Admin Results table has realistic data immediately
    const pastAttemptId = 'att-demo-001';
    const pastStartTime = new Date(Date.now() - 7200000).toISOString();
    const pastSubmitTime = new Date(Date.now() - 6000000).toISOString();
    db.run(
      `INSERT INTO exam_attempts (id, exam_id, student_id, start_time, submit_time, status, remaining_seconds, tab_switches, created_at)
       VALUES (?, ?, ?, ?, ?, 'completed', 0, 0, ?)`,
      [pastAttemptId, exam1Id, 'stud-002', pastStartTime, pastSubmitTime, pastStartTime]
    );

    // Pre-insert answers for past attempt
    const samplePriyaAnswers = [
      ['q-001', 'B'], // correct
      ['q-002', 'B'], // correct
      ['q-003', 'C'], // correct
      ['q-004', 'B'], // correct
      ['q-005', 'B'], // wrong (correct is A)
      ['q-006', 'A'], // correct
      ['q-007', 'B'], // correct
      ['q-008', 'C']  // wrong (correct is B)
    ];

    samplePriyaAnswers.forEach(([qid, ans]) => {
      db.run(
        `INSERT INTO answers (id, attempt_id, question_id, selected_option, is_marked_for_review, is_visited, updated_at)
         VALUES (?, ?, ?, ?, 0, 1, ?)`,
        [`ans-${pastAttemptId}-${qid}`, pastAttemptId, qid, ans, pastStartTime]
      );
    });

    // Result for Priya: 8 questions, 8 attempted, 6 correct (6 marks), 2 wrong (-0.50 marks), final = 5.50 / 8, 68.75%
    db.run(
      `INSERT INTO results 
       (id, attempt_id, exam_id, student_id, total_questions, attempted, correct, wrong, unanswered, marks_obtained, negative_marks_deducted, final_score, percentage, accuracy, time_taken_seconds, rank, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `res-${pastAttemptId}`,
        pastAttemptId,
        exam1Id,
        'stud-002',
        8,
        8,
        6,
        2,
        0,
        6.0,
        0.5,
        5.5,
        68.75,
        75.0,
        1200,
        1,
        pastSubmitTime
      ]
    );
  }
}

// Helper utility functions for running queries safely and returning clean objects
export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(db, sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function execute(db: Database, sql: string, params: any[] = []): void {
  db.run(sql, params);
  persistDb();
}
