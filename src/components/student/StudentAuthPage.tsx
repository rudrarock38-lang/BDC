import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { getGoogleAccessToken } from '../../lib/googleAuth';
import { OfficialAdmitCardModal, AdmitCardData } from '../common/OfficialAdmitCardModal';
import {
  GraduationCap,
  Lock,
  Mail,
  User as UserIcon,
  Phone,
  Hash,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
  Send,
  Zap,
  RefreshCw,
  Clock
} from 'lucide-react';
import { sendFirebasePasswordReset, formatFirebaseError } from '../../lib/firebase';

interface StudentAuthPageProps {
  onSuccess?: () => void;
}

export const StudentAuthPage: React.FC<StudentAuthPageProps> = ({ onSuccess }) => {
  const { login, register, loginWithGoogle, resendVerificationEmail, checkEmailVerified } = useAuth();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMobile, setRegMobile] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Registration Email Verification flow state
  const [regStep, setRegStep] = useState<'form' | 'verify_email'>('form');
  const [regVerificationEmail, setRegVerificationEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Forgot Password state
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMaskedEmail, setForgotMaskedEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [registeredAdmitCard, setRegisteredAdmitCard] = useState<AdmitCardData | null>(null);

  // Countdown timer for email resend cooldown
  useEffect(() => {
    let interval: any;
    if (regStep === 'verify_email' && resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [regStep, resendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('Please enter your Roll Number / Email and Password');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(loginIdentifier.trim(), loginPassword, 'student');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your Roll Number/Email and Password.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      await loginWithGoogle('student');
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed. Please try again or use Roll Number & Password.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setError('Full Name, Email, and Password are required');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await register({
        name: regName.trim(),
        email: regEmail.trim(),
        mobile: regMobile.trim() || undefined,
        password: regPassword
      });

      // Show native Firebase Email verification step
      setRegVerificationEmail(res.email || regEmail.trim());
      setResendCooldown(60);
      setRegStep('verify_email');
      setSuccessMsg('Verification email sent. Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(err.message || 'Registration failed. This email might already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsCheckingStatus(true);
    try {
      const res = await checkEmailVerified();
      if (res.verified) {
        setSuccessMsg('Email verified successfully! Your candidate account is now active.');
        const finalRoll = res.user?.roll_number || 'ASSIGNED';

        // Show official Begusarai Digital Center E-Admit Card with generated Roll Number
        setRegisteredAdmitCard({
          student_name: res.user?.name || regName,
          roll_number: finalRoll,
          email: res.user?.email || regEmail,
          mobile: res.user?.mobile || regMobile || undefined,
          exam_name: 'Begusarai Digital Center - Candidate Admission & CBT Test 2026',
          seat_number: 'Center Assigned / Desk 01'
        });
      } else {
        setError('Your email is not verified yet. Please check your inbox (including Spam folder) and click the verification link.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check verification status. Please try again.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0 || isResendingEmail) return;
    setError(null);
    setIsResendingEmail(true);
    try {
      await resendVerificationEmail();
      setResendCooldown(60);
      setSuccessMsg('Verification email sent. Please check your inbox and spam folder.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setError('Please enter your registered Gmail/Email or Roll Number');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const token = await getGoogleAccessToken();
      const res = await api.sendStudentForgotPasswordOtp(forgotIdentifier.trim(), token || undefined);
      setForgotEmail(res.email);
      setForgotMaskedEmail(res.masked_email);
      setForgotStep('verify');
      setSuccessMsg(res.message);

      // If client has genuine Google token, ensure direct client-side delivery if needed
      if (token && token.startsWith('ya29.')) {
        console.log('[CLIENT GMAIL] Active Google token present for reset notification');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please check your email or roll number.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit verification OTP sent to your Gmail');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      const res = await api.verifyStudentResetPassword({
        email: forgotEmail,
        otp: otpCode.trim(),
        new_password: newPassword
      });

      setLoginIdentifier(forgotEmail);
      setLoginPassword('');
      setTab('login');
      setForgotStep('request');
      setForgotIdentifier('');
      setOtpCode('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg(res.message || 'Password updated successfully! Please log in with your new password.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please check your verification code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden">
      {/* Background Image: High-Tech CBT Digital Examination Center */}
      <img
        src="/src/assets/images/cbt_exam_center_1791210963086.jpg"
        alt="Begusarai Digital Center Examination Hall"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-center scale-105 pointer-events-none"
      />

      {/* Professional Gradient & Frosted Overlay to preserve legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/85 to-blue-950/75 backdrop-blur-[2px] pointer-events-none" />

      {/* Center Branding Badge */}
      <div className="relative z-10 text-center mb-5 max-w-md animate-in fade-in duration-500">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-200 text-[11px] font-bold uppercase tracking-wider backdrop-blur-md shadow-md mb-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Official CBT Examination Terminal</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
          BEGUSARAI <span className="text-blue-400">DIGITAL CENTER</span>
        </h2>
        <p className="text-xs text-slate-300 mt-0.5">
          Computer Based Test (CBT) Assessment & Verification Portal
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl border border-white/40 shadow-2xl overflow-hidden transition-all">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 text-center">
          <div className="w-11 h-11 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center mx-auto mb-2">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight">Candidate Login & Registration</h1>
          <p className="text-xs text-slate-400 mt-0.5">Enter your credentials to access live examinations</p>
        </div>

        {/* Tab Switcher: Login / Register (Only visible when not in forgot password mode) */}
        {tab !== 'forgot' ? (
          <div className="flex border-b border-slate-200 bg-slate-50 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`min-h-[44px] flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.98] ${
                tab === 'login'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`min-h-[44px] flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition cursor-pointer active:scale-[0.98] ${
                tab === 'register'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 active:bg-slate-100'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Register</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between min-h-[44px]">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setForgotStep('request');
                setError(null);
                setSuccessMsg(null);
              }}
              className="min-h-[40px] text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Candidate Login</span>
            </button>
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              Student Recovery
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-6">
          {/* Success Message Banner */}
          {successMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="font-semibold leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* Error Message Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* TAB 1: STUDENT LOGIN */}
          {tab === 'login' && (
            <div className="space-y-4">
              {/* Google Sign-In for Student */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full min-h-[44px] py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>{googleLoading ? 'Signing in with Google...' : 'Sign In with Google'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[11px] text-slate-400 font-semibold uppercase">Or Roll / Email</span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Roll Number or Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="e.g. ROLL-2026-001 or student@cbt.com"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setTab('forgot');
                        setForgotStep('request');
                        setForgotIdentifier(loginIdentifier);
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 p-1 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full min-h-[46px] py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating...' : 'Sign In to Student Portal'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: STUDENT REGISTRATION */}
          {tab === 'register' && (
            <div>
              {regStep === 'form' ? (
                /* Sub-step 1: Candidate Registration Details Form */
                <form onSubmit={handleRegister} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="Enter Candidate Full Name"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Gmail / Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="e.g. candidate@gmail.com"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Mobile Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Phone className="w-3.5 h-3.5" />
                      </div>
                      <input
                        type="tel"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value)}
                        placeholder="Enter 10-digit mobile number"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Create a strong password (min 6 chars)"
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{loading ? 'Processing Registration...' : 'Complete Candidate Registration'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              ) : (
                /* Sub-step 2: Candidate Native Firebase Email Verification */
                <div className="space-y-4 text-xs animate-in fade-in duration-300">
                  <button
                    type="button"
                    onClick={() => {
                      setRegStep('form');
                      setError(null);
                    }}
                    className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1 cursor-pointer transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Registration Details</span>
                  </button>

                  <div className="p-4 rounded-2xl bg-blue-50/90 border border-blue-200 text-slate-800 space-y-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-black text-xs text-blue-950 block">Verification email sent</span>
                        <span className="text-[10px] text-blue-700 font-semibold">Please check your inbox and spam folder.</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                      An official verification link has been sent to your email address:
                    </p>
                    <div className="font-mono font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-blue-300 text-center text-xs shadow-2xs">
                      {regVerificationEmail}
                    </div>
                    <div className="text-[10px] text-slate-600 bg-white/80 rounded-lg p-2.5 border border-blue-100 space-y-1">
                      <div className="flex items-center space-x-1 text-blue-800 font-bold">
                        <span>Instructions:</span>
                      </div>
                      <ol className="list-decimal pl-3.5 space-y-0.5 text-slate-500">
                        <li>Open the email sent from Begusarai Digital Center / Firebase Auth.</li>
                        <li>Click the verification link in the email to confirm your address.</li>
                        <li>Return to this page and click <strong>"Check Verification Status"</strong> below.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Verification Status Action Buttons */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={isCheckingStatus}
                      onClick={handleCheckVerificationStatus}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />
                      <span>{isCheckingStatus ? 'Checking Verification Status...' : 'Check Verification Status'}</span>
                    </button>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-slate-500">Didn't receive the email?</span>
                      <button
                        type="button"
                        onClick={handleResendVerificationEmail}
                        disabled={resendCooldown > 0 || isResendingEmail}
                        className="font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 cursor-pointer disabled:cursor-not-allowed transition flex items-center space-x-1"
                      >
                        {isResendingEmail ? (
                          <span>Sending...</span>
                        ) : resendCooldown > 0 ? (
                          <span>Resend in {resendCooldown}s</span>
                        ) : (
                          <span>Resend Verification Email</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STUDENT FORGOT PASSWORD */}
          {tab === 'forgot' && (
            <div>
              {forgotStep === 'request' ? (
                /* Step 1: Request OTP */
                <form onSubmit={handleSendOtp} className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Gmail Verification OTP</span>
                    </div>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Enter your registered Gmail address or Roll Number. A secure 6-digit verification code will be dispatched to your Gmail inbox.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Registered Gmail or Roll Number *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. student@cbt.com or ROLL-2026-001"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Dispatching Verification OTP...' : 'Send OTP to Gmail'}</span>
                  </button>
                </form>
              ) : (
                /* Step 2: Verify OTP & Reset Password */
                <form onSubmit={handleVerifyAndResetPassword} className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold flex items-center space-x-1.5">
                        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>OTP Dispatched</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                      >
                        Resend Code
                      </button>
                    </div>
                    <p className="text-[11px] text-blue-800">
                      Gmail Address: <strong className="font-mono">{forgotMaskedEmail || forgotEmail}</strong>
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      6-Digit Verification OTP *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Hash className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit OTP code"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-mono font-bold text-center tracking-widest text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      New Password (Minimum 6 characters) *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'Verifying OTP & Updating...' : 'Verify OTP & Reset Password'}</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trust & Center Indicators */}
      <div className="relative z-10 mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 text-[11px] text-slate-300 select-none animate-in fade-in duration-700">
        <div className="flex items-center space-x-1.5 bg-slate-900/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-xs">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live QR & Hall Ticket Verification</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-xs">
          <Lock className="w-3.5 h-3.5 text-blue-400" />
          <span>Anti-Tamper CBT Network</span>
        </div>
        <div className="flex items-center space-x-1.5 bg-slate-900/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Instant Result & Scorecard</span>
        </div>
      </div>

      {/* Official Begusarai Digital Center E-Admit Card on Successful Registration */}
      {registeredAdmitCard && (
        <OfficialAdmitCardModal
          data={registeredAdmitCard}
          onClose={() => {
            setRegisteredAdmitCard(null);
            onSuccess?.();
          }}
        />
      )}
    </div>
  );
};
