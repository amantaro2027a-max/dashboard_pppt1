import React, { useMemo, useState } from 'react';
import { Pegawai, ProgramItem } from '../types/program';
import { getStatusConfig } from '../utils/formatters';
import {
  doesProgramOverlapDay,
  formatDisplayDate,
  getOfficerRolesInProgram,
  MONTH_NAMES_MY,
  startOfDay,
  toIsoDay,
  WEEKDAY_SHORT_MY,
} from '../utils/dashboardAnalytics';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
} from 'lucide-react';

type CalendarMode = 'BULANAN' | 'MINGGUAN' | 'SENARAI';

interface OrgProgramCalendarProps {
  title: string;
  subtitle: string;
  programs: ProgramItem[];
  officers: Pegawai[];
  jabatanOptions?: string[];
  onViewProgram: (p: ProgramItem) => void;
}

export const OrgProgramCalendar: React.FC<OrgProgramCalendarProps> = ({
  title,
  subtitle,
  programs,
  officers,
  jabatanOptions,
  onViewProgram,
}) => {
  const [calendarMode, setCalendarMode] = useState<CalendarMode>('BULANAN');
  const [calendarCursor, setCalendarCursor] = useState<Date>(() => startOfDay(new Date()));
  const [filterJabatan, setFilterJabatan] = useState<string>('SEMUA');
  const [filterPegawaiId, setFilterPegawaiId] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterJenis, setFilterJenis] = useState<string>('SEMUA');

  const filterLists = useMemo(() => {
    const statuses = new Set<string>();
    const jenis = new Set<string>();
    programs.forEach((p) => {
      if (p.statusProgram) statuses.add(p.statusProgram.trim().toUpperCase());
      if (p.jenisProgram) jenis.add(p.jenisProgram.trim());
    });
    return {
      statuses: Array.from(statuses).sort(),
      jenis: Array.from(jenis).sort(),
    };
  }, [programs]);

  const sortedOfficers = useMemo(() => {
    return [...officers].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [officers]);

  const filteredEvents = useMemo(() => {
    const selectedOfficer =
      filterPegawaiId !== 'SEMUA'
        ? officers.find((o) => o.id === filterPegawaiId) || null
        : null;

    return programs
      .filter((p) => {
        if (filterJabatan !== 'SEMUA' && (p.jabatan || '').trim() !== filterJabatan) {
          return false;
        }
        if (
          filterStatus !== 'SEMUA' &&
          (p.statusProgram || '').trim().toUpperCase() !== filterStatus
        ) {
          return false;
        }
        if (filterJenis !== 'SEMUA' && (p.jenisProgram || '').trim() !== filterJenis) {
          return false;
        }
        if (selectedOfficer) {
          const roles = getOfficerRolesInProgram(selectedOfficer, p);
          if (roles.length === 0) return false;
        }
        return true;
      })
      .sort((a, b) => (a.tarikhMula || '').localeCompare(b.tarikhMula || ''));
  }, [programs, officers, filterJabatan, filterPegawaiId, filterStatus, filterJenis]);

  const calendarDays = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(year, month, 1 - startOffset);

    const days: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarCursor]);

  const weekDays = useMemo(() => {
    const dayOfWeek = (calendarCursor.getDay() + 6) % 7;
    const monday = new Date(calendarCursor);
    monday.setDate(calendarCursor.getDate() - dayOfWeek);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [calendarCursor]);

  const navigateCalendar = (dir: -1 | 1) => {
    setCalendarCursor((prev) => {
      const next = new Date(prev);
      if (calendarMode === 'MINGGUAN') {
        next.setDate(prev.getDate() + dir * 7);
      } else {
        next.setMonth(prev.getMonth() + dir);
      }
      return next;
    });
  };

  const resetFilters = () => {
    setFilterJabatan('SEMUA');
    setFilterPegawaiId('SEMUA');
    setFilterStatus('SEMUA');
    setFilterJenis('SEMUA');
  };

  const todayIso = toIsoDay(new Date());
  const hasActiveFilter =
    filterJabatan !== 'SEMUA' ||
    filterPegawaiId !== 'SEMUA' ||
    filterStatus !== 'SEMUA' ||
    filterJenis !== 'SEMUA';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      {/* Header & View Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            {subtitle}
          </span>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-900" />
            <span>
              {title} — {MONTH_NAMES_MY[calendarCursor.getMonth()]} {calendarCursor.getFullYear()}
            </span>
          </h4>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
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
                <ChevronLeft className="w-4 h-4 text-slate-700" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarCursor(startOfDay(new Date()))}
                className="px-2.5 py-1.5 text-xs font-bold border border-slate-200 rounded-lg hover:bg-slate-100 text-slate-800 cursor-pointer whitespace-nowrap"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => navigateCalendar(1)}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 cursor-pointer"
                title="Seterusnya"
              >
                <ChevronRight className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
        {jabatanOptions && jabatanOptions.length > 0 && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Jabatan
            </label>
            <select
              value={filterJabatan}
              onChange={(e) => setFilterJabatan(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900"
            >
              <option value="SEMUA">Semua Jabatan</option>
              {jabatanOptions.map((jab) => (
                <option key={jab} value={jab}>
                  {jab}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Pegawai
          </label>
          <select
            value={filterPegawaiId}
            onChange={(e) => setFilterPegawaiId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900"
          >
            <option value="SEMUA">Semua Pegawai</option>
            {sortedOfficers.map((pg) => (
              <option key={pg.id} value={pg.id}>
                {pg.nama}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Status Program
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900"
          >
            <option value="SEMUA">Semua Status</option>
            {filterLists.statuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Jenis Program
          </label>
          <select
            value={filterJenis}
            onChange={(e) => setFilterJenis(e.target.value)}
            className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900"
          >
            <option value="SEMUA">Semua Jenis</option>
            {filterLists.jenis.map((jn) => (
              <option key={jn} value={jn}>
                {jn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-bold text-slate-600 tabular-nums">
            {filteredEvents.length} Program
          </span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Set Semula</span>
            </button>
          )}
        </div>
      </div>

      {/* Mode 1: Bulanan */}
      {calendarMode === 'BULANAN' && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider">
            {WEEKDAY_SHORT_MY.map((d) => (
              <div key={d} className="py-2 px-2 text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-slate-50/40">
            {calendarDays.map((day) => {
              const iso = toIsoDay(day);
              const inMonth = day.getMonth() === calendarCursor.getMonth();
              const isToday = iso === todayIso;
              const dayPrograms = filteredEvents.filter((p) => doesProgramOverlapDay(p, day));

              return (
                <div
                  key={iso}
                  className={`min-h-[96px] p-1.5 flex flex-col gap-1 ${
                    inMonth ? 'bg-white' : 'bg-slate-50/80 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday
                          ? 'bg-blue-900 text-white'
                          : inMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {dayPrograms.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {dayPrograms.length}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayPrograms.slice(0, 3).map((p) => {
                      const cfg = getStatusConfig(p.statusProgram);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onViewProgram(p)}
                          className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-bold truncate border cursor-pointer ${cfg.badgeBg}`}
                          title={`${p.kodProgram} — ${p.namaProgram} (${p.statusProgram})`}
                        >
                          {p.namaProgram}
                        </button>
                      );
                    })}
                    {dayPrograms.length > 3 && (
                      <div className="text-[10px] font-bold text-blue-900 px-1">
                        +{dayPrograms.length - 3} lagi
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mode 2: Mingguan */}
      {calendarMode === 'MINGGUAN' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day, idx) => {
            const iso = toIsoDay(day);
            const isToday = iso === todayIso;
            const dayPrograms = filteredEvents.filter((p) => doesProgramOverlapDay(p, day));

            return (
              <div
                key={iso}
                className={`border rounded-xl p-3 space-y-2 ${
                  isToday ? 'border-blue-900 bg-blue-50/30' : 'border-slate-200 bg-slate-50/40'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-700">{WEEKDAY_SHORT_MY[idx]}</span>
                  <span
                    className={`text-xs font-mono font-black px-2 py-0.5 rounded ${
                      isToday ? 'bg-blue-900 text-white' : 'bg-white border border-slate-200 text-slate-800'
                    }`}
                  >
                    {day.getDate()}/{day.getMonth() + 1}
                  </span>
                </div>
                {dayPrograms.length === 0 ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center">Tiada program</p>
                ) : (
                  <div className="space-y-2">
                    {dayPrograms.map((p) => {
                      const cfg = getStatusConfig(p.statusProgram);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onViewProgram(p)}
                          className="w-full text-left p-2 rounded-lg bg-white border border-slate-200 hover:border-blue-900 transition-colors cursor-pointer space-y-1"
                        >
                          <div className="text-[10px] font-mono text-slate-500">{p.kodProgram}</div>
                          <div className="text-[11px] font-bold text-slate-900 line-clamp-2 uppercase">
                            {p.namaProgram}
                          </div>
                          <div className="text-[10px] text-slate-500 truncate">
                            {p.pengurusNama || '-'}
                          </div>
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

      {/* Mode 3: Senarai */}
      {calendarMode === 'SENARAI' && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Tarikh Mula</th>
                <th className="py-2.5 px-3">Tarikh Tamat</th>
                <th className="py-2.5 px-3">Kod</th>
                <th className="py-2.5 px-3 min-w-[200px]">Nama Program</th>
                <th className="py-2.5 px-3">Jenis</th>
                <th className="py-2.5 px-3">Pengurus</th>
                <th className="py-2.5 px-3">Tempat</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-center">Lihat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Tiada program dijadualkan bagi tapisan yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((p) => {
                  const cfg = getStatusConfig(p.statusProgram);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-800">
                        {formatDisplayDate(p.tarikhMula)}
                      </td>
                      <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-600">
                        {formatDisplayDate(p.tarikhTamat)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {p.kodProgram}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">
                        {p.namaProgram}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.jenisProgram || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-700 uppercase text-[11px]">
                        {p.pengurusNama || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{p.tempat || '-'}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onViewProgram(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          <Eye className="w-3 h-3 text-blue-900" />
                          <span>Perincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
