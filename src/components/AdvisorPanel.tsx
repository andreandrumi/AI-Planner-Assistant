import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  Store,
  Landmark,
  FileText,
  Calculator,
  Scale,
  Send,
  Loader2,
  AlertOctagon,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import { RegionProfile, AIPolicyReport, UrgencyLevel } from '../types';
import { generateRuleBasedPolicyReport, fetchLiveAIPolicyAdvice } from '../utils/policyAdvisor';

interface AdvisorPanelProps {
  region: RegionProfile | null;
  selectedYear: number;
  onClose: () => void;
  onOpenPolicyBrief: (report: AIPolicyReport) => void;
}

export const AdvisorPanel: React.FC<AdvisorPanelProps> = ({
  region,
  selectedYear,
  onClose,
  onOpenPolicyBrief,
}) => {
  const [report, setReport] = useState<AIPolicyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'rekomendasi' | 'audit' | 'imdi'>('rekomendasi');

  useEffect(() => {
    if (region) {
      // First immediately render the rule-based baseline
      const base = generateRuleBasedPolicyReport(region, selectedYear);
      setReport(base);

      // Attempt live Gemini enhancement if available
      setLoading(true);
      fetchLiveAIPolicyAdvice(region, selectedYear)
        .then((adv) => setReport(adv))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [region, selectedYear]);

  const handleAskAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuery.trim() || !region) return;

    setLoading(true);
    try {
      const updated = await fetchLiveAIPolicyAdvice(region, selectedYear, userQuery.trim());
      setReport(updated);
      setUserQuery('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!region || !report) return null;

  const ym = region.yearlyData[selectedYear] || region.yearlyData[2026];
  const sub = ym.subPillars;
  const isStagnant = ym.stagnantWarning;
  const isSPBEAlert = report.rekomendasiTema.asn.isMandatorySPBE;

  const getUrgencyBadge = (level: UrgencyLevel) => {
    switch (level) {
      case 'Kritis':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40 ring-1 ring-rose-500/30';
      case 'Perlu Perhatian':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30';
      case 'Telah Terpenuhi':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 ring-1 ring-emerald-500/30';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 text-white flex flex-col h-full shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Panel Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-extrabold text-white">{region.name}</h3>
                <span className="text-xs text-slate-400 font-medium">({region.province})</span>
              </div>
              <p className="text-xs text-slate-400">
                Tahun Evaluasi: <strong className="text-blue-300">{selectedYear}</strong> • IPM: {region.ipmScore.toFixed(1)} • {region.economicCategory}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenPolicyBrief(report)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cetak Memo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2">
          <button
            onClick={() => setActiveTab('rekomendasi')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'rekomendasi'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Rekomendasi Berjenjang (3 Segmen)
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'audit'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            AI Audit Trail (Jejak Penalaran)
          </button>
          <button
            onClick={() => setActiveTab('imdi')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'imdi'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Sub-Pilar IMDI &amp; Talenta Unik
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Box 1: Ringkasan Eksekutif */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-blue-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Ringkasan Eksekutif
              </span>
              {loading && (
                <span className="text-[11px] text-blue-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Menghitung penalaran...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {report.ringkasanEksekutif}
            </p>
          </div>

          {/* Box 2: Tingkat Urgensi */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 block mb-1">
                Tingkat Urgensi Intervensi
              </span>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border ${getUrgencyBadge(report.tingkatUrgensi)}`}>
                  {report.tingkatUrgensi}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Skor Defisit: <strong className="text-white">{report.skorUrgensi} / 100</strong>
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-xs sm:text-right">
              {report.alasanUrgensi}
            </p>
          </div>

          {/* Mandatory SPBE Alert Banner if Sub-Pillars critical */}
          {isSPBEAlert && (
            <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-300">
                    MANDATORI PRD: Sub-Pilar Pemberdayaan ({sub.empowerment.toFixed(1)}) &amp; Infrastruktur ({sub.infrastructure.toFixed(1)}) Kritis
                  </h4>
                  <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                    Sesuai instruksi kebijakan, segmen <strong>Aparatur Sipil Negara (ASN)</strong> di {region.name} otomatis dijadikan prioritas tertinggi untuk pelatihan <strong>Tata Kelola Digital / SPBE</strong> guna memulihkan indeks tata kelola birokrasi daerah.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Time Series Stagnancy Warning Banner */}
          {isStagnant && (
            <div className="bg-rose-950/40 border border-rose-500/50 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start space-x-3">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-300">
                    PERINGATAN DERET WAKTU: Kuota Pelatihan Tinggi tapi Skor IMDI Stagnan
                  </h4>
                  <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                    {report.fokusPerubahanStrategis}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: REKOMENDASI TEMA BERJENJANG */}
          {activeTab === 'rekomendasi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">
                  Rekomendasi Tema Intervensi Berjenjang (3 Segmen Spesifik)
                </span>
                <span className="text-[10px] text-slate-400">
                  Basis Konteks: {region.economicCategory}
                </span>
              </div>

              {/* Segmen 1: Vokasi / Remaja */}
              <div className="bg-slate-800/90 border border-blue-900/40 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Segmen 1: Remaja &amp; Pendidikan Vokasi</h4>
                      <p className="text-[10px] text-slate-400">SMK, Politeknik, Mahasiswa &amp; Pencari Kerja Pemula</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-700/50">
                    Alokasi ~45%
                  </span>
                </div>
                <div className="text-xs text-blue-300 font-semibold mb-2">
                  Arah: {report.rekomendasiTema.vokasi.prioritas}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-3">
                  {report.rekomendasiTema.vokasi.temaUtama.map((tema, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <ChevronRight className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                      <span>{tema}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <strong className="text-slate-300">Target Keluaran:</strong> {report.rekomendasiTema.vokasi.targetKeluaran}
                </div>
              </div>

              {/* Segmen 2: UMKM / Usia Produktif */}
              <div className="bg-slate-800/90 border border-emerald-900/40 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Segmen 2: Usia Produktif, UMKM &amp; Swasta</h4>
                      <p className="text-[10px] text-slate-400">Wirausaha Lokal, Pelaku Usaha Mikro, Tenaga Kerja Swasta</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                    Alokasi ~35%
                  </span>
                </div>
                <div className="text-xs text-emerald-300 font-semibold mb-2">
                  Arah: {report.rekomendasiTema.umkm.prioritas}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-3">
                  {report.rekomendasiTema.umkm.temaUtama.map((tema, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{tema}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <strong className="text-slate-300">Target Keluaran:</strong> {report.rekomendasiTema.umkm.targetKeluaran}
                </div>
              </div>

              {/* Segmen 3: ASN & Pejabat Publik */}
              <div className="bg-slate-800/90 border border-indigo-900/40 rounded-2xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700/60">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Segmen 3: Pejabat Publik &amp; Aparatur Sipil Negara (ASN)</h4>
                      <p className="text-[10px] text-slate-400">Pimpinan OPD, Staf Kecamatan/Kelurahan, Tenaga Fungsional</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                    Alokasi ~20%
                  </span>
                </div>
                <div className="text-xs text-indigo-300 font-semibold mb-2">
                  Arah: {report.rekomendasiTema.asn.prioritas}
                </div>
                <ul className="space-y-1.5 text-xs text-slate-300 mb-3">
                  {report.rekomendasiTema.asn.temaUtama.map((tema, idx) => (
                    <li key={idx} className="flex items-start gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                      <span>{tema}</span>
                    </li>
                  ))}
                </ul>
                <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                  <strong className="text-slate-300">Target Keluaran:</strong> {report.rekomendasiTema.asn.targetKeluaran}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-cyan-400" />
                  AI Audit Trail: Transparansi Penalaran Kebijakan
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">
                  Akuntabel Hukum &amp; Politik
                </span>
              </div>

              {/* Mathematical Formula Computation Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-cyan-300 space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 text-[11px] font-sans font-bold">
                  <Calculator className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Kalkulasi Terbobot Algoritma Urgensi (0 - 100)</span>
                </div>
                <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[11px] leading-relaxed break-words">
                  {report.aiAuditTrail.formulaKomputasi}
                </div>
              </div>

              {/* Penetration & Multi-skills */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                <h4 className="text-xs font-bold text-white">Rasio Penyerapan Talenta Unik</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.aiAuditTrail.rasioPenyerapan}
                </p>
                <div className="text-[11px] text-slate-400">
                  Deduplikasi kontak multi-lapis memastikan 1 orang dengan &gt;1 pelatihan dicatat sebagai 1 talenta unik multi-keahlian.
                </div>
              </div>

              {/* Time Series Stagnancy Analysis */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                <h4 className="text-xs font-bold text-white">Evaluasi Deret Waktu (Time-Series 2022-2026)</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.aiAuditTrail.evaluasiStagnansi}
                </p>
              </div>

              {/* Legal & Political Justification */}
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-blue-400" />
                  Justifikasi Politik &amp; Hukum bagi Kepala Daerah
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {report.aiAuditTrail.justifikasiHukumPolitik}
                </p>
                <div className="text-[10px] text-slate-400 italic">
                  *Mematuhi asas akuntabilitas pemeriksaan BPK, BPKP, dan Inspektorat Wilayah. Data pribadi (PII) tetap dilindungi sesuai NFR-03.
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUB-PILAR IMDI DETAIL */}
          {activeTab === 'imdi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-300">
                  Dekomposisi 4 Pilar IMDI (Indeks Masyarakat Digital Indonesia)
                </span>
                <span className="text-xs font-bold text-indigo-400">
                  Skor Total: {ym.imdiComposite.toFixed(1)} / 100
                </span>
              </div>

              {/* 4 Pilar Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">1. Infrastruktur &amp; Ekosistem</span>
                    <strong className={sub.infrastructure < 40 ? 'text-rose-400' : 'text-white'}>
                      {sub.infrastructure.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sub.infrastructure < 40 ? 'bg-rose-500' : 'bg-blue-500'}`}
                      style={{ width: `${sub.infrastructure}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Konektivitas broadband, BTS, dan penetrasi internet rumah tangga.
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">2. Keterampilan Digital</span>
                    <strong className={sub.skills < 38 ? 'text-amber-400' : 'text-white'}>
                      {sub.skills.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500"
                      style={{ width: `${sub.skills}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Kapasitas literasi umum, keahlian coding, dan digital workplace.
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">3. Pemberdayaan</span>
                    <strong className={sub.empowerment < 38 ? 'text-rose-400 font-bold' : 'text-white'}>
                      {sub.empowerment.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${sub.empowerment < 38 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                      style={{ width: `${sub.empowerment}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Adopsi digital layanan publik (SPBE) dan pemanfaatan produktif.
                  </span>
                </div>

                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">4. Pekerjaan</span>
                    <strong className="text-white">
                      {sub.workforce.toFixed(1)} / 100
                    </strong>
                  </div>
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${sub.workforce}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Serapan tenaga kerja digital, startup lokal &amp; gig economy.
                  </span>
                </div>
              </div>

              {/* Unique talents table breakdown */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <h4 className="text-xs font-bold text-white mb-2">Metrik Talenta Unik vs Multi-Keahlian</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Total Sertifikasi</span>
                    <span className="text-white font-bold">{ym.totalAlumniRegistered.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Talenta Unik</span>
                    <span className="text-blue-400 font-bold">{ym.uniqueTalents.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="bg-slate-900 p-2 rounded-xl border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Multi-Keahlian</span>
                    <span className="text-cyan-400 font-bold">{ym.multiSkillCount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Interactive Query Box for Policy Maker */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90">
          <form onSubmit={handleAskAI} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Minta penajaman DATAMAP AI untuk ${region.shortName}...`}
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-500 placeholder-slate-500"
            />
            <button
              type="submit"
              disabled={loading || !userQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Kirim</span>
            </button>
          </form>
          <p className="text-[10px] text-slate-500 mt-1.5">
            Gaya penalaran: Analitis, objektif, berwibawa, dan berbasis bukti deret waktu (2022-2026).
          </p>
        </div>
      </div>
    </div>
  );
};
