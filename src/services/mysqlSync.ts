import { Student, StudentDocument, AuditLog, User } from '../types';

export interface RumahwebSyncConfig {
  apiUrl: string;
  syncKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'idle' | 'success' | 'error' | 'syncing';
  lastSyncMessage?: string;
  serverCounts?: {
    students: number;
    documents: number;
    academicYears: number;
  };
}

const SYNC_CONFIG_KEY = 'arsip_rumahweb_sync_config_v1';
const LAST_KNOWN_UPDATE_KEY = 'arsip_rumahweb_last_known_update_v1';

let isSyncInProgress = false;

export function getIsSyncInProgress(): boolean {
  return isSyncInProgress;
}

export function getLastKnownSyncTimestamp(): string {
  try {
    return localStorage.getItem(LAST_KNOWN_UPDATE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastKnownSyncTimestamp(ts: string): void {
  try {
    localStorage.setItem(LAST_KNOWN_UPDATE_KEY, ts);
  } catch {}
}

export function getSyncConfig(): RumahwebSyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.apiUrl || typeof parsed.apiUrl !== 'string' || !parsed.apiUrl.trim()) {
        parsed.apiUrl = 'https://arsipatf.my.id/api.php';
      }
      if (!parsed.syncKey || typeof parsed.syncKey !== 'string' || !parsed.syncKey.trim()) {
        parsed.syncKey = 'ArsipAttafaqquh2026';
      }
      if (parsed.autoSync === undefined) {
        parsed.autoSync = true;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load Rumahweb sync config:', e);
  }
  return {
    apiUrl: 'https://arsipatf.my.id/api.php',
    syncKey: 'ArsipAttafaqquh2026',
    autoSync: true,
    lastSyncStatus: 'idle',
  };
}

export function saveSyncConfig(config: Partial<RumahwebSyncConfig>): RumahwebSyncConfig {
  const current = getSyncConfig();
  const updated: RumahwebSyncConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Lightweight check to detect if server data has changed without pulling entire database
 */
export async function checkServerSyncStatus(): Promise<{
  success: boolean;
  counts?: { students: number; documents: number; academicYears: number };
  lastStudentUpdate?: string;
  lastDocUpdate?: string;
  error?: string;
}> {
  const config = getSyncConfig();
  if (!config.apiUrl || !config.apiUrl.startsWith('http')) {
    return { success: false, error: 'API URL belum dikonfigurasi' };
  }

  try {
    const url = new URL(config.apiUrl);
    // Coba action check_sync terlebih dahulu
    url.searchParams.set('action', 'check_sync');

    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    // Jika server script belum diperbarui (404/unknown action), fallback ke 'test'
    if (!response.ok) {
      const fallbackUrl = new URL(config.apiUrl);
      fallbackUrl.searchParams.set('action', 'test');
      response = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({ key: config.syncKey.trim() }),
      });
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.success) {
      return {
        success: true,
        counts: data.counts,
        lastStudentUpdate: data.lastStudentUpdate || '',
        lastDocUpdate: data.lastDocUpdate || '',
      };
    }
    return { success: false, error: data.error || 'Check failed' };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function testRumahwebConnection(
  apiUrl: string,
  syncKey: string
): Promise<{ success: boolean; message: string; counts?: { students: number; documents: number; academicYears: number } }> {
  if (!apiUrl || !apiUrl.startsWith('http')) {
    return {
      success: false,
      message: 'URL API Rumahweb tidak valid. Pastikan diawali dengan https:// atau http://',
    };
  }

  try {
    const cleanUrl = apiUrl.trim();
    const url = new URL(cleanUrl);
    url.searchParams.set('action', 'test');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey.trim(),
      },
      body: JSON.stringify({ key: syncKey.trim() }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        message: `Server Rumahweb merespons status HTTP ${response.status}: ${text.slice(0, 150) || response.statusText}`,
      };
    }

    const data = await response.json();
    if (data.success) {
      saveSyncConfig({
        apiUrl: cleanUrl,
        syncKey: syncKey.trim(),
        lastSyncStatus: 'success',
        lastSyncMessage: data.message || 'Terhubung dengan database MySQL Rumahweb',
        serverCounts: data.counts,
      });
      return {
        success: true,
        message: data.message || 'Berhasil terhubung ke database MySQL Rumahweb!',
        counts: data.counts,
      };
    } else {
      return {
        success: false,
        message: data.error || data.message || 'Gagal autentikasi dengan server Rumahweb',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi server Rumahweb: ${err.message || String(err)}. Periksa koneksi internet atau CORS pada hosting.`,
    };
  }
}

export async function deleteStudentFromHosting(studentId: string): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'delete_student');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        studentId,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    return {
      success: !!result.success,
      message: result.message || 'Siswa berhasil dihapus dari server cloud',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghapus siswa dari server cloud: ${err.message || String(err)}`,
    };
  }
}

export async function pushAllDataToHosting(payload: {
  students: Student[];
  documents: StudentDocument[];
  academicYears: string[];
  logs?: AuditLog[];
  mirror?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  isSyncInProgress = true;
  saveSyncConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'Sedang mengunggah data ke Rumahweb...' });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'push_all');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        students: payload.students,
        documents: payload.documents,
        academicYears: payload.academicYears,
        logs: payload.logs || [],
        mirror: payload.mirror !== false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
      const now = new Date().toISOString();
      saveLastKnownSyncTimestamp(now);
      saveSyncConfig({
        lastSyncStatus: 'success',
        lastSyncTime: now,
        lastSyncMessage: `Berhasil mengunggah ${payload.students.length} siswa ke MySQL Rumahweb`,
        serverCounts: {
          students: payload.students.length,
          documents: payload.documents.length,
          academicYears: payload.academicYears.length,
        },
      });
      return {
        success: true,
        message: `Berhasil mengunggah ${payload.students.length} siswa & ${payload.documents.length} dokumen ke MySQL Rumahweb!`,
      };
    } else {
      throw new Error(result.error || result.message || 'Gagal menyimpan ke server');
    }
  } catch (err: any) {
    const errMsg = `Gagal mengirim data ke Rumahweb: ${err.message || String(err)}`;
    saveSyncConfig({
      lastSyncStatus: 'error',
      lastSyncMessage: errMsg,
    });
    return { success: false, message: errMsg };
  } finally {
    isSyncInProgress = false;
  }
}

export async function pullAllDataFromHosting(): Promise<{
  success: boolean;
  message: string;
  data?: {
    students: Student[];
    documents: StudentDocument[];
    academicYears: string[];
    logs?: AuditLog[];
  };
}> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  isSyncInProgress = true;
  saveSyncConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'Sedang mengambil data dari Rumahweb...' });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'pull_all');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      const now = new Date().toISOString();
      const students: Student[] = result.data.students || [];
      const documents: StudentDocument[] = result.data.documents || [];
      const academicYears: string[] = result.data.academicYears || [];
      const logs: AuditLog[] = result.data.logs || [];

      saveLastKnownSyncTimestamp(now);
      saveSyncConfig({
        lastSyncStatus: 'success',
        lastSyncTime: now,
        lastSyncMessage: `Sinkronisasi berhasil: ${students.length} siswa dari MySQL Rumahweb`,
        serverCounts: {
          students: students.length,
          documents: documents.length,
          academicYears: academicYears.length,
        },
      });

      return {
        success: true,
        message: `Berhasil mengunduh ${students.length} siswa dari MySQL Rumahweb!`,
        data: {
          students,
          documents,
          academicYears,
          logs,
        },
      };
    } else {
      throw new Error(result.error || result.message || 'Gagal memuat data dari server');
    }
  } catch (err: any) {
    const errMsg = `Gagal mengunduh data dari Rumahweb: ${err.message || String(err)}`;
    saveSyncConfig({
      lastSyncStatus: 'error',
      lastSyncMessage: errMsg,
    });
    return { success: false, message: errMsg };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Generate full, production-ready, single-file PHP script to upload to Rumahweb cPanel
 */
export function generatePhpApiScript(params: {
  dbHost?: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  syncKey: string;
}): string {
  const host = params.dbHost || 'localhost';
  const name = params.dbName || 'u1234567_arsip';
  const user = params.dbUser || 'u1234567_user';
  const pass = params.dbPass || 'PasswordDBAnda123!';
  const key = params.syncKey || 'ArsipAttafaqquh2026';

  return `<?php
/**
 * =========================================================================
 * SCRIPT REST API SINKRONISASI DATABASE MYSQL RUMAHWEB
 * SISTEM ARSIP DIGITAL SISWA - SD, SMP, & SMK AL-TAFAFRQUH FIDDIN
 * =========================================================================
 * 
 * CARA PEMASANGAN DI CPANEL RUMAHWEB:
 * 1. Buka cPanel Rumahweb -> Menu "MySQL Databases":
 *    - Buat database baru (misal: arsip_sekolah)
 *    - Buat user database baru dan buat password yang kuat
 *    - Hubungkan User ke Database dengan mencentang "ALL PRIVILEGES"
 * 2. Buka cPanel -> "File Manager" -> Masuk ke folder "public_html":
 *    - Unggah berkas "api.php" ini ke dalam folder public_html (atau subfolder)
 * 3. Buka Aplikasi di Komputer, masukkan URL api.php ini di menu Cadangan & Keamanan
 * 4. Selesai! Semua PC otomatis tersinkronisasi secara real-time.
 */

// Konfigurasi Database MySQL Rumahweb
define('DB_HOST', '${host}');
define('DB_NAME', '${name}');
define('DB_USER', '${user}');
define('DB_PASS', '${pass}');
define('SYNC_KEY', '${key}');

// Header CORS agar dapat diakses dari browser aplikasi
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sync-Key');
header('Content-Type: application/json; charset=utf-8');

// Tangani permintaan preflight OPTIONS dari browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Koneksi ke Database MySQL dengan PDO
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Koneksi ke MySQL Rumahweb Gagal: ' . $e->getMessage(),
        'tip' => 'Pastikan nama database, user, dan password pada file api.php sesuai dengan yang dibuat di cPanel.'
    ]);
    exit;
}

// Otomatis Buat Tabel jika belum ada
initDatabaseTables($pdo);

// Validasi Keamanan Kunci Sinkronisasi (Sync Key)
$inputJson = file_get_contents('php://input');
$body = json_decode($inputJson, true) ?: [];

$clientKey = '';
if (!empty($_SERVER['HTTP_X_SYNC_KEY'])) {
    $clientKey = $_SERVER['HTTP_X_SYNC_KEY'];
} elseif (!empty($body['key'])) {
    $clientKey = $body['key'];
} elseif (!empty($_GET['key'])) {
    $clientKey = $_GET['key'];
}

if ($clientKey !== SYNC_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Kunci Pengaman (Sync Key) tidak cocok atau tidak disertakan.'
    ]);
    exit;
}

// Tangani Aksi (Action)
$action = isset($_GET['action']) ? $_GET['action'] : (isset($body['action']) ? $body['action'] : 'test');

switch ($action) {
    case 'check_sync':
        handleCheckSync($pdo);
        break;

    case 'test':
        handleTest($pdo);
        break;

    case 'push_all':
        handlePushAll($pdo, $body);
        break;

    case 'pull_all':
        handlePullAll($pdo);
        break;

    case 'delete_student':
        handleDeleteStudent($pdo, $body);
        break;

    default:
        echo json_encode([
            'success' => false,
            'error' => 'Aksi tidak dikenal: ' . htmlspecialchars($action)
        ]);
        break;
}

// =========================================================================
// FUNGSI LOGIKA DATABASE
// =========================================================================

function initDatabaseTables($pdo) {
    // Tabel Siswa
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_students\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`nis\` VARCHAR(50) DEFAULT NULL,
        \`nisn\` VARCHAR(50) DEFAULT NULL,
        \`nik\` VARCHAR(50) DEFAULT NULL,
        \`institution\` VARCHAR(20) DEFAULT 'SMP',
        \`academic_year\` VARCHAR(100) DEFAULT NULL,
        \`class_room\` VARCHAR(100) DEFAULT NULL,
        \`birth_place\` VARCHAR(100) DEFAULT NULL,
        \`birth_date\` VARCHAR(100) DEFAULT NULL,
        \`gender\` VARCHAR(10) DEFAULT 'L',
        \`address\` TEXT DEFAULT NULL,
        \`parent_name\` VARCHAR(255) DEFAULT NULL,
        \`parent_phone\` VARCHAR(50) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Aktif',
        \`raw_json\` LONGTEXT DEFAULT NULL,
        \`created_at\` VARCHAR(50) DEFAULT NULL,
        \`updated_at\` VARCHAR(50) DEFAULT NULL,
        INDEX idx_institution (\`institution\`),
        INDEX idx_nis (\`nis\`),
        INDEX idx_nisn (\`nisn\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Tabel Dokumen Digital
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_documents\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`student_id\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`file_name\` VARCHAR(255) DEFAULT NULL,
        \`file_size\` VARCHAR(50) DEFAULT NULL,
        \`upload_date\` VARCHAR(50) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Belum Diverifikasi',
        \`verified_by\` VARCHAR(100) DEFAULT NULL,
        \`verified_at\` VARCHAR(50) DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`file_data\` LONGTEXT DEFAULT NULL,
        INDEX idx_student (\`student_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Tabel Pengaturan Tahun Pelajaran
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_academic_years\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`year_name\` VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Tabel Log Audit
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_audit_logs\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`timestamp\` VARCHAR(50) DEFAULT NULL,
        \`user_name\` VARCHAR(100) DEFAULT NULL,
        \`user_role\` VARCHAR(50) DEFAULT NULL,
        \`action\` VARCHAR(255) DEFAULT NULL,
        \`details\` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
}

function handleTest($pdo) {
    $stmt1 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_students\`");
    $totalStudents = (int)$stmt1->fetchColumn();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_documents\`");
    $totalDocs = (int)$stmt2->fetchColumn();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Terhubung dengan Database MySQL Rumahweb!',
        'server_time' => date('Y-m-d H:i:s'),
        'counts' => [
            'students' => $totalStudents,
            'documents' => $totalDocs,
            'academicYears' => $totalYears
        ]
    ]);
}

function handlePushAll($pdo, $body) {
    $students = isset($body['students']) && is_array($body['students']) ? $body['students'] : [];
    $documents = isset($body['documents']) && is_array($body['documents']) ? $body['documents'] : [];
    $academicYears = isset($body['academicYears']) && is_array($body['academicYears']) ? $body['academicYears'] : [];
    $logs = isset($body['logs']) && is_array($body['logs']) ? $body['logs'] : [];
    $mirror = isset($body['mirror']) ? (bool)$body['mirror'] : true;

    $pdo->beginTransaction();

    try {
        // Jika mode mirror aktif dan ada data siswa yang dikirim:
        // Hapus siswa di cloud yang sudah dihapus di PC lokal
        if ($mirror && !empty($students)) {
            $validIds = array_column($students, 'id');
            if (!empty($validIds)) {
                $placeholders = implode(',', array_fill(0, count($validIds), '?'));
                $delStmt = $pdo->prepare("DELETE FROM \`arsip_students\` WHERE \`id\` NOT IN ($placeholders)");
                $delStmt->execute($validIds);

                // Hapus dokumen milik siswa yang sudah dihapus
                $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
            }
        }

        // Upsert Siswa
        $stmtStudent = $pdo->prepare("INSERT INTO \`arsip_students\` (
            \`id\`, \`name\`, \`nis\`, \`nisn\`, \`nik\`, \`institution\`, \`academic_year\`, \`class_room\`,
            \`birth_place\`, \`birth_date\`, \`gender\`, \`address\`, \`parent_name\`, \`parent_phone\`,
            \`status\`, \`raw_json\`, \`created_at\`, \`updated_at\`
        ) VALUES (
            :id, :name, :nis, :nisn, :nik, :institution, :academic_year, :class_room,
            :birth_place, :birth_date, :gender, :address, :parent_name, :parent_phone,
            :status, :raw_json, :created_at, :updated_at
        ) ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`nis\` = VALUES(\`nis\`),
            \`nisn\` = VALUES(\`nisn\`),
            \`nik\` = VALUES(\`nik\`),
            \`institution\` = VALUES(\`institution\`),
            \`academic_year\` = VALUES(\`academic_year\`),
            \`class_room\` = VALUES(\`class_room\`),
            \`birth_place\` = VALUES(\`birth_place\`),
            \`birth_date\` = VALUES(\`birth_date\`),
            \`gender\` = VALUES(\`gender\`),
            \`address\` = VALUES(\`address\`),
            \`parent_name\` = VALUES(\`parent_name\`),
            \`parent_phone\` = VALUES(\`parent_phone\`),
            \`status\` = VALUES(\`status\`),
            \`raw_json\` = VALUES(\`raw_json\`),
            \`updated_at\` = VALUES(\`updated_at\`)");

        foreach ($students as $s) {
            $stmtStudent->execute([
                ':id' => $s['id'],
                ':name' => $s['name'] ?? '',
                ':nis' => $s['nis'] ?? '',
                ':nisn' => $s['nisn'] ?? '',
                ':nik' => $s['nik'] ?? '',
                ':institution' => $s['institution'] ?? 'SMP',
                ':academic_year' => $s['academicYear'] ?? '',
                ':class_room' => $s['classRoom'] ?? '',
                ':birth_place' => $s['birthPlace'] ?? '',
                ':birth_date' => $s['birthDate'] ?? '',
                ':gender' => $s['gender'] ?? 'L',
                ':address' => $s['address'] ?? '',
                ':parent_name' => $s['parentName'] ?? '',
                ':parent_phone' => $s['parentPhone'] ?? '',
                ':status' => $s['status'] ?? 'Aktif',
                ':raw_json' => json_encode($s),
                ':created_at' => $s['createdAt'] ?? date('c'),
                ':updated_at' => $s['updatedAt'] ?? date('c'),
            ]);
        }

        // Upsert Dokumen
        if (!empty($documents)) {
            $stmtDoc = $pdo->prepare("INSERT INTO \`arsip_documents\` (
                \`id\`, \`student_id\`, \`type\`, \`file_name\`, \`file_size\`, \`upload_date\`,
                \`status\`, \`verified_by\`, \`verified_at\`, \`notes\`, \`file_data\`
            ) VALUES (
                :id, :student_id, :type, :file_name, :file_size, :upload_date,
                :status, :verified_by, :verified_at, :notes, :file_data
            ) ON DUPLICATE KEY UPDATE
                \`type\` = VALUES(\`type\`),
                \`file_name\` = VALUES(\`file_name\`),
                \`file_size\` = VALUES(\`file_size\`),
                \`upload_date\` = VALUES(\`upload_date\`),
                \`status\` = VALUES(\`status\`),
                \`verified_by\` = VALUES(\`verified_by\`),
                \`verified_at\` = VALUES(\`verified_at\`),
                \`notes\` = VALUES(\`notes\`),
                \`file_data\` = VALUES(\`file_data\`)");

            foreach ($documents as $d) {
                $stmtDoc->execute([
                    ':id' => $d['id'],
                    ':student_id' => $d['studentId'],
                    ':type' => $d['type'] ?? 'KK',
                    ':file_name' => $d['fileName'] ?? '',
                    ':file_size' => $d['fileSize'] ?? '',
                    ':upload_date' => $d['uploadDate'] ?? date('c'),
                    ':status' => $d['status'] ?? 'Belum Diverifikasi',
                    ':verified_by' => $d['verifiedBy'] ?? null,
                    ':verified_at' => $d['verifiedAt'] ?? null,
                    ':notes' => $d['notes'] ?? '',
                    ':file_data' => $d['fileData'] ?? null,
                ]);
            }
        }

        // Simpan Tahun Pelajaran
        if (!empty($academicYears)) {
            $stmtYear = $pdo->prepare("INSERT IGNORE INTO \`arsip_academic_years\` (\`year_name\`) VALUES (:name)");
            foreach ($academicYears as $y) {
                if (!empty($y)) {
                    $stmtYear->execute([':name' => $y]);
                }
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Berhasil menyimpan ' . count($students) . ' siswa dan ' . count($documents) . ' dokumen ke MySQL Rumahweb.',
            'saved' => [
                'students' => count($students),
                'documents' => count($documents),
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Gagal menyimpan ke database MySQL: ' . $e->getMessage()
        ]);
    }
}

function handlePullAll($pdo) {
    // Ambil semua data siswa
    $stmt1 = $pdo->query("SELECT * FROM \`arsip_students\` ORDER BY \`institution\` ASC, \`name\` ASC");
    $rawStudents = $stmt1->fetchAll();

    $students = [];
    foreach ($rawStudents as $r) {
        if (!empty($r['raw_json'])) {
            $decoded = json_decode($r['raw_json'], true);
            if (is_array($decoded)) {
                $students[] = $decoded;
                continue;
            }
        }
        $students[] = [
            'id' => $r['id'],
            'name' => $r['name'],
            'nis' => $r['nis'] ?? '',
            'nisn' => $r['nisn'] ?? '',
            'nik' => $r['nik'] ?? '',
            'institution' => $r['institution'] ?? 'SMP',
            'academicYear' => $r['academic_year'] ?? '',
            'classRoom' => $r['class_room'] ?? '',
            'birthPlace' => $r['birth_place'] ?? '',
            'birthDate' => $r['birth_date'] ?? '',
            'gender' => $r['gender'] ?? 'L',
            'address' => $r['address'] ?? '',
            'parentName' => $r['parent_name'] ?? '',
            'parentPhone' => $r['parent_phone'] ?? '',
            'status' => $r['status'] ?? 'Aktif',
            'createdAt' => $r['created_at'] ?? '',
            'updatedAt' => $r['updated_at'] ?? '',
        ];
    }

    // Ambil dokumen
    $stmt2 = $pdo->query("SELECT * FROM \`arsip_documents\`");
    $rawDocs = $stmt2->fetchAll();
    $documents = [];
    foreach ($rawDocs as $d) {
        $documents[] = [
            'id' => $d['id'],
            'studentId' => $d['student_id'],
            'type' => $d['type'],
            'fileName' => $d['file_name'] ?? '',
            'fileSize' => $d['file_size'] ?? '',
            'uploadDate' => $d['upload_date'] ?? '',
            'status' => $d['status'] ?? 'Belum Diverifikasi',
            'verifiedBy' => $d['verified_by'] ?? null,
            'verifiedAt' => $d['verified_at'] ?? null,
            'notes' => $d['notes'] ?? '',
            'fileData' => $d['file_data'] ?? null,
        ];
    }

    // Ambil tahun pelajaran
    $stmt3 = $pdo->query("SELECT \`year_name\` FROM \`arsip_academic_years\` ORDER BY \`id\` ASC");
    $years = $stmt3->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'data' => [
            'students' => $students,
            'documents' => $documents,
            'academicYears' => !empty($years) ? $years : [],
        ]
    ]);
}

function handleCheckSync($pdo) {
    $stmt1 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`updated_at\`) AS last_updated FROM \`arsip_students\`");
    $sInfo = $stmt1->fetch();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`upload_date\`) AS last_doc FROM \`arsip_documents\`");
    $dInfo = $stmt2->fetch();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    echo json_encode([
        'success' => true,
        'counts' => [
            'students' => (int)($sInfo['total'] ?? 0),
            'documents' => (int)($dInfo['total'] ?? 0),
            'academicYears' => $totalYears
        ],
        'lastStudentUpdate' => $sInfo['last_updated'] ?? '',
        'lastDocUpdate' => $dInfo['last_doc'] ?? '',
        'server_time' => date('Y-m-d H:i:s'),
    ]);
}

function handleDeleteStudent($pdo, $body) {
    $studentId = $body['studentId'] ?? '';
    if (!empty($studentId)) {
        $stmt = $pdo->prepare("DELETE FROM \`arsip_students\` WHERE \`id\` = :id");
        $stmt->execute([':id' => $studentId]);

        $stmtDoc = $pdo->prepare("DELETE FROM \`arsip_documents\` WHERE \`student_id\` = :id");
        $stmtDoc->execute([':id' => $studentId]);

        echo json_encode([
            'success' => true,
            'message' => 'Siswa dan dokumen berhasil dihapus dari cloud MySQL.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'ID Siswa tidak valid.'
        ]);
    }
}
?>`;
}
