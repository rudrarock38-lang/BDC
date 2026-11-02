import React, { useState } from 'react';
import { Exam } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Clock, HelpCircle, Award, AlertTriangle, ArrowLeft, Play, ShieldAlert, CheckSquare, Square } from 'lucide-react';

interface ExamInstructionsProps {
  exam: Exam;
  onBack: () => void;
  onProceed: () => void;
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({ exam, onBack, onProceed }) => {
  const { user } = useAuth();
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Top Navigation */}
      <button
        onClick={onBack}
        className="mb-4 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Dashboard</span>
      </button>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 border-b border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[11px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded bg-blue-600 text-white">
                Official Instructions
              </span>
              <h1 className="text-2xl font-black mt-2 tracking-tight">{exam.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">{exam.description}</p>
            </div>
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 text-right">
              <span className="text-[11px] text-slate-400 block font-medium">Candidate Details</span>
              <span className="text-sm font-bold text-white block">{user?.name}</span>
              <span className="text-xs font-mono text-blue-400">Roll: {user?.roll_number}</span>
            </div>
          </div>

          {/* Key Parameters Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold">
                <Clock className="w-4 h-4" />
                <span>Duration</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{exam.duration_minutes} Minutes</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60">
              <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold">
                <HelpCircle className="w-4 h-4" />
                <span>Questions</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{exam.total_questions} MCQs</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold">
                <Award className="w-4 h-4" />
                <span>Total Marks</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">{exam.total_marks} Marks</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/60">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Negative Marks</span>
              </div>
              <div className="text-lg font-bold text-white mt-1">-{exam.negative_marks} per wrong</div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-700 text-sm leading-relaxed max-h-[550px] overflow-y-auto">
          {/* Section 1: General Instructions */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">1</span>
              <span>General Examination Rules</span>
            </h3>
            <ul className="list-disc pl-6 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>The clock will be set at the server. The countdown timer at the top right corner of the screen will display the remaining time available for you to complete the examination.</li>
              <li>When the timer reaches zero, the examination will end automatically. You do not need to manually end or submit your examination when time expires.</li>
              <li>Each question carries <strong>+{exam.total_marks / exam.total_questions || 1} mark</strong> for correct response and penalty of <strong>-{exam.negative_marks} marks</strong> for incorrect response. Unanswered questions attract 0 marks.</li>
              <li>Questions can be viewed in either <strong>English or Hindi</strong> using the language toggle located on the top navigation bar during the exam. Answers will remain saved when switching language.</li>
            </ul>
          </div>

          {/* Section 2: Question Palette & Color Scheme */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">2</span>
              <span>Question Palette Symbols & Status</span>
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              The Question Palette displayed on the right side of the screen will show the status of each question using one of the following symbols:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center space-x-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                <span className="w-8 h-8 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                  01
                </span>
                <div>
                  <strong className="text-slate-800 block">Not Visited (Grey)</strong>
                  <span className="text-slate-500">You have not visited the question yet.</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-lg border border-rose-200 bg-rose-50">
                <span className="w-8 h-8 rounded-md bg-rose-600 text-white font-bold flex items-center justify-center shrink-0">
                  02
                </span>
                <div>
                  <strong className="text-rose-900 block">Not Answered (Red)</strong>
                  <span className="text-rose-700">You have visited the question but not answered it.</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50">
                <span className="w-8 h-8 rounded-md bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0">
                  03
                </span>
                <div>
                  <strong className="text-emerald-900 block">Answered (Green)</strong>
                  <span className="text-emerald-700">You have answered the question.</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-2.5 rounded-lg border border-purple-200 bg-purple-50">
                <span className="w-8 h-8 rounded-md bg-purple-600 text-white font-bold flex items-center justify-center shrink-0">
                  04
                </span>
                <div>
                  <strong className="text-purple-900 block">Marked for Review (Purple)</strong>
                  <span className="text-purple-700">You have flagged this question to review later.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Navigation & Security */}
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2 mb-3">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 text-xs font-bold flex items-center justify-center">3</span>
              <span>Test Integrity & Security Guidelines</span>
            </h3>
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center space-x-2 font-bold text-amber-800">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>CBT Anti-Cheating & System Monitoring:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-amber-800">
                <li>Do not navigate away or switch browser tabs. Tab switches are continuously recorded on the server.</li>
                <li>Right click, text selection, and copy-paste are disabled inside the examination environment.</li>
                <li>Do not close or reload the browser window. In case of accidental closure, you can resume the active attempt as long as server time remains.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Declaration & Start Button */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200">
          <label className="flex items-start space-x-3 cursor-pointer select-none p-2 rounded-xl hover:bg-slate-100/70 active:bg-slate-100 transition min-h-[44px]">
            <button
              type="button"
              onClick={() => setAgreed(!agreed)}
              className="mt-0.5 text-blue-600 focus:outline-hidden shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center cursor-pointer"
            >
              {agreed ? (
                <CheckSquare className="w-5 h-5 text-blue-600 fill-blue-50" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <span className="text-xs text-slate-700 leading-relaxed">
              I have read and understood all instructions outlined above. I declare that I am using a proper working device/computer under fair examination conditions. I agree that any attempt to violate examination rules or switch browser tabs will be reported to the Administrator.
            </span>
          </label>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 active:bg-slate-200 transition text-center cursor-pointer order-2 sm:order-1"
            >
              Cancel / Back
            </button>

            <button
              type="button"
              disabled={!agreed}
              onClick={onProceed}
              className="w-full sm:w-auto min-h-[48px] px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs sm:text-sm font-black shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-all order-1 sm:order-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>I AM READY TO BEGIN (START EXAM)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
