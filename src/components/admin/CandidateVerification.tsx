import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { CandidateVerification as CandidateType, VerificationExamSummary, VerificationStats } from '../../types';
import { CameraQrScannerModal } from './CameraQrScannerModal';
import { OfficialAdmitCardModal } from '../common/OfficialAdmitCardModal';
import {
  UserCheck,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Search,
  ScanLine,
  Printer,
  Download,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Sliders,
  Check,
  X,
  AlertTriangle,
  User,
  Hash,
  MapPin,
  Building,
  Calendar,
  Layers,
  FileText,
  Camera,
  BookOpen
} from 'lucide-react';

export const CandidateVerification: React.FC = () => {
  const [exams, setExams] = useState<VerificationExamSummary[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [candidates, setCandidates] = useState<CandidateType[]>([]);
  const [stats, setStats] = useState<VerificationStats>({ total: 0, verified: 0, pending: 0, rejected: 0 });
  const [requireGateVerification, setRequireGateVerification] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Search and Filter states
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [quickScanInput, setQuickScanInput] = useState<string>('');
  const [scannedCandidate, setScannedCandidate] = useState<CandidateType | null>(null);
  const [scanMessage, setScanMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Camera QR Code Scanner State
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);

  // Quick edit / allocation
  const [deskNotes, setDeskNotes] = useState<string>('Identity Card & Photo Verified');
  const [seatNumber, setSeatNumber] = useState<string>('');

  // Bulk actions
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);

  // Admit card print modal
  const [admitCardCandidate, setAdmitCardCandidate] = useState<CandidateType | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);

  // Load available exams
  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await api.getVerificationExams();
      setExams(res.exams);
      setRequireGateVerification(res.require_gate_verification);
      if (res.exams.length > 0 && !selectedExamId) {
        // Prefer live or scheduled exam, else first
        const liveExam = res.exams.find(e => e.status === 'live') || res.exams.find(e => e.status === 'scheduled') || res.exams[0];
        setSelectedExamId(liveExam.id);
      }
    } catch (err: any) {
      console.error('Failed to load exams for verification:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Load candidates for selected exam
  const loadCandidates = async (examId: string) => {
    if (!examId) return;
    try {
      setActionLoading(true);
      const res = await api.getExamCandidates(examId, searchTerm, filterStatus);
      setCandidates(res.candidates);
      setStats(res.stats);
      setRequireGateVerification(res.require_gate_verification);
    } catch (err: any) {
      console.error('Failed to load exam candidates:', err);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    if (selectedExamId) {
      loadCandidates(selectedExamId);
      setSelectedCandidateIds([]);
      setScannedCandidate(null);
      setScanMessage(null);
    }
  }, [selectedExamId, filterStatus]);

  // Debounced search inside table
  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedExamId) {
        loadCandidates(selectedExamId);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Quick Scan / Instant Roll Number lookup
  const handleQuickScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickScanInput.trim()) return;

    setScanMessage(null);
    try {
      const res = await api.lookupCandidate(selectedExamId, quickScanInput.trim());
      setScannedCandidate(res.candidate);
      setSeatNumber(res.candidate.seat_number || '');
      setDeskNotes(res.candidate.desk_notes || 'Identity Card & Photo Verified');
      
      const examMatched = res.candidate.exam_id === selectedExamId;
      setScanMessage({
        text: `Candidate Verified: ${res.candidate.student_name} (${res.candidate.roll_number}) | Registered for: ${res.candidate.exam_name || 'CBT Assessment'} ${examMatched ? '✓ (Matches Active Exam)' : '• (Enrolled for test)'}`,
        type: 'success'
      });
    } catch (err: any) {
      setScannedCandidate(null);
      setScanMessage({
        text: err.message || 'No registered candidate found with this Roll Number, Email or Barcode in the system.',
        type: 'error'
      });
    }
  };

  // Handle scanned result from Camera QR Scanner
  const handleCameraQrScanned = async (decodedIdentifier: string) => {
    setIsCameraScannerOpen(false);
    const cleanId = decodedIdentifier.trim();
    setQuickScanInput(cleanId);

    if (!cleanId) return;

    setScanMessage(null);
    try {
      const res = await api.lookupCandidate(selectedExamId, cleanId);
      setScannedCandidate(res.candidate);
      setSeatNumber(res.candidate.seat_number || '');
      setDeskNotes(res.candidate.desk_notes || 'Identity Card & QR Code Verified at Gate');
      
      const examMatched = res.candidate.exam_id === selectedExamId;
      setScanMessage({
        text: `QR Verified: ${res.candidate.student_name} (${res.candidate.roll_number}) | Exam: ${res.candidate.exam_name || 'CBT Exam'} ${examMatched ? '✓' : ''} | Status: Registered (${res.candidate.registration_status || 'Active'})`,
        type: 'success'
      });
    } catch (err: any) {
      setScannedCandidate(null);
      setScanMessage({
        text: err.message || `No candidate found matching scanned QR code: "${cleanId}". Candidate is not registered.`,
        type: 'error'
      });
    }
  };

  // Verify Single Candidate
  const handleVerifyCandidate = async (
    studentId: string,
    status: 'verified' | 'pending' | 'rejected',
    customSeat?: string,
    customNotes?: string
  ) => {
    if (!selectedExamId) return;
    try {
      setActionLoading(true);
      const res = await api.verifyCandidate({
        exam_id: selectedExamId,
        student_id: studentId,
        status,
        seat_number: customSeat || seatNumber || undefined,
        desk_notes: customNotes || deskNotes || undefined
      });

      // Update in local state
      setCandidates(prev =>
        prev.map(c => (c.student_id === studentId ? { ...c, ...res.verification } : c))
      );

      // If scanned candidate was this student, update it
      if (scannedCandidate && scannedCandidate.student_id === studentId) {
        setScannedCandidate(prev => (prev ? { ...prev, ...res.verification } : null));
      }

      setScanMessage({
        text: res.message,
        type: status === 'verified' ? 'success' : 'info'
      });

      // Reload stats
      const statsRes = await api.getExamCandidates(selectedExamId, searchTerm, filterStatus);
      setStats(statsRes.stats);
    } catch (err: any) {
      alert(err.message || 'Verification update failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Verify
  const handleBulkVerify = async (status: 'verified' | 'pending' | 'rejected' = 'verified') => {
    if (!selectedExamId || selectedCandidateIds.length === 0) return;
    try {
      setActionLoading(true);
      await api.bulkVerifyCandidates({
        exam_id: selectedExamId,
        student_ids: selectedCandidateIds,
        status
      });
      setSelectedCandidateIds([]);
      await loadCandidates(selectedExamId);
      setScanMessage({
        text: `Successfully updated ${selectedCandidateIds.length} candidates to ${status.toUpperCase()}!`,
        type: 'success'
      });
    } catch (err: any) {
      alert(err.message || 'Bulk verify failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle Strict Gate Verification Policy
  const handleTogglePolicy = async () => {
    const nextVal = !requireGateVerification;
    try {
      const res = await api.setGateVerificationPolicy(nextVal);
      setRequireGateVerification(res.require_gate_verification);
      setScanMessage({
        text: res.message,
        type: 'info'
      });
    } catch (err: any) {
      alert(err.message || 'Failed to update policy');
    }
  };

  // Checkbox Select All Visible
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCandidateIds(candidates.map(c => c.student_id));
    } else {
      setSelectedCandidateIds([]);
    }
  };

  const handleSelectOne = (studentId: string) => {
    setSelectedCandidateIds(prev =>
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const currentExam = exams.find(e => e.id === selectedExamId);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white shadow-md flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Gate Entry & Candidate Verification</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase tracking-wider">
                  Live Center Desk
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Verify registered students, allocate exam seats, grant gate admission, and enforce hall security.
              </p>
            </div>
          </div>
        </div>

        {/* Global Policy Toggle & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Gate Verification Switch */}
          <div className="flex items-center bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs space-x-2.5">
            <ShieldCheck className={`w-4 h-4 ${requireGateVerification ? 'text-emerald-600' : 'text-slate-400'}`} />
            <div className="text-left">
              <div className="text-[11px] font-bold text-slate-800 leading-tight">Strict Gate Check</div>
              <div className="text-[10px] text-slate-500">
                {requireGateVerification ? 'Enforced (Admin approval required)' : 'Open Entry Mode'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTogglePolicy}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                requireGateVerification ? 'bg-emerald-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  requireGateVerification ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {selectedExamId && (
            <a
              href={`/api/verification/export/${selectedExamId}`}
              download
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-2xs flex items-center space-x-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Gate Sheet</span>
            </a>
          )}

          <button
            onClick={() => selectedExamId && loadCandidates(selectedExamId)}
            disabled={actionLoading}
            className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center space-x-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Exam Selector & Live Status Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Active Examination for Gate Verification *
            </label>
            <div className="flex items-center space-x-3">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full sm:w-96 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.status.toUpperCase()} • {ex.duration_minutes}m • {ex.total_marks} marks)
                  </option>
                ))}
              </select>

              {currentExam && (
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    currentExam.status === 'live'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : currentExam.status === 'scheduled'
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}
                >
                  {currentExam.status}
                </span>
              )}
            </div>
          </div>

          {/* Quick Notice */}
          <div className="text-xs text-slate-500 md:text-right">
            <div>Center Verification Desk: <strong>Invigilator Gate 1</strong></div>
            <div className="text-[11px] text-slate-400">Total Registered Candidates: <strong>{stats.total}</strong></div>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Total Candidates</span>
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
            <span className="text-[10px] text-slate-400">Registered for test</span>
          </div>

          <div className="bg-emerald-50 rounded-xl p-3.5 border border-emerald-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800">Verified & Admitted</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.verified}</div>
            <span className="text-[10px] text-emerald-700 font-semibold">
              {stats.total > 0 ? `${Math.round((stats.verified / stats.total) * 100)}% entered` : '0% entered'}
            </span>
          </div>

          <div className="bg-amber-50 rounded-xl p-3.5 border border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800">Pending at Gate</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.pending}</div>
            <span className="text-[10px] text-amber-700 font-semibold">Awaiting Verification</span>
          </div>

          <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-800">Denied / Flagged</span>
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-black text-rose-700 mt-1">{stats.rejected}</div>
            <span className="text-[10px] text-rose-700 font-semibold">Entry Rejected</span>
          </div>
        </div>
      </div>

      {/* Instant Roll Number / Barcode Scanner Desk */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-7 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <ScanLine className="w-4 h-4" />
              <span>Instant Gate Scanner & Roll Number Look-up</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-white mt-1">
              Verify Candidate at the Examination Hall Gate
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 bg-white/10 px-3 py-1 rounded-full backdrop-blur-xs self-start sm:self-auto">
            Barcode Scanner / Keyboard Ready
          </span>
        </div>

        {/* Scan Input Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleQuickScan} className="flex-1 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300">
                <Search className="w-5 h-5" />
              </div>
              <input
                ref={scanInputRef}
                type="text"
                value={quickScanInput}
                onChange={(e) => setQuickScanInput(e.target.value)}
                placeholder="Scan Barcode or Type Roll Number / Candidate Email / Mobile (e.g. ROLL-1001)..."
                className="w-full pl-11 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-slate-400 font-mono text-sm sm:text-base focus:bg-white/20 focus:border-indigo-400 focus:outline-hidden transition"
              />
            </div>

            <button
              type="submit"
              className="px-5 py-3 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
            >
              <ScanLine className="w-4 h-4" />
              <span>Search Candidate</span>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setIsCameraScannerOpen(true)}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-black text-sm rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer shrink-0"
          >
            <Camera className="w-5 h-5 stroke-[2.5]" />
            <span>Scan Admit Card QR (Start Camera)</span>
          </button>
        </div>

        {/* Scan Feedback Message */}
        {scanMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex items-center space-x-2 font-medium ${
              scanMessage.type === 'success'
                ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                : scanMessage.type === 'error'
                ? 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
                : 'bg-indigo-500/20 border border-indigo-400/40 text-indigo-200'
            }`}
          >
            {scanMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : scanMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            ) : (
              <UserCheck className="w-4 h-4 shrink-0 text-indigo-400" />
            )}
            <span>{scanMessage.text}</span>
          </div>
        )}

        {/* Scanned Candidate Spotlight Card */}
        {scannedCandidate && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 text-white animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-indigo-300">
                  {scannedCandidate.student_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-white">{scannedCandidate.student_name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        scannedCandidate.verification_status === 'verified'
                          ? 'bg-emerald-400 text-slate-950 font-bold'
                          : scannedCandidate.verification_status === 'rejected'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-400 text-slate-950 font-bold'
                      }`}
                    >
                      {scannedCandidate.verification_status === 'verified'
                        ? 'GATE VERIFIED (ENTRY ALLOWED)'
                        : scannedCandidate.verification_status === 'rejected'
                        ? 'ENTRY DENIED'
                        : 'PENDING GATE VERIFICATION'}
                    </span>
                  </div>

                  {/* Registered Exam & Registration Status Badge */}
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
                    <div className="flex items-center space-x-1.5 bg-blue-500/20 px-2.5 py-0.5 rounded-lg border border-blue-400/30 text-blue-200">
                      <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                      <span>Exam: <strong>{scannedCandidate.exam_name || 'General CBT Assessment'}</strong></span>
                    </div>

                    <div className="flex items-center space-x-1.5 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-400/30 text-emerald-300">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      <span>Registration: <strong>{scannedCandidate.registration_status === 'active' ? 'Registered & Active' : 'Registered'}</strong></span>
                    </div>

                    {scannedCandidate.category && (
                      <span className="bg-white/10 px-2 py-0.5 rounded text-[11px] text-slate-300">
                        Cat: {scannedCandidate.category}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1.5 font-mono">
                    <span>Roll: <strong>{scannedCandidate.roll_number}</strong></span>
                    <span>•</span>
                    <span>{scannedCandidate.email}</span>
                    {scannedCandidate.mobile && (
                      <>
                        <span>•</span>
                        <span>Mob: {scannedCandidate.mobile}</span>
                      </>
                    )}
                    {scannedCandidate.guardian_name && (
                      <>
                        <span>•</span>
                        <span className="font-sans text-slate-300">Guardian: {scannedCandidate.guardian_name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {scannedCandidate.entry_token && (
                <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 text-center font-mono shrink-0">
                  <span className="text-[10px] uppercase text-indigo-300 block font-bold">Gate Entry Pass Token</span>
                  <strong className="text-sm text-emerald-400 font-bold">{scannedCandidate.entry_token}</strong>
                </div>
              )}
            </div>

            {/* Allocation inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-indigo-200 mb-1">
                  Seat / Room / Lab Number Allocation
                </label>
                <input
                  type="text"
                  value={seatNumber}
                  onChange={(e) => setSeatNumber(e.target.value)}
                  placeholder="e.g. Lab 2 / Desk A-14"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:bg-white/20 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-200 mb-1">
                  Verification Desk Notes
                </label>
                <input
                  type="text"
                  value={deskNotes}
                  onChange={(e) => setDeskNotes(e.target.value)}
                  placeholder="e.g. Identity Card & Biometric Matched"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:bg-white/20 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Quick Actions for this candidate */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleVerifyCandidate(scannedCandidate.student_id, 'verified')}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Approve & Grant Entry</span>
              </button>

              <button
                type="button"
                onClick={() => setAdmitCardCandidate(scannedCandidate)}
                className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-xl transition flex items-center space-x-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Gate Entry Slip</span>
              </button>

              {scannedCandidate.verification_status === 'verified' ? (
                <button
                  type="button"
                  onClick={() => handleVerifyCandidate(scannedCandidate.student_id, 'pending')}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-xl border border-amber-400/40 transition cursor-pointer"
                >
                  Revoke Entry
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleVerifyCandidate(scannedCandidate.student_id, 'rejected')}
                  disabled={actionLoading}
                  className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold text-xs rounded-xl border border-rose-400/40 transition cursor-pointer"
                >
                  Deny Entry
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Candidate Roster Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
        {/* Table Filters & Search */}
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                filterStatus === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Candidates ({stats.total})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                filterStatus === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-800 hover:bg-amber-100/50'
              }`}
            >
              <span>Pending Gate</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{stats.pending}</span>
            </button>
            <button
              onClick={() => setFilterStatus('verified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                filterStatus === 'verified'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-800 hover:bg-emerald-100/50'
              }`}
            >
              <span>Admitted</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{stats.verified}</span>
            </button>
            <button
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center space-x-1 ${
                filterStatus === 'rejected'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-800 hover:bg-rose-100/50'
              }`}
            >
              <span>Denied</span>
              <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px]">{stats.rejected}</span>
            </button>
          </div>

          {/* Table Search & Bulk Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {selectedCandidateIds.length > 0 && (
              <button
                type="button"
                onClick={() => handleBulkVerify('verified')}
                disabled={actionLoading}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Admit Selected ({selectedCandidateIds.length})</span>
              </button>
            )}

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by name, roll, email..."
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-hidden w-56 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={candidates.length > 0 && selectedCandidateIds.length === candidates.length}
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="py-3 px-4">Candidate Details</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Seat / Room</th>
                <th className="py-3 px-4">Gate Status</th>
                <th className="py-3 px-4">Exam Activity</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <UserCheck className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No registered candidates found</p>
                    <p className="text-slate-400 text-xs mt-1">
                      Candidates will automatically appear here once registered.
                    </p>
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => {
                  const isSelected = selectedCandidateIds.includes(candidate.student_id);
                  const isVerified = candidate.verification_status === 'verified';
                  const isRejected = candidate.verification_status === 'rejected';

                  return (
                    <tr
                      key={candidate.student_id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(candidate.student_id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                              isVerified
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {candidate.student_name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {candidate.student_name}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {candidate.email}
                              {candidate.mobile && <span className="ml-1 text-slate-400">({candidate.mobile})</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {candidate.roll_number}
                      </td>

                      <td className="py-3 px-4">
                        {candidate.seat_number ? (
                          <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {candidate.seat_number}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isVerified ? (
                          <div>
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>ADMITTED</span>
                            </span>
                            {candidate.verified_at && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(candidate.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </div>
                        ) : isRejected ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            <span>DENIED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>PENDING GATE</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {candidate.attempt_status === 'completed' ? (
                          <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                            Finished Test
                          </span>
                        ) : candidate.attempt_status === 'in_progress' ? (
                          <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded text-[11px] animate-pulse">
                            Inside Hall (Writing)
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Not Started</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {!isVerified ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyCandidate(candidate.student_id, 'verified')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center space-x-1 cursor-pointer"
                              title="Admit candidate into exam hall"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Verify & Admit</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerifyCandidate(candidate.student_id, 'pending')}
                              className="px-2 py-1 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg text-[11px] transition font-semibold cursor-pointer"
                              title="Revoke entry"
                            >
                              Revoke
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setAdmitCardCandidate(candidate)}
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Print Admit / Entry Slip"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      {/* Camera QR Scanner Modal */}
      <CameraQrScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScan={handleCameraQrScanned}
        examName={currentExam?.name}
      />

      {/* Official Authentic Begusarai Digital Center E-Admit Card Modal */}
      {admitCardCandidate && (
        <OfficialAdmitCardModal
          data={{
            student_name: admitCardCandidate.student_name,
            roll_number: admitCardCandidate.roll_number,
            email: admitCardCandidate.email,
            mobile: admitCardCandidate.mobile,
            exam_name: currentExam?.name || admitCardCandidate.exam_name || 'General CBT Assessment',
            exam_id: currentExam?.id || admitCardCandidate.exam_id,
            duration_minutes: currentExam?.duration_minutes || 60,
            start_datetime: currentExam?.start_datetime,
            seat_number: admitCardCandidate.seat_number,
            entry_token: admitCardCandidate.entry_token,
            verification_status: admitCardCandidate.verification_status,
            verified_at: admitCardCandidate.verified_at,
            verified_by: admitCardCandidate.verified_by,
            guardian_name: admitCardCandidate.guardian_name,
            category: admitCardCandidate.category
          }}
          onClose={() => setAdmitCardCandidate(null)}
        />
      )}
    </div>
  );
};
