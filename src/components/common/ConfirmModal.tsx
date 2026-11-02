import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Yes, Delete',
  cancelText = 'Cancel',
  isDanger = true,
  loading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  isDanger
                    ? 'bg-rose-100 text-rose-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
              >
                {isDanger ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-snug">
                  {title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Please confirm your action</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            {message}
          </p>

          <div className="mt-6 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer ${
                isDanger
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isDanger ? (
                <Trash2 className="w-3.5 h-3.5" />
              ) : null}
              <span>{loading ? 'Processing...' : confirmText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
