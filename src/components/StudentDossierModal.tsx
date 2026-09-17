import React, { useState, useRef } from 'react';
import {
  X,
  User,
  FileText,
  Upload,
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck2,
  Sparkles,
  Archive,
  RefreshCw,
  Plus,
  Shield,
  Phone,
  MapPin,
  Calendar,
  Hash,
  Award,
  CreditCard,
  GraduationCap,
  Users as UsersIcon,
  FolderOpen,
  Camera,
} from 'lucide-react';
import { Student, StudentDocument, DocumentType, VerificationStatus, UserRole, User as UserType } from '../types';
import { DOCUMENT_CONFIGS } from '../data/constants';
import { calculateCompleteness } from '../services/storage';
import { generateSampleDocumentDataUrl } from '../utils/documentGenerator';
import { downloadStudentZip, triggerDownload } from '../utils/zipExport';
import { DocumentUploadModal } from './DocumentUploadModal';

interface StudentDossierModalProps {
  student: Student | null;
  documents: StudentDocument[];
  onClose: () => void;
  onUploadDocument: (docData: Omit<StudentDocument, 'id' | 'uploadedAt' | 'version'>) => void;
  onDeleteDocument: (docId: string, docTitle: string) => void;
  onVerifyDocument: (docId: string, status: VerificationStatus, notes?: string) => void;
  onPreviewDocument: (doc: StudentDocument) => void;
  currentUser: UserType;
}

export const StudentDossierModal: React.FC<StudentDossierModalProps> = ({
  student,
  documents,
  onClose,
  onUploadDocument,
  onDeleteDocument,
  onVerifyDocument,
  onPreviewDocument,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'history'>('documents');
  const [selectedUploadType, setSelectedUploadType] = useState<DocumentType | null>(null);
  const [verificationModalDoc, setVerificationModalDoc] = useState<StudentDocument | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationStatusToSet, setVerificationStatusToSet] = useState<VerificationStatus>('verified');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [targetUploadDocType, setTargetUploadDocType] = useState<DocumentType>('kk');
  const [uploadModalDocType, setUploadModalDocType] = useState<DocumentType | null>(null);

  if (!student) return null;

  const studentDocs = documents.filter((d) => d.studentId === student.id);
  const completeness = calculateCompleteness(student, documents);

  // Handle local file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const typeConfig = DOCUMENT_CONFIGS[targetUploadDocType];

      onUploadDocument({
        studentId: student.id,
        docType: targetUploadDocType,
        title: `${typeConfig.title} - ${student.name}`,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileDataUrl: dataUrl,
        uploadedBy: `${currentUser.name} (${currentUser.role})`,
        verificationStatus: 'pending',
        notes: 'Dokumen diunggah melalui portal administrasi.',
      });

      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsDataURL(file);
  };

  const triggerUploadFor = (type: DocumentType) => {
    setTargetUploadDocType(type);
    setUploadModalDocType(type);
  };

  const handleGenerateSampleDoc = (type: DocumentType) => {
    const sampleDataUrl = generateSampleDocumentDataUrl(type, student);
    const typeConfig = DOCUMENT_CONFIGS[type];

    onUploadDocument({
      studentId: student.id,
      docType: type,
      title: `${typeConfig.title} - ${student.name}`,
      fileName: `${type.toUpperCase()}_${student.nisn}.svg`,
      fileType: 'image/svg+xml',
      fileSize: 185000,
      fileDataUrl: sampleDataUrl,
      uploadedBy: `${currentUser.name} (Simulasi Otomatis)`,
      verificationStatus: 'verified',
      notes: 'Dokumen digital resmi tervalidasi sistem.',
    });
  };

  const openVerificationDialog = (doc: StudentDocument) => {
    setVerificationModalDoc(doc);
    setVerificationStatusToSet(doc.verificationStatus === 'unverified' ? 'verified' : doc.verificationStatus);
    setVerificationNotes(doc.notes || '');
  };

  const saveVerification = () => {
    if (verificationModalDoc) {
      onVerifyDocument(verificationModalDoc.id, verificationStatusToSet, verificationNotes);
      setVerificationModalDoc(null);
    }
  };

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'kk':
        return UsersIcon;
      case 'ktp':
        return CreditCard;
      case 'akta':
        return FileText;
      case 'ijazah':
        return GraduationCap;
      case 'kip':
        return Award;
      default:
        return FolderOpen;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png,.webp,.svg"
        className="hidden"
      />

      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              {student.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-white tracking-tight">{student.name}</h2>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  {student.classRoom}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300">
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-mono">
                NIS: {student.nis} • NISN: {student.nisn} • NIK: {student.nik}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadStudentZip(student, studentDocs)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition"
              title="Unduh seluruh dokumen siswa ini dalam format ZIP"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Unduh Berkas (ZIP)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Profile Overview Card & Quick Stats */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-4">
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Tempat / Tgl Lahir</span>
              <span className="font-semibold text-slate-800">
                {student.birthPlace}, {student.birthDate}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Jenis Kelamin</span>
              <span className="font-semibold text-slate-800">
                {student.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Orang Tua / Wali</span>
              <span className="font-semibold text-slate-800 truncate block" title={student.parentName}>
                {student.parentName}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-200">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">Kontak / No. HP</span>
              <span className="font-semibold text-slate-800">{student.parentPhone || '-'}</span>
            </div>
          </div>

          {/* Completeness Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                  completeness.isComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}
              >
                {completeness.isComplete ? '✓' : '!'}
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>Status Kelengkapan: {completeness.status}</span>
                  <span className="text-slate-400 font-normal">
                    ({completeness.mandatoryUploaded} dari 3 Dokumen Pokok Terverifikasi)
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {completeness.isComplete
                    ? 'Semua berkas wajib (KK, Akta Kelahiran, Ijazah) telah lengkap diarsipkan.'
                    : 'Masih diperlukan pengunggahan berkas pokok untuk kelengkapan administrasi siswa.'}
                </div>
              </div>
            </div>
            <div className="w-full sm:w-44 shrink-0">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                <span>Progress Berkas</span>
                <span>{completeness.percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full ${
                    completeness.isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${completeness.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Grid (Scrollable Body) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Arsip Dokumen Administrasi Siswa</h3>
              <p className="text-xs text-slate-500">
                Pilih atau unggah berkas fisik ke dalam format digital yang terlindungi
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Terunggah: <strong>{studentDocs.length}</strong> berkas
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(Object.keys(DOCUMENT_CONFIGS) as DocumentType[]).map((type) => {
              const config = DOCUMENT_CONFIGS[type];
              const doc = studentDocs.find((d) => d.docType === type);
              const Icon = getDocIcon(type);

              if (doc) {
                // Uploaded Card
                const isVerified = doc.verificationStatus === 'verified';
                const isRevision = doc.verificationStatus === 'revision';
                const isPending = doc.verificationStatus === 'pending';

                return (
                  <div
                    key={type}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${config.badgeColor}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex items-center gap-1">
                          {isVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Valid
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3" /> Menunggu
                            </span>
                          )}
                          {isRevision && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3" /> Revisi
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Title & Metadata */}
                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{config.title}</h4>
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5" title={doc.fileName}>
                        {doc.fileName}
                      </p>

                      <div className="mt-2.5 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 space-y-0.5">
                        <div className="flex justify-between">
                          <span>Ukuran File:</span>
                          <span className="font-semibold text-slate-700">{formatFileSize(doc.fileSize)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tanggal Upload:</span>
                          <span className="font-semibold text-slate-700">
                            {new Date(doc.uploadedAt).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                        {doc.notes && (
                          <div className="pt-1 border-t border-slate-200/60 text-slate-600 italic">
                            "{doc.notes}"
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPreviewDocument(doc)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>

                        <a
                          href={doc.fileDataUrl}
                          download={doc.fileName}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                          title="Unduh Berkas Ini"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <div className="flex items-center gap-1">
                        {currentUser.role !== 'petugas_tu' && (
                          <button
                            onClick={() => openVerificationDialog(doc)}
                            className="px-2 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 hover:bg-indigo-50 border border-indigo-200 transition"
                            title="Verifikasi & Beri Catatan"
                          >
                            Verifikasi
                          </button>
                        )}

                        <button
                          onClick={() => triggerUploadFor(type)}
                          className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition"
                          title="Scan Kamera / Ganti Berkas"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => triggerUploadFor(type)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                          title="Unggah Versi Baru"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>

                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => onDeleteDocument(doc.id, doc.title)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                            title="Hapus Dokumen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                // Empty / Not Uploaded Card
                return (
                  <div
                    key={type}
                    className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-500">
                          <Icon className="w-4 h-4" />
                        </div>
                        {config.isMandatory ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            Wajib Diunggah
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            Pendukung
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 leading-snug">{config.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">{config.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        onClick={() => triggerUploadFor(type)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Pilih File ({config.shortTitle})</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => triggerUploadFor(type)}
                          title="Ambil foto berkas langsung dari kamera dan otomatis scan rapi"
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold border border-emerald-200 transition shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Scan Kamera</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGenerateSampleDoc(type)}
                          title="Buat berkas resmi simulasi untuk pengujian seketika"
                          className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-medium border border-slate-200 transition"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>Sampel</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Dokumen tersimpan aman dan terproteksi privasi sekolah</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-bold transition"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Document Upload & Auto-Scan Modal */}
      {uploadModalDocType && student && (
        <DocumentUploadModal
          isOpen={uploadModalDocType !== null}
          onClose={() => setUploadModalDocType(null)}
          student={student}
          docType={uploadModalDocType}
          currentUser={currentUser}
          onSaveDocument={(docData) => {
            onUploadDocument(docData);
            setUploadModalDocType(null);
          }}
        />
      )}

      {/* Verification Status Dialog */}
      {verificationModalDoc && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-slate-900 text-base">Verifikasi Keabsahan Dokumen</h4>
              <button onClick={() => setVerificationModalDoc(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs">
              <div className="font-bold text-slate-800">{verificationModalDoc.title}</div>
              <div className="text-slate-500 font-mono mt-0.5">{verificationModalDoc.fileName}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Pilih Status Verifikasi:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setVerificationStatusToSet('verified')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition ${
                    verificationStatusToSet === 'verified'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                  }`}
                >
                  ✓ Sah / Valid
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationStatusToSet('pending')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition ${
                    verificationStatusToSet === 'pending'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-amber-50'
                  }`}
                >
                  ⏳ Pending
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationStatusToSet('revision')}
                  className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition ${
                    verificationStatusToSet === 'revision'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50'
                  }`}
                >
                  ⚠ Revisi
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Verifikator / Petugas:</label>
              <textarea
                rows={3}
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                placeholder="Misal: Nomor NIK sesuai dengan KK, stempel legalisir sah..."
                className="w-full p-2.5 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setVerificationModalDoc(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={saveVerification}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
              >
                Simpan Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
