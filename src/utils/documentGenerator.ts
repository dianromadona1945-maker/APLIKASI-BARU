import { DocumentType, Student } from '../types';

export function generateSampleDocumentDataUrl(type: DocumentType, student: Student): string {
  const width = 800;
  const height = 1100; // standard A4 aspect ratio

  let contentSvg = '';

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (type === 'kk') {
    contentSvg = `
      <rect x="20" y="20" width="760" height="1060" fill="#ffffff" stroke="#cbd5e1" stroke-width="2" rx="8"/>
      <!-- Header -->
      <rect x="30" y="30" width="740" height="140" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="400" y="70" font-family="'Plus Jakarta Sans', sans-serif" font-size="22" font-weight="bold" fill="#0f172a" text-anchor="middle">REPUBLIK INDONESIA</text>
      <text x="400" y="105" font-family="'Plus Jakarta Sans', sans-serif" font-size="28" font-weight="800" fill="#1e3a8a" text-anchor="middle" letter-spacing="4">KARTU KELUARGA</text>
      <text x="400" y="140" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="600" fill="#475569" text-anchor="middle">No. 3201081503110042</text>

      <!-- Head of family info -->
      <text x="50" y="200" font-size="13" font-weight="bold" fill="#334155">Nama Kepala Keluarga :</text>
      <text x="230" y="200" font-size="13" font-weight="600" fill="#0f172a">${student.parentName.toUpperCase()}</text>
      <text x="50" y="225" font-size="13" font-weight="bold" fill="#334155">Alamat / RT / RW :</text>
      <text x="230" y="225" font-size="13" font-weight="500" fill="#334155">${student.address}</text>
      <text x="50" y="250" font-size="13" font-weight="bold" fill="#334155">Desa/Kelurahan :</text>
      <text x="230" y="250" font-size="13" font-weight="500" fill="#334155">Sukamaju, Kec. Cilodong</text>

      <!-- Table Header -->
      <rect x="40" y="280" width="720" height="35" fill="#1e3a8a" rx="4"/>
      <text x="55" y="303" font-size="11" font-weight="bold" fill="#ffffff">No</text>
      <text x="100" y="303" font-size="11" font-weight="bold" fill="#ffffff">Nama Lengkap</text>
      <text x="320" y="303" font-size="11" font-weight="bold" fill="#ffffff">NIK</text>
      <text x="480" y="303" font-size="11" font-weight="bold" fill="#ffffff">Jenis Kelamin</text>
      <text x="590" y="303" font-size="11" font-weight="bold" fill="#ffffff">Hubungan</text>

      <!-- Row 1: Parent -->
      <rect x="40" y="320" width="720" height="40" fill="#f8fafc" stroke="#e2e8f0"/>
      <text x="55" y="345" font-size="12" fill="#334155">1</text>
      <text x="100" y="345" font-size="12" font-weight="600" fill="#0f172a">${student.parentName.toUpperCase()}</text>
      <text x="320" y="345" font-size="12" font-family="monospace" fill="#334155">3201081504780001</text>
      <text x="480" y="345" font-size="12" fill="#334155">LAKI-LAKI</text>
      <text x="590" y="345" font-size="12" font-weight="bold" fill="#334155">KEPALA KELUARGA</text>

      <!-- Row 2: Student -->
      <rect x="40" y="365" width="720" height="40" fill="#eff6ff" stroke="#bfdbfe"/>
      <text x="55" y="390" font-size="12" fill="#1e3a8a" font-weight="bold">2</text>
      <text x="100" y="390" font-size="12" font-weight="700" fill="#1e3a8a">${student.name.toUpperCase()} (SISWA)</text>
      <text x="320" y="390" font-size="12" font-family="monospace" font-weight="bold" fill="#1e3a8a">${student.nik}</text>
      <text x="480" y="390" font-size="12" fill="#1e3a8a">${student.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</text>
      <text x="590" y="390" font-size="12" font-weight="bold" fill="#1e3a8a">ANAK</text>

      <!-- Birth info table -->
      <rect x="40" y="440" width="720" height="30" fill="#334155" rx="4"/>
      <text x="55" y="460" font-size="11" font-weight="bold" fill="#ffffff">Tempat Lahir</text>
      <text x="240" y="460" font-size="11" font-weight="bold" fill="#ffffff">Tanggal Lahir</text>
      <text x="420" y="460" font-size="11" font-weight="bold" fill="#ffffff">Agama</text>
      <text x="580" y="460" font-size="11" font-weight="bold" fill="#ffffff">Pendidikan</text>

      <rect x="40" y="475" width="720" height="36" fill="#ffffff" stroke="#e2e8f0"/>
      <text x="55" y="498" font-size="12" fill="#334155">${student.birthPlace}</text>
      <text x="240" y="498" font-size="12" fill="#334155">${student.birthDate}</text>
      <text x="420" y="498" font-size="12" fill="#334155">ISLAM</text>
      <text x="580" y="498" font-size="12" fill="#334155">SLTP/SEDERAJAT</text>

      <!-- Official QR & Signatures -->
      <g transform="translate(60, 750)">
        <rect width="100" height="100" fill="#f1f5f9" stroke="#94a3b8" rx="6"/>
        <text x="50" y="55" font-size="11" font-weight="bold" fill="#475569" text-anchor="middle">QR CODE</text>
        <text x="50" y="70" font-size="9" fill="#64748b" text-anchor="middle">BSrE Sertifikasi</text>
      </g>

      <g transform="translate(500, 740)">
        <text x="120" y="20" font-size="12" fill="#475569" text-anchor="middle">Dikeluarkan di : KOTA BOGOR</text>
        <text x="120" y="40" font-size="12" fill="#475569" text-anchor="middle">Pada Tanggal : ${todayStr}</text>
        <text x="120" y="60" font-size="12" font-weight="bold" fill="#1e293b" text-anchor="middle">KEPALA DINAS KEPENDUDUKAN</text>
        <text x="120" y="75" font-size="11" font-weight="bold" fill="#1e293b" text-anchor="middle">DAN PENCATATAN SIPIL</text>
        <circle cx="120" cy="115" r="30" fill="#3b82f6" opacity="0.15"/>
        <text x="120" y="120" font-size="11" font-weight="bold" fill="#1d4ed8" text-anchor="middle">TERVERIFIKASI</text>
        <text x="120" y="165" font-size="12" font-weight="bold" text-decoration="underline" fill="#0f172a" text-anchor="middle">Drs. H. SUKIRMAN, M.Si.</text>
      </g>
    `;
  } else if (type === 'ktp') {
    contentSvg = `
      <rect x="40" y="200" width="720" height="460" rx="18" fill="#dbeafe" stroke="#3b82f6" stroke-width="4"/>
      <rect x="55" y="215" width="690" height="430" rx="14" fill="#ffffff"/>
      
      <!-- Top banner -->
      <rect x="55" y="215" width="690" height="75" fill="#1e40af" rx="14"/>
      <text x="400" y="245" font-family="'Plus Jakarta Sans', sans-serif" font-size="16" font-weight="bold" fill="#f8fafc" text-anchor="middle">PROVINSI JAWA BARAT</text>
      <text x="400" y="270" font-family="'Plus Jakarta Sans', sans-serif" font-size="18" font-weight="800" fill="#ffffff" text-anchor="middle">KOTA BOGOR</text>

      <!-- NIK -->
      <text x="80" y="325" font-size="16" font-weight="bold" fill="#1e293b">NIK</text>
      <text x="180" y="325" font-size="19" font-weight="800" font-family="monospace" fill="#0f172a">${student.nik}</text>

      <!-- Identity Rows -->
      <text x="80" y="360" font-size="13" font-weight="bold" fill="#475569">Nama</text>
      <text x="210" y="360" font-size="13" font-weight="700" fill="#0f172a">: ${student.name.toUpperCase()}</text>

      <text x="80" y="390" font-size="13" font-weight="bold" fill="#475569">Tempat/Tgl Lahir</text>
      <text x="210" y="390" font-size="13" font-weight="600" fill="#0f172a">: ${student.birthPlace.toUpperCase()}, ${student.birthDate}</text>

      <text x="80" y="420" font-size="13" font-weight="bold" fill="#475569">Jenis Kelamin</text>
      <text x="210" y="420" font-size="13" font-weight="600" fill="#0f172a">: ${student.gender === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</text>

      <text x="80" y="450" font-size="13" font-weight="bold" fill="#475569">Alamat</text>
      <text x="210" y="450" font-size="13" font-weight="600" fill="#0f172a">: ${student.address}</text>

      <text x="80" y="480" font-size="13" font-weight="bold" fill="#475569">Agama</text>
      <text x="210" y="480" font-size="13" font-weight="600" fill="#0f172a">: ISLAM</text>

      <text x="80" y="510" font-size="13" font-weight="bold" fill="#475569">Status Perkawinan</text>
      <text x="210" y="510" font-size="13" font-weight="600" fill="#0f172a">: BELUM KAWIN</text>

      <text x="80" y="540" font-size="13" font-weight="bold" fill="#475569">Pekerjaan</text>
      <text x="210" y="540" font-size="13" font-weight="700" fill="#1d4ed8">: PELAJAR / MAHASISWA</text>

      <text x="80" y="570" font-size="13" font-weight="bold" fill="#475569">Kewarganegaraan</text>
      <text x="210" y="570" font-size="13" font-weight="600" fill="#0f172a">: WNI</text>

      <text x="80" y="600" font-size="13" font-weight="bold" fill="#475569">Berlaku Hingga</text>
      <text x="210" y="600" font-size="13" font-weight="800" fill="#16a34a">: SEUMUR HIDUP</text>

      <!-- Photo Box -->
      <g transform="translate(570, 320)">
        <rect width="140" height="190" fill="#fee2e2" stroke="#ef4444" stroke-width="2" rx="6"/>
        <circle cx="70" cy="70" r="35" fill="#f87171"/>
        <path d="M 20 160 C 20 120, 120 120, 120 160 Z" fill="#dc2626"/>
        <text x="70" y="180" font-size="10" font-weight="bold" fill="#991b1b" text-anchor="middle">PAS FOTO RESMI</text>
      </g>
    `;
  } else if (type === 'akta') {
    contentSvg = `
      <rect x="25" y="25" width="750" height="1050" fill="#fffbeb" stroke="#d97706" stroke-width="3" rx="12"/>
      <rect x="40" y="40" width="720" height="1020" fill="#ffffff" stroke="#fde68a" stroke-width="1.5" rx="8"/>

      <text x="400" y="90" font-size="16" font-weight="bold" fill="#78350f" text-anchor="middle" letter-spacing="3">REPUBLIK INDONESIA</text>
      <text x="400" y="120" font-size="14" font-weight="600" fill="#92400e" text-anchor="middle">DINAS KEPENDUDUKAN DAN PENCATATAN SIPIL</text>
      <text x="400" y="140" font-size="14" font-weight="600" fill="#92400e" text-anchor="middle">KABUPATEN / KOTA ADMINISTRASI</text>

      <line x1="100" y1="160" x2="700" y2="160" stroke="#b45309" stroke-width="2"/>

      <text x="400" y="210" font-size="24" font-weight="800" fill="#78350f" text-anchor="middle">KUTIPAN AKTA KELAHIRAN</text>
      <text x="400" y="240" font-size="14" font-weight="bold" fill="#334155" text-anchor="middle">Nomor Register : AL.520.0039121-2010</text>

      <text x="80" y="320" font-size="14" fill="#334155">Berdasarkan Akta Kelahiran Nomor <tspan font-weight="bold">3271-LU-24052010-0012</tspan></text>
      <text x="80" y="350" font-size="14" fill="#334155">bahwa di <tspan font-weight="bold">${student.birthPlace.toUpperCase()}</tspan> pada tanggal <tspan font-weight="bold">${student.birthDate}</tspan></text>
      <text x="80" y="380" font-size="14" fill="#334155">telah lahir seorang anak ${student.gender === 'L' ? 'laki-laki' : 'perempuan'}:</text>

      <rect x="80" y="420" width="640" height="70" fill="#fef3c7" rx="8" stroke="#fcd34d"/>
      <text x="400" y="462" font-size="22" font-weight="800" fill="#92400e" text-anchor="middle">${student.name.toUpperCase()}</text>

      <text x="80" y="540" font-size="14" fill="#334155">anak ke <tspan font-weight="bold">KEDUA</tspan>, dari pasangan suami-istri:</text>
      <text x="120" y="580" font-size="16" font-weight="bold" fill="#0f172a">Ayah : ${student.parentName.toUpperCase()}</text>
      <text x="120" y="615" font-size="16" font-weight="bold" fill="#0f172a">Ibu : Hj. SITI AMINAH</text>

      <g transform="translate(480, 800)">
        <text x="100" y="0" font-size="13" fill="#475569" text-anchor="middle">Diterbitkan di ${student.birthPlace}</text>
        <text x="100" y="20" font-size="13" fill="#475569" text-anchor="middle">Pada tanggal ${todayStr}</text>
        <text x="100" y="50" font-size="13" font-weight="bold" fill="#1e293b" text-anchor="middle">Pejabat Pencatatan Sipil</text>
        <circle cx="100" cy="110" r="32" fill="#d97706" opacity="0.15"/>
        <text x="100" y="115" font-size="10" font-weight="bold" fill="#b45309" text-anchor="middle">CAP RESMI</text>
        <text x="100" y="165" font-size="13" font-weight="bold" text-decoration="underline" fill="#0f172a" text-anchor="middle">H. HENDRAWAN, SH, M.Si.</text>
      </g>
    `;
  } else if (type === 'ijazah') {
    contentSvg = `
      <rect x="20" y="20" width="760" height="1060" fill="#f8fafc" stroke="#047857" stroke-width="4" rx="10"/>
      <rect x="35" y="35" width="730" height="1030" fill="#ffffff" stroke="#a7f3d0" stroke-width="2" rx="8"/>

      <text x="400" y="90" font-size="18" font-weight="800" fill="#065f46" text-anchor="middle">KEMENTERIAN PENDIDIKAN, KEBUDAYAAN,</text>
      <text x="400" y="115" font-size="16" font-weight="700" fill="#065f46" text-anchor="middle">RISET, DAN TEKNOLOGI REPUBLIK INDONESIA</text>

      <text x="400" y="180" font-size="34" font-weight="900" fill="#047857" text-anchor="middle" letter-spacing="4">IJAZAH</text>
      <text x="400" y="215" font-size="16" font-weight="bold" fill="#334155" text-anchor="middle">SEKOLAH MENENGAH PERTAMA (SMP)</text>
      <text x="400" y="240" font-size="13" font-family="monospace" fill="#065f46" text-anchor="middle">NOMOR SERI : DN-02/DIK/2023/0088912</text>

      <text x="400" y="290" font-size="14" fill="#334155" text-anchor="middle">Menyatakan bahwa :</text>

      <rect x="100" y="310" width="600" height="60" fill="#ecfdf5" rx="6" stroke="#6ee7b7"/>
      <text x="400" y="348" font-size="22" font-weight="800" fill="#065f46" text-anchor="middle">${student.name.toUpperCase()}</text>

      <g transform="translate(140, 410)">
        <text x="0" y="0" font-size="13" font-weight="bold" fill="#334155">Tempat dan Tanggal Lahir</text>
        <text x="220" y="0" font-size="13" font-weight="600" fill="#0f172a">: ${student.birthPlace}, ${student.birthDate}</text>

        <text x="0" y="35" font-size="13" font-weight="bold" fill="#334155">Nomor Induk Siswa (NIS)</text>
        <text x="220" y="35" font-size="13" font-weight="600" fill="#0f172a">: ${student.nis}</text>

        <text x="0" y="70" font-size="13" font-weight="bold" fill="#334155">Nomor Induk Siswa Nasional</text>
        <text x="220" y="70" font-size="13" font-weight="800" fill="#047857">: ${student.nisn}</text>

        <text x="0" y="105" font-size="13" font-weight="bold" fill="#334155">Sekolah Asal</text>
        <text x="220" y="105" font-size="13" font-weight="600" fill="#0f172a">: SMP NEGERI 1 TELADAN</text>
      </g>

      <text x="400" y="600" font-size="18" font-weight="800" fill="#047857" text-anchor="middle">LULUS</text>
      <text x="400" y="625" font-size="13" fill="#475569" text-anchor="middle">Dari satuan pendidikan setelah memenuhi seluruh kriteria kelulusan</text>

      <g transform="translate(500, 780)">
        <text x="100" y="0" font-size="13" fill="#334155" text-anchor="middle">Jakarta, 15 Juni 2023</text>
        <text x="100" y="25" font-size="13" font-weight="bold" fill="#0f172a" text-anchor="middle">Kepala Sekolah,</text>
        <circle cx="100" cy="80" r="30" fill="#059669" opacity="0.15"/>
        <text x="100" y="85" font-size="10" font-weight="bold" fill="#047857" text-anchor="middle">CAP LEMBAGA</text>
        <text x="100" y="140" font-size="13" font-weight="bold" text-decoration="underline" fill="#0f172a" text-anchor="middle">Dr. MARDIANTO, M.Pd.</text>
        <text x="100" y="160" font-size="11" fill="#475569" text-anchor="middle">NIP. 196805121992031003</text>
      </g>
    `;
  } else if (type === 'kip') {
    contentSvg = `
      <rect x="40" y="240" width="720" height="420" rx="16" fill="#be123c" stroke="#881337" stroke-width="4"/>
      <rect x="55" y="255" width="690" height="390" rx="12" fill="#fff1f2"/>

      <!-- Header banner -->
      <rect x="55" y="255" width="690" height="85" fill="#9f1239" rx="12"/>
      <text x="80" y="295" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="2">KARTU INDONESIA PINTAR</text>
      <text x="80" y="322" font-size="13" font-weight="600" fill="#fecdd3">KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET, DAN TEKNOLOGI</text>

      <g transform="translate(90, 380)">
        <text x="0" y="0" font-size="14" font-weight="bold" fill="#881337">No. KIP</text>
        <text x="160" y="0" font-size="16" font-family="monospace" font-weight="800" fill="#0f172a">: KIP-2023-990812</text>

        <text x="0" y="35" font-size="14" font-weight="bold" fill="#881337">Nama Siswa</text>
        <text x="160" y="35" font-size="15" font-weight="800" fill="#0f172a">: ${student.name.toUpperCase()}</text>

        <text x="0" y="70" font-size="14" font-weight="bold" fill="#881337">NISN</text>
        <text x="160" y="70" font-size="15" font-family="monospace" font-weight="700" fill="#0f172a">: ${student.nisn}</text>

        <text x="0" y="105" font-size="14" font-weight="bold" fill="#881337">Nama Sekolah</text>
        <text x="160" y="105" font-size="14" font-weight="600" fill="#0f172a">: SMP / SMK AL-TAFAQQUH FIDDIN</text>

        <text x="0" y="140" font-size="14" font-weight="bold" fill="#881337">Berlaku s/d</text>
        <text x="160" y="140" font-size="14" font-weight="700" fill="#15803d">: JULI 2027</text>
      </g>

      <!-- Barcode sim -->
      <g transform="translate(480, 490)">
        <rect width="200" height="60" fill="#ffffff" stroke="#fda4af" rx="4"/>
        <text x="100" y="35" font-size="14" font-family="monospace" font-weight="bold" fill="#0f172a" text-anchor="middle">||| | |||| | ||| ||||</text>
        <text x="100" y="52" font-size="10" font-family="monospace" fill="#475569" text-anchor="middle">ID: 88912-320108</text>
      </g>
    `;
  } else {
    // Dokumen Lainnya / Sertifikat / Pas Foto
    contentSvg = `
      <rect x="25" y="25" width="750" height="1050" fill="#faf5ff" stroke="#7e22ce" stroke-width="3" rx="10"/>
      <rect x="40" y="40" width="720" height="1020" fill="#ffffff" stroke="#e9d5ff" stroke-width="1.5" rx="8"/>

      <text x="400" y="110" font-size="26" font-weight="900" fill="#6b21a8" text-anchor="middle" letter-spacing="2">DOKUMEN PENDUKUNG SISWA</text>
      <text x="400" y="145" font-size="16" font-weight="600" fill="#3b0764" text-anchor="middle">Sertifikat Prestasi &amp; Berkas Pendukung Administrasi</text>

      <rect x="80" y="200" width="640" height="80" fill="#f3e8ff" rx="8"/>
      <text x="400" y="248" font-size="20" font-weight="800" fill="#581c87" text-anchor="middle">${student.name.toUpperCase()}</text>

      <g transform="translate(100, 340)">
        <text x="0" y="0" font-size="15" font-weight="bold" fill="#475569">NISN</text>
        <text x="150" y="0" font-size="15" font-weight="700" fill="#0f172a">: ${student.nisn}</text>

        <text x="0" y="40" font-size="15" font-weight="bold" fill="#475569">Kelas</text>
        <text x="150" y="40" font-size="15" font-weight="700" fill="#0f172a">: ${student.classRoom}</text>

        <text x="0" y="80" font-size="15" font-weight="bold" fill="#475569">Deskripsi Berkas</text>
        <text x="150" y="80" font-size="15" font-weight="600" fill="#0f172a">: Piagam Penghargaan Juara 1 OSN Matematika Tingkat Kota</text>

        <text x="0" y="120" font-size="15" font-weight="bold" fill="#475569">Tahun Terbit</text>
        <text x="150" y="120" font-size="15" font-weight="600" fill="#0f172a">: 2024</text>
      </g>

      <rect x="250" y="550" width="300" height="200" fill="#f5f3ff" stroke="#c084fc" stroke-dasharray="6,6" rx="8"/>
      <text x="400" y="655" font-size="14" font-weight="bold" fill="#7e22ce" text-anchor="middle">DOKUMEN RESMI TERSERTIFIKASI</text>

      <g transform="translate(500, 850)">
        <text x="100" y="0" font-size="13" fill="#334155" text-anchor="middle">Disahkan oleh Satuan Pendidikan</text>
        <circle cx="100" cy="50" r="28" fill="#9333ea" opacity="0.15"/>
        <text x="100" y="55" font-size="10" font-weight="bold" fill="#7e22ce" text-anchor="middle">LEGALISIR</text>
        <text x="100" y="105" font-size="13" font-weight="bold" text-decoration="underline" fill="#0f172a" text-anchor="middle">Koordinator Kesiswaan</text>
      </g>
    `;
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#f1f5f9;stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#grad1)"/>
    ${contentSvg}
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(fullSvg)}`;
}
