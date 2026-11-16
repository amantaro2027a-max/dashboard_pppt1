import { ProgramItem } from '../types/program';

export const getProgramDedupeKey = (p: ProgramItem): string => {
  const kod = (p.kodProgram || '').trim().toUpperCase();
  if (kod) return `KOD::${kod}`;
  const nama = (p.namaProgram || '').trim().toUpperCase();
  if (nama) return `NAMA::${nama}`;
  return `ID::${p.id}`;
};

export const deduplicateProgramsByCode = (programs: ProgramItem[]): ProgramItem[] => {
  const map = new Map<string, ProgramItem>();
  for (const p of programs) {
    if (!p) continue;
    const key = getProgramDedupeKey(p);
    if (!map.has(key)) {
      map.set(key, p);
    }
  }
  return Array.from(map.values());
};
