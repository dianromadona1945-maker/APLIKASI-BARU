import JSZip from 'jszip';
import { Student, StudentDocument } from '../types';

// Convert base64 / dataUrl to binary Uint8Array or Blob
function dataUrlToBinary(dataUrl: string): Uint8Array | string {
  if (dataUrl.startsWith('data:image/svg+xml')) {
    // For SVG data URLs, decode into raw string or utf8 bytes
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx !== -1) {
      const content = decodeURIComponent(dataUrl.slice(commaIdx + 1));
      return content;
    }
  } else if (dataUrl.includes(';base64,')) {
    const base64Data = dataUrl.split(';base64,')[1];
    const binaryStr = window.atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  return dataUrl;
}

export async function downloadStudentZip(student: Student, documents: StudentDocument[]): Promise<void> {
  const zip = new JSZip();
  const folderName = `${student.classRoom}_${student.name.replace(/\s+/g, '_')}_${student.nisn}`;
  const studentFolder = zip.folder(folderName);

  // Add info readme text
  const infoText = `INFORMASI ARSIP DIGITAL SISWA
===========================================
Nama Lengkap : ${student.name}
Lembaga      : ${student.institution || 'Umum'}
NIS          : ${student.nis}
NISN         : ${student.nisn}
NIK          : ${student.nik}
Kelas / TP   : ${student.classRoom}
TTL          : ${student.birthPlace}, ${student.birthDate}
Alamat       : ${student.address}
Orang Tua    : ${student.parentName} (${student.parentPhone})
Tahun Ajaran : ${student.academicYear}
Tanggal Ekspor: ${new Date().toLocaleString('id-ID')}

Daftar Dokumen Terlampir:
${documents.map((d, i) => `${i + 1}. [${d.docType.toUpperCase()}] ${d.title} (${d.verificationStatus === 'verified' ? 'TERVERIFIKASI' : 'BELUM VALID'})`).join('\n')}
`;

  studentFolder?.file('Biodata_Siswa.txt', infoText);

  documents.forEach((doc) => {
    let fileData: Uint8Array | string = doc.fileDataUrl;
    let fileName = doc.fileName;
    if (doc.fileType === 'image/svg+xml' && !fileName.endsWith('.svg')) {
      fileName = `${fileName.replace(/\.[^/.]+$/, '')}.svg`;
    }
    fileData = dataUrlToBinary(doc.fileDataUrl);
    studentFolder?.file(fileName, fileData);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `Berkas_${student.name.replace(/\s+/g, '_')}_${student.nisn}.zip`);
}

export async function downloadAllStudentsZip(students: Student[], allDocs: StudentDocument[]): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder(`Arsip_Semua_Dokumen_Siswa_${new Date().toISOString().slice(0, 10)}`);

  students.forEach((student) => {
    const studentDocs = allDocs.filter((d) => d.studentId === student.id);
    const folderName = `${student.classRoom}/${student.name.replace(/\s+/g, '_')}_${student.nisn}`;
    const studentFolder = root?.folder(folderName);

    studentFolder?.file(
      'BIODATA.txt',
      `Nama: ${student.name}\nNIS: ${student.nis}\nNISN: ${student.nisn}\nNIK: ${student.nik}\nKelas: ${student.classRoom}\nAlamat: ${student.address}\nOrang Tua: ${student.parentName}`
    );

    studentDocs.forEach((doc) => {
      let fileName = doc.fileName;
      if (doc.fileType === 'image/svg+xml' && !fileName.endsWith('.svg')) {
        fileName = `${fileName.replace(/\.[^/.]+$/, '')}.svg`;
      }
      studentFolder?.file(fileName, dataUrlToBinary(doc.fileDataUrl));
    });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `Arsip_Digital_Sekolah_Lengkap_${new Date().toISOString().slice(0, 10)}.zip`);
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJsonFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  triggerDownload(blob, filename);
}
