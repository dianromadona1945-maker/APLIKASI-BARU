import React, { useState, useEffect } from 'react';
import {
  initializeStorage,
  getStudents,
  saveStudent,
  deleteStudent,
  getDocuments,
  saveDocument,
  deleteDocument,
  verifyDocument,
  getLogs,
  addAuditLog,
  getUsers,
  saveUser,
  getCurrentUser,
  setCurrentUser,
  checkIsAuthenticated,
  logoutUser,
  loginAsRole,
  getAcademicYears,
} from './services/storage';
import { Student, StudentDocument, User, VerificationStatus, AuditLog } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentList } from './components/StudentList';
import { StudentDossierModal } from './components/StudentDossierModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { StudentFormModal } from './components/StudentFormModal';
import { ManageAcademicYearsModal } from './components/ManageAcademicYearsModal';
import { AuditLogsView } from './components/AuditLogsView';
import { UserManagementView } from './components/UserManagementView';
import { BackupSecurityView } from './components/BackupSecurityView';
import { UserSwitcherModal } from './components/UserSwitcherModal';
import { LoginView } from './components/LoginView';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Initialize storage once on boot
  useEffect(() => {
    initializeStorage();
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkIsAuthenticated());
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [documents, setDocuments] = useState<StudentDocument[]>(() => getDocuments());
  const [logs, setLogs] = useState<AuditLog[]>(() => getLogs());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<Student | null>(null);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Student | undefined>(undefined);

  // Student Form Modal
  const [studentFormModal, setStudentFormModal] = useState<{
    isOpen: boolean;
    student: Student | null;
  }>({
    isOpen: false,
    student: null,
  });

  // User Switcher Modal
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  // Manage Academic Years Modal
  const [academicYears, setAcademicYears] = useState<string[]>(() => getAcademicYears());
  const [isManageYearsOpen, setIsManageYearsOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshAllData = () => {
    setStudents(getStudents());
    setDocuments(getDocuments());
    setLogs(getLogs());
    setUsers(getUsers());
    setCurrentUserState(getCurrentUser());
    setAcademicYears(getAcademicYears());
  };

  // Authentication Handlers
  const handleLoginSuccess = (user: User) => {
    setCurrentUserState(user);
    setIsAuthenticated(true);
    refreshAllData();
    const roleLabel =
      user.role === 'admin'
        ? 'Administrator (Akses Penuh)'
        : user.role === 'petugas_tu'
        ? 'Petugas Tata Usaha'
        : 'Wali Kelas / Verifikator';
    showToast(`Selamat datang, ${user.name}! Anda berhasil masuk sebagai ${roleLabel}.`, 'success');
  };

  const handleLogout = () => {
    logoutUser();
    setIsAuthenticated(false);
    showToast('Anda telah berhasil keluar dari sistem.', 'success');
  };

  const handleLoginAsAdminDirectly = () => {
    const admin = loginAsRole('admin');
    setCurrentUserState(admin);
    setIsAuthenticated(true);
    refreshAllData();
    showToast(`Akses aktif: Anda sekarang masuk sebagai Administrator (${admin.name}).`, 'success');
  };

  // Student Actions
  const handleSaveStudent = (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const isEditing = !!studentData.id;
    const saved = saveStudent(studentData);

    addAuditLog(
      isEditing ? 'UPDATE_STUDENT' : 'CREATE_STUDENT',
      isEditing
        ? `Memperbarui biodata siswa: ${saved.name} (${saved.classRoom})`
        : `Mendaftarkan siswa baru: ${saved.name} (NISN: ${saved.nisn}, Kelas: ${saved.classRoom})`,
      saved.id,
      saved.name
    );

    refreshAllData();
    showToast(isEditing ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.');
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus siswa "${studentName}" beserta seluruh berkas dokumen digitalnya?`
      )
    ) {
      deleteStudent(studentId);
      addAuditLog('DELETE_STUDENT', `Menghapus data siswa dan seluruh arsip berkas: ${studentName}`, studentId, studentName);
      refreshAllData();
      if (selectedStudentForDossier?.id === studentId) {
        setSelectedStudentForDossier(null);
      }
      showToast('Siswa dan dokumen berhasil dihapus.', 'error');
    }
  };

  // Document Actions
  const handleUploadDocument = (docData: Omit<StudentDocument, 'id' | 'uploadedAt' | 'version'>) => {
    const newDocId = `doc-${docData.studentId}-${docData.docType}`;
    const newDoc: StudentDocument = {
      ...docData,
      id: newDocId,
      uploadedAt: new Date().toISOString(),
      version: 1,
    };

    saveDocument(newDoc);
    const student = students.find((s) => s.id === docData.studentId);

    addAuditLog(
      'UPLOAD_DOC',
      `Mengunggah dokumen ${docData.title} (${docData.fileName})`,
      docData.studentId,
      student?.name
    );

    refreshAllData();
    showToast(`Dokumen "${docData.title}" berhasil diarsipkan.`);
  };

  const handleDeleteDocument = (docId: string, docTitle: string) => {
    if (window.confirm(`Hapus berkas dokumen "${docTitle}"?`)) {
      const doc = documents.find((d) => d.id === docId);
      const student = doc ? students.find((s) => s.id === doc.studentId) : undefined;
      deleteDocument(docId);

      addAuditLog('DELETE_DOC', `Menghapus berkas dokumen: ${docTitle}`, doc?.studentId, student?.name);

      refreshAllData();
      showToast('Dokumen berhasil dihapus dari arsip.', 'error');
    }
  };

  const handleVerifyDocument = (docId: string, status: VerificationStatus, notes?: string) => {
    const updated = verifyDocument(docId, status, notes);
    if (updated) {
      const student = students.find((s) => s.id === updated.studentId);
      const statusLabel =
        status === 'verified' ? 'Sah / Valid' : status === 'revision' ? 'Perlu Revisi' : 'Menunggu';

      addAuditLog(
        'VERIFY_DOC',
        `Memverifikasi ${updated.title} -> Status: ${statusLabel}. Catatan: "${notes || '-'}"`,
        updated.studentId,
        student?.name
      );

      refreshAllData();
      showToast(`Status dokumen diubah menjadi: ${statusLabel}`);
    }
  };

  // User & Role Switching
  const handleSwitchUser = (newUser: User) => {
    setCurrentUser(newUser);
    setCurrentUserState(newUser);
    addAuditLog('LOGIN', `Petugas beralih akun ke: ${newUser.name} (${newUser.role})`);
    refreshAllData();
    showToast(`Beralih akun: ${newUser.name} (${newUser.role})`);
  };

  const handleSaveNewUser = (user: User) => {
    saveUser(user);
    addAuditLog('UPDATE_USER', `Menambahkan akun petugas baru: ${user.name} (${user.role})`);
    refreshAllData();
    showToast('Petugas baru berhasil didaftarkan.');
  };

  // Document Preview Open
  const handleOpenPreview = (doc: StudentDocument, student?: Student) => {
    setPreviewDoc(doc);
    setPreviewStudent(student || students.find((s) => s.id === doc.studentId));
  };

  const pendingCount = documents.filter((d) => d.verificationStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-90 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs sm:text-sm font-bold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* If user is not authenticated, display the dedicated Login Portal */}
      {!isAuthenticated ? (
        <LoginView onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Sidebar Navigation on the Left */}
          <Sidebar
            currentView={currentView}
            onSelectView={(view) => setCurrentView(view)}
            currentUser={currentUser}
            onSwitchUserClick={() => setIsUserSwitcherOpen(true)}
            onLogoutClick={handleLogout}
            onLoginAsAdminClick={currentUser.role !== 'admin' ? handleLoginAsAdminDirectly : undefined}
            onManageAcademicYears={() => setIsManageYearsOpen(true)}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            studentsCount={students.length}
            documentsCount={documents.length}
          />

          {/* Main Content Area (Offset by lg:pl-72 to accommodate fixed sidebar) */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-200">
            {/* Top Navbar */}
            <Navbar
              currentUser={currentUser}
              onSwitchUserClick={() => setIsUserSwitcherOpen(true)}
              onLogoutClick={handleLogout}
              onLoginAsAdminClick={currentUser.role !== 'admin' ? handleLoginAsAdminDirectly : undefined}
              onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
              currentView={currentView}
              students={students}
              documents={documents}
            />

            {/* View Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {currentView === 'dashboard' && (
                <DashboardOverview
                  students={students}
                  documents={documents}
                  onOpenStudentDossier={(std) => setSelectedStudentForDossier(std)}
                  onAddNewStudent={() => setStudentFormModal({ isOpen: true, student: null })}
                  onNavigate={(view) => setCurrentView(view === 'verifikasi' ? 'dashboard' : view)}
                />
              )}

              {currentView === 'students' && (
                <StudentList
                  students={students}
                  documents={documents}
                  onOpenDossier={(std) => setSelectedStudentForDossier(std)}
                  onAddNewStudent={() => setStudentFormModal({ isOpen: true, student: null })}
                  onEditStudent={(std) => setStudentFormModal({ isOpen: true, student: std })}
                  onDeleteStudent={handleDeleteStudent}
                  currentUserRole={currentUser.role}
                  academicYears={academicYears}
                  onYearsUpdated={(updated) => setAcademicYears(updated)}
                />
              )}

              {currentView === 'logs' && <AuditLogsView logs={logs} />}

              {currentView === 'users' && (
                <UserManagementView
                  users={users}
                  onSaveUser={handleSaveNewUser}
                  currentUser={currentUser}
                />
              )}

              {currentView === 'backup' && (
                <BackupSecurityView
                  students={students}
                  documents={documents}
                  onDataRefreshed={refreshAllData}
                />
              )}
            </main>

            {/* Footer */}
            <footer className="mt-auto py-5 bg-white border-t border-slate-200 text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">SMP &amp; SMK Al-Tafaqquh Fiddin</span>
                  <span>•</span>
                  <span>Sistem Arsip Dokumen Siswa</span>
                </div>
                <div className="text-slate-400">
                  Penyimpanan terpusat: KK, KTP, Akta Kelahiran, Ijazah, KIP &amp; Dokumen Siswa
                </div>
              </div>
            </footer>
          </div>

          {/* Student Dossier Modal */}
          {selectedStudentForDossier && (
            <StudentDossierModal
              student={selectedStudentForDossier}
              documents={documents}
              onClose={() => setSelectedStudentForDossier(null)}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
              onVerifyDocument={handleVerifyDocument}
              onPreviewDocument={(doc) => handleOpenPreview(doc, selectedStudentForDossier)}
              currentUser={currentUser}
            />
          )}

          {/* Document Preview Modal */}
          {previewDoc && (
            <DocumentPreviewModal
              document={previewDoc}
              student={previewStudent}
              onClose={() => setPreviewDoc(null)}
              onVerify={handleVerifyDocument}
              currentUserRole={currentUser.role}
            />
          )}

          {/* Student Form Modal (Add / Edit) */}
          <StudentFormModal
            isOpen={studentFormModal.isOpen}
            student={studentFormModal.student}
            onClose={() => setStudentFormModal({ isOpen: false, student: null })}
            onSave={handleSaveStudent}
          />

          {/* User Switcher Modal */}
          <UserSwitcherModal
            isOpen={isUserSwitcherOpen}
            onClose={() => setIsUserSwitcherOpen(false)}
            users={users}
            currentUser={currentUser}
            onSelectUser={handleSwitchUser}
            onLogout={handleLogout}
          />

          {/* Manage Academic Years Modal */}
          <ManageAcademicYearsModal
            isOpen={isManageYearsOpen}
            onClose={() => setIsManageYearsOpen(false)}
            academicYears={academicYears}
            students={students}
            onYearsUpdated={(updated) => setAcademicYears(updated)}
          />
        </div>
      )}
    </div>
  );
}
