import React, { useState, useMemo } from 'react';
import { CategorySummary, FiscalMonth, DashboardDataMode } from '../../types';
import { formatCurrencyUSD, formatPercentage } from '../../lib/calculations';
import { 
  Layers, 
  Calendar, 
  BarChart2, 
  TrendingUp, 
  TrendingDown, 
  X,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GroupedBarChartProps {
  categorySummaries: CategorySummary[];
  monthlyData?: {
    month: FiscalMonth;
    budget: number;
    actual: number;
    isClosed: boolean;
  }[];
  dataMode?: DashboardDataMode;
}

/**
 * Computes a clean, human-readable ceiling with headroom for chart Y-axis
 * Ensures Budget and Actual are rendered on the EXACT same scale
 */
function computeNiceCeiling(maxVal: number): number {
  if (maxVal <= 0) return 100_000;
  // 15% headroom so the highest bar never touches the top border
  const target = maxVal * 1.15;
  const power = Math.pow(10, Math.floor(Math.log10(target)));
  const ratio = target / power;
  let factor = 1;
  if (ratio <= 1) factor = 1;
  else if (ratio <= 1.25) factor = 1.25;
  else if (ratio <= 1.5) factor = 1.5;
  else if (ratio <= 2) factor = 2;
  else if (ratio <= 2.5) factor = 2.5;
  else if (ratio <= 5) factor = 5;
  else if (ratio <= 7.5) factor = 7.5;
  else factor = 10;
  return Math.max(10_000, factor * power);
}

export const GroupedBarChart: React.FC<GroupedBarChartProps> = ({
  categorySummaries,
  monthlyData = [],
  dataMode = 'both'
}) => {
  const { language } = useAuth();
  const [chartMode, setChartMode] = useState<'category' | 'monthly'>('category');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(true);

  // Labels based on language
  const labels = {
    categoryTab: language === 'ID' ? 'Kategori Beban TI' : 'By IT Category',
    monthlyTab: language === 'ID' ? 'Tren Bulanan (Apr–Mar)' : 'By Fiscal Month',
    budgetLegend: language === 'ID' ? 'Anggaran (Budget)' : 'Budget',
    actualLegend: language === 'ID' ? 'Realisasi (Actual)' : 'Actual',
    overBudgetLegend: language === 'ID' ? 'Melebihi Anggaran' : 'Over Budget',
    underBudgetLegend: language === 'ID' ? 'Di Bawah Anggaran' : 'Under Budget',
    onBudgetLegend: language === 'ID' ? 'Sesuai Anggaran' : 'On Budget',
    variance: language === 'ID' ? 'Varians (Actual - Budget)' : 'Variance (Actual - Budget)',
    utilization: language === 'ID' ? 'Tingkat Utilisasi' : 'Utilization Rate',
    status: language === 'ID' ? 'Status' : 'Status',
    monthClosed: language === 'ID' ? 'Tutup Buku' : 'Closed Period',
    monthPlanned: language === 'ID' ? 'Rencana' : 'Projected',
    toggleLabels: language === 'ID' ? 'Label Angka' : 'Data Labels',
    tableSummaryTitle: language === 'ID' ? 'Tabel Rincian Angka Pasti per Kategori' : 'Exact Calculated Category Breakdown',
    noBudgetNotice: language === 'ID' ? 'Tanpa Alokasi Budget ($0)' : 'No Budget ($0)',
    zeroBudgetUtilization: language === 'ID' ? 'N/A (Budget $0)' : 'N/A (Budget $0)',
  };

  // Determine maximum value across BOTH budget and actual for category mode
  const maxCategoryValue = useMemo(() => {
    if (!categorySummaries || categorySummaries.length === 0) return 0;
    return Math.max(
      ...categorySummaries.map((c) => Math.max(c.budget || 0, c.actual || 0)),
      0
    );
  }, [categorySummaries]);

  // Determine maximum value across BOTH budget and actual for monthly mode
  const maxMonthlyValue = useMemo(() => {
    if (!monthlyData || monthlyData.length === 0) return 0;
    return Math.max(
      ...monthlyData.map((m) => Math.max(m.budget || 0, m.actual || 0)),
      0
    );
  }, [monthlyData]);

  // Single unified ceiling: Budget and Actual are strictly on the SAME SCALE
  const yAxisCeiling = useMemo(() => {
    const currentMax = chartMode === 'category' ? maxCategoryValue : maxMonthlyValue;
    return computeNiceCeiling(currentMax);
  }, [chartMode, maxCategoryValue, maxMonthlyValue]);

  // 5 standard Y-axis tick intervals
  const yTicks = useMemo(() => [
    yAxisCeiling,
    yAxisCeiling * 0.75,
    yAxisCeiling * 0.5,
    yAxisCeiling * 0.25,
    0
  ], [yAxisCeiling]);

  // Dynamic insights for footer
  const { highestVarianceCat, bestDisciplinedCat } = useMemo(() => {
    if (dataMode !== 'both') {
      return { highestVarianceCat: null, bestDisciplinedCat: null };
    }
    const withVariance = categorySummaries.filter((c) => c.variance !== null);
    const sortedDesc = [...withVariance].sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0));
    const sortedAsc = [...withVariance].sort((a, b) => (a.variance ?? 0) - (b.variance ?? 0));
    return {
      highestVarianceCat: sortedDesc[0] || null,
      bestDisciplinedCat: sortedAsc[0] || null
    };
  }, [categorySummaries, dataMode]);

  return (
    <div 
      id="grouped-bar-chart-container"
      className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5"
    >
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center font-bold shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                {language === 'ID' ? 'Diagram Batang Perbandingan Budget vs Actual' : 'Budget vs Actual Comparison Bar Chart'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {language === 'ID'
                  ? 'Skala vertikal terkalibrasi 1:1 identik. Menampilkan perbandingan proporsional murni langsung dari file Excel.'
                  : 'Calibrated 1:1 identical vertical scale. True proportional comparison derived directly from uploaded Excel files.'}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode & Data Label Toggles */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {/* Toggle Data Labels */}
          <button
            type="button"
            onClick={() => setShowDataLabels(prev => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
              showDataLabels
                ? 'bg-blue-50 border-blue-200 text-[#1E5EFF]'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
            }`}
            title={showDataLabels ? 'Sembunyikan label angka' : 'Tampilkan label angka'}
          >
            {showDataLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{labels.toggleLabels}</span>
          </button>

          {/* View Mode Toggle: Category vs Monthly */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              id="chart-mode-category-btn"
              onClick={() => {
                setChartMode('category');
                setSelectedIndex(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'category'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{labels.categoryTab}</span>
            </button>
            <button
              id="chart-mode-monthly-btn"
              onClick={() => {
                setChartMode('monthly');
                setSelectedIndex(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'monthly'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{labels.monthlyTab}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Legend & Scale Note */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-200/70">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          {/* Budget Legend */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-slate-400 border border-slate-500/40 inline-block shrink-0 shadow-2xs" />
            <span className="font-semibold text-slate-800">
              {labels.budgetLegend} {dataMode === 'gl_only' ? '(Belum Ada File)' : ''}
            </span>
          </div>

          {/* Actual Legend */}
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-sm bg-[#1E5EFF] inline-block shrink-0 shadow-2xs" />
            <span className="font-semibold text-slate-800">
              {labels.actualLegend} {dataMode === 'budget_only' ? '(Belum Ada File)' : ''}
            </span>
          </div>

          {/* Over Budget Legend */}
          {dataMode === 'both' && (
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-sm bg-rose-500 inline-block shrink-0 shadow-2xs" />
              <span className="font-semibold text-rose-700">{labels.overBudgetLegend} (Actual &gt; Budget)</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          <span>Skala Maksimum Sumbu Y: <strong>{formatCurrencyUSD(yAxisCeiling)}</strong></span>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="relative pt-6 pb-2 select-none">
        {/* ================= CATEGORY MODE ================= */}
        {chartMode === 'category' && (
          <div className="w-full">
            <div className="flex">
              {/* Sumbu Y (Angka Nominal Terkalibrasi Sama Persis) */}
              <div className="w-16 sm:w-20 pr-2 sm:pr-3 flex flex-col justify-between text-right text-[11px] font-mono text-slate-500 h-72 select-none shrink-0 border-r border-slate-200">
                {yTicks.map((tick, idx) => (
                  <span key={idx} className="leading-none transform -translate-y-1/2">
                    {formatCurrencyUSD(tick, true)}
                  </span>
                ))}
              </div>

              {/* Area Gambar Batang (Bar Canvas) */}
              <div className="flex-1 relative pl-2 sm:pl-4">
                {/* Garis Grid Horizontal */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pl-2 sm:pl-4">
                  {yTicks.map((_, idx) => (
                    <div key={idx} className="w-full border-b border-slate-100" />
                  ))}
                </div>

                {/* Jalur Batang Diagram (Tinggi 288px / h-72 untuk ruang data labels yang jernih) */}
                <div className="relative z-10 h-72 flex items-end justify-around gap-2 sm:gap-6 px-3 sm:px-6 border-b-2 border-slate-300">
                  {categorySummaries.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    // STRICT CALCULATION:
                    // 1. Same scale: (value / yAxisCeiling) * 100
                    // 2. If value <= 0: EXACTLY 0% height (NO artificial height, NO minimum pixels)
                    // 3. True proportional height: keeps exact ratio even if budget is 100x smaller
                    const budgetHeightPct = yAxisCeiling > 0 && cat.budget > 0
                      ? Math.min(100, Math.max(0, (cat.budget / yAxisCeiling) * 100))
                      : 0;

                    const actualHeightPct = yAxisCeiling > 0 && cat.actual > 0
                      ? Math.min(100, Math.max(0, (cat.actual / yAxisCeiling) * 100))
                      : 0;

                    const isOverBudget = dataMode === 'both' && cat.budget > 0 && cat.actual > cat.budget;
                    const isZeroBudgetWithActual = cat.budget <= 0 && cat.actual > 0;

                    // Utilization calculation:
                    // If budget > 0: (actual / budget) * 100
                    // If budget <= 0: null or N/A
                    const computedUtilizationPct = cat.budget > 0 
                      ? (cat.actual / cat.budget) * 100 
                      : (cat.actual > 0 ? null : 0);

                    const varianceValue = dataMode === 'both' ? (cat.actual - cat.budget) : null;

                    return (
                      <div 
                        key={cat.category}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(prev => prev === idx ? null : idx);
                        }}
                        className="flex-1 max-w-[130px] flex flex-col items-center group cursor-pointer relative h-full justify-end"
                      >
                        {/* Interactive Tooltip Pop-up (Exact calculated figures) */}
                        {isCardOpen && (
                          <div 
                            className={`absolute bottom-full mb-3 z-50 w-72 bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl backdrop-blur-xs border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                              idx === 0 
                                ? 'left-0' 
                                : idx >= categorySummaries.length - 2 
                                ? 'right-0' 
                                : 'left-1/2 -translate-x-1/2'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-extrabold text-sm border-b border-slate-700/80 pb-2 mb-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="truncate">{cat.category}</span>
                                <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                                  ({cat.accountCount} {language === 'ID' ? 'Akun' : 'COA'})
                                </span>
                              </div>
                              {isSelected && (
                                <button 
                                  onClick={() => setSelectedIndex(null)}
                                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="space-y-2 font-mono text-[11px]">
                              {/* Exact Budget */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-sans">{labels.budgetLegend}:</span>
                                <span className="font-bold text-slate-100">
                                  {dataMode === 'gl_only' 
                                    ? 'Belum Diunggah' 
                                    : cat.budget <= 0 
                                    ? '$0' 
                                    : formatCurrencyUSD(cat.budget)}
                                </span>
                              </div>

                              {/* Exact Actual */}
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-sans">{labels.actualLegend}:</span>
                                <span className="font-bold text-blue-300">
                                  {dataMode === 'budget_only' 
                                    ? 'Belum Diunggah' 
                                    : cat.actual <= 0 
                                    ? '$0' 
                                    : formatCurrencyUSD(cat.actual)}
                                </span>
                              </div>

                              {/* Exact Variance = Actual - Budget */}
                              {dataMode === 'both' && (
                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-800">
                                  <span className="text-slate-400 font-sans">
                                    {labels.variance}:
                                  </span>
                                  <span className={`font-bold ${
                                    (varianceValue || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                                  }`}>
                                    {(varianceValue || 0) > 0 ? '+' : ''}
                                    {formatCurrencyUSD(varianceValue || 0)}
                                  </span>
                                </div>
                              )}

                              {/* Exact Utilization = (Actual / Budget) * 100% */}
                              {dataMode === 'both' && (
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-400 font-sans">
                                    {labels.utilization}:
                                  </span>
                                  <span className="font-bold text-amber-300">
                                    {cat.budget <= 0 
                                      ? (cat.actual > 0 ? labels.zeroBudgetUtilization : '0.00%')
                                      : `${computedUtilizationPct?.toFixed(2)}%`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Status Pill in Tooltip */}
                            {dataMode === 'both' && (
                              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[10px]">
                                <span className="text-slate-400 font-sans">{labels.status}:</span>
                                <span className={`px-2 py-0.5 rounded-md font-bold font-sans ${
                                  isZeroBudgetWithActual || isOverBudget
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                    : (computedUtilizationPct ?? 0) < 90
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                }`}>
                                  {isZeroBudgetWithActual 
                                    ? labels.noBudgetNotice 
                                    : isOverBudget 
                                    ? labels.overBudgetLegend 
                                    : (computedUtilizationPct ?? 0) < 90 
                                    ? labels.underBudgetLegend 
                                    : labels.onBudgetLegend}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Top Data Labels / Summary Pill above the bars */}
                        {showDataLabels && dataMode === 'both' && (
                          <div className="mb-2 text-center select-none">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border transition ${
                              isZeroBudgetWithActual || isOverBudget
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : (computedUtilizationPct ?? 0) < 90
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {cat.budget <= 0 
                                ? (cat.actual > 0 ? 'B: $0' : '0%') 
                                : `${computedUtilizationPct?.toFixed(1)}%`}
                            </span>
                          </div>
                        )}

                        {/* Pasangan Batang (Budget & Actual) Berdampingan Pada Skala yang Sama */}
                        <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2.5 h-full">
                          {/* 1. BATANG BUDGET:
                              - If Budget = 0: Render NO visible bar (height: 0, no background)
                              - If Budget > 0: True proportional height (no artificial boost)
                          */}
                          <div className="w-1/2 max-w-[28px] h-full flex flex-col justify-end items-center relative">
                            {/* Value label directly above Budget bar if enabled */}
                            {showDataLabels && budgetHeightPct > 0 && (
                              <span className="text-[9px] font-mono text-slate-500 mb-0.5 whitespace-nowrap">
                                {formatCurrencyUSD(cat.budget, true)}
                              </span>
                            )}
                            {budgetHeightPct > 0 ? (
                              <div 
                                className={`w-full rounded-t-md transition-all duration-300 shadow-2xs ${
                                  isCardOpen ? 'bg-slate-500' : 'bg-slate-400'
                                }`}
                                style={{ height: `${budgetHeightPct}%` }}
                                title={`Budget: ${formatCurrencyUSD(cat.budget)}`}
                              />
                            ) : (
                              // If Budget = 0, NO visible bar is rendered
                              <div className="w-full h-0 opacity-0 pointer-events-none" />
                            )}
                          </div>

                          {/* 2. BATANG ACTUAL:
                              - Same vertical scale as Budget
                              - True proportional height
                              - Highlighted rose if Actual > Budget
                          */}
                          <div className="w-1/2 max-w-[28px] h-full flex flex-col justify-end items-center relative">
                            {/* Value label directly above Actual bar if enabled */}
                            {showDataLabels && actualHeightPct > 0 && (
                              <span className={`text-[9px] font-mono font-bold mb-0.5 whitespace-nowrap ${
                                isOverBudget || isZeroBudgetWithActual ? 'text-rose-600' : 'text-[#1E5EFF]'
                              }`}>
                                {formatCurrencyUSD(cat.actual, true)}
                              </span>
                            )}
                            {actualHeightPct > 0 ? (
                              <div 
                                className={`w-full rounded-t-md transition-all duration-300 shadow-xs ${
                                  isOverBudget || isZeroBudgetWithActual
                                    ? isCardOpen ? 'bg-rose-600' : 'bg-rose-500'
                                    : isCardOpen ? 'bg-blue-700' : 'bg-[#1E5EFF]'
                                }`}
                                style={{ height: `${actualHeightPct}%` }}
                                title={`Actual: ${formatCurrencyUSD(cat.actual)}`}
                              />
                            ) : (
                              // If Actual = 0, NO visible bar is rendered
                              <div className="w-full h-0 opacity-0 pointer-events-none" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Label Kategori Di Bawah Garis Sumbu X */}
                <div className="flex items-start justify-around gap-2 sm:gap-6 px-3 sm:px-6 pt-3">
                  {categorySummaries.map((cat, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    return (
                      <div key={cat.category} className="flex-1 max-w-[130px] text-center">
                        <p className={`text-xs font-extrabold truncate transition ${
                          isCardOpen ? 'text-[#1E5EFF]' : 'text-slate-800'
                        }`} title={cat.category}>
                          {cat.category}
                        </p>
                        {/* Optional subtle account count */}
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {cat.accountCount} {language === 'ID' ? 'COA' : 'COA'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Clear Detailed Data Labels Table per Category */}
            <div className="mt-6 pt-4 border-t border-slate-100 overflow-x-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {labels.tableSummaryTitle}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  Dihitung otomatis dari file Excel terunggah
                </span>
              </div>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold text-[11px] border-b border-slate-200">
                    <th className="py-2 px-3">{language === 'ID' ? 'Kategori' : 'Category'}</th>
                    <th className="py-2 px-3 text-right font-mono">{labels.budgetLegend}</th>
                    <th className="py-2 px-3 text-right font-mono">{labels.actualLegend}</th>
                    <th className="py-2 px-3 text-right font-mono">{language === 'ID' ? 'Varians (Act - Bud)' : 'Variance'}</th>
                    <th className="py-2 px-3 text-right font-mono">{labels.utilization} %</th>
                    <th className="py-2 px-3 text-center">{labels.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {categorySummaries.map((cat) => {
                    const isOver = dataMode === 'both' && cat.budget > 0 && cat.actual > cat.budget;
                    const isZeroBud = cat.budget <= 0 && cat.actual > 0;
                    const varianceVal = dataMode === 'both' ? (cat.actual - cat.budget) : null;
                    const utilPct = cat.budget > 0 
                      ? (cat.actual / cat.budget) * 100 
                      : (cat.actual > 0 ? null : 0);

                    return (
                      <tr key={cat.category} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 font-sans font-bold text-slate-800">
                          {cat.category}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {dataMode === 'gl_only' ? '–' : cat.budget <= 0 ? '$0' : formatCurrencyUSD(cat.budget)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {dataMode === 'budget_only' ? '–' : cat.actual <= 0 ? '$0' : formatCurrencyUSD(cat.actual)}
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          dataMode !== 'both' ? 'text-slate-400' : (varianceVal || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {dataMode !== 'both' 
                            ? '–' 
                            : `${(varianceVal || 0) > 0 ? '+' : ''}${formatCurrencyUSD(varianceVal || 0)}`}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {dataMode !== 'both' 
                            ? '–' 
                            : cat.budget <= 0 
                            ? (cat.actual > 0 ? 'N/A ($0)' : '0.0%') 
                            : `${utilPct?.toFixed(1)}%`}
                        </td>
                        <td className="py-2 px-3 text-center font-sans">
                          {dataMode !== 'both' ? (
                            <span className="text-slate-400 text-[10px]">Menunggu File</span>
                          ) : (
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              isZeroBud || isOver
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : (utilPct ?? 0) < 90
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isZeroBud ? 'Budget $0' : isOver ? 'Over' : (utilPct ?? 0) < 90 ? 'Under' : 'On Track'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= MONTHLY MODE ================= */}
        {chartMode === 'monthly' && (
          <div className="w-full">
            <div className="flex">
              {/* Sumbu Y (Nominal Bulanan Terkalibrasi Sama Persis) */}
              <div className="w-16 sm:w-20 pr-2 sm:pr-3 flex flex-col justify-between text-right text-[11px] font-mono text-slate-500 h-72 select-none shrink-0 border-r border-slate-200">
                {yTicks.map((tick, idx) => (
                  <span key={idx} className="leading-none transform -translate-y-1/2">
                    {formatCurrencyUSD(tick, true)}
                  </span>
                ))}
              </div>

              {/* Area Batang 12 Bulan (Apr s.d. Mar) */}
              <div className="flex-1 relative pl-2 sm:pl-4">
                {/* Garis Grid Horizontal */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pl-2 sm:pl-4">
                  {yTicks.map((_, idx) => (
                    <div key={idx} className="w-full border-b border-slate-100" />
                  ))}
                </div>

                {/* Batang 12 Bulan */}
                <div className="relative z-10 h-72 flex items-end justify-between gap-1 sm:gap-2 px-2 sm:px-4 border-b-2 border-slate-300">
                  {monthlyData.map((m, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    // Strict same scale for monthly mode
                    const budgetHeightPct = yAxisCeiling > 0 && m.budget > 0
                      ? Math.min(100, Math.max(0, (m.budget / yAxisCeiling) * 100))
                      : 0;

                    const actualHeightPct = yAxisCeiling > 0 && m.actual > 0
                      ? Math.min(100, Math.max(0, (m.actual / yAxisCeiling) * 100))
                      : 0;

                    const isOverBudget = dataMode === 'both' && m.isClosed && m.budget > 0 && m.actual > m.budget;
                    const monthlyUtilPct = m.budget > 0 ? (m.actual / m.budget) * 100 : (m.actual > 0 ? null : 0);

                    return (
                      <div 
                        key={m.month}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIndex(prev => prev === idx ? null : idx);
                        }}
                        className="flex-1 flex flex-col items-center group cursor-pointer relative h-full justify-end"
                      >
                        {/* Tooltip Bulan */}
                        {isCardOpen && (
                          <div 
                            className={`absolute bottom-full mb-3 z-50 w-64 bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl backdrop-blur-xs border border-slate-700 text-xs animate-in fade-in zoom-in-95 duration-100 ${
                              idx < 2 
                                ? 'left-0' 
                                : idx >= monthlyData.length - 2 
                                ? 'right-0' 
                                : 'left-1/2 -translate-x-1/2'
                            }`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="font-extrabold text-sm border-b border-slate-700/80 pb-1.5 mb-2 flex items-center justify-between">
                              <span className="text-blue-300 font-bold">{m.month} 2026</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                {m.isClosed ? labels.monthClosed : labels.monthPlanned}
                              </span>
                            </div>

                            <div className="space-y-1.5 font-mono text-[11px]">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-sans">{labels.budgetLegend}:</span>
                                <span className="font-bold">
                                  {dataMode === 'gl_only' 
                                    ? 'Belum Diunggah' 
                                    : m.budget <= 0 
                                    ? '$0' 
                                    : formatCurrencyUSD(m.budget)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-400 font-sans">{labels.actualLegend}:</span>
                                <span className="font-bold text-blue-300">
                                  {m.isClosed 
                                    ? formatCurrencyUSD(m.actual) 
                                    : dataMode === 'budget_only' 
                                    ? 'Belum Diunggah' 
                                    : '$0'}
                                </span>
                              </div>
                              {dataMode === 'both' && m.isClosed && (
                                <>
                                  <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                                    <span className="text-slate-400 font-sans">{labels.variance}:</span>
                                    <span className={`font-bold ${m.actual > m.budget ? 'text-rose-400' : 'text-emerald-400'}`}>
                                      {m.actual > m.budget ? '+' : ''}{formatCurrencyUSD(m.actual - m.budget)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-400 font-sans">{labels.utilization}:</span>
                                    <span className="font-bold text-amber-300">
                                      {m.budget <= 0 ? 'N/A' : `${monthlyUtilPct?.toFixed(1)}%`}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Top Data Labels in Monthly View */}
                        {showDataLabels && m.isClosed && dataMode === 'both' && (
                          <div className="mb-1 text-center select-none">
                            <span className="text-[9px] font-mono font-bold text-slate-600 block leading-tight">
                              {m.budget > 0 ? `${monthlyUtilPct?.toFixed(0)}%` : '-'}
                            </span>
                          </div>
                        )}

                        {/* Batang Bulanan (Budget & Actual) */}
                        <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full">
                          {/* Budget */}
                          <div className="w-1/2 max-w-[16px] h-full flex flex-col justify-end items-center">
                            {budgetHeightPct > 0 ? (
                              <div 
                                className="w-full rounded-t-xs bg-slate-400 transition-all duration-300"
                                style={{ height: `${budgetHeightPct}%` }}
                                title={`Budget: ${formatCurrencyUSD(m.budget)}`}
                              />
                            ) : (
                              // If Budget = 0, NO visible bar
                              <div className="w-full h-0 opacity-0 pointer-events-none" />
                            )}
                          </div>

                          {/* Actual */}
                          <div className="w-1/2 max-w-[16px] h-full flex flex-col justify-end items-center">
                            {m.isClosed && actualHeightPct > 0 ? (
                              <div 
                                className={`w-full rounded-t-xs transition-all duration-300 ${
                                  isOverBudget ? 'bg-rose-500' : 'bg-[#1E5EFF]'
                                }`}
                                style={{ height: `${actualHeightPct}%` }}
                                title={`Actual: ${formatCurrencyUSD(m.actual)}`}
                              />
                            ) : (
                              // If Actual = 0 or month not closed, NO bar
                              <div className="w-full h-0 opacity-0 pointer-events-none" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Label Bulan Di Bawah Garis */}
                <div className="flex items-start justify-between gap-1 sm:gap-2 px-2 sm:px-4 pt-3">
                  {monthlyData.map((m, idx) => {
                    const isHovered = hoveredIndex === idx;
                    const isSelected = selectedIndex === idx;
                    const isCardOpen = isHovered || isSelected;

                    return (
                      <div key={m.month} className="flex-1 text-center">
                        <p className={`text-[11px] font-bold transition ${
                          isCardOpen ? 'text-[#1E5EFF]' : 'text-slate-700'
                        }`}>
                          {m.month}
                        </p>
                        <p className="text-[9px] text-slate-400 font-mono">
                          {m.isClosed ? (language === 'ID' ? 'Tutup' : 'Closed') : '–'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics Row with Dynamic Insights */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-4 text-slate-600 flex-wrap">
          {highestVarianceCat && highestVarianceCat.variance !== null && (
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-rose-500 shrink-0" />
              <span>
                {language === 'ID' ? 'Varians Tertinggi' : 'Highest Variance'}:{' '}
                <strong className="text-slate-900">{highestVarianceCat.category}</strong>{' '}
                <span className="text-rose-600 font-mono font-bold">
                  ({highestVarianceCat.variance > 0 ? '+' : ''}{formatPercentage(highestVarianceCat.variancePct, true)})
                </span>
              </span>
            </div>
          )}

          {bestDisciplinedCat && bestDisciplinedCat.absorptionRate !== null && (
            <div className="flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>
                {language === 'ID' ? 'Serapan Terhemat' : 'Top Savings'}:{' '}
                <strong className="text-slate-900">{bestDisciplinedCat.category}</strong>{' '}
                <span className="text-emerald-600 font-mono font-bold">
                  ({formatPercentage(bestDisciplinedCat.absorptionRate)})
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          {language === 'ID' 
            ? 'Skala & Angka 100% tersinkronisasi dari file Excel'
            : 'Scale & Numbers 100% synchronized from Excel files'}
        </div>
      </div>
    </div>
  );
};
