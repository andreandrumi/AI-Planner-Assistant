export type ProvinceName = 'Jawa Timur' | 'Nusa Tenggara Barat';

export type UrgencyLevel = 'Kritis' | 'Perlu Perhatian' | 'Telah Terpenuhi';

export type EconomicCategory =
  | 'Sentra Industri & Manufaktur'
  | 'Agraris & Lumbung Pangan'
  | 'Pesisir, Maritim & Kelautan'
  | 'Pariwisata & Ekonomi Kreatif'
  | 'Tambang & Energi'
  | 'Pusat Perdagangan & Jasa';

export interface SubPillars {
  infrastructure: number; // 0 - 100 (Infrastruktur & Ekosistem)
  skills: number;         // 0 - 100 (Keterampilan Digital)
  empowerment: number;    // 0 - 100 (Pemberdayaan)
  workforce: number;      // 0 - 100 (Pekerjaan)
}

export interface YearMetrics {
  year: number;
  imdiComposite: number;
  subPillars: SubPillars;
  totalAlumniRegistered: number;
  uniqueTalents: number;
  multiSkillCount: number;
  segmentDistribution: {
    vokasi: number;
    umkm: number;
    asn: number;
  };
  urgencyScore: number;
  urgencyLevel: UrgencyLevel;
  stagnantWarning: boolean;
}

export interface RegionProfile {
  id: string;
  name: string;
  shortName: string;
  type: 'Kota' | 'Kabupaten';
  province: ProvinceName;
  ipmScore: number; // 0 - 100
  economicCategory: EconomicCategory;
  economicDescription: string;
  laborForceTarget: number;
  // Geo coordinates for map representation
  coordinates: {
    x: number;
    y: number;
    regionSvgPath?: string;
  };
  yearlyData: Record<number, YearMetrics>;
}

export interface CleaningLogEntry {
  timestamp: string;
  stage: 'DEDUPLIKASI_FILE' | 'SEMANTIC_MAPPING' | 'PEMBERSIHAN_NILAI' | 'DEDUPLIKASI_TALENTA' | 'ANALISIS_URGENSI';
  message: string;
  details?: Record<string, any>;
  level: 'info' | 'success' | 'warning';
}

export interface DirtyDataSummary {
  originalRowCount: number;
  cleanRowCount: number;
  duplicateRowsRemoved: number;
  uniqueTalentsIdentified: number;
  multiSkillTalents: number;
  invalidAgesCorrected: number;
  yearsParsedRange: [number, number];
  unmappedColumnsResolved: number;
  fileHash: string;
  fileName: string;
  processedAt: string;
  logs: CleaningLogEntry[];
}

export interface AIPolicyReport {
  regionId: string;
  regionName: string;
  province: ProvinceName;
  selectedYear: number;
  ringkasanEksekutif: string;
  tingkatUrgensi: UrgencyLevel;
  skorUrgensi: number;
  alasanUrgensi: string;
  rekomendasiTema: {
    vokasi: {
      prioritas: string;
      temaUtama: string[];
      targetKeluaran: string;
    };
    umkm: {
      prioritas: string;
      temaUtama: string[];
      targetKeluaran: string;
    };
    asn: {
      prioritas: string;
      temaUtama: string[];
      targetKeluaran: string;
      isMandatorySPBE: boolean; // True if sub-pillar Pemberdayaan & Infrastruktur are critical
    };
  };
  fokusPerubahanStrategis: string;
  aiAuditTrail: {
    formulaKomputasi: string;
    rasioPenyerapan: string;
    evaluasiStagnansi: string;
    justifikasiHukumPolitik: string;
    analisisSubPilarKritis: string[];
    rekomendasiSektorPrioritas: string;
  };
}
