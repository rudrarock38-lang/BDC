import {
  User,
  Subject,
  Topic,
  Question,
  Exam,
  ExamResult,
  QuestionBreakdownItem,
  AttemptResultResponse,
  AppSettings,
  CandidateVerification,
  VerificationStats,
  VerificationExamSummary,
  StudentProfileResponse
} from '../types';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! Status: ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (identifier: string, password: string, role?: string) =>
    request<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role })
    }),

  googleLogin: (payload: { email: string; name?: string; googleToken?: string; forceRole?: 'admin' | 'student' }) =>
    request<{ user: User; token: string }>('/api/auth/google-login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  firebaseSync: (payload: { uid: string; email?: string; name?: string; role?: 'student' | 'admin'; mobile?: string; roll_number?: string; email_verified?: boolean }) =>
    request<{ user: User; token: string }>('/api/auth/firebase-sync', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getFirebaseStatus: () =>
    request<{
      connected: boolean;
      projectId: string;
      authDomain: string;
      storageBucket: string;
      latencyMs: number;
      lastSyncStats: {
        lastSyncTime: string | null;
        totalSynced: number;
        breakdown: Record<string, number>;
        status: string;
        error: string | null;
      };
      localCounts: Record<string, number>;
      timestamp: string;
    }>('/api/firebase/status'),

  syncAllToFirebase: () =>
    request<{
      success: boolean;
      totalSynced: number;
      breakdown: Record<string, number>;
      timestamp: string;
      error?: string;
    }>('/api/firebase/sync-all', {
      method: 'POST'
    }),

  testFirebaseConnection: () =>
    request<{
      connected: boolean;
      projectId: string;
      latencyMs: number;
      timestamp: string;
      message?: string;
      error?: string;
    }>('/api/firebase/test-connection', {
      method: 'POST'
    }),

  register: (payload: { name: string; email: string; mobile?: string; roll_number?: string; password: string }) =>
    request<{
      user?: User;
      token?: string;
      otp_required?: boolean;
      email?: string;
      message?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  verifyRegisterOtp: (payload: { email: string; otp: string }) =>
    request<{ user: User; token: string; message: string }>('/api/auth/register/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  resendRegisterOtp: (email: string) =>
    request<{ success: boolean; message: string }>('/api/auth/register/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),

  toggleRegOtp: (enabled: boolean) =>
    request<{ success: boolean; student_reg_otp_enabled: string; message: string }>('/api/admin/toggle-reg-otp', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    }),

  sendStudentForgotPasswordOtp: (identifier: string, googleToken?: string) =>
    request<{ success: boolean; message: string; email: string; masked_email: string; otp_preview?: string; sent_via?: string }>(
      '/api/auth/student/forgot-password/send-otp',
      {
        method: 'POST',
        headers: googleToken ? { Authorization: `Bearer ${googleToken}` } : {},
        body: JSON.stringify({ identifier, googleToken })
      }
    ),

  verifyStudentResetPassword: (payload: { email: string; otp: string; new_password: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/student/forgot-password/verify-reset', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  sendAdminForgotPasswordOtp: (identifier: string, googleToken?: string) =>
    request<{ success: boolean; message: string; email: string; masked_email: string; otp_preview?: string; sent_via?: string }>(
      '/api/auth/admin/forgot-password/send-otp',
      {
        method: 'POST',
        headers: googleToken ? { Authorization: `Bearer ${googleToken}` } : {},
        body: JSON.stringify({ identifier, googleToken })
      }
    ),

  verifyAdminResetPassword: (payload: { email: string; otp: string; new_password: string }) =>
    request<{ success: boolean; message: string }>('/api/auth/admin/forgot-password/verify-reset', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Student Profile Management
  getStudentProfile: (studentId: string) =>
    request<StudentProfileResponse>(`/api/student/profile/${studentId}`),

  updateStudentProfile: (studentId: string, payload: Partial<User> & { current_password?: string; new_password?: string }) =>
    request<{ success: boolean; message: string; user: User }>(`/api/student/profile/${studentId}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  getGmailStatus: () =>
    request<{ connected: boolean; senderEmail: string; scope: string }>('/api/gmail/status'),

  testSendGmail: (recipient?: string, token?: string) =>
    request<{ success: boolean; provider: string; recipient: string; message: string }>('/api/gmail/test-send', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ recipient })
    }),

  // Admin Stats
  getAdminStats: () => request<{
    totalStudents: number;
    totalQuestions: number;
    totalExams: number;
    activeExams: number;
    completedAttempts: number;
    recentExams: Exam[];
    recentResults: any[];
  }>('/api/admin/stats'),

  // Students (Admin)
  getStudents: (params: { search?: string; status?: string; admit_card?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.admit_card) query.append('admit_card', params.admit_card);
    return request<any[]>(`/api/admin/students?${query.toString()}`);
  },

  createStudent: (payload: Partial<User> & { password: string }) =>
    request<any>('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  bulkImportStudents: (payload: { students: any[]; exam_id?: string }) =>
    request<{
      success: boolean;
      message: string;
      total_received: number;
      imported_count: number;
      skipped_count: number;
      imported_students: any[];
      skipped: any[];
      errors: string[];
      exam?: any;
    }>('/api/admin/students/bulk-import', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateStudent: (id: string, payload: Partial<User>) =>
    request<{ success: boolean; message: string }>(`/api/admin/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  resetStudentPassword: (id: string, new_password: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/students/${id}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ new_password })
    }),

  deleteStudent: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/students/${id}`, {
      method: 'DELETE'
    }),

  getStudentPerformance: (id: string) =>
    request<{
      student: User;
      stats: { totalAttempts: number; avgScore: number; highestScore: number; avgPercentage: number };
      results: ExamResult[];
    }>(`/api/admin/students/${id}/performance`),

  assignStudentExam: (studentId: string, payload: { exam_id: string | null; seat_number?: string }) =>
    request<{
      success: boolean;
      message: string;
      assigned_exam_id: string | null;
      assigned_exam_name: string;
      seat_number?: string | null;
    }>(`/api/admin/students/${studentId}/assigned-exam`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  batchAssignStudentExam: (payload: { student_ids: string[]; exam_id: string | null; seat_prefix?: string }) =>
    request<{ success: boolean; updated_count: number; exam_name: string; message: string }>(
      '/api/admin/students/batch-assign-exam',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    ),

  getExamAccessSettings: () =>
    request<{ mode: 'custom_or_open' | 'strict_assigned' }>('/api/admin/exam-access-settings'),

  setExamAccessSettings: (mode: 'custom_or_open' | 'strict_assigned') =>
    request<{ success: boolean; mode: string; message: string }>('/api/admin/exam-access-settings', {
      method: 'POST',
      body: JSON.stringify({ mode })
    }),

  // Student Admit Card Generation & Release Controls
  updateStudentAdmitCard: (studentId: string, enabled: boolean) =>
    request<{ success: boolean; student_id: string; admit_card_enabled: boolean; message: string }>(
      `/api/admin/students/${studentId}/admit-card`,
      {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      }
    ),

  batchUpdateStudentAdmitCard: (payload: { student_ids: string[]; enabled: boolean }) =>
    request<{ success: boolean; updated_count: number; admit_card_enabled: boolean; message: string }>(
      '/api/admin/students/batch-admit-card',
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    ),

  setAllStudentsAdmitCard: (enabled: boolean) =>
    request<{ success: boolean; updated_count: number; admit_card_enabled: boolean; policy: string; message: string }>(
      '/api/admin/students/all-admit-card',
      {
        method: 'POST',
        body: JSON.stringify({ enabled })
      }
    ),

  getAdmitCardSummary: () =>
    request<{ total_students: number; released_count: number; withheld_count: number; policy: string }>(
      '/api/admin/students/admit-card-summary'
    ),

  updateExamAdmitCard: (examId: string, enabled: boolean) =>
    request<{ success: boolean; exam_id: string; admit_card_enabled: boolean; message: string }>(
      `/api/admin/exams/${examId}/admit-card`,
      {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      }
    ),

  // Admin Exam Re-attempt Permission Control
  updateExamReattempt: (examId: string, allowed: boolean, maxAttempts?: number) =>
    request<{ success: boolean; exam_id: string; allow_reattempt: boolean; max_attempts: number; message: string }>(
      `/api/admin/exams/${examId}/reattempt`,
      {
        method: 'PUT',
        body: JSON.stringify({ allowed, max_attempts: maxAttempts })
      }
    ),

  // Admin Candidate Level Re-attempt Permission
  allowStudentReattempt: (attemptId: string) =>
    request<{ success: boolean; message: string }>(
      `/api/admin/attempts/${attemptId}/allow-reattempt`,
      {
        method: 'POST'
      }
    ),

  // Subjects & Topics
  getSubjects: () => request<Subject[]>('/api/subjects'),
  createSubject: (payload: { name: string; code?: string; description?: string }) =>
    request<Subject>('/api/subjects', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateSubject: (id: string, payload: { name: string; code?: string; description?: string }) =>
    request<{ success: boolean }>(`/api/subjects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  deleteSubject: (id: string) =>
    request<{ success: boolean }>(`/api/subjects/${id}`, { method: 'DELETE' }),

  getTopics: (subjectId?: string) => {
    const query = subjectId ? `?subject_id=${subjectId}` : '';
    return request<Topic[]>(`/api/topics${query}`);
  },
  createTopic: (payload: { subject_id: string; name: string; description?: string }) =>
    request<Topic>('/api/topics', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateTopic: (id: string, payload: { name: string; description?: string; subject_id?: string }) =>
    request<{ success: boolean }>(`/api/topics/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),
  deleteTopic: (id: string) =>
    request<{ success: boolean }>(`/api/topics/${id}`, { method: 'DELETE' }),

  // Question Bank
  getQuestions: (params: { subject_id?: string; topic_id?: string; difficulty?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.subject_id) query.append('subject_id', params.subject_id);
    if (params.topic_id) query.append('topic_id', params.topic_id);
    if (params.difficulty) query.append('difficulty', params.difficulty);
    if (params.search) query.append('search', params.search);
    return request<Question[]>(`/api/questions?${query.toString()}`);
  },

  getQuestion: (id: string) => request<Question>(`/api/questions/${id}`),

  createQuestion: (payload: Partial<Question>) =>
    request<{ id: string; question_id_code: string; message: string }>('/api/questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateQuestion: (id: string, payload: Partial<Question>) =>
    request<{ success: boolean; message: string }>(`/api/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteQuestion: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/questions/${id}`, {
      method: 'DELETE'
    }),

  batchDeleteQuestions: (question_ids: string[]) =>
    request<{ success: boolean; deleted_count: number; message: string }>(
      '/api/questions/batch-delete',
      {
        method: 'POST',
        body: JSON.stringify({ question_ids })
      }
    ),

  batchUpdateSubject: (question_ids: string[], subject_id: string) =>
    request<{ success: boolean; updated_count: number; subject_id: string; subject_name: string }>(
      '/api/questions/batch-update-subject',
      {
        method: 'POST',
        body: JSON.stringify({ question_ids, subject_id })
      }
    ),

  bulkUploadQuestions: (
    rows: any[],
    commit: boolean = false,
    options?: { exam_id?: string; subject_id?: string; language_mode?: string }
  ) =>
    request<{
      success: boolean;
      totalRows: number;
      validCount: number;
      errorCount: number;
      importedCount?: number;
      imported_question_ids?: string[];
      attached_to_exam_id?: string | null;
      exam_question_count?: number;
      preview?: any[];
      subject_breakdown?: Array<{
        subject_id: string;
        subject_name: string;
        count: number;
        existing_count: number;
        total_after: number;
      }>;
      errors: { row: number; reason: string }[];
    }>('/api/questions/bulk-upload', {
      method: 'POST',
      body: JSON.stringify({ rows, commit, ...options })
    }),

  // AI Smart Question Organizer (Gemini 3.8 Flash)
  organizeQuestionsWithAI: (payload: {
    raw_text?: string;
    raw_rows?: any[];
    exam_id?: string;
    target_subject_id?: string;
  }) =>
    request<{
      success: boolean;
      questions: any[];
      subject_breakdown: Record<string, number>;
      difficulty_breakdown: { easy: number; medium: number; hard: number };
      language_breakdown: { bilingual: number; hi: number; en: number };
      total_count: number;
      ai_powered: boolean;
      model_used?: string;
    }>('/api/ai/organize-questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  saveOrganizedQuestionsWithAI: (payload: {
    questions: any[];
    exam_id?: string;
    create_exam?: {
      name: string;
      duration_minutes?: number;
      total_marks?: number;
      negative_marks?: number;
      status?: 'live' | 'draft';
      description?: string;
      subject_id?: string;
    };
  }) =>
    request<{
      success: boolean;
      saved_count: number;
      saved_question_ids: string[];
      attached_to_exam_id: string | null;
      exam_id?: string;
      exam_name?: string;
      exam_created?: boolean;
      exam_attached_count?: number;
      message: string;
    }>('/api/ai/save-organized-questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // AI PDF & PYQ Question Parser (Gemini 3.8 Flash)
  uploadPdfQuestions: (payload: {
    pdf_base64?: string;
    images?: Array<{ base64: string; mimeType: string; name?: string }>;
    raw_text?: string;
    exam_hint?: string;
    year_hint?: number | string;
    language_mode?: 'bilingual' | 'hi' | 'en';
    drive_file_url?: string;
  }) =>
    request<{
      success: boolean;
      questions: any[];
      subject_breakdown: Record<string, number>;
      difficulty_breakdown: { easy: number; medium: number; hard: number };
      language_breakdown: { bilingual: number; hi: number; en: number };
      total_count: number;
      ai_powered: boolean;
      model_used?: string;
    }>('/api/ai/upload-pdf-questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Save PYQ Questions with Exam, Year, and Bilingual metadata
  savePyqQuestions: (payload: {
    questions: any[];
    exam_category?: string;
    pyq_year?: number | string;
    create_exam?: {
      name: string;
      duration_minutes?: number;
      total_marks?: number;
      negative_marks?: number;
      status?: 'live' | 'draft';
      description?: string;
      subject_id?: string;
      exam_category?: string;
      target_year?: string;
    };
    exam_id?: string;
  }) =>
    request<{
      success: boolean;
      saved_count: number;
      saved_question_ids: string[];
      exam_id?: string;
      exam_name?: string;
      exam_created?: boolean;
      message: string;
    }>('/api/ai/save-pyq-questions', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Generate & Publish Exam from Question Bank via AI
  generatePyqExam: (payload: {
    prompt?: string;
    exam_category?: string;
    year?: number | string;
    language_mode?: 'bilingual' | 'hi' | 'en';
    question_count?: number;
    duration_minutes?: number;
    marks_per_question?: number;
    negative_marks?: number;
    auto_publish?: boolean;
  }) =>
    request<{
      success: boolean;
      exam: Exam;
      total_questions: number;
      subject_breakdown: Record<string, number>;
      source_summary: string;
      message: string;
    }>('/api/ai/generate-pyq-exam', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  // Get PYQ categories, years, and breakdown stats
  getPyqStatsAndFilters: () =>
    request<{
      success: boolean;
      total_pyq_questions: number;
      total_questions: number;
      available_exams: string[];
      available_years: number[];
      subject_breakdown: { name: string; question_count: number }[];
    }>('/api/pyq/stats-and-filters'),

  // Get filtered PYQ questions from Question Bank
  getPyqQuestions: (params: {
    exam?: string;
    year?: number | string;
    subject_id?: string;
    language?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.exam) query.append('exam', String(params.exam));
    if (params.year) query.append('year', String(params.year));
    if (params.subject_id) query.append('subject_id', params.subject_id);
    if (params.language) query.append('language', params.language);
    if (params.search) query.append('search', params.search);
    if (params.limit) query.append('limit', String(params.limit));
    if (params.offset) query.append('offset', String(params.offset));
    return request<{ success: boolean; questions: any[]; count: number }>(`/api/pyq/questions?${query.toString()}`);
  },

  // Google Drive Image Upload (Saves Firebase storage quota)
  uploadImageToDrive: (payload: { filename?: string; mime_type?: string; image_base64: string; googleToken?: string }) =>
    request<{
      success: boolean;
      fileId: string;
      directUrl: string;
      webViewLink?: string;
      name: string;
      provider: 'google_drive' | 'local_fallback';
      message: string;
    }>('/api/drive/upload-image', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getDriveStatus: () =>
    request<{
      connected: boolean;
      folderName: string;
      scope: string;
      note: string;
    }>('/api/drive/status'),

  // Exams
  getExams: (params: { role?: string; student_id?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.append('role', params.role);
    if (params.student_id) query.append('student_id', params.student_id);
    return request<Exam[]>(`/api/exams?${query.toString()}`);
  },

  getExam: (id: string) => request<Exam & { questions: Question[]; question_count: number }>(`/api/exams/${id}`),
  getExamById: (id: string) => request<Exam & { questions: Question[]; question_count: number }>(`/api/exams/${id}`),

  createExam: (payload: Partial<Exam> & { question_ids?: string[] }) =>
    request<{ id: string; message: string; question_count?: number }>('/api/exams', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateExam: (id: string, payload: Partial<Exam> & { question_ids?: string[] }) =>
    request<{ success: boolean; message: string }>(`/api/exams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteExam: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/exams/${id}`, {
      method: 'DELETE'
    }),

  assignExamQuestions: (examId: string, question_ids: string[]) =>
    request<{ success: boolean; assignedCount: number; targetCount: number; message: string }>(
      `/api/exams/${examId}/questions`,
      {
        method: 'POST',
        body: JSON.stringify({ question_ids })
      }
    ),
  assignQuestionsToExam: (examId: string, question_ids: string[]) =>
    request<{ success: boolean; assignedCount: number; targetCount: number; message: string }>(
      `/api/exams/${examId}/questions`,
      {
        method: 'POST',
        body: JSON.stringify({ question_ids })
      }
    ),
  autoAssignExamQuestions: (examId: string, options?: { count?: number; subject_id?: string }) =>
    request<{ success: boolean; assigned_count: number; message: string }>(
      `/api/exams/${examId}/auto-assign`,
      {
        method: 'POST',
        body: JSON.stringify(options || {})
      }
    ),

  getExamMonitoring: (examId: string) =>
    request<{
      exam: Exam;
      metrics: { totalStudents: number; started: number; completed: number; notStarted: number };
      candidates: any[];
    }>(`/api/exams/${examId}/monitoring`),

  // Exam Engine
  startExamAttempt: (exam_id: string, student_id: string, force_reattempt?: boolean) =>
    request<{
      attempt_id: string;
      exam: Partial<Exam>;
      server_start_time: string;
      server_current_time: string;
      remaining_seconds: number;
      questions: Question[];
      saved_answers: Record<string, { selected_option: string | null; is_marked_for_review: boolean; is_visited: boolean }>;
      already_completed?: boolean;
    }>('/api/exam-engine/start', {
      method: 'POST',
      body: JSON.stringify({ exam_id, student_id, force_reattempt })
    }),

  saveAnswer: (payload: {
    attempt_id: string;
    question_id: string;
    selected_option: string | null;
    is_marked_for_review: boolean;
    is_visited: boolean;
  }) =>
    request<{ success: boolean; saved_at: string }>('/api/exam-engine/save-answer', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  recordTabSwitch: (attempt_id: string) =>
    request<{ success: boolean; tab_switches: number }>('/api/exam-engine/record-tab-switch', {
      method: 'POST',
      body: JSON.stringify({ attempt_id })
    }),

  submitExamAttempt: (attempt_id: string) =>
    request<ExamResult>('/api/exam-engine/submit', {
      method: 'POST',
      body: JSON.stringify({ attempt_id })
    }),

  // Results
  getStudentResults: (studentId: string) =>
    request<ExamResult[]>(`/api/results/student/${studentId}`),

  getAttemptResult: (attemptId: string, role?: string) => {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return request<AttemptResultResponse>(`/api/results/attempt/${attemptId}${query}`);
  },

  getExamResults: (examId: string, search?: string) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<ExamResult[]>(`/api/results/exam/${examId}${query}`);
  },

  togglePublishResult: (resultId: string) =>
    request<{ success: boolean; is_published: number; message: string }>(
      `/api/admin/results/${resultId}/toggle-publish`,
      { method: 'PUT' }
    ),

  publishExamResults: (examId: string, publish: boolean) =>
    request<{ success: boolean; is_published: number; message: string }>(
      `/api/admin/exams/${examId}/publish-results`,
      {
        method: 'PUT',
        body: JSON.stringify({ publish })
      }
    ),

  getAdminResults: (params: { exam_id?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.exam_id) query.append('exam_id', params.exam_id);
    if (params.search) query.append('search', params.search);
    return request<ExamResult[]>(`/api/results/admin?${query.toString()}`);
  },

  sendResultEmail: (resultId: string) =>
    request<{ success: boolean; sent: boolean; message: string; recipient: string }>(
      `/api/admin/results/${resultId}/send-email`,
      { method: 'POST' }
    ),

  // Settings
  getSettings: () => request<AppSettings>('/api/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    request<{ success: boolean; message: string }>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  // Verification & Gate Entry
  getVerificationExams: () =>
    request<{
      exams: VerificationExamSummary[];
      require_gate_verification: boolean;
      total_students_in_system: number;
    }>('/api/verification/exams'),

  getExamCandidates: (examId: string, search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return request<{
      exam: Exam;
      candidates: CandidateVerification[];
      stats: VerificationStats;
      require_gate_verification: boolean;
    }>(`/api/verification/exam/${examId}/candidates?${params.toString()}`);
  },

  lookupCandidate: (examId: string, identifier: string) =>
    request<{ candidate: CandidateVerification }>(
      `/api/verification/lookup?exam_id=${encodeURIComponent(examId)}&identifier=${encodeURIComponent(identifier)}`
    ),

  verifyCandidate: (payload: {
    exam_id: string;
    student_id: string;
    status: 'verified' | 'pending' | 'rejected';
    desk_notes?: string;
    seat_number?: string;
    verified_by?: string;
  }) =>
    request<{ success: boolean; message: string; verification: CandidateVerification }>('/api/verification/verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  bulkVerifyCandidates: (payload: {
    exam_id: string;
    student_ids: string[];
    status?: 'verified' | 'pending' | 'rejected';
    verified_by?: string;
  }) =>
    request<{ success: boolean; message: string }>('/api/verification/bulk-verify', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  setGateVerificationPolicy: (require_gate_verification: boolean) =>
    request<{ success: boolean; require_gate_verification: boolean; message: string }>(
      '/api/verification/policy',
      {
        method: 'POST',
        body: JSON.stringify({ require_gate_verification })
      }
    ),

  getStudentVerificationStatus: (examId: string, studentId: string) =>
    request<{
      require_gate_verification: boolean;
      status: 'verified' | 'pending' | 'rejected';
      entry_token?: string | null;
      seat_number?: string | null;
      verified_at?: string | null;
      student_roll?: string;
      student_name?: string;
    }>(`/api/verification/student-status?exam_id=${encodeURIComponent(examId)}&student_id=${encodeURIComponent(studentId)}`)
};
