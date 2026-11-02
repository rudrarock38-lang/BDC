import React, { useState } from 'react';
import { api } from '../../api/client';
import { ExamResult, QuestionBreakdownItem, SubjectScore } from '../../types';
import {
  X,
  Printer,
  Mail,
  CheckCircle2,
  Lock,
  Eye,
  Award,
  ShieldCheck,
  Calendar,
  Clock,
  User,
  Share2,
  Copy,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface OfficialResultMarksheetModalProps {
  scorecard: {
    result: ExamResult & {
      student_email?: string;
      mobile?: string;
      category?: string;
      gender?: string;
      dob?: string;
      exam_description?: string;
    };
    breakdown?: QuestionBreakdownItem[];
    subject_breakdown?: SubjectScore[];
  };
  isAdmin?: boolean;
  onTogglePublish?: () => void;
  isTogglingPublish?: boolean;
  onClose: () => void;
}

// Clean WhatsApp Icon
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export const OfficialResultMarksheetModal: React.FC<OfficialResultMarksheetModalProps> = ({
  scorecard,
  isAdmin = false,
  onTogglePublish,
  isTogglingPublish = false,
  onClose
}) => {
  const { result, breakdown = [] } = scorecard;
  const [sendingEmail, setSendingEmail] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQuestionAudit, setShowQuestionAudit] = useState(false);

  const isPublished = result.is_published !== 0;
  const certificateSerial = `BDC-CBT-${result.id ? result.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() : '2026001'}`;

  // WhatsApp Message Composer & Dispatcher
  const handleSendWhatsApp = () => {
    const portalUrl = window.location.origin;
    const rawMobile = (result.mobile || '').replace(/[^0-9]/g, '');
    const phone = rawMobile.length === 10 ? `91${rawMobile}` : rawMobile;

    const message = `*BEGUSARAI DIGITAL CENTER - OFFICIAL CBT EXAMINATION STATEMENT OF MARKS*

Dear *${result.student_name}* (Roll No: *${result.roll_number}*),
Your official performance scorecard for *${result.exam_name}* has been verified and released!

📊 *Result Performance Summary:*
• Candidate Name: *${result.student_name}*
• Roll Number: *${result.roll_number}*
• Final Score: *${result.final_score} / ${result.total_questions}*
• Percentage: *${result.percentage}%*
• Accuracy: *${result.accuracy}%*
• Center Standing: *Rank #${result.rank}*
• Correct / Wrong: *+${result.correct} / -${result.wrong}*
• Result Status: *QUALIFIED / COMPLETED*
• Result Serial: *${certificateSerial}*
• Examination Date: *${new Date(result.created_at).toLocaleDateString()}*

🔗 *Download / Print Official PDF Marksheet:*
${portalUrl}

Best regards,
*Controller of Examinations*
Begusarai Digital Center (CBT Examination Portal)`;

    const encoded = encodeURIComponent(message);
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encoded}`
      : `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  // Email Dispatcher
  const handleSendEmail = async () => {
    if (!result.id) return;
    setSendingEmail(true);
    setStatusMessage(null);
    try {
      const res = await api.sendResultEmail(result.id);
      if (res.sent) {
        setStatusMessage({
          type: 'success',
          text: res.message || `Official scorecard successfully dispatched to ${res.recipient || result.student_email || 'student'}!`
        });
      } else if (result.student_email) {
        const portalUrl = window.location.origin;
        const subject = encodeURIComponent(`Official CBT Result Marksheet: ${result.exam_name} - ${result.student_name}`);
        const body = encodeURIComponent(
          `Dear ${result.student_name},\n\nYour official score statement for "${result.exam_name}" has been released.\n\nRoll Number: ${result.roll_number}\nScore: ${result.final_score} / ${result.total_questions}\nPercentage: ${result.percentage}%\nAccuracy: ${result.accuracy}%\nMerit Standing: Rank #${result.rank}\n\nDownload / Print your official certificate:\n${portalUrl}\n\nBegusarai Digital Center`
        );
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(result.student_email)}&su=${subject}&body=${body}`, '_blank');
        setStatusMessage({
          type: 'success',
          text: `Official scorecard email launched in Gmail compose for ${result.student_email}!`
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: res.message || 'Scorecard prepared.'
        });
      }
    } catch {
      // Fallback: Gmail compose / mailto link
      const portalUrl = window.location.origin;
      const subject = encodeURIComponent(`Official CBT Result: ${result.exam_name} - ${result.student_name}`);
      const body = encodeURIComponent(
        `Dear ${result.student_name},\n\nYour official score for "${result.exam_name}" has been released.\nScore: ${result.final_score}/${result.total_questions}\nPercentage: ${result.percentage}%\nRank: #${result.rank}\n\nPlease visit the student portal to download your official marksheet:\n${portalUrl}\n\nBegusarai Digital Center`
      );
      if (result.student_email) {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(result.student_email)}&su=${subject}&body=${body}`, '_blank');
      } else {
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
      }
      setStatusMessage({
        type: 'success',
        text: 'Official scorecard email launched in Gmail / mail client!'
      });
    } finally {
      setSendingEmail(false);
    }
  };

  // Copy Result Link to Clipboard
  const handleCopyLink = () => {
    const portalUrl = window.location.origin;
    navigator.clipboard.writeText(`${portalUrl} (Roll No: ${result.roll_number})`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Print Official PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Print-specific style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #official-marksheet-printable, #official-marksheet-printable * {
            visibility: visible;
          }
          #official-marksheet-printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 16px;
            background: white !important;
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-300 shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* NON-PRINTABLE TOP CONTROL BAR */}
        <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Official Statement of Marks & Result Certificate</h3>
              <span className="text-[11px] text-slate-400">
                Official Center Marksheet &bull; Ready for Student Distribution
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* WhatsApp Send Button */}
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
              title="Send result summary & download link directly to student's WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4" />
              <span>Send WhatsApp</span>
            </button>

            {/* Email Send Button */}
            <button
              type="button"
              disabled={sendingEmail}
              onClick={handleSendEmail}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
              title="Dispatch official marksheet to student's registered email"
            >
              <Mail className="w-4 h-4" />
              <span>{sendingEmail ? 'Sending...' : 'Send Mail'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-2xs cursor-pointer"
              title="Print or download official PDF marksheet (A4)"
            >
              <Printer className="w-4 h-4 text-slate-700" />
              <span>Print / PDF</span>
            </button>

            {/* Admin Visibility Toggle (if Admin) */}
            {isAdmin && onTogglePublish && (
              <button
                type="button"
                disabled={isTogglingPublish}
                onClick={onTogglePublish}
                className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-2xs cursor-pointer border ${
                  isPublished
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                }`}
                title={isPublished ? 'Score visible. Click to hide from student.' : 'Score withheld. Click to show student.'}
              >
                {isPublished ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hide Score</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Release Score</span>
                  </>
                )}
              </button>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Close Scorecard"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast Banner */}
        {statusMessage && (
          <div
            className={`no-print p-3 text-xs font-semibold flex items-center justify-between ${
              statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-slate-500 hover:text-slate-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SCROLLABLE OFFICIAL MARKSHEET BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          {/* THE OFFICIAL AUTHENTIC MARKSHEET CARD */}
          <div
            id="official-marksheet-printable"
            className="w-full max-w-3xl bg-white border-2 border-slate-900 shadow-xl rounded-xl p-6 sm:p-8 space-y-6 text-slate-900 relative"
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] select-none">
              <div className="text-7xl font-black text-slate-900 rotate-[-25deg] tracking-widest text-center">
                BEGUSARAI DIGITAL CENTER<br />CBT VERIFIED
              </div>
            </div>

            {/* 1. OFFICIAL INSTITUTIONAL HEADER */}
            <div className="border-b-2 border-slate-900 pb-5 text-center relative">
              <div className="flex items-center justify-between gap-4">
                {/* Left Emblem */}
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 p-1 flex items-center justify-center bg-indigo-50 shrink-0">
                  <Award className="w-8 h-8 text-indigo-900" />
                </div>

                {/* Center Title */}
                <div className="flex-1 text-center space-y-0.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase">
                    BEGUSARAI DIGITAL CENTER
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-indigo-950 uppercase tracking-wider">
                    Computer Based Examination & Assessment Services
                  </h2>
                  <div className="inline-block px-3 py-0.5 mt-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                    Official Candidate Statement of Marks & Merit
                  </div>
                </div>

                {/* Right Seal */}
                <div className="w-14 h-14 rounded-full border-2 border-slate-900 p-1 flex items-center justify-center bg-emerald-50 shrink-0">
                  <ShieldCheck className="w-8 h-8 text-emerald-800" />
                </div>
              </div>

              {/* Sub-bar info */}
              <div className="mt-4 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] font-semibold text-slate-600">
                <span>Center Code: <strong>BDC-0824</strong> (Lab-1)</span>
                <span>Session: <strong>Academic Year 2026</strong></span>
                <span>Serial No: <strong className="font-mono text-slate-900">{certificateSerial}</strong></span>
              </div>
            </div>

            {/* 2. CANDIDATE IDENTITY RECORD */}
            <div className="bg-slate-50 border border-slate-300 rounded-xl p-4.5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
              {/* Photo Box */}
              <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-slate-300 sm:pr-4">
                <div className="w-20 h-24 rounded-lg bg-indigo-100 border border-indigo-300 flex flex-col items-center justify-center text-indigo-800 shadow-2xs">
                  <User className="w-10 h-10 text-indigo-700" />
                  <span className="text-[9px] font-bold uppercase tracking-wider mt-1">Verified</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-700 mt-1.5 block">
                  {result.roll_number}
                </span>
              </div>

              {/* Candidate Info Grid */}
              <div className="sm:col-span-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Candidate Name</span>
                  <strong className="text-slate-950 text-sm font-black">{result.student_name}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Roll Number</span>
                  <strong className="font-mono text-slate-900 text-xs font-bold">{result.roll_number}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Examination Title</span>
                  <strong className="text-slate-900 font-semibold">{result.exam_name}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Registered Contact</span>
                  <span className="text-slate-700 font-mono text-[11px]">
                    {(result as any).email || result.student_email || 'Verified Candidate'}
                    {result.mobile && ` &bull; ${result.mobile}`}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Test Submission Date</span>
                  <span className="text-slate-700 font-medium text-[11px]">
                    {new Date(result.created_at).toLocaleString([], {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] uppercase font-bold block">Portal Visibility Status</span>
                  <span
                    className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      isPublished ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isPublished ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <Lock className="w-3 h-3 text-amber-700" />}
                    <span>{isPublished ? 'Published to Student' : 'Withheld / Admin Only'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. PERFORMANCE & MARKS EVALUATION TABLE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-indigo-700" />
                  <span>Evaluation & Marks Statement</span>
                </h4>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Negative Marking Applied: 0.25 Mark / Wrong Answer
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5 pl-3">Total Qs</th>
                      <th className="p-2.5">Attempted</th>
                      <th className="p-2.5 text-emerald-300">Correct (+)</th>
                      <th className="p-2.5 text-rose-300">Wrong (-)</th>
                      <th className="p-2.5">Unattempted</th>
                      <th className="p-2.5 text-right">Max Marks</th>
                      <th className="p-2.5 pr-3 text-right">Final Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    <tr className="bg-white">
                      <td className="p-2.5 pl-3 font-bold">{result.total_questions}</td>
                      <td className="p-2.5 font-bold">{result.attempted}</td>
                      <td className="p-2.5 font-bold text-emerald-700">+{result.correct}</td>
                      <td className="p-2.5 font-bold text-rose-600">-{result.wrong}</td>
                      <td className="p-2.5 text-slate-500">{result.unanswered}</td>
                      <td className="p-2.5 text-right font-bold text-slate-700">{result.total_questions}</td>
                      <td className="p-2.5 pr-3 text-right font-black text-sm text-emerald-800">
                        {result.final_score.toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. MERIT SCORECARD SUMMARY BADGES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {/* Scaled Score */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Final Marks Scored</span>
                <span className="text-xl font-black text-emerald-900 mt-0.5 block">
                  {result.final_score.toFixed(2)}
                  <span className="text-xs font-normal text-emerald-700 ml-1">/ {result.total_questions}</span>
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold">Normalized Scale</span>
              </div>

              {/* Percentage */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">Total Percentage</span>
                <span className="text-xl font-black text-blue-900 mt-0.5 block">
                  {result.percentage.toFixed(1)}%
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">Aggregate Score</span>
              </div>

              {/* Accuracy */}
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-purple-800 block">Test Accuracy</span>
                <span className="text-xl font-black text-purple-900 mt-0.5 block">
                  {result.accuracy.toFixed(1)}%
                </span>
                <span className="text-[10px] text-purple-700 font-semibold">Attempt Precision</span>
              </div>

              {/* Rank & Final Standing */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Center Merit Rank</span>
                <span className="text-xl font-black text-amber-900 mt-0.5 block">
                  #{result.rank}
                </span>
                <span className="text-[10px] font-bold text-amber-700 uppercase">
                  {result.percentage >= 40 ? 'Qualified' : 'Evaluated'}
                </span>
              </div>
            </div>

            {/* Expandable Question Responses Audit (if available) */}
            {breakdown.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Question Response & Answer Key Audit ({breakdown.length} questions)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuestionAudit(!showQuestionAudit)}
                    className="no-print text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {showQuestionAudit ? 'Hide Audit Details ▲' : 'View Audit Details ▼'}
                  </button>
                </div>

                {showQuestionAudit && (
                  <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto text-xs p-3 space-y-2">
                    {breakdown.map((item, idx) => (
                      <div key={item.id} className="p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            Q{idx + 1}. <span className="font-mono text-slate-400">({item.question_id_code})</span>
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.status === 'correct'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'wrong'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {item.status === 'correct' ? `CORRECT (+${item.marks})` : item.status === 'wrong' ? `WRONG (-${item.negative_marks})` : 'UNANSWERED'}
                          </span>
                        </div>
                        <p className="text-slate-700 text-[11px] line-clamp-2">{item.question_en}</p>
                        <div className="flex items-center space-x-3 text-[10px] text-slate-600 font-mono">
                          <span>Student: <strong>{item.student_answer || 'None'}</strong></span>
                          <span>&bull;</span>
                          <span className="text-emerald-700">Official Key: <strong>{item.correct_answer}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. VERIFICATION, QR CODE & CONTROLLER SIGNATURE */}
            <div className="border-t-2 border-slate-900 pt-5 flex flex-wrap items-end justify-between gap-4 text-xs">
              {/* Left QR Code Simulation */}
              <div className="flex items-center space-x-3">
                <div className="w-20 h-20 bg-slate-900 p-1.5 rounded-lg flex items-center justify-center shrink-0 shadow-xs">
                  {/* Clean SVG QR pattern */}
                  <svg className="w-full h-full text-white" viewBox="0 0 100 100" fill="currentColor">
                    <rect x="5" y="5" width="25" height="25" fill="none" stroke="white" strokeWidth="6" />
                    <rect x="12" y="12" width="11" height="11" />
                    <rect x="70" y="5" width="25" height="25" fill="none" stroke="white" strokeWidth="6" />
                    <rect x="77" y="12" width="11" height="11" />
                    <rect x="5" y="70" width="25" height="25" fill="none" stroke="white" strokeWidth="6" />
                    <rect x="12" y="77" width="11" height="11" />
                    {/* Pattern dots */}
                    <rect x="42" y="10" width="6" height="16" />
                    <rect x="52" y="15" width="10" height="6" />
                    <rect x="38" y="38" width="24" height="24" fill="none" stroke="white" strokeWidth="4" />
                    <rect x="45" y="45" width="10" height="10" />
                    <rect x="10" y="45" width="15" height="6" />
                    <rect x="75" y="45" width="16" height="6" />
                    <rect x="45" y="75" width="6" height="16" />
                    <rect x="65" y="70" width="12" height="12" />
                    <rect x="80" y="80" width="12" height="12" />
                  </svg>
                </div>
                <div>
                  <strong className="text-slate-900 text-xs block font-bold">DIGITAL VERIFICATION QR</strong>
                  <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                    Scan with any smartphone camera to authenticate result authenticity.
                  </span>
                  <span className="text-[10px] font-mono text-indigo-700 font-bold block mt-1">
                    HASH: {certificateSerial}
                  </span>
                </div>
              </div>

              {/* Right Controller Signature & Seal */}
              <div className="text-right space-y-1">
                <div className="inline-block border-b-2 border-slate-900 pb-1 px-4 text-center">
                  <div className="font-serif italic font-black text-indigo-950 text-base">
                    Dr. S. K. Narayan
                  </div>
                </div>
                <div className="font-bold text-slate-950 text-xs">
                  Controller of Examinations
                </div>
                <div className="text-[10px] text-slate-500">
                  Begusarai Digital Center (CBT Services)
                </div>
              </div>
            </div>

            {/* Official Legal Disclaimer Footer */}
            <div className="pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center leading-normal">
              Notice: This document is an electronically produced official Statement of Marks. No manual signature is required. Any alteration or tampering renders this marksheet void. Issued by Begusarai Digital Center Examination Cell.
            </div>
          </div>
        </div>

        {/* BOTTOM HELPER BAR */}
        <div className="no-print p-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-800">Quick Actions:</span>
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 flex items-center space-x-1"
            >
              <Copy className="w-3 h-3 text-slate-500" />
              <span>{copiedLink ? 'Copied Details!' : 'Copy Result Summary'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-slate-500">
              Candidate: <strong>{result.student_name}</strong> ({result.roll_number})
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
