import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { Exam } from '../../types';
import {
  Activity,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  Search,
  Filter
} from 'lucide-react';

export const ExamMonitoring: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [monitoringData, setMonitoringData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      const all = await api.getExams({ role: 'admin' });
      setExams(all);
      // Pick first live exam or first available exam
      const live = all.find((e: Exam) => e.status === 'live');
      const initialId = live ? live.id : all[0]?.id;
      if (initialId) {
        setSelectedExamId(initialId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!selectedExamId) return;
    loadExamMonitoring(selectedExamId);
  }, [selectedExamId]);

  // Auto-refresh interval (every 10 seconds)
  useEffect(() => {
    if (!autoRefresh || !selectedExamId) return;
    const interval = setInterval(() => {
      loadExamMonitoring(selectedExamId, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedExamId]);

  const loadExamMonitoring = async (examId: string, isSilent = false) => {
    if (!isSilent) setLoading(true);
    setRefreshing(true);
    try {
      const data = await api.getExamMonitoring(examId);
      setMonitoringData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Exam Monitoring</h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervise active candidate attempts, test timers, answers logged, and browser tab violations.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-semibold text-slate-700">Auto-refresh (10s)</span>
          </label>

          <button
            onClick={() => selectedExamId && loadExamMonitoring(selectedExamId)}
            className="p-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 text-slate-600 transition"
            title="Refresh now"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Select Exam Dropdown */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-1 max-w-md">
          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Monitor Exam:</span>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
          >
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.status.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {selectedExam && (
          <div className="text-xs text-slate-500 space-x-3">
            <span>Duration: <strong>{selectedExam.duration_minutes} mins</strong></span>
            <span>•</span>
            <span>Questions: <strong>{selectedExam.total_questions}</strong></span>
            <span>•</span>
            <span>Marks: <strong>{selectedExam.total_marks}</strong></span>
          </div>
        )}
      </div>

      {/* Monitoring Metrics */}
      {monitoringData && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Total Candidates</span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {monitoringData.metrics.totalStudents}
            </div>
            <span className="text-[11px] text-slate-400">Registered on system</span>
          </div>

          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Currently In-Progress</span>
            </span>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {monitoringData.metrics.inProgress}
            </div>
            <span className="text-[11px] text-emerald-600">Active test screens</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 shadow-2xs">
            <span className="text-[11px] font-bold text-blue-800 uppercase">Completed</span>
            <div className="text-2xl font-black text-blue-700 mt-1">
              {monitoringData.metrics.completed}
            </div>
            <span className="text-[11px] text-blue-600">Tests submitted</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-600 uppercase">Not Started</span>
            <div className="text-2xl font-black text-slate-700 mt-1">
              {monitoringData.metrics.notStarted}
            </div>
            <span className="text-[11px] text-slate-400">Yet to enter test</span>
          </div>
        </div>
      )}

      {/* Candidate Monitoring Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Candidate Terminal Activity Feed
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {monitoringData?.attempts?.length || 0} active/submitted records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Roll Number</th>
                <th className="px-6 py-3.5">Candidate Name</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Start Time</th>
                <th className="px-6 py-3.5">Answered Qs</th>
                <th className="px-6 py-3.5">Security / Violations</th>
                <th className="px-6 py-3.5 text-right">Score / Time Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading live monitor feed...
                  </td>
                </tr>
              ) : !monitoringData?.attempts || monitoringData.attempts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No attempts logged for this examination yet.
                  </td>
                </tr>
              ) : (
                monitoringData.attempts.map((att: any) => {
                  const isInProgress = att.status === 'in_progress';
                  const hasViolations = (att.tab_switches || 0) > 0;

                  return (
                    <tr key={att.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-900">
                        {att.roll_number}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{att.student_name}</div>
                        <div className="text-[11px] text-slate-400">{att.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isInProgress
                              ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isInProgress ? 'In Progress (Active)' : 'Completed'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(att.start_time).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {att.answered_count || 0} / {selectedExam?.total_questions || att.total_questions || 10}
                      </td>
                      <td className="px-6 py-4">
                        {hasViolations ? (
                          <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center space-x-1 inline-flex">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                            <span>{att.tab_switches} Tab Switch(es)</span>
                          </span>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Clean (0 Alerts)</span>
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {isInProgress ? (
                          <span className="text-amber-600 font-bold font-mono">
                            {att.remaining_seconds ? `${Math.floor(att.remaining_seconds / 60)}m left` : 'Live'}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-black font-mono">
                            Score: {att.final_score ?? '-'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
