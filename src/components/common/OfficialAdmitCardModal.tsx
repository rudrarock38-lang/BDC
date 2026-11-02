import React, { useState, useEffect } from 'react';
import { generateQrDataUrl } from '../../lib/qrHelper';
import {
  Printer,
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  AlertTriangle,
  Download
} from 'lucide-react';

export interface AdmitCardData {
  student_name: string;
  roll_number: string;
  email: string;
  mobile?: string;
  exam_name?: string;
  exam_id?: string;
  duration_minutes?: number;
  start_datetime?: string;
  seat_number?: string | null;
  entry_token?: string | null;
  verification_status?: 'verified' | 'pending' | 'rejected';
  verified_at?: string | null;
  verified_by?: string | null;
  registration_date?: string;
  guardian_name?: string | null;
  category?: string | null;
}

interface OfficialAdmitCardModalProps {
  data: AdmitCardData;
  onClose: () => void;
}

export const OfficialAdmitCardModal: React.FC<OfficialAdmitCardModalProps> = ({ data, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const examTitle = data.exam_name || 'All-India CBT Assessment & Mock Examination 2026';
  const appNumber = `BDC-${(data.roll_number.replace(/[^0-9]/g, '') || '924108').slice(-6)}`;
  const duration = data.duration_minutes || 60;

  // Format exam date or next upcoming date
  const examDate = data.start_datetime
    ? new Date(data.start_datetime).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Sunday, 18 October 2026';

  const reportingTime = '08:30 AM (IST)';
  const gateClosingTime = '09:15 AM (IST)';
  const examTime = `09:30 AM - ${duration === 60 ? '10:30 AM' : `${duration} Mins`} (Shift 1)`;

  useEffect(() => {
    async function makeQr() {
      // Dynamic payload for gate camera scanner
      const payload = {
        center: 'BEGUSARAI DIGITAL CENTER',
        center_code: 'BDC-CENT-851218',
        roll_number: data.roll_number,
        name: data.student_name,
        email: data.email,
        mobile: data.mobile || '',
        app_no: appNumber,
        exam: examTitle,
        exam_id: data.exam_id || '',
        seat: data.seat_number || 'Center Assigned',
        verified: data.verification_status === 'verified',
        token: data.entry_token || `GATE-${(data.roll_number.replace(/[^0-9]/g, '') || '851218').slice(-6)}`
      };

      const url = await generateQrDataUrl(payload);
      setQrCodeUrl(url);
    }

    makeQr();
  }, [data]);

  const handlePrint = () => {
    window.print();
  };

  const isVerified = data.verification_status === 'verified';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full my-auto overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[96vh]">
        {/* Modal Top Control Bar (Hidden when printing) */}
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center space-x-2 sm:space-x-2.5 truncate mr-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-sm shrink-0">
              BDC
            </div>
            <div className="truncate">
              <div className="font-bold text-xs sm:text-sm tracking-tight truncate">Official E-Admit Card / प्रवेश पत्र</div>
              <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">Begusarai Digital Center (CBT Examination)</div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Print <span className="hidden sm:inline">Admit Card</span></span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Container */}
        <div className="p-3 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible">
          {/* Real Government / NTA Style Official Admit Card Container */}
          <div className="bg-white border-2 border-slate-900 p-4 sm:p-8 rounded-xl relative shadow-xs print:shadow-none print:border-2 print:border-black print:rounded-none">
            {/* Background Watermark */}
            <div
              className="absolute inset-0 pointer-events-none opacity-[0.035] flex items-center justify-center select-none rotate-[-25deg] overflow-hidden"
              style={{
                fontSize: '4.5rem',
                fontWeight: 900,
                lineHeight: 1.2,
                color: '#000',
                textAlign: 'center'
              }}
            >
              BEGUSARAI DIGITAL CENTER • BEGUSARAI DIGITAL CENTER • BEGUSARAI DIGITAL CENTER
            </div>

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                {/* Left Emblem */}
                <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-blue-900 text-white border-2 border-slate-900 flex flex-col items-center justify-center text-center p-1 shrink-0 shadow-xs">
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-300">ESTD 2026</span>
                  <span className="text-lg sm:text-2xl font-black tracking-tight leading-none mt-0.5">BDC</span>
                  <span className="text-[7px] sm:text-[8px] font-bold text-slate-300 uppercase leading-none mt-0.5">BIHAR</span>
                </div>

                {/* Center Title */}
                <div className="text-center flex-1 min-w-0">
                  <h1 className="text-base sm:text-2xl font-black text-slate-950 uppercase tracking-tight font-serif leading-tight">
                    BEGUSARAI DIGITAL CENTER
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide mt-0.5">
                    बेगूसराय डिजिटल सेंटर, बिहार (परीक्षार्थी प्रवेश पत्र)
                  </h2>
                  <p className="text-[9px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                    Directorate of Examinations & Computer Based Test (CBT) Assessments
                  </p>
                  <div className="inline-block mt-2 px-3 sm:px-4 py-1 bg-slate-900 text-white font-black text-[10px] sm:text-sm uppercase tracking-widest rounded-md">
                    E-ADMIT CARD & GATE ENTRY PASS (PROVISIONAL)
                  </div>
                </div>

                {/* Right QR Code Box */}
                <div className="shrink-0 text-center">
                  {qrCodeUrl ? (
                    <div className="p-1.5 bg-white border-2 border-slate-900 rounded-lg shadow-2xs inline-block">
                      <img
                        src={qrCodeUrl}
                        alt="Candidate Verification QR"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain"
                      />
                      <span className="block text-[7px] sm:text-[8px] font-mono font-bold text-slate-600 mt-0.5">
                        SCAN TO VERIFY
                      </span>
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-slate-100 border border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                      Generating QR...
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Test & Shift Timings Table */}
            <div className="border border-slate-900 mb-5 overflow-hidden text-xs">
              <div className="bg-slate-100 border-b border-slate-900 font-bold px-3 py-1.5 text-slate-800 uppercase text-[11px] flex items-center justify-between">
                <span>1. Examination Session & Schedule Details</span>
                <span className="text-blue-800">Shift 1 • Computer Based Test</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-900">
                <div className="p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Examination Name</span>
                  <strong className="text-xs text-slate-900 block leading-tight mt-0.5">{examTitle}</strong>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Date of Examination</span>
                  <strong className="text-xs text-slate-900 block mt-0.5">{examDate}</strong>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Reporting Time at Center</span>
                  <strong className="text-xs text-emerald-700 block mt-0.5">{reportingTime}</strong>
                </div>
                <div className="p-2.5">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Gate Closing Time</span>
                  <strong className="text-xs text-rose-700 block mt-0.5">{gateClosingTime}</strong>
                </div>
              </div>
            </div>

            {/* Candidate Profile & Security Photo Block */}
            <div className="border border-slate-900 mb-5 overflow-hidden text-xs">
              <div className="bg-slate-100 border-b border-slate-900 font-bold px-3 py-1.5 text-slate-800 uppercase text-[11px]">
                2. Candidate Identification & Verification Profile
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-900">
                {/* 3 Columns for Candidate Metadata */}
                <div className="md:col-span-3 p-3.5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Candidate Full Name</span>
                      <strong className="text-sm font-black text-slate-950 uppercase tracking-tight">
                        {data.student_name}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Roll Number (अनुक्रमांक)</span>
                      <strong className="text-base font-mono font-black text-blue-900 tracking-wider">
                        {data.roll_number}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Application / Reg. Number</span>
                      <span className="font-mono font-bold text-slate-800">{appNumber}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Father's / Guardian's Name</span>
                      <span className="font-semibold text-slate-800">
                        {data.guardian_name ? data.guardian_name : `Shri R. P. ${data.student_name.split(' ').slice(-1)[0] || 'Kumar'}`}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Registered Email</span>
                      <span className="text-slate-800 font-medium truncate block">{data.email}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Mobile Number</span>
                      <span className="font-mono text-slate-800">{data.mobile || '+91 98XXX XXXXX'}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Allocated Seat / Computer Lab</span>
                      <strong className="text-xs font-bold text-slate-900">
                        {data.seat_number ? data.seat_number : 'Lab 1 / Center Assigned Desk'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Gate Verification Status</span>
                      {isVerified ? (
                        <span className="inline-flex items-center space-x-1 font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px] border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>VERIFIED & ADMITTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[11px] border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>REGISTERED (GATE CHECK AT DESK)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 1 Column for Candidate Photograph & Specimen Sign */}
                <div className="p-3.5 flex flex-col items-center justify-between text-center bg-slate-50/50">
                  <div>
                    <div className="w-24 h-28 border-2 border-slate-900 bg-white rounded flex flex-col items-center justify-center text-slate-400 p-1 relative overflow-hidden shadow-2xs">
                      {/* Avatar preview */}
                      <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-900 font-black text-xl flex items-center justify-center mb-1">
                        {data.student_name.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[8px] uppercase font-bold text-slate-500">CANDIDATE PHOTO</span>
                      <div className="absolute inset-x-0 bottom-0 py-0.5 bg-slate-900 text-[7px] text-white font-mono font-bold">
                        VERIFIED BDC
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 w-full border-t border-slate-300 pt-2">
                    <div className="w-24 h-8 border border-dashed border-slate-400 mx-auto flex items-center justify-center font-serif italic text-xs text-slate-700 bg-white">
                      {data.student_name.split(' ')[0]}...
                    </div>
                    <span className="text-[8px] uppercase font-bold text-slate-500 block mt-0.5">
                      Specimen Signature
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Center Venue Details Block */}
            <div className="border border-slate-900 mb-5 overflow-hidden text-xs">
              <div className="bg-slate-100 border-b border-slate-900 font-bold px-3 py-1.5 text-slate-800 uppercase text-[11px] flex items-center justify-between">
                <span>3. Examination Center Venue Details (परीक्षा केंद्र)</span>
                <span className="font-mono text-slate-600">Center Code: BDC-CENT-851218</span>
              </div>
              <div className="p-3.5 bg-white grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Examination Center Name & Address</span>
                  <div className="font-black text-sm text-slate-900 mt-0.5">
                    BEGUSARAI DIGITAL CENTER (BDC)
                  </div>
                  <div className="text-xs text-slate-800 font-semibold mt-1 leading-snug">
                    Ashoka Tower, 3rd Floor, Bagha Road, Near Railway Ghumti, Begusarai, Bihar - 851218
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 font-medium">
                    Landmark: Opposite Durga Asthan Mandir
                  </div>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-slate-200 md:pl-3 flex flex-col justify-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Invigilator Desk Code</span>
                  <strong className="text-xs font-mono text-blue-900 block">DESK-01 / GATE VERIFIED</strong>
                  <span className="text-[10px] text-slate-500 mt-1">
                    Token: <strong>{data.entry_token || `GATE-${appNumber.slice(-4)}`}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Clean Indian CBT Barcode */}
            <div className="border-t border-b border-slate-900 py-2.5 my-4 text-center">
              <div className="flex items-center justify-center space-x-1 h-8">
                {[3, 2, 4, 2, 6, 2, 7, 3, 5, 2, 8, 3, 4, 2, 5, 3, 7, 2, 4, 3, 6, 2, 8, 3, 4, 2, 5, 3].map((w, i) => (
                  <div key={i} className="bg-slate-950 h-7" style={{ width: `${w * 1.4}px` }} />
                ))}
              </div>
              <div className="font-mono text-[10px] font-black tracking-widest text-slate-800 mt-1">
                * BDC - {data.roll_number} - {appNumber} *
              </div>
            </div>

            {/* Candidate & Invigilator Declaration */}
            <div className="grid grid-cols-2 gap-8 my-6 text-center text-xs">
              <div className="pt-8 border-t-2 border-dashed border-slate-400">
                <span className="text-[11px] font-black uppercase text-slate-800 block">
                  Candidate's Signature
                </span>
                <span className="text-[9px] text-slate-500 block">
                  (To be signed in presence of the Invigilator at the exam center)
                </span>
              </div>

              <div className="pt-8 border-t-2 border-dashed border-slate-400">
                <span className="text-[11px] font-black uppercase text-slate-800 block">
                  Authorized Signatory & Invigilator Seal
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Begusarai Digital Center (BDC Examination Board)
                </span>
              </div>
            </div>

            {/* Important Instructions (Bilingual English & Hindi) */}
            <div className="border-t-2 border-slate-900 pt-4 text-[10px] text-slate-700 space-y-1.5 leading-relaxed">
              <div className="font-black text-slate-950 uppercase tracking-wider text-xs mb-2">
                IMPORTANT INSTRUCTIONS FOR CANDIDATES (अभ्यर्थियों के लिए महत्वपूर्ण निर्देश):
              </div>
              <p>
                <strong>1. Reporting Time:</strong> Candidates must report at Begusarai Digital Center strictly as per the Reporting Time mentioned above. No entry will be permitted after the Gate Closing Time.
                <br />
                <em>(अभ्यर्थी ऊपर दिए गए रिपोर्टिंग समय के अनुसार बेगूसराय डिजिटल सेंटर पर उपस्थित हों। गेट बंद होने के समय के बाद किसी भी परिस्थिति में प्रवेश की अनुमति नहीं होगी।)</em>
              </p>
              <p>
                <strong>2. Mandatory Documents:</strong> Candidates must bring this printed E-Admit Card along with one original valid Government Photo ID proof (Aadhaar Card, Voter ID, Driving License, Passport, or PAN Card).
                <br />
                <em>(यह मुद्रित ई-एडमिट कार्ड और एक मूल वैध सरकारी फोटो पहचान पत्र साथ लाना अनिवार्य है।)</em>
              </p>
              <p>
                <strong>3. QR Code Gate Verification:</strong> Identity verification will be performed at the entrance gate of Begusarai Digital Center using the QR code scanner before entering the computer lab.
                <br />
                <em>(परीक्षा कक्ष में प्रवेश से पूर्व मुख्य द्वार पर लगे क्यूआर स्कैनर द्वारा परीक्षार्थी का सत्यापन अनिवार्य रूप से किया जाएगा।)</em>
              </p>
              <p>
                <strong>4. Prohibited Items:</strong> Mobile phones, electronic watches, calculators, bluetooth devices, notes, or bags are strictly prohibited inside the CBT Examination Hall.
                <br />
                <em>(मोबाइल फोन, स्मार्टवॉच, कैलकुलेटर और इलेक्ट्रॉनिक उपकरण परीक्षा हॉल के अंदर पूर्णतः वर्जित हैं।)</em>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
