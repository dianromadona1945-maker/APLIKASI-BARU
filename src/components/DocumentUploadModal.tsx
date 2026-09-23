import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Camera,
  FolderOpen,
  RefreshCw,
  RotateCw,
  RotateCcw,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Sun,
  Sliders,
  FileText,
  Eye,
  FlipHorizontal,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Student, StudentDocument, DocumentType, User } from '../types';
import { DOCUMENT_CONFIGS } from '../data/constants';
import {
  ScannerFilterPreset,
  ScannerEnhanceOptions,
  processScannedImage,
} from '../utils/scannerEnhancer';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  docType: DocumentType;
  currentUser: User;
  onSaveDocument: (docData: Omit<StudentDocument, 'id' | 'uploadedAt' | 'version'>) => void;
}

type UploadSourceTab = 'file-manager' | 'camera-scan';
type AspectPreset = 'a4' | 'card' | 'free';

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  student,
  docType,
  currentUser,
  onSaveDocument,
}) => {
  const [activeTab, setActiveTab] = useState<UploadSourceTab>('file-manager');

  // File Manager State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputFallbackRef = useRef<HTMLInputElement | null>(null);

  // Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [aspectPreset, setAspectPreset] = useState<AspectPreset>('a4');
  const [isCapturing, setIsCapturing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [useCountdown, setUseCountdown] = useState(false);

  // Enhancement / Preview State
  const [capturedRawUrl, setCapturedRawUrl] = useState<string | null>(null);
  const [enhancedResultUrl, setEnhancedResultUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filterPreset, setFilterPreset] = useState<ScannerFilterPreset>('auto-clean');
  const [rotation, setRotation] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(0);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [enhancedFileSize, setEnhancedFileSize] = useState<number>(0);

  const docConfig = DOCUMENT_CONFIGS[docType];

  // Set default aspect ratio based on doc type
  useEffect(() => {
    if (docType === 'ktp' || docType === 'kip') {
      setAspectPreset('card');
    } else {
      setAspectPreset('a4');
    }
  }, [docType]);

  // Clean up media stream when closing or switching away
  const stopCamera = useCallback(() => {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }
    setIsCameraActive(false);
  }, [mediaStream]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      resetAllStates();
    }
  }, [isOpen, stopCamera]);

  const resetAllStates = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setCapturedRawUrl(null);
    setEnhancedResultUrl(null);
    setCameraError(null);
    setRotation(0);
    setBrightness(0);
    setContrast(0);
    setFilterPreset('auto-clean');
    setIsComparingOriginal(false);
    setCountdown(null);
  };

  // Start Camera
  const startCamera = async (deviceId?: string) => {
    stopCamera();
    setCameraError(null);
    setIsCameraActive(false);

    try {
      // Find devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
      }

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setMediaStream(stream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorMsg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Izin akses kamera ditolak. Silakan izinkan browser untuk mengakses kamera atau pilih dari File Manager.'
          : 'Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain.';
      setCameraError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Switch camera tabs
  const handleTabChange = (tab: UploadSourceTab) => {
    setActiveTab(tab);
    if (tab === 'camera-scan') {
      if (!capturedRawUrl && !isCameraActive) {
        startCamera(selectedCameraId);
      }
    } else {
      stopCamera();
    }
  };

  // Capture photo from video feed
  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    if (vw === 0 || vh === 0) {
      setIsCapturing(false);
      return;
    }

    // Capture the framed region
    // Compute frame box relative to video
    let cropX = 0;
    let cropY = 0;
    let cropW = vw;
    let cropH = vh;

    if (aspectPreset === 'a4') {
      // A4 portrait ratio ~ 1 : 1.414
      const targetRatio = 1 / 1.414;
      if (vw / vh > targetRatio) {
        // Video is wider
        cropH = Math.round(vh * 0.9);
        cropW = Math.round(cropH * targetRatio);
        cropX = Math.round((vw - cropW) / 2);
        cropY = Math.round((vh - cropH) / 2);
      } else {
        cropW = Math.round(vw * 0.9);
        cropH = Math.round(cropW / targetRatio);
        cropX = Math.round((vw - cropW) / 2);
        cropY = Math.round((vh - cropH) / 2);
      }
    } else if (aspectPreset === 'card') {
      // ID Card / KTP landscape ratio ~ 85.6mm : 53.98mm = 1.586 : 1
      const targetRatio = 1.586;
      cropW = Math.round(vw * 0.88);
      cropH = Math.round(cropW / targetRatio);
      if (cropH > vh) {
        cropH = Math.round(vh * 0.88);
        cropW = Math.round(cropH * targetRatio);
      }
      cropX = Math.round((vw - cropW) / 2);
      cropY = Math.round((vh - cropH) / 2);
    } else {
      // Free/Whole frame with 5% margin
      cropW = Math.round(vw * 0.94);
      cropH = Math.round(vh * 0.94);
      cropX = Math.round((vw - cropW) / 2);
      cropY = Math.round((vh - cropH) / 2);
    }

    // Draw raw crop to intermediate canvas
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = cropW;
    rawCanvas.height = cropH;
    const rawCtx = rawCanvas.getContext('2d');
    if (rawCtx) {
      rawCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      const rawUrl = rawCanvas.toDataURL('image/jpeg', 0.95);
      setCapturedRawUrl(rawUrl);
      stopCamera();

      // Immediately process with default "auto-clean"
      enhanceImage(rawUrl, {
        filter: 'auto-clean',
        brightness: 0,
        contrast: 0,
        rotation: 0,
      });
    }

    setIsCapturing(false);
  };

  const handleStartCaptureWithTimer = () => {
    if (useCountdown) {
      setCountdown(3);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            setCountdown(null);
            capturePhoto();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      capturePhoto();
    }
  };

  // Re-run image enhancement whenever filter, rotation, brightness, or contrast changes
  const enhanceImage = async (imgUrl: string, options: ScannerEnhanceOptions) => {
    setIsProcessing(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = async () => {
        const resultUrl = await processScannedImage(img, null, options);
        setEnhancedResultUrl(resultUrl);

        // Approximate size in bytes from base64
        const stringLength = resultUrl.length - 'data:image/jpeg;base64,'.length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383612;
        setEnhancedFileSize(Math.round(sizeInBytes));
        setIsProcessing(false);
      };
      img.src = imgUrl;
    } catch (err) {
      console.error('Enhancement error:', err);
      setIsProcessing(false);
    }
  };

  const handleFilterChange = (preset: ScannerFilterPreset) => {
    setFilterPreset(preset);
    if (capturedRawUrl) {
      enhanceImage(capturedRawUrl, {
        filter: preset,
        brightness,
        contrast,
        rotation,
      });
    }
  };

  const handleRotate = (deg: number) => {
    const nextRot = (rotation + deg) % 360;
    setRotation(nextRot);
    if (capturedRawUrl) {
      enhanceImage(capturedRawUrl, {
        filter: filterPreset,
        brightness,
        contrast,
        rotation: nextRot,
      });
    }
  };

  const handleBrightnessChange = (val: number) => {
    setBrightness(val);
    if (capturedRawUrl) {
      enhanceImage(capturedRawUrl, {
        filter: filterPreset,
        brightness: val,
        contrast,
        rotation,
      });
    }
  };

  const handleContrastChange = (val: number) => {
    setContrast(val);
    if (capturedRawUrl) {
      enhanceImage(capturedRawUrl, {
        filter: filterPreset,
        brightness,
        contrast: val,
        rotation,
      });
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedRawUrl(null);
    setEnhancedResultUrl(null);
    setRotation(0);
    setBrightness(0);
    setContrast(0);
    startCamera(selectedCameraId);
  };

  // File Manager Handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSelectedFile(file);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSelectedFile(file);
  };

  const processSelectedFile = (file: File) => {
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFilePreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Transfer file image to Auto-Scanner Cleaner
  const handleEnhanceUploadedImage = () => {
    if (!filePreviewUrl) return;
    setActiveTab('camera-scan');
    setCapturedRawUrl(filePreviewUrl);
    setRotation(0);
    setBrightness(0);
    setContrast(0);
    setFilterPreset('auto-clean');
    enhanceImage(filePreviewUrl, {
      filter: 'auto-clean',
      brightness: 0,
      contrast: 0,
      rotation: 0,
    });
  };

  // Final Upload Handler
  const handleConfirmUpload = () => {
    if (activeTab === 'camera-scan' || capturedRawUrl) {
      // Save Scanned Image
      if (!enhancedResultUrl) return;
      const cleanStudentName = student.name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileName = `SCAN_${docType.toUpperCase()}_${cleanStudentName}_${timestamp}.jpg`;

      onSaveDocument({
        studentId: student.id,
        docType: docType,
        title: `${docConfig.title} - ${student.name}`,
        fileName: fileName,
        fileType: 'image/jpeg',
        fileSize: enhancedFileSize || 450000,
        fileDataUrl: enhancedResultUrl,
        uploadedBy: `${currentUser.name} (${currentUser.role})`,
        verificationStatus: 'verified',
        notes: `Dipindai melalui Kamera Dokumen Auto-Scan (Filter: ${filterPreset.toUpperCase()}).`,
      });

      onClose();
    } else {
      // Save File Manager document
      if (!selectedFile || !filePreviewUrl) return;
      onSaveDocument({
        studentId: student.id,
        docType: docType,
        title: `${docConfig.title} - ${student.name}`,
        fileName: selectedFile.name,
        fileType: selectedFile.type || 'application/octet-stream',
        fileSize: selectedFile.size,
        fileDataUrl: filePreviewUrl,
        uploadedBy: `${currentUser.name} (${currentUser.role})`,
        verificationStatus: 'verified',
        notes: 'Dokumen diunggah melalui File Manager.',
      });

      onClose();
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div
        id="document-upload-modal-container"
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Unggah Berkas: {docConfig.title}
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {docConfig.shortTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Siswa: <span className="font-semibold text-white">{student.name}</span> • NISN:{' '}
                <span className="font-mono text-slate-300">{student.nisn}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Source Navigation Tabs */}
        {!capturedRawUrl && (
          <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-3 shrink-0 gap-2">
            <button
              id="upload-tab-file-manager"
              onClick={() => handleTabChange('file-manager')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'file-manager'
                  ? 'bg-white text-blue-700 border-blue-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-blue-600" />
              <span>Pilih dari File Manager / Komputer</span>
            </button>

            <button
              id="upload-tab-camera-scan"
              onClick={() => handleTabChange('camera-scan')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'camera-scan'
                  ? 'bg-white text-emerald-700 border-emerald-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/70'
              }`}
            >
              <div className="relative">
                <Camera className="w-4 h-4 text-emerald-600" />
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="flex items-center gap-1">
                <span>Kamera & Auto Scan</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-md font-extrabold">
                  Rapih
                </span>
              </span>
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* ========================================= */}
          {/* TAB 1: FILE MANAGER / PERANGKAT          */}
          {/* ========================================= */}
          {activeTab === 'file-manager' && !capturedRawUrl && (
            <div className="space-y-4">
              {/* Dropzone Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                <div className="w-14 h-14 rounded-2xl bg-blue-100/70 border border-blue-200 text-blue-700 flex items-center justify-center mb-3 shadow-2xs">
                  <FolderOpen className="w-7 h-7" />
                </div>

                <p className="font-extrabold text-sm sm:text-base text-slate-800 mb-1">
                  Klik untuk Memilih Berkas atau Seret (Drag & Drop) ke Sini
                </p>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Mendukung format <strong>PDF, JPG, PNG, atau WEBP</strong> (Maks. 15MB). Berkas akan
                  diarsipkan aman ke database siswa.
                </p>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Buka File Manager</span>
                </button>
              </div>

              {/* Selected File Details & Preview */}
              {selectedFile && (
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-center gap-3 min-w-0">
                    {selectedFile.type.startsWith('image/') && filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-14 h-14 object-cover rounded-xl border border-blue-200 bg-white shadow-2xs shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-red-100 text-red-700 border border-red-200 flex items-center justify-center shrink-0">
                        <FileText className="w-7 h-7" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {selectedFile.name}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {formatBytes(selectedFile.size)} • {selectedFile.type || 'Berkas Dokumen'}
                      </p>
                    </div>
                  </div>

                  {/* Actions for Selected File */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                    {selectedFile.type.startsWith('image/') && (
                      <button
                        type="button"
                        onClick={handleEnhanceUploadedImage}
                        title="Buka gambar ini di pemindai agar rapi, putih bersih, dan tajam"
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Rapihkan Gambar ✨</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmUpload}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Simpan & Upload</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================= */}
          {/* TAB 2: LIVE CAMERA & AUTO-SCANNER         */}
          {/* ========================================= */}
          {activeTab === 'camera-scan' && !capturedRawUrl && (
            <div className="space-y-4">
              {/* Camera Controls Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900 rounded-xl text-white text-xs">
                {/* Aspect Guide Selector */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px] font-semibold hidden sm:inline">
                    Bingkai:
                  </span>
                  <button
                    type="button"
                    onClick={() => setAspectPreset('a4')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aspectPreset === 'a4'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    A4 (Vertikal)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectPreset('card')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aspectPreset === 'card'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    KTP / Kartu
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectPreset('free')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      aspectPreset === 'free'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Layar Penuh
                  </button>
                </div>

                {/* Device & Options */}
                <div className="flex items-center gap-2">
                  {/* Countdown Toggle */}
                  <button
                    type="button"
                    onClick={() => setUseCountdown(!useCountdown)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      useCountdown
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Timer 3s: {useCountdown ? 'Aktif' : 'Nonaktif'}
                  </button>

                  {/* Switch Camera if multiple */}
                  {availableCameras.length > 1 && (
                    <select
                      value={selectedCameraId}
                      onChange={(e) => {
                        setSelectedCameraId(e.target.value);
                        startCamera(e.target.value);
                      }}
                      className="bg-slate-800 text-white text-xs px-2.5 py-1 rounded-lg border border-slate-700 focus:outline-hidden"
                    >
                      {availableCameras.map((cam, idx) => (
                        <option key={cam.deviceId || idx} value={cam.deviceId}>
                          {cam.label || `Kamera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Viewport & Scanner Overlay */}
              <div
                ref={scannerContainerRef}
                className="relative w-full aspect-4/3 sm:aspect-16/10 bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner"
              >
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className="w-full h-full object-cover"
                />

                {/* Camera Inactive / Error Overlay */}
                {!isCameraActive && (
                  <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-white z-10">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
                        <p className="font-bold text-sm text-rose-200 mb-2">{cameraError}</p>
                        <p className="text-xs text-slate-400 max-w-md mb-4">
                          Anda tetap bisa menggunakan tombol di bawah untuk mengambil foto via aplikasi
                          kamera bawaan ponsel atau memilih berkas dari File Manager.
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => startCamera(selectedCameraId)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Coba Lagi Akses Kamera</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => cameraInputFallbackRef.current?.click()}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Buka Kamera HP Bawaan</span>
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Camera className="w-12 h-12 text-blue-400 mb-3 animate-pulse" />
                        <p className="font-bold text-base mb-1">Siapkan Kamera untuk Memindai</p>
                        <p className="text-xs text-slate-400 max-w-sm mb-4">
                          Posisikan berkas dokumen ({docConfig.title}) di area datar dengan cahaya cukup.
                        </p>
                        <button
                          type="button"
                          onClick={() => startCamera(selectedCameraId)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center gap-2 cursor-pointer"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Mulai Kamera Sekarang</span>
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Mobile Direct Camera Capture input fallback */}
                <input
                  ref={cameraInputFallbackRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelected}
                  className="hidden"
                />

                {/* Scanner Frame Guide Overlay (Visible when camera is active) */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    {/* Frame Target Box */}
                    <div
                      className={`relative transition-all duration-300 ${
                        aspectPreset === 'a4'
                          ? 'w-[70%] sm:w-[55%] aspect-1/1.414'
                          : aspectPreset === 'card'
                          ? 'w-[88%] sm:w-[75%] aspect-1.586/1'
                          : 'w-[92%] h-[90%]'
                      }`}
                    >
                      {/* Darkened mask around the frame */}
                      <div className="absolute -inset-4 border border-white/30 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]"></div>

                      {/* Frame glowing corners */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-lg shadow-sm"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-lg shadow-sm"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-lg shadow-sm"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-lg shadow-sm"></div>

                      {/* Animated Scanning Laser Line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-pulse top-1/2"></div>

                      {/* Center helper badge */}
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-0.5 rounded-full border border-emerald-500/50 flex items-center gap-1 shadow-md">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        <span>Posisikan Dokumen Rapi di Sini</span>
                      </div>
                    </div>

                    {/* Countdown Overlay */}
                    {countdown !== null && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                        <div className="w-20 h-20 rounded-full bg-emerald-500 text-white font-black text-4xl flex items-center justify-center animate-bounce shadow-2xl">
                          {countdown}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Camera Shutter & Actions Bar */}
              {isCameraActive && (
                <div className="flex items-center justify-center gap-4 py-2">
                  <button
                    type="button"
                    onClick={handleStartCaptureWithTimer}
                    disabled={isCapturing}
                    className="group relative flex items-center justify-center p-1 rounded-full bg-linear-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition cursor-pointer"
                  >
                    <div className="w-16 h-16 rounded-full border-3 border-white flex items-center justify-center bg-white/20 group-hover:bg-white/30 text-white">
                      <Camera className="w-7 h-7 drop-shadow-md" />
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* POST-CAPTURE ENHANCEMENT / EDIT SCREEN ("SCAN JADI RAPIH") */}
          {/* ======================================================== */}
          {capturedRawUrl && (
            <div className="space-y-4 animate-fadeIn">
              {/* Top notification bar */}
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-emerald-600 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">
                      Dokumen Berhasil Dipindai & Dirapihkan Secara Otomatis
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      Latar kertas diputihkan, bayangan dibersihkan, dan tulisan dipertegas.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Foto Ulang</span>
                </button>
              </div>

              {/* Large Document Preview Canvas */}
              <div className="relative w-full bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center p-3 sm:p-5 min-h-[320px] max-h-[460px] border border-slate-800 shadow-inner">
                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center text-white z-20">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-7 h-7 text-emerald-400 animate-spin" />
                      <span className="text-xs font-bold">Memproses Koreksi Dokumen...</span>
                    </div>
                  </div>
                )}

                {/* Displaying Image: Comparing vs Enhanced */}
                <img
                  src={isComparingOriginal ? capturedRawUrl : enhancedResultUrl || capturedRawUrl}
                  alt="Hasil Scan Dokumen"
                  className="max-h-[380px] max-w-full object-contain rounded-lg shadow-2xl border border-slate-700 bg-white"
                />

                {/* Comparison watermark tag */}
                {isComparingOriginal ? (
                  <div className="absolute top-4 left-4 bg-amber-500/90 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md">
                    Foto Asli Kamera (Belum Dirapikan)
                  </div>
                ) : (
                  <div className="absolute top-4 left-4 bg-emerald-600/90 text-white px-2.5 py-1 rounded-md text-[11px] font-bold shadow-md flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Hasil Auto-Scan Rapih ({filterPreset.toUpperCase()})</span>
                  </div>
                )}

                {/* Hold to compare button in preview */}
                <button
                  type="button"
                  onMouseDown={() => setIsComparingOriginal(true)}
                  onMouseUp={() => setIsComparingOriginal(false)}
                  onTouchStart={() => setIsComparingOriginal(true)}
                  onTouchEnd={() => setIsComparingOriginal(false)}
                  className="absolute bottom-4 right-4 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-700 shadow-lg transition flex items-center gap-1.5 select-none cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                  <span>Tahan untuk Lihat Foto Asli</span>
                </button>
              </div>

              {/* Filter Preset Options */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Pilihan Filter Dokumen:</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleFilterChange('auto-clean')}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center text-center cursor-pointer ${
                      filterPreset === 'auto-clean'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Scan Rapih</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Kertas Putih & Teks Tajam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange('color-boost')}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center text-center cursor-pointer ${
                      filterPreset === 'color-boost'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-1 text-[11px]">
                      <span>Warna Jernih</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-normal">Stempel & Foto Berwarna</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange('bw')}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center text-center cursor-pointer ${
                      filterPreset === 'bw'
                        ? 'bg-slate-900 border-slate-900 text-white shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px]">Hitam Putih</span>
                    <span className="text-[10px] text-slate-400 font-normal">Fotokopi Kontras Tinggi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange('grayscale')}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center text-center cursor-pointer ${
                      filterPreset === 'grayscale'
                        ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px]">Grayscale</span>
                    <span className="text-[10px] text-slate-500 font-normal">Abu-abu Lembut Bersih</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterChange('original')}
                    className={`p-2 rounded-xl text-xs font-bold border transition flex flex-col items-center text-center cursor-pointer ${
                      filterPreset === 'original'
                        ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[11px]">Asli Kamera</span>
                    <span className="text-[10px] text-slate-500 font-normal">Tanpa Filter</span>
                  </button>
                </div>
              </div>

              {/* Fine Tuning: Rotation, Brightness, Contrast */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center text-xs">
                {/* Rotate Buttons */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700 shrink-0">Putar:</span>
                  <button
                    type="button"
                    onClick={() => handleRotate(270)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>90° Kiri</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRotate(90)}
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-300 font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>90° Kanan</span>
                  </button>
                </div>

                {/* Brightness Slider */}
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="font-semibold text-slate-600 shrink-0">Terang:</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={brightness}
                    onChange={(e) => handleBrightnessChange(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="w-6 text-right font-mono text-[11px] text-slate-500">
                    {brightness > 0 ? `+${brightness}` : brightness}
                  </span>
                </div>

                {/* Contrast Slider */}
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span className="font-semibold text-slate-600 shrink-0">Kontras:</span>
                  <input
                    type="range"
                    min="-40"
                    max="40"
                    value={contrast}
                    onChange={(e) => handleContrastChange(Number(e.target.value))}
                    className="w-full accent-blue-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="w-6 text-right font-mono text-[11px] text-slate-500">
                    {contrast > 0 ? `+${contrast}` : contrast}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {capturedRawUrl ? (
              <span>
                Ukuran Dokumen Hasil Scan:{' '}
                <strong className="text-slate-800 font-mono">
                  {formatBytes(enhancedFileSize || 450000)}
                </strong>{' '}
                (Format JPEG Siap Diarsipkan)
              </span>
            ) : (
              <span>
                Dokumen yang diunggah akan langsung tersimpan ke arsip dan dicatat ke riwayat log.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition cursor-pointer"
            >
              Batal
            </button>

            {capturedRawUrl ? (
              <button
                type="button"
                id="save-scanned-document-btn"
                onClick={handleConfirmUpload}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Gunakan Dokumen Hasil Scan Ini</span>
              </button>
            ) : selectedFile ? (
              <button
                type="button"
                id="save-selected-file-btn"
                onClick={handleConfirmUpload}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Simpan Dokumen Ini</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
