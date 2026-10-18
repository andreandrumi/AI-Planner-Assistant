import * as XLSX from 'xlsx';
import { CleaningLogEntry, DirtyDataSummary, ProvinceName, RegionProfile } from '../types';
import { computeUrgency } from '../data/regionsData';

export interface CleanedParticipant {
  id: string;
  originalId: string;
  nomorRegister: string;
  themeName: string;
  kabKota: string;
  province: ProvinceName;
  year: number;
  age: number;
  segment: 'vokasi' | 'umkm' | 'asn';
  contactHash: string; // Sanitized anonymized hash for deduplication
  uniqueKey: string;
}

export interface RegionalYearlyMetricsUpdate {
  totalRaw: number;
  uniqueTalents: number;
  multiSkills: number;
  vokasiCount: number;
  umkmCount: number;
  asnCount: number;
}

export interface DirtyDataProcessingResult {
  summary: DirtyDataSummary;
  cleanedParticipants: CleanedParticipant[];
  uniqueTalentsMap: Map<string, { contactHash: string; themes: string[]; kabKota: string; segment: string; years: number[] }>;
  regionalStatsUpdate: Record<string, Record<number, RegionalYearlyMetricsUpdate>>;
}

// Simple deterministic hash for file signature & privacy
export function computeHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// Clean and normalize strings
export function cleanStr(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

// Semantic header resolver: matches column names with noisy suffixes or field variations
export function resolveSemanticColumn(header: string): 'theme' | 'region' | 'date' | 'age' | 'occupation' | 'identifier' | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (h.includes('tema') || h.includes('program') || h.includes('pelatihan') || h.includes('course') || h.includes('modul') || h.includes('keahlian') || h.includes('skema')) {
    return 'theme';
  }
  if (h.includes('kabupaten') || h.includes('kabkota') || h.includes('kota') || h.includes('domisili') || h.includes('wilayah') || h.includes('daerah') || h.includes('lokasi')) {
    return 'region';
  }
  if (h.includes('tahun') || h.includes('tanggal') || h.includes('tgl') || h.includes('waktu') || h.includes('date') || h.includes('registered') || h.includes('periode') || h.includes('batch')) {
    return 'date';
  }
  if (h.includes('usia') || h.includes('umur') || h.includes('age') || h.includes('tgllahir') || h.includes('birth')) {
    return 'age';
  }
  if (h.includes('pekerjaan') || h.includes('profesi') || h.includes('instansi') || h.includes('jabatan') || h.includes('sektor') || h.includes('statuspekerjaan') || h.includes('bidang')) {
    return 'occupation';
  }
  if (h.includes('register') || h.includes('noreg') || h.includes('nomorregister') || h.includes('idregister') || h.includes('registrasi') || h.includes('email') || h.includes('nohp') || h.includes('telepon') || h.includes('phone') || h.includes('nik') || h.includes('pesertaid') || h.includes('kontak') || h.includes('peserta')) {
    return 'identifier';
  }

  return null;
}

// Extract year from messy strings (e.g. "2024-03-12", "12/05/2023", "Batch 2025-A", "2022")
export function extractYear(val: any): number {
  if (typeof val === 'number') {
    if (val >= 2020 && val <= 2030) return Math.round(val);
    if (val > 40000 && val < 50000) {
      // Excel serial date format
      const date = new Date((val - 25569) * 86400 * 1000);
      const yr = date.getFullYear();
      if (yr >= 2020 && yr <= 2030) return yr;
    }
  }
  const str = cleanStr(val);
  const match = str.match(/\b(202[2-6])\b/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 2026;
}

// Clean age or calculate from birth year
export function extractAge(val: any): number {
  if (typeof val === 'number') {
    if (val >= 14 && val <= 80) return Math.round(val);
    if (val >= 1950 && val <= 2012) return 2026 - Math.round(val);
  }
  const str = cleanStr(val);
  const num = parseInt(str, 10);
  if (!isNaN(num)) {
    if (num >= 14 && num <= 80) return num;
    if (num >= 1950 && num <= 2012) return 2026 - num;
  }
  return 25; // Default productive age
}

// Classify occupation into 3 hierarchical segments
export function classifySegment(occupationStr: string, age: number): 'vokasi' | 'umkm' | 'asn' {
  const o = occupationStr.toLowerCase();
  
  if (
    o.includes('asn') ||
    o.includes('pns') ||
    o.includes('pejabat') ||
    o.includes('dinas') ||
    o.includes('badan') ||
    o.includes('kementerian') ||
    o.includes('pemda') ||
    o.includes('kelurahan') ||
    o.includes('kecamatan') ||
    o.includes('polri') ||
    o.includes('tni') ||
    o.includes('bumn') ||
    o.includes('bumd') ||
    o.includes('aparatur') ||
    o.includes('biro') ||
    o.includes('sekretariat')
  ) {
    return 'asn';
  }

  if (
    o.includes('siswa') ||
    o.includes('pelajar') ||
    o.includes('mahasiswa') ||
    o.includes('smk') ||
    o.includes('vokasi') ||
    o.includes('politeknik') ||
    o.includes('fresh graduate') ||
    o.includes('belum bekerja') ||
    age < 23
  ) {
    return 'vokasi';
  }

  return 'umkm';
}

// Clean and normalize regional city name to standard 48 Kab/Kota
export function matchRegion(rawRegion: string): { name: string; province: ProvinceName } {
  const r = rawRegion.toLowerCase();
  
  // Check NTB districts
  if (r.includes('mataram')) return { name: 'Kota Mataram', province: 'Nusa Tenggara Barat' };
  if (r.includes('bima') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Bima', province: 'Nusa Tenggara Barat' };
  if (r.includes('bima')) return { name: 'Kabupaten Bima', province: 'Nusa Tenggara Barat' };
  if (r.includes('lombok barat')) return { name: 'Kabupaten Lombok Barat', province: 'Nusa Tenggara Barat' };
  if (r.includes('lombok tengah') || r.includes('mandalika')) return { name: 'Kabupaten Lombok Tengah', province: 'Nusa Tenggara Barat' };
  if (r.includes('lombok timur')) return { name: 'Kabupaten Lombok Timur', province: 'Nusa Tenggara Barat' };
  if (r.includes('lombok utara') || r.includes('klu')) return { name: 'Kabupaten Lombok Utara', province: 'Nusa Tenggara Barat' };
  if (r.includes('sumbawa barat') || r.includes('ksb')) return { name: 'Kabupaten Sumbawa Barat', province: 'Nusa Tenggara Barat' };
  if (r.includes('sumbawa')) return { name: 'Kabupaten Sumbawa', province: 'Nusa Tenggara Barat' };
  if (r.includes('dompu')) return { name: 'Kabupaten Dompu', province: 'Nusa Tenggara Barat' };

  // Check East Java districts
  if (r.includes('surabaya')) return { name: 'Kota Surabaya', province: 'Jawa Timur' };
  if (r.includes('malang') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Malang', province: 'Jawa Timur' };
  if (r.includes('malang')) return { name: 'Kabupaten Malang', province: 'Jawa Timur' };
  if (r.includes('sidoarjo')) return { name: 'Kabupaten Sidoarjo', province: 'Jawa Timur' };
  if (r.includes('gresik')) return { name: 'Kabupaten Gresik', province: 'Jawa Timur' };
  if (r.includes('sampang')) return { name: 'Kabupaten Sampang', province: 'Jawa Timur' };
  if (r.includes('bangkalan')) return { name: 'Kabupaten Bangkalan', province: 'Jawa Timur' };
  if (r.includes('pamekasan')) return { name: 'Kabupaten Pamekasan', province: 'Jawa Timur' };
  if (r.includes('sumenep')) return { name: 'Kabupaten Sumenep', province: 'Jawa Timur' };
  if (r.includes('bojonegoro')) return { name: 'Kabupaten Bojonegoro', province: 'Jawa Timur' };
  if (r.includes('banyuwangi')) return { name: 'Kabupaten Banyuwangi', province: 'Jawa Timur' };
  if (r.includes('batu')) return { name: 'Kota Batu', province: 'Jawa Timur' };
  if (r.includes('madiun') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Madiun', province: 'Jawa Timur' };
  if (r.includes('madiun')) return { name: 'Kabupaten Madiun', province: 'Jawa Timur' };
  if (r.includes('kediri') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Kediri', province: 'Jawa Timur' };
  if (r.includes('kediri')) return { name: 'Kabupaten Kediri', province: 'Jawa Timur' };
  if (r.includes('blitar') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Blitar', province: 'Jawa Timur' };
  if (r.includes('blitar')) return { name: 'Kabupaten Blitar', province: 'Jawa Timur' };
  if (r.includes('pasuruan') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Pasuruan', province: 'Jawa Timur' };
  if (r.includes('pasuruan')) return { name: 'Kabupaten Pasuruan', province: 'Jawa Timur' };
  if (r.includes('mojokerto') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Mojokerto', province: 'Jawa Timur' };
  if (r.includes('mojokerto')) return { name: 'Kabupaten Mojokerto', province: 'Jawa Timur' };
  if (r.includes('probolinggo') && (r.includes('kota') || r.includes('kodya'))) return { name: 'Kota Probolinggo', province: 'Jawa Timur' };
  if (r.includes('probolinggo')) return { name: 'Kabupaten Probolinggo', province: 'Jawa Timur' };
  if (r.includes('jember')) return { name: 'Kabupaten Jember', province: 'Jawa Timur' };
  if (r.includes('lumajang')) return { name: 'Kabupaten Lumajang', province: 'Jawa Timur' };
  if (r.includes('bondowoso')) return { name: 'Kabupaten Bondowoso', province: 'Jawa Timur' };
  if (r.includes('situbondo')) return { name: 'Kabupaten Situbondo', province: 'Jawa Timur' };
  if (r.includes('tuban')) return { name: 'Kabupaten Tuban', province: 'Jawa Timur' };
  if (r.includes('lamongan')) return { name: 'Kabupaten Lamongan', province: 'Jawa Timur' };
  if (r.includes('jombang')) return { name: 'Kabupaten Jombang', province: 'Jawa Timur' };
  if (r.includes('nganjuk')) return { name: 'Kabupaten Nganjuk', province: 'Jawa Timur' };
  if (r.includes('tulungagung')) return { name: 'Kabupaten Tulungagung', province: 'Jawa Timur' };
  if (r.includes('trenggalek')) return { name: 'Kabupaten Trenggalek', province: 'Jawa Timur' };
  if (r.includes('ponorogo')) return { name: 'Kabupaten Ponorogo', province: 'Jawa Timur' };
  if (r.includes('pacitan')) return { name: 'Kabupaten Pacitan', province: 'Jawa Timur' };
  if (r.includes('magetan')) return { name: 'Kabupaten Magetan', province: 'Jawa Timur' };
  if (r.includes('ngawi')) return { name: 'Kabupaten Ngawi', province: 'Jawa Timur' };

  return { name: 'Kota Surabaya', province: 'Jawa Timur' };
}

// Autonomous Dirty Data Engine for Real Field Datasets
export function cleanRawAlumniDataset(
  rawRows: Array<Record<string, any>>,
  fileName: string
): DirtyDataProcessingResult {
  const logs: CleaningLogEntry[] = [];
  const processedAt = new Date().toISOString();

  // Step 1: File signature & duplicate check
  const fileContentSample = JSON.stringify(rawRows.slice(0, 5));
  const fileHash = computeHash(fileName + fileContentSample + rawRows.length);
  
  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'DEDUPLIKASI_FILE',
    level: 'info',
    message: `Memeriksa signature berkas riil '${fileName}' (Hash: ${fileHash.substring(0, 8)}). Mencegah file ganda terproses berulang.`,
    details: { fileHash, rowCount: rawRows.length },
  });

  if (!rawRows || rawRows.length === 0) {
    return {
      summary: {
        originalRowCount: 0,
        cleanRowCount: 0,
        duplicateRowsRemoved: 0,
        uniqueTalentsIdentified: 0,
        multiSkillTalents: 0,
        invalidAgesCorrected: 0,
        yearsParsedRange: [2022, 2026],
        unmappedColumnsResolved: 0,
        fileHash,
        fileName,
        processedAt,
        logs,
      },
      cleanedParticipants: [],
      uniqueTalentsMap: new Map(),
      regionalStatsUpdate: {},
    };
  }

  // Step 2: Semantic Column Mapping
  const sample = rawRows[0];
  const columnMapping: Record<string, 'theme' | 'region' | 'date' | 'age' | 'occupation' | 'identifier'> = {};
  let unmappedCount = 0;

  for (const key of Object.keys(sample)) {
    const matched = resolveSemanticColumn(key);
    if (matched) {
      columnMapping[key] = matched;
    } else {
      unmappedCount++;
    }
  }

  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'SEMANTIC_MAPPING',
    level: 'success',
    message: `Resolusi semantik kolom riil berhasil. Memetakan ${Object.keys(columnMapping).length} kolom kunci resmi (mengabaikan suffix ID acak).`,
    details: { mapping: columnMapping, unmappedIgnored: unmappedCount },
  });

  // Step 3: Row processing & exact duplicate removal
  const seenExactRows = new Set<string>();
  const cleanedList: CleanedParticipant[] = [];
  let duplicateRowCount = 0;
  let invalidAgesFixed = 0;
  let minYear = 2026;
  let maxYear = 2022;

  // Deduplication map for "Unique Talents"
  const uniqueTalentsMap = new Map<string, { contactHash: string; themes: string[]; kabKota: string; segment: string; years: number[] }>();

  // Regional yearly metrics accumulator
  const regionalStatsUpdate: Record<string, Record<number, RegionalYearlyMetricsUpdate>> = {};

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];

    let rawTheme = '';
    let rawRegion = '';
    let rawDate: any = 2026;
    let rawAge: any = 25;
    let rawOccupation = '';
    let rawIdentifier = `ID_${i + 1}`;

    for (const [colName, mapType] of Object.entries(columnMapping)) {
      const val = row[colName];
      if (val !== undefined && val !== null) {
        if (mapType === 'theme') rawTheme = cleanStr(val);
        else if (mapType === 'region') rawRegion = cleanStr(val);
        else if (mapType === 'date') rawDate = val;
        else if (mapType === 'age') rawAge = val;
        else if (mapType === 'occupation') rawOccupation = cleanStr(val);
        else if (mapType === 'identifier') rawIdentifier = cleanStr(val);
      }
    }

    if (!rawTheme) rawTheme = 'Pelatihan Kompetensi Digital';
    if (!rawRegion) rawRegion = 'Kota Surabaya';

    // Exact duplicate row check
    const rowSignature = `${rawTheme}|${rawRegion}|${cleanStr(rawDate)}|${cleanStr(rawAge)}|${rawOccupation}|${rawIdentifier}`;
    if (seenExactRows.has(rowSignature)) {
      duplicateRowCount++;
      continue;
    }
    seenExactRows.add(rowSignature);

    const year = extractYear(rawDate);
    minYear = Math.min(minYear, year);
    maxYear = Math.max(maxYear, year);

    const initialAge = typeof rawAge === 'number' ? rawAge : parseInt(rawAge, 10);
    const age = extractAge(rawAge);
    if (isNaN(initialAge) || initialAge < 14 || initialAge > 80) {
      invalidAgesFixed++;
    }

    const { name: kabKota, province } = matchRegion(rawRegion);
    const segment = classifySegment(rawOccupation, age);

    // Sanitized contact hash for privacy (NFR-03)
    const contactHash = computeHash(rawIdentifier || `ROW_${i}_${kabKota}`);
    const uniqueKey = `PARTICIPANT_${contactHash.substring(0, 8)}`;

    const cleanedItem: CleanedParticipant = {
      id: uniqueKey,
      originalId: `REAL_${i + 1}`,
      nomorRegister: rawIdentifier || uniqueKey,
      themeName: rawTheme,
      kabKota,
      province,
      year,
      age,
      segment,
      contactHash,
      uniqueKey,
    };

    cleanedList.push(cleanedItem);

    // Grouping by registration identifier
    const talentKey = rawIdentifier || contactHash;
    if (!uniqueTalentsMap.has(talentKey)) {
      uniqueTalentsMap.set(talentKey, {
        contactHash,
        themes: [rawTheme],
        kabKota,
        segment,
        years: [year],
      });
    } else {
      const record = uniqueTalentsMap.get(talentKey)!;
      if (!record.themes.includes(rawTheme)) {
        record.themes.push(rawTheme);
      }
      if (!record.years.includes(year)) {
        record.years.push(year);
      }
    }

    // Initialize regional stats update container
    if (!regionalStatsUpdate[kabKota]) {
      regionalStatsUpdate[kabKota] = {};
    }
    if (!regionalStatsUpdate[kabKota][year]) {
      regionalStatsUpdate[kabKota][year] = {
        totalRaw: 0,
        uniqueTalents: 0,
        multiSkills: 0,
        vokasiCount: 0,
        umkmCount: 0,
        asnCount: 0,
      };
    }

    const targetBucket = regionalStatsUpdate[kabKota][year];
    targetBucket.totalRaw += 1;
    if (segment === 'vokasi') targetBucket.vokasiCount += 1;
    else if (segment === 'umkm') targetBucket.umkmCount += 1;
    else if (segment === 'asn') targetBucket.asnCount += 1;
  }

  // Populate unique talents & multi-skill counts per region and year
  for (const talent of uniqueTalentsMap.values()) {
    const k = talent.kabKota;
    for (const yr of talent.years) {
      if (regionalStatsUpdate[k] && regionalStatsUpdate[k][yr]) {
        regionalStatsUpdate[k][yr].uniqueTalents += 1;
        if (talent.themes.length > 1) {
          regionalStatsUpdate[k][yr].multiSkills += 1;
        }
      }
    }
  }

  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'PEMBERSIHAN_NILAI',
    level: 'info',
    message: `Menghapus ${duplicateRowCount} baris ganda identik secara otonom. Mengoreksi ${invalidAgesFixed} format usia tidak valid. Rentang tahun terdeteksi: ${minYear} - ${maxYear}.`,
    details: { duplicateRowCount, invalidAgesFixed, yearSpan: `${minYear}-${maxYear}` },
  });

  // Calculate global multi-skill stats
  let multiSkillCount = 0;
  for (const talent of uniqueTalentsMap.values()) {
    if (talent.themes.length > 1) {
      multiSkillCount++;
    }
  }

  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'DEDUPLIKASI_TALENTA',
    level: 'success',
    message: `Deduplikasi kolom Nomor Register tuntas: dari ${cleanedList.length} sertifikasi/baris riil, teridentifikasi ${uniqueTalentsMap.size} data unik pada kolom nomor register (${multiSkillCount} peserta multi-keahlian lintas tema).`,
    details: {
      totalCertificates: cleanedList.length,
      uniqueTalents: uniqueTalentsMap.size,
      multiSkillTalents: multiSkillCount,
      multiSkillPercentage: `${((multiSkillCount / Math.max(1, uniqueTalentsMap.size)) * 100).toFixed(1)}%`,
    },
  });

  return {
    summary: {
      originalRowCount: rawRows.length,
      cleanRowCount: cleanedList.length,
      duplicateRowsRemoved: duplicateRowCount,
      uniqueTalentsIdentified: uniqueTalentsMap.size,
      multiSkillTalents: multiSkillCount,
      invalidAgesCorrected: invalidAgesFixed,
      yearsParsedRange: [minYear, maxYear],
      unmappedColumnsResolved: unmappedCount,
      fileHash,
      fileName,
      processedAt,
      logs,
    },
    cleanedParticipants: cleanedList,
    uniqueTalentsMap,
    regionalStatsUpdate,
  };
}

// Recompute all 48 regional metrics dynamically whenever participants are added or deleted
export function recomputeRegionsFromParticipants(
  baseRegions: RegionProfile[],
  participants: CleanedParticipant[],
  customImdiUpdates?: Record<string, Record<number, {
    imdiComposite: number;
    subPillars: {
      infrastructure: number;
      skills: number;
      empowerment: number;
      workforce: number;
    };
    ipmScore?: number;
  }>>
): RegionProfile[] {
  // 1. Group participants by kabKota and by year
  const talentThemesMap = new Map<string, Set<string>>();
  for (const p of participants) {
    const key = p.nomorRegister || p.contactHash;
    if (!talentThemesMap.has(key)) {
      talentThemesMap.set(key, new Set());
    }
    talentThemesMap.get(key)!.add(p.themeName);
  }

  const regMap: Record<string, Record<number, {
    totalRaw: number;
    uniqueKeys: Set<string>;
    vokasi: number;
    umkm: number;
    asn: number;
  }>> = {};

  for (const p of participants) {
    if (!regMap[p.kabKota]) {
      regMap[p.kabKota] = {};
    }
    if (!regMap[p.kabKota][p.year]) {
      regMap[p.kabKota][p.year] = {
        totalRaw: 0,
        uniqueKeys: new Set(),
        vokasi: 0,
        umkm: 0,
        asn: 0,
      };
    }
    const bucket = regMap[p.kabKota][p.year];
    bucket.totalRaw += 1;
    bucket.uniqueKeys.add(p.nomorRegister || p.contactHash);
    if (p.segment === 'vokasi') bucket.vokasi += 1;
    else if (p.segment === 'umkm') bucket.umkm += 1;
    else if (p.segment === 'asn') bucket.asn += 1;
  }

  return baseRegions.map((r) => {
    const newYearlyData = { ...r.yearlyData };
    const rBuckets = regMap[r.name] || regMap[r.shortName];
    const rCustomImdi = customImdiUpdates?.[r.name] || customImdiUpdates?.[r.shortName];

    let currentIpm = r.ipmScore;

    for (const yr of [2022, 2023, 2024, 2025, 2026]) {
      let currentYm = { ...(newYearlyData[yr] || newYearlyData[2026]) };

      // Apply custom IMDI overrides if present
      if (rCustomImdi && rCustomImdi[yr]) {
        const customEntry = rCustomImdi[yr];
        currentYm.imdiComposite = customEntry.imdiComposite;
        currentYm.subPillars = { ...customEntry.subPillars };
        if (customEntry.ipmScore !== undefined && !isNaN(customEntry.ipmScore)) {
          currentIpm = customEntry.ipmScore;
        }
      }

      const bucket = rBuckets ? rBuckets[yr] : undefined;

      if (bucket) {
        const rawAlumni = bucket.totalRaw;
        const unique = bucket.uniqueKeys.size;
        let multi = 0;
        for (const key of bucket.uniqueKeys) {
          if ((talentThemesMap.get(key)?.size || 0) > 1) {
            multi++;
          }
        }

        const isStagnant =
          rawAlumni > 2500 &&
          currentYm.imdiComposite - (newYearlyData[2022]?.imdiComposite || currentYm.imdiComposite) < 1.0;

        const { urgencyScore, urgencyLevel } = computeUrgency(
          currentYm.imdiComposite,
          currentYm.subPillars,
          unique,
          r.laborForceTarget,
          currentIpm,
          isStagnant
        );

        newYearlyData[yr] = {
          ...currentYm,
          totalAlumniRegistered: rawAlumni,
          uniqueTalents: unique,
          multiSkillCount: multi,
          segmentDistribution: {
            vokasi: bucket.vokasi,
            umkm: bucket.umkm,
            asn: bucket.asn,
          },
          urgencyScore,
          urgencyLevel,
          stagnantWarning: isStagnant,
        };
      } else {
        const { urgencyScore, urgencyLevel } = computeUrgency(
          currentYm.imdiComposite,
          currentYm.subPillars,
          0,
          r.laborForceTarget,
          currentIpm,
          false
        );
        newYearlyData[yr] = {
          ...currentYm,
          totalAlumniRegistered: 0,
          uniqueTalents: 0,
          multiSkillCount: 0,
          segmentDistribution: { vokasi: 0, umkm: 0, asn: 0 },
          urgencyScore,
          urgencyLevel,
          stagnantWarning: false,
        };
      }
    }

    return {
      ...r,
      ipmScore: currentIpm,
      yearlyData: newYearlyData,
    };
  });
}

// Download Official Clean Excel Template for Real Field Data Input
export function downloadRealAlumniTemplateXLSX(): void {
  const templateRows = [
    {
      'Nama Tema': 'Literasi Digital Dasar & Keamanan Siber',
      'Provinsi': 'Jawa Timur',
      'Kabupaten_Kota': 'Kabupaten Sampang',
      'Tanggal_Pendaftaran': '2024-03-15',
      'Usia': 24,
      'Pekerjaan_Instansi': 'Pelaku UMKM Olahan Pesisir',
      'Nomor_Registrasi_Email_NoHP': 'REG-DTS-2024-001',
    },
    {
      'Nama Tema': 'Tata Kelola SPBE & Keamanan Informasi',
      'Provinsi': 'Nusa Tenggara Barat',
      'Kabupaten_Kota': 'Kabupaten Lombok Utara',
      'Tanggal_Pendaftaran': '2024-04-10',
      'Usia': 35,
      'Pekerjaan_Instansi': 'ASN Dinas Kominfo',
      'Nomor_Registrasi_Email_NoHP': 'REG-DTS-2024-002',
    },
    {
      'Nama Tema': 'Artificial Intelligence & Large Language Models',
      'Provinsi': 'Jawa Timur',
      'Kabupaten_Kota': 'Kota Surabaya',
      'Tanggal_Pendaftaran': '2025-02-20',
      'Usia': 22,
      'Pekerjaan_Instansi': 'Mahasiswa Politeknik Vokasi',
      'Nomor_Registrasi_Email_NoHP': 'REG-DTS-2025-003',
    },
    {
      'Nama Tema': 'Digital Supply Chain & E-Logistik Pertanian',
      'Provinsi': 'Nusa Tenggara Barat',
      'Kabupaten_Kota': 'Kabupaten Lombok Timur',
      'Tanggal_Pendaftaran': '2025-05-18',
      'Usia': 29,
      'Pekerjaan_Instansi': 'Wirausaha Agribisnis Komoditas',
      'Nomor_Registrasi_Email_NoHP': 'REG-DTS-2025-004',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Alumni_Riil');
  XLSX.writeFile(workbook, 'Template_Data_Alumni_DTS_Kominfo_Real.xlsx');
}

// Download Official Clean Excel Template for Real IMDI Input
export function downloadRealImdiTemplateXLSX(): void {
  const templateRows = [
    {
      'Kabupaten_Kota': 'Kota Surabaya',
      'Provinsi': 'Jawa Timur',
      'Tahun': 2026,
      'Skor_IMDI_Komposit': 52.4,
      'SubPilar_Infrastruktur': 58.0,
      'SubPilar_Keterampilan': 53.5,
      'SubPilar_Pemberdayaan': 48.0,
      'SubPilar_Pekerjaan': 46.5,
    },
    {
      'Kabupaten_Kota': 'Kabupaten Sampang',
      'Provinsi': 'Jawa Timur',
      'Tahun': 2026,
      'Skor_IMDI_Komposit': 32.1,
      'SubPilar_Infrastruktur': 33.0,
      'SubPilar_Keterampilan': 30.5,
      'SubPilar_Pemberdayaan': 31.8,
      'SubPilar_Pekerjaan': 30.2,
    },
    {
      'Kabupaten_Kota': 'Kota Mataram',
      'Provinsi': 'Nusa Tenggara Barat',
      'Tahun': 2026,
      'Skor_IMDI_Komposit': 48.2,
      'SubPilar_Infrastruktur': 52.0,
      'SubPilar_Keterampilan': 49.0,
      'SubPilar_Pemberdayaan': 45.5,
      'SubPilar_Pekerjaan': 43.0,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_IMDI_Resmi');
  XLSX.writeFile(workbook, 'Template_Data_IMDI_Kominfo_Real.xlsx');
}

// Export managed participants to clean Excel spreadsheet
export function exportCleanedParticipantsToXLSX(
  participants: CleanedParticipant[],
  fileName = 'Data_Talenta_Digital_Terkelola.xlsx'
): void {
  const exportData = participants.map((p, idx) => ({
    'No': idx + 1,
    'Nomor Register': p.nomorRegister,
    'Kabupaten / Kota': p.kabKota,
    'Provinsi': p.province,
    'Tema Pelatihan': p.themeName,
    'Tahun': p.year,
    'Usia': p.age,
    'Segmen Sasaran': p.segment.toUpperCase(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_Talenta_Terkelola');
  XLSX.writeFile(workbook, fileName);
}

// Semantic resolver for official IMDI columns required by AI Agent
export function resolveImdiColumn(header: string): 'region' | 'composite' | 'infrastructure' | 'skills' | 'empowerment' | 'workforce' | 'year' | 'ipm' | null {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (h.includes('infrastruktur') || h.includes('infra') || h.includes('ekosistem')) {
    return 'infrastructure';
  }
  if (h.includes('keterampilan') || h.includes('skill') || h.includes('kompetensi')) {
    return 'skills';
  }
  if (h.includes('pemberdayaan') || h.includes('empowerment') || h.includes('adopsi')) {
    return 'empowerment';
  }
  if (h.includes('pekerjaan') || h.includes('workforce') || h.includes('lapangan')) {
    return 'workforce';
  }
  if (h.includes('skor') || h.includes('komposit') || h.includes('imdi') || h.includes('nilai')) {
    return 'composite';
  }
  if (h.includes('kabupaten') || h.includes('kabkota') || h.includes('kota') || h.includes('wilayah') || h.includes('daerah')) {
    return 'region';
  }
  if (h.includes('tahun') || h.includes('year') || h.includes('periode')) {
    return 'year';
  }
  if (h.includes('ipm') || h.includes('hdi') || h.includes('pembangunanmanusia')) {
    return 'ipm';
  }
  return null;
}

export interface ImdiCleaningResult {
  fileName: string;
  totalRows: number;
  updatedDistrictsCount: number;
  recognizedColumns: Record<string, string>;
  updates: Record<string, Record<number, {
    imdiComposite: number;
    subPillars: {
      infrastructure: number;
      skills: number;
      empowerment: number;
      workforce: number;
    };
    ipmScore?: number;
  }>>;
  previewRows: Array<{
    kabKota: string;
    province: string;
    year: number;
    composite: number;
    infrastructure: number;
    skills: number;
    empowerment: number;
    workforce: number;
    ipm?: number;
    spbeMandatory: boolean;
  }>;
  logs: CleaningLogEntry[];
}

// Autonomous parser for official IMDI data files with semantic column recognition
export function cleanRawImdiDataset(
  rawRows: Array<Record<string, any>>,
  fileName: string
): ImdiCleaningResult {
  const logs: CleaningLogEntry[] = [];
  const recognizedColumns: Record<string, string> = {};
  const updates: Record<string, Record<number, {
    imdiComposite: number;
    subPillars: {
      infrastructure: number;
      skills: number;
      empowerment: number;
      workforce: number;
    };
    ipmScore?: number;
  }>> = {};
  const previewRows: ImdiCleaningResult['previewRows'] = [];

  if (!rawRows || rawRows.length === 0) {
    return {
      fileName,
      totalRows: 0,
      updatedDistrictsCount: 0,
      recognizedColumns: {},
      updates: {},
      previewRows: [],
      logs,
    };
  }

  const sample = rawRows[0];
  const colMap: Record<string, string> = {};
  for (const k of Object.keys(sample)) {
    const matched = resolveImdiColumn(k);
    if (matched) {
      colMap[k] = matched;
      recognizedColumns[k] = matched;
    }
  }

  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'SEMANTIC_MAPPING',
    level: 'success',
    message: `Agen AI mengenali ${Object.keys(colMap).length} kolom IMDI yang dibutuhkan: ${Object.entries(colMap).map(([k, v]) => `${k} -> [${v}]`).join(', ')}`,
    details: { mapping: colMap },
  });

  const updatedRegionsSet = new Set<string>();

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    let rawRegion = '';
    let rawYear = 2026;
    let rawComposite: number | null = null;
    let rawInfra: number | null = null;
    let rawSkills: number | null = null;
    let rawEmpower: number | null = null;
    let rawWork: number | null = null;
    let rawIpm: number | null = null;

    for (const [colName, mapType] of Object.entries(colMap)) {
      const val = row[colName];
      if (val !== undefined && val !== null) {
        if (mapType === 'region') rawRegion = cleanStr(val);
        else if (mapType === 'year') rawYear = extractYear(val);
        else if (mapType === 'composite') rawComposite = parseFloat(val);
        else if (mapType === 'infrastructure') rawInfra = parseFloat(val);
        else if (mapType === 'skills') rawSkills = parseFloat(val);
        else if (mapType === 'empowerment') rawEmpower = parseFloat(val);
        else if (mapType === 'workforce') rawWork = parseFloat(val);
        else if (mapType === 'ipm') rawIpm = parseFloat(val);
      }
    }

    if (!rawRegion) continue;
    const { name: kabKota, province } = matchRegion(rawRegion);

    const infraVal = !isNaN(Number(rawInfra)) && rawInfra !== null ? Number(rawInfra) : 40.0;
    const skillsVal = !isNaN(Number(rawSkills)) && rawSkills !== null ? Number(rawSkills) : 40.0;
    const empowerVal = !isNaN(Number(rawEmpower)) && rawEmpower !== null ? Number(rawEmpower) : 40.0;
    const workVal = !isNaN(Number(rawWork)) && rawWork !== null ? Number(rawWork) : 40.0;
    const compositeVal = !isNaN(Number(rawComposite)) && rawComposite !== null
      ? Number(rawComposite)
      : +((infraVal + skillsVal + empowerVal + workVal) / 4).toFixed(1);
    const parsedIpm = !isNaN(Number(rawIpm)) && rawIpm !== null ? Number(rawIpm) : undefined;

    if (!updates[kabKota]) {
      updates[kabKota] = {};
    }
    updates[kabKota][rawYear] = {
      imdiComposite: compositeVal,
      subPillars: {
        infrastructure: infraVal,
        skills: skillsVal,
        empowerment: empowerVal,
        workforce: workVal,
      },
      ipmScore: parsedIpm,
    };
    updatedRegionsSet.add(kabKota);

    const isSpbeTrigger = empowerVal < 38.0 && infraVal < 40.0;

    if (previewRows.length < 50) {
      previewRows.push({
        kabKota,
        province,
        year: rawYear,
        composite: compositeVal,
        infrastructure: infraVal,
        skills: skillsVal,
        empowerment: empowerVal,
        workforce: workVal,
        ipm: parsedIpm,
        spbeMandatory: isSpbeTrigger,
      });
    }
  }

  logs.push({
    timestamp: new Date().toLocaleTimeString('id-ID'),
    stage: 'ANALISIS_URGENSI',
    level: 'success',
    message: `Berhasil memetakan nilai IMDI untuk ${updatedRegionsSet.size} kabupaten/kota. Analisis sub-pilar pemicu SPBE dan urgensi kebijakan disinkronkan.`,
    details: { count: updatedRegionsSet.size },
  });

  return {
    fileName,
    totalRows: rawRows.length,
    updatedDistrictsCount: updatedRegionsSet.size,
    recognizedColumns,
    updates,
    previewRows,
    logs,
  };
}

// Generate realistic dirty IMDI dataset to test AI column recognition
export function simulateDirtyImdiDataset(): Array<Record<string, any>> {
  return [
    {
      'nama_kabupaten_kota_x9821': 'Kabupaten Sampang',
      'provinsi_wilayah': 'Jawa Timur',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 31.8,
      'subpilar_infrastruktur_dan_ekosistem_tik': 32.5,
      'subpilar_keterampilan_digital_masyarakat': 29.8,
      'subpilar_pemberdayaan_digital_daerah': 31.2,
      'subpilar_pekerjaan_lapangan_kerja': 29.5,
      'ipm_bps_provinsi': 66.8,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kota Surabaya',
      'provinsi_wilayah': 'Jawa Timur',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 54.6,
      'subpilar_infrastruktur_dan_ekosistem_tik': 61.2,
      'subpilar_keterampilan_digital_masyarakat': 55.4,
      'subpilar_pemberdayaan_digital_daerah': 51.0,
      'subpilar_pekerjaan_lapangan_kerja': 48.8,
      'ipm_bps_provinsi': 83.2,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kabupaten Lombok Utara',
      'provinsi_wilayah': 'Nusa Tenggara Barat',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 33.2,
      'subpilar_infrastruktur_dan_ekosistem_tik': 34.0,
      'subpilar_keterampilan_digital_masyarakat': 31.5,
      'subpilar_pemberdayaan_digital_daerah': 32.4,
      'subpilar_pekerjaan_lapangan_kerja': 31.0,
      'ipm_bps_provinsi': 67.2,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kota Mataram',
      'provinsi_wilayah': 'Nusa Tenggara Barat',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 50.1,
      'subpilar_infrastruktur_dan_ekosistem_tik': 53.8,
      'subpilar_keterampilan_digital_masyarakat': 51.2,
      'subpilar_pemberdayaan_digital_daerah': 47.9,
      'subpilar_pekerjaan_lapangan_kerja': 45.2,
      'ipm_bps_provinsi': 80.5,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kabupaten Bangkalan',
      'provinsi_wilayah': 'Jawa Timur',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 35.0,
      'subpilar_infrastruktur_dan_ekosistem_tik': 36.2,
      'subpilar_keterampilan_digital_masyarakat': 33.0,
      'subpilar_pemberdayaan_digital_daerah': 34.5,
      'subpilar_pekerjaan_lapangan_kerja': 33.8,
      'ipm_bps_provinsi': 67.9,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kabupaten Banyuwangi',
      'provinsi_wilayah': 'Jawa Timur',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 46.5,
      'subpilar_infrastruktur_dan_ekosistem_tik': 48.0,
      'subpilar_keterampilan_digital_masyarakat': 47.2,
      'subpilar_pemberdayaan_digital_daerah': 44.0,
      'subpilar_pekerjaan_lapangan_kerja': 42.8,
      'ipm_bps_provinsi': 73.8,
    },
    {
      'nama_kabupaten_kota_x9821': 'Kabupaten Lombok Tengah',
      'provinsi_wilayah': 'Nusa Tenggara Barat',
      'tahun_penilaian_resmi_2026': 2026,
      'skor_komposit_imdi_bps': 39.5,
      'subpilar_infrastruktur_dan_ekosistem_tik': 41.5,
      'subpilar_keterampilan_digital_masyarakat': 38.0,
      'subpilar_pemberdayaan_digital_daerah': 39.2,
      'subpilar_pekerjaan_lapangan_kerja': 37.0,
      'ipm_bps_provinsi': 69.8,
    },
  ];
}

// Export current IMDI scores to clean Excel spreadsheet
export function exportCleanedImdiToXLSX(
  regions: RegionProfile[],
  selectedYear = 2026,
  fileName = 'Data_Nilai_IMDI_Terkelola.xlsx'
): void {
  const exportData = regions.map((r, idx) => {
    const ym = r.yearlyData[selectedYear] || r.yearlyData[2026];
    return {
      'No': idx + 1,
      'Kabupaten / Kota': r.name,
      'Provinsi': r.province,
      'Tahun': selectedYear,
      'Skor IMDI Komposit': ym.imdiComposite,
      'Sub-Pilar Infrastruktur': ym.subPillars.infrastructure,
      'Sub-Pilar Keterampilan': ym.subPillars.skills,
      'Sub-Pilar Pemberdayaan': ym.subPillars.empowerment,
      'Sub-Pilar Pekerjaan': ym.subPillars.workforce,
      'IPM Daerah': r.ipmScore,
      'Status Urgensi': ym.urgencyLevel,
      'Pemicu Mandat SPBE': ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0 ? 'YA (Prioritas ASN)' : 'TIDAK',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `IMDI_${selectedYear}`);
  XLSX.writeFile(workbook, fileName);
}
