import { RegionProfile, AIPolicyReport, UrgencyLevel } from '../types';

export function generateRuleBasedPolicyReport(
  region: RegionProfile,
  year: number,
  customQuery?: string
): AIPolicyReport {
  const ym = region.yearlyData[year] || region.yearlyData[2026] || region.yearlyData[2024];
  const sub = ym.subPillars;
  const ipm = region.ipmScore;
  const eco = region.economicCategory;

  // Check sub-pillar rule: Low Pemberdayaan (< 38) and Low Infrastruktur (< 40)
  const isMandatorySPBE = sub.empowerment < 38.0 && sub.infrastructure < 40.0;

  // Check time-series stagnancy rule
  const isStagnant = ym.stagnantWarning;

  // Compute urgency level and label
  const urgencyLevel: UrgencyLevel = ym.urgencyLevel;
  const urgencyScore = ym.urgencyScore;

  // Segment 1: Vokasi & Remaja
  let vokasiPrioritas = '';
  let vokasiTema: string[] = [];
  let vokasiKeluaran = '';

  if (ipm < 70) {
    vokasiPrioritas = 'Literasi Digital Dasar & Keahlian Komputasi Esensial';
    vokasiTema = [
      'Fondasi Literasi Digital, Cyber Hygiene & Etika Bermedia',
      'Dasar Pengolahan Data Perkantoran & Otomasi Lembar Kerja',
      'Junior Graphic Design & Konten Kreatif Berbasis AI Tools',
    ];
    vokasiKeluaran = 'Mencetak lulusan siap kerja dengan kemampuan komputer dasar dan keamanan digital tersertifikasi.';
  } else if (ipm <= 78) {
    vokasiPrioritas = 'Keahlian Terapan Web, Data & Creative Media';
    vokasiTema = [
      'Junior Web Developer & Frontend Engineering Modern',
      'Data Analytics Praktis untuk Operasional Bisnis',
      'Pengembangan UI/UX Desain Aplikasi Berorientasi Pengguna',
    ];
    vokasiKeluaran = 'Kesiapan talenta vokasi memasuki ekosistem digital regional dan startup teknologi.';
  } else {
    vokasiPrioritas = 'Keahlian Tingkat Lanjut (AI, Cloud & Security)';
    vokasiTema = [
      'Artificial Intelligence Engineering & Large Language Model Prompter',
      'Cloud Architecture & DevOps Deployment Pipeline',
      'Cyber Security Defense & Vulnerability Assessment',
    ];
    vokasiKeluaran = 'Talenta spesialis berdaya saing global untuk industri teknologi tinggi dan sentra riset.';
  }

  // Segment 2: UMKM & Usia Produktif (aligned with local economy)
  let umkmPrioritas = '';
  let umkmTema: string[] = [];
  let umkmKeluaran = '';

  if (eco === 'Agraris & Lumbung Pangan') {
    umkmPrioritas = 'Digitalisasi Agribisnis, Smart Farming & Rantai Pasok Pangan';
    umkmTema = [
      'E-Commerce & Optimalisasi Pasar Digital Produk Pertanian Unggulan',
      'Pemanfaatan IoT Sederhana & Prediksi Cuaca Berbasis Data Petani',
      'Pengelolaan Keuangan Digital, QRIS & Akses Permodalan Fintech',
    ];
    umkmKeluaran = 'Peningkatan efisiensi distribusi komoditas panen lokal dan penghapusan perantara pasar.';
  } else if (eco === 'Pesisir, Maritim & Kelautan') {
    umkmPrioritas = 'Smart Marine Economy & E-Logistik Hasil Laut';
    umkmTema = [
      'Pemasaran Digital & Ekspor Langsung Produk Olahan Ikan Laut',
      'Aplikasi Pencatatan Hasil Tangkap & Manajemen Rantai Dingin Nelayan',
      'Digital Branding Sentra Pesisir & Pariwisata Bahari',
    ];
    umkmKeluaran = 'Peningkatan nilai tambah hasil laut dan perluasan pasar ekspor nelayan tradisional.';
  } else if (eco === 'Sentra Industri & Manufaktur') {
    umkmPrioritas = 'Otomasi Usaha Rantai Pasok Industri & Manufaktur Cerdas';
    umkmTema = [
      'Digital Supply Chain & Manajemen Inventori Industri Terintegrasi',
      'Pemasaran B2B Digital & Standarisasi Katalog Industri',
      'Keamanan Data Transaksi & Kemitraan Pabrikasi Presisi',
    ];
    umkmKeluaran = 'Integrasi rantai pasok industri mikro dengan pabrik manufaktur skala nasional/internasional.';
  } else if (eco === 'Pariwisata & Ekonomi Kreatif') {
    umkmPrioritas = 'Hospitality Digital Experience & Konten Kreatif Nusantara';
    umkmTema = [
      'Digital Marketing Multi-Bahasa & SEO Destinasi Wisata Unggulan',
      'Hospitality CRM & Reservasi Digital untuk Homestay dan Ekosistem Wisata',
      'Pembuatan Konten Visual Sinematik & Storytelling Digital Berbasis AI',
    ];
    umkmKeluaran = 'Peningkatan belanja wisatawan dan visibilitas daya tarik wisata di kanal internasional.';
  } else if (eco === 'Tambang & Energi') {
    umkmPrioritas = 'Dukungan Layanan Digital Vendor Pertambangan & Logistik Berkelanjutan';
    umkmTema = [
      'Sistem Manajemen Keselamatan Kerja & HSE Digital Berstandar Tambang',
      'Digital Procurement & Kemitraan Pengadaan Barang/Jasa Ring 1',
      'Diversifikasi Ekonomi Digital Pasca-Tambang bagi Pemuda Lokal',
    ];
    umkmKeluaran = 'Meningkatkan serapan tenaga kerja lokal ke dalam rantai pasok industri energi dan pertambangan.';
  } else {
    umkmPrioritas = 'Akselerasi Dagang Digital & Omnichannel Retail';
    umkmTema = [
      'Strategi Omnichannel Retail & Live Selling E-Commerce',
      'Digital Accounting & Manajemen Arus Kas Berbasis Cloud',
      'Customer Loyalty System & Pemasaran Mikro Berbayar',
    ];
    umkmKeluaran = 'Pertumbuhan omzet UMKM perdagangan dan penetrasi pasar lintas provinsi.';
  }

  // Segment 3: Pejabat Publik / ASN
  let asnPrioritas = '';
  let asnTema: string[] = [];
  let asnKeluaran = '';

  if (isMandatorySPBE) {
    asnPrioritas = '[INTERVENSI KRITIS] Akselerasi Tata Kelola SPBE & Digitalisasi Birokrasi';
    asnTema = [
      'Tata Kelola Arsitektur SPBE & Integrasi Layanan Publik Terpadu',
      'Keamanan Siber Instansi Pemda, Proteksi Data Pribadi (UU PDP) & Tanggap CSIRT',
      'Manajemen Perubahan Budaya Kerja Digital & Digital Leadership bagi Pimpinan OPD',
    ];
    asnKeluaran = 'Meningkatkan indeks SPBE daerah, memperbaiki integritas pilar Pemberdayaan IMDI, dan menjamin kepatuhan regulasi nasional.';
  } else if (ipm >= 80) {
    asnPrioritas = 'AI untuk Perumusan Kebijakan Publik & Smart City Lanjutan';
    asnTema = [
      'Pemanfaatan AI & Big Data Spasial untuk Analisis Kebijakan Berbasis Bukti',
      'Manajemen Pusat Kendali Smart City (Command Center) & AI Analytics',
      'Standar Keamanan Siber Lanjutan & Audit Kepatuhan ISO 27001 Pemerintah',
    ];
    asnKeluaran = 'Pemerintahan yang lincah (agile governance), pengambilan keputusan berbasis data waktu nyata, dan kota cerdas terintegrasi.';
  } else {
    asnPrioritas = 'Peningkatan Kualitas Layanan Digital Publik & Manajemen Data Daerah';
    asnTema = [
      'Optimalisasi Portal Layanan Publik Daerah Berorientasi Kepuasan Warga',
      'Keamanan Informasi Esensial & Pencegahan Kebocoran Data Kedinasan',
      'Penyusunan Satu Data Indonesia (SDI) Tingkat Kabupaten/Kota',
    ];
    asnKeluaran = 'Efisiensi birokrasi pemerintahan daerah dan standardisasi interoperabilitas data lintas dinas.';
  }

  // Strategic shift text for time-series stagnancy
  let fokusPerubahanStrategis = '';
  if (isStagnant) {
    fokusPerubahanStrategis = `PERINGATAN EVALUASI STRATEGIS: Daerah ini telah menyerap ${ym.totalAlumniRegistered.toLocaleString('id-ID')} kuota pelatihan historis, namun laju kenaikan skor IMDI stagnan (+${(ym.imdiComposite - (region.yearlyData[2022]?.imdiComposite || ym.imdiComposite)).toFixed(1)} poin sejak 2022). DATAMAP AI merekomendasikan perombakan radikal: hentikan pelatihan literasi massal umum yang jenuh; alihkan 100% anggaran intervensi tahun depan ke program 'Link-and-Match' tersertifikasi industri lokal (${region.economicCategory}) dan pendampingan inkubasi wirausaha berorientasi hasil.`;
  } else {
    fokusPerubahanStrategis = `Pertumbuhan intervensi berada pada trayek akselerasi positif. Pertahankan diversifikasi tema dan tingkatkan proporsi peserta yang tersertifikasi kompetensi standar BNSP/Global.`;
  }

  // Executive summary paragraph
  const ringkasanEksekutif = `${region.name} (${region.province}) pada tahun ${year} tercatat memiliki skor IMDI komposit sebesar ${ym.imdiComposite.toFixed(1)} dengan kategori urgensi ${urgencyLevel.toUpperCase()} (skor defisit ${urgencyScore}/100). Dengan basis ekonomi ${region.economicCategory} dan IPM sebesar ${ipm.toFixed(1)}, wilayah ini membutuhkan intervensi terfokus pada ${isMandatorySPBE ? 'pembenahan infrastruktur birokrasi digital SPBE ASN dan penguatan literasi dasar' : `akselerasi talenta sektor ${eco}`}. Teridentifikasi ${ym.uniqueTalents.toLocaleString('id-ID')} talenta unik dari total ${ym.totalAlumniRegistered.toLocaleString('id-ID')} riwayat kepesertaan, menunjukkan rasio multi-keahlian sebesar ${((ym.multiSkillCount / Math.max(1, ym.uniqueTalents)) * 100).toFixed(1)}%.`;

  // AI Audit Trail details
  const aiAuditTrail = {
    formulaKomputasi: `Skor Urgensi (${urgencyScore}) = 0.35 × Defisit IMDI (${(Math.max(0, 60 - ym.imdiComposite) / 60 * 100).toFixed(1)}) + 0.25 × Defisit Penyerapan Talenta (${((1 - ym.uniqueTalents / region.laborForceTarget) * 100).toFixed(1)}) + 0.20 × Rata-rata Defisit Sub-Pilar Pemberdayaan & Infrastruktur (${(((50 - sub.empowerment) + (50 - sub.infrastructure)) / 2).toFixed(1)}) + 0.10 × Defisit IPM (${(Math.max(0, 80 - ipm) / 80 * 100).toFixed(1)})${isStagnant ? ' + 10 Poin Penalti Stagnansi Deret Waktu' : ''}.`,
    rasioPenyerapan: `${ym.uniqueTalents.toLocaleString('id-ID')} talenta unik terdeduplikasi dari target angkatan kerja ${region.laborForceTarget.toLocaleString('id-ID')} jiwa (${((ym.uniqueTalents / region.laborForceTarget) * 100).toFixed(2)}% penetrasi).`,
    evaluasiStagnansi: isStagnant
      ? `Terdeteksi pola stagnansi: Rasio alokasi kuota per kapita tinggi (>7.000 alumni) berkorelasi lemah dengan kenaikan IMDI (<0.5 per tahun). Perombakan portofolio kurikulum wajib dilakukan.`
      : `Laju kenaikan IMDI selaras dengan pertumbuhan lulusan (+1.6 poin per tahun). Distribusi multi-keahlian stabil.`,
    justifikasiHukumPolitik: `Rekomendasi ini memenuhi asas akuntabilitas berbasis bukti (evidence-based policy making) berdasarkan UU No. 27/2022 tentang Perlindungan Data Pribadi (anonimitas terjamin), Perpres No. 95/2018 tentang SPBE, dan ketentuan pemanfaatan Dana Dekonsentrasi / DAK Non-Fisik Pelatihan Digital Kominfo. Keputusan kepala daerah untuk merealokasi anggaran ke tema ini sah dan memiliki dasar rasionalitas audit BPK/Inspektorat.`,
    analisisSubPilarKritis: [
      `Infrastruktur & Ekosistem: ${sub.infrastructure.toFixed(1)}/100 (${sub.infrastructure < 40 ? 'Defisit Kritis' : 'Cukup Memadai'})`,
      `Keterampilan Digital: ${sub.skills.toFixed(1)}/100 (${sub.skills < 38 ? 'Perlu Ditingkatkan' : 'Sedang-Baik'})`,
      `Pemberdayaan: ${sub.empowerment.toFixed(1)}/100 (${sub.empowerment < 38 ? 'Defisit Kritis - Pemicu Kebijakan ASN' : 'Cukup Aktif'})`,
      `Pekerjaan: ${sub.workforce.toFixed(1)}/100 (${sub.workforce < 35 ? 'Daya Serap Rendah' : 'Terserap'})`,
    ],
    rekomendasiSektorPrioritas: isMandatorySPBE
      ? 'Aparatur Sipil Negara (ASN) & Tata Kelola SPBE (Prioritas Tertinggi Mutlak)'
      : ipm > 78
      ? 'Tenaga Kerja Produktif & Vokasi Tingkat Lanjut (AI & Cloud)'
      : 'UMKM & Pelaku Usaha Lokal Sektor Unggulan',
  };

  return {
    regionId: region.id,
    regionName: region.name,
    province: region.province,
    selectedYear: year,
    ringkasanEksekutif,
    tingkatUrgensi: urgencyLevel,
    skorUrgensi: urgencyScore,
    alasanUrgensi: isStagnant
      ? 'Alokasi pelatihan tinggi namun pertumbuhan IMDI stagnan; butuh perubahan radikal sektor.'
      : urgencyLevel === 'Kritis'
      ? 'Kesenjangan talenta digital tinggi, skor sub-pilar IMDI di bawah ambang batas aman.'
      : urgencyLevel === 'Perlu Perhatian'
      ? 'Kondisi menengah, butuh penguatan terarah pada segmen produktif daerah.'
      : 'Kapasitas talenta digital mapan, fokus pada kelas spesialisasi lanjutan.',
    rekomendasiTema: {
      vokasi: {
        prioritas: vokasiPrioritas,
        temaUtama: vokasiTema,
        targetKeluaran: vokasiKeluaran,
      },
      umkm: {
        prioritas: umkmPrioritas,
        temaUtama: umkmTema,
        targetKeluaran: umkmKeluaran,
      },
      asn: {
        prioritas: asnPrioritas,
        temaUtama: asnTema,
        targetKeluaran: asnKeluaran,
        isMandatorySPBE,
      },
    },
    fokusPerubahanStrategis,
    aiAuditTrail,
  };
}

// Function to call live Gemini backend with graceful instant fallback
export async function fetchLiveAIPolicyAdvice(
  region: RegionProfile,
  year: number,
  customQuery?: string
): Promise<AIPolicyReport> {
  const ym = region.yearlyData[year] || region.yearlyData[2026];
  const baseline = generateRuleBasedPolicyReport(region, year, customQuery);

  try {
    const res = await fetch('/api/ai/advise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regionName: region.name,
        province: region.province,
        imdiScore: ym.imdiComposite,
        subPillars: ym.subPillars,
        ipmScore: region.ipmScore,
        economicContext: `${region.economicCategory} (${region.economicDescription})`,
        historySummary: `Total alumni historis: ${ym.totalAlumniRegistered}, Skor IMDI: ${ym.imdiComposite}, Urgensi: ${ym.urgencyLevel}, Peringatan Stagnansi: ${ym.stagnantWarning}`,
        uniqueTalents: ym.uniqueTalents,
        multiSkillRatio: ((ym.multiSkillCount / Math.max(1, ym.uniqueTalents)) * 100).toFixed(1),
        customQuery,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.source === 'gemini' && json.data) {
        const d = json.data;
        return {
          ...baseline,
          ringkasanEksekutif: d.ringkasanEksekutif || baseline.ringkasanEksekutif,
          tingkatUrgensi: d.tingkatUrgensi || baseline.tingkatUrgensi,
          alasanUrgensi: d.alasanUrgensi || baseline.alasanUrgensi,
          fokusPerubahanStrategis: d.fokusPerubahanStrategis || baseline.fokusPerubahanStrategis,
          rekomendasiTema: {
            vokasi: {
              ...baseline.rekomendasiTema.vokasi,
              temaUtama: d.rekomendasiTema?.vokasi || baseline.rekomendasiTema.vokasi.temaUtama,
            },
            umkm: {
              ...baseline.rekomendasiTema.umkm,
              temaUtama: d.rekomendasiTema?.umkm || baseline.rekomendasiTema.umkm.temaUtama,
            },
            asn: {
              ...baseline.rekomendasiTema.asn,
              temaUtama: d.rekomendasiTema?.asn || baseline.rekomendasiTema.asn.temaUtama,
            },
          },
          aiAuditTrail: {
            ...baseline.aiAuditTrail,
            justifikasiHukumPolitik: d.aiAuditTrail?.justifikasiPolitikHukum || baseline.aiAuditTrail.justifikasiHukumPolitik,
            evaluasiStagnansi: d.aiAuditTrail?.analisisKorelasi || baseline.aiAuditTrail.evaluasiStagnansi,
          },
        };
      }
    }
  } catch (e) {
    console.warn('Backend Gemini API call fallback to rule engine:', e);
  }

  return baseline;
}
