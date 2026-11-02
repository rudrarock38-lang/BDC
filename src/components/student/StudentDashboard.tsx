import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Exam, ExamResult } from '../../types';
import { api } from '../../api/client';
import { OfficialAdmitCardModal } from '../common/OfficialAdmitCardModal';
import {
  Clock,
  HelpCircle,
  Award,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Play,
  RotateCcw,
  FileText,
  TrendingUp,
  BarChart3,
  BookOpen,
  UserCheck,
  Printer,
  X,
  Lock,
  Ticket,
  ShieldCheck,
  Building,
  MapPin,
  User as UserIcon,
  Mail,
  RefreshCw
} from 'lucide-react';

interface StudentDashboardProps {
  onStartExam: (exam: Exam) => void;
  onViewResult: (attemptId: string) => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  onStartExam,
  onViewResult
}) => {
  const { user, resendVerificationEmail, checkEmailVerified } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'upcoming' | 'completed' | 'admit-card'>('available');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [admitCardExam, setAdmitCardExam] = useState<Exam | null>(null);
  const [withheldNotice, setWithheldNotice] = useState<ExamResult | null>(null);

  // Email verification state
  const isEmailVerified = user?.role !== 'student' || (user?.email_verified !== false && user?.email_verified !== 0);
  const [checkingVerif, setCheckingVerif] = useState(false);
  const [resendingVerif, setResendingVerif] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifFeedback, setVerifFeedback] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleCheckVerif = async () => {
    setCheckingVerif(true);
    setVerifFeedback(null);
    try {
      const res = await checkEmailVerified();
      if (res.verified) {
        setVerifFeedback('Email verified successfully! You have full access to examinations.');
        setTimeout(() => setVerifFeedback(null), 4000);
        loadDashboardData();
      } else {
        setVerifFeedback('Your email is not verified yet. Please check your inbox and spam folder, and click the verification link first.');
        setTimeout(() => setVerifFeedback(null), 5000);
      }
    } catch (e: any) {
      setVerifFeedback(e.message || 'Error checking verification status');
    } finally {
      setCheckingVerif(false);
    }
  };

  const handleResendVerif = async () => {
    if (resendCooldown > 0 || resendingVerif) return;
    setResendingVerif(true);
    setVerifFeedback(null);
    try {
      await resendVerificationEmail();
      setResendCooldown(60);
      setVerifFeedback('Verification email sent. Please check your inbox and spam folder.');
      setTimeout(() => setVerifFeedback(null), 5000);
    } catch (e: any) {
      setVerifFeedback(e.message || 'Failed to resend verification email.');
    } finally {
      setResendingVerif(false);
    }
  };

  const handleStartExamAttempt = (exam: Exam) => {
    if (!isEmailVerified) {
      alert('Email verification required! Please check your inbox and verify your email before taking examinations.');
      return;
    }
    onStartExam(exam);
  };

  useEffect(() => {
    if (!user) return;
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [allExams, studentResults] = await Promise.all([
        api.getExams({ role: 'student', student_id: user.id }),
        api.getStudentResults(user.id)
      ]);
      setExams(allExams);
      setResults(studentResults);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const availableExams = exams.filter(e => e.status === 'live' && (e.student_attempt_status !== 'completed' || e.can_reattempt));
  const upcomingExams = exams.filter(e => e.status === 'scheduled');
  const completedExams = exams.filter(e => e.student_attempt_status === 'completed');

  const avgScore = results.length > 0
    ? (results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)
    : 0;

  const isAdmitCardReleased = exams.length > 0
    ? exams.some((e) => e.admit_card_enabled !== false)
    : (user?.admit_card_enabled !== 0 && (user?.admit_card_enabled as any) !== false);

  const primaryAdmitCardExam = exams.find((e) => e.is_assigned_to_student && e.admit_card_enabled !== false)
    || exams.find((e) => e.admit_card_enabled !== false)
    || exams[0]
    || null;

  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 text-white shadow-xl mb-6 sm:mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
          <BookOpen className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[11px] sm:text-xs font-semibold uppercase tracking-wider border border-blue-400/30">
                  Student Terminal
                </span>
                <span className="text-slate-300 text-xs font-mono">
                  Roll: {user?.roll_number}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold mt-2 tracking-tight">
                Welcome back, {user?.name}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Access your scheduled mock tests, practice under real examination conditions with timer and negative marking, and receive immediate results.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isAdmitCardReleased && primaryAdmitCardExam) {
                    setAdmitCardExam(primaryAdmitCardExam);
                  } else {
                    setActiveTab('admit-card');
                  }
                }}
                className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 backdrop-blur-xs transition cursor-pointer shadow-xs ${
                  isAdmitCardReleased
                    ? 'bg-emerald-500/25 hover:bg-emerald-500/35 text-white border border-emerald-400/50'
                    : 'bg-white/10 hover:bg-white/20 text-slate-300 border border-white/10'
                }`}
                title={isAdmitCardReleased ? "View & Print Official Admit Card" : "Admit Card is withheld by administration"}
              >
                <Ticket className="w-3.5 h-3.5 text-emerald-300" />
                <span>E-Admit Card</span>
                {isAdmitCardReleased ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                )}
              </button>

              <button
                onClick={loadDashboardData}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs font-bold flex items-center space-x-1.5 backdrop-blur-xs transition cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mt-5 pt-5 sm:mt-6 sm:pt-6 border-t border-white/10">
            <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
              <span className="text-[11px] sm:text-xs text-slate-300 font-medium">Available Exams</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{availableExams.length}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
              <span className="text-[11px] sm:text-xs text-slate-300 font-medium">Completed Tests</span>
              <div className="text-xl sm:text-2xl font-black text-blue-300 mt-0.5">{results.length}</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
              <span className="text-[11px] sm:text-xs text-slate-300 font-medium">Average Score</span>
              <div className="text-xl sm:text-2xl font-black text-amber-300 mt-0.5">{avgScore}%</div>
            </div>
            <div className="bg-white/5 rounded-xl p-3 sm:p-3.5 border border-white/10">
              <span className="text-[11px] sm:text-xs text-slate-300 font-medium">Upcoming Scheduled</span>
              <div className="text-xl sm:text-2xl font-black text-purple-300 mt-0.5">{upcomingExams.length}</div>
            </div>
          </div>
        </div>
      </div>

      {verifFeedback && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm flex items-center space-x-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="font-semibold">{verifFeedback}</span>
        </div>
      )}

      {/* Email Verification Required Alert Banner */}
      {!isEmailVerified && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-amber-950">Email Verification Required</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-200 text-amber-900">Pending</span>
              </div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Verification email sent to <strong>{user?.email}</strong>. Please check your inbox and spam folder, click the verification link, and click <strong>"Check Verification Status"</strong> to activate your test access.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              disabled={checkingVerif}
              onClick={handleCheckVerif}
              className="flex-1 md:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingVerif ? 'animate-spin' : ''}`} />
              <span>{checkingVerif ? 'Checking...' : 'Check Verification Status'}</span>
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || resendingVerif}
              onClick={handleResendVerif}
              className="flex-1 md:flex-initial px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-amber-900 border border-amber-300 font-bold text-xs rounded-xl shadow-2xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>{resendingVerif ? 'Sending...' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Verification Email'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs Bar - Smooth horizontal scrolling on mobile/tablet */}
      <div className="flex border-b border-slate-200 mb-6 space-x-2 sm:space-x-4 overflow-x-auto scrollbar-none flex-nowrap pb-1">
        <button
          onClick={() => setActiveTab('available')}
          className={`min-h-[44px] pb-3 px-2 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'available'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Available Exams</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-semibold">
            {availableExams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('upcoming')}
          className={`min-h-[44px] pb-3 px-2 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'upcoming'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Upcoming Schedule</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold">
            {upcomingExams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`min-h-[44px] pb-3 px-2 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'completed'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Completed & Results</span>
          <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-800 font-semibold">
            {completedExams.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('admit-card')}
          className={`min-h-[44px] pb-3 px-2 font-bold text-xs sm:text-sm flex items-center space-x-2 border-b-2 transition shrink-0 whitespace-nowrap cursor-pointer ${
            activeTab === 'admit-card'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Ticket className="w-4 h-4 text-indigo-600" />
          <span>Official Admit Card</span>
          {isAdmitCardReleased ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
              Released
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
              Withheld
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
          <p className="text-sm font-medium">Loading examination schedules...</p>
        </div>
      ) : (
        <div>
          {activeTab === 'available' && (
            <div>
              {/* Assigned Desk Test Notice Banner if student has customized exam */}
              {exams.some((e) => e.is_assigned_to_student) && (
                <div className="mb-6 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-md border border-purple-500/30 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5 text-purple-300" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm sm:text-base text-white">
                          Center Allocated Examination:
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-400 text-slate-950">
                          Customized Desk Test
                        </span>
                        {exams.find((e) => e.student_seat_number)?.student_seat_number && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/20 text-white border border-white/20">
                            Seat: {exams.find((e) => e.student_seat_number)?.student_seat_number}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-purple-200 mt-1 leading-relaxed">
                        Your terminal has been customized by the center administrator for this specific examination paper.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {availableExams.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xs">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Exam Allocation Pending</h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Welcome candidate <strong>{user?.name}</strong> (Roll: {user?.roll_number}). Your exam paper is being assigned by the center administrator at the desk.
                  </p>
                  <p className="text-[11px] text-indigo-700 font-semibold mt-2">
                    Please contact the center invigilator at the verification desk to assign your test.
                  </p>
                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="mt-4 min-h-[40px] px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    Refresh Terminal
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableExams.map((exam) => (
                    <div
                      key={exam.id}
                      className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                        exam.is_assigned_to_student
                          ? 'border-purple-300 ring-2 ring-purple-500/20'
                          : 'border-slate-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="p-6">
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center space-x-1.5">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Live Now
                            </span>
                            {exam.is_assigned_to_student && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200 flex items-center space-x-1">
                                <Lock className="w-3 h-3 text-purple-700" />
                                <span>Assigned Test</span>
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-500">
                            {exam.subject_name || 'General'}
                          </span>
                        </div>

                        <h3 className="font-bold text-lg text-slate-900 leading-snug">
                          {exam.name}
                        </h3>

                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                          {exam.description || 'Standard Computer Based Test mock examination.'}
                        </p>

                        <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-100 text-xs">
                          <div className="flex items-center space-x-2 text-slate-700">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span><strong>{exam.duration_minutes}</strong> mins</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <HelpCircle className="w-4 h-4 text-indigo-600" />
                            <span><strong>{exam.question_count || exam.total_questions}</strong> Questions</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span><strong>{exam.total_marks}</strong> Marks</span>
                          </div>
                          <div className="flex items-center space-x-2 text-slate-700">
                            <AlertCircle className="w-4 h-4 text-rose-500" />
                            <span>Neg: <strong>-{exam.negative_marks}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 border-t border-slate-100">
                        {exam.student_attempt_status === 'in_progress' ? (
                          <button
                            onClick={() => handleStartExamAttempt(exam)}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Resume In-Progress Test</span>
                          </button>
                        ) : exam.student_attempt_status === 'completed' && exam.can_reattempt ? (
                          <button
                            onClick={() => handleStartExamAttempt(exam)}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>Re-attempt Examination</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStartExamAttempt(exam)}
                            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Start Examination</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'upcoming' && (
            <div>
              {upcomingExams.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                  <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No Upcoming Exams Scheduled</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Future scheduled examination sessions will appear here with scheduled dates and times.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {upcomingExams.map((exam) => (
                    <div key={exam.id} className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        Scheduled
                      </span>
                      <h3 className="font-bold text-base text-slate-900 mt-2">{exam.name}</h3>
                      <p className="text-xs text-slate-500 mt-1">{exam.description}</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                        <div>Duration: <strong>{exam.duration_minutes} minutes</strong></div>
                        <div>Total Questions: <strong>{exam.total_questions}</strong></div>
                        <div>Starts: <strong>{new Date(exam.start_datetime).toLocaleString()}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'completed' && (
            <div>
              {results.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 sm:p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700">No Tests Attempted Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Once you submit a test, your scorecard and answer key analysis will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((res) => {
                    const isScoreVisible = res.is_published !== 0 && res.results_published !== 0;

                    return (
                      <div
                        key={res.id}
                        className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="space-y-1 min-w-[200px]">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-base text-slate-900">{res.exam_name}</h3>
                            {isScoreVisible ? (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                                Rank #{res.rank}
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center space-x-1">
                                <Lock className="w-3 h-3" />
                                <span>Pending Release</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Submitted on {new Date(res.created_at).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short'
                            })}
                          </p>
                        </div>

                        {/* Middle Stats or Withheld Notice */}
                        {isScoreVisible ? (
                          <div className="flex items-center justify-between sm:justify-center sm:space-x-6 text-center w-full md:w-auto py-2 sm:py-0 border-y md:border-y-0 border-slate-100">
                            <div>
                              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Score</span>
                              <span className="text-sm sm:text-base font-black text-slate-900">
                                {res.final_score} <span className="text-xs text-slate-400 font-normal">/ {res.total_questions}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Percentage</span>
                              <span className="text-sm sm:text-base font-black text-emerald-600">{res.percentage}%</span>
                            </div>
                            <div>
                              <span className="text-[10px] sm:text-[11px] text-slate-500 block">Accuracy</span>
                              <span className="text-sm sm:text-base font-black text-blue-600">{res.accuracy}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="px-3.5 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-center space-x-2 max-w-sm">
                            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              <strong>Score withheld:</strong> The administrator has not published results for this session yet.
                            </span>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-2">
                          {isScoreVisible ? (
                            <button
                              onClick={() => onViewResult(res.attempt_id)}
                              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-2xs cursor-pointer"
                            >
                              <FileText className="w-4 h-4" />
                              <span>View Scorecard & Marksheet</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setWithheldNotice(res)}
                              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1.5 transition border border-slate-200 cursor-pointer"
                            >
                              <Lock className="w-4 h-4 text-slate-500" />
                              <span>Check Release Status</span>
                            </button>
                          )}

                          {(() => {
                            const targetExam = exams.find((e) => e.id === res.exam_id);
                            const canReattempt = targetExam
                              ? targetExam.allow_reattempt !== 0 &&
                                (targetExam as any).allow_reattempt !== false &&
                                targetExam.can_reattempt !== false &&
                                targetExam.status === 'live'
                              : false;

                            if (canReattempt && targetExam) {
                              return (
                                <button
                                  onClick={() => onStartExam(targetExam)}
                                  className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-2xs cursor-pointer"
                                  title="Re-attempt this examination with fresh questions and timer"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                  <span>Re-attempt Test</span>
                                </button>
                              );
                            }

                            if (targetExam && (targetExam.allow_reattempt === 0 || (targetExam as any).allow_reattempt === false)) {
                              return (
                                <span className="text-[11px] font-semibold text-slate-400 flex items-center space-x-1 px-2.5 py-1.5 bg-slate-100 rounded-xl border border-slate-200/80">
                                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                                  <span>Re-attempt Disabled</span>
                                </span>
                              );
                            }

                            return null;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'admit-card' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {isAdmitCardReleased ? (
                <div className="bg-white rounded-3xl border border-indigo-200 p-5 sm:p-8 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0">
                        <Ticket className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">Official E-Admit Card & Gate Entry Pass</h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Released & Verified
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Begusarai Digital Examination Center 2026 - Official Hall Ticket
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => primaryAdmitCardExam && setAdmitCardExam(primaryAdmitCardExam)}
                        className="flex-1 sm:flex-initial min-h-[42px] px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print / Save PDF Hall Ticket</span>
                      </button>
                    </div>
                  </div>

                  {/* Hall Ticket Card In-Place Preview */}
                  <div className="mt-6 border-2 border-indigo-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {/* Header Strip */}
                    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 text-center border-b border-indigo-800">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 text-blue-200 text-xs font-bold mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>BEGUSARAI DIGITAL EXAMINATION CENTER (CBT MOCK 2026)</span>
                      </div>
                      <h3 className="text-base sm:text-xl font-black tracking-tight text-white uppercase">
                        Computer Based Test (CBT) Provisional Admit Card
                      </h3>
                      <p className="text-xs text-indigo-200 mt-1">
                        Hall Ticket & Security Verification Slip for Center Entry
                      </p>
                    </div>

                    {/* Candidate Details Grid */}
                    <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/50">
                      <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Candidate Full Name</span>
                            <div className="font-extrabold text-slate-900 text-sm mt-0.5">{user?.name}</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Roll Number</span>
                            <div className="font-mono font-black text-indigo-700 text-sm mt-0.5">{user?.roll_number}</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Candidate Email</span>
                            <div className="font-medium text-slate-800 truncate mt-0.5">{user?.email}</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Mobile Number</span>
                            <div className="font-medium text-slate-800 mt-0.5">{user?.mobile || 'Registered in Profile'}</div>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200 col-span-2">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Allocated Examination Paper</span>
                            <div className="font-extrabold text-slate-900 text-sm mt-0.5">
                              {primaryAdmitCardExam?.name || 'All-India CBT Assessment & Mock Examination 2026'}
                            </div>
                          </div>
                        </div>

                        {/* Center & Timing */}
                        <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-indigo-900/60 text-[10px] uppercase font-bold">Reporting Time</span>
                            <div className="font-bold text-slate-900 mt-0.5 flex items-center space-x-1">
                              <Clock className="w-3.5 h-3.5 text-indigo-600" />
                              <span>08:30 AM (IST)</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-indigo-900/60 text-[10px] uppercase font-bold">Gate Closure</span>
                            <div className="font-bold text-rose-700 mt-0.5">09:15 AM (Strict)</div>
                          </div>
                          <div>
                            <span className="text-indigo-900/60 text-[10px] uppercase font-bold">Desk / Seat</span>
                            <div className="font-mono font-black text-indigo-700 mt-0.5">
                              {user?.seat_number || primaryAdmitCardExam?.student_seat_number || 'Center Assigned Desk'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Verification & Center Stamp */}
                      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-4">
                        <div className="w-24 h-24 rounded-2xl bg-indigo-50 border-2 border-indigo-300 flex items-center justify-center">
                          <UserIcon className="w-12 h-12 text-indigo-600" />
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gate Entry Token</div>
                          <div className="font-mono font-black text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 text-xs tracking-wider">
                            GATE-{(user?.roll_number?.replace(/[^0-9]/g, '') || '851218').slice(-6)}
                          </div>
                        </div>
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 w-full">
                          <div className="font-bold text-emerald-700 flex items-center justify-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Authorized Entry Slip</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Begusarai Digital Center</span>
                        </div>
                      </div>
                    </div>

                    {/* Notice bar */}
                    <div className="p-3.5 bg-slate-100 border-t border-slate-200 text-center text-xs text-slate-600 font-medium">
                      Important: Candidates must carry an original valid Photo Identity Card (Aadhaar, Voter ID, PAN, or Passport) along with this printed admit card.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto shadow-2xs">
                    <Lock className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300">
                      Admit Card Access Withheld
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-3">
                      Admit Card Has Not Been Released Yet
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                      Dear <strong>{user?.name}</strong> (Roll: {user?.roll_number}), the center administration has currently withheld the Admit Card for your terminal.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 text-left space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Candidate Status:</span>
                      <span className="font-bold text-slate-900">Registered</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Hall Ticket Release:</span>
                      <span className="font-bold text-rose-600">Pending Center Administrator Approval</span>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-700 font-medium">
                    As soon as the center administrator clicks "Release" on your profile, your hall ticket will instantly appear here.
                  </p>

                  <button
                    type="button"
                    onClick={loadDashboardData}
                    className="min-h-[42px] px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer inline-flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Check Release Status (Refresh)</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Result Withheld Status Modal */}
      {withheldNotice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-bold text-lg text-slate-900">Score Pending Administrative Release</h3>
              <p className="text-xs text-slate-500 mt-1">
                Examination: <strong className="text-slate-800">{withheldNotice.exam_name}</strong>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs text-slate-700 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Submission Status:</span>
                <span className="font-bold text-emerald-700 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Securely Recorded</span>
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-500">Total Questions:</span>
                <span className="font-bold text-slate-900">{withheldNotice.total_questions} Questions</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Result Publication:</span>
                <span className="font-bold text-amber-700">Under Admin Evaluation</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              The Examination Controller has withheld scorecards for this test session. Your marks, percentage, and question solutions will become visible here as soon as the center publishes the official results.
            </p>

            <button
              onClick={() => setWithheldNotice(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Official Begusarai Digital Center E-Admit Card / Gate Pass Modal */}
      {admitCardExam && user && (
        <OfficialAdmitCardModal
          data={{
            student_name: user.name,
            roll_number: user.roll_number,
            email: user.email,
            mobile: user.mobile,
            exam_name: admitCardExam.name,
            exam_id: admitCardExam.id,
            duration_minutes: admitCardExam.duration_minutes,
            start_datetime: admitCardExam.start_datetime
          }}
          onClose={() => setAdmitCardExam(null)}
        />
      )}
    </div>
  );
};
