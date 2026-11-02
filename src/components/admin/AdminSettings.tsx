import React, { useState, useEffect } from 'react';
import { api } from '../../api/client';
import {
  Settings,
  Save,
  CheckCircle2,
  Database,
  ShieldCheck,
  RotateCcw,
  Sliders
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({
    site_title: 'Begusarai Digital Center CBT Examination Portal',
    default_exam_duration: '60',
    default_marks: '1.0',
    default_negative_marks: '0.25',
    allow_student_registration: 'true',
    show_result_immediately: 'true'
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await api.getSettings();
      setSettings((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await api.updateSettings(settings);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure examination defaults, registration policies, and database parameters.
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center space-x-1.5 border border-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Settings Successfully Saved!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Examination Defaults */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Standard Examination Defaults</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Portal Title / Branding
              </label>
              <input
                type="text"
                value={settings.site_title || ''}
                onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Duration (Minutes)
              </label>
              <input
                type="number"
                value={settings.default_exam_duration || '60'}
                onChange={(e) => setSettings({ ...settings, default_exam_duration: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Correct Mark (+)
              </label>
              <input
                type="number"
                step="0.25"
                value={settings.default_marks || '1.0'}
                onChange={(e) => setSettings({ ...settings, default_marks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Negative Marking Penalty (-)
              </label>
              <input
                type="number"
                step="0.05"
                value={settings.default_negative_marks || '0.25'}
                onChange={(e) => setSettings({ ...settings, default_negative_marks: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Security & Access Policies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Access & Result Publication Policies</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-start space-x-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer bg-slate-50/50">
              <input
                type="checkbox"
                checked={settings.student_reg_otp_enabled !== 'false'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    student_reg_otp_enabled: e.target.checked ? 'true' : 'false'
                  })
                }
                className="rounded text-indigo-600 focus:ring-indigo-500 mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <strong className="text-slate-800 block text-xs">Mandatory Student Registration OTP Verification</strong>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${settings.student_reg_otp_enabled !== 'false' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {settings.student_reg_otp_enabled !== 'false' ? 'OTP Enforced' : 'OTP Disabled (Direct Login)'}
                  </span>
                </div>
                <span className="text-slate-500 text-[11px] block mt-0.5 leading-relaxed">
                  When enabled, candidates must verify a 6-digit OTP code sent to their email before completing registration and logging in. Uncheck to allow instant candidate sign-up without OTP.
                </span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_student_registration === 'true'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    allow_student_registration: e.target.checked ? 'true' : 'false'
                  })
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <strong className="text-slate-800 block">Allow Student Self-Registration</strong>
                <span className="text-slate-500 text-[11px]">
                  Enables candidate sign-up with auto-generated Roll Numbers from the login screen.
                </span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_result_immediately === 'true'}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    show_result_immediately: e.target.checked ? 'true' : 'false'
                  })
                }
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <strong className="text-slate-800 block">Display Results Immediately on Submission</strong>
                <span className="text-slate-500 text-[11px]">
                  If checked, candidates immediately view their score, rank, and solutions after test submission.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* System & Database Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Database className="w-4 h-4 text-blue-600" />
            <span>Database Storage & Reliability</span>
          </h3>
          <p className="text-slate-600 text-xs leading-relaxed">
            All tables (users, subjects, topics, questions, exams, student attempts, real-time answers, and results) are persistently synced and committed to the disk file <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-800">data/cbt.sqlite</code> on every write transaction.
          </p>
          <div className="flex items-center space-x-2 text-[11px] text-emerald-700 font-bold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Database Status: Active & Synced</span>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
