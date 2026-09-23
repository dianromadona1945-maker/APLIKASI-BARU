import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Download,
  Printer,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Info,
  ExternalLink,
} from 'lucide-react';
import { StudentDocument, Student, VerificationStatus, UserRole } from '../types';

interface DocumentPreviewModalProps {
  document: StudentDocument | null;
  student?: Student;
  onClose: () => void;
  onVerify?: (docId: string, status: VerificationStatus, notes?: string) => void;
  currentUserRole?: UserRole;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  student,
  onClose,
  onVerify,
  currentUserRole,
}) => {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  if (!document) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${document.title} - ${student?.name || ''}</title>
            <style>
              body { margin: 0; display: flex; justify-content: center; align-items: center; background: white; }
              img { max-width: 100%; height: auto; }
            </style>
          </head>
          <body>
            <img src="${document.fileDataUrl}" onload="window.print();window.close();" />
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const isVerified = document.verificationStatus === 'verified';
  const isPending = document.verificationStatus === 'pending';
  const isRevision = document.verificationStatus === 'revision';

  return (
    <div className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-between overflow-hidden">
      {/* Top Navbar */}
      <div className="px-6 py-3 bg-slate-900/90 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-600/30 text-blue-400">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm sm:text-base text-white">{document.title}</h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Terarsip
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {document.fileName} • {student ? `${student.name} (${student.classRoom})` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <div className="hidden sm:flex items-center bg-slate-800 rounded-lg p-1 space-x-1">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono px-2 text-slate-300">{zoom}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="Putar 90 Derajat"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleReset}
              className="px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition"
              title="Reset Tampilan"
            >
              Reset
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Cetak Dokumen"
          >
            <Printer className="w-5 h-5" />
          </button>

          <a
            href={document.fileDataUrl}
            download={document.fileName}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Unduh Berkas Ini"
          >
            <Download className="w-5 h-5" />
          </a>

          <button
            onClick={() => setShowInfo(!showInfo)}
            className={`p-2 rounded-lg transition ${
              showInfo ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Info & Verifikasi"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Tutup Preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Preview Workspace */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* Document Canvas */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-900/60">
          <div
            className="transition-transform duration-200 shadow-2xl rounded-lg overflow-hidden bg-white max-w-full"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            {document.fileType.includes('image') || document.fileDataUrl.startsWith('data:image') ? (
              <img
                src={document.fileDataUrl}
                alt={document.title}
                className="max-h-[82vh] w-auto object-contain block mx-auto pointer-events-none select-none"
              />
            ) : (
              <iframe
                src={document.fileDataUrl}
                title={document.title}
                className="w-[750px] h-[85vh] border-0"
              />
            )}
          </div>
        </div>

        {/* Sidebar details */}
        {showInfo && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 text-white p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Rincian Dokumen</h4>
                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Nama Berkas:</span>
                    <span className="font-mono text-slate-200 break-all">{document.fileName}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Diunggah Oleh:</span>
                    <span className="text-slate-200">{document.uploadedBy}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <span className="text-slate-400 block text-[10px]">Waktu Upload:</span>
                    <span className="text-slate-200">{new Date(document.uploadedAt).toLocaleString('id-ID')}</span>
                  </div>

                  {document.notes && (
                    <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                      <span className="text-slate-400 block text-[10px]">Catatan Verifikasi:</span>
                      <span className="text-slate-200 italic">{document.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Student quick check info */}
              {student && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pencocokan Identitas</h4>
                  <div className="mt-2.5 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Nama Siswa:</span>
                      <span className="font-semibold text-slate-200">{student.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NISN:</span>
                      <span className="font-mono font-bold text-blue-400">{student.nisn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NIK:</span>
                      <span className="font-mono font-bold text-slate-200">{student.nik}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Kelas:</span>
                      <span className="text-slate-200">{student.classRoom}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
              Arsip Digital Resmi SMP &amp; SMK Al-Tafaqquh Fiddin
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
