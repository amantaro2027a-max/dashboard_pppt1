import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { AdminLogin } from './AdminLogin';
import { FilterBar } from './FilterBar';
import { getStatusConfig, formatRM } from '../utils/formatters';
import { AdminLevelId, AccessMode, ADMIN_LEVEL_OPTIONS, getAdminLevelLabel, AdminUser, Pegawai, ProgramItem } from '../types/program';
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
  ChevronLeft,
  Search,
  UserPlus,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Key,
  FileDown,
  RotateCcw,
  Layers,
  Power,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
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
    toggleAdminUserActive,
    deleteAdminUser,
    changeOwnPassword,
    resetUserPassword,
    syncAdminUsersToFirebaseAuth,
    logActivity,
    getPageAccessMode,
    canEditPage,
    canEditJabatan,
    getEditableJabatans,
    getAuthorizedJabatanList,
    klusterList,
    klusterMap,
    getKlusterForPusat,
    pusatList,
    jabatanMap,
    pegawaiList,
    sumberKewanganList,
    statusProgramList,
    jawatanList,
    addKluster,
    updateKluster,
    deleteKluster,
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
    importKlusterBulk,
    importPegawaiBulk,
    importPusatBulk,
    importJabatanBulk,
    importSumberKewanganBulk,
    importStatusProgramBulk,
    importJawatanBulk,
    showNotification,
  } = useProgramContext();

  // Active sub-tab inside Admin portal
  const [adminTab, setAdminTab] = useState<'programs' | 'master'>('programs');
  const [isSyncingAuth, setIsSyncingAuth] = useState<boolean>(false);
  const [isRegisterAdminOpen, setIsRegisterAdminOpen] = useState<boolean>(false);
  const [isAdminListOpen, setIsAdminListOpen] = useState<boolean>(true);

  // Master Data active subcategory (Kluster IAB placed before 4. Pusat)
  const [masterCategory, setMasterCategory] = useState<
    'pegawai' | 'users' | 'kluster' | 'pusat' | 'jabatan' | 'sumber' | 'status' | 'jawatan' | 'muat_turun_naik' | 'notifikasi' | 'padam_data'
  >('pegawai');

  // Tab 7: Muat Naik / Muat Turun Data states
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importedPrograms, setImportedPrograms] = useState<ProgramItem[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importStatusMsg, setImportStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Master Data Tabs 1-6 Import/Eksport feedback state
  const [masterIoMsg, setMasterIoMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  const [newAdminLevelId, setNewAdminLevelId] = useState<AdminLevelId>('URUS_SETIA');
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('123');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPusat, setNewAdminPusat] = useState('');
  const [newAdminJabatan, setNewAdminJabatan] = useState('');
  const [newAdminJabatanAccess, setNewAdminJabatanAccess] = useState<Record<string, AccessMode>>({});
  const [newAdminPageAccess, setNewAdminPageAccess] = useState<Record<string, AccessMode>>({});
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Derived arrays for convenient length & selection checks
  const newAdminSelectedJabatans = useMemo(() => Object.keys(newAdminJabatanAccess), [newAdminJabatanAccess]);
  const newAdminAllowedPages = useMemo(() => Object.keys(newAdminPageAccess), [newAdminPageAccess]);

  // Self password change modal for Super Admin
  const [isChangeOwnPassOpen, setIsChangeOwnPassOpen] = useState(false);
  const [ownCurrentPass, setOwnCurrentPass] = useState('');
  const [ownNewPass, setOwnNewPass] = useState('');
  const [ownConfirmPass, setOwnConfirmPass] = useState('');
  const [ownPassMsg, setOwnPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Notice banner for program tab (replaces window.alert)
  const [programBannerMsg, setProgramBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // States for Editing Admin User
  const [editingAdminUser, setEditingAdminUser] = useState<AdminUser | null>(null);
  const [editAdminLevelId, setEditAdminLevelId] = useState<AdminLevelId>('URUS_SETIA');
  const [editAdminName, setEditAdminName] = useState('');
  const [editAdminPassword, setEditAdminPassword] = useState('');
  const [editAdminPusat, setEditAdminPusat] = useState('');
  const [editAdminJabatan, setEditAdminJabatan] = useState('');
  const [editAdminJabatanAccess, setEditAdminJabatanAccess] = useState<Record<string, AccessMode>>({});
  const [editAdminPageAccess, setEditAdminPageAccess] = useState<Record<string, AccessMode>>({});
  const [editAdminMsg, setEditAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const editAdminSelectedJabatans = useMemo(() => Object.keys(editAdminJabatanAccess), [editAdminJabatanAccess]);
  const editAdminAllowedPages = useMemo(() => Object.keys(editAdminPageAccess), [editAdminPageAccess]);

  // Form states for Master Data: Pegawai (6 fields requirement)
  const [isPegawaiFormOpen, setIsPegawaiFormOpen] = useState(false);
  const [editingPegawaiId, setEditingPegawaiId] = useState<string | null>(null);
  const [pegawaiFormNama, setPegawaiFormNama] = useState('');
  const [pegawaiFormPusat, setPegawaiFormPusat] = useState('');
  const [pegawaiFormJabatan, setPegawaiFormJabatan] = useState('');
  const [pegawaiFormJawatan, setPegawaiFormJawatan] = useState('');
  const [pegawaiFormEmel, setPegawaiFormEmel] = useState('');
  const [pegawaiFormNoHp, setPegawaiFormNoHp] = useState('');

  // Table states for Master Data: Pegawai (autosort, limit 10/15/20/30/50/Semua, search, pagination)
  const [pegawaiDisplayLimit, setPegawaiDisplayLimit] = useState<string>('10');
  const [pegawaiCurrentPage, setPegawaiCurrentPage] = useState<number>(1);
  const [pegawaiSortKey, setPegawaiSortKey] = useState<'id' | 'nama' | 'pusat' | 'jabatan' | 'jawatan' | 'emel' | 'noHp'>('id');
  const [pegawaiSortDir, setPegawaiSortDir] = useState<'asc' | 'desc'>('asc');
  const [pegawaiSearch, setPegawaiSearch] = useState<string>('');

  // Helper to generate the next unique sequential IAB Pegawai ID (e.g. IAB001, IAB002, ..., IAB012)
  const getNextPegawaiId = (list: Pegawai[]): string => {
    let maxNum = 0;
    list.forEach((p) => {
      const match = (p.id || '').match(/(\d+)/);
      if (match) {
        const n = parseInt(match[1], 10);
        if (!isNaN(n) && n > maxNum) {
          maxNum = n;
        }
      }
    });
    return `IAB${String(maxNum + 1).padStart(3, '0')}`;
  };

  // Filter, Auto-Sort & Pagination for Pegawai List
  const filteredPegawaiList = useMemo(() => {
    let list = [...pegawaiList];
    if (pegawaiSearch.trim()) {
      const q = pegawaiSearch.toLowerCase();
      list = list.filter(
        (p) =>
          (p.id && p.id.toLowerCase().includes(q)) ||
          (p.nama && p.nama.toLowerCase().includes(q)) ||
          (p.jawatan && p.jawatan.toLowerCase().includes(q)) ||
          (p.jabatan && p.jabatan.toLowerCase().includes(q)) ||
          (p.pusat && p.pusat.toLowerCase().includes(q)) ||
          (p.emel && p.emel.toLowerCase().includes(q)) ||
          (p.noHp && p.noHp.includes(q))
      );
    }

    list.sort((a, b) => {
      const valA = (a[pegawaiSortKey] || '').toString();
      const valB = (b[pegawaiSortKey] || '').toString();

      if (pegawaiSortKey === 'id') {
        const numA = parseInt(valA.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(valB.replace(/\D/g, ''), 10) || 0;
        return pegawaiSortDir === 'asc' ? numA - numB : numB - numA;
      }

      const cmp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      return pegawaiSortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [pegawaiList, pegawaiSearch, pegawaiSortKey, pegawaiSortDir]);

  const totalPegawaiCount = filteredPegawaiList.length;
  const pegawaiPageSize =
    pegawaiDisplayLimit === 'Semua' ? totalPegawaiCount : parseInt(pegawaiDisplayLimit, 10) || 10;
  const totalPegawaiPages =
    pegawaiPageSize > 0 ? Math.ceil(totalPegawaiCount / pegawaiPageSize) : 1;
  const safePegawaiCurrentPage = Math.min(
    Math.max(1, pegawaiCurrentPage),
    totalPegawaiPages || 1
  );

  const paginatedPegawaiList = useMemo(() => {
    if (pegawaiDisplayLimit === 'Semua') return filteredPegawaiList;
    const start = (safePegawaiCurrentPage - 1) * pegawaiPageSize;
    return filteredPegawaiList.slice(start, start + pegawaiPageSize);
  }, [filteredPegawaiList, safePegawaiCurrentPage, pegawaiPageSize, pegawaiDisplayLimit]);

  const handleSortPegawai = (key: 'id' | 'nama' | 'pusat' | 'jabatan' | 'jawatan' | 'emel' | 'noHp') => {
    if (pegawaiSortKey === key) {
      setPegawaiSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setPegawaiSortKey(key);
      setPegawaiSortDir('asc');
    }
  };

  // Pop-up modal & form states for Kluster, Pusat, Jabatan, Sumber, Status, Jawatan
  const [isKlusterModalOpen, setIsKlusterModalOpen] = useState(false);
  const [klusterInput, setKlusterInput] = useState('');
  const [editingKluster, setEditingKluster] = useState<string | null>(null);

  const [isPusatModalOpen, setIsPusatModalOpen] = useState(false);
  const [pusatKlusterInput, setPusatKlusterInput] = useState(klusterList[0] || '');
  const [pusatInput, setPusatInput] = useState('');
  const [editingPusat, setEditingPusat] = useState<string | null>(null);

  const [selectedKlusterForJabatan, setSelectedKlusterForJabatan] = useState<string>('SEMUA');
  const [selectedPusatForJabatan, setSelectedPusatForJabatan] = useState(pusatList[0] || '');
  const [isJabatanModalOpen, setIsJabatanModalOpen] = useState(false);
  const [modalKlusterForJabatan, setModalKlusterForJabatan] = useState(klusterList[0] || '');
  const [modalPusatForJabatan, setModalPusatForJabatan] = useState(pusatList[0] || '');
  const [jabatanInput, setJabatanInput] = useState('');
  const [editingJabatan, setEditingJabatan] = useState<string | null>(null);

  const [isSumberModalOpen, setIsSumberModalOpen] = useState(false);
  const [sumberInput, setSumberInput] = useState('');
  const [editingSumber, setEditingSumber] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  const [isJawatanModalOpen, setIsJawatanModalOpen] = useState(false);
  const [jawatanInput, setJawatanInput] = useState('');
  const [editingJawatan, setEditingJawatan] = useState<string | null>(null);

  // Master Data Tabs Export & Import Helpers
  const handleExportMasterData = (
    category: 'pegawai' | 'kluster' | 'pusat' | 'jabatan' | 'sumber' | 'status' | 'jawatan'
  ) => {
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const wb = XLSX.utils.book_new();
      let rows: Record<string, any>[] = [];
      let sheetName = 'Data';
      let fileName = `DATA_INDUK_${category.toUpperCase()}_${dateStr}.xlsx`;

      if (category === 'pegawai') {
        sheetName = 'Senarai Pegawai';
        rows = pegawaiList.map((p, idx) => ({
          Bil: idx + 1,
          'ID Pegawai': p.id,
          'Nama Pegawai': p.nama,
          Jawatan: p.jawatan || '',
          Pusat: p.pusat || '',
          Jabatan: p.jabatan || '',
          Emel: p.emel || '',
          'No. HP': p.noHp || '',
        }));
      } else if (category === 'kluster') {
        sheetName = 'Kluster IAB';
        rows = klusterList.map((k, idx) => ({
          Bil: idx + 1,
          'Nama Kluster': k,
          'Bilangan Pusat': (klusterMap[k] || []).length,
          'Senarai Pusat': (klusterMap[k] || []).join('; '),
        }));
      } else if (category === 'pusat') {
        sheetName = 'Senarai Pusat';
        rows = pusatList.map((p, idx) => ({
          Bil: idx + 1,
          'Kluster IAB': getKlusterForPusat(p) || '-',
          'Nama Pusat': p,
          'Bilangan Jabatan': (jabatanMap[p] || []).length,
        }));
      } else if (category === 'jabatan') {
        sheetName = 'Senarai Jabatan';
        let bil = 1;
        pusatList.forEach((pus) => {
          const klusterName = getKlusterForPusat(pus) || '-';
          (jabatanMap[pus] || []).forEach((jab) => {
            rows.push({
              Bil: bil++,
              'Kluster IAB': klusterName,
              'Pusat Induk': pus,
              'Nama Jabatan': jab,
            });
          });
        });
      } else if (category === 'sumber') {
        sheetName = 'Sumber Kewangan';
        rows = sumberKewanganList.map((s, idx) => ({
          Bil: idx + 1,
          'Nama Sumber Kewangan': s,
        }));
      } else if (category === 'status') {
        sheetName = 'Status Program';
        rows = statusProgramList.map((st, idx) => ({
          Bil: idx + 1,
          'Status Program': st,
        }));
      } else if (category === 'jawatan') {
        sheetName = 'Senarai Jawatan';
        rows = jawatanList.map((j, idx) => ({
          Bil: idx + 1,
          'Nama Jawatan': j,
        }));
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName);

      logActivity({
        action_type: 'EXPORT',
        module_name: 'Portal Admin',
        activity_description: `Exported Master Data "${category.toUpperCase()}" (${rows.length} rows): ${fileName}`,
        record_id: fileName,
        status: 'SUCCESS',
      });

      setMasterIoMsg({
        type: 'success',
        text: `Berjaya mengeksport ${rows.length} rekod ke fail ${fileName}.`,
      });
      setTimeout(() => setMasterIoMsg(null), 5000);
    } catch (err) {
      console.error('Export Master Data Error:', err);
      setMasterIoMsg({ type: 'error', text: 'Ralat semasa mengeksport fail Excel.' });
    }
  };

  const handleImportMasterData = (
    category: 'pegawai' | 'kluster' | 'pusat' | 'jabatan' | 'sumber' | 'status' | 'jawatan',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const pickField = (row: Record<string, any>, aliases: string[], allowFirstColFallback = false): string => {
      const entries = Object.entries(row);
      for (const alias of aliases) {
        const normAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
        const found = entries.find(([k]) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === normAlias);
        if (found && String(found[1] ?? '').trim() !== '') {
          return String(found[1]).trim();
        }
      }
      if (allowFirstColFallback) {
        const nonBil = entries.find(([k, v]) => {
          const nk = k.toLowerCase().replace(/[^a-z0-9]/g, '');
          return nk !== 'bil' && nk !== 'no' && String(v ?? '').trim() !== '';
        });
        if (nonBil) return String(nonBil[1]).trim();
      }
      return '';
    };

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

        if (!rows || rows.length === 0) {
          setMasterIoMsg({ type: 'error', text: 'Fail yang dimuat naik kosong atau tidak mengandungi rekod.' });
          return;
        }

        if (category === 'pegawai') {
          const parsed: Partial<Pegawai>[] = rows
            .map((r) => ({
              id: pickField(r, ['ID Pegawai', 'ID', 'idPegawai']),
              nama: pickField(r, ['Nama Pegawai', 'Nama Penuh', 'Nama', 'name']),
              jawatan: pickField(r, ['Jawatan', 'Gelaran']),
              pusat: pickField(r, ['Pusat', 'Pusat Induk']),
              jabatan: pickField(r, ['Jabatan', 'Unit']),
              emel: pickField(r, ['Emel', 'Emel Rasmi', 'Email']),
              noHp: pickField(r, ['No. HP', 'No HP', 'No Telefon', 'Telefon', 'HP']),
            }))
            .filter((p) => p.nama);

          const res = importPegawaiBulk(parsed);
          setMasterIoMsg(
            res.success
              ? {
                  type: 'success',
                  text: `Import Pegawai berjaya: ${res.added} rekod baharu ditambah, ${res.updated} rekod dikemaskini daripada ${file.name}.`,
                }
              : { type: 'error', text: res.message || 'Gagal mengimport data pegawai.' }
          );
        } else if (category === 'kluster') {
          const items = rows
            .map((r) => pickField(r, ['Nama Kluster', 'Kluster IAB', 'Kluster'], true))
            .filter(Boolean);
          const res = importKlusterBulk(items);
          const msg = res.success
            ? `Import Kluster IAB berjaya: ${res.added} kluster baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport data Kluster IAB.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Kluster IAB Berjaya' : 'Ralat Import Kluster IAB',
            message: msg,
          });
        } else if (category === 'pusat') {
          const items = rows
            .map((r) => ({
              pusat: pickField(r, ['Nama Pusat', 'Pusat'], true),
              kluster: pickField(r, ['Kluster IAB', 'Nama Kluster', 'Kluster']),
            }))
            .filter((x) => Boolean(x.pusat));
          const res = importPusatBulk(items);
          const msg = res.success
            ? `Import Pusat berjaya: ${res.added} pusat baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport data Pusat.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Pusat Berjaya' : 'Ralat Import Pusat',
            message: msg,
          });
        } else if (category === 'jabatan') {
          const entries = rows
            .map((r) => ({
              kluster: pickField(r, ['Kluster IAB', 'Nama Kluster', 'Kluster']),
              pusat: pickField(r, ['Pusat Induk', 'Nama Pusat', 'Pusat']) || selectedPusatForJabatan,
              jabatan: pickField(r, ['Nama Jabatan', 'Jabatan'], true),
            }))
            .filter((item) => item.jabatan);
          const res = importJabatanBulk(entries, selectedPusatForJabatan);
          const msg = res.success
            ? `Import Jabatan berjaya: ${res.added} jabatan baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport data Jabatan.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Jabatan Berjaya' : 'Ralat Import Jabatan',
            message: msg,
          });
        } else if (category === 'sumber') {
          const items = rows
            .map((r) => pickField(r, ['Nama Sumber Kewangan', 'Sumber Kewangan', 'Sumber'], true))
            .filter(Boolean);
          const res = importSumberKewanganBulk(items);
          const msg = res.success
            ? `Import Sumber Kewangan berjaya: ${res.added} rekod baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport Sumber Kewangan.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Sumber Kewangan Berjaya' : 'Ralat Import Sumber Kewangan',
            message: msg,
          });
        } else if (category === 'status') {
          const items = rows
            .map((r) => pickField(r, ['Status Program', 'Nama Status', 'Status'], true))
            .filter(Boolean);
          const res = importStatusProgramBulk(items);
          const msg = res.success
            ? `Import Status Program berjaya: ${res.added} status baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport Status Program.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Status Program Berjaya' : 'Ralat Import Status Program',
            message: msg,
          });
        } else if (category === 'jawatan') {
          const items = rows
            .map((r) => pickField(r, ['Nama Jawatan', 'Jawatan'], true))
            .filter(Boolean);
          const res = importJawatanBulk(items);
          const msg = res.success
            ? `Import Jawatan berjaya: ${res.added} jawatan baharu ditambah daripada ${file.name}.`
            : res.message || 'Gagal mengimport Jawatan.';
          setMasterIoMsg({ type: res.success ? 'success' : 'error', text: msg });
          showNotification({
            type: res.success ? 'success' : 'error',
            title: res.success ? 'Import Jawatan Berjaya' : 'Ralat Import Jawatan',
            message: msg,
          });
        }
        setTimeout(() => setMasterIoMsg(null), 6000);
      } catch (err) {
        console.error('Import Master Data Error:', err);
        const errMsg = 'Gagal membaca fail Excel/CSV. Pastikan format fail adalah sah.';
        setMasterIoMsg({ type: 'error', text: errMsg });
        showNotification({
          type: 'error',
          title: 'Ralat Membaca Fail Import',
          message: errMsg,
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderMasterIoButtons = (
    category: 'pegawai' | 'kluster' | 'pusat' | 'jabatan' | 'sumber' | 'status' | 'jawatan'
  ) => (
    <div className="flex flex-wrap items-center gap-2">
      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        <span>Import Excel/CSV</span>
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => handleImportMasterData(category, e)}
          className="sr-only"
        />
      </label>
      <button
        type="button"
        onClick={() => handleExportMasterData(category)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Eksport Excel</span>
      </button>
    </div>
  );

  // REQUIREMENT: Pages available for permission assignment
  const AVAILABLE_PAGES = [
    { key: 'DASHBOARD PROGRAM', label: 'DASHBOARD PROGRAM' },
    { key: 'DASHBOARD BERSEPADU', label: 'DASHBOARD BERSEPADU' },
    { key: 'IAB ALL', label: 'PAGE IAB ALL' },
    { key: 'KLUSTER KHIDMAT PROFESIONAL', label: 'PAGE KLUSTER KHIDMAT PROFESIONAL' },
    { key: 'KLUSTER KHIDMAT LATIHAN', label: 'PAGE KLUSTER KHIDMAT LATIHAN' },
    { key: 'PERINCIAN PROGRAM', label: 'PERINCIAN PROGRAM' },
    { key: 'ANALISIS PEGAWAI', label: 'ANALISIS PEGAWAI MENGIKUT PROGRAM' },
    { key: 'PUSAT', label: 'PAGE PUSAT' },
    { key: 'JABATAN', label: 'PAGE JABATAN' },
    { key: 'PERUNTUKAN', label: 'PERUNTUKAN' },
    { key: 'PERBELANJAAN', label: 'PERBELANJAAN' },
    { key: 'SUBWARAN', label: 'SUBWARAN' },
    { key: 'BAKI PERUNTUKAN', label: 'BAKI PERUNTUKAN' },
    { key: 'ADMIN MONITORING DASHBOARD', label: 'ADMIN MONITORING DASHBOARD' },
  ];

  const authorizedJabatans = useMemo(() => getAuthorizedJabatanList(), [getAuthorizedJabatanList]);
  const editableJabatans = useMemo(() => getEditableJabatans(), [getEditableJabatans]);
  const canEditAdminPortal = isSuperAdmin || (canEditPage('ADMIN') && editableJabatans.length > 0);

  // Sorting & Display count for Program List
  const handleSortProgram = (key: 'pusat' | 'jabatan' | 'kodProgram' | 'namaProgram' | 'statusProgram') => {
    if (programSortKey === key) {
      setProgramSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setProgramSortKey(key);
      setProgramSortDirection('asc');
    }
  };

  // Tapiskan senarai program mengikut JABATAN DIBERI AKSES pengguna
  const adminProgramList = useMemo(() => {
    if (!currentUser) return [];
    let list = isSuperAdmin
      ? filteredPrograms
      : authorizedJabatans.length === 0
      ? []
      : filteredPrograms.filter((p) => authorizedJabatans.includes(p.jabatan));

    if (programSortKey) {
      list = [...list].sort((a, b) => {
        const valA = (a[programSortKey] || '').toString().toLowerCase();
        const valB = (b[programSortKey] || '').toString().toLowerCase();
        const cmp = valA.localeCompare(valB, undefined, { numeric: true });
        return programSortDirection === 'asc' ? cmp : -cmp;
      });
    }

    return list;
  }, [isSuperAdmin, filteredPrograms, currentUser, authorizedJabatans, programSortKey, programSortDirection]);

  const displayedAdminPrograms = useMemo(() => {
    if (programDisplayLimit === 'Semua') return adminProgramList;
    return adminProgramList.slice(0, Number(programDisplayLimit));
  }, [adminProgramList, programDisplayLimit]);

  const totalProgramsForUser = useMemo(() => {
    if (!currentUser) return 0;
    if (isSuperAdmin) return programs.length;
    if (authorizedJabatans.length === 0) return 0;
    return programs.filter((p) => authorizedJabatans.includes(p.jabatan)).length;
  }, [isSuperAdmin, programs, currentUser, authorizedJabatans]);

  const allJabatansList = useMemo(() => {
    const list: string[] = [];
    Object.values(jabatanMap).forEach((arr) => {
      arr.forEach((j) => {
        if (!list.includes(j)) list.push(j);
      });
    });
    return list.sort();
  }, [jabatanMap]);

  // Filtered Jabatan & Pegawai options for Daftar ID Pengguna Baharu (1-8 cascading order)
  const jabatanOptionsForNewAdmin = useMemo(() => {
    const base =
      newAdminPusat && jabatanMap[newAdminPusat]
        ? [...jabatanMap[newAdminPusat]]
        : Array.from(new Set(Object.values(jabatanMap).flat()));
    const extras = new Set<string>(base);
    pegawaiList.forEach((pg) => {
      if (newAdminPusat && pg.pusat !== newAdminPusat) return;
      if (pg.jabatan && !extras.has(pg.jabatan)) {
        extras.add(pg.jabatan);
      }
    });
    return Array.from(extras).filter(Boolean);
  }, [newAdminPusat, jabatanMap, pegawaiList]);

  const pegawaiOptionsForNewAdmin = useMemo(() => {
    return pegawaiList.filter((pg) => {
      if (
        newAdminPusat &&
        newAdminPusat !== 'SEMUA PUSAT' &&
        newAdminPusat !== 'TIDAK BERKENAAN'
      ) {
        const pusJabs = jabatanMap[newAdminPusat] || [];
        const matchPusat =
          pg.pusat === newAdminPusat || (pg.jabatan && pusJabs.includes(pg.jabatan));
        if (!matchPusat) return false;
      }
      if (
        newAdminJabatan &&
        newAdminJabatan !== 'SEMUA JABATAN' &&
        newAdminJabatan !== 'TIDAK BERKENAAN'
      ) {
        if (pg.jabatan !== newAdminJabatan) return false;
      }
      return true;
    });
  }, [pegawaiList, newAdminPusat, newAdminJabatan, jabatanMap]);

  // If not logged in, render the login page (placed after all hooks)
  if (!currentUser) {
    return <AdminLogin />;
  }

  // Strictly block non-Super Admin users from seeing Portal Pengurusan Pentadbir (Admin)
  if (!isSuperAdmin) {
    return (
      <div className="max-w-lg mx-auto my-10 bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Akses Terhad — Super Admin Sahaja</h2>
        <p className="text-xs text-slate-600 mt-2 leading-relaxed">
          Portal Pengurusan Pentadbir (Admin) hanya dibenarkan untuk pengguna bertaraf Super Admin sahaja.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('selamatDatang')}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Kembali ke Selamat Datang
          </button>
          {getPageAccessMode('DASHBOARD PROGRAM') !== 'none' && (
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Dashboard Program
            </button>
          )}
        </div>
      </div>
    );
  }

  // Handling Program Edit (LOCKED for SELESAI programs + requires Edit permission)
  const handleEditProgram = (prog: ProgramItem) => {
    setProgramBannerMsg(null);
    if (prog.statusProgram.toUpperCase() === 'SELESAI' && !isSuperAdmin) {
      setProgramBannerMsg({
        type: 'error',
        text: 'Program berstatus SELESAI telah dikunci (LOCKED) dan hanya boleh diedit oleh Super Admin.',
      });
      return;
    }
    const hasEditPerm = isSuperAdmin || (canEditPage('ADMIN') && canEditJabatan(prog.jabatan));
    if (!hasEditPerm) {
      setProgramBannerMsg({
        type: 'error',
        text: `Mod Paparan Sahaja (View Only): Anda tidak mempunyai kebenaran Edit bagi halaman Admin dan jabatan "${prog.jabatan}".`,
      });
      return;
    }
    setProgramToEdit(prog);
    setIsFormOpen(true);
  };

  // Handling Program Delete (Super Admin only - using custom confirmation modal)
  const handleDeleteProgram = (prog: ProgramItem) => {
    if (!isSuperAdmin) {
      setProgramBannerMsg({
        type: 'error',
        text: 'Akses Ditolak: Hanya Super Admin dibenarkan memadam program.',
      });
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

    logActivity({
      action_type: 'DOWNLOAD',
      module_name: 'Portal Admin',
      activity_description: `Downloaded full JSON backup (${programs.length} programs + BK04): ${fileName}`,
      record_id: fileName,
      status: 'SUCCESS',
    });

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
        'Urus Setia ID': p.urusSetiaId || '',
        'Urus Setia Nama': p.urusSetiaNama || '',
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
      logActivity({
        action_type: 'EXPORT',
        module_name: 'Portal Admin',
        activity_description: `Exported full Excel workbook (${programs.length} programs): ${fileName}`,
        record_id: fileName,
        status: 'SUCCESS',
      });
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
              urusSetiaId: row['Urus Setia ID'] || row['urusSetiaId'] || '',
              urusSetiaNama: row['Urus Setia Nama'] || row['urusSetiaNama'] || '',
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


  // When Super Admin selects Pegawai from Dropdown in "Pengurusan ID Admin",
  // autofill ID Pengguna Admin, default password '123', and tick matching Jabatan as 'view' only by default
  const handleSelectPegawaiForAdmin = (pegId: string) => {
    setSelectedPegawaiIdForAdmin(pegId);
    setUserActionMsg(null);

    const peg = pegawaiList.find((p) => p.id === pegId);
    if (peg) {
      setNewAdminName(peg.nama);
      const effectivePusat = newAdminPusat || peg.pusat || '';
      const effectiveJabatan = newAdminJabatan || peg.jabatan || '';
      if (!newAdminPusat && peg.pusat) setNewAdminPusat(peg.pusat);
      if (!newAdminJabatan && peg.jabatan) setNewAdminJabatan(peg.jabatan);
      setNewAdminPassword((prev) => prev || '123');

      const cleanName = peg.nama
        .trim()
        .replace(/^(DR\.?|ENCIK|PUAN|CIK|HAJI|HAJAH|TUAN|HJ\.?|HJH\.?)\s+/i, '');
      const firstWord = (cleanName.split(/\s+/)[0] || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 20);
      const fallbackWord = (peg.nama.trim().split(/\s+/)[0] || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toUpperCase()
        .slice(0, 20);
      setNewAdminId(firstWord || fallbackWord);

      // Default ticked Jabatan(s) set to 'view' (View Only by default)
      if (newAdminLevelId === 'KETUA_PUSAT' && effectivePusat && jabatanMap[effectivePusat]) {
        const map: Record<string, AccessMode> = {};
        (jabatanMap[effectivePusat] || []).forEach((j) => {
          map[j] = 'view';
        });
        setNewAdminJabatanAccess(map);
      } else if (effectiveJabatan && effectiveJabatan !== 'TIDAK BERKENAAN') {
        if (effectiveJabatan === 'SEMUA JABATAN') {
          const allJabs = Object.values(jabatanMap).flat();
          const map: Record<string, AccessMode> = {};
          allJabs.forEach((j) => {
            map[j] = 'view';
          });
          setNewAdminJabatanAccess(map);
        } else {
          setNewAdminJabatanAccess({ [effectiveJabatan]: 'view' });
        }
      } else if (peg.pusat && jabatanMap[peg.pusat] && (peg.jawatan || '').toUpperCase().includes('KETUA PUSAT')) {
        const map: Record<string, AccessMode> = {};
        (jabatanMap[peg.pusat] || []).forEach((j) => {
          map[j] = 'view';
        });
        setNewAdminJabatanAccess(map);
      } else {
        setNewAdminJabatanAccess({});
      }
    } else {
      setNewAdminName('');
      setNewAdminId('');
      setNewAdminPassword('123');
      setNewAdminJabatanAccess({});
    }
  };

  // Handle Add Admin User submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);

    if (!newAdminName) {
      const errMsg = 'Sila pilih Nama Penuh Pegawai Admin daripada senarai drop down.';
      setUserActionMsg({ type: 'error', text: errMsg });
      showNotification({
        type: 'error',
        title: 'Gagal Mewujudkan ID Pengguna',
        message: errMsg,
      });
      return;
    }

    if (!newAdminId.trim()) {
      const errMsg = 'Sila masukkan ID Pengguna.';
      setUserActionMsg({ type: 'error', text: errMsg });
      showNotification({
        type: 'error',
        title: 'Gagal Mewujudkan ID Pengguna',
        message: errMsg,
      });
      return;
    }

    const effectivePass = newAdminPassword.trim() || '123';

    if (newAdminLevelId !== 'SUPER_ADMIN' && newAdminSelectedJabatans.length === 0) {
      const errMsg = 'Sila pilih sekurang-kurangnya satu Jabatan dalam Jabatan Diberi Akses.';
      setUserActionMsg({ type: 'error', text: errMsg });
      showNotification({
        type: 'error',
        title: 'Gagal Mewujudkan ID Pengguna',
        message: errMsg,
      });
      return;
    }

    const allJabs = Object.values(jabatanMap).flat();
    const allJabsCount = allJabs.length;

    let finalJabatanAccess: Record<string, AccessMode> = { ...newAdminJabatanAccess };
    let finalPageAccess: Record<string, AccessMode> = { ...newAdminPageAccess };
    let finalAllowedJabatans = [...newAdminSelectedJabatans];
    let finalAllowedPages = [...newAdminAllowedPages];
    let primaryJabatan =
      newAdminSelectedJabatans.length === allJabsCount
        ? 'SEMUA JABATAN'
        : newAdminSelectedJabatans.join(', ');

    if (newAdminLevelId === 'SUPER_ADMIN') {
      finalJabatanAccess = {};
      allJabs.forEach((j) => {
        finalJabatanAccess[j] = 'edit';
      });
      finalPageAccess = {};
      AVAILABLE_PAGES.forEach((pg) => {
        finalPageAccess[pg.key] = 'edit';
      });
      finalAllowedJabatans = ['SEMUA JABATAN'];
      finalAllowedPages = AVAILABLE_PAGES.map((pg) => pg.key);
      primaryJabatan = 'SEMUA JABATAN';
    }

    const createdId = newAdminId.trim().toUpperCase();
    const createdNama = newAdminName.trim();
    const createdLevelLabel = getAdminLevelLabel(newAdminLevelId);

    const res = await createAdminUser({
      id: createdId,
      password: effectivePass,
      name: createdNama,
      role: newAdminLevelId === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      levelId: newAdminLevelId,
      pusat: newAdminLevelId === 'SUPER_ADMIN' ? '' : (newAdminPusat || pusatList[0] || ''),
      jabatan: newAdminLevelId === 'SUPER_ADMIN' ? '' : primaryJabatan,
      allowedJabatans: finalAllowedJabatans,
      jabatanAccess: finalJabatanAccess,
      allowedPages: finalAllowedPages,
      pageAccess: finalPageAccess,
    });

    if (res.success) {
      const successBannerText =
        res.message ||
        `ID "${createdId}" (${createdLevelLabel}) untuk "${createdNama}" berjaya didaftarkan! (Kata laluan: ${effectivePass})`;
      setUserActionMsg({
        type: 'success',
        text: successBannerText,
      });
      showNotification({
        type: 'success',
        title: 'ID Pengguna Baharu Berjaya Diwujudkan',
        message: `TAHNIAH!!! ID baharu telah berjaya diwujudkan.\n\nBerikut merupakan maklumat ID baharu pegawai:\nNama Pegawai: ${createdNama}\nPeranan ID: ${createdLevelLabel}\nID: ${createdId}\nKata laluan (default): ${effectivePass}`,
      });
      setSelectedPegawaiIdForAdmin('');
      setNewAdminLevelId('URUS_SETIA');
      setNewAdminId('');
      setNewAdminPassword('123');
      setNewAdminName('');
      setNewAdminPusat('');
      setNewAdminJabatan('');
      setNewAdminJabatanAccess({});
      setNewAdminPageAccess({});
    } else {
      const errMsg = res.message || 'Gagal mendaftar admin.';
      setUserActionMsg({ type: 'error', text: errMsg });
      showNotification({
        type: 'error',
        title: 'Gagal Mewujudkan ID Pengguna',
        message: errMsg,
      });
    }
  };

  // Handlers for Editing Admin User
  const handleOpenEditAdmin = (user: AdminUser) => {
    setEditingAdminUser(user);
    const resolvedLevel: AdminLevelId =
      user.levelId || (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'KETUA_JABATAN');
    setEditAdminLevelId(resolvedLevel);
    setEditAdminName(user.name);
    setEditAdminPassword(
      user.password ||
        (user.id.toUpperCase() === 'AMAN' && currentUser?.id.toUpperCase() === 'AMAN'
          ? currentUser.password || ''
          : !user.firebaseAuthSynced
          ? '123'
          : '')
    );
    setEditAdminPusat(user.pusat || pusatList[0] || '');
    setEditAdminJabatan(user.jabatan || '');

    // Build editAdminJabatanAccess preserving stored 'view' | 'edit' modes (defaulting legacy entries to 'view')
    const jMap: Record<string, AccessMode> = {};
    if (user.jabatanAccess && Object.keys(user.jabatanAccess).length > 0) {
      Object.entries(user.jabatanAccess).forEach(([k, v]) => {
        if (k === 'SEMUA JABATAN') {
          Object.values(jabatanMap).flat().forEach((aj) => {
            jMap[aj] = v === 'edit' ? 'edit' : 'view';
          });
        } else {
          jMap[k] = v === 'edit' ? 'edit' : 'view';
        }
      });
    } else {
      const legacyJabs = user.allowedJabatans || (user.jabatan ? [user.jabatan] : []);
      legacyJabs.forEach((j) => {
        if (j === 'SEMUA JABATAN') {
          Object.values(jabatanMap).flat().forEach((aj) => {
            jMap[aj] = 'view';
          });
        } else if (j && j !== 'TIDAK BERKENAAN') {
          jMap[j] = 'view';
        }
      });
    }
    setEditAdminJabatanAccess(jMap);

    // Build editAdminPageAccess preserving stored 'view' | 'edit' modes (defaulting legacy entries to 'view')
    const pMap: Record<string, AccessMode> = {};
    if (user.pageAccess && Object.keys(user.pageAccess).length > 0) {
      Object.entries(user.pageAccess).forEach(([k, v]) => {
        pMap[k] = v === 'edit' ? 'edit' : 'view';
      });
    } else if (user.allowedPages && user.allowedPages.length > 0) {
      user.allowedPages.forEach((pg) => {
        pMap[pg] = 'view';
      });
    }
    setEditAdminPageAccess(pMap);
    setEditAdminMsg(null);
  };

  const handleSaveEditAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdminUser) return;

    const allJabs = Object.values(jabatanMap).flat();
    const allJabsCount = allJabs.length;
    const isEditingAman = editingAdminUser.id.toUpperCase() === 'AMAN';
    const finalLevel: AdminLevelId = isEditingAman ? 'SUPER_ADMIN' : editAdminLevelId;

    if (finalLevel !== 'SUPER_ADMIN' && editAdminSelectedJabatans.length === 0) {
      const errMsg = 'Sila pilih sekurang-kurangnya satu Jabatan dalam Jabatan Diberi Akses.';
      setEditAdminMsg({
        type: 'error',
        text: errMsg,
      });
      showNotification({
        type: 'error',
        title: 'Gagal Mengemaskini ID Pengguna',
        message: errMsg,
      });
      return;
    }

    let finalJabAccess = { ...editAdminJabatanAccess };
    let finalPageAccess = { ...editAdminPageAccess };
    let finalAllowedJabs = [...editAdminSelectedJabatans];
    let finalAllowedPages = [...editAdminAllowedPages];
    let primaryJabatan =
      editAdminSelectedJabatans.length === allJabsCount
        ? 'SEMUA JABATAN'
        : editAdminSelectedJabatans.join(', ');

    if (finalLevel === 'SUPER_ADMIN') {
      finalJabAccess = {};
      allJabs.forEach((j) => {
        finalJabAccess[j] = 'edit';
      });
      finalPageAccess = {};
      AVAILABLE_PAGES.forEach((pg) => {
        finalPageAccess[pg.key] = 'edit';
      });
      finalAllowedJabs = ['SEMUA JABATAN'];
      finalAllowedPages = AVAILABLE_PAGES.map((pg) => pg.key);
      primaryJabatan = '';
    }

    const trimmedPassword = editAdminPassword.trim();
    if (!trimmedPassword) {
      const errMsg = 'Kata Laluan wajib diisi dan tidak boleh dibiarkan kosong.';
      setEditAdminMsg({
        type: 'error',
        text: errMsg,
      });
      showNotification({
        type: 'error',
        title: 'Gagal Mengemaskini ID Pengguna',
        message: errMsg,
      });
      return;
    }

    const res = updateAdminUser(editingAdminUser.id, {
      name: editAdminName.trim(),
      password: trimmedPassword,
      role: finalLevel === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN',
      levelId: finalLevel,
      pusat: finalLevel === 'SUPER_ADMIN' ? '' : editAdminPusat,
      jabatan: primaryJabatan,
      allowedJabatans: finalAllowedJabs,
      jabatanAccess: finalJabAccess,
      allowedPages: finalAllowedPages,
      pageAccess: finalPageAccess,
    });
    if (res.success) {
      const savedId = editingAdminUser.id;
      const successMsg = `Kemaskini ID "${savedId}" berjaya disimpan.`;
      setEditingAdminUser(null);
      setUserActionMsg({
        type: 'success',
        text: successMsg,
      });
      showNotification({
        type: 'success',
        title: 'Kemaskini ID Pengguna Berjaya',
        message: successMsg,
      });
    } else {
      const errMsg = res.message || 'Gagal mengemaskini maklumat admin.';
      setEditAdminMsg({ type: 'error', text: errMsg });
      showNotification({
        type: 'error',
        title: 'Gagal Mengemaskini ID Pengguna',
        message: errMsg,
      });
    }
  };

  const handleChangeOwnPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnPassMsg(null);
    if (ownNewPass !== ownConfirmPass) {
      setOwnPassMsg({ type: 'error', text: 'Kata laluan baharu dan pengesahan tidak sepadan.' });
      return;
    }
    const res = await changeOwnPassword(ownCurrentPass, ownNewPass);
    if (res.success) {
      setOwnPassMsg({ type: 'success', text: 'Kata laluan anda berjaya dikemaskini.' });
      setOwnCurrentPass('');
      setOwnNewPass('');
      setOwnConfirmPass('');
      setTimeout(() => {
        setIsChangeOwnPassOpen(false);
        setOwnPassMsg(null);
      }, 1500);
    } else {
      setOwnPassMsg({ type: 'error', text: res.message || 'Gagal menukar kata laluan.' });
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
    setPegawaiFormJawatan('');
    setPegawaiFormPusat('');
    setPegawaiFormJabatan('');
    setPegawaiFormEmel('');
    setPegawaiFormNoHp('');
    setIsPegawaiFormOpen(true);
  };

  const handleEditPegawai = (peg: Pegawai) => {
    setEditingPegawaiId(peg.id);
    setPegawaiFormNama(peg.nama);
    const jwt = peg.jawatan || '';
    setPegawaiFormJawatan(jwt);
    if (isSpecialDirector(jwt)) {
      setPegawaiFormPusat('TIDAK BERKENAAN');
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else if (isKetuaPusat(jwt)) {
      const p = peg.pusat || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const p = peg.pusat || '';
      setPegawaiFormPusat(p);
      setPegawaiFormJabatan(peg.jabatan || '');
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
        setPegawaiFormPusat('');
      }
      setPegawaiFormJabatan('TIDAK BERKENAAN');
    } else {
      const p = pegawaiFormPusat === 'TIDAK BERKENAAN' ? '' : pegawaiFormPusat;
      setPegawaiFormPusat(p);
      if (pegawaiFormJabatan === 'TIDAK BERKENAAN') {
        setPegawaiFormJabatan('');
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
    if (!pegawaiFormNama.trim() || !pegawaiFormJawatan.trim()) return;

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
      const id = getNextPegawaiId(pegawaiList);
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
                {isSuperAdmin ? 'Super Admin (Kuasa Penuh)' : getAdminLevelLabel(currentUser.levelId, currentUser.role)}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {currentUser.name} ({currentUser.id})
            </h2>
            {!isSuperAdmin && authorizedJabatans.length > 0 && (
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Paparan Jabatan: <strong>{authorizedJabatans.join(', ')}</strong> ·{' '}
                  <strong className={canEditAdminPortal ? 'text-emerald-300' : 'text-amber-300'}>
                    {canEditAdminPortal ? 'Mod Suntingan Aktif' : 'Mod Paparan Sahaja (View Only)'}
                  </strong>
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

          {canEditAdminPortal && (
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
          )}
        </div>
      </div>

      {/* Main Admin Tab Switcher (Pengurusan ID Admin dipindahkan ke dalam Master Data) */}
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
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SENARAI RINGKAS PROGRAM & PENAPIS                      */}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'programs' && (
        <div className="space-y-4">
          {/* Penapis Data Program Admin (Sama seperti Dashboard Program) */}
          <FilterBar showTahunBulan={true} showStatusFilter={true} />

          {programBannerMsg && (
            <div
              className={`p-3.5 rounded-lg text-xs flex items-center justify-between border ${
                programBannerMsg.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              <span>{programBannerMsg.text}</span>
              <button
                type="button"
                onClick={() => setProgramBannerMsg(null)}
                className="font-bold underline ml-3 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Sub-admin notice if applicable */}
          {!isSuperAdmin && (
            <div
              className={`p-3.5 text-xs rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 border ${
                canEditAdminPortal
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span>
                  Log Masuk ({getAdminLevelLabel(currentUser.levelId, currentUser.role)}):{' '}
                  <strong>{currentUser.name}</strong> · Memaparkan program di bawah jabatan:{' '}
                  <strong>{authorizedJabatans.length > 0 ? authorizedJabatans.join(', ') : 'Tiada Jabatan Diberi Akses'}</strong>{' '}
                  ({adminProgramList.length} rekod).
                </span>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/80 border border-current shrink-0">
                {canEditAdminPortal ? 'Boleh Edit (Mengikut Jabatan)' : 'Mod Paparan Sahaja (View Only)'}
              </span>
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
                      const canEditRow =
                        isSuperAdmin || (canEditPage('ADMIN') && canEditJabatan(prog.jabatan));

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
                              {/* Edit or Pencil Button: Super Admin SAHAJA boleh edit program SELESAI */}
                              {prog.statusProgram.toUpperCase() === 'SELESAI' && !isSuperAdmin ? (
                                <span
                                  title="Program Berstatus SELESAI Dikunci - Hanya Super Admin boleh edit"
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border border-slate-200 text-slate-500 rounded text-[10px] font-bold cursor-not-allowed select-none"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>LOCKED</span>
                                </span>
                              ) : canEditRow ? (
                                <button
                                  onClick={() => handleEditProgram(prog)}
                                  title={
                                    prog.statusProgram.toUpperCase() === 'SELESAI'
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
      {/* TAB 2: PENGURUSAN DATA INDUK / MASTER DATA (SUPER ADMIN ONLY) */}
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
              onClick={() => setMasterCategory('users')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                masterCategory === 'users'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Pengurusan ID Admin ({adminUsers.length})</span>
            </button>

            <button
              onClick={() => setMasterCategory('kluster')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-1.5 ${
                masterCategory === 'kluster'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Kluster IAB</span>
            </button>

            <button
              onClick={() => setMasterCategory('pusat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'pusat'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              4. Pusat
            </button>

            <button
              onClick={() => setMasterCategory('jabatan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'jabatan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              5. Jabatan
            </button>

            <button
              onClick={() => setMasterCategory('sumber')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'sumber'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              6. Sumber Kewangan
            </button>

            <button
              onClick={() => setMasterCategory('status')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'status'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              7. Status Program
            </button>

            <button
              onClick={() => setMasterCategory('jawatan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'jawatan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              8. Jawatan
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
              <span>9. Muat Naik/Muat Turun Data</span>
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
              <span>10. Notifikasi</span>
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
              <span>11. PADAM DATA</span>
            </button>
          </div>

          <div className="p-6">
            {masterIoMsg && masterCategory !== 'muat_turun_naik' && masterCategory !== 'notifikasi' && masterCategory !== 'padam_data' && (
              <div
                className={`mb-4 p-3.5 rounded-xl text-xs font-medium flex items-center justify-between ${
                  masterIoMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {masterIoMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{masterIoMsg.text}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMasterIoMsg(null)}
                  className="font-bold hover:underline ml-3 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* SUB-CATEGORY 1: PEGAWAI (POP-UP MODAL, AUTOSORT & PAGINATION) */}
            {masterCategory === 'pegawai' && (
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        Pengurusan Profil Pegawai
                      </h4>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                        {filteredPegawaiList.length} Orang
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Daftar dan kemaskini maklumat pegawai: ID (Format IAB), Nama, Pusat, Jabatan, Jawatan, Emel, dan No. HP.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
                    {renderMasterIoButtons('pegawai')}
                    <button
                      type="button"
                      onClick={handleOpenAddPegawai}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>+ Tambah Pegawai Baru</span>
                    </button>
                  </div>
                </div>

                {/* Table Control Bar: Search & Page Limit Selection */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {/* Search Bar */}
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari nama, ID (cth: IAB001), jawatan, pusat, emel..."
                      value={pegawaiSearch}
                      onChange={(e) => {
                        setPegawaiSearch(e.target.value);
                        setPegawaiCurrentPage(1);
                      }}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                    {pegawaiSearch && (
                      <button
                        type="button"
                        onClick={() => setPegawaiSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Display Limit Dropdown: 10 (default), 15, 20, 30, 50, Semua */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 self-end sm:self-auto">
                    <span className="font-semibold text-[11px] uppercase tracking-wider text-slate-500 whitespace-nowrap">
                      Paparan:
                    </span>
                    <select
                      value={pegawaiDisplayLimit}
                      onChange={(e) => {
                        setPegawaiDisplayLimit(e.target.value);
                        setPegawaiCurrentPage(1);
                      }}
                      className="py-1 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                    >
                      <option value="10">10 orang (Lalai)</option>
                      <option value="15">15 orang</option>
                      <option value="20">20 orang</option>
                      <option value="30">30 orang</option>
                      <option value="50">50 orang</option>
                      <option value="Semua">Semua ({filteredPegawaiList.length})</option>
                    </select>
                  </div>
                </div>

                {/* Table of Pegawai with Full Autosort Headers */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 select-none">
                          <th className="py-2.5 px-3 w-12 text-center text-slate-500 font-semibold">
                            BIL
                          </th>
                          <th
                            onClick={() => handleSortPegawai('id')}
                            className="py-2.5 px-3 w-28 cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut ID Pegawai"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>ID PEGAWAI</span>
                              {pegawaiSortKey === 'id' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortPegawai('nama')}
                            className="py-2.5 px-3 min-w-[200px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut Nama Pegawai"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>NAMA PEGAWAI</span>
                              {pegawaiSortKey === 'nama' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortPegawai('jawatan')}
                            className="py-2.5 px-3 min-w-[150px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut Jawatan"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>JAWATAN</span>
                              {pegawaiSortKey === 'jawatan' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortPegawai('pusat')}
                            className="py-2.5 px-3 min-w-[180px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut Pusat"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>PUSAT</span>
                              {pegawaiSortKey === 'pusat' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortPegawai('jabatan')}
                            className="py-2.5 px-3 min-w-[180px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut Jabatan"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>JABATAN</span>
                              {pegawaiSortKey === 'jabatan' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th
                            onClick={() => handleSortPegawai('emel')}
                            className="py-2.5 px-3 min-w-[180px] cursor-pointer hover:bg-slate-200/70 transition-colors"
                            title="Klik untuk susun mengikut Maklumat Hubungi"
                          >
                            <div className="flex items-center gap-1.5">
                              <span>HUBUNGI (EMEL & HP)</span>
                              {pegawaiSortKey === 'emel' ? (
                                pegawaiSortDir === 'asc' ? (
                                  <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
                                ) : (
                                  <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                          </th>
                          <th className="py-2.5 px-3 w-32 text-center text-slate-700">
                            TINDAKAN
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedPegawaiList.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400">
                              {pegawaiSearch ? 'Tiada pegawai sepadan dengan carian.' : 'Tiada rekod pegawai didaftarkan.'}
                            </td>
                          </tr>
                        ) : (
                          paginatedPegawaiList.map((peg, index) => {
                            const bilNumber =
                              (pegawaiDisplayLimit === 'Semua' ? 0 : (safePegawaiCurrentPage - 1) * pegawaiPageSize) +
                              index +
                              1;
                            const isLinkedToAdmin = adminUsers.some(
                              (u) =>
                                u.role !== 'SUPER_ADMIN' &&
                                (u.id.toUpperCase() === peg.id.toUpperCase() ||
                                  u.name.trim().toLowerCase() === peg.nama.trim().toLowerCase())
                            );

                            return (
                              <tr key={peg.id} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                                  {bilNumber}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                                    {peg.id}
                                  </span>
                                </td>
                                <td className="py-3 px-3 font-bold text-slate-900 uppercase">
                                  <div>
                                    <span>{peg.nama}</span>
                                    {isLinkedToAdmin && (
                                      <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-semibold uppercase">
                                        <Key className="w-2.5 h-2.5" /> ID Admin Aktif
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-slate-800 font-medium">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-semibold text-[11px] inline-block">
                                    {peg.jawatan || '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-600">
                                  <span className="line-clamp-2" title={peg.pusat}>
                                    {peg.pusat || 'TIDAK BERKENAAN'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-700 font-semibold">
                                  <span className="line-clamp-2" title={peg.jabatan}>
                                    {peg.jabatan || 'TIDAK BERKENAAN'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-600">
                                  <div className="flex items-center gap-1 text-slate-700">
                                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate max-w-[160px]" title={peg.emel}>{peg.emel || '-'}</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-slate-600 mt-0.5 font-mono text-[10px]">
                                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>{peg.noHp || '-'}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleEditPegawai(peg)}
                                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const linkedAdmin = adminUsers.find(
                                          (u) =>
                                            u.role !== 'SUPER_ADMIN' &&
                                            (u.id.toUpperCase() === peg.id.toUpperCase() ||
                                              u.name.trim().toLowerCase() === peg.nama.trim().toLowerCase())
                                        );

                                        const confirmMsg = linkedAdmin
                                          ? `Adakah anda pasti ingin memadamkan profil pegawai "${peg.nama}" (${peg.id})?\n\n⚠️ PERHATIAN: Pegawai ini mempunyai akaun ID Admin "${linkedAdmin.id}". Memadamkan pegawai ini juga akan MEMADAMKAN akaun ID Admin berkaitan secara automatik!`
                                          : `Adakah anda pasti ingin memadamkan profil pegawai "${peg.nama}" (${peg.id})?`;

                                        requestDeleteConfirm(
                                          'Padam Profil Pegawai',
                                          confirmMsg,
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
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  {pegawaiDisplayLimit !== 'Semua' && totalPegawaiPages > 1 && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600">
                      <div>
                        Menunjukkan{' '}
                        <span className="font-bold text-slate-900">
                          {Math.min((safePegawaiCurrentPage - 1) * pegawaiPageSize + 1, totalPegawaiCount)}
                        </span>{' '}
                        hingga{' '}
                        <span className="font-bold text-slate-900">
                          {Math.min(safePegawaiCurrentPage * pegawaiPageSize, totalPegawaiCount)}
                        </span>{' '}
                        daripada <span className="font-bold text-slate-900">{totalPegawaiCount}</span> pegawai
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={safePegawaiCurrentPage === 1}
                          onClick={() => setPegawaiCurrentPage((p) => Math.max(1, p - 1))}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Sebelumnya</span>
                        </button>

                        <span className="px-2 text-[11px] font-bold text-slate-700">
                          Halaman {safePegawaiCurrentPage} / {totalPegawaiPages}
                        </span>

                        <button
                          type="button"
                          disabled={safePegawaiCurrentPage >= totalPegawaiPages}
                          onClick={() => setPegawaiCurrentPage((p) => Math.min(totalPegawaiPages, p + 1))}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <span>Seterusnya</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* REQUIREMENT: POP-UP BORANG TAMBAH / KEMASKINI PEGAWAI BARU */}
                {isPegawaiFormOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150 my-auto">
                      {/* Modal Header */}
                      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600/30 text-blue-300 border border-blue-400/40 flex items-center justify-center">
                            <UserPlus className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold tracking-wide">
                              {editingPegawaiId ? `Kemaskini Profil Pegawai` : 'Tambah Pegawai Baru'}
                            </h4>
                            <p className="text-[11px] text-slate-300">
                              ID Pegawai: <span className="font-mono font-bold text-amber-300">{editingPegawaiId || getNextPegawaiId(pegawaiList)}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPegawaiFormOpen(false);
                            setEditingPegawaiId(null);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Tutup Borang"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Modal Form */}
                      <form onSubmit={handleSavePegawai} className="p-6 overflow-y-auto space-y-4 text-xs">
                        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                              ID Pegawai (Auto-Generated IAB Format):
                            </span>
                            <span className="text-sm font-mono font-black text-blue-950">
                              {editingPegawaiId || getNextPegawaiId(pegawaiList)}
                            </span>
                          </div>
                          <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-1 rounded-md border border-blue-200">
                            Format Rasmi IAB
                          </span>
                        </div>

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
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold uppercase text-slate-900"
                            />
                          </div>

                          {/* 4. JAWATAN */}
                          <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              2. Jawatan *
                            </label>
                            <select
                              required
                              value={pegawaiFormJawatan}
                              onChange={(e) => handleJawatanChangeInPegawaiForm(e.target.value)}
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900"
                            >
                              <option value="">-- Sila Pilih Jawatan --</option>
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
                              3. Pusat *
                            </label>
                            <select
                              required={!isSpecialDirector(pegawaiFormJawatan)}
                              disabled={isSpecialDirector(pegawaiFormJawatan)}
                              value={isSpecialDirector(pegawaiFormJawatan) ? 'TIDAK BERKENAAN' : pegawaiFormPusat}
                              onChange={(e) => handlePusatChangeInPegawaiForm(e.target.value)}
                              className={`w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                                isSpecialDirector(pegawaiFormJawatan)
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              {isSpecialDirector(pegawaiFormJawatan) ? (
                                <option value="TIDAK BERKENAAN">TIDAK BERKENAAN</option>
                              ) : (
                                <>
                                  <option value="">-- Sila Pilih Pusat --</option>
                                  {pusatList.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>

                          {/* 3. JABATAN */}
                          <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              4. Jabatan *
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
                              className={`w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                                isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan)
                                  ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed opacity-80'
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            >
                              {isSpecialDirector(pegawaiFormJawatan) || isKetuaPusat(pegawaiFormJawatan) ? (
                                <option value="TIDAK BERKENAAN">TIDAK BERKENAAN</option>
                              ) : (
                                <>
                                  <option value="">-- Sila Pilih Jabatan --</option>
                                  {(jabatanMap[pegawaiFormPusat] || []).map((j) => (
                                    <option key={j} value={j}>
                                      {j}
                                    </option>
                                  ))}
                                </>
                              )}
                            </select>
                          </div>

                          {isSpecialDirector(pegawaiFormJawatan) && (
                            <div className="col-span-full text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                              * Bagi jawatan <strong>{pegawaiFormJawatan}</strong>, Pusat dan Jabatan ditetapkan sebagai <strong>TIDAK BERKENAAN</strong> secara automatik.
                            </div>
                          )}

                          {isKetuaPusat(pegawaiFormJawatan) && (
                            <div className="col-span-full text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                              * Bagi jawatan <strong>KETUA PUSAT</strong>, Pusat boleh dipilih dan Jabatan ditetapkan sebagai <strong>TIDAK BERKENAAN</strong> secara automatik.
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
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium lowercase text-slate-900"
                            />
                          </div>

                          {/* 6. NO. HP: */}
                          <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              6. No. HP *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="CTH: 012-3456789"
                              value={pegawaiFormNoHp}
                              onChange={(e) => setPegawaiFormNoHp(e.target.value)}
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium text-slate-900"
                            />
                          </div>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPegawaiFormOpen(false);
                              setEditingPegawaiId(null);
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-xs cursor-pointer"
                          >
                            {editingPegawaiId ? 'Simpan Kemaskini Pegawai' : 'Daftar Pegawai Baru'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 2: PENGURUSAN ID ADMIN (DIPINDAHKAN KE DALAM DATA INDUK SELEPAS PEGAWAI) */}
            {masterCategory === 'users' && (
              <div className="space-y-6">
                {/* Header & Self Password Change */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Pengurusan ID Admin &amp; Tahap Kebenaran (Level ID 1–7)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Wujudkan akaun mengikut Level ID, tentukan akses View Only / Edit bagi setiap Jabatan dan Halaman, serta reset kata laluan (default: <strong>123</strong>).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnPassMsg(null);
                      setIsChangeOwnPassOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-700" />
                    <span>Ubah Kata Laluan Sendiri ({currentUser.id})</span>
                  </button>
                </div>

                {userActionMsg && (
                  <div
                    className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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

                <div className="space-y-5">
                  {/* Top: Daftar ID Pengguna Baharu (Collapsible, Default: Hide) */}
                  <div className="bg-slate-50/70 border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setIsRegisterAdminOpen((prev) => !prev)}
                      className="w-full px-5 py-4 flex items-center justify-between gap-3 bg-slate-100/70 hover:bg-slate-100 transition-colors cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-slate-800" />
                        <h3 className="text-sm font-bold text-slate-900">
                          Daftar ID Pengguna Baharu
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-md">
                        <span>{isRegisterAdminOpen ? 'Sembunyi' : 'Papar'}</span>
                        {isRegisterAdminOpen ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    </button>

                    {isRegisterAdminOpen && (
                      <div className="p-5 border-t border-slate-200">
                        <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
                          {/* 1. PILIH LEVEL ID PENGGUNA (1-7) */}
                          <div>
                            <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              1. Pilih Level ID Pengguna (1–7) *
                            </label>
                            <select
                              value={newAdminLevelId}
                              onChange={(e) => {
                                const nextLvl = e.target.value as AdminLevelId;
                                setNewAdminLevelId(nextLvl);
                                if (nextLvl === 'KETUA_PUSAT' && newAdminPusat && jabatanMap[newAdminPusat]) {
                                  const map: Record<string, AccessMode> = {};
                                  (jabatanMap[newAdminPusat] || []).forEach((j) => {
                                    map[j] = 'view';
                                  });
                                  setNewAdminJabatanAccess(map);
                                }
                              }}
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                            >
                              {ADMIN_LEVEL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            <p className="text-[11px] text-slate-500 mt-1">
                              {ADMIN_LEVEL_OPTIONS.find((o) => o.value === newAdminLevelId)?.desc}
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* 2. PILIH PUSAT * */}
                            <div>
                              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                2. Pilih Pusat *
                              </label>
                              <select
                                required={newAdminLevelId !== 'SUPER_ADMIN'}
                                value={newAdminPusat}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewAdminPusat(val);
                                  const jabsUnderPusat = val && jabatanMap[val] ? jabatanMap[val] : [];
                                  if (newAdminJabatan && val && !jabsUnderPusat.includes(newAdminJabatan)) {
                                    setNewAdminJabatan('');
                                  }
                                  if (selectedPegawaiIdForAdmin) {
                                    const currentPeg = pegawaiList.find((p) => p.id === selectedPegawaiIdForAdmin);
                                    const stillMatches =
                                      currentPeg &&
                                      (!val ||
                                        currentPeg.pusat === val ||
                                        (currentPeg.jabatan && jabsUnderPusat.includes(currentPeg.jabatan)));
                                    if (!stillMatches) {
                                      setSelectedPegawaiIdForAdmin('');
                                      setNewAdminName('');
                                      setNewAdminId('');
                                    }
                                  }
                                  if (newAdminLevelId === 'KETUA_PUSAT' && val && jabatanMap[val]) {
                                    const map: Record<string, AccessMode> = {};
                                    (jabatanMap[val] || []).forEach((j) => {
                                      map[j] = 'view';
                                    });
                                    setNewAdminJabatanAccess(map);
                                  }
                                }}
                                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                              >
                                <option value="">-- Pilih Pusat --</option>
                                {pusatList.map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            {/* 3. PILIH JABATAN * */}
                            <div>
                              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                3. Pilih Jabatan *
                              </label>
                              <select
                                required={newAdminLevelId !== 'SUPER_ADMIN'}
                                value={newAdminJabatan}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setNewAdminJabatan(val);
                                  if (!newAdminPusat && val) {
                                    for (const [pus, jabs] of Object.entries(jabatanMap)) {
                                      if ((jabs || []).includes(val)) {
                                        setNewAdminPusat(pus);
                                        break;
                                      }
                                    }
                                  }
                                  if (selectedPegawaiIdForAdmin) {
                                    const currentPeg = pegawaiList.find((p) => p.id === selectedPegawaiIdForAdmin);
                                    if (
                                      currentPeg &&
                                      val &&
                                      val !== 'SEMUA JABATAN' &&
                                      val !== 'TIDAK BERKENAAN' &&
                                      currentPeg.jabatan !== val
                                    ) {
                                      setSelectedPegawaiIdForAdmin('');
                                      setNewAdminName('');
                                      setNewAdminId('');
                                    }
                                  }
                                  if (
                                    val &&
                                    val !== 'SEMUA JABATAN' &&
                                    val !== 'TIDAK BERKENAAN' &&
                                    newAdminLevelId !== 'KETUA_PUSAT' &&
                                    newAdminLevelId !== 'SUPER_ADMIN'
                                  ) {
                                    setNewAdminJabatanAccess({ [val]: 'view' });
                                  }
                                }}
                                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                              >
                                <option value="">-- Pilih Jabatan --</option>
                                {jabatanOptionsForNewAdmin.map((j) => (
                                  <option key={j} value={j}>{j}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 4. PILIH NAMA PEGAWAI * */}
                          <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              4. Pilih Nama Pegawai *
                            </label>
                            <select
                              required
                              value={selectedPegawaiIdForAdmin}
                              onChange={(e) => handleSelectPegawaiForAdmin(e.target.value)}
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900"
                            >
                              <option value="">-- Pilih Pegawai daripada Data Induk --</option>
                              {pegawaiOptionsForNewAdmin.map((peg) => (
                                <option key={peg.id} value={peg.id}>
                                  {peg.nama} ({peg.jabatan || 'Tiada Jabatan'})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 5. ID PENGGUNA * & 6. KATA LALUAN (DEFAULT: 123) * */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                                  5. ID Pengguna *
                                </label>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {newAdminId.length}/20
                                </span>
                              </div>
                              <input
                                type="text"
                                required
                                maxLength={20}
                                value={newAdminId}
                                onChange={(e) => setNewAdminId(e.target.value.toUpperCase().slice(0, 20))}
                                placeholder="CTH: WAN"
                                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-mono"
                              />
                            </div>

                            <div>
                              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                6. Kata Laluan (Default: 123) *
                              </label>
                              <input
                                type="text"
                                required
                                value={newAdminPassword}
                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                placeholder="123"
                                className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                              />
                            </div>
                          </div>

                          {newAdminLevelId === 'SUPER_ADMIN' ? (
                            <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 text-xs leading-relaxed">
                              <strong>Akses Super Admin (Level 1):</strong> Akaun ini dibenarkan melihat dan menyunting semua halaman (7 &amp; 8), semua jabatan, menukar kata laluan sendiri, serta menetapkan semula kata laluan pengguna lain.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
                              {/* 7. JABATAN DIBERI AKSES (View Only / Edit) * */}
                              <div>
                                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                    7. JABATAN DIBERI AKSES (View Only / Edit) *
                                  </label>
                                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    {newAdminSelectedJabatans.length} Dipilih
                                  </span>
                                </div>

                                <div className="bg-white border border-slate-300 rounded-lg p-3 space-y-2.5 max-h-64 overflow-y-auto">
                                  {(() => {
                                    const allJabs = Object.values(jabatanMap).flat();
                                    const isAllSelected =
                                      allJabs.length > 0 &&
                                      allJabs.every((j) => Boolean(newAdminJabatanAccess[j]));

                                    return (
                                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-200">
                                        <label className="flex items-center gap-2 font-bold text-xs text-slate-900 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isAllSelected}
                                            onChange={() => {
                                              if (isAllSelected) {
                                                setNewAdminJabatanAccess({});
                                              } else {
                                                const map: Record<string, AccessMode> = {};
                                                allJabs.forEach((j) => {
                                                  map[j] = newAdminJabatanAccess[j] || 'view';
                                                });
                                                setNewAdminJabatanAccess(map);
                                              }
                                            }}
                                            className="w-4 h-4 rounded text-slate-900 border-slate-300"
                                          />
                                          <span>PILIH SEMUA</span>
                                        </label>
                                        {newAdminSelectedJabatans.length > 0 && (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next: Record<string, AccessMode> = {};
                                                newAdminSelectedJabatans.forEach((j) => { next[j] = 'view'; });
                                                setNewAdminJabatanAccess(next);
                                              }}
                                              className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                                            >
                                              Semua View
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const next: Record<string, AccessMode> = {};
                                                newAdminSelectedJabatans.forEach((j) => { next[j] = 'edit'; });
                                                setNewAdminJabatanAccess(next);
                                              }}
                                              className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded border border-emerald-300 cursor-pointer"
                                            >
                                              Semua Edit
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()}

                                  {pusatList.map((pusatName) => {
                                    const jList = jabatanMap[pusatName] || [];
                                    const isPusatFullySelected =
                                      jList.length > 0 && jList.every((j) => Boolean(newAdminJabatanAccess[j]));

                                    return (
                                      <div key={pusatName} className="space-y-1.5 pt-1">
                                        <label className="flex items-start gap-2 font-bold text-[11px] text-slate-800 uppercase tracking-tight cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={isPusatFullySelected}
                                            onChange={() => {
                                              setNewAdminJabatanAccess((prev) => {
                                                const next = { ...prev };
                                                if (isPusatFullySelected) {
                                                  jList.forEach((j) => delete next[j]);
                                                } else {
                                                  jList.forEach((j) => {
                                                    if (!next[j]) next[j] = 'view';
                                                  });
                                                }
                                                return next;
                                              });
                                            }}
                                            className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 mt-0.5 shrink-0"
                                          />
                                          <span className="leading-snug">{pusatName}</span>
                                        </label>

                                        <div className="ml-4 space-y-1.5 border-l-2 border-slate-200 pl-2.5">
                                          {jList.map((jName) => {
                                            const mode = newAdminJabatanAccess[jName];
                                            const isChecked = Boolean(mode);
                                            return (
                                              <div
                                                key={jName}
                                                className="flex items-center justify-between gap-2 py-0.5"
                                              >
                                                <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer min-w-0">
                                                  <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                      setNewAdminJabatanAccess((prev) => {
                                                        const next = { ...prev };
                                                        if (next[jName]) delete next[jName];
                                                        else next[jName] = 'view';
                                                        return next;
                                                      });
                                                    }}
                                                    className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 shrink-0"
                                                  />
                                                  <span className="truncate" title={jName}>{jName}</span>
                                                </label>
                                                {isChecked && (
                                                  <div className="inline-flex rounded border border-slate-300 overflow-hidden shrink-0">
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setNewAdminJabatanAccess((prev) => ({ ...prev, [jName]: 'view' }))
                                                      }
                                                      className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                        mode === 'view'
                                                          ? 'bg-slate-800 text-white'
                                                          : 'bg-white text-slate-600 hover:bg-slate-100'
                                                      }`}
                                                    >
                                                      View Only
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setNewAdminJabatanAccess((prev) => ({ ...prev, [jName]: 'edit' }))
                                                      }
                                                      className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                        mode === 'edit'
                                                          ? 'bg-emerald-600 text-white'
                                                          : 'bg-white text-slate-600 hover:bg-slate-100'
                                                      }`}
                                                    >
                                                      Edit
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 8. KEBENARAN VIEW/PAPAR PAGE (View Only / Edit) * */}
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                    8. KEBENARAN VIEW/PAPAR PAGE (View Only / Edit) *
                                  </label>
                                  <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    {newAdminAllowedPages.length} Modul
                                  </span>
                                </div>

                                <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-300 max-h-64 overflow-y-auto">
                                  {AVAILABLE_PAGES.map((pg) => {
                                    const mode = newAdminPageAccess[pg.key];
                                    const isChecked = Boolean(mode);
                                    return (
                                      <div
                                        key={pg.key}
                                        className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-slate-50 border border-transparent hover:border-slate-200"
                                      >
                                        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 cursor-pointer min-w-0">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              setNewAdminPageAccess((prev) => {
                                                const next = { ...prev };
                                                if (next[pg.key]) delete next[pg.key];
                                                else next[pg.key] = 'view';
                                                return next;
                                              });
                                            }}
                                            className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 shrink-0"
                                          />
                                          <span className="truncate">{pg.label}</span>
                                        </label>
                                        {isChecked && (
                                          <div className="inline-flex rounded border border-slate-300 overflow-hidden shrink-0">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setNewAdminPageAccess((prev) => ({ ...prev, [pg.key]: 'view' }))
                                              }
                                              className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                mode === 'view'
                                                  ? 'bg-slate-800 text-white'
                                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                                              }`}
                                            >
                                              View Only
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setNewAdminPageAccess((prev) => ({ ...prev, [pg.key]: 'edit' }))
                                              }
                                              className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                mode === 'edit'
                                                  ? 'bg-emerald-600 text-white'
                                                  : 'bg-white text-slate-600 hover:bg-slate-100'
                                              }`}
                                            >
                                              Edit
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={
                              !selectedPegawaiIdForAdmin ||
                              (newAdminLevelId !== 'SUPER_ADMIN' && newAdminSelectedJabatans.length === 0)
                            }
                            className="w-full mt-3 py-2.5 px-4 text-xs font-bold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Cipta ID Pengguna Sekarang
                          </button>
                        </form>
                      </div>
                    )}
                  </div>

                  {/* Bottom: Senarai Akaun Berdaftar Mengikut Level ID (Collapsible, Default: Open) */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <div
                      onClick={() => setIsAdminListOpen((prev) => !prev)}
                      className="px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 hover:bg-slate-50 transition-colors cursor-pointer select-none"
                    >
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Senarai Akaun Berdaftar Mengikut Level ID
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Super Admin boleh sunting tahap akses (View Only/Edit), segerakkan akaun ke Firebase Auth, atau padam akaun.
                        </p>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          disabled={isSyncingAuth}
                          onClick={async () => {
                            setIsSyncingAuth(true);
                            setUserActionMsg(null);
                            try {
                              const res = await syncAdminUsersToFirebaseAuth();
                              setUserActionMsg({
                                type: res.success ? 'success' : 'error',
                                text: res.message,
                              });
                            } finally {
                              setIsSyncingAuth(false);
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-400 rounded-md transition-colors cursor-pointer"
                          title="Segerakkan semua akaun sedia ada ke Firebase Authentication (ID Pengguna sebagai asas log masuk)"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>
                            {isSyncingAuth ? 'Menyegerakkan...' : 'Segerak Firebase Auth'}
                          </span>
                        </button>
                        <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 rounded text-slate-800">
                          {adminUsers.length} akaun
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsAdminListOpen((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 cursor-pointer"
                        >
                          <span>{isAdminListOpen ? 'Sembunyi' : 'Papar'}</span>
                          {isAdminListOpen ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {isAdminListOpen && (
                      <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                            <th className="py-2.5 px-3">ID PENGGUNA</th>
                            <th className="py-2.5 px-3">NAMA PEGAWAI</th>
                            <th className="py-2.5 px-3">LEVEL ID</th>
                            <th className="py-2.5 px-3 text-center">STATUS</th>
                            <th className="py-2.5 px-3 min-w-[180px]">JABATAN DIBERI AKSES</th>
                            <th className="py-2.5 px-3 min-w-[180px]">KEBENARAN PAGE</th>
                            <th className="py-2.5 px-3 text-center">TINDAKAN</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {adminUsers.map((user) => {
                            const isUserSuper = user.role === 'SUPER_ADMIN' || user.levelId === 'SUPER_ADMIN';
                            const isUserActive = user.isActive !== false;
                            const levelLabel = getAdminLevelLabel(user.levelId, user.role);
                            const jabEntries: Array<[string, AccessMode]> =
                              user.jabatanAccess && Object.keys(user.jabatanAccess).length > 0
                                ? Object.entries(user.jabatanAccess)
                                : (user.allowedJabatans || (user.jabatan ? [user.jabatan] : [])).map((j) => [j, 'view']);
                            const pageEntries: Array<[string, AccessMode]> =
                              user.pageAccess && Object.keys(user.pageAccess).length > 0
                                ? Object.entries(user.pageAccess)
                                : (user.allowedPages || []).map((pg) => [pg, 'view']);

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
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                      isUserSuper
                                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                    }`}
                                  >
                                    {levelLabel}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                      isUserActive
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {isUserActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-[11px] text-slate-700">
                                  {isUserSuper ? (
                                    <span className="text-slate-500 italic">Semua Jabatan (View &amp; Edit)</span>
                                  ) : jabEntries.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {jabEntries.map(([j, mode]) => (
                                        <span
                                          key={j}
                                          className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${
                                            mode === 'edit'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-blue-50 text-blue-800 border-blue-200'
                                          }`}
                                        >
                                          {j} ({mode === 'edit' ? 'Edit' : 'View'})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic">Tiada Jabatan</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-[11px]">
                                  {isUserSuper ? (
                                    <span className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-800 rounded border border-purple-200 font-bold">
                                      SEMUA MODUL (View &amp; Edit)
                                    </span>
                                  ) : pageEntries.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {pageEntries.map(([pg, mode]) => (
                                        <span
                                          key={pg}
                                          className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold uppercase ${
                                            mode === 'edit'
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-slate-100 text-slate-700 border-slate-300'
                                          }`}
                                        >
                                          {pg} ({mode === 'edit' ? 'Edit' : 'View'})
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Tiada Modul Khas</span>
                                  )}
                                </td>
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Edit */}
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditAdmin(user)}
                                      className="p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                      title={`Edit akaun ${user.id}`}
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Reset Password ke 123 */}
                                    {user.id.toUpperCase() !== currentUser.id.toUpperCase() && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestDeleteConfirm(
                                            'Reset Kata Laluan Pengguna',
                                            `Tetapkan semula kata laluan bagi "${user.id}" (${user.name}) kepada kata laluan lalai "123"?`,
                                            () => {
                                              resetUserPassword(user.id, '123').then((res) => {
                                                setUserActionMsg({
                                                  type: res.success ? 'success' : 'error',
                                                  text:
                                                    res.message ||
                                                    `Kata laluan bagi "${user.id}" berjaya ditetapkan semula kepada "123".`,
                                                });
                                              });
                                            }
                                          );
                                        }}
                                        className="p-1.5 text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded transition-colors cursor-pointer"
                                        title={`Reset kata laluan ${user.id} kepada 123`}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {/* Activate / Deactivate Account */}
                                    {user.id.toUpperCase() !== 'AMAN' && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const res = toggleAdminUserActive(user.id);
                                          if (res.success) {
                                            setUserActionMsg({
                                              type: 'success',
                                              text: `Status akaun "${user.id}" dikemaskini kepada ${
                                                user.isActive === false ? 'Active' : 'Inactive'
                                              }.`,
                                            });
                                          }
                                        }}
                                        className={`p-1.5 rounded transition-colors cursor-pointer ${
                                          user.isActive === false
                                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                            : 'text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700'
                                        }`}
                                        title={
                                          user.isActive === false
                                            ? `Aktifkan akaun ${user.id}`
                                            : `Nyahaktifkan akaun ${user.id}`
                                        }
                                      >
                                        <Power className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    {user.id.toUpperCase() === 'AMAN' ? (
                                      <span className="text-[10px] text-slate-400 italic px-1">Kekal</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          requestDeleteConfirm(
                                            'Padam Akaun Admin',
                                            `Adakah anda pasti ingin memadamkan ID "${user.id}" (${user.name}) daripada sistem? Akses pengguna ini akan dibuang serta-merta. (Nota: Akaun Auth ${user.id.toLowerCase()}@iab.internal kekal dalam Firebase Authentication; jika ID yang sama dicipta semula kemudian, masukkan kata laluan asalnya untuk pautan automatik atau padamnya di Firebase Console → Authentication → Users.)`,
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
                    )}
                  </div>
                </div>

                {/* Modal Edit Maklumat Admin */}
                {editingAdminUser && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-amber-400" />
                          <h4 className="text-sm font-bold">
                            Kemaskini ID Pengguna: {editingAdminUser.id}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingAdminUser(null)}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form onSubmit={handleSaveEditAdmin} className="p-5 space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
                        {editAdminMsg && (
                          <div className="p-2.5 rounded bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                            <span>{editAdminMsg.text}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                              Level ID *
                            </label>
                            <select
                              disabled={editingAdminUser.id.toUpperCase() === 'AMAN'}
                              value={editAdminLevelId}
                              onChange={(e) => setEditAdminLevelId(e.target.value as AdminLevelId)}
                              className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold disabled:bg-slate-100"
                            >
                              {ADMIN_LEVEL_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                              Nama Penuh *
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
                              Kata Laluan *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Masukkan kata laluan semasa / baharu"
                              value={editAdminPassword}
                              onChange={(e) => setEditAdminPassword(e.target.value)}
                              className={`w-full py-2 px-3 bg-white border rounded-md focus:outline-none focus:ring-1 font-mono ${
                                !editAdminPassword.trim()
                                  ? 'border-rose-400 focus:ring-rose-600'
                                  : 'border-slate-300 focus:ring-slate-900'
                              }`}
                            />
                            {!editAdminPassword.trim() && (
                              <p className="text-[10px] text-rose-600 font-semibold mt-1">
                                Kata Laluan tidak boleh kosong untuk menyimpan kemaskini.
                              </p>
                            )}
                          </div>
                        </div>

                        {editAdminLevelId !== 'SUPER_ADMIN' && editingAdminUser.id.toUpperCase() !== 'AMAN' && (
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
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                            </div>

                            {/* Jabatan Diberi Akses Checkboxes + View/Edit toggle */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                                  1. JABATAN DIBERI AKSES (View Only / Edit) *
                                </label>
                                <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                  {editAdminSelectedJabatans.length} Dipilih
                                </span>
                              </div>

                              <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-2.5 max-h-48 overflow-y-auto">
                                {pusatList.map((pusatName) => {
                                  const jList = jabatanMap[pusatName] || [];
                                  const isPusatFullySelected =
                                    jList.length > 0 && jList.every((j) => Boolean(editAdminJabatanAccess[j]));

                                  return (
                                    <div key={pusatName} className="space-y-1 pt-1">
                                      <label className="flex items-start gap-2 font-bold text-[11px] text-slate-800 uppercase tracking-tight cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={isPusatFullySelected}
                                          onChange={() => {
                                            setEditAdminJabatanAccess((prev) => {
                                              const next = { ...prev };
                                              if (isPusatFullySelected) {
                                                jList.forEach((j) => delete next[j]);
                                              } else {
                                                jList.forEach((j) => {
                                                  if (!next[j]) next[j] = 'view';
                                                });
                                              }
                                              return next;
                                            });
                                          }}
                                          className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 mt-0.5 shrink-0"
                                        />
                                        <span className="leading-snug">{pusatName}</span>
                                      </label>

                                      <div className="ml-4 space-y-1 border-l-2 border-slate-200 pl-2">
                                        {jList.map((jName) => {
                                          const mode = editAdminJabatanAccess[jName];
                                          const isChecked = Boolean(mode);
                                          return (
                                            <div key={jName} className="flex items-center justify-between gap-2 py-0.5">
                                              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-700 cursor-pointer min-w-0">
                                                <input
                                                  type="checkbox"
                                                  checked={isChecked}
                                                  onChange={() => {
                                                    setEditAdminJabatanAccess((prev) => {
                                                      const next = { ...prev };
                                                      if (next[jName]) delete next[jName];
                                                      else next[jName] = 'view';
                                                      return next;
                                                    });
                                                  }}
                                                  className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 shrink-0"
                                                />
                                                <span className="truncate">{jName}</span>
                                              </label>
                                              {isChecked && (
                                                <div className="inline-flex rounded border border-slate-300 overflow-hidden shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditAdminJabatanAccess((prev) => ({ ...prev, [jName]: 'view' }))
                                                    }
                                                    className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                      mode === 'view'
                                                        ? 'bg-slate-800 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                  >
                                                    View Only
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() =>
                                                      setEditAdminJabatanAccess((prev) => ({ ...prev, [jName]: 'edit' }))
                                                    }
                                                    className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                                      mode === 'edit'
                                                        ? 'bg-emerald-600 text-white'
                                                        : 'bg-white text-slate-600 hover:bg-slate-100'
                                                    }`}
                                                  >
                                                    Edit
                                                  </button>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* KEBENARAN VIEW/PAPAR PAGE + View/Edit toggle */}
                            <div className="pt-2 border-t border-slate-200">
                              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                                2. KEBENARAN VIEW/PAPAR PAGE (View Only / Edit):
                              </label>
                              <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-200 max-h-48 overflow-y-auto">
                                {AVAILABLE_PAGES.map((pg) => {
                                  const mode = editAdminPageAccess[pg.key];
                                  const isChecked = Boolean(mode);
                                  return (
                                    <div key={pg.key} className="flex items-center justify-between gap-2 p-1 rounded hover:bg-white">
                                      <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-800 cursor-pointer min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            setEditAdminPageAccess((prev) => {
                                              const next = { ...prev };
                                              if (next[pg.key]) delete next[pg.key];
                                              else next[pg.key] = 'view';
                                              return next;
                                            });
                                          }}
                                          className="w-3.5 h-3.5 rounded text-slate-900 border-slate-300 shrink-0"
                                        />
                                        <span className="truncate">{pg.label}</span>
                                      </label>
                                      {isChecked && (
                                        <div className="inline-flex rounded border border-slate-300 overflow-hidden shrink-0">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditAdminPageAccess((prev) => ({ ...prev, [pg.key]: 'view' }))
                                            }
                                            className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                              mode === 'view'
                                                ? 'bg-slate-800 text-white'
                                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                          >
                                            View Only
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setEditAdminPageAccess((prev) => ({ ...prev, [pg.key]: 'edit' }))
                                            }
                                            className={`px-1.5 py-0.5 text-[10px] font-bold cursor-pointer ${
                                              mode === 'edit'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                          >
                                            Edit
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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

            {/* SUB-CATEGORY 3: KLUSTER IAB */}
            {masterCategory === 'kluster' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pengurusan Kluster IAB</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Urus senarai Kluster IAB (cth: Kluster Khidmat Profesional, Kluster Khidmat Latihan). Klik butang tambah untuk membuka borang pop-up.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('kluster')}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingKluster(null);
                        setKlusterInput('');
                        setIsKlusterModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Kluster Baru</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4 w-14 text-center">Bil</th>
                        <th className="py-2.5 px-4">NAMA KLUSTER IAB</th>
                        <th className="py-2.5 px-4">PUSAT DI BAWAH KLUSTER</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {klusterList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400">
                            Tiada kluster didaftarkan. Klik &quot;Tambah Kluster Baru&quot;.
                          </td>
                        </tr>
                      ) : (
                        klusterList.map((klu, idx) => {
                          const pusatsUnder = klusterMap[klu] || [];
                          return (
                            <tr key={klu} className="hover:bg-slate-50">
                              <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">
                                {idx + 1}.
                              </td>
                              <td className="py-3 px-4 font-bold text-slate-900">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200">
                                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                  {klu}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {pusatsUnder.length === 0 ? (
                                  <span className="text-slate-400 italic">Belum ada pusat dipautkan</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {pusatsUnder.map((p) => (
                                      <span
                                        key={p}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700"
                                      >
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingKluster(klu);
                                      setKlusterInput(klu);
                                      setIsKlusterModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      requestDeleteConfirm(
                                        'Padam Kluster IAB',
                                        `Adakah anda pasti ingin memadamkan kluster "${klu}"?`,
                                        () => {
                                          const res = deleteKluster(klu);
                                          showNotification({
                                            type: res.success ? 'success' : 'error',
                                            title: res.success
                                              ? 'Kluster IAB Berjaya Dipadam'
                                              : 'Gagal Memadam Kluster IAB',
                                            message:
                                              res.message ||
                                              (res.success
                                                ? `Kluster IAB "${klu}" berjaya dipadam.`
                                                : 'Gagal memadam Kluster IAB.'),
                                          });
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
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Modal Pop-up Tambah / Edit Kluster */}
                {isKlusterModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingKluster ? 'Kemaskini Kluster IAB' : 'Tambah Kluster IAB Baru'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsKlusterModalOpen(false);
                            setEditingKluster(null);
                            setKlusterInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!klusterInput.trim()) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Kluster IAB',
                              message: 'Sila masukkan Nama Kluster IAB.',
                            });
                            return;
                          }
                          const res = editingKluster
                            ? updateKluster(editingKluster, klusterInput.trim())
                            : addKluster(klusterInput.trim());
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingKluster
                                ? 'Gagal Mengemaskini Kluster IAB'
                                : 'Gagal Mendaftar Kluster IAB',
                              message: res.message || 'Gagal menyimpan rekod Kluster IAB.',
                            });
                            return;
                          }
                          setIsKlusterModalOpen(false);
                          setEditingKluster(null);
                          setKlusterInput('');
                          showNotification({
                            type: 'success',
                            title: editingKluster
                              ? 'Kluster IAB Berjaya Dikemaskini'
                              : 'Kluster IAB Berjaya Didaftarkan',
                            message: res.message || 'Rekod Kluster IAB berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            Nama Kluster (HURUF BESAR) *
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="CTH: KLUSTER KHIDMAT PROFESIONAL"
                            value={klusterInput}
                            onChange={(e) => setKlusterInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsKlusterModalOpen(false);
                              setEditingKluster(null);
                              setKlusterInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingKluster ? 'Simpan Kluster' : 'Daftar Kluster Baru'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 4: PUSAT */}
            {masterCategory === 'pusat' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pengurusan Senarai Pusat</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pilih Kluster IAB dan tambah/kemaskini nama Pusat melalui borang pop-up.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('pusat')}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPusat(null);
                        setPusatKlusterInput(klusterList[0] || '');
                        setPusatInput('');
                        setIsPusatModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Pusat Baru</span>
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">KLUSTER IAB</th>
                        <th className="py-2.5 px-4">NAMA PUSAT</th>
                        <th className="py-2.5 px-4 w-36">BIL. JABATAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pusatList.map((p) => {
                        const klusterName = getKlusterForPusat(p);
                        return (
                          <tr key={p} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              {klusterName ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 uppercase">
                                  {klusterName}
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">Belum ditetapkan</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">{p}</td>
                            <td className="py-3 px-4 text-slate-600 tabular-nums">
                              {(jabatanMap[p] || []).length} jabatan
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPusat(p);
                                    setPusatKlusterInput(klusterName || klusterList[0] || '');
                                    setPusatInput(p);
                                    setIsPusatModalOpen(true);
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    requestDeleteConfirm(
                                      'Padam Pusat',
                                      `Adakah anda pasti ingin memadamkan pusat "${p}" dan semua jabatannya?`,
                                      () => {
                                        const res = deletePusat(p);
                                        showNotification({
                                          type: res.success ? 'success' : 'error',
                                          title: res.success ? 'Pusat Berjaya Dipadam' : 'Gagal Memadam Pusat',
                                          message:
                                            res.message ||
                                            (res.success
                                              ? `Pusat "${p}" berjaya dipadam.`
                                              : 'Gagal memadam Pusat.'),
                                        });
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Modal Pop-up Tambah / Edit Pusat (Select Kluster dulu, then Nama Pusat) */}
                {isPusatModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingPusat ? 'Kemaskini Maklumat Pusat' : 'Tambah Pusat Baru'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPusatModalOpen(false);
                            setEditingPusat(null);
                            setPusatInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!pusatInput.trim()) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Pusat',
                              message: 'Sila masukkan Nama Pusat.',
                            });
                            return;
                          }
                          const res = editingPusat
                            ? updatePusat(editingPusat, pusatInput.trim(), pusatKlusterInput)
                            : addPusat(pusatInput.trim(), pusatKlusterInput);
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingPusat ? 'Gagal Mengemaskini Pusat' : 'Gagal Mendaftar Pusat',
                              message: res.message || 'Gagal menyimpan rekod Pusat.',
                            });
                            return;
                          }
                          setIsPusatModalOpen(false);
                          setEditingPusat(null);
                          setPusatInput('');
                          showNotification({
                            type: 'success',
                            title: editingPusat ? 'Pusat Berjaya Dikemaskini' : 'Pusat Berjaya Didaftarkan',
                            message: res.message || 'Rekod Pusat berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            1. Pilih Kluster IAB *
                          </label>
                          <select
                            required
                            value={pusatKlusterInput}
                            onChange={(e) => setPusatKlusterInput(e.target.value)}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                          >
                            <option value="">-- Pilih Kluster IAB --</option>
                            {klusterList.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            2. Nama Pusat (HURUF BESAR) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="CTH: PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI"
                            value={pusatInput}
                            onChange={(e) => setPusatInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPusatModalOpen(false);
                              setEditingPusat(null);
                              setPusatInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingPusat ? 'Simpan Pusat' : 'Daftar Pusat Baru'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 5: JABATAN */}
            {masterCategory === 'jabatan' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Pengurusan Jabatan (Mengikut Kluster &amp; Pusat)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tapis paparan atau klik &quot;Tambah Jabatan Baru&quot; (pilih Kluster IAB dahulu, kemudian Pusat Induk).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('jabatan')}
                    <button
                      type="button"
                      onClick={() => {
                        const defaultKluster =
                          selectedKlusterForJabatan !== 'SEMUA'
                            ? selectedKlusterForJabatan
                            : getKlusterForPusat(selectedPusatForJabatan) || klusterList[0] || '';
                        const pusatsForKluster = defaultKluster
                          ? (klusterMap[defaultKluster] || []).filter((p) => pusatList.includes(p))
                          : pusatList;
                        const defaultPusat = pusatsForKluster.includes(selectedPusatForJabatan)
                          ? selectedPusatForJabatan
                          : pusatsForKluster[0] || pusatList[0] || '';
                        setEditingJabatan(null);
                        setModalKlusterForJabatan(defaultKluster);
                        setModalPusatForJabatan(defaultPusat);
                        setJabatanInput('');
                        setIsJabatanModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Jabatan Baru</span>
                    </button>
                  </div>
                </div>

                {/* Penapis Kluster & Pusat Induk */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Tapis Kluster IAB
                    </label>
                    <select
                      value={selectedKlusterForJabatan}
                      onChange={(e) => {
                        const nextK = e.target.value;
                        setSelectedKlusterForJabatan(nextK);
                        if (nextK !== 'SEMUA') {
                          const pusatsInK = (klusterMap[nextK] || []).filter((p) =>
                            pusatList.includes(p)
                          );
                          if (pusatsInK.length > 0 && !pusatsInK.includes(selectedPusatForJabatan)) {
                            setSelectedPusatForJabatan(pusatsInK[0]);
                          }
                        }
                      }}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                    >
                      <option value="SEMUA">SEMUA KLUSTER</option>
                      {klusterList.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Pusat Induk
                    </label>
                    <select
                      value={selectedPusatForJabatan}
                      onChange={(e) => setSelectedPusatForJabatan(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                    >
                      {(selectedKlusterForJabatan === 'SEMUA'
                        ? pusatList
                        : (klusterMap[selectedKlusterForJabatan] || []).filter((p) =>
                            pusatList.includes(p)
                          )
                      ).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      Senarai Jabatan di bawah:{' '}
                      <span className="text-slate-950 font-extrabold">{selectedPusatForJabatan}</span>
                    </div>
                    {getKlusterForPusat(selectedPusatForJabatan) && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                        {getKlusterForPusat(selectedPusatForJabatan)}
                      </span>
                    )}
                  </div>
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {(jabatanMap[selectedPusatForJabatan] || []).length === 0 ? (
                        <tr>
                          <td className="py-6 text-center text-slate-400">
                            Tiada jabatan di bawah pusat ini lagi. Klik &quot;Tambah Jabatan Baru&quot;.
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
                                  type="button"
                                  onClick={() => {
                                    setEditingJabatan(jab);
                                    setModalKlusterForJabatan(
                                      getKlusterForPusat(selectedPusatForJabatan) || klusterList[0] || ''
                                    );
                                    setModalPusatForJabatan(selectedPusatForJabatan);
                                    setJabatanInput(jab);
                                    setIsJabatanModalOpen(true);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    requestDeleteConfirm(
                                      'Padam Jabatan',
                                      `Adakah anda pasti ingin memadamkan jabatan "${jab}"?`,
                                      () => {
                                        const res = deleteJabatan(selectedPusatForJabatan, jab);
                                        showNotification({
                                          type: res.success ? 'success' : 'error',
                                          title: res.success
                                            ? 'Jabatan Berjaya Dipadam'
                                            : 'Gagal Memadam Jabatan',
                                          message:
                                            res.message ||
                                            (res.success
                                              ? `Jabatan "${jab}" berjaya dipadam.`
                                              : 'Gagal memadam Jabatan.'),
                                        });
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

                {/* Modal Pop-up Tambah / Edit Jabatan (Select Kluster dulu -> Nama Pusat -> Nama Jabatan) */}
                {isJabatanModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingJabatan ? 'Kemaskini Maklumat Jabatan' : 'Tambah Jabatan Baru'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsJabatanModalOpen(false);
                            setEditingJabatan(null);
                            setJabatanInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!jabatanInput.trim() || !modalPusatForJabatan) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Jabatan',
                              message: !modalPusatForJabatan
                                ? 'Sila pilih Nama Pusat terlebih dahulu.'
                                : 'Sila masukkan Nama Jabatan.',
                            });
                            return;
                          }
                          const res = editingJabatan
                            ? updateJabatan(modalPusatForJabatan, editingJabatan, jabatanInput.trim())
                            : addJabatan(modalPusatForJabatan, jabatanInput.trim());
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingJabatan
                                ? 'Gagal Mengemaskini Jabatan'
                                : 'Gagal Mendaftar Jabatan',
                              message: res.message || 'Gagal menyimpan rekod Jabatan.',
                            });
                            return;
                          }
                          setSelectedPusatForJabatan(modalPusatForJabatan);
                          setIsJabatanModalOpen(false);
                          setEditingJabatan(null);
                          setJabatanInput('');
                          showNotification({
                            type: 'success',
                            title: editingJabatan
                              ? 'Jabatan Berjaya Dikemaskini'
                              : 'Jabatan Berjaya Didaftarkan',
                            message: res.message || 'Rekod Jabatan berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            1. Pilih Kluster IAB *
                          </label>
                          <select
                            required
                            disabled={Boolean(editingJabatan)}
                            value={modalKlusterForJabatan}
                            onChange={(e) => {
                              const nextK = e.target.value;
                              setModalKlusterForJabatan(nextK);
                              const pusatsInK = (klusterMap[nextK] || []).filter((p) =>
                                pusatList.includes(p)
                              );
                              setModalPusatForJabatan(pusatsInK[0] || '');
                            }}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900 disabled:bg-slate-100"
                          >
                            <option value="">-- Pilih Kluster IAB --</option>
                            {klusterList.map((k) => (
                              <option key={k} value={k}>
                                {k}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            2. Pilih Nama Pusat *
                          </label>
                          <select
                            required
                            disabled={Boolean(editingJabatan)}
                            value={modalPusatForJabatan}
                            onChange={(e) => setModalPusatForJabatan(e.target.value)}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900 disabled:bg-slate-100"
                          >
                            <option value="">-- Pilih Nama Pusat --</option>
                            {(modalKlusterForJabatan
                              ? (klusterMap[modalKlusterForJabatan] || []).filter((p) =>
                                  pusatList.includes(p)
                                )
                              : pusatList
                            ).map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            3. Nama Jabatan (HURUF BESAR) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="CTH: JABATAN KECERDASAN BUATAN DAN INOVASI DIGITAL"
                            value={jabatanInput}
                            onChange={(e) => setJabatanInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsJabatanModalOpen(false);
                              setEditingJabatan(null);
                              setJabatanInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            disabled={!modalPusatForJabatan}
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingJabatan ? 'Simpan Jabatan' : 'Daftar Jabatan Baru'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 6: SUMBER KEWANGAN */}
            {masterCategory === 'sumber' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pengurusan Sumber Kewangan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tambah atau edit nama Sumber Kewangan (cth: IAB – LATIHAN, BSTP, BPG, BPK) melalui borang pop-up.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('sumber')}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSumber(null);
                        setSumberInput('');
                        setIsSumberModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Sumber Baru</span>
                    </button>
                  </div>
                </div>

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
                                type="button"
                                onClick={() => {
                                  setEditingSumber(sk);
                                  setSumberInput(sk);
                                  setIsSumberModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Sumber Kewangan',
                                    `Adakah anda pasti ingin memadamkan sumber "${sk}"?`,
                                    () => {
                                      const res = deleteSumberKewangan(sk);
                                      showNotification({
                                        type: res.success ? 'success' : 'error',
                                        title: res.success
                                          ? 'Sumber Kewangan Berjaya Dipadam'
                                          : 'Gagal Memadam Sumber Kewangan',
                                        message:
                                          res.message ||
                                          (res.success
                                            ? `Sumber Kewangan "${sk}" berjaya dipadam.`
                                            : 'Gagal memadam Sumber Kewangan.'),
                                      });
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

                {/* Modal Pop-up Sumber Kewangan */}
                {isSumberModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingSumber ? 'Kemaskini Sumber Kewangan' : 'Tambah Sumber Kewangan'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSumberModalOpen(false);
                            setEditingSumber(null);
                            setSumberInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!sumberInput.trim()) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Sumber Kewangan',
                              message: 'Sila masukkan Nama Sumber Kewangan.',
                            });
                            return;
                          }
                          const res = editingSumber
                            ? updateSumberKewangan(editingSumber, sumberInput.trim())
                            : addSumberKewangan(sumberInput.trim());
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingSumber
                                ? 'Gagal Mengemaskini Sumber Kewangan'
                                : 'Gagal Mendaftar Sumber Kewangan',
                              message: res.message || 'Gagal menyimpan rekod Sumber Kewangan.',
                            });
                            return;
                          }
                          setIsSumberModalOpen(false);
                          setEditingSumber(null);
                          setSumberInput('');
                          showNotification({
                            type: 'success',
                            title: editingSumber
                              ? 'Sumber Kewangan Berjaya Dikemaskini'
                              : 'Sumber Kewangan Berjaya Didaftarkan',
                            message: res.message || 'Rekod Sumber Kewangan berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            Nama Sumber Kewangan *
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="CTH: IAB - PENYELIDIKAN"
                            value={sumberInput}
                            onChange={(e) => setSumberInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSumberModalOpen(false);
                              setEditingSumber(null);
                              setSumberInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingSumber ? 'Simpan Sumber' : 'Tambah Sumber'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 7: STATUS PROGRAM */}
            {masterCategory === 'status' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pengurusan Status Program</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Urus status rasmi pelaksanaan program (cth: SELESAI, DALAM TINDAKAN, TANGGUNG, BELUM AMBIL TINDAKAN, BATAL).
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('status')}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingStatus(null);
                        setStatusInput('');
                        setIsStatusModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Status Baru</span>
                    </button>
                  </div>
                </div>

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
                                type="button"
                                onClick={() => {
                                  setEditingStatus(st);
                                  setStatusInput(st);
                                  setIsStatusModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Status Program',
                                    `Adakah anda pasti ingin memadamkan status "${st}"?`,
                                    () => {
                                      const res = deleteStatusProgram(st);
                                      showNotification({
                                        type: res.success ? 'success' : 'error',
                                        title: res.success
                                          ? 'Status Program Berjaya Dipadam'
                                          : 'Gagal Memadam Status Program',
                                        message:
                                          res.message ||
                                          (res.success
                                            ? `Status Program "${st}" berjaya dipadam.`
                                            : 'Gagal memadam Status Program.'),
                                      });
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

                {/* Modal Pop-up Status Program */}
                {isStatusModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingStatus ? 'Kemaskini Status Program' : 'Tambah Status Program'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsStatusModalOpen(false);
                            setEditingStatus(null);
                            setStatusInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!statusInput.trim()) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Status Program',
                              message: 'Sila masukkan Nama Status Program.',
                            });
                            return;
                          }
                          const res = editingStatus
                            ? updateStatusProgram(editingStatus, statusInput.trim())
                            : addStatusProgram(statusInput.trim());
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingStatus
                                ? 'Gagal Mengemaskini Status Program'
                                : 'Gagal Mendaftar Status Program',
                              message: res.message || 'Gagal menyimpan rekod Status Program.',
                            });
                            return;
                          }
                          setIsStatusModalOpen(false);
                          setEditingStatus(null);
                          setStatusInput('');
                          showNotification({
                            type: 'success',
                            title: editingStatus
                              ? 'Status Program Berjaya Dikemaskini'
                              : 'Status Program Berjaya Didaftarkan',
                            message: res.message || 'Rekod Status Program berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            Nama Status Program *
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="CTH: DALAM PERANCANGAN"
                            value={statusInput}
                            onChange={(e) => setStatusInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsStatusModalOpen(false);
                              setEditingStatus(null);
                              setStatusInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingStatus ? 'Simpan Status' : 'Tambah Status'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 8: JAWATAN */}
            {masterCategory === 'jawatan' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Pengurusan Senarai Jawatan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tambah, edit, atau padam senarai Jawatan rasmi melalui borang pop-up untuk kegunaan profil pegawai.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {renderMasterIoButtons('jawatan')}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingJawatan(null);
                        setJawatanInput('');
                        setIsJawatanModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Jawatan Baru</span>
                    </button>
                  </div>
                </div>

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
                                type="button"
                                onClick={() => {
                                  setEditingJawatan(jwt);
                                  setJawatanInput(jwt);
                                  setIsJawatanModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  requestDeleteConfirm(
                                    'Padam Jawatan',
                                    `Adakah anda pasti ingin memadamkan jawatan "${jwt}"?`,
                                    () => {
                                      const res = deleteJawatan(jwt);
                                      showNotification({
                                        type: res.success ? 'success' : 'error',
                                        title: res.success
                                          ? 'Jawatan Berjaya Dipadam'
                                          : 'Gagal Memadam Jawatan',
                                        message:
                                          res.message ||
                                          (res.success
                                            ? `Jawatan "${jwt}" berjaya dipadam.`
                                            : 'Gagal memadam Jawatan.'),
                                      });
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

                {/* Modal Pop-up Jawatan */}
                {isJawatanModalOpen && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-blue-400" />
                          <h4 className="text-sm font-bold">
                            {editingJawatan ? 'Kemaskini Jawatan' : 'Tambah Jawatan Baru'}
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsJawatanModalOpen(false);
                            setEditingJawatan(null);
                            setJawatanInput('');
                          }}
                          className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!jawatanInput.trim()) {
                            showNotification({
                              type: 'error',
                              title: 'Gagal Mendaftar Jawatan',
                              message: 'Sila masukkan Nama Jawatan.',
                            });
                            return;
                          }
                          const res = editingJawatan
                            ? updateJawatan(editingJawatan, jawatanInput.trim())
                            : addJawatan(jawatanInput.trim());
                          if (!res.success) {
                            showNotification({
                              type: 'error',
                              title: editingJawatan
                                ? 'Gagal Mengemaskini Jawatan'
                                : 'Gagal Mendaftar Jawatan',
                              message: res.message || 'Gagal menyimpan rekod Jawatan.',
                            });
                            return;
                          }
                          setIsJawatanModalOpen(false);
                          setEditingJawatan(null);
                          setJawatanInput('');
                          showNotification({
                            type: 'success',
                            title: editingJawatan
                              ? 'Jawatan Berjaya Dikemaskini'
                              : 'Jawatan Berjaya Didaftarkan',
                            message: res.message || 'Rekod Jawatan berjaya disimpan.',
                          });
                        }}
                        className="p-5 space-y-4 text-xs"
                      >
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            Nama Jawatan *
                          </label>
                          <input
                            type="text"
                            required
                            autoFocus
                            placeholder="CTH: PENGARAH / PENSYARAH CEMERLANG"
                            value={jawatanInput}
                            onChange={(e) => setJawatanInput(e.target.value.toUpperCase())}
                            className="w-full py-2.5 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-semibold text-slate-900"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsJawatanModalOpen(false);
                              setEditingJawatan(null);
                              setJawatanInput('');
                            }}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer shadow-xs"
                          >
                            {editingJawatan ? 'Simpan Jawatan' : 'Tambah Jawatan'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUB-CATEGORY 9: MUAT NAIK / MUAT TURUN DATA (SUPER ADMIN ONLY) */}
            {masterCategory === 'muat_turun_naik' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-blue-600" />
                    <span>9. Pengurusan Muat Naik / Muat Turun Data Program</span>
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

            {/* SUB-CATEGORY 10: NOTIFIKASI (SUPER ADMIN ONLY - CLEAN PLACEHOLDER) */}
            {masterCategory === 'notifikasi' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-slate-700" />
                    <span>10. Pengurusan Notifikasi Sistem</span>
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

            {/* SUB-CATEGORY 11: PADAM DATA (SUPER ADMIN ONLY - WITH STRICT BACKUP & SECURE RE-AUTH) */}
            {masterCategory === 'padam_data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-bold text-rose-700 flex items-center gap-2">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <span>11. PADAM DATA PROGRAM</span>
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

      {/* MODAL UBAH KATA LALUAN SENDIRI (SUPER ADMIN) */}
      {isChangeOwnPassOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold">Ubah Kata Laluan Sendiri ({currentUser.id})</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeOwnPassOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleChangeOwnPasswordSubmit} className="p-5 space-y-3.5 text-xs">
              {ownPassMsg && (
                <div
                  className={`p-2.5 rounded border flex items-center gap-2 ${
                    ownPassMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span>{ownPassMsg.text}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Kata Laluan Semasa *
                </label>
                <input
                  type="password"
                  required
                  value={ownCurrentPass}
                  onChange={(e) => setOwnCurrentPass(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Kata Laluan Baharu *
                </label>
                <input
                  type="password"
                  required
                  value={ownNewPass}
                  onChange={(e) => setOwnNewPass(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Sahkan Kata Laluan Baharu *
                </label>
                <input
                  type="password"
                  required
                  value={ownConfirmPass}
                  onChange={(e) => setOwnConfirmPass(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsChangeOwnPassOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 rounded-md hover:bg-slate-800 cursor-pointer"
                >
                  Simpan Kata Laluan
                </button>
              </div>
            </form>
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
                <span>Ya, Sahkan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
