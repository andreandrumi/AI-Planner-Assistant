import React from 'react';
import { Users, AlertTriangle, Activity, Award, ShieldAlert, TrendingUp } from 'lucide-react';
import { RegionProfile, ProvinceName } from '../types';

interface MacroStatsProps {
  regions: RegionProfile[];
  selectedYear: number;
  selectedProvince: ProvinceName | 'Semua';
}

export const MacroStats: React.FC<MacroStatsProps> = ({
  regions,
  selectedYear,
  selectedProvince,
}) => {
  // Filter regions based on province if not 'Semua'
  const filtered = selectedProvince === 'Semua' 
    ? regions 
    : regions.filter((r) => r.province === selectedProvince);

  let totalUniqueTalents = 0;
  let totalRegisteredAlumni = 0;
  let totalMultiSkills = 0;
  let criticalCount = 0;
  let attentionCount = 0;
  let fulfilledCount = 0;
  let sumImdi = 0;
  let mandatorySPBECount = 0;
  let stagnantCount = 0;

  for (const r of filtered) {
    const ym = r.yearlyData[selectedYear] || r.yearlyData[2026];
    totalUniqueTalents += ym.uniqueTalents;
    totalRegisteredAlumni += ym.totalAlumniRegistered;
    totalMultiSkills += ym.multiSkillCount;
    sumImdi += ym.imdiComposite;

    if (ym.urgencyLevel === 'Kritis') criticalCount++;
    else if (ym.urgencyLevel === 'Perlu Perhatian') attentionCount++;
    else fulfilledCount++;

    if (ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0) {
      mandatorySPBECount++;
    }

    if (ym.stagnantWarning) {
      stagnantCount++;
    }
  }

  const avgImdi = filtered.length > 0 ? (sumImdi / filtered.length).toFixed(1) : '0';
  const multiSkillRate = totalUniqueTalents > 0 ? ((totalMultiSkills / totalUniqueTalents) * 100).toFixed(1) : '0';

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {/* Metric 1: Unique Talents */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Jumlah Talenta Digital</span>
          <Users className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl font-bold text-white tracking-tight flex items-baseline gap-1.5">
          <span>{totalUniqueTalents.toLocaleString('id-ID')}</span>
          <span className="text-[11px] font-semibold text-cyan-300">Data Unik</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          {totalRegisteredAlumni > 0
            ? `Deduplikasi kolom No. Register (${totalRegisteredAlumni.toLocaleString('id-ID')} baris)`
            : 'Menunggu unggah data riil'}
        </div>
      </div>

      {/* Metric 2: Multi-Skill Talent Rate */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Rasio Multi-Keahlian</span>
          <Award className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xl font-bold text-cyan-300 tracking-tight">
          {multiSkillRate}%
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          {totalMultiSkills.toLocaleString('id-ID')} talenta &gt;1 tema
        </div>
      </div>

      {/* Metric 3: Critical Urgency Districts */}
      <div className="bg-slate-800/80 border border-rose-900/40 rounded-xl p-3.5 shadow-sm bg-gradient-to-b from-rose-950/20 to-slate-800/80">
        <div className="flex items-center justify-between text-rose-400 mb-1">
          <span className="text-xs font-medium">Wilayah Kritis</span>
          <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
        </div>
        <div className="text-xl font-bold text-rose-400 tracking-tight flex items-baseline gap-1.5">
          <span>{criticalCount}</span>
          <span className="text-xs font-normal text-slate-400">/ {filtered.length} Kab/Kota</span>
        </div>
        <div className="text-[11px] text-rose-300/80 mt-0.5 truncate">
          Prioritas intervensi utama
        </div>
      </div>

      {/* Metric 4: Average IMDI Composite */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Rata-rata Skor IMDI</span>
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="text-xl font-bold text-indigo-300 tracking-tight flex items-baseline gap-1">
          <span>{avgImdi}</span>
          <span className="text-xs font-normal text-slate-400">/ 100</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          Skala nasional Kominfo
        </div>
      </div>

      {/* Metric 5: Mandatory SPBE Priority */}
      <div className="bg-slate-800/80 border border-amber-900/40 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-amber-400 mb-1">
          <span className="text-xs font-medium">Prioritas SPBE ASN</span>
          <ShieldAlert className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-xl font-bold text-amber-300 tracking-tight">
          {mandatorySPBECount} Wilayah
        </div>
        <div className="text-[11px] text-amber-300/80 mt-0.5 truncate">
          Pilar Pemberdayaan &lt; 38
        </div>
      </div>

      {/* Metric 6: Stagnancy Warning (Time-Series) */}
      <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 shadow-sm">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs font-medium">Peringatan Stagnansi</span>
          <TrendingUp className="w-4 h-4 text-orange-400" />
        </div>
        <div className="text-xl font-bold text-orange-300 tracking-tight">
          {stagnantCount} Wilayah
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5 truncate">
          Alumni tinggi, IMDI stagnan
        </div>
      </div>
    </div>
  );
};
