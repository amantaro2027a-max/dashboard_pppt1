import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem, Pegawai, RekodPindaanBK04 } from '../types/program';
import { formatRMWithPrefix, formatNumber, getStatusConfig } from '../utils/formatters';
import { getProgramYear } from '../utils/financeYear';
import { getProgramDedupeKey } from '../utils/programDedupe';
import { getProgramFinanceAggregate } from '../utils/financeCalculations';
import * as XLSX from 'xlsx';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Users,
  Briefcase,
  Calendar as CalendarIcon,
  History,
  UserCircle2,
  Lock,
  ShieldAlert,
  ArrowRight,
  Search,
  Download,
  Eye,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  XCircle,
  CircleDashed,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  RotateCcw,
  FileWarning,
  BarChart3,
} from 'lucide-react';

type PegawaiSidebarTab =
  | 'dashboard'
  | 'programSaya'
  | 'sebagaiPengurus'
  | 'sebagaiPengurusBersama'
  | 'sebagaiUrusSetia'
  | 'kalendar'
  | 'rekodPindaan'
  | 'profilSaya';

type OfficerRoleType = 'PENGURUS' | 'PENGURUS BERSAMA' | 'URUS SETIA';
type CalendarMode = 'BULANAN' | 'MINGGUAN' | 'SENARAI';
type ScheduleFilter = 'SEMUA' | 'AKAN_DATANG' | 'SEDANG_BERLANGSUNG' | 'TELAH_LEPAS' | '30_HARI';

interface ScopedProgramEntry {
  key: string;
  program: ProgramItem;
  roles: OfficerRoleType[];
}

interface OfficerNotificationItem {
  id: string;
  category:
    | 'AKAN_DATANG'
    | 'DALAM_TINDAKAN'
    | 'PINDAAN_MAKLUMAT'
    | 'PENUGASAN_PEGAWAI'
    | 'TIDAK_LENGKAP';
  categoryLabel: string;
  title: string;
  detail: string;
  dateHint: string;
  severity: 'info' | 'warning' | 'alert';
  program: ProgramItem;
}

const ROLE_LABELS: Record<OfficerRoleType, string> = {
  PENGURUS: 'Pengurus',
  'PENGURUS BERSAMA': 'Pengurus Bersama',
  'URUS SETIA': 'Urus Setia',
};

const ROLE_COLORS: Record<OfficerRoleType, string> = {
  PENGURUS: '#2563eb',
  'PENGURUS BERSAMA': '#0d9488',
  'URUS SETIA': '#d97706',
};

const parseIsoDate = (raw?: string): Date | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dmyMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed);
  if (dmyMatch) {
    const dt = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (d: Date): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const toIsoDay = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDisplayDate = (raw?: string): string => {
  const dt = parseIsoDate(raw);
  if (!dt) return raw || '-';
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
};

const MONTH_NAMES_MY = [
  'Januari',
  'Februari',
  'Mac',
  'April',
  'Mei',
  'Jun',
  'Julai',
  'Ogos',
  'September',
  'Oktober',
  'November',
  'Disember',
];

const WEEKDAY_SHORT_MY = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Aha'];

export const PegawaiPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    currentUser,
    isSuperAdmin,
    getPageAccessMode,
    viewProgramDetail,
    setActiveTab,
    logActivity,
  } = useProgramContext();

  const pageMode = getPageAccessMode('PEGAWAI');
  const canAccess = Boolean(currentUser) && pageMode !== 'none';

  // Super Admin optional preview selector; locked strictly to currentUser for all other roles
  const [adminViewOfficerId, setAdminViewOfficerId] = useState<string>('SELF');

  const [sidebarTab, setSidebarTab] = useState<PegawaiSidebarTab>('dashboard');
  const [filterTahun, setFilterTahun] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterJenis, setFilterJenis] = useState<string>('SEMUA');
  const [filterPeranan, setFilterPeranan] = useState<string>('SEMUA');
  const [filterSchedule, setFilterSchedule] = useState<ScheduleFilter>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notifFilter, setNotifFilter] = useState<string>('SEMUA');
  const [hoveredRole, setHoveredRole] = useState<OfficerRoleType | null>(null);

  const [calendarMode, setCalendarMode] = useState<CalendarMode>('BULANAN');
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => startOfDay(new Date()));

  // Resolve active officer profile & all matching identifiers (User ID + Pegawai ID + Full Name + Email)
  const activeOfficerIdentity = useMemo(() => {
    if (!currentUser) {
      return {
        displayId: '-',
        displayName: 'PELAWAT',
        pegawai: null as Pegawai | null,
        matchIds: new Set<string>(),
        matchNames: new Set<string>(),
      };
    }

    if (isSuperAdmin && adminViewOfficerId !== 'SELF') {
      const targetPg = pegawaiList.find((pg) => pg.id === adminViewOfficerId) || null;
      if (targetPg) {
        const ids = new Set<string>([(targetPg.id || '').trim().toUpperCase()].filter(Boolean));
        const names = new Set<string>([(targetPg.nama || '').trim().toUpperCase()].filter(Boolean));
        return {
          displayId: targetPg.id,
          displayName: targetPg.nama,
          pegawai: targetPg,
          matchIds: ids,
          matchNames: names,
        };
      }
    }

    const userIdUp = (currentUser.id || '').trim().toUpperCase();
    const userNameUp = (currentUser.name || '').trim().toUpperCase();
    const userEmailUp = (currentUser.emel || '').trim().toUpperCase();

    const matchedPg =
      pegawaiList.find((pg) => {
        const pgId = (pg.id || '').trim().toUpperCase();
        const pgName = (pg.nama || '').trim().toUpperCase();
        const pgEmail = (pg.emel || '').trim().toUpperCase();
        return (
          (userIdUp && pgId === userIdUp) ||
          (userNameUp && pgName === userNameUp) ||
          (userEmailUp && pgEmail && pgEmail === userEmailUp)
        );
      }) || null;

    const matchIds = new Set<string>();
    const matchNames = new Set<string>();
    if (userIdUp) matchIds.add(userIdUp);
    if (userNameUp) matchNames.add(userNameUp);
    if (matchedPg?.id) matchIds.add(matchedPg.id.trim().toUpperCase());
    if (matchedPg?.nama) matchNames.add(matchedPg.nama.trim().toUpperCase());

    return {
      displayId: matchedPg?.id || currentUser.id,
      displayName: matchedPg?.nama || currentUser.name,
      pegawai: matchedPg,
      matchIds,
      matchNames,
    };
  }, [currentUser, isSuperAdmin, adminViewOfficerId, pegawaiList]);

  // Strict Record-Level RBAC Filtering + Deduplication by Kod Program preserving multiple roles
  const myScopedEntries: ScopedProgramEntry[] = useMemo(() => {
    if (!currentUser) return [];
    const { matchIds, matchNames } = activeOfficerIdentity;
    if (matchIds.size === 0 && matchNames.size === 0) return [];

    const matchesPerson = (idVal?: string, nameVal?: string): boolean => {
      const idUp = (idVal || '').trim().toUpperCase();
      const nmUp = (nameVal || '').trim().toUpperCase();
      if (idUp && matchIds.has(idUp)) return true;
      if (nmUp && matchNames.has(nmUp)) return true;
      return false;
    };

    const map = new Map<string, ScopedProgramEntry>();

    programs.forEach((p) => {
      const isPengurus = matchesPerson(p.pengurusId, p.pengurusNama);
      const isBersama = matchesPerson(p.pengurusBersamaId, p.pengurusBersamaNama);
      const isUrusSetia = matchesPerson(p.urusSetiaId, p.urusSetiaNama);

      if (!isPengurus && !isBersama && !isUrusSetia) return;

      const dedupeKey = getProgramDedupeKey(p);
      const roleSet = new Set<OfficerRoleType>(map.get(dedupeKey)?.roles || []);
      if (isPengurus) roleSet.add('PENGURUS');
      if (isBersama) roleSet.add('PENGURUS BERSAMA');
      if (isUrusSetia) roleSet.add('URUS SETIA');

      const existing = map.get(dedupeKey);
      if (!existing) {
        map.set(dedupeKey, {
          key: dedupeKey,
          program: p,
          roles: Array.from(roleSet),
        });
      } else {
        map.set(dedupeKey, {
          ...existing,
          roles: Array.from(roleSet),
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      (b.program.tarikhMula || '').localeCompare(a.program.tarikhMula || '')
    );
  }, [currentUser, activeOfficerIdentity, programs]);

  // Unique programs list (deduplicated)
  const myPrograms = useMemo(() => myScopedEntries.map((e) => e.program), [myScopedEntries]);

  // Dynamic KPI Stats (across officer's assigned programmes; optionally respects filterTahun if on Dashboard? Keep overall for clarity or year-filtered if year selected)
  const kpiStats = useMemo(() => {
    let selesai = 0;
    let tanggung = 0;
    let dalamTindakan = 0;
    let belum = 0;
    let batal = 0;

    myScopedEntries.forEach(({ program }) => {
      const st = (program.statusProgram || '').trim().toUpperCase();
      if (st === 'SELESAI') selesai++;
      else if (st === 'TANGGUNG') tanggung++;
      else if (st === 'DALAM TINDAKAN') dalamTindakan++;
      else if (st === 'BATAL') batal++;
      else belum++;
    });

    return {
      total: myScopedEntries.length,
      selesai,
      tanggung,
      dalamTindakan,
      belum,
      batal,
    };
  }, [myScopedEntries]);

  // Role breakdown stats
  const roleBreakdown = useMemo(() => {
    const counts: Record<OfficerRoleType, number> = {
      PENGURUS: 0,
      'PENGURUS BERSAMA': 0,
      'URUS SETIA': 0,
    };
    myScopedEntries.forEach((entry) => {
      entry.roles.forEach((r) => {
        counts[r]++;
      });
    });
    const totalAssignments = counts.PENGURUS + counts['PENGURUS BERSAMA'] + counts['URUS SETIA'];
    return {
      counts,
      totalAssignments,
      items: (['PENGURUS', 'PENGURUS BERSAMA', 'URUS SETIA'] as OfficerRoleType[]).map((role) => ({
        role,
        label: ROLE_LABELS[role],
        count: counts[role],
        pct: totalAssignments > 0 ? Math.round((counts[role] / totalAssignments) * 100) : 0,
        color: ROLE_COLORS[role],
      })),
    };
  }, [myScopedEntries]);

  // Analytical summaries
  const analyticalSummaries = useMemo(() => {
    const byYearMap = new Map<number, { tahun: number; count: number; selesai: number }>();
    const byStatusMap = new Map<string, number>();

    myScopedEntries.forEach(({ program }) => {
      const yr = getProgramYear(program);
      const st = (program.statusProgram || 'BELUM AMBIL TINDAKAN').trim().toUpperCase();
      const prevYr = byYearMap.get(yr) || { tahun: yr, count: 0, selesai: 0 };
      prevYr.count++;
      if (st === 'SELESAI') prevYr.selesai++;
      byYearMap.set(yr, prevYr);

      byStatusMap.set(st, (byStatusMap.get(st) || 0) + 1);
    });

    const finance = getProgramFinanceAggregate(myPrograms, true);

    const today = startOfDay(new Date());
    const in14Days = new Date(today);
    in14Days.setDate(in14Days.getDate() + 14);

    const nearOrOverdue: Array<{
      entry: ScopedProgramEntry;
      kind: 'MELEPASI' | 'HAMPIR';
      daysDiff: number;
    }> = [];

    myScopedEntries.forEach((entry) => {
      const p = entry.program;
      const st = (p.statusProgram || '').trim().toUpperCase();
      if (st === 'SELESAI' || st === 'BATAL') return;

      const startDt = parseIsoDate(p.tarikhMula);
      const endDt = parseIsoDate(p.tarikhTamat) || startDt;
      if (!startDt || !endDt) return;

      if (endDt < today) {
        const diffDays = Math.ceil((today.getTime() - endDt.getTime()) / 86400000);
        nearOrOverdue.push({ entry, kind: 'MELEPASI', daysDiff: diffDays });
      } else if (startDt >= today && startDt <= in14Days) {
        const diffDays = Math.ceil((startDt.getTime() - today.getTime()) / 86400000);
        nearOrOverdue.push({ entry, kind: 'HAMPIR', daysDiff: diffDays });
      }
    });

    nearOrOverdue.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === 'MELEPASI' ? -1 : 1;
      return b.daysDiff - a.daysDiff;
    });

    return {
      byYear: Array.from(byYearMap.values()).sort((a, b) => b.tahun - a.tahun),
      byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({ status, count })),
      finance,
      nearOrOverdue,
    };
  }, [myScopedEntries, myPrograms]);

  // Notifications Panel (scoped strictly to officer's records)
  const notifications: OfficerNotificationItem[] = useMemo(() => {
    const items: OfficerNotificationItem[] = [];
    const today = startOfDay(new Date());
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    myScopedEntries.forEach(({ program }) => {
      const st = (program.statusProgram || '').trim().toUpperCase();
      const startDt = parseIsoDate(program.tarikhMula);

      // 1. Program akan datang (within next 30 days)
      if (startDt && startDt >= today && startDt <= in30Days && st !== 'BATAL') {
        const daysAway = Math.ceil((startDt.getTime() - today.getTime()) / 86400000);
        items.push({
          id: `upcoming_${program.id}`,
          category: 'AKAN_DATANG',
          categoryLabel: 'Program Akan Datang',
          title: program.namaProgram,
          detail:
            daysAway === 0
              ? `Bermula hari ini (${formatDisplayDate(program.tarikhMula)}) di ${program.tempat || '-'}`
              : `Bermula dalam ${daysAway} hari (${formatDisplayDate(program.tarikhMula)})`,
          dateHint: formatDisplayDate(program.tarikhMula),
          severity: daysAway <= 7 ? 'warning' : 'info',
          program,
        });
      }

      // 2. Program dalam tindakan
      if (st === 'DALAM TINDAKAN') {
        items.push({
          id: `tindakan_${program.id}`,
          category: 'DALAM_TINDAKAN',
          categoryLabel: 'Program Dalam Tindakan',
          title: program.namaProgram,
          detail: `Kod ${program.kodProgram} sedang dalam tindakan pelaksanaan (${program.tempoh || '-'})`,
          dateHint: formatDisplayDate(program.tarikhMula),
          severity: 'info',
          program,
        });
      }

      // 3 & 4. Perubahan maklumat program (BK04) & perubahan penugasan pegawai
      const pindaanList = program.rekodPindaan || [];
      if (pindaanList.length > 0) {
        const latest = pindaanList[pindaanList.length - 1];
        const hasStaffReassign = pindaanList.some((rec) =>
          (rec.perubahan || []).some((ch) =>
            /PENGURUS|URUS\s*SETIA|PEGAWAI/i.test(ch.jenisPerubahan || '')
          )
        );
        items.push({
          id: `bk04_${program.id}`,
          category: 'PINDAAN_MAKLUMAT',
          categoryLabel: 'Perubahan Maklumat Program (BK04)',
          title: program.namaProgram,
          detail: `${pindaanList.length} rekod pindaan BK04 · Terkini oleh ${latest.dikemaskiniOleh}`,
          dateHint: latest.tarikhPindaan,
          severity: 'info',
          program,
        });

        if (hasStaffReassign) {
          items.push({
            id: `reassign_${program.id}`,
            category: 'PENUGASAN_PEGAWAI',
            categoryLabel: 'Perubahan Penugasan Pegawai',
            title: program.namaProgram,
            detail: `Terdapat pindaan penugasan pegawai dalam BK04 (${latest.tarikhPindaan})`,
            dateHint: latest.tarikhPindaan,
            severity: 'warning',
            program,
          });
        }
      }

      // 5. Maklumat program belum lengkap
      if (st !== 'BATAL') {
        const missingFields: string[] = [];
        if (!program.tarikhMula || !program.tarikhTamat) missingFields.push('Tarikh');
        if (!program.tempat || program.tempat === '-') missingFields.push('Tempat');
        if (!program.negeri || program.negeri === '-') missingFields.push('Negeri');
        if (!program.sumberKewangan || program.sumberKewangan === '-') missingFields.push('Sumber Kewangan');
        if ((Number(program.bilanganPeserta) || 0) <= 0) missingFields.push('Bil. Peserta');
        if (st === 'SELESAI' && (Number(program.jumlahBelanjaRm) || 0) <= 0 && (Number(program.jumlahRm) || 0) > 0) {
          missingFields.push('Belanja Sebenar');
        }

        if (missingFields.length > 0) {
          items.push({
            id: `incomplete_${program.id}`,
            category: 'TIDAK_LENGKAP',
            categoryLabel: 'Maklumat Belum Lengkap',
            title: program.namaProgram,
            detail: `Perlu semakan: ${missingFields.join(', ')}`,
            dateHint: program.kodProgram,
            severity: 'alert',
            program,
          });
        }
      }
    });

    return items;
  }, [myScopedEntries]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'SEMUA') return notifications;
    return notifications.filter((n) => n.category === notifFilter);
  }, [notifications, notifFilter]);

  // All BK04 Amendment records across officer's scoped programmes
  const allMyBk04Records = useMemo(() => {
    const rows: Array<{
      program: ProgramItem;
      roles: OfficerRoleType[];
      pindaan: RekodPindaanBK04;
    }> = [];
    myScopedEntries.forEach(({ program, roles }) => {
      (program.rekodPindaan || []).forEach((pindaan) => {
        rows.push({ program, roles, pindaan });
      });
    });
    return rows.sort((a, b) => (b.pindaan.tarikhPindaan || '').localeCompare(a.pindaan.tarikhPindaan || ''));
  }, [myScopedEntries]);

  // Dropdown options derived strictly from officer's own programmes
  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const statuses = new Set<string>();
    const jenis = new Set<string>();
    myScopedEntries.forEach(({ program }) => {
      years.add(String(getProgramYear(program)));
      if (program.statusProgram) statuses.add(program.statusProgram);
      if (program.jenisProgram) jenis.add(program.jenisProgram);
    });
    return {
      years: Array.from(years).sort().reverse(),
      statuses: Array.from(statuses).sort(),
      jenis: Array.from(jenis).sort(),
    };
  }, [myScopedEntries]);

  // Effective role filter considering sidebar role-specific menu items
  const effectiveRoleScope: OfficerRoleType | null = useMemo(() => {
    if (sidebarTab === 'sebagaiPengurus') return 'PENGURUS';
    if (sidebarTab === 'sebagaiPengurusBersama') return 'PENGURUS BERSAMA';
    if (sidebarTab === 'sebagaiUrusSetia') return 'URUS SETIA';
    return null;
  }, [sidebarTab]);

  // Filtered table rows
  const filteredTableEntries = useMemo(() => {
    const today = startOfDay(new Date());
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);
    const q = searchQuery.trim().toLowerCase();

    return myScopedEntries.filter(({ program, roles }) => {
      if (effectiveRoleScope && !roles.includes(effectiveRoleScope)) return false;
      if (filterPeranan !== 'SEMUA' && !roles.includes(filterPeranan as OfficerRoleType)) return false;
      if (filterTahun !== 'SEMUA' && String(getProgramYear(program)) !== filterTahun) return false;
      if (
        filterStatus !== 'SEMUA' &&
        (program.statusProgram || '').trim().toUpperCase() !== filterStatus.trim().toUpperCase()
      ) {
        return false;
      }
      if (filterJenis !== 'SEMUA' && program.jenisProgram !== filterJenis) return false;

      if (filterSchedule !== 'SEMUA') {
        const sDt = parseIsoDate(program.tarikhMula);
        const eDt = parseIsoDate(program.tarikhTamat) || sDt;
        if (!sDt || !eDt) return false;
        if (filterSchedule === 'AKAN_DATANG' && !(sDt > today)) return false;
        if (filterSchedule === 'SEDANG_BERLANGSUNG' && !(sDt <= today && eDt >= today)) return false;
        if (filterSchedule === 'TELAH_LEPAS' && !(eDt < today)) return false;
        if (filterSchedule === '30_HARI' && !(sDt >= today && sDt <= in30Days)) return false;
      }

      if (q) {
        const haystack = [
          program.kodProgram,
          program.namaProgram,
          program.jenisProgram,
          program.tempat,
          program.negeri,
          program.sumberKewangan,
          program.statusProgram,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [
    myScopedEntries,
    effectiveRoleScope,
    filterPeranan,
    filterTahun,
    filterStatus,
    filterJenis,
    filterSchedule,
    searchQuery,
  ]);

  const resetTableFilters = () => {
    setFilterTahun('SEMUA');
    setFilterStatus('SEMUA');
    setFilterJenis('SEMUA');
    setFilterPeranan('SEMUA');
    setFilterSchedule('SEMUA');
    setSearchQuery('');
  };

  const handleExportMyPrograms = () => {
    const rows = filteredTableEntries.map(({ program, roles }, idx) => ({
      'Bil.': idx + 1,
      'Kod Program': program.kodProgram,
      'Nama Program': program.namaProgram,
      'Jenis Program': program.jenisProgram || '-',
      'Tarikh Mula': program.tarikhMula || '-',
      'Tarikh Tamat': program.tarikhTamat || '-',
      Tempoh: program.tempoh || '-',
      Tempat: program.tempat || '-',
      Negeri: program.negeri || '-',
      'Bilangan Peserta': Number(program.bilanganPeserta) || 0,
      'Peranan Saya': roles.map((r) => ROLE_LABELS[r]).join(', '),
      'Status Program': program.statusProgram,
      'Peruntukan BK65 (RM)': Number(program.jumlahRm) || 0,
      'Belanja Sebenar (RM)': Number(program.jumlahBelanjaRm) || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Program Pegawai');
    XLSX.writeFile(
      wb,
      `PROGRAM_PEGAWAI_${activeOfficerIdentity.displayId}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    logActivity({
      action_type: 'EXPORT',
      module_name: 'Page Pegawai',
      activity_description: `Exported ${rows.length} personal programmes for ${activeOfficerIdentity.displayName}`,
      record_id: activeOfficerIdentity.displayId,
      status: 'SUCCESS',
    });
  };

  // Calendar helpers
  const calendarMonthCells = useMemo(() => {
    const yr = calendarCursor.getFullYear();
    const mo = calendarCursor.getMonth();
    const firstOfMonth = new Date(yr, mo, 1);
    const firstWeekdayMon = (firstOfMonth.getDay() + 6) % 7; // Mon = 0 .. Sun = 6
    const startGrid = new Date(yr, mo, 1 - firstWeekdayMon);

    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(startGrid);
      d.setDate(startGrid.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [calendarCursor]);

  const calendarWeekDays = useMemo(() => {
    const weekdayMon = (calendarCursor.getDay() + 6) % 7;
    const monday = new Date(calendarCursor);
    monday.setDate(calendarCursor.getDate() - weekdayMon);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarCursor]);

  const getEntriesForDay = (day: Date): ScopedProgramEntry[] => {
    const dayIso = toIsoDay(day);
    return myScopedEntries.filter(({ program }) => {
      const s = parseIsoDate(program.tarikhMula);
      const e = parseIsoDate(program.tarikhTamat) || s;
      if (!s || !e) return false;
      const sIso = toIsoDay(s);
      const eIso = toIsoDay(e);
      return dayIso >= sIso && dayIso <= eIso;
    });
  };

  const navigateCalendar = (dir: -1 | 1) => {
    const next = new Date(calendarCursor);
    if (calendarMode === 'MINGGUAN') {
      next.setDate(next.getDate() + dir * 7);
    } else {
      next.setMonth(next.getMonth() + dir);
    }
    setCalendarCursor(next);
  };

  // Doughnut SVG arc segments for Role Distribution
  const doughnutSegments = useMemo(() => {
    const r = 56;
    const circumference = 2 * Math.PI * r;
    const total = roleBreakdown.totalAssignments;
    if (total === 0) return [];

    let cumulativeOffset = 0;
    return roleBreakdown.items
      .filter((item) => item.count > 0)
      .map((item) => {
        const dashLength = (item.count / total) * circumference;
        const segment = {
          ...item,
          dashArray: `${dashLength} ${circumference - dashLength}`,
          dashOffset: -cumulativeOffset,
        };
        cumulativeOffset += dashLength;
        return segment;
      });
  }, [roleBreakdown]);

  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-rose-50">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600">
            Akses Dihadkan · Log Masuk Diperlukan
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-3 tracking-tight">
            Page Pegawai (Dashboard Peribadi Pegawai)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            {currentUser
              ? 'Akaun anda tidak mempunyai kebenaran untuk memaparkan Page Pegawai. Sila hubungi Super Admin.'
              : 'Halaman ini memaparkan program yang ditugaskan khusus kepada anda sebagai Pengurus, Pengurus Bersama atau Urus Setia. Sila log masuk terlebih dahulu.'}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            {!currentUser && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Log Masuk Pengguna</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const sidebarMenu: Array<{
    id: PegawaiSidebarTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    count?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'programSaya', label: 'Program Saya', icon: ClipboardList, count: kpiStats.total },
    { id: 'sebagaiPengurus', label: 'Sebagai Pengurus', icon: UserCheck, count: roleBreakdown.counts.PENGURUS },
    {
      id: 'sebagaiPengurusBersama',
      label: 'Sebagai Pengurus Bersama',
      icon: Users,
      count: roleBreakdown.counts['PENGURUS BERSAMA'],
    },
    { id: 'sebagaiUrusSetia', label: 'Sebagai Urus Setia', icon: Briefcase, count: roleBreakdown.counts['URUS SETIA'] },
    { id: 'kalendar', label: 'Kalendar Program', icon: CalendarIcon, count: kpiStats.total },
    { id: 'rekodPindaan', label: 'Rekod Pindaan (BK04)', icon: History, count: allMyBk04Records.length },
    { id: 'profilSaya', label: 'Profil Saya', icon: UserCircle2 },
  ];

  const handleKpiDrill = (statusTarget: string) => {
    setFilterStatus(statusTarget);
    setFilterPeranan('SEMUA');
    setSidebarTab('programSaya');
  };

  const isTableView =
    sidebarTab === 'programSaya' ||
    sidebarTab === 'sebagaiPengurus' ||
    sidebarTab === 'sebagaiPengurusBersama' ||
    sidebarTab === 'sebagaiUrusSetia';

  const todayIso = toIsoDay(new Date());

  return (
    <div className="space-y-6 pb-16">
      {/* Top Identity Header */}
      <section className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-sky-300">
                <span>Dashboard Peribadi Pegawai · Kawalan Akses Peringkat Rekod (RBAC)</span>
                <span className="text-slate-500">·</span>
                <span className="font-mono text-white">{activeOfficerIdentity.displayId}</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-white mt-1 uppercase truncate">
                {activeOfficerIdentity.displayName}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeOfficerIdentity.pegawai?.jawatan || currentUser?.levelId || 'PEGAWAI IAB'} ·{' '}
                {activeOfficerIdentity.pegawai?.jabatan || currentUser?.jabatan || '-'}
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <div className="shrink-0">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Pratonton Pegawai (Super Admin Sahaja)
              </label>
              <select
                value={adminViewOfficerId}
                onChange={(e) => setAdminViewOfficerId(e.target.value)}
                className="px-3 py-2 text-xs font-bold bg-slate-800 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-400 max-w-xs"
              >
                <option value="SELF">Akaun Saya ({currentUser?.name})</option>
                {pegawaiList.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    {pg.id} — {pg.nama}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Main Split Shell: Left Sidebar + Right Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Internal Sidebar Navigation */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-slate-200 rounded-2xl p-2.5 lg:sticky lg:top-24">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 hidden lg:block">
            Menu Navigasi Pegawai
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
            {sidebarMenu.map((item) => {
              const Icon = item.icon;
              const isActive = sidebarTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSidebarTab(item.id)}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 lg:w-full ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-300' : 'text-slate-500'}`} />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                        isActive ? 'bg-slate-800 text-sky-200' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Active View Area */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {/* =============================================================== */}
          {/* VIEW 1: DASHBOARD                                               */}
          {/* =============================================================== */}
          {sidebarTab === 'dashboard' && (
            <>
              {/* 6 Dynamic KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5">
                {[
                  {
                    label: 'Jumlah Program Saya',
                    val: kpiStats.total,
                    icon: ClipboardList,
                    accent: 'text-slate-900',
                    iconColor: 'text-blue-600',
                    statusTarget: 'SEMUA',
                  },
                  {
                    label: 'Program Selesai',
                    val: kpiStats.selesai,
                    icon: CheckCircle2,
                    accent: 'text-emerald-700',
                    iconColor: 'text-emerald-600',
                    statusTarget: 'SELESAI',
                  },
                  {
                    label: 'Program Tanggung',
                    val: kpiStats.tanggung,
                    icon: PauseCircle,
                    accent: 'text-amber-700',
                    iconColor: 'text-amber-600',
                    statusTarget: 'TANGGUNG',
                  },
                  {
                    label: 'Program Dalam Tindakan',
                    val: kpiStats.dalamTindakan,
                    icon: Clock,
                    accent: 'text-blue-700',
                    iconColor: 'text-blue-600',
                    statusTarget: 'DALAM TINDAKAN',
                  },
                  {
                    label: 'Program Belum Ambil Tindakan',
                    val: kpiStats.belum,
                    icon: CircleDashed,
                    accent: 'text-slate-700',
                    iconColor: 'text-slate-500',
                    statusTarget: 'BELUM AMBIL TINDAKAN',
                  },
                  {
                    label: 'Program Batal',
                    val: kpiStats.batal,
                    icon: XCircle,
                    accent: 'text-rose-700',
                    iconColor: 'text-rose-600',
                    statusTarget: 'BATAL',
                  },
                ].map((card) => {
                  const Icon = card.icon;
                  return (
                    <button
                      key={card.label}
                      type="button"
                      onClick={() => handleKpiDrill(card.statusTarget)}
                      className="bg-white border border-slate-200 hover:border-slate-400 rounded-2xl p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 leading-tight">
                          {card.label}
                        </span>
                        <Icon className={`w-4 h-4 shrink-0 ${card.iconColor}`} />
                      </div>
                      <div className={`text-2xl font-black font-mono tabular-nums ${card.accent}`}>
                        {card.val}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Role Distribution Analytics: Doughnut + Bar Chart */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Doughnut Chart */}
                <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                        Taburan Mengikut Peranan
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                        Carta Donat Agihan Peranan
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-500 tabular-nums">
                      {roleBreakdown.totalAssignments} Tugasan
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 py-2">
                    <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                        <circle
                          cx="70"
                          cy="70"
                          r="56"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="18"
                        />
                        {doughnutSegments.map((seg) => (
                          <circle
                            key={seg.role}
                            cx="70"
                            cy="70"
                            r="56"
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth={hoveredRole === seg.role ? '22' : '18'}
                            strokeDasharray={seg.dashArray}
                            strokeDashoffset={seg.dashOffset}
                            className="transition-all duration-200 cursor-pointer"
                            onMouseEnter={() => setHoveredRole(seg.role)}
                            onMouseLeave={() => setHoveredRole(null)}
                            onClick={() => {
                              if (seg.role === 'PENGURUS') setSidebarTab('sebagaiPengurus');
                              else if (seg.role === 'PENGURUS BERSAMA') setSidebarTab('sebagaiPengurusBersama');
                              else setSidebarTab('sebagaiUrusSetia');
                            }}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                          {hoveredRole ? roleBreakdown.counts[hoveredRole] : kpiStats.total}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase max-w-[76px] leading-tight">
                          {hoveredRole ? ROLE_LABELS[hoveredRole] : 'Program Unik'}
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-2.5">
                      {roleBreakdown.items.map((item) => (
                        <button
                          key={item.role}
                          type="button"
                          onMouseEnter={() => setHoveredRole(item.role)}
                          onMouseLeave={() => setHoveredRole(null)}
                          onClick={() => {
                            if (item.role === 'PENGURUS') setSidebarTab('sebagaiPengurus');
                            else if (item.role === 'PENGURUS BERSAMA') setSidebarTab('sebagaiPengurusBersama');
                            else setSidebarTab('sebagaiUrusSetia');
                          }}
                          className="w-full flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-left"
                        >
                          <span className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span>{item.label}</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                            {item.count} <span className="text-slate-400 font-normal">({item.pct}%)</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bar Chart */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
                        Analitik Peranan &amp; Beban Tugas
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-teal-600" />
                        <span>Carta Bar Bilangan Program Mengikut Peranan</span>
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-500">Klik bar untuk senarai</span>
                  </div>

                  <div className="space-y-4 py-1">
                    {roleBreakdown.items.map((item) => {
                      const maxCount = Math.max(1, ...roleBreakdown.items.map((x) => x.count));
                      const widthPct = item.count > 0 ? Math.max(4, (item.count / maxCount) * 100) : 0;
                      return (
                        <button
                          key={item.role}
                          type="button"
                          onClick={() => {
                            if (item.role === 'PENGURUS') setSidebarTab('sebagaiPengurus');
                            else if (item.role === 'PENGURUS BERSAMA') setSidebarTab('sebagaiPengurusBersama');
                            else setSidebarTab('sebagaiUrusSetia');
                          }}
                          className="w-full text-left space-y-1.5 group cursor-pointer"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">
                              Sebagai {item.label}
                            </span>
                            <span className="font-mono font-bold text-slate-900 tabular-nums">
                              {item.count} program · {item.pct}%
                            </span>
                          </div>
                          <div className="h-3.5 w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                            <div
                              className="h-full rounded-lg transition-all duration-300"
                              style={{ width: `${widthPct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                    Nota: Seorang pegawai boleh memegang lebih daripada satu peranan bagi kod program yang sama jika ditugaskan secara eksplisit; jumlah keseluruhan dikira sekali bagi setiap kod program unik.
                  </p>
                </div>
              </section>

              {/* Analytical Summaries Grid */}
              <section className="grid grid-cols-1 xl:grid-cols-12 gap-5">
                {/* Peruntukan Program yang Dikendalikan + Mengikut Tahun & Status */}
                <div className="xl:col-span-7 space-y-5">
                  {/* Budget Managed */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                          Ringkasan Kewangan Kendalian
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-600" />
                          <span>Jumlah Peruntukan Program Yang Dikendalikan</span>
                        </h3>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        {kpiStats.total} Program Unik
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                        <span className="text-[11px] font-semibold text-slate-500 block">
                          Peruntukan Diagihkan (BK65)
                        </span>
                        <span className="text-base font-black text-slate-900 font-mono tabular-nums mt-1 block">
                          {formatRMWithPrefix(analyticalSummaries.finance.diagihkan.total)}
                        </span>
                      </div>
                      <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5">
                        <span className="text-[11px] font-semibold text-emerald-800 block">
                          Belanja Sebenar (Selesai/Tanggung)
                        </span>
                        <span className="text-base font-black text-emerald-700 font-mono tabular-nums mt-1 block">
                          {formatRMWithPrefix(analyticalSummaries.finance.belanja.total)}
                        </span>
                      </div>
                      <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3.5">
                        <span className="text-[11px] font-semibold text-amber-800 block">
                          Penjimatan Direkodkan
                        </span>
                        <span className="text-base font-black text-amber-700 font-mono tabular-nums mt-1 block">
                          {formatRMWithPrefix(analyticalSummaries.finance.penjimatan.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Year & Status Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span>Program Mengikut Tahun</span>
                      </h4>
                      {analyticalSummaries.byYear.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">Tiada rekod program.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {analyticalSummaries.byYear.map((yr) => (
                            <div key={yr.tahun} className="py-2 flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-slate-800">{yr.tahun}</span>
                              <span className="font-mono tabular-nums text-slate-700">
                                <strong>{yr.count}</strong> program ·{' '}
                                <span className="text-emerald-700">{yr.selesai} selesai</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Program Mengikut Status
                      </h4>
                      {analyticalSummaries.byStatus.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">Tiada rekod program.</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {analyticalSummaries.byStatus.map((row) => {
                            const cfg = getStatusConfig(row.status);
                            return (
                              <div key={row.status} className="py-2 flex items-center justify-between text-xs gap-2">
                                <span className="font-semibold text-slate-800 truncate">{cfg.label}</span>
                                <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                                  {row.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hampir atau Melepasi Tarikh Pelaksanaan */}
                <div className="xl:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
                        Pemantauan Tarikh Pelaksanaan
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Hampir atau Melepasi Tarikh</span>
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-600 tabular-nums">
                      {analyticalSummaries.nearOrOverdue.length} Program
                    </span>
                  </div>

                  {analyticalSummaries.nearOrOverdue.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                      Tiada program yang hampir atau melepasi tarikh tanpa penyelesaian.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      {analyticalSummaries.nearOrOverdue.map(({ entry, kind, daysDiff }) => (
                        <button
                          key={entry.key}
                          type="button"
                          onClick={() => viewProgramDetail(entry.program)}
                          className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-white transition-all cursor-pointer space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span
                              className={`font-bold ${
                                kind === 'MELEPASI' ? 'text-rose-700' : 'text-amber-700'
                              }`}
                            >
                              {kind === 'MELEPASI'
                                ? `Melepasi tarikh (${daysDiff} hari lalu)`
                                : daysDiff === 0
                                ? 'Bermula hari ini'
                                : `Hampir tiba (${daysDiff} hari lagi)`}
                            </span>
                            <span className="font-mono text-slate-500">{entry.program.kodProgram}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1 uppercase">
                            {entry.program.namaProgram}
                          </p>
                          <div className="text-[11px] text-slate-500">
                            {entry.program.tempoh || formatDisplayDate(entry.program.tarikhMula)} · Status:{' '}
                            <strong className="text-slate-700">{entry.program.statusProgram}</strong>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Notifications Panel */}
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      Panel Notifikasi &amp; Tindakan Pegawai
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-600" />
                      <span>Pemberitahuan Berkaitan Program Anda ({filteredNotifications.length})</span>
                    </h3>
                  </div>

                  <select
                    value={notifFilter}
                    onChange={(e) => setNotifFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="SEMUA">Semua Kategori ({notifications.length})</option>
                    <option value="AKAN_DATANG">Program Akan Datang</option>
                    <option value="DALAM_TINDAKAN">Program Dalam Tindakan</option>
                    <option value="PINDAAN_MAKLUMAT">Perubahan Maklumat Program</option>
                    <option value="PENUGASAN_PEGAWAI">Perubahan Penugasan Pegawai</option>
                    <option value="TIDAK_LENGKAP">Maklumat Program Belum Lengkap</option>
                  </select>
                </div>

                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Tiada notifikasi dalam kategori yang dipilih.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
                    {filteredNotifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => viewProgramDetail(n.program)}
                        className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 bg-slate-50/40 hover:bg-white transition-all cursor-pointer flex items-start gap-3"
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.severity === 'alert' ? (
                            <FileWarning className="w-4 h-4 text-rose-600" />
                          ) : n.severity === 'warning' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Bell className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-bold text-indigo-700">{n.categoryLabel}</span>
                            <span className="font-mono text-slate-400 shrink-0">{n.dateHint}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 line-clamp-1 uppercase">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-600 leading-snug">{n.detail}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {/* =============================================================== */}
          {/* VIEW 2..5: SEARCHABLE & FILTERABLE PROGRAMME TABLE              */}
          {/* =============================================================== */}
          {isTableView && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    {effectiveRoleScope
                      ? `Senarai Program · Sebagai ${ROLE_LABELS[effectiveRoleScope]}`
                      : 'Katalog Program Saya'}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {effectiveRoleScope
                      ? `Program Tugasan Sebagai ${ROLE_LABELS[effectiveRoleScope]}`
                      : 'Semua Program Ditugaskan Kepada Saya'}{' '}
                    ({filteredTableEntries.length} Rekod)
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={resetTableFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Set Semula</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportMyPrograms}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Eksport Excel</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                <div className="xl:col-span-2 relative">
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Carian Program
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari kod, nama program, tempat, negeri..."
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tahun
                  </label>
                  <select
                    value={filterTahun}
                    onChange={(e) => setFilterTahun(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="SEMUA">Semua Tahun</option>
                    {filterOptions.years.map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Status Program
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="SEMUA">Semua Status</option>
                    {filterOptions.statuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Jenis Program
                  </label>
                  <select
                    value={filterJenis}
                    onChange={(e) => setFilterJenis(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="SEMUA">Semua Jenis</option>
                    {filterOptions.jenis.map((jn) => (
                      <option key={jn} value={jn}>
                        {jn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Tarikh Pelaksanaan
                  </label>
                  <select
                    value={filterSchedule}
                    onChange={(e) => setFilterSchedule(e.target.value as ScheduleFilter)}
                    className="w-full px-2.5 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  >
                    <option value="SEMUA">Semua Tarikh</option>
                    <option value="AKAN_DATANG">Akan Datang</option>
                    <option value="30_HARI">Dalam 30 Hari</option>
                    <option value="SEDANG_BERLANGSUNG">Sedang Berlangsung</option>
                    <option value="TELAH_LEPAS">Telah Lepas</option>
                  </select>
                </div>

                {!effectiveRoleScope && (
                  <div className="sm:col-span-2 lg:col-span-3 xl:col-span-6 flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase mr-1">
                      Tapis Peranan:
                    </span>
                    {(['SEMUA', 'PENGURUS', 'PENGURUS BERSAMA', 'URUS SETIA'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFilterPeranan(r)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                          filterPeranan === r
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {r === 'SEMUA' ? 'Semua Peranan' : ROLE_LABELS[r]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Programme Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3 text-center">Bil.</th>
                      <th className="py-3 px-3">Kod Program</th>
                      <th className="py-3 px-3 min-w-[210px]">Nama Program</th>
                      <th className="py-3 px-3">Jenis Program</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tarikh Mula</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tarikh Tamat</th>
                      <th className="py-3 px-3 whitespace-nowrap">Tempoh</th>
                      <th className="py-3 px-3 min-w-[140px]">Tempat</th>
                      <th className="py-3 px-3">Negeri</th>
                      <th className="py-3 px-3 text-right">Bilangan Peserta</th>
                      <th className="py-3 px-3 min-w-[130px]">Peranan Saya</th>
                      <th className="py-3 px-3">Status Program</th>
                      <th className="py-3 px-3 text-center">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTableEntries.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="py-10 text-center text-slate-400">
                          Tiada program ditemui untuk paparan dan tapisan semasa.
                        </td>
                      </tr>
                    ) : (
                      filteredTableEntries.map(({ program, roles }, idx) => {
                        const cfg = getStatusConfig(program.statusProgram);
                        return (
                          <tr key={program.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-500 tabular-nums">
                              {idx + 1}.
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {program.kodProgram || '-'}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 uppercase leading-snug">
                              {program.namaProgram}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{program.jenisProgram || '-'}</td>
                            <td className="py-3 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {formatDisplayDate(program.tarikhMula)}
                            </td>
                            <td className="py-3 px-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                              {formatDisplayDate(program.tarikhTamat)}
                            </td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {program.tempoh || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-700">{program.tempat || '-'}</td>
                            <td className="py-3 px-3 text-slate-700 whitespace-nowrap">
                              {program.negeri || '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                              {formatNumber(program.bilanganPeserta)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-0.5 text-[11px] font-semibold">
                                {roles.map((r) => (
                                  <div key={r} style={{ color: ROLE_COLORS[r] }}>
                                    · {ROLE_LABELS[r]}
                                  </div>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                                {cfg.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => viewProgramDetail(program)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Lihat Maklumat</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* =============================================================== */}
          {/* VIEW 6: KALENDAR PROGRAM (BULANAN, MINGGUAN, SENARAI)           */}
          {/* =============================================================== */}
          {sidebarTab === 'kalendar' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Jadual Pelaksanaan Program Saya
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Kalendar Program — {MONTH_NAMES_MY[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* View Switcher */}
                  <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    {(
                      [
                        { id: 'BULANAN', label: 'Bulanan' },
                        { id: 'MINGGUAN', label: 'Mingguan' },
                        { id: 'SENARAI', label: 'Senarai' },
                      ] as Array<{ id: CalendarMode; label: string }>
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCalendarMode(m.id)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          calendarMode === m.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {calendarMode !== 'SENARAI' && (
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigateCalendar(-1)}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Sebelum"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarCursor(startOfDay(new Date()))}
                        className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer whitespace-nowrap"
                      >
                        Hari Ini
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateCalendar(1)}
                        className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                        title="Seterusnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Monthly View */}
              {calendarMode === 'BULANAN' && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-7 bg-slate-900 text-white text-[11px] font-bold uppercase text-center">
                    {WEEKDAY_SHORT_MY.map((dayName) => (
                      <div key={dayName} className="py-2.5 border-r border-slate-800 last:border-r-0">
                        {dayName}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-y divide-slate-200">
                    {calendarMonthCells.map((cellDate) => {
                      const inCurrentMonth = cellDate.getMonth() === calendarCursor.getMonth();
                      const cellIso = toIsoDay(cellDate);
                      const isToday = cellIso === todayIso;
                      const dayEntries = getEntriesForDay(cellDate);
                      return (
                        <div
                          key={cellIso}
                          className={`min-h-[96px] p-1.5 space-y-1 ${
                            inCurrentMonth ? 'bg-white' : 'bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                isToday
                                  ? 'bg-blue-600 text-white'
                                  : inCurrentMonth
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                              }`}
                            >
                              {cellDate.getDate()}
                            </span>
                            {dayEntries.length > 0 && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {dayEntries.length}
                              </span>
                            )}
                          </div>
                          <div className="space-y-1">
                            {dayEntries.slice(0, 3).map(({ program, roles }) => (
                              <button
                                key={program.id}
                                type="button"
                                onClick={() => viewProgramDetail(program)}
                                title={`${program.namaProgram} (${roles.map((r) => ROLE_LABELS[r]).join(', ')})`}
                                className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 truncate cursor-pointer"
                              >
                                {program.kodProgram}: {program.namaProgram}
                              </button>
                            ))}
                            {dayEntries.length > 3 && (
                              <span className="block text-[10px] text-slate-500 px-1">
                                +{dayEntries.length - 3} lagi
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weekly View */}
              {calendarMode === 'MINGGUAN' && (
                <div className="grid grid-cols-1 sm:grid-cols-7 gap-2.5">
                  {calendarWeekDays.map((day, i) => {
                    const dayIso = toIsoDay(day);
                    const isToday = dayIso === todayIso;
                    const dayEntries = getEntriesForDay(day);
                    return (
                      <div
                        key={dayIso}
                        className={`border rounded-xl p-3 space-y-2.5 min-h-[180px] ${
                          isToday ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 bg-slate-50/50'
                        }`}
                      >
                        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase text-slate-600">
                            {WEEKDAY_SHORT_MY[i]}
                          </span>
                          <span
                            className={`text-xs font-mono font-black px-1.5 py-0.5 rounded ${
                              isToday ? 'bg-blue-600 text-white' : 'text-slate-900'
                            }`}
                          >
                            {day.getDate()}/{day.getMonth() + 1}
                          </span>
                        </div>
                        {dayEntries.length === 0 ? (
                          <p className="text-[11px] text-slate-400 pt-2">Tiada program</p>
                        ) : (
                          <div className="space-y-1.5">
                            {dayEntries.map(({ program, roles }) => {
                              const cfg = getStatusConfig(program.statusProgram);
                              return (
                                <button
                                  key={program.id}
                                  type="button"
                                  onClick={() => viewProgramDetail(program)}
                                  className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-400 transition-colors cursor-pointer space-y-1"
                                >
                                  <span className="block text-[10px] font-mono font-bold text-slate-500">
                                    {program.kodProgram}
                                  </span>
                                  <span className="block text-[11px] font-bold text-slate-900 line-clamp-2 uppercase">
                                    {program.namaProgram}
                                  </span>
                                  <span className="block text-[10px] text-blue-700 font-semibold">
                                    {roles.map((r) => ROLE_LABELS[r]).join(' · ')}
                                  </span>
                                  <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded border ${cfg.badgeBg}`}>
                                    {cfg.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agenda / List View */}
              {calendarMode === 'SENARAI' && (
                <div className="space-y-2.5">
                  {myScopedEntries.length === 0 ? (
                    <div className="py-10 text-center text-xs text-slate-400">
                      Tiada program dijadualkan untuk akaun anda.
                    </div>
                  ) : (
                    [...myScopedEntries]
                      .sort((a, b) => (a.program.tarikhMula || '').localeCompare(b.program.tarikhMula || ''))
                      .map(({ program, roles }) => {
                        const cfg = getStatusConfig(program.statusProgram);
                        return (
                          <div
                            key={program.id}
                            className="p-4 border border-slate-200 rounded-xl hover:border-slate-400 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span className="font-mono font-bold text-slate-800">
                                  {formatDisplayDate(program.tarikhMula)} — {formatDisplayDate(program.tarikhTamat)}
                                </span>
                                <span className="text-slate-300">·</span>
                                <span className="font-mono text-slate-500">{program.kodProgram}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                                  {cfg.label}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-900 uppercase">
                                {program.namaProgram}
                              </p>
                              <p className="text-[11px] text-slate-600">
                                {program.tempat || '-'}, {program.negeri || '-'} · Peranan:{' '}
                                <strong className="text-blue-700">
                                  {roles.map((r) => ROLE_LABELS[r]).join(', ')}
                                </strong>
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => viewProgramDetail(program)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer self-start sm:self-center whitespace-nowrap shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Lihat Maklumat</span>
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              )}
            </section>
          )}

          {/* =============================================================== */}
          {/* VIEW 7: REKOD PINDAAN (BK04)                                    */}
          {/* =============================================================== */}
          {sidebarTab === 'rekodPindaan' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Jejak Audit Perubahan Program Saya
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
                  <History className="w-4 h-4 text-amber-600" />
                  <span>Rekod Pindaan Maklumat Program (BK04) ({allMyBk04Records.length})</span>
                </h3>
              </div>

              {allMyBk04Records.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  Tiada rekod pindaan BK04 dicatatkan bagi program kendalian anda buat masa ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {allMyBk04Records.map(({ program, roles, pindaan }, idx) => (
                    <div
                      key={`${program.id}_${pindaan.noPindaan}_${idx}`}
                      className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="font-mono font-bold text-amber-800">
                              Pindaan #{pindaan.noPindaan}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="font-mono text-slate-600">{pindaan.tarikhPindaan}</span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-700 font-semibold">
                              Oleh: {pindaan.dikemaskiniOleh}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 uppercase mt-1">
                            {program.kodProgram} — {program.namaProgram}
                          </h4>
                          <span className="text-[11px] text-blue-700 font-semibold">
                            Peranan Anda: {roles.map((r) => ROLE_LABELS[r]).join(', ')}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => viewProgramDetail(program)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg cursor-pointer self-start whitespace-nowrap shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Lihat Program</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
                        <table className="w-full text-[11px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                              <th className="py-2 px-3 text-left">Butiran Perubahan</th>
                              <th className="py-2 px-3 text-left">Maklumat Asal</th>
                              <th className="py-2 px-3 text-left">Maklumat Terkini</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(pindaan.perubahan || []).map((ch, cIdx) => (
                              <tr key={cIdx}>
                                <td className="py-2 px-3 font-semibold text-slate-800">{ch.jenisPerubahan}</td>
                                <td className="py-2 px-3 text-slate-500">{ch.maklumatAsal || '-'}</td>
                                <td className="py-2 px-3 font-semibold text-slate-900">{ch.maklumatTerkini || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* =============================================================== */}
          {/* VIEW 8: PROFIL SAYA                                             */}
          {/* =============================================================== */}
          {sidebarTab === 'profilSaya' && (
            <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {activeOfficerIdentity.pegawai?.photoUrl || currentUser?.photoUrl ? (
                    <img
                      src={activeOfficerIdentity.pegawai?.photoUrl || currentUser?.photoUrl}
                      alt={activeOfficerIdentity.displayName}
                      className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-lg font-black">
                      {activeOfficerIdentity.displayName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                      Profil Pegawai Terdaftar
                    </span>
                    <h3 className="text-lg font-black text-slate-900 uppercase mt-0.5">
                      {activeOfficerIdentity.displayName}
                    </h3>
                    <p className="text-xs font-mono text-slate-600">
                      ID Pegawai: <strong>{activeOfficerIdentity.displayId}</strong> · ID Akaun:{' '}
                      <strong>{currentUser?.id}</strong>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  {
                    label: 'Jawatan',
                    val: activeOfficerIdentity.pegawai?.jawatan || '-',
                  },
                  {
                    label: 'Peranan Sistem (Level ID)',
                    val: currentUser?.levelId || 'PEGAWAI',
                  },
                  {
                    label: 'Jabatan',
                    val: activeOfficerIdentity.pegawai?.jabatan || currentUser?.jabatan || '-',
                  },
                  {
                    label: 'Pusat',
                    val: activeOfficerIdentity.pegawai?.pusat || currentUser?.pusat || '-',
                  },
                  {
                    label: 'Emel Rasmi',
                    val: activeOfficerIdentity.pegawai?.emel || currentUser?.emel || '-',
                  },
                  {
                    label: 'No. Telefon / HP',
                    val: activeOfficerIdentity.pegawai?.noHp || '-',
                  },
                ].map((field) => (
                  <div key={field.label} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      {field.label}
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 block">{field.val}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Jumlah Program</span>
                  <strong className="text-lg font-mono text-slate-900">{kpiStats.total}</strong>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Sebagai Pengurus</span>
                  <strong className="text-lg font-mono text-blue-700">
                    {roleBreakdown.counts.PENGURUS}
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Pengurus Bersama</span>
                  <strong className="text-lg font-mono text-teal-700">
                    {roleBreakdown.counts['PENGURUS BERSAMA']}
                  </strong>
                </div>
                <div className="p-3.5 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 block">Urus Setia</span>
                  <strong className="text-lg font-mono text-amber-700">
                    {roleBreakdown.counts['URUS SETIA']}
                  </strong>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
