import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../api/client';
import { Exam, Subject, Question } from '../../types';
import {
  Sparkles,
  FileText,
  Upload,
  BookOpen,
  Calendar,
  Globe,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Search,
  Filter,
  ArrowRight,
  RotateCcw,
  Trash2,
  Edit3,
  Plus,
  Play,
  Check,
  Zap,
  HelpCircle,
  Eye,
  FileSpreadsheet,
  Hash,
  ChevronDown,
  X,
  HardDrive,
  ExternalLink,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { uploadFileToDrive, fileToBase64 } from '../../lib/googleDrive';

interface AIPYQManagerProps {
  onExamCreated?: (exam: Exam) => void;
  onNavigateToExam?: (examId: string) => void;
}

export const AIPYQManager: React.FC<AIPYQManagerProps> = ({ onExamCreated, onNavigateToExam }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'generate' | 'repository'>('upload');

  // Stats and Filters State
  const [pyqStats, setPyqStats] = useState<{
    total_pyq_questions: number;
    total_questions: number;
    available_exams: string[];
    available_years: number[];
    subject_breakdown: { name: string; question_count: number }[];
  } | null>(null);

  // TAB 1: PDF / Images / Text Upload State
  const [uploadMode, setUploadMode] = useState<'pdf' | 'images' | 'text'>('pdf');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string>('');
  const [scannedImages, setScannedImages] = useState<Array<{ file: File; base64: string; preview: string; name: string }>>([]);
  const [driveFileLink, setDriveFileLink] = useState<string | null>(null);
  const [driveFileName, setDriveFileName] = useState<string | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [examHint, setExamHint] = useState<string>('SSC CGL');
  const [yearHint, setYearHint] = useState<string>('2023');
  const [shiftHint, setShiftHint] = useState<string>('Tier 1 - Shift 1');
  const [languageMode, setLanguageMode] = useState<'bilingual' | 'hi' | 'en'>('bilingual');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [extractionSummary, setExtractionSummary] = useState<any | null>(null);
  const [previewLang, setPreviewLang] = useState<'both' | 'en' | 'hi'>('both');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // TAB 2: AI Exam Generator State
  const [promptText, setPromptText] = useState<string>('');
  const [genExamCat, setGenExamCat] = useState<string>('SSC CGL');
  const [genYear, setGenYear] = useState<string>('2023');
  const [genLang, setGenLang] = useState<'bilingual' | 'hi' | 'en'>('bilingual');
  const [genCount, setGenCount] = useState<number>(25);
  const [genDuration, setGenDuration] = useState<number>(60);
  const [genMarks, setGenMarks] = useState<number>(2.0);
  const [genNegMarks, setGenNegMarks] = useState<number>(0.5);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedExamResult, setGeneratedExamResult] = useState<any | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // TAB 3: Repository State
  const [repoQuestions, setRepoQuestions] = useState<any[]>([]);
  const [repoLoading, setRepoLoading] = useState<boolean>(false);
  const [filterExam, setFilterExam] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
    loadRepositoryQuestions();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getPyqStatsAndFilters();
      setPyqStats(data);
    } catch (e) {
      console.warn('Failed to load PYQ stats', e);
    }
  };

  const loadRepositoryQuestions = async () => {
    setRepoLoading(true);
    try {
      const res = await api.getPyqQuestions({
        exam: filterExam,
        year: filterYear,
        subject_id: filterSubject,
        search: filterSearch,
        limit: 50
      });
      setRepoQuestions(res.questions || []);
    } catch (e) {
      console.warn('Failed to load repository questions', e);
    } finally {
      setRepoLoading(false);
    }
  };

  // Handle PDF file selection and base64 conversion
  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Please select a valid PDF document file (.pdf)');
      return;
    }

    setPdfFile(file);
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      // Strip "data:application/pdf;base64," prefix for Gemini inlineData
      const base64Clean = resultStr.includes('base64,') ? resultStr.split('base64,')[1] : resultStr;
      setPdfBase64(base64Clean);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected PDF file.');
    };
    reader.readAsDataURL(file);
  };

  // Handle scanned images selection (multi-page photos / scans of question papers)
  const handleImageFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploadError(null);
    try {
      const newItems = await Promise.all(
        files.map(async (file) => {
          const base64 = await fileToBase64(file);
          const preview = URL.createObjectURL(file);
          return { file, base64, preview, name: file.name };
        })
      );
      setScannedImages((prev) => [...prev, ...newItems]);
    } catch (err: any) {
      setUploadError('Failed to read selected image files.');
    }
  };

  const removeScannedImage = (index: number) => {
    setScannedImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Run AI OCR & Extraction on Scanned PDF, Image Photos, or Raw Text
  const handleExtractQuestions = async () => {
    if (uploadMode === 'pdf' && !pdfBase64) {
      setUploadError('Please upload a PDF file containing scanned PYQ examination questions.');
      return;
    }
    if (uploadMode === 'images' && scannedImages.length === 0) {
      setUploadError('Please select one or more scanned question paper images/photos.');
      return;
    }
    if (uploadMode === 'text' && !rawText.trim()) {
      setUploadError('Please paste questions or exam paper text into the input box.');
      return;
    }

    setIsExtracting(true);
    setUploadError(null);
    setSaveSuccessMsg(null);
    setDriveFileLink(null);

    let driveUrl = '';
    let driveName = '';

    try {
      // Step 1: Upload heavy scanned PDF / Images directly to Google Drive (Zero Firebase Storage)
      if (uploadMode === 'pdf' && pdfFile) {
        setExtractionProgress('1/3: Archiving Scanned PDF to Google Drive folder "Pariksha CBT PYQ Question Papers" (Zero Firebase Storage)...');
        try {
          const dRes = await uploadFileToDrive(pdfFile, 'Pariksha CBT PYQ Question Papers');
          if (dRes && dRes.success) {
            driveUrl = dRes.webViewLink || dRes.directUrl;
            driveName = dRes.name;
            setDriveFileLink(driveUrl);
            setDriveFileName(driveName);
          }
        } catch (dErr) {
          console.warn('[DRIVE ARCHIVE NOTICE]', dErr);
        }
      } else if (uploadMode === 'images' && scannedImages.length > 0) {
        setExtractionProgress(`1/3: Archiving ${scannedImages.length} image scans to Google Drive folder "Pariksha CBT PYQ Question Papers" (Zero Firebase Storage)...`);
        try {
          for (const img of scannedImages) {
            const dRes = await uploadFileToDrive(img.file, 'Pariksha CBT PYQ Question Papers');
            if (dRes && dRes.success && !driveUrl) {
              driveUrl = dRes.webViewLink || dRes.directUrl;
              driveName = dRes.name;
              setDriveFileLink(driveUrl);
              setDriveFileName(driveName);
            }
          }
        } catch (dErr) {
          console.warn('[DRIVE ARCHIVE NOTICE]', dErr);
        }
      }

      // Step 2: Gemini 3.8 Flash Multimodal OCR & extraction
      setExtractionProgress(
        uploadMode === 'images'
          ? `2/3: Scanning ${scannedImages.length} image page(s) with Gemini 3.8 Flash Vision OCR...`
          : '2/3: Performing Deep Vision OCR on Scanned Document with Gemini 3.8 Flash...'
      );

      const timeout1 = setTimeout(() => {
        setExtractionProgress('3/3: Recognizing Hindi (Devanagari) & English text, solving answer keys, and structuring bilingual translations...');
      }, 3500);

      const res = await api.uploadPdfQuestions({
        pdf_base64: uploadMode === 'pdf' ? pdfBase64 : undefined,
        images: uploadMode === 'images' ? scannedImages.map((s) => ({ base64: s.base64, mimeType: (s.file as any).type || 'image/jpeg', name: s.name })) : undefined,
        raw_text: uploadMode === 'text' ? rawText : undefined,
        exam_hint: examHint,
        year_hint: yearHint,
        language_mode: languageMode,
        drive_file_url: driveUrl || undefined
      });

      clearTimeout(timeout1);

      if (res.questions && res.questions.length > 0) {
        setExtractedQuestions(res.questions);
        setExtractionSummary({
          total_count: res.total_count,
          subject_breakdown: res.subject_breakdown,
          difficulty_breakdown: res.difficulty_breakdown,
          language_breakdown: res.language_breakdown,
          model_used: res.model_used
        });
      } else {
        setUploadError('No questions could be extracted. Please check the document content or try uploading higher resolution scans.');
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to extract questions with AI. Please verify document format.');
    } finally {
      setIsExtracting(false);
      setExtractionProgress('');
    }
  };

  // Attach a diagram image directly to an extracted question (stored in Google Drive)
  const handleAttachDiagramToQuestion = async (index: number, file: File) => {
    try {
      const res = await uploadFileToDrive(file, 'Pariksha CBT Exam Images');
      if (res.success) {
        setExtractedQuestions((prev) =>
          prev.map((item, i) => (i === index ? { ...item, image_url: res.directUrl, has_diagram: true } : item))
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to upload diagram image');
    }
  };

  // Save extracted questions into Question Bank
  const handleSaveQuestions = async (createExamAlso: boolean = false) => {
    if (extractedQuestions.length === 0) return;

    setIsSaving(true);
    setUploadError(null);
    setSaveSuccessMsg(null);

    try {
      const createExamPayload = createExamAlso ? {
        name: `${examHint} ${yearHint} Official PYQ Paper (${languageMode.toUpperCase()})`,
        duration_minutes: examHint.toLowerCase().includes('cgl') ? 60 : 90,
        total_marks: extractedQuestions.length * (examHint.toLowerCase().includes('cgl') ? 2.0 : 1.0),
        negative_marks: examHint.toLowerCase().includes('cgl') ? 0.5 : 0.25,
        status: 'live' as const,
        description: `Bilingual mock examination containing authentic ${examHint} (${yearHint}) questions parsed and standardized by AI.`,
        exam_category: examHint,
        target_year: String(yearHint)
      } : undefined;

      const res = await api.savePyqQuestions({
        questions: extractedQuestions,
        exam_category: examHint,
        pyq_year: yearHint,
        create_exam: createExamPayload
      });

      setSaveSuccessMsg(res.message);
      loadStats();
      loadRepositoryQuestions();

      if (createExamAlso && res.exam_id) {
        onNavigateToExam?.(res.exam_id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to save questions to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // Generate Exam with AI from Natural Prompt or Filters
  const handleGenerateExam = async (customPrompt?: string) => {
    setIsGenerating(true);
    setGenError(null);
    setGeneratedExamResult(null);

    try {
      const p = customPrompt !== undefined ? customPrompt : promptText;
      const res = await api.generatePyqExam({
        prompt: p,
        exam_category: genExamCat,
        year: genYear,
        language_mode: genLang,
        question_count: genCount,
        duration_minutes: genDuration,
        marks_per_question: genMarks,
        negative_marks: genNegMarks,
        auto_publish: true
      });

      setGeneratedExamResult(res);
      loadStats();
      loadRepositoryQuestions();
      if (res.exam) {
        onExamCreated?.(res.exam);
      }
    } catch (err: any) {
      setGenError(err.message || 'Failed to generate PYQ examination.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Question Bank & PYQ Engine (Gemini 3.8 Flash)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              PYQ Question Ingestion & AI Exam Generator
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Upload 10 years of competitive examination PDF question papers (SSC CGL, Railway RRB, Banking, State exams).
              Gemini AI automatically parses every question, guarantees <strong>bilingual English & Hindi</strong> conversion,
              tags subjects & topics, and generates customized CBT Mock Tests on demand.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">Question Bank</span>
              <span className="text-2xl font-black text-white">{pyqStats?.total_questions || 0}</span>
              <span className="text-[10px] text-indigo-200 block">Total Questions</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">PYQ Tagged</span>
              <span className="text-2xl font-black text-purple-300">{pyqStats?.total_pyq_questions || 0}</span>
              <span className="text-[10px] text-purple-200 block">Exam Verified</span>
            </div>
            <div className="col-span-2 sm:col-span-1 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold text-slate-300 uppercase block tracking-wider">Languages</span>
              <span className="text-base font-black text-emerald-300 flex items-center justify-center space-x-1 mt-1">
                <Globe className="w-4 h-4" />
                <span>Bilingual</span>
              </span>
              <span className="text-[10px] text-emerald-200 block">Hindi + English</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-8 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-500" />
            <span>1. Upload PDF / Text (AI Ingestion)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'generate'
                ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Wand2 className="w-4 h-4 text-purple-600" />
            <span>2. AI Exam Builder (Instant Test from PYQ)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('repository');
              loadRepositoryQuestions();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
              activeTab === 'repository'
                ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <BookOpen className="w-4 h-4 text-blue-500" />
            <span>3. Explore PYQ Repository</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: PDF / TEXT UPLOAD & BILINGUAL AI EXTRACTION        */}
      {/* ========================================================= */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Upload Previous Year Questions (PDF or Text)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gemini 3.8 Flash reads the PDF document, structures questions into standard CBT format, and translates any English-only questions to Hindi automatically.
                </p>
              </div>

              {/* Source Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start">
                <button
                  type="button"
                  onClick={() => setUploadMode('pdf')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    uploadMode === 'pdf' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  📄 Scanned PDF
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('images')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    uploadMode === 'images' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  🖼️ Paper Images / Photos {scannedImages.length > 0 && `(${scannedImages.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    uploadMode === 'text' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  ✏️ Paste Text
                </button>
              </div>
            </div>

            {/* Google Drive Zero Storage & Firebase Text Sync Notice */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-slate-900 block">
                    Google Drive Cloud Storage (Zero Firebase Storage Quota)
                  </span>
                  <span className="text-slate-600 text-[11px]">
                    आपकी Image/Scanned PDF सीधे आपके Google Drive के <strong>"Pariksha CBT PYQ Question Papers"</strong> फ़ोल्डर में सेव होगी। AI इसे स्कैन करके <strong>केवल शुद्ध टेक्स्ट (Text)</strong> फ़ॉर्मेट में Firebase में सेव करेगा!
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-black text-[10px] uppercase tracking-wider shrink-0 border border-emerald-200">
                0 Bytes Firebase Storage
              </span>
            </div>

            {/* Ingestion Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Examination *</label>
                <input
                  type="text"
                  value={examHint}
                  onChange={(e) => setExamHint(e.target.value)}
                  placeholder="e.g. SSC CGL, RRB NTPC, BSSC"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">PYQ Exam Year *</label>
                <select
                  value={yearHint}
                  onChange={(e) => setYearHint(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014].map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Shift / Tier (Optional)</label>
                <input
                  type="text"
                  value={shiftHint}
                  onChange={(e) => setShiftHint(e.target.value)}
                  placeholder="e.g. Tier 1 - Shift 1, Mains"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Output Language Mode *</label>
                <select
                  value={languageMode}
                  onChange={(e) => setLanguageMode(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="bilingual">🌐 Bilingual (Auto Translate to Hindi + English)</option>
                  <option value="hi">🇮🇳 Hindi Only</option>
                  <option value="en">🇬🇧 English Only</option>
                </select>
              </div>
            </div>

            {/* Upload Area: PDF, Scanned Images, or Text */}
            {uploadMode === 'pdf' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 p-8 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfFileSelect}
                  className="hidden"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    {pdfFile ? pdfFile.name : 'Click to select or drag and drop your Scanned PDF Exam Paper'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {pdfFile
                      ? `Ready for OCR analysis & Google Drive archiving (${(pdfFile.size / (1024 * 1024)).toFixed(2)} MB)`
                      : 'Supports multi-page scanned PDF papers (Hindi, English, or mixed). Uploaded to Google Drive.'}
                  </p>
                </div>
                {pdfFile && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Scanned PDF Loaded • Zero Firebase Storage</span>
                  </div>
                )}
              </div>
            ) : uploadMode === 'images' ? (
              <div className="space-y-4">
                <input
                  ref={imagesInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageFilesSelect}
                  className="hidden"
                />

                <div
                  onClick={() => imagesInputRef.current?.click()}
                  className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 p-6 rounded-2xl text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Click to select Question Paper Photos / Scanned Images
                  </h4>
                  <p className="text-xs text-slate-500">
                    Aap ek saath kayi pages (Page 1, Page 2, Page 3...) select kar sakte hain. PNG, JPG, WEBP supported.
                  </p>
                </div>

                {/* Selected Images Thumbnails Grid */}
                {scannedImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Selected Pages ({scannedImages.length} images):</span>
                      <button
                        type="button"
                        onClick={() => imagesInputRef.current?.click()}
                        className="text-indigo-600 hover:underline flex items-center space-x-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add more pages</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {scannedImages.map((img, idx) => (
                        <div
                          key={idx}
                          className="relative group rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs overflow-hidden"
                        >
                          <div className="h-28 rounded-lg bg-slate-100 flex items-center justify-center overflow-hidden">
                            <img
                              src={img.preview}
                              alt={img.name}
                              className="max-h-full max-w-full object-cover"
                            />
                          </div>
                          <span className="absolute top-2.5 left-2.5 bg-black/75 text-white font-bold text-[9px] px-1.5 py-0.5 rounded">
                            Pg {idx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeScannedImage(idx);
                            }}
                            className="absolute top-2.5 right-2.5 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-xs transition"
                            title="Remove page"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="text-[10px] font-medium text-slate-700 truncate mt-1">
                            {img.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Paste Question Paper Text (Supports Raw Text, OCR Dumps, or Markdown)
                </label>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste question paper text here, for example:&#10;Q1. What is the value of 25% of 80?&#10;(A) 20  (B) 25  (C) 30  (D) 15&#10;Ans: A&#10;Explanation: 25/100 * 80 = 20"
                  className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-mono text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition"
                />
              </div>
            )}

            {/* Error or Progress Notice */}
            {uploadError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{uploadError}</span>
              </div>
            )}

            {isExtracting && (
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center space-x-3 animate-pulse">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
                <span className="font-semibold">{extractionProgress}</span>
              </div>
            )}

            {/* Run Extraction Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Multimodal Vision OCR reads Hindi + English questions directly from scanned documents.</span>
              </span>

              <button
                type="button"
                onClick={handleExtractQuestions}
                disabled={
                  isExtracting ||
                  (uploadMode === 'pdf' && !pdfBase64) ||
                  (uploadMode === 'images' && scannedImages.length === 0) ||
                  (uploadMode === 'text' && !rawText.trim())
                }
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning & Extracting...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>🚀 Scan & Extract Questions (AI द्वारा टेक्स्ट बनाएं)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* EXTRACTED QUESTIONS REVIEW & CONFIRMATION */}
          {extractedQuestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{extractedQuestions.length} Questions Converted to Text</span>
                    </span>
                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Scanned Image ➔ Clean Unicode Text</span>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Bilingual Review & Quality Inspection
                  </h3>
                </div>

                {/* Language View Switcher */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-slate-500">Preview:</span>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setPreviewLang('both')}
                      className={`px-3 py-1 rounded-lg transition ${previewLang === 'both' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                    >
                      Bilingual (Both)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('hi')}
                      className={`px-3 py-1 rounded-lg transition ${previewLang === 'hi' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                    >
                      Hindi
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewLang('en')}
                      className={`px-3 py-1 rounded-lg transition ${previewLang === 'en' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'}`}
                    >
                      English
                    </button>
                  </div>
                </div>
              </div>

              {/* Google Drive Source File Link Banner */}
              {driveFileLink && (
                <div className="p-3 bg-blue-50/90 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                  <div className="flex items-center space-x-2 text-blue-950 font-semibold truncate">
                    <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">
                      मूल Scanned फ़ाइल <strong>Google Drive ("Pariksha CBT PYQ Question Papers")</strong> में सुरक्षित है। (Firebase Storage = 0 Bytes)
                    </span>
                  </div>
                  <a
                    href={driveFileLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold border border-blue-300 rounded-lg shadow-2xs transition shrink-0"
                  >
                    <span>Google Drive में फ़ाइल खोलें</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {/* Subject Breakdown Badges */}
              {extractionSummary && extractionSummary.subject_breakdown && (
                <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Subject Breakdown:</span>
                  {Object.entries(extractionSummary.subject_breakdown).map(([sub, count]) => (
                    <span key={sub} className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 shadow-2xs">
                      {sub}: <strong className="text-indigo-600">{count as number}</strong>
                    </span>
                  ))}
                </div>
              )}

              {/* Questions List */}
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {extractedQuestions.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold text-[11px]">
                          {q.subject_name}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-semibold text-[11px]">
                          {q.topic_name}
                        </span>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[11px]">
                          {q.pyq_exam} ({q.pyq_year})
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-xs">
                        <label className="cursor-pointer text-[10px] font-bold text-slate-600 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 px-2 py-0.5 rounded border border-slate-200 transition inline-flex items-center space-x-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>{q.image_url ? 'Diagram Attached ✓' : '+ Attach Diagram'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleAttachDiagramToQuestion(idx, f);
                            }}
                          />
                        </label>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Correct: Option {q.correct_answer}
                        </span>
                        <span className="text-slate-400">+{q.marks || 2} / -{q.negative_marks || 0.5}</span>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="space-y-1.5 text-xs">
                      {(previewLang === 'both' || previewLang === 'en') && q.question_en && (
                        <p className="font-semibold text-slate-900 leading-relaxed">
                          <strong className="text-slate-400 font-mono">[EN]</strong> {q.question_en}
                        </p>
                      )}
                      {(previewLang === 'both' || previewLang === 'hi') && q.question_hi && (
                        <p className="font-semibold text-slate-800 leading-relaxed">
                          <strong className="text-amber-700 font-mono">[HI]</strong> {q.question_hi}
                        </p>
                      )}
                    </div>

                    {/* Diagram / Visual Figure Section if detected */}
                    {(q.has_diagram || q.diagram_description || q.image_url) && (
                      <div className="p-3 bg-amber-50/70 border border-amber-200/90 rounded-xl space-y-2 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-amber-900 flex items-center space-x-1.5">
                            <span>📊 Diagram / Figure Detected in Question:</span>
                          </span>
                          {q.image_url ? (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Image in Google Drive</span>
                            </span>
                          ) : (
                            <label className="cursor-pointer text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-lg transition inline-flex items-center space-x-1">
                              <Upload className="w-3 h-3 text-indigo-600" />
                              <span>Attach Diagram Crop (Google Drive)</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAttachDiagramToQuestion(idx, f);
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {q.diagram_description && (
                          <p className="text-[11px] text-amber-950 font-medium leading-relaxed bg-white/70 p-2 rounded-lg border border-amber-200/60">
                            <strong>AI Visual Breakdown:</strong> {q.diagram_description}
                          </p>
                        )}

                        {q.image_url && (
                          <div className="mt-1 h-28 bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-center overflow-hidden">
                            <img src={q.image_url} alt="Question Diagram" className="max-h-full object-contain" />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const optKeyEn = `option_${opt.toLowerCase()}_en`;
                        const optKeyHi = `option_${opt.toLowerCase()}_hi`;
                        const isCorrect = q.correct_answer === opt;

                        return (
                          <div
                            key={opt}
                            className={`p-2.5 rounded-xl border flex items-start space-x-2 ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[11px] shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {opt}
                            </span>
                            <div className="space-y-0.5 leading-snug">
                              {(previewLang === 'both' || previewLang === 'en') && (
                                <div>{q[optKeyEn]}</div>
                              )}
                              {(previewLang === 'both' || previewLang === 'hi') && q[optKeyHi] && (
                                <div className="text-slate-600">{q[optKeyHi]}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {(q.explanation_en || q.explanation_hi) && (
                      <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-xl text-[11px] text-purple-900 leading-relaxed">
                        <strong className="text-purple-800">Detailed Solution: </strong>
                        {previewLang === 'hi' ? (q.explanation_hi || q.explanation_en) : (q.explanation_en || q.explanation_hi)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Success Notice */}
              {saveSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span className="font-bold">{saveSuccessMsg}</span>
                </div>
              )}

              {/* Save & Publish Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  ⚡ <strong>Text-Only Storage:</strong> Database & Firebase Firestore में केवल शुद्ध टेक्स्ट प्रश्न सेव होंगे (Zero Firebase Storage).
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveQuestions(false)}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <BookOpen className="w-4 h-4 text-slate-300" />
                    <span>{isSaving ? 'Saving Text...' : '💾 Save Text to Firebase & Question Bank'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveQuestions(true)}
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>{isSaving ? 'Publishing Exam...' : '⚡ Save & Create Live CBT Mock Exam'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: AI INSTANT EXAM GENERATOR FROM PYQ QUESTION BANK   */}
      {/* ========================================================= */}
      {activeTab === 'generate' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-xs font-bold uppercase tracking-wider mb-2">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Instant PYQ Exam Generator (Gemini 3.8 Flash)</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Generate Any Exam on Demand from Question Bank
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Describe the exam you want in natural language or choose specific parameters. The AI scans your question bank,
                selects matching previous year questions (e.g. SSC CGL 2022/2023, Railway), structures the exam sections, and makes it
                available immediately for student CBT testing.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-600 block">Quick 1-Click PYQ Presets:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {[
                  {
                    title: '🎯 SSC CGL 2023 Tier-1 Mock',
                    prompt: 'Create an authentic SSC CGL 2023 Tier-1 Mock Exam with 25 questions bilingual Hindi & English (Reasoning, Math, GK, English), 60 mins, +2 marks, -0.5 negative',
                    cat: 'SSC CGL',
                    year: '2023',
                    count: 25
                  },
                  {
                    title: '🚆 Railway RRB NTPC 2022',
                    prompt: 'Railway RRB NTPC 2022 Previous Year Paper 40 questions bilingual, 45 mins, +1 mark, -0.33 negative marking',
                    cat: 'Railway RRB NTPC',
                    year: '2022',
                    count: 40
                  },
                  {
                    title: '⚡ SSC CGL 2022 Quick 20 Qs',
                    prompt: 'SSC CGL 2022 PYQ Speed Test 20 questions in Hindi and English, 20 mins',
                    cat: 'SSC CGL',
                    year: '2022',
                    count: 20
                  },
                  {
                    title: '🏛️ BSSC CGL GK & Reasoning',
                    prompt: 'BSSC CGL previous year paper with 30 questions focusing on General Studies and Logical Reasoning, 30 mins',
                    cat: 'BSSC CGL',
                    year: '2023',
                    count: 30
                  }
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPromptText(item.prompt);
                      setGenExamCat(item.cat);
                      setGenYear(item.year);
                      setGenCount(item.count);
                    }}
                    className="p-3 bg-slate-50 hover:bg-purple-50/60 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition cursor-pointer space-y-1 shadow-2xs"
                  >
                    <div className="font-bold text-xs text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{item.prompt}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Natural Language Prompt Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Natural Language AI Instruction (Hinglish, Hindi, or English)
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="e.g. Mujhe SSC CGL 2022 ka 50 questions ka mock test bana do Hindi aur English dono me, 60 minutes time aur negative marking 0.5"
                  className="w-full p-4 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-hidden transition leading-relaxed"
                />
              </div>
            </div>

            {/* Granular Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Exam</label>
                <input
                  type="text"
                  value={genExamCat}
                  onChange={(e) => setGenExamCat(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Year</label>
                <select
                  value={genYear}
                  onChange={(e) => setGenYear(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  {['all', '2024', '2023', '2022', '2021', '2020', '2019', '2018'].map((y) => (
                    <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Language</label>
                <select
                  value={genLang}
                  onChange={(e) => setGenLang(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                >
                  <option value="bilingual">Bilingual</option>
                  <option value="hi">Hindi Only</option>
                  <option value="en">English Only</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Questions</label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={genCount}
                  onChange={(e) => setGenCount(parseInt(e.target.value) || 25)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Duration (Mins)</label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={genDuration}
                  onChange={(e) => setGenDuration(parseInt(e.target.value) || 60)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Marking (+ / -)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.5"
                    value={genMarks}
                    onChange={(e) => setGenMarks(parseFloat(e.target.value) || 2)}
                    className="w-1/2 px-1.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 text-center"
                    title="Marks per question"
                  />
                  <input
                    type="number"
                    step="0.25"
                    value={genNegMarks}
                    onChange={(e) => setGenNegMarks(parseFloat(e.target.value) || 0.5)}
                    className="w-1/2 px-1.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-rose-700 text-center"
                    title="Negative marks"
                  />
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {genError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{genError}</span>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleGenerateExam()}
                disabled={isGenerating}
                className="px-6 py-3 bg-purple-700 hover:bg-purple-800 active:bg-purple-900 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isGenerating ? 'Synthesizing & Assembling Exam...' : '✨ Generate & Publish Exam with AI'}</span>
              </button>
            </div>
          </div>

          {/* GENERATED EXAM SUCCESS CARD */}
          {generatedExamResult && (
            <div className="bg-gradient-to-br from-emerald-50 via-white to-purple-50 rounded-2xl border-2 border-emerald-300 p-6 shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
                      Live CBT Exam Published Successfully
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {generatedExamResult.exam?.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => onNavigateToExam?.(generatedExamResult.exam?.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>View / Test Examination</span>
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed border-t border-slate-200/80 pt-3">
                {generatedExamResult.exam?.description}
              </p>

              {/* Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Questions</span>
                  <span className="font-extrabold text-slate-900 text-base">{generatedExamResult.total_questions} Questions</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                  <span className="font-extrabold text-slate-900 text-base">{generatedExamResult.exam?.duration_minutes} Minutes</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Marks</span>
                  <span className="font-extrabold text-emerald-700 text-base">{generatedExamResult.exam?.total_marks} Marks</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Negative Marks</span>
                  <span className="font-extrabold text-rose-600 text-base">-{generatedExamResult.exam?.negative_marks} per wrong</span>
                </div>
              </div>

              {/* Source summary note */}
              {generatedExamResult.source_summary && (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 font-medium">
                  <strong>Question Source Composition: </strong> {generatedExamResult.source_summary}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: EXPLORE & FILTER PYQ QUESTION REPOSITORY          */}
      {/* ========================================================= */}
      {activeTab === 'repository' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <BookOpen className="w-5 h-5 text-indigo-600" />
                  <span>Question Bank & PYQ Repository</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Browse, filter by examination and year, or search through all bilingual questions stored in the database.
                </p>
              </div>

              <button
                type="button"
                onClick={loadRepositoryQuestions}
                className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition self-start"
                title="Refresh"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Exam</label>
                <select
                  value={filterExam}
                  onChange={(e) => setFilterExam(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Competitive Exams</option>
                  {(pyqStats?.available_exams || ['SSC CGL', 'Railway RRB NTPC', 'SSC CHSL', 'BSSC CGL']).map((ex) => (
                    <option key={ex} value={ex}>{ex}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Filter by Year</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Years</option>
                  {(pyqStats?.available_years || [2024, 2023, 2022, 2021, 2020]).map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Subject</label>
                <select
                  value={filterSubject}
                  onChange={(e) => setFilterSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
                >
                  <option value="all">All Subjects</option>
                  {(pyqStats?.subject_breakdown || []).map((sub) => (
                    <option key={sub.name} value={sub.name}>{sub.name} ({sub.question_count})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Search Keywords</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadRepositoryQuestions()}
                    placeholder="Search question text or code..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* Search Trigger */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">
                Found {repoQuestions.length} matching questions
              </span>
              <button
                type="button"
                onClick={loadRepositoryQuestions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>

            {/* Questions Table / List */}
            {repoLoading ? (
              <div className="p-12 text-center text-slate-500 space-y-2">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-semibold">Loading questions from repository...</p>
              </div>
            ) : repoQuestions.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-xs font-semibold">No questions match the selected filter criteria.</p>
                <p className="text-[11px] mt-1">Upload PDF question papers in Tab 1 or adjust your search filters.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {repoQuestions.map((q, idx) => (
                  <div key={q.id || idx} className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition space-y-2 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          {q.question_id_code}
                        </span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                          {q.subject_name || 'General'}
                        </span>
                        {q.topic_name && (
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {q.topic_name}
                          </span>
                        )}
                        {q.pyq_exam && (
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                            {q.pyq_exam} {q.pyq_year ? `(${q.pyq_year})` : ''}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">
                          Correct: {q.correct_answer}
                        </span>
                        <span className="text-[11px] text-slate-400 font-semibold">+{q.marks || 1} / -{q.negative_marks || 0.25}</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      {q.question_en && (
                        <p className="font-semibold text-slate-900 leading-snug">
                          <strong className="text-slate-400 font-mono">[EN]</strong> {q.question_en}
                        </p>
                      )}
                      {q.question_hi && (
                        <p className="font-medium text-slate-700 leading-snug">
                          <strong className="text-amber-700 font-mono">[HI]</strong> {q.question_hi}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
