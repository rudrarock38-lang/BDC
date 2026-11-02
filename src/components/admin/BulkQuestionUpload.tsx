import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Exam, Subject } from '../../types';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCcw,
  ArrowRight,
  BookOpen,
  Layers,
  Globe,
  Sparkles,
  Check,
  Tag,
  Clock,
  Clipboard,
  Bot,
  Type,
  HelpCircle,
  X,
  Sliders,
  Hash,
  Plus,
  Minus,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Image as ImageIcon,
  ExternalLink,
  Wand2,
  Cpu,
  Zap,
  Trash2,
  Edit3,
  CheckSquare,
  Trophy,
  PlusCircle
} from 'lucide-react';

interface BulkQuestionUploadProps {
  onUploadComplete?: () => void;
  initialExamId?: string;
}

type LanguageMode = 'bilingual' | 'en' | 'hi';
type UploadMode = 'ai' | 'file' | 'paste' | 'quick';

interface SubjectPlan {
  subjectId: string;
  subjectName: string;
  count: number;
  enabled: boolean;
}

interface SubjectBreakdownItem {
  subject_id: string;
  subject_name: string;
  count: number;
  existing_count: number;
  total_after: number;
}

// Smart bilingual text separator (splits English and Hindi simultaneously)
function splitBilingualText(text: string): { en: string; hi: string } {
  if (!text) return { en: '', hi: '' };
  const trimmed = text.trim();

  // If text contains a separator like " / " or " // " or " | "
  const sepMatch = trimmed.match(/^(.*?)\s+(?:\/{1,2}|\|)\s+(.*)$/);
  if (sepMatch) {
    const left = sepMatch[1].trim();
    const right = sepMatch[2].trim();
    const hasHindiLeft = /[\u0900-\u097F]/.test(left);
    const hasHindiRight = /[\u0900-\u097F]/.test(right);
    if (!hasHindiLeft && hasHindiRight) {
      return { en: left, hi: right };
    }
    if (hasHindiLeft && !hasHindiRight) {
      return { en: right, hi: left };
    }
    return { en: left, hi: right };
  }

  // If text itself has Devanagari Hindi characters
  const hasDevanagari = /[\u0900-\u097F]/.test(trimmed);
  if (hasDevanagari) {
    return { en: trimmed, hi: trimmed };
  }

  return { en: trimmed, hi: '' };
}

// Smart text parser for ChatGPT outputs (JSON, CSV, or natural numbered text)
function cleanMarkdownLine(str: string): string {
  if (!str) return '';
  return str
    .replace(/\*\*(.*?)\*\*/g, '$1') // remove bold **
    .replace(/\*(.*?)\*/g, '$1')     // remove italic *
    .replace(/__(.*?)__/g, '$1')     // remove underline __
    .replace(/`(.*?)`/g, '$1')       // remove backticks
    .trim();
}

function parseMarkdownTable(text: string): any[] {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return [];

  // Parse headers
  const headerCells = lines[0]
    .split('|')
    .map((c) => c.trim().toLowerCase().replace(/[\*\_\`]/g, ''))
    .filter(Boolean);

  if (headerCells.length < 4) return [];

  // Skip divider line (e.g. |---|---|)
  const dataLines = lines.slice(1).filter((l) => !/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(l));

  const rows: any[] = [];
  for (const line of dataLines) {
    const cells = line.split('|').slice(1, -1).map((c) => cleanMarkdownLine(c));
    if (cells.length < 4) continue;

    const rowObj: Record<string, string> = {};
    headerCells.forEach((header, idx) => {
      rowObj[header] = cells[idx] || '';
    });
    rows.push(rowObj);
  }
  return rows;
}

function parseChatGPTText(text: string, subjectPlans: SubjectPlan[] = []): any[] {
  let trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Strip surrounding markdown code blocks (e.g. ```csv ... ``` or ```json ... ``` or ``` ... ```)
  const codeBlockRegex = /^```(?:csv|json|text|markdown)?\s*\n?([\s\S]*?)\n?```$/i;
  const matchBlock = trimmed.match(codeBlockRegex);
  if (matchBlock) {
    trimmed = matchBlock[1].trim();
  } else {
    // If multiple code blocks or internal fences, remove any ``` lines
    trimmed = trimmed.replace(/^```[a-z]*\s*$/gim, '').trim();
  }

  // 2. Try parsing JSON array directly
  if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
    try {
      const parsed = JSON.parse(trimmed);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      if (arr.length > 0) return arr;
    } catch (_) {}
  }

  // 3. Try parsing Markdown Table
  if (trimmed.includes('|') && trimmed.includes('\n')) {
    const tableRows = parseMarkdownTable(trimmed);
    if (tableRows.length > 0) return tableRows;
  }

  // 4. Try parsing CSV / TSV text via XLSX
  if (trimmed.includes('\n') && (trimmed.includes(',') || trimmed.includes('\t'))) {
    try {
      const workbook = XLSX.read(trimmed, { type: 'string' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(firstSheet);
      if (json && json.length > 0 && typeof json[0] === 'object') {
        const firstRowKeys = Object.keys(json[0] as object).map((k) => k.toLowerCase());
        const hasQuestionKey = firstRowKeys.some((k) => k.includes('question') || k.includes('प्रश्न') || k.includes('q_'));
        if (hasQuestionKey) {
          return json;
        }
      }
    } catch (_) {}
  }

  // 5. Parse freeform / numbered questions with section headers
  // E.g.
  // ### Subject: Mathematics
  // 1. What is 2 + 2?
  // A) 4
  // B) 3
  // C) 2
  // D) 1
  // Answer: A
  // Explanation: 2 + 2 = 4
  const questions: any[] = [];
  const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean);

  let currentSubject = '';
  let currentTopic = '';
  let activeQuestion: any = null;

  const pushActiveQuestion = () => {
    if (activeQuestion && (activeQuestion.question_en || activeQuestion.question_hi) && 
        (activeQuestion.option_a_en || activeQuestion.option_a_hi || activeQuestion.option_b_en || activeQuestion.option_b_hi)) {
      if (!activeQuestion.correct_answer) activeQuestion.correct_answer = 'A';
      if (!activeQuestion.subject && currentSubject) activeQuestion.subject = currentSubject;
      if (!activeQuestion.topic && currentTopic) activeQuestion.topic = currentTopic;

      // Bidirectional fallbacks so CBT student language switch works seamlessly
      if (!activeQuestion.question_en && activeQuestion.question_hi) activeQuestion.question_en = activeQuestion.question_hi;
      if (!activeQuestion.question_hi && activeQuestion.question_en && /[\u0900-\u097F]/.test(activeQuestion.question_en)) {
        activeQuestion.question_hi = activeQuestion.question_en;
      }

      if (!activeQuestion.option_a_en && activeQuestion.option_a_hi) activeQuestion.option_a_en = activeQuestion.option_a_hi;
      if (!activeQuestion.option_b_en && activeQuestion.option_b_hi) activeQuestion.option_b_en = activeQuestion.option_b_hi;
      if (!activeQuestion.option_c_en && activeQuestion.option_c_hi) activeQuestion.option_c_en = activeQuestion.option_c_hi;
      if (!activeQuestion.option_d_en && activeQuestion.option_d_hi) activeQuestion.option_d_en = activeQuestion.option_d_hi;

      if (!activeQuestion.option_a_hi && activeQuestion.option_a_en && /[\u0900-\u097F]/.test(activeQuestion.option_a_en)) activeQuestion.option_a_hi = activeQuestion.option_a_en;
      if (!activeQuestion.option_b_hi && activeQuestion.option_b_en && /[\u0900-\u097F]/.test(activeQuestion.option_b_en)) activeQuestion.option_b_hi = activeQuestion.option_b_en;
      if (!activeQuestion.option_c_hi && activeQuestion.option_c_en && /[\u0900-\u097F]/.test(activeQuestion.option_c_en)) activeQuestion.option_c_hi = activeQuestion.option_c_en;
      if (!activeQuestion.option_d_hi && activeQuestion.option_d_en && /[\u0900-\u097F]/.test(activeQuestion.option_d_en)) activeQuestion.option_d_hi = activeQuestion.option_d_en;

      questions.push(activeQuestion);
    }
    activeQuestion = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const cleanLine = cleanMarkdownLine(rawLine);

    // Check for Section / Subject Heading (e.g. "### Subject: Mathematics", "Subject: Science", "--- Physics ---")
    const subjectHeaderMatch = cleanLine.match(/^(?:#{1,6}\s*)?(?:Subject|Section|Category|विषय)[\:\-\s]+(.+)/i);
    if (subjectHeaderMatch) {
      pushActiveQuestion();
      currentSubject = subjectHeaderMatch[1].replace(/[\(\[\{].*?[\)\]\}]/g, '').trim();
      continue;
    }

    // Check for Topic Heading (e.g. "Topic: Algebra")
    const topicHeaderMatch = cleanLine.match(/^(?:#{1,6}\s*)?Topic[\:\-\s]+(.+)/i);
    if (topicHeaderMatch) {
      currentTopic = topicHeaderMatch[1].trim();
      continue;
    }

    // Check for question start: "1. ", "Q1.", "Q.1", "1)", "Question 1:", "प्रश्न 1:", etc.
    const qStartMatch = cleanLine.match(/^(?:Q\s*\.?\s*\d+[\.:\)]|\d+[\.:\)]|Question\s*\d+[\.:\)]|प्रश्न\s*\d+[\.:\)])\s*(.+)/i);
    if (qStartMatch) {
      pushActiveQuestion();
      const splitted = splitBilingualText(qStartMatch[1]);
      activeQuestion = {
        question_en: splitted.en,
        question_hi: splitted.hi,
        option_a_en: '',
        option_a_hi: '',
        option_b_en: '',
        option_b_hi: '',
        option_c_en: '',
        option_c_hi: '',
        option_d_en: '',
        option_d_hi: '',
        correct_answer: '',
        explanation: '',
        explanation_hi: '',
        subject: currentSubject || undefined
      };
      continue;
    }

    if (!activeQuestion) {
      // Line might be a loose Subject or Header line without "Subject:" prefix
      const standaloneSubjectMatch = cleanLine.match(/^(?:#{1,4}\s+)([A-Za-z\s&]{3,30})$/);
      if (standaloneSubjectMatch) {
        currentSubject = standaloneSubjectMatch[1].trim();
      }
      continue;
    }

    // Check for separate Hindi question translation line: "प्रश्न: ...", "Question (Hindi): ...", "[Hindi] ..."
    const hindiQMatch = cleanLine.match(/^(?:प्रश्न|Question\s*\(Hindi\)|\[Hindi\]|Hindi|हिन्दी|प्र\.)[\:\-\s]+(.+)/i);
    if (hindiQMatch && activeQuestion && !activeQuestion.option_a_en && !activeQuestion.option_a_hi) {
      activeQuestion.question_hi = hindiQMatch[1].trim();
      continue;
    }

    // Hindi Options matching (e.g. "विकल्प A: ...", "A (Hindi): ...", "Option A (Hindi): ...")
    const aHiMatch = cleanLine.match(/^(?:विकल्प\s*[Aa1क]?|Option\s*[Aa1]\s*\(Hindi\)|A\s*\(Hindi\)|\(Hindi\)\s*A\)?)[\:\-\s]+(.+)/i);
    if (aHiMatch && activeQuestion) {
      activeQuestion.option_a_hi = aHiMatch[1].trim();
      continue;
    }

    const bHiMatch = cleanLine.match(/^(?:विकल्प\s*[Bb2ख]?|Option\s*[Bb2]\s*\(Hindi\)|B\s*\(Hindi\)|\(Hindi\)\s*B\)?)[\:\-\s]+(.+)/i);
    if (bHiMatch && activeQuestion) {
      activeQuestion.option_b_hi = bHiMatch[1].trim();
      continue;
    }

    const cHiMatch = cleanLine.match(/^(?:विकल्प\s*[Cc3ग]?|Option\s*[Cc3]\s*\(Hindi\)|C\s*\(Hindi\)|\(Hindi\)\s*C\)?)[\:\-\s]+(.+)/i);
    if (cHiMatch && activeQuestion) {
      activeQuestion.option_c_hi = cHiMatch[1].trim();
      continue;
    }

    const dHiMatch = cleanLine.match(/^(?:विकल्प\s*[Dd4घ]?|Option\s*[Dd4]\s*\(Hindi\)|D\s*\(Hindi\)|\(Hindi\)\s*D\)?)[\:\-\s]+(.+)/i);
    if (dHiMatch && activeQuestion) {
      activeQuestion.option_d_hi = dHiMatch[1].trim();
      continue;
    }

    // Standard Options matching (supports A), a), (A), [A], Option A:, 1., क., etc.)
    const aMatch = cleanLine.match(/^[\(\[]?(?:Option\s*)?[Aa1क][\)\].\:\-]\s*(.+)/i);
    if (aMatch && activeQuestion && !activeQuestion.option_a_en) {
      const splitted = splitBilingualText(aMatch[1]);
      activeQuestion.option_a_en = splitted.en;
      if (splitted.hi) activeQuestion.option_a_hi = splitted.hi;
      continue;
    }

    const bMatch = cleanLine.match(/^[\(\[]?(?:Option\s*)?[Bb2ख][\)\].\:\-]\s*(.+)/i);
    if (bMatch && activeQuestion && !activeQuestion.option_b_en) {
      const splitted = splitBilingualText(bMatch[1]);
      activeQuestion.option_b_en = splitted.en;
      if (splitted.hi) activeQuestion.option_b_hi = splitted.hi;
      continue;
    }

    const cMatch = cleanLine.match(/^[\(\[]?(?:Option\s*)?[Cc3ग][\)\].\:\-]\s*(.+)/i);
    if (cMatch && activeQuestion && !activeQuestion.option_c_en) {
      const splitted = splitBilingualText(cMatch[1]);
      activeQuestion.option_c_en = splitted.en;
      if (splitted.hi) activeQuestion.option_c_hi = splitted.hi;
      continue;
    }

    const dMatch = cleanLine.match(/^[\(\[]?(?:Option\s*)?[Dd4घ][\)\].\:\-]\s*(.+)/i);
    if (dMatch && activeQuestion && !activeQuestion.option_d_en) {
      const splitted = splitBilingualText(dMatch[1]);
      activeQuestion.option_d_en = splitted.en;
      if (splitted.hi) activeQuestion.option_d_hi = splitted.hi;
      continue;
    }

    // Answer matching
    const ansMatch = cleanLine.match(/^(?:Answer|Ans|Correct\s*Option|Correct\s*Answer|Key|Right\s*Answer|उत्तर)[\:\-\s]+[\(\[]?([A-Da-d1-4क-घ])[\)\]]?/i);
    if (ansMatch) {
      const rawAns = ansMatch[1].toUpperCase();
      const mappedAns = (rawAns === '1' || rawAns === 'क') ? 'A' : (rawAns === '2' || rawAns === 'ख') ? 'B' : (rawAns === '3' || rawAns === 'ग') ? 'C' : (rawAns === '4' || rawAns === 'घ') ? 'D' : rawAns;
      activeQuestion.correct_answer = mappedAns;
      continue;
    }

    // Explanation matching
    const expMatch = cleanLine.match(/^(?:Explanation|Reason|Solution|Rationale|Details|स्पष्टीकरण)[\:\-\s]+(.+)/i);
    if (expMatch) {
      const expText = expMatch[1].trim();
      if (/[\u0900-\u097F]/.test(expText)) {
        activeQuestion.explanation_hi = expText;
        if (!activeQuestion.explanation) activeQuestion.explanation = expText;
        else activeQuestion.explanation += `\n[हिंदी]: ${expText}`;
      } else {
        const splitted = splitBilingualText(expText);
        activeQuestion.explanation = splitted.en;
        if (splitted.hi) activeQuestion.explanation += `\n[हिंदी]: ${splitted.hi}`;
      }
      continue;
    }

    // Inline Subject on question
    const inlineSubMatch = cleanLine.match(/^(?:Subject|Category)[\:\-\s]+(.+)/i);
    if (inlineSubMatch) {
      activeQuestion.subject = inlineSubMatch[1].trim();
      continue;
    }

    // Image / Diagram URL matching (ImgBB, Postimages, Cloudinary direct URLs)
    const imgMatch = cleanLine.match(/^(?:Image|Image\s*URL|Diagram|Photo|Img|चित्र)[\:\-\s]+(https?:\/\/[^\s]+)/i);
    if (imgMatch && activeQuestion) {
      activeQuestion.image_url = imgMatch[1].trim();
      continue;
    }

    // Option Image URL matching
    const optImgMatch = cleanLine.match(/^(?:Option\s*([A-Da-d])\s*Image|Opt\s*([A-Da-d])\s*Image)[\:\-\s]+(https?:\/\/[^\s]+)/i);
    if (optImgMatch && activeQuestion) {
      const optKey = (optImgMatch[1] || optImgMatch[2]).toLowerCase();
      activeQuestion[`option_${optKey}_image_url`] = optImgMatch[3].trim();
      continue;
    }

    // Multi-line continuation: question text before option A
    if (!activeQuestion.option_a_en && !cleanLine.startsWith('A') && !cleanLine.startsWith('1')) {
      if (/[\u0900-\u097F]/.test(cleanLine)) {
        activeQuestion.question_hi = (activeQuestion.question_hi ? activeQuestion.question_hi + ' ' : '') + cleanLine;
      } else {
        activeQuestion.question_en += ' ' + cleanLine;
      }
      continue;
    }

    // Multi-line continuation of explanation
    if (activeQuestion.explanation) {
      activeQuestion.explanation += ' ' + cleanLine;
      continue;
    }
  }

  pushActiveQuestion();

  // If questions don't have subjects, and user configured blueprint plans (e.g. 5 Science, 5 Math):
  // Allocate questions across the active subject plans!
  const activePlans = subjectPlans.filter((p) => p.enabled && p.count > 0);
  if (activePlans.length > 0 && questions.some((q) => !q.subject)) {
    let planIdx = 0;
    let countInCurrentPlan = 0;

    questions.forEach((q) => {
      if (!q.subject && planIdx < activePlans.length) {
        q.subject = activePlans[planIdx].subjectName;
        countInCurrentPlan++;
        if (countInCurrentPlan >= activePlans[planIdx].count && planIdx < activePlans.length - 1) {
          planIdx++;
          countInCurrentPlan = 0;
        }
      }
    });
  }

  return questions;
}

export const BulkQuestionUpload: React.FC<BulkQuestionUploadProps> = ({
  onUploadComplete,
  initialExamId
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Upload Method Mode: 'file' or 'paste'
  const [uploadMode, setUploadMode] = useState<UploadMode>('file');

  // 1. Target Exam Selection
  const [selectedExamId, setSelectedExamId] = useState<string>(initialExamId || '');

  // 2. Target Subject Selection
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  // 3. Language Selection
  const [languageMode, setLanguageMode] = useState<LanguageMode>('bilingual');

  // Multi-Subject Blueprint Planner
  const [showPlanner, setShowPlanner] = useState(true);
  const [subjectPlans, setSubjectPlans] = useState<SubjectPlan[]>([]);

  // Paste Mode State
  const [pastedText, setPastedText] = useState('');

  // File & Parsing state
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);

  // ChatGPT Prompt Helper Modal
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptFormat, setPromptFormat] = useState<'list' | 'csv'>('list');
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  // Validation report from backend
  const [validationResult, setValidationResult] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    preview?: any[];
    subject_breakdown?: SubjectBreakdownItem[];
    errors: { row: number; reason: string }[];
  } | null>(null);

  const [importSuccessInfo, setImportSuccessInfo] = useState<{
    count: number;
    examName?: string;
    examTotalCount?: number;
    subjectName?: string;
    subjectBreakdown?: SubjectBreakdownItem[];
  } | null>(null);

  const [generalError, setGeneralError] = useState<string | null>(null);
  const [previewSubjectFilter, setPreviewSubjectFilter] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadZoneRef = useRef<HTMLDivElement | null>(null);

  // AI Smart Auto-Organizer (Gemini 3.8 Flash) State
  const [aiInputText, setAiInputText] = useState('');
  const [aiOrganizing, setAiOrganizing] = useState(false);
  const [aiOrganizingStep, setAiOrganizingStep] = useState('');
  const [aiOrganizedQuestions, setAiOrganizedQuestions] = useState<any[]>([]);
  const [aiSubjectBreakdown, setAiSubjectBreakdown] = useState<Record<string, number>>({});
  const [aiDifficultyBreakdown, setAiDifficultyBreakdown] = useState<{ easy: number; medium: number; hard: number }>({ easy: 0, medium: 0, hard: 0 });
  const [aiLanguageBreakdown, setAiLanguageBreakdown] = useState<{ bilingual: number; hi: number; en: number }>({ bilingual: 0, hi: 0, en: 0 });
  const [aiSubjectFilter, setAiSubjectFilter] = useState<string>('all');
  const [aiDifficultyFilter, setAiDifficultyFilter] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [aiModelUsed, setAiModelUsed] = useState<string>('');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiSuccessInfo, setAiSuccessInfo] = useState<{
    count: number;
    examName?: string;
    examCreated?: boolean;
    message: string;
    subjectBreakdown?: Record<string, number>;
  } | null>(null);
  const [editingQuestionIdx, setEditingQuestionIdx] = useState<number | null>(null);

  // Exam Destination & Instant Creation State
  const [destinationMode, setDestinationMode] = useState<'create_new_exam' | 'attach_existing_exam' | 'bank_only'>(
    initialExamId ? 'attach_existing_exam' : 'create_new_exam'
  );
  const [newExamName, setNewExamName] = useState('SSC / Railway Full Mock Assessment #1');
  const [newExamDuration, setNewExamDuration] = useState<number>(60);
  const [newExamNegativeMarks, setNewExamNegativeMarks] = useState<number>(0.25);
  const [newExamStatus, setNewExamStatus] = useState<'live' | 'draft'>('live');
  const [newExamDescription, setNewExamDescription] = useState('AI Organized Comprehensive Computer Based Test (CBT)');

  useEffect(() => {
    loadPrerequisites();
  }, []);

  const loadPrerequisites = async () => {
    setLoadingInitial(true);
    try {
      const [allExams, allSubjects] = await Promise.all([
        api.getExams({ role: 'admin' }),
        api.getSubjects()
      ]);
      setExams(allExams);
      setSubjects(allSubjects);

      // Initialize subject plan defaults
      const plans: SubjectPlan[] = allSubjects.map((s) => ({
        subjectId: s.id,
        subjectName: s.name,
        count: 10,
        enabled: true
      }));
      setSubjectPlans(plans);

      if (initialExamId) {
        const found = allExams.find((e) => e.id === initialExamId);
        if (found && found.subject_id) {
          setSelectedSubjectId(found.subject_id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load exams or subjects:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleExamChange = (examId: string) => {
    setSelectedExamId(examId);
    if (!examId) return;
    const targetExam = exams.find((e) => e.id === examId);
    if (targetExam && targetExam.subject_id) {
      setSelectedSubjectId(targetExam.subject_id);
    }
  };

  const handleQuickSelectExam = (exam: Exam) => {
    setSelectedExamId(exam.id);
    if (exam.subject_id) {
      setSelectedSubjectId(exam.subject_id);
    }
    uploadZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Update subject question count in the blueprint planner
  const updateSubjectPlanCount = (subjectId: string, count: number) => {
    setSubjectPlans((prev) =>
      prev.map((p) => (p.subjectId === subjectId ? { ...p, count: Math.max(1, count) } : p))
    );
  };

  const toggleSubjectPlanEnabled = (subjectId: string) => {
    setSubjectPlans((prev) =>
      prev.map((p) => (p.subjectId === subjectId ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const totalPlannedQuestions = subjectPlans
    .filter((p) => p.enabled)
    .reduce((sum, p) => sum + p.count, 0);

  // Generate and Download Pre-filled Multi-Subject Template
  const downloadMultiSubjectTemplate = () => {
    const activePlans = subjectPlans.filter((p) => p.enabled && p.count > 0);
    if (activePlans.length === 0) {
      alert('Please enable at least one subject in the blueprint planner.');
      return;
    }

    let headers: string[] = [];
    const rows: string[][] = [];

    if (languageMode === 'en') {
      headers = [
        'question_en',
        'option_a_en',
        'option_b_en',
        'option_c_en',
        'option_d_en',
        'correct_answer',
        'subject',
        'difficulty',
        'marks',
        'negative_marks',
        'explanation',
        'image_url',
        'option_a_image_url',
        'option_b_image_url',
        'option_c_image_url',
        'option_d_image_url'
      ];

      activePlans.forEach((plan) => {
        for (let i = 1; i <= plan.count; i++) {
          rows.push([
            `[${plan.subjectName}] Question ${i} text here...`,
            'Option A text',
            'Option B text',
            'Option C text',
            'Option D text',
            i % 4 === 1 ? 'A' : i % 4 === 2 ? 'B' : i % 4 === 3 ? 'C' : 'D',
            plan.subjectName,
            i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy',
            '1.0',
            '0.25',
            `Explanation for ${plan.subjectName} question ${i}.`,
            i === 1 ? 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600' : '',
            '',
            '',
            '',
            ''
          ]);
        }
      });
    } else if (languageMode === 'hi') {
      headers = [
        'question_hi',
        'option_a_hi',
        'option_b_hi',
        'option_c_hi',
        'option_d_hi',
        'correct_answer',
        'subject',
        'difficulty',
        'marks',
        'negative_marks',
        'explanation',
        'image_url',
        'option_a_image_url',
        'option_b_image_url',
        'option_c_image_url',
        'option_d_image_url'
      ];

      activePlans.forEach((plan) => {
        for (let i = 1; i <= plan.count; i++) {
          rows.push([
            `[${plan.subjectName}] प्रश्न क्रमांक ${i} यहाँ लिखें...`,
            'विकल्प A',
            'विकल्प B',
            'विकल्प C',
            'विकल्प D',
            i % 4 === 1 ? 'A' : i % 4 === 2 ? 'B' : i % 4 === 3 ? 'C' : 'D',
            plan.subjectName,
            i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy',
            '1.0',
            '0.25',
            `${plan.subjectName} प्रश्न ${i} का स्पष्टीकरण।`,
            i === 1 ? 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600' : '',
            '',
            '',
            '',
            ''
          ]);
        }
      });
    } else {
      headers = [
        'question_en',
        'question_hi',
        'option_a_en',
        'option_a_hi',
        'option_b_en',
        'option_b_hi',
        'option_c_en',
        'option_c_hi',
        'option_d_en',
        'option_d_hi',
        'correct_answer',
        'subject',
        'difficulty',
        'marks',
        'negative_marks',
        'explanation',
        'image_url',
        'option_a_image_url',
        'option_b_image_url',
        'option_c_image_url',
        'option_d_image_url'
      ];

      activePlans.forEach((plan) => {
        for (let i = 1; i <= plan.count; i++) {
          rows.push([
            `[${plan.subjectName}] Question ${i} in English...`,
            `[${plan.subjectName}] प्रश्न ${i} हिंदी में...`,
            'Option A (En)',
            'विकल्प A (Hi)',
            'Option B (En)',
            'विकल्प B (Hi)',
            'Option C (En)',
            'विकल्प C (Hi)',
            'Option D (En)',
            'विकल्प D (Hi)',
            i % 4 === 1 ? 'A' : i % 4 === 2 ? 'B' : i % 4 === 3 ? 'C' : 'D',
            plan.subjectName,
            i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy',
            '1.0',
            '0.25',
            `Explanation for ${plan.subjectName} question ${i}.`,
            i === 1 ? 'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600' : '',
            '',
            '',
            '',
            ''
          ]);
        }
      });
    }

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = `cbt_blueprint_${totalPlannedQuestions}_questions_${languageMode}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate Multi-Subject ChatGPT Prompt with Pre-written Subject Counts
  const generateMultiSubjectPrompt = () => {
    const activePlans = subjectPlans.filter((p) => p.enabled && p.count > 0);
    const list = activePlans
      .map((p, idx) => `   ${idx + 1}. Subject: "${p.subjectName}" -> ${p.count} questions`)
      .join('\n');

    if (promptFormat === 'list') {
      if (languageMode === 'hi') {
        return `कृपया कुल ${totalPlannedQuestions} बहुविकल्पीय प्रश्न (MCQs) हिंदी में नीचे दिए गए विषय वितरण के अनुसार तैयार करें:
${list}

प्रारूप (Format Requirements):
प्रत्येक विषय के प्रश्नों से पहले विषय शीर्षक लिखें:

### Subject: [विषय का नाम]
1. [प्रश्न यहाँ लिखें]
A) [विकल्प A]
B) [विकल्प B]
C) [विकल्प C]
D) [विकल्प D]
Answer: [A, B, C, या D]
Explanation: [विस्तृत शैक्षणिक व्याख्या]

नियम:
1. "Answer:" केवल A, B, C, या D होना चाहिए।
2. विकल्पों के भीतर A) या B) न दोहराएं।`;
      } else if (languageMode === 'en') {
        return `Please generate ${totalPlannedQuestions} multiple-choice questions in English with the following exact subject breakdown:
${list}

Format Requirements:
Group each set of questions cleanly under its subject heading:

### Subject: [Subject Name]
1. [Question text here]
A) [Option A text]
B) [Option B text]
C) [Option C text]
D) [Option D text]
Answer: [A, B, C, or D]
Explanation: [Clear educational explanation]

Rules:
1. "Answer:" must only be A, B, C, or D.
2. Do not include A) or B) inside the option text itself.`;
      } else {
        return `Please generate ${totalPlannedQuestions} bilingual (English + Hindi) multiple-choice questions with the following subject breakdown:
${list}

Format Requirements:
### Subject: [Subject Name]
1. [Question in English] / [प्रश्न हिंदी में]
A) [Option A in English] / [विकल्प A हिंदी में]
B) [Option B in English] / [विकल्प B हिंदी में]
C) [Option C in English] / [विकल्प C हिंदी में]
D) [Option D in English] / [विकल्प D हिंदी में]
Answer: [A, B, C, or D]
Explanation: [Clear explanation in English and Hindi]

Rules:
1. "Answer:" must only be A, B, C, or D.`;
      }
    }

    // CSV Format
    if (languageMode === 'hi') {
      return `Please generate ${totalPlannedQuestions} multiple-choice questions in Hindi with the following exact subject breakdown:
${list}

Format Requirements:
Output in CSV format with this exact header row:
question_hi, option_a_hi, option_b_hi, option_c_hi, option_d_hi, correct_answer, subject, explanation

Rules:
1. "correct_answer" must only be A, B, C, or D.
2. "subject" must match the specified subject name for each question.
3. Do not include A) or B) inside the option text itself.
4. Include clear educational explanations.`;
    } else if (languageMode === 'en') {
      return `Please generate ${totalPlannedQuestions} multiple-choice questions in English with the following exact subject breakdown:
${list}

Format Requirements:
Output in CSV format with this exact header row:
question_en, option_a_en, option_b_en, option_c_en, option_d_en, correct_answer, subject, explanation

Rules:
1. "correct_answer" must only be A, B, C, or D.
2. "subject" must match the specified subject name for each question.
3. Do not include A) or B) inside the option text itself.
4. Include clear educational explanations.`;
    } else {
      return `Please generate ${totalPlannedQuestions} bilingual (English + Hindi) multiple-choice questions with the following exact subject breakdown:
${list}

Format Requirements:
Output in CSV format with this exact header row:
question_en, question_hi, option_a_en, option_a_hi, option_b_en, option_b_hi, option_c_en, option_c_hi, option_d_en, option_d_hi, correct_answer, subject, explanation

Rules:
1. "correct_answer" must only be A, B, C, or D.
2. "subject" must match the specified subject name for each question.
3. Do not include A) or B) inside the option text itself.
4. Include clear educational explanations.`;
    }
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(generateMultiSubjectPrompt());
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setGeneralError(null);
    setValidationResult(null);
    setImportSuccessInfo(null);
    setValidating(true);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows = XLSX.utils.sheet_to_json(worksheet);

      if (jsonRows.length === 0) {
        setGeneralError('The selected spreadsheet or CSV is empty.');
        setValidating(false);
        return;
      }

      setParsedRows(jsonRows);

      // Perform backend pre-validation (commit: false)
      const res = await api.bulkUploadQuestions(jsonRows, false, {
        exam_id: selectedExamId || undefined,
        subject_id: selectedSubjectId || undefined,
        language_mode: languageMode
      });
      setValidationResult(res);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to read file. Please ensure it is a valid CSV or XLSX spreadsheet.');
    } finally {
      setValidating(false);
    }
  };

  // Sample multi-subject ChatGPT questions for instant 1-click test
  const loadSampleChatGPTText = () => {
    const sample = `### Subject: General Science
1. What is the chemical formula of Water?
A) H2O
B) CO2
C) O2
D) NaCl
Answer: A
Explanation: Water consists of two hydrogen atoms and one oxygen atom.

2. Which organ in the human body filters blood?
A) Heart
B) Kidney
C) Lungs
D) Liver
Answer: B
Explanation: Kidneys filter waste products and excess fluids from the blood.

### Subject: Quantitative Aptitude
3. If the cost price of an item is ₹200 and selling price is ₹250, what is the profit percentage?
A) 20%
B) 25%
C) 30%
D) 15%
Answer: B
Explanation: Profit = ₹50. Profit % = (50 / 200) * 100 = 25%.

4. What is the average of numbers 10, 20, 30, 40, and 50?
A) 25
B) 30
C) 35
D) 40
Answer: B
Explanation: Sum = 150. Average = 150 / 5 = 30.

### Subject: General Studies
5. Who was the first President of Independent India?
A) Dr. Rajendra Prasad
B) Dr. S. Radhakrishnan
C) Jawaharlal Nehru
D) Sardar Vallabhbhai Patel
Answer: A
Explanation: Dr. Rajendra Prasad was the first President from 1950 to 1962.`;
    setPastedText(sample);
  };

  // Handle Parsing of Pasted ChatGPT Text
  const handleParsePastedText = async () => {
    if (!pastedText.trim()) {
      setGeneralError('Please paste your questions text or ChatGPT output first.');
      return;
    }

    setGeneralError(null);
    setValidationResult(null);
    setImportSuccessInfo(null);
    setValidating(true);

    try {
      const rows = parseChatGPTText(pastedText, subjectPlans);

      if (!rows || rows.length === 0) {
        setGeneralError(
          'Could not detect any questions in the pasted text. Please make sure questions have text, options A-D, and correct answers.'
        );
        setValidating(false);
        return;
      }

      setParsedRows(rows);

      // Validate with backend
      const res = await api.bulkUploadQuestions(rows, false, {
        exam_id: selectedExamId || undefined,
        subject_id: selectedSubjectId || undefined,
        language_mode: languageMode
      });
      setValidationResult(res);
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to parse text.');
    } finally {
      setValidating(false);
    }
  };

  // Confirm Import (commit: true)
  const handleConfirmImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    setGeneralError(null);
    try {
      let effectiveExamId = destinationMode === 'attach_existing_exam' ? selectedExamId || undefined : undefined;
      let createdExamName = '';

      if (destinationMode === 'create_new_exam') {
        const finalName = newExamName.trim() || 'New Mock Test Assessment';
        const createdExam = await api.createExam({
          name: finalName,
          duration_minutes: newExamDuration || 60,
          negative_marks: newExamNegativeMarks,
          status: newExamStatus,
          description: newExamDescription || 'Computer Based Test Assessment',
          subject_id: selectedSubjectId || undefined,
          total_questions: parsedRows.length,
          total_marks: parsedRows.length
        });
        effectiveExamId = createdExam.id;
        createdExamName = finalName;
      }

      const res = await api.bulkUploadQuestions(parsedRows, true, {
        exam_id: effectiveExamId,
        subject_id: selectedSubjectId || undefined,
        language_mode: languageMode
      });

      const chosenExam = exams.find((e) => e.id === selectedExamId);
      const chosenSub = subjects.find((s) => s.id === selectedSubjectId);

      setImportSuccessInfo({
        count: res.importedCount || 0,
        examName: createdExamName || chosenExam?.name,
        examTotalCount: res.exam_question_count,
        subjectName: chosenSub?.name,
        subjectBreakdown: res.subject_breakdown
      });

      // Reload exams & subjects in background to update counts everywhere
      const [updatedExams, updatedSubjects] = await Promise.all([
        api.getExams({ role: 'admin' }),
        api.getSubjects()
      ]);
      setExams(updatedExams);
      setSubjects(updatedSubjects);

      onUploadComplete?.();
    } catch (err: any) {
      setGeneralError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handlePreviewChangeSubject = (previewIdx: number, newSubjectId: string) => {
    const targetSub = subjects.find((s) => s.id === newSubjectId);
    if (!targetSub) return;

    setValidationResult((prev: any) => {
      if (!prev || !prev.preview) return prev;
      const updatedPreview = [...prev.preview];
      const targetRow = updatedPreview[previewIdx];
      if (targetRow) {
        updatedPreview[previewIdx] = {
          ...targetRow,
          subId: targetSub.id,
          subjectName: targetSub.name
        };
      }
      return { ...prev, preview: updatedPreview };
    });

    setParsedRows((prev) => {
      const copy = [...prev];
      if (copy[previewIdx]) {
        copy[previewIdx] = {
          ...copy[previewIdx],
          subject: targetSub.name,
          subject_id: targetSub.id
        };
      }
      return copy;
    });
  };

  const resetAll = () => {
    setFile(null);
    setPastedText('');
    setParsedRows([]);
    setValidationResult(null);
    setImportSuccessInfo(null);
    setGeneralError(null);
    setPreviewSubjectFilter('all');
    setAiInputText('');
    setAiOrganizedQuestions([]);
    setAiSuccessInfo(null);
    setEditingQuestionIdx(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run AI Question Organizer (Gemini 3.8 Flash)
  const handleRunAIOrganize = async (overrideText?: string, overrideRows?: any[]) => {
    const textToUse = overrideText !== undefined ? overrideText : aiInputText;
    if (!textToUse.trim() && (!overrideRows || overrideRows.length === 0)) {
      setGeneralError('Please provide question text or upload a file for AI organization.');
      return;
    }

    setGeneralError(null);
    setAiOrganizing(true);
    setAiOrganizedQuestions([]);
    setAiSuccessInfo(null);
    setAiOrganizingStep('🤖 Gemini AI questions का विश्लेषण कर रहा है...');

    const timer1 = setTimeout(() => {
      setAiOrganizingStep('📚 विषय (Subject) और उप-विषय (Topic) पहचाने जा रहे हैं...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setAiOrganizingStep('⚡ कठिनाई स्तर (Easy/Medium/Hard) और भाषा का वर्गीकरण हो रहा है...');
    }, 2500);

    const timer3 = setTimeout(() => {
      setAiOrganizingStep('🌐 Bilingual (Hindi + English) ऑप्शंस और उत्तर व्याख्या तैयार हो रही है...');
    }, 3800);

    try {
      const res = await api.organizeQuestionsWithAI({
        raw_text: textToUse.trim() || undefined,
        raw_rows: overrideRows,
        exam_id: destinationMode === 'attach_existing_exam' ? selectedExamId || undefined : undefined,
        target_subject_id: selectedSubjectId || undefined
      });

      if (!res.questions || res.questions.length === 0) {
        throw new Error('AI could not detect any valid questions in the provided input.');
      }

      setAiOrganizedQuestions(res.questions);
      setAiSubjectBreakdown(res.subject_breakdown || {});
      setAiDifficultyBreakdown(res.difficulty_breakdown || { easy: 0, medium: 0, hard: 0 });
      setAiLanguageBreakdown(res.language_breakdown || { bilingual: 0, hi: 0, en: 0 });
      setAiModelUsed(res.model_used || 'gemini-3.8-flash');
      setAiSubjectFilter('all');
      setAiDifficultyFilter('all');
      setUploadMode('ai');
    } catch (err: any) {
      setGeneralError(err.message || 'AI Question Organization failed.');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setAiOrganizing(false);
      setAiOrganizingStep('');
    }
  };

  // Save all AI organized questions into database (with instant New Exam creation support)
  const handleSaveAllAIOrganized = async () => {
    if (!aiOrganizedQuestions.length) return;
    setAiSaving(true);
    setGeneralError(null);
    try {
      let createExamPayload = undefined;
      if (destinationMode === 'create_new_exam') {
        createExamPayload = {
          name: newExamName.trim() || 'New Mock Test Assessment',
          duration_minutes: newExamDuration || 60,
          negative_marks: newExamNegativeMarks !== undefined ? newExamNegativeMarks : 0.25,
          status: newExamStatus,
          description: newExamDescription || 'AI Organized Comprehensive Computer Based Test (CBT)',
          subject_id: selectedSubjectId || undefined
        };
      }

      const res = await api.saveOrganizedQuestionsWithAI({
        questions: aiOrganizedQuestions,
        exam_id: destinationMode === 'attach_existing_exam' ? selectedExamId || undefined : undefined,
        create_exam: createExamPayload
      });

      const chosenExam = exams.find((e) => e.id === selectedExamId);
      setAiSuccessInfo({
        count: res.saved_count,
        examName: res.exam_name || chosenExam?.name,
        examCreated: res.exam_created,
        message: res.message,
        subjectBreakdown: aiSubjectBreakdown
      });

      // Reload exams & subjects in background
      const [updatedExams, updatedSubjects] = await Promise.all([
        api.getExams({ role: 'admin' }),
        api.getSubjects()
      ]);
      setExams(updatedExams);
      setSubjects(updatedSubjects);

      onUploadComplete?.();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to save organized questions.');
    } finally {
      setAiSaving(false);
    }
  };

  const handleUpdateAIQuestionField = (idx: number, field: string, val: any) => {
    setAiOrganizedQuestions((prev) => {
      const copy = [...prev];
      if (copy[idx]) {
        copy[idx] = { ...copy[idx], [field]: val };
      }
      return copy;
    });
  };

  const handleDeleteAIQuestion = (idx: number) => {
    setAiOrganizedQuestions((prev) => {
      const copy = prev.filter((_, i) => i !== idx);
      // Recompute breakdowns
      const sMap: Record<string, number> = {};
      const dMap = { easy: 0, medium: 0, hard: 0 };
      const lMap = { bilingual: 0, hi: 0, en: 0 };
      copy.forEach((q) => {
        sMap[q.subject_name] = (sMap[q.subject_name] || 0) + 1;
        if (q.difficulty in dMap) dMap[q.difficulty as 'easy' | 'medium' | 'hard']++;
        if (q.language in lMap) lMap[q.language as 'bilingual' | 'hi' | 'en']++;
      });
      setAiSubjectBreakdown(sMap);
      setAiDifficultyBreakdown(dMap);
      setAiLanguageBreakdown(lMap);
      return copy;
    });
  };

  // Sample diverse mock questions across subjects & bilingual formats
  const loadSampleDiverseMockQuestions = () => {
    const sample = `1. एक वस्तु का क्रय मूल्य ₹400 है और इसे ₹500 में बेचा जाता है। लाभ प्रतिशत ज्ञात करें।
A) 20%
B) 25%
C) 30%
D) 15%
Answer: B
Solution: लाभ = 500 - 400 = 100. लाभ % = (100 / 400) * 100 = 25%.

2. In a certain code language, if 'COMPUTER' is written as 'RFUVQNPC', how will 'MEDICINE' be written in that code?
A) EOJDJEFM
B) MFEJDJOE
C) EOJDEJFM
D) MFEJDJOF
Answer: A
Explanation: Reverse order pattern: the word is written in reverse with corresponding shifts.

3. Which organ in the human body is responsible for producing Insulin?
A) Liver
B) Gallbladder
C) Pancreas
D) Kidney
Answer: C
Explanation: The beta cells of the Islets of Langerhans in the pancreas secrete insulin to regulate glucose levels.

4. भारतीय संविधान की किस अनुसूची में राज्यों और केंद्र शासित प्रदेशों की सूची दी गई है?
A) पहली अनुसूची
B) दूसरी अनुसूची
C) तीसरी अनुसूची
D) चौथी अनुसूची
Answer: A
Explanation: First Schedule of the Indian Constitution lists the States and Union Territories.

5. Select the most appropriate synonym of the word: "CANDID"
A) Deceptive
B) Frank
C) Secretive
D) Biased
Answer: B
Explanation: 'Candid' means truthful, straightforward, and frank.

6. Find the value of x if 3x + 15 = 45.
A) 5
B) 10
C) 15
D) 20
Answer: B
Explanation: 3x = 45 - 15 = 30 => x = 10.`;
    setAiInputText(sample);
  };

  const currentSelectedExam = exams.find((e) => e.id === selectedExamId);
  const currentSelectedSubject = subjects.find((s) => s.id === selectedSubjectId);

  return (
    <div className="p-3.5 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <Upload className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
            <span>Bulk Question Upload & Subject Manager</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-categorize questions into subjects, pre-fill question counts, and upload via file or ChatGPT text.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowPromptModal(true)}
            className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Bot className="w-4 h-4" />
            <span>Multi-Subject Prompt Helper</span>
          </button>

          <button
            onClick={downloadMultiSubjectTemplate}
            className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center space-x-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Download Template</span>
          </button>
        </div>
      </div>

      {generalError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Upload / Validation Issue:</p>
            <p>{generalError}</p>
            <p className="text-[11px] text-rose-600">
              Tip: Use the Pre-filled Template below or copy the prompt into ChatGPT to guarantee 100% compatible formatting.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. LIVE SUBJECT QUESTION BANK STATUS */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h3 className="font-extrabold text-sm text-slate-900">
              Live Question Bank by Subject
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-semibold">
            All subjects auto-update immediately when questions are uploaded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {subjects.map((sub) => (
            <div
              key={sub.id}
              className="p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl transition flex flex-col justify-between"
            >
              <span className="text-xs font-bold text-slate-800 truncate" title={sub.name}>
                {sub.name}
              </span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-lg font-black text-indigo-700">
                  {sub.question_count || 0}
                </span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Questions</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MULTI-SUBJECT BLUEPRINT & PRE-FILLED TEMPLATE BUILDER */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-indigo-50/80 via-white to-blue-50/60 rounded-2xl border border-indigo-100 p-6 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-base text-slate-900">
                Multi-Subject Question Blueprint (Distribution Settings)
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Specify how many questions you want for each subject. Download a pre-labeled template with exact row counts or copy a tailored ChatGPT prompt.
            </p>
          </div>

          <button
            onClick={() => setShowPlanner(!showPlanner)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
          >
            <span>{showPlanner ? 'Hide Planner' : 'Show Planner'}</span>
            {showPlanner ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {showPlanner && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {subjectPlans.map((plan) => (
                <div
                  key={plan.subjectId}
                  className={`p-3.5 rounded-xl border transition ${
                    plan.enabled
                      ? 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-200'
                      : 'bg-slate-100/70 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={plan.enabled}
                        onChange={() => toggleSubjectPlanEnabled(plan.subjectId)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate" title={plan.subjectName}>
                        {plan.subjectName}
                      </span>
                    </label>
                  </div>

                  {plan.enabled ? (
                    <div className="flex items-center justify-between bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-semibold pl-1">Target Qs:</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => updateSubjectPlanCount(plan.subjectId, plan.count - 5)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-black shadow-2xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="200"
                          value={plan.count}
                          onChange={(e) =>
                            updateSubjectPlanCount(plan.subjectId, parseInt(e.target.value) || 1)
                          }
                          className="w-12 text-center text-xs font-black text-indigo-700 bg-white border border-slate-300 rounded-md py-0.5"
                        />
                        <button
                          type="button"
                          onClick={() => updateSubjectPlanCount(plan.subjectId, plan.count + 5)}
                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-black shadow-2xs"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic py-1 text-center">
                      Excluded from template
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Blueprint Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-indigo-100/80 bg-white/60 p-3 rounded-xl">
              <div className="flex items-center space-x-2 text-xs">
                <span className="font-bold text-slate-700">Planned Total:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-black text-xs">
                  {totalPlannedQuestions} Questions
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-slate-500 font-medium">
                  {subjectPlans.filter((p) => p.enabled).length} Subjects Active
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={downloadMultiSubjectTemplate}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Pre-filled Template ({totalPlannedQuestions} Rows)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPromptModal(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Copy ChatGPT Prompt for these {totalPlannedQuestions} Qs</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. TARGET DESTINATION & INSTANT EXAM CREATOR (All-in-One Mock Test Creator) */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        {/* Destination Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Trophy className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900">
                Mock Test & Destination Configuration (मॉक टेस्ट व सेविंग सेटिंग्स)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              प्रश्न AI द्वारा organize होने के बाद सीधे नया टेस्ट बनाएं या मौजूदा टेस्ट में जोड़ें
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>All-in-One: Organize + Create Test</span>
          </div>
        </div>

        {/* 3 Interactive Destination Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Create New Mock Test */}
          <div
            onClick={() => setDestinationMode('create_new_exam')}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative ${
              destinationMode === 'create_new_exam'
                ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${destinationMode === 'create_new_exam' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Create New Mock Test
                  </h4>
                  <p className="text-[10px] font-bold text-indigo-600">नया मॉक टेस्ट बनाएं (Recommended)</p>
                </div>
              </div>
              <input
                type="radio"
                name="destinationMode"
                checked={destinationMode === 'create_new_exam'}
                onChange={() => setDestinationMode('create_new_exam')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              AI प्रश्न organize करेगा और तुरंत नया मॉक टेस्ट बनाकर उसमें सारे प्रश्न क्रम से सेट कर देगा।
            </p>
          </div>

          {/* Card 2: Attach to Existing Exam */}
          <div
            onClick={() => setDestinationMode('attach_existing_exam')}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative ${
              destinationMode === 'attach_existing_exam'
                ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${destinationMode === 'attach_existing_exam' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Attach to Existing Exam
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500">मौजूदा टेस्ट में जोड़ें</p>
                </div>
              </div>
              <input
                type="radio"
                name="destinationMode"
                checked={destinationMode === 'attach_existing_exam'}
                onChange={() => setDestinationMode('attach_existing_exam')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              पहले से बने हुए किसी टेस्ट को चुनें और ये सभी प्रश्न उसमें append कर दें।
            </p>
          </div>

          {/* Card 3: Question Bank Only */}
          <div
            onClick={() => setDestinationMode('bank_only')}
            className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative ${
              destinationMode === 'bank_only'
                ? 'border-indigo-600 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-1.5 rounded-lg ${destinationMode === 'bank_only' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Question Bank Only
                  </h4>
                  <p className="text-[10px] font-bold text-slate-500">केवल क्वेश्चन बैंक में सेव करें</p>
                </div>
              </div>
              <input
                type="radio"
                name="destinationMode"
                checked={destinationMode === 'bank_only'}
                onChange={() => setDestinationMode('bank_only')}
                className="mt-1 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              सिर्फ क्वेश्चन बैंक में सेव करें, ताकि भविष्य में कभी भी किसी भी टेस्ट में जोड़ सकें।
            </p>
          </div>
        </div>

        {/* Dynamic Detail Configuration Box for Active Mode */}
        {destinationMode === 'create_new_exam' && (
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-2.5">
              <span className="text-xs font-black text-indigo-900 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>New Mock Test Parameters (नए मॉक टेस्ट का विवरण)</span>
              </span>
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold">Quick Presets:</span>
                {[
                  { label: 'SSC CGL Tier-1', name: 'SSC CGL Tier-1 Full Mock 2026 #1', duration: 60, neg: 0.5 },
                  { label: 'Railway NTPC', name: 'Railway RRB NTPC CBT-1 Mock #1', duration: 90, neg: 0.33 },
                  { label: 'Reasoning Special', name: 'General Intelligence & Reasoning Special Mock', duration: 45, neg: 0.25 },
                  { label: 'General Awareness', name: 'General Awareness 100 Qs Marathon Mock', duration: 60, neg: 0.25 }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setNewExamName(preset.name);
                      setNewExamDuration(preset.duration);
                      setNewExamNegativeMarks(preset.neg);
                    }}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition cursor-pointer"
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs: Name, Duration, Negative Marks, Status */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {/* Mock Test Title */}
              <div className="md:col-span-2 space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  Mock Test Name / Title (मॉक टेस्ट का नाम) *
                </label>
                <input
                  type="text"
                  value={newExamName}
                  onChange={(e) => setNewExamName(e.target.value)}
                  placeholder="e.g. SSC CGL 2026 Full Length Mock Test #1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Duration (mins) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Duration (Minutes / समय)</span>
                  <span className="text-indigo-600 font-mono text-[10px]">{newExamDuration}m</span>
                </label>
                <div className="flex space-x-1">
                  <input
                    type="number"
                    min={5}
                    max={360}
                    value={newExamDuration}
                    onChange={(e) => setNewExamDuration(Number(e.target.value) || 60)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                  {[45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setNewExamDuration(mins)}
                      className={`px-2 py-1 text-[10px] font-bold rounded-lg border transition ${
                        newExamDuration === mins ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Negative Marks & Status */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Negative Mark
                  </label>
                  <select
                    value={newExamNegativeMarks}
                    onChange={(e) => setNewExamNegativeMarks(Number(e.target.value))}
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={0}>0.00 (None)</option>
                    <option value={0.25}>-0.25 (1/4)</option>
                    <option value={0.33}>-0.33 (1/3)</option>
                    <option value={0.5}>-0.50 (1/2)</option>
                    <option value={1}>-1.00</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Status
                  </label>
                  <select
                    value={newExamStatus}
                    onChange={(e) => setNewExamStatus(e.target.value as 'live' | 'draft')}
                    className="w-full px-2 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="live">🟢 Live (Active)</option>
                    <option value="draft">🟡 Draft (Hidden)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Description note */}
            <div className="flex items-center space-x-2 text-[11px] text-indigo-700 bg-white/80 p-2 rounded-lg border border-indigo-100">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                <strong>One-Click Workflow:</strong> जब आप नीचे <em>Save All Questions</em> या <em>Import</em> पर क्लिक करेंगे, तो यह नया टेस्ट तुरंत बन जाएगा और सभी प्रश्न क्रम संख्या 1 से {aiOrganizedQuestions.length || parsedRows.length || 'N'} तक ऑटोमैटिक लिंक हो जाएंगे!
              </span>
            </div>
          </div>
        )}

        {destinationMode === 'attach_existing_exam' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Select Existing Mock Test / Exam (मौजूदा टेस्ट चुनें)</span>
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Choose an exam from list --</option>
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.question_count || 0} Qs) — {ex.subject_name || 'Multi-Subject'} [{ex.status.toUpperCase()}]
                </option>
              ))}
            </select>
            {currentSelectedExam ? (
              <p className="text-[11px] text-emerald-600 font-bold flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span>Selected: "{currentSelectedExam.name}" (Currently has {currentSelectedExam.question_count || 0} questions). All new questions will be appended sequentially.</span>
              </p>
            ) : (
              <p className="text-[11px] text-amber-600 font-medium">
                Please select an exam above to link questions.
              </p>
            )}
          </div>
        )}

        {destinationMode === 'bank_only' && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Questions will be saved into the <strong>Master Question Bank</strong> categorized by their subjects and topics. You can attach them to any test later from the Exam Management panel.
            </span>
          </div>
        )}

        {/* Secondary Config: Subject Mode & Language Format */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          {/* Subject Mode */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Subject Categorization Mode</span>
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">✨ AI Auto-Detect Subject per Question (Recommended)</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  Assign ALL questions to: {sub.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              {currentSelectedSubject ? (
                <span className="text-indigo-600 font-bold">
                  ✓ Overriding all rows to "{currentSelectedSubject.name}".
                </span>
              ) : (
                'AI will intelligently detect if a question belongs to Reasoning, Math, English, or GS.'
              )}
            </p>
          </div>

          {/* Language Format */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>Target Language Format</span>
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setLanguageMode('bilingual')}
                className={`flex-1 py-1 rounded-lg transition ${
                  languageMode === 'bilingual'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bilingual (En+Hi)
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode('en')}
                className={`flex-1 py-1 rounded-lg transition ${
                  languageMode === 'en'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English Only
              </button>
              <button
                type="button"
                onClick={() => setLanguageMode('hi')}
                className={`flex-1 py-1 rounded-lg transition ${
                  languageMode === 'hi'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Hindi Only
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Accepts questions in {languageMode === 'bilingual' ? 'English + Hindi' : languageMode === 'en' ? 'pure English' : 'pure Hindi'}.
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. INPUT METHOD TABS (AI Auto-Organizer vs File vs Direct Paste) */}
      {/* ======================================================== */}
      {importSuccessInfo === null && aiSuccessInfo === null && (
        <div className="flex border-b border-slate-200 space-x-3 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => setUploadMode('ai')}
            className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              uploadMode === 'ai'
                ? 'border-purple-600 text-purple-700 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>✨ AI Smart Auto-Organizer</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 rounded-md">
              Recommended
            </span>
          </button>

          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              uploadMode === 'file'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload File (.csv, .xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => setUploadMode('paste')}
            className={`pb-3 text-xs font-bold flex items-center space-x-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              uploadMode === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>📋 Direct Paste from ChatGPT / Text</span>
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. SUCCESS SCREEN WITH SUBJECT BREAKDOWN */}
      {/* ======================================================== */}
      {aiSuccessInfo !== null ? (
        <div className="bg-white rounded-2xl border border-purple-200 p-8 text-center shadow-xs space-y-6">
          <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">✨ AI Question Organization Complete!</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              <strong>{aiSuccessInfo.count} questions</strong> have been intelligently organized with subjects, topics, difficulty levels, and bilingual options, and saved successfully.
            </p>
          </div>

          {aiSuccessInfo.subjectBreakdown && Object.keys(aiSuccessInfo.subjectBreakdown).length > 0 && (
            <div className="max-w-xl mx-auto bg-purple-50/50 border border-purple-200 rounded-xl p-4 text-left space-y-2">
              <div className="text-xs font-black text-slate-800 flex items-center justify-between border-b border-purple-200 pb-2">
                <span>AI Categorized Subject Distribution:</span>
                <span className="text-purple-700 font-bold">Auto-organized</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {Object.entries(aiSuccessInfo.subjectBreakdown).map(([sName, count]) => (
                  <div
                    key={sName}
                    className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-purple-100 shadow-2xs"
                  >
                    <span className="font-bold text-slate-800">{sName}</span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold text-[11px]">
                      {count} questions
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {aiSuccessInfo.examCreated ? (
            <div className="max-w-xl mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-2xl p-5 text-left shadow-xs space-y-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Trophy className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-black text-indigo-950">
                    🎉 New Mock Test Created Successfully! (नया मॉक टेस्ट तैयार)
                  </h4>
                  <p className="text-xs text-indigo-700 font-bold">
                    "{aiSuccessInfo.examName}"
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-700">
                All <strong>{aiSuccessInfo.count} questions</strong> have been saved to the question bank, intelligently categorized by subject, and attached to this new test in sequential order (1 to {aiSuccessInfo.count}).
              </p>
              <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-bold text-indigo-900">
                <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">✓ Instant Mock Test Generated</span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">✓ Auto Sequenced 1-{aiSuccessInfo.count}</span>
                <span className="bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs">✓ Ready for Student Attempts</span>
              </div>
            </div>
          ) : aiSuccessInfo.examName ? (
            <div className="inline-block bg-purple-50 border border-purple-300 text-purple-900 px-4 py-2 rounded-xl text-xs font-bold">
              ✓ Attached to Mock Test: <span className="underline">{aiSuccessInfo.examName}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
            {onUploadComplete && (
              <button
                type="button"
                onClick={onUploadComplete}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer flex items-center space-x-2 shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>Go to Exams Management (एग्जाम देखें)</span>
              </button>
            )}
            <button
              type="button"
              onClick={resetAll}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Organize More Questions with AI</span>
            </button>
          </div>
        </div>
      ) : importSuccessInfo !== null ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center shadow-xs space-y-6">
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Questions Successfully Uploaded!</h2>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              <strong>{importSuccessInfo.count} questions</strong> have been validated, stored in the Question Bank, and automatically categorized into their respective subjects.
            </p>
          </div>

          {/* Subject Breakdown Card */}
          {importSuccessInfo.subjectBreakdown && importSuccessInfo.subjectBreakdown.length > 0 && (
            <div className="max-w-xl mx-auto bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2">
              <div className="text-xs font-black text-slate-800 flex items-center justify-between border-b border-slate-200 pb-2">
                <span>Updated Subject Counts by Subject:</span>
                <span className="text-emerald-700 font-bold">Auto-updated</span>
              </div>
              <div className="space-y-1.5 pt-1">
                {importSuccessInfo.subjectBreakdown.map((sb) => (
                  <div
                    key={sb.subject_id}
                    className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200"
                  >
                    <span className="font-bold text-slate-800">{sb.subject_name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        +{sb.count} added
                      </span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        (Total now: {sb.total_after})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {importSuccessInfo.examName && (
            <div className="inline-block bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-2 rounded-xl text-xs font-bold">
              ✓ Attached to Exam: <span className="underline">{importSuccessInfo.examName}</span>
              {importSuccessInfo.examTotalCount ? ` (Exam now has ${importSuccessInfo.examTotalCount} questions)` : ''}
            </div>
          )}

          <div className="flex flex-wrap justify-center items-center gap-3">
            {onUploadComplete && importSuccessInfo.examName && (
              <button
                type="button"
                onClick={onUploadComplete}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition cursor-pointer flex items-center space-x-2 shadow-xs"
              >
                <BookOpen className="w-4 h-4" />
                <span>Go to Exams Management (एग्जाम देखें)</span>
              </button>
            )}
            <button
              onClick={resetAll}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition cursor-pointer"
            >
              Upload More Questions
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6" ref={uploadZoneRef}>
          {/* OPTION AI: Smart Auto-Organizer Mode */}
          {uploadMode === 'ai' && (
            <div className="space-y-6">
              {/* 1. If currently running AI analysis */}
              {aiOrganizing && (
                <div className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 rounded-2xl border-2 border-purple-300 p-8 text-center space-y-4 shadow-sm animate-pulse">
                  <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 mx-auto">
                    <Sparkles className="w-7 h-7 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      AI Question Organizer is Analyzing Your Questions
                    </h3>
                    <p className="text-xs font-bold text-purple-700 mt-1">
                      {aiOrganizingStep || 'Processing questions...'}
                    </p>
                  </div>
                  <div className="max-w-md mx-auto grid grid-cols-2 gap-2 text-[11px] text-slate-600 text-left pt-2">
                    <div className="flex items-center space-x-1.5 bg-white p-2 rounded-lg border border-purple-100">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Detecting Subjects</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white p-2 rounded-lg border border-purple-100">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Classifying Topics</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white p-2 rounded-lg border border-purple-100">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Difficulty (Easy/Med/Hard)</span>
                    </div>
                    <div className="flex items-center space-x-1.5 bg-white p-2 rounded-lg border border-purple-100">
                      <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span>Bilingual EN + HI Standard</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. If AI has finished organizing questions */}
              {!aiOrganizing && aiOrganizedQuestions.length > 0 && (
                <div className="bg-white rounded-2xl border border-purple-200 p-5 sm:p-6 shadow-sm space-y-5">
                  {/* Top Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black uppercase tracking-wider">
                          AI Organized ({aiOrganizedQuestions.length} Questions)
                        </span>
                        {aiModelUsed && (
                          <span className="text-[11px] font-mono text-slate-500">
                            Model: {aiModelUsed}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900 mt-1">
                        Mock Test Review & Subject Breakdown
                      </h3>
                      <p className="text-xs text-slate-500">
                        All questions have been auto-classified. You can filter by subject or difficulty, tweak any answer, and save directly to your Mock Test.
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => setAiOrganizedQuestions([])}
                        className="px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                      >
                        Reset / Paste Again
                      </button>

                      <button
                        type="button"
                        disabled={aiSaving}
                        onClick={handleSaveAllAIOrganized}
                        className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                      >
                        {aiSaving ? (
                          <span>Saving Questions...</span>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4" />
                            <span>Save All {aiOrganizedQuestions.length} Questions</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Filter Pills for Subjects & Difficulty */}
                  <div className="space-y-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 flex items-center space-x-1 mr-1">
                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                        <span>Filter Subject:</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => setAiSubjectFilter('all')}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                          aiSubjectFilter === 'all'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'bg-white text-slate-700 border border-purple-200 hover:bg-purple-100/50'
                        }`}
                      >
                        All Subjects ({aiOrganizedQuestions.length})
                      </button>

                      {Object.entries(aiSubjectBreakdown).map(([sName, count]) => (
                        <button
                          key={sName}
                          type="button"
                          onClick={() => setAiSubjectFilter(sName)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                            aiSubjectFilter === sName
                              ? 'bg-purple-700 text-white shadow-2xs'
                              : 'bg-white text-slate-700 border border-purple-200 hover:bg-purple-100/50'
                          }`}
                        >
                          <span>{sName}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                            aiSubjectFilter === sName ? 'bg-purple-900 text-purple-100' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-purple-100/80">
                      <span className="text-xs font-bold text-slate-700 mr-1">Difficulty:</span>
                      {(['all', 'easy', 'medium', 'hard'] as const).map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setAiDifficultyFilter(d)}
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold capitalize transition cursor-pointer ${
                            aiDifficultyFilter === d
                              ? 'bg-slate-900 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {d} {d !== 'all' && `(${aiDifficultyBreakdown[d] || 0})`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Cards List */}
                  <div className="space-y-4">
                    {aiOrganizedQuestions
                      .filter((q) => {
                        const matchSub = aiSubjectFilter === 'all' || q.subject_name.toLowerCase() === aiSubjectFilter.toLowerCase();
                        const matchDiff = aiDifficultyFilter === 'all' || q.difficulty === aiDifficultyFilter;
                        return matchSub && matchDiff;
                      })
                      .map((q, qIdx) => {
                        return (
                          <div
                            key={qIdx}
                            className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 hover:border-purple-300 transition shadow-2xs"
                          >
                            {/* Card Top: Badges and Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="w-6 h-6 rounded-md bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                                  {qIdx + 1}
                                </span>

                                {/* Editable Subject Dropdown */}
                                <select
                                  value={q.subject_name}
                                  onChange={(e) => handleUpdateAIQuestionField(qIdx, 'subject_name', e.target.value)}
                                  className="text-xs font-bold bg-purple-50 text-purple-900 border border-purple-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-purple-500"
                                >
                                  {subjects.map((s) => (
                                    <option key={s.id} value={s.name}>
                                      {s.name}
                                    </option>
                                  ))}
                                  {!subjects.some((s) => s.name === q.subject_name) && (
                                    <option value={q.subject_name}>{q.subject_name}</option>
                                  )}
                                </select>

                                {/* Topic Tag */}
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                  #{q.topic_name || 'General'}
                                </span>

                                {/* Difficulty Pill */}
                                <select
                                  value={q.difficulty}
                                  onChange={(e) => handleUpdateAIQuestionField(qIdx, 'difficulty', e.target.value)}
                                  className={`text-[11px] font-black rounded-md px-2 py-0.5 uppercase tracking-wide border cursor-pointer ${
                                    q.difficulty === 'easy'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : q.difficulty === 'hard'
                                      ? 'bg-rose-50 text-rose-800 border-rose-200'
                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                  }`}
                                >
                                  <option value="easy">Easy</option>
                                  <option value="medium">Medium</option>
                                  <option value="hard">Hard</option>
                                </select>

                                {/* Language Badge */}
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                  {q.language === 'bilingual' ? '🌐 Bilingual' : q.language === 'hi' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteAIQuestion(qIdx)}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition cursor-pointer"
                                title="Remove this question"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Question Text */}
                            <div className="space-y-1">
                              {q.question_en && (
                                <p className="text-xs font-bold text-slate-900">
                                  <span className="text-indigo-600 font-mono mr-1">[EN]</span>
                                  {q.question_en}
                                </p>
                              )}
                              {q.question_hi && (
                                <p className="text-xs font-bold text-slate-800">
                                  <span className="text-emerald-700 font-mono mr-1">[HI]</span>
                                  {q.question_hi}
                                </p>
                              )}
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                              {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                                const isCorrect = q.correct_answer === optKey;
                                const enVal = q[`option_${optKey.toLowerCase()}_en` as keyof typeof q] || '';
                                const hiVal = q[`option_${optKey.toLowerCase()}_hi` as keyof typeof q] || '';

                                return (
                                  <div
                                    key={optKey}
                                    onClick={() => handleUpdateAIQuestionField(qIdx, 'correct_answer', optKey)}
                                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition flex items-start space-x-2 ${
                                      isCorrect
                                        ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400 shadow-2xs'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full font-black text-[11px] flex items-center justify-center shrink-0 ${
                                        isCorrect
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {optKey}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      {enVal && <p className="text-slate-800 font-medium truncate">{String(enVal)}</p>}
                                      {hiVal && hiVal !== enVal && (
                                        <p className="text-slate-600 text-[11px] truncate">{String(hiVal)}</p>
                                      )}
                                    </div>
                                    {isCorrect && (
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Explanation */}
                            {(q.explanation_en || q.explanation_hi) && (
                              <div className="text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-700 space-y-0.5">
                                <span className="font-bold text-slate-900 block">Explanation / व्याख्या:</span>
                                {q.explanation_en && <p>{q.explanation_en}</p>}
                                {q.explanation_hi && q.explanation_hi !== q.explanation_en && (
                                  <p className="text-slate-600">{q.explanation_hi}</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Bottom Save Bar */}
                  <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {destinationMode === 'create_new_exam' ? (
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5 text-xs font-black text-indigo-900">
                          <Trophy className="w-4 h-4 text-indigo-600" />
                          <span>Create New Mock Test: "{newExamName.trim() || 'New Mock Test'}"</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          All <strong>{aiOrganizedQuestions.length} questions</strong> will be saved, categorized, and linked sequentially ({newExamDuration} mins • {newExamNegativeMarks ? `-${newExamNegativeMarks} neg` : 'No neg'} • {newExamStatus === 'live' ? '🟢 Live' : '🟡 Draft'}).
                        </p>
                      </div>
                    ) : destinationMode === 'attach_existing_exam' ? (
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-700 font-bold">
                          Ready to attach <strong>{aiOrganizedQuestions.length} questions</strong> to exam:
                        </span>
                        <p className="text-[11px] font-black text-indigo-700">
                          "{currentSelectedExam ? currentSelectedExam.name : 'No exam selected'}"
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        <span className="text-xs text-slate-700 font-bold">
                          Ready to save <strong>{aiOrganizedQuestions.length} questions</strong> into Question Bank
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Questions will be tagged with subject & difficulty for future test creation.
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={aiSaving || (destinationMode === 'attach_existing_exam' && !selectedExamId)}
                      onClick={handleSaveAllAIOrganized}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white text-xs font-black rounded-xl shadow-md flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {aiSaving ? (
                        <span className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 animate-spin" />
                          <span>Saving & Organizing...</span>
                        </span>
                      ) : destinationMode === 'create_new_exam' ? (
                        <>
                          <Trophy className="w-4 h-4" />
                          <span>🚀 Create Exam & Save All {aiOrganizedQuestions.length} Questions</span>
                        </>
                      ) : destinationMode === 'attach_existing_exam' ? (
                        <>
                          <CheckSquare className="w-4 h-4" />
                          <span>Save & Attach to Exam</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-4 h-4" />
                          <span>Save to Question Bank Only</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 3. If no questions organized yet: Input Box */}
              {!aiOrganizing && aiOrganizedQuestions.length === 0 && (
                <div className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/60 rounded-2xl border border-purple-200 p-6 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 flex items-center space-x-2">
                        <Wand2 className="w-4 h-4 text-purple-600" />
                        <span>AI Smart Question Organizer (Paste Any Format)</span>
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        यहाँ किसी भी रूप में प्रश्न पेस्ट करें (WhatsApp मैसेज, अनफॉर्मेटेड नोट्स, किताब का टेक्स्ट, हिंदी, इंग्लिश या मिक्स्ड)। AI अपने आप पहचान लेगा कि कौन सा प्रश्न किस Subject का है, किस Topic का है, क्या Difficulty (Easy/Medium/Hard) है, और बाइलिंगुअल (Hindi/English) बनाकर मॉक टेस्ट के लिए तैयार कर देगा!
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={loadSampleDiverseMockQuestions}
                      className="shrink-0 px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Load Sample Diverse Questions</span>
                    </button>
                  </div>

                  <textarea
                    value={aiInputText}
                    onChange={(e) => setAiInputText(e.target.value)}
                    placeholder={`यहाँ किसी भी फॉर्मेट में प्रश्न पेस्ट करें...\n\nउदाहरण (Example):\n1. एक वस्तु का क्रय मूल्य ₹400 है और विक्रय मूल्य ₹500 है। लाभ % ज्ञात करें।\nA) 20%\nB) 25%\nC) 30%\nD) 15%\nउत्तर: B\n\n2. Which organ in human body filters blood?\nA) Heart\nB) Kidney\nC) Lungs\nD) Liver\nAns: B\n\n3. B is brother of C. C is sister of D...`}
                    rows={11}
                    className="w-full p-4 text-xs font-mono border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white shadow-2xs"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <span className="text-[11px] text-slate-500 font-medium">
                      {aiInputText ? `${aiInputText.split('\n').length} lines entered` : 'Supports English, Hindi, and Bilingual text in any order'}
                    </span>

                    <button
                      type="button"
                      disabled={aiOrganizing || !aiInputText.trim()}
                      onClick={() => handleRunAIOrganize()}
                      className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center justify-center space-x-2 transition cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-4 h-4 text-purple-200" />
                      <span>✨ AI Auto-Organize & Classify Questions</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* OPTION A: File Upload Mode */}
          {uploadMode === 'file' && (
            <div className="bg-white rounded-2xl border-2 border-dashed border-indigo-200 p-8 text-center hover:border-indigo-500 transition">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>

              <h3 className="font-bold text-sm text-slate-900 mb-1">
                Select Question File (.csv, .xlsx)
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-1">
                Supports single-subject or multi-subject files. Columns are auto-detected.
              </p>
              <p className="text-[11px] text-blue-700 bg-blue-50/80 px-3 py-1.5 rounded-xl border border-blue-200 inline-block max-w-md mx-auto mb-4 font-medium">
                🖼️ <strong>Images / Diagrams:</strong> You can add <code className="font-mono bg-white px-1 py-0.5 rounded border border-blue-200">image_url</code> column with direct links from free hosts (ImgBB, Postimages, Cloudinary) — zero Firebase storage used!
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />

              <label
                htmlFor="file-upload-input"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Browse File on Computer</span>
              </label>

              {file && (
                <div className="mt-4 flex flex-col items-center space-y-2">
                  <div className="inline-flex items-center space-x-2 bg-indigo-50 text-indigo-900 px-3.5 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>{file.name}</span>
                    <span className="text-slate-400">({(file.size / 1024).toFixed(1)} KB)</span>
                  </div>

                  {parsedRows.length > 0 && (
                    <button
                      type="button"
                      disabled={aiOrganizing}
                      onClick={() => handleRunAIOrganize(undefined, parsedRows)}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                      <span>✨ Let AI Auto-Organize This File ({parsedRows.length} Questions)</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* OPTION B: Direct Paste from ChatGPT */}
          {uploadMode === 'paste' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                    <Bot className="w-4 h-4 text-emerald-600" />
                    <span>Paste Questions Directly from ChatGPT</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Paste raw text (e.g. <code>1. Question... A) ... Answer: A</code>), CSV text, or JSON array.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={loadSampleChatGPTText}
                    className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 hover:bg-indigo-100 flex items-center space-x-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Load Sample Questions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPromptModal(true)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 flex items-center space-x-1 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Copy Multi-Subject Prompt</span>
                  </button>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`Example multi-subject format:\n\n1. What is the powerhouse of the cell?\nA) Mitochondria\nB) Ribosome\nC) Nucleus\nD) Golgi\nAnswer: A\nSubject: General Science\nExplanation: Produces ATP.\n\n2. Find 25% of 400.\nA) 100\nB) 150\nC) 200\nD) 250\nAnswer: A\nSubject: Quantitative Aptitude\nExplanation: 400 * 0.25 = 100.`}
                rows={10}
                className="w-full p-4 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/50"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  {pastedText ? `${pastedText.split('\n').length} lines pasted` : 'Paste your questions here'}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={aiOrganizing || !pastedText.trim()}
                    onClick={() => handleRunAIOrganize(pastedText)}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                    <span>✨ AI Auto-Organize This</span>
                  </button>

                  <button
                    type="button"
                    disabled={validating || !pastedText.trim()}
                    onClick={handleParsePastedText}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {validating ? (
                      <span>Parsing Questions...</span>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Classic Parse & Preview</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Validating indicator */}
          {validating && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-xs font-semibold text-slate-600">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mb-2"></div>
              <p>Analyzing questions and assigning subjects...</p>
            </div>
          )}

          {/* Validation & Live Subject Breakdown Report */}
          {validationResult && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Pre-Import Validation Summary</h3>
                  <p className="text-xs text-slate-500">
                    Review subject allocation before committing into the Question Bank.
                  </p>
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                    Total: {validationResult.totalRows}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 font-bold text-emerald-800 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Valid: {validationResult.validCount}</span>
                  </span>
                  {validationResult.errorCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 font-bold text-rose-800 flex items-center space-x-1">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Errors: {validationResult.errorCount}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Subject Breakdown Cards during Preview */}
              {validationResult.subject_breakdown && validationResult.subject_breakdown.length > 0 && (
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-950 flex items-center space-x-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Detected Subject Distribution:</span>
                    </span>
                    <span className="text-[11px] font-bold text-indigo-800">
                      {validationResult.subject_breakdown.length} Subjects Detected
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {validationResult.subject_breakdown.map((sb) => (
                      <div
                        key={sb.subject_id}
                        className="bg-white p-3 rounded-lg border border-indigo-100 shadow-2xs flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-800 truncate" title={sb.subject_name}>
                            {sb.subject_name}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Existing: {sb.existing_count} Qs
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-black text-xs">
                            +{sb.count} Qs
                          </span>
                          <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                            Total: {sb.total_after}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert if any */}
              {validationResult.errors && validationResult.errors.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs text-rose-800">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{validationResult.errors.length} Row(s) Have Issues</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
                    {validationResult.errors.slice(0, 5).map((err, idx) => (
                      <li key={idx}>Row {err.row}: {err.reason}</li>
                    ))}
                    {validationResult.errors.length > 5 && (
                      <li className="font-bold">...and {validationResult.errors.length - 5} more issues.</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Questions Preview Table with Subject Filtering & Inline Assignment */}
              {validationResult.preview && validationResult.preview.length > 0 && (() => {
                const filteredPreview = validationResult.preview.filter((row: any) => {
                  if (previewSubjectFilter === 'all') return true;
                  return row.subId === previewSubjectFilter || row.subjectName?.toLowerCase() === previewSubjectFilter.toLowerCase();
                });

                return (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span className="text-xs font-bold text-slate-900">
                          Question Preview ({filteredPreview.length} of {validationResult.preview.length}):
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">
                        Filter questions by subject or reassign any question before final import
                      </span>
                    </div>

                    {/* Subject Filter Pills for Preview */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-nowrap">
                      <button
                        type="button"
                        onClick={() => setPreviewSubjectFilter('all')}
                        className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                          previewSubjectFilter === 'all'
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>All Preview Questions</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          previewSubjectFilter === 'all' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {validationResult.preview.length}
                        </span>
                      </button>

                      {validationResult.subject_breakdown?.map((sb) => {
                        const isSelected = previewSubjectFilter === sb.subject_id;
                        return (
                          <button
                            key={sb.subject_id}
                            type="button"
                            onClick={() => setPreviewSubjectFilter(sb.subject_id)}
                            className={`min-h-[30px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{sb.subject_name}</span>
                            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                              isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {sb.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-[340px]">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 text-[11px] font-bold border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                          <tr>
                            <th className="p-2.5">#</th>
                            <th className="p-2.5">Question Statement</th>
                            <th className="p-2.5">Key</th>
                            <th className="p-2.5">Assigned Subject</th>
                            <th className="p-2.5">Difficulty</th>
                            <th className="p-2.5">Marks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {filteredPreview.map((row: any, idx: number) => {
                            const globalRowIdx = row.rowIndex !== undefined ? row.rowIndex : idx;
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="p-2.5 font-semibold text-slate-800 max-w-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className="truncate">{row.q_en || row.q_hi}</span>
                                    {row.image_url && (
                                      <span className="shrink-0 inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold" title={row.image_url}>
                                        <ImageIcon className="w-2.5 h-2.5" />
                                        <span>Diagram</span>
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-2.5">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                    {row.correct}
                                  </span>
                                </td>
                                <td className="p-2.5">
                                  <select
                                    value={row.subId || subjects[0]?.id}
                                    onChange={(e) => handlePreviewChangeSubject(globalRowIdx, e.target.value)}
                                    className="px-2 py-1 border border-slate-300 rounded-lg text-xs bg-white font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                    title="Change subject for this question"
                                  >
                                    {subjects.map((s) => (
                                      <option key={s.id} value={s.id}>
                                        {s.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="p-2.5 text-slate-600 capitalize text-[11px]">{row.difficulty}</td>
                                <td className="p-2.5 font-bold text-slate-700 text-[11px]">+{row.marks} / -{row.negative_marks}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel / Clear
                </button>

                <button
                  type="button"
                  disabled={importing || validationResult.validCount === 0 || (destinationMode === 'attach_existing_exam' && !selectedExamId)}
                  onClick={handleConfirmImport}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md flex items-center space-x-2 transition cursor-pointer disabled:opacity-50"
                >
                  {importing ? (
                    <span>Importing & Processing...</span>
                  ) : destinationMode === 'create_new_exam' ? (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>🚀 Create New Exam & Import {validationResult.validCount} Questions</span>
                    </>
                  ) : destinationMode === 'attach_existing_exam' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Import {validationResult.validCount} Questions & Attach to "{currentSelectedExam?.name || 'Selected Exam'}"</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Import {validationResult.validCount} Questions to Question Bank</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. CHATGPT MULTI-SUBJECT PROMPT MODAL */}
      {/* ======================================================== */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Multi-Subject ChatGPT Prompt Generator
                </h3>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              This prompt already includes your selected subjects and question counts. Copy and paste it directly into ChatGPT!
            </p>

            {/* Format Selector */}
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
              <button
                type="button"
                onClick={() => setPromptFormat('list')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  promptFormat === 'list'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📝 Clean Numbered Format (Recommended)
              </button>
              <button
                type="button"
                onClick={() => setPromptFormat('csv')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  promptFormat === 'csv'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📊 CSV Format
              </button>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 whitespace-pre-wrap select-all max-h-[300px] overflow-y-auto">
              {generateMultiSubjectPrompt()}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Total: <strong>{totalPlannedQuestions} Qs</strong> across{' '}
                <strong>{subjectPlans.filter((p) => p.enabled).length} subjects</strong>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={copyPromptToClipboard}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-xs cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-4 h-4" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
