import React, { useMemo, useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber, formatRM, getStatusConfig } from '../utils/formatters';
import { PUSAT_LIST, JABATAN_MAP, SUMBER_KEWANGAN_LIST, BULAN_LIST } from '../data/constants';
import { BarChart3, PieChart, Landmark, ArrowRight, Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export const DashboardCharts: React.FC = () => {
  const { filteredPrograms, setActiveTab, viewProgramDetail, financialStats } = useProgramContext();

  // Distribution by Pusat
  const pusatData = useMemo(() => {
    return PUSAT_LIST.map((pusat) => {
      const items = filteredPrograms.filter((p) => p.pusat === pusat);
      const totalPeserta = items.reduce((sum, p) => sum + (Number(p.bilanganPeserta) || 0), 0);
      const totalRm = items.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      return {
        pusat,
        shortName:
          pusat === 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI'
            ? 'Pusat PPPT'
            : 'Pusat PKPOP',
        count: items.length,
        totalPeserta,
        totalRm,
      };
    });
  }, [filteredPrograms]);

  // Distribution by Sumber Kewangan
  const sumberData = useMemo(() => {
    return SUMBER_KEWANGAN_LIST.map((sumber) => {
      const items = filteredPrograms.filter((p) => p.sumberKewangan === sumber);
      const totalRm = items.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
      return {
        sumber,
        count: items.length,
        totalRm,
      };
    });
  }, [filteredPrograms]);

  // OS Breakdown Data
  const osData = useMemo(() => {
    const total = financialStats.diterimaKeseluruhan || 1;
    return [
      {
        code: 'OS21000 (OS21)',
        name: 'Perjalanan & Sara Hidup',
        amount: financialStats.diterimaOs21,
        percentage: Math.round((financialStats.diterimaOs21 / total) * 100),
        color: 'bg-emerald-600',
      },
      {
        code: 'OS24000 (OS24)',
        name: 'Sewaan Bangunan & Fasiliti',
        amount: financialStats.diterimaOs24,
        percentage: Math.round((financialStats.diterimaOs24 / total) * 100),
        color: 'bg-sky-600',
      },
      {
        code: 'OS27000 (OS27)',
        name: 'Bekalan Bahan Mentah & Latihan',
        amount: financialStats.diterimaOs27,
        percentage: Math.round((financialStats.diterimaOs27 / total) * 100),
        color: 'bg-amber-600',
      },
      {
        code: 'OS29000 (OS29)',
        name: 'Perkhidmatan Ikhtisas & Hospitaliti',
        amount: financialStats.diterimaOs29,
        percentage: Math.round((financialStats.diterimaOs29 / total) * 100),
        color: 'bg-indigo-600',
      },
    ];
  }, [financialStats]);

  // Monthly breakdown
  const monthlyData = useMemo(() => {
    return BULAN_LIST.map((m) => {
      const items = filteredPrograms.filter((p) => p.bulan === m.value);
      return {
        bulanNum: m.value,
        bulanLabel: m.label.substring(0, 3),
        count: items.length,
      };
    });
  }, [filteredPrograms]);

  const maxMonthCount = Math.max(...monthlyData.map((d) => d.count), 1);

  // Sorting & Display Limit state for Senarai Ringkas Program Terkini
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [displayCount, setDisplayCount] = useState<string>('5'); // Default 5 program

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedPrograms = useMemo(() => {
    let list = [...filteredPrograms];
    if (sortKey) {
      list.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        switch (sortKey) {
          case 'kodNama':
            valA = (a.namaProgram || '').toLowerCase();
            valB = (b.namaProgram || '').toLowerCase();
            break;
          case 'jenis':
            valA = (a.jenisProgram || '').toLowerCase();
            valB = (b.jenisProgram || '').toLowerCase();
            break;
          case 'pusat':
            valA = `${a.pusat || ''} ${a.jabatan || ''}`.toLowerCase();
            valB = `${b.pusat || ''} ${b.jabatan || ''}`.toLowerCase();
            break;
          case 'pengurus':
            valA = (a.pengurusNama || '').toLowerCase();
            valB = (b.pengurusNama || '').toLowerCase();
            break;
          case 'tarikh':
            valA = a.tarikhMula || '';
            valB = b.tarikhMula || '';
            break;
          case 'jumlah':
            valA = Number(a.jumlahRm) || 0;
            valB = Number(b.jumlahRm) || 0;
            break;
          case 'status':
            valA = (a.statusProgram || '').toLowerCase();
            valB = (b.statusProgram || '').toLowerCase();
            break;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return list;
  }, [filteredPrograms, sortKey, sortDirection]);

  const displayedPrograms = useMemo(() => {
    if (displayCount === 'Semua') return sortedPrograms;
    const limit = parseInt(displayCount, 10) || 5;
    return sortedPrograms.slice(0, limit);
  }, [sortedPrograms, displayCount]);

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="w-3 h-3 text-blue-600 font-bold" />
    );
  };

  return (
    <div className="space-y-6">
      {/* 2-Column Analytic Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Box 1: Pecahan Mengikut Pusat & Jabatan */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Landmark className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Pecahan Mengikut Pusat Pengajian
              </h3>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {filteredPrograms.length} Aktiviti
            </span>
          </div>

          <div className="space-y-4">
            {pusatData.map((p) => {
              const maxCount = Math.max(...pusatData.map((x) => x.count), 1);
              const widthPct = Math.max(8, Math.round((p.count / maxCount) * 100));

              return (
                <div key={p.pusat} className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">
                      {p.pusat}
                    </span>
                    <span className="text-xs font-bold text-slate-900 tabular-nums shrink-0 ml-2">
                      {p.count} Program
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 rounded-full h-2 mb-2 overflow-hidden">
                    <div
                      className="bg-slate-900 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-600">
                    <span>Peserta: <strong className="text-slate-800 tabular-nums">{formatNumber(p.totalPeserta)} orang</strong></span>
                    <span>Peruntukan: <strong className="text-slate-800 tabular-nums">RM {formatRM(p.totalRm)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly Trend Mini-Bar Visualisation */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-800">
                Taburan Aktiviti Mengikut Bulan (2026)
              </span>
              <span className="text-[11px] text-slate-500">Januari - Disember</span>
            </div>

            <div className="grid grid-cols-12 gap-1.5 items-end h-20 pt-2">
              {monthlyData.map((m) => {
                const heightPct = Math.max(6, Math.round((m.count / maxMonthCount) * 100));
                return (
                  <div key={m.bulanNum} className="flex flex-col items-center h-full justify-end group">
                    <span className="text-[10px] text-slate-500 font-medium tabular-nums opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.count}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t transition-all ${
                        m.count > 0 ? 'bg-slate-800 group-hover:bg-slate-600' : 'bg-slate-200'
                      }`}
                    />
                    <span className="text-[9px] text-slate-500 mt-1 uppercase font-semibold">
                      {m.bulanLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Box 2: Agihan Objek Sebagai (OS) & Sumber Kewangan */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Pecahan Peruntukan Objek Sebagai (OS)
                </h3>
              </div>
              <span className="text-xs font-bold text-slate-900 tabular-nums">
                RM {formatRM(financialStats.diterimaKeseluruhan)}
              </span>
            </div>

            {/* Stacked bar representation */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-4">
              {osData.map((os) => (
                <div
                  key={os.code}
                  style={{ width: `${os.percentage}%` }}
                  className={`${os.color} transition-all`}
                  title={`${os.code}: RM ${formatRM(os.amount)} (${os.percentage}%)`}
                />
              ))}
            </div>

            <div className="space-y-3">
              {osData.map((os) => (
                <div key={os.code} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-sm ${os.color} shrink-0`} />
                    <div className="truncate">
                      <span className="font-semibold text-slate-900 mr-1.5">{os.code}</span>
                      <span className="text-slate-500 hidden sm:inline">· {os.name}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <span className="font-bold text-slate-900 tabular-nums mr-2">
                      RM {formatRM(os.amount)}
                    </span>
                    <span className="text-slate-500 tabular-nums text-[11px]">
                      ({os.percentage}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sumber Kewangan Pills / Breakdown */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800 block mb-2">
              Taburan Mengikut Punca Sumber Kewangan
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {sumberData.map((s) => (
                <div key={s.sumber} className="bg-slate-50 p-2 rounded border border-slate-200/70">
                  <div className="text-[11px] font-semibold text-slate-700 truncate">
                    {s.sumber}
                  </div>
                  <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                    {s.count} aktiviti
                  </div>
                  <div className="text-[10px] text-slate-500 tabular-nums">
                    RM {formatRM(s.totalRm)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Recent Programs Table Preview with link to Page 2 */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Senarai Ringkas Program Terkini
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada mana-mana tajuk header untuk menyusun (sort) senarai program
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bilangan paparan dibenarkan (5, 10, 15, 20, 50, Semua) */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="font-semibold text-slate-700">Papar:</span>
              <select
                value={displayCount}
                onChange={(e) => setDisplayCount(e.target.value)}
                className="bg-transparent font-bold text-slate-900 focus:outline-hidden cursor-pointer"
              >
                <option value="5">5 Program (Default)</option>
                <option value="10">10 Program</option>
                <option value="15">15 Program</option>
                <option value="20">20 Program</option>
                <option value="50">50 Program</option>
                <option value="Semua">Semua ({filteredPrograms.length})</option>
              </select>
            </div>

            <button
              onClick={() => setActiveTab('perincian')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <span>Buka Halaman Perincian Penuh (Katalog)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            Tiada rekod program sepadan dengan kriteria penapis yang dipilih. Sila ubah atau set semula penapis.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider bg-slate-50/70 select-none">
                  {/* Column Bil. auto number 1, 2, 3... */}
                  <th className="py-2.5 px-3 w-12 text-center font-bold text-slate-700">
                    Bil.
                  </th>

                  <th
                    onClick={() => handleSort('kodNama')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Kod & Nama Program"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Kod &amp; Nama Program</span>
                      {renderSortIcon('kodNama')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('jenis')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Jenis Program"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Jenis Program</span>
                      {renderSortIcon('jenis')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('pusat')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Pusat & Jabatan"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Pusat &amp; Jabatan</span>
                      {renderSortIcon('pusat')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('pengurus')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Pengurus Program"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Pengurus</span>
                      {renderSortIcon('pengurus')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('tarikh')}
                    className="py-2.5 px-3 cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Tarikh & Tempat"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Tarikh &amp; Tempat</span>
                      {renderSortIcon('tarikh')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('jumlah')}
                    className="py-2.5 px-3 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Jumlah (RM)"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Jumlah (RM)</span>
                      {renderSortIcon('jumlah')}
                    </div>
                  </th>

                  <th
                    onClick={() => handleSort('status')}
                    className="py-2.5 px-3 text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                    title="Klik untuk susun Status"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>Status</span>
                      {renderSortIcon('status')}
                    </div>
                  </th>

                  <th className="py-2.5 px-3 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedPrograms.map((prog, index) => {
                  const statusConfig = getStatusConfig(prog.statusProgram);
                  return (
                    <tr
                      key={prog.id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => viewProgramDetail(prog)}
                    >
                      {/* Bil. auto number 1, 2, 3... */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                        {index + 1}.
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 line-clamp-1 group-hover:text-slate-700 uppercase">
                          {prog.namaProgram.toUpperCase()}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 uppercase">
                          {prog.kodProgram}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-slate-700 line-clamp-1">
                          {prog.jenisProgram}
                        </span>
                      </td>

                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="text-slate-800 font-medium truncate">
                          {prog.pusat === 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI' ? 'PPPT' : 'PKPOP'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {prog.jabatan}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium line-clamp-1">
                          {prog.pengurusNama}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {prog.pengurusId}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-slate-800 font-medium whitespace-nowrap">
                          {prog.tempoh}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[150px]">
                          {prog.tempat}, {prog.negeri}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-bold text-slate-900 tabular-nums whitespace-nowrap font-mono">
                        RM {formatRM(prog.jumlahRm)}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${statusConfig.badgeBg}`}
                        >
                          {statusConfig.label}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            viewProgramDetail(prog);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-900 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Perincian</span>
                        </button>
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
  );
};
