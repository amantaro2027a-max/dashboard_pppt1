import React, { useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber } from '../utils/formatters';
import {
  CalendarDays,
  Layers,
  Users,
  Wallet,
  Clock,
  UserCheck,
  Building2,
  Briefcase,
  GraduationCap,
} from 'lucide-react';

export const FlashCardsGroup1: React.FC = () => {
  const {
    group1Stats,
    pusatList,
    jabatanMap,
    pegawaiList,
    filters,
    filteredPrograms,
  } = useProgramContext();

  // Pengiraan flash card berpandukan data master dan Penapis Data Program (filters)
  const { totalPusat, totalJabatan, totalPegawai } = useMemo(() => {
    const hasPusatFilter = Boolean(filters.pusat);
    const hasJabatanFilter = Boolean(filters.jabatan);
    const hasPengurusFilter = Boolean(filters.pengurus);
    const hasPengurusBersamaFilter = Boolean(filters.pengurusBersama);
    const hasOtherProgramFilter = Boolean(
      filters.jenisProgram ||
      filters.sumberKewangan ||
      filters.status ||
      filters.tahun ||
      filters.bulan ||
      filters.negeri ||
      filters.searchQuery
    );

    // 1. Bil. Pusat (data dibaca dari Pengurusan Senarai Pusat, filter by Penapis Data Program)
    let pCount = pusatList ? pusatList.length : 0;
    if (hasPusatFilter) {
      pCount = pusatList.includes(filters.pusat) ? 1 : 0;
    } else if (hasJabatanFilter) {
      const owningPusats = Object.entries(jabatanMap || {})
        .filter(([_, jList]) => (jList || []).includes(filters.jabatan))
        .map(([p]) => p);
      pCount = owningPusats.length > 0 ? owningPusats.length : (filteredPrograms.length > 0 ? 1 : 0);
    } else if (hasPengurusFilter || hasPengurusBersamaFilter || hasOtherProgramFilter) {
      if (filteredPrograms.length === 0) {
        pCount = 0;
      } else {
        const uniquePusatsInFiltered = new Set(
          filteredPrograms.map((p) => p.pusat).filter(Boolean)
        );
        pCount = uniquePusatsInFiltered.size;
      }
    }

    // 2. Bil. Jabatan (data dibaca dari Pengurusan Jabatan: 3 dari Pusat PPPT dan 4 dari pusat PKPOP = 7 keseluruhan)
    const cleanDeptList = (rawList: string[] = []): string[] => {
      return Array.from(
        new Set(
          rawList
            .map((j) => (j || '').trim())
            .filter((j) => j && !j.toUpperCase().includes('SEMUA JABATAN'))
        )
      );
    };

    const ppptKey = Object.keys(jabatanMap || {}).find((k) => k.includes('TEKNOLOGI')) || 'PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI';
    const pkpopKey = Object.keys(jabatanMap || {}).find((k) => k.includes('KONSULTASI')) || 'PUSAT KONSULTASI DAN PEMBANGUNAN ORGANISASI PENDIDIKAN';

    const ppptDepts = cleanDeptList((jabatanMap && jabatanMap[ppptKey]) || []);
    const pkpopDepts = cleanDeptList((jabatanMap && jabatanMap[pkpopKey]) || []);

    // Combine all valid unique departments
    const allValidDeptsSet = new Set<string>();
    ppptDepts.forEach((d) => allValidDeptsSet.add(d));
    pkpopDepts.forEach((d) => allValidDeptsSet.add(d));
    Object.entries(jabatanMap || {}).forEach(([p, list]) => {
      if (p !== ppptKey && p !== pkpopKey) {
        cleanDeptList(list).forEach((d) => allValidDeptsSet.add(d));
      }
    });

    const allJabatanCount = allValidDeptsSet.size;
    let jCount = allJabatanCount;

    if (hasJabatanFilter) {
      jCount = 1;
    } else if (hasPusatFilter) {
      const isPppt = filters.pusat.toUpperCase().includes('TEKNOLOGI');
      const isPkpop = filters.pusat.toUpperCase().includes('KONSULTASI');
      const jList = isPppt
        ? ppptDepts
        : isPkpop
        ? pkpopDepts
        : cleanDeptList((jabatanMap && jabatanMap[filters.pusat]) || []);

      if (hasOtherProgramFilter || hasPengurusFilter || hasPengurusBersamaFilter) {
        if (filteredPrograms.length === 0) {
          jCount = 0;
        } else {
          const uniqueJabsInFiltered = new Set(
            filteredPrograms
              .map((p) => (p.jabatan || '').trim())
              .filter((j) => j && !j.toUpperCase().includes('SEMUA JABATAN'))
          );
          jCount = uniqueJabsInFiltered.size;
        }
      } else {
        jCount = jList.length;
      }
    } else if (hasPengurusFilter || hasPengurusBersamaFilter || hasOtherProgramFilter) {
      if (filteredPrograms.length === 0) {
        jCount = 0;
      } else {
        const uniqueJabsInFiltered = new Set(
          filteredPrograms
            .map((p) => (p.jabatan || '').trim())
            .filter((j) => j && !j.toUpperCase().includes('SEMUA JABATAN'))
        );
        jCount = uniqueJabsInFiltered.size;
      }
    }

    // 3. Bil. Pegawai (data dibaca dari Pengurusan Profil Pegawai, filter by Penapis Data Program)
    let pegCount = pegawaiList ? pegawaiList.length : 0;
    if (hasPengurusFilter || hasPengurusBersamaFilter) {
      pegCount = 1;
    } else if (hasPusatFilter || hasJabatanFilter) {
      const matchedPegawai = (pegawaiList || []).filter((peg) => {
        if (hasPusatFilter && peg.pusat && peg.pusat !== 'SEMUA PUSAT' && peg.pusat !== filters.pusat) {
          return false;
        }
        if (hasJabatanFilter && peg.jabatan && peg.jabatan !== 'SEMUA JABATAN' && peg.jabatan !== filters.jabatan) {
          return false;
        }
        return true;
      });

      if (hasOtherProgramFilter) {
        if (filteredPrograms.length === 0) {
          pegCount = 0;
        } else {
          const activeOfficerNames = new Set<string>();
          filteredPrograms.forEach((p) => {
            if (p.pengurusNama) activeOfficerNames.add(p.pengurusNama);
            if (p.pengurusBersamaNama) activeOfficerNames.add(p.pengurusBersamaNama);
            if (p.pengurusId) activeOfficerNames.add(p.pengurusId);
          });
          const activeMatched = matchedPegawai.filter(
            (peg) => activeOfficerNames.has(peg.nama) || activeOfficerNames.has(peg.id)
          );
          pegCount = activeMatched.length > 0 ? activeMatched.length : matchedPegawai.length;
        }
      } else {
        pegCount = matchedPegawai.length;
      }
    } else if (hasOtherProgramFilter) {
      if (filteredPrograms.length === 0) {
        pegCount = 0;
      } else {
        const activeOfficerNames = new Set<string>();
        filteredPrograms.forEach((p) => {
          if (p.pengurusNama) activeOfficerNames.add(p.pengurusNama);
          if (p.pengurusBersamaNama) activeOfficerNames.add(p.pengurusBersamaNama);
          if (p.pengurusId) activeOfficerNames.add(p.pengurusId);
        });
        const matched = (pegawaiList || []).filter(
          (peg) => activeOfficerNames.has(peg.nama) || activeOfficerNames.has(peg.id)
        );
        pegCount = matched.length;
      }
    }

    return { totalPusat: pCount, totalJabatan: jCount, totalPegawai: pegCount };
  }, [pusatList, jabatanMap, pegawaiList, filters, filteredPrograms]);

  const cards = [
    {
      id: 'bil_pusat',
      title: 'Bil. Pusat',
      value: formatNumber(totalPusat),
      subtext: 'Pusat pentadbiran IAB',
      icon: Building2,
      bgCard: 'bg-gradient-to-br from-sky-50/90 via-white to-sky-50/30',
      borderColor: 'border-sky-200 hover:border-sky-300',
      iconBg: 'bg-sky-600 text-white',
      titleColor: 'text-sky-900',
      valueColor: 'text-sky-950',
      subtextColor: 'text-sky-700/80',
    },
    {
      id: 'bil_jabatan',
      title: 'Bil. Jabatan',
      value: formatNumber(totalJabatan),
      subtext: 'Unit & cawangan',
      icon: Briefcase,
      bgCard: 'bg-gradient-to-br from-cyan-50/90 via-white to-cyan-50/30',
      borderColor: 'border-cyan-200 hover:border-cyan-300',
      iconBg: 'bg-cyan-600 text-white',
      titleColor: 'text-cyan-900',
      valueColor: 'text-cyan-950',
      subtextColor: 'text-cyan-700/80',
    },
    {
      id: 'bil_pegawai',
      title: 'Bil. Pegawai',
      value: formatNumber(totalPegawai),
      subtext: 'Pegawai berdaftar',
      icon: GraduationCap,
      bgCard: 'bg-gradient-to-br from-violet-50/90 via-white to-violet-50/30',
      borderColor: 'border-violet-200 hover:border-violet-300',
      iconBg: 'bg-violet-600 text-white',
      titleColor: 'text-violet-900',
      valueColor: 'text-violet-950',
      subtextColor: 'text-violet-700/80',
    },
    {
      id: 'bil_program',
      title: 'Bilangan Program',
      value: formatNumber(group1Stats.bilanganProgram),
      subtext: 'Aktiviti berdaftar',
      icon: CalendarDays,
      bgCard: 'bg-gradient-to-br from-blue-50/90 via-white to-blue-50/30',
      borderColor: 'border-blue-200 hover:border-blue-300',
      iconBg: 'bg-blue-600 text-white',
      titleColor: 'text-blue-900',
      valueColor: 'text-blue-950',
      subtextColor: 'text-blue-600/80',
    },
    {
      id: 'bil_jenis',
      title: 'Bilangan Jenis Program',
      value: formatNumber(group1Stats.bilanganJenisProgram),
      subtext: 'Daripada 22 jenis rasmi',
      icon: Layers,
      bgCard: 'bg-gradient-to-br from-purple-50/90 via-white to-purple-50/30',
      borderColor: 'border-purple-200 hover:border-purple-300',
      iconBg: 'bg-purple-600 text-white',
      titleColor: 'text-purple-900',
      valueColor: 'text-purple-950',
      subtextColor: 'text-purple-600/80',
    },
    {
      id: 'jum_peserta',
      title: 'Jumlah Peserta',
      value: formatNumber(group1Stats.jumlahPeserta),
      subtext: 'Orang peserta terlibat',
      icon: Users,
      bgCard: 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/30',
      borderColor: 'border-emerald-200 hover:border-emerald-300',
      iconBg: 'bg-emerald-600 text-white',
      titleColor: 'text-emerald-900',
      valueColor: 'text-emerald-950',
      subtextColor: 'text-emerald-600/80',
    },
    {
      id: 'bil_sumber',
      title: 'Bilangan Sumber Kewangan',
      value: formatNumber(group1Stats.bilanganSumberKewangan),
      subtext: 'Punca peruntukan aktif',
      icon: Wallet,
      bgCard: 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/30',
      borderColor: 'border-amber-200 hover:border-amber-300',
      iconBg: 'bg-amber-600 text-white',
      titleColor: 'text-amber-900',
      valueColor: 'text-amber-950',
      subtextColor: 'text-amber-700/80',
    },
    {
      id: 'jum_hari',
      title: 'Jumlah Hari Program',
      value: formatNumber(group1Stats.jumlahHariProgram),
      subtext: 'Hari latihan & mesyuarat',
      icon: Clock,
      bgCard: 'bg-gradient-to-br from-teal-50/90 via-white to-teal-50/30',
      borderColor: 'border-teal-200 hover:border-teal-300',
      iconBg: 'bg-teal-600 text-white',
      titleColor: 'text-teal-900',
      valueColor: 'text-teal-950',
      subtextColor: 'text-teal-700/80',
    },
    {
      id: 'purata_peserta',
      title: 'Purata Peserta',
      value: formatNumber(group1Stats.purataPeserta),
      subtext: 'Orang / program',
      icon: UserCheck,
      bgCard: 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/30',
      borderColor: 'border-indigo-200 hover:border-indigo-300',
      iconBg: 'bg-indigo-600 text-white',
      titleColor: 'text-indigo-900',
      valueColor: 'text-indigo-950',
      subtextColor: 'text-indigo-700/80',
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Prestasi Pelaksanaan Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Flash card metrik aktiviti program, kepelbagaian latihan, dan jangkauan penyertaan warga pendidik
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-9 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`${card.bgCard} ${card.borderColor} border rounded-lg p-3 shadow-xs flex flex-col justify-between transition-all hover:shadow-sm`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold ${card.titleColor} line-clamp-1`}>
                  {card.title}
                </span>
                <div className={`w-5 h-5 rounded-md ${card.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="w-3 h-3" />
                </div>
              </div>

              <div>
                <div className={`text-lg font-bold ${card.valueColor} tabular-nums tracking-tight`}>
                  {card.value}
                </div>
                <div className={`text-[10px] ${card.subtextColor} mt-0.5 line-clamp-1 font-medium`}>
                  {card.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
