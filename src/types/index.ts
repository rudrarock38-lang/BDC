export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  roll_number: string;
  role: 'admin' | 'student';
  status: 'active' | 'inactive';
  dob?: string;
  gender?: string;
  category?: string;
  guardian_name?: string;
  address?: string;
  qualification?: string;
  target_exam?: string;
  avatar_url?: string;
  assigned_exam_id?: string | null;
  assigned_exam_name?: string | null;
  seat_number?: string | null;
  admit_card_enabled?: boolean | number;
  email_verified?: boolean | number;
  created_at: string;
}

export interface StudentProfileStats {
  total_tests: number;
  avg_percentage: number;
  best_percentage: number;
  latest_test?: {
    final_score: number;
    total_questions: number;
    percentage: number;
    accuracy: number;
    created_at: string;
    exam_name: string;
  } | null;
  verification_status: string;
  seat_number?: string | null;
  entry_token?: string | null;
}

export interface StudentProfileResponse {
  profile: User;
  stats: StudentProfileStats;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description: string;
  topic_count?: number;
  question_count?: number;
  created_at: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  name: string;
  description?: string;
  subject_name?: string;
  question_count?: number;
  created_at: string;
}

export interface Question {
  id: string;
  question_id_code: string;
  subject_id: string;
  topic_id?: string | null;
  subject_name?: string;
  topic_name?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: string;
  question_en: string;
  question_hi?: string;
  option_a_en: string;
  option_a_hi?: string;
  option_b_en: string;
  option_b_hi?: string;
  option_c_en: string;
  option_c_hi?: string;
  option_d_en: string;
  option_d_hi?: string;
  correct_answer: 'A' | 'B' | 'C' | 'D';
  marks: number;
  negative_marks: number;
  explanation?: string;
  explanation_hi?: string;
  pyq_exam?: string | null;
  pyq_year?: number | null;
  pyq_shift?: string | null;
  language_mode?: string | null;
  image_url?: string | null;
  option_a_image_url?: string | null;
  option_b_image_url?: string | null;
  option_c_image_url?: string | null;
  option_d_image_url?: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  name: string;
  description: string;
  exam_category?: string | null;
  target_year?: string | null;
  language_mode?: string | null;
  subject_id?: string | null;
  subject_name?: string;
  duration_minutes: number;
  total_questions: number;
  total_marks: number;
  negative_marks: number;
  start_datetime: string;
  end_datetime: string;
  status: 'draft' | 'scheduled' | 'live' | 'completed';
  instructions?: string;
  show_result_immediately: number;
  results_published?: number;
  created_at: string;
  question_count?: number;
  attempt_count?: number;
  questions?: Question[];
  student_attempt_status?: 'not_started' | 'in_progress' | 'completed';
  student_attempt_id?: string | null;
  student_final_score?: number | null;
  student_percentage?: number | null;
  is_assigned_to_student?: boolean;
  student_seat_number?: string | null;
  admit_card_enabled?: boolean | number;
  allow_reattempt?: boolean | number;
  max_attempts?: number;
  can_reattempt?: boolean;
  completed_attempts_count?: number;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  email?: string;
  start_time: string;
  submit_time?: string | null;
  status: 'in_progress' | 'completed';
  remaining_seconds: number;
  tab_switches: number;
  answered_count?: number;
  final_score?: number | null;
  percentage?: number | null;
  created_at: string;
}

export interface SavedAnswer {
  selected_option: string | null;
  is_marked_for_review: boolean;
  is_visited: boolean;
}

export interface ExamResult {
  id: string;
  attempt_id: string;
  exam_id: string;
  student_id: string;
  student_name?: string;
  roll_number?: string;
  email?: string;
  mobile?: string;
  exam_name?: string;
  subject_name?: string;
  total_questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks_obtained: number;
  negative_marks_deducted: number;
  final_score: number;
  percentage: number;
  accuracy: number;
  time_taken_seconds: number;
  rank: number;
  is_published?: number;
  results_published?: number;
  created_at: string;
}

export interface QuestionBreakdownItem extends Question {
  sort_order: number;
  status: 'correct' | 'wrong' | 'unanswered';
  student_answer: string | null;
  is_marked_for_review: number;
}

export interface SubjectScore {
  subject_id: string;
  subject_name: string;
  subject_code?: string;
  total_questions: number;
  attempted: number;
  correct: number;
  wrong: number;
  unanswered: number;
  marks_obtained: number;
  negative_marks_deducted: number;
  final_score: number;
  max_marks: number;
  percentage: number;
  accuracy: number;
}

export interface DifficultyScore {
  difficulty: 'easy' | 'medium' | 'hard';
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  accuracy: number;
}

export interface AttemptAnalytics {
  avg_time_per_question_seconds: number;
  strongest_subject: string | null;
  weakest_subject: string | null;
  accuracy_rating: 'excellent' | 'good' | 'average' | 'needs_improvement';
  negative_penalty_impact: number;
  recommendations: string[];
}

export interface AttemptResultResponse {
  result: ExamResult;
  breakdown: QuestionBreakdownItem[];
  subject_breakdown: SubjectScore[];
  difficulty_breakdown: DifficultyScore[];
  analytics: AttemptAnalytics;
}

export interface AppSettings {
  site_name: string;
  logo_text: string;
  default_duration: string;
  default_marks: string;
  default_negative_marks: string;
  result_visibility: string;
  registration_enabled: string;
  [key: string]: string;
}

export interface CandidateVerification {
  verification_id: string;
  exam_id: string;
  exam_name?: string;
  all_registered_exams?: Array<{
    exam_id: string;
    exam_name: string;
    verification_status: string;
    seat_number?: string;
    entry_token?: string;
  }>;
  student_id: string;
  student_name: string;
  roll_number: string;
  email: string;
  mobile?: string;
  category?: string;
  gender?: string;
  guardian_name?: string;
  is_registered?: boolean;
  registration_status?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string | null;
  verified_by?: string | null;
  entry_token?: string | null;
  desk_notes?: string | null;
  seat_number?: string | null;
  registered_at?: string;
  attempt_status?: 'not_started' | 'in_progress' | 'completed';
  attempt_start_time?: string | null;
}

export interface VerificationStats {
  total: number;
  verified: number;
  pending: number;
  rejected: number;
}

export interface VerificationExamSummary extends Exam {
  total_registered: number;
  total_verified: number;
  total_pending: number;
  total_rejected: number;
  require_gate_verification: boolean;
}

