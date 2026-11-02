import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  X,
  ScanLine,
  RefreshCw,
  Upload,
  AlertCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  FlipHorizontal
} from 'lucide-react';

interface CameraQrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (decodedResult: string) => void;
  examName?: string;
}

export const CameraQrScannerModal: React.FC<CameraQrScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  examName
}) => {
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'bdc-qr-code-scanner-region';

  // Sound chime via Web Audio API
  const playBeep = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch {
      // Audio not permitted without interaction
    }
  };

  const startScanner = async () => {
    try {
      setScannerError(null);
      if (qrReaderRef.current) {
        try {
          await qrReaderRef.current.stop();
        } catch {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      qrReaderRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 260 }
      };

      await html5QrCode.start(
        { facingMode: cameraFacing },
        config,
        (decodedText) => {
          handleDecoded(decodedText);
        },
        (errorMessage) => {
          // Normal frame scanning progress, ignore frame misses
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Camera scan initialization notice:', err);
      setScannerError(
        err.message ||
          'Camera access was denied or is unavailable on this device. You can scan by uploading an admit card image below or enter the roll number manually.'
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (qrReaderRef.current) {
      try {
        await qrReaderRef.current.stop();
        qrReaderRef.current.clear();
      } catch {
        // ignore
      }
      qrReaderRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Slight delay to ensure element is in DOM
      const timer = setTimeout(() => {
        startScanner();
      }, 250);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, cameraFacing]);

  const handleDecoded = (decodedText: string) => {
    playBeep();
    setLastScannedCode(decodedText);

    // Call scan callback with parsed identifier
    let parsedIdentifier = decodedText;
    try {
      const parsedJson = JSON.parse(decodedText);
      if (parsedJson.roll_number) {
        parsedIdentifier = parsedJson.roll_number;
      } else if (parsedJson.token) {
        parsedIdentifier = parsedJson.token;
      }
    } catch {
      // Plain text or roll number
    }

    onScan(parsedIdentifier);
  };

  // Image File Scanner fallback
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScannerError(null);
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecoded(decodedText);
    } catch (err: any) {
      setScannerError('Could not detect a clear QR Code in the uploaded image. Please try another image.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-white flex items-center space-x-2">
                <span>Gate QR Scanner</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                  Live Camera
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {examName ? `Scanning for: ${examName}` : 'Begusarai Digital Center Gate Desk'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title={soundEnabled ? 'Mute Beep' : 'Enable Beep'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Camera Region */}
        <div className="p-5 flex flex-col items-center justify-center space-y-4">
          <div className="w-full relative rounded-2xl overflow-hidden bg-black border-2 border-indigo-500/40 shadow-inner flex items-center justify-center min-h-[290px]">
            {/* HTML5 QR Code Container */}
            <div id={readerElementId} className="w-full h-full" />

            {/* Hidden temp element for file upload scanning */}
            <div id="file-scanner-temp" className="hidden" />

            {/* Glowing scan target overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-60 h-60 border-2 border-dashed border-emerald-400/80 rounded-2xl relative animate-pulse">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-md" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-md" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-md" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-md" />
              </div>
            </div>
          </div>

          {/* Camera Controls & Switch */}
          <div className="flex items-center justify-between w-full text-xs">
            <button
              type="button"
              onClick={() => setCameraFacing(prev => (prev === 'environment' ? 'user' : 'environment'))}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-slate-700"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
              <span>Flip Camera ({cameraFacing === 'environment' ? 'Back' : 'Front'})</span>
            </button>

            {/* File Upload Fallback */}
            <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl flex items-center space-x-1.5 transition cursor-pointer border border-slate-700">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload QR Image</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Feedback or error message */}
          {scannerError && (
            <div className="w-full p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{scannerError}</span>
            </div>
          )}

          {lastScannedCode && (
            <div className="w-full p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2 truncate">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">Scanned Code: <strong>{lastScannedCode}</strong></span>
              </div>
              <span className="text-[10px] text-emerald-400 uppercase font-bold shrink-0">Processing</span>
            </div>
          )}
        </div>

        {/* Footer Guidance */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Hold the candidate's Begusarai Digital Center Admit Card QR code steady in front of the camera lens.
        </div>
      </div>
    </div>
  );
};
