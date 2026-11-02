import React, { useState, useRef } from 'react';
import { uploadImageToDrive } from '../../lib/googleDrive';
import {
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Loader2,
  HardDrive
} from 'lucide-react';

interface DriveImageUploaderProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  compact?: boolean;
}

export const DriveImageUploader: React.FC<DriveImageUploaderProps> = ({
  label = 'Question Diagram / Image',
  value,
  onChange,
  helperText = 'Image will be uploaded directly to your Google Drive to save Firebase storage quota.',
  compact = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WEBP, SVG, GIF)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Image file size must be less than 15MB');
      return;
    }

    setError(null);
    setStatusMsg(null);
    setUploading(true);

    try {
      const result = await uploadImageToDrive(file);
      onChange(result.directUrl);
      setStatusMsg(
        result.provider === 'google_drive'
          ? 'Uploaded to Google Drive "Pariksha CBT Exam Images"!'
          : 'Image saved safely (Zero Firebase Storage).'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : 'text-xs'}`}>
      <div className="flex items-center justify-between">
        <label className="font-bold text-slate-700 flex items-center space-x-1.5">
          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
          <span>{label}</span>
        </label>
        <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          <HardDrive className="w-3 h-3 text-emerald-600" />
          <span>Google Drive Cloud Storage (Zero Firebase Cost)</span>
        </span>
      </div>

      {helperText && !compact && (
        <p className="text-[11px] text-slate-500 leading-relaxed">
          {helperText}
        </p>
      )}

      {/* Main Upload / URL Box */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          {/* File Input Trigger */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs shadow-2xs transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 shrink-0"
          >
            {uploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading to Drive...</span>
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5" />
                <span>Upload to Google Drive</span>
              </>
            )}
          </button>

          {/* Direct URL input as alternative */}
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste direct image URL (Google Drive, ImgBB, etc.)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs bg-white focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono"
          />

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setStatusMsg(null);
                setError(null);
              }}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Feedback Notices */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center space-x-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {statusMsg && (
          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{statusMsg}</span>
          </div>
        )}

        {/* Live Image Thumbnail Preview */}
        {value && (
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={value}
                  alt="Diagram Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="truncate">
                <span className="font-mono text-[11px] text-slate-800 font-bold truncate block">
                  {value}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  Preview Active • Stored outside Firebase
                </span>
              </div>
            </div>

            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center space-x-1 transition shrink-0"
            >
              <span>View Full</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
