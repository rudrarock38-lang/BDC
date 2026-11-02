import React, { useState, useEffect } from 'react';
import { ExamResult, QuestionBreakdownItem, SubjectScore, DifficultyScore, AttemptAnalytics } from '../../types';
import { api } from '../../api/client';
import { OfficialResultMarksheetModal } from '../common/OfficialResultMarksheetModal';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  BarChart3,
  BookOpen,
  Sparkles,
  TrendingUp,
  Layers,
  Zap,
  Lightbulb,
  ChevronRight,
  ShieldAlert,
  Flame,
  Lock,
  Printer,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  RotateCcw,
  X
} from 'lucide-react';

interface ExamResultViewProps {
  attemptId: string;
  onBackToDashboard: () => void;
  onReattemptExam?: (exam: any) => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({ attemptId, onBackToDashboard, onReattemptExam }) => {
  const [result, setResult] = useState<ExamResult | null>(null);
  const [examDetails, setExamDetails] = useState<any | null>(null);
  const [reattemptLoading, setReattemptLoading] = useState(false);
  const [isWithheld, setIsWithheld] = useState(false);
  const [showOfficialMarksheet, setShowOfficialMarksheet] = useState(false);
  const [breakdown, setBreakdown] = useState<QuestionBreakdownItem[]>([]);
  const [subjectBreakdown, setSubjectBreakdown] = useState<SubjectScore[]>([]);
  const [difficultyBreakdown, setDifficultyBreakdown] = useState<DifficultyScore[]>([]);
  const [analytics, setAnalytics] = useState<AttemptAnalytics | null>(null);

  // Tab: 'scorecard' | 'analytics' | 'solutions'
  const [activeTab, setActiveTab] = useState<'scorecard' | 'analytics' | 'solutions'>('scorecard');

  // Filters for solutions tab
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong' | 'unanswered'>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    loadResultData();
  }, [attemptId]);

  const loadResultData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAttemptResult(attemptId);
      if ((data as any).is_published === 0 || (data.result && (data.result as any).is_published === 0)) {
        setIsWithheld(true);
        setResult(data.result);
        return;
      }

      setResult(data.result);
      setBreakdown(data.breakdown || []);
      setSubjectBreakdown(data.subject_breakdown || []);
      setDifficultyBreakdown(data.difficulty_breakdown || []);
      setAnalytics(data.analytics || null);

      if (data.result?.exam_id) {
        api.getExamById(data.result.exam_id).then(setExamDetails).catch(() => {});
      }

      // Trigger celebratory confetti if candidate scored well (>= 50%)
      if (data.result && data.result.percentage >= 50) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load examination result');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <h3 className="text-base font-bold text-slate-800">Calculating Official Scorecard & Subject Analysis...</h3>
        <p className="text-xs text-slate-500 mt-1">Evaluating subject-wise marks, negative deductions, and analytics.</p>
      </div>
    );
  }

  if (isWithheld && result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-8 space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Scorecard Pending Administrative Release
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Examination: <strong className="text-slate-800">{result.exam_name}</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-700 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Submission Time:</span>
              <span className="font-semibold text-slate-800">
                {new Date(result.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Recorded Status:</span>
              <span className="font-bold text-emerald-700 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Safely Submitted</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Candidate Access:</span>
              <span className="font-bold text-amber-700">Withheld by Center Controller</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            The administrator has temporarily withheld scorecards for this test session. You will be able to view your score, percentage, rank standing, and detailed answer keys once released by the center admin.
          </p>

          <button
            onClick={onBackToDashboard}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-900">Unable to Load Result</h3>
        <p className="text-xs text-slate-500 mt-1 mb-6">{error || 'Scorecard data missing'}</p>
        <button
          onClick={onBackToDashboard}
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const formatMinutes = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Filter questions for solutions tab
  const filteredQuestions = breakdown.filter((item) => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'correct' && item.status === 'correct') ||
      (filter === 'wrong' && item.status === 'wrong') ||
      (filter === 'unanswered' && item.status === 'unanswered');

    const matchesSubject =
      selectedSubjectFilter === 'all' || item.subject_id === selectedSubjectFilter;

    return matchesStatus && matchesSubject;
  });

  const handleReattemptExam = async () => {
    if (!result?.exam_id || !onReattemptExam) return;
    setReattemptLoading(true);
    try {
      const exam = examDetails || await api.getExamById(result.exam_id);
      if (exam.allow_reattempt === 0 || (exam as any).allow_reattempt === false) {
        alert('Re-attempts have been disabled for this examination by the Administrator.');
        return;
      }
      onReattemptExam(exam);
    } catch (err: any) {
      alert(err.message || 'Failed to initialize re-attempt session');
    } finally {
      setReattemptLoading(false);
    }
  };

  const isReattemptAllowedByAdmin = examDetails
    ? examDetails.allow_reattempt !== 0 && (examDetails as any).allow_reattempt !== false
    : true;

  return (
    <div className="max-w-6xl mx-auto px-3.5 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBackToDashboard}
          className="w-full sm:w-auto min-h-[44px] text-xs font-bold text-slate-700 hover:text-slate-950 active:bg-slate-100 flex items-center justify-center space-x-1.5 transition bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          {onReattemptExam && isReattemptAllowedByAdmin && (
            <button
              type="button"
              disabled={reattemptLoading}
              onClick={handleReattemptExam}
              className="w-full sm:w-auto min-h-[44px] text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 flex items-center justify-center space-x-1.5 transition px-4 py-2.5 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
              title="Take this test again with fresh timer and questions"
            >
              <RotateCcw className={`w-4 h-4 ${reattemptLoading ? 'animate-spin' : ''}`} />
              <span>{reattemptLoading ? 'Starting Session...' : 'Re-attempt Examination'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowOfficialMarksheet(true)}
            className="w-full sm:w-auto min-h-[44px] text-xs font-bold text-indigo-700 hover:text-indigo-900 active:bg-indigo-200 bg-indigo-50 hover:bg-indigo-100 flex items-center justify-center space-x-1.5 transition px-4 py-2.5 rounded-xl border border-indigo-200 shadow-2xs cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-600" />
            <span>Print / Download Official Marksheet (PDF)</span>
          </button>
        </div>
      </div>

      {/* 1. SCORECARD HERO BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl sm:rounded-3xl p-5 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Exam Completed
              </span>
              <span className="text-xs text-slate-400 font-mono">Roll: {result.roll_number}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
              {result.exam_name}
            </h1>
            <p className="text-xs text-slate-300">
              Candidate: <strong>{result.student_name}</strong> | Submitted: {new Date(result.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 text-left sm:text-right w-full sm:w-auto min-w-[180px]">
            <div className="text-[10px] sm:text-[11px] text-slate-300 font-medium uppercase tracking-wider">
              Total Final Score
            </div>
            <div className="text-2xl sm:text-3xl md:text-4xl font-black text-emerald-400 mt-0.5">
              {result.final_score.toFixed(2)}
              <span className="text-xs sm:text-sm font-normal text-slate-300 ml-1">
                / {result.total_questions} Marks
              </span>
            </div>
            <div className="text-xs font-semibold text-blue-200 mt-1 flex items-center sm:justify-end space-x-2">
              <span>{result.percentage.toFixed(1)}%</span>
              <span>•</span>
              <span className="px-2 py-0.5 rounded bg-blue-500/30 border border-blue-400/40 text-blue-200">
                Rank #{result.rank}
              </span>
            </div>
          </div>
        </div>

        {/* Core Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium">Attempted</span>
            <span className="text-base sm:text-lg font-black text-white mt-0.5 block">
              {result.attempted} / {result.total_questions}
            </span>
          </div>

          <div className="bg-emerald-500/10 rounded-xl p-2.5 sm:p-3 border border-emerald-500/20">
            <span className="text-[10px] sm:text-[11px] text-emerald-300 block font-medium">Correct</span>
            <span className="text-base sm:text-lg font-black text-emerald-400 mt-0.5 block">
              +{result.correct} (+{result.marks_obtained.toFixed(1)})
            </span>
          </div>

          <div className="bg-rose-500/10 rounded-xl p-2.5 sm:p-3 border border-rose-500/20">
            <span className="text-[10px] sm:text-[11px] text-rose-300 block font-medium">Wrong</span>
            <span className="text-base sm:text-lg font-black text-rose-400 mt-0.5 block">
              -{result.wrong} (-{result.negative_marks_deducted.toFixed(1)})
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium">Unanswered</span>
            <span className="text-base sm:text-lg font-black text-slate-300 mt-0.5 block">
              {result.unanswered}
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium">Accuracy</span>
            <span className="text-base sm:text-lg font-black text-blue-300 mt-0.5 block">
              {result.accuracy.toFixed(1)}%
            </span>
          </div>

          <div className="bg-white/5 rounded-xl p-2.5 sm:p-3 border border-white/10">
            <span className="text-[10px] sm:text-[11px] text-slate-300 block font-medium">Time Taken</span>
            <span className="text-base sm:text-lg font-black text-amber-300 mt-0.5 block">
              {formatMinutes(result.time_taken_seconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher - Smooth horizontal scrolling on mobile/tablet */}
      <div className="flex border-b border-slate-200 bg-white rounded-xl p-1 shadow-2xs overflow-x-auto scrollbar-none flex-nowrap">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`min-h-[44px] shrink-0 whitespace-nowrap flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer ${
            activeTab === 'scorecard'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>Scorecard</span>
          <span className="hidden sm:inline"> (Subject-Wise)</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`min-h-[44px] shrink-0 whitespace-nowrap flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>Analytics</span>
          <span className="hidden sm:inline-block px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-black">
            NEW
          </span>
        </button>

        <button
          onClick={() => setActiveTab('solutions')}
          className={`min-h-[44px] shrink-0 whitespace-nowrap flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center space-x-1.5 transition cursor-pointer ${
            activeTab === 'solutions'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4 shrink-0" />
          <span>Solutions</span>
          <span className="hidden sm:inline"> & Explanations</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SUBJECT-WISE SCORECARD */}
      {/* ======================================================== */}
      {activeTab === 'scorecard' && (
        <div className="space-y-6">
          {/* Section Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Subject-Wise Marks Breakdown</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Review your marks obtained, correct and incorrect answers, and negative marking penalty for each subject.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('analytics')}
                className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold flex items-center space-x-1.5 transition border border-blue-200"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>View Full Analytics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Subject Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              {subjectBreakdown.map((sub) => {
                const isPassed = sub.percentage >= 40;
                return (
                  <div
                    key={sub.subject_id}
                    className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-md transition space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-extrabold text-slate-900">
                            {sub.subject_name}
                          </h3>
                          {sub.subject_code && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                              {sub.subject_code}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {sub.total_questions} Questions • Max Marks: {sub.max_marks}
                        </div>
                      </div>

                      {/* Final Score in this subject */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 font-semibold block uppercase">
                          Score
                        </span>
                        <span className="text-2xl font-black text-slate-900">
                          {sub.final_score > 0 ? `+${sub.final_score.toFixed(2)}` : sub.final_score.toFixed(2)}
                          <span className="text-xs font-normal text-slate-400 ml-1">
                            / {sub.max_marks}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-semibold text-slate-600">
                        <span>Score Percentage</span>
                        <span className={isPassed ? 'text-emerald-700' : 'text-amber-700'}>
                          {sub.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.percentage >= 70
                              ? 'bg-emerald-500'
                              : sub.percentage >= 40
                              ? 'bg-blue-500'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Numbers */}
                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/80">
                        <span className="text-[10px] text-slate-400 block font-medium">Attempted</span>
                        <span className="font-bold text-slate-800">{sub.attempted}</span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200/60">
                        <span className="text-[10px] text-emerald-700 block font-medium">Correct</span>
                        <span className="font-bold text-emerald-800">+{sub.correct}</span>
                      </div>
                      <div className="bg-rose-50 p-2 rounded-lg border border-rose-200/60">
                        <span className="text-[10px] text-rose-700 block font-medium">Wrong</span>
                        <span className="font-bold text-rose-800">-{sub.wrong}</span>
                      </div>
                      <div className="bg-blue-50 p-2 rounded-lg border border-blue-200/60">
                        <span className="text-[10px] text-blue-700 block font-medium">Accuracy</span>
                        <span className="font-bold text-blue-800">{sub.accuracy.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detailed Subject Summary Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Detailed Subject Performance Table
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Subject</th>
                    <th className="p-3.5 text-center">Total Qs</th>
                    <th className="p-3.5 text-center">Attempted</th>
                    <th className="p-3.5 text-center text-emerald-700">Correct</th>
                    <th className="p-3.5 text-center text-rose-700">Wrong</th>
                    <th className="p-3.5 text-center">Unanswered</th>
                    <th className="p-3.5 text-center">Marks Gained</th>
                    <th className="p-3.5 text-center text-rose-700">Negative Penalty</th>
                    <th className="p-3.5 text-right font-black text-slate-900">Final Score</th>
                    <th className="p-3.5 text-right">Accuracy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {subjectBreakdown.map((s) => (
                    <tr key={s.subject_id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-bold text-slate-900">{s.subject_name}</td>
                      <td className="p-3.5 text-center">{s.total_questions}</td>
                      <td className="p-3.5 text-center">{s.attempted}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600">+{s.correct}</td>
                      <td className="p-3.5 text-center font-bold text-rose-600">-{s.wrong}</td>
                      <td className="p-3.5 text-center text-slate-400">{s.unanswered}</td>
                      <td className="p-3.5 text-center text-emerald-700 font-semibold">+{s.marks_obtained.toFixed(2)}</td>
                      <td className="p-3.5 text-center text-rose-700 font-semibold">
                        {s.negative_marks_deducted > 0 ? `-${s.negative_marks_deducted.toFixed(2)}` : '0.00'}
                      </td>
                      <td className="p-3.5 text-right font-black text-sm text-slate-950">
                        {s.final_score > 0 ? `+${s.final_score.toFixed(2)}` : s.final_score.toFixed(2)} / {s.max_marks}
                      </td>
                      <td className="p-3.5 text-right font-bold text-blue-600">{s.accuracy.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">Ready to Review Each Question?</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Check official answer keys, step-by-step reasoning, and syllabus-grounded explanations.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('solutions')}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>View All Solutions & Explanations</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: DETAILED ANALYTICS */}
      {/* ======================================================== */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Top Insights Cards: Strength & Weakness */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Strongest Subject */}
            <div className="bg-linear-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center space-x-2 text-emerald-800">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <span className="text-xs font-black uppercase tracking-wider">Strongest Subject</span>
              </div>
              <h3 className="text-lg font-black text-emerald-950">
                {analytics?.strongest_subject || 'General'}
              </h3>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Highest marks and positive score achieved in this subject. Keep maintaining this solid foundation.
              </p>
            </div>

            {/* Weakest Subject / Needs Attention */}
            <div className="bg-linear-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center space-x-2 text-amber-800">
                <Flame className="w-5 h-5 text-amber-600" />
                <span className="text-xs font-black uppercase tracking-wider">Needs Improvement</span>
              </div>
              <h3 className="text-lg font-black text-amber-950">
                {analytics?.weakest_subject || 'None'}
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                Area with highest negative marking or lower accuracy. Focus your next revision rounds here.
              </p>
            </div>

            {/* Negative Marking Impact */}
            <div className="bg-linear-to-br from-rose-50 to-red-50 border border-rose-200 rounded-2xl p-5 space-y-2 shadow-2xs">
              <div className="flex items-center space-x-2 text-rose-800">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <span className="text-xs font-black uppercase tracking-wider">Penalty Deductions</span>
              </div>
              <h3 className="text-lg font-black text-rose-950">
                -{result.negative_marks_deducted.toFixed(2)} Marks Lost
              </h3>
              <p className="text-xs text-rose-700 leading-relaxed">
                Marks lost to incorrect answers. Eliminating guesswork would have elevated your score to{' '}
                <strong>{(result.final_score + result.negative_marks_deducted).toFixed(2)}</strong>!
              </p>
            </div>
          </div>

          {/* Subject Comparative Analysis Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Subject Performance Comparison</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Visualizing marks percentage and precision across each subject module.
              </p>
            </div>

            <div className="space-y-4">
              {subjectBreakdown.map((sub) => (
                <div key={sub.subject_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-900">{sub.subject_name}</span>
                    <span className="text-slate-600">
                      {sub.final_score.toFixed(2)} / {sub.max_marks} Marks ({sub.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, sub.percentage))}%` }}
                      title={`Scored ${sub.percentage.toFixed(1)}%`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Correct: {sub.correct} • Wrong: {sub.wrong}</span>
                    <span>Accuracy: {sub.accuracy.toFixed(1)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Breakdown (Easy / Medium / Hard) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Difficulty-Level Performance</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                How you handled questions based on difficulty levels (Easy, Medium, Hard).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {difficultyBreakdown.map((diff) => {
                const label =
                  diff.difficulty === 'easy'
                    ? 'Easy'
                    : diff.difficulty === 'medium'
                    ? 'Medium'
                    : 'Hard';
                const badgeColor =
                  diff.difficulty === 'easy'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : diff.difficulty === 'medium'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-purple-100 text-purple-800 border-purple-200';

                return (
                  <div
                    key={diff.difficulty}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeColor}`}>
                        {label}
                      </span>
                      <span className="text-xs font-bold text-slate-500">{diff.total} Questions</span>
                    </div>

                    <div className="text-xl font-black text-slate-900">
                      {diff.correct} Correct{' '}
                      <span className="text-xs font-normal text-slate-500">
                        / {diff.total} (Acc: {diff.accuracy.toFixed(0)}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                      <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200/50">
                        <span className="text-emerald-700 font-bold block">+{diff.correct}</span>
                        <span className="text-[10px] text-slate-400">Right</span>
                      </div>
                      <div className="bg-rose-50 p-1.5 rounded border border-rose-200/50">
                        <span className="text-rose-700 font-bold block">-{diff.wrong}</span>
                        <span className="text-[10px] text-slate-400">Wrong</span>
                      </div>
                      <div className="bg-white p-1.5 rounded border border-slate-200">
                        <span className="text-slate-700 font-bold block">{diff.unanswered}</span>
                        <span className="text-[10px] text-slate-400">Skipped</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time & Speed Efficiency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-extrabold">Time Management & Speed Analysis</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Avg Time Per Question</span>
                  <span className="text-xl font-black text-indigo-600 mt-1 block">
                    {analytics?.avg_time_per_question_seconds || 0} seconds
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] text-slate-400 block font-medium">Attempt Rate</span>
                  <span className="text-xl font-black text-slate-800 mt-1 block">
                    {((result.attempted / Math.max(1, result.total_questions)) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Smart Actionable Recommendations */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center space-x-2 text-slate-900">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h4 className="text-sm font-extrabold">Personalized Exam Recommendations</h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                {analytics?.recommendations && analytics.recommendations.length > 0 ? (
                  analytics.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/50">
                      <span className="w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-slate-400">Regular practice will further solidify your accuracy.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: STEP-BY-STEP SOLUTIONS & DETAILED EXPLANATIONS */}
      {/* ======================================================== */}
      {activeTab === 'solutions' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Solution Header & Filter Controls */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span>Question-wise Official Solutions & Explanations</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review verified correct answers and detailed explanations explaining why each option is correct.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter by Subject */}
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Subjects</option>
                {subjectBreakdown.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.subject_name}
                  </option>
                ))}
              </select>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({breakdown.length})
                </button>
                <button
                  onClick={() => setFilter('correct')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filter === 'correct' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-700 hover:text-emerald-900'
                  }`}
                >
                  Correct ({result.correct})
                </button>
                <button
                  onClick={() => setFilter('wrong')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filter === 'wrong' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  Wrong ({result.wrong})
                </button>
                <button
                  onClick={() => setFilter('unanswered')}
                  className={`px-3 py-1.5 rounded-lg transition ${
                    filter === 'unanswered' ? 'bg-slate-700 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Skipped ({result.unanswered})
                </button>
              </div>
            </div>
          </div>

          {/* Question List with Clear Explanations */}
          <div className="divide-y divide-slate-200">
            {filteredQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No questions found matching your filter criteria.
              </div>
            ) : (
              filteredQuestions.map((q, idx) => {
                const questionText = q.question_en;

                const getOpt = (letter: 'a' | 'b' | 'c' | 'd') => {
                  return (q as any)[`option_${letter}_en`] || '';
                };

                const isCorrect = q.status === 'correct';
                const isWrong = q.status === 'wrong';
                const isUnanswered = q.status === 'unanswered';

                return (
                  <div key={q.id || idx} className="p-6 hover:bg-slate-50/50 transition space-y-4">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black px-2.5 py-1 rounded-md bg-slate-900 text-white">
                          Question {q.sort_order || idx + 1}
                        </span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {q.subject_name || 'General'}
                        </span>
                        {q.topic_name && (
                          <span className="text-xs text-slate-500 font-medium hidden sm:inline-block">
                            • {q.topic_name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">#{q.question_id_code}</span>
                      </div>

                      {/* Status indicator */}
                      <div>
                        {isCorrect && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1.5 shadow-2xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>CORRECT (+{q.marks || 1.0} Mark)</span>
                          </span>
                        )}
                        {isWrong && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1.5 shadow-2xs">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span>INCORRECT (-{q.negative_marks || 0.25} Negative)</span>
                          </span>
                        )}
                        {isUnanswered && (
                          <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center space-x-1.5">
                            <HelpCircle className="w-4 h-4 text-slate-500" />
                            <span>NOT ATTEMPTED (0 Marks)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Statement (Bilingual Display) */}
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed select-text">
                        {questionText}
                      </h3>
                      {q.question_hi && (
                        <p className="text-sm sm:text-base font-semibold text-amber-950 leading-relaxed select-text bg-amber-50/60 p-2 rounded-lg border border-amber-200/80">
                          <span className="text-[10px] uppercase font-bold text-amber-700 block mb-0.5">हिंदी अनुवाद:</span>
                          {q.question_hi}
                        </p>
                      )}

                      {/* Question Diagram (Free image host direct link) */}
                      {q.image_url && (
                        <div className="pt-2">
                          <div
                            onClick={() => setEnlargedImageUrl(q.image_url || null)}
                            className="inline-block p-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-xs transition"
                            title="Click to view diagram"
                          >
                            <img
                              src={q.image_url}
                              alt="Question Diagram"
                              className="max-h-52 object-contain rounded-lg"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                            <div className="text-[10px] text-blue-600 font-bold mt-1 flex items-center gap-1">
                              <Eye className="w-3 h-3" /> Click to enlarge diagram
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Options with High-Contrast Status Badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {(['A', 'B', 'C', 'D'] as const).map((letter) => {
                        const optKey = letter.toLowerCase() as 'a' | 'b' | 'c' | 'd';
                        const text = getOpt(optKey);
                        const hiText = (q as any)[`option_${optKey}_hi`];
                        const optionImgUrl = (q as any)[`option_${optKey}_image_url`];
                        const isCandidateChoice = q.student_answer === letter;
                        const isOfficialCorrect = q.correct_answer === letter;

                        let cardStyle = 'border-slate-200 bg-white text-slate-700';
                        let badge = null;

                        if (isOfficialCorrect) {
                          cardStyle =
                            'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/50 shadow-xs';
                          badge = (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-emerald-600 text-white uppercase ml-auto shrink-0 flex items-center space-x-1">
                              <span>✓ Correct Answer</span>
                            </span>
                          );
                        } else if (isCandidateChoice && !isOfficialCorrect) {
                          cardStyle =
                            'border-rose-500 bg-rose-50 text-rose-950 font-semibold ring-2 ring-rose-500/50 shadow-xs';
                          badge = (
                            <span className="text-[11px] font-black px-2.5 py-1 rounded-md bg-rose-600 text-white uppercase ml-auto shrink-0 flex items-center space-x-1">
                              <span>✗ Your Answer</span>
                            </span>
                          );
                        }

                        return (
                          <div
                            key={letter}
                            className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs sm:text-sm ${cardStyle}`}
                          >
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                                isOfficialCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : isCandidateChoice
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 select-text">
                              <span>{text}</span>
                              {hiText && (
                                <span className="block text-[11px] text-amber-900 font-medium mt-0.5">
                                  {hiText}
                                </span>
                              )}

                              {/* Option Diagram if present */}
                              {optionImgUrl && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEnlargedImageUrl(optionImgUrl);
                                  }}
                                  className="mt-2 inline-block p-1 bg-white border border-slate-200 rounded-lg cursor-pointer hover:border-blue-400"
                                  title="Click option diagram to enlarge"
                                >
                                  <img
                                    src={optionImgUrl}
                                    alt={`Option ${letter} Diagram`}
                                    className="max-h-24 object-contain rounded"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            {badge}
                          </div>
                        );
                      })}
                    </div>

                    {/* Detailed Explanation / Solution Box */}
                    <div className="mt-4 p-4 rounded-xl bg-linear-to-r from-blue-50/90 to-indigo-50/90 border border-blue-200 text-slate-800 space-y-2">
                      <div className="flex items-center space-x-2 text-blue-900 font-extrabold text-xs">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        <span>Detailed Solution & Explanation</span>
                      </div>

                      <div className="text-xs sm:text-sm leading-relaxed text-slate-700 select-text font-normal space-y-1.5">
                        <p>
                          <strong className="text-slate-900 font-bold">
                            Correct Answer: Option {q.correct_answer}
                          </strong>
                        </p>
                        <p className="bg-white/70 p-3 rounded-lg border border-blue-200/60 text-slate-800 font-medium">
                          {q.explanation ||
                            `Option ${q.correct_answer} is the officially verified correct answer based on examination standards.`}
                        </p>
                      </div>

                      {/* Summary status tag */}
                      <div className="text-[11px] font-semibold text-slate-500 pt-1 flex items-center space-x-2">
                        <span>Candidate Selected: <strong>{q.student_answer ? `Option ${q.student_answer}` : 'Unattempted'}</strong></span>
                        <span>•</span>
                        <span>Official Key: <strong className="text-emerald-700">Option {q.correct_answer}</strong></span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Official Marksheet Modal */}
      {showOfficialMarksheet && result && (
        <OfficialResultMarksheetModal
          scorecard={{
            result,
            breakdown,
            subject_breakdown: subjectBreakdown
          }}
          isAdmin={false}
          onClose={() => setShowOfficialMarksheet(false)}
        />
      )}

      {/* Diagram High-Resolution Zoom Modal */}
      {enlargedImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-4 border border-slate-200 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEnlargedImageUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-xs font-bold text-slate-700 mb-3">Diagram High-Resolution View</h4>
            <div className="flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={enlargedImageUrl}
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
