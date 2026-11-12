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
} from '../types/program';
import { formatRM } from '../utils/formatters';
import { INITIAL_PROGRAMS } from '../data/samplePrograms';
import {
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
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testFirestoreConnection } from '../firebase';

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
  activeTab: 'welcome' | 'dashboard' | 'bersepadu' | 'perincian' | 'admin' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki';
  setActiveTab: (tab: 'welcome' | 'dashboard' | 'bersepadu' | 'perincian' | 'admin' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki') => void;

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

  // Auth & Admin Management
  currentUser: AdminUser | null;
  adminUsers: AdminUser[];
  login: (id: string, pass: string) => { success: boolean; message?: string };
  logout: () => void;
  createAdminUser: (user: Omit<AdminUser, 'createdAt'>) => { success: boolean; message?: string };
  updateAdminUser: (id: string, updated: Partial<AdminUser>) => { success: boolean; message?: string };
  deleteAdminUser: (id: string) => { success: boolean; message?: string };

  // Master Data
  pusatList: string[];
  jabatanMap: Record<string, string[]>;
  pegawaiList: Pegawai[];
  sumberKewanganList: string[];
  statusProgramList: string[];
  jawatanList: string[];

  // Master Data Mutations
  addPegawai: (pegawai: Pegawai) => void;
  updatePegawai: (id: string, updated: Partial<Pegawai>) => void;
  deletePegawai: (id: string) => void;

  addPusat: (namaPusat: string) => void;
  updatePusat: (oldPusat: string, newPusat: string) => void;
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

  // Page Peruntukan (Super Admin)
  fasaPeruntukanList: FasaPeruntukanRecord[];
  updateFasaPeruntukan: (fasaId: string, allocations: Record<string, OsAllocation>) => { success: boolean; message?: string };
  addFasaPeruntukan: (namaFasa?: string) => { success: boolean; message?: string };
  deleteFasaPeruntukan: (fasaId: string) => { success: boolean; message?: string };

  // Page Subwaran (Super Admin)
  subwaranList: SubwaranRecord[];
  addSubwaran: (record: Omit<SubwaranRecord, 'id'>) => { success: boolean; message?: string };
  updateSubwaran: (id: string, record: Partial<SubwaranRecord>) => { success: boolean; message?: string };
  deleteSubwaran: (id: string) => { success: boolean; message?: string };

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
  tahun: '',
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
    createdAt: '2026-01-01',
  },
  {
    id: 'ADMIN_JPSM',
    password: 'AMAN',
    name: 'Admin Sistem Maklumat',
    role: 'ADMIN',
    pusat: 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI',
    jabatan: 'JABATAN PENGURUSAN SISTEM MAKLUMAT',
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

  // 3. Current logged-in user
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_SESSION);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null;
  });

  // 4. Master Data state
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

  // UI States
  const [filters, setFilters] = useState<ProgramFilterState>(defaultFilters);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ProgramItem | null>(null);
  const [activeTab, setActiveTab] = useState<'welcome' | 'dashboard' | 'bersepadu' | 'perincian' | 'admin' | 'peruntukan' | 'perbelanjaan' | 'subwaran' | 'baki'>('welcome');

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
      localStorage.setItem(STORAGE_MASTER + '_pusat', JSON.stringify(pusatList));
      localStorage.setItem(STORAGE_MASTER + '_jabatan', JSON.stringify(jabatanMap));
      localStorage.setItem(STORAGE_MASTER + '_pegawai', JSON.stringify(pegawaiList));
      localStorage.setItem(STORAGE_MASTER + '_sumber', JSON.stringify(sumberKewanganList));
      localStorage.setItem(STORAGE_MASTER + '_status', JSON.stringify(statusProgramList));
      localStorage.setItem(STORAGE_MASTER + '_jawatan', JSON.stringify(jawatanList));
    } catch {}
  }, [pusatList, jabatanMap, pegawaiList, sumberKewanganList, statusProgramList, jawatanList]);

  // Firebase Firestore Connection & Real-Time Listeners
  useEffect(() => {
    let unsubscribePrograms = () => {};
    let unsubscribePegawai = () => {};
    let unsubscribeAdmins = () => {};
    let unsubscribeMaster = () => {};

    const setupFirebaseSync = async () => {
      try {
        const isConnected = await testFirestoreConnection();
        if (!isConnected) {
          setFirebaseStatus('offline');
          return;
        }
        setFirebaseStatus('connected');

        // 1. Live Programs Listener (Tiada data contoh asal)
        const programsCol = collection(db, 'programs');
        unsubscribePrograms = onSnapshot(
          programsCol,
          async (snapshot) => {
            if (snapshot.empty) {
              setPrograms([]);
              try {
                localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify([]));
              } catch {}
            } else {
              const loaded: ProgramItem[] = [];
              const staleSampleDocs: string[] = [];
              snapshot.forEach((docSnap) => {
                const data = docSnap.data() as ProgramItem;
                // Double protection: ignore any residual sample prog IDs
                if (docSnap.id.match(/^prog-0\d\d$/)) {
                  staleSampleDocs.push(docSnap.id);
                  return;
                }
                loaded.push(
                  sanitizeProgramExpenditure({
                    ...data,
                    id: docSnap.id,
                  })
                );
              });

              // Clean up any stale sample documents if found
              if (staleSampleDocs.length > 0) {
                try {
                  const cleanupBatch = writeBatch(db);
                  staleSampleDocs.forEach((docId) => {
                    cleanupBatch.delete(doc(db, 'programs', docId));
                  });
                  await cleanupBatch.commit();
                } catch {}
              }

              setPrograms(loaded);
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.LIST, path: 'programs' });
          }
        );

        // 2. Live Pegawai Listener & Seeding
        const pegawaiCol = collection(db, 'pegawai');
        unsubscribePegawai = onSnapshot(
          pegawaiCol,
          async (snapshot) => {
            if (snapshot.empty && !isInitialSyncDone.current) {
              try {
                const batch = writeBatch(db);
                PEGAWAI_LIST.forEach((peg) => {
                  const docRef = doc(db, 'pegawai', peg.id);
                  batch.set(docRef, sanitizeData(peg));
                });
                await batch.commit();
              } catch (e) {
                handleFirestoreError(e, { operation: OperationType.CREATE, path: 'pegawai' });
              }
            } else if (!snapshot.empty) {
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

        // 3. Live Admins Listener & Seeding
        const adminsCol = collection(db, 'admins');
        unsubscribeAdmins = onSnapshot(
          adminsCol,
          async (snapshot) => {
            if (snapshot.empty && !isInitialSyncDone.current) {
              try {
                const batch = writeBatch(db);
                INITIAL_ADMIN_USERS.forEach((admin) => {
                  const docRef = doc(db, 'admins', admin.id);
                  batch.set(docRef, sanitizeData(admin));
                });
                await batch.commit();
              } catch (e) {
                handleFirestoreError(e, { operation: OperationType.CREATE, path: 'admins' });
              }
            } else if (!snapshot.empty) {
              const loaded: AdminUser[] = [];
              snapshot.forEach((docSnap) => {
                loaded.push(docSnap.data() as AdminUser);
              });
              // Ensure AMAN is always present
              if (!loaded.some((u) => u.id.toUpperCase() === 'AMAN')) {
                loaded.unshift(INITIAL_ADMIN_USERS[0]);
              }
              setAdminUsers(loaded);
            }
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.LIST, path: 'admins' });
          }
        );

        // 4. Live Master Data Listener & Seeding
        const masterDocRef = doc(db, 'master_data', 'settings');
        unsubscribeMaster = onSnapshot(
          masterDocRef,
          async (snapshot) => {
            if (!snapshot.exists() && !isInitialSyncDone.current) {
              try {
                await setDoc(masterDocRef, {
                  pusatList: PUSAT_LIST,
                  jabatanMap: JABATAN_MAP,
                  sumberKewanganList: SUMBER_KEWANGAN_LIST,
                  statusProgramList: STATUS_PROGRAM_LIST,
                });
              } catch (e) {
                handleFirestoreError(e, { operation: OperationType.CREATE, path: 'master_data/settings' });
              }
            } else if (snapshot.exists()) {
              const data = snapshot.data();
              if (data?.pusatList) setPusatList(data.pusatList);
              if (data?.jabatanMap) setJabatanMap(sanitizeJabatanMap(data.jabatanMap));
              if (data?.sumberKewanganList) setSumberKewanganList(data.sumberKewanganList);
              if (data?.statusProgramList) setStatusProgramList(data.statusProgramList);
            }
            isInitialSyncDone.current = true;
          },
          (error) => {
            handleFirestoreError(error, { operation: OperationType.READ, path: 'master_data/settings' });
          }
        );
      } catch (err) {
        console.warn('Firebase setup notice:', err);
        setFirebaseStatus('offline');
      }
    };

    setupFirebaseSync();

    return () => {
      unsubscribePrograms();
      unsubscribePegawai();
      unsubscribeAdmins();
      unsubscribeMaster();
    };
  }, []);

  // Helper to persist master data updates to Firestore
  const syncMasterDataToFirestore = async (updates: Partial<{
    pusatList: string[];
    jabatanMap: Record<string, string[]>;
    sumberKewanganList: string[];
    statusProgramList: string[];
    jawatanList: string[];
  }>) => {
    try {
      const docRef = doc(db, 'master_data', 'settings');
      await setDoc(docRef, updates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, { operation: OperationType.UPDATE, path: 'master_data/settings' });
    }
  };

  // Auth functions
  const login = (id: string, pass: string): { success: boolean; message?: string } => {
    const cleanId = id.trim().toUpperCase();
    const cleanPass = pass.trim();

    const user = adminUsers.find(
      (u) => u.id.toUpperCase() === cleanId && u.password === cleanPass
    );

    if (user) {
      setCurrentUser(user);
      return { success: true };
    }

    // Fallback for default AMAN
    if (cleanId === 'AMAN' && cleanPass === 'AMAN') {
      const amanUser: AdminUser = {
        id: 'AMAN',
        password: 'AMAN',
        name: 'Super Admin AMAN',
        role: 'SUPER_ADMIN',
        createdAt: '2026-01-01',
      };
      setCurrentUser(amanUser);
      return { success: true };
    }

    return {
      success: false,
      message: 'ID Pengguna atau Kata Laluan tidak sah. Sila cuba lagi.',
    };
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(STORAGE_SESSION);
    setActiveTab('dashboard');
  };

  const createAdminUser = (
    userData: Omit<AdminUser, 'createdAt'>
  ): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan mencipta ID Admin.' };
    }

    const cleanId = userData.id.trim().toUpperCase();
    if (adminUsers.some((u) => u.id.toUpperCase() === cleanId)) {
      return { success: false, message: `ID Admin "${cleanId}" telah wujud. Sila pilih ID lain.` };
    }

    const newUser: AdminUser = {
      ...userData,
      id: cleanId,
      name: userData.name.trim(),
      role: 'ADMIN',
      createdAt: new Date().toISOString().slice(0, 10),
    };

    setAdminUsers((prev) => [...prev, newUser]);

    // Persist to Firebase Firestore
    setDoc(doc(db, 'admins', cleanId), sanitizeData(newUser)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.CREATE, path: `admins/${cleanId}` });
    });

    return { success: true };
  };

  const updateAdminUser = (
    id: string,
    updated: Partial<AdminUser>
  ): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengemaskini ID Admin.' };
    }

    const target = adminUsers.find((u) => u.id === id);
    if (!target) {
      return { success: false, message: 'Akaun admin tidak ditemui.' };
    }

    let modifiedUser: AdminUser | null = null;
    setAdminUsers((prev) =>
      prev.map((u) => {
        if (u.id === id) {
          const merged: AdminUser = {
            ...u,
            ...updated,
            name: updated.name !== undefined ? updated.name.trim() : u.name,
            password: updated.password !== undefined ? updated.password.trim() : u.password,
            pusat: updated.pusat !== undefined ? updated.pusat : u.pusat,
            jabatan: updated.jabatan !== undefined ? updated.jabatan : u.jabatan,
            allowedJabatans: updated.allowedJabatans !== undefined ? updated.allowedJabatans : u.allowedJabatans,
            allowedPages: updated.allowedPages !== undefined ? updated.allowedPages : u.allowedPages,
          };
          modifiedUser = merged;
          return merged;
        }
        return u;
      })
    );

    if (currentUser.id === id && modifiedUser) {
      setCurrentUser(modifiedUser);
    }

    if (modifiedUser) {
      setDoc(doc(db, 'admins', id), sanitizeData(modifiedUser), { merge: true }).catch((err) => {
        handleFirestoreError(err, { operation: OperationType.UPDATE, path: `admins/${id}` });
      });
    }

    return { success: true };
  };

  const deleteAdminUser = (userId: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan memadam ID Admin.' };
    }
    if (userId.toUpperCase() === 'AMAN') {
      return { success: false, message: 'Super Admin AMAN tidak boleh dipadamkan.' };
    }

    setAdminUsers((prev) => prev.filter((u) => u.id !== userId));

    // Delete in Firestore
    deleteDoc(doc(db, 'admins', userId)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `admins/${userId}` });
    });

    return { success: true };
  };

  // Filter handlers
  const setFilter = (key: keyof ProgramFilterState, value: string) => {
    setFilters((prev) => {
      const updated = { ...prev, [key]: value };

      if (key === 'pusat' && value) {
        const allowedJabatan = jabatanMap[value] || [];
        if (prev.jabatan && !allowedJabatan.includes(prev.jabatan)) {
          updated.jabatan = '';
        }
      }

      if (key === 'pengurus' && value) {
        if (prev.pengurusBersama === value) {
          updated.pengurusBersama = '';
        }
      }

      return updated;
    });
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
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
      if (filters.tahun && p.tahun.toString() !== filters.tahun) return false;
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
          p.pusat,
          p.jabatan,
          p.sumberKewangan,
          p.catatan || '',
        ].join(' ').toLowerCase();

        if (!searchPool.includes(q)) return false;
      }

      return true;
    });
  }, [programs, filters]);

  // Flash Card Group 1 Stats
  const group1Stats = useMemo<FlashCardGroup1Stats>(() => {
    const uniqueJenis = new Set<string>();
    const uniqueSumber = new Set<string>();
    let totalPeserta = 0;
    let totalHari = 0;

    filteredPrograms.forEach((p) => {
      if (p.jenisProgram) uniqueJenis.add(p.jenisProgram);
      if (p.sumberKewangan) uniqueSumber.add(p.sumberKewangan);
      totalPeserta += Number(p.bilanganPeserta) || 0;
      totalHari += Number(p.jumlahHari) || 0;
    });

    const bilanganProgram = filteredPrograms.length;
    const purataPeserta = bilanganProgram > 0 ? Math.round(totalPeserta / bilanganProgram) : 0;

    return {
      bilanganProgram,
      bilanganJenisProgram: uniqueJenis.size,
      jumlahPeserta: totalPeserta,
      bilanganSumberKewangan: uniqueSumber.size,
      jumlahHariProgram: totalHari,
      purataPeserta,
    };
  }, [filteredPrograms]);

  // Flash Card Group 2 Stats
  const group2Stats = useMemo<FlashCardGroup2Stats>(() => {
    let selesai = 0;
    let dalamTindakan = 0;
    let tanggung = 0;
    let belumAmbilTindakan = 0;
    let batal = 0;

    filteredPrograms.forEach((p) => {
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
  }, [filteredPrograms]);

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

    filteredPrograms.forEach((p) => {
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
  }, [filteredPrograms]);

  const viewProgramDetail = (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setIsDetailOpen(true);
  };

  // CRUD Program with RBAC validation & Firestore sync
  const addProgram = (data: Omit<ProgramItem, 'id'>): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk ke akaun Admin untuk menambah program.' };
    }

    if (currentUser.role === 'ADMIN' && currentUser.jabatan) {
      if (data.jabatan !== currentUser.jabatan) {
        return {
          success: false,
          message: `Anda hanya dibenarkan menambah program di bawah jabatan anda: ${currentUser.jabatan}`,
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
    if ((targetStatus === 'SELESAI' || targetStatus === 'TANGGUNG') && currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Akses ditolak. Program berstatus SELESAI dan TANGGUNG hanya boleh dikemaskini oleh Super Admin sahaja.',
      };
    }

    if (currentUser.role === 'ADMIN') {
      const allowed = currentUser.allowedJabatans || (currentUser.jabatan ? [currentUser.jabatan] : []);
      const hasPermission =
        allowed.length === 0 ||
        allowed.includes('SEMUA JABATAN') ||
        allowed.includes(target.jabatan);

      if (!hasPermission) {
        return {
          success: false,
          message: `Anda hanya boleh mengemaskini program di bawah jabatan yang diberi akses kepada anda: ${allowed.join(', ')}`,
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
    }

    return { success: true };
  };

  const deleteProgram = (id: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return {
        success: false,
        message: 'Akses ditolak. Super Admin sahaja yang dibenarkan memadam program.',
      };
    }

    setPrograms((prev) => prev.filter((p) => p.id !== id));
    if (selectedProgram?.id === id) {
      setSelectedProgram(null);
      setIsDetailOpen(false);
    }

    deleteDoc(doc(db, 'programs', id)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `programs/${id}` });
    });

    return { success: true };
  };

  const deleteMultiplePrograms = (ids: string[]): { success: boolean; message?: string; count?: number } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
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

    return { success: true, count: sanitized.length };
  };

  const resetToDefaultData = () => {
    setPrograms(INITIAL_PROGRAMS);
    setPusatList(PUSAT_LIST);
    setJabatanMap(JABATAN_MAP);
    setPegawaiList(PEGAWAI_LIST);
    setSumberKewanganList(SUMBER_KEWANGAN_LIST);
    setStatusProgramList(STATUS_PROGRAM_LIST);
    setJawatanList(DEFAULT_JAWATAN_LIST);
    setFasaPeruntukanList(INITIAL_FASA_PERUNTUKAN);
    setSubwaranList(INITIAL_SUBWARAN);
    localStorage.removeItem(STORAGE_PROGRAMS);
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
        pusatList: PUSAT_LIST,
        jabatanMap: JABATAN_MAP,
        sumberKewanganList: SUMBER_KEWANGAN_LIST,
        statusProgramList: STATUS_PROGRAM_LIST,
        jawatanList: DEFAULT_JAWATAN_LIST,
      });
    } catch {}
  };

  // Master Data CRUD functions (Super Admin Only)
  const addPegawai = (peg: Pegawai) => {
    setPegawaiList((prev) => [...prev, peg]);
    setDoc(doc(db, 'pegawai', peg.id), sanitizeData(peg)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.CREATE, path: `pegawai/${peg.id}` });
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
  };

  const deletePegawai = (id: string) => {
    const pegToDelete = pegawaiList.find((p) => p.id === id);
    setPegawaiList((prev) => prev.filter((p) => p.id !== id));
    deleteDoc(doc(db, 'pegawai', id)).catch((err) => {
      handleFirestoreError(err, { operation: OperationType.DELETE, path: `pegawai/${id}` });
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

  const addPusat = (namaPusat: string) => {
    const trimmed = namaPusat.trim().toUpperCase();
    if (!trimmed || pusatList.includes(trimmed)) return;
    const nextList = [...pusatList, trimmed];
    const nextMap = { ...jabatanMap, [trimmed]: [] };
    setPusatList(nextList);
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ pusatList: nextList, jabatanMap: nextMap });
  };

  const updatePusat = (oldPusat: string, newPusat: string) => {
    const trimmed = newPusat.trim().toUpperCase();
    if (!trimmed || oldPusat === trimmed) return;
    const nextList = pusatList.map((p) => (p === oldPusat ? trimmed : p));
    const nextMap = { ...jabatanMap };
    const jabatans = nextMap[oldPusat] || [];
    delete nextMap[oldPusat];
    nextMap[trimmed] = jabatans;
    setPusatList(nextList);
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ pusatList: nextList, jabatanMap: nextMap });

    // Update existing programs
    setPrograms((prev) =>
      prev.map((p) => (p.pusat === oldPusat ? { ...p, pusat: trimmed } : p))
    );
  };

  const deletePusat = (pusat: string) => {
    const nextList = pusatList.filter((p) => p !== pusat);
    const nextMap = { ...jabatanMap };
    delete nextMap[pusat];
    setPusatList(nextList);
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ pusatList: nextList, jabatanMap: nextMap });
  };

  const addJabatan = (pusat: string, namaJabatan: string) => {
    const trimmed = namaJabatan.trim().toUpperCase();
    if (!trimmed) return;
    const existing = jabatanMap[pusat] || [];
    if (existing.includes(trimmed)) return;
    const nextMap = { ...jabatanMap, [pusat]: [...existing, trimmed] };
    setJabatanMap(nextMap);
    syncMasterDataToFirestore({ jabatanMap: nextMap });
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
  };

  const addSumberKewangan = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || sumberKewanganList.includes(trimmed)) return;
    const nextList = [...sumberKewanganList, trimmed];
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });
  };

  const updateSumberKewangan = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = sumberKewanganList.map((s) => (s === oldNama ? trimmed : s));
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });

    setPrograms((prev) =>
      prev.map((p) => (p.sumberKewangan === oldNama ? { ...p, sumberKewangan: trimmed } : p))
    );
  };

  const deleteSumberKewangan = (nama: string) => {
    const nextList = sumberKewanganList.filter((s) => s !== nama);
    setSumberKewanganList(nextList);
    syncMasterDataToFirestore({ sumberKewanganList: nextList });
  };

  const addStatusProgram = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || statusProgramList.includes(trimmed)) return;
    const nextList = [...statusProgramList, trimmed];
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });
  };

  const updateStatusProgram = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = statusProgramList.map((s) => (s === oldNama ? trimmed : s));
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });

    setPrograms((prev) =>
      prev.map((p) => (p.statusProgram === oldNama ? { ...p, statusProgram: trimmed } : p))
    );
  };

  const deleteStatusProgram = (nama: string) => {
    const nextList = statusProgramList.filter((s) => s !== nama);
    setStatusProgramList(nextList);
    syncMasterDataToFirestore({ statusProgramList: nextList });
  };

  const addJawatan = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || jawatanList.includes(trimmed)) return;
    const nextList = [...jawatanList, trimmed];
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });
  };

  const updateJawatan = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    const nextList = jawatanList.map((j) => (j === oldNama ? trimmed : j));
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });

    setPegawaiList((prev) =>
      prev.map((p) => (p.jawatan === oldNama ? { ...p, jawatan: trimmed } : p))
    );
  };

  const deleteJawatan = (nama: string) => {
    const nextList = jawatanList.filter((j) => j !== nama);
    setJawatanList(nextList);
    syncMasterDataToFirestore({ jawatanList: nextList });
  };

  // Peruntukan Fasa CRUD Functions (Super Admin Only)
  const updateFasaPeruntukan = (
    fasaId: string,
    allocations: Record<string, OsAllocation>
  ): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengemaskini peruntukan fasa.' };
    }

    const nextList = fasaPeruntukanList.map((f) =>
      f.id === fasaId
        ? {
            ...f,
            allocations,
            updatedAt: new Date().toISOString().slice(0, 10),
          }
        : f
    );

    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList }, { merge: true }).catch(() => {});
    } catch {}

    return { success: true };
  };

  const addFasaPeruntukan = (namaFasa?: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan menambah fasa peruntukan.' };
    }

    const nextNum = fasaPeruntukanList.length + 1;
    const newId = `fasa_${Date.now()}`;
    const newName = (namaFasa || `PERUNTUKAN FASA ${nextNum}`).toUpperCase();

    const initialAlloc: Record<string, OsAllocation> = {};
    sumberKewanganList.forEach((sk) => {
      initialAlloc[sk] = { os21000: 0, os24000: 0, os27000: 0, os29000: 0 };
    });

    const newFasa: FasaPeruntukanRecord = {
      id: newId,
      nama: newName,
      allocations: initialAlloc,
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    const nextList = [...fasaPeruntukanList, newFasa];
    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList }, { merge: true }).catch(() => {});
    } catch {}

    return { success: true };
  };

  const deleteFasaPeruntukan = (fasaId: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan memadam fasa peruntukan.' };
    }

    const nextList = fasaPeruntukanList.filter((f) => f.id !== fasaId);
    setFasaPeruntukanList(nextList);
    try {
      localStorage.setItem(STORAGE_PERUNTUKAN_FASA, JSON.stringify(nextList));
      const docRef = doc(db, 'master_data', 'peruntukan_fasa');
      setDoc(docRef, { list: nextList }, { merge: true }).catch(() => {});
    } catch {}

    return { success: true };
  };

  // Subwaran CRUD Functions (Super Admin Only)
  const addSubwaran = (
    record: Omit<SubwaranRecord, 'id'>
  ): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan mendaftar subwaran.' };
    }

    const newId = `sub-${Date.now()}`;
    const os21 = Number(record.os21000) || 0;
    const os24 = Number(record.os24000) || 0;
    const os27 = Number(record.os27000) || 0;
    const os29 = Number(record.os29000) || 0;

    const newRecord: SubwaranRecord = {
      ...record,
      id: newId,
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
      setDoc(docRef, sanitizeData(newRecord)).catch(() => {});
    } catch {}

    return { success: true };
  };

  const updateSubwaran = (
    id: string,
    updated: Partial<SubwaranRecord>
  ): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan mengemaskini subwaran.' };
    }

    let modified: SubwaranRecord | null = null;
    const nextList = subwaranList.map((s) => {
      if (s.id === id) {
        const os21 = updated.os21000 !== undefined ? Number(updated.os21000) : s.os21000;
        const os24 = updated.os24000 !== undefined ? Number(updated.os24000) : s.os24000;
        const os27 = updated.os27000 !== undefined ? Number(updated.os27000) : s.os27000;
        const os29 = updated.os29000 !== undefined ? Number(updated.os29000) : s.os29000;
        const merged: SubwaranRecord = {
          ...s,
          ...updated,
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

    return { success: true };
  };

  const deleteSubwaran = (id: string): { success: boolean; message?: string } => {
    if (!currentUser || currentUser.role !== 'SUPER_ADMIN') {
      return { success: false, message: 'Hanya Super Admin dibenarkan memadam subwaran.' };
    }

    const nextList = subwaranList.filter((s) => s.id !== id);
    setSubwaranList(nextList);
    try {
      localStorage.setItem(STORAGE_SUBWARAN, JSON.stringify(nextList));
      const docRef = doc(db, 'subwaran', id);
      deleteDoc(docRef).catch(() => {});
    } catch {}

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
        adminUsers,
        login,
        logout,
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
        fasaPeruntukanList,
        updateFasaPeruntukan,
        addFasaPeruntukan,
        deleteFasaPeruntukan,
        subwaranList,
        addSubwaran,
        updateSubwaran,
        deleteSubwaran,
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
