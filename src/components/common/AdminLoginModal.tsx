import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { sendFirebasePasswordReset, formatFirebaseError } from '../../lib/firebase';
import {
  X,
  Mail,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  Send,
  RotateCcw,
  Clock,
  Lock,
  ShieldCheck
} from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login, loginWithGoogle } = useAuth();
  const [view, setView] = useState<'login' | 'forgot_password'>('login');

  // Login states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password states
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 60-second cooldown timer for resending password reset email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      setError('Please provide your Administrator Email and Password');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);
    try {
      await login(identifier.trim(), password, 'admin');
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      const user = await loginWithGoogle('admin');
      if (user.role !== 'admin') {
        setError('This Google account does not have administrator privileges. Please sign in with an administrator email.');
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google administrator sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendAdminResetEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanEmail = forgotIdentifier.trim();
    if (!cleanEmail) {
      setError('Please enter your Administrator Email address');
      return;
    }

    if (!cleanEmail.includes('@')) {
      setError('Please enter a valid email address (e.g. rudrarock38@gmail.com)');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      // Calls Firebase Auth's native sendPasswordResetEmail()
      // Safe diagnostic logging is performed internally without leaking sensitive details
      await sendFirebasePasswordReset(cleanEmail, window.location.origin);
      setForgotEmailSent(true);
      setResendCooldown(60);
      setSuccessMsg(
        'Password reset email sent! Please check your inbox and spam folder for the link to choose your new password.'
      );
    } catch (err: any) {
      // Format safe error message for the administrator
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header - Staff / Admin Console Branding */}
        <div className="bg-slate-900 text-white p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-400/40 flex items-center justify-center text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Examiner & Admin Portal</h3>
              <p className="text-xs text-purple-300 font-medium">Restricted Controller Console</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mt-3 border-t border-slate-800 pt-2.5">
            Authorized examination invigilators, question authors, and system administrators only.
          </p>
        </div>

        {/* Back navigation button if in forgot password mode */}
        {view !== 'login' && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setView('login');
                if (forgotIdentifier.trim()) {
                  setIdentifier(forgotIdentifier.trim());
                }
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-xs font-bold text-slate-600 hover:text-purple-700 flex items-center space-x-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin Login</span>
            </button>
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
              Firebase Password Recovery
            </span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
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

          {/* VIEW 1: ADMIN LOGIN */}
          {view === 'login' && (
            <div className="space-y-4">
              {/* Official Google Sign-In for Admin */}
              <button
                type="button"
                onClick={handleGoogleAdminLogin}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-bold text-xs text-slate-700 shadow-2xs transition flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{googleLoading ? 'Verifying Admin Google Account...' : 'Sign In with Authorized Google Account'}</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-slate-200"></div>
                <span className="shrink mx-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Or Staff Email & Password
                </span>
                <div className="grow border-t border-slate-200"></div>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Administrator Email Address *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. rudrarock38@gmail.com or admin@cbt.com"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setView('forgot_password');
                        setForgotIdentifier(identifier || 'rudrarock38@gmail.com');
                        setError(null);
                        setSuccessMsg(null);
                      }}
                      className="text-[11px] font-semibold text-purple-600 hover:text-purple-800 cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter administrator password"
                      className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Authenticating Administrator...' : 'Sign In to Admin Console'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* VIEW 2: ADMIN FORGOT PASSWORD VIA FIREBASE AUTH */}
          {view === 'forgot_password' && (
            <div className="space-y-4 text-xs">
              {!forgotEmailSent ? (
                <form onSubmit={handleSendAdminResetEmail} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 space-y-1">
                    <div className="font-bold flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Firebase Authentication Password Reset</span>
                    </div>
                    <p className="text-[11px] text-purple-700 leading-relaxed">
                      Enter your Administrator email address. Firebase Authentication will dispatch the configured password reset link directly to your inbox.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Administrator Email Address *
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotIdentifier}
                        onChange={(e) => setForgotIdentifier(e.target.value)}
                        placeholder="e.g. rudrarock38@gmail.com"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Dispatching Reset Link via Firebase...' : 'Send Password Reset Email'}</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 space-y-2.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-purple-950">Password Reset Email Dispatched</h4>
                        <p className="text-[11px] text-purple-700">Sent via official Firebase Auth template</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-purple-800 leading-relaxed">
                      A password reset link was dispatched by Firebase Authentication to:
                    </p>
                    <div className="p-2 bg-white rounded-lg border border-purple-200 text-center font-mono font-bold text-purple-950 text-xs">
                      {forgotIdentifier}
                    </div>

                    <div className="bg-white/70 p-3 rounded-lg border border-purple-100 text-[11px] text-purple-900 space-y-1.5">
                      <div className="font-bold">Next steps:</div>
                      <ol className="list-decimal pl-4 space-y-1 text-slate-700">
                        <li>Check your inbox and spam folder.</li>
                        <li>Click the secure link in the email to set your new password.</li>
                        <li>Return to this window and sign in with your new credentials.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => handleSendAdminResetEmail()}
                      disabled={loading || resendCooldown > 0}
                      className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resendCooldown > 0 ? (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-500 animate-spin" />
                          <span>Resend Email in {resendCooldown}s</span>
                        </>
                      ) : (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 text-purple-700" />
                          <span>{loading ? 'Resending...' : 'Resend Password Reset Email'}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier(forgotIdentifier.trim());
                        setView('login');
                        setError(null);
                        setSuccessMsg('Enter your newly reset password to log in.');
                      }}
                      className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>Proceed to Admin Sign In</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
