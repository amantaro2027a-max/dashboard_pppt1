import React, { useMemo, useState } from 'react';
import { Pegawai, ProgramItem } from '../types/program';
import { formatRM, formatRMWithPrefix, getStatusConfig } from '../utils/formatters';
import { getProgramFinanceAggregate } from '../utils/financeCalculations';
import {
  computeNearOrOverduePrograms,
  computeOfficerInvolvementList,
  computeProgramStatusKpis,
  computeRoleInvolvementSummary,
  formatDisplayDate,
  groupProgramsByField,
  groupProgramsByMonth,
  groupProgramsByYear,
  ROLE_COLORS,
  ROLE_LABELS,
} from '../utils/dashboardAnalytics';
import { OrgProgramCalendar } from './OrgProgramCalendar';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  LayoutDashboard,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

interface DashboardJabatanSectionProps {
  selectedJabatan: string;
  filterTahun: string;
  jabatanPrograms: ProgramItem[]; // Year-filtered & deduplicated by Kod Program
  allJabatanPrograms: ProgramItem[]; // All years for this Jabatan (deduplicated) for multi-year chart
  jabatanOfficers: Pegawai[];
  allPegawaiList: Pegawai[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewProgram: (p: ProgramItem) => void;
  onDrillDown: (title: string, subtitle: string, items: ProgramItem[]) => void;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  SELESAI: '#059669',
  'DALAM TINDAKAN': '#1d4ed8',
  TANGGUNG: '#d97706',
  'BELUM AMBIL TINDAKAN': '#64748b',
  BATAL: '#e11d48',
};

const OS_KEYS = [
  { key: 'os21000' as const, label: 'OS21000', desc: 'Perjalanan & Sara Hidup' },
  { key: 'os24000' as const, label: 'OS24000', desc: 'Sewaan & Kemudahan' },
  { key: 'os27000' as const, label: 'OS27000', desc: 'Bekalan & Bahan' },
  { key: 'os29000' as const, label: 'OS29000', desc: 'Perkhidmatan Ikhtisas' },
];

export const DashboardJabatanSection: React.FC<DashboardJabatanSectionProps> = ({
  selectedJabatan,
  filterTahun,
  jabatanPrograms,
  allJabatanPrograms,
  jabatanOfficers,
  allPegawaiList,
  isExpanded,
  onToggleExpand,
  onViewProgram,
  onDrillDown,
}) => {
  const [hoveredRole, setHoveredRole] = useState<'PENGURUS' | 'PENGURUS BERSAMA' | 'URUS SETIA' | null>(null);
  const [financeSortMode, setFinanceSortMode] = useState<'PERUNTUKAN' | 'BELANJA'>('PERUNTUKAN');

  const statusKpis = useMemo(() => computeProgramStatusKpis(jabatanPrograms), [jabatanPrograms]);

  const financeAgg = useMemo(
    () => getProgramFinanceAggregate(jabatanPrograms, true),
    [jabatanPrograms]
  );

  const officerInvolvements = useMemo(
    () => computeOfficerInvolvementList(jabatanPrograms, jabatanOfficers, allPegawaiList),
    [jabatanPrograms, jabatanOfficers, allPegawaiList]
  );

  const activeOfficersCount = useMemo(
    () => officerInvolvements.filter((o) => o.totalUniquePrograms > 0).length,
    [officerInvolvements]
  );

  const byStatus = useMemo(
    () =>
      groupProgramsByField(jabatanPrograms, (p) =>
        (p.statusProgram || 'BELUM AMBIL TINDAKAN').trim().toUpperCase()
      ),
    [jabatanPrograms]
  );

  const byJenis = useMemo(
    () =>
      groupProgramsByField(jabatanPrograms, (p) =>
        (p.jenisProgram || 'TIDAK DINYATAKAN').trim().toUpperCase()
      ),
    [jabatanPrograms]
  );

  const byYear = useMemo(() => groupProgramsByYear(allJabatanPrograms), [allJabatanPrograms]);

  const roleSummary = useMemo(
    () => computeRoleInvolvementSummary(jabatanPrograms),
    [jabatanPrograms]
  );

  const byMonth = useMemo(() => groupProgramsByMonth(jabatanPrograms), [jabatanPrograms]);

  const nearOrOverdue = useMemo(
    () => computeNearOrOverduePrograms(jabatanPrograms),
    [jabatanPrograms]
  );

  // Donut segments for roles
  const roleDonutSegments = useMemo(() => {
    const items = [
      {
        role: 'PENGURUS' as const,
        label: ROLE_LABELS.PENGURUS,
        count: roleSummary.pengurus.count,
        programs: roleSummary.pengurus.programs,
        color: ROLE_COLORS.PENGURUS,
      },
      {
        role: 'PENGURUS BERSAMA' as const,
        label: ROLE_LABELS['PENGURUS BERSAMA'],
        count: roleSummary.pengurusBersama.count,
        programs: roleSummary.pengurusBersama.programs,
        color: ROLE_COLORS['PENGURUS BERSAMA'],
      },
      {
        role: 'URUS SETIA' as const,
        label: ROLE_LABELS['URUS SETIA'],
        count: roleSummary.urusSetia.count,
        programs: roleSummary.urusSetia.programs,
        color: ROLE_COLORS['URUS SETIA'],
      },
    ];
    const totalAssign = items.reduce((sum, i) => sum + i.count, 0);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    return {
      totalAssign,
      circumference,
      segments: items.map((item) => {
        const pct = totalAssign > 0 ? Math.round((item.count / totalAssign) * 100) : 0;
        const dashLength = totalAssign > 0 ? (item.count / totalAssign) * circumference : 0;
        const dashOffset = -offsetAcc;
        offsetAcc += dashLength;
        return { ...item, pct, dashLength, dashOffset };
      }),
    };
  }, [roleSummary]);

  const maxStatusCount = Math.max(1, ...byStatus.map((s) => s.count));
  const maxJenisCount = Math.max(1, ...byJenis.map((j) => j.count));
  const maxYearCount = Math.max(1, ...byYear.map((y) => y.count));
  const maxMonthCount = Math.max(1, ...byMonth.map((m) => m.count));
  const maxOfficerProg = Math.max(1, ...officerInvolvements.map((o) => o.totalUniquePrograms));
  const maxOsAmount = Math.max(
    1,
    ...OS_KEYS.map((o) => financeAgg.diagihkan[o.key])
  );

  const programsFinanceComparison = useMemo(() => {
    const sorted = [...jabatanPrograms].sort((a, b) => {
      if (financeSortMode === 'BELANJA') {
        return (Number(b.jumlahBelanjaRm) || 0) - (Number(a.jumlahBelanjaRm) || 0);
      }
      return (Number(b.jumlahRm) || 0) - (Number(a.jumlahRm) || 0);
    });
    return sorted;
  }, [jabatanPrograms, financeSortMode]);

  const maxProgramBudget = useMemo(
    () =>
      Math.max(
        1,
        ...programsFinanceComparison.map((p) =>
          Math.max(Number(p.jumlahRm) || 0, Number(p.jumlahBelanjaRm) || 0)
        )
      ),
    [programsFinanceComparison]
  );

  const kpiCards = [
    {
      label: 'Jumlah Keseluruhan Program',
      value: statusKpis.total,
      accent: 'text-slate-900',
      sub: 'Kod program unik',
      onClick: () =>
        onDrillDown(
          `Semua Program · ${selectedJabatan}`,
          `${statusKpis.total} program (${filterTahun === 'SEMUA' ? 'Semua Tahun' : `Tahun ${filterTahun}`})`,
          jabatanPrograms
        ),
    },
    {
      label: 'Program Selesai',
      value: statusKpis.selesai,
      accent: 'text-emerald-700',
      sub: `${statusKpis.total > 0 ? Math.round((statusKpis.selesai / statusKpis.total) * 100) : 0}% daripada jumlah`,
      onClick: () =>
        onDrillDown(
          `Program Selesai · ${selectedJabatan}`,
          `${statusKpis.selesai} program`,
          jabatanPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI')
        ),
    },
    {
      label: 'Program Tanggung',
      value: statusKpis.tanggung,
      accent: 'text-amber-700',
      sub: 'Status Tanggung',
      onClick: () =>
        onDrillDown(
          `Program Tanggung · ${selectedJabatan}`,
          `${statusKpis.tanggung} program`,
          jabatanPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG')
        ),
    },
    {
      label: 'Program Dalam Tindakan',
      value: statusKpis.dalamTindakan,
      accent: 'text-blue-800',
      sub: 'Sedang dilaksanakan',
      onClick: () =>
        onDrillDown(
          `Program Dalam Tindakan · ${selectedJabatan}`,
          `${statusKpis.dalamTindakan} program`,
          jabatanPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN')
        ),
    },
    {
      label: 'Program Belum Ambil Tindakan',
      value: statusKpis.belum,
      accent: 'text-slate-700',
      sub: 'Menunggu tindakan',
      onClick: () =>
        onDrillDown(
          `Belum Ambil Tindakan · ${selectedJabatan}`,
          `${statusKpis.belum} program`,
          jabatanPrograms.filter((p) => {
            const st = (p.statusProgram || '').trim().toUpperCase();
            return !['SELESAI', 'TANGGUNG', 'DALAM TINDAKAN', 'BATAL'].includes(st);
          })
        ),
    },
    {
      label: 'Program Batal',
      value: statusKpis.batal,
      accent: 'text-rose-700',
      sub: 'Dibatalkan',
      onClick: () =>
        onDrillDown(
          `Program Batal · ${selectedJabatan}`,
          `${statusKpis.batal} program`,
          jabatanPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL')
        ),
    },
    {
      label: 'Jumlah Pegawai Terlibat',
      value: activeOfficersCount,
      accent: 'text-blue-900',
      sub: `${jabatanOfficers.length} berdaftar di jabatan`,
      onClick: undefined,
    },
    {
      label: 'Jumlah Peruntukan Diterima',
      value: formatRMWithPrefix(financeAgg.diagihkan.total),
      accent: 'text-blue-950',
      sub: 'BK65 (tanpa pengiraan berganda)',
      isCurrency: true,
      onClick: undefined,
    },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            Dashboard Jabatan · Prestasi, Kewangan &amp; Kalendar
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-blue-900" />
            <span>DASHBOARD JABATAN ({selectedJabatan || '-'})</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Ringkasan KPI pelaksanaan, pecahan status &amp; peranan, peruntukan BK65 mengikut Kod OS, pemantauan tarikh dan kalendar jabatan.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Skop Paparan
            </span>
            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
              {statusKpis.total} Program · {filterTahun === 'SEMUA' ? 'Semua Tahun' : `Tahun ${filterTahun}`}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg whitespace-nowrap">
            <span>{isExpanded ? 'Sembunyi' : 'Papar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 sm:p-6 border-t border-slate-200 bg-slate-50/40 space-y-6">
          {/* 1. DYNAMIC KPI CARDS (8 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {kpiCards.map((card) => {
              const Wrapper = card.onClick ? 'button' : 'div';
              return (
                <Wrapper
                  key={card.label}
                  {...(card.onClick ? { type: 'button' as const, onClick: card.onClick } : {})}
                  className={`text-left bg-white border border-slate-200 rounded-xl p-4 transition-colors ${
                    card.onClick ? 'hover:border-blue-900 cursor-pointer' : ''
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block leading-snug">
                    {card.label}
                  </span>
                  <span
                    className={`mt-2 block font-black font-mono tabular-nums ${card.accent} ${
                      card.isCurrency ? 'text-lg sm:text-xl' : 'text-2xl'
                    }`}
                  >
                    {card.value}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">{card.sub}</span>
                </Wrapper>
              );
            })}
          </div>

          {/* 2. INTERACTIVE CHARTS & SUMMARIES (STATUS, JENIS, TAHUN) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Program mengikut Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Analisis Status
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Status</span>
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">Klik baris</span>
              </div>

              {byStatus.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tiada rekod program.</p>
              ) : (
                <div className="space-y-3">
                  {byStatus.map((item) => {
                    const cfg = getStatusConfig(item.label);
                    const pct = Math.round((item.count / Math.max(1, statusKpis.total)) * 100);
                    const barW = (item.count / maxStatusCount) * 100;
                    const color = STATUS_BAR_COLORS[item.label] || '#334155';
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            `Status: ${cfg.label}`,
                            `${item.count} program di bawah ${selectedJabatan}`,
                            item.programs
                          )
                        }
                        className="w-full text-left group cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-bold text-slate-800 group-hover:text-blue-900 truncate">
                            {cfg.label}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${barW}%`, backgroundColor: color }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Program mengikut Jenis */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Kategori Pelaksanaan
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <BarChart3 className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Jenis</span>
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{byJenis.length} Jenis</span>
              </div>

              {byJenis.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tiada rekod jenis program.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {byJenis.map((item) => {
                    const barW = (item.count / maxJenisCount) * 100;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            `Jenis: ${item.label}`,
                            `${item.count} program · ${formatRMWithPrefix(item.peruntukan)}`,
                            item.programs
                          )
                        }
                        className="w-full text-left group cursor-pointer space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                            {item.label}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                            {item.count}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-900 rounded-full transition-all"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Program mengikut Tahun */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Rekod Tahunan Jabatan
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <TrendingUp className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Tahun</span>
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">{byYear.length} Tahun</span>
              </div>

              {byYear.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">Tiada rekod tahunan.</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {byYear.map((yr) => {
                    const barW = (yr.count / maxYearCount) * 100;
                    const selesaiW = yr.count > 0 ? (yr.selesai / yr.count) * 100 : 0;
                    return (
                      <button
                        key={yr.tahun}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            `Program Tahun ${yr.tahun} · ${selectedJabatan}`,
                            `${yr.count} program (${yr.selesai} selesai) · ${formatRMWithPrefix(yr.peruntukan)}`,
                            yr.programs
                          )
                        }
                        className="w-full text-left group cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-black text-slate-900 group-hover:text-blue-900">
                            {yr.tahun}
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                            <strong>{yr.count}</strong> prog · <span className="text-emerald-700">{yr.selesai} selesai</span> · {formatRMWithPrefix(yr.peruntukan)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-400 rounded-full flex overflow-hidden" style={{ width: `${barW}%` }}>
                            <div className="h-full bg-emerald-600" style={{ width: `${selesaiW}%` }} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. PEGAWAI, PERANAN (DONUT) & BULAN PELAKSANAAN */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Program Mengikut Peranan (Pengurus, Pengurus Bersama, Urus Setia) */}
            <div className="xl:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Taburan Penugasan Peranan
                </span>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <PieChart className="w-4 h-4 text-blue-900" />
                  <span>Program Mengikut Peranan</span>
                </h4>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                  <svg viewBox="0 0 130 130" className="w-36 h-36 -rotate-90">
                    <circle
                      cx="65"
                      cy="65"
                      r="50"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="16"
                    />
                    {roleDonutSegments.segments.map((seg) => (
                      <circle
                        key={seg.role}
                        cx="65"
                        cy="65"
                        r="50"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={hoveredRole === seg.role ? '19' : '16'}
                        strokeDasharray={`${seg.dashLength} ${roleDonutSegments.circumference}`}
                        strokeDashoffset={seg.dashOffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredRole(seg.role)}
                        onMouseLeave={() => setHoveredRole(null)}
                        onClick={() =>
                          onDrillDown(
                            `Peranan: ${seg.label}`,
                            `${seg.count} program di bawah ${selectedJabatan}`,
                            seg.programs
                          )
                        }
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                    <span className="text-xl font-black text-slate-900 font-mono tabular-nums">
                      {statusKpis.total}
                    </span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Program</span>
                  </div>
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  {roleDonutSegments.segments.map((seg) => (
                    <button
                      key={seg.role}
                      type="button"
                      onMouseEnter={() => setHoveredRole(seg.role)}
                      onMouseLeave={() => setHoveredRole(null)}
                      onClick={() =>
                        onDrillDown(
                          `Peranan: ${seg.label}`,
                          `${seg.count} program di bawah ${selectedJabatan}`,
                          seg.programs
                        )
                      }
                      className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-900 bg-slate-50/60 hover:bg-white transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-xs shrink-0"
                            style={{ backgroundColor: seg.color }}
                          />
                          <span>{seg.label}</span>
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {seg.count} ({seg.pct}%)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Program Mengikut Pegawai */}
            <div className="xl:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Penglibatan Pegawai Jabatan
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Pegawai ({officerInvolvements.length})</span>
                  </h4>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Klik pegawai untuk senarai program
                </span>
              </div>

              {officerInvolvements.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">
                  Tiada rekod penglibatan pegawai bagi jabatan ini.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {officerInvolvements.map((o) => {
                    const barW = (o.totalUniquePrograms / maxOfficerProg) * 100;
                    return (
                      <button
                        key={o.pegawai.id}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            o.pegawai.nama,
                            `${o.totalUniquePrograms} Program Unik · Pengurus: ${o.pengurusCount} · Bersama: ${o.pengurusBersamaCount} · Urus Setia: ${o.urusSetiaCount}`,
                            o.programs
                          )
                        }
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-900 bg-slate-50/40 hover:bg-white transition-colors cursor-pointer space-y-1.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-bold text-slate-900 uppercase truncate">
                            {o.pegawai.nama}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 tabular-nums shrink-0">
                            <strong className="text-slate-900">{o.totalUniquePrograms} prog</strong> · P:{o.pengurusCount} · PB:{o.pengurusBersamaCount} · US:{o.urusSetiaCount}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-900 rounded-full"
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Program Mengikut Bulan Pelaksanaan (Jan - Dis) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Taburan Bulanan
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  Program Mengikut Bulan Pelaksanaan (Januari – Disember)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Klik mana-mana bulan untuk lihat program</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end pt-2">
              {byMonth.map((m) => {
                const heightPct = m.count > 0 ? Math.max(12, Math.round((m.count / maxMonthCount) * 100)) : 4;
                return (
                  <button
                    key={m.month}
                    type="button"
                    disabled={m.count === 0}
                    onClick={() =>
                      onDrillDown(
                        `Program Bulan ${m.name} · ${selectedJabatan}`,
                        `${m.count} program dijadualkan`,
                        m.programs
                      )
                    }
                    className={`flex flex-col items-center gap-1.5 group ${
                      m.count > 0 ? 'cursor-pointer' : 'cursor-default opacity-60'
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums">
                      {m.count}
                    </span>
                    <div className="w-full h-24 bg-slate-100 rounded-md flex items-end overflow-hidden p-0.5 border border-slate-200 group-hover:border-blue-900">
                      <div
                        className={`w-full rounded-xs transition-all ${
                          m.count > 0 ? 'bg-blue-900 group-hover:bg-blue-700' : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{m.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PERUNTUKAN KEWANGAN MENGIKUT KOD OS & PROGRAM (BK65) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Analisis Kewangan BK65 Program Jabatan
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Wallet className="w-4 h-4 text-blue-900" />
                  <span>Peruntukan Kewangan Mengikut Objek Sebagai (OS) &amp; Program</span>
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Dikira secara automatik tanpa pengiraan berganda
              </span>
            </div>

            {/* 5 Cards: OS21000, OS24000, OS27000, OS29000, Jumlah Keseluruhan Peruntukan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {OS_KEYS.map((osItem) => {
                const amt = financeAgg.diagihkan[osItem.key];
                const share =
                  financeAgg.diagihkan.total > 0
                    ? Math.round((amt / financeAgg.diagihkan.total) * 100)
                    : 0;
                return (
                  <div
                    key={osItem.key}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900 font-mono">
                        {osItem.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {share}%
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono tabular-nums">
                      {formatRMWithPrefix(amt)}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{osItem.desc}</div>
                  </div>
                );
              })}

              <div className="bg-slate-900 text-white border border-slate-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Jumlah Keseluruhan Peruntukan
                </span>
                <div className="text-base font-black text-white font-mono tabular-nums">
                  {formatRMWithPrefix(financeAgg.diagihkan.total)}
                </div>
                <div className="text-[10px] text-slate-300">
                  Belanja: {formatRMWithPrefix(financeAgg.belanja.total)}
                </div>
              </div>
            </div>

            {/* Comparison Charts: By Kod OS and By Programme */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Chart 1: Comparison by Kod OS */}
              <div className="lg:col-span-5 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3.5">
                <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Perbandingan Peruntukan Mengikut Kod OS
                </h5>
                <div className="space-y-3">
                  {OS_KEYS.map((osItem) => {
                    const allocAmt = financeAgg.diagihkan[osItem.key];
                    const spentAmt = financeAgg.belanja[osItem.key];
                    const allocW = (allocAmt / maxOsAmount) * 100;
                    const spentW = (spentAmt / maxOsAmount) * 100;
                    return (
                      <div key={osItem.key} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-900">{osItem.label}</span>
                          <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                            <strong>RM {formatRM(allocAmt)}</strong> · Belanja: RM {formatRM(spentAmt)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-900 rounded-full"
                              style={{ width: `${allocW}%` }}
                            />
                          </div>
                          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-600 rounded-full"
                              style={{ width: `${spentW}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 pt-2 border-t border-slate-200 text-[10px] text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-blue-900 rounded-xs inline-block" /> Peruntukan (BK65)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block" /> Belanja Sebenar
                  </span>
                </div>
              </div>

              {/* Chart 2: Comparison by Program */}
              <div className="lg:col-span-7 border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Perbandingan Peruntukan Mengikut Program ({programsFinanceComparison.length})
                  </h5>
                  <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 self-start">
                    <button
                      type="button"
                      onClick={() => setFinanceSortMode('PERUNTUKAN')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer whitespace-nowrap ${
                        financeSortMode === 'PERUNTUKAN'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Susun Peruntukan
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinanceSortMode('BELANJA')}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded cursor-pointer whitespace-nowrap ${
                        financeSortMode === 'BELANJA'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Susun Belanja
                    </button>
                  </div>
                </div>

                {programsFinanceComparison.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">
                    Tiada rekod program kewangan bagi jabatan ini.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                    {programsFinanceComparison.map((p) => {
                      const alloc = Number(p.jumlahRm) || 0;
                      const spent = Number(p.jumlahBelanjaRm) || 0;
                      const allocW = (alloc / maxProgramBudget) * 100;
                      const spentW = (spent / maxProgramBudget) * 100;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onViewProgram(p)}
                          className="w-full text-left p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-900 transition-colors cursor-pointer space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-bold text-slate-900 uppercase truncate">
                              <span className="font-mono text-slate-500 mr-1.5">{p.kodProgram}</span>
                              {p.namaProgram}
                            </span>
                            <span className="font-mono text-[11px] font-bold text-slate-900 shrink-0 tabular-nums">
                              RM {formatRM(alloc)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-900 rounded-full" style={{ width: `${allocW}%` }} />
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${spentW}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>
                              OS21:{formatRM(p.os21000)} · OS24:{formatRM(p.os24000)} · OS27:{formatRM(p.os27000)} · OS29:{formatRM(p.os29000)}
                            </span>
                            <span className="text-emerald-700 font-bold">
                              Belanja: RM {formatRM(spent)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 5. PEMANTAUAN TARIKH PELAKSANAAN (HAMPIR ATAU MELEPASI TARIKH) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Pemantauan Tarikh Pelaksanaan Jabatan
                </span>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Hampir atau Melepasi Tarikh Pelaksanaan</span>
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                {nearOrOverdue.length} Program Perlu Perhatian
              </span>
            </div>

            {nearOrOverdue.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tiada program jabatan yang hampir tiba (≤14 hari) atau melepasi tarikh tanpa penyelesaian.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {nearOrOverdue.map(({ program, kind, daysDiff }) => {
                  const cfg = getStatusConfig(program.statusProgram);
                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => onViewProgram(program)}
                      className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-900 bg-slate-50/50 hover:bg-white transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            kind === 'MELEPASI' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {kind === 'MELEPASI'
                              ? `Melepasi tarikh (${daysDiff} hari lalu)`
                              : daysDiff === 0
                              ? 'Bermula hari ini'
                              : `Hampir tiba (${daysDiff} hari lagi)`}
                          </span>
                        </span>
                        <span className="font-mono text-slate-500">{program.kodProgram}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 uppercase line-clamp-2">
                        {program.namaProgram}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span className="truncate">{program.pengurusNama || '-'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${cfg.badgeBg}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                        <span>{program.tempoh || formatDisplayDate(program.tarikhMula)}</span>
                        <span className="text-blue-900 font-sans font-bold inline-flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Lihat
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. KALENDAR PROGRAM JABATAN (BULANAN, MINGGUAN, SENARAI) */}
          <OrgProgramCalendar
            title={`Kalendar Program · ${selectedJabatan}`}
            subtitle="Jadual Keseluruhan Program Jabatan"
            programs={jabatanPrograms}
            officers={jabatanOfficers}
            onViewProgram={onViewProgram}
          />
        </div>
      )}
    </section>
  );
};
