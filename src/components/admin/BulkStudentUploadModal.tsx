import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Exam } from '../../types';
import * as XLSX from 'xlsx';
import { OfficialAdmitCardModal, AdmitCardData } from '../common/OfficialAdmitCardModal';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  RotateCcw,
  Printer,
  Eye,
  Check,
  X,
  UserCheck,
  Search,
  Sparkles,
  Clipboard,
  HelpCircle,
  QrCode,
  Users
} from 'lucide-react';

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkStudentUploadModal: React.FC<BulkStudentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [pasteData, setPasteData] = useState<string>('');
  const [mode, setMode] = useState<'excel' | 'paste'>('excel');
  const [loading, setLoading] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admit Card preview state
  const [previewAdmitCard, setPreviewAdmitCard] = useState<AdmitCardData | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadExams();
      setParsedRows([]);
      setImportResults(null);
      setErrorMessage(null);
      setPasteData('');
    }
  }, [isOpen]);

  const loadExams = async () => {
    try {
      const examList = await api.getExams();
      setExams(examList);
      if (examList.length > 0 && !selectedExamId) {
        const liveOrScheduled = examList.find(e => e.status === 'live' || e.status === 'scheduled') || examList[0];
        setSelectedExamId(liveOrScheduled.id);
      }
    } catch (err) {
      console.warn('Failed to fetch exams:', err);
    }
  };

  // Sample CSV / Excel Download
  const handleDownloadSample = () => {
    const sampleData = [
      {
        'Candidate Name': 'Aman Kumar',
        'Roll Number': 'BDC-1001',
        'Email': 'aman.kumar@example.com',
        'Mobile': '9876543210',
        'Father Name': 'Shri Rajesh Kumar',
        'Category': 'OBC',
        'Gender': 'Male',
        'Date of Birth': '2004-05-15',
        'Password': 'password123'
      },
      {
        'Candidate Name': 'Priya Kumari',
        'Roll Number': 'BDC-1002',
        'Email': 'priya.kumari@example.com',
        'Mobile': '9876543211',
        'Father Name': 'Shri Manoj Sharma',
        'Category': 'General',
        'Gender': 'Female',
        'Date of Birth': '2005-08-20',
        'Password': 'password123'
      },
      {
        'Candidate Name': 'Rahul Singh',
        'Roll Number': '', // Auto-generates if empty
        'Email': '', // Auto-generates if empty
        'Mobile': '9876543212',
        'Father Name': 'Shri Suresh Singh',
        'Category': 'EWS',
        'Gender': 'Male',
        'Date of Birth': '2003-11-10',
        'Password': 'password123'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Candidates_Template');
    XLSX.writeFile(workbook, 'BDC_CBT_Students_AdmitCard_Template.xlsx');
  };

  // Parse Excel / CSV File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (!json || json.length === 0) {
          setErrorMessage('The uploaded file is empty. Please ensure it has student records.');
          return;
        }

        const normalized = json.map((row: any) => ({
          name: row['Candidate Name'] || row['candidate_name'] || row['Name'] || row['name'] || row['Student Name'] || '',
          roll_number: row['Roll Number'] || row['roll_number'] || row['Roll'] || row['Roll No'] || '',
          email: row['Email'] || row['email'] || '',
          mobile: row['Mobile'] || row['mobile'] || row['Phone'] || '',
          guardian_name: row['Father Name'] || row['Father'] || row['guardian_name'] || row['Guardian'] || '',
          category: row['Category'] || row['category'] || 'General',
          gender: row['Gender'] || row['gender'] || 'Male',
          dob: row['Date of Birth'] || row['DOB'] || row['dob'] || '',
          password: row['Password'] || row['password'] || '123456'
        })).filter(r => r.name.trim().length > 0);

        if (normalized.length === 0) {
          setErrorMessage('Could not find any student rows with valid candidate names.');
          return;
        }

        setParsedRows(normalized);
      } catch (err: any) {
        setErrorMessage(err.message || 'Error parsing Excel file. Please use XLSX or CSV format.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Parse Pasted Text (Tab / Comma separated)
  const handleParsePaste = () => {
    if (!pasteData.trim()) return;
    setErrorMessage(null);

    const lines = pasteData.trim().split('\n');
    const parsed: any[] = [];

    lines.forEach((line) => {
      // Split by tab, comma, or pipe
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length >= 1 && parts[0].trim().toLowerCase() !== 'name') {
        const name = parts[0]?.trim();
        const roll = parts[1]?.trim() || '';
        const email = parts[2]?.trim() || '';
        const mobile = parts[3]?.trim() || '';
        const guardian = parts[4]?.trim() || '';
        const category = parts[5]?.trim() || 'General';

        if (name && name.length > 1) {
          parsed.push({
            name,
            roll_number: roll,
            email,
            mobile,
            guardian_name: guardian,
            category,
            password: '123456'
          });
        }
      }
    });

    if (parsed.length === 0) {
      setErrorMessage('No valid rows could be extracted from pasted text. Format: Name, Roll, Email, Mobile');
      return;
    }

    setParsedRows(parsed);
  };

  // Submit Bulk Import to Server
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.bulkImportStudents({
        students: parsedRows,
        exam_id: selectedExamId || undefined
      });

      setImportResults(res);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import student data.');
    } finally {
      setLoading(false);
    }
  };

  // Show Admit Card preview for an imported candidate
  const handlePreviewCandidateAdmitCard = (student: any) => {
    const curExam = exams.find(e => e.id === selectedExamId);
    setPreviewAdmitCard({
      student_name: student.name,
      roll_number: student.roll_number,
      email: student.email,
      mobile: student.mobile,
      guardian_name: student.guardian_name,
      category: student.category,
      exam_name: curExam?.name || student.target_exam || 'All-India CBT Assessment 2026',
      exam_id: curExam?.id || student.exam_id,
      duration_minutes: curExam?.duration_minutes || 60,
      start_datetime: curExam?.start_datetime,
      seat_number: 'Hall A / Lab Assigned Desk',
      entry_token: student.entry_token || `GATE-${student.roll_number.replace(/[^0-9]/g, '').slice(-6)}`,
      verification_status: 'pending'
    });
  };

  if (!isOpen) return null;

  const currentExamObj = exams.find(e => e.id === selectedExamId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-white backdrop-blur-xs border border-white/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Bulk Student Import & Instant Admit Card Generator
              </h2>
              <p className="text-[11px] text-blue-200">
                Excel/CSV se ek sath sabhi students ka data upload karein, admit cards generate karein aur gate verification ke liye tayar karein
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Exam Selection Bar */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-bold text-blue-950 block text-xs sm:text-sm">
                1. Select Target Exam for Admit Card & Gate Verification:
              </span>
              <p className="text-[11px] text-blue-800 mt-0.5">
                Imported students will be automatically enrolled in this exam and their QR code will verify this specific test.
              </p>
            </div>

            <div className="sm:w-72 shrink-0">
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs text-xs"
              >
                <option value="">-- No Exam (Save as Students only) --</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Switch Tabs & Template Download */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setMode('excel')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                  mode === 'excel'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Upload Excel / CSV File</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('paste')}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                  mode === 'paste'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Clipboard className="w-4 h-4" />
                <span>Copy & Paste Text</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownloadSample}
              className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample Excel Template</span>
            </button>
          </div>

          {/* Excel Upload Area */}
          {mode === 'excel' && (
            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 transition">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 mx-auto flex items-center justify-center mb-2">
                <Upload className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">
                Choose Excel or CSV Student Sheet
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Columns supported: Candidate Name, Roll Number, Email, Mobile, Father Name, Category, Gender.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Browse Computer Files
                </button>
              </div>
            </div>
          )}

          {/* Paste Text Area */}
          {mode === 'paste' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Paste student records below (comma-separated or tab-separated):
              </label>
              <textarea
                value={pasteData}
                onChange={(e) => setPasteData(e.target.value)}
                rows={5}
                placeholder={`Candidate Name, Roll Number, Email, Mobile, Father Name\nAman Kumar, BDC-1001, aman@gmail.com, 9876543210, Shri Rajesh Kumar\nPriya Kumari, BDC-1002, priya@gmail.com, 9876543211, Shri Manoj Sharma`}
                className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden bg-slate-50"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                disabled={!pasteData.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                Parse & Preview Rows
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Rows Preview Table */}
          {parsedRows.length > 0 && !importResults && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center space-x-2">
                  <span>Ready to Import ({parsedRows.length} Students):</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
                    Valid Data
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setParsedRows([])}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  Clear Selection
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 text-[11px] uppercase">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Candidate Name</th>
                      <th className="py-2 px-3">Roll Number</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Mobile</th>
                      <th className="py-2 px-3">Father / Guardian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{row.name}</td>
                        <td className="py-2 px-3 font-mono text-blue-700">
                          {row.roll_number || <span className="text-slate-400 italic">Auto-generated</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600 truncate max-w-[150px]">
                          {row.email || <span className="text-slate-400 italic">Auto-generated</span>}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-mono">{row.mobile || '-'}</td>
                        <td className="py-2 px-3 text-slate-600">{row.guardian_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    {loading ? 'Importing...' : `Confirm & Import ${parsedRows.length} Students Now`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Import Success & Admit Card Generator View */}
          {importResults && (
            <div className="space-y-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl p-5 text-emerald-950">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-emerald-900">
                      {importResults.message}
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Sabhi students ka registration successfully complete ho gaya hai aur QR code admit card ready hain!
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-200/80 text-emerald-950 px-3 py-1 rounded-xl text-xs font-mono font-bold">
                    {importResults.imported_count} Added
                  </span>
                </div>
              </div>

              {/* Imported Students Table with Instant Admit Card Print & QR buttons */}
              <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-emerald-100/60 border-b border-emerald-200 flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-900 flex items-center space-x-1.5">
                    <QrCode className="w-4 h-4 text-emerald-700" />
                    <span>Generated Admit Cards & QR Verification Data:</span>
                  </span>
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Exam: {importResults.exam?.name || currentExamObj?.name || 'General CBT Assessment'}
                  </span>
                </div>

                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] border-b border-slate-200 uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Roll Number</th>
                        <th className="py-2.5 px-3">Candidate Name</th>
                        <th className="py-2.5 px-3">Email & Contact</th>
                        <th className="py-2.5 px-3">Target Exam</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {importResults.imported_students.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-800">
                            {st.roll_number}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {st.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            <div>{st.email}</div>
                            {st.mobile && <div className="text-[11px] text-slate-400">{st.mobile}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold text-[11px] border border-blue-200">
                              {st.target_exam}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handlePreviewCandidateAdmitCard(st)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ml-auto cursor-pointer shadow-2xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>View / Print Admit Card</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            CBT Gate Verification System • Begusarai Digital Center
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Official Admit Card Modal View */}
      {previewAdmitCard && (
        <OfficialAdmitCardModal
          data={previewAdmitCard}
          onClose={() => setPreviewAdmitCard(null)}
        />
      )}
    </div>
  );
};
