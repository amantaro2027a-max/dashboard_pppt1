import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  AdminUser,
  FinancialSectionStats,
  Pegawai,
  ProgramFilterState,
  ProgramItem,
} from '../types/program';
import { INITIAL_PROGRAMS } from '../data/samplePrograms';
import {
  PUSAT_LIST,
  JABATAN_MAP,
  PEGAWAI_LIST,
  SUMBER_KEWANGAN_LIST,
  STATUS_PROGRAM_LIST,
} from '../data/constants';

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
  activeTab: 'dashboard' | 'perincian' | 'admin';
  setActiveTab: (tab: 'dashboard' | 'perincian' | 'admin') => void;

  // Program CRUD
  addProgram: (data: Omit<ProgramItem, 'id'>) => { success: boolean; message?: string };
  updateProgram: (id: string, data: Partial<ProgramItem>) => { success: boolean; message?: string };
  deleteProgram: (id: string) => { success: boolean; message?: string };
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
  deleteAdminUser: (id: string) => { success: boolean; message?: string };

  // Master Data
  pusatList: string[];
  jabatanMap: Record<string, string[]>;
  pegawaiList: Pegawai[];
  sumberKewanganList: string[];
  statusProgramList: string[];

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

const ProgramContext = createContext<ProgramContextType | undefined>(undefined);

export const ProgramProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Programs state
  const [programs, setPrograms] = useState<ProgramItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROGRAMS);
      if (saved) {
        const parsed: ProgramItem[] = JSON.parse(saved);
        return parsed.map((item) => ({
          ...item,
          namaProgram: (item.namaProgram || '').toUpperCase(),
        }));
      }
    } catch {
      // fallback
    }
    return INITIAL_PROGRAMS;
  });

  // 2. Admin Users state
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ADMINS);
      if (saved) {
        const parsed: AdminUser[] = JSON.parse(saved);
        // Ensure Super Admin AMAN always exists
        const hasAman = parsed.some((u) => u.id.toUpperCase() === 'AMAN');
        if (hasAman) return parsed;
        return [...INITIAL_ADMIN_USERS, ...parsed];
      }
    } catch {
      // fallback
    }
    return INITIAL_ADMIN_USERS;
  });

  // 3. Current logged-in user
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_SESSION);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
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

  const [jabatanMap, setJabatanMap] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_jabatan');
      if (saved) return JSON.parse(saved);
    } catch {}
    return JABATAN_MAP;
  });

  const [pegawaiList, setPegawaiList] = useState<Pegawai[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_MASTER + '_pegawai');
      if (saved) {
        const parsed: Pegawai[] = JSON.parse(saved);
        return parsed.map((p) => {
          const matchDefault = PEGAWAI_LIST.find((def) => def.id === p.id);
          return {
            ...p,
            pusat: p.pusat || matchDefault?.pusat || PUSAT_LIST[0],
            jabatan:
              p.jabatan ||
              matchDefault?.jabatan ||
              (JABATAN_MAP[PUSAT_LIST[0]] && JABATAN_MAP[PUSAT_LIST[0]][0]) ||
              '',
            jawatan: p.jawatan || matchDefault?.jawatan || 'Pegawai Pengurusan',
            emel:
              p.emel ||
              matchDefault?.emel ||
              `${p.id.toLowerCase().replace(/\s+/g, '')}@iab.edu.my`,
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

  // UI States
  const [filters, setFilters] = useState<ProgramFilterState>(defaultFilters);
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ProgramItem | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'perincian' | 'admin'>('dashboard');

  // Persistence effects
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROGRAMS, JSON.stringify(programs));
    } catch (e) {
      console.error('Failed to save programs', e);
    }
  }, [programs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ADMINS, JSON.stringify(adminUsers));
    } catch (e) {
      console.error('Failed to save admins', e);
    }
  }, [adminUsers]);

  useEffect(() => {
    try {
      if (currentUser) {
        sessionStorage.setItem(STORAGE_SESSION, JSON.stringify(currentUser));
      } else {
        sessionStorage.removeItem(STORAGE_SESSION);
      }
    } catch (e) {
      console.error('Failed to save session', e);
    }
  }, [currentUser]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_MASTER + '_pusat', JSON.stringify(pusatList));
      localStorage.setItem(STORAGE_MASTER + '_jabatan', JSON.stringify(jabatanMap));
      localStorage.setItem(STORAGE_MASTER + '_pegawai', JSON.stringify(pegawaiList));
      localStorage.setItem(STORAGE_MASTER + '_sumber', JSON.stringify(sumberKewanganList));
      localStorage.setItem(STORAGE_MASTER + '_status', JSON.stringify(statusProgramList));
    } catch (e) {
      console.error('Failed to save master data', e);
    }
  }, [pusatList, jabatanMap, pegawaiList, sumberKewanganList, statusProgramList]);

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

    // Special fallback for AMAN
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

  // Operational metrics
  const group1Stats = useMemo<FlashCardGroup1Stats>(() => {
    const uniqueJenis = new Set<string>();
    const uniqueSumber = new Set<string>();
    let totalPeserta = 0;
    let totalHari = 0;

    filteredPrograms.forEach((p) => {
      uniqueJenis.add(p.jenisProgram);
      uniqueSumber.add(p.sumberKewangan);
      totalPeserta += Number(p.bilanganPeserta) || 0;
      totalHari += Number(p.jumlahHari) || 1;
    });

    const purata =
      filteredPrograms.length > 0 ? Math.round(totalPeserta / filteredPrograms.length) : 0;

    return {
      bilanganProgram: filteredPrograms.length,
      bilanganJenisProgram: uniqueJenis.size,
      jumlahPeserta: totalPeserta,
      bilanganSumberKewangan: uniqueSumber.size,
      jumlahHariProgram: totalHari,
      purataPeserta: purata,
    };
  }, [filteredPrograms]);

  // Status Metrics
  const group2Stats = useMemo<FlashCardGroup2Stats>(() => {
    let selesai = 0;
    let dalamTindakan = 0;
    let tanggung = 0;
    let belumAmbilTindakan = 0;
    let batal = 0;

    filteredPrograms.forEach((p) => {
      switch (p.statusProgram) {
        case 'SELESAI':
          selesai += 1;
          break;
        case 'DALAM TINDAKAN':
          dalamTindakan += 1;
          break;
        case 'TANGGUNG':
          tanggung += 1;
          break;
        case 'BELUM AMBIL TINDAKAN':
          belumAmbilTindakan += 1;
          break;
        case 'BATAL':
          batal += 1;
          break;
      }
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
    let d21 = 0, d24 = 0, d27 = 0, d29 = 0, dTotal = 0;
    let b21 = 0, b24 = 0, b27 = 0, b29 = 0, bTotal = 0;

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

      if (bel21 === undefined || bel24 === undefined || bel27 === undefined || bel29 === undefined) {
        let factor = 0;
        if (p.statusProgram === 'SELESAI') factor = 0.94;
        else if (p.statusProgram === 'DALAM TINDAKAN') factor = 0.65;
        else if (p.statusProgram === 'TANGGUNG') factor = 0.15;
        else factor = 0;

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

  // CRUD Program with RBAC validation
  const addProgram = (data: Omit<ProgramItem, 'id'>): { success: boolean; message?: string } => {
    if (!currentUser) {
      return { success: false, message: 'Sila log masuk ke akaun Admin untuk menambah program.' };
    }

    // If sub-admin, check Jabatan
    if (currentUser.role === 'ADMIN' && currentUser.jabatan) {
      if (data.jabatan !== currentUser.jabatan) {
        return {
          success: false,
          message: `Anda hanya dibenarkan menambah program di bawah jabatan anda: ${currentUser.jabatan}`,
        };
      }
    }

    const newId = `prog-${Date.now()}`;
    const newProg: ProgramItem = {
      ...data,
      namaProgram: data.namaProgram.toUpperCase(),
      kodProgram: data.kodProgram.toUpperCase(),
      id: newId,
    };
    setPrograms((prev) => [newProg, ...prev]);
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

    // Sub-admin can only edit their own assigned Jabatan
    if (currentUser.role === 'ADMIN' && currentUser.jabatan) {
      if (target.jabatan !== currentUser.jabatan) {
        return {
          success: false,
          message: `Anda hanya boleh mengemaskini program di bawah jabatan anda: ${currentUser.jabatan}`,
        };
      }
    }

    setPrograms((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const updated = {
            ...p,
            ...data,
            namaProgram: data.namaProgram !== undefined ? data.namaProgram.toUpperCase() : p.namaProgram,
            kodProgram: data.kodProgram !== undefined ? data.kodProgram.toUpperCase() : p.kodProgram,
          };
          if (
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
          return updated;
        }
        return p;
      })
    );
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
    return { success: true };
  };

  const resetToDefaultData = () => {
    setPrograms(INITIAL_PROGRAMS);
    setPusatList(PUSAT_LIST);
    setJabatanMap(JABATAN_MAP);
    setPegawaiList(PEGAWAI_LIST);
    setSumberKewanganList(SUMBER_KEWANGAN_LIST);
    setStatusProgramList(STATUS_PROGRAM_LIST);
    localStorage.removeItem(STORAGE_PROGRAMS);
    localStorage.removeItem(STORAGE_MASTER + '_pusat');
    localStorage.removeItem(STORAGE_MASTER + '_jabatan');
    localStorage.removeItem(STORAGE_MASTER + '_pegawai');
    localStorage.removeItem(STORAGE_MASTER + '_sumber');
    localStorage.removeItem(STORAGE_MASTER + '_status');
    resetFilters();
  };

  // Master Data CRUD functions (Super Admin Only)
  const addPegawai = (peg: Pegawai) => {
    setPegawaiList((prev) => [...prev, peg]);
  };

  const updatePegawai = (id: string, updated: Partial<Pegawai>) => {
    setPegawaiList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updated, label: `${p.id} (${updated.nama || p.nama})` } : p))
    );
  };

  const deletePegawai = (id: string) => {
    setPegawaiList((prev) => prev.filter((p) => p.id !== id));
  };

  const addPusat = (namaPusat: string) => {
    const trimmed = namaPusat.trim().toUpperCase();
    if (!trimmed || pusatList.includes(trimmed)) return;
    setPusatList((prev) => [...prev, trimmed]);
    setJabatanMap((prev) => ({ ...prev, [trimmed]: [] }));
  };

  const updatePusat = (oldPusat: string, newPusat: string) => {
    const trimmed = newPusat.trim().toUpperCase();
    if (!trimmed || oldPusat === trimmed) return;
    setPusatList((prev) => prev.map((p) => (p === oldPusat ? trimmed : p)));
    setJabatanMap((prev) => {
      const updated = { ...prev };
      const jabatans = updated[oldPusat] || [];
      delete updated[oldPusat];
      updated[trimmed] = jabatans;
      return updated;
    });
    // Update existing programs
    setPrograms((prev) =>
      prev.map((p) => (p.pusat === oldPusat ? { ...p, pusat: trimmed } : p))
    );
  };

  const deletePusat = (pusat: string) => {
    setPusatList((prev) => prev.filter((p) => p !== pusat));
    setJabatanMap((prev) => {
      const copy = { ...prev };
      delete copy[pusat];
      return copy;
    });
  };

  const addJabatan = (pusat: string, namaJabatan: string) => {
    const trimmed = namaJabatan.trim().toUpperCase();
    if (!trimmed) return;
    setJabatanMap((prev) => {
      const existing = prev[pusat] || [];
      if (existing.includes(trimmed)) return prev;
      return { ...prev, [pusat]: [...existing, trimmed] };
    });
  };

  const updateJabatan = (pusat: string, oldJabatan: string, newJabatan: string) => {
    const trimmed = newJabatan.trim().toUpperCase();
    if (!trimmed || oldJabatan === trimmed) return;
    setJabatanMap((prev) => {
      const list = prev[pusat] || [];
      return {
        ...prev,
        [pusat]: list.map((j) => (j === oldJabatan ? trimmed : j)),
      };
    });
    setPrograms((prev) =>
      prev.map((p) => (p.jabatan === oldJabatan ? { ...p, jabatan: trimmed } : p))
    );
  };

  const deleteJabatan = (pusat: string, namaJabatan: string) => {
    setJabatanMap((prev) => {
      const list = prev[pusat] || [];
      return {
        ...prev,
        [pusat]: list.filter((j) => j !== namaJabatan),
      };
    });
  };

  const addSumberKewangan = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || sumberKewanganList.includes(trimmed)) return;
    setSumberKewanganList((prev) => [...prev, trimmed]);
  };

  const updateSumberKewangan = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    setSumberKewanganList((prev) => prev.map((s) => (s === oldNama ? trimmed : s)));
    setPrograms((prev) =>
      prev.map((p) => (p.sumberKewangan === oldNama ? { ...p, sumberKewangan: trimmed } : p))
    );
  };

  const deleteSumberKewangan = (nama: string) => {
    setSumberKewanganList((prev) => prev.filter((s) => s !== nama));
  };

  const addStatusProgram = (nama: string) => {
    const trimmed = nama.trim().toUpperCase();
    if (!trimmed || statusProgramList.includes(trimmed)) return;
    setStatusProgramList((prev) => [...prev, trimmed]);
  };

  const updateStatusProgram = (oldNama: string, newNama: string) => {
    const trimmed = newNama.trim().toUpperCase();
    if (!trimmed || oldNama === trimmed) return;
    setStatusProgramList((prev) => prev.map((s) => (s === oldNama ? trimmed : s)));
    setPrograms((prev) =>
      prev.map((p) => (p.statusProgram === oldNama ? { ...p, statusProgram: trimmed } : p))
    );
  };

  const deleteStatusProgram = (nama: string) => {
    setStatusProgramList((prev) => prev.filter((s) => s !== nama));
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
        deleteAdminUser,
        pusatList,
        jabatanMap,
        pegawaiList,
        sumberKewanganList,
        statusProgramList,
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
