import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Exam, Question, SavedAnswer, ExamResult } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import {
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  RotateCcw,
  Send,
  AlertTriangle,
  Globe,
  ShieldAlert,
  User as UserIcon,
  HelpCircle,
  Eye,
  Check,
  X,
  Layers,
  Sparkles,
  LayoutGrid,
  ChevronDown
} from 'lucide-react';

interface CBTExamScreenProps {
  exam: Exam;
  onExamSubmitted: (result: ExamResult) => void;
  onExitExam: () => void;
}

// Helper: Group questions by subject/section contiguously so that all questions
// of a subject are consecutive, matching standard CBT examination flow (NTA / TCS iON)
const groupQuestionsBySubject = (qs: Question[]): Question[] => {
  if (!qs || qs.length === 0) return [];
  const subjectGroups = new Map<string, Question[]>();
  qs.forEach((q) => {
    const key = q.subject_id || 'general';
    if (!subjectGroups.has(key)) {
      subjectGroups.set(key, []);
    }
    subjectGroups.get(key)!.push(q);
  });
  const sorted: Question[] = [];
  subjectGroups.forEach((group) => {
    sorted.push(...group);
  });
  return sorted;
};

export const CBTExamScreen: React.FC<CBTExamScreenProps> = ({
  exam,
  onExamSubmitted,
  onExitExam
}) => {
  const { user } = useAuth();

  // Test session state
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SavedAnswer>>({});
  const [language, setLanguage] = useState<'en' | 'hi'>('en');

  // Subject selection & navigation (e.g. GK, Chemistry, Physics, Math)
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [paletteDrawerOpen, setPaletteDrawerOpen] = useState(false);
  const [sectionNotice, setSectionNotice] = useState<string | null>(null);
  const sectionNoticeTimeoutRef = useRef<any>(null);

  const showSectionNotice = (msg: string) => {
    if (sectionNoticeTimeoutRef.current) clearTimeout(sectionNoticeTimeoutRef.current);
    setSectionNotice(msg);
    sectionNoticeTimeoutRef.current = setTimeout(() => {
      setSectionNotice(null);
    }, 2800);
  };

  // Synchronize selected subject tab with current question unless explicitly viewing 'all'
  useEffect(() => {
    if (questions.length === 0) return;
    const curQuestion = questions[currentIndex];
    if (curQuestion && selectedSubjectId !== 'all') {
      const curSubId = curQuestion.subject_id || 'general';
      if (curSubId !== selectedSubjectId) {
        setSelectedSubjectId(curSubId);
      }
    }
  }, [currentIndex, questions]);

  // Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(exam.duration_minutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Security & Tab monitoring
  const [tabViolations, setTabViolations] = useState(0);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Submit Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitReason, setSubmitReason] = useState<'user' | 'time_up'>('user');

  const timerRef = useRef<any>(null);
  const attemptIdRef = useRef<string | null>(null);
  attemptIdRef.current = attemptId;
  const isSubmittingRef = useRef<boolean>(false);

  // Initialize Exam Session on mount
  useEffect(() => {
    if (!user) return;
    initSession();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (sectionNoticeTimeoutRef.current) clearTimeout(sectionNoticeTimeoutRef.current);
    };
  }, [user]);

  const initSession = async () => {
    try {
      setLoading(true);
      const res = await api.startExamAttempt(exam.id, user!.id);

      if (res.already_completed && res.attempt_id) {
        const existingRes = await api.getAttemptResult(res.attempt_id);
        onExamSubmitted(existingRes.result);
        return;
      }

      setAttemptId(res.attempt_id);

      // Organize questions cleanly by subject/section so consecutive questions belong to the same subject
      const organizedQuestions = groupQuestionsBySubject(res.questions);
      setQuestions(organizedQuestions);
      setRemainingSeconds(res.remaining_seconds);

      // Populate initial answers map
      const initialAnswers: Record<string, SavedAnswer> = {};
      organizedQuestions.forEach((q, idx) => {
        const saved = res.saved_answers[q.id];
        initialAnswers[q.id] = {
          selected_option: saved?.selected_option || null,
          is_marked_for_review: saved ? Boolean(saved.is_marked_for_review) : false,
          is_visited: idx === 0 ? true : (saved ? Boolean(saved.is_visited) : false)
        };
      });
      setAnswers(initialAnswers);
      if (organizedQuestions.length > 0) {
        setSelectedSubjectId(organizedQuestions[0].subject_id || 'general');
      }
    } catch (err: any) {
      setInitError(err.message || 'Failed to initialize exam session');
    } finally {
      setLoading(false);
    }
  };

  // Synchronized countdown timer
  useEffect(() => {
    if (loading || remainingSeconds <= 0 || isSubmitting) return;

    timerRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmitTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading, isSubmitting]);

  // Tab Visibility & Security Monitoring
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && attemptIdRef.current && !isSubmitting) {
        try {
          const res = await api.recordTabSwitch(attemptIdRef.current);
          setTabViolations(res.tab_switches);
          setShowSecurityWarning(true);
        } catch {
          // silent catch
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isSubmitting]);

  const currentQuestion = questions[currentIndex];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  // Auto-save answer to server
  const saveAnswerToServer = async (
    qId: string,
    option: string | null,
    markedForReview: boolean,
    visited: boolean
  ) => {
    if (!attemptId) return;
    setSaveStatus('saving');
    try {
      await api.saveAnswer({
        attempt_id: attemptId,
        question_id: qId,
        selected_option: option,
        is_marked_for_review: markedForReview,
        is_visited: visited
      });
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
    }
  };

  // Handle Option Select
  const handleSelectOption = (optionLetter: 'A' | 'B' | 'C' | 'D') => {
    if (!currentQuestion) return;

    const updatedAnswer: SavedAnswer = {
      selected_option: optionLetter,
      is_marked_for_review: currentAnswer?.is_marked_for_review || false,
      is_visited: true
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedAnswer
    }));

    saveAnswerToServer(
      currentQuestion.id,
      optionLetter,
      updatedAnswer.is_marked_for_review,
      true
    );
  };

  // Clear Response
  const handleClearResponse = () => {
    if (!currentQuestion) return;

    const updatedAnswer: SavedAnswer = {
      selected_option: null,
      is_marked_for_review: false,
      is_visited: true
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedAnswer
    }));

    saveAnswerToServer(currentQuestion.id, null, false, true);
  };

  // Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    if (!currentQuestion) return;

    const updatedAnswer: SavedAnswer = {
      selected_option: currentAnswer?.selected_option || null,
      is_marked_for_review: true,
      is_visited: true
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedAnswer
    }));

    saveAnswerToServer(
      currentQuestion.id,
      updatedAnswer.selected_option,
      true,
      true
    );

    goToNextQuestion();
  };

  // Save & Next
  const handleSaveAndNext = () => {
    if (!currentQuestion) return;

    const updatedAnswer: SavedAnswer = {
      selected_option: currentAnswer?.selected_option || null,
      is_marked_for_review: false,
      is_visited: true
    };

    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: updatedAnswer
    }));

    saveAnswerToServer(
      currentQuestion.id,
      updatedAnswer.selected_option,
      false,
      true
    );

    goToNextQuestion();
  };

  const goToNextQuestion = () => {
    if (questions.length === 0) return;

    // When candidate is focused on a specific subject/section:
    if (selectedSubjectId !== 'all') {
      const secQs = paletteQuestions;
      const currentPosInSec = secQs.findIndex((q) => q.id === currentQuestion?.id);

      // If there is another question in the current subject/section, advance to it:
      if (currentPosInSec >= 0 && currentPosInSec < secQs.length - 1) {
        const nextQ = secQs[currentPosInSec + 1];
        const nextGlobalIdx = questions.findIndex((q) => q.id === nextQ.id);
        if (nextGlobalIdx >= 0) {
          setCurrentIndex(nextGlobalIdx);
          markAsVisited(nextQ.id);
          return;
        }
      }

      // If at the end of current subject, advance to the next subject/section
      const currentSecIdx = sections.findIndex((s) => s.id === selectedSubjectId);
      if (currentSecIdx >= 0 && currentSecIdx < sections.length - 1) {
        const nextSec = sections[currentSecIdx + 1];
        setSelectedSubjectId(nextSec.id);
        const nextQ = questions[nextSec.firstIndex];
        if (nextQ) {
          setCurrentIndex(nextSec.firstIndex);
          markAsVisited(nextQ.id);
          showSectionNotice(`Section completed. Moved to next section: ${nextSec.name}`);
          return;
        }
      } else {
        // Last question of the last subject
        showSectionNotice('You are at the last question of this examination.');
        return;
      }
    }

    // Default sequential navigation across all questions
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      const nextQ = questions[nextIdx];
      if (nextQ && currentQuestion && (nextQ.subject_id || 'general') !== (currentQuestion.subject_id || 'general')) {
        showSectionNotice(`Moved to section: ${nextQ.subject_name || 'Next Section'}`);
      }
      setCurrentIndex(nextIdx);
      markAsVisited(nextQ.id);
    } else {
      showSectionNotice('You are at the last question of this examination.');
    }
  };

  const goToPrevQuestion = () => {
    if (questions.length === 0) return;

    if (selectedSubjectId !== 'all') {
      const secQs = paletteQuestions;
      const currentPosInSec = secQs.findIndex((q) => q.id === currentQuestion?.id);

      if (currentPosInSec > 0) {
        const prevQ = secQs[currentPosInSec - 1];
        const prevGlobalIdx = questions.findIndex((q) => q.id === prevQ.id);
        if (prevGlobalIdx >= 0) {
          setCurrentIndex(prevGlobalIdx);
          markAsVisited(prevQ.id);
          return;
        }
      }

      // If at the start of current subject, look for the previous subject
      const currentSecIdx = sections.findIndex((s) => s.id === selectedSubjectId);
      if (currentSecIdx > 0) {
        const prevSec = sections[currentSecIdx - 1];
        const prevSecQs = questions.filter((q) => (q.subject_id || 'general') === prevSec.id);
        const lastQInPrevSec = prevSecQs[prevSecQs.length - 1];
        if (lastQInPrevSec) {
          const prevGlobalIdx = questions.findIndex((q) => q.id === lastQInPrevSec.id);
          setSelectedSubjectId(prevSec.id);
          if (prevGlobalIdx >= 0) {
            setCurrentIndex(prevGlobalIdx);
            markAsVisited(lastQInPrevSec.id);
            showSectionNotice(`Moved to previous section: ${prevSec.name}`);
            return;
          }
        }
      }
      return;
    }

    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      markAsVisited(questions[prevIdx].id);
    }
  };

  // Mobile & Tablet Touch Swipe Handlers for smooth question sliding
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartXRef.current;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;

    // Minimum 45px swipe distance, and horizontal displacement must exceed vertical displacement
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 45) {
      if (deltaX < 0) {
        // Swiped Left -> Next Question
        goToNextQuestion();
      } else {
        // Swiped Right -> Previous Question
        goToPrevQuestion();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
  };

  const jumpToQuestion = (index: number) => {
    setCurrentIndex(index);
    markAsVisited(questions[index].id);
  };

  const markAsVisited = (qId: string) => {
    setAnswers((prev) => {
      const existing = prev[qId] || { selected_option: null, is_marked_for_review: false, is_visited: false };
      if (!existing.is_visited) {
        const updated = { ...existing, is_visited: true };
        saveAnswerToServer(qId, updated.selected_option, updated.is_marked_for_review, true);
        return { ...prev, [qId]: updated };
      }
      return prev;
    });
  };

  // Sections (Subjects) Breakdown
  const sections = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number; firstIndex: number }>();
    questions.forEach((q, idx) => {
      const subId = q.subject_id || 'general';
      const subName = q.subject_name || 'General Section';
      if (!map.has(subId)) {
        map.set(subId, { id: subId, name: subName, count: 0, firstIndex: idx });
      }
      map.get(subId)!.count += 1;
    });
    return Array.from(map.values());
  }, [questions]);

  // Questions belonging to the currently active question's section
  const currentSecQuestions = useMemo(() => {
    if (!currentQuestion) return [];
    const curSub = currentQuestion.subject_id || 'general';
    return questions.filter((q) => (q.subject_id || 'general') === curSub);
  }, [questions, currentQuestion]);

  const secQuestionNumber = useMemo(() => {
    if (!currentQuestion) return 1;
    const idx = currentSecQuestions.findIndex((q) => q.id === currentQuestion.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [currentSecQuestions, currentQuestion]);

  // Filter questions for the question palette based on selectedSubjectId
  const paletteQuestions = useMemo(() => {
    if (selectedSubjectId === 'all') {
      return questions;
    }
    return questions.filter((q) => (q.subject_id || 'general') === selectedSubjectId);
  }, [questions, selectedSubjectId]);

  // Overall Statistics for Submit Modal
  const stats = useMemo(() => ({
    total: questions.length,
    answered: Object.values(answers).filter((a) => a.selected_option && !a.is_marked_for_review).length,
    answeredAndMarked: Object.values(answers).filter((a) => a.selected_option && a.is_marked_for_review).length,
    markedForReview: Object.values(answers).filter((a) => !a.selected_option && a.is_marked_for_review).length,
    notAnswered: Object.values(answers).filter((a) => !a.selected_option && !a.is_marked_for_review && a.is_visited).length,
    notVisited: Object.values(answers).filter((a) => !a.is_visited).length
  }), [questions, answers]);

  // Stats for the active question palette view (reflects the selected subject's question count)
  const paletteStats = useMemo(() => {
    return {
      total: paletteQuestions.length,
      answered: paletteQuestions.filter((q) => answers[q.id]?.selected_option && !answers[q.id]?.is_marked_for_review).length,
      answeredAndMarked: paletteQuestions.filter((q) => answers[q.id]?.selected_option && answers[q.id]?.is_marked_for_review).length,
      markedForReview: paletteQuestions.filter((q) => !answers[q.id]?.selected_option && answers[q.id]?.is_marked_for_review).length,
      notAnswered: paletteQuestions.filter((q) => !answers[q.id]?.selected_option && !answers[q.id]?.is_marked_for_review && answers[q.id]?.is_visited).length,
      notVisited: paletteQuestions.filter((q) => !answers[q.id]?.is_visited).length
    };
  }, [paletteQuestions, answers]);

  // Format timer MM:SS or HH:MM:SS (matches Testbook CBT Simulation 29:39 format)
  const formatTime = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Auto-submit automatically when time is up (no modal confirmation required)
  const handleAutoSubmitTimeUp = async () => {
    setSubmitReason('time_up');
    await submitFinalExam('time_up');
  };

  // Final submission action
  const submitFinalExam = async (reason: 'user' | 'time_up' = 'user') => {
    const targetAttemptId = attemptIdRef.current || attemptId;
    if (!targetAttemptId || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    try {
      const result = await api.submitExamAttempt(targetAttemptId);
      onExamSubmitted(result);
    } catch (err: any) {
      console.error('Submission failed', err);
      if (reason === 'time_up') {
        // Auto-retry once after 1 second if network hiccup occurs on time expiry
        setTimeout(async () => {
          try {
            const retryRes = await api.submitExamAttempt(targetAttemptId);
            onExamSubmitted(retryRes);
          } catch (e: any) {
            alert(`Auto-submission notice: ${e.message || err.message}`);
            isSubmittingRef.current = false;
            setIsSubmitting(false);
          }
        }, 1000);
      } else {
        alert(`Submission failed: ${err.message}. Retrying...`);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    }
  };

  // Helper to determine question palette button style with crisp status colors
  const getQuestionPaletteStyle = (q: Question, idx: number) => {
    const isCurrent = idx === currentIndex;
    const ans = answers[q.id];

    let baseBg = 'bg-slate-200 text-slate-700 hover:bg-slate-300'; // Default Not Visited

    if (ans?.is_visited) {
      if (ans.selected_option && ans.is_marked_for_review) {
        baseBg = 'bg-purple-700 text-white hover:bg-purple-800'; // Answered & Marked
      } else if (ans.is_marked_for_review) {
        baseBg = 'bg-purple-600 text-white hover:bg-purple-700'; // Marked for review
      } else if (ans.selected_option) {
        baseBg = 'bg-emerald-600 text-white hover:bg-emerald-700'; // Answered (Green)
      } else {
        baseBg = 'bg-rose-600 text-white hover:bg-rose-700'; // Visited but not answered (Red)
      }
    }

    // Unmistakable highlighting for the currently active question
    const activeRing = isCurrent
      ? 'ring-2 ring-blue-600 ring-offset-1 scale-105 font-black shadow-xs z-10 border-2 border-white'
      : 'border border-transparent';

    return `${baseBg} ${activeRing}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold">Initializing Secure CBT Terminal...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to server database and loading question paper...</p>
      </div>
    );
  }

  if (initError) {
    const isGateVerificationError = initError.toLowerCase().includes('verification') || initError.toLowerCase().includes('gate');

    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        {isGateVerificationError ? (
          <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-2xl max-w-lg w-full text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider mb-2">
                Center Gate Verification Required
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Exam Hall Entry Awaiting Approval
              </h2>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Strict center verification is active for this examination. Please report to the invigilator verification desk at the hall gate to confirm your registration.
              </p>
            </div>

            {/* Candidate Quick Badge */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Candidate</span>
                <strong className="text-slate-800">{user?.name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Roll Number</span>
                <strong className="font-mono text-indigo-700">{user?.roll_number}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Examination</span>
                <strong className="text-slate-800 truncate block">{exam.name}</strong>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Verification Desk</span>
                <span className="text-amber-700 font-bold">Gate Desk 1 (Pending)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setInitError(null);
                  initSession();
                }}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Check Verification Status</span>
              </button>

              <button
                onClick={onExitExam}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-2xl border border-rose-200 shadow-xl max-w-md w-full text-center">
            <AlertTriangle className="w-12 h-12 text-rose-600 mx-auto mb-3" />
            <h2 className="text-xl font-black text-slate-900">Exam Access Notice</h2>
            <p className="text-xs text-slate-600 mt-2 mb-6 leading-relaxed">{initError}</p>
            <button
              onClick={onExitExam}
              className="w-full py-2.5 px-4 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition cursor-pointer"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    );
  }

  // Get question text & options in active language (bidirectional fallback between English and Hindi)
  const qText = language === 'hi'
    ? (currentQuestion?.question_hi?.trim() || currentQuestion?.question_en)
    : (currentQuestion?.question_en?.trim() || currentQuestion?.question_hi);

  const getOptionText = (key: 'a' | 'b' | 'c' | 'd') => {
    if (!currentQuestion) return '';
    if (language === 'hi') {
      const hi = (currentQuestion as any)[`option_${key}_hi`];
      if (hi && hi.trim()) return hi;
      return (currentQuestion as any)[`option_${key}_en`] || '';
    }
    const en = (currentQuestion as any)[`option_${key}_en`];
    if (en && en.trim()) return en;
    return (currentQuestion as any)[`option_${key}_hi`] || '';
  };

  const isTimeCritical = remainingSeconds <= 300; // Under 5 minutes



  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full overflow-hidden bg-slate-100 flex flex-col select-none text-slate-900 font-sans touch-manipulation">
      {/* 1. TOP EXAMINATION PORTAL HEADER - Clean Single Line with Original BDC Branding & Colors */}
      <header className="bg-[#070d1e] text-white border-b border-slate-800 shrink-0 z-30 shadow-sm">
        <div className="px-3 sm:px-6 h-14 flex items-center justify-between gap-3 overflow-hidden">
          {/* LEFT: BDC Brand Logo + Exam Name + Auto-save indicator */}
          <div className="flex items-center space-x-2.5 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-xs shrink-0 tracking-wider border border-blue-400">
              BDC
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-xs sm:text-sm text-white truncate max-w-[150px] xs:max-w-[200px] sm:max-w-md md:max-w-xl" title={exam.name}>
                {exam.name}
              </h1>
              <div className="flex items-center space-x-1.5 text-[10px] text-emerald-400 font-medium leading-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                <span>Saved</span>
              </div>
            </div>
          </div>

          {/* RIGHT: Language pills (English / हिंदी) + Candidate info + Time Left */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Language Toggle: English & हिंदी pills */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-lg p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  language === 'en'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  language === 'hi'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                हिंदी
              </button>
            </div>

            {/* Candidate Box */}
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="leading-tight hidden sm:block text-left">
                <div className="text-white font-bold text-xs truncate max-w-[110px]">{user?.name || 'Candidate'}</div>
                <div className="text-[9px] text-slate-400 font-mono">ROLL-{user?.roll_number || '368613'}</div>
              </div>
            </div>

            {/* Time Left Container */}
            <div
              className={`bg-slate-900 border border-slate-700/80 px-2.5 sm:px-3 py-1 rounded-lg flex items-center space-x-1.5 sm:space-x-2 text-xs transition ${
                isTimeCritical ? 'border-rose-500/80 bg-rose-950/60' : ''
              }`}
            >
              <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${isTimeCritical ? 'text-rose-400 animate-pulse' : 'text-blue-400'}`} />
              <div className="leading-tight text-left">
                <div className="text-[8px] uppercase tracking-wider text-slate-400 font-bold hidden sm:block">TIME LEFT</div>
                <div className="font-mono text-white font-bold text-xs sm:text-sm tracking-wider">
                  {formatTime(remainingSeconds)}
                </div>
              </div>
            </div>

            {/* Mobile/Tablet Palette Trigger */}
            <button
              type="button"
              onClick={() => setPaletteDrawerOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700"
              title="Open Palette"
            >
              <LayoutGrid className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. SECTION SUB-BAR (Directly below Top Bar, single line) */}
      {sections.length > 0 && (
        <div className="bg-[#f1f5f9] border-b border-slate-200 px-3 sm:px-6 py-2 shrink-0 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-0.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>CHOOSE SUBJECT:</span>
            </span>
            {sections.map((sec) => {
              const isSelected = selectedSubjectId === sec.id || (selectedSubjectId === 'all' && sec.id === sections[0]?.id);
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubjectId(sec.id);
                    jumpToQuestion(sec.firstIndex);
                  }}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition shrink-0 whitespace-nowrap cursor-pointer shadow-2xs flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{sec.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {sec.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Marks & Negative display on right */}
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-600 shrink-0 hidden sm:flex">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold">
              +{currentQuestion?.marks || 1} Marks
            </span>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded font-bold">
              -{currentQuestion?.negative_marks || exam.negative_marks || 0.25} Neg
            </span>
          </div>
        </div>
      )}

      {/* 3. MAIN BODY AREA */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-white">
        {/* LEFT CANVAS: QUESTION & OPTIONS */}
        <main className="flex-1 min-w-0 flex flex-col h-full bg-white border-r border-slate-200 overflow-hidden">
          {/* Question Text & Options Container */}
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-4xl w-full flex flex-col justify-between touch-pan-y overscroll-contain"
          >
            <div>
              {/* Question Number & Topic Meta Bar */}
              <div className="flex items-center justify-between pb-3 mb-5 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                  <span className="text-sm sm:text-base font-extrabold text-blue-700">
                    QUESTION {currentIndex + 1} OF {questions.length}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 hidden sm:inline">
                    (SECTION #{secQuestionNumber}/{currentSecQuestions.length})
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium opacity-75 tracking-tight">
                  Topic: <span className="text-slate-500 font-semibold">{currentQuestion?.topic_name || currentQuestion?.subject_name || 'General'}</span>
                </div>
              </div>

              {/* Question Statement */}
              <div className="text-base sm:text-[17px] font-semibold text-slate-900 leading-relaxed mb-6 select-text">
                <span className="text-blue-700 font-bold mr-2">Q{currentIndex + 1}.</span>
                {qText}
              </div>

              {/* Diagram if available */}
              {currentQuestion?.image_url && (
                <div className="mb-6 inline-block w-full max-w-md">
                  <div
                    onClick={() => setImagePreviewUrl(currentQuestion.image_url || null)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition"
                    title="Click diagram to enlarge"
                  >
                    <img
                      src={currentQuestion.image_url}
                      alt="Question Diagram"
                      className="rounded-lg max-h-52 object-contain mx-auto"
                      loading="lazy"
                    />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-blue-700 flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Tap diagram to enlarge
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Clean Options Cards */}
              <div className="space-y-3 mb-6">
                {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                  const optKey = letter.toLowerCase() as 'a' | 'b' | 'c' | 'd';
                  const isSelected = currentAnswer?.selected_option === letter;
                  const optionText = getOptionText(optKey);

                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full text-left flex items-center p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-500'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                      }`}
                    >
                      {/* Radio Circle */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3.5 shrink-0 ${
                          isSelected ? 'border-blue-600' : 'border-slate-400 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>

                      {/* Letter A, B, C, D */}
                      <div
                        className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 mr-3.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {letter}
                      </div>

                      {/* Option Text */}
                      <div className={`text-sm sm:text-[15px] select-text flex-1 ${isSelected ? 'text-slate-950 font-semibold' : 'text-slate-800'}`}>
                        {optionText}
                      </div>

                      {/* Selected Badge on right */}
                      {isSelected && (
                        <span className="ml-2 px-2.5 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-md flex items-center space-x-1 shrink-0">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>SELECTED</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action Toolbar Pinned at Bottom Left */}
          <div className="shrink-0 px-4 sm:px-6 py-3 bg-white border-t border-slate-200 z-20 flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                type="button"
                onClick={goToPrevQuestion}
                disabled={currentIndex === 0}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none font-bold text-xs px-3 sm:px-3.5 py-2.5 rounded-lg transition cursor-pointer flex items-center space-x-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden xs:inline">Previous</span>
              </button>
              <button
                type="button"
                onClick={handleClearResponse}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs px-3 sm:px-3.5 py-2.5 rounded-lg transition cursor-pointer flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleMarkForReviewAndNext}
                className="border border-purple-400 text-purple-700 hover:bg-purple-50 font-bold text-xs px-3.5 sm:px-4 py-2.5 rounded-lg transition cursor-pointer flex items-center space-x-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Mark for Review & Next</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveAndNext}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-lg shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
            >
              <span>Save & Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </main>

        {/* RIGHT SIDEBAR: QUESTION PALETTE */}
        <aside className="hidden lg:flex lg:w-72 xl:w-80 shrink-0 flex-col h-full bg-[#f8fafc] border-l border-slate-200 overflow-hidden justify-between p-4">
          <div className="space-y-4">
            {/* Candidate Card at top of Sidebar */}
            <div className="flex items-center space-x-3 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'RU'}
              </div>
              <div className="min-w-0">
                <div className="text-slate-900 font-extrabold text-xs truncate">{user?.name || 'Candidate'}</div>
                <div className="text-[10px] text-slate-500 font-mono font-medium">Roll: ROLL-{user?.roll_number || '368613'}</div>
              </div>
            </div>

            {/* 4 Status Badges Grid */}
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                STATUS ({sections.find(s => s.id === selectedSubjectId)?.name || 'ALL SUBJECTS'}):
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {stats.answered}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {stats.notAnswered}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {stats.markedForReview}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Marked Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {stats.notVisited}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Section Title */}
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider pt-2 border-t border-slate-200 flex items-center justify-between">
              <span>QUESTION PALETTE:</span>
              <span className="text-blue-600 font-bold font-mono text-[11px]">{paletteQuestions.length} Questions</span>
            </div>

            {/* Question Palette Grid (4 columns) */}
            <div className="overflow-y-auto max-h-[calc(100vh-360px)] grid grid-cols-4 gap-2.5 p-0.5">
              {paletteQuestions.map((q) => {
                const actualIdx = questions.findIndex((item) => item.id === q.id);
                const isCurrent = actualIdx === currentIndex;
                const ans = answers[q.id];

                let tileStyle = 'bg-slate-200 text-slate-700 hover:bg-slate-300';
                if (ans?.is_visited) {
                  if (ans.selected_option && ans.is_marked_for_review) {
                    tileStyle = 'bg-purple-600 text-white';
                  } else if (ans.is_marked_for_review) {
                    tileStyle = 'bg-purple-600 text-white';
                  } else if (ans.selected_option) {
                    tileStyle = 'bg-emerald-600 text-white';
                  } else {
                    tileStyle = 'bg-rose-600 text-white';
                  }
                }

                if (isCurrent) {
                  tileStyle = 'border-2 border-blue-600 bg-blue-50 text-blue-700 font-black shadow-xs';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => jumpToQuestion(actualIdx)}
                    className={`w-11 h-11 rounded-xl text-xs font-bold flex items-center justify-center transition cursor-pointer ${tileStyle}`}
                    title={`Question ${actualIdx + 1}`}
                  >
                    {actualIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Action Area: Green SUBMIT TEST + Exit Test */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={() => {
                setSubmitReason('user');
                setShowSubmitModal(true);
              }}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer text-center flex items-center justify-center space-x-2"
            >
              <Send className="w-4 h-4" />
              <span>SUBMIT TEST</span>
            </button>
            <button
              type="button"
              onClick={onExitExam}
              className="text-slate-500 hover:text-slate-800 text-xs font-semibold block text-center w-full cursor-pointer transition py-1"
            >
              Exit Test
            </button>
          </div>
        </aside>
      </div>

      {/* MOBILE & TABLET QUESTION PALETTE SLIDE-OVER DRAWER */}
      {paletteDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setPaletteDrawerOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer panel */}
          <div className="relative w-full max-w-xs xs:max-w-sm sm:max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="font-extrabold text-sm sm:text-base">
                  {selectedSubjectId === 'all'
                    ? `All Questions (${questions.length})`
                    : `${sections.find((s) => s.id === selectedSubjectId)?.name || 'Subject'} (${paletteQuestions.length})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPaletteDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 cursor-pointer"
                title="Close Palette"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate strip */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-2.5 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white font-black flex items-center justify-center text-xs shrink-0">
                {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
              </div>
              <div className="truncate">
                <div className="font-extrabold text-xs text-slate-900 truncate">{user?.name}</div>
                <div className="text-[10px] text-slate-500 font-mono truncate">Roll: {user?.roll_number}</div>
              </div>
            </div>

            {/* Status Legend */}
            <div className="p-3 bg-white border-b border-slate-200 shrink-0">
              <div className="text-[10px] font-black uppercase text-slate-500 mb-1.5 truncate">
                Status ({selectedSubjectId === 'all' ? 'All Sections' : sections.find((s) => s.id === selectedSubjectId)?.name || 'Subject'}):
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {paletteStats.answered}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-rose-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {paletteStats.notAnswered}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Not Answered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-purple-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {paletteStats.markedForReview}
                  </span>
                  <span className="text-slate-700 font-medium text-[11px]">Marked Review</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                    {paletteStats.notVisited}
                  </span>
                  <span className="text-slate-600 font-medium text-[11px]">Not Visited</span>
                </div>
              </div>
            </div>

            {/* Question Grid */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
              <div className="text-xs font-bold text-slate-600 mb-2 flex items-center justify-between">
                <span>Select Question to Jump:</span>
                <span className="text-[11px] text-blue-700 font-mono">
                  {selectedSubjectId === 'all' ? 'All' : sections.find((s) => s.id === selectedSubjectId)?.name || 'Subject'} ({paletteQuestions.length} Qs)
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {paletteQuestions.map((q) => {
                  const actualIdx = questions.findIndex((item) => item.id === q.id);
                  const isCurrent = actualIdx === currentIndex;
                  const style = getQuestionPaletteStyle(q, actualIdx);

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        jumpToQuestion(actualIdx);
                        setPaletteDrawerOpen(false);
                      }}
                      className={`h-10 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center transition cursor-pointer relative shadow-2xs active:scale-[0.96] ${style}`}
                    >
                      {actualIdx + 1}
                      {isCurrent && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white animate-pulse" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Drawer Bottom Submit Button */}
            <div className="p-3.5 bg-white border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setPaletteDrawerOpen(false);
                  setSubmitReason('user');
                  setShowSubmitModal(true);
                }}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black flex items-center justify-center space-x-2 shadow-md transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>SUBMIT TEST NOW</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SECURITY TAB SWITCH WARNING MODAL */}
      {showSecurityWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-rose-200 shadow-2xl text-center">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-600">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-900">Security Warning: Window Switch Detected</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              You navigated away or minimized the examination window. This action has been logged on the server.
            </p>
            <div className="my-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
              Violations Recorded: {tabViolations}
            </div>
            <p className="text-[11px] text-slate-500 mb-5">
              Continued violations may lead to automatic test termination.
            </p>
            <button
              type="button"
              onClick={() => setShowSecurityWarning(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              I Understand & Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* 4. SUBMIT CONFIRMATION MODAL (Manual Candidate Click Only) */}
      {showSubmitModal && submitReason === 'user' && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Submit Examination Confirmation
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to finish and submit your exam? You cannot re-enter once submitted.
              </p>
            </div>

            {/* Summary breakdown table */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 mb-6">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                Attempt Summary
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600">Total Questions:</span>
                  <strong className="text-slate-900 font-mono text-sm">{stats.total}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-emerald-200 flex justify-between items-center">
                  <span className="text-emerald-800 font-semibold">Answered:</span>
                  <strong className="text-emerald-700 font-mono text-sm">
                    {stats.answered + stats.answeredAndMarked}
                  </strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-rose-200 flex justify-between items-center">
                  <span className="text-rose-800 font-semibold">Not Answered:</span>
                  <strong className="text-rose-700 font-mono text-sm">{stats.notAnswered}</strong>
                </div>

                <div className="bg-white p-2.5 rounded-lg border border-purple-200 flex justify-between items-center">
                  <span className="text-purple-800 font-semibold">Marked for Review:</span>
                  <strong className="text-purple-700 font-mono text-sm">
                    {stats.markedForReview + stats.answeredAndMarked}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Resume Exam
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => submitFinalExam('user')}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md hover:shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center space-x-1.5"
              >
                <span>{isSubmitting ? 'Submitting & Grading on Server...' : 'Confirm & Final Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-SUBMISSION FULLSCREEN OVERLAY (When time runs out or grading in progress) */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-white text-center animate-in fade-in duration-200">
          <div className="w-16 h-16 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {submitReason === 'time_up' ? 'Time Expired! Submitting Automatically...' : 'Grading & Submitting Your Exam...'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-md leading-relaxed">
            {submitReason === 'time_up'
              ? 'Your allotted exam duration has ended. All your answers are being automatically saved and submitted to the server.'
              : 'Please wait while your answers are being safely graded and stored on the server.'}
          </p>
        </div>
      )}

      {/* 5. IMAGE PREVIEW ZOOM MODAL */}
      {imagePreviewUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setImagePreviewUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-xs font-bold text-slate-700 mb-3">Diagram High-Resolution View</h4>
            <div className="flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={imagePreviewUrl}
                alt="Enlarged Question Diagram"
                className="object-contain max-h-[70vh] rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
