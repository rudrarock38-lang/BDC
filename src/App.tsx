import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { AdminLoginModal } from './components/common/AdminLoginModal';
import { StudentDashboard } from './components/student/StudentDashboard';
import { CBTExamScreen } from './components/student/CBTExamScreen';
import { ExamInstructions } from './components/student/ExamInstructions';
import { ExamResultView } from './components/student/ExamResultView';
import { StudentAuthPage } from './components/student/StudentAuthPage';
import { StudentProfileView } from './components/student/StudentProfileView';
import { AdminPanel } from './components/admin/AdminPanel';
import { Exam, ExamResult } from './types';
import { Lock } from 'lucide-react';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeView, setActiveView] = useState<'dashboard' | 'instructions' | 'exam' | 'result' | 'profile'>('dashboard');
  const [currentExam, setCurrentExam] = useState<Exam | null>(null);
  const [currentAttemptId, setCurrentAttemptId] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'student' | 'admin'>('student');

  // Dedicated Admin Login Modal state
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  // If user logs out, reset view
  useEffect(() => {
    if (!user) {
      setActivePanel('student');
      setActiveView('dashboard');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-slate-600 tracking-wider uppercase">Loading Examination Portal...</p>
        </div>
      </div>
    );
  }

  // 1. CBT Active Exam Screen (Exclusive Full-Screen Interface)
  if (activeView === 'exam' && currentExam) {
    return (
      <CBTExamScreen
        exam={currentExam}
        onExamSubmitted={(result: ExamResult) => {
          setCurrentAttemptId(result.attempt_id);
          setActiveView('result');
        }}
        onExitExam={() => {
          setActiveView('dashboard');
          setCurrentExam(null);
        }}
      />
    );
  }

  const isUserAdmin = user?.role === 'admin';
  const showAdminPanel = isUserAdmin && activePanel === 'admin';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        activePanel={activePanel}
        isProfileActive={activeView === 'profile'}
        onOpenStudentProfile={() => setActiveView(activeView === 'profile' ? 'dashboard' : 'profile')}
        onLogoClick={() => setActiveView('dashboard')}
      />

      <div className="flex-1">
        {/* If Not Logged In, Show Dedicated Student Login & Registration Portal */}
        {!user ? (
          <StudentAuthPage
            onSuccess={() => {
              setActivePanel('student');
              setActiveView('dashboard');
            }}
          />
        ) : showAdminPanel ? (
          /* 2. DEDICATED ADMIN PANEL (Only accessible via discreet admin login) */
          <AdminPanel />
        ) : (
          /* 3. DEDICATED STUDENT VIEWS (Pure Student Experience - Zero Admin Options) */
          <div>
            {activeView === 'dashboard' && (
              <StudentDashboard
                onStartExam={(exam) => {
                  setCurrentExam(exam);
                  setActiveView('instructions');
                }}
                onViewResult={(attemptId) => {
                  setCurrentAttemptId(attemptId);
                  setActiveView('result');
                }}
              />
            )}

            {activeView === 'profile' && (
              <StudentProfileView
                onBackToDashboard={() => setActiveView('dashboard')}
              />
            )}

            {activeView === 'instructions' && currentExam && (
              <ExamInstructions
                exam={currentExam}
                onBack={() => {
                  setActiveView('dashboard');
                  setCurrentExam(null);
                }}
                onProceed={() => {
                  setActiveView('exam');
                }}
              />
            )}

            {activeView === 'result' && currentAttemptId && (
              <ExamResultView
                attemptId={currentAttemptId}
                onBackToDashboard={() => {
                  setActiveView('dashboard');
                  setCurrentExam(null);
                  setCurrentAttemptId(null);
                }}
                onReattemptExam={(exam) => {
                  setCurrentExam(exam);
                  setActiveView('instructions');
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Clean Footer (Zero admin buttons when logged in) */}
      <footer className="mt-auto py-5 bg-white border-t border-slate-200 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2">
            <span>© 2026 Begusarai Digital Center (BDC). All rights reserved.</span>
            <span className="hidden md:inline text-slate-300">|</span>
            <span className="hidden md:inline text-slate-400 font-mono text-[11px]">CBT Examination Portal v3.0</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-[11px] text-slate-400">
              Exam Hall Mode: Anti-Tamper Enabled
            </span>
            {/* Admin Login logo/icon only on the bottom right side */}
            {!user && (
              <button
                type="button"
                onClick={() => setAdminModalOpen(true)}
                className="text-slate-400 hover:text-purple-700 transition flex items-center cursor-pointer p-1 rounded-md hover:bg-slate-100"
                aria-label="Admin Access"
              >
                <Lock className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Dedicated Admin Login Modal */}
      <AdminLoginModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onSuccess={() => {
          setActivePanel('admin');
          setActiveView('dashboard');
          setAdminModalOpen(false);
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
