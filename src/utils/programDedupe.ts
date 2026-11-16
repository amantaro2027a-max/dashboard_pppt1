import { ProgramItem } from '../types/program';

export const getProgramDedupeKey = (p: ProgramItem): string => {
  const kod = (p.kodProgram || '').trim().toUpperCase();
  if (kod) return `KOD::${kod}`;
  const nama = (p.namaProgram || '').trim().toUpperCase();
  if (nama) return `NAMA::${nama}`;
  return `ID::${p.id}`;
};

export const aggregateProgramsByCode = (programs: ProgramItem[]): ProgramItem[] => {
  const map = new Map<string, ProgramItem>();
  for (const p of programs) {
    if (!p) continue;
    const key = getProgramDedupeKey(p);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...p });
      continue;
    }

    // Merge missing staff assignments across records sharing the same Kod Program
    // while preserving single program metrics (counts, participants, days, financials)
    const merged: ProgramItem = { ...existing };

    if (!merged.pengurusId && p.pengurusId) merged.pengurusId = p.pengurusId;
    if (!merged.pengurusNama && p.pengurusNama) merged.pengurusNama = p.pengurusNama;

    if (!merged.pengurusBersamaId && p.pengurusBersamaId) {
      merged.pengurusBersamaId = p.pengurusBersamaId;
    }
    if (!merged.pengurusBersamaNama && p.pengurusBersamaNama) {
      merged.pengurusBersamaNama = p.pengurusBersamaNama;
    }

    if (!merged.urusSetiaId && p.urusSetiaId) merged.urusSetiaId = p.urusSetiaId;
    if (!merged.urusSetiaNama && p.urusSetiaNama) merged.urusSetiaNama = p.urusSetiaNama;

    const existingTotal =
      Number(merged.jumlahRm) ||
      (Number(merged.os21000) || 0) +
        (Number(merged.os24000) || 0) +
        (Number(merged.os27000) || 0) +
        (Number(merged.os29000) || 0);
    const nextTotal =
      Number(p.jumlahRm) ||
      (Number(p.os21000) || 0) +
        (Number(p.os24000) || 0) +
        (Number(p.os27000) || 0) +
        (Number(p.os29000) || 0);
    if (!existingTotal && nextTotal) {
      merged.os21000 = p.os21000;
      merged.os24000 = p.os24000;
      merged.os27000 = p.os27000;
      merged.os29000 = p.os29000;
      merged.jumlahRm = p.jumlahRm || nextTotal;
    }

    const existingBelanja =
      Number(merged.jumlahBelanjaRm) ||
      (Number(merged.os21000Belanja) || 0) +
        (Number(merged.os24000Belanja) || 0) +
        (Number(merged.os27000Belanja) || 0) +
        (Number(merged.os29000Belanja) || 0);
    const nextBelanja =
      Number(p.jumlahBelanjaRm) ||
      (Number(p.os21000Belanja) || 0) +
        (Number(p.os24000Belanja) || 0) +
        (Number(p.os27000Belanja) || 0) +
        (Number(p.os29000Belanja) || 0);
    if (!existingBelanja && nextBelanja) {
      merged.os21000Belanja = p.os21000Belanja;
      merged.os24000Belanja = p.os24000Belanja;
      merged.os27000Belanja = p.os27000Belanja;
      merged.os29000Belanja = p.os29000Belanja;
      merged.jumlahBelanjaRm = p.jumlahBelanjaRm || nextBelanja;
    }

    if (!merged.bilanganPeserta && p.bilanganPeserta) merged.bilanganPeserta = p.bilanganPeserta;
    if (!merged.jumlahHari && p.jumlahHari) merged.jumlahHari = p.jumlahHari;
    if (!merged.tempat && p.tempat) merged.tempat = p.tempat;
    if (!merged.negeri && p.negeri) merged.negeri = p.negeri;
    if (!merged.catatan && p.catatan) merged.catatan = p.catatan;
    if (!merged.pusat && p.pusat) merged.pusat = p.pusat;
    if (!merged.jabatan && p.jabatan) merged.jabatan = p.jabatan;
    if (!merged.jenisProgram && p.jenisProgram) merged.jenisProgram = p.jenisProgram;
    if (!merged.sumberKewangan && p.sumberKewangan) merged.sumberKewangan = p.sumberKewangan;
    if (!merged.statusProgram && p.statusProgram) merged.statusProgram = p.statusProgram;

    map.set(key, merged);
  }
  return Array.from(map.values());
};

export const deduplicateProgramsByCode = (programs: ProgramItem[]): ProgramItem[] =>
  aggregateProgramsByCode(programs);
