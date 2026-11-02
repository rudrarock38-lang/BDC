import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Exam, ExamResult } from '../../types';
import { OfficialResultMarksheetModal } from '../common/OfficialResultMarksheetModal';
import {
  Award,
  Search,
  Download,
  RotateCcw,
  FileText,
  X,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Target,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Mail
} from 'lucide-react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const AdminResults: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'published' | 'withheld'>('all');
  const [results, setResults] = useState<ExamResult[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Toggle & Bulk Loading state
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [allowingReattemptAttemptId, setAllowingReattemptAttemptId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Scorecard audit modal
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [detailedScorecard, setDetailedScorecard] = useState<any | null>(null);
  const [loadingScorecard, setLoadingScorecard] = useState(false);

  const handleAllowCandidateReattempt = async (attemptId: string, studentName: string) => {
    setAllowingReattemptAttemptId(attemptId);
    try {
      const res = await api.allowStudentReattempt(attemptId);
      setToastMessage({
        type: 'success',
        message: res.message || `Re-attempt granted for ${studentName}.`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: err.message || 'Failed to grant re-attempt'
      });
    } finally {
      setAllowingReattemptAttemptId(null);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    loadResults();
  }, [selectedExamId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadExams = async () => {
    try {
      const all = await api.getExams({ role: 'admin' });
      setExams(all);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResults = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminResults({
        exam_id: selectedExamId !== 'all' ? selectedExamId : undefined
      });
      setResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle individual candidate score visibility
  const handleTogglePublish = async (result: ExamResult) => {
    setTogglingId(result.id);
    try {
      const res = await api.togglePublishResult(result.id);
      // Update local state
      setResults((prev) =>
        prev.map((r) =>
          r.id === result.id
            ? { ...r, is_published: res.is_published }
            : r
        )
      );

      // If open in scorecard modal, update that as well
      if (detailedScorecard && detailedScorecard.result?.id === result.id) {
        setDetailedScorecard({
          ...detailedScorecard,
          result: { ...detailedScorecard.result, is_published: res.is_published }
        });
      }

      setToastMessage({
        type: 'success',
        message:
          res.is_published === 1
            ? `Score for ${result.student_name} is now published and visible to the student!`
            : `Score for ${result.student_name} is now withheld and hidden from the student.`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: err.message || 'Failed to toggle score visibility'
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Bulk publish or withhold scores for selected exam or all exams
  const handleBulkPublish = async (publish: boolean) => {
    const examName =
      selectedExamId === 'all'
        ? 'all examinations'
        : exams.find((e) => e.id === selectedExamId)?.name || 'selected exam';

    const actionText = publish ? 'publish and make visible to students' : 'withhold and hide from students';
    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} all scores for ${examName}?`
    );
    if (!confirmed) return;

    setBulkLoading(true);
    try {
      const res = await api.publishExamResults(selectedExamId, publish);

      // Update local state for all matching results
      const targetVal = publish ? 1 : 0;
      setResults((prev) =>
        prev.map((r) => {
          if (selectedExamId === 'all' || r.exam_id === selectedExamId) {
            return { ...r, is_published: targetVal, results_published: targetVal };
          }
          return r;
        })
      );

      setToastMessage({
        type: 'success',
        message: res.message || `Scores successfully ${publish ? 'published' : 'withheld'}.`
      });
    } catch (err: any) {
      setToastMessage({
        type: 'error',
        message: err.message || 'Bulk operation failed'
      });
    } finally {
      setBulkLoading(false);
    }
  };

  // Export Results to CSV
  const handleExportCSV = () => {
    if (results.length === 0) return;

    const headers = [
      'Rank',
      'Roll Number',
      'Candidate Name',
      'Exam Name',
      'Total Questions',
      'Attempted',
      'Correct',
      'Wrong',
      'Unanswered',
      'Marks Obtained',
      'Negative Deducted',
      'Final Score',
      'Percentage',
      'Accuracy',
      'Time Taken (Mins)',
      'Candidate Visibility',
      'Submission Date'
    ];

    const rows = results.map((r) => [
      r.rank,
      `"${r.roll_number}"`,
      `"${r.student_name}"`,
      `"${r.exam_name}"`,
      r.total_questions,
      r.attempted,
      r.correct,
      r.wrong,
      r.unanswered,
      r.marks_obtained,
      r.negative_marks_deducted,
      r.final_score,
      `${r.percentage}%`,
      `${r.accuracy}%`,
      (r.time_taken_seconds / 60).toFixed(1),
      r.is_published === 0 ? 'Withheld (Hidden)' : 'Published (Visible)',
      `"${new Date(r.created_at).toLocaleString()}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cbt_exam_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Direct WhatsApp Result Sender
  const handleSendWhatsApp = (result: ExamResult) => {
    const portalUrl = window.location.origin;
    const rawMobile = ((result as any).mobile || '').replace(/[^0-9]/g, '');
    const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;

    const message = `*BEGUSARAI DIGITAL CENTER - OFFICIAL CBT EXAMINATION STATEMENT OF MARKS*

Dear *${result.student_name}* (Roll No: *${result.roll_number}*),
Your official performance scorecard for *${result.exam_name}* has been verified and released!

📊 *Result Performance Summary:*
• Candidate Name: *${result.student_name}*
• Roll Number: *${result.roll_number}*
• Final Score: *${result.final_score} / ${result.total_questions}*
• Percentage: *${result.percentage}%*
• Accuracy: *${result.accuracy}%*
• Center Merit Standing: *Rank #${result.rank}*
• Correct / Wrong: *+${result.correct} / -${result.wrong}*
• Result Status: *QUALIFIED / COMPLETED*
• Submission Date: *${new Date(result.created_at).toLocaleDateString()}*

🔗 *Download / Print Official Marksheet:*
${portalUrl}

Best regards,
*Controller of Examinations*
Begusarai Digital Center`;

    const encoded = encodeURIComponent(message);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Direct Official Email Sender
  const handleSendEmail = async (resultId: string, studentEmail?: string) => {
    setSendingEmailId(resultId);
    const rItem = results.find(r => r.id === resultId);
    const targetEmail = (rItem as any)?.email || studentEmail;

    try {
      const res = await api.sendResultEmail(resultId);
      if (res.sent) {
        setToastMessage({
          type: 'success',
          message: res.message || `Official scorecard delivered to ${res.recipient || targetEmail}!`
        });
      } else if (targetEmail) {
        const portalUrl = window.location.origin;
        const subject = encodeURIComponent(`Official CBT Result Scorecard: ${rItem?.exam_name || 'Exam'} - ${rItem?.student_name || 'Candidate'}`);
        const body = encodeURIComponent(
          `Dear ${rItem?.student_name || 'Candidate'},\n\nYour official CBT examination scorecard for "${rItem?.exam_name || 'Examination'}" has been released.\n\nRoll Number: ${rItem?.roll_number}\nScore: ${rItem?.final_score} / ${rItem?.total_questions}\nPercentage: ${rItem?.percentage}%\nAccuracy: ${rItem?.accuracy}%\nMerit Standing: Rank #${rItem?.rank}\n\nDownload / Print your official marksheet at:\n${portalUrl}\n\nBegusarai Digital Center`
        );
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${subject}&body=${body}`, '_blank');
        setToastMessage({
          type: 'success',
          message: `Official scorecard email launched in Gmail compose for ${targetEmail}!`
        });
      } else {
        setToastMessage({
          type: 'success',
          message: res.message || 'Scorecard prepared.'
        });
      }
    } catch {
      if (targetEmail) {
        const portalUrl = window.location.origin;
        const subject = encodeURIComponent(`Official CBT Result Scorecard: ${rItem?.exam_name || 'Exam'} - ${rItem?.student_name || 'Candidate'}`);
        const body = encodeURIComponent(
          `Dear ${rItem?.student_name || 'Candidate'},\n\nYour official CBT examination scorecard for "${rItem?.exam_name || 'Examination'}" has been released.\n\nRoll Number: ${rItem?.roll_number}\nScore: ${rItem?.final_score} / ${rItem?.total_questions}\nPercentage: ${rItem?.percentage}%\nAccuracy: ${rItem?.accuracy}%\nMerit Standing: Rank #${rItem?.rank}\n\nDownload / Print your official marksheet at:\n${portalUrl}\n\nBegusarai Digital Center`
        );
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${subject}&body=${body}`, '_blank');
        setToastMessage({
          type: 'success',
          message: `Official scorecard email opened in Gmail compose for ${targetEmail}!`
        });
      } else {
        setToastMessage({
          type: 'error',
          message: 'Student does not have an email address specified.'
        });
      }
    } finally {
      setSendingEmailId(null);
    }
  };

  const openScorecardModal = async (attemptId: string) => {
    setSelectedAttemptId(attemptId);
    setLoadingScorecard(true);
    try {
      const data = await api.getAttemptResult(attemptId, 'admin');
      setDetailedScorecard(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load scorecard details');
    } finally {
      setLoadingScorecard(false);
    }
  };

  // Filter results by search query and visibility filter
  const filteredResults = results.filter((r) => {
    const term = search.toLowerCase();
    const matchesSearch =
      (r.student_name || '').toLowerCase().includes(term) ||
      (r.roll_number || '').toLowerCase().includes(term) ||
      (r.exam_name || '').toLowerCase().includes(term) ||
      ((r as any).email || '').toLowerCase().includes(term);

    const isPublished = r.is_published !== 0;
    if (visibilityFilter === 'published' && !isPublished) return false;
    if (visibilityFilter === 'withheld' && isPublished) return false;

    return matchesSearch;
  });

  // Calculate Quick Stats
  const totalSubmissions = results.length;
  const publishedCount = results.filter((r) => r.is_published !== 0).length;
  const withheldCount = results.filter((r) => r.is_published === 0).length;
  const topScore = results.length > 0 ? Math.max(...results.map((r) => r.final_score)) : 0;
  const avgPercentage =
    results.length > 0
      ? (results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)
      : '0';

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 max-w-md p-4 rounded-xl shadow-xl border flex items-center space-x-3 transition animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-900/95 text-emerald-100 border-emerald-700'
              : toastMessage.type === 'error'
              ? 'bg-rose-900/95 text-rose-100 border-rose-700'
              : 'bg-slate-900/95 text-slate-100 border-slate-700'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-300 shrink-0" />
          )}
          <span className="text-xs font-semibold flex-1">{toastMessage.message}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-white/70 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Student Exam Scores & Result Control
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
              Admin Controller
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review student exam submissions, audit answer sheets, and control when scores are revealed or hidden from candidates.
          </p>
        </div>

        {/* Top Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={results.length === 0}
            className="px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-1.5 transition disabled:opacity-40 cursor-pointer"
            title="Download CSV spreadsheet of all scores"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={loadResults}
            className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition cursor-pointer"
            title="Reload latest records"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Submissions */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Evaluated</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{totalSubmissions}</span>
            <span className="text-[11px] text-slate-400">submissions</span>
          </div>
        </div>

        {/* Visible to Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Visible to Students</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-emerald-700">{publishedCount}</span>
            <span className="text-[11px] text-emerald-600 font-semibold">Published</span>
          </div>
        </div>

        {/* Hidden from Students */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Withheld / Hidden</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-700">{withheldCount}</span>
            <span className="text-[11px] text-amber-600 font-semibold">Private to Admin</span>
          </div>
        </div>

        {/* Top Score & Average */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Top Score / Avg</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{topScore}</span>
            <span className="text-[11px] text-slate-400">marks ({avgPercentage}% avg)</span>
          </div>
        </div>
      </div>

      {/* Global & Exam Score Release Control Box */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 rounded-2xl text-white shadow-md flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-300" />
            <h3 className="font-bold text-sm text-white">Student Score Visibility Master Control</h3>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Choose whether candidates can view their marks, percentage, rank, and answer solutions on their student portal. You can release or withhold scores in bulk or individually for any candidate below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={bulkLoading || results.length === 0}
            onClick={() => handleBulkPublish(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-2 shadow-xs transition disabled:opacity-40 cursor-pointer"
            title="Make all scores visible to students"
          >
            <Unlock className="w-4 h-4" />
            <span>Publish All Scores to Students</span>
          </button>

          <button
            type="button"
            disabled={bulkLoading || results.length === 0}
            onClick={() => handleBulkPublish(false)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center space-x-2 transition disabled:opacity-40 cursor-pointer"
            title="Hide all scores from students"
          >
            <Lock className="w-4 h-4 text-amber-400" />
            <span>Withhold All Scores</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="flex items-center space-x-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search candidate name, roll no, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Dropdowns for Filtering */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Exam Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">Exam:</span>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white focus:outline-indigo-500"
            >
              <option value="all">All Examinations ({exams.length})</option>
              {exams.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as any)}
              className="px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white focus:outline-indigo-500"
            >
              <option value="all">All Statuses ({results.length})</option>
              <option value="published">🟢 Visible to Students ({publishedCount})</option>
              <option value="withheld">🔒 Withheld / Hidden ({withheldCount})</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Rank</th>
                <th className="px-5 py-3.5">Candidate Details</th>
                <th className="px-5 py-3.5">Exam Name & Time</th>
                <th className="px-5 py-3.5">Attempts (C/W/U)</th>
                <th className="px-5 py-3.5">Final Score</th>
                <th className="px-5 py-3.5">Percentage</th>
                <th className="px-5 py-3.5">Accuracy</th>
                <th className="px-5 py-3.5 text-center">Score Visibility to Student</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
                    <p className="font-semibold text-xs text-slate-500">Loading student scores and submissions...</p>
                  </td>
                </tr>
              ) : filteredResults.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-14 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">No student exam attempts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {search ? 'Try clearing your search query.' : 'Students who complete an examination will appear here.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResults.map((r) => {
                  const isPublished = r.is_published !== 0;
                  const isToggling = togglingId === r.id;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      {/* Rank */}
                      <td className="px-5 py-4">
                        <span className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-700 font-black inline-flex items-center justify-center border border-indigo-200 text-xs">
                          #{r.rank}
                        </span>
                      </td>

                      {/* Candidate Name & Roll */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{r.student_name}</div>
                        <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 mt-0.5">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{r.roll_number}</span>
                          {(r as any).email && <span className="text-slate-400 truncate max-w-[140px]">{(r as any).email}</span>}
                        </div>
                      </td>

                      {/* Exam Name & Date */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-800">{r.exam_name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(r.created_at).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </div>
                      </td>

                      {/* Questions breakdown */}
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-1.5 font-mono text-xs">
                          <span className="text-emerald-700 font-bold" title="Correct answers">+{r.correct}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-rose-600 font-bold" title="Wrong answers">-{r.wrong}</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-400" title="Unanswered">{r.unanswered}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Total: {r.total_questions} Qs ({Math.round(r.time_taken_seconds / 60)}m spent)
                        </div>
                      </td>

                      {/* Final Score */}
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-900 text-base">
                          {r.final_score} <span className="text-xs text-slate-400 font-normal">/ {r.total_questions}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          +{r.marks_obtained} pts | -{r.negative_marks_deducted} neg
                        </div>
                      </td>

                      {/* Percentage */}
                      <td className="px-5 py-4">
                        <span className="font-black text-emerald-600 text-sm">
                          {r.percentage}%
                        </span>
                      </td>

                      {/* Accuracy */}
                      <td className="px-5 py-4">
                        <span className="font-bold text-blue-600 text-xs">
                          {r.accuracy}%
                        </span>
                      </td>

                      {/* THE REQUESTED SCORE VISIBILITY CONTROL (Show / Hide to Student) */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex flex-col items-center gap-1">
                          <button
                            type="button"
                            disabled={isToggling}
                            onClick={() => handleTogglePublish(r)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-2xs border ${
                              isPublished
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                            }`}
                            title={
                              isPublished
                                ? 'Score is visible to candidate. Click to hide.'
                                : 'Score is hidden from candidate. Click to reveal.'
                            }
                          >
                            {isToggling ? (
                              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                            ) : isPublished ? (
                              <>
                                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Visible to Student</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5 text-amber-600" />
                                <span>Hidden / Withheld</span>
                              </>
                            )}
                          </button>

                          <span className="text-[10px] text-slate-400 font-medium">
                            {isPublished ? 'Click to Withhold' : 'Click to Release'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Quick WhatsApp Send */}
                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(r)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition cursor-pointer shadow-2xs border border-emerald-200"
                            title="Send result summary & download link on WhatsApp"
                          >
                            <WhatsAppIcon className="w-4 h-4" />
                          </button>

                          {/* Quick Mail Send */}
                          <button
                            type="button"
                            disabled={sendingEmailId === r.id}
                            onClick={() => handleSendEmail(r.id, (r as any).email)}
                            className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer shadow-2xs border border-indigo-200 disabled:opacity-50"
                            title="Send official result scorecard to candidate email"
                          >
                            <Mail className="w-4 h-4" />
                          </button>

                          {/* Grant Re-attempt */}
                          <button
                            type="button"
                            disabled={allowingReattemptAttemptId === r.attempt_id}
                            onClick={() => handleAllowCandidateReattempt(r.attempt_id, r.student_name || 'Candidate')}
                            className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition cursor-pointer shadow-2xs border border-purple-200 disabled:opacity-50"
                            title="Grant Re-attempt permission for this candidate"
                          >
                            <RotateCcw className={`w-4 h-4 ${allowingReattemptAttemptId === r.attempt_id ? 'animate-spin' : ''}`} />
                          </button>

                          {/* Official Marksheet */}
                          <button
                            onClick={() => openScorecardModal(r.attempt_id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center space-x-1 transition cursor-pointer shadow-2xs"
                            title="View official candidate statement of marks"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Marksheet</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* OFFICIAL CANDIDATE MARKSHEET & RESULT CERTIFICATE MODAL */}
      {selectedAttemptId && detailedScorecard && (
        <OfficialResultMarksheetModal
          scorecard={detailedScorecard}
          isAdmin={true}
          onTogglePublish={() => handleTogglePublish(detailedScorecard.result)}
          isTogglingPublish={togglingId === detailedScorecard.result.id}
          onClose={() => {
            setSelectedAttemptId(null);
            setDetailedScorecard(null);
          }}
        />
      )}
    </div>
  );
};
