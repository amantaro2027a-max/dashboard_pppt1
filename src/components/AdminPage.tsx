import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { AdminLogin } from './AdminLogin';
import { FilterBar } from './FilterBar';
import { getStatusConfig, formatRM } from '../utils/formatters';
import { AdminUser, Pegawai, ProgramItem } from '../types/program';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building,
  Briefcase,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Lock,
  Mail,
  Phone,
  User,
  X,
  Sparkles,
  Download,
  Upload,
  Bell,
  AlertTriangle,
  ShieldAlert,
  ArrowUpDown,
  CheckSquare,
  Square,
  ChevronRight,
  RefreshCw,
  Key,
  FileDown,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    logout,
    setActiveTab,
    filteredPrograms,
    programs,
    setIsFormOpen,
    setIsExportOpen,
    setProgramToEdit,
    deleteProgram,
    deleteMultiplePrograms,
    importPrograms,
    adminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
    pusatList,
    jabatanMap,
    pegawaiList,
    sumberKewanganList,
    statusProgramList,
    jawatanList,
    addPegawai,
    updatePegawai,
    deletePegawai,
    addPusat,
    updatePusat,
    deletePusat,
    addJabatan,
    updateJabatan,
    deleteJabatan,
    addSumberKewangan,
    updateSumberKewangan,
    deleteSumberKewangan,
    addStatusProgram,
    updateStatusProgram,
    deleteStatusProgram,
    addJawatan,
    updateJawatan,
    deleteJawatan,
  } = useProgramContext();

  // Active sub-tab inside Admin portal
  const [adminTab, setAdminTab] = useState<'programs' | 'users' | 'master'>('programs');

  // Master Data active subcategory (including Tabs 7, 8, 9)
  const [masterCategory, setMasterCategory] = useState<
    'pegawai' | 'pusat' | 'jabatan' | 'sumber' | 'status' | 'jawatan' | 'muat_turun_naik' | 'notifikasi' | 'padam_data'
  >('pegawai');

  // Tab 7: Muat Naik / Muat Turun Data states
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importedPrograms, setImportedPrograms] = useState<ProgramItem[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab 9: PADAM DATA states
  const [deleteTabMode, setDeleteTabMode] = useState<'semua' | 'pusat' | 'jabatan' | 'status' | 'single'>('semua');
  const [selectedPusatToDelete, setSelectedPusatToDelete] = useState(pusatList[0] || '');
  const [selectedJabatanToDelete, setSelectedJabatanToDelete] = useState('');
  const [selectedStatusToDelete, setSelectedStatusToDelete] = useState(statusProgramList[0] || '');
  const [searchSingleProgram, setSearchSingleProgram] = useState('');
  const [deleteActionMsg, setDeleteActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Dedicated Re-Auth Modal for Delete ALL Programs
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [authSuperAdminId, setAuthSuperAdminId] = useState('');
  const [authSuperAdminPassword, setAuthSuperAdminPassword] = useState('');
  const [authModalError, setAuthModalError] = useState<string | null>(null);

  // Custom Delete Confirmation Modal state (Replaces window.confirm)
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const requestDeleteConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDeleteConfirm({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setDeleteConfirm((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Form states for creating new admin user
  // Pagination & sorting for Senarai Ringkas Program Pusat (Keseluruhan)
  const [programDisplayLimit, setProgramDisplayLimit] = useState<string>('10');
  const [programSortKey, setProgramSortKey] = useState<'pusat' | 'jabatan' | 'kodProgram' | 'namaProgram' | 'statusProgram' | null>(null);
  const [programSortDirection, setProgramSortDirection] = useState<'asc' | 'desc'>('asc');

  // Form states for creating new admin user
  const [selectedPegawaiIdForAdmin, setSelectedPegawaiIdForAdmin] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPusat, setNewAdminPusat] = useState('');
  const [newAdminJabatan, setNewAdminJabatan] = useState('');
  const [newAdminSelectedJabatans, setNewAdminSelectedJabatans] = useState<string[]>([]);
  const [newAdminAllowedPages, setNewAdminAllowedPages] = useState<string[]>([]);
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States for Editing Admin User
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminPusat, setEditAdminPusat] = useState('');
  const [editAdminJabatan, setEditAdminJabatan] = useState('');
  const [editAdminSelectedJabatans, setEditAdminSelectedJabatans] = useState<string[]>([]);
  const [editAdminAllowedPages, setEditAdminAllowedPages] = useState<string[]>([]);
  const [editAdminMsg, setEditAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Master Data: Pegawai (6 fields requirement)
  const [isPegawaiFormOpen, setIsPegawaiFormOpen] = useState(false);
  const [editingPegawaiId, setEditingPegawaiId] = useState<string | null>(null);
  const [pegawaiFormNama, setPegawaiFormNama] = useState('');
  const [pegawaiFormPusat, setPegawaiFormPusat] = useState(pusatList[0] || '');
  const [pegawaiFormJabatan, setPegawaiFormJabatan] = useState(
    (jabatanMap[pusatList[0]] && jabatanMap[pusatList[0]][0]) || ''
  );
  const [pegawaiFormJawatan, setPegawaiFormJawatan] = useState(
    jawatanList[0] || 'PENSYARAH'
  );
  const [pegawaiFormEmel, setPegawaiFormEmel] = useState('');
  const [pegawaiFormNoHp, setPegawaiFormNoHp] = useState('');

  // Form states for Pusat, Jabatan, Sumber, Status, Jawatan
  const [pusatInput, setPusatInput] = useState('');
  const [editingPusat, setEditingPusat] = useState<string | null>(null);

  const [selectedPusatForJabatan, setSelectedPusatForJabatan] = useState(pusatList[0] || '');
  const [jabatanInput, setJabatanInput] = useState('');
  const [editingJabatan, setEditingJabatan] = useState<string | null>(null);

  const [sumberInput, setSumberInput] = useState('');
  const [editingSumber, setEditingSumber] = useState<string | null>(null);

  const [statusInput, setStatusInput] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const [jawatanInput, setJawatanInput] = useState('');
  const [editingJawatan, setEditingJawatan] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // REQUIREMENT: Pages available for permission assignment
  const AVAILABLE_PAGES = [
    { key: 'PERINCIAN PROGRAM', label: 'PERINCIAN PROGRAM' },
    { key: 'PERUNTUKAN', label: 'PERUNTUKAN' },
    { key: 'PERBELANJAAN', label: 'PERBELANJAAN' },
    { key: 'SUBWARAN', label: 'SUBWARAN' },
    { key: 'BAKI PERUNTUKAN', label: 'BAKI PERUNTUKAN' },
  ];

  // Sorting & Display count for Program List
  const handleSortProgram = (key: 'pusat' | 'jabatan' | 'kodProgram' | 'namaProgram' | 'statusProgram') => {
    if (programSortKey === key) {
      setProgramSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProgramSortKey(key);
      setProgramSortDirection('asc');
    }
  };

  // REQUIREMENT 1 & User Request:
  // "Untuk paparan admin jabatan, apabila mana-mana admin log in sahaja, hanya dipaparkan program di bawah jabatan mereka sahaja (filtered)."
  const adminProgramList = useMemo(() => {
    if (!currentUser) return [];
    let list = isSuperAdmin
      ? filteredPrograms
      : filteredPrograms.filter((p) => {
          const allowed = currentUser.allowedJabatans || (currentUser.jabatan ? [currentUser.jabatan] : []);
          if (allowed.length === 0 || allowed.includes('SEMUA JABATAN')) return true;
          return allowed.includes(p.jabatan);
        });

    if (programSortKey) {
      list = [...list].sort((a, b) => {
        const valA = (a[programSortKey] || '').toString().toLowerCase();
        const valB = (b[programSortKey] || '').toString().toLowerCase();
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return programSortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [isSuperAdmin, filteredPrograms, currentUser, programSortKey, programSortDirection]);

  const displayedAdminPrograms = useMemo(() => {
    if (programDisplayLimit === 'Semua') return adminProgramList;
    return adminProgramList.slice(0, Number(programDisplayLimit));
  }, [adminProgramList, programDisplayLimit]);

  const totalProgramsForUser = useMemo(() => {
    if (!currentUser) return 0;
    if (isSuperAdmin) return programs.length;
    const allowed = currentUser.allowedJabatans || (currentUser.jabatan ? [currentUser.jabatan] : []);
    if (allowed.length === 0 || allowed.includes('SEMUA JABATAN')) return programs.length;
    return programs.filter((p) => allowed.includes(p.jabatan)).length;
  }, [isSuperAdmin, programs, currentUser]);

  const allJabatansList = useMemo(() => {
    const list: string[] = [];
    Object.values(jabatanMap).forEach((arr) => {
      arr.forEach((j) => {
        if (!list.includes(j)) list.push(j);
      });
    });
    return list.sort();
  }, [jabatanMap]);

  // If not logged in, render the login page (placed after all hooks)
  if (!currentUser) {
    return <AdminLogin />;
  }

  // Handling Program Edit (LOCKED for SELESAI programs)
  const handleEditProgram = (prog: ProgramItem) => {
    if (prog.statusProgram.toUpperCase() === 'SELESAI') {
      alert('Program berstatus SELESAI telah dikunci (LOCKED) dan tidak boleh diedit oleh mana-mana Admin.');
      return;
    }
    const allowed = currentUser.allowedJabatans || (currentUser.jabatan ? [currentUser.jabatan] : []);
    const hasDeptAccess = isSuperAdmin || allowed.length === 0 || allowed.includes('SEMUA JABATAN') || allowed.includes(prog.jabatan);
    if (!hasDeptAccess) {
      alert(`Akses Ditolak: Anda hanya boleh mengemaskini program di bawah jabatan yang diberi akses kepada anda.`);
      return;
    }
    setProgramToEdit(prog);
    setIsFormOpen(true);
  };

  // Handling Program Delete (Super Admin only - using custom confirmation modal)
  const handleDeleteProgram = (prog: ProgramItem) => {
    if (!isSuperAdmin) {
      alert('Akses Ditolak: Hanya Super Admin dibenarkan memadam program.');
      return;
    }
    requestDeleteConfirm(
      'Padam Rekod Program',
      `Adakah anda pasti ingin memadamkan program "${prog.namaProgram}"? Tindakan ini tidak boleh diundur.`,
      () => {
        deleteProgram(prog.id);
      }
    );
  };

  // =========================================================================
  // TAB 7 & 9 HELPERS: BACKUP, EXPORT, IMPORT & DELETION
  // =========================================================================

  // REQUIREMENT: Sebelum delete sebarang program, backup dahulu dengan cara auto download data tersebut.
  const autoBackupBeforeDelete = (programsToBackup: ProgramItem[], reason: string) => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `AUTOBACKUP_IAB_${reason.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${timestamp}.json`;
    const jsonStr = JSON.stringify(programsToBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Tab 7: Muat Turun Semua Data (JSON Lengkap + Rekod BK04)
  const handleDownloadAllJSON = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `DATA_PROGRAM_IAB_LENGKAP_BK04_${timestamp}.json`;
    const jsonStr = JSON.stringify(programs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setImportStatusMsg({
      type: 'success',
      text: `Fail JSON lengkap (${programs.length} program termasuk rekod pindaan BK04) berjaya dimuat turun (${fileName})!`,
    });
    setTimeout(() => setImportStatusMsg(null), 5000);
  };

  // Tab 7: Muat Turun Data (Excel .xlsx Lengkap)
  const handleDownloadAllExcel = () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `DATA_PROGRAM_IAB_LENGKAP_${timestamp}.xlsx`;

      const programRows = programs.map((p, idx) => ({
        Bil: idx + 1,
        'ID Sistem': p.id,
        'Kod Program': p.kodProgram,
        'Nama Program': p.namaProgram,
        Pusat: p.pusat,
        Jabatan: p.jabatan,
        'Jenis Program': p.jenisProgram,
        Tempoh: p.tempoh,
        'Jumlah Hari': p.jumlahHari,
        'Tarikh Mula': p.tarikhMula || '',
        'Tarikh Tamat': p.tarikhTamat || '',
        Tempat: p.tempat,
        Negeri: p.negeri,
        'Bilangan Peserta': p.bilanganPeserta,
        'Pengurus ID': p.pengurusId,
        'Pengurus Nama': p.pengurusNama,
        'Pengurus Bersama ID': p.pengurusBersamaId || '',
        'Pengurus Bersama Nama': p.pengurusBersamaNama || '',
        'Sumber Kewangan': p.sumberKewangan,
        'OS21000 (RM)': p.os21000,
        'OS24000 (RM)': p.os24000,
        'OS27000 (RM)': p.os27000,
        'OS29000 (RM)': p.os29000,
        'Jumlah Peruntukan (RM)': p.jumlahRm,
        'Belanja Sebenar OS21 (RM)': p.os21000Belanja || 0,
        'Belanja Sebenar OS24 (RM)': p.os24000Belanja || 0,
        'Belanja Sebenar OS27 (RM)': p.os27000Belanja || 0,
        'Belanja Sebenar OS29 (RM)': p.os29000Belanja || 0,
        'Jumlah Belanja Sebenar (RM)': p.jumlahBelanjaRm || 0,
        'Penjimatan (RM)': p.jumlahPenjimatanRm || 0,
        'Status Program': p.statusProgram,
        Tahun: p.tahun,
        Bulan: p.bulan,
        Catatan: p.catatan || '',
        'Bil Pindaan BK04': (p.rekodPindaan || []).length,
      }));

      const bk04Rows: any[] = [];
      programs.forEach((p) => {
        (p.rekodPindaan || []).forEach((r) => {
          (r.perubahan || []).forEach((c, cIdx) => {
            bk04Rows.push({
              'Kod Program': p.kodProgram,
              'Nama Program': p.namaProgram,
              'No Pindaan': r.noPindaan,
              'Tarikh Pindaan': r.tarikhPindaan,
              'Dikemaskini Oleh': r.dikemaskiniOleh,
              'Bil': cIdx + 1,
              'Jenis Perubahan': c.jenisPerubahan,
              'Maklumat Asal': c.maklumatAsal,
              'Maklumat Terkini': c.maklumatTerkini,
            });
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const wsProg = XLSX.utils.json_to_sheet(programRows);
      XLSX.utils.book_append_sheet(wb, wsProg, 'Data Program Lengkap');

      if (bk04Rows.length > 0) {
        const wsBK = XLSX.utils.json_to_sheet(bk04Rows);
        XLSX.utils.book_append_sheet(wb, wsBK, 'Rekod Pindaan BK04');
      }

      XLSX.writeFile(wb, fileName);
      setImportStatusMsg({
        type: 'success',
        text: `Fail Excel lengkap berjaya dimuat turun (${fileName})!`,
      });
      setTimeout(() => setImportStatusMsg(null), 5000);
    } catch (err) {
      console.error('Error generating Excel:', err);
      setImportStatusMsg({ type: 'error', text: 'Ralat semasa menjana fail Excel.' });
    }
  };

  // Tab 7: Proses Muat Naik File (JSON atau Excel)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportStatusMsg(null);

    const reader = new FileReader();

    if (file.name.endsWith('.json')) {
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter((it) => it && (it.namaProgram || it.kodProgram));
            if (valid.length === 0) {
              setImportStatusMsg({
                type: 'error',
                text: 'Format fail JSON tidak sah: tiada rekod program dikesan.',
              });
              setImportedPrograms(null);
              return;
            }
            setImportedPrograms(valid);
            setImportStatusMsg({
              type: 'success',
              text: `${valid.length} rekod program berjaya dikesan daripada ${file.name}. Sila semak dan sahkan import di bawah.`,
            });
          } else {
            setImportStatusMsg({
              type: 'error',
              text: 'Fail JSON mesti mengandungi senarai (array) rekod program.',
            });
            setImportedPrograms(null);
          }
        } catch (err) {
          setImportStatusMsg({
            type: 'error',
            text: 'Gagal membaca fail JSON. Sila pastikan format JSON adalah sah.',
          });
          setImportedPrograms(null);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

          if (jsonData.length === 0) {
            setImportStatusMsg({
              type: 'error',
              text: 'Lembaran Excel kosong atau tiada data rekod dikesan.',
            });
            setImportedPrograms(null);
            return;
          }

          const mapped: ProgramItem[] = jsonData.map((row, idx) => {
            const id = row['ID Sistem'] || row['id'] || `imported-${Date.now()}-${idx}`;
            const kod = row['Kod Program'] || row['kodProgram'] || `PRG-${idx + 1}`;
            const nama = row['Nama Program'] || row['namaProgram'] || 'Program Tanpa Nama';
            const os21 = Number(row['OS21000 (RM)'] || row['os21000'] || 0);
            const os24 = Number(row['OS24000 (RM)'] || row['os24000'] || 0);
            const os27 = Number(row['OS27000 (RM)'] || row['os27000'] || 0);
            const os29 = Number(row['OS29000 (RM)'] || row['os29000'] || 0);
            const jumlah = Number(row['Jumlah Peruntukan (RM)'] || row['jumlahRm'] || (os21 + os24 + os27 + os29));

            const now = new Date();
            const tahun = Number(row['Tahun'] || now.getFullYear());
            const bulan = Number(row['Bulan'] || (now.getMonth() + 1));
            const os21B = Number(row['Belanja Sebenar OS21 (RM)'] || row['os21000Belanja'] || 0);
            const os24B = Number(row['Belanja Sebenar OS24 (RM)'] || row['os24000Belanja'] || 0);
            const os27B = Number(row['Belanja Sebenar OS27 (RM)'] || row['os27000Belanja'] || 0);
            const os29B = Number(row['Belanja Sebenar OS29 (RM)'] || row['os29000Belanja'] || 0);
            const jBelanja = Number(row['Jumlah Belanja Sebenar (RM)'] || row['jumlahBelanjaRm'] || (os21B + os24B + os27B + os29B));

            return {
              id,
              kodProgram: kod,
              namaProgram: nama,
              pusat: row['Pusat'] || row['pusat'] || pusatList[0] || 'PPPT',
              jabatan: row['Jabatan'] || row['jabatan'] || 'JABATAN PENGURUSAN TEKNOLOGI PENDIDIKAN',
              jenisProgram: row['Jenis Program'] || row['jenisProgram'] || 'Latihan',
              tempoh: row['Tempoh'] || row['tempoh'] || '',
              jumlahHari: Number(row['Jumlah Hari'] || row['jumlahHari'] || 1),
              tarikhMula: row['Tarikh Mula'] || row['tarikhMula'] || '',
              tarikhTamat: row['Tarikh Tamat'] || row['tarikhTamat'] || '',
              tempat: row['Tempat'] || row['tempat'] || 'IAB Induk',
              negeri: row['Negeri'] || row['negeri'] || 'Selangor',
              bilanganPeserta: Number(row['Bilangan Peserta'] || row['bilanganPeserta'] || 0),
              pengurusId: row['Pengurus ID'] || row['pengurusId'] || 'Pegawai 1',
              pengurusNama: row['Pengurus Nama'] || row['pengurusNama'] || '',
              pengurusBersamaId: row['Pengurus Bersama ID'] || row['pengurusBersamaId'] || '',
              pengurusBersamaNama: row['Pengurus Bersama Nama'] || row['pengurusBersamaNama'] || '',
              sumberKewangan: row['Sumber Kewangan'] || row['sumberKewangan'] || 'IAB - LATIHAN',
              os21000: os21,
              os24000: os24,
              os27000: os27,
              os29000: os29,
              jumlahRm: jumlah,
              os21000Belanja: os21B,
              os24000Belanja: os24B,
              os27000Belanja: os27B,
              os29000Belanja: os29B,
              jumlahBelanjaRm: jBelanja,
              jumlahPenjimatanRm: Number(row['Penjimatan (RM)'] || row['jumlahPenjimatanRm'] || (jumlah - jBelanja)),
              statusProgram: row['Status Program'] || row['statusProgram'] || 'DALAM TINDAKAN',
              tahun,
              bulan,
              catatan: row['Catatan'] || row['catatan'] || '',
              rekodPindaan: [],
            };
          });

          setImportedPrograms(mapped);
          setImportStatusMsg({
            type: 'success',
            text: `${mapped.length} rekod program dikesan daripada fail Excel ${file.name}. Sila semak dan sahkan import.`,
          });
        } catch (err) {
          setImportStatusMsg({
            type: 'error',
            text: 'Gagal memproses fail Excel. Sila pastikan format lajur bersesuaian.',
          });
          setImportedPrograms(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setImportStatusMsg({
        type: 'error',
        text: 'Format fail tidak disokong. Sila pilih fail .json atau .xlsx.',
      });
      setImportedPrograms(null);
    }
  };

  // Tab 7: Sahkan & Jalankan Import
  const executeCommitImport = () => {
    if (!importedPrograms || importedPrograms.length === 0) return;

    const res = importPrograms(importedPrograms, importMode);
    if (res.success) {
      setImportStatusMsg({
        type: 'success',
        text: `Berjaya mengimport ${res.count || importedPrograms.length} rekod program (Mod: ${
          importMode === 'replace' ? 'Gantikan Semua Data' : 'Gabung / Kemaskini'
        })!`,
      });
      setImportedPrograms(null);
      setImportFileName(null);
      setTimeout(() => setImportStatusMsg(null), 6000);
    } else {
      setImportStatusMsg({
        type: 'error',
        text: res.message || 'Ralat berlaku semasa proses import data.',
      });
    }
  };

  // Tab 9: Deletion Handlers with Automatic Backup
  const handleConfirmDeleteAll = () => {
    setAuthModalError(null);
    if (!authSuperAdminId.trim() || !authSuperAdminPassword.trim()) {
      setAuthModalError('Sila masukkan ID dan Kata Laluan Super Admin.');
      return;
    }

    if (
      authSuperAdminId.trim() !== currentUser?.id ||
      authSuperAdminPassword !== currentUser?.password
    ) {
      setAuthModalError('ID atau Kata Laluan Super Admin tidak tepat. Pengesahan identiti gagal.');
      return;
    }

    // REQUIREMENT: Sebelum delete sebarang program, backup dahulu dengan cara auto download data tersebut.
    autoBackupBeforeDelete(programs, 'SEMUA_PROGRAM_KESELURUHAN');

    const allIds = programs.map((p) => p.id);
    const result = deleteMultiplePrograms(allIds);

    setIsDeleteAllModalOpen(false);
    setAuthSuperAdminId('');
    setAuthSuperAdminPassword('');

    setDeleteActionMsg({
      type: 'success',
      text: `Salinan sandaran JSON telah dimuat turun secara automatik. Semua (${result.count || allIds.length}) program telah berjaya dipadamkan dari sistem.`,
    });
    setTimeout(() => setDeleteActionMsg(null), 8000);
  };

  const handleDeleteByPusat = () => {
    const target = programs.filter((p) => p.pusat === selectedPusatToDelete);
    if (target.length === 0) {
      setDeleteActionMsg({
        type: 'error',
        text: `Tiada program dijumpai di bawah pusat "${selectedPusatToDelete}".`,
      });
      return;
    }

    requestDeleteConfirm(
      `Padam Semua Program Pusat ${selectedPusatToDelete}`,
      `Adakah anda pasti ingin memadamkan ${target.length} program di bawah "${selectedPusatToDelete}"? Salinan sandaran JSON akan dimuat turun secara automatik sebelum pemadaman.`,
      () => {
        autoBackupBeforeDelete(target, `PUSAT_${selectedPusatToDelete}`);
        deleteMultiplePrograms(target.map((p) => p.id));
        setDeleteActionMsg({
          type: 'success',
          text: `Salinan sandaran JSON telah dimuat turun secara automatik. ${target.length} program bagi pusat "${selectedPusatToDelete}" berjaya dipadamkan.`,
        });
        setTimeout(() => setDeleteActionMsg(null), 6000);
      }
    );
  };

  const handleDeleteByJabatan = () => {
    const target = programs.filter((p) => p.jabatan === selectedJabatanToDelete);
    if (target.length === 0) {
      setDeleteActionMsg({
        type: 'error',
        text: `Tiada program dijumpai di bawah jabatan "${selectedJabatanToDelete}".`,
      });
      return;
    }

    requestDeleteConfirm(
      `Padam Semua Program Jabatan ${selectedJabatanToDelete}`,
      `Adakah anda pasti ingin memadamkan ${target.length} program di bawah jabatan "${selectedJabatanToDelete}"? Salinan sandaran JSON akan dimuat turun secara automatik sebelum dipadamkan.`,
      () => {
        autoBackupBeforeDelete(target, `JABATAN_${selectedJabatanToDelete}`);
        deleteMultiplePrograms(target.map((p) => p.id));
        setDeleteActionMsg({
          type: 'success',
          text: `Salinan sandaran JSON telah dimuat turun secara automatik. ${target.length} program bagi jabatan "${selectedJabatanToDelete}" berjaya dipadamkan.`,
        });
        setTimeout(() => setDeleteActionMsg(null), 6000);
      }
    );
  };

  const handleDeleteByStatus = () => {
    const target = programs.filter((p) => p.statusProgram === selectedStatusToDelete);
    if (target.length === 0) {
      setDeleteActionMsg({
        type: 'error',
        text: `Tiada program dijumpai berstatus "${selectedStatusToDelete}".`,
      });
      return;
    }

    requestDeleteConfirm(
      `Padam Semua Program Status "${selectedStatusToDelete}"`,
      `Adakah anda pasti ingin memadamkan ${target.length} program berstatus "${selectedStatusToDelete}"? Salinan sandaran JSON akan dimuat turun secara automatik sebelum pemadaman.`,
      () => {
        autoBackupBeforeDelete(target, `STATUS_${selectedStatusToDelete}`);
        deleteMultiplePrograms(target.map((p) => p.id));
        setDeleteActionMsg({
          type: 'success',
          text: `Salinan sandaran JSON telah dimuat turun secara automatik. ${target.length} program berstatus "${selectedStatusToDelete}" berjaya dipadamkan.`,
        });
        setTimeout(() => setDeleteActionMsg(null), 6000);
      }
    );
  };

  const handleDeleteSingleProgramWithBackup = (prog: ProgramItem) => {
    requestDeleteConfirm(
      `Padam Program: ${prog.kodProgram}`,
      `Adakah anda pasti ingin memadamkan program "${prog.namaProgram}" (${prog.kodProgram})? Salinan sandaran JSON data program berserta rekod pindaan BK04 akan dimuat turun secara automatik sebelum dipadamkan.`,
      () => {
        autoBackupBeforeDelete([prog], `PROGRAM_${prog.kodProgram}`);
        deleteProgram(prog.id);
        setDeleteActionMsg({
          type: 'success',
          text: `Salinan sandaran telah dimuat turun secara automatik. Program "${prog.kodProgram}" berjaya dipadamkan.`,
        });
        setTimeout(() => setDeleteActionMsg(null), 6000);
      }
    );
  };

  // REQUIREMENT 4 & 8:
  // When Super Admin selects Pegawai from Dropdown in "Daftar ID Admin Jabatan Baru",
  // autofill ID Pengguna Admin (suggestion 15 chars), and by default tick only matching Jabatan
  const handleSelectPegawaiForAdmin = (pegId: string) => {
    setSelectedPegawaiIdForAdmin(pegId);
    setUserActionMsg(null);

    const peg = pegawaiList.find((p) => p.id === pegId);
    if (peg) {
      setNewAdminName(peg.nama);
      setNewAdminPusat(peg.pusat || pusatList[0] || '');
      setNewAdminJabatan(peg.jabatan || '');

      // Suggestion capped to 15 characters
      const cleanName = peg.nama.replace(/^(DR\.|ENCIK|PUAN|CIK|HAJI|HAJAH)\s+/i, '');
      const initials = cleanName
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 3)
        .join('_')
        .toUpperCase();
      const suggested = `ADMIN_${initials}`.slice(0, 15);
      setNewAdminId(suggested);

      // By default selected/tick only Jabatan under same name with selected from Nama Penuh Pegawai Admin
      if (peg.jabatan) {
        if (peg.jabatan === 'SEMUA JABATAN') {
          const allJabs = Object.values(jabatanMap).flat();
          setNewAdminSelectedJabatans(allJabs);
        } else {
          setNewAdminSelectedJabatans([peg.jabatan]);
        }
      } else {
        setNewAdminSelectedJabatans([]);
      }
    } else {
      setNewAdminName('');
      setNewAdminPusat('');
      setNewAdminJabatan('');
      setNewAdminId('');
      setNewAdminSelectedJabatans([]);
    }
  };

  // Handle Add Admin User submit
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);

    if (!newAdminName) {
      setUserActionMsg({
        type: 'error',
        text: 'Sila pilih Nama Penuh Pegawai Admin daripada senarai drop down.',
      });
      return;
    }

    if (!newAdminId.trim() || !newAdminPassword.trim()) {
      setUserActionMsg({ type: 'error', text: 'Sila masukkan ID Pengguna dan Kata Laluan admin.' });
      return;
    }

    if (newAdminSelectedJabatans.length === 0) {
      setUserActionMsg({
        type: 'error',
        text: 'Sila pilih sekurang-kurangnya satu Jabatan dalam Jabatan Diberi Akses.',
      });
      return;
    }

    const allJabsCount = Object.values(jabatanMap).flat().length;
    const primaryJabatan =
      newAdminSelectedJabatans.length === allJabsCount
        ? 'SEMUA JABATAN'
        : newAdminSelectedJabatans.join(', ');

    const res = createAdminUser({
      id: newAdminId.trim().toUpperCase(),
      password: newAdminPassword.trim(),
      name: newAdminName.trim(),
      role: 'ADMIN',
      pusat: newAdminPusat || pusatList[0] || '',
      jabatan: primaryJabatan,
      allowedJabatans: newAdminSelectedJabatans,
      allowedPages: newAdminAllowedPages,
    });

    if (res.success) {
      setUserActionMsg({
        type: 'success',
        text: `ID Admin "${newAdminId.toUpperCase()}" untuk pegawai "${newAdminName}" berjaya didaftarkan!`,
      });
      setSelectedPegawaiIdForAdmin('');
      setNewAdminId('');
      setNewAdminPassword('');
      setNewAdminName('');
      setNewAdminPusat('');
      setNewAdminJabatan('');
      setNewAdminSelectedJabatans([]);
      setNewAdminAllowedPages([]);
    } else {
      setUserActionMsg({ type: 'error', text: res.message || 'Gagal mendaftar admin.' });
    }
  };

  // Handlers for Editing Admin User
  const handleOpenEditAdmin = (user: AdminUser) => {
    setEditingAdminUser(user);
    setEditAdminName(user.name);
    setEditAdminPassword(user.password);
    setEditAdminPusat(user.pusat || pusatList[0] || '');
    setEditAdminJabatan(user.jabatan || '');
    setEditAdminSelectedJabatans(user.allowedJabatans || (user.jabatan ? [user.jabatan] : []));
    setEditAdminAllowedPages(user.allowedPages || []);
    setEditAdminMsg(null);
  };

  const handleSaveEditAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminUser) return;

    const allJabsCount = Object.values(jabatanMap).flat().length;
    const primaryJabatan =
      editAdminSelectedJabatans.length === allJabsCount
        ? 'SEMUA JABATAN'
        : editAdminSelectedJabatans.join(', ');

    const res = updateAdminUser(editingAdminUser.id, {
      name: editAdminName.trim(),
      password: editAdminPassword.trim(),
      pusat: editAdminPusat,
      jabatan: primaryJabatan,
      allowedJabatans: editAdminSelectedJabatans,
      allowedPages: editAdminAllowedPages,
    });
    if (res.success) {
      setEditingAdminUser(null);
    } else {
      setEditAdminMsg({ type: 'error', text: res.message || 'Gagal mengemaskini maklumat admin.' });
    }
  };

  // Helper to check if Jawatan is Pengarah or Timbalan Pengarah Kanan
  const isSpecialDirector = (jawatan: string) => {
    const norm = (jawatan || '').trim().toUpperCase();
    return norm === 'PENGARAH' || norm === 'TIMBALAN PENGARAH KANAN';
  };

  // Helper to check if Jawatan is Ketua Pusat
  const isKetuaPusat = (jawatan: string) => {
    const norm = (jawatan || '').trim().toUpperCase();
    return norm === 'KETUA PUSAT';
  };

  // REQUIREMENT 3:
  // Open Pegawai modal / form with 6 fields and Jawatan dropdown
  const handleOpenAddPegawai = () => {
    setEditingPegawaiId(null);
    setPegawaiFormNama('');
    const initialJawatan = jawatanList[0] || 'PENSYARAH';
    setPegawaiFormJawatan(initialJawatan);
    if (isSpecialDirector(initialJawatan)) {
      setPegawaiFormPusat('TIDAK BERKENAAN');
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else if (isKetuaPusat(initialJawatan)) {
      const p = pusatList[0] || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const p = pusatList[0] || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan((jabatanMap[p] && jabatanMap[p][0]) || '');
    }
    setPegawaiFormEmel('');
    setPegawaiFormNoHp('');
    setIsPegawaiFormOpen(true);
  };

  const handleEditPegawai = (peg: Pegawai) => {
    setEditingPegawaiId(peg.id);
    setPegawaiFormNama(peg.nama);
    const jwt = peg.jawatan || jawatanList[0] || 'PENSYARAH';
    setPegawaiFormJawatan(jwt);
    if (isSpecialDirector(jwt)) {
      setPegawaiFormPusat('TIDAK BERKENAAN');
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else if (isKetuaPusat(jwt)) {
      const p = peg.pusat || pusatList[0] || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const p = peg.pusat || pusatList[0] || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan(peg.jabatan || (jabatanMap[p] && jabatanMap[p][0]) || '');
    }
    setPegawaiFormEmel(peg.emel || '');
    setPegawaiFormNoHp(peg.noHp || '');
    setIsPegawaiFormOpen(true);
  };

  const handleJawatanChangeInPegawaiForm = (newJawatan: string) => {
    setPegawaiFormJawatan(newJawatan);
    if (isSpecialDirector(newJawatan)) {
      setPegawaiFormPusat('TIDAK BERKENAAN');
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else if (isKetuaPusat(newJawatan)) {
      if (pegawaiFormPusat === 'TIDAK BERKENAAN') {
        const p = pusatList[0] || '';
        setPegawaiFormPusat(p);
      }
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const p = (pegawaiFormPusat === 'TIDAK BERKENAAN' ? pusatList[0] : pegawaiFormPusat) || '';
      setPegawaiFormPusat(p);
      if (pegawaiFormJabatan === 'TIDAK BERKENAAN') {
        setPegawaiFormJabatan((jabatanMap[p] && jabatanMap[p][0]) || '');
      }
    }
  };

  const handlePusatChangeInPegawaiForm = (newPusat: string) => {
    setPegawaiFormPusat(newPusat);
    if (isKetuaPusat(pegawaiFormJawatan)) {
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const avail = jabatanMap[newPusat] || [];
      setPegawaiFormJabatan(avail.length > 0 ? avail[0] : '');
    }
  };

  const handleSavePegawai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pegawaiFormNama.trim()) return;

    const isDirector = isSpecialDirector(pegawaiFormJawatan);
    const isKP = isKetuaPusat(pegawaiFormJawatan);
    const payload = {
      nama: pegawaiFormNama.trim().toUpperCase(),
      pusat: isDirector ? 'TIDAK BERKENAAN' : pegawaiFormPusat,
      jabatan: isDirector || isKP ? 'TIDAK BERKENAAN' : pegawaiFormJabatan,
      jawatan: pegawaiFormJawatan.trim(),
      emel: pegawaiFormEmel.trim().toLowerCase(),
      noHp: pegawaiFormNoHp.trim(),
    };

    if (editingPegawaiId) {
      updatePegawai(editingPegawaiId, payload);
    } else {
      const id = `Pegawai ${pegawaiList.length + 1}`;
      addPegawai({
        id,
        ...payload,
        label: `${id} (${payload.nama})`,
      });
    }

    setIsPegawaiFormOpen(false);
    setEditingPegawaiId(null);
  };

  return (
    <div className="space-y-6">
      {/* Admin Session Header Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Portal Kawalan Pentadbir
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isSuperAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {isSuperAdmin ? 'Super Admin (Kuasa Penuh)' : 'Admin Jabatan'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {currentUser.name} ({currentUser.id})
            </h2>
            {!isSuperAdmin && currentUser.jabatan && (
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Paparan Khusus Jabatan: <strong>{currentUser.jabatan}</strong>
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsExportOpen(true)}
            title="Eksport data ke fail CSV atau cetak format rasmi"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-md transition-colors shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-300" />
            <span>Eksport & Cetak</span>
          </button>

          <button
            onClick={() => {
              setProgramToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white rounded-md hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program Baru</span>
          </button>

          <button
            onClick={() => {
              logout();
              setActiveTab('dashboard');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-md hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Admin Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminTab('programs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            adminTab === 'programs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Senarai Ringkas Program</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-bold ml-1">
            {adminProgramList.length}
          </span>
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => setAdminTab('users')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                adminTab === 'users'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pengurusan ID Admin ({adminUsers.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('master')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                adminTab === 'master'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengurusan Data Induk (Master Data)</span>
            </button>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SENARAI RINGKAS PROGRAM & PENAPIS (HIDE PUSAT & JABATAN)*/}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'programs' && (
        <div className="space-y-4">
          {/* Penapis Data Program Admin (Sama seperti Dashboard Program) */}
          <FilterBar showTahunBulan={true} showStatusFilter={true} />

          {/* Sub-admin notice if applicable */}
          {!isSuperAdmin && currentUser.jabatan && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Log Masuk: <strong>{currentUser.name}</strong> · Hanya memaparkan program di bawah jabatan anda:{' '}
                  <strong>{currentUser.jabatan}</strong> ({adminProgramList.length} rekod).
                </span>
              </div>
            </div>
          )}

          {/* REQUIREMENT 4: Paparkan Senarai Ringkas Program:
              PUSAT | JABATAN | KOD PROGRAM | NAMA PROGRAM | STATUS | TINDAKAN */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isSuperAdmin
                    ? 'Senarai Ringkas Program Pusat (Keseluruhan)'
                    : `Senarai Ringkas Program: ${currentUser.jabatan || 'Akses Diberikan'}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Paparan penuh pentadbir dengan fungsi kemaskini dan pemadaman'
                    : 'Paparan automatik bagi program di bawah bidang kuasa jabatan anda'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Pilihan Bilangan Paparan: 5, 10, 15, 20, 50, Semua (Default: 10) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Papar:</span>
                  <div className="inline-flex rounded-md shadow-2xs border border-slate-200 bg-slate-50 p-0.5">
                    {['5', '10', '15', '20', '50', 'Semua'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setProgramDisplayLimit(opt)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                          programDisplayLimit === opt
                            ? 'bg-slate-900 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md tabular-nums">
                  Menunjukkan <strong>{displayedAdminPrograms.length}</strong> / {adminProgramList.length} program
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th
                      onClick={() => handleSortProgram('pusat')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                      title="Klik untuk susun mengikut Pusat"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>PUSAT</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortProgram('jabatan')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                      title="Klik untuk susun mengikut Jabatan"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>JABATAN</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortProgram('kodProgram')}
                      className="py-3 px-4 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                      title="Klik untuk susun mengikut Kod Program"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>KOD PROGRAM</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortProgram('namaProgram')}
                      className="py-3 px-4 min-w-[280px] cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                      title="Klik untuk susun mengikut Nama Program"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>NAMA PROGRAM</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th
                      onClick={() => handleSortProgram('statusProgram')}
                      className="py-3 px-4 text-center cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                      title="Klik untuk susun mengikut Status"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>STATUS</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-4 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {displayedAdminPrograms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Tiada program dijumpai di bawah penapis semasa.
                      </td>
                    </tr>
                  ) : (
                    displayedAdminPrograms.map((prog) => {
                      const statusCfg = getStatusConfig(prog.statusProgram);
                      const isOwnerDept =
                        isSuperAdmin ||
                        (currentUser.allowedJabatans
                          ? currentUser.allowedJabatans.includes('SEMUA JABATAN') ||
                            currentUser.allowedJabatans.includes(prog.jabatan)
                          : !currentUser.jabatan || currentUser.jabatan === prog.jabatan);

                      return (
                        <tr
                          key={prog.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-[11px] text-slate-700 max-w-[200px] truncate" title={prog.pusat}>
                            {prog.pusat}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[220px] truncate" title={prog.jabatan}>
                            {prog.jabatan}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {prog.kodProgram}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 uppercase">
                            <span className="line-clamp-2" title={prog.namaProgram}>
                              {prog.namaProgram.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                              {prog.tempoh} ({prog.jumlahHari} hari) · {prog.tempat} · Pengurus: {prog.pengurusNama}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${statusCfg.badgeBg}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit or Pencil Button: Super Admin SAHAJA boleh edit program SELESAI & TANGGUNG */}
                              {['SELESAI', 'TANGGUNG'].includes(prog.statusProgram.toUpperCase()) && !isSuperAdmin ? (
                                <span
                                  title="Program Berstatus SELESAI / TANGGUNG Dikunci - Hanya Super Admin boleh edit"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] font-bold cursor-not-allowed select-none"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>LOCKED</span>
                                </span>
                              ) : isOwnerDept ? (
                                <button
                                  onClick={() => handleEditProgram(prog)}
                                  title={
                                    ['SELESAI', 'TANGGUNG'].includes(prog.statusProgram.toUpperCase())
                                      ? 'Kemaskini Program (Akses Super Admin)'
                                      : 'Kemaskini Program (Pencil)'
                                  }
                                  className="p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  title={`Terkunci: Program di bawah ${prog.jabatan}`}
                                  className="p-1.5 text-slate-300 bg-slate-50 rounded cursor-not-allowed"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button: Super Admin SAHAJA */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteProgram(prog)}
                                  title="Padam Program (Super Admin Sahaja)"
                                  className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PENGURUSAN ID ADMIN (SUPER ADMIN ONLY)                 */}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'users' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REQUIREMENT 4: Create Sub-Admin Form with Pegawai Dropdown + Autofill */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Daftar ID Admin Jabatan Baru
              </h3>
            </div>

            {userActionMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  userActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {userActionMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{userActionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* 1. NAMA PENUH PEGAWAI ADMIN (DROPDOWN MENU DARI DATA INDUK) */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Nama Penuh Pegawai Admin (Pilih Pegawai) *
                </label>
                <select
                  required
                  value={selectedPegawaiIdForAdmin}
                  onChange={(e) => handleSelectPegawaiForAdmin(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900"
                >
                  <option value="">-- Pilih Pegawai daripada Data Induk --</option>
                  {pegawaiList.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.nama} ({peg.jabatan || 'Tiada Jabatan Ditugaskan'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih pegawai berdaftar. Pusat dan Jabatan akan diisi secara automatik mengikut profil pegawai.
                </p>
              </div>

              {/* 2. ID PENGGUNA ADMIN (HAD LIMIT 20 AKSARA, SUGGESTION 15 AKSARA) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    ID Pengguna Admin (Log Masuk) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {newAdminId.length}/20 aksara
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value.toUpperCase().slice(0, 20))}
                  placeholder="CTH: ADMIN_WAN_AZROI"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Cadangan autofill dihadkan kepada 15 aksara. Had limit aksara dibenarkan ialah 20.
                </p>
              </div>

              {/* 3. KATA LALUAN */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Kata Laluan *
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* 4. PUSAT DITUGASKAN (AUTOFILL) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Pusat Ditugaskan (Autofill) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                    Ditarik dari Pegawai
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={newAdminPusat || 'Sila pilih Pegawai dahulu'}
                  className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium cursor-not-allowed"
                />
              </div>

              {/* 5. JABATAN DIBERI AKSES (SKOP KEMASKINI DAN PAPARAN - CHECKBOXES) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Jabatan Diberi Akses (Skop Kemaskini dan Paparan) *
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {newAdminSelectedJabatans.length} Jabatan Dipilih
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto">
                  {/* Master Checkbox: Pilih Semua */}
                  {(() => {
                    const allJabs = Object.values(jabatanMap).flat();
                    const isAllSelected =
                      allJabs.length > 0 &&
                      allJabs.every((j) => newAdminSelectedJabatans.includes(j));

                    return (
                      <label className="flex items-center gap-2 pb-2 border-b border-slate-200 font-bold text-xs text-slate-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => {
                            if (isAllSelected) {
                              setNewAdminSelectedJabatans([]);
                            } else {
                              setNewAdminSelectedJabatans(allJabs);
                            }
                          }}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                        />
                        <span>PILIH SEMUA (Semua Pusat & Jabatan)</span>
                      </label>
                    );
                  })()}

                  {/* Hierarchical list grouped by Pusat and Jabatan */}
                  {pusatList.map((pusatName) => {
                    const jList = jabatanMap[pusatName] || [];
                    const isPusatFullySelected =
                      jList.length > 0 &&
                      jList.every((j) => newAdminSelectedJabatans.includes(j));
                    const isPusatPartiallySelected =
                      jList.some((j) => newAdminSelectedJabatans.includes(j)) &&
                      !isPusatFullySelected;

                    return (
                      <div key={pusatName} className="space-y-1.5 pt-1">
                        <label className="flex items-start gap-2 font-bold text-[11px] text-slate-800 uppercase tracking-tight cursor-pointer hover:text-slate-950">
                          <input
                            type="checkbox"
                            checked={isPusatFullySelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isPusatPartiallySelected;
                            }}
                            onChange={() => {
                              if (isPusatFullySelected) {
                                setNewAdminSelectedJabatans((prev) =>
                                  prev.filter((j) => !jList.includes(j))
                                );
                              } else {
                                setNewAdminSelectedJabatans((prev) =>
                                  Array.from(new Set([...prev, ...jList]))
                                );
                              }
                            }}
                            className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-0.5 shrink-0"
                          />
                          <span className="leading-snug">{pusatName}</span>
                        </label>

                        {/* Indented list of Jabatan under selected Pusat */}
                        <div className="ml-5 space-y-1 border-l-2 border-slate-200 pl-2.5">
                          {jList.map((jName) => {
                            const isChecked = newAdminSelectedJabatans.includes(jName);
                            return (
                              <label
                                key={jName}
                                className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:text-slate-900 py-0.5"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setNewAdminSelectedJabatans((prev) =>
                                      prev.includes(jName)
                                        ? prev.filter((j) => j !== jName)
                                        : [...prev, jName]
                                    );
                                  }}
                                  className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                                />
                                <span>{jName}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Secara default, jabatan yang terpilih merujuk kepada jabatan pegawai admin yang dipilih. Anda boleh menambah atau memilih pusat/jabatan lain.
                </p>
              </div>

              {/* 6. KEBENARAN VIEW/PAPAR PAGE */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    KEBENARAN VIEW/PAPAR PAGE:
                  </label>
                  <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    {newAdminAllowedPages.length} Modul Dibenarkan
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Tandakan halaman/modul yang dibenarkan untuk diakses/dilihat oleh akaun admin ini:
                </p>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  {AVAILABLE_PAGES.map((pg) => {
                    const isChecked = newAdminAllowedPages.includes(pg.key);
                    return (
                      <label
                        key={pg.key}
                        className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer p-1.5 rounded hover:bg-white transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setNewAdminAllowedPages((prev) =>
                              prev.includes(pg.key)
                                ? prev.filter((k) => k !== pg.key)
                                : [...prev, pg.key]
                            );
                          }}
                          className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                        />
                        <span>{pg.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                disabled={!selectedPegawaiIdForAdmin || newAdminSelectedJabatans.length === 0}
                className="w-full mt-3 py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Cipta ID Admin Sekarang
              </button>
            </form>
          </div>

          {/* Admin Accounts Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Senarai Akaun Pentadbir Berdaftar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admin boleh memadam ID admin (Super Admin AMAN tidak boleh dipadam)
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                {adminUsers.length} akaun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3">ID PENGGUNA</th>
                    <th className="py-2.5 px-3">NAMA PEGAWAI</th>
                    <th className="py-2.5 px-3">PERANAN</th>
                    <th className="py-2.5 px-3 min-w-[200px]">JABATAN DIBERI AKSES</th>
                    <th className="py-2.5 px-3 min-w-[170px]">KEBENARAN VIEW PAGE</th>
                    <th className="py-2.5 px-3 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {adminUsers.map((user) => {
                    const allJabs = Object.values(jabatanMap).flat();
                    const isAllJabs =
                      user.role === 'SUPER_ADMIN' ||
                      (user.allowedJabatans &&
                        user.allowedJabatans.length === allJabs.length);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {user.id}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900">
                          {user.name}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              user.role === 'SUPER_ADMIN'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}
                          >
                            {user.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN JABATAN'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-700">
                          {user.role === 'SUPER_ADMIN' ? (
                            <span className="text-slate-500 italic">Semua Jabatan (Kuasa Penuh)</span>
                          ) : isAllJabs ? (
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                              SEMUA JABATAN ({allJabs.length})
                            </span>
                          ) : user.allowedJabatans && user.allowedJabatans.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.allowedJabatans.map((j) => (
                                <span
                                  key={j}
                                  className="text-[10px] px-1.5 py-0.2 bg-blue-50 text-blue-800 rounded border border-blue-200 font-medium"
                                >
                                  {j}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <strong className="text-slate-800">{user.jabatan}</strong>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {user.role === 'SUPER_ADMIN' ? (
                            <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 font-bold">
                              SEMUA MODUL (Penuh)
                            </span>
                          ) : user.allowedPages && user.allowedPages.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {user.allowedPages.map((pg) => (
                                <span
                                  key={pg}
                                  className="text-[10px] px-1.5 py-0.2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-semibold uppercase"
                                >
                                  {pg}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Tiada Modul Khas</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Butang EDIT Maklumat Admin */}
                            <button
                              onClick={() => handleOpenEditAdmin(user)}
                              className="p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              title={`Edit maklumat akaun ${user.id}`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {user.id.toUpperCase() === 'AMAN' ? (
                              <span className="text-[10px] text-slate-400 italic px-1">Kekal</span>
                            ) : (
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Akaun Admin',
                                    `Adakah anda pasti ingin memadamkan ID Admin "${user.id}" (${user.name})? Tindakan ini tidak boleh diundur.`,
                                    () => {
                                      deleteAdminUser(user.id);
                                    }
                                  );
                                }}
                                className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                title="Padam akaun admin"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Modal Edit Maklumat Admin */}
          {editingAdminUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-bold">
                      Kemaskini ID Admin: {editingAdminUser.id}
                    </h4>
                  </div>
                  <button
                    onClick={() => setEditingAdminUser(null)}
                    className="p-1 text-slate-400 hover:text-white rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditAdmin} className="p-5 space-y-3.5 text-xs">
                  {editAdminMsg && (
                    <div className="p-2.5 rounded bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{editAdminMsg.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      ID Pengguna (Kunci Kekal)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={editingAdminUser.id}
                      className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-md font-mono text-slate-700 font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Penuh Pegawai Admin *
                    </label>
                    <input
                      type="text"
                      required
                      value={editAdminName}
                      onChange={(e) => setEditAdminName(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Kata Laluan Baharu *
                    </label>
                    <input
                      type="text"
                      required
                      value={editAdminPassword}
                      onChange={(e) => setEditAdminPassword(e.target.value)}
                      placeholder="Masukkan kata laluan"
                      className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                    />
                  </div>

                  {editingAdminUser.role !== 'SUPER_ADMIN' && (
                    <>
                      <div>
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                          Pusat Ditugaskan *
                        </label>
                        <select
                          required
                          value={editAdminPusat}
                          onChange={(e) => {
                            const newP = e.target.value;
                            setEditAdminPusat(newP);
                            const jabs = jabatanMap[newP] || [];
                            setEditAdminJabatan(jabs[0] || '');
                          }}
                          className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                        >
                          {pusatList.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jabatan Diberi Akses Checkboxes */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                            Jabatan Diberi Akses (Skop Kemaskini & Paparan) *
                          </label>
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {editAdminSelectedJabatans.length} Jabatan Dipilih
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2.5 max-h-48 overflow-y-auto">
                          {/* Master Checkbox: Pilih Semua */}
                          {(() => {
                            const allJabs = Object.values(jabatanMap).flat();
                            const isAllSelected =
                              allJabs.length > 0 &&
                              allJabs.every((j) => editAdminSelectedJabatans.includes(j));

                            return (
                              <label className="flex items-center gap-2 pb-2 border-b border-slate-200 font-bold text-xs text-slate-900 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isAllSelected}
                                  onChange={() => {
                                    if (isAllSelected) {
                                      setEditAdminSelectedJabatans([]);
                                    } else {
                                      setEditAdminSelectedJabatans(allJabs);
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                                />
                                <span>PILIH SEMUA (Semua Pusat & Jabatan)</span>
                              </label>
                            );
                          })()}

                          {pusatList.map((pusatName) => {
                            const jList = jabatanMap[pusatName] || [];
                            const isPusatFullySelected =
                              jList.length > 0 &&
                              jList.every((j) => editAdminSelectedJabatans.includes(j));
                            const isPusatPartiallySelected =
                              jList.some((j) => editAdminSelectedJabatans.includes(j)) &&
                              !isPusatFullySelected;

                            return (
                              <div key={pusatName} className="space-y-1 pt-1">
                                <label className="flex items-start gap-2 font-bold text-[11px] text-slate-800 uppercase tracking-tight cursor-pointer hover:text-slate-950">
                                  <input
                                    type="checkbox"
                                    checked={isPusatFullySelected}
                                    ref={(el) => {
                                      if (el) el.indeterminate = isPusatPartiallySelected;
                                    }}
                                    onChange={() => {
                                      if (isPusatFullySelected) {
                                        setEditAdminSelectedJabatans((prev) =>
                                          prev.filter((j) => !jList.includes(j))
                                        );
                                      } else {
                                        setEditAdminSelectedJabatans((prev) =>
                                          Array.from(new Set([...prev, ...jList]))
                                        );
                                      }
                                    }}
                                    className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300 mt-0.5 shrink-0"
                                  />
                                  <span className="leading-snug">{pusatName}</span>
                                </label>

                                <div className="ml-5 space-y-1 border-l-2 border-slate-200 pl-2">
                                  {jList.map((jName) => (
                                    <label
                                      key={jName}
                                      className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer hover:text-slate-900 py-0.5"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={editAdminSelectedJabatans.includes(jName)}
                                        onChange={() => {
                                          setEditAdminSelectedJabatans((prev) =>
                                            prev.includes(jName)
                                              ? prev.filter((j) => j !== jName)
                                              : [...prev, jName]
                                          );
                                        }}
                                        className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                                      />
                                      <span>{jName}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Kebenaran View Page */}
                      <div className="pt-2 border-t border-slate-200">
                        <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                          KEBENARAN VIEW/PAPAR PAGE:
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                          {AVAILABLE_PAGES.map((pg) => (
                            <label
                              key={pg.key}
                              className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer p-1"
                            >
                              <input
                                type="checkbox"
                                checked={editAdminAllowedPages.includes(pg.key)}
                                onChange={() => {
                                  setEditAdminAllowedPages((prev) =>
                                    prev.includes(pg.key)
                                      ? prev.filter((k) => k !== pg.key)
                                      : [...prev, pg.key]
                                  );
                                }}
                                className="w-3.5 h-3.5 rounded text-slate-900 focus:ring-slate-900 border-slate-300"
                              />
                              <span>{pg.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditingAdminUser(null)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                    >
                      Simpan Kemaskini
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PENGURUSAN DATA INDUK / MASTER DATA (SUPER ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'master' && isSuperAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Sub Navigation Bar for Master Data */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Kategori Data Induk:
            </span>

            <button
              onClick={() => setMasterCategory('pegawai')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'pegawai'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              1. Pegawai
            </button>

            <button
              onClick={() => setMasterCategory('pusat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'pusat'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              2. Pusat
            </button>

            <button
              onClick={() => setMasterCategory('jabatan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'jabatan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              3. Jabatan
            </button>

            <button
              onClick={() => setMasterCategory('sumber')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'sumber'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              4. Sumber Kewangan
            </button>

            <button
              onClick={() => setMasterCategory('status')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'status'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              5. Status Program
            </button>

            <button
              onClick={() => setMasterCategory('jawatan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'jawatan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              6. Jawatan
            </button>

            <button
              onClick={() => setMasterCategory('muat_turun_naik')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                masterCategory === 'muat_turun_naik'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>7. Muat Naik/Muat Turun Data</span>
            </button>

            <button
              onClick={() => setMasterCategory('notifikasi')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                masterCategory === 'notifikasi'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>8. Notifikasi</span>
            </button>

            <button
              onClick={() => setMasterCategory('padam_data')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                masterCategory === 'padam_data'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>9. PADAM DATA</span>
            </button>
          </div>

          <div className="p-6">
            {/* SUB-CATEGORY 1: PEGAWAI (6 FIELDS COMPLETE FORM & TABLE) */}
            {masterCategory === 'pegawai' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Pengurusan Profil Pegawai
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mengandungi maklumat lengkap 6 perkara: Nama, Pusat, Jabatan, Jawatan, Emel, dan No. HP.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddPegawai}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Pegawai Baru</span>
                  </button>
                </div>

                {/* REQUIREMENT 3: Form Add / Edit Pegawai with 6 fields and Jawatan Dropdown */}
                {isPegawaiFormOpen && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-300 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-800" />
                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {editingPegawaiId ? `Kemaskini Pegawai: ${editingPegawaiId}` : 'Borang Tambah Pegawai Baru'}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPegawaiFormOpen(false);
                          setEditingPegawaiId(null);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSavePegawai} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. NAMA PEGAWAI */}
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            1. Nama Penuh Pegawai (HURUF BESAR) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="CTH: DR. AHMAD BIN ISMAIL"
                            value={pegawaiFormNama}
                            onChange={(e) => setPegawaiFormNama(e.target.value.toUpperCase())}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold uppercase"
                          />
                        </div>

                        {/* 4. JAWATAN (DROPDOWN MENU SEPERTI PILIHAN PENGGUNA) */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            4. Jawatan *
                          </label>
                          <select
                            required
                            value={pegawaiFormJawatan}
                            onChange={(e) => handleJawatanChangeInPegawaiForm(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900"
                          >
                            {jawatanList.map((jwt) => (
                              <option key={jwt} value={jwt}>
                                {jwt}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 2. PUSAT */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            2. Pusat *
                          </label>
                          <select
                            required={!isSpecialDirector(pegawaiFormJawatan)}
                            disabled={isSpecialDirector(pegawaiFormJawatan)}
                            value={isSpecialDirector(pegawaiFormJawatan) ? 'TIDAK BERKENAAN' : pegawaiFormPusat}
                            onChange={(e) => handlePusatChangeInPegawaiForm(e.target.value)}
                            className={`w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                              isSpecialDirector(pegawaiFormJawatan)
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {isSpecialDirector(pegawaiFormJawatan) ? (
                              <option value="TIDAK BERKENAAN">TIDAK BERKENAAN</option>
                            ) : (
                              pusatList.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* 3. JABATAN */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            3. Jabatan *
                          </label>
                          <select
                            required={!isSpecialDirector(pegawaiFormJawatan) && !isKetuaPusat(pegawaiFormJawatan)}
                            disabled={isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan)}
                            value={
                              isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan)
                                ? 'TIDAK BERKENAAN'
                                : pegawaiFormJabatan
                            }
                            onChange={(e) => setPegawaiFormJabatan(e.target.value)}
                            className={`w-full py-2 px-3 border rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                              isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan)
                                ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan) ? (
                              <option value="TIDAK BERKENAAN">TIDAK BERKENAAN</option>
                            ) : (
                              (jabatanMap[pegawaiFormPusat] || []).map((j) => (
                                <option key={j} value={j}>
                                  {j}
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {isSpecialDirector(pegawaiFormJawatan) && (
                          <div className="col-span-full text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded font-medium">
                            * Bagi jawatan <strong>{pegawaiFormJawatan}</strong>, Pusat dan Jabatan ditetapkan sebagai <strong>TIDAK BERKENAAN</strong> secara automatik.
                          </div>
                        )}

                        {isKetuaPusat(pegawaiFormJawatan) && (
                          <div className="col-span-full text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded font-medium">
                            * Bagi jawatan <strong>KETUA PUSAT</strong>, Pusat boleh dipilih dan Jabatan ditetapkan sebagai <strong>TIDAK BERKENAAN</strong> (dim) secara automatik.
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 5. EMEL */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            5. Emel Rasmi *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="CTH: ahmad.ismail@iab.moe.edu.my"
                            value={pegawaiFormEmel}
                            onChange={(e) => setPegawaiFormEmel(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium lowercase"
                          />
                        </div>

                        {/* 6. NO. HP: */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            6. No. HP: *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="CTH: 012-3456789"
                            value={pegawaiFormNoHp}
                            onChange={(e) => setPegawaiFormNoHp(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPegawaiFormOpen(false);
                            setEditingPegawaiId(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                        >
                          {editingPegawaiId ? 'Simpan Kemaskini Pegawai' : 'Daftar Pegawai Baru'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Table of Pegawai showing all 6 fields */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4 w-28">ID</th>
                        <th className="py-2.5 px-4">NAMA PEGAWAI</th>
                        <th className="py-2.5 px-4">PUSAT & JABATAN</th>
                        <th className="py-2.5 px-4">JAWATAN</th>
                        <th className="py-2.5 px-4">HUBUNGI (EMEL & HP)</th>
                        <th className="py-2.5 px-4 w-32 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pegawaiList.map((peg) => (
                        <tr key={peg.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {peg.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                            {peg.nama}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-800 block">
                              {peg.jabatan || 'Belum Ditetapkan'}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={peg.pusat}>
                              {peg.pusat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-[11px]">
                              {peg.jawatan || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{peg.emel || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{peg.noHp || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditPegawai(peg)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Profil Pegawai',
                                    `Adakah anda pasti ingin memadamkan pegawai "${peg.nama}"?`,
                                    () => {
                                      deletePegawai(peg.id);
                                    }
                                  );
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 2: PUSAT */}
            {masterCategory === 'pusat' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Senarai Pusat</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah atau edit nama Pusat (cth: PPPT, PKPOP). Perubahan akan dipaparkan dalam semua filter dan pendaftaran program.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!pusatInput.trim()) return;
                    if (editingPusat) {
                      updatePusat(editingPusat, pusatInput.trim());
                      setEditingPusat(null);
                    } else {
                      addPusat(pusatInput.trim());
                    }
                    setPusatInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Pusat *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI"
                      value={pusatInput}
                      onChange={(e) => setPusatInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingPusat ? 'Simpan Pusat' : '+ Tambah Pusat'}
                    </button>
                    {editingPusat && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPusat(null);
                          setPusatInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">NAMA PUSAT</th>
                        <th className="py-2.5 px-4 w-44">BILANGAN JABATAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pusatList.map((p) => (
                        <tr key={p} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{p}</td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">
                            {(jabatanMap[p] || []).length} jabatan
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingPusat(p);
                                  setPusatInput(p);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Pusat',
                                    `Adakah anda pasti ingin memadamkan pusat "${p}" dan semua jabatannya?`,
                                    () => {
                                      deletePusat(p);
                                    }
                                  );
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 3: JABATAN */}
            {masterCategory === 'jabatan' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Pengurusan Jabatan (Mengikut Pusat)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih pusat di bawah untuk menambah atau mengemaskini jabatan yang berkaitan.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Pusat Induk
                    </label>
                    <select
                      value={selectedPusatForJabatan}
                      onChange={(e) => setSelectedPusatForJabatan(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                    >
                      {pusatList.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!jabatanInput.trim()) return;
                      if (editingJabatan) {
                        updateJabatan(selectedPusatForJabatan, editingJabatan, jabatanInput.trim());
                        setEditingJabatan(null);
                      } else {
                        addJabatan(selectedPusatForJabatan, jabatanInput.trim());
                      }
                      setJabatanInput('');
                    }}
                    className="flex flex-col sm:flex-row items-end gap-3 pt-2"
                  >
                    <div className="flex-1 w-full">
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Nama Jabatan Baru / Kemaskini *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="CTH: JABATAN KECERDASAN BUATAN DAN INOVASI DIGITAL"
                        value={jabatanInput}
                        onChange={(e) => setJabatanInput(e.target.value.toUpperCase())}
                        className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {editingJabatan ? 'Simpan Jabatan' : '+ Tambah Jabatan'}
                      </button>
                      {editingJabatan && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJabatan(null);
                            setJabatanInput('');
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200">
                    Senarai Jabatan di bawah: <span className="text-slate-950 font-extrabold">{selectedPusatForJabatan}</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {(jabatanMap[selectedPusatForJabatan] || []).length === 0 ? (
                        <tr>
                          <td className="py-6 text-center text-slate-400">
                            Tiada jabatan di bawah pusat ini lagi. Sila tambah di atas.
                          </td>
                        </tr>
                      ) : (
                        (jabatanMap[selectedPusatForJabatan] || []).map((jab, idx) => (
                          <tr key={jab} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-slate-400 w-12 text-center">
                              {idx + 1}.
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {jab}
                            </td>
                            <td className="py-2.5 px-4 w-36 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingJabatan(jab);
                                    setJabatanInput(jab);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    requestDeleteConfirm(
                                      'Padam Jabatan',
                                      `Adakah anda pasti ingin memadamkan jabatan "${jab}"?`,
                                      () => {
                                        deleteJabatan(selectedPusatForJabatan, jab);
                                      }
                                    );
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                                >
                                  Padam
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 4: SUMBER KEWANGAN */}
            {masterCategory === 'sumber' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Sumber Kewangan</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah atau edit nama Sumber Kewangan (cth: IAB – LATIHAN, BSTP, BPG, BPK).
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!sumberInput.trim()) return;
                    if (editingSumber) {
                      updateSumberKewangan(editingSumber, sumberInput.trim());
                      setEditingSumber(null);
                    } else {
                      addSumberKewangan(sumberInput.trim());
                    }
                    setSumberInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Sumber Kewangan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: IAB - PENYELIDIKAN"
                      value={sumberInput}
                      onChange={(e) => setSumberInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingSumber ? 'Simpan' : '+ Tambah Sumber'}
                    </button>
                    {editingSumber && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSumber(null);
                          setSumberInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">NAMA SUMBER KEWANGAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sumberKewanganList.map((sk) => (
                        <tr key={sk} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{sk}</td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingSumber(sk);
                                  setSumberInput(sk);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Sumber Kewangan',
                                    `Adakah anda pasti ingin memadamkan sumber "${sk}"?`,
                                    () => {
                                      deleteSumberKewangan(sk);
                                    }
                                  );
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 5: STATUS PROGRAM */}
            {masterCategory === 'status' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Status Program</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Urus status rasmi pelaksanaan program (cth: SELESAI, DALAM TINDAKAN, TANGGUNG, BELUM AMBIL TINDAKAN, BATAL).
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!statusInput.trim()) return;
                    if (editingStatus) {
                      updateStatusProgram(editingStatus, statusInput.trim());
                      setEditingStatus(null);
                    } else {
                      addStatusProgram(statusInput.trim());
                    }
                    setStatusInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Status Program *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: DALAM PERANCANGAN"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingStatus ? 'Simpan' : '+ Tambah Status'}
                    </button>
                    {editingStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus(null);
                          setStatusInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">STATUS PROGRAM</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statusProgramList.map((st) => (
                        <tr key={st} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-xs">
                              {st}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingStatus(st);
                                  setStatusInput(st);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Status Program',
                                    `Adakah anda pasti ingin memadamkan status "${st}"?`,
                                    () => {
                                      deleteStatusProgram(st);
                                    }
                                  );
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 6: JAWATAN (BARU) */}
            {masterCategory === 'jawatan' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Senarai Jawatan</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah, edit, atau padam senarai Jawatan rasmi. Senarai jawatan ini akan dijadikan pilihan drop down pada bahagian profil pegawai.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!jawatanInput.trim()) return;
                    if (editingJawatan) {
                      updateJawatan(editingJawatan, jawatanInput.trim());
                      setEditingJawatan(null);
                    } else {
                      addJawatan(jawatanInput.trim());
                    }
                    setJawatanInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Jawatan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: PENGARAH / PENSYARAH CEMERLANG"
                      value={jawatanInput}
                      onChange={(e) => setJawatanInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingJawatan ? 'Simpan' : '+ Tambah Jawatan'}
                    </button>
                    {editingJawatan && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingJawatan(null);
                          setJawatanInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4 w-16">Bil</th>
                        <th className="py-2.5 px-4">NAMA JAWATAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {jawatanList.map((jwt, idx) => (
                        <tr key={jwt} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-400">
                            {idx + 1}.
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {jwt}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingJawatan(jwt);
                                  setJawatanInput(jwt);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Jawatan',
                                    `Adakah anda pasti ingin memadamkan jawatan "${jwt}"?`,
                                    () => {
                                      deleteJawatan(jwt);
                                    }
                                  );
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 7: MUAT NAIK / MUAT TURUN DATA (SUPER ADMIN ONLY) */}
            {masterCategory === 'muat_turun_naik' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span>7. Pengurusan Muat Naik / Muat Turun Data Program</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                      Super Admin Sahaja
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Muat turun sandaran pangkalan data lengkap atau muat naik fail data program termasuk perincian kewangan, pengurus, dan Rekod Perubahan Maklumat Program (BK04).
                  </p>
                </div>

                {importStatusMsg && (
                  <div
                    className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between ${
                      importStatusMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {importStatusMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{importStatusMsg.text}</span>
                    </div>
                    <button
                      onClick={() => setImportStatusMsg(null)}
                      className="font-bold hover:underline ml-3"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Section A: Muat Turun Data (Backup / Export) */}
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Download className="w-4 h-4 text-slate-700" />
                        <span>Bahagian A: Muat Turun Salinan Sandaran Data (Backup)</span>
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Eksport semua program sedia ada berserta sejarah Rekod Pindaan Maklumat Program (BK04).
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold bg-white px-3 py-1 rounded border border-slate-200 text-slate-700">
                      {programs.length} Rekod Tersedia
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500">Jumlah Program</div>
                      <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                        {programs.length} <span className="text-xs font-normal text-slate-500">aktiviti</span>
                      </div>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500">Program Berpindaan BK04</div>
                      <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">
                        {programs.filter((p) => (p.rekodPindaan || []).length > 0).length}{' '}
                        <span className="text-xs font-normal text-slate-500">rekod dipinda</span>
                      </div>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200">
                      <div className="text-[11px] text-slate-500">Jumlah Peruntukan</div>
                      <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                        RM {formatRM(programs.reduce((s, p) => s + (p.jumlahRm || 0), 0))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={handleDownloadAllJSON}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <FileDown className="w-4 h-4" />
                      <span>Muat Turun Fail JSON Lengkap (Termasuk BK04)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadAllExcel}
                      className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-xs cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Muat Turun Lembaran Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Section B: Muat Naik Data (Restore / Import) */}
                <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Bahagian B: Muat Naik Fail Data (Import & Kemaskini)</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih fail format JSON atau Excel (.xlsx) untuk memuat naik data program ke dalam sistem.
                    </p>
                  </div>

                  {/* Mode Selection */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                    <span className="font-bold text-slate-700 block">Pilihan Mod Import:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-colors ${
                          importMode === 'merge'
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="merge"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5"
                        />
                        <div>
                          <strong className="block font-semibold">Gabung & Kemaskini (Merge)</strong>
                          <span className="text-[11px] text-slate-500">
                            Mengemaskini rekod sedia ada yang sepadan mengikut Kod/ID Program dan menambah program baharu tanpa memadam data sedia ada.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`p-3 rounded-lg border cursor-pointer flex items-start gap-2.5 transition-colors ${
                          importMode === 'replace'
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          value="replace"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5"
                        />
                        <div>
                          <strong className="block font-semibold">Gantikan Semua Data (Replace)</strong>
                          <span className="text-[11px] text-slate-500">
                            Mengosongkan senarai program semasa dan menggantikannya sepenuhnya dengan rekod dari fail yang dimuat naik.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* File Upload Box */}
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-slate-50/50">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <label className="cursor-pointer">
                      <span className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-block shadow-xs transition-colors">
                        Pilih Fail (.json / .xlsx)
                      </span>
                      <input
                        type="file"
                        accept=".json, .xlsx, .xls"
                        onChange={handleFileUpload}
                        className="sr-only"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Menyokong fail JSON sandaran sistem atau lembaran hamparan Excel.
                    </p>
                    {importFileName && (
                      <p className="text-xs font-semibold text-blue-700 mt-2 font-mono">
                        Fail Dipilih: {importFileName}
                      </p>
                    )}
                  </div>

                  {/* Preview Table if records detected */}
                  {importedPrograms && importedPrograms.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          Pratonton Data Dikesan ({importedPrograms.length} rekod):
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Menunjukkan 5 rekod sampel terawal
                        </span>
                      </div>

                      <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                            <tr>
                              <th className="p-2">Bil</th>
                              <th className="p-2">Kod Program</th>
                              <th className="p-2">Nama Program</th>
                              <th className="p-2">Jabatan</th>
                              <th className="p-2 text-right">Peruntukan (RM)</th>
                              <th className="p-2 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importedPrograms.slice(0, 5).map((p, idx) => (
                              <tr key={p.id || idx} className="hover:bg-slate-50">
                                <td className="p-2 font-mono">{idx + 1}</td>
                                <td className="p-2 font-mono font-bold text-slate-900">{p.kodProgram}</td>
                                <td className="p-2 font-medium text-slate-800">{p.namaProgram}</td>
                                <td className="p-2 text-slate-600">{p.jabatan}</td>
                                <td className="p-2 text-right font-mono font-bold text-slate-900">
                                  {formatRM(p.jumlahRm)}
                                </td>
                                <td className="p-2 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                    {p.statusProgram}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImportedPrograms(null);
                            setImportFileName(null);
                          }}
                          className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          Batal / Buang Pilihan
                        </button>
                        <button
                          type="button"
                          onClick={executeCommitImport}
                          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Sahkan & Laksanakan Muat Naik Data ({importedPrograms.length} Rekod)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 8: NOTIFIKASI (SUPER ADMIN ONLY - CLEAN PLACEHOLDER) */}
            {masterCategory === 'notifikasi' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-slate-700" />
                    <span>8. Pengurusan Notifikasi Sistem</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700 uppercase">
                      Super Admin Sahaja
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Konfigurasi pemberitahuan dan makluman amaran peruntukan kewangan program IAB.
                  </p>
                </div>

                {/* Clean, minimalist placeholder ready for future expansion */}
                <div className="border border-slate-200 rounded-xl p-12 bg-slate-50 text-center flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center">
                    <Bell className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Modul Pengurusan Notifikasi (Akan Datang)
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                    Hanya Super Admin dibenarkan mengedit notifikasi. Setakat ini halaman notifikasi ini disediakan dalam keadaan sedia dan akan dikonfigurasikan kemudian mengikut keperluan.
                  </p>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 9: PADAM DATA (SUPER ADMIN ONLY - WITH STRICT BACKUP & SECURE RE-AUTH) */}
            {masterCategory === 'padam_data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <span>9. PADAM DATA PROGRAM</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800 uppercase border border-rose-300">
                      Super Admin Sahaja · Zon Keselamatan Tinggi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pemadaman data program secara menyeluruh, mengikut pusat, jabatan, status atau satu persatu.
                  </p>
                </div>

                {/* Safety Warning Banner */}
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>PERATURAN KESELAMATAN PEMADAMAN DATA:</span>
                  </div>
                  <p className="leading-relaxed">
                    1. Data dalam Perincian Maklumat Lengkap Program termasuk Rekod Perubahan Maklumat Program (BK04) akan dipadamkan mengikut pilihan yang dibuat.<br />
                    2. <strong>Sebelum sebarang data program dipadamkan</strong>, sistem akan secara automatik memuat turun fail sandaran (JSON Backup) ke komputer anda.<br />
                    3. Pemadaman SEMUA DATA PROGRAM memerlukan pengesahan semula <strong>ID dan Kata Laluan Super Admin</strong>.
                  </p>
                </div>

                {deleteActionMsg && (
                  <div
                    className={`p-4 rounded-lg text-xs font-medium flex items-center justify-between ${
                      deleteActionMsg.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border border-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {deleteActionMsg.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span>{deleteActionMsg.text}</span>
                    </div>
                    <button
                      onClick={() => setDeleteActionMsg(null)}
                      className="font-bold hover:underline ml-3"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Sub Mode Selector */}
                <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setDeleteTabMode('semua')}
                    className={`px-3 py-1.5 font-bold rounded-md transition-colors cursor-pointer ${
                      deleteTabMode === 'semua'
                        ? 'bg-rose-700 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Padam SEMUA Data Program
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTabMode('pusat')}
                    className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                      deleteTabMode === 'pusat'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Padam Mengikut Pusat
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTabMode('jabatan')}
                    className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                      deleteTabMode === 'jabatan'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Padam Mengikut Jabatan
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTabMode('status')}
                    className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                      deleteTabMode === 'status'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Padam Mengikut Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTabMode('single')}
                    className={`px-3 py-1.5 font-semibold rounded-md transition-colors cursor-pointer ${
                      deleteTabMode === 'single'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Padam Satu Persatu
                  </button>
                </div>

                {/* Sub Mode Content 1: SEMUA */}
                {deleteTabMode === 'semua' && (
                  <div className="p-6 bg-rose-50/70 border-2 border-rose-300 rounded-xl space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-rose-900">
                          PADAM SEMUA DATA PROGRAM (KESELURUHAN SISTEM)
                        </h4>
                        <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                          Tindakan ini akan memadamkan <strong>semua {programs.length} program</strong> berserta rekod perincian lengkap dan Rekod Pindaan (BK04) daripada pangkalan data.
                          Sebelum tindakan diteruskan, sistem akan <strong>memuat turun salinan sandaran (JSON backup) secara automatik</strong> dan anda perlu memasukkan ID serta Kata Laluan Super Admin sekali lagi.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthModalError(null);
                          setAuthSuperAdminId('');
                          setAuthSuperAdminPassword('');
                          setIsDeleteAllModalOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-lg shadow-md cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Padam Semua Data Program ({programs.length} Program)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Mode Content 2: MENGIKUT PUSAT */}
                {deleteTabMode === 'pusat' && (
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Padam Program Mengikut Pusat
                    </h4>
                    <p className="text-slate-500">
                      Pilih pusat untuk memadam semua program yang berdaftar di bawah pusat tersebut.
                    </p>

                    <div className="max-w-md space-y-2">
                      <label className="block font-semibold text-slate-700">Pilih Pusat:</label>
                      <select
                        value={selectedPusatToDelete}
                        onChange={(e) => setSelectedPusatToDelete(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-white text-xs font-semibold"
                      >
                        {pusatList.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">
                        Bilangan program di bawah pusat <strong>{selectedPusatToDelete}</strong>:
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {programs.filter((p) => p.pusat === selectedPusatToDelete).length} program
                      </span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={programs.filter((p) => p.pusat === selectedPusatToDelete).length === 0}
                        onClick={handleDeleteByPusat}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-lg shadow-xs cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Semua Program Pusat {selectedPusatToDelete}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Mode Content 3: MENGIKUT JABATAN */}
                {deleteTabMode === 'jabatan' && (
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Padam Program Mengikut Jabatan
                    </h4>
                    <p className="text-slate-500">
                      Pilih jabatan untuk memadam semua program di bawah jabatan berkenaan.
                    </p>

                    <div className="max-w-md space-y-2">
                      <label className="block font-semibold text-slate-700">Pilih Jabatan:</label>
                      <select
                        value={selectedJabatanToDelete || (allJabatansList[0] || '')}
                        onChange={(e) => setSelectedJabatanToDelete(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-white text-xs font-semibold"
                      >
                        {allJabatansList.map((j) => (
                          <option key={j} value={j}>
                            {j}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">
                        Bilangan program di bawah jabatan ini:
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {
                          programs.filter(
                            (p) => p.jabatan === (selectedJabatanToDelete || allJabatansList[0])
                          ).length
                        }{' '}
                        program
                      </span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={
                          programs.filter(
                            (p) => p.jabatan === (selectedJabatanToDelete || allJabatansList[0])
                          ).length === 0
                        }
                        onClick={() => {
                          if (!selectedJabatanToDelete && allJabatansList[0]) {
                            setSelectedJabatanToDelete(allJabatansList[0]);
                          }
                          handleDeleteByJabatan();
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-lg shadow-xs cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Semua Program Jabatan Ini</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Mode Content 4: MENGIKUT STATUS PROGRAM */}
                {deleteTabMode === 'status' && (
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Padam Program Mengikut Status Program
                    </h4>
                    <p className="text-slate-500">
                      Pilih status program (contoh: BATAL, DALAM TINDAKAN) untuk memadam rekod berkaitan.
                    </p>

                    <div className="max-w-md space-y-2">
                      <label className="block font-semibold text-slate-700">Pilih Status:</label>
                      <select
                        value={selectedStatusToDelete}
                        onChange={(e) => setSelectedStatusToDelete(e.target.value)}
                        className="w-full p-2.5 border border-slate-300 rounded-md bg-white text-xs font-semibold"
                      >
                        {statusProgramList.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span className="text-slate-700 font-medium">
                        Bilangan program berstatus <strong>{selectedStatusToDelete}</strong>:
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {programs.filter((p) => p.statusProgram === selectedStatusToDelete).length} program
                      </span>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={
                          programs.filter((p) => p.statusProgram === selectedStatusToDelete).length === 0
                        }
                        onClick={handleDeleteByStatus}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 rounded-lg shadow-xs cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Padam Semua Program Status {selectedStatusToDelete}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Sub Mode Content 5: SATU PERSATU */}
                {deleteTabMode === 'single' && (
                  <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Padam Program Satu Persatu
                        </h4>
                        <p className="text-slate-500">
                          Cari program mengikut nama atau kod. Salinan sandaran JSON dimuat turun secara automatik bagi setiap rekod yang dipadam.
                        </p>
                      </div>

                      <input
                        type="text"
                        placeholder="Cari kod atau nama program..."
                        value={searchSingleProgram}
                        onChange={(e) => setSearchSingleProgram(e.target.value)}
                        className="p-2 border border-slate-300 rounded-md w-full sm:w-64 text-xs"
                      />
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Bil</th>
                            <th className="p-2.5">Kod & Nama Program</th>
                            <th className="p-2.5">Jabatan</th>
                            <th className="p-2.5 text-right">Peruntukan (RM)</th>
                            <th className="p-2.5 text-center">Status</th>
                            <th className="p-2.5 text-center w-28">Tindakan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {programs
                            .filter(
                              (p) =>
                                !searchSingleProgram.trim() ||
                                p.namaProgram.toLowerCase().includes(searchSingleProgram.toLowerCase()) ||
                                p.kodProgram.toLowerCase().includes(searchSingleProgram.toLowerCase())
                            )
                            .map((p, idx) => (
                              <tr key={p.id} className="hover:bg-slate-50">
                                <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                                <td className="p-2.5">
                                  <div className="font-bold text-slate-900 uppercase">
                                    {p.namaProgram}
                                  </div>
                                  <div className="text-[11px] font-mono text-slate-500">
                                    {p.kodProgram}
                                  </div>
                                </td>
                                <td className="p-2.5 text-slate-600">{p.jabatan}</td>
                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                  {formatRM(p.jumlahRm)}
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700">
                                    {p.statusProgram}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSingleProgramWithBackup(p)}
                                    className="px-2.5 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer transition-colors"
                                  >
                                    Padam
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL PENGESAHAN KESELAMATAN TINGGI: PADAM SEMUA DATA PROGRAM (SUPER ADMIN ONLY) */}
      {isDeleteAllModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border-2 border-rose-500 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-600 text-white flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight">
                  PENGESAHAN KESELAMATAN: PADAM SEMUA DATA
                </h4>
                <p className="text-xs text-rose-100 mt-1 leading-relaxed">
                  Tindakan ini tidak boleh diundur. Salinan fail sandaran JSON akan dimuat turun secara automatik sebelum pemadaman.
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 leading-relaxed">
                Anda sedang cuba memadamkan <strong>semua {programs.length} program</strong> termasuk Rekod Perubahan Maklumat Program (BK04). Sila sahkan identiti anda sebagai Super Admin dengan memasukkan ID dan Kata Laluan di bawah:
              </div>

              {authModalError && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
                  <span>{authModalError}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ID Pengguna Super Admin:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Masukkan ID Super Admin anda (cth: AMAN)"
                      value={authSuperAdminId}
                      onChange={(e) => setAuthSuperAdminId(e.target.value)}
                      className="w-full py-2 pl-8 pr-3 border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kata Laluan Super Admin:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="Masukkan kata laluan anda..."
                      value={authSuperAdminPassword}
                      onChange={(e) => setAuthSuperAdminPassword(e.target.value)}
                      className="w-full py-2 pl-8 pr-3 border border-slate-300 rounded-md font-mono text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                    />
                    <Key className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteAllModalOpen(false);
                  setAuthSuperAdminId('');
                  setAuthSuperAdminPassword('');
                  setAuthModalError(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-md shadow-md cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sahkan & Padam Semua Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENGESAHAN PADAM UNIVERSAL (CUSTOM REACT MODAL - MENGGANTIKAN WINDOW.CONFIRM) */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-base font-bold text-slate-900">
                  {deleteConfirm.title}
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {deleteConfirm.message}
                </p>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirm((prev) => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteConfirm.onConfirm}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-md transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Sahkan Padam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
