import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { User, ExamResult, Exam } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import { OfficialAdmitCardModal } from '../common/OfficialAdmitCardModal';
import {
  Users,
  Search,
  Plus,
  Ticket,
  Edit2,
  Trash2,
  KeyRound,
  BarChart2,
  CheckCircle,
  XCircle,
  X,
  Phone,
  Mail,
  Hash,
  RotateCcw,
  AlertCircle,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  Lock,
  Unlock,
  Sliders,
  CheckSquare,
  Square,
  Globe,
  Layers,
  BookOpen,
  Check,
  HelpCircle,
  Clock
} from 'lucide-react';

interface StudentManagementProps {
  initialAdmitCardFocus?: boolean;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ initialAdmitCardFocus = false }) => {
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Exam Allocation & Center Access Mode State
  const [accessMode, setAccessMode] = useState<'custom_or_open' | 'strict_assigned'>('custom_or_open');
  const [togglingAccessMode, setTogglingAccessMode] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [showAssignExamModal, setShowAssignExamModal] = useState(false);
  const [assignModalStudent, setAssignModalStudent] = useState<any | null>(null);
  const [assignModalExamId, setAssignModalExamId] = useState<string>('all');
  const [assignModalSeat, setAssignModalSeat] = useState<string>('');
  const [batchExamId, setBatchExamId] = useState<string>('');
  const [batchSeatPrefix, setBatchSeatPrefix] = useState<string>('Desk-');
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [assignFeedback, setAssignFeedback] = useState<string | null>(null);

  // Admit Card Release & Customization State
  const [admitCardSummary, setAdmitCardSummary] = useState<{
    total_students: number;
    released_count: number;
    withheld_count: number;
    policy: string;
  } | null>(null);
  const [admitCardFilter, setAdmitCardFilter] = useState<'all' | 'released' | 'withheld'>('all');
  const [isTogglingAllAdmitCard, setIsTogglingAllAdmitCard] = useState(false);
  const [togglingStudentAdmitCardId, setTogglingStudentAdmitCardId] = useState<string | null>(null);
  const [batchAdmitCardLoading, setBatchAdmitCardLoading] = useState(false);
  const [admitCardPreviewData, setAdmitCardPreviewData] = useState<any | null>(null);

  // OTP Verification Policy & Mailer State
  const [otpEnabled, setOtpEnabled] = useState(true);
  const [togglingOtp, setTogglingOtp] = useState(false);
  const [otpMsg, setOtpMsg] = useState<string | null>(null);
  const [hasSmtpPassword, setHasSmtpPassword] = useState(true);
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([]);
  const [approvingEmail, setApprovingEmail] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [studentPerformance, setStudentPerformance] = useState<{
    student: User;
    stats: { totalAttempts: number; avgScore: number; highestScore: number; avgPercentage: number };
    results: ExamResult[];
  } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [newPassword, setNewPassword] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadStudents();
    loadExamsList();
    loadAccessMode();
    loadOtpSetting();
    loadMailerStatus();
    loadPendingRegistrations();
    loadAdmitCardSummary();
  }, [statusFilter, admitCardFilter]);

  const loadExamsList = async () => {
    try {
      const examData = await api.getExams({ role: 'admin' });
      setExams(examData);
      if (examData.length > 0 && !batchExamId) {
        setBatchExamId(examData[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadAccessMode = async () => {
    try {
      const res = await api.getExamAccessSettings();
      setAccessMode(res.mode);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAccessMode = async () => {
    setTogglingAccessMode(true);
    try {
      const nextMode = accessMode === 'custom_or_open' ? 'strict_assigned' : 'custom_or_open';
      const res = await api.setExamAccessSettings(nextMode);
      setAccessMode(nextMode);
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 5000);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to update access mode');
    } finally {
      setTogglingAccessMode(false);
    }
  };

  const handleOpenAssignExam = (student: any) => {
    setAssignModalStudent(student);
    setAssignModalExamId(student.assigned_exam_id || 'all');
    setAssignModalSeat(student.seat_number || '');
    setShowAssignExamModal(true);
  };

  const handleSaveStudentExamAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalStudent) return;
    setIsSavingAssignment(true);
    try {
      const res = await api.assignStudentExam(assignModalStudent.id, {
        exam_id: assignModalExamId === 'all' ? null : assignModalExamId,
        seat_number: assignModalSeat.trim() || undefined
      });
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 5000);
      setShowAssignExamModal(false);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to assign exam to student');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleBatchAssignExams = async () => {
    if (selectedStudentIds.length === 0) return;
    setIsSavingAssignment(true);
    try {
      const res = await api.batchAssignStudentExam({
        student_ids: selectedStudentIds,
        exam_id: batchExamId === 'all' ? null : batchExamId,
        seat_prefix: batchSeatPrefix.trim() || undefined
      });
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 5000);
      setSelectedStudentIds([]);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to batch assign exams');
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === students.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(students.map((s) => s.id));
    }
  };

  const handleToggleSelectStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const loadMailerStatus = async () => {
    try {
      const res = await fetch('/api/gmail/config');
      if (res.ok) {
        const d = await res.json();
        setHasSmtpPassword(!!d.has_password);
      }
    } catch {
      // ignore
    }
  };

  const loadPendingRegistrations = async () => {
    try {
      const res = await fetch('/api/admin/pending-registrations');
      if (res.ok) {
        const d = await res.json();
        setPendingRegistrations(Array.isArray(d) ? d : []);
      }
    } catch {
      // ignore
    }
  };

  const handleApprovePending = async (pendingEmail: string) => {
    setApprovingEmail(pendingEmail);
    try {
      const res = await fetch('/api/admin/pending-registrations/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail })
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Student successfully approved & activated!');
        loadPendingRegistrations();
        loadStudents();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to approve student');
      }
    } catch (e: any) {
      alert(e.message || 'Error approving student');
    } finally {
      setApprovingEmail(null);
    }
  };

  const loadOtpSetting = async () => {
    try {
      const s = await api.getSettings();
      setOtpEnabled(s.student_reg_otp_enabled !== 'false');
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleRegOtp = async () => {
    setTogglingOtp(true);
    try {
      const nextVal = !otpEnabled;
      await api.toggleRegOtp(nextVal);
      setOtpEnabled(nextVal);
      setOtpMsg(nextVal ? 'Registration OTP Verification Activated!' : 'OTP Verification Disabled (Direct Sign-up Allowed)');
      setTimeout(() => setOtpMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to update OTP verification setting');
    } finally {
      setTogglingOtp(false);
    }
  };

  const loadAdmitCardSummary = async () => {
    try {
      const summary = await api.getAdmitCardSummary();
      setAdmitCardSummary(summary);
    } catch (err) {
      console.error('Failed to load admit card summary', err);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const data = await api.getStudents({
        search,
        status: statusFilter,
        admit_card: admitCardFilter !== 'all' ? admitCardFilter : undefined
      });
      setStudents(data);
      loadAdmitCardSummary();
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStudentAdmitCard = async (student: any) => {
    setTogglingStudentAdmitCardId(student.id);
    try {
      const currentVal = student.admit_card_enabled !== 0;
      const nextVal = !currentVal;
      const res = await api.updateStudentAdmitCard(student.id, nextVal);
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 5000);
      await loadStudents();
      await loadAdmitCardSummary();
    } catch (err: any) {
      setAssignFeedback(err.message || 'Failed to update candidate admit card access');
      setTimeout(() => setAssignFeedback(null), 5000);
    } finally {
      setTogglingStudentAdmitCardId(null);
    }
  };

  const handleBatchToggleAdmitCard = async (enable: boolean) => {
    if (selectedStudentIds.length === 0) return;
    setBatchAdmitCardLoading(true);
    try {
      const res = await api.batchUpdateStudentAdmitCard({
        student_ids: selectedStudentIds,
        enabled: enable
      });
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 5000);
      setSelectedStudentIds([]);
      await loadStudents();
      await loadAdmitCardSummary();
    } catch (err: any) {
      setAssignFeedback(err.message || 'Failed to batch update admit cards');
      setTimeout(() => setAssignFeedback(null), 5000);
    } finally {
      setBatchAdmitCardLoading(false);
    }
  };

  const handleAllStudentsAdmitCard = async (enable: boolean) => {
    setIsTogglingAllAdmitCard(true);
    setAssignFeedback(null);
    try {
      const res = await api.setAllStudentsAdmitCard(enable);
      setAssignFeedback(res.message);
      setTimeout(() => setAssignFeedback(null), 6000);
      await loadStudents();
      await loadAdmitCardSummary();
    } catch (err: any) {
      setAssignFeedback(err.message || 'Failed to update all candidate admit cards');
      setTimeout(() => setAssignFeedback(null), 6000);
    } finally {
      setIsTogglingAllAdmitCard(false);
    }
  };

  const handlePreviewAdmitCard = (student: any) => {
    const allocatedExam = exams.find((e) => e.id === student.assigned_exam_id);
    setAdmitCardPreviewData({
      student_name: student.name,
      roll_number: student.roll_number,
      email: student.email,
      mobile: student.mobile || '',
      exam_name: student.assigned_exam_name || allocatedExam?.name || 'All-India CBT Assessment & Mock Examination 2026',
      exam_id: student.assigned_exam_id || allocatedExam?.id || '',
      duration_minutes: allocatedExam?.duration_minutes || 60,
      start_datetime: allocatedExam?.start_datetime,
      seat_number: student.seat_number || 'Center Assigned Desk',
      verification_status: 'verified',
      entry_token: `GATE-${(student.roll_number.replace(/[^0-9]/g, '') || '851218').slice(-6)}`
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadStudents();
  };

  const handleOpenAdd = () => {
    setName('');
    setEmail('');
    setMobile('');
    setRollNumber(`ROLL-2026-${Math.floor(100 + Math.random() * 900)}`);
    setPassword('student123');
    setStatus('active');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.createStudent({
        name,
        email,
        mobile,
        roll_number: rollNumber,
        password,
        status
      });
      setShowAddModal(false);
      loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create student');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEdit = (student: any) => {
    setSelectedStudent(student);
    setName(student.name);
    setEmail(student.email);
    setMobile(student.mobile || '');
    setRollNumber(student.roll_number);
    setStatus(student.status);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.updateStudent(selectedStudent.id, {
        name,
        email,
        mobile,
        roll_number: rollNumber,
        status
      });
      setShowEditModal(false);
      loadStudents();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update student');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenResetPassword = (student: any) => {
    setSelectedStudent(student);
    setNewPassword('');
    setFormError(null);
    setShowPasswordModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.resetStudentPassword(selectedStudent.id, newPassword);
      setShowPasswordModal(false);
      alert(`Password successfully updated for ${selectedStudent.name}`);
    } catch (err: any) {
      setFormError(err.message || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  // In-app Delete Confirmation State
  const [studentToDelete, setStudentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
      loadStudents();
    } catch (err: any) {
      alert(err.message || 'Failed to delete student');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDelete = (student: any) => {
    setStudentToDelete(student);
  };

  const handleViewPerformance = async (student: any) => {
    setSelectedStudent(student);
    setShowPerformanceModal(true);
    try {
      const data = await api.getStudentPerformance(student.id);
      setStudentPerformance(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load performance analytics');
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Student Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Register students, manage credentials, view test attempts and performance.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Import & Generate Admit Cards</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Student</span>
          </button>
        </div>
      </div>

      {/* Live Feedback Toast for Exam Allocation */}
      {assignFeedback && (
        <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-950 text-xs flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center space-x-2.5">
            <CheckCircle className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="font-bold text-xs sm:text-sm">{assignFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setAssignFeedback(null)}
            className="p-1 text-indigo-400 hover:text-indigo-800 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Center Exam Allocation & Seat Visibility Control Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-indigo-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5 max-w-2xl">
          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
            <Lock className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-white">
                Seat-Wise Custom Exam Visibility Control:
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                accessMode === 'strict_assigned'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-emerald-400 text-slate-950'
              }`}>
                {accessMode === 'strict_assigned' ? 'Strict Seat Mode (Locked)' : 'Custom / Open Access Mode'}
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-1 leading-relaxed">
              {accessMode === 'strict_assigned'
                ? 'Strict Center Mode is ON: Candidates can ONLY view the exact test allocated to their desk/roll number by admin. All other exams are hidden automatically.'
                : 'Custom Mode is ON: When you assign a specific test to a candidate (e.g. SSC CGL on Seat 1, Railway on Seat 2), other exams are hidden for that candidate. Unassigned candidates see all published exams.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleAccessMode}
            disabled={togglingAccessMode}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50 ${
              accessMode === 'strict_assigned'
                ? 'bg-white hover:bg-slate-100 text-slate-900 active:scale-[0.98]'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400/30 active:scale-[0.98]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>
              {togglingAccessMode
                ? 'Switching...'
                : accessMode === 'strict_assigned'
                ? 'Switch to Custom Mode'
                : 'Enable Strict Seat Mode'}
            </span>
          </button>
        </div>
      </div>

      {/* Registration Security & OTP Policy Control Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${otpEnabled ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="font-bold text-slate-900 text-xs sm:text-sm">Candidate Registration OTP Security:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${otpEnabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {otpEnabled ? 'OTP Verification Required' : 'Direct Sign-Up (No OTP)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {otpEnabled
                ? 'When candidates register, they must verify a 6-digit OTP code sent to their email before account activation and terminal login.'
                : 'Candidates can register and log in instantly without OTP verification.'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {otpMsg && (
            <span className="text-[11px] font-bold text-emerald-600 animate-in fade-in">
              {otpMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleToggleRegOtp}
            disabled={togglingOtp}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer disabled:opacity-50 ${
              otpEnabled
                ? 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-200 shadow-2xs'
                : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {togglingOtp
                ? 'Updating...'
                : otpEnabled
                ? 'Turn OFF OTP (Allow Direct Sign-Up)'
                : 'Turn ON OTP Verification'}
            </span>
          </button>
        </div>
      </div>

      {/* Notice: If OTP is enforced but Gmail App Password is not yet saved */}
      {otpEnabled && !hasSmtpPassword && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start space-x-3.5 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-xs sm:text-sm text-amber-900 flex items-center space-x-2">
              <span>⚠️ Gmail SMTP App Password Missing (Email Delivery Inactive)</span>
              <span className="px-2 py-0.5 rounded bg-amber-200/80 text-[10px] uppercase font-bold text-amber-900">Important</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Google/Gmail requires a 16-character <strong>Gmail App Password</strong> to allow our server to send emails to external candidate inboxes from <code>rudrarock38@gmail.com</code>.
              Until this is configured in the <strong>Gmail Mailer</strong> tab, emails cannot reach students' real Gmail addresses.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="font-semibold text-amber-950">You have two easy options:</span>
              <button
                type="button"
                onClick={handleToggleRegOtp}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[10px] cursor-pointer transition shadow-2xs"
              >
                1. Click Here: Turn OFF OTP (Allow Direct Registration & Instant Login)
              </button>
              <span className="text-amber-800">or</span>
              <span className="text-amber-900 font-medium">2. Go to the "Gmail Mailer" tab and save your 16-character App Password.</span>
            </div>
          </div>
        </div>
      )}

      {/* Pending Student Registrations Queue */}
      {pendingRegistrations.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h3 className="font-bold text-slate-950 text-xs sm:text-sm">
                Candidates Awaiting Email Verification ({pendingRegistrations.length})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500">
              Students who registered and are pending verification
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3">Candidate Full Name</th>
                  <th className="p-3">Gmail / Email</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Email Status</th>
                  <th className="p-3 text-right">Quick Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRegistrations.map((p: any) => (
                  <tr key={p.email} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-bold text-slate-900">{p.name}</td>
                    <td className="p-3 text-slate-600 font-mono text-[11px]">{p.email}</td>
                    <td className="p-3 text-slate-500">{p.mobile || '—'}</td>
                    <td className="p-3">
                      <span className="font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-[11px] tracking-wide inline-flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Pending Link Click</span>
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleApprovePending(p.email)}
                        disabled={approvingEmail === p.email}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-[11px] transition shadow-2xs cursor-pointer disabled:opacity-50"
                      >
                        {approvingEmail === p.email ? 'Activating...' : 'Approve & Activate Student'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admit Card & Hall Ticket Release Control Center */}
      <div className="bg-white p-5 rounded-3xl border border-indigo-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3.5 max-w-xl">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center shrink-0 mt-0.5">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                Candidate Admit Card & Gate Pass Access:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                Customized Control
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Control which students can view and download their Admit Card. You can release or withhold access individually in the table below, select multiple candidates, or toggle all candidates at once.
            </p>
            {/* Live Stats */}
            <div className="flex flex-wrap items-center gap-3 mt-2.5 pt-2 border-t border-slate-100 text-xs font-semibold">
              <span className="text-slate-500">
                Total Candidates: <strong className="text-slate-900 font-mono">{admitCardSummary?.total_students ?? students.length}</strong>
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Admit Cards Released: <strong>{admitCardSummary?.released_count ?? students.filter(s => s.admit_card_enabled !== 0).length}</strong></span>
              </span>
              <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Admit Cards Withheld: <strong>{admitCardSummary?.withheld_count ?? students.filter(s => s.admit_card_enabled === 0).length}</strong></span>
              </span>
            </div>
          </div>
        </div>

        {/* 1-Click Master Control Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={() => handleAllStudentsAdmitCard(true)}
            disabled={isTogglingAllAdmitCard}
            className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            title="Release Admit Card for all registered candidates in one click"
          >
            {isTogglingAllAdmitCard ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <span>{isTogglingAllAdmitCard ? 'Updating All...' : 'Release for All Candidates'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleAllStudentsAdmitCard(false)}
            disabled={isTogglingAllAdmitCard}
            className="flex-1 sm:flex-initial min-h-[42px] px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100 text-slate-700 border border-slate-300 text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
            title="Withhold Admit Card for all students"
          >
            {isTogglingAllAdmitCard ? (
              <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{isTogglingAllAdmitCard ? 'Updating All...' : 'Withhold for All Candidates'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
            >
              <option value="all">All Students</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500 font-semibold">Admit Card:</span>
            <select
              value={admitCardFilter}
              onChange={(e: any) => setAdmitCardFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
            >
              <option value="all">All Admit Cards</option>
              <option value="released">Admit Card Released Only</option>
              <option value="withheld">Admit Card Withheld Only</option>
            </select>
          </div>

          <button
            onClick={loadStudents}
            className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            title="Refresh"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Exam Allocation Toolbar */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-300 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center space-x-2 text-indigo-950 font-bold text-xs sm:text-sm">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span>{selectedStudentIds.length} Candidate(s) Selected</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs">
              <span className="font-semibold text-slate-600">Assign Test:</span>
              <select
                value={batchExamId}
                onChange={(e) => setBatchExamId(e.target.value)}
                className="font-bold text-indigo-900 bg-transparent outline-hidden cursor-pointer"
              >
                <option value="all">🌐 Open Access (All Exams Visible)</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    🎯 {ex.name} ({ex.question_count || ex.total_questions} Qs)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs">
              <span className="font-semibold text-slate-600">Desk Prefix:</span>
              <input
                type="text"
                value={batchSeatPrefix}
                onChange={(e) => setBatchSeatPrefix(e.target.value)}
                placeholder="Desk-"
                className="w-16 font-mono font-bold text-slate-800 outline-hidden"
              />
            </div>

            <button
              type="button"
              onClick={handleBatchAssignExams}
              disabled={isSavingAssignment}
              className="min-h-[38px] px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {isSavingAssignment ? 'Allocating...' : `Lock Test (${selectedStudentIds.length})`}
            </button>

            {/* Batch Admit Card Release Buttons */}
            <div className="flex items-center space-x-1.5 pl-2 border-l border-indigo-300">
              <button
                type="button"
                onClick={() => handleBatchToggleAdmitCard(true)}
                disabled={batchAdmitCardLoading}
                className="min-h-[38px] px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                title="Release Admit Card for selected candidates"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Release Card ({selectedStudentIds.length})</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchToggleAdmitCard(false)}
                disabled={batchAdmitCardLoading}
                className="min-h-[38px] px-3 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-700 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition cursor-pointer flex items-center space-x-1 disabled:opacity-50"
                title="Withhold / Hide Admit Card for selected candidates"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Withhold ({selectedStudentIds.length})</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="min-h-[38px] px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl border border-slate-300 transition cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Student List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={students.length > 0 && selectedStudentIds.length === students.length}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                    title="Select All Candidates"
                  />
                </th>
                <th className="px-5 py-3.5">Roll Number</th>
                <th className="px-5 py-3.5">Candidate Name</th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center space-x-1 text-indigo-900 font-black">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Allocated Exam & Desk</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">
                  <div className="flex items-center space-x-1 text-indigo-900 font-black">
                    <Ticket className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Admit Card Access</span>
                  </div>
                </th>
                <th className="px-5 py-3.5">Contact Info</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Attempts</th>
                <th className="px-4 py-3.5">Avg Score</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const isSelected = selectedStudentIds.includes(st.id);
                  const isCustomExam = Boolean(st.assigned_exam_id);

                  return (
                    <tr
                      key={st.id}
                      className={`transition ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/70'}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(st.id)}
                          className="w-4 h-4 rounded text-indigo-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div>{st.roll_number}</div>
                        {st.seat_number && (
                          <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-mono mt-0.5 font-semibold">
                            🪑 {st.seat_number}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{st.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Joined {new Date(st.created_at).toLocaleDateString()}
                        </div>
                      </td>

                      {/* Allocated Exam Column */}
                      <td className="px-5 py-4">
                        {isCustomExam ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                              <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-900 border border-purple-200 font-bold text-xs shadow-2xs">
                                <Lock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                <span className="truncate max-w-[200px]" title={st.assigned_exam_name}>
                                  {st.assigned_exam_name || 'Assigned Test'}
                                </span>
                              </span>
                              {st.seat_number && (
                                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 font-mono text-[11px] font-bold">
                                  {st.seat_number}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-purple-600 font-semibold block">
                              🔒 Other exams hidden on login
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignExam(st)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1 pt-0.5 cursor-pointer"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>Change Test / Seat</span>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>
                                {accessMode === 'strict_assigned'
                                  ? 'No Exam Assigned (Hidden)'
                                  : 'Open Access (All Exams)'}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenAssignExam(st)}
                              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center space-x-1 pt-0.5 cursor-pointer"
                            >
                              <Lock className="w-3 h-3" />
                              <span>Assign Specific Exam</span>
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Admit Card Customization Column */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5 min-w-[155px]">
                          <div className="flex items-center space-x-1.5">
                            {st.admit_card_enabled !== 0 ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>Released</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                                <XCircle className="w-3 h-3 text-rose-600" />
                                <span>Withheld</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleToggleStudentAdmitCard(st)}
                              disabled={togglingStudentAdmitCardId === st.id}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold transition flex items-center space-x-1 cursor-pointer disabled:opacity-50 active:scale-95 ${
                                st.admit_card_enabled !== 0
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title={
                                st.admit_card_enabled !== 0
                                  ? 'Click to withhold admit card for this candidate'
                                  : 'Click to release admit card for this candidate'
                              }
                            >
                              {togglingStudentAdmitCardId === st.id ? (
                                <span>Updating...</span>
                              ) : st.admit_card_enabled !== 0 ? (
                                <>
                                  <Lock className="w-3 h-3 text-rose-600" />
                                  <span>Withhold</span>
                                </>
                              ) : (
                                <>
                                  <Ticket className="w-3 h-3 text-emerald-600" />
                                  <span>Release</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handlePreviewAdmitCard(st)}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition flex items-center space-x-1 cursor-pointer"
                              title="Preview Candidate Admit Card / Gate Slip"
                            >
                              <Printer className="w-3 h-3 text-indigo-600" />
                              <span>Preview Slip</span>
                            </button>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 space-y-0.5">
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[160px]">{st.email}</span>
                        </div>
                        {st.mobile && (
                          <div className="flex items-center space-x-1.5 text-slate-500">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{st.mobile}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            st.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {st.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-slate-800">
                        {st.total_attempts || 0}
                      </td>
                      <td className="px-4 py-4">
                        {st.avg_percentage ? (
                          <span className="font-bold text-indigo-600">{st.avg_percentage}%</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenAssignExam(st)}
                          className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer"
                          title="Assign Single Exam to Student"
                        >
                          <Lock className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleViewPerformance(st)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                          title="View Performance Analytics"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenResetPassword(st)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(st)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
                          title="Edit Student"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(st)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. ADD STUDENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ananya Sen"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ananya@example.com"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number *</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT STUDENT MODAL */}
      {showEditModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Edit Student Details</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile</label>
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    required
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                <select
                  value={status}
                  onChange={(e: any) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden bg-white"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Deactivated</option>
                </select>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RESET PASSWORD MODAL */}
      {showPasswordModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Reset Student Password</h3>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Enter a new password for <strong>{selectedStudent.name}</strong> ({selectedStudent.roll_number}):
            </p>

            {formError && (
              <div className="mb-4 p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. pass123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !newPassword}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                >
                  {saving ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. PERFORMANCE ANALYTICS MODAL */}
      {showPerformanceModal && selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">Student Performance Record</h3>
                <span className="text-xs text-slate-500">
                  {selectedStudent.name} • Roll: {selectedStudent.roll_number}
                </span>
              </div>
              <button onClick={() => setShowPerformanceModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentPerformance ? (
              <div className="space-y-5">
                {/* 4 Quick Stat Cards */}
                <div className="grid grid-cols-4 gap-3 text-center">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Exams Taken</span>
                    <strong className="text-lg text-slate-900 block mt-0.5">
                      {studentPerformance.stats.totalAttempts}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg Score</span>
                    <strong className="text-lg text-indigo-600 block mt-0.5">
                      {studentPerformance.stats.avgScore}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Highest Score</span>
                    <strong className="text-lg text-emerald-600 block mt-0.5">
                      {studentPerformance.stats.highestScore}
                    </strong>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Avg %</span>
                    <strong className="text-lg text-purple-600 block mt-0.5">
                      {studentPerformance.stats.avgPercentage}%
                    </strong>
                  </div>
                </div>

                {/* History table */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Exam Attempt History
                  </h4>
                  {studentPerformance.results.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400 border border-slate-100 rounded-xl">
                      No completed exam attempts on record for this student.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="p-3">Exam Name</th>
                            <th className="p-3">Score</th>
                            <th className="p-3">Percentage</th>
                            <th className="p-3">Accuracy</th>
                            <th className="p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {studentPerformance.results.map((r) => (
                            <tr key={r.id}>
                              <td className="p-3 font-semibold text-slate-900">{r.exam_name}</td>
                              <td className="p-3 font-bold text-slate-800">
                                {r.final_score} / {r.total_questions}
                              </td>
                              <td className="p-3 font-bold text-emerald-600">{r.percentage}%</td>
                              <td className="p-3 text-slate-600">{r.accuracy}%</td>
                              <td className="p-3 text-slate-400">
                                {new Date(r.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-400">Loading performance data...</div>
            )}
          </div>
        </div>
      )}

      {/* 5. INDIVIDUAL CANDIDATE EXAM & SEAT ALLOCATION MODAL */}
      {showAssignExamModal && assignModalStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl p-5 sm:p-7 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-slate-900">
                    Candidate Exam & Seat Allocation
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize which test this student will see upon terminal login
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignExamModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Candidate Identity Strip */}
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl mb-4 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  {assignModalStudent.name}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">
                  Roll: <strong className="text-slate-800">{assignModalStudent.roll_number}</strong> • {assignModalStudent.email}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                Candidate Terminal
              </span>
            </div>

            <form onSubmit={handleSaveStudentExamAssignment} className="space-y-4">
              {/* Desk / Seat Number Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Assigned Seat / Desk Number:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={assignModalSeat}
                    onChange={(e) => setAssignModalSeat(e.target.value)}
                    placeholder="e.g. Desk 01, Seat A-12, Lab-1"
                    className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Shown on student dashboard and gate verification slip.
                </p>
              </div>

              {/* Exam Allocation Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Select Examination for this Candidate:
                </label>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {/* Option: Open Access */}
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-2xl border transition cursor-pointer ${
                      assignModalExamId === 'all'
                        ? 'bg-indigo-50/70 border-indigo-400 shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocatedExam"
                      value="all"
                      checked={assignModalExamId === 'all'}
                      onChange={() => setAssignModalExamId('all')}
                      className="mt-1 w-4 h-4 text-indigo-600"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                        <Globe className="w-3.5 h-3.5 text-slate-500" />
                        <span>🌐 Open Access (All Exams Visible)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Candidate can view and take any active or scheduled exam in the center.
                      </p>
                    </div>
                  </label>

                  {/* Individual Specific Exams */}
                  {exams.map((ex) => {
                    const isSelected = assignModalExamId === ex.id;
                    return (
                      <label
                        key={ex.id}
                        className={`flex items-start space-x-3 p-3 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-400 shadow-2xs'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="allocatedExam"
                          value={ex.id}
                          checked={isSelected}
                          onChange={() => setAssignModalExamId(ex.id)}
                          className="mt-1 w-4 h-4 text-purple-600"
                        />
                        <div className="flex-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 text-xs sm:text-sm">
                              🎯 {ex.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                              {ex.status}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600">
                            {ex.subject_name && (
                              <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-semibold text-slate-700">
                                {ex.subject_name}
                              </span>
                            )}
                            <span>{ex.question_count || ex.total_questions} Questions</span>
                            <span>•</span>
                            <span>{ex.total_marks} Marks</span>
                            <span>•</span>
                            <span>{ex.duration_minutes} Minutes</span>
                          </div>
                          {isSelected && (
                            <p className="text-[11px] text-purple-700 font-bold mt-1.5 flex items-center space-x-1">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>Baki sabhi exams hide ho jayenge; student sirf yahi exam de sakega.</span>
                            </p>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Hindi Clarification Note */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl text-[11px] text-blue-900 leading-relaxed">
                <span className="font-bold flex items-center space-x-1.5 mb-0.5">
                  <CheckCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Kaise Kaam Karta Hai:</span>
                </span>
                <p className="text-slate-600">
                  Jaise hi aap yahan koi specific exam (jaise <strong>SSC CGL</strong>) select karke save karenge, toh candidate jab login karega toh usey sirf wahi exam dikhega. Bagal wale seat ke candidate ko aap <strong>Railway</strong> ka exam assign kar sakte hain.
                </p>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAssignExamModal(false)}
                  className="min-h-[44px] px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="min-h-[44px] px-6 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSavingAssignment ? 'Saving Allocation...' : 'Save & Lock Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(studentToDelete)}
        title="Delete Student Account"
        message={`Are you sure you want to permanently delete student "${studentToDelete?.name}" (${studentToDelete?.roll_number})? All associated exam attempts and result records will also be removed.`}
        confirmText="Yes, Delete Student"
        loading={isDeleting}
        onConfirm={confirmDeleteStudent}
        onCancel={() => setStudentToDelete(null)}
      />

      {/* Bulk Student Import & Admit Card Generation Modal */}
      <BulkStudentUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={() => {
          loadStudents();
        }}
      />

      {/* Official Admit Card / Hall Ticket Modal Preview */}
      {admitCardPreviewData && (
        <OfficialAdmitCardModal
          data={admitCardPreviewData}
          onClose={() => setAdmitCardPreviewData(null)}
        />
      )}
    </div>
  );
};
