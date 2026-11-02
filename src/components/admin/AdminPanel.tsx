import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { AdminDashboard } from './AdminDashboard';
import { StudentManagement } from './StudentManagement';
import { QuestionBank } from './QuestionBank';
import { BulkQuestionUpload } from './BulkQuestionUpload';
import { SubjectsTopics } from './SubjectsTopics';
import { ExamManagement } from './ExamManagement';
import { ExamMonitoring } from './ExamMonitoring';
import { AdminResults } from './AdminResults';
import { AdminSettings } from './AdminSettings';
import { GmailManager } from './GmailManager';
import { CandidateVerification } from './CandidateVerification';
import { FirebaseManager } from './FirebaseManager';
import { AIPYQManager } from './AIPYQManager';
import {
  LayoutDashboard,
  Users,
  HelpCircle,
  Upload,
  BookOpen,
  Calendar,
  Activity,
  Award,
  Settings,
  Shield,
  ChevronRight,
  LogOut,
  Menu,
  X,
  Mail,
  UserCheck,
  Database,
  Ticket,
  Sparkles,
  Wand2
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [selectedUploadExamId, setSelectedUploadExamId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai-pyq', label: 'AI PYQ & Exam Generator', icon: Sparkles },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'admit-cards', label: 'Admit Card Control', icon: Ticket },
    { id: 'questions', label: 'Question Bank', icon: HelpCircle },
    { id: 'bulk-upload', label: 'AI Upload & Organizer', icon: Wand2 },
    { id: 'subjects', label: 'Subjects & Topics', icon: BookOpen },
    { id: 'exams', label: 'Exams', icon: Calendar },
    { id: 'verification', label: 'Gate Verification', icon: UserCheck },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'results', label: 'Scores & Result Control', icon: Award },
    { id: 'firebase', label: 'Firebase Cloud Sync', icon: Database },
    { id: 'gmail', label: 'Gmail Mailer', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const currentNavItem = navItems.find((item) => item.id === activeSection) || navItems[0];
  const CurrentIcon = currentNavItem.icon;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row bg-slate-100 relative">
      {/* Mobile / Tablet Top Bar */}
      <div className="lg:hidden sticky top-16 z-30 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-800 shadow-sm">
        <div className="flex items-center space-x-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 cursor-pointer shrink-0"
            aria-label="Toggle Navigation Menu"
          >
            {sidebarOpen ? <X className="w-5 h-5 text-indigo-400" /> : <Menu className="w-5 h-5 text-indigo-400" />}
          </button>
          <div className="flex items-center space-x-2 truncate">
            <CurrentIcon className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="font-extrabold text-sm text-white truncate">{currentNavItem.label}</span>
          </div>
        </div>

        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 shrink-0">
          Admin
        </span>
      </div>

      {/* Backdrop for Mobile & Tablet when Sidebar is Open */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-35 lg:hidden transition-opacity"
        />
      )}

      {/* Admin Sidebar */}
      <aside
        className={`fixed lg:sticky top-16 left-0 z-40 w-72 sm:w-80 lg:w-64 h-[calc(100vh-64px)] bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 transition-transform duration-200 lg:translate-x-0 shadow-2xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 overflow-y-auto">
          {/* Admin Role Tag */}
          <div className="p-3 mb-4 rounded-xl bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-between">
            <div className="flex items-center space-x-3 truncate">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{user?.name || 'Administrator'}</div>
                <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">
                  CBT Head Examiner
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98] ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: Administrator Sign Out */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="px-2 py-1 text-[11px] text-slate-500 font-medium truncate">
            Session: <span className="font-mono text-slate-400">{user?.email}</span>
          </div>

          <button
            onClick={logout}
            className="w-full min-h-[44px] py-2 px-3 rounded-xl hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 text-xs font-semibold flex items-center justify-center space-x-2 transition cursor-pointer border border-transparent hover:border-rose-900/40"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        {activeSection === 'dashboard' && <AdminDashboard onNavigate={(sec) => setActiveSection(sec)} />}
        {activeSection === 'ai-pyq' && (
          <AIPYQManager
            onNavigateToExam={(examId) => setActiveSection('exams')}
            onExamCreated={(exam) => setActiveSection('exams')}
          />
        )}
        {activeSection === 'students' && <StudentManagement />}
        {activeSection === 'admit-cards' && <StudentManagement initialAdmitCardFocus={true} />}
        {activeSection === 'questions' && (
          <QuestionBank onNavigateToAIUpload={() => setActiveSection('bulk-upload')} />
        )}
        {activeSection === 'bulk-upload' && (
          <BulkQuestionUpload
            initialExamId={selectedUploadExamId || undefined}
            onUploadComplete={() => {
              setSelectedUploadExamId(null);
              setActiveSection('exams');
            }}
          />
        )}
        {activeSection === 'subjects' && <SubjectsTopics />}
        {activeSection === 'exams' && (
          <ExamManagement
            onMonitorExam={() => setActiveSection('monitoring')}
            onBulkUploadExam={(examId) => {
              setSelectedUploadExamId(examId);
              setActiveSection('bulk-upload');
            }}
          />
        )}
        {activeSection === 'verification' && <CandidateVerification />}
        {activeSection === 'monitoring' && <ExamMonitoring />}
        {activeSection === 'results' && <AdminResults />}
        {activeSection === 'firebase' && <FirebaseManager />}
        {activeSection === 'gmail' && <GmailManager />}
        {activeSection === 'settings' && <AdminSettings />}
      </main>
    </div>
  );
};
