import { getDb, persistDb } from '../server/db';

async function main() {
  const db = await getDb();

  // 1. Move science questions from sub-01 to sub-02 (General Science)
  const stmt = db.prepare('SELECT id, question_en FROM questions WHERE subject_id = "sub-01"');
  const toMove: string[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { id: string; question_en: string };
    if (/planet|vitamin|chemical|water|substance|temperature|pressure|mammal|photosynthesis|metal|blood|cell|solar system|organ|acid|enzyme/i.test(row.question_en)) {
      toMove.push(row.id);
    }
  }
  stmt.free();

  console.log(`Reclassifying ${toMove.length} science questions from sub-01 to sub-02 (General Science)`);
  for (const id of toMove) {
    db.run('UPDATE questions SET subject_id = "sub-02" WHERE id = ?', [id]);
  }

  // 2. Add 10 math questions for Quantitative Aptitude (sub-03)
  const mathQuestions = [
    {
      id: 'q-math-001',
      code: 'QMATH01',
      q_en: 'If 12 men can complete a work in 8 days, how many days will 16 men take to complete the same work?',
      q_hi: 'यदि 12 पुरुष एक कार्य को 8 दिनों में पूरा कर सकते हैं, तो 16 पुरुष उसी कार्य को कितने दिनों में पूरा करेंगे?',
      a_en: '5 days', a_hi: '5 दिन',
      b_en: '6 days', b_hi: '6 दिन',
      c_en: '7 days', c_hi: '7 दिन',
      d_en: '8 days', d_hi: '8 दिन',
      ans: 'B',
      exp: 'Using M1 * D1 = M2 * D2: 12 * 8 = 16 * D2 => D2 = 96 / 16 = 6 days.'
    },
    {
      id: 'q-math-002',
      code: 'QMATH02',
      q_en: 'The ratio of two numbers is 3:4 and their LCM is 180. What is the smaller number?',
      q_hi: 'दो संख्याओं का अनुपात 3:4 है और उनका लघुत्तम समापवर्त्य (LCM) 180 है। छोटी संख्या क्या है?',
      a_en: '36', a_hi: '36',
      b_en: '40', b_hi: '40',
      c_en: '45', c_hi: '45',
      d_en: '60', d_hi: '60',
      ans: 'C',
      exp: 'Let numbers be 3x and 4x. LCM = 12x = 180 => x = 15. Smaller number = 3 * 15 = 45.'
    },
    {
      id: 'q-math-003',
      code: 'QMATH03',
      q_en: 'A train traveling at 72 km/h crosses a 200 m long platform in 22 seconds. What is the length of the train?',
      q_hi: '72 किमी/घंटे की गति से चल रही एक रेलगाड़ी 200 मीटर लंबे प्लेटफॉर्म को 22 सेकंड में पार करती है। रेलगाड़ी की लंबाई कितनी है?',
      a_en: '240 m', a_hi: '240 मी',
      b_en: '220 m', b_hi: '220 मी',
      c_en: '260 m', c_hi: '260 मी',
      d_en: '250 m', d_hi: '250 मी',
      ans: 'A',
      exp: 'Speed = 72 * (5/18) = 20 m/s. Total distance = 20 * 22 = 440 m. Train length = 440 - 200 = 240 m.'
    },
    {
      id: 'q-math-004',
      code: 'QMATH04',
      q_en: 'If a principal amount becomes double in 5 years at simple interest, what is the annual rate of interest?',
      q_hi: 'यदि कोई मूलधन साधारण ब्याज पर 5 वर्षों में दोगुना हो जाता है, तो ब्याज की वार्षिक दर क्या है?',
      a_en: '15%', a_hi: '15%',
      b_en: '18%', b_hi: '18%',
      c_en: '25%', c_hi: '25%',
      d_en: '20%', d_hi: '20%',
      ans: 'D',
      exp: 'SI = P in 5 years. Rate R = (SI * 100) / (P * T) = (P * 100) / (P * 5) = 20%.'
    },
    {
      id: 'q-math-005',
      code: 'QMATH05',
      q_en: 'The average age of 5 students is 14 years. If a teacher\'s age is included, the average becomes 18 years. What is the teacher\'s age?',
      q_hi: '5 छात्रों की औसत आयु 14 वर्ष है। यदि शिक्षक की आयु भी शामिल कर ली जाए, तो औसत 18 वर्ष हो जाता है। शिक्षक की आयु क्या है?',
      a_en: '34 years', a_hi: '34 वर्ष',
      b_en: '38 years', b_hi: '38 वर्ष',
      c_en: '40 years', c_hi: '40 वर्ष',
      d_en: '42 years', d_hi: '42 वर्ष',
      ans: 'B',
      exp: 'Sum for 5 students = 5 * 14 = 70. Sum for 6 persons = 6 * 18 = 108. Teacher\'s age = 108 - 70 = 38 years.'
    },
    {
      id: 'q-math-006',
      code: 'QMATH06',
      q_en: 'What is the value of (15% of 400) + (25% of 240)?',
      q_hi: '(400 का 15%) + (240 का 25%) का मान क्या है?',
      a_en: '110', a_hi: '110',
      b_en: '115', b_hi: '115',
      c_en: '120', c_hi: '120',
      d_en: '125', d_hi: '125',
      ans: 'C',
      exp: '15% of 400 = 60; 25% of 240 = 60; 60 + 60 = 120.'
    },
    {
      id: 'q-math-007',
      code: 'QMATH07',
      q_en: 'The perimeter of a square is 48 cm. What is its area in sq cm?',
      q_hi: 'एक वर्ग का परिमाप 48 सेमी है। इसका क्षेत्रफल वर्ग सेमी में क्या होगा?',
      a_en: '144 sq cm', a_hi: '144 वर्ग सेमी',
      b_en: '196 sq cm', b_hi: '196 वर्ग सेमी',
      c_en: '121 sq cm', c_hi: '121 वर्ग सेमी',
      d_en: '169 sq cm', d_hi: '169 वर्ग सेमी',
      ans: 'A',
      exp: 'Side of square = 48 / 4 = 12 cm. Area = 12 * 12 = 144 sq cm.'
    },
    {
      id: 'q-math-008',
      code: 'QMATH08',
      q_en: 'A car covers a distance of 180 km in 3 hours. What is its speed in m/s?',
      q_hi: 'एक कार 3 घंटे में 180 किमी की दूरी तय करती है। इसकी गति मीटर/सेकंड में क्या होगी?',
      a_en: '15 m/s', a_hi: '15 मी/से',
      b_en: '16.67 m/s', b_hi: '16.67 मी/से',
      c_en: '20 m/s', c_hi: '20 मी/से',
      d_en: '25 m/s', d_hi: '25 मी/से',
      ans: 'B',
      exp: 'Speed = 180 / 3 = 60 km/h. In m/s: 60 * (5/18) = 16.67 m/s.'
    },
    {
      id: 'q-math-009',
      code: 'QMATH09',
      q_en: 'If x + 1/x = 4, what is the value of x² + 1/x²?',
      q_hi: 'यदि x + 1/x = 4 है, तो x² + 1/x² का मान क्या होगा?',
      a_en: '16', a_hi: '16',
      b_en: '12', b_hi: '12',
      c_en: '18', c_hi: '18',
      d_en: '14', d_hi: '14',
      ans: 'D',
      exp: '(x + 1/x)² = x² + 1/x² + 2 => 4² = x² + 1/x² + 2 => x² + 1/x² = 16 - 2 = 14.'
    },
    {
      id: 'q-math-010',
      code: 'QMATH010',
      q_en: 'By selling an article for ₹540, a trader loses 10%. At what price should he sell it to gain 20%?',
      q_hi: 'एक वस्तु को ₹540 में बेचने पर एक व्यापारी को 10% की हानि होती है। 20% लाभ प्राप्त करने के लिए उसे इसे किस मूल्य पर बेचना चाहिए?',
      a_en: '₹680', a_hi: '₹680',
      b_en: '₹720', b_hi: '₹720',
      c_en: '₹700', c_hi: '₹700',
      d_en: '₹750', d_hi: '₹750',
      ans: 'B',
      exp: 'Cost Price CP = 540 / 0.9 = ₹600. For 20% profit, Selling Price SP = 600 * 1.2 = ₹720.'
    }
  ];

  for (const q of mathQuestions) {
    db.run(
      `INSERT OR REPLACE INTO questions (
        id, question_id_code, subject_id, difficulty,
        question_en, question_hi,
        option_a_en, option_a_hi,
        option_b_en, option_b_hi,
        option_c_en, option_c_hi,
        option_d_en, option_d_hi,
        correct_answer, marks, negative_marks, explanation, created_at
      ) VALUES (?, ?, 'sub-03', 'medium', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1.0, 0.25, ?, ?)`,
      [
        q.id, q.code,
        q.q_en, q.q_hi,
        q.a_en, q.a_hi,
        q.b_en, q.b_hi,
        q.c_en, q.c_hi,
        q.d_en, q.d_hi,
        q.ans, q.exp,
        new Date().toISOString()
      ]
    );
  }

  // 3. Assign all 10 math questions to the exam "math" (exam-1790230737989)
  db.run('DELETE FROM exam_questions WHERE exam_id = "exam-1790230737989"');
  mathQuestions.forEach((q, idx) => {
    db.run(
      'INSERT INTO exam_questions (id, exam_id, question_id, sort_order) VALUES (?, "exam-1790230737989", ?, ?)',
      [`eq-math-${idx}`, q.id, idx + 1]
    );
  });

  // Update exam parameters
  db.run('UPDATE exams SET subject_id = "sub-03", total_questions = 10, total_marks = 10 WHERE id = "exam-1790230737989"');

  // Reset the previous broken 0-question attempt so student can attempt it fresh
  db.run('DELETE FROM answers WHERE attempt_id = "att-1790230790910--001"');
  db.run('DELETE FROM results WHERE attempt_id = "att-1790230790910--001"');
  db.run('DELETE FROM exam_attempts WHERE id = "att-1790230790910--001"');

  persistDb();
  console.log('Math exam and question seed fixes applied successfully!');
}

main().catch(console.error);
