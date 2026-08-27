import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GeneratedAccountResult, SchoolProfile } from '../types';

export interface ExportPdfOptions {
  schoolProfile: SchoolProfile;
  accounts: GeneratedAccountResult[];
  categoryFilter?: string; // 'ALL' | 'GURU' | 'SISWA' | 'KEPALA SEKOLAH'
  adminName?: string;
}

export const exportGeneratedAccountsPdf = ({
  schoolProfile,
  accounts,
  categoryFilter = 'ALL',
  adminName = 'Administrator Sekolah',
}: ExportPdfOptions) => {
  if (!accounts || accounts.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  let currentY = 15;

  // 1. KOP SURAT / HEADER RESMI
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42); // slate-900
  const schoolName = (schoolProfile.namaSekolah || 'SD NEGERI NUSANTARA').toUpperCase();
  doc.text(schoolName, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // slate-600

  const addressLine = [
    schoolProfile.jalan,
    schoolProfile.desaKelurahan,
    schoolProfile.kecamatan,
    schoolProfile.kabupatenKota,
    schoolProfile.provinsi,
  ]
    .filter(Boolean)
    .join(', ') || schoolProfile.alamat || 'Indonesia';

  doc.text(addressLine, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;

  const metaLine = [
    schoolProfile.npsn ? `NPSN: ${schoolProfile.npsn}` : null,
    schoolProfile.kodeSekolah ? `Kode Sekolah: ${schoolProfile.kodeSekolah}` : null,
    schoolProfile.teleponFax ? `Telp: ${schoolProfile.teleponFax}` : null,
    schoolProfile.email ? `Email: ${schoolProfile.email}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');

  if (metaLine) {
    doc.text(metaLine, pageWidth / 2, currentY, { align: 'center' });
    currentY += 4;
  }

  // Divider Line
  doc.setDrawColor(30, 41, 59); // slate-800
  doc.setLineWidth(0.7);
  doc.line(marginX, currentY, pageWidth - marginX, currentY);
  doc.setLineWidth(0.2);
  doc.line(marginX, currentY + 0.8, pageWidth - marginX, currentY + 0.8);
  currentY += 7;

  // 2. JUDUL DOKUMEN
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138); // blue-900
  const titleText =
    categoryFilter === 'GURU'
      ? 'DAFTAR AKUN LOGIN PENDIDIK & TENAGA KEPENDIDIKAN (GURU)'
      : categoryFilter === 'SISWA'
      ? 'DAFTAR AKUN LOGIN PESERTA DIDIK (SISWA)'
      : categoryFilter === 'KEPALA SEKOLAH'
      ? 'DAFTAR AKUN LOGIN KEPALA SEKOLAH'
      : 'DAFTAR AKUN PENGGUNA TERGENERATE & PASSWORD ACAK';

  doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  // Sub-header Metadata
  const now = new Date();
  const dateFormatted = now.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeFormatted = now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Waktu Generate: ${dateFormatted} pukul ${timeFormatted} WIB  •  Tahun Pelajaran: ${schoolProfile.tahunPelajaran || '2025/2026'}`,
    pageWidth / 2,
    currentY,
    { align: 'center' }
  );
  currentY += 6;

  // 3. STATISTIK RINGKASAN
  const totalGuru = accounts.filter((a) => a.category === 'GURU').length;
  const totalSiswa = accounts.filter((a) => a.category === 'SISWA').length;
  const totalKepsek = accounts.filter((a) => a.category === 'KEPALA SEKOLAH').length;
  const totalBaru = accounts.filter((a) => a.status === 'CREATED').length;
  const totalReset = accounts.filter((a) => a.status === 'UPDATED').length;

  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 8, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);

  const summaryText = `Total: ${accounts.length} Akun  |  Guru: ${totalGuru}  |  Siswa: ${totalSiswa}  |  Kepala Sekolah: ${totalKepsek}  |  Baru: ${totalBaru}  |  Reset: ${totalReset}`;
  doc.text(summaryText, pageWidth / 2, currentY + 5.2, { align: 'center' });
  currentY += 12;

  // 4. TABEL AKUN (AUTOTABLE)
  const tableData = accounts.map((acc, index) => [
    index + 1,
    acc.name || '-',
    acc.username || '-',
    acc.password || '-',
    acc.role === 'WALI KELAS'
      ? 'Guru (Wali Kelas)'
      : acc.role === 'GURU MAPEL'
      ? 'Guru (Mapel)'
      : acc.role === 'KEPALA SEKOLAH'
      ? 'Kepala Sekolah'
      : acc.role,
    acc.className || '-',
    acc.status === 'CREATED' ? 'Baru' : acc.status === 'UPDATED' ? 'Direset' : 'Aktif',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: marginX, right: marginX, top: 18, bottom: 22 },
    head: [['No', 'Nama Pengguna', 'Username (ID)', 'Password', 'Peran / Hak Akses', 'Kelas', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // #1e3a8a deep navy blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle',
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 1.8,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 9 }, // No
      1: { halign: 'left', cellWidth: 46 }, // Nama
      2: { halign: 'left', font: 'courier', fontStyle: 'bold', cellWidth: 32 }, // Username
      3: { halign: 'center', font: 'courier', fontStyle: 'bold', textColor: [37, 99, 235], cellWidth: 26 }, // Password (blue)
      4: { halign: 'left', cellWidth: 32 }, // Peran
      5: { halign: 'center', cellWidth: 19 }, // Kelas
      6: { halign: 'center', cellWidth: 18 }, // Status
    },
    didDrawPage: (data) => {
      // Header on subsequent pages
      if (data.pageNumber > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `${schoolName} — Daftar Akun Pengguna Tergenerate`,
          marginX,
          10
        );
        doc.text(
          `Tanggal: ${dateFormatted}`,
          pageWidth - marginX,
          10,
          { align: 'right' }
        );
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, 12, pageWidth - marginX, 12);
      }

      // Footer
      const totalPagesExp = '{total_pages_count_string}';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400

      doc.text(
        'Sistem Absensi Digital Kawacanaan — Dokumen Rahasia',
        marginX,
        pageHeight - 10
      );

      const pageStr = `Halaman ${data.pageNumber} dari ${totalPagesExp}`;
      doc.text(pageStr, pageWidth - marginX, pageHeight - 10, { align: 'right' });
    },
  });

  // Calculate position after table for signatures
  let finalY = (doc as any).lastAutoTable.finalY + 8;

  // If not enough space for signature block (need ~35mm), add new page
  if (finalY + 35 > pageHeight - 20) {
    doc.addPage();
    finalY = 25;
  }

  // Confidentiality Notice
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Catatan: Simpan dan bagikan informasi akun ini secara rahasia kepada masing-masing pemilik akun. Jangan mempublikasikan kata sandi secara terbuka.',
    marginX,
    finalY
  );
  finalY += 8;

  // Signature Block
  const sigLeftX = marginX + 15;
  const sigRightX = pageWidth - marginX - 50;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Left Sign: Kepala Sekolah
  doc.text('Mengetahui,', sigLeftX, finalY, { align: 'center' });
  doc.text('Kepala Sekolah', sigLeftX, finalY + 4, { align: 'center' });

  // Right Sign: Administrator / Pembuat Dokumen
  doc.text(`${schoolProfile.kabupatenKota || 'Jakarta'}, ${dateFormatted}`, sigRightX, finalY, { align: 'center' });
  doc.text('Administrator Sistem', sigRightX, finalY + 4, { align: 'center' });

  const sigNameY = finalY + 22;

  // Kepala Sekolah Name & NIP
  doc.setFont('helvetica', 'bold');
  const kepsekName = schoolProfile.namaKepalaSekolah || '( ........................................ )';
  doc.text(kepsekName, sigLeftX, sigNameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    schoolProfile.nipKepalaSekolah ? `NIP. ${schoolProfile.nipKepalaSekolah}` : 'NIP. -',
    sigLeftX,
    sigNameY + 4,
    { align: 'center' }
  );

  // Administrator Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(adminName || 'Administrator', sigRightX, sigNameY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Unit Pengelola IT Sekolah', sigRightX, sigNameY + 4, { align: 'center' });

  // Replace total pages placeholder in all pages
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages('{total_pages_count_string}');
  }

  // Save the PDF file
  const fileName = `Daftar_Akun_Generate_${(schoolProfile.namaSekolah || 'Sekolah')
    .replace(/[^a-zA-Z0-9]/g, '_')}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
};
