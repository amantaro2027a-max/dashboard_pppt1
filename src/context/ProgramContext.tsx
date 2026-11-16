import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import {
  AdminUser,
  FinancialSectionStats,
  Pegawai,
  ProgramFilterState,
  ProgramItem,
  FasaPeruntukanRecord,
  OsAllocation,
  SubwaranRecord,
  RekodPindaanBK04,
  ItemPerubahanBK04,
  BudgetRatesConfig,
  AdminLevelId,
  AccessMode,
  AdminRole,
  UserActivityLog,
  SecurityAlert,
  ActivityActionType,
  ActivityLogStatus,
  AlertStatus,
  MonitoringSettings,
  getAdminLevelLabel,
} from '../types/program';
import {
  getMalaysiaTimestampParts,
  getDeviceInfo,
  generateSessionId,
  generateLogId,
  resolveModuleLabel,
  evaluateSecurityAlertRules,
} from '../utils/activityLogger';
import { formatRM } from '../utils/formatters';
import {
  getCurrentFinanceYear,
  getFasaYear,
  getProgramYear,
  getSubwaranYear,
  computeAvailableFinanceYears,
} from '../utils/financeYear';
import { deduplicateProgramsByCode } from '../utils/programDedupe';
import { INITIAL_PROGRAMS } from '../data/samplePrograms';
import {
  KLUSTER_LIST,
  KLUSTER_MAP,
  PUSAT_LIST,
  JABATAN_MAP,
  PEGAWAI_LIST,
  SUMBER_KEWANGAN_LIST,
  STATUS_PROGRAM_LIST,
  DEFAULT_JAWATAN_LIST,
} from '../data/constants';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  deleteField,
} from 'firebase/firestore';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth';
import {
  auth,
  secondaryAuth,
  db,
  idToAuthEmail,
  authEmailToId,
  toFirebaseAuthPassword,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../firebase';

interface FlashCardGroup1Stats {
  bilanganProgram: number;
  bilanganJenisProgram: number;
  jumlahPeserta: number;
  bilanganSumberKewangan: number;
  jumlahHariProgram: number;
  purataPeserta: number;
}

interface FlashCardGroup2Stats {
  bilanganSelesai: number;
  bilanganDalamTindakan: number;
  bilanganTanggung: number;
  bilanganBelumAmbilTindakan: number;
  bilanganBatal: number;
}

export interface FilterScope {
  levelId?: AdminLevelId;
  isPusatRestricted: boolean;
  isJabatanRestricted: boolean;
  allowedPusats: string[];
  allowedJabatans: string[];
  lockedPusat: string | null;
  lockedJabatan: string | null;
}

interface ProgramContextType {
  // Programs & Filtering
  programs: ProgramItem[];
  filters: ProgramFilterState;
  setFilter: (key: keyof ProgramFilterState, value: string) => void;
  resetFilters: () => void;
  filteredPrograms: ProgramItem[];
  selectedProgram: ProgramItem | null;
  setSelectedProgram: (prog: ProgramItem | null) => void;
  isDetailOpen: boolean;
  setIsDetailOpen: (open: boolean) => void;
  isFormOpen: boolean;
  setIsFormOpen: (open: boolean) => void;
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
  programToEdit: ProgramItem | null;
  setProgramToEdit: (prog: ProgramItem | null) => void;
  activeTab: 'welcome' | 'selamatDatang' | 'dashboard' | 'bersepadu' | 'perincian' | 'analisisPegawai' | 'pengiraan' | 'pusat' | 'jabatan' | 'iabAll' | 'klusterProfesional' | 'klusterLatihan' | 'admin' | 'monitoring' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki';
  setActiveTab: (tab: 'welcome' | 'selamatDatang' | 'dashboard' | 'bersepadu' | 'perincian' | 'analisisPegawai' | 'pengiraan' | 'pusat' | 'jabatan' | 'iabAll' | 'klusterProfesional' | 'klusterLatihan' | 'admin' | 'monitoring' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki') => void;

  // Program CRUD
  addProgram: (data: Omit<ProgramItem, 'id'>) => { success: boolean; message?: string };
  updateProgram: (id: string, data: Partial<ProgramItem>) => { success: boolean; message?: string };
  deleteProgram: (id: string) => { success: boolean; message?: string };
  deleteMultiplePrograms: (ids: string[]) => { success: boolean; message?: string; count?: number };
  importPrograms: (newPrograms: ProgramItem[], mode: 'replace' | 'merge') => { success: boolean; message?: string; count?: number };
  resetToDefaultData: () => void;

  // Stats
  group1Stats: FlashCardGroup1Stats;
  group2Stats: FlashCardGroup2Stats;
  financialStats: FinancialSectionStats;
  viewProgramDetail: (prog: ProgramItem) => void;

  // Auth, RBAC & Admin Management
  currentUser: AdminUser | null;
  firebaseUser: FirebaseUser | null;
  authReady: boolean;
  isSuperAdmin: boolean;
  adminUsers: AdminUser[];
  login: (id: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  createAdminUser: (user: Omit<AdminUser, 'createdAt'>) => Promise<{ success: boolean; message?: string }>;
  updateAdminUser: (id: string, updated: Partial<AdminUser>) => { success: boolean; message?: string };
  toggleAdminUserActive: (userId: string) => { success: boolean; message?: string };
  deleteAdminUser: (id: string) => { success: boolean; message?: string };
  changeOwnPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message?: string }>;
  updateOwnPhoto: (photoUrl: string) => { success: boolean; message?: string };
  updateOwnContactInfo: (noHp: string, emel: string) => { success: boolean; message?: string };
  resetUserPassword: (targetUserId: string, newPassword?: string) => Promise<{ success: boolean; message?: string }>;
  syncAdminUsersToFirebaseAuth: () => Promise<{ success: boolean; syncedCount: number; skippedCount: number; message: string }>;
  getPageAccessMode: (pageKey: string) => 'none' | AccessMode;
  getJabatanAccessMode: (jabatanName?: string) => 'none' | AccessMode;
  canEditPage: (pageKey: string) => boolean;
  canEditJabatan: (jabatanName?: string) => boolean;
  getEditableJabatans: () => string[];
  getAuthorizedPusatList: () => string[];
  getAuthorizedJabatanList: () => string[];
  filterScope: FilterScope;

  // Master Data
  klusterList: string[];
  klusterMap: Record<string, string[]>;
  getKlusterForPusat: (pusatName: string) => string;
  pusatList: string[];
  jabatanMap: Record<string, string[]>;
  pegawaiList: Pegawai[];
  sumberKewanganList: string[];
  statusProgramList: string[];
  jawatanList: string[];

  // Master Data Mutations
  addKluster: (namaKluster: string) => void;
  updateKluster: (oldKluster: string, newKluster: string) => void;
  deleteKluster: (namaKluster: string) => void;

  addPegawai: (pegawai: Pegawai) => void;
  updatePegawai: (id: string, updated: Partial<Pegawai>) => void;
  deletePegawai: (id: string) => void;

  addPusat: (namaPusat: string, kluster?: string) => void;
  updatePusat: (oldPusat: string, newPusat: string, newKluster?: string) => void;
  deletePusat: (pusat: string) => void;

  addJabatan: (pusat: string, namaJabatan: string) => void;
  updateJabatan: (pusat: string, oldJabatan: string, newJabatan: string) => void;
  deleteJabatan: (pusat: string, namaJabatan: string) => void;

  addSumberKewangan: (nama: string) => void;
  updateSumberKewangan: (oldNama: string, newNama: string) => void;
  deleteSumberKewangan: (nama: string) => void;

  addStatusProgram: (nama: string) => void;
  updateStatusProgram: (oldNama: string, newNama: string) => void;
  deleteStatusProgram: (nama: string) => void;

  addJawatan: (nama: string) => void;
  updateJawatan: (oldNama: string, newNama: string) => void;
  deleteJawatan: (nama: string) => void;

  // Bulk Import Master Data (Super Admin)
  importKlusterBulk: (items: string[]) => { success: boolean; added: number; message?: string };
  importPegawaiBulk: (items: Partial<Pegawai>[]) => { success: boolean; added: number; updated: number; message?: string };
  importPusatBulk: (items: Array<string | { pusat: string; kluster?: string }>) => { success: boolean; added: number; message?: string };
  importJabatanBulk: (entries: Array<{ pusat?: string; jabatan: string; kluster?: string }>, defaultPusat?: string) => { success: boolean; added: number; message?: string };
  importSumberKewanganBulk: (items: string[]) => { success: boolean; added: number; message?: string };
  importStatusProgramBulk: (items: string[]) => { success: boolean; added: number; message?: string };
  importJawatanBulk: (items: string[]) => { success: boolean; added: number; message?: string };

  // Synchronized Finance Year (Default: current year)
  selectedFinanceYear: number;
  setSelectedFinanceYear: (year: number) => void;
  availableFinanceYears: number[];

  // Page Peruntukan (Super Admin)
  fasaPeruntukanList: FasaPeruntukanRecord[];
  updateFasaPeruntukan: (fasaId: string, allocations: Record<string, OsAllocation>) => { success: boolean; message?: string };
  addFasaPeruntukan: (namaFasa?: string, tahun?: number) => { success: boolean; message?: string };
  deleteFasaPeruntukan: (fasaId: string) => { success: boolean; message?: string };

  // Page Subwaran (Super Admin)
  subwaranList: SubwaranRecord[];
  addSubwaran: (record: Omit<SubwaranRecord, 'id'>) => { success: boolean; message?: string };
  updateSubwaran: (id: string, record: Partial<SubwaranRecord>) => { success: boolean; message?: string };
  deleteSubwaran: (id: string) => { success: boolean; message?: string };

  // Pengiraan Bajet Unit Rates (Super Admin editable, persisted in Firestore)
  budgetRates: BudgetRatesConfig;
  updateBudgetRates: (rates: BudgetRatesConfig) => { success: boolean; message?: string };

  // User Activity Logs, Security Alerts & Cost Control Settings (Admin Monitoring Dashboard)
  activityLogs: UserActivityLog[];
  securityAlerts: SecurityAlert[];
  sessionId: string;
  monitoringSettings: MonitoringSettings;
  isRefreshingMonitoring: boolean;
  updateMonitoringSettings: (updates: Partial<MonitoringSettings>) => { success: boolean; message?: string };
  refreshMonitoringLogs: () => Promise<void>;
  logActivity: (params: {
    action_type: ActivityActionType | string;
    module_name: string;
    activity_description: string;
    record_id?: string;
    status?: ActivityLogStatus;
    duration_seconds?: number;
    userOverride?: {
      user_id?: string;
      user_name?: string;
      user_email?: string;
      user_role?: string;
    };
  }) => void;
  updateAlertStatus: (alertId: string, newStatus: AlertStatus) => { success: boolean; message?: string };

  // Firebase Live Status
  firebaseStatus: 'connecting' | 'connected' | 'offline';
}

const defaultFilters: ProgramFilterState = {
  pusat: '',
  jabatan: '',
  jenisProgram: '',
  pengurus: '',
  pengurusBersama: '',
  negeri: '',
  tahun: String(getCurrentFinanceYear()),
  bulan: '',
  status: '',
  sumberKewangan: '',
  searchQuery: '',
};

const STORAGE_PROGRAMS = 'pppt_dashboard_programs_v2';
const STORAGE_ADMINS = 'pppt_dashboard_admins_v2';
const STORAGE_SESSION = 'pppt_dashboard_session_v2';
const STORAGE_MASTER = 'pppt_dashboard_master_v2';
const STORAGE_PERUNTUKAN_FASA = 'pppt_dashboard_peruntukan_fasa_v2';
const STORAGE_BUDGET_RATES = 'pppt_dashboard_budget_rates_v2';
const STORAGE_ACTIVITY_LOGS = 'pppt_dashboard_activity_logs_v1';
const STORAGE_SECURITY_ALERTS = 'pppt_dashboard_security_alerts_v1';
const STORAGE_SESSION_ID = 'pppt_dashboard_session_id_v1';
const STORAGE_MONITORING_SETTINGS = 'pppt_dashboard_monitoring_settings_v1';

export const DEFAULT_MONITORING_SETTINGS: MonitoringSettings = {
  masterEnabled: true,
  realtimeListenersEnabled: true,
  logReadLimit: 200,
  trackAuthEvents: true,
  trackNavigation: true,
  trackDataCrud: true,
  trackFileExports: true,
  trackSearchEvents: true,
  enableSecurityAlerts: true,
};

export const DEFAULT_BUDGET_RATES: BudgetRatesConfig = {
  makanMinum: {
    sarapan: 7.2,
    minumPagi: 5.4,
    lunch: 13.5,
    minumPetang: 5.4,
    dinner: 13.5,
  },
  dobi: {
    inapanIabi: 10.0,
    bestari: 12.2,
    eksekutif: 14.0,
    iabcu: 10.0,
    iabcswk: 10.0,
    iabcsbh: 10.0,
  },
};

const INITIAL_FASA_PERUNTUKAN: FasaPeruntukanRecord[] = [
  {
    id: 'fasa_1',
    nama: 'PERUNTUKAN FASA 1',
    allocations: {
      'IAB – LATIHAN': { os21000: 50000, os24000: 40000, os27000: 30000, os29000: 60000 },
      'IAB - PENGURUSAN': { os21000: 25000, os24000: 20000, os27000: 15000, os29000: 30000 },
      'BSTP': { os21000: 15000, os24000: 10000, os27000: 10000, os29000: 20000 },
      'BPG': { os21000: 10000, os24000: 8000, os27000: 5000, os29000: 12000 },
      'BPK': { os21000: 12000, os24000: 10000, os27000: 8000, os29000: 15000 },
    },
    updatedAt: '2026-01-10',
  },
  {
    id: 'fasa_2',
    nama: 'PERUNTUKAN FASA 2',
    allocations: {
      'IAB – LATIHAN': { os21000: 45000, os24000: 35000, os27000: 25000, os29000: 50000 },
      'IAB - PENGURUSAN': { os21000: 20000, os24000: 15000, os27000: 10000, os29000: 25000 },
      'BSTP': { os21000: 12000, os24000: 8000, os27000: 8000, os29000: 15000 },
      'BPG': { os21000: 8000, os24000: 6000, os27000: 4000, os29000: 10000 },
      'BPK': { os21000: 10000, os24000: 8000, os27000: 6000, os29000: 12000 },
    },
    updatedAt: '2026-03-15',
  },
];

const STORAGE_SUBWARAN = 'pppt_dashboard_subwaran_v2';

const INITIAL_SUBWARAN: SubwaranRecord[] = [
  {
    id: 'sub-001',
    sumberKewangan: 'IAB – LATIHAN',
    namaPtj: 'IABCGH',
    ptjLain: '',
    tarikhSubWaran: '2026-02-15',
    os21000: 15000,
    os24000: 10000,
    os27000: 8000,
    os29000: 12000,
    jumlah: 45000,
    namaProgram: 'BENGKEL KEPIMPINAN INSTRUKSIONAL PEMIMPIN SEKOLAH UTARA',
    objektif: 'Meningkatkan kompetensi pedagogi digital pemimpin sekolah zon utara',
    pegawaiPic: 'WAN AZROI BIN WAN JAMAL',
    createdAt: '2026-02-15',
  },
  {
    id: 'sub-002',
    sumberKewangan: 'IAB – LATIHAN',
    namaPtj: 'IABCSBH',
    ptjLain: '',
    tarikhSubWaran: '2026-03-20',
    os21000: 12000,
    os24000: 8000,
    os27000: 6000,
    os29000: 10000,
    jumlah: 36000,
    namaProgram: 'KURSUS PENGURUSAN DATA PENDIDIKAN ZON SABAH',
    objektif: 'Pemantapan kemahiran analitik data pengurusan sekolah',
    pegawaiPic: 'DR. AHMAD FAIZAL BIN MOHD',
    createdAt: '2026-03-20',
  },
  {
    id: 'sub-003',
    sumberKewangan: 'IAB - PENGURUSAN',
    namaPtj: 'JPN',
    ptjLain: 'JPN SELANGOR',
    tarikhSubWaran: '2026-04-10',
    os21000: 5000,
    os24000: 12000,
    os27000: 4000,
    os29000: 8000,
    jumlah: 29000,
    namaProgram: 'PROGRAM PENYELARASAN PENGURUSAN FASILITI PENDIDIKAN',
    objektif: 'Menyelaras keperluan fasiliti dan audit ICT sekolah',
    pegawaiPic: 'SITI BINTI SAMAD',
    createdAt: '2026-04-10',
  },
];

const INITIAL_ADMIN_USERS: AdminUser[] = [
  {
    id: 'AMAN',
    password: 'AMAN',
    name: 'Super Admin AMAN',
    role: 'SUPER_ADMIN',
    levelId: 'SUPER_ADMIN',
    createdAt: '2026-01-01',
  },
  {
    id: 'ADMIN_JPSM',
    password: '123',
    name: 'Admin Sistem Maklumat',
    role: 'ADMIN',
    levelId: 'KETUA_JABATAN',
    pusat: 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
    jabatan: 'JABATAN PENGURUSAN SISTEM MAKLUMAT',
    allowedJabatans: ['JABATAN PENGURUSAN SISTEM MAKLUMAT'],
    jabatanAccess: {
      'JABATAN PENGURUSAN SISTEM MAKLUMAT': 'view',
    },
    allowedPages: ['DASHBOARD BERSEPADU', 'PERINCIAN PROGRAM', 'PUSAT', 'JABATAN'],
    pageAccess: {
      'DASHBOARD BERSEPADU': 'view',
      'PERINCIAN PROGRAM': 'view',
      'PUSAT': 'view',
      'JABATAN': 'view',
    },
    createdAt: '2026-01-15',
  },
];

// Helper to remove any undefined values before writing to Firestore
function sanitizeData<T extends Record<string, any>>(obj: T): T {
  const clean: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        clean[k] = sanitizeData(v);
      } else {
        clean[k] = v;
      }
    }
  }
  return clean;
}

function sanitizeProgramExpenditure(p: ProgramItem): ProgramItem {
  const status = (p.statusProgram || '').trim().toUpperCase();

  // REQUIREMENT: Bila status program dikemaskini sebagai BATAL, jadikan semua nilai (RM) setiap OS ialah 0.00.
  // Pecahan OS (seperti BK65) = 0.00, Bahagian BELANJA SEBENAR = 0.00, Bahagian PENJIMATAN = 0.00
  if (status === 'BATAL') {
    return {
      ...p,
      namaProgram: (p.namaProgram || '').toUpperCase(),
      os21000: 0,
      os24000: 0,
      os27000: 0,
      os29000: 0,
      jumlahRm: 0,
      os21000Belanja: 0,
      os24000Belanja: 0,
      os27000Belanja: 0,
      os29000Belanja: 0,
      jumlahBelanjaRm: 0,
      os21000Penjimatan: 0,
      os24000Penjimatan: 0,
      os27000Penjimatan: 0,
      os29000Penjimatan: 0,
      jumlahPenjimatanRm: 0,
    };
  }

  const isSelesaiOrTanggung = status === 'SELESAI' || status === 'TANGGUNG';
  if (!isSelesaiOrTanggung) {
    return {
      ...p,
      namaProgram: (p.namaProgram || '').toUpperCase(),
      os21000Belanja: 0,
      os24000Belanja: 0,
      os27000Belanja: 0,
      os29000Belanja: 0,
      jumlahBelanjaRm: 0,
      os21000Penjimatan: 0,
      os24000Penjimatan: 0,
      os27000Penjimatan: 0,
      os29000Penjimatan: 0,
      jumlahPenjimatanRm: 0,
    };
  }
  return {
    ...p,
    namaProgram: (p.namaProgram || '').toUpperCase(),
  };
}

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export const ProgramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Connection state
  const [firebaseStatus, setFirebaseStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const isInitialSyncDone = useRef(false);

  // 1. Programs state (with localStorage cache fallback - no sample programs)
  const [programs, setPrograms] = useState<ProgramItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROGRAMS);
      if (saved) {
        const parsed: ProgramItem[] = JSON.parse(saved);
        // Exclude any old sample data (e.g. prog-001 to prog-024)
        const clean = parsed.filter((p) => !p.id.match(/^prog-0\d\d$/));
        return clean.map(sanitizeProgramExpenditure);
      }
    } catch {}
    return [];
  });

  // 2. Admin Users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADMINS);
      if (saved) {
        const parsed: AdminUser[] = JSON.parse(saved);
        const hasAman = parsed.some((u) => u.id.toUpperCase() === 'AMAN');
        if (hasAman) return parsed;
        return [...INITIAL_ADMIN_USERS, ...parsed];
      }
    } catch {}
    return INITIAL_ADMIN_USERS;
  });

  // 3. Current logged-in user & Firebase Auth state
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_SESSION);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [authReady, setAuthReady] = useState<boolean>(false);

  // Monitoring Cost Control Settings state
  const [monitoringSettings, setMonitoringSettings] = useState<MonitoringSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MONITORING_SETTINGS);
      if (saved) {
        return { ...DEFAULT_MONITORING_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_MONITORING_SETTINGS;
  });
  const [isRefreshingMonitoring, setIsRefreshingMonitoring] = useState<boolean>(false);
  const monitoringSettingsRef = useRef<MonitoringSettings>(monitoringSettings);
  useEffect(() => {
    monitoringSettingsRef.current = monitoringSettings;
    try {
      localStorage.setItem(STORAGE_MONITORING_SETTINGS, JSON.stringify(monitoringSettings));
    } catch {}
  }, [monitoringSettings]);

  // 4. Master Data state
  const [klusterList, setKlusterList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_kluster');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return KLUSTER_LIST;
  });

  const sanitizeKlusterMap = (map: any): Record<string, string[]> => {
    if (!map || typeof map !== 'object') return KLUSTER_MAP;
    const cleaned: Record<string, string[]> = {};
    for (const [k, list] of Object.entries(map)) {
      const cleanK = k.trim().toUpperCase();
      if (!cleanK) continue;
      if (Array.isArray(list)) {
        cleaned[cleanK] = Array.from(
          new Set(
            list
              .filter((p) => typeof p === 'string' && p.trim())
              .map((p) => (p as string).trim().toUpperCase())
          )
        );
      } else {
        cleaned[cleanK] = [];
      }
    }
    return cleaned;
  };

  const [klusterMap, setKlusterMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_kluster_map');
      if (saved) return sanitizeKlusterMap(JSON.parse(saved));
    } catch {}
    return KLUSTER_MAP;
  });

  const [pusatList, setPusatList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_pusat');
      if (saved) return JSON.parse(saved);
    } catch {}
    return PUSAT_LIST;
  });

  const sanitizeJabatanMap = (map: any): Record<string, string[]> => {
    if (!map || typeof map !== 'object') return JABATAN_MAP;
    const cleaned: Record<string, string[]> = {};
    for (const [p, list] of Object.entries(map)) {
      if (Array.isArray(list)) {
        cleaned[p] = Array.from(
          new Set(
            list
              .filter((j) => typeof j === 'string' && j.trim() && !j.toUpperCase().includes('SEMUA JABATAN'))
              .map((j) => (j as string).trim())
          )
        );
      }
    }
    const ppptKey = PUSAT_LIST[0];
    const pkpopKey = PUSAT_LIST[1];
    if (!cleaned[ppptKey] || cleaned[ppptKey].length !== 3) {
      cleaned[ppptKey] = [...JABATAN_MAP[ppptKey]];
    }
    if (!cleaned[pkpopKey] || cleaned[pkpopKey].length !== 4) {
      cleaned[pkpopKey] = [...JABATAN_MAP[pkpopKey]];
    }
    return cleaned;
  };

  const [jabatanMap, setJabatanMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_jabatan');
      if (saved) return sanitizeJabatanMap(JSON.parse(saved));
    } catch {}
    return JABATAN_MAP;
  });

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_pegawai');
      if (saved) {
        const parsed: Pegawai[] = JSON.parse(saved);
        return parsed.map((p) => {
          let id = p.id;
          const match = (id || '').match(/Pegawai\s*(\d+)/i);
          if (match) {
            id = `IAB${String(match[1]).padStart(3, '0')}`;
          }
          const matchDefault = PEGAWAI_LIST.find((def) => def.id === id);
          return {
            ...p,
            id,
            label: `${id} (${p.nama})`,
            pusat: p.pusat || matchDefault?.pusat || PUSAT_LIST[0],
            jabatan:
              p.jabatan ||
              matchDefault?.jabatan ||
              (JABATAN_MAP[PUSAT_LIST[0]] && JABATAN_MAP[PUSAT_LIST[0]][0]) ||
              '',
            jawatan: p.jawatan || matchDefault?.jawatan || 'PENSYARAH',
            emel:
              p.emel ||
              matchDefault?.emel ||
              `${id.toLowerCase()}@iab.moe.edu.my`,
            noHp: p.noHp || matchDefault?.noHp || '012-3456789',
          };
        });
      }
    } catch {}
    return PEGAWAI_LIST;
  });

  const [sumberKewanganList, setSumberKewanganList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_sumber');
      if (saved) return JSON.parse(saved);
    } catch {}
    return SUMBER_KEWANGAN_LIST;
  });

  const [statusProgramList, setStatusProgramList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_status');
      if (saved) return JSON.parse(saved);
    } catch {}
    return STATUS_PROGRAM_LIST;
  });

  const [jawatanList, setJawatanList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_jawatan');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_JAWATAN_LIST;
  });

  // Peruntukan Fasa state (Super Admin)
  const [fasaPeruntukanList, setFasaPeruntukanList] = useState<FasaPeruntukanRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PERUNTUKAN_FASA);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_FASA_PERUNTUKAN;
  });

  // Subwaran state (Super Admin)
  const [subwaranList, setSubwaranList] = useState<SubwaranRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SUBWARAN);
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_SUBWARAN;
  });

  // Budget Unit Rates state (Super Admin editable)
  const [budgetRates, setBudgetRates] = useState<BudgetRatesConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_BUDGET_RATES);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          makanMinum: { ...DEFAULT_BUDGET_RATES.makanMinum, ...(parsed?.makanMinum || {}) },
          dobi: { ...DEFAULT_BUDGET_RATES.dobi, ...(parsed?.dobi || {}) },
          updatedAt: parsed?.updatedAt,
          updatedBy: parsed?.updatedBy,
        };
      }
    } catch {}
    return DEFAULT_BUDGET_RATES;
  });

  // UI States
  const [selectedFinanceYear, setSelectedFinanceYear] = useState<number>(() => getCurrentFinanceYear());
  const availableFinanceYears = useMemo(
    () => computeAvailableFinanceYears(programs, fasaPeruntukanList, subwaranList),
    [programs, fasaPeruntukanList, subwaranList]
  );
  const [filters, setFilters] = useState<ProgramFilterState>(defaultFilters);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ProgramItem | null>(null);
  const [activeTab, setActiveTabState] = useState<'welcome' | 'selamatDatang' | 'dashboard' | 'bersepadu' | 'perincian' | 'analisisPegawai' | 'pengiraan' | 'pusat' | 'jabatan' | 'iabAll' | 'klusterProfesional' | 'klusterLatihan' | 'admin' | 'monitoring' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki'>('welcome');

  // Activity Logs, Security Alerts & Session Metadata
  const [activityLogs, setActivityLogs] = useState<UserActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVITY_LOGS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SECURITY_ALERTS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [sessionId, setSessionId] = useState<string>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_SESSION_ID);
      if (saved) return saved;
    } catch {}
    return generateSessionId();
  });

  const ipAddressRef = useRef<string>('Client Browser (Private/Masked)');
  const activityLogsRef = useRef<UserActivityLog[]>(activityLogs);
  const securityAlertsRef = useRef<SecurityAlert[]>(securityAlerts);
  const pageVisitRef = useRef<{ tab: string; enteredAtMs: number }>({
    tab: 'welcome',
    enteredAtMs: Date.now(),
  });
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    activityLogsRef.current = activityLogs;
    try {
      localStorage.setItem(STORAGE_ACTIVITY_LOGS, JSON.stringify(activityLogs.slice(0, 2000)));
    } catch {}
  }, [activityLogs]);

  useEffect(() => {
    securityAlertsRef.current = securityAlerts;
    try {
      localStorage.setItem(STORAGE_SECURITY_ALERTS, JSON.stringify(securityAlerts.slice(0, 500)));
    } catch {}
  }, [securityAlerts]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_SESSION_ID, sessionId);
    } catch {}
  }, [sessionId]);

  // Non-blocking best-effort IP lookup (subject to privacy/network policy)
  useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    fetch('https://api.ipify.org?format=json', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.ip && typeof d.ip === 'string') {
          ipAddressRef.current = d.ip;
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(t));
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, []);

  // Local storage persistence fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(fasaPeruntukanList));
    } catch {}
  }, [fasaPeruntukanList]);

  // Subwaran storage persistence
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SUBWARAN, JSON.stringify(subwaranList));
    } catch {}
  }, [subwaranList]);

  // Local storage persistence fallback
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify(programs));
    } catch {}
  }, [programs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMINS, JSON.stringify(adminUsers));
    } catch {}
  }, [adminUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(STORAGE_SESSION);
      }
    } catch {}
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MASTER + '_kluster', JSON.stringify(klusterList));
      localStorage.setItem(STORAGE_MASTER + '_kluster_map', JSON.stringify(klusterMap));
      localStorage.setItem(STORAGE_MASTER + '_pusat', JSON.stringify(pusatList));
      localStorage.setItem(STORAGE_MASTER + '_jabatan', JSON.stringify(jabatanMap));
      localStorage.setItem(STORAGE_MASTER + '_pegawai', JSON.stringify(pegawaiList));
      localStorage.setItem(STORAGE_MASTER + '_sumber', JSON.stringify(sumberKewanganList));
      localStorage.setItem(STORAGE_MASTER + '_status', JSON.stringify(statusProgramList));
      localStorage.setItem(STORAGE_MASTER + '_jawatan', JSON.stringify(jawatanList));
    } catch {}
  }, [klusterList, klusterMap, pusatList, jabatanMap, pegawaiList, sumberKewanganList, statusProgramList, jawatanList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_BUDGET_RATES, JSON.stringify(budgetRates));
    } catch {}
  }, [budgetRates]);

  // 1. Public Core Firestore Listeners (Programs, Pegawai, Master Data, Peruntukan Fasa, Subwaran)
  useEffect(() => {
    let unsubscribePrograms = () => {};
    let unsubscribePegawai = () => {};
    let unsubscribeMaster = () => {};
    let unsubscribePeruntukan = () => {};
    let unsubscribeSubwaran = () => {};
    let hasSubwaranFirestoreData = false;

    const setupPublicFirebaseSync = async () => {
      try {
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          setFirebaseStatus('offline');
          return;
        }
        setFirebaseStatus('connected');

        // Live Programs Listener
        const programsCol = collection(db, 'programs');
        unsubscribePrograms = onSnapshot(
          programsCol,
          (snapshot) => {
            if (snapshot.empty) {
              setPrograms([]);
              try {
                localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify([]));
              } catch {}
            } else {
              const loaded: ProgramItem[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as ProgramItem;
                if (docSnap.id.match(/^prog-0\d\d$/)) return;
                loaded.push(
                  sanitizeProgramExpenditure({
                    ...data,
                    id: docSnap.id,
                  })
                );
              });
              setPrograms(loaded);
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.LIST, path: 'programs' });
          }
        );

        // Live Pegawai Listener
        const pegawaiCol = collection(db, 'pegawai');
        unsubscribePegawai = onSnapshot(
          pegawaiCol,
          (snapshot) => {
            if (!snapshot.empty) {
              const loaded: Pegawai[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as Pegawai;
                let id = data.id || docSnap.id;
                const match = (id || '').match(/Pegawai\s*(\d+)/i);
                if (match) {
                  id = `IAB${String(match[1]).padStart(3, '0')}`;
                }
                loaded.push({
                  ...data,
                  id,
                  label: `${id} (${data.nama})`,
                });
              });
              setPegawaiList(loaded);
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.LIST, path: 'pegawai' });
          }
        );

        // Live Master Data Settings Listener (includes budgetRates & monitoringSettings)
        const masterDocRef = doc(db, 'master_data', 'settings');
        unsubscribeMaster = onSnapshot(
          masterDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (Array.isArray(data?.klusterList) && data.klusterList.length > 0) {
                setKlusterList(data.klusterList);
              } else {
                setKlusterList(KLUSTER_LIST);
              }
              if (data?.klusterMap) setKlusterMap(sanitizeKlusterMap(data.klusterMap));
              if (data?.pusatList) setPusatList(data.pusatList);
              if (data?.jabatanMap) setJabatanMap(sanitizeJabatanMap(data.jabatanMap));
              if (data?.sumberKewanganList) setSumberKewanganList(data.sumberKewanganList);
              if (data?.statusProgramList) setStatusProgramList(data.statusProgramList);
              if (data?.jawatanList) setJawatanList(data.jawatanList);
              if (data?.budgetRates) {
                setBudgetRates({
                  makanMinum: { ...DEFAULT_BUDGET_RATES.makanMinum, ...(data.budgetRates.makanMinum || {}) },
                  dobi: { ...DEFAULT_BUDGET_RATES.dobi, ...(data.budgetRates.dobi || {}) },
                  updatedAt: data.budgetRates.updatedAt,
                  updatedBy: data.budgetRates.updatedBy,
                });
              }
              if (data?.monitoringSettings) {
                setMonitoringSettings({
                  ...DEFAULT_MONITORING_SETTINGS,
                  ...data.monitoringSettings,
                });
              }
            }
            isInitialSyncDone.current = true;
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.READ, path: 'master_data/settings' });
          }
        );

        // Live Peruntukan Fasa Listener
        const peruntukanDocRef = doc(db, 'master_data', 'peruntukan_fasa');
        unsubscribePeruntukan = onSnapshot(
          peruntukanDocRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.data();
              if (Array.isArray(data?.list)) {
                setFasaPeruntukanList(
                  data.list.map((f: FasaPeruntukanRecord) => ({
                    ...f,
                    tahun: getFasaYear(f),
                  }))
                );
              }
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.READ, path: 'master_data/peruntukan_fasa' });
          }
        );

        // Live Subwaran Listener
        const subwaranCol = collection(db, 'subwaran');
        unsubscribeSubwaran = onSnapshot(
          subwaranCol,
          (snapshot) => {
            if (!snapshot.empty || hasSubwaranFirestoreData) {
              hasSubwaranFirestoreData = true;
              const loaded: SubwaranRecord[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as SubwaranRecord;
                loaded.push({
                  ...data,
                  id: docSnap.id,
                  tahun: getSubwaranYear(data),
                });
              });
              setSubwaranList(loaded);
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.LIST, path: 'subwaran' });
          }
        );
      } catch (err) {
        console.warn('Firebase setup notice:', err);
        setFirebaseStatus('offline');
      }
    };

    setupPublicFirebaseSync();

    return () => {
      unsubscribePrograms();
      unsubscribePegawai();
      unsubscribeMaster();
      unsubscribePeruntukan();
      unsubscribeSubwaran();
    };
  }, []);

  // 2. Firebase Authentication Session Restore Listener
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setCurrentUser(null);
        try {
          sessionStorage.removeItem(STORAGE_SESSION);
        } catch {}
        setAuthReady(true);
        return;
      }

      // Restore profile from admins collection using UID or Login ID derived from auth email
      try {
        let resolvedId = authEmailToId(fbUser.email);
        try {
          const authUserSnap = await getDoc(doc(db, 'auth_users', fbUser.uid));
          if (authUserSnap.exists() && authUserSnap.data()?.adminId) {
            resolvedId = String(authUserSnap.data().adminId).trim().toUpperCase();
          }
        } catch {}

        if (resolvedId) {
          const adminSnap = await getDoc(doc(db, 'admins', resolvedId));
          if (adminSnap.exists()) {
            const profile = adminSnap.data() as AdminUser;
            if (profile.isActive === false) {
              await signOut(auth);
              setCurrentUser(null);
              setAuthReady(true);
              return;
            }
            setCurrentUser(profile);
          } else if (resolvedId === 'AMAN') {
            const amanDefault: AdminUser = {
              id: 'AMAN',
              authUid: fbUser.uid,
              firebaseAuthSynced: true,
              name: 'Super Admin AMAN',
              role: 'SUPER_ADMIN',
              levelId: 'SUPER_ADMIN',
              isActive: true,
              createdAt: '2026-01-01',
            };
            setCurrentUser(amanDefault);
          }
        }
      } catch (err) {
        console.warn('Auth profile restore warning:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubAuth();
  }, []);

  // 3. Role-Scoped Admins Listener (NEVER attached for Pelawat / unauthenticated visitors)
  useEffect(() => {
    if (!firebaseUser || !currentUser) return;

    const userIsSuper =
      currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN';
    const hasMonitoringPerm =
      userIsSuper ||
      Boolean(
        currentUser.pageAccess?.['ADMIN MONITORING DASHBOARD'] ||
          currentUser.allowedPages?.includes('ADMIN MONITORING DASHBOARD')
      );

    // Super Admin or Monitoring users need the user directory; regular staff only listen to their own doc (1 read!)
    if (userIsSuper || hasMonitoringPerm) {
      const adminsCol = collection(db, 'admins');
      const unsub = onSnapshot(
        adminsCol,
        (snapshot) => {
          if (!snapshot.empty) {
            const loaded: AdminUser[] = [];
            snapshot.forEach((docSnap) => {
              loaded.push(docSnap.data() as AdminUser);
            });
            if (!loaded.some((u) => u.id.toUpperCase() === 'AMAN')) {
              loaded.unshift({ ...INITIAL_ADMIN_USERS[0], password: '' });
            }
            setAdminUsers(loaded);
          }
        },
        (error) => {
          handleFirestoreError(error, { operation: OperationType.LIST, path: 'admins' });
        }
      );
      return () => unsub();
    } else {
      const selfRef = doc(db, 'admins', currentUser.id);
      const unsub = onSnapshot(
        selfRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const selfProfile = docSnap.data() as AdminUser;
            if (selfProfile.isActive === false) {
              signOut(auth).catch(() => {});
              return;
            }
            setCurrentUser(selfProfile);
            setAdminUsers([selfProfile]);
          }
        },
        () => {}
      );
      return () => unsub();
    }
  }, [firebaseUser?.uid, currentUser?.id, currentUser?.role, currentUser?.levelId]);

  // Manual Fetch Function for Monitoring Dashboard (used when real-time listeners are disabled to save quota)
  const refreshMonitoringLogs = async () => {
    if (!firebaseUser || !currentUser) return;
    const limitNum = monitoringSettingsRef.current.logReadLimit || 200;
    setIsRefreshingMonitoring(true);
    try {
      const logsQuery = query(
        collection(db, 'user_activity_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitNum)
      );
      const logsSnap = await getDocs(logsQuery);
      const loadedLogs: UserActivityLog[] = [];
      logsSnap.forEach((docSnap) => {
        loadedLogs.push(docSnap.data() as UserActivityLog);
      });
      setActivityLogs(loadedLogs);

      if (monitoringSettingsRef.current.enableSecurityAlerts) {
        const alertsQuery = query(
          collection(db, 'security_alerts'),
          orderBy('timestamp', 'desc'),
          limit(200)
        );
        const alertsSnap = await getDocs(alertsQuery);
        const loadedAlerts: SecurityAlert[] = [];
        alertsSnap.forEach((docSnap) => {
          loadedAlerts.push(docSnap.data() as SecurityAlert);
        });
        setSecurityAlerts(loadedAlerts);
      }
    } catch (err) {
      handleFirestoreError(err, { operation: OperationType.LIST, path: 'user_activity_logs' });
    } finally {
      setIsRefreshingMonitoring(false);
    }
  };

  // 4. Scoped & Cost-Controlled Activity Log + Alert Listeners
  // ONLY runs while an authorized user is viewing the Admin Monitoring Dashboard AND masterEnabled is true!
  useEffect(() => {
    if (!firebaseUser || !currentUser) return;
    if (activeTab !== 'monitoring') return;
    if (!monitoringSettings.masterEnabled) return;

    const userIsSuper =
      currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN';
    const hasMonitoringPerm =
      userIsSuper ||
      Boolean(
        currentUser.pageAccess?.['ADMIN MONITORING DASHBOARD'] ||
          currentUser.allowedPages?.includes('ADMIN MONITORING DASHBOARD')
      );
    if (!hasMonitoringPerm) return;

    const limitNum = monitoringSettings.logReadLimit || 200;

    if (!monitoringSettings.realtimeListenersEnabled) {
      refreshMonitoringLogs();
      return;
    }

    const logsQuery = query(
      collection(db, 'user_activity_logs'),
      orderBy('timestamp', 'desc'),
      limit(limitNum)
    );
    const unsubLogs = onSnapshot(
      logsQuery,
      (snapshot) => {
        const loaded: UserActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push(docSnap.data() as UserActivityLog);
        });
        setActivityLogs(loaded);
      },
      () => {}
    );

    let unsubAlerts = () => {};
    if (monitoringSettings.enableSecurityAlerts) {
      const alertsQuery = query(
        collection(db, 'security_alerts'),
        orderBy('timestamp', 'desc'),
        limit(200)
      );
      unsubAlerts = onSnapshot(
        alertsQuery,
        (snapshot) => {
          const loaded: SecurityAlert[] = [];
          snapshot.forEach((docSnap) => {
            loaded.push(docSnap.data() as SecurityAlert);
          });
          setSecurityAlerts(loaded);
        },
        () => {}
      );
    }

    return () => {
      unsubLogs();
      unsubAlerts();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    firebaseUser?.uid,
    currentUser?.id,
    currentUser?.role,
    currentUser?.levelId,
    activeTab,
    monitoringSettings.masterEnabled,
    monitoringSettings.realtimeListenersEnabled,
    monitoringSettings.logReadLimit,
    monitoringSettings.enableSecurityAlerts,
  ]);

  // Helper to persist master data updates to Firestore
  const syncMasterDataToFirestore = async (updates: Partial<{
    klusterList: string[];
    klusterMap: Record<string, string[]>;
    pusatList: string[];
    jabatanMap: Record<string, string[]>;
    sumberKewanganList: string[];
    statusProgramList: string[];
    jawatanList: string[];
    budgetRates: BudgetRatesConfig;
    monitoringSettings: MonitoringSettings;
  }>) => {
    try {
      const docRef = doc(db, 'master_data', 'settings');
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'master_data/settings' });
    }
  };

  // Super Admin Cost-Control Settings Updater
  const updateMonitoringSettings = (
    updates: Partial<MonitoringSettings>
  ): { success: boolean; message?: string } => {
    if (!currentUser || (currentUser.role !== 'SUPER_ADMIN' && currentUser.levelId !== 'SUPER_ADMIN')) {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengubah tetapan pemantauan.' };
    }
    const { malaysia_datetime_display } = getMalaysiaTimestampParts();
    const next: MonitoringSettings = {
      ...monitoringSettingsRef.current,
      ...updates,
      updatedAt: malaysia_datetime_display,
      updatedBy: `${currentUser.name} (${currentUser.id})`,
    };
    setMonitoringSettings(next);
    monitoringSettingsRef.current = next;
    syncMasterDataToFirestore({ monitoringSettings: next });
    return { success: true };
  };

  // Helper: Core Automatic Activity Logger (Asia/Kuala_Lumpur) + Cost-Control Gating + Security Alert Evaluator
  const logActivity = (params: {
    action_type: ActivityActionType | string;
    module_name: string;
    activity_description: string;
    record_id?: string;
    status?: ActivityLogStatus;
    duration_seconds?: number;
    userOverride?: {
      user_id?: string;
      user_name?: string;
      user_email?: string;
      user_role?: string;
    };
  }) => {
    const cfg = monitoringSettingsRef.current;
    if (!cfg.masterEnabled) return;

    const act = String(params.action_type || '').toUpperCase();
    const isAuthAct = [
      'LOGIN',
      'FAILED_LOGIN',
      'LOGOUT',
      'SESSION_TIMEOUT',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      'UNAUTHORIZED_ACCESS',
    ].includes(act);
    const isNavAct = ['NAVIGATE', 'PAGE_DURATION', 'VIEW'].includes(act);
    const isCrudAct = ['CREATE', 'UPDATE', 'DELETE', 'ADMIN_ACTION'].includes(act);
    const isFileAct = ['EXPORT', 'DOWNLOAD', 'PREVIEW', 'UPLOAD', 'REPLACE', 'PRINT', 'REPORT'].includes(act);
    const isSearchAct = act === 'SEARCH';

    if (isAuthAct && !cfg.trackAuthEvents) return;
    if (isNavAct && !cfg.trackNavigation) return;
    if (isCrudAct && !cfg.trackDataCrud) return;
    if (isFileAct && !cfg.trackFileExports) return;
    if (isSearchAct && !cfg.trackSearchEvents) return;

    // Under Option A hardened rules, only signed-in Firebase Auth users write activity logs to Firestore
    const activeFbUser = auth.currentUser;
    const targetUserId = (params.userOverride?.user_id || currentUser?.id || 'PELAWAT').toUpperCase();
    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser?.name && p.nama?.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (targetUserId && p.id?.trim().toUpperCase() === targetUserId)
    );
    const resolvedName =
      params.userOverride?.user_name || currentUser?.name || matchedPeg?.nama || 'PELAWAT (VIEWER)';
    const resolvedEmail =
      params.userOverride?.user_email ||
      matchedPeg?.emel ||
      (currentUser ? `${currentUser.id.toLowerCase()}@iab.moe.edu.my` : '-');
    const resolvedRole =
      params.userOverride?.user_role ||
      (currentUser
        ? getAdminLevelLabel(currentUser.levelId, currentUser.role)
        : 'Pelawat (Viewer)');

    const { timestamp, malaysia_date, malaysia_datetime_display } = getMalaysiaTimestampParts();
    const logId = generateLogId();

    const entry: UserActivityLog = sanitizeData({
      log_id: logId,
      user_id: targetUserId,
      user_name: resolvedName,
      user_email: resolvedEmail,
      user_role: resolvedRole,
      action_type: params.action_type,
      module_name: params.module_name,
      activity_description: params.activity_description,
      record_id: params.record_id || '-',
      ip_address: ipAddressRef.current,
      device_info: getDeviceInfo(),
      session_id: sessionId,
      timestamp,
      malaysia_date,
      malaysia_datetime_display,
      ...(params.duration_seconds !== undefined ? { duration_seconds: params.duration_seconds } : {}),
      status: params.status || 'SUCCESS',
    });

    const prevLogs = activityLogsRef.current;
    const nextLogs = [entry, ...prevLogs].slice(0, 2000);
    activityLogsRef.current = nextLogs;
    setActivityLogs(nextLogs);

    if (activeFbUser) {
      setDoc(doc(db, 'user_activity_logs', logId), entry).catch(() => {});

      if (cfg.enableSecurityAlerts) {
        const generatedAlert = evaluateSecurityAlertRules(entry, prevLogs, securityAlertsRef.current);
        if (generatedAlert) {
          const cleanAlert = sanitizeData(generatedAlert);
          const nextAlerts = [cleanAlert, ...securityAlertsRef.current].slice(0, 500);
          securityAlertsRef.current = nextAlerts;
          setSecurityAlerts(nextAlerts);
          setDoc(doc(db, 'security_alerts', cleanAlert.alert_id), cleanAlert).catch(() => {});
        }
      }
    }
  };

  const updateAlertStatus = (
    alertId: string,
    newStatus: AlertStatus
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk terlebih dahulu.' };
    }
    const { malaysia_datetime_display } = getMalaysiaTimestampParts();
    const reviewer = `${currentUser.name} (${currentUser.id})`;
    let updatedAlert: SecurityAlert | null = null;
    setSecurityAlerts((prev) =>
      prev.map((a) => {
        if (a.alert_id === alertId) {
          updatedAlert = {
            ...a,
            status: newStatus,
            reviewed_by: reviewer,
            reviewed_at: malaysia_datetime_display,
          };
          return updatedAlert;
        }
        return a;
      })
    );
    if (updatedAlert) {
      setDoc(doc(db, 'security_alerts', alertId), sanitizeData(updatedAlert), { merge: true }).catch(
        () => {}
      );
      logActivity({
        action_type: 'ADMIN_ACTION',
        module_name: 'Admin Monitoring Dashboard',
        activity_description: `Updated security alert status to "${newStatus}"`,
        record_id: alertId,
        status: 'SUCCESS',
      });
    }
    return { success: true };
  };

  // Wrapper for setActiveTab that logs navigation & page duration automatically
  const setActiveTab: ProgramContextType['setActiveTab'] = (nextTab) => {
    const prevTab = pageVisitRef.current.tab;
    const nowMs = Date.now();
    const elapsedSec = Math.max(0, Math.round((nowMs - pageVisitRef.current.enteredAtMs) / 1000));

    if (currentUser && prevTab && prevTab !== nextTab && elapsedSec >= 2) {
      logActivity({
        action_type: 'PAGE_DURATION',
        module_name: resolveModuleLabel(prevTab),
        activity_description: `Time spent on ${resolveModuleLabel(prevTab)}: ${elapsedSec}s`,
        record_id: prevTab,
        duration_seconds: elapsedSec,
        status: 'SUCCESS',
      });
    }

    pageVisitRef.current = { tab: nextTab, enteredAtMs: nowMs };
    setActiveTabState(nextTab);

    if (currentUser && prevTab !== nextTab) {
      const targetIsSuperOnly = nextTab === 'admin';
      const targetUserIsSuper =
        currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN';
      if (targetIsSuperOnly && !targetUserIsSuper) {
        logActivity({
          action_type: 'UNAUTHORIZED_ACCESS',
          module_name: resolveModuleLabel(nextTab),
          activity_description: `Attempted unauthorized navigation to restricted module "${resolveModuleLabel(nextTab)}"`,
          record_id: nextTab,
          status: 'BLOCKED',
        });
      } else {
        logActivity({
          action_type: 'NAVIGATE',
          module_name: resolveModuleLabel(nextTab),
          activity_description: `Accessed ${resolveModuleLabel(nextTab)}`,
          record_id: nextTab,
          status: 'SUCCESS',
        });
      }
    }
  };

  // Automatic inactivity session timeout (30 minutes while logged in)
  useEffect(() => {
    if (!currentUser) return;
    let timeoutHandle: ReturnType<typeof setTimeout>;
    const TIMEOUT_MS = 30 * 60 * 1000;

    const resetInactivityTimer = () => {
      clearTimeout(timeoutHandle);
      timeoutHandle = setTimeout(() => {
        logActivity({
          action_type: 'SESSION_TIMEOUT',
          module_name: 'Authentication',
          activity_description: `Session timed out automatically after 30 minutes of inactivity`,
          status: 'SUCCESS',
        });
        signOut(auth).catch(() => {});
        setCurrentUser(null);
        sessionStorage.removeItem(STORAGE_SESSION);
        setActiveTabState('admin');
      }, TIMEOUT_MS);
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetInactivityTimer, { passive: true }));
    resetInactivityTimer();

    return () => {
      clearTimeout(timeoutHandle);
      events.forEach((ev) => window.removeEventListener(ev, resetInactivityTimer));
    };
  }, [currentUser]);

  // Helper to sync trusted RBAC record into auth_users/{uid} (for Firestore security rules)
  const syncAuthUserRuleDoc = async (uid: string, user: AdminUser) => {
    const resolvedLevelId: AdminLevelId =
      user.id.toUpperCase() === 'AMAN'
        ? 'SUPER_ADMIN'
        : user.levelId || (user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'URUS_SETIA');
    const resolvedRole: AdminRole =
      resolvedLevelId === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    await setDoc(
      doc(db, 'auth_users', uid),
      sanitizeData({
        uid,
        adminId: user.id.toUpperCase(),
        role: resolvedRole,
        levelId: resolvedLevelId,
        isActive: user.isActive !== false,
        pageAccess: user.pageAccess || {},
        jabatanAccess: user.jabatanAccess || {},
        allowedPages: user.allowedPages || [],
        allowedJabatans: user.allowedJabatans || [],
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  };

  // Auth functions (Firebase Auth with Login ID -> internal email mapping)
  const login = async (id: string, pass: string): Promise<{ success: boolean; message?: string }> => {
    const cleanId = id.trim().toUpperCase();
    const cleanPass = pass.trim();
    const authEmail = idToAuthEmail(cleanId);
    const fbPass = toFirebaseAuthPassword(cleanPass);

    let fbUid = '';
    try {
      const cred = await signInWithEmailAndPassword(auth, authEmail, fbPass);
      fbUid = cred.user.uid;
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        return {
          success: false,
          message:
            'Kaedah log masuk Email/Password belum diaktifkan dalam Firebase Console. Sila aktifkan di Authentication → Sign-in method.',
        };
      }

      // First-time automatic bootstrap for default Super Admin AMAN
      if (
        cleanId === 'AMAN' &&
        cleanPass === 'AMAN' &&
        (code === 'auth/user-not-found' || code === 'auth/invalid-credential')
      ) {
        try {
          const bootCred = await createUserWithEmailAndPassword(auth, authEmail, fbPass);
          fbUid = bootCred.user.uid;
        } catch (bootErr: any) {
          if (bootErr?.code === 'auth/operation-not-allowed') {
            return {
              success: false,
              message:
                'Kaedah log masuk Email/Password belum diaktifkan dalam Firebase Console. Sila aktifkan di Authentication → Sign-in method.',
            };
          }
          return {
            success: false,
            message: 'ID Pengguna atau Kata Laluan tidak sah. Sila cuba lagi.',
          };
        }
      } else {
        return {
          success: false,
          message:
            code === 'auth/too-many-requests'
              ? 'Terlalu banyak percubaan gagal. Sila tunggu sebentar dan cuba lagi.'
              : 'ID Pengguna atau Kata Laluan tidak sah. Sila pastikan akaun telah disegerakkan ke Firebase Auth oleh Super Admin.',
        };
      }
    }

    // Now authenticated with Firebase Auth — fetch profile from admins/{cleanId}
    let profile: AdminUser | null = null;
    try {
      const adminSnap = await getDoc(doc(db, 'admins', cleanId));
      if (adminSnap.exists()) {
        profile = adminSnap.data() as AdminUser;
      }
    } catch (err) {
      console.warn('Error loading admin profile:', err);
    }

    if (!profile && cleanId === 'AMAN') {
      profile = {
        id: 'AMAN',
        name: 'Super Admin AMAN',
        role: 'SUPER_ADMIN',
        levelId: 'SUPER_ADMIN',
        isActive: true,
        authUid: fbUid,
        firebaseAuthSynced: true,
        createdAt: '2026-01-01',
      };
      await setDoc(doc(db, 'admins', 'AMAN'), sanitizeData(profile), { merge: true }).catch(() => {});
    }

    if (!profile) {
      await signOut(auth).catch(() => {});
      return {
        success: false,
        message: `Profil pentadbir untuk ID "${cleanId}" tidak ditemui dalam pangkalan data.`,
      };
    }

    if (profile.isActive === false) {
      await signOut(auth).catch(() => {});
      return {
        success: false,
        message: 'Akaun ini telah dinyahaktifkan oleh Super Admin. Sila hubungi pentadbir.',
      };
    }

    const nextSession = generateSessionId();
    setSessionId(nextSession);
    const { timestamp } = getMalaysiaTimestampParts();
    const updatedUser: AdminUser = {
      ...profile,
      authUid: fbUid,
      firebaseAuthSynced: true,
      lastLoginAt: timestamp,
    };
    delete updatedUser.password;

    setCurrentUser(updatedUser);
    setAdminUsers((prev) => {
      const exists = prev.some((u) => u.id.toUpperCase() === updatedUser.id.toUpperCase());
      return exists
        ? prev.map((u) => (u.id.toUpperCase() === updatedUser.id.toUpperCase() ? updatedUser : u))
        : [...prev, updatedUser];
    });

    // Ensure auth_users/{uid} & admins/{id} metadata are synced
    if (cleanId === 'AMAN' || updatedUser.role === 'SUPER_ADMIN' || updatedUser.levelId === 'SUPER_ADMIN') {
      await syncAuthUserRuleDoc(fbUid, updatedUser).catch(() => {});
    }
    setDoc(
      doc(db, 'admins', updatedUser.id),
      { authUid: fbUid, firebaseAuthSynced: true, lastLoginAt: timestamp, password: deleteField() },
      { merge: true }
    ).catch(() => {});

    pageVisitRef.current = { tab: 'selamatDatang', enteredAtMs: Date.now() };
    setActiveTabState('selamatDatang');

    logActivity({
      action_type: 'LOGIN',
      module_name: 'Authentication',
      activity_description: `User "${updatedUser.name}" (${updatedUser.id}) logged in via Firebase Auth`,
      record_id: updatedUser.id,
      status: 'SUCCESS',
      userOverride: {
        user_id: updatedUser.id,
        user_name: updatedUser.name,
        user_role: getAdminLevelLabel(updatedUser.levelId, updatedUser.role),
      },
    });

    return { success: true };
  };

  const logout = async () => {
    if (currentUser) {
      logActivity({
        action_type: 'LOGOUT',
        module_name: 'Authentication',
        activity_description: `User "${currentUser.name}" (${currentUser.id}) logged out`,
        record_id: currentUser.id,
        status: 'SUCCESS',
      });
    }
    await signOut(auth).catch(() => {});
    setCurrentUser(null);
    sessionStorage.removeItem(STORAGE_SESSION);
    setSessionId(generateSessionId());
    pageVisitRef.current = { tab: 'dashboard', enteredAtMs: Date.now() };
    setActiveTabState('dashboard');
  };

  // Permission & Level Helpers
  const isSuperAdmin = useMemo(
    () => Boolean(currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN')),
    [currentUser]
  );

  const getPageAccessMode = (pageKey: string): 'none' | AccessMode => {
    const key = pageKey.trim().toUpperCase();
    // Default view-only unless logged in
    if (!currentUser) {
      if (key === 'DASHBOARD PROGRAM' || key === 'PENGIRAAN BAJET') {
        return 'view';
      }
      return 'none';
    }

    if (currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN') {
      return 'edit';
    }

    // STRICT: Portal Pengurusan Pentadbir (Admin) hanya dibenarkan untuk Super Admin sahaja
    if (key === 'ADMIN') {
      return 'none';
    }

    if (key === 'SELAMAT DATANG') {
      return 'view';
    }

    // Check new granular pageAccess map first
    if (currentUser.pageAccess && Object.prototype.hasOwnProperty.call(currentUser.pageAccess, key)) {
      return currentUser.pageAccess[key] === 'edit' ? 'edit' : 'view';
    }

    // Legacy allowedPages array fallback -> view only by default
    if (currentUser.allowedPages && currentUser.allowedPages.includes(key)) {
      return 'view';
    }

    // Always allow viewing Dashboard Program and Pengiraan Bajet
    if (key === 'DASHBOARD PROGRAM' || key === 'PENGIRAAN BAJET') {
      return 'view';
    }

    return 'none';
  };

  const getJabatanAccessMode = (jabatanName?: string): 'none' | AccessMode => {
    if (!currentUser) return 'none';
    if (currentUser.role === 'SUPER_ADMIN' || currentUser.levelId === 'SUPER_ADMIN') {
      return 'edit';
    }

    const jab = (jabatanName || '').trim();
    if (currentUser.jabatanAccess && Object.keys(currentUser.jabatanAccess).length > 0) {
      if (jab && currentUser.jabatanAccess[jab]) {
        return currentUser.jabatanAccess[jab] === 'edit' ? 'edit' : 'view';
      }
      if (currentUser.jabatanAccess['SEMUA JABATAN']) {
        return currentUser.jabatanAccess['SEMUA JABATAN'] === 'edit' ? 'edit' : 'view';
      }
      return 'none';
    }

    // Legacy fallback -> view only by default
    const legacy = currentUser.allowedJabatans || (currentUser.jabatan ? [currentUser.jabatan] : []);
    if (legacy.includes('SEMUA JABATAN') || (jab && legacy.includes(jab))) {
      return 'view';
    }
    return 'none';
  };

  const canEditPage = (pageKey: string): boolean => {
    return getPageAccessMode(pageKey) === 'edit';
  };

  const canEditJabatan = (jabatanName?: string): boolean => {
    if (!currentUser) return false;
    if (isSuperAdmin) return true;
    return getJabatanAccessMode(jabatanName) === 'edit';
  };

  const getEditableJabatans = (): string[] => {
    const allJabs = Array.from(new Set(Object.values(jabatanMap).flat())).filter(
      (j) => j && j !== 'SEMUA JABATAN'
    );
    if (!currentUser) return [];
    if (isSuperAdmin) return allJabs;
    if (currentUser.jabatanAccess) {
      if (currentUser.jabatanAccess['SEMUA JABATAN'] === 'edit') return allJabs;
      return Object.entries(currentUser.jabatanAccess)
        .filter(([, mode]) => mode === 'edit')
        .map(([j]) => j);
    }
    return [];
  };

  const getAuthorizedJabatanList = (): string[] => {
    const allJabs = Array.from(new Set(Object.values(jabatanMap).flat())).filter(
      (j) => j && j !== 'SEMUA JABATAN'
    );
    if (!currentUser) return [];
    if (isSuperAdmin) return allJabs;

    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser.name && p.nama.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (currentUser.id && p.id.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
    );

    const set = new Set<string>();
    if (currentUser.jabatanAccess) {
      Object.keys(currentUser.jabatanAccess).forEach((j) => {
        if (j === 'SEMUA JABATAN') allJabs.forEach((aj) => set.add(aj));
        else if (j && j !== 'TIDAK BERKENAAN') set.add(j);
      });
    }
    if (set.size === 0 && currentUser.allowedJabatans) {
      currentUser.allowedJabatans.forEach((j) => {
        if (j === 'SEMUA JABATAN') allJabs.forEach((aj) => set.add(aj));
        else if (j && j !== 'TIDAK BERKENAAN') set.add(j);
      });
    }
    if (set.size === 0 && currentUser.jabatan && currentUser.jabatan !== 'TIDAK BERKENAAN') {
      currentUser.jabatan.split(',').map((s) => s.trim()).forEach((j) => {
        if (j === 'SEMUA JABATAN') allJabs.forEach((aj) => set.add(aj));
        else if (j && j !== 'TIDAK BERKENAAN') set.add(j);
      });
    }
    if (set.size === 0 && matchedPeg?.jabatan && matchedPeg.jabatan !== 'TIDAK BERKENAAN') {
      set.add(matchedPeg.jabatan);
    }
    return Array.from(set);
  };

  const getAuthorizedPusatList = (): string[] => {
    if (!currentUser) return [];
    if (isSuperAdmin) return pusatList;

    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser.name && p.nama.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (currentUser.id && p.id.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
    );

    const set = new Set<string>();
    if (currentUser.pusat && currentUser.pusat !== 'TIDAK BERKENAAN') {
      set.add(currentUser.pusat);
    }
    if (matchedPeg?.pusat && matchedPeg.pusat !== 'TIDAK BERKENAAN') {
      set.add(matchedPeg.pusat);
    }
    const authJabs = getAuthorizedJabatanList();
    pusatList.forEach((pus) => {
      const jabs = jabatanMap[pus] || [];
      if (authJabs.some((aj) => jabs.includes(aj))) {
        set.add(pus);
      }
    });
    return Array.from(set);
  };

  const filterScope = useMemo<FilterScope>(() => {
    const emptyScope: FilterScope = {
      levelId: currentUser?.levelId,
      isPusatRestricted: false,
      isJabatanRestricted: false,
      allowedPusats: [],
      allowedJabatans: [],
      lockedPusat: null,
      lockedJabatan: null,
    };
    if (!currentUser) return emptyScope;
    if (
      isSuperAdmin ||
      currentUser.levelId === 'PENGARAH' ||
      currentUser.levelId === 'TPP_TPL'
    ) {
      return emptyScope;
    }

    const isInvalidPusat = (p?: string) => {
      const u = (p || '').trim().toUpperCase();
      return !u || u === '-' || u === 'TIDAK BERKENAAN' || u === 'SEMUA PUSAT';
    };
    const isInvalidJabatan = (j?: string) => {
      const u = (j || '').trim().toUpperCase();
      return (
        !u ||
        u === '-' ||
        u === 'TIDAK BERKENAAN' ||
        u === 'SEMUA JABATAN' ||
        u === 'SEMUA JABATAN DI IAB' ||
        u.includes('SEMUA JABATAN')
      );
    };

    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser.name && p.nama?.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (currentUser.id && p.id?.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
    );

    if (currentUser.levelId === 'KETUA_PUSAT') {
      const pusatSet = new Set<string>();
      if (!isInvalidPusat(currentUser.pusat)) pusatSet.add(currentUser.pusat!.trim());
      if (!isInvalidPusat(matchedPeg?.pusat)) pusatSet.add(matchedPeg!.pusat!.trim());
      if (pusatSet.size === 0) {
        const userJab =
          (!isInvalidJabatan(matchedPeg?.jabatan) && matchedPeg?.jabatan) ||
          (!isInvalidJabatan(currentUser.jabatan) && currentUser.jabatan) ||
          '';
        if (userJab) {
          for (const [pus, jabs] of Object.entries(jabatanMap)) {
            if ((jabs || []).some((j) => j.trim().toUpperCase() === userJab.trim().toUpperCase())) {
              pusatSet.add(pus);
            }
          }
        }
      }
      if (pusatSet.size === 0) {
        getAuthorizedPusatList()
          .filter((p) => !isInvalidPusat(p))
          .forEach((p) => pusatSet.add(p));
      }

      const allowedPusats = Array.from(pusatSet);
      const allowedPusatsUpper = new Set(allowedPusats.map((p) => p.trim().toUpperCase()));

      const jabSet = new Set<string>();
      allowedPusats.forEach((pus) => {
        (jabatanMap[pus] || []).forEach((j) => {
          if (!isInvalidJabatan(j)) jabSet.add(j);
        });
      });
      programs.forEach((p) => {
        if (p.pusat && allowedPusatsUpper.has(p.pusat.trim().toUpperCase()) && !isInvalidJabatan(p.jabatan)) {
          jabSet.add(p.jabatan);
        }
      });
      pegawaiList.forEach((pg) => {
        if (pg.pusat && allowedPusatsUpper.has(pg.pusat.trim().toUpperCase()) && !isInvalidJabatan(pg.jabatan)) {
          jabSet.add(pg.jabatan!);
        }
      });
      if (jabSet.size === 0) {
        getAuthorizedJabatanList()
          .filter((j) => !isInvalidJabatan(j))
          .forEach((j) => jabSet.add(j));
      }

      const allowedJabatans = Array.from(jabSet);
      return {
        levelId: currentUser.levelId,
        isPusatRestricted: allowedPusats.length > 0,
        isJabatanRestricted: allowedJabatans.length > 0,
        allowedPusats,
        allowedJabatans,
        lockedPusat: allowedPusats.length === 1 ? allowedPusats[0] : null,
        lockedJabatan: null,
      };
    }

    if (currentUser.levelId === 'KETUA_JABATAN') {
      const jabSet = new Set<string>();
      if (!isInvalidJabatan(matchedPeg?.jabatan)) {
        jabSet.add(matchedPeg!.jabatan!.trim());
      } else if (!isInvalidJabatan(currentUser.jabatan)) {
        currentUser.jabatan!
          .split(',')
          .map((s) => s.trim())
          .filter((j) => !isInvalidJabatan(j))
          .forEach((j) => jabSet.add(j));
      }
      if (jabSet.size === 0) {
        getAuthorizedJabatanList()
          .filter((j) => !isInvalidJabatan(j))
          .forEach((j) => jabSet.add(j));
      }

      const allowedJabatans = Array.from(jabSet);
      const allowedJabsUpper = new Set(allowedJabatans.map((j) => j.trim().toUpperCase()));

      const pusatSet = new Set<string>();
      Object.entries(jabatanMap).forEach(([pus, jabs]) => {
        if ((jabs || []).some((j) => allowedJabsUpper.has(j.trim().toUpperCase()))) {
          if (!isInvalidPusat(pus)) pusatSet.add(pus);
        }
      });
      if (pusatSet.size === 0 && !isInvalidPusat(matchedPeg?.pusat)) {
        pusatSet.add(matchedPeg!.pusat!.trim());
      }
      if (pusatSet.size === 0 && !isInvalidPusat(currentUser.pusat)) {
        pusatSet.add(currentUser.pusat!.trim());
      }

      const allowedPusats = Array.from(pusatSet);
      return {
        levelId: currentUser.levelId,
        isPusatRestricted: allowedPusats.length > 0,
        isJabatanRestricted: allowedJabatans.length > 0,
        allowedPusats,
        allowedJabatans,
        lockedPusat: allowedPusats.length === 1 ? allowedPusats[0] : null,
        lockedJabatan: allowedJabatans.length === 1 ? allowedJabatans[0] : null,
      };
    }

    return emptyScope;
  }, [currentUser, isSuperAdmin, pegawaiList, jabatanMap, programs, pusatList]);

  const prevLockedScopeRef = useRef<{
    userId?: string;
    lockedPusat: string | null;
    lockedJabatan: string | null;
  }>({ lockedPusat: null, lockedJabatan: null });

  useEffect(() => {
    const userId = currentUser?.id;
    const prev = prevLockedScopeRef.current;

    const isOfficerAllowedInScope = (officerRef: string): boolean => {
      if (!officerRef) return true;
      if (!filterScope.isPusatRestricted && !filterScope.isJabatanRestricted) return true;
      const cleanRef = officerRef.trim().toUpperCase();
      const officer = pegawaiList.find(
        (pg) =>
          (pg.id && pg.id.trim().toUpperCase() === cleanRef) ||
          (pg.nama && pg.nama.trim().toUpperCase() === cleanRef)
      );
      if (!officer) return false;
      const offPusat = (officer.pusat || '').trim().toUpperCase();
      const offJab = (officer.jabatan || '').trim().toUpperCase();
      if (
        filterScope.isPusatRestricted &&
        filterScope.allowedPusats.length > 0 &&
        !filterScope.allowedPusats.some((ap) => ap.trim().toUpperCase() === offPusat)
      ) {
        return false;
      }
      if (
        filterScope.isJabatanRestricted &&
        filterScope.allowedJabatans.length > 0 &&
        !filterScope.allowedJabatans.some((aj) => aj.trim().toUpperCase() === offJab)
      ) {
        return false;
      }
      return true;
    };

    setFilters((curr) => {
      let nextPusat = curr.pusat;
      let nextJabatan = curr.jabatan;
      let nextPengurus = curr.pengurus;
      let nextPengurusBersama = curr.pengurusBersama;

      if (filterScope.lockedPusat) {
        nextPusat = filterScope.lockedPusat;
      } else if (filterScope.isPusatRestricted) {
        if (nextPusat && !filterScope.allowedPusats.includes(nextPusat)) {
          nextPusat = '';
        }
      } else if (prev.userId !== userId && prev.lockedPusat) {
        nextPusat = '';
      }

      if (filterScope.lockedJabatan) {
        nextJabatan = filterScope.lockedJabatan;
      } else if (filterScope.isJabatanRestricted) {
        if (nextJabatan && !filterScope.allowedJabatans.includes(nextJabatan)) {
          nextJabatan = '';
        }
      } else if (prev.userId !== userId && prev.lockedJabatan) {
        nextJabatan = '';
      }

      if (nextPengurus && !isOfficerAllowedInScope(nextPengurus)) {
        nextPengurus = '';
      }
      if (nextPengurusBersama && !isOfficerAllowedInScope(nextPengurusBersama)) {
        nextPengurusBersama = '';
      }

      if (
        nextPusat === curr.pusat &&
        nextJabatan === curr.jabatan &&
        nextPengurus === curr.pengurus &&
        nextPengurusBersama === curr.pengurusBersama
      ) {
        return curr;
      }
      return {
        ...curr,
        pusat: nextPusat,
        jabatan: nextJabatan,
        pengurus: nextPengurus,
        pengurusBersama: nextPengurusBersama,
      };
    });
    prevLockedScopeRef.current = {
      userId,
      lockedPusat: filterScope.lockedPusat,
      lockedJabatan: filterScope.lockedJabatan,
    };
  }, [currentUser?.id, filterScope, pegawaiList]);

  const createAdminUser = async (
    userData: Omit<AdminUser, 'createdAt'>
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !isSuperAdmin) {
      return { success: false, message: 'Hanya Super Admin dibenarkan mencipta ID Admin.' };
    }

    const cleanId = userData.id.trim().toUpperCase();
    if (adminUsers.some((u) => u.id.toUpperCase() === cleanId)) {
      return { success: false, message: `ID Admin "${cleanId}" telah wujud. Sila pilih ID lain.` };
    }

    const resolvedLevelId: AdminLevelId =
      userData.levelId || (userData.role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'URUS_SETIA');
    const resolvedRole: AdminRole = resolvedLevelId === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : 'ADMIN';
    const resolvedPassword = (userData.password || '123').trim() || '123';

    let provisionedUid = '';
    let relinkedExistingAuth = false;
    const authEmail = idToAuthEmail(cleanId);
    const desiredAuthPass = toFirebaseAuthPassword(resolvedPassword);

    try {
      const cred = await createUserWithEmailAndPassword(
        secondaryAuth,
        authEmail,
        desiredAuthPass
      );
      provisionedUid = cred.user.uid;
      await signOut(secondaryAuth).catch(() => {});
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        try {
          // Cubaan 1: Pautkan semula menggunakan kata laluan yang dimasukkan sekarang
          const signCred = await signInWithEmailAndPassword(
            secondaryAuth,
            authEmail,
            desiredAuthPass
          );
          provisionedUid = signCred.user.uid;
          relinkedExistingAuth = true;
        } catch {
          // Cubaan 2: Jika kata laluan baharu berbeza daripada '123', cuba kata laluan lalai '123' dan kemaskini kata laluan
          if (resolvedPassword !== '123') {
            try {
              const fallbackCred = await signInWithEmailAndPassword(
                secondaryAuth,
                authEmail,
                toFirebaseAuthPassword('123')
              );
              await updatePassword(fallbackCred.user, desiredAuthPass);
              provisionedUid = fallbackCred.user.uid;
              relinkedExistingAuth = true;
            } catch {
              // Kedua-dua cubaan gagal — pengguna terdahulu telah menukar kata laluan tersuai sendiri
            }
          }
        } finally {
          await signOut(secondaryAuth).catch(() => {});
        }

        if (!provisionedUid) {
          return {
            success: false,
            message: `Akaun Firebase Auth untuk "${cleanId}" (${authEmail}) sudah wujud daripada pendaftaran terdahulu dengan kata laluan tersuai yang berbeza. Sila masukkan kata laluan terdahulu akaun "${cleanId}" untuk memautkan semula secara automatik, ATAU padam "${authEmail}" di Firebase Console → Authentication → Users dahulu.`,
          };
        }
      } else if (err?.code === 'auth/operation-not-allowed') {
        return {
          success: false,
          message:
            'Sila aktifkan kaedah log masuk Email/Password dalam Firebase Console terlebih dahulu.',
        };
      } else {
        return {
          success: false,
          message: `Gagal mencipta akaun Firebase Auth: ${err?.message || 'Ralat tidak diketahui'}`,
        };
      }
    }

    const newUser: AdminUser = {
      ...userData,
      id: cleanId,
      authUid: provisionedUid,
      firebaseAuthSynced: true,
      name: userData.name.trim(),
      role: resolvedRole,
      levelId: resolvedLevelId,
      isActive: userData.isActive !== false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    delete newUser.password;

    setAdminUsers((prev) => [...prev, newUser]);

    try {
      await setDoc(doc(db, 'admins', cleanId), sanitizeData(newUser));
      if (provisionedUid) {
        await syncAuthUserRuleDoc(provisionedUid, newUser);
      }
    } catch (err) {
      handleFirestoreError(err, { operation: OperationType.CREATE, path: `admins/${cleanId}` });
    }

    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Portal Admin',
      activity_description: `${
        relinkedExistingAuth ? 'Re-linked existing' : 'Created'
      } Firebase Auth user account "${newUser.name}" (${cleanId}) with role ${getAdminLevelLabel(
        resolvedLevelId,
        resolvedRole
      )}`,
      record_id: cleanId,
      status: 'SUCCESS',
    });

    return {
      success: true,
      message: relinkedExistingAuth
        ? `ID "${cleanId}" (${newUser.name}) berjaya diwujudkan semula & dipautkan dengan akaun Firebase Auth sedia ada! (Kata laluan: ${resolvedPassword})`
        : undefined,
    };
  };

  const updateAdminUser = (
    id: string,
    updated: Partial<AdminUser>
  ): { success: boolean; message?: string } => {
    if (!currentUser || !isSuperAdmin) {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengemaskini ID Admin.' };
    }

    const target = adminUsers.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'Akaun admin tidak ditemui.' };
    }

    const nextLevelId = updated.levelId !== undefined ? updated.levelId : target.levelId;
    const nextRole: AdminRole =
      id.toUpperCase() === 'AMAN'
        ? 'SUPER_ADMIN'
        : nextLevelId === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : nextLevelId
        ? 'ADMIN'
        : updated.role || target.role;

    const modifiedUser: AdminUser = {
      ...target,
      ...updated,
      role: nextRole,
      levelId: id.toUpperCase() === 'AMAN' ? 'SUPER_ADMIN' : nextLevelId,
      name: updated.name !== undefined ? updated.name.trim() : target.name,
      pusat: updated.pusat !== undefined ? updated.pusat : target.pusat,
      jabatan: updated.jabatan !== undefined ? updated.jabatan : target.jabatan,
      allowedJabatans: updated.allowedJabatans !== undefined ? updated.allowedJabatans : target.allowedJabatans,
      jabatanAccess: updated.jabatanAccess !== undefined ? updated.jabatanAccess : target.jabatanAccess,
      allowedPages: updated.allowedPages !== undefined ? updated.allowedPages : target.allowedPages,
      pageAccess: updated.pageAccess !== undefined ? updated.pageAccess : target.pageAccess,
    };

    setAdminUsers((prev) => prev.map((u) => (u.id === id ? modifiedUser : u)));

    if (currentUser.id === id) {
      setCurrentUser(modifiedUser);
    }

    setDoc(doc(db, 'admins', id), sanitizeData(modifiedUser), { merge: true }).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.UPDATE, path: `admins/${id}` });
    });

    if (modifiedUser.authUid) {
      syncAuthUserRuleDoc(modifiedUser.authUid, modifiedUser).catch(() => {});
    }

    const hasSemuaEdit = Object.entries(modifiedUser.jabatanAccess || {}).some(
      ([k, v]) => k === 'SEMUA JABATAN' && v === 'edit'
    );
    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Portal Admin',
      activity_description: `Updated user profile & permissions for "${modifiedUser.name}" (${id}) [Role: ${modifiedUser.role}${hasSemuaEdit ? ', SEMUA JABATAN edit' : ''}]`,
      record_id: id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const toggleAdminUserActive = (userId: string): { success: boolean; message?: string } => {
    if (!currentUser || !isSuperAdmin) {
      return { success: false, message: 'Hanya Super Admin dibenarkan menukar status akaun.' };
    }
    if (userId.toUpperCase() === 'AMAN') {
      return { success: false, message: 'Akaun Super Admin AMAN tidak boleh dinyahaktifkan.' };
    }
    const target = adminUsers.find((u) => u.id === userId);
    if (!target) {
      return { success: false, message: 'Akaun pengguna tidak ditemui.' };
    }
    const nextActive = target.isActive === false ? true : false;
    const updatedUser: AdminUser = { ...target, isActive: nextActive };
    setAdminUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    setDoc(doc(db, 'admins', userId), sanitizeData({ isActive: nextActive }), { merge: true }).catch(
      () => {}
    );
    if (target.authUid) {
      syncAuthUserRuleDoc(target.authUid, updatedUser).catch(() => {});
    }
    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Portal Admin',
      activity_description: `${nextActive ? 'Activated' : 'Deactivated'} user account "${target.name}" (${userId})`,
      record_id: userId,
      status: 'SUCCESS',
    });
    return { success: true };
  };

  const changeOwnPassword = async (
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !auth.currentUser || !auth.currentUser.email) {
      return { success: false, message: 'Sila log masuk terlebih dahulu.' };
    }
    const cleanCurrent = currentPassword.trim();
    const cleanNewPass = newPassword.trim();
    if (!cleanNewPass) {
      return { success: false, message: 'Kata laluan baharu tidak boleh kosong.' };
    }

    try {
      const cred = EmailAuthProvider.credential(
        auth.currentUser.email,
        toFirebaseAuthPassword(cleanCurrent)
      );
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, toFirebaseAuthPassword(cleanNewPass));
    } catch (err: any) {
      logActivity({
        action_type: 'PASSWORD_CHANGE',
        module_name: 'Selamat Datang',
        activity_description: `Failed password change attempt (invalid current password) for "${currentUser.id}"`,
        record_id: currentUser.id,
        status: 'FAILED',
      });
      return {
        success: false,
        message: 'Kata laluan semasa tidak tepat atau sesi perlu log masuk semula.',
      };
    }

    const updatedUser: AdminUser = { ...currentUser };
    delete updatedUser.password;
    setCurrentUser(updatedUser);
    setDoc(
      doc(db, 'admins', currentUser.id),
      { firebaseAuthSynced: true, password: deleteField() },
      { merge: true }
    ).catch(() => {});

    logActivity({
      action_type: 'PASSWORD_CHANGE',
      module_name: 'Selamat Datang',
      activity_description: `User "${currentUser.name}" (${currentUser.id}) changed own password in Firebase Auth`,
      record_id: currentUser.id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const updateOwnPhoto = (photoUrl: string): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk terlebih dahulu.' };
    }
    const cleanPhoto = photoUrl || '';
    const updatedUser: AdminUser = { ...currentUser, photoUrl: cleanPhoto };

    setAdminUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, photoUrl: cleanPhoto } : u))
    );
    setCurrentUser(updatedUser);

    setDoc(doc(db, 'admins', currentUser.id), sanitizeData({ photoUrl: cleanPhoto }), { merge: true }).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.UPDATE, path: `admins/${currentUser.id}` });
    });

    // Also sync to matching Pegawai record if exists
    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser.name && p.nama.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (currentUser.id && p.id.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
    );
    if (matchedPeg) {
      setPegawaiList((prev) =>
        prev.map((p) => (p.id === matchedPeg.id ? { ...p, photoUrl: cleanPhoto } : p))
      );
      setDoc(
        doc(db, 'pegawai', matchedPeg.id),
        sanitizeData({ ...matchedPeg, photoUrl: cleanPhoto }),
        { merge: true }
      ).catch(() => {});
    }

    logActivity({
      action_type: cleanPhoto ? 'UPLOAD' : 'DELETE',
      module_name: 'Selamat Datang',
      activity_description: cleanPhoto
        ? `Uploaded/updated passport photo for "${currentUser.name}" (${currentUser.id})`
        : `Removed passport photo for "${currentUser.name}" (${currentUser.id})`,
      record_id: currentUser.id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const updateOwnContactInfo = (
    noHp: string,
    emel: string
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk terlebih dahulu.' };
    }
    const cleanNoHp = (noHp || '').trim().slice(0, 50);
    const cleanEmel = (emel || '').trim().toLowerCase().slice(0, 200);

    if (cleanEmel && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmel)) {
      return { success: false, message: 'Format Emel Rasmi tidak sah. Sila masukkan emel yang betul.' };
    }

    const updatedUser: AdminUser = { ...currentUser, noHp: cleanNoHp, emel: cleanEmel };

    setAdminUsers((prev) =>
      prev.map((u) => (u.id === currentUser.id ? { ...u, noHp: cleanNoHp, emel: cleanEmel } : u))
    );
    setCurrentUser(updatedUser);

    setDoc(
      doc(db, 'admins', currentUser.id),
      sanitizeData({ noHp: cleanNoHp, emel: cleanEmel }),
      { merge: true }
    ).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.UPDATE, path: `admins/${currentUser.id}` });
    });

    const matchedPeg = pegawaiList.find(
      (p) =>
        (currentUser.name && p.nama.trim().toUpperCase() === currentUser.name.trim().toUpperCase()) ||
        (currentUser.id && p.id.trim().toUpperCase() === currentUser.id.trim().toUpperCase())
    );
    if (matchedPeg) {
      setPegawaiList((prev) =>
        prev.map((p) => (p.id === matchedPeg.id ? { ...p, noHp: cleanNoHp, emel: cleanEmel } : p))
      );
      setDoc(
        doc(db, 'pegawai', matchedPeg.id),
        sanitizeData({ ...matchedPeg, noHp: cleanNoHp, emel: cleanEmel }),
        { merge: true }
      ).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: `pegawai/${matchedPeg.id}` });
      });
    }

    logActivity({
      action_type: 'UPDATE',
      module_name: 'Selamat Datang',
      activity_description: `Updated contact info (No. HP: ${cleanNoHp || '-'}, Emel: ${cleanEmel || '-'}) for "${currentUser.name}" (${currentUser.id})`,
      record_id: currentUser.id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const resetUserPassword = async (
    targetUserId: string,
    newPassword = '123'
  ): Promise<{ success: boolean; message?: string }> => {
    if (!currentUser || !isSuperAdmin) {
      logActivity({
        action_type: 'UNAUTHORIZED_ACCESS',
        module_name: 'Portal Admin',
        activity_description: `Unauthorized password reset attempt on "${targetUserId}"`,
        record_id: targetUserId,
        status: 'BLOCKED',
      });
      return { success: false, message: 'Hanya Super Admin dibenarkan menetapkan semula kata laluan pengguna.' };
    }
    const target = adminUsers.find((u) => u.id === targetUserId);
    if (!target) {
      return { success: false, message: 'Akaun pengguna tidak ditemui.' };
    }

    // In pure client-side Option A (Firebase Auth without backend Admin SDK),
    // legacy unsynced users can still be provisioned with the reset password, while
    // already-synced users update their password themselves or via Firebase Console.
    if (!target.firebaseAuthSynced && !target.authUid) {
      const cleanResetPass = (newPassword || '123').trim() || '123';
      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          idToAuthEmail(target.id),
          toFirebaseAuthPassword(cleanResetPass)
        );
        const newUid = cred.user.uid;
        await signOut(secondaryAuth).catch(() => {});
        const syncedUser: AdminUser = { ...target, authUid: newUid, firebaseAuthSynced: true };
        delete syncedUser.password;
        setAdminUsers((prev) => prev.map((u) => (u.id === targetUserId ? syncedUser : u)));
        await setDoc(
          doc(db, 'admins', targetUserId),
          { authUid: newUid, firebaseAuthSynced: true, password: deleteField() },
          { merge: true }
        );
        await syncAuthUserRuleDoc(newUid, syncedUser);
        logActivity({
          action_type: 'PASSWORD_RESET',
          module_name: 'Portal Admin',
          activity_description: `Provisioned & reset default password ("${cleanResetPass}") for "${target.name}" (${targetUserId})`,
          record_id: targetUserId,
          status: 'SUCCESS',
        });
        return {
          success: true,
          message: `Akaun "${targetUserId}" telah disegerakkan ke Firebase Auth dengan kata laluan lalai "${cleanResetPass}".`,
        };
      } catch (err: any) {
        if (err?.code !== 'auth/email-already-in-use') {
          return {
            success: false,
            message: `Gagal menetapkan semula kata laluan: ${err?.message || 'Ralat Firebase Auth'}`,
          };
        }
      }
    }

    return {
      success: false,
      message: `Akaun "${targetUserId}" sudah menggunakan Firebase Authentication (${idToAuthEmail(targetUserId)}). Untuk keselamatan, penetapan semula kata laluan pengguna lain dilakukan melalui Firebase Console → Authentication → Users, atau pengguna menukar kata laluan sendiri di halaman Selamat Datang.`,
    };
  };

  const syncAdminUsersToFirebaseAuth = async (): Promise<{
    success: boolean;
    syncedCount: number;
    skippedCount: number;
    message: string;
  }> => {
    if (!currentUser || !isSuperAdmin) {
      return {
        success: false,
        syncedCount: 0,
        skippedCount: 0,
        message: 'Hanya Super Admin dibenarkan menjalankan penyegerakan Firebase Auth.',
      };
    }
    let syncedCount = 0;
    let skippedCount = 0;

    for (const user of adminUsers) {
      if (user.id.toUpperCase() === 'AMAN' && firebaseUser?.uid) {
        await syncAuthUserRuleDoc(firebaseUser.uid, user).catch(() => {});
        await setDoc(
          doc(db, 'admins', user.id),
          { authUid: firebaseUser.uid, firebaseAuthSynced: true, password: deleteField() },
          { merge: true }
        ).catch(() => {});
        syncedCount++;
        continue;
      }

      if (user.authUid && user.firebaseAuthSynced) {
        await syncAuthUserRuleDoc(user.authUid, user).catch(() => {});
        skippedCount++;
        continue;
      }

      const rawPass = (user.password || '123').trim() || '123';
      try {
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth,
          idToAuthEmail(user.id),
          toFirebaseAuthPassword(rawPass)
        );
        const uid = cred.user.uid;
        await signOut(secondaryAuth).catch(() => {});
        const nextUser: AdminUser = { ...user, authUid: uid, firebaseAuthSynced: true };
        delete nextUser.password;
        await setDoc(
          doc(db, 'admins', user.id),
          { authUid: uid, firebaseAuthSynced: true, password: deleteField() },
          { merge: true }
        );
        await syncAuthUserRuleDoc(uid, nextUser);
        syncedCount++;
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use') {
          try {
            const signCred = await signInWithEmailAndPassword(
              secondaryAuth,
              idToAuthEmail(user.id),
              toFirebaseAuthPassword(rawPass)
            );
            const uid = signCred.user.uid;
            await signOut(secondaryAuth).catch(() => {});
            const nextUser: AdminUser = { ...user, authUid: uid, firebaseAuthSynced: true };
            delete nextUser.password;
            await setDoc(
              doc(db, 'admins', user.id),
              { authUid: uid, firebaseAuthSynced: true, password: deleteField() },
              { merge: true }
            );
            await syncAuthUserRuleDoc(uid, nextUser);
            syncedCount++;
          } catch {
            skippedCount++;
          }
        } else if (err?.code === 'auth/operation-not-allowed') {
          return {
            success: false,
            syncedCount,
            skippedCount,
            message:
              'Kaedah Email/Password belum diaktifkan di Firebase Console → Authentication → Sign-in method.',
          };
        } else {
          skippedCount++;
        }
      }
    }

    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Portal Admin',
      activity_description: `Synchronized admin accounts to Firebase Auth (${syncedCount} synced, ${skippedCount} skipped)`,
      record_id: 'FIREBASE_AUTH_SYNC',
      status: 'SUCCESS',
    });

    return {
      success: true,
      syncedCount,
      skippedCount,
      message: `Penyegerakan selesai: ${syncedCount} akaun disegerakkan ke Firebase Auth (${skippedCount} sedia ada / dilangkau).`,
    };
  };

  const deleteAdminUser = (userId: string): { success: boolean; message?: string } => {
    if (!currentUser || !isSuperAdmin) {
      return { success: false, message: 'Hanya Super Admin dibenarkan memadam ID Admin.' };
    }
    if (userId.toUpperCase() === 'AMAN') {
      return { success: false, message: 'Super Admin AMAN tidak boleh dipadamkan.' };
    }

    const target = adminUsers.find((u) => u.id === userId);
    setAdminUsers((prev) => prev.filter((u) => u.id !== userId));

    // Delete in Firestore (and RBAC mapping if synced)
    deleteDoc(doc(db, 'admins', userId)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `admins/${userId}` });
    });
    if (target?.authUid) {
      deleteDoc(doc(db, 'auth_users', target.authUid)).catch(() => {});
    }

    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Portal Admin',
      activity_description: `Deleted user account "${target?.name || userId}" (${userId})`,
      record_id: userId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  // Filter handlers
  const setFilter = (key: keyof ProgramFilterState, value: string) => {
    setFilters((prev) => {
      let nextValue = value;
      if (key === 'pusat') {
        if (filterScope.lockedPusat) {
          nextValue = filterScope.lockedPusat;
        } else if (
          filterScope.isPusatRestricted &&
          nextValue &&
          !filterScope.allowedPusats.includes(nextValue)
        ) {
          return prev;
        }
      }
      if (key === 'jabatan') {
        if (filterScope.lockedJabatan) {
          nextValue = filterScope.lockedJabatan;
        } else if (
          filterScope.isJabatanRestricted &&
          nextValue &&
          !filterScope.allowedJabatans.includes(nextValue)
        ) {
          return prev;
        }
      }

      const updated = { ...prev, [key]: nextValue };

      if (key === 'pusat' && nextValue) {
        const allowedJabatan = jabatanMap[nextValue] || [];
        if (prev.jabatan && !allowedJabatan.includes(prev.jabatan) && !filterScope.lockedJabatan) {
          updated.jabatan = '';
        }
      }

      if (key === 'pengurus' && nextValue) {
        if (prev.pengurusBersama === nextValue) {
          updated.pengurusBersama = '';
        }
      }

      return updated;
    });

    if (key === 'searchQuery') {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      const trimmed = value.trim();
      if (trimmed && currentUser) {
        searchDebounceRef.current = setTimeout(() => {
          logActivity({
            action_type: 'SEARCH',
            module_name: resolveModuleLabel(activeTab),
            activity_description: `Searched query "${trimmed}"`,
            record_id: trimmed.slice(0, 40),
            status: 'SUCCESS',
          });
        }, 1200);
      }
    }
  };

  const resetFilters = () => {
    setFilters({
      ...defaultFilters,
      tahun: String(getCurrentFinanceYear()),
      pusat: filterScope.lockedPusat || '',
      jabatan: filterScope.lockedJabatan || '',
    });
  };

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (
        filterScope.isPusatRestricted &&
        filterScope.allowedPusats.length > 0 &&
        !filterScope.allowedPusats.includes(p.pusat)
      ) {
        return false;
      }
      if (
        filterScope.isJabatanRestricted &&
        filterScope.allowedJabatans.length > 0 &&
        !filterScope.allowedJabatans.includes(p.jabatan)
      ) {
        return false;
      }
      if (filters.pusat && p.pusat !== filters.pusat) return false;
      if (filters.jabatan && p.jabatan !== filters.jabatan) return false;
      if (filters.jenisProgram && p.jenisProgram !== filters.jenisProgram) return false;

      if (filters.pengurus) {
        const match = p.pengurusId === filters.pengurus || p.pengurusNama === filters.pengurus;
        if (!match) return false;
      }

      if (filters.pengurusBersama) {
        const match =
          p.pengurusBersamaId === filters.pengurusBersama ||
          p.pengurusBersamaNama === filters.pengurusBersama;
        if (!match) return false;
      }

      if (filters.negeri && p.negeri !== filters.negeri) return false;
      if (filters.tahun && String(getProgramYear(p)) !== filters.tahun) return false;
      if (filters.bulan && p.bulan.toString() !== filters.bulan) return false;
      if (filters.status && p.statusProgram !== filters.status) return false;
      if (filters.sumberKewangan && p.sumberKewangan !== filters.sumberKewangan) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const searchPool = [
          p.namaProgram,
          p.kodProgram,
          p.jenisProgram,
          p.tempat,
          p.negeri,
          p.pengurusNama,
          p.pengurusBersamaNama,
          p.urusSetiaNama || '',
          p.pusat,
          p.jabatan,
          p.sumberKewangan,
          p.catatan || '',
        ].join(' ').toLowerCase();

        if (!searchPool.includes(q)) return false;
      }

      return true;
    });
  }, [programs, filters, filterScope]);

  // Deduplicated filtered programs by Kod Program so same program is never counted or summed twice
  const uniqueFilteredPrograms = useMemo(
    () => deduplicateProgramsByCode(filteredPrograms),
    [filteredPrograms]
  );

  // Flash Card Group 1 Stats
  const group1Stats = useMemo<FlashCardGroup1Stats>(() => {
    const uniqueJenis = new Set<string>();
    const uniqueSumber = new Set<string>();
    let totalPeserta = 0;
    let totalHari = 0;

    uniqueFilteredPrograms.forEach((p) => {
      if (p.jenisProgram) uniqueJenis.add(p.jenisProgram);
      if (p.sumberKewangan) uniqueSumber.add(p.sumberKewangan);
      totalPeserta += Number(p.bilanganPeserta) || 0;
      totalHari += Number(p.jumlahHari) || 0;
    });

    const bilanganProgram = uniqueFilteredPrograms.length;
    const purataPeserta = bilanganProgram > 0 ? Math.round(totalPeserta / bilanganProgram) : 0;

    return {
      bilanganProgram,
      bilanganJenisProgram: uniqueJenis.size,
      jumlahPeserta: totalPeserta,
      bilanganSumberKewangan: uniqueSumber.size,
      jumlahHariProgram: totalHari,
      purataPeserta,
    };
  }, [uniqueFilteredPrograms]);

  // Flash Card Group 2 Stats
  const group2Stats = useMemo<FlashCardGroup2Stats>(() => {
    let selesai = 0;
    let dalamTindakan = 0;
    let tanggung = 0;
    let belumAmbilTindakan = 0;
    let batal = 0;

    uniqueFilteredPrograms.forEach((p) => {
      const status = (p.statusProgram || '').trim().toUpperCase();
      if (status === 'SELESAI') selesai++;
      else if (status === 'DALAM TINDAKAN') dalamTindakan++;
      else if (status === 'TANGGUNG') tanggung++;
      else if (status === 'BELUM AMBIL TINDAKAN') belumAmbilTindakan++;
      else if (status === 'BATAL') batal++;
    });

    return {
      bilanganSelesai: selesai,
      bilanganDalamTindakan: dalamTindakan,
      bilanganTanggung: tanggung,
      bilanganBelumAmbilTindakan: belumAmbilTindakan,
      bilanganBatal: batal,
    };
  }, [uniqueFilteredPrograms]);

  // Financial Section Stats
  const financialStats = useMemo<FinancialSectionStats>(() => {
    let d21 = 0;
    let d24 = 0;
    let d27 = 0;
    let d29 = 0;
    let dTotal = 0;

    let b21 = 0;
    let b24 = 0;
    let b27 = 0;
    let b29 = 0;
    let bTotal = 0;

    uniqueFilteredPrograms.forEach((p) => {
      const os21 = Number(p.os21000) || 0;
      const os24 = Number(p.os24000) || 0;
      const os27 = Number(p.os27000) || 0;
      const os29 = Number(p.os29000) || 0;
      const totalProg = Number(p.jumlahRm) || (os21 + os24 + os27 + os29);

      d21 += os21;
      d24 += os24;
      d27 += os27;
      d29 += os29;
      dTotal += totalProg;

      let bel21 = p.os21000Belanja;
      let bel24 = p.os24000Belanja;
      let bel27 = p.os27000Belanja;
      let bel29 = p.os29000Belanja;

      const isSelesaiOrTanggung =
        p.statusProgram === 'SELESAI' || p.statusProgram === 'TANGGUNG';

      if (!isSelesaiOrTanggung) {
        bel21 = 0;
        bel24 = 0;
        bel27 = 0;
        bel29 = 0;
      } else if (
        bel21 === undefined ||
        bel24 === undefined ||
        bel27 === undefined ||
        bel29 === undefined
      ) {
        const factor = p.statusProgram === 'SELESAI' ? 0.94 : 0.5;
        bel21 = bel21 ?? Math.round(os21 * factor);
        bel24 = bel24 ?? Math.round(os24 * factor);
        bel27 = bel27 ?? Math.round(os27 * factor);
        bel29 = bel29 ?? Math.round(os29 * factor);
      }

      const belTotalProg =
        p.jumlahBelanjaRm ?? (Number(bel21) + Number(bel24) + Number(bel27) + Number(bel29));

      b21 += Number(bel21) || 0;
      b24 += Number(bel24) || 0;
      b27 += Number(bel27) || 0;
      b29 += Number(bel29) || 0;
      bTotal += Number(belTotalProg) || 0;
    });

    return {
      diterimaOs21: d21,
      diterimaOs24: d24,
      diterimaOs27: d27,
      diterimaOs29: d29,
      diterimaKeseluruhan: dTotal,

      dibelanjaOs21: b21,
      dibelanjaOs24: b24,
      dibelanjaOs27: b27,
      dibelanjaOs29: b29,
      dibelanjaKeseluruhan: bTotal,

      bakiOs21: Math.max(0, d21 - b21),
      bakiOs24: Math.max(0, d24 - b24),
      bakiOs27: Math.max(0, d27 - b27),
      bakiOs29: Math.max(0, d29 - b29),
      bakiKeseluruhan: Math.max(0, dTotal - bTotal),
    };
  }, [uniqueFilteredPrograms]);

  const viewProgramDetail = (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setIsDetailOpen(true);
    if (currentUser) {
      logActivity({
        action_type: 'VIEW',
        module_name: resolveModuleLabel(activeTab),
        activity_description: `Viewed program record "${prog.namaProgram}" (${prog.kodProgram})`,
        record_id: prog.kodProgram || prog.id,
        status: 'SUCCESS',
      });
    }
  };

  // CRUD Program with RBAC validation & Firestore sync
  const addProgram = (data: Omit<ProgramItem, 'id'>): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk ke akaun Admin untuk menambah program.' };
    }

    if (!isSuperAdmin) {
      if (!canEditPage('ADMIN') && !canEditPage('PERINCIAN PROGRAM')) {
        logActivity({
          action_type: 'UNAUTHORIZED_ACCESS',
          module_name: 'Perincian Program',
          activity_description: `Blocked attempt to create program "${data.namaProgram}" (View Only page)`,
          record_id: data.kodProgram || '-',
          status: 'BLOCKED',
        });
        return {
          success: false,
          message: 'Akses View Only: Akaun anda tidak mempunyai kebenaran Edit halaman untuk menambah program.',
        };
      }
      if (!canEditJabatan(data.jabatan)) {
        logActivity({
          action_type: 'UNAUTHORIZED_ACCESS',
          module_name: 'Perincian Program',
          activity_description: `Blocked attempt to create program under unauthorized department "${data.jabatan}"`,
          record_id: data.kodProgram || '-',
          status: 'BLOCKED',
        });
        return {
          success: false,
          message: `Akses View Only / Terhad: Anda hanya dibenarkan menambah atau mengedit program bagi jabatan dengan kebenaran Edit.`,
        };
      }
    }

    const newId = `prog-${Date.now()}`;
    const newProg: ProgramItem = sanitizeProgramExpenditure({
      ...data,
      namaProgram: data.namaProgram.toUpperCase(),
      kodProgram: data.kodProgram.toUpperCase(),
      id: newId,
    });

    setPrograms((prev) => [newProg, ...prev]);

    // Firestore persistence
    setDoc(doc(db, 'programs', newId), sanitizeData(newProg)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.CREATE, path: `programs/${newId}` });
    });

    logActivity({
      action_type: 'CREATE',
      module_name: 'Perincian Program',
      activity_description: `Created new program "${newProg.namaProgram}" (${newProg.kodProgram}) [${newProg.jabatan}]`,
      record_id: newProg.kodProgram || newId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const updateProgram = (
    id: string,
    data: Partial<ProgramItem>
  ): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk ke akaun Admin untuk mengemaskini program.' };
    }

    const target = programs.find((p) => p.id === id);
    if (!target) {
      return { success: false, message: 'Program tidak ditemui.' };
    }

    // REQUIREMENT: Super admin sahaja boleh edit semua program dengan STATUS PROGRAM: SELESAI DAN TANGGUNG
    const targetStatus = (target.statusProgram || '').trim().toUpperCase();
    if ((targetStatus === 'SELESAI' || targetStatus === 'TANGGUNG') && !isSuperAdmin) {
      return {
        success: false,
        message: 'Akses ditolak. Program berstatus SELESAI dan TANGGUNG hanya boleh dikemaskini oleh Super Admin sahaja.',
      };
    }

    if (!isSuperAdmin) {
      if (!canEditPage('ADMIN') && !canEditPage('PERINCIAN PROGRAM')) {
        return {
          success: false,
          message: 'Akses View Only: Akaun anda tidak mempunyai kebenaran Edit halaman untuk mengemaskini program.',
        };
      }
      if (!canEditJabatan(target.jabatan)) {
        return {
          success: false,
          message: `Akses View Only / Terhad: Anda hanya mempunyai akses paparan (View Only) atau tidak diberi kebenaran Edit bagi jabatan "${target.jabatan}".`,
        };
      }
    }

    // BK04: Rekod Perubahan Maklumat Program (Audit Log)
    const diffItems: ItemPerubahanBK04[] = [];

    if (
      data.tarikhMula !== undefined ||
      data.tarikhTamat !== undefined ||
      data.tempoh !== undefined
    ) {
      const oldVal = target.tempoh || `${target.tarikhMula} - ${target.tarikhTamat}`;
      const newVal =
        data.tempoh ||
        `${data.tarikhMula || target.tarikhMula} - ${data.tarikhTamat || target.tarikhTamat}`;
      if (oldVal !== newVal) {
        diffItems.push({
          jenisPerubahan: 'Tarikh & Tempoh',
          maklumatAsal: oldVal,
          maklumatTerkini: newVal,
        });
      }
    }

    if (data.tempat !== undefined && data.tempat !== target.tempat) {
      diffItems.push({
        jenisPerubahan: 'Tempat',
        maklumatAsal: target.tempat,
        maklumatTerkini: data.tempat,
      });
    }

    if (data.negeri !== undefined && data.negeri !== target.negeri) {
      diffItems.push({
        jenisPerubahan: 'Negeri',
        maklumatAsal: target.negeri,
        maklumatTerkini: data.negeri,
      });
    }

    if (
      data.bilanganPeserta !== undefined &&
      Number(data.bilanganPeserta) !== Number(target.bilanganPeserta)
    ) {
      diffItems.push({
        jenisPerubahan: 'Bilangan Peserta',
        maklumatAsal: `${target.bilanganPeserta} orang`,
        maklumatTerkini: `${data.bilanganPeserta} orang`,
      });
    }

    if (data.sumberKewangan !== undefined && data.sumberKewangan !== target.sumberKewangan) {
      diffItems.push({
        jenisPerubahan: 'Sumber Kewangan',
        maklumatAsal: target.sumberKewangan,
        maklumatTerkini: data.sumberKewangan,
      });
    }

    if (data.os21000 !== undefined && Number(data.os21000) !== Number(target.os21000)) {
      diffItems.push({
        jenisPerubahan: 'OS21000',
        maklumatAsal: `RM ${formatRM(target.os21000)}`,
        maklumatTerkini: `RM ${formatRM(data.os21000)}`,
      });
    }

    if (data.os24000 !== undefined && Number(data.os24000) !== Number(target.os24000)) {
      diffItems.push({
        jenisPerubahan: 'OS24000',
        maklumatAsal: `RM ${formatRM(target.os24000)}`,
        maklumatTerkini: `RM ${formatRM(data.os24000)}`,
      });
    }

    if (data.os27000 !== undefined && Number(data.os27000) !== Number(target.os27000)) {
      diffItems.push({
        jenisPerubahan: 'OS27000',
        maklumatAsal: `RM ${formatRM(target.os27000)}`,
        maklumatTerkini: `RM ${formatRM(data.os27000)}`,
      });
    }

    if (data.os29000 !== undefined && Number(data.os29000) !== Number(target.os29000)) {
      diffItems.push({
        jenisPerubahan: 'OS29000',
        maklumatAsal: `RM ${formatRM(target.os29000)}`,
        maklumatTerkini: `RM ${formatRM(data.os29000)}`,
      });
    }

    if (
      data.os21000Belanja !== undefined &&
      Number(data.os21000Belanja) !== Number(target.os21000Belanja ?? 0)
    ) {
      diffItems.push({
        jenisPerubahan: 'OS21000 Belanja Sebenar',
        maklumatAsal: `RM ${formatRM(target.os21000Belanja ?? 0)}`,
        maklumatTerkini: `RM ${formatRM(data.os21000Belanja)}`,
      });
    }

    if (
      data.os24000Belanja !== undefined &&
      Number(data.os24000Belanja) !== Number(target.os24000Belanja ?? 0)
    ) {
      diffItems.push({
        jenisPerubahan: 'OS24000 Belanja Sebenar',
        maklumatAsal: `RM ${formatRM(target.os24000Belanja ?? 0)}`,
        maklumatTerkini: `RM ${formatRM(data.os24000Belanja)}`,
      });
    }

    if (
      data.os27000Belanja !== undefined &&
      Number(data.os27000Belanja) !== Number(target.os27000Belanja ?? 0)
    ) {
      diffItems.push({
        jenisPerubahan: 'OS27000 Belanja Sebenar',
        maklumatAsal: `RM ${formatRM(target.os27000Belanja ?? 0)}`,
        maklumatTerkini: `RM ${formatRM(data.os27000Belanja)}`,
      });
    }

    if (
      data.os29000Belanja !== undefined &&
      Number(data.os29000Belanja) !== Number(target.os29000Belanja ?? 0)
    ) {
      diffItems.push({
        jenisPerubahan: 'OS29000 Belanja Sebenar',
        maklumatAsal: `RM ${formatRM(target.os29000Belanja ?? 0)}`,
        maklumatTerkini: `RM ${formatRM(data.os29000Belanja)}`,
      });
    }

    if (data.statusProgram !== undefined && data.statusProgram !== target.statusProgram) {
      diffItems.push({
        jenisPerubahan: 'Status Program',
        maklumatAsal: target.statusProgram,
        maklumatTerkini: data.statusProgram,
      });
    }

    if (
      data.namaProgram !== undefined &&
      data.namaProgram.toUpperCase() !== target.namaProgram.toUpperCase()
    ) {
      diffItems.push({
        jenisPerubahan: 'Nama Program',
        maklumatAsal: target.namaProgram,
        maklumatTerkini: data.namaProgram.toUpperCase(),
      });
    }

    if (
      data.kodProgram !== undefined &&
      data.kodProgram.toUpperCase() !== target.kodProgram.toUpperCase()
    ) {
      diffItems.push({
        jenisPerubahan: 'Kod Program',
        maklumatAsal: target.kodProgram,
        maklumatTerkini: data.kodProgram.toUpperCase(),
      });
    }

    if (data.jenisProgram !== undefined && data.jenisProgram !== target.jenisProgram) {
      diffItems.push({
        jenisPerubahan: 'Jenis Program',
        maklumatAsal: target.jenisProgram,
        maklumatTerkini: data.jenisProgram,
      });
    }

    if (data.pusat !== undefined && data.pusat !== target.pusat) {
      diffItems.push({
        jenisPerubahan: 'Pusat',
        maklumatAsal: target.pusat,
        maklumatTerkini: data.pusat,
      });
    }

    if (data.jabatan !== undefined && data.jabatan !== target.jabatan) {
      diffItems.push({
        jenisPerubahan: 'Jabatan',
        maklumatAsal: target.jabatan,
        maklumatTerkini: data.jabatan,
      });
    }

    if (data.pengurusNama !== undefined && data.pengurusNama !== target.pengurusNama) {
      diffItems.push({
        jenisPerubahan: 'Pegawai Pengurus',
        maklumatAsal: target.pengurusNama,
        maklumatTerkini: data.pengurusNama,
      });
    }

    if (
      data.pengurusBersamaNama !== undefined &&
      data.pengurusBersamaNama !== (target.pengurusBersamaNama || '')
    ) {
      diffItems.push({
        jenisPerubahan: 'Pengurus Bersama',
        maklumatAsal: target.pengurusBersamaNama || 'Tiada',
        maklumatTerkini: data.pengurusBersamaNama || 'Tiada',
      });
    }

    if (
      data.urusSetiaNama !== undefined &&
      data.urusSetiaNama !== (target.urusSetiaNama || '')
    ) {
      diffItems.push({
        jenisPerubahan: 'Urus Setia',
        maklumatAsal: target.urusSetiaNama || 'Tiada',
        maklumatTerkini: data.urusSetiaNama || 'Tiada',
      });
    }

    if (data.catatan !== undefined && data.catatan !== (target.catatan || '')) {
      diffItems.push({
        jenisPerubahan: 'Catatan Tambahan',
        maklumatAsal: target.catatan || 'Tiada',
        maklumatTerkini: data.catatan || 'Tiada',
      });
    }

    let updatedItem: ProgramItem | null = null;
    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = sanitizeProgramExpenditure({
            ...p,
            ...data,
            namaProgram: data.namaProgram !== undefined ? data.namaProgram.toUpperCase() : p.namaProgram,
            kodProgram: data.kodProgram !== undefined ? data.kodProgram.toUpperCase() : p.kodProgram,
          });

          if ((updated.statusProgram || '').trim().toUpperCase() === 'BATAL') {
            updated.os21000 = 0;
            updated.os24000 = 0;
            updated.os27000 = 0;
            updated.os29000 = 0;
            updated.jumlahRm = 0;
            updated.os21000Belanja = 0;
            updated.os24000Belanja = 0;
            updated.os27000Belanja = 0;
            updated.os29000Belanja = 0;
            updated.jumlahBelanjaRm = 0;
            updated.os21000Penjimatan = 0;
            updated.os24000Penjimatan = 0;
            updated.os27000Penjimatan = 0;
            updated.os29000Penjimatan = 0;
            updated.jumlahPenjimatanRm = 0;
          } else if (
            data.os21000 !== undefined ||
            data.os24000 !== undefined ||
            data.os27000 !== undefined ||
            data.os29000 !== undefined
          ) {
            updated.jumlahRm =
              (Number(updated.os21000) || 0) +
              (Number(updated.os24000) || 0) +
              (Number(updated.os27000) || 0) +
              (Number(updated.os29000) || 0);
          }

          // If there are diffs, record a new BK04 pindaan entry
          if (diffItems.length > 0) {
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const tarikhPindaan = `${day}/${month}/${year}`;
            const existingPindaan = p.rekodPindaan || [];
            const newPindaan: RekodPindaanBK04 = {
              noPindaan: existingPindaan.length + 1,
              tarikhPindaan,
              dikemaskiniOleh: currentUser.name || currentUser.id,
              perubahan: diffItems,
            };
            updated.rekodPindaan = [...existingPindaan, newPindaan];
          }

          updatedItem = updated;
          return updated;
        }
        return p;
      })
    );

    if (updatedItem) {
      updateDoc(doc(db, 'programs', id), sanitizeData(updatedItem)).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: `programs/${id}` });
      });
      logActivity({
        action_type: 'UPDATE',
        module_name: resolveModuleLabel(activeTab),
        activity_description: `Updated program "${target.namaProgram}" (${target.kodProgram})${
          diffItems.length > 0 ? ` [${diffItems.map((d) => d.jenisPerubahan).join(', ')}]` : ''
        }`,
        record_id: target.kodProgram || id,
        status: 'SUCCESS',
      });
    }

    return { success: true };
  };

  const deleteProgram = (id: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      logActivity({
        action_type: 'UNAUTHORIZED_ACCESS',
        module_name: 'Portal Admin',
        activity_description: `Unauthorized attempt to delete program "${id}"`,
        record_id: id,
        status: 'BLOCKED',
      });
      return {
        success: false,
        message: 'Akses ditolak. Super Admin sahaja yang dibenarkan memadam program.',
      };
    }

    const target = programs.find((p) => p.id === id);
    setPrograms((prev) => prev.filter((p) => p.id !== id));
    if (selectedProgram?.id === id) {
      setSelectedProgram(null);
      setIsDetailOpen(false);
    }

    deleteDoc(doc(db, 'programs', id)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `programs/${id}` });
    });

    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted program "${target?.namaProgram || id}" (${target?.kodProgram || id})`,
      record_id: target?.kodProgram || id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const deleteMultiplePrograms = (ids: string[]): { success: boolean; message?: string; count?: number } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      logActivity({
        action_type: 'UNAUTHORIZED_ACCESS',
        module_name: 'Portal Admin',
        activity_description: `Unauthorized attempt to bulk delete ${ids.length} programs`,
        record_id: `${ids.length} records`,
        status: 'BLOCKED',
      });
      return {
        success: false,
        message: 'Akses ditolak. Super Admin sahaja yang dibenarkan memadam program.',
      };
    }
    if (ids.length === 0) {
      return { success: false, message: 'Tiada program dipilih untuk dipadam.' };
    }

    const idSet = new Set(ids);
    setPrograms((prev) => prev.filter((p) => !idSet.has(p.id)));
    if (selectedProgram && idSet.has(selectedProgram.id)) {
      setSelectedProgram(null);
      setIsDetailOpen(false);
    }

    try {
      const chunkSize = 400;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((id) => {
          batch.delete(doc(db, 'programs', id));
        });
        batch.commit().catch((err) => {
          handleFirestoreError(err, { operation: OperationType.DELETE, path: `programs/batch` });
        });
      }
    } catch (e) {
      console.warn('Batch delete firestore warning:', e);
    }

    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Bulk deleted ${ids.length} programs (${ids.length === programs.length ? 'SEMUA' : 'BATCH'})`,
      record_id: `${ids.length} records`,
      status: 'SUCCESS',
    });

    return { success: true, count: ids.length };
  };

  const importPrograms = (newPrograms: ProgramItem[], mode: 'replace' | 'merge'): { success: boolean; message?: string; count?: number } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan memuat naik data program.' };
    }
    if (!Array.isArray(newPrograms) || newPrograms.length === 0) {
      return { success: false, message: 'Format data tidak sah atau senarai program kosong.' };
    }

    const sanitized = newPrograms.map((p, idx) => {
      const id = p.id || `prog-${Date.now()}-${idx}`;
      return sanitizeProgramExpenditure({
        ...p,
        id,
        namaProgram: (p.namaProgram || '').toUpperCase(),
        kodProgram: (p.kodProgram || `PROG-${idx + 1}`).toUpperCase(),
      });
    });

    if (mode === 'replace') {
      setPrograms(sanitized);
    } else {
      setPrograms((prev) => {
        const existingMap = new Map(prev.map((p) => [p.id, p]));
        sanitized.forEach((p) => existingMap.set(p.id, p));
        return Array.from(existingMap.values());
      });
    }

    try {
      const chunkSize = 400;
      for (let i = 0; i < sanitized.length; i += chunkSize) {
        const chunk = sanitized.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((p) => {
          batch.set(doc(db, 'programs', p.id), sanitizeData(p));
        });
        batch.commit().catch((err) => {
          handleFirestoreError(err, { operation: OperationType.UPDATE, path: `programs/import` });
        });
      }
    } catch (e) {
      console.warn('Batch import firestore warning:', e);
    }

    logActivity({
      action_type: mode === 'replace' ? 'REPLACE' : 'UPLOAD',
      module_name: 'Portal Admin',
      activity_description: `Imported ${sanitized.length} program records (Mode: ${mode === 'replace' ? 'Replace All' : 'Merge'})`,
      record_id: `${sanitized.length} records`,
      status: 'SUCCESS',
    });

    return { success: true, count: sanitized.length };
  };

  const resetToDefaultData = () => {
    setPrograms(INITIAL_PROGRAMS);
    setKlusterList(KLUSTER_LIST);
    setKlusterMap(KLUSTER_MAP);
    setPusatList(PUSAT_LIST);
    setJabatanMap(JABATAN_MAP);
    setPegawaiList(PEGAWAI_LIST);
    setSumberKewanganList(SUMBER_KEWANGAN_LIST);
    setStatusProgramList(STATUS_PROGRAM_LIST);
    setJawatanList(DEFAULT_JAWATAN_LIST);
    setFasaPeruntukanList(INITIAL_FASA_PERUNTUKAN);
    setSubwaranList(INITIAL_SUBWARAN);
    localStorage.removeItem(STORAGE_PROGRAMS);
    localStorage.removeItem(STORAGE_MASTER + '_kluster');
    localStorage.removeItem(STORAGE_MASTER + '_kluster_map');
    localStorage.removeItem(STORAGE_MASTER + '_pusat');
    localStorage.removeItem(STORAGE_MASTER + '_jabatan');
    localStorage.removeItem(STORAGE_MASTER + '_pegawai');
    localStorage.removeItem(STORAGE_MASTER + '_sumber');
    localStorage.removeItem(STORAGE_MASTER + '_status');
    localStorage.removeItem(STORAGE_MASTER + '_jawatan');
    localStorage.removeItem(STORAGE_PERUNTUKAN_FASA);
    localStorage.removeItem(STORAGE_SUBWARAN);
    // Bersihkan senarai program sepenuhnya tanpa sebarang data contoh
    setPrograms([]);
    try {
      localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify([]));
    } catch {}
    resetFilters();

    // Pastikan master data kekal selaras
    try {
      syncMasterDataToFirestore({
        klusterList: KLUSTER_LIST,
        klusterMap: KLUSTER_MAP,
        pusatList: PUSAT_LIST,
        jabatanMap: JABATAN_MAP,
        sumberKewanganList: SUMBER_KEWANGAN_LIST,
        statusProgramList: STATUS_PROGRAM_LIST,
        jawatanList: DEFAULT_JAWATAN_LIST,
      });
    } catch {}
  };

  // Master Data CRUD functions (Super Admin Only)
  const getKlusterForPusat = (pusatName: string): string => {
    const cleanP = (pusatName || '').trim().toUpperCase();
    for (const [k, pusats] of Object.entries(klusterMap)) {
      if ((pusats || []).some((p) => p.trim().toUpperCase() === cleanP)) {
        return k;
      }
    }
    return '';
  };

  const addKluster = (namaKluster: string) => {
    const trimmed = namaKluster.trim().toUpperCase();
    if (!trimmed || klusterList.includes(trimmed)) return;
    const nextList = [...klusterList, trimmed];
    const nextMap = { ...klusterMap, [trimmed]: klusterMap[trimmed] || [] };
    setKlusterList(nextList);
    setKlusterMap(nextMap);
    syncMasterDataToFirestore({ klusterList: nextList, klusterMap: nextMap });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Created Kluster IAB "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updateKluster = (oldKluster: string, newKluster: string) => {
    const trimmed = newKluster.trim().toUpperCase();
    if (!trimmed || oldKluster === trimmed) return;
    const nextList = klusterList.map((k) => (k === oldKluster ? trimmed : k));
    const nextMap = { ...klusterMap };
    const pusats = nextMap[oldKluster] || [];
    delete nextMap[oldKluster];
    nextMap[trimmed] = Array.from(new Set([...(nextMap[trimmed] || []), ...pusats]));
    setKlusterList(nextList);
    setKlusterMap(nextMap);
    syncMasterDataToFirestore({ klusterList: nextList, klusterMap: nextMap });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Kluster IAB "${oldKluster}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const deleteKluster = (namaKluster: string) => {
    const nextList = klusterList.filter((k) => k !== namaKluster);
    const nextMap = { ...klusterMap };
    delete nextMap[namaKluster];
    setKlusterList(nextList);
    setKlusterMap(nextMap);
    syncMasterDataToFirestore({ klusterList: nextList, klusterMap: nextMap });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Kluster IAB "${namaKluster}"`,
      record_id: namaKluster,
      status: 'SUCCESS',
    });
  };
  const addPegawai = (peg: Pegawai) => {
    setPegawaiList((prev) => [...prev, peg]);
    setDoc(doc(db, 'pegawai', peg.id), sanitizeData(peg)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.CREATE, path: `pegawai/${peg.id}` });
    });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Added Pegawai "${peg.nama}" (${peg.id})`,
      record_id: peg.id,
      status: 'SUCCESS',
    });
  };

  const updatePegawai = (id: string, updated: Partial<Pegawai>) => {
    setPegawaiList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated, label: `${p.id} (${updated.nama || p.nama})` } : p))
    );
    const existing = pegawaiList.find((p) => p.id === id);
    if (existing) {
      const merged = { ...existing, ...updated, label: `${existing.id} (${updated.nama || existing.nama})` };
      setDoc(doc(db, 'pegawai', id), sanitizeData(merged), { merge: true }).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: `pegawai/${id}` });
      });
    }
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Pegawai "${updated.nama || existing?.nama || id}" (${id})`,
      record_id: id,
      status: 'SUCCESS',
    });
  };

  const deletePegawai = (id: string) => {
    const pegToDelete = pegawaiList.find((p) => p.id === id);
    setPegawaiList((prev) => prev.filter((p) => p.id !== id));
    deleteDoc(doc(db, 'pegawai', id)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `pegawai/${id}` });
    });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Pegawai "${pegToDelete?.nama || id}" (${id})`,
      record_id: id,
      status: 'SUCCESS',
    });

    // REQUIREMENT: Bila delete data pegawai, data dalam Pengurusan ID Admin akan dihapuskan juga sekiranya sama/berkaitan.
    if (pegToDelete) {
      const relatedAdmins = adminUsers.filter((u) => {
        if (u.role === 'SUPER_ADMIN' || u.id.toUpperCase() === 'AMAN') return false;
        const idMatch = u.id.toUpperCase() === id.toUpperCase();
        const nameMatch = u.name.trim().toLowerCase() === pegToDelete.nama.trim().toLowerCase();
        return idMatch || nameMatch;
      });

      relatedAdmins.forEach((adm) => {
        deleteAdminUser(adm.id);
      });
    }
  };

  const addPusat = (namaPusat: string, kluster?: string) => {
    const trimmed = namaPusat.trim().toUpperCase();
    if (!trimmed) return;
    const targetKluster = (kluster || '').trim().toUpperCase();
    const nextList = pusatList.includes(trimmed) ? pusatList : [...pusatList, trimmed];
    const nextJabMap = jabatanMap[trimmed] ? jabatanMap : { ...jabatanMap, [trimmed]: [] };

    const nextKlusterMap = { ...klusterMap };
    if (targetKluster) {
      Object.keys(nextKlusterMap).forEach((k) => {
        nextKlusterMap[k] = (nextKlusterMap[k] || []).filter((p) => p !== trimmed);
      });
      nextKlusterMap[targetKluster] = Array.from(
        new Set([...(nextKlusterMap[targetKluster] || []), trimmed])
      );
    }

    setPusatList(nextList);
    setJabatanMap(nextJabMap);
    if (targetKluster) setKlusterMap(nextKlusterMap);
    syncMasterDataToFirestore({
      pusatList: nextList,
      jabatanMap: nextJabMap,
      ...(targetKluster ? { klusterMap: nextKlusterMap } : {}),
    });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Created Pusat "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updatePusat = (oldPusat: string, newPusat: string, newKluster?: string) => {
    const trimmed = newPusat.trim().toUpperCase();
    if (!trimmed) return;
    const targetKluster = (newKluster || '').trim().toUpperCase();
    const isNameChanged = oldPusat !== trimmed;

    const nextList = isNameChanged
      ? Array.from(new Set(pusatList.map((p) => (p === oldPusat ? trimmed : p))))
      : pusatList;

    const nextJabMap = { ...jabatanMap };
    if (isNameChanged) {
      const jabatans = nextJabMap[oldPusat] || [];
      delete nextJabMap[oldPusat];
      nextJabMap[trimmed] = Array.from(new Set([...(nextJabMap[trimmed] || []), ...jabatans]));
    }

    const nextKlusterMap = { ...klusterMap };
    if (targetKluster) {
      Object.keys(nextKlusterMap).forEach((k) => {
        nextKlusterMap[k] = (nextKlusterMap[k] || []).filter(
          (p) => p !== oldPusat && p !== trimmed
        );
      });
      nextKlusterMap[targetKluster] = Array.from(
        new Set([...(nextKlusterMap[targetKluster] || []), trimmed])
      );
    } else if (isNameChanged) {
      Object.keys(nextKlusterMap).forEach((k) => {
        nextKlusterMap[k] = (nextKlusterMap[k] || []).map((p) => (p === oldPusat ? trimmed : p));
      });
    }

    setPusatList(nextList);
    setJabatanMap(nextJabMap);
    setKlusterMap(nextKlusterMap);
    syncMasterDataToFirestore({
      pusatList: nextList,
      jabatanMap: nextJabMap,
      klusterMap: nextKlusterMap,
    });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Pusat "${oldPusat}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });

    if (isNameChanged) {
      setPrograms((prev) =>
        prev.map((p) => (p.pusat === oldPusat ? { ...p, pusat: trimmed } : p))
      );
      setPegawaiList((prev) =>
        prev.map((peg) => (peg.pusat === oldPusat ? { ...peg, pusat: trimmed } : peg))
      );
    }
  };

  const deletePusat = (pusat: string) => {
    const nextList = pusatList.filter((p) => p !== pusat);
    const nextMap = { ...jabatanMap };
    delete nextMap[pusat];
    const nextKlusterMap = { ...klusterMap };
    Object.keys(nextKlusterMap).forEach((k) => {
      nextKlusterMap[k] = (nextKlusterMap[k] || []).filter((p) => p !== pusat);
    });
    setPusatList(nextList);
    setJabatanMap(nextMap);
    setKlusterMap(nextKlusterMap);
    syncMasterDataToFirestore({
      pusatList: nextList,
      jabatanMap: nextMap,
      klusterMap: nextKlusterMap,
    });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Pusat "${pusat}"`,
      record_id: pusat,
      status: 'SUCCESS',
    });
  };

  const addJabatan = (pusat: string, namaJabatan: string) => {
    const trimmed = namaJabatan.trim().toUpperCase();
    if (!trimmed) return;
    const existing = jabatanMap[pusat] || [];
    if (existing.includes(trimmed)) return;
    const nextMap = { ...jabatanMap, [pusat]: [...existing, trimmed] };
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ jabatanMap: nextMap });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Created Jabatan "${trimmed}" under "${pusat}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updateJabatan = (pusat: string, oldJabatan: string, newJabatan: string) => {
    const trimmed = newJabatan.trim().toUpperCase();
    if (!trimmed || oldJabatan === trimmed) return;
    const list = jabatanMap[pusat] || [];
    const nextMap = {
      ...jabatanMap,
      [pusat]: list.map((j) => (j === oldJabatan ? trimmed : j)),
    };
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ jabatanMap: nextMap });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Jabatan "${oldJabatan}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });

    setPrograms((prev) =>
      prev.map((p) => (p.jabatan === oldJabatan ? { ...p, jabatan: trimmed } : p))
    );
  };

  const deleteJabatan = (pusat: string, namaJabatan: string) => {
    const list = jabatanMap[pusat] || [];
    const nextMap = {
      ...jabatanMap,
      [pusat]: list.filter((j) => j !== namaJabatan),
    };
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ jabatanMap: nextMap });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Jabatan "${namaJabatan}" from "${pusat}"`,
      record_id: namaJabatan,
      status: 'SUCCESS',
    });
  };

  const addSumberKewangan = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || sumberKewanganList.includes(trimmed)) return;
    const nextList = [...sumberKewanganList, trimmed];
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Added Sumber Kewangan "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updateSumberKewangan = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = sumberKewanganList.map((s) => (s === oldNama ? trimmed : s));
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Sumber Kewangan "${oldNama}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });

    setPrograms((prev) =>
      prev.map((p) => (p.sumberKewangan === oldNama ? { ...p, sumberKewangan: trimmed } : p))
    );
  };

  const deleteSumberKewangan = (nama: string) => {
    const nextList = sumberKewanganList.filter((s) => s !== nama);
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Sumber Kewangan "${nama}"`,
      record_id: nama,
      status: 'SUCCESS',
    });
  };

  const addStatusProgram = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || statusProgramList.includes(trimmed)) return;
    const nextList = [...statusProgramList, trimmed];
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Added Status Program "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updateStatusProgram = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = statusProgramList.map((s) => (s === oldNama ? trimmed : s));
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Status Program "${oldNama}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });

    setPrograms((prev) =>
      prev.map((p) => (p.statusProgram === oldNama ? { ...p, statusProgram: trimmed } : p))
    );
  };

  const deleteStatusProgram = (nama: string) => {
    const nextList = statusProgramList.filter((s) => s !== nama);
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Status Program "${nama}"`,
      record_id: nama,
      status: 'SUCCESS',
    });
  };

  const addJawatan = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || jawatanList.includes(trimmed)) return;
    const nextList = [...jawatanList, trimmed];
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });
    logActivity({
      action_type: 'CREATE',
      module_name: 'Portal Admin',
      activity_description: `Added Jawatan "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });
  };

  const updateJawatan = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = jawatanList.map((j) => (j === oldNama ? trimmed : j));
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });
    logActivity({
      action_type: 'UPDATE',
      module_name: 'Portal Admin',
      activity_description: `Updated Jawatan "${oldNama}" -> "${trimmed}"`,
      record_id: trimmed,
      status: 'SUCCESS',
    });

    setPegawaiList((prev) =>
      prev.map((p) => (p.jawatan === oldNama ? { ...p, jawatan: trimmed } : p))
    );
  };

  const deleteJawatan = (nama: string) => {
    const nextList = jawatanList.filter((j) => j !== nama);
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });
    logActivity({
      action_type: 'DELETE',
      module_name: 'Portal Admin',
      activity_description: `Deleted Jawatan "${nama}"`,
      record_id: nama,
      status: 'SUCCESS',
    });
  };

  // Bulk Import Master Data Functions (Super Admin)
  const importPegawaiBulk = (items: Partial<Pegawai>[]) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, updated: 0, message: 'Hanya Super Admin dibenarkan mengimport data pegawai.' };
    }
    const valid = items.filter((it) => it.nama && it.nama.trim());
    if (valid.length === 0) {
      return { success: false, added: 0, updated: 0, message: 'Tiada rekod nama pegawai yang sah ditemui.' };
    }

    let maxNum = 0;
    pegawaiList.forEach((p) => {
      const m = (p.id || '').match(/(\d+)/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (!isNaN(n) && n > maxNum) maxNum = n;
      }
    });

    const nextMap = new Map<string, Pegawai>(pegawaiList.map((p) => [p.id.toUpperCase(), p]));
    const changedRecords: Pegawai[] = [];
    let added = 0;
    let updated = 0;

    valid.forEach((raw) => {
      const cleanNama = (raw.nama || '').trim().toUpperCase();
      let candidateId = (raw.id || '').trim().toUpperCase();
      const pegMatch = candidateId.match(/Pegawai\s*(\d+)/i);
      if (pegMatch) {
        candidateId = `IAB${String(pegMatch[1]).padStart(3, '0')}`;
      }

      const existingById = candidateId ? nextMap.get(candidateId) : undefined;
      const existingByName = !existingById
        ? Array.from(nextMap.values()).find((p) => p.nama.trim().toUpperCase() === cleanNama)
        : undefined;

      const targetExisting = existingById || existingByName;
      if (targetExisting) {
        const merged: Pegawai = {
          ...targetExisting,
          nama: cleanNama,
          pusat: (raw.pusat !== undefined ? raw.pusat : targetExisting.pusat || '').trim().toUpperCase(),
          jabatan: (raw.jabatan !== undefined ? raw.jabatan : targetExisting.jabatan || '').trim().toUpperCase(),
          jawatan: (raw.jawatan !== undefined ? raw.jawatan : targetExisting.jawatan || 'PENSYARAH').trim().toUpperCase(),
          emel: (raw.emel !== undefined ? raw.emel : targetExisting.emel || '').trim().toLowerCase(),
          noHp: (raw.noHp !== undefined ? raw.noHp : targetExisting.noHp || '').trim(),
          label: `${targetExisting.id} (${cleanNama})`,
        };
        nextMap.set(targetExisting.id.toUpperCase(), merged);
        changedRecords.push(merged);
        updated++;
      } else {
        let newId = candidateId;
        if (!newId || nextMap.has(newId)) {
          maxNum += 1;
          newId = `IAB${String(maxNum).padStart(3, '0')}`;
          while (nextMap.has(newId)) {
            maxNum += 1;
            newId = `IAB${String(maxNum).padStart(3, '0')}`;
          }
        } else {
          const m = newId.match(/(\d+)/);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
          }
        }
        const created: Pegawai = {
          id: newId,
          nama: cleanNama,
          pusat: (raw.pusat || pusatList[0] || 'TIDAK BERKENAAN').trim().toUpperCase(),
          jabatan: (raw.jabatan || 'TIDAK BERKENAAN').trim().toUpperCase(),
          jawatan: (raw.jawatan || jawatanList[0] || 'PENSYARAH').trim().toUpperCase(),
          emel: (raw.emel || '').trim().toLowerCase(),
          noHp: (raw.noHp || '').trim(),
          label: `${newId} (${cleanNama})`,
        };
        nextMap.set(newId.toUpperCase(), created);
        changedRecords.push(created);
        added++;
      }
    });

    const nextList = Array.from(nextMap.values());
    setPegawaiList(nextList);

    try {
      const chunkSize = 400;
      for (let i = 0; i < changedRecords.length; i += chunkSize) {
        const chunk = changedRecords.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach((p) => {
          batch.set(doc(db, 'pegawai', p.id), sanitizeData(p));
        });
        batch.commit().catch((err) => {
          handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'pegawai/import' });
        });
      }
    } catch {}

    logActivity({
      action_type: 'UPLOAD',
      module_name: 'Portal Admin',
      activity_description: `Bulk imported Pegawai (${added} added, ${updated} updated)`,
      record_id: `${added + updated} records`,
      status: 'SUCCESS',
    });

    return { success: true, added, updated };
  };

  const importKlusterBulk = (items: string[]) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport Kluster IAB.' };
    }
    const cleaned = Array.from(new Set(items.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    if (cleaned.length === 0) {
      return { success: false, added: 0, message: 'Tiada nama Kluster yang sah ditemui.' };
    }
    const nextList = [...klusterList];
    const nextMap = { ...klusterMap };
    let added = 0;
    cleaned.forEach((k) => {
      if (!nextList.includes(k)) {
        nextList.push(k);
        if (!nextMap[k]) nextMap[k] = [];
        added++;
      }
    });
    if (added > 0) {
      setKlusterList(nextList);
      setKlusterMap(nextMap);
      syncMasterDataToFirestore({ klusterList: nextList, klusterMap: nextMap });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Kluster IAB records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  const importPusatBulk = (items: Array<string | { pusat: string; kluster?: string }>) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport senarai Pusat.' };
    }
    const normalized = items
      .map((item) =>
        typeof item === 'string'
          ? { pusat: item.trim().toUpperCase(), kluster: '' }
          : {
              pusat: (item.pusat || '').trim().toUpperCase(),
              kluster: (item.kluster || '').trim().toUpperCase(),
            }
      )
      .filter((x) => Boolean(x.pusat));

    if (normalized.length === 0) {
      return { success: false, added: 0, message: 'Tiada nama Pusat yang sah ditemui.' };
    }

    const nextList = [...pusatList];
    const nextMap = { ...jabatanMap };
    const nextKlusterList = [...klusterList];
    const nextKlusterMap = { ...klusterMap };
    let added = 0;
    let klusterChanged = false;

    normalized.forEach(({ pusat: p, kluster: k }) => {
      if (!nextList.includes(p)) {
        nextList.push(p);
        if (!nextMap[p]) nextMap[p] = [];
        added++;
      }
      if (k) {
        if (!nextKlusterList.includes(k)) nextKlusterList.push(k);
        Object.keys(nextKlusterMap).forEach((existingK) => {
          nextKlusterMap[existingK] = (nextKlusterMap[existingK] || []).filter((x) => x !== p);
        });
        nextKlusterMap[k] = Array.from(new Set([...(nextKlusterMap[k] || []), p]));
        klusterChanged = true;
      }
    });
    if (added > 0 || klusterChanged) {
      setPusatList(nextList);
      setJabatanMap(nextMap);
      if (klusterChanged) {
        setKlusterList(nextKlusterList);
        setKlusterMap(nextKlusterMap);
      }
      syncMasterDataToFirestore({
        pusatList: nextList,
        jabatanMap: nextMap,
        ...(klusterChanged ? { klusterList: nextKlusterList, klusterMap: nextKlusterMap } : {}),
      });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Pusat records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  const importJabatanBulk = (entries: Array<{ pusat?: string; jabatan: string; kluster?: string }>, defaultPusat?: string) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport senarai Jabatan.' };
    }
    const nextPusatList = [...pusatList];
    const nextMap = { ...jabatanMap };
    const nextKlusterList = [...klusterList];
    const nextKlusterMap = { ...klusterMap };
    let added = 0;
    let pusatAdded = false;
    let klusterChanged = false;

    entries.forEach((entry) => {
      const jab = (entry.jabatan || '').trim().toUpperCase();
      const pus = (entry.pusat || defaultPusat || pusatList[0] || '').trim().toUpperCase();
      const klu = (entry.kluster || '').trim().toUpperCase();
      if (!jab || !pus) return;
      if (!nextPusatList.includes(pus)) {
        nextPusatList.push(pus);
        pusatAdded = true;
      }
      if (klu) {
        if (!nextKlusterList.includes(klu)) nextKlusterList.push(klu);
        if (!(nextKlusterMap[klu] || []).includes(pus)) {
          nextKlusterMap[klu] = Array.from(new Set([...(nextKlusterMap[klu] || []), pus]));
          klusterChanged = true;
        }
      }
      const existing = nextMap[pus] || [];
      if (!existing.includes(jab)) {
        nextMap[pus] = [...existing, jab];
        added++;
      }
    });

    if (added > 0 || pusatAdded || klusterChanged) {
      if (pusatAdded) setPusatList(nextPusatList);
      setJabatanMap(nextMap);
      if (klusterChanged) {
        setKlusterList(nextKlusterList);
        setKlusterMap(nextKlusterMap);
      }
      syncMasterDataToFirestore({
        ...(pusatAdded ? { pusatList: nextPusatList } : {}),
        ...(klusterChanged ? { klusterList: nextKlusterList, klusterMap: nextKlusterMap } : {}),
        jabatanMap: nextMap,
      });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Jabatan records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  const importSumberKewanganBulk = (items: string[]) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport Sumber Kewangan.' };
    }
    const cleaned = Array.from(new Set(items.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    if (cleaned.length === 0) {
      return { success: false, added: 0, message: 'Tiada Sumber Kewangan yang sah ditemui.' };
    }
    const nextList = [...sumberKewanganList];
    let added = 0;
    cleaned.forEach((s) => {
      if (!nextList.includes(s)) {
        nextList.push(s);
        added++;
      }
    });
    if (added > 0) {
      setSumberKewanganList(nextList);
      syncMasterDataToFirestore({ sumberKewanganList: nextList });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Sumber Kewangan records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  const importStatusProgramBulk = (items: string[]) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport Status Program.' };
    }
    const cleaned = Array.from(new Set(items.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    if (cleaned.length === 0) {
      return { success: false, added: 0, message: 'Tiada Status Program yang sah ditemui.' };
    }
    const nextList = [...statusProgramList];
    let added = 0;
    cleaned.forEach((st) => {
      if (!nextList.includes(st)) {
        nextList.push(st);
        added++;
      }
    });
    if (added > 0) {
      setStatusProgramList(nextList);
      syncMasterDataToFirestore({ statusProgramList: nextList });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Status Program records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  const importJawatanBulk = (items: string[]) => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, added: 0, message: 'Hanya Super Admin dibenarkan mengimport Jawatan.' };
    }
    const cleaned = Array.from(new Set(items.map((x) => x.trim().toUpperCase()).filter(Boolean)));
    if (cleaned.length === 0) {
      return { success: false, added: 0, message: 'Tiada Jawatan yang sah ditemui.' };
    }
    const nextList = [...jawatanList];
    let added = 0;
    cleaned.forEach((j) => {
      if (!nextList.includes(j)) {
        nextList.push(j);
        added++;
      }
    });
    if (added > 0) {
      setJawatanList(nextList);
      syncMasterDataToFirestore({ jawatanList: nextList });
      logActivity({
        action_type: 'UPLOAD',
        module_name: 'Portal Admin',
        activity_description: `Bulk imported ${added} Jawatan records`,
        record_id: `${added} records`,
        status: 'SUCCESS',
      });
    }
    return { success: true, added };
  };

  // Peruntukan Fasa CRUD Functions (Super Admin or Page Peruntukan Edit Permission)
  const updateFasaPeruntukan = (
    fasaId: string,
    allocations: Record<string, OsAllocation>
  ): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('PERUNTUKAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk mengemaskini peruntukan fasa.' };
    }

    const nextList = fasaPeruntukanList.map((f) =>
      f.id === fasaId
        ? {
            ...f,
            tahun: getFasaYear(f),
            allocations,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : f
    );

    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList.map((item) => sanitizeData(item)) }, { merge: true }).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'master_data/peruntukan_fasa' });
      });
    } catch {}

    logActivity({
      action_type: 'UPDATE',
      module_name: 'Peruntukan',
      activity_description: `Updated Fasa Peruntukan allocations (${fasaId})`,
      record_id: fasaId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const addFasaPeruntukan = (namaFasa?: string, tahun?: number): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('PERUNTUKAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk menambah fasa peruntukan.' };
    }

    const targetYear = typeof tahun === 'number' && Number.isFinite(tahun) ? tahun : selectedFinanceYear;
    const sameYearCount = fasaPeruntukanList.filter((f) => getFasaYear(f) === targetYear).length;
    const nextNum = sameYearCount + 1;
    const newId = `fasa_${Date.now()}`;
    const newName = (namaFasa || `PERUNTUKAN FASA ${nextNum}`).toUpperCase();

    const initialAlloc: Record<string, OsAllocation> = {};
    sumberKewanganList.forEach((sk) => {
      initialAlloc[sk] = { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
    });

    const newFasa: FasaPeruntukanRecord = {
      id: newId,
      nama: newName,
      tahun: targetYear,
      allocations: initialAlloc,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const nextList = [...fasaPeruntukanList, newFasa];
    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList.map((item) => sanitizeData(item)) }, { merge: true }).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'master_data/peruntukan_fasa' });
      });
    } catch {}

    logActivity({
      action_type: 'CREATE',
      module_name: 'Peruntukan',
      activity_description: `Created new Fasa Peruntukan "${newName}" (${targetYear})`,
      record_id: newId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const deleteFasaPeruntukan = (fasaId: string): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('PERUNTUKAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk memadam fasa peruntukan.' };
    }

    const nextList = fasaPeruntukanList.filter((f) => f.id !== fasaId);
    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList.map((item) => sanitizeData(item)) }, { merge: true }).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'master_data/peruntukan_fasa' });
      });
    } catch {}

    logActivity({
      action_type: 'DELETE',
      module_name: 'Peruntukan',
      activity_description: `Deleted Fasa Peruntukan "${fasaId}"`,
      record_id: fasaId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  // Subwaran CRUD Functions (Super Admin or Page Subwaran Edit Permission)
  const addSubwaran = (
    record: Omit<SubwaranRecord, 'id'>
  ): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('SUBWARAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk mendaftar subwaran.' };
    }

    const newId = `sub-${Date.now()}`;
    const os21 = Number(record.os21000) || 0;
    const os24 = Number(record.os24000) || 0;
    const os27 = Number(record.os27000) || 0;
    const os29 = Number(record.os29000) || 0;
    const resolvedYear =
      record.tarikhSubWaran && /^\d{4}/.test(record.tarikhSubWaran)
        ? Number(record.tarikhSubWaran.slice(0, 4))
        : (typeof record.tahun === 'number' ? record.tahun : selectedFinanceYear);

    const newRecord: SubwaranRecord = {
      ...record,
      id: newId,
      tahun: resolvedYear,
      os21000: os21,
      os24000: os24,
      os27000: os27,
      os29000: os29,
      jumlah: os21 + os24 + os27 + os29,
      namaProgram: record.namaProgram.toUpperCase(),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    const nextList = [newRecord, ...subwaranList];
    setSubwaranList(nextList);
    try {
      localStorage.setItem(STORAGE_SUBWARAN, JSON.stringify(nextList));
      const docRef = doc(db, 'subwaran', newId);
      setDoc(docRef, sanitizeData(newRecord)).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.CREATE, path: `subwaran/${newId}` });
      });
    } catch {}

    logActivity({
      action_type: 'CREATE',
      module_name: 'Subwaran',
      activity_description: `Created subwaran "${newRecord.namaProgram}" for PTJ ${newRecord.namaPtj} (${resolvedYear}, RM ${formatRM(newRecord.jumlah)})`,
      record_id: newId,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const updateSubwaran = (
    id: string,
    updated: Partial<SubwaranRecord>
  ): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('SUBWARAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk mengemaskini subwaran.' };
    }

    let modified: SubwaranRecord | null = null;
    const nextList = subwaranList.map((s) => {
      if (s.id === id) {
        const os21 = updated.os21000 !== undefined ? Number(updated.os21000) : s.os21000;
        const os24 = updated.os24000 !== undefined ? Number(updated.os24000) : s.os24000;
        const os27 = updated.os27000 !== undefined ? Number(updated.os27000) : s.os27000;
        const os29 = updated.os29000 !== undefined ? Number(updated.os29000) : s.os29000;
        const nextTarikh = updated.tarikhSubWaran !== undefined ? updated.tarikhSubWaran : s.tarikhSubWaran;
        const resolvedYear =
          nextTarikh && /^\d{4}/.test(nextTarikh)
            ? Number(nextTarikh.slice(0, 4))
            : (updated.tahun ?? getSubwaranYear(s));
        const merged: SubwaranRecord = {
          ...s,
          ...updated,
          tahun: resolvedYear,
          os21000: os21,
          os24000: os24,
          os27000: os27,
          os29000: os29,
          jumlah: os21 + os24 + os27 + os29,
          namaProgram: updated.namaProgram !== undefined ? updated.namaProgram.toUpperCase() : s.namaProgram,
        };
        modified = merged;
        return merged;
      }
      return s;
    });

    setSubwaranList(nextList);
    try {
      localStorage.setItem(STORAGE_SUBWARAN, JSON.stringify(nextList));
      if (modified) {
        const docRef = doc(db, 'subwaran', id);
        updateDoc(docRef, sanitizeData(modified)).catch(() => {});
      }
    } catch {}

    logActivity({
      action_type: 'UPDATE',
      module_name: 'Subwaran',
      activity_description: `Updated subwaran record (${id})`,
      record_id: id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  const deleteSubwaran = (id: string): { success: boolean; message?: string } => {
    if (!currentUser || (!isSuperAdmin && !canEditPage('SUBWARAN'))) {
      return { success: false, message: 'Mod Paparan Sahaja: Kebenaran Edit diperlukan untuk memadam subwaran.' };
    }

    const nextList = subwaranList.filter((s) => s.id !== id);
    setSubwaranList(nextList);
    try {
      localStorage.setItem(STORAGE_SUBWARAN, JSON.stringify(nextList));
      const docRef = doc(db, 'subwaran', id);
      deleteDoc(docRef).catch(() => {});
    } catch {}

    logActivity({
      action_type: 'DELETE',
      module_name: 'Subwaran',
      activity_description: `Deleted subwaran record (${id})`,
      record_id: id,
      status: 'SUCCESS',
    });

    return { success: true };
  };

  // Update Budget Rates (Super Admin Only)
  const updateBudgetRates = (newRates: BudgetRatesConfig): { success: boolean; message?: string } => {
    if (!currentUser || !isSuperAdmin) {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengubah kadar RM seunit.' };
    }
    const sanitizedRates: BudgetRatesConfig = {
      makanMinum: {
        sarapan: Math.max(0, Number(newRates.makanMinum.sarapan) || 0),
        minumPagi: Math.max(0, Number(newRates.makanMinum.minumPagi) || 0),
        lunch: Math.max(0, Number(newRates.makanMinum.lunch) || 0),
        minumPetang: Math.max(0, Number(newRates.makanMinum.minumPetang) || 0),
        dinner: Math.max(0, Number(newRates.makanMinum.dinner) || 0),
      },
      dobi: {
        inapanIabi: Math.max(0, Number(newRates.dobi.inapanIabi) || 0),
        bestari: Math.max(0, Number(newRates.dobi.bestari) || 0),
        eksekutif: Math.max(0, Number(newRates.dobi.eksekutif) || 0),
        iabcu: Math.max(0, Number(newRates.dobi.iabcu) || 0),
        iabcswk: Math.max(0, Number(newRates.dobi.iabcswk) || 0),
        iabcsbh: Math.max(0, Number(newRates.dobi.iabcsbh) || 0),
      },
      updatedAt: new Date().toISOString().slice(0, 10),
      updatedBy: currentUser.name || currentUser.id,
    };
    setBudgetRates(sanitizedRates);
    syncMasterDataToFirestore({ budgetRates: sanitizedRates });
    logActivity({
      action_type: 'ADMIN_ACTION',
      module_name: 'Pengiraan Bajet',
      activity_description: `Updated system unit cost rates (Makan Minum & Dobi)`,
      record_id: 'budgetRates',
      status: 'SUCCESS',
    });
    return { success: true };
  };

  return (
    <ProgramContext.Provider
      value={{
        programs,
        filters,
        setFilter,
        resetFilters,
        filteredPrograms,
        selectedProgram,
        setSelectedProgram,
        isDetailOpen,
        setIsDetailOpen,
        isFormOpen,
        setIsFormOpen,
        isExportOpen,
        setIsExportOpen,
        programToEdit,
        setProgramToEdit,
        activeTab,
        setActiveTab,
        addProgram,
        updateProgram,
        deleteProgram,
        deleteMultiplePrograms,
        importPrograms,
        resetToDefaultData,
        group1Stats,
        group2Stats,
        financialStats,
        viewProgramDetail,
        currentUser,
        firebaseUser,
        authReady,
        isSuperAdmin,
        adminUsers,
        login,
        logout,
        createAdminUser,
        updateAdminUser,
        toggleAdminUserActive,
        deleteAdminUser,
        changeOwnPassword,
        updateOwnPhoto,
        updateOwnContactInfo,
        resetUserPassword,
        syncAdminUsersToFirebaseAuth,
        getPageAccessMode,
        getJabatanAccessMode,
        canEditPage,
        canEditJabatan,
        getEditableJabatans,
        getAuthorizedPusatList,
        getAuthorizedJabatanList,
        filterScope,
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
        selectedFinanceYear,
        setSelectedFinanceYear,
        availableFinanceYears,
        fasaPeruntukanList,
        updateFasaPeruntukan,
        addFasaPeruntukan,
        deleteFasaPeruntukan,
        subwaranList,
        addSubwaran,
        updateSubwaran,
        deleteSubwaran,
        budgetRates,
        updateBudgetRates,
        activityLogs,
        securityAlerts,
        sessionId,
        monitoringSettings,
        isRefreshingMonitoring,
        updateMonitoringSettings,
        refreshMonitoringLogs,
        logActivity,
        updateAlertStatus,
        firebaseStatus,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

export const useProgramContext = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgramContext must be used within a ProgramProvider');
  }
  return context;
};
