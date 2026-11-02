import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, GraduationCap, LogOut, Lock, User, ChevronDown } from 'lucide-react';

interface NavbarProps {
  activePanel?: 'student' | 'admin';
  isExamInProgress?: boolean;
  onOpenStudentProfile?: () => void;
  isProfileActive?: boolean;
  onLogoClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePanel = 'student',
  isExamInProgress,
  onOpenStudentProfile,
  isProfileActive,
  onLogoClick
}) => {
  const { user, logout } = useAuth();

  if (isExamInProgress) {
    return null;
  }

  const isAdminConsoleActive = user?.role === 'admin' && activePanel === 'admin';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand / Logo */}
          <div
            onClick={onLogoClick}
            className={`flex items-center space-x-2.5 sm:space-x-3 ${onLogoClick ? 'cursor-pointer hover:opacity-90 transition' : ''}`}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center font-black text-base sm:text-lg shadow-sm tracking-tight border-2 border-blue-500 shrink-0">
              BDC
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-sm xs:text-base sm:text-lg text-slate-900 tracking-tight whitespace-nowrap">
                  BEGUSARAI <span className="text-blue-700 font-black">DIGITAL CENTER</span>
                </span>
                <span className="hidden md:inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                  {isAdminConsoleActive ? 'Admin Console' : isProfileActive ? 'Candidate Profile' : 'CBT Examination Portal'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">
                Online Examination System & Assessment Portal • Begusarai (Bihar)
              </p>
            </div>
          </div>

          {/* User Profile & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {isAdminConsoleActive ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="hidden md:flex items-center space-x-1.5 bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <Shield className="w-4 h-4 text-purple-700 shrink-0" />
                  <span>Admin Console</span>
                </div>

                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs sm:text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <span>{user?.name}</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider bg-purple-100 text-purple-800">
                      Admin
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {user?.email}
                  </span>
                </div>

                <button
                  onClick={logout}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer"
                  title="Sign Out from Admin Console"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : user ? (
              /* Candidate View Profile Option */
              <div className="flex items-center space-x-2 sm:space-x-3">
                <button
                  type="button"
                  onClick={onOpenStudentProfile}
                  className={`flex items-center space-x-2 sm:space-x-2.5 px-2.5 sm:px-3 py-1.5 min-h-[44px] rounded-xl border transition cursor-pointer shadow-xs group ${
                    isProfileActive
                      ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300 text-slate-800 active:bg-slate-100'
                  }`}
                  title="Candidate Profile & Settings"
                >
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-xs transition ${
                    isProfileActive ? 'bg-white text-blue-600' : 'bg-blue-600 group-hover:bg-blue-700 text-white'
                  }`}>
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <div className="flex flex-col items-start leading-tight text-left max-w-[85px] xs:max-w-[110px] sm:max-w-[140px]">
                    <div className="flex items-center space-x-1 sm:space-x-1.5 w-full">
                      <span className="text-xs font-bold truncate">{user.name}</span>
                      <span className={`hidden xs:inline-block text-[9px] font-extrabold px-1.5 py-0.2 rounded shadow-xs uppercase tracking-wider shrink-0 ${
                        isProfileActive ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'
                      }`}>
                        Profile
                      </span>
                    </div>
                    <span className={`text-[9px] sm:text-[10px] font-mono truncate w-full ${isProfileActive ? 'text-blue-100' : 'text-slate-500'}`}>
                      {user.roll_number || user.email}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 transition shrink-0 ${isProfileActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
                </button>

                <button
                  onClick={logout}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:bg-rose-100 rounded-xl transition-colors border border-slate-200 hover:border-rose-200 cursor-pointer shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 flex items-center space-x-1.5 min-h-[44px]">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  <span>Student Portal</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
