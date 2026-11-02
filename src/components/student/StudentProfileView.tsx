import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { StudentProfileStats } from '../../types';
import { OfficialAdmitCardModal } from '../common/OfficialAdmitCardModal';
import {
  User as UserIcon,
  Mail,
  Phone,
  Hash,
  Calendar,
  MapPin,
  GraduationCap,
  Target,
  ShieldCheck,
  Award,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Save,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  Zap,
  Activity,
  Layers,
  Lock,
  Cpu,
  BookOpen,
  TrendingUp
} from 'lucide-react';

interface StudentProfileViewProps {
  onBackToDashboard?: () => void;
}

export const StudentProfileView: React.FC<StudentProfileViewProps> = ({ onBackToDashboard }) => {
  const { user, updateUserProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedRoll, setCopiedRoll] = useState(false);
  const [showAdmitCard, setShowAdmitCard] = useState(false);

  // Profile Form state - 100% English
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    dob: '',
    gender: 'Male',
    category: 'General',
    guardian_name: '',
    address: '',
    qualification: 'Graduation',
    target_exam: 'SSC CGL & CHSL',
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const [stats, setStats] = useState<StudentProfileStats | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getStudentProfile(user.id);
      const p = res.profile;
      setFormData({
        name: p.name || '',
        email: p.email || '',
        mobile: p.mobile || '',
        dob: p.dob || '',
        gender: p.gender || 'Male',
        category: p.category || 'General',
        guardian_name: p.guardian_name || '',
        address: p.address || '',
        qualification: p.qualification || 'Graduation',
        target_exam: p.target_exam || 'SSC CGL & CHSL',
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setStats(res.stats);
    } catch {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        dob: user.dob || '',
        gender: user.gender || 'Male',
        category: user.category || 'General',
        guardian_name: user.guardian_name || '',
        address: user.address || '',
        qualification: user.qualification || 'Graduation',
        target_exam: user.target_exam || 'SSC CGL & CHSL'
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyRoll = () => {
    if (!user?.roll_number) return;
    navigator.clipboard.writeText(user.roll_number);
    setCopiedRoll(true);
    setTimeout(() => setCopiedRoll(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setError(null);
    setSuccessMsg(null);

    if (!formData.name.trim()) {
      setError('Candidate Full Name is required.');
      return;
    }

    if (formData.new_password) {
      if (formData.new_password.length < 6) {
        setError('New password must be at least 6 characters long.');
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        setError('New password and confirm password do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name.trim(),
        mobile: formData.mobile.trim(),
        dob: formData.dob,
        gender: formData.gender,
        category: formData.category,
        guardian_name: formData.guardian_name.trim(),
        address: formData.address.trim(),
        qualification: formData.qualification,
        target_exam: formData.target_exam
      };

      if (formData.new_password) {
        payload.current_password = formData.current_password;
        payload.new_password = formData.new_password;
      }

      const res = await api.updateStudentProfile(user.id, payload);
      updateUserProfile(res.user);
      setSuccessMsg('Your candidate profile has been updated successfully!');
      setFormData(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: ''
      }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Failed to update candidate profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 text-slate-800">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
        <p className="text-xs font-mono font-bold tracking-wider uppercase text-blue-700">
          Loading Candidate Profile...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans relative overflow-x-hidden animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center justify-center space-x-2 transition shadow-2xs cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:-translate-x-0.5 transition" />
                <span>Return to Exam Dashboard</span>
              </button>
            )}

            <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-mono uppercase tracking-wider">Candidate Terminal: BDC-STUD-{user?.id.slice(-6).toUpperCase()}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setShowAdmitCard(true)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Official E-Admit Card / Gate Pass</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex items-center space-x-3 shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center space-x-3 shadow-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Candidate Identity Hero Banner - Clean White & Blue Theme */}
        <div className="relative rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 text-white shadow-lg border border-blue-600/30 overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-8">
            <GraduationCap className="w-72 h-72 text-white" />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              {/* Avatar */}
              <div className="relative group shrink-0">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/15 border-2 border-white/30 p-1 shadow-lg flex items-center justify-center">
                  <div className="w-full h-full bg-white rounded-xl flex items-center justify-center text-blue-800 font-black text-3xl shadow-sm">
                    {user?.name?.slice(0, 2).toUpperCase() || 'ST'}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-md">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>

              {/* Candidate Info */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-blue-100 text-[10px] font-extrabold uppercase tracking-wider border border-white/25">
                    Candidate Profile
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-200 text-[10px] font-bold border border-emerald-400/30 flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Status: Active & Verified</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-blue-100 text-[10px] font-bold border border-white/25">
                    Begusarai Digital Center
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {user?.name}
                </h1>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  {/* Roll Number with Copy */}
                  <div className="flex items-center space-x-2 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 text-white">
                    <Hash className="w-3.5 h-3.5 text-blue-200" />
                    <span className="font-mono font-bold tracking-wide">{user?.roll_number}</span>
                    <button
                      type="button"
                      onClick={handleCopyRoll}
                      className="ml-1 text-blue-200 hover:text-white transition cursor-pointer p-0.5"
                      title="Copy Roll Number"
                    >
                      {copiedRoll ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 text-blue-100">
                    <Mail className="w-3.5 h-3.5 text-blue-200" />
                    <span>{user?.email}</span>
                  </div>

                  {user?.mobile && (
                    <div className="flex items-center space-x-1.5 bg-white/15 px-3 py-1.5 rounded-xl border border-white/20 text-blue-100">
                      <Phone className="w-3.5 h-3.5 text-blue-200" />
                      <span>{user?.mobile}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metric Cards - Unified Royal Blue Color Theme */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* 1. Total Mock Exams - Royal Blue */}
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 border border-blue-500/30 group">
            <div className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 group-hover:scale-110 transition-transform pointer-events-none">
              <BookOpen className="w-full h-full" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] text-blue-100 uppercase tracking-widest font-extrabold block">
                  Total Mock Exams
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs">
                  <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
                  {stats?.total_tests || 0}
                </div>
                <span className="text-[11px] text-blue-200 font-semibold mt-1 inline-block">
                  Tests Completed
                </span>
              </div>
            </div>
          </div>

          {/* 2. Average Accuracy - Royal Blue */}
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 border border-blue-500/30 group">
            <div className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 group-hover:scale-110 transition-transform pointer-events-none">
              <TrendingUp className="w-full h-full" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] text-blue-100 uppercase tracking-widest font-extrabold block">
                  Average Accuracy
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
                  {stats?.avg_percentage || 0}%
                </div>
                <span className="text-[11px] text-blue-200 font-semibold mt-1 inline-block">
                  Overall Accuracy
                </span>
              </div>
            </div>
          </div>

          {/* 3. Highest Score - Royal Blue */}
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 border border-blue-500/30 group">
            <div className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 group-hover:scale-110 transition-transform pointer-events-none">
              <Award className="w-full h-full" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] text-blue-100 uppercase tracking-widest font-extrabold block">
                  Highest Score
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs">
                  <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="text-2xl sm:text-3xl font-black text-white font-mono leading-none tracking-tight">
                  {stats?.best_percentage || 0}%
                </div>
                <span className="text-[11px] text-blue-200 font-semibold mt-1 inline-block">
                  Top Result
                </span>
              </div>
            </div>
          </div>

          {/* 4. Gate Entry Status - Royal Blue */}
          <div className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white shadow-md hover:shadow-lg transition-all duration-200 border border-blue-500/30 group">
            <div className="absolute -right-3 -bottom-3 w-20 h-20 text-white/10 group-hover:scale-110 transition-transform pointer-events-none">
              <ShieldCheck className="w-full h-full" />
            </div>
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] text-blue-100 uppercase tracking-widest font-extrabold block">
                  Gate Entry Status
                </span>
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/25 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-black bg-white text-blue-900 shadow-sm uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{stats?.verification_status === 'verified' ? 'Gate Verified' : 'Approved Entry'}</span>
                </div>
                <span className="text-[11px] text-blue-200 font-semibold mt-1 block">
                  Exam Hall Access
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Profile Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Candidate Identity & Personal Records */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center">
                <UserIcon className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-wide">
                  Candidate Identity & Personal Records
                </h2>
                <p className="text-xs text-slate-500">
                  Official personal records encoded onto digital exam tickets and admit cards
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="e.g. Aman Kumar"
                />
              </div>

              {/* Roll Number (Read-only official candidate ID) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between uppercase tracking-wide">
                  <span>Official Roll Number</span>
                  <span className="text-[10px] text-blue-600 font-mono font-bold">System Assigned</span>
                </label>
                <input
                  type="text"
                  value={user?.roll_number || ''}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between uppercase tracking-wide">
                  <span>Registered Email</span>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold">Verified</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  disabled
                  className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="e.g. 9876543210"
                />
              </div>

              {/* Father / Guardian Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Father / Guardian Name
                </label>
                <input
                  type="text"
                  value={formData.guardian_name}
                  onChange={e => setFormData({ ...formData, guardian_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={e => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                >
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="EWS">EWS</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </div>

              {/* Address */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Residential Address / District / City
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="e.g. Village/Town, Begusarai, Bihar - 851218"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Examination Target & Academic Credentials */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-wide">
                  Examination Target & Academic Credentials
                </h2>
                <p className="text-xs text-slate-500">
                  Customizes mock test recommendations, subject weightage, and examination pattern
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Target Exam */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Primary Target Examination
                </label>
                <select
                  value={formData.target_exam}
                  onChange={e => setFormData({ ...formData, target_exam: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                >
                  <option value="SSC CGL & CHSL">SSC CGL, CHSL & MTS</option>
                  <option value="Railway RRB NTPC">Railway RRB (NTPC / Group D / ALP)</option>
                  <option value="Bihar Police & BSSC">Bihar Police, Daroga (SI) & BSSC</option>
                  <option value="Banking & Insurance">Banking (IBPS PO, Clerk, SBI)</option>
                  <option value="Defense & CDS">Defense (NDA, CDS, Agniveer)</option>
                  <option value="General Competitive Exams">General CBT Assessment</option>
                </select>
              </div>

              {/* Highest Qualification */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Highest Educational Qualification
                </label>
                <select
                  value={formData.qualification}
                  onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                >
                  <option value="Matriculation (10th)">10th Pass (Matriculation)</option>
                  <option value="Intermediate (12th)">12th Intermediate</option>
                  <option value="Diploma / ITI">Diploma / ITI</option>
                  <option value="Graduation">Graduate (Bachelor Degree)</option>
                  <option value="Post Graduation">Post Graduate (Master Degree)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 3: Terminal Security & Password */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-2xs">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-wide">
                  Terminal Security & Password Management
                </h2>
                <p className="text-xs text-slate-500">
                  Update your candidate login credentials. Leave blank if you wish to retain your existing password
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Current Password
                </label>
                <input
                  type="password"
                  value={formData.current_password}
                  onChange={e => setFormData({ ...formData, current_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="Required if changing"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  New Password
                </label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={e => setFormData({ ...formData, new_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="Min. 6 characters"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={e => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition outline-none"
                  placeholder="Repeat new password"
                />
              </div>
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>All updates are encrypted and synchronized instantly with center examination records.</span>
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
              {onBackToDashboard && (
                <button
                  type="button"
                  onClick={onBackToDashboard}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto px-8 py-2.5 bg-blue-700 hover:bg-blue-800 active:scale-98 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-700/20 transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Official E-Admit Card Modal */}
      {showAdmitCard && user && (
        <OfficialAdmitCardModal
          data={{
            student_name: user.name,
            roll_number: user.roll_number,
            email: user.email,
            mobile: user.mobile,
            exam_name: 'Begusarai Digital Center - CBT Assessment & Mock Examination 2026',
            duration_minutes: 60
          }}
          onClose={() => setShowAdmitCard(false)}
        />
      )}
    </div>
  );
};
