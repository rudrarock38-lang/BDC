import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Exam, Subject, Question, Topic } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { DriveImageUploader } from '../common/DriveImageUploader';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  X,
  ListPlus,
  CheckSquare,
  Square,
  Search,
  ArrowUpDown,
  Play,
  Upload,
  Download,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Check,
  FileText,
  ChevronRight,
  ChevronLeft,
  Filter,
  Sparkles,
  PlusCircle,
  AlertCircle,
  RotateCcw,
  Tag,
  Lock,
  Eye,
  Globe,
  Languages,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Ticket,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

interface ExamManagementProps {
  onMonitorExam?: (examId: string) => void;
  onBulkUploadExam?: (examId: string) => void;
}

type WizardStep = 'settings' | 'questions' | 'review';
type QuestionSourceTab = 'bank' | 'upload' | 'create';

export const ExamManagement: React.FC<ExamManagementProps> = ({
  onMonitorExam,
  onBulkUploadExam
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingPublishExamId, setTogglingPublishExamId] = useState<string | null>(null);
  const [togglingAdmitCardExamId, setTogglingAdmitCardExamId] = useState<string | null>(null);
  const [togglingReattemptExamId, setTogglingReattemptExamId] = useState<string | null>(null);

  // Main Modal: Create / Edit Exam
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<WizardStep>('settings');

  // Step 1: Exam Settings Form States
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState('30');
  const [totalQuestions, setTotalQuestions] = useState('10');
  const [totalMarks, setTotalMarks] = useState('10');
  const [negativeMarks, setNegativeMarks] = useState('0.25');
  const [startDatetime, setStartDatetime] = useState('');
  const [endDatetime, setEndDatetime] = useState('');
  const [status, setStatus] = useState<'draft' | 'scheduled' | 'live' | 'completed'>('live');
  const [instructions, setInstructions] = useState('Standard computer based examination rules apply.');
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [allowReattempt, setAllowReattempt] = useState(true);
  const [maxAttempts, setMaxAttempts] = useState('0');

  // Step 2: Selected Questions for this exam
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [questionSourceTab, setQuestionSourceTab] = useState<QuestionSourceTab>('bank');

  // Source Tab 1: Bank Search & Filter
  const [bankSearch, setBankSearch] = useState('');
  const [bankSubjectFilter, setBankSubjectFilter] = useState('all');
  const [bankDifficultyFilter, setBankDifficultyFilter] = useState('all');
  const [batchSelectCount, setBatchSelectCount] = useState<number>(25);
  const [reviewSubjectFilter, setReviewSubjectFilter] = useState<string>('all');

  // Source Tab 2: Upload CSV / Excel inside exam
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadText, setUploadText] = useState('');
  const [uploadValidating, setUploadValidating] = useState(false);
  const [uploadImporting, setUploadImporting] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const [uploadErrors, setUploadErrors] = useState<{ row: number; reason: string }[]>([]);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Source Tab 3: Quick Add Single Question inside exam
  const [quickLanguageMode, setQuickLanguageMode] = useState<'bilingual' | 'en' | 'hi'>('bilingual');
  const [quickQEn, setQuickQEn] = useState('');
  const [quickQHi, setQuickQHi] = useState('');
  const [quickOptAEn, setQuickOptAEn] = useState('');
  const [quickOptAHi, setQuickOptAHi] = useState('');
  const [quickOptBEn, setQuickOptBEn] = useState('');
  const [quickOptBHi, setQuickOptBHi] = useState('');
  const [quickOptCEn, setQuickOptCEn] = useState('');
  const [quickOptCHi, setQuickOptCHi] = useState('');
  const [quickOptDEn, setQuickOptDEn] = useState('');
  const [quickOptDHi, setQuickOptDHi] = useState('');
  const [quickCorrect, setQuickCorrect] = useState<'A' | 'B' | 'C' | 'D'>('A');
  const [quickSubjectId, setQuickSubjectId] = useState('');
  const [quickDifficulty, setQuickDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quickMarks, setQuickMarks] = useState('1.0');
  const [quickNegMarks, setQuickNegMarks] = useState('0.25');
  const [quickExplanationEn, setQuickExplanationEn] = useState('');
  const [quickExplanationHi, setQuickExplanationHi] = useState('');
  const [quickImageUrl, setQuickImageUrl] = useState('');
  const [quickOptAImageUrl, setQuickOptAImageUrl] = useState('');
  const [quickOptBImageUrl, setQuickOptBImageUrl] = useState('');
  const [quickOptCImageUrl, setQuickOptCImageUrl] = useState('');
  const [quickOptDImageUrl, setQuickOptDImageUrl] = useState('');
  const [showQuickOptionImages, setShowQuickOptionImages] = useState(false);
  const [creatingQuickQ, setCreatingQuickQ] = useState(false);
  const [quickQSuccess, setQuickQSuccess] = useState<string | null>(null);

  // Inline Quick Add Subject Modal
  const [showNewSubjectModal, setShowNewSubjectModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubDesc, setNewSubDesc] = useState('');
  const [creatingSub, setCreatingSub] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [allExams, allSubjects, allQuestions] = await Promise.all([
        api.getExams({ role: 'admin' }),
        api.getSubjects(),
        api.getQuestions()
      ]);
      setExams(allExams);
      setSubjects(allSubjects);
      setBankQuestions(allQuestions);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle publishing/withholding scores for an entire exam
  const handleToggleExamPublish = async (exam: Exam) => {
    setTogglingPublishExamId(exam.id);
    const target = exam.results_published === 0 ? true : false;
    try {
      await api.publishExamResults(exam.id, target);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, results_published: target ? 1 : 0 } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update result publication status');
    } finally {
      setTogglingPublishExamId(null);
    }
  };

  // Toggle admit card release for an entire exam
  const handleToggleExamAdmitCard = async (exam: Exam) => {
    setTogglingAdmitCardExamId(exam.id);
    const target = (exam as any).admit_card_enabled === 0 ? true : false;
    try {
      await api.updateExamAdmitCard(exam.id, target);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, admit_card_enabled: target ? 1 : 0 } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update exam admit card status');
    } finally {
      setTogglingAdmitCardExamId(null);
    }
  };

  // Toggle Re-attempt permission for an entire exam (Admin Control)
  const handleToggleExamReattempt = async (exam: Exam) => {
    setTogglingReattemptExamId(exam.id);
    const currentAllowed = exam.allow_reattempt !== 0 && (exam as any).allow_reattempt !== false;
    const target = !currentAllowed;
    try {
      await api.updateExamReattempt(exam.id, target, exam.max_attempts || 0);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, allow_reattempt: target ? 1 : 0 } : e))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update re-attempt permissions');
    } finally {
      setTogglingReattemptExamId(null);
    }
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setEditingExamId(null);
    setCurrentStep('settings');
    setQuestionSourceTab('bank');

    setName('');
    setDescription('');
    setSubjectId(subjects[0]?.id || '');
    setDuration('30');
    setTotalQuestions('10');
    setTotalMarks('10');
    setNegativeMarks('0.25');

    const now = new Date();
    setStartDatetime(new Date(now.getTime() - 60000).toISOString().slice(0, 16));
    setEndDatetime(new Date(now.getTime() + 14 * 24 * 3600000).toISOString().slice(0, 16));
    setStatus('live');
    setInstructions('Read each question carefully. Unanswered questions carry zero penalty.');
    setShowResultImmediately(true);
    setAllowReattempt(true);
    setMaxAttempts('0');

    setSelectedQuestionIds([]);
    setBankSearch('');
    setBankSubjectFilter('all');
    setBankDifficultyFilter('all');
    resetUploadState();
    resetQuickQState();

    setShowModal(true);
  };

  // Open Edit Modal
  const openEditModal = async (exam: Exam) => {
    setIsEditing(true);
    setEditingExamId(exam.id);
    setCurrentStep('settings');
    setQuestionSourceTab('bank');

    setName(exam.name);
    setDescription(exam.description || '');
    setSubjectId(exam.subject_id || '');
    setDuration(String(exam.duration_minutes));
    setTotalQuestions(String(exam.total_questions));
    setTotalMarks(String(exam.total_marks));
    setNegativeMarks(String(exam.negative_marks));
    setStartDatetime(exam.start_datetime ? new Date(exam.start_datetime).toISOString().slice(0, 16) : '');
    setEndDatetime(exam.end_datetime ? new Date(exam.end_datetime).toISOString().slice(0, 16) : '');
    setStatus(exam.status);
    setInstructions(exam.instructions || 'Standard computer based examination rules apply.');
    setShowResultImmediately(exam.show_result_immediately === 1);
    setAllowReattempt(exam.allow_reattempt !== 0 && (exam as any).allow_reattempt !== false);
    setMaxAttempts(String(exam.max_attempts || '0'));

    resetUploadState();
    resetQuickQState();
    setShowModal(true);

    // Fetch assigned questions
    try {
      const details = await api.getExamById(exam.id);
      const assigned = details.questions ? details.questions.map((q: any) => q.id) : [];
      setSelectedQuestionIds(assigned);
    } catch (err) {
      console.error('Error fetching exam questions:', err);
    }
  };

  const resetUploadState = () => {
    setUploadFile(null);
    setUploadText('');
    setUploadPreview(null);
    setUploadErrors([]);
    setUploadSuccessMsg(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const resetQuickQState = () => {
    setQuickQEn('');
    setQuickQHi('');
    setQuickOptAEn('');
    setQuickOptAHi('');
    setQuickOptBEn('');
    setQuickOptBHi('');
    setQuickOptCEn('');
    setQuickOptCHi('');
    setQuickOptDEn('');
    setQuickOptDHi('');
    setQuickCorrect('A');
    setQuickSubjectId(subjectId || subjects[0]?.id || '');
    setQuickDifficulty('medium');
    setQuickMarks('1.0');
    setQuickNegMarks('0.25');
    setQuickExplanationEn('');
    setQuickExplanationHi('');
    setQuickQSuccess(null);
  };

  // Auto update question count & total marks when selected questions change
  const handleToggleQuestion = (qId: string) => {
    setSelectedQuestionIds((prev) => {
      const next = prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId];
      // Auto-sync totalQuestions if user hasn't explicitly locked it
      if (next.length > 0) {
        setTotalQuestions(String(next.length));
        setTotalMarks(String(next.length));
      }
      return next;
    });
  };

  // Select/Deselect All Filtered
  const handleSelectAllFiltered = (qIds: string[]) => {
    setSelectedQuestionIds((prev) => {
      const merged = Array.from(new Set([...prev, ...qIds]));
      if (merged.length > 0) {
        setTotalQuestions(String(merged.length));
        setTotalMarks(String(merged.length));
      }
      return merged;
    });
  };

  const handleDeselectFiltered = (qIds: string[]) => {
    setSelectedQuestionIds((prev) => {
      const filtered = prev.filter((id) => !qIds.includes(id));
      if (filtered.length > 0) {
        setTotalQuestions(String(filtered.length));
        setTotalMarks(String(filtered.length));
      }
      return filtered;
    });
  };

  // Multi-Subject Quick Batch Select: select first N questions of active subject
  const handleSelectFirstNOfSubject = (subId: string, count: number) => {
    const subjectQs = bankQuestions.filter(
      (q) => (subId === 'all' ? true : (q.subject_id || 'general') === subId)
    );
    const targetIds = subjectQs.slice(0, count).map((q) => q.id);
    setSelectedQuestionIds((prev) => {
      const merged = Array.from(new Set([...prev, ...targetIds]));
      setTotalQuestions(String(merged.length));
      setTotalMarks(String(merged.length));
      return merged;
    });
  };

  // Deselect all questions belonging to a specific subject
  const handleDeselectSubject = (subId: string) => {
    const subjectQIds = new Set(
      bankQuestions
        .filter((q) => (subId === 'all' ? true : (q.subject_id || 'general') === subId))
        .map((q) => q.id)
    );
    setSelectedQuestionIds((prev) => {
      const remaining = prev.filter((id) => !subjectQIds.has(id));
      setTotalQuestions(String(remaining.length));
      setTotalMarks(String(remaining.length));
      return remaining;
    });
  };

  // Step 3 Reordering Methods:
  const moveQuestionUp = (idx: number) => {
    if (idx <= 0) return;
    setSelectedQuestionIds((prev) => {
      const next = [...prev];
      const temp = next[idx - 1];
      next[idx - 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const moveQuestionDown = (idx: number) => {
    setSelectedQuestionIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      const temp = next[idx + 1];
      next[idx + 1] = next[idx];
      next[idx] = temp;
      return next;
    });
  };

  const moveQuestionToTop = (idx: number) => {
    if (idx <= 0) return;
    setSelectedQuestionIds((prev) => {
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  };

  const moveQuestionToBottom = (idx: number) => {
    setSelectedQuestionIds((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  };

  // Group all selected questions by subject into contiguous blocks
  const handleAutoGroupBySubject = () => {
    const qMap = new Map<string, Question>();
    bankQuestions.forEach((q) => qMap.set(q.id, q));

    const subjectGroups = new Map<string, string[]>();
    selectedQuestionIds.forEach((id) => {
      const q = qMap.get(id);
      const subId = q?.subject_id || 'general';
      if (!subjectGroups.has(subId)) subjectGroups.set(subId, []);
      subjectGroups.get(subId)!.push(id);
    });

    const reordered: string[] = [];
    subjectGroups.forEach((ids) => reordered.push(...ids));
    setSelectedQuestionIds(reordered);
  };

  // Move entire subject section up or down in the exam order
  const handleMoveSubjectSection = (subId: string, direction: 'up' | 'down') => {
    const qMap = new Map<string, Question>();
    bankQuestions.forEach((q) => qMap.set(q.id, q));

    const subjectOrder: string[] = [];
    selectedQuestionIds.forEach((id) => {
      const q = qMap.get(id);
      const key = q?.subject_id || 'general';
      if (!subjectOrder.includes(key)) subjectOrder.push(key);
    });

    const currIdx = subjectOrder.indexOf(subId);
    if (currIdx < 0) return;
    const targetIdx = direction === 'up' ? currIdx - 1 : currIdx + 1;
    if (targetIdx < 0 || targetIdx >= subjectOrder.length) return;

    const newOrder = [...subjectOrder];
    const temp = newOrder[currIdx];
    newOrder[currIdx] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    const subjectGroups = new Map<string, string[]>();
    selectedQuestionIds.forEach((id) => {
      const q = qMap.get(id);
      const key = q?.subject_id || 'general';
      if (!subjectGroups.has(key)) subjectGroups.set(key, []);
      subjectGroups.get(key)!.push(id);
    });

    const reordered: string[] = [];
    newOrder.forEach((key) => {
      const ids = subjectGroups.get(key) || [];
      reordered.push(...ids);
    });
    setSelectedQuestionIds(reordered);
  };

  // Filter bank questions
  const filteredBankQuestions = bankQuestions.filter((q) => {
    const matchesSearch =
      !bankSearch.trim() ||
      q.question_en.toLowerCase().includes(bankSearch.toLowerCase()) ||
      q.question_id_code.toLowerCase().includes(bankSearch.toLowerCase());

    const matchesSub = bankSubjectFilter === 'all' || q.subject_id === bankSubjectFilter;
    const matchesDiff = bankDifficultyFilter === 'all' || q.difficulty === bankDifficultyFilter;

    return matchesSearch && matchesSub && matchesDiff;
  });

  // Handle Quick Subject Creation
  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    setCreatingSub(true);
    try {
      const created = await api.createSubject({
        name: newSubName.trim(),
        code: newSubCode.trim().toUpperCase() || undefined,
        description: newSubDesc.trim() || undefined
      });
      const updatedSubs = await api.getSubjects();
      setSubjects(updatedSubs);
      setSubjectId(created.id);
      setQuickSubjectId(created.id);
      setShowNewSubjectModal(false);
      setNewSubName('');
      setNewSubCode('');
      setNewSubDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create subject');
    } finally {
      setCreatingSub(false);
    }
  };

  // Handle CSV file upload & parsing
  const handleFileUploadChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    setUploadErrors([]);
    setUploadSuccessMsg(null);
    setUploadValidating(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (rows.length === 0) {
        setUploadErrors([{ row: 0, reason: 'The uploaded spreadsheet contains no data rows.' }]);
        setUploadValidating(false);
        return;
      }

      // Preview validation with backend
      const res = await api.bulkUploadQuestions(rows, false, {
        subject_id: subjectId || undefined
      });
      setUploadPreview(rows);
      setUploadErrors(res.errors || []);
    } catch (err: any) {
      setUploadErrors([{ row: 0, reason: err.message || 'Failed to parse file format.' }]);
    } finally {
      setUploadValidating(false);
    }
  };

  // Commit file upload and attach to exam
  const handleCommitUploadToExam = async () => {
    if (!uploadPreview || uploadPreview.length === 0) return;
    setUploadImporting(true);
    try {
      const res = await api.bulkUploadQuestions(uploadPreview, true, {
        exam_id: editingExamId || undefined,
        subject_id: subjectId || undefined
      });
      const newQuestionIds = res.imported_question_ids || [];

      // Reload bank questions
      const updatedQuestions = await api.getQuestions();
      setBankQuestions(updatedQuestions);

      // Auto-attach these questions to currently selected
      if (newQuestionIds.length > 0) {
        setSelectedQuestionIds((prev) => {
          const merged = Array.from(new Set([...prev, ...newQuestionIds]));
          setTotalQuestions(String(merged.length));
          setTotalMarks(String(merged.length));
          return merged;
        });
      }

      setUploadSuccessMsg(
        `Success! ${res.importedCount || newQuestionIds.length} questions uploaded and attached to this exam.`
      );
      setUploadFile(null);
      setUploadPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      alert(err.message || 'Failed to upload questions');
    } finally {
      setUploadImporting(false);
    }
  };

  // Handle Quick Add Single Question (Bilingual English + Hindi)
  const handleQuickAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasEnQ = !!quickQEn.trim();
    const hasHiQ = !!quickQHi.trim();

    if (!hasEnQ && !hasHiQ) {
      alert('Please fill question statement in English and/or Hindi.');
      return;
    }

    const hasEnOptions = !!(quickOptAEn.trim() && quickOptBEn.trim() && quickOptCEn.trim() && quickOptDEn.trim());
    const hasHiOptions = !!(quickOptAHi.trim() && quickOptBHi.trim() && quickOptCHi.trim() && quickOptDHi.trim());

    if (!hasEnOptions && !hasHiOptions) {
      alert('Please fill all 4 options (A, B, C, D) in English or Hindi (or both).');
      return;
    }

    const targetSubId = quickSubjectId || subjectId || subjects[0]?.id;
    if (!targetSubId) {
      alert('Please select or create a subject first.');
      return;
    }

    setCreatingQuickQ(true);
    setQuickQSuccess(null);
    try {
      const qEn = quickQEn.trim() || quickQHi.trim();
      const qHi = quickQHi.trim() || undefined;

      const optAEn = quickOptAEn.trim() || quickOptAHi.trim();
      const optAHi = quickOptAHi.trim() || undefined;

      const optBEn = quickOptBEn.trim() || quickOptBHi.trim();
      const optBHi = quickOptBHi.trim() || undefined;

      const optCEn = quickOptCEn.trim() || quickOptCHi.trim();
      const optCHi = quickOptCHi.trim() || undefined;

      const optDEn = quickOptDEn.trim() || quickOptDHi.trim();
      const optDHi = quickOptDHi.trim() || undefined;

      let explanationCombined = quickExplanationEn.trim();
      if (quickExplanationHi.trim()) {
        explanationCombined = explanationCombined
          ? `${explanationCombined}\n[हिंदी]: ${quickExplanationHi.trim()}`
          : quickExplanationHi.trim();
      }

      const created = await api.createQuestion({
        question_en: qEn,
        question_hi: qHi,
        option_a_en: optAEn,
        option_a_hi: optAHi,
        option_b_en: optBEn,
        option_b_hi: optBHi,
        option_c_en: optCEn,
        option_c_hi: optCHi,
        option_d_en: optDEn,
        option_d_hi: optDHi,
        correct_answer: quickCorrect,
        subject_id: targetSubId,
        difficulty: quickDifficulty,
        marks: parseFloat(quickMarks) || 1.0,
        negative_marks: parseFloat(quickNegMarks) || 0.25,
        explanation: explanationCombined || undefined,
        image_url: quickImageUrl.trim() || undefined,
        option_a_image_url: quickOptAImageUrl.trim() || undefined,
        option_b_image_url: quickOptBImageUrl.trim() || undefined,
        option_c_image_url: quickOptCImageUrl.trim() || undefined,
        option_d_image_url: quickOptDImageUrl.trim() || undefined
      });

      // Reload bank questions
      const updatedQuestions = await api.getQuestions();
      setBankQuestions(updatedQuestions);

      // Automatically select the newly created question
      setSelectedQuestionIds((prev) => {
        const next = [...prev, created.id];
        setTotalQuestions(String(next.length));
        setTotalMarks(String(next.length));
        return next;
      });

      const langLabel = (qHi && optAHi && qEn && optAEn)
        ? 'Bilingual (Hindi + English)'
        : (qHi ? 'Hindi' : 'English');

      setQuickQSuccess(`Question (${created.question_id_code}) successfully created & attached to exam in ${langLabel}!`);

      // Clear fields for next question
      setQuickQEn('');
      setQuickQHi('');
      setQuickOptAEn('');
      setQuickOptAHi('');
      setQuickOptBEn('');
      setQuickOptBHi('');
      setQuickOptCEn('');
      setQuickOptCHi('');
      setQuickOptDEn('');
      setQuickOptDHi('');
      setQuickExplanationEn('');
      setQuickExplanationHi('');
      setQuickImageUrl('');
      setQuickOptAImageUrl('');
      setQuickOptBImageUrl('');
      setQuickOptCImageUrl('');
      setQuickOptDImageUrl('');
    } catch (err: any) {
      alert(err.message || 'Failed to create question');
    } finally {
      setCreatingQuickQ(false);
    }
  };

  // Download Sample CSV
  const downloadSampleTemplate = () => {
    const headers = [
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

    const sampleRow = [
      'Which planet is known as the Red Planet? (Check diagram)',
      'किस ग्रह को लाल ग्रह कहा जाता है? (चित्र देखें)',
      'Venus',
      'शुक्र',
      'Mars',
      'मंगल',
      'Jupiter',
      'बृहस्पति',
      'Saturn',
      'शनि',
      'B',
      subjects[0]?.name || 'General Studies',
      'easy',
      '1.0',
      '0.25',
      'Mars appears red due to iron oxide on its surface. / सतह पर आयरन ऑक्साइड के कारण मंगल लाल दिखाई देता है।',
      'https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=600',
      '',
      '',
      '',
      ''
    ];

    const csvContent = [headers.join(','), sampleRow.map((v) => `"${v}"`).join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cbt_exam_bilingual_questions_with_images_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save Final Exam (Create or Update with Questions Attached)
  const handleFinalSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter an exam title.');
      setCurrentStep('settings');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description.trim(),
      subject_id: subjectId || null,
      duration_minutes: parseInt(duration) || 30,
      total_questions: selectedQuestionIds.length > 0 ? selectedQuestionIds.length : parseInt(totalQuestions) || 10,
      total_marks: parseFloat(totalMarks) || (selectedQuestionIds.length > 0 ? selectedQuestionIds.length : 10),
      negative_marks: parseFloat(negativeMarks) || 0.25,
      start_datetime: startDatetime ? new Date(startDatetime).toISOString() : new Date().toISOString(),
      end_datetime: endDatetime ? new Date(endDatetime).toISOString() : new Date(Date.now() + 86400000 * 30).toISOString(),
      status,
      instructions,
      show_result_immediately: showResultImmediately ? 1 : 0,
      results_published: showResultImmediately ? 1 : 0,
      allow_reattempt: allowReattempt ? 1 : 0,
      max_attempts: parseInt(maxAttempts) || 0,
      question_ids: selectedQuestionIds
    };

    setIsSaving(true);
    try {
      if (isEditing && editingExamId) {
        await api.updateExam(editingExamId, payload);
      } else {
        await api.createExam(payload);
      }
      setShowModal(false);
      loadInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to save exam');
    } finally {
      setIsSaving(false);
    }
  };

  // In-app Delete Confirmation State (No browser window.confirm)
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [isDeletingExam, setIsDeletingExam] = useState(false);
  const [deleteStatusMessage, setDeleteStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    setIsDeletingExam(true);
    setDeleteStatusMessage(null);
    const targetId = examToDelete.id;
    const targetName = examToDelete.name;

    try {
      await api.deleteExam(targetId);

      setExamToDelete(null);
      setDeleteStatusMessage({
        type: 'success',
        text: `Exam "${targetName}" and associated question mappings were successfully deleted.`
      });
      await loadInitialData();

      // Clear message after 4 seconds
      setTimeout(() => {
        setDeleteStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error('Failed to delete exam:', err);
      setDeleteStatusMessage({
        type: 'error',
        text: err.message || 'Failed to delete exam from database. Please try again.'
      });
    } finally {
      setIsDeletingExam(false);
    }
  };

  const handleDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
  };

  const [autoAssigningId, setAutoAssigningId] = useState<string | null>(null);

  const handleAutoAssignQuestions = async (exam: Exam) => {
    setAutoAssigningId(exam.id);
    try {
      const res = await api.autoAssignExamQuestions(exam.id, {
        count: exam.total_questions || 10,
        subject_id: exam.subject_id || undefined
      });
      alert(res.message);
      loadInitialData();
    } catch (err: any) {
      alert(err.message || 'Failed to auto-assign questions');
    } finally {
      setAutoAssigningId(null);
    }
  };

  // Selected questions objects preserving exact order
  const selectedQuestionsList = React.useMemo(() => {
    const qMap = new Map<string, Question>();
    bankQuestions.forEach((q) => qMap.set(q.id, q));
    return selectedQuestionIds
      .map((id) => qMap.get(id))
      .filter(Boolean) as Question[];
  }, [selectedQuestionIds, bankQuestions]);

  // Subject composition breakdown for currently selected questions
  const selectedSubjectSummary = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; totalMarks: number }>();
    selectedQuestionsList.forEach((q) => {
      const subId = q.subject_id || 'general';
      const subName = q.subject_name || subjects.find((s) => s.id === subId)?.name || 'General Section';
      if (!map.has(subId)) {
        map.set(subId, { id: subId, name: subName, count: 0, totalMarks: 0 });
      }
      const entry = map.get(subId)!;
      entry.count += 1;
      entry.totalMarks += q.marks || 1;
    });
    return Array.from(map.values());
  }, [selectedQuestionsList, subjects]);

  // Bank counts per subject (total available vs selected in this exam)
  const bankSubjectCounts = React.useMemo(() => {
    const counts: Record<string, { total: number; selected: number }> = {};
    const selectedSet = new Set(selectedQuestionIds);
    bankQuestions.forEach((q) => {
      const subId = q.subject_id || 'general';
      if (!counts[subId]) counts[subId] = { total: 0, selected: 0 };
      counts[subId].total += 1;
      if (selectedSet.has(q.id)) {
        counts[subId].selected += 1;
      }
    });
    return counts;
  }, [bankQuestions, selectedQuestionIds]);

  // Questions filtered for Step 3 review
  const filteredReviewQuestions = React.useMemo(() => {
    if (reviewSubjectFilter === 'all') return selectedQuestionsList;
    return selectedQuestionsList.filter(
      (q) => (q.subject_id || 'general') === reviewSubjectFilter
    );
  }, [selectedQuestionsList, reviewSubjectFilter]);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Exam Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create full mock examinations, choose subjects, upload questions, and set negative marking rules.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md flex items-center space-x-2 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Exam (with Questions & Subjects)</span>
        </button>
      </div>

      {/* Delete / Operation Status Banner */}
      {deleteStatusMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold transition-all ${
            deleteStatusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {deleteStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{deleteStatusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteStatusMessage(null)}
            className="p-1 hover:bg-black/5 rounded-lg text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
            <p className="text-xs font-semibold">Loading examinations & subjects...</p>
          </div>
        ) : exams.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
            <BookOpen className="w-14 h-14 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Exams Created Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Click the button below to create your first CBT examination with custom subjects and questions.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              + Create First Exam
            </button>
          </div>
        ) : (
          exams.map((exam) => {
            const hasQuestions = (exam.question_count || 0) > 0;
            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-2xs hover:shadow-md transition flex flex-col justify-between overflow-hidden"
              >
                <div className="p-6">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          exam.status === 'live'
                            ? 'bg-emerald-100 text-emerald-800'
                            : exam.status === 'scheduled'
                            ? 'bg-blue-100 text-blue-800'
                            : exam.status === 'completed'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {exam.status}
                      </span>

                      {/* Score Visibility Toggle for this Exam */}
                      <button
                        type="button"
                        disabled={togglingPublishExamId === exam.id}
                        onClick={() => handleToggleExamPublish(exam)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                          exam.results_published !== 0
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                        title={
                          exam.results_published !== 0
                            ? 'Scores visible to students. Click to withhold from students.'
                            : 'Scores withheld. Click to release and show to students.'
                        }
                      >
                        {togglingPublishExamId === exam.id ? (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : exam.results_published !== 0 ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Scores Visible</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Scores Withheld</span>
                          </>
                        )}
                      </button>

                      {/* Exam-level Admit Card Visibility Toggle */}
                      <button
                        type="button"
                        disabled={togglingAdmitCardExamId === exam.id}
                        onClick={() => handleToggleExamAdmitCard(exam)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                          (exam as any).admit_card_enabled !== 0
                            ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                            : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                        }`}
                        title={
                          (exam as any).admit_card_enabled !== 0
                            ? 'Admit cards active for this exam. Click to withhold from students.'
                            : 'Admit cards withheld for this exam. Click to release to students.'
                        }
                      >
                        {togglingAdmitCardExamId === exam.id ? (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : (exam as any).admit_card_enabled !== 0 ? (
                          <>
                            <Ticket className="w-3 h-3 text-blue-600" />
                            <span>Card Released</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-rose-600" />
                            <span>Card Withheld</span>
                          </>
                        )}
                      </button>

                      {/* Re-attempt Permission Toggle for this Exam */}
                      <button
                        type="button"
                        disabled={togglingReattemptExamId === exam.id}
                        onClick={() => handleToggleExamReattempt(exam)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                          exam.allow_reattempt !== 0 && (exam as any).allow_reattempt !== false
                            ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        }`}
                        title={
                          exam.allow_reattempt !== 0 && (exam as any).allow_reattempt !== false
                            ? 'Students can re-attempt this exam. Click to disable re-attempts.'
                            : 'Re-attempts disabled for students. Click to enable re-attempts.'
                        }
                      >
                        {togglingReattemptExamId === exam.id ? (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : exam.allow_reattempt !== 0 && (exam as any).allow_reattempt !== false ? (
                          <>
                            <RotateCcw className="w-3 h-3 text-purple-600" />
                            <span>Re-attempt Allowed</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>1 Attempt Only</span>
                          </>
                        )}
                      </button>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {exam.subject_name || 'Multi-Subject Mock'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 leading-snug mt-2">
                    {exam.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {exam.description || 'Comprehensive CBT mock test module.'}
                  </p>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2.5 mt-4 pt-4 border-t border-slate-100 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>{exam.duration_minutes} Mins</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
                      <span className={hasQuestions ? 'font-bold text-slate-900' : 'text-amber-600 font-semibold'}>
                        {exam.question_count || 0} Questions
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <Award className="w-3.5 h-3.5 text-amber-600" />
                      <span>{exam.total_marks} Marks</span>
                    </div>

                    <div className="flex items-center space-x-1.5 text-slate-700 bg-slate-50 p-2 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                      <span>-{exam.negative_marks} Neg</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(exam)}
                      className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-lg flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Manage ({exam.question_count || 0})</span>
                    </button>

                    {!hasQuestions && (
                      <button
                        type="button"
                        disabled={autoAssigningId === exam.id}
                        onClick={() => handleAutoAssignQuestions(exam)}
                        className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg flex items-center space-x-1 transition shadow-2xs cursor-pointer"
                        title="Quickly fill this exam with questions from the question bank"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{autoAssigningId === exam.id ? 'Assigning...' : 'Auto-Assign Qs'}</span>
                      </button>
                    )}

                    {onBulkUploadExam && (
                      <button
                        onClick={() => onBulkUploadExam(exam.id)}
                        className="px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg flex items-center space-x-1 transition cursor-pointer"
                        title="Bulk Upload Questions for this Exam & Subject"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Bulk Upload</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => openEditModal(exam)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                      title="Edit Exam & Questions"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteExam(exam)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                      title="Delete Exam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* COMPREHENSIVE CREATE / EDIT EXAM WIZARD MODAL */}
      {/* ======================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-sm">
                  {isEditing ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-black text-base tracking-tight">
                    {isEditing ? `Edit Exam: ${name || 'Exam Details'}` : 'Create Examination (With Questions & Subjects)'}
                  </h3>
                  <p className="text-xs text-slate-300">
                    Set up parameters, assign subject disciplines, and attach questions in one unified workflow.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Navigation Tabs - Mobile & Tablet Scrollable */}
            <div className="flex border-b border-slate-200 bg-slate-100/70 p-1 shrink-0 text-xs font-bold overflow-x-auto scrollbar-none flex-nowrap">
              <button
                onClick={() => setCurrentStep('settings')}
                className={`min-h-[44px] shrink-0 whitespace-nowrap min-w-[130px] flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
                  currentStep === 'settings'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[11px] shrink-0">
                  1
                </span>
                <span>Exam Details</span>
              </button>

              <button
                onClick={() => setCurrentStep('questions')}
                className={`min-h-[44px] shrink-0 whitespace-nowrap min-w-[150px] flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
                  currentStep === 'questions'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-[11px] shrink-0">
                  2
                </span>
                <span>Questions</span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-600 text-white text-[10px] font-black shrink-0">
                  {selectedQuestionIds.length}
                </span>
              </button>

              <button
                onClick={() => setCurrentStep('review')}
                className={`min-h-[44px] shrink-0 whitespace-nowrap min-w-[130px] flex-1 py-2.5 px-3 rounded-lg flex items-center justify-center space-x-2 transition cursor-pointer ${
                  currentStep === 'review'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 active:bg-slate-200/60'
                }`}
              >
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center text-[11px] shrink-0">
                  3
                </span>
                <span>Review & Finalize</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
              {/* ======================================================== */}
              {/* STEP 1: EXAM SETTINGS & SUBJECT SELECTION */}
              {/* ======================================================== */}
              {currentStep === 'settings' && (
                <div className="space-y-5">
                  {/* Title & Description */}
                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold text-slate-800 text-xs mb-1">
                        Exam Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. CBT All-India General Mock Test 2026"
                        className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-800 text-xs mb-1">
                        Exam Description & Instructions
                      </label>
                      <textarea
                        rows={2}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Brief overview of the examination topics, target competitive exam, or rules..."
                        className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Subject Choice (Crucial feature requested by user) */}
                  <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="font-extrabold text-indigo-950 text-xs flex items-center space-x-1.5">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <span>Choose Exam Subject Discipline *</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowNewSubjectModal(true)}
                        className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-300 flex items-center space-x-1 shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add New Subject</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <select
                          value={subjectId}
                          onChange={(e) => {
                            setSubjectId(e.target.value);
                            setQuickSubjectId(e.target.value);
                          }}
                          className="w-full px-3 py-2 border border-indigo-300 rounded-xl bg-white text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Multi-Subject / Full Comprehensive Mock</option>
                          {subjects.map((sub) => (
                            <option key={sub.id} value={sub.id}>
                              {sub.name} {sub.code ? `(${sub.code})` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[11px] text-indigo-600/80 mt-1">
                          Select a specific subject or choose Multi-Subject for combined tests.
                        </p>
                      </div>

                      {/* Quick subject badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {subjects.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSubjectId(s.id);
                              setQuickSubjectId(s.id);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                              subjectId === s.id
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Exam Parameters: Duration, Questions, Marks, Negative Marking */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Duration (Mins) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Total Questions
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                      />
                      <span className="text-[10px] text-slate-400">Auto-syncs with questions</span>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Total Marks *
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="1"
                        required
                        value={totalMarks}
                        onChange={(e) => setTotalMarks(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">
                        Neg Penalty (-Mark) *
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        required
                        value={negativeMarks}
                        onChange={(e) => setNegativeMarks(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold text-rose-600"
                      />
                      <span className="text-[10px] text-slate-400">e.g. 0.25 for 1/4th</span>
                    </div>
                  </div>

                  {/* Schedule & Availability */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">Exam Status</label>
                      <select
                        value={status}
                        onChange={(e: any) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-xs font-bold"
                      >
                        <option value="live">Live (Active - Students Can Attempt)</option>
                        <option value="scheduled">Scheduled (Future Test)</option>
                        <option value="draft">Draft (Admin Only / Hidden)</option>
                        <option value="completed">Completed (Closed)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">Start Date & Time</label>
                      <input
                        type="datetime-local"
                        value={startDatetime}
                        onChange={(e) => setStartDatetime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-xs mb-1">End Date & Time</label>
                      <input
                        type="datetime-local"
                        value={endDatetime}
                        onChange={(e) => setEndDatetime(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>

                  {/* Score Visibility to Candidates (Show / Hide) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div>
                      <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span>Candidate Score & Result Visibility</span>
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Control whether students can see their score and scorecard immediately or if it stays hidden until you release it.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowResultImmediately(true)}
                        className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                          showResultImmediately
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Eye className={`w-4 h-4 mt-0.5 shrink-0 ${showResultImmediately ? 'text-emerald-700 font-bold' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${showResultImmediately ? 'text-emerald-900' : 'text-slate-700'}`}>
                            Publish Score Immediately
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            Student sees marks, percentage, rank & answer keys right after submitting.
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowResultImmediately(false)}
                        className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                          !showResultImmediately
                            ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${!showResultImmediately ? 'text-amber-700 font-bold' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${!showResultImmediately ? 'text-amber-900' : 'text-slate-700'}`}>
                            Hide / Withhold Score (Admin Release)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            Score is kept private to Admin until you click "Release to Student".
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Student Re-attempt & Retake Policy Control */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                        <RotateCcw className="w-4 h-4 text-purple-600" />
                        <span>Student Re-attempt & Retake Control (पुनः परीक्षा नियंत्रण)</span>
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">
                        Choose whether candidates who complete this examination are allowed to re-attempt/retake it for practice or re-examination.
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAllowReattempt(true)}
                        className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                          allowReattempt
                            ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <RotateCcw className={`w-4 h-4 mt-0.5 shrink-0 ${allowReattempt ? 'text-purple-700 font-bold' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${allowReattempt ? 'text-purple-900' : 'text-slate-700'}`}>
                            Allow Students to Re-attempt (पुनः परीक्षा की अनुमति दें)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            Students will see a "Re-attempt Test" button on their completed dashboard and scorecard.
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAllowReattempt(false)}
                        className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 cursor-pointer ${
                          !allowReattempt
                            ? 'bg-slate-100 border-slate-400 ring-2 ring-slate-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <Lock className={`w-4 h-4 mt-0.5 shrink-0 ${!allowReattempt ? 'text-slate-700 font-bold' : 'text-slate-400'}`} />
                        <div>
                          <span className={`text-xs font-bold block ${!allowReattempt ? 'text-slate-900' : 'text-slate-700'}`}>
                            Strict Single Attempt (केवल एक बार परीक्षा)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                            Once submitted, the candidate cannot retake this exam without admin permission.
                          </span>
                        </div>
                      </button>
                    </div>

                    {allowReattempt && (
                      <div className="p-3 bg-purple-50/40 border border-purple-200/80 rounded-xl flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-purple-950">
                          Maximum Re-attempts Allowed:
                        </span>
                        <select
                          value={maxAttempts}
                          onChange={(e) => setMaxAttempts(e.target.value)}
                          className="bg-white border border-purple-300 rounded-lg px-2.5 py-1 text-xs font-bold text-purple-900 focus:outline-purple-500"
                        >
                          <option value="0">Unlimited Re-attempts (No Limit)</option>
                          <option value="2">Max 2 Attempts (1 Re-take)</option>
                          <option value="3">Max 3 Attempts (2 Re-takes)</option>
                          <option value="5">Max 5 Attempts</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 2: ADD / UPLOAD / CREATE QUESTIONS */}
              {/* ======================================================== */}
              {currentStep === 'questions' && (
                <div className="space-y-4">
                  {/* Sub-tab Switcher: Bank vs Upload vs Quick Create */}
                  <div className="flex border-b border-slate-200 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setQuestionSourceTab('bank')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                        questionSourceTab === 'bank'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Select From Question Bank ({bankQuestions.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionSourceTab('upload')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                        questionSourceTab === 'upload'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Questions (CSV / Excel)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQuestionSourceTab('create')}
                      className={`flex-1 py-2 rounded-lg flex items-center justify-center space-x-1.5 transition ${
                        questionSourceTab === 'create'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Quick Add New Question</span>
                    </button>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* SUB-TAB 1: SELECT FROM QUESTION BANK */}
                  {/* ---------------------------------------------------- */}
                  {questionSourceTab === 'bank' && (
                    <div className="space-y-3">
                      {/* Live Multi-Subject Composition Breakdown of Selected Questions */}
                      <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/50 to-slate-50 p-3 rounded-xl border border-indigo-200">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-black text-indigo-950">
                              Exam Question Composition by Subject:
                            </span>
                          </div>
                          <span className="text-xs font-extrabold text-indigo-700 bg-white px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                            {selectedQuestionIds.length} Total Selected ({selectedQuestionIds.length} Marks)
                          </span>
                        </div>

                        {selectedSubjectSummary.length === 0 ? (
                          <div className="text-[11px] text-slate-500 italic">
                            No questions selected yet. Choose a subject below or use "Quick Batch Select" to attach questions.
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {selectedSubjectSummary.map((sec) => (
                              <div
                                key={sec.id}
                                className="bg-white border border-indigo-200 rounded-lg px-2.5 py-1 text-xs font-bold flex items-center space-x-2 shadow-2xs"
                              >
                                <span className="text-slate-800">{sec.name}:</span>
                                <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded-full font-mono text-[11px]">
                                  {sec.count} Qs
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Interactive Horizontal Subject Filter Tabs with Live Badges */}
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 pt-1 flex-nowrap">
                        <button
                          type="button"
                          onClick={() => setBankSubjectFilter('all')}
                          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                            bankSubjectFilter === 'all'
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <span>All Subjects</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                            bankSubjectFilter === 'all' ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {bankQuestions.length}
                          </span>
                        </button>

                        {subjects.map((sub) => {
                          const info = bankSubjectCounts[sub.id] || { total: 0, selected: 0 };
                          const isSelected = bankSubjectFilter === sub.id;
                          return (
                            <button
                              key={sub.id}
                              type="button"
                              onClick={() => setBankSubjectFilter(sub.id)}
                              className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              <span>{sub.name}</span>
                              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {info.selected > 0 ? `${info.selected}/` : ''}{info.total}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Search, Filter & Quick Batch Selection Toolbar */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              value={bankSearch}
                              onChange={(e) => setBankSearch(e.target.value)}
                              placeholder="Search questions by text or code..."
                              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                          </div>

                          {/* Difficulty Filter */}
                          <select
                            value={bankDifficultyFilter}
                            onChange={(e) => setBankDifficultyFilter(e.target.value)}
                            className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-medium"
                          >
                            <option value="all">All Difficulties</option>
                            <option value="easy">Easy (सरल)</option>
                            <option value="medium">Medium (मध्यम)</option>
                            <option value="hard">Hard (कठिन)</option>
                          </select>

                          {/* Bulk Select Buttons */}
                          <button
                            type="button"
                            onClick={() => handleSelectAllFiltered(filteredBankQuestions.map((q) => q.id))}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition border border-indigo-200 cursor-pointer"
                          >
                            Select All Filtered ({filteredBankQuestions.length})
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeselectFiltered(filteredBankQuestions.map((q) => q.id))}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-bold transition cursor-pointer"
                          >
                            Deselect Filtered
                          </button>
                        </div>

                        {/* Subject Quick Batch Assign Row */}
                        <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-700 text-[11px] flex items-center space-x-1">
                              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                              <span>Quick Assign from {bankSubjectFilter === 'all' ? 'All Subjects' : subjects.find((s) => s.id === bankSubjectFilter)?.name || 'Subject'}:</span>
                            </span>
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={batchSelectCount}
                                onChange={(e) => setBatchSelectCount(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-xs font-bold text-center bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleSelectFirstNOfSubject(bankSubjectFilter, batchSelectCount)}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-2xs cursor-pointer"
                              >
                                + Select First {batchSelectCount}
                              </button>
                            </div>
                          </div>

                          {bankSubjectFilter !== 'all' && (
                            <button
                              type="button"
                              onClick={() => handleDeselectSubject(bankSubjectFilter)}
                              className="text-rose-600 hover:text-rose-800 font-bold text-[11px] cursor-pointer"
                            >
                              Clear this Subject
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Questions List */}
                      <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[350px] overflow-y-auto">
                        {filteredBankQuestions.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No questions found matching your filter criteria.
                          </div>
                        ) : (
                          filteredBankQuestions.map((q) => {
                            const isSelected = selectedQuestionIds.includes(q.id);
                            return (
                              <div
                                key={q.id}
                                onClick={() => handleToggleQuestion(q.id)}
                                className={`p-3.5 flex items-start space-x-3 cursor-pointer transition ${
                                  isSelected ? 'bg-indigo-50/70' : 'hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by container onClick
                                  className="w-4 h-4 text-indigo-600 rounded mt-0.5 pointer-events-none"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                      {q.question_id_code}
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                                      {q.subject_name || 'General'}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                        q.difficulty === 'easy'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : q.difficulty === 'medium'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-rose-100 text-rose-800'
                                      }`}
                                    >
                                      {q.difficulty}
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      Marks: {q.marks || 1.0} | Correct: Option {q.correct_answer}
                                    </span>
                                  </div>

                                  <p className="text-xs font-semibold text-slate-900 line-clamp-2">
                                    {q.question_en}
                                  </p>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5 text-[11px] text-slate-600">
                                    <span className={q.correct_answer === 'A' ? 'font-bold text-emerald-700' : ''}>
                                      A: {q.option_a_en}
                                    </span>
                                    <span className={q.correct_answer === 'B' ? 'font-bold text-emerald-700' : ''}>
                                      B: {q.option_b_en}
                                    </span>
                                    <span className={q.correct_answer === 'C' ? 'font-bold text-emerald-700' : ''}>
                                      C: {q.option_c_en}
                                    </span>
                                    <span className={q.correct_answer === 'D' ? 'font-bold text-emerald-700' : ''}>
                                      D: {q.option_d_en}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUB-TAB 2: UPLOAD QUESTIONS (CSV / EXCEL) */}
                  {/* ---------------------------------------------------- */}
                  {questionSourceTab === 'upload' && (
                    <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            Upload Questions Directly to this Exam
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Upload a spreadsheet containing questions. Valid rows will be saved to the database and automatically attached to this exam.
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {onBulkUploadExam && editingExamId && (
                            <button
                              type="button"
                              onClick={() => onBulkUploadExam(editingExamId)}
                              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 text-xs font-black flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                              <span>✨ Launch AI Auto-Organizer for this Exam</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={downloadSampleTemplate}
                            className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center space-x-1.5 shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Download Sample CSV Template</span>
                          </button>
                        </div>
                      </div>

                      {/* File Upload Drop Area */}
                      <div className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white rounded-2xl p-6 text-center transition">
                        <Upload className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                        <label className="block text-xs font-bold text-slate-800 cursor-pointer">
                          <span>Click to browse CSV or Excel (.xlsx) file</span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv, .xlsx, .xls"
                            onChange={handleFileUploadChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Standard format: question_en, options A-D, correct_answer, and subject.
                        </p>
                        <p className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                          💡 <strong>Images Support:</strong> You can add <code className="bg-slate-100 px-1 py-0.5 rounded text-indigo-900">image_url</code> column with direct links from free hosts (ImgBB, Postimages, Cloudinary) — No Firebase Storage needed!
                        </p>
                        {uploadFile && (
                          <div className="mt-3 inline-flex items-center space-x-2 bg-indigo-50 text-indigo-800 px-3 py-1 rounded-lg text-xs font-bold border border-indigo-200">
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>{uploadFile.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Success / Error Messages */}
                      {uploadSuccessMsg && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{uploadSuccessMsg}</span>
                        </div>
                      )}

                      {uploadErrors.length > 0 && (
                        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs space-y-1">
                          <div className="flex items-center space-x-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Validation Issues Found:</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-rose-700">
                            {uploadErrors.slice(0, 3).map((e, idx) => (
                              <li key={idx}>Row {e.row}: {e.reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action to commit */}
                      {uploadPreview && uploadPreview.length > 0 && (
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs font-bold text-slate-700">
                            Ready to import: {uploadPreview.length} questions
                          </span>
                          <button
                            type="button"
                            disabled={uploadImporting}
                            onClick={handleCommitUploadToExam}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-xs transition"
                          >
                            {uploadImporting ? (
                              <span>Importing...</span>
                            ) : (
                              <>
                                <Check className="w-4 h-4" />
                                <span>Upload & Attach to This Exam</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* SUB-TAB 3: QUICK ADD SINGLE QUESTION */}
                  {/* ---------------------------------------------------- */}
                  {questionSourceTab === 'create' && (
                    <form onSubmit={handleQuickAddQuestion} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                      {/* Sub-tab Header & Language Mode Selector */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                            <Languages className="w-4 h-4 text-indigo-600" />
                            <span>Quick Add Question (Instant Creation)</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Create a question on the fly and immediately attach it to this CBT exam.
                          </p>
                        </div>

                        {/* Language Selection Buttons */}
                        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setQuickLanguageMode('bilingual')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                              quickLanguageMode === 'bilingual'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>Bilingual (English + Hindi एक साथ)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setQuickLanguageMode('en')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              quickLanguageMode === 'en'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>English Only</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setQuickLanguageMode('hi')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              quickLanguageMode === 'hi'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            <span>Hindi Only (हिंदी)</span>
                          </button>
                        </div>
                      </div>

                      {/* Bilingual Student Switching Notice */}
                      <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-950 flex items-start space-x-2.5">
                        <span className="text-sm">💡</span>
                        <div className="text-[11px] leading-relaxed">
                          <strong>Bilingual Exam Feature:</strong> Jab student test hall me exam dega, to screen ke upar <strong>[English / Hindi]</strong> language switcher hoga. Agar aap yahan dono bhashayein bharte hain, to student jis bhasha me chahe turant switch karke question aur chaaro options dekh sakega!
                        </div>
                      </div>

                      {quickQSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{quickQSuccess}</span>
                        </div>
                      )}

                      {/* QUESTION STATEMENTS SECTION */}
                      <div className="space-y-2">
                        {quickLanguageMode === 'bilingual' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block font-bold text-slate-800 text-[11px]">
                                  Question Statement (English) *
                                </label>
                                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[9px] uppercase tracking-wider">
                                  English
                                </span>
                              </div>
                              <textarea
                                rows={3}
                                required
                                value={quickQEn}
                                onChange={(e) => setQuickQEn(e.target.value)}
                                placeholder="Type English question statement here..."
                                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-slate-50/50 focus:bg-white"
                              />
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block font-bold text-slate-800 text-[11px]">
                                  प्रश्न विवरण (Hindi Translation) *
                                </label>
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[9px] uppercase tracking-wider">
                                  हिंदी
                                </span>
                              </div>
                              <textarea
                                rows={3}
                                required
                                value={quickQHi}
                                onChange={(e) => setQuickQHi(e.target.value)}
                                placeholder="यहाँ हिंदी में प्रश्न लिखें..."
                                className="w-full p-2.5 border border-amber-200 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-hidden bg-amber-50/20 focus:bg-white"
                              />
                            </div>
                          </div>
                        ) : quickLanguageMode === 'en' ? (
                          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs space-y-1">
                            <label className="block font-bold text-slate-800 text-xs">
                              Question Statement (English) *
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={quickQEn}
                              onChange={(e) => setQuickQEn(e.target.value)}
                              placeholder="Type English question statement here..."
                              className="w-full p-2.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                            />
                          </div>
                        ) : (
                          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs space-y-1">
                            <label className="block font-bold text-slate-800 text-xs">
                              प्रश्न विवरण (Hindi) *
                            </label>
                            <textarea
                              rows={3}
                              required
                              value={quickQHi}
                              onChange={(e) => setQuickQHi(e.target.value)}
                              placeholder="यहाँ हिंदी में प्रश्न लिखें..."
                              className="w-full p-2.5 border border-amber-300 rounded-lg text-xs focus:ring-2 focus:ring-amber-500 outline-hidden"
                            />
                          </div>
                        )}
                      </div>

                      {/* 4 ANSWER OPTIONS (A, B, C, D) SECTION */}
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
                          <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                            Answer Options (A, B, C, D) & Correct Key
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Select the radio button next to the correct answer
                          </span>
                        </div>

                        {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                          const enVal =
                            letter === 'A'
                              ? quickOptAEn
                              : letter === 'B'
                              ? quickOptBEn
                              : letter === 'C'
                              ? quickOptCEn
                              : quickOptDEn;
                          const setEnVal =
                            letter === 'A'
                              ? setQuickOptAEn
                              : letter === 'B'
                              ? setQuickOptBEn
                              : letter === 'C'
                              ? setQuickOptCEn
                              : setQuickOptDEn;

                          const hiVal =
                            letter === 'A'
                              ? quickOptAHi
                              : letter === 'B'
                              ? quickOptBHi
                              : letter === 'C'
                              ? quickOptCHi
                              : quickOptDHi;
                          const setHiVal =
                            letter === 'A'
                              ? setQuickOptAHi
                              : letter === 'B'
                              ? setQuickOptBHi
                              : letter === 'C'
                              ? setQuickOptCHi
                              : setQuickOptDHi;

                          const isCorrect = quickCorrect === letter;

                          return (
                            <div
                              key={letter}
                              className={`p-3 rounded-xl border transition ${
                                isCorrect
                                  ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300'
                                  : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs ${
                                    isCorrect ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {letter}
                                  </span>
                                  <span className="font-bold text-slate-800 text-xs">Option {letter}</span>
                                </div>

                                <label className="flex items-center space-x-1.5 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50">
                                  <input
                                    type="radio"
                                    name="quickCorrectAnswer"
                                    checked={isCorrect}
                                    onChange={() => setQuickCorrect(letter)}
                                    className="w-3.5 h-3.5 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                  />
                                  <span className={`text-[11px] font-bold ${isCorrect ? 'text-emerald-700' : 'text-slate-600'}`}>
                                    {isCorrect ? '✓ Correct Answer (सही उत्तर)' : 'Mark as Correct'}
                                  </span>
                                </label>
                              </div>

                              {quickLanguageMode === 'bilingual' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div>
                                    <input
                                      type="text"
                                      required
                                      value={enVal}
                                      onChange={(e) => setEnVal(e.target.value)}
                                      placeholder={`Option ${letter} in English *`}
                                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                    />
                                  </div>
                                  <div>
                                    <input
                                      type="text"
                                      required
                                      value={hiVal}
                                      onChange={(e) => setHiVal(e.target.value)}
                                      placeholder={`विकल्प ${letter} हिंदी में *`}
                                      className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                                    />
                                  </div>
                                </div>
                              ) : quickLanguageMode === 'en' ? (
                                <input
                                  type="text"
                                  required
                                  value={enVal}
                                  onChange={(e) => setEnVal(e.target.value)}
                                  placeholder={`Option ${letter} in English *`}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden"
                                />
                              ) : (
                                <input
                                  type="text"
                                  required
                                  value={hiVal}
                                  onChange={(e) => setHiVal(e.target.value)}
                                  placeholder={`विकल्प ${letter} हिंदी में *`}
                                  className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white focus:ring-2 focus:ring-amber-500 outline-hidden"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* SUBJECT, DIFFICULTY & MARKS ROW */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-white p-3.5 rounded-xl border border-slate-200">
                        <div>
                          <label className="block font-bold text-slate-700 text-[11px] mb-1">Subject *</label>
                          <select
                            value={quickSubjectId || subjectId || subjects[0]?.id}
                            onChange={(e) => setQuickSubjectId(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                          >
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 text-[11px] mb-1">Difficulty</label>
                          <select
                            value={quickDifficulty}
                            onChange={(e: any) => setQuickDifficulty(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                          >
                            <option value="easy">Easy (सरल)</option>
                            <option value="medium">Medium (मध्यम)</option>
                            <option value="hard">Hard (कठिन)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 text-[11px] mb-1">Correct Marks (+)</label>
                          <input
                            type="number"
                            step="0.25"
                            value={quickMarks}
                            onChange={(e) => setQuickMarks(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-700 text-[11px] mb-1">Negative Marks (-)</label>
                          <input
                            type="number"
                            step="0.05"
                            value={quickNegMarks}
                            onChange={(e) => setQuickNegMarks(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white font-medium text-xs"
                          />
                        </div>
                      </div>

                      {/* EXPLANATIONS (ENGLISH & HINDI) */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <label className="block font-bold text-slate-800 text-xs">
                          Explanation & Solution (समाधान और व्याख्या) <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        {quickLanguageMode === 'bilingual' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={quickExplanationEn}
                              onChange={(e) => setQuickExplanationEn(e.target.value)}
                              placeholder="Explanation in English..."
                              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                            />
                            <input
                              type="text"
                              value={quickExplanationHi}
                              onChange={(e) => setQuickExplanationHi(e.target.value)}
                              placeholder="व्याख्या हिंदी में..."
                              className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white"
                            />
                          </div>
                        ) : quickLanguageMode === 'en' ? (
                          <input
                            type="text"
                            value={quickExplanationEn}
                            onChange={(e) => setQuickExplanationEn(e.target.value)}
                            placeholder="Explanation in English..."
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white"
                          />
                        ) : (
                          <input
                            type="text"
                            value={quickExplanationHi}
                            onChange={(e) => setQuickExplanationHi(e.target.value)}
                            placeholder="व्याख्या हिंदी में..."
                            className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs bg-white"
                          />
                        )}
                      </div>

                      {/* Image & Diagram Section (Google Drive Storage - Zero Firebase Storage) */}
                      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-2xs">
                        <DriveImageUploader
                          label="Question Diagram / Image (Google Drive Upload)"
                          value={quickImageUrl}
                          onChange={setQuickImageUrl}
                          helperText="Upload any diagram or formula image. It will be stored directly in your Google Drive 'Pariksha CBT Exam Images' folder (Zero Firebase Storage)."
                        />

                        {/* Option Diagrams (A, B, C, D) Expandable Section */}
                        <div className="pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setShowQuickOptionImages(!showQuickOptionImages)}
                            className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between transition cursor-pointer"
                          >
                            <span className="flex items-center space-x-2">
                              <ImageIcon className="w-4 h-4 text-indigo-600" />
                              <span>Option Choice Diagrams (A, B, C, D) - Upload to Google Drive</span>
                            </span>
                            {showQuickOptionImages ? (
                              <ChevronUp className="w-4 h-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                          </button>

                          {showQuickOptionImages && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                              <DriveImageUploader
                                label="Option A Diagram"
                                value={quickOptAImageUrl}
                                onChange={setQuickOptAImageUrl}
                                compact
                              />
                              <DriveImageUploader
                                label="Option B Diagram"
                                value={quickOptBImageUrl}
                                onChange={setQuickOptBImageUrl}
                                compact
                              />
                              <DriveImageUploader
                                label="Option C Diagram"
                                value={quickOptCImageUrl}
                                onChange={setQuickOptCImageUrl}
                                compact
                              />
                              <DriveImageUploader
                                label="Option D Diagram"
                                value={quickOptDImageUrl}
                                onChange={setQuickOptDImageUrl}
                                compact
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* FORM SUBMISSION BUTTON */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <span className="text-[11px] text-slate-500">
                          {quickLanguageMode === 'bilingual'
                            ? '🌐 Questions will be stored with English & Hindi translations.'
                            : quickLanguageMode === 'hi'
                            ? '🇮🇳 Question will be stored with Hindi content.'
                            : '🇬🇧 Question will be stored with English content.'}
                        </span>

                        <button
                          type="submit"
                          disabled={creatingQuickQ}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs flex items-center space-x-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{creatingQuickQ ? 'Saving Question...' : 'Save & Add to Exam (परीक्षा में जोड़ें)'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ======================================================== */}
              {/* STEP 3: REVIEW & FINALIZE EXAM */}
              {/* ======================================================== */}
              {currentStep === 'review' && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Exam Title</span>
                      <span className="font-extrabold text-slate-900">{name || 'Untitled Exam'}</span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Discipline</span>
                      <span className="font-extrabold text-indigo-700">
                        {subjects.find((s) => s.id === subjectId)?.name || 'Multi-Subject Mock'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Duration & Penalty</span>
                      <span className="font-extrabold text-slate-900">
                        {duration} Mins • -{negativeMarks} Neg
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[11px]">Attached Questions</span>
                      <span className="font-extrabold text-emerald-700 text-sm">
                        {selectedQuestionsList.length} Questions ({selectedQuestionsList.length} Marks)
                      </span>
                    </div>
                  </div>

                  {/* Questions Review List */}
                  {/* Attached Questions Review & Multi-Subject Arrangement */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                          <Layers className="w-4 h-4 text-indigo-600" />
                          <span>Review & Arrange Questions ({selectedQuestionsList.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Reorder questions and subject sections to control the exact sequence students see in the exam.
                        </p>
                      </div>

                      {selectedQuestionsList.length > 0 && (
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={handleAutoGroupBySubject}
                            className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-2xs cursor-pointer"
                            title="Group all questions by subject contiguously"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Auto-Group by Subject</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {selectedQuestionsList.length === 0 ? (
                      <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 text-center space-y-2">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No questions selected yet!</p>
                        <p className="text-[11px] text-slate-500">
                          Go back to Step 2 to select questions from the bank, upload CSV, or create questions.
                        </p>
                        <button
                          type="button"
                          onClick={() => setCurrentStep('questions')}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold mt-2 cursor-pointer"
                        >
                          Go to Step 2: Add Questions
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Review Subject Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 flex-nowrap">
                          <button
                            type="button"
                            onClick={() => setReviewSubjectFilter('all')}
                            className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                              reviewSubjectFilter === 'all'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <span>All Questions ({selectedQuestionsList.length})</span>
                          </button>

                          {selectedSubjectSummary.map((sec, secIdx) => {
                            const isSelected = reviewSubjectFilter === sec.id;
                            return (
                              <div key={sec.id} className="flex items-center shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setReviewSubjectFilter(sec.id)}
                                  className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
                                    isSelected
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span>{sec.name}</span>
                                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                    isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {sec.count} Qs
                                  </span>
                                </button>

                                {/* Section reorder buttons */}
                                <div className="flex items-center ml-1 space-x-0.5">
                                  <button
                                    type="button"
                                    disabled={secIdx === 0}
                                    onClick={() => handleMoveSubjectSection(sec.id, 'up')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                                    title={`Move ${sec.name} section earlier in exam`}
                                  >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={secIdx === selectedSubjectSummary.length - 1}
                                    onClick={() => handleMoveSubjectSection(sec.id, 'down')}
                                    className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-20 hover:bg-slate-100 rounded cursor-pointer"
                                    title={`Move ${sec.name} section later in exam`}
                                  >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Questions List with Full Arrange Controls */}
                        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-[360px] overflow-y-auto bg-slate-50/30">
                          {filteredReviewQuestions.map((q) => {
                            const globalIndex = selectedQuestionIds.indexOf(q.id);
                            const qSubject = q.subject_id || 'general';
                            const sameSubjectQs = selectedQuestionsList.filter((item) => (item.subject_id || 'general') === qSubject);
                            const subjectPos = sameSubjectQs.findIndex((item) => item.id === q.id) + 1;

                            return (
                              <div
                                key={q.id}
                                className="p-3 bg-white hover:bg-slate-50/70 transition flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                  {/* Global Question Number badge */}
                                  <div className="flex flex-col items-center shrink-0">
                                    <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black">
                                      {globalIndex + 1}
                                    </span>
                                  </div>

                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono text-[10px] text-slate-400 font-bold">
                                        #{q.question_id_code}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                                        {q.subject_name || subjects.find((s) => s.id === q.subject_id)?.name || 'General'}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-semibold">
                                        (Section #{subjectPos} of {sameSubjectQs.length})
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                        Ans: {q.correct_answer}
                                      </span>
                                      {q.image_url && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px] flex items-center space-x-1">
                                          <ImageIcon className="w-2.5 h-2.5" />
                                          <span>Diagram</span>
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-semibold text-slate-900 truncate max-w-xl">
                                      {q.question_en || q.question_hi}
                                    </p>
                                  </div>
                                </div>

                                {/* Movement & Arrange Controls */}
                                <div className="flex items-center space-x-1 shrink-0">
                                  <button
                                    type="button"
                                    disabled={globalIndex === 0}
                                    onClick={() => moveQuestionToTop(globalIndex)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-20 cursor-pointer text-[10px] font-bold"
                                    title="Move to Very Top"
                                  >
                                    Top
                                  </button>

                                  <button
                                    type="button"
                                    disabled={globalIndex === 0}
                                    onClick={() => moveQuestionUp(globalIndex)}
                                    className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-20 cursor-pointer"
                                    title="Move Question Up (▲)"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={globalIndex === selectedQuestionIds.length - 1}
                                    onClick={() => moveQuestionDown(globalIndex)}
                                    className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-20 cursor-pointer"
                                    title="Move Question Down (▼)"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={globalIndex === selectedQuestionIds.length - 1}
                                    onClick={() => moveQuestionToBottom(globalIndex)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg disabled:opacity-20 cursor-pointer text-[10px] font-bold"
                                    title="Move to Very Bottom"
                                  >
                                    End
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleToggleQuestion(q.id)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                                    title="Remove from exam"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div>
                {currentStep === 'questions' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('settings')}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Settings</span>
                  </button>
                )}
                {currentStep === 'review' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('questions')}
                    className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 flex items-center space-x-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Back to Questions</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>

                {currentStep === 'settings' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!name.trim()) {
                        alert('Please enter an exam title first.');
                        return;
                      }
                      setCurrentStep('questions');
                    }}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <span>Next: Add Questions</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 'questions' && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('review')}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1 shadow-xs"
                  >
                    <span>Next: Review & Finalize</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}

                {currentStep === 'review' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleFinalSaveExam}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center space-x-1.5 shadow-md transition cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSaving ? 'Saving...' : isEditing ? 'Update & Save Exam' : 'Publish & Launch Exam'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QUICK NEW SUBJECT MODAL (Triggered inside Exam Create) */}
      {/* ======================================================== */}
      {showNewSubjectModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h4 className="font-bold text-sm text-slate-900 flex items-center space-x-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>Create New Exam Subject</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNewSubjectModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateNewSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  placeholder="e.g. Current Affairs & Economics"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Code (Optional)</label>
                <input
                  type="text"
                  value={newSubCode}
                  onChange={(e) => setNewSubCode(e.target.value)}
                  placeholder="e.g. CA-2026"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs uppercase"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newSubDesc}
                  onChange={(e) => setNewSubDesc(e.target.value)}
                  placeholder="Short syllabus overview..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSubjectModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingSub}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  {creatingSub ? 'Creating...' : 'Create Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(examToDelete)}
        title="Delete Examination"
        message={`Are you sure you want to permanently delete "${examToDelete?.name}"? All assigned question links, student attempts, and results for this exam will also be removed.`}
        confirmText="Yes, Delete Exam"
        loading={isDeletingExam}
        onConfirm={confirmDeleteExam}
        onCancel={() => setExamToDelete(null)}
      />
    </div>
  );
};
