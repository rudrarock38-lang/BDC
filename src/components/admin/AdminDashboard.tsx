import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Users,
  HelpCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  TrendingUp,
  PlusCircle,
  Upload,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Eye,
  Lock,
  Award,
  Database,
  Cloud,
  Sparkles
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (section: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<{
    totalStudents: number;
    totalQuestions: number;
    totalExams: number;
    activeExams: number;
    completedAttempts: number;
    totalPublishedResults?: number;
    totalWithheldResults?: number;
    recentExams: any[];
    recentResults: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingResultId, setTogglingResultId] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
        <p className="text-xs font-semibold">Loading Admin Dashboard metrics...</p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Administrator Overview
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time test statistics, question bank health, and candidate attempt monitoring.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('ai-pyq')}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>AI PYQ & Exam Generator</span>
          </button>
          <button
            onClick={() => onNavigate('exams')}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Exam</span>
          </button>
          <button
            onClick={() => onNavigate('questions')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Question</span>
          </button>
          <button
            onClick={() => onNavigate('bulk-upload')}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-1.5 transition"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={loadStats}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Students</span>
            <Users className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.totalStudents || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered Candidates</span>
        </div>

        <div
          onClick={() => onNavigate('questions')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Question Bank</span>
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.totalQuestions || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Bilingual Questions</span>
        </div>

        <div
          onClick={() => onNavigate('exams')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Exams</span>
            <BookOpen className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.totalExams || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Created Papers</span>
        </div>

        <div
          onClick={() => onNavigate('monitoring')}
          className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs hover:border-emerald-400 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Live Exams</span>
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700">{stats?.activeExams || 0}</div>
          <span className="text-[11px] text-emerald-600 mt-1 block">Currently Active</span>
        </div>

        <div
          onClick={() => onNavigate('results')}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Submissions</span>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats?.completedAttempts || 0}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Completed Attempts</span>
        </div>
      </div>

      {/* Firebase Cloud Live Synchronization Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-white">Google Firebase Firestore Cloud</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Connected Live
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Project <code className="text-amber-300 font-mono">bdc-test-7bb1b</code> • All 251+ candidate, exam, question, and result records synchronized.
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('firebase')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-2 shrink-0 cursor-pointer"
        >
          <Cloud className="w-3.5 h-3.5" />
          <span>Manage Cloud Sync</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Recent Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-indigo-600" />
              <span>Recent Exams</span>
            </h2>
            <button
              onClick={() => onNavigate('exams')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.recentExams && stats.recentExams.length > 0 ? (
              stats.recentExams.map((exam) => (
                <div key={exam.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-900">{exam.name}</h3>
                    <div className="text-[11px] text-slate-500 mt-0.5 space-x-2">
                      <span>{exam.duration_minutes} mins</span>
                      <span>•</span>
                      <span>{exam.question_count || exam.total_questions} Questions</span>
                      <span>•</span>
                      <span>{exam.attempt_count || 0} Attempts</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        exam.status === 'live'
                          ? 'bg-emerald-100 text-emerald-800'
                          : exam.status === 'scheduled'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {exam.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No exams created yet</div>
            )}
          </div>
        </div>

        {/* Student Exam Scores & Visibility Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>Student Exam Scores & Release Status</span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Latest candidate submissions & portal visibility
              </span>
            </div>
            <button
              onClick={() => onNavigate('results')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
            >
              <span>Manage & Release Scores</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {stats?.recentResults && stats.recentResults.length > 0 ? (
              stats.recentResults.map((r) => {
                const isPublished = r.is_published !== 0;
                const isToggling = togglingResultId === r.id;

                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-xs text-slate-900 truncate">{r.student_name}</h3>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                          {r.roll_number}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        <span>{r.exam_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {r.final_score} / {r.total_questions}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 block">
                          {r.percentage}% ({r.accuracy}% acc)
                        </span>
                      </div>

                      {/* Score Visibility Pill & Toggle */}
                      <button
                        type="button"
                        disabled={isToggling}
                        onClick={async () => {
                          setTogglingResultId(r.id);
                          try {
                            const res = await api.togglePublishResult(r.id);
                            setStats((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                recentResults: prev.recentResults.map((item) =>
                                  item.id === r.id ? { ...item, is_published: res.is_published } : item
                                )
                              };
                            });
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setTogglingResultId(null);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition flex items-center space-x-1 cursor-pointer ${
                          isPublished
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        }`}
                        title={isPublished ? 'Score visible to student. Click to hide.' : 'Score withheld. Click to show.'}
                      >
                        {isToggling ? (
                          <div className="w-2.5 h-2.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        ) : isPublished ? (
                          <>
                            <Eye className="w-3 h-3 text-emerald-600" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">No completed submissions yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
