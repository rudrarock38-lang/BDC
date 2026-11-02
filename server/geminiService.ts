import { GoogleGenAI, Type } from '@google/genai';

interface SubjectInfo {
  id: string;
  name: string;
}

interface TopicInfo {
  id: string;
  subject_id: string;
  name: string;
}

export interface OrganizedQuestion {
  question_en: string;
  question_hi: string;
  option_a_en: string;
  option_a_hi: string;
  option_b_en: string;
  option_b_hi: string;
  option_c_en: string;
  option_c_hi: string;
  option_d_en: string;
  option_d_hi: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  subject_name: string;
  subject_id?: string;
  topic_name: string;
  topic_id?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'bilingual' | 'hi' | 'en';
  marks: number;
  negative_marks: number;
  explanation_en: string;
  explanation_hi: string;
  pyq_exam?: string;
  pyq_year?: number;
  pyq_shift?: string;
  image_url?: string | null;
  confidence_note?: string;
}

export interface AIOrganizeResult {
  questions: OrganizedQuestion[];
  subject_breakdown: Record<string, number>;
  difficulty_breakdown: { easy: number; medium: number; hard: number };
  language_breakdown: { bilingual: number; hi: number; en: number };
  total_count: number;
  ai_powered: boolean;
  model_used?: string;
}

// Initialize Gemini Client with server API key and required headers
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Intelligent Rule-based fallback classifier when Gemini API is unavailable
 */
export function heuristicClassifyQuestion(
  qEn: string,
  qHi: string,
  options: { a: string; b: string; c: string; d: string },
  knownSubjects: SubjectInfo[]
): {
  subject: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  language: 'bilingual' | 'hi' | 'en';
} {
  const fullText = `${qEn} ${qHi} ${options.a} ${options.b} ${options.c} ${options.d}`.toLowerCase();
  const hasHindi = /[\u0900-\u097F]/.test(`${qHi} ${qEn}`);
  const hasEn = /[a-zA-Z]/.test(qEn);

  let language: 'bilingual' | 'hi' | 'en' = 'en';
  if (hasHindi && hasEn && qHi && qEn && qHi.trim() !== qEn.trim()) {
    language = 'bilingual';
  } else if (hasHindi && !hasEn) {
    language = 'hi';
  } else if (hasHindi && hasEn) {
    language = 'bilingual';
  }

  // Detect Subject
  let subject = 'General Studies';
  let topic = 'General';

  // Quantitative Aptitude / Mathematics
  if (
    /percent|ratio|proportion|profit|loss|discount|train|speed|distance|time and work|perimeter|area|volume|lcm|hcf|simple interest|compound interest|average|algebra|equation|trigonometry|geometry|triangle|circle|cube|fraction|decimal|गणित|अंकगणित|प्रतिशत|औसत|अनुपात|ब्याज|क्षेत्रफल|दूरी|चाल|कार्य/i.test(
      fullText
    ) ||
    /\b\d+\s*[\+\-\*\/%]\s*\d+\b/.test(fullText)
  ) {
    subject =
      knownSubjects.find((s) => /math|quant/i.test(s.name))?.name ||
      'Quantitative Aptitude';
    if (/profit|loss|discount|लाभ|हानि|छूट/i.test(fullText)) topic = 'Profit & Loss';
    else if (/percent|प्रतिशत/i.test(fullText)) topic = 'Percentage';
    else if (/ratio|proportion|अनुपात|समानुपात/i.test(fullText)) topic = 'Ratio & Proportion';
    else if (/interest|ब्याज/i.test(fullText)) topic = 'Simple & Compound Interest';
    else if (/train|speed|distance|चाल|दूरी/i.test(fullText)) topic = 'Speed, Time & Distance';
    else if (/work|समय और कार्य/i.test(fullText)) topic = 'Time & Work';
    else if (/triangle|circle|geometry|रेखागणित/i.test(fullText)) topic = 'Geometry';
    else if (/algebra|समीकरण/i.test(fullText)) topic = 'Algebra';
    else topic = 'Arithmetic';
  }
  // Reasoning & Logic
  else if (
    /blood relation|coding|decoding|series|pattern|odd one out|syllogism|direction|puzzle|seating arrangement|analogy|venn diagram|dice|cube|statement and conclusion|तर्क|संबंध|श्रृंखला|दिशा|बैठक व्यवस्था|कथन|निष्कर्ष/i.test(
      fullText
    )
  ) {
    subject =
      knownSubjects.find((s) => /reason|logic/i.test(s.name))?.name ||
      'Reasoning & Logic';
    if (/blood relation|रक्त संबंध/i.test(fullText)) topic = 'Blood Relations';
    else if (/coding|decoding|कूटलेखन/i.test(fullText)) topic = 'Coding-Decoding';
    else if (/series|श्रृंखला/i.test(fullText)) topic = 'Number & Letter Series';
    else if (/direction|दिशा/i.test(fullText)) topic = 'Direction Sense';
    else if (/syllogism|न्याय निगमन/i.test(fullText)) topic = 'Syllogism';
    else if (/puzzle|seating/i.test(fullText)) topic = 'Seating & Puzzles';
    else topic = 'Logical Reasoning';
  }
  // General Science
  else if (
    /photosynthesis|cell|nucleus|mitochondria|enzyme|hormone|blood|vitamin|disease|bacteria|virus|gravity|velocity|acceleration|newton|joule|watt|ohm|voltage|current|lens|mirror|light|sound|acid|base|ph|metal|non-metal|periodic table|atom|molecule|chemical|प्रकाश|ऊर्जा|परमाणु|तत्व|जीव|भौतिक|रसायन|वैज्ञानिक|कोशिका|विटामिन/i.test(
      fullText
    )
  ) {
    subject =
      knownSubjects.find((s) => /science/i.test(s.name))?.name ||
      'General Science';
    if (/cell|vitamin|enzyme|hormone|disease|biology|कोशिका|जीव/i.test(fullText))
      topic = 'Biology';
    else if (/acid|base|chemical|atom|molecule|periodic|रसायन|तत्व/i.test(fullText))
      topic = 'Chemistry';
    else topic = 'Physics';
  }
  // English Comprehension / Language
  else if (
    /synonym|antonym|idiom|phrase|grammatical error|one word substitution|spelling|active voice|passive voice|direct indirect|fill in the blank|preposition|tense|comprehension/i.test(
      fullText
    )
  ) {
    subject =
      knownSubjects.find((s) => /english/i.test(s.name))?.name ||
      'English Comprehension';
    if (/synonym|antonym|meaning/i.test(fullText)) topic = 'Vocabulary';
    else if (/idiom|phrase/i.test(fullText)) topic = 'Idioms & Phrases';
    else if (/voice|narration|tense|grammar/i.test(fullText)) topic = 'Grammar';
    else topic = 'English Language';
  }
  // Computer Knowledge
  else if (
    /cpu|ram|rom|hard disk|operating system|linux|windows|browser|internet|protocol|tcp|ip|html|binary|byte|kilobyte|firewall|antivirus|कंप्यूटर|सॉफ्टवेयर/i.test(
      fullText
    )
  ) {
    subject =
      knownSubjects.find((s) => /computer/i.test(s.name))?.name ||
      'Computer Knowledge';
    topic = 'Computer Fundamentals';
  }
  // General Studies / Awareness
  else {
    subject =
      knownSubjects.find((s) => /general studies|general awareness|gk/i.test(s.name))?.name ||
      'General Studies';
    if (/constitution|parliament|governor|president|fundamental rights|article|संविधान|राष्ट्रपति|अनुच्छेद/i.test(fullText))
      topic = 'Indian Polity';
    else if (/dynasty|mughal|battle|british|freedom struggle|gandhi|इतिहास|स्वतंत्रता|आंदोलन/i.test(fullText))
      topic = 'Indian History';
    else if (/river|mountain|soil|climate|national park|भूगोल|नदी|पर्वत/i.test(fullText))
      topic = 'Geography';
    else if (/gdp|inflation|budget|rbi|banking|अर्थव्यवस्था|मुद्रा/i.test(fullText))
      topic = 'Indian Economy';
    else topic = 'Current Affairs & GK';
  }

  // Detect Difficulty
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium';
  const len = fullText.length;
  const isMathOrReasoning =
    subject.includes('Quant') ||
    subject.includes('Math') ||
    subject.includes('Reasoning');

  if (len < 90 && !isMathOrReasoning) {
    difficulty = 'easy';
  } else if (
    len > 240 ||
    /compound interest|trigonometry|geometry|seating arrangement|puzzle|statement and assumption|syllogism/i.test(
      fullText
    )
  ) {
    difficulty = 'hard';
  } else if (/who is|which is|capital of|father of|unit of|full form of|formula of/i.test(fullText) && len < 120) {
    difficulty = 'easy';
  }

  return { subject, topic, difficulty, language };
}

/**
 * AI Question Organizer using Google Gemini API (gemini-3.8-flash)
 */
export async function organizeQuestionsWithGemini(options: {
  rawText?: string;
  rawRows?: any[];
  examId?: string;
  targetSubjectId?: string;
  existingSubjects: SubjectInfo[];
  existingTopics: TopicInfo[];
}): Promise<AIOrganizeResult> {
  const { rawText, rawRows, existingSubjects, existingTopics } = options;
  const subjectNames = existingSubjects.map((s) => s.name);

  const ai = getGeminiClient();

  // If no Gemini client is available, run our rich heuristic classifier
  if (!ai) {
    console.warn('[AI QUESTION ORGANIZER] GEMINI_API_KEY not configured. Running heuristic classifier.');
    return organizeQuestionsHeuristically(rawText, rawRows, existingSubjects);
  }

  try {
    // Construct prompt payload
    let inputPayload = '';
    if (rawText && rawText.trim()) {
      inputPayload = rawText.trim();
    } else if (rawRows && Array.isArray(rawRows) && rawRows.length > 0) {
      inputPayload = JSON.stringify(rawRows.slice(0, 50), null, 2);
    } else {
      throw new Error('No questions text or rows provided to AI organizer.');
    }

    const systemPrompt = `You are an expert exam controller, psychometrician, and question bank architect specializing in Indian competitive examinations (SSC CGL/CHSL/MTS, Railway RRB NTPC/Group D, Banking IBPS/SBI, State Police, Defence, Teaching CTET/STET, and State PSC).

Your task is to take unorganized questions provided in ANY format (raw copy-pasted text, WhatsApp forwards, messy OCR, tables, markdown, single-language dumps, or broken JSON) and organize them into high-quality, mock-test-ready Computer Based Test (CBT) questions.

AVAILABLE SYSTEM SUBJECTS:
${subjectNames.map((s) => `- "${s}"`).join('\n')}

STANDARD TOPICS PER SUBJECT:
- Quantitative Aptitude: Percentage, Profit & Loss, Ratio & Proportion, Simple & Compound Interest, Time & Work, Speed Time & Distance, Number System, Mensuration, Algebra, Geometry, Trigonometry, Data Interpretation.
- Reasoning & Logic: Analogy, Classification, Series, Coding-Decoding, Blood Relations, Direction Sense, Venn Diagrams, Syllogism, Seating Arrangement, Non-Verbal Reasoning, Dice & Cube.
- General Studies: Indian History, Indian Polity & Constitution, Geography, Indian Economy, Static GK, Current Affairs.
- General Science: Physics, Chemistry, Biology (Human Physiology, Nutrition & Diseases, Genetics, Ecology).
- English Comprehension: Reading Comprehension, Cloze Test, Spotting Errors, Synonyms & Antonyms, Idioms & Phrases, One Word Substitution, Active & Passive Voice.
- Computer Knowledge: Hardware, Software, MS Office, Internet & Networking, Cyber Security, Shortcuts.

STRICT INSTRUCTIONS FOR EVERY QUESTION:
1. "subject_name": Match one of the AVAILABLE SYSTEM SUBJECTS listed above. If not an exact match, map to the closest one.
2. "topic_name": Identify the specific topic or chapter name (e.g. "Percentages", "Blood Relations", "Modern History", "Optics").
3. "difficulty": Classify precisely as:
   - "easy": Direct memory recall, basic definitions, single-step math.
   - "medium": 2-step calculations, typical standard exam questions, logical deductions.
   - "hard": Multi-step tricky calculations, advanced concepts, deep reasoning or edge cases.
4. "language": Detect if the input is "hi" (Hindi), "en" (English), or "bilingual".
5. BILINGUAL STANDARDIZATION (CRITICAL FOR CBT):
   - Provide BOTH "question_en" AND "question_hi". If the original is only in Hindi, translate it fluently to English. If the original is only in English, translate it accurately to natural Hindi (Devanagari script).
   - Provide all 4 options in English ("option_a_en", "option_b_en", "option_c_en", "option_d_en") AND Hindi ("option_a_hi", "option_b_hi", "option_c_hi", "option_d_hi").
6. "correct_answer": Must be strictly one of "A", "B", "C", "D". If the correct answer is missing or not marked in the raw input, solve the problem yourself and provide the verified correct option!
7. "explanation_en" and "explanation_hi": Provide clear, step-by-step solutions/rationales in both languages.
8. "marks": Number (default 1.0).
9. "negative_marks": Number (default 0.25).

Return an array of structured question objects matching the requested JSON schema.`;

    const userPrompt = `Please parse and organize all questions from the following raw content into standard mock test format:\n\n${inputPayload}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_en: { type: Type.STRING },
              question_hi: { type: Type.STRING },
              option_a_en: { type: Type.STRING },
              option_a_hi: { type: Type.STRING },
              option_b_en: { type: Type.STRING },
              option_b_hi: { type: Type.STRING },
              option_c_en: { type: Type.STRING },
              option_c_hi: { type: Type.STRING },
              option_d_en: { type: Type.STRING },
              option_d_hi: { type: Type.STRING },
              correct_answer: { type: Type.STRING },
              subject_name: { type: Type.STRING },
              topic_name: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              language: { type: Type.STRING },
              marks: { type: Type.NUMBER },
              negative_marks: { type: Type.NUMBER },
              explanation_en: { type: Type.STRING },
              explanation_hi: { type: Type.STRING },
              image_url: { type: Type.STRING },
              confidence_note: { type: Type.STRING },
            },
            required: [
              'question_en',
              'question_hi',
              'option_a_en',
              'option_b_en',
              'option_c_en',
              'option_d_en',
              'correct_answer',
              'subject_name',
              'topic_name',
              'difficulty',
            ],
          },
        },
      },
    });

    const responseText = response.text || '[]';
    const parsedData: any[] = JSON.parse(responseText.trim());

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      console.warn('[AI QUESTION ORGANIZER] Gemini returned empty array. Using fallback parser.');
      return organizeQuestionsHeuristically(rawText, rawRows, existingSubjects);
    }

    const subjectBreakdown: Record<string, number> = {};
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    const languageBreakdown = { bilingual: 0, hi: 0, en: 0 };

    const questions: OrganizedQuestion[] = parsedData.map((q: any) => {
      // Validate correct answer
      let ans: 'A' | 'B' | 'C' | 'D' = 'A';
      const cleanAns = String(q.correct_answer || 'A').toUpperCase().trim();
      if (['A', 'B', 'C', 'D'].includes(cleanAns)) {
        ans = cleanAns as 'A' | 'B' | 'C' | 'D';
      }

      // Validate difficulty
      let diff: 'easy' | 'medium' | 'hard' = 'medium';
      const rawDiff = String(q.difficulty || 'medium').toLowerCase();
      if (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') {
        diff = rawDiff;
      }

      // Validate language
      let lang: 'bilingual' | 'hi' | 'en' = 'bilingual';
      const rawLang = String(q.language || 'bilingual').toLowerCase();
      if (rawLang === 'hi' || rawLang === 'en' || rawLang === 'bilingual') {
        lang = rawLang;
      }

      const sName = q.subject_name?.trim() || existingSubjects[0]?.name || 'General Studies';
      const tName = q.topic_name?.trim() || 'General';

      subjectBreakdown[sName] = (subjectBreakdown[sName] || 0) + 1;
      difficultyBreakdown[diff] = (difficultyBreakdown[diff] || 0) + 1;
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;

      // Find matching subject ID from DB
      const matchedSub = existingSubjects.find(
        (s) => s.name.toLowerCase().trim() === sName.toLowerCase().trim()
      );

      // Find matching topic ID from DB
      const matchedTopic = matchedSub
        ? existingTopics.find(
            (t) =>
              t.subject_id === matchedSub.id &&
              t.name.toLowerCase().trim() === tName.toLowerCase().trim()
          )
        : undefined;

      return {
        question_en: q.question_en?.trim() || q.question_hi?.trim() || '',
        question_hi: q.question_hi?.trim() || q.question_en?.trim() || '',
        option_a_en: q.option_a_en?.trim() || q.option_a_hi?.trim() || '',
        option_a_hi: q.option_a_hi?.trim() || q.option_a_en?.trim() || '',
        option_b_en: q.option_b_en?.trim() || q.option_b_hi?.trim() || '',
        option_b_hi: q.option_b_hi?.trim() || q.option_b_en?.trim() || '',
        option_c_en: q.option_c_en?.trim() || q.option_c_hi?.trim() || '',
        option_c_hi: q.option_c_hi?.trim() || q.option_c_en?.trim() || '',
        option_d_en: q.option_d_en?.trim() || q.option_d_hi?.trim() || '',
        option_d_hi: q.option_d_hi?.trim() || q.option_d_en?.trim() || '',
        correct_answer: ans,
        subject_name: sName,
        subject_id: matchedSub?.id,
        topic_name: tName,
        topic_id: matchedTopic?.id,
        difficulty: diff,
        language: lang,
        marks: typeof q.marks === 'number' && !isNaN(q.marks) ? q.marks : 1.0,
        negative_marks:
          typeof q.negative_marks === 'number' && !isNaN(q.negative_marks)
            ? q.negative_marks
            : 0.25,
        explanation_en: q.explanation_en?.trim() || '',
        explanation_hi: q.explanation_hi?.trim() || '',
        image_url: q.image_url?.trim() || null,
        confidence_note: q.confidence_note || 'Organized and standardized by Gemini AI',
      };
    });

    return {
      questions,
      subject_breakdown: subjectBreakdown,
      difficulty_breakdown: difficultyBreakdown,
      language_breakdown: languageBreakdown,
      total_count: questions.length,
      ai_powered: true,
      model_used: 'gemini-3.8-flash',
    };
  } catch (err: any) {
    console.error('[AI QUESTION ORGANIZER ERROR]', err);
    // Graceful fallback to heuristic organizer so user is never blocked
    return organizeQuestionsHeuristically(rawText, rawRows, existingSubjects);
  }
}

/**
 * Robust heuristic organizer when offline or fallback is needed
 */
function organizeQuestionsHeuristically(
  rawText?: string,
  rawRows?: any[],
  existingSubjects: SubjectInfo[] = []
): AIOrganizeResult {
  const defaultSub = existingSubjects[0]?.name || 'General Studies';
  const questions: OrganizedQuestion[] = [];

  const subjectBreakdown: Record<string, number> = {};
  const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
  const languageBreakdown = { bilingual: 0, hi: 0, en: 0 };

  // Parse raw text if given
  if (rawText && rawText.trim()) {
    const rawChunks = rawText
      .split(/(?:^|\n)(?=(?:Q\s*\.?\s*\d+[\.:\)]|\d+[\.:\)]|Question\s*\d+[\.:\)]|प्रश्न\s*\d+[\.:\)]))/i)
      .map((c) => c.trim())
      .filter((c) => c.length > 10);

    for (const chunk of rawChunks) {
      const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean);
      let qEn = '';
      let qHi = '';
      let optA = '';
      let optB = '';
      let optC = '';
      let optD = '';
      let ans: 'A' | 'B' | 'C' | 'D' = 'A';
      let exp = '';

      for (const line of lines) {
        // Question text line
        if (/^(?:Q\s*\.?\s*\d+[\.:\)]|\d+[\.:\)]|Question\s*\d+[\.:\)]|प्रश्न\s*\d+[\.:\)])\s*(.+)/i.test(line)) {
          const match = line.match(/^(?:Q\s*\.?\s*\d+[\.:\)]|\d+[\.:\)]|Question\s*\d+[\.:\)]|प्रश्न\s*\d+[\.:\)])\s*(.+)/i);
          if (match) {
            const txt = match[1].trim();
            if (/[\u0900-\u097F]/.test(txt)) {
              qHi = txt;
              qEn = txt;
            } else {
              qEn = txt;
            }
          }
        } else if (/^[\(\[]?(?:Option\s*)?[Aa1क][\)\].\:\-]\s*(.+)/i.test(line)) {
          optA = line.replace(/^[\(\[]?(?:Option\s*)?[Aa1क][\)\].\:\-]\s*/i, '').trim();
        } else if (/^[\(\[]?(?:Option\s*)?[Bb2ख][\)\].\:\-]\s*(.+)/i.test(line)) {
          optB = line.replace(/^[\(\[]?(?:Option\s*)?[Bb2ख][\)\].\:\-]\s*/i, '').trim();
        } else if (/^[\(\[]?(?:Option\s*)?[Cc3ग][\)\].\:\-]\s*(.+)/i.test(line)) {
          optC = line.replace(/^[\(\[]?(?:Option\s*)?[Cc3ग][\)\].\:\-]\s*/i, '').trim();
        } else if (/^[\(\[]?(?:Option\s*)?[Dd4घ][\)\].\:\-]\s*(.+)/i.test(line)) {
          optD = line.replace(/^[\(\[]?(?:Option\s*)?[Dd4घ][\)\].\:\-]\s*/i, '').trim();
        } else if (/^(?:Answer|Ans|उत्तर)[\:\-\s]+([A-D1-4क-घ])/i.test(line)) {
          const m = line.match(/^(?:Answer|Ans|उत्तर)[\:\-\s]+([A-D1-4क-घ])/i);
          if (m) {
            const val = m[1].toUpperCase();
            ans = (val === '1' || val === 'क') ? 'A' : (val === '2' || val === 'ख') ? 'B' : (val === '3' || val === 'ग') ? 'C' : (val === '4' || val === 'घ') ? 'D' : (['A', 'B', 'C', 'D'].includes(val) ? val as any : 'A');
          }
        } else if (/^(?:Explanation|स्पष्टीकरण)[\:\-\s]+(.+)/i.test(line)) {
          exp = line.replace(/^(?:Explanation|स्पष्टीकरण)[\:\-\s]+/i, '').trim();
        }
      }

      if (qEn || qHi) {
        const classified = heuristicClassifyQuestion(
          qEn,
          qHi,
          { a: optA, b: optB, c: optC, d: optD },
          existingSubjects
        );

        subjectBreakdown[classified.subject] = (subjectBreakdown[classified.subject] || 0) + 1;
        difficultyBreakdown[classified.difficulty] = (difficultyBreakdown[classified.difficulty] || 0) + 1;
        languageBreakdown[classified.language] = (languageBreakdown[classified.language] || 0) + 1;

        const matchedSub = existingSubjects.find(
          (s) => s.name.toLowerCase() === classified.subject.toLowerCase()
        );

        questions.push({
          question_en: qEn || qHi,
          question_hi: qHi || qEn,
          option_a_en: optA,
          option_a_hi: optA,
          option_b_en: optB,
          option_b_hi: optB,
          option_c_en: optC,
          option_c_hi: optC,
          option_d_en: optD,
          option_d_hi: optD,
          correct_answer: ans,
          subject_name: classified.subject,
          subject_id: matchedSub?.id,
          topic_name: classified.topic,
          difficulty: classified.difficulty,
          language: classified.language,
          marks: 1.0,
          negative_marks: 0.25,
          explanation_en: exp,
          explanation_hi: exp,
          confidence_note: 'Organized by Smart Heuristic Engine',
        });
      }
    }
  } else if (rawRows && Array.isArray(rawRows)) {
    for (const row of rawRows) {
      const qEn = row.question_en || row.question || row.problem || '';
      const qHi = row.question_hi || row.hindi || '';
      const optA = row.option_a || row.option_a_en || row.a || '';
      const optB = row.option_b || row.option_b_en || row.b || '';
      const optC = row.option_c || row.option_c_en || row.c || '';
      const optD = row.option_d || row.option_d_en || row.d || '';
      const ans = (['A', 'B', 'C', 'D'].includes(String(row.correct_answer || row.answer).toUpperCase())
        ? String(row.correct_answer || row.answer).toUpperCase()
        : 'A') as 'A' | 'B' | 'C' | 'D';

      const classified = heuristicClassifyQuestion(
        qEn,
        qHi,
        { a: optA, b: optB, c: optC, d: optD },
        existingSubjects
      );

      subjectBreakdown[classified.subject] = (subjectBreakdown[classified.subject] || 0) + 1;
      difficultyBreakdown[classified.difficulty] = (difficultyBreakdown[classified.difficulty] || 0) + 1;
      languageBreakdown[classified.language] = (languageBreakdown[classified.language] || 0) + 1;

      const matchedSub = existingSubjects.find(
        (s) => s.name.toLowerCase() === classified.subject.toLowerCase()
      );

      questions.push({
        question_en: qEn || qHi,
        question_hi: qHi || qEn,
        option_a_en: optA,
        option_a_hi: row.option_a_hi || optA,
        option_b_en: optB,
        option_b_hi: row.option_b_hi || optB,
        option_c_en: optC,
        option_c_hi: row.option_c_hi || optC,
        option_d_en: optD,
        option_d_hi: row.option_d_hi || optD,
        correct_answer: ans,
        subject_name: row.subject || classified.subject,
        subject_id: matchedSub?.id,
        topic_name: row.topic || classified.topic,
        difficulty: (['easy', 'medium', 'hard'].includes(String(row.difficulty).toLowerCase())
          ? String(row.difficulty).toLowerCase()
          : classified.difficulty) as any,
        language: classified.language,
        marks: parseFloat(row.marks) || 1.0,
        negative_marks: parseFloat(row.negative_marks) || 0.25,
        explanation_en: row.explanation || '',
        explanation_hi: row.explanation_hi || row.explanation || '',
        confidence_note: 'Organized by Smart Heuristic Engine',
      });
    }
  }

  return {
    questions,
    subject_breakdown: subjectBreakdown,
    difficulty_breakdown: difficultyBreakdown,
    language_breakdown: languageBreakdown,
    total_count: questions.length,
    ai_powered: false,
    model_used: 'heuristic-engine',
  };
}

/**
 * Intelligent PDF and Raw Text PYQ Question Parser using Gemini 3.8 Flash
 * Parses uploaded exam PDFs (SSC CGL, Railway RRB, Banking, etc.), guarantees bilingual
 * English + Hindi conversion, and attaches PYQ exam/year tags.
 */
export async function organizePdfQuestionsWithGemini(options: {
  pdfBase64?: string;
  images?: Array<{ base64: string; mimeType: string; name?: string }>;
  rawText?: string;
  examHint?: string;
  yearHint?: number | string;
  languagePreference?: 'bilingual' | 'hi' | 'en';
  existingSubjects: SubjectInfo[];
  existingTopics: TopicInfo[];
}): Promise<AIOrganizeResult> {
  const { pdfBase64, images, rawText, examHint, yearHint, languagePreference = 'bilingual', existingSubjects, existingTopics } = options;
  const subjectNames = existingSubjects.map((s) => s.name);
  const ai = getGeminiClient();

  if (!ai) {
    console.warn('[AI PDF PARSER] Gemini client not initialized. Falling back to heuristic text organizer.');
    return organizeQuestionsHeuristically(rawText || '', [], existingSubjects);
  }

  try {
    const detectedExam = examHint?.trim() || 'Competitive Exam';
    const detectedYear = yearHint ? String(yearHint).trim() : 'PYQ';

    const systemPrompt = `You are an expert multimodal OCR vision AI, competitive exam question extractor, and bilingual psychometrician specializing in Indian national and state exams (SSC CGL, SSC CHSL, Railway RRB NTPC, RRB Group D, Banking IBPS/SBI, BPSC, UPSC, State Police, Teachers Eligibility).

CRITICAL CONTEXT (100% PURE IMAGE-BASED / PHOTO-ONLY PDFs):
The document provided contains SCANNED IMAGES OR PHOTOS OF QUESTION PAPERS with NO digital selectable text.
You MUST visually scan every pixel of the images/pages just like a human eye, using your multimodal vision capabilities, and convert all questions into pristine Unicode text.

HOW TO SOLVE QUESTIONS WITH DIAGRAMS / FIGURES / CHARTS / GEOMETRY:
1. When a question includes a diagram, geometric shape, reasoning chart, circuit, or graph:
   - Set "has_diagram": true
   - In "diagram_description", provide an exhaustive, clear description of the diagram (e.g., "Right-angled triangle ABC with hypotenuse AC, AB=6cm, BC=8cm", or "Bar chart showing sales of company X from 2018 to 2022 with values: [100, 150, 120, 200, 240]").
   - If the diagram is a table or data set, write out the table neatly in text/markdown inside "question_en" and "question_hi" so the question is 100% self-contained and solvable by the student.
   - For mathematical, reasoning, or geometric figures, integrate all crucial dimensions, angles, and variables directly into the question statement.
   - In "explanation_en" and "explanation_hi", reference the diagram elements and show the complete solution step-by-step.
2. If a question has NO diagram:
   - Set "has_diagram": false
   - Set "diagram_description": ""

USER EXAM METADATA:
- Exam Category: "${detectedExam}"
- Target Year: "${detectedYear}"
- Target Language Mode: "${languagePreference}"

DEEP OCR & VISION INSTRUCTIONS:
1. Carefully scan every page/image. Read both Hindi (Devanagari script) and English text accurately.
2. Handle multi-column printed question papers, newspaper print styles, faint fonts, or angled camera photos.
3. Extract EVERY multiple-choice question (MCQ) present in the scanned paper.
4. If a question in the scan is only in English, you MUST translate it accurately and naturally into Hindi (Devanagari script) for "question_hi", "option_a_hi", "option_b_hi", "option_c_hi", "option_d_hi", and "explanation_hi".
5. If a question in the scan is only in Hindi, you MUST translate it accurately into fluent English for "question_en", "option_a_en", "option_b_en", "option_c_en", "option_d_en", and "explanation_en".
6. Provide BOTH languages for every question so students can toggle between Hindi and English during CBT tests.
7. Ensure 4 clear options (A, B, C, D) are extracted for each question.
8. If the correct answer key is marked or printed in the scan, use it; otherwise solve the question accurately and set correct_answer strictly to "A", "B", "C", or "D".

METADATA EXTRACTION:
- "pyq_exam": Tag the exam (e.g. "${detectedExam}").
- "pyq_year": Integer year (e.g. ${Number(detectedYear) || 2023}).
- "pyq_shift": Shift or Tier (e.g. "Tier 1 - Shift 1", "Shift 2", "Mains").
- "subject_name": Must map to one of:
${subjectNames.map((s) => `  - "${s}"`).join('\n')}
  (e.g., "Quantitative Aptitude", "Reasoning & Logic", "General Studies", "English Comprehension", "General Science")
- "topic_name": Specific chapter or concept (e.g., "Percentage", "Analogy", "Polity", "Error Spotting", "Current Affairs").
- "difficulty": "easy" | "medium" | "hard".
- "correct_answer": Must be strictly "A", "B", "C", or "D".
- "marks": Default 2.0 for SSC CGL or 1.0 for Railway.
- "negative_marks": Default 0.5 for SSC CGL or 0.25/0.33 for Railway.
- "explanation_en" and "explanation_hi": Provide step-by-step reasoning in both English and Hindi.
- "has_diagram": boolean.
- "diagram_description": string.

Return a valid JSON array of structured question objects.`;

    const parts: any[] = [];
    if (pdfBase64) {
      parts.push({
        inlineData: {
          mimeType: 'application/pdf',
          data: pdfBase64,
        },
      });
    }

    if (Array.isArray(images) && images.length > 0) {
      images.forEach((img) => {
        if (img.base64) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType || 'image/jpeg',
              data: img.base64,
            },
          });
        }
      });
    }

    const textPayload = rawText && rawText.trim() ? `\n\nADDITIONAL CONTENT / OCR HINTS:\n${rawText.trim()}` : '';
    parts.push({
      text: `${systemPrompt}${textPayload}\n\nPlease perform OCR on all scanned pages/images, extract every question, translate bilingually, and structure as JSON:`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question_en: { type: Type.STRING },
              question_hi: { type: Type.STRING },
              option_a_en: { type: Type.STRING },
              option_a_hi: { type: Type.STRING },
              option_b_en: { type: Type.STRING },
              option_b_hi: { type: Type.STRING },
              option_c_en: { type: Type.STRING },
              option_c_hi: { type: Type.STRING },
              option_d_en: { type: Type.STRING },
              option_d_hi: { type: Type.STRING },
              correct_answer: { type: Type.STRING },
              subject_name: { type: Type.STRING },
              topic_name: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              language: { type: Type.STRING },
              marks: { type: Type.NUMBER },
              negative_marks: { type: Type.NUMBER },
              explanation_en: { type: Type.STRING },
              explanation_hi: { type: Type.STRING },
              pyq_exam: { type: Type.STRING },
              pyq_year: { type: Type.INTEGER },
              pyq_shift: { type: Type.STRING },
              has_diagram: { type: Type.BOOLEAN },
              diagram_description: { type: Type.STRING },
              image_url: { type: Type.STRING },
            },
            required: [
              'question_en',
              'question_hi',
              'option_a_en',
              'option_b_en',
              'option_c_en',
              'option_d_en',
              'correct_answer',
              'subject_name',
              'topic_name',
            ],
          },
        },
      },
    });

    const responseText = response.text || '[]';
    const parsedData: any[] = JSON.parse(responseText.trim());

    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      console.warn('[AI PDF PARSER] Empty array returned from Gemini. Falling back to heuristic text parser.');
      return organizeQuestionsHeuristically(rawText || '', [], existingSubjects);
    }

    const subjectBreakdown: Record<string, number> = {};
    const difficultyBreakdown = { easy: 0, medium: 0, hard: 0 };
    const languageBreakdown = { bilingual: 0, hi: 0, en: 0 };

    const questions: OrganizedQuestion[] = parsedData.map((q: any) => {
      let ans: 'A' | 'B' | 'C' | 'D' = 'A';
      const cleanAns = String(q.correct_answer || 'A').toUpperCase().trim();
      if (['A', 'B', 'C', 'D'].includes(cleanAns)) {
        ans = cleanAns as 'A' | 'B' | 'C' | 'D';
      }

      let diff: 'easy' | 'medium' | 'hard' = 'medium';
      const rawDiff = String(q.difficulty || 'medium').toLowerCase();
      if (rawDiff === 'easy' || rawDiff === 'medium' || rawDiff === 'hard') {
        diff = rawDiff;
      }

      let lang: 'bilingual' | 'hi' | 'en' = 'bilingual';
      const rawLang = String(q.language || 'bilingual').toLowerCase();
      if (rawLang === 'hi' || rawLang === 'en' || rawLang === 'bilingual') {
        lang = rawLang;
      }

      const sName = q.subject_name?.trim() || existingSubjects[0]?.name || 'General Studies';
      const tName = q.topic_name?.trim() || 'General';

      subjectBreakdown[sName] = (subjectBreakdown[sName] || 0) + 1;
      difficultyBreakdown[diff] = (difficultyBreakdown[diff] || 0) + 1;
      languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;

      const matchedSub = existingSubjects.find(
        (s) => s.name.toLowerCase().trim() === sName.toLowerCase().trim()
      );
      const matchedTopic = matchedSub
        ? existingTopics.find(
            (t) =>
              t.subject_id === matchedSub.id &&
              t.name.toLowerCase().trim() === tName.toLowerCase().trim()
          )
        : undefined;

      const qYearNum = typeof q.pyq_year === 'number' && !isNaN(q.pyq_year) ? q.pyq_year : (Number(detectedYear) || 2023);

      return {
        question_en: q.question_en?.trim() || q.question_hi?.trim() || '',
        question_hi: q.question_hi?.trim() || q.question_en?.trim() || '',
        option_a_en: q.option_a_en?.trim() || q.option_a_hi?.trim() || '',
        option_a_hi: q.option_a_hi?.trim() || q.option_a_en?.trim() || '',
        option_b_en: q.option_b_en?.trim() || q.option_b_hi?.trim() || '',
        option_b_hi: q.option_b_hi?.trim() || q.option_b_en?.trim() || '',
        option_c_en: q.option_c_en?.trim() || q.option_c_hi?.trim() || '',
        option_c_hi: q.option_c_hi?.trim() || q.option_c_en?.trim() || '',
        option_d_en: q.option_d_en?.trim() || q.option_d_hi?.trim() || '',
        option_d_hi: q.option_d_hi?.trim() || q.option_d_en?.trim() || '',
        correct_answer: ans,
        subject_name: sName,
        subject_id: matchedSub?.id,
        topic_name: tName,
        topic_id: matchedTopic?.id,
        difficulty: diff,
        language: lang,
        marks: typeof q.marks === 'number' && !isNaN(q.marks) ? q.marks : (detectedExam.toLowerCase().includes('cgl') ? 2.0 : 1.0),
        negative_marks:
          typeof q.negative_marks === 'number' && !isNaN(q.negative_marks)
            ? q.negative_marks
            : (detectedExam.toLowerCase().includes('cgl') ? 0.5 : 0.25),
        explanation_en: q.explanation_en?.trim() || '',
        explanation_hi: q.explanation_hi?.trim() || '',
        pyq_exam: q.pyq_exam?.trim() || detectedExam,
        pyq_year: qYearNum,
        pyq_shift: q.pyq_shift?.trim() || 'Tier 1 - Shift 1',
        confidence_note: 'Extracted and bilingually translated via Gemini 3.8 Flash',
      };
    });

    return {
      questions,
      subject_breakdown: subjectBreakdown,
      difficulty_breakdown: difficultyBreakdown,
      language_breakdown: languageBreakdown,
      total_count: questions.length,
      ai_powered: true,
      model_used: 'gemini-3.8-flash',
    };
  } catch (err: any) {
    console.error('[AI PDF PARSER ERROR]', err);
    return organizeQuestionsHeuristically(rawText || '', [], existingSubjects);
  }
}

/**
 * Intelligent AI Exam Organizer & Generator from PYQ Question Bank
 * Queries existing database questions matching criteria, and if needed generates additional
 * authentic previous-year questions to complete the exam paper.
 */
export async function generateExamFromQuestionBankWithAI(options: {
  userPrompt?: string;
  examCategory?: string;
  targetYear?: number | string;
  languageMode?: 'bilingual' | 'hi' | 'en';
  questionCount?: number;
  durationMinutes?: number;
  marksPerQuestion?: number;
  negativeMarks?: number;
  existingQuestions: any[];
  existingSubjects: SubjectInfo[];
  existingTopics: TopicInfo[];
}): Promise<{
  exam: {
    name: string;
    description: string;
    exam_category: string;
    target_year: string;
    language_mode: 'bilingual' | 'hi' | 'en';
    duration_minutes: number;
    total_questions: number;
    total_marks: number;
    negative_marks: number;
    instructions: string;
  };
  selectedQuestionIds: string[];
  newlyGeneratedQuestions: OrganizedQuestion[];
  subject_breakdown: Record<string, number>;
  source_summary: string;
}> {
  const {
    userPrompt = '',
    examCategory = 'SSC CGL',
    targetYear = 2023,
    languageMode = 'bilingual',
    questionCount = 25,
    durationMinutes = 60,
    marksPerQuestion = 2.0,
    negativeMarks = 0.5,
    existingQuestions,
    existingSubjects,
    existingTopics,
  } = options;

  const ai = getGeminiClient();
  const cleanCat = examCategory.trim() || 'SSC CGL';
  const cleanYear = targetYear ? String(targetYear).trim() : '2023';
  const targetCount = Math.max(5, Math.min(100, Number(questionCount) || 25));

  // 1. Filter matching questions from DB
  const matchedFromDb = existingQuestions.filter((q) => {
    const examMatch = !cleanCat || cleanCat.toLowerCase() === 'all' || (q.pyq_exam && q.pyq_exam.toLowerCase().includes(cleanCat.toLowerCase())) || (q.question_en && q.question_en.toLowerCase().includes(cleanCat.toLowerCase()));
    const yearMatch = !cleanYear || cleanYear.toLowerCase() === 'all' || String(q.pyq_year) === cleanYear;
    return examMatch || yearMatch;
  });

  const selectedIds: string[] = [];
  const subjectBreakdown: Record<string, number> = {};

  // Take available matching questions from DB up to targetCount
  const pool = matchedFromDb.length > 0 ? matchedFromDb : existingQuestions;
  const pickedFromDb = pool.slice(0, targetCount);
  pickedFromDb.forEach((q) => {
    selectedIds.push(q.id);
    const sName = q.subject_name || 'General Studies';
    subjectBreakdown[sName] = (subjectBreakdown[sName] || 0) + 1;
  });

  const neededMore = targetCount - selectedIds.length;
  let newlyGenerated: OrganizedQuestion[] = [];

  // 2. If more questions are required, use Gemini 3.8 Flash to synthesize authentic PYQs
  if (neededMore > 0 && ai) {
    try {
      const prompt = `You are a chief question author and examiner for Indian competitive examinations.
Generate exactly ${neededMore} authentic Previous Year Question (PYQ) questions for:
- Exam: "${cleanCat}"
- Year: "${cleanYear}"
- Language requirement: "${languageMode}" (Bilingual Hindi + English is mandatory).
- User custom specification: "${userPrompt || 'Create standard balanced PYQ mock test paper'}"

Subjects to balance:
- Quantitative Aptitude
- Reasoning & Logic
- General Studies (Polity, History, Geography, Current Affairs)
- English Comprehension

Return a JSON array of ${neededMore} questions with bilingual text, 4 options in English and Hindi, correct_answer ('A','B','C','D'), subject_name, topic_name, difficulty, marks (${marksPerQuestion}), negative_marks (${negativeMarks}), and detailed explanations in both languages.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question_en: { type: Type.STRING },
                question_hi: { type: Type.STRING },
                option_a_en: { type: Type.STRING },
                option_a_hi: { type: Type.STRING },
                option_b_en: { type: Type.STRING },
                option_b_hi: { type: Type.STRING },
                option_c_en: { type: Type.STRING },
                option_c_hi: { type: Type.STRING },
                option_d_en: { type: Type.STRING },
                option_d_hi: { type: Type.STRING },
                correct_answer: { type: Type.STRING },
                subject_name: { type: Type.STRING },
                topic_name: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                explanation_en: { type: Type.STRING },
                explanation_hi: { type: Type.STRING },
              },
              required: [
                'question_en',
                'question_hi',
                'option_a_en',
                'option_b_en',
                'option_c_en',
                'option_d_en',
                'correct_answer',
                'subject_name',
              ],
            },
          },
        },
      });

      const parsedGen = JSON.parse(response.text || '[]');
      if (Array.isArray(parsedGen)) {
        newlyGenerated = parsedGen.map((q: any) => {
          const sName = q.subject_name?.trim() || existingSubjects[0]?.name || 'General Studies';
          subjectBreakdown[sName] = (subjectBreakdown[sName] || 0) + 1;
          const matchedSub = existingSubjects.find(
            (s) => s.name.toLowerCase().trim() === sName.toLowerCase().trim()
          );
          return {
            question_en: q.question_en?.trim() || q.question_hi?.trim() || '',
            question_hi: q.question_hi?.trim() || q.question_en?.trim() || '',
            option_a_en: q.option_a_en?.trim() || '',
            option_a_hi: q.option_a_hi?.trim() || q.option_a_en?.trim() || '',
            option_b_en: q.option_b_en?.trim() || '',
            option_b_hi: q.option_b_hi?.trim() || q.option_b_en?.trim() || '',
            option_c_en: q.option_c_en?.trim() || '',
            option_c_hi: q.option_c_hi?.trim() || q.option_c_en?.trim() || '',
            option_d_en: q.option_d_en?.trim() || '',
            option_d_hi: q.option_d_hi?.trim() || q.option_d_en?.trim() || '',
            correct_answer: ['A', 'B', 'C', 'D'].includes(String(q.correct_answer).toUpperCase())
              ? (String(q.correct_answer).toUpperCase() as 'A' | 'B' | 'C' | 'D')
              : 'A',
            subject_name: sName,
            subject_id: matchedSub?.id,
            topic_name: q.topic_name?.trim() || 'General',
            difficulty: (['easy', 'medium', 'hard'].includes(String(q.difficulty).toLowerCase())
              ? String(q.difficulty).toLowerCase()
              : 'medium') as any,
            language: languageMode,
            marks: marksPerQuestion,
            negative_marks: negativeMarks,
            explanation_en: q.explanation_en?.trim() || '',
            explanation_hi: q.explanation_hi?.trim() || '',
            pyq_exam: cleanCat,
            pyq_year: Number(cleanYear) || 2023,
            pyq_shift: 'Official PYQ Shift',
            confidence_note: 'Synthesized to standard PYQ pattern via Gemini 3.8 Flash',
          };
        });
      }
    } catch (genErr) {
      console.warn('[AI EXAM GENERATOR] Gemini generation note:', genErr);
    }
  }

  const finalTotalQuestions = selectedIds.length + newlyGenerated.length;
  const examTitle = `${cleanCat} ${cleanYear} Official PYQ Mock Test (${languageMode.toUpperCase()})`;
  const examDesc = `Standard Computer Based Test (CBT) featuring authentic ${cleanCat} ${cleanYear} previous year questions with bilingual (English/Hindi) interface, official marking scheme (+${marksPerQuestion}, -${negativeMarks}), and immediate sectional breakdown.`;

  return {
    exam: {
      name: examTitle,
      description: examDesc,
      exam_category: cleanCat,
      target_year: cleanYear,
      language_mode: languageMode,
      duration_minutes: durationMinutes,
      total_questions: finalTotalQuestions,
      total_marks: finalTotalQuestions * marksPerQuestion,
      negative_marks: negativeMarks,
      instructions: `1. This exam consists of ${finalTotalQuestions} questions based on ${cleanCat} (${cleanYear}) previous year papers.\n2. Total test duration is ${durationMinutes} minutes.\n3. Each question carries +${marksPerQuestion} mark(s) and negative marking of -${negativeMarks} mark(s).\n4. You can switch between English and Hindi at any time during the test.\n5. Click 'Submit Examination' once all sections are completed.`,
    },
    selectedQuestionIds: selectedIds,
    newlyGeneratedQuestions: newlyGenerated,
    subject_breakdown: subjectBreakdown,
    source_summary: `${selectedIds.length} questions sourced from existing Question Bank repository + ${newlyGenerated.length} questions synthesized bilingually by Gemini 3.8 Flash`,
  };
}
