import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  Filter, 
  RotateCcw, 
  BarChart3, 
  Layers, 
  DollarSign, 
  PieChart, 
  ArrowRight,
  Info,
  UploadCloud,
  FileSpreadsheet,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrencyUSD, formatPercentage, getElapsedMonths } from '../../lib/calculations';
import { CoaCategory, BudgetStatus, FISCAL_MONTHS } from '../../types';
import { GroupedBarChart } from './GroupedBarChart';

interface DashboardViewProps {
  onNavigateToUpload?: () => void;
  onNavigateToMatrix?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToUpload,
  onNavigateToMatrix
}) => {
  const { 
    kpiSummary, 
    categorySummaries, 
    worstCoaList, 
    highestAbsorptionList,
    lowestAbsorptionList,
    priorFiscalYear,
    selectedFiscalYear,
    setSelectedFiscalYear,
    availableFiscalYears,
    selectedQuarter,
    setSelectedQuarter,
    selectedCategory,
    setSelectedCategory,
    selectedDepartment,
    resetFilters,
    hasActiveFilters,
    latestClosedMonth,
    allAccountSummaries,
    monthlyMatrixRows,
    dataUploadStatus,
    dataMode,
    clearAllUploadedData,
    loadSampleBudgetOnly,
    loadSampleGlOnly,
    loadBothSamples
  } = useData();

  const { t, language } = useAuth();
  const [absorptionTab, setAbsorptionTab] = useState<'lowest' | 'highest'>('lowest');
  const [showSignificance, setShowSignificance] = useState(false);

  // Compute 12-month grouped budget vs actual data for the diagram batang
  const monthlyBarData = useMemo(() => {
    const elapsedMonthsList = getElapsedMonths(latestClosedMonth);
    return FISCAL_MONTHS.map((m) => {
      let bTotal = 0;
      let aTotal = 0;
      monthlyMatrixRows.forEach((row) => {
        bTotal += row.monthlyBudgets[m] || 0;
        aTotal += row.monthlyActuals[m] || 0;
      });
      const isClosed = aTotal > 0 || elapsedMonthsList.includes(m);
      return {
        month: m,
        budget: bTotal,
        actual: aTotal,
        isClosed
      };
    });
  }, [monthlyMatrixRows, latestClosedMonth]);

  // Top 5 Accounts for single-file modes
  const topBudgetAllocations = useMemo(() => {
    return [...allAccountSummaries]
      .sort((a, b) => b.budgetYtd - a.budgetYtd)
      .slice(0, 5);
  }, [allAccountSummaries]);

  const topActualExpenses = useMemo(() => {
    return [...allAccountSummaries]
      .sort((a, b) => b.actualYtd - a.actualYtd)
      .slice(0, 5);
  }, [allAccountSummaries]);

  // Status badge styling helper
  const getStatusBadge = (status: BudgetStatus) => {
    switch (status) {
      case 'Over Budget':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
          dot: 'bg-rose-500',
          label: t.statusOverBudget
        };
      case 'On Budget':
      case 'On Track':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          dot: 'bg-emerald-500',
          label: t.statusOnBudget || t.statusOnTrack || 'On Budget'
        };
      case 'Under Budget':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: TrendingDown,
          dot: 'bg-amber-500',
          label: t.statusUnderBudget
        };
    }
  };

  const currentStatusBadge = getStatusBadge(kpiSummary.status);
  const StatusIcon = currentStatusBadge.icon;

  const isEmpty = dataMode === 'none' || allAccountSummaries.length === 0;

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-5 pb-12">
      {/* 1. Fiscal Year & Banner Overview */}
      <div 
        id="dashboard-banner"
        className="w-full min-w-0 overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1E5EFF] shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {t.bannerFiscalYear}
              </span>
              <span className="text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                {selectedFiscalYear}
              </span>
              {dataMode === 'both' && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Budget vs Actual Aktif</span>
                </span>
              )}
              {dataMode === 'budget_only' && (
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mode: Budget Only</span>
                </span>
              )}
              {dataMode === 'gl_only' && (
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-purple-600" />
                  <span>Mode: GL Actual Only</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Divisi MIS / IT • Periode Pelaporan: <strong>Apr s.d. {latestClosedMonth}</strong>
            </p>
          </div>
        </div>

        {/* Status Kesehatan Anggaran Banner */}
        <div id="banner-health-status" className="min-w-0 flex flex-col sm:items-end gap-1.5 self-start md:self-auto">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline">
              {t.kpiStatus}:
            </span>
            <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs sm:text-sm shadow-2xs ${
              dataMode === 'both' ? currentStatusBadge.bg : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${dataMode === 'both' ? 'animate-pulse ' + currentStatusBadge.dot : 'bg-slate-400'}`} />
              <StatusIcon className="w-4 h-4 shrink-0" />
              <span>{dataMode === 'both' ? currentStatusBadge.label : 'Menunggu Kelengkapan File'}</span>
            </div>
          </div>

          {dataMode === 'both' ? (
            <div className="flex min-w-0 items-center gap-1.5 flex-wrap text-[11px]">
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 font-semibold" 
                title={`${t.statusOverBudget}: ${t.healthOverBudgetRule}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>{t.overLabel} <strong className="font-mono">{formatPercentage(kpiSummary.healthBreakdown?.overBudgetPct || 0)}</strong></span>
              </span>
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" 
                title={`${t.statusOnBudget}: ${t.healthOnBudgetRule}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>{t.onLabel} <strong className="font-mono">{formatPercentage(kpiSummary.healthBreakdown?.onBudgetPct || 0)}</strong></span>
              </span>
              <span 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold" 
                title={`${t.statusUnderBudget}: ${t.healthUnderBudgetRule}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>{t.underLabel} <strong className="font-mono">{formatPercentage(kpiSummary.healthBreakdown?.underBudgetPct || 0)}</strong></span>
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400 italic">
              Kalkulasi status kesehatan anggaran memerlukan file Budget + GL
            </span>
          )}
        </div>
      </div>

      {/* 2. DUAL INPUT PIPELINE MONITOR & MISSING FILE NOTIFICATION */}
      <div 
        id="input-pipeline-monitor"
        className={`w-full min-w-0 rounded-2xl p-4 sm:p-5 border transition-all ${
          dataMode === 'both'
            ? 'bg-emerald-50/40 border-emerald-200'
            : dataMode === 'budget_only' || dataMode === 'gl_only'
            ? 'bg-amber-50/40 border-amber-200'
            : 'bg-blue-50/40 border-blue-200'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#1E5EFF]" />
                {t.dualInputStatusTitle}
              </span>
              {dataMode === 'both' ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {t.statusBothUploaded}
                </span>
              ) : dataMode === 'budget_only' ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {t.statusGlMissing}
                </span>
              ) : dataMode === 'gl_only' ? (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {t.statusBudgetMissing}
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-200 text-slate-700">
                  {t.statusNoFiles}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {dataMode === 'both' && (
                <span className="text-emerald-900 font-medium">
                  {t.descBothUploaded}
                </span>
              )}
              {dataMode === 'budget_only' && (
                <span className="text-amber-900 font-medium">
                  {t.descGlMissing}
                </span>
              )}
              {dataMode === 'gl_only' && (
                <span className="text-amber-900 font-medium">
                  {t.descBudgetMissing}
                </span>
              )}
              {dataMode === 'none' && (
                <span className="text-blue-900">
                  {t.descNoFiles}
                </span>
              )}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="px-3.5 py-1.5 bg-[#1E5EFF] hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>
                  {dataMode === 'none' 
                    ? (language === 'ID' ? 'Unggah File Excel' : 'Upload Excel Files') 
                    : dataMode === 'budget_only' 
                    ? (language === 'ID' ? 'Unggah GL Excel' : 'Upload GL Excel') 
                    : dataMode === 'gl_only' 
                    ? (language === 'ID' ? 'Unggah Budget Excel' : 'Upload Budget Excel') 
                    : (language === 'ID' ? 'Kelola File Upload' : 'Manage Uploaded Files')}
                </span>
              </button>
            )}

            {/* Demo & Test Controls */}
            <div className="flex items-center gap-1.5 bg-white/80 p-1 rounded-xl border border-slate-200 text-xs">
              <button
                onClick={loadSampleBudgetOnly}
                title={language === 'ID' ? 'Muat contoh Budget Excel saja untuk menguji tampilan Budget Only' : 'Load sample Budget Excel only to test Budget Only mode'}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  dataMode === 'budget_only' ? 'bg-blue-100 text-blue-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.testBudgetOnly}
              </button>
              <button
                onClick={loadSampleGlOnly}
                title={language === 'ID' ? 'Muat contoh GL Excel saja untuk menguji tampilan GL Only' : 'Load sample GL Excel only to test GL Only mode'}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  dataMode === 'gl_only' ? 'bg-purple-100 text-purple-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.testGlOnly}
              </button>
              <button
                onClick={loadBothSamples}
                title={language === 'ID' ? 'Muat kedua file contoh untuk menguji Budget vs Actual penuh' : 'Load both sample files to test full Budget vs Actual'}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  dataMode === 'both' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {t.testBothFiles}
              </button>
              {dataMode !== 'none' && (
                <button
                  onClick={clearAllUploadedData}
                  title={language === 'ID' ? 'Bersihkan semua data yang terunggah dan kembali ke state kosong' : 'Clear all uploaded data and return to empty state'}
                  className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Input Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-200/60 text-xs">
          {/* Input 1: Budget Excel */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            dataUploadStatus.hasBudget 
              ? 'bg-white border-emerald-200 text-slate-800' 
              : 'bg-white/60 border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                dataUploadStatus.hasBudget ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {dataUploadStatus.hasBudget ? <CheckCircle2 className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate">
                  Input 1: Budget Excel ({language === 'ID' ? 'Rencana Anggaran' : 'Planned Budget'})
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {dataUploadStatus.hasBudget ? (dataUploadStatus.budgetFileName || (language === 'ID' ? 'Budget Excel Aktif' : 'Active Budget Excel')) : (language === 'ID' ? 'Belum diunggah' : 'Not uploaded')}
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
              dataUploadStatus.hasBudget ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              {dataUploadStatus.hasBudget ? (language === 'ID' ? 'Tersedia' : 'Available') : (language === 'ID' ? 'Kosong' : 'Empty')}
            </span>
          </div>

          {/* Input 2: GL Excel */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            dataUploadStatus.hasGl 
              ? 'bg-white border-emerald-200 text-slate-800' 
              : 'bg-white/60 border-slate-200 text-slate-400'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0 ${
                dataUploadStatus.hasGl ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
              }`}>
                {dataUploadStatus.hasGl ? <CheckCircle2 className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block truncate">
                  Input 2: GL Excel ({language === 'ID' ? 'Transaksi Aktual: Debit − Credit' : 'Actual Transactions: Debit − Credit'})
                </span>
                <span className="text-[11px] text-slate-500 block truncate">
                  {dataUploadStatus.hasGl ? (dataUploadStatus.glFileName || (language === 'ID' ? 'GL Excel Aktif' : 'Active GL Excel')) : (language === 'ID' ? 'Belum diunggah' : 'Not uploaded')}
                </span>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
              dataUploadStatus.hasGl ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
            }`}>
              {dataUploadStatus.hasGl ? (language === 'ID' ? 'Tersedia' : 'Available') : (language === 'ID' ? 'Kosong' : 'Empty')}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Analytical Filters */}
      <div 
        id="dashboard-filters-card"
        className="w-full min-w-0 overflow-hidden bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-[#1E5EFF]" />
            <span>{t.filtersTitle}</span>
            {hasActiveFilters && (
              <span className="bg-blue-100 text-[#1E5EFF] px-2 py-0.5 rounded-full text-[10px] font-bold lowercase">
                {t.activeFilters}
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              id="reset-filters-btn"
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#1E5EFF] transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{t.resetFilters}</span>
            </button>
          )}
        </div>

        <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Fiscal Year Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterFiscalYear}
            </label>
            <select
              id="filter-fiscal-year"
              value={selectedFiscalYear}
              onChange={(e) => setSelectedFiscalYear(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] cursor-pointer"
            >
              {availableFiscalYears.map((fy) => (
                <option key={fy} value={fy}>
                  {fy} {fy === 'FY2026/2027' ? `(${t.filterFiscalYearCurrent})` : fy === 'FY2025/2026' ? `(${t.filterFiscalYearAudited})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Quarter Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterQuarter}
            </label>
            <select
              id="filter-quarter"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] cursor-pointer"
            >
              <option value="All">{t.filterAllQuarters}</option>
              <option value="Q1">Q1 (Apr - Jun 2026)</option>
              <option value="Q2">Q2 (Jul - Sep 2026)</option>
              <option value="Q3">Q3 (Oct - Dec 2026)</option>
              <option value="Q4">Q4 (Jan - Mar 2027)</option>
            </select>
          </div>

          {/* COA Category Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterCategory}
            </label>
            <select
              id="filter-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full text-xs font-semibold py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF] cursor-pointer"
            >
              <option value="All">{t.filterAll}</option>
              {(['Hardware', 'Software', 'Network', 'Consulting', 'Maintenance', 'Training'] as CoaCategory[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Department (MIS Department) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">
              {t.filterDepartment}
            </label>
            <div 
              id="active-department-indicator"
              className="w-full flex items-center justify-between py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
            >
              <span className="truncate">{selectedDepartment}</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-blue-50 text-[#1E5EFF] border border-blue-200 rounded uppercase shrink-0">
                {language === 'ID' ? 'Divisi MIS' : 'MIS Division'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Empty State if no files uploaded */}
      {isEmpty ? (
        <div className="w-full min-w-0 bg-white rounded-3xl p-10 sm:p-14 text-center border border-slate-200 shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center mx-auto shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-xl font-extrabold text-slate-900">
              {t.emptyDashboardTitle}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {t.emptyDashboardDesc}
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 flex-wrap pt-2">
            {onNavigateToUpload && (
              <button
                onClick={onNavigateToUpload}
                className="px-5 py-2.5 bg-[#1E5EFF] hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{t.openUploadMenuBtn}</span>
              </button>
            )}
            <button
              onClick={loadBothSamples}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t.loadFullDemoBtn}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 5. Status Kesehatan Anggaran Section */}
          <div 
            id="status-kesehatan-anggaran-card"
            className="w-full min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#1E5EFF]"></div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                    {t.healthStatusTitle}
                  </h3>
                </div>
              </div>

              {/* Status Badge & Overall Rate */}
              <div className="flex items-center gap-2.5 self-start md:self-auto">
                {dataMode === 'both' ? (
                  <>
                    <div className="text-right text-xs">
                      <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider">{t.kpiAbsorptionRate}</span>
                      <span className="font-mono font-bold text-slate-700">{formatPercentage(kpiSummary.absorptionRate)}</span>
                    </div>
                    <div className={`px-3.5 py-1.5 rounded-xl border flex items-center gap-2 font-bold text-xs shadow-2xs ${currentStatusBadge.bg}`}>
                      <span className={`w-2 h-2 rounded-full animate-pulse ${currentStatusBadge.dot}`} />
                      <StatusIcon className="w-4 h-4 shrink-0" />
                      <span>{currentStatusBadge.label}</span>
                    </div>
                  </>
                ) : (
                  <div className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-xs font-semibold">
                    {language === 'ID' ? 'Kalkulasi memerlukan kedua file (Budget + GL)' : 'Calculation requires both files (Budget + GL)'}
                  </div>
                )}
              </div>
            </div>

            {/* 3 Status Cards: Over Budget, On Budget, Under Budget */}
            {dataMode === 'both' ? (
              <>
                <div className="grid min-w-0 grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Over Budget */}
                  <div 
                    id="health-card-over-budget"
                    className="bg-rose-50/50 border border-rose-200/80 rounded-xl p-4 flex flex-col justify-between hover:bg-rose-50/80 transition"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-rose-900">{t.statusOverBudget}</span>
                          <div className="text-[10px] text-rose-600 font-semibold">
                            {kpiSummary.healthBreakdown?.overBudgetCount || 0} {t.accountsUnit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-rose-700">
                          {formatPercentage(kpiSummary.healthBreakdown?.overBudgetPct || 0)}
                        </span>
                        <div className="text-[10px] text-rose-600/80 font-medium">
                          {t.healthAccountShare}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-rose-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-rose-700 font-medium">{t.healthTotalActualOver}</span>
                      <span 
                        className="font-mono font-bold text-rose-900 cursor-help"
                        title={formatCurrencyUSD(kpiSummary.healthBreakdown?.overBudgetActualAmount || 0, false)}
                      >
                        {formatCurrencyUSD(kpiSummary.healthBreakdown?.overBudgetActualAmount || 0, true)}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-rose-700/90 bg-rose-100/70 px-2 py-1 rounded-md border border-rose-200/60 font-medium flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 shrink-0 text-rose-600" />
                      <span>{t.healthOverBudgetRule}</span>
                    </div>
                  </div>

                  {/* Card 2: On Budget */}
                  <div 
                    id="health-card-on-budget"
                    className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4 flex flex-col justify-between hover:bg-emerald-50/80 transition"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-emerald-900">{t.statusOnBudget}</span>
                          <div className="text-[10px] text-emerald-600 font-semibold">
                            {kpiSummary.healthBreakdown?.onBudgetCount || 0} {t.accountsUnit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-emerald-700">
                          {formatPercentage(kpiSummary.healthBreakdown?.onBudgetPct || 0)}
                        </span>
                        <div className="text-[10px] text-emerald-600/80 font-medium">
                          {t.healthAccountShare}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-medium">{t.healthTotalActualOn}</span>
                      <span 
                        className="font-mono font-bold text-emerald-900 cursor-help"
                        title={formatCurrencyUSD(kpiSummary.healthBreakdown?.onBudgetActualAmount || 0, false)}
                      >
                        {formatCurrencyUSD(kpiSummary.healthBreakdown?.onBudgetActualAmount || 0, true)}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-emerald-700/90 bg-emerald-100/70 px-2 py-1 rounded-md border border-emerald-200/60 font-medium flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
                      <span>{t.healthOnBudgetRule}</span>
                    </div>
                  </div>

                  {/* Card 3: Under Budget */}
                  <div 
                    id="health-card-under-budget"
                    className="bg-amber-50/50 border border-amber-200/80 rounded-xl p-4 flex flex-col justify-between hover:bg-amber-50/80 transition"
                  >
                    <div className="flex min-w-0 items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                          <TrendingDown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-amber-900">{t.statusUnderBudget}</span>
                          <div className="text-[10px] text-amber-600 font-semibold">
                            {kpiSummary.healthBreakdown?.underBudgetCount || 0} {t.accountsUnit}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black font-mono text-amber-700">
                          {formatPercentage(kpiSummary.healthBreakdown?.underBudgetPct || 0)}
                        </span>
                        <div className="text-[10px] text-amber-600/80 font-medium">
                          {t.healthAccountShare}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-amber-200/60 flex items-center justify-between text-[11px]">
                      <span className="text-amber-700 font-medium">{t.healthTotalActualUnder}</span>
                      <span 
                        className="font-mono font-bold text-amber-900 cursor-help"
                        title={formatCurrencyUSD(kpiSummary.healthBreakdown?.underBudgetActualAmount || 0, false)}
                      >
                        {formatCurrencyUSD(kpiSummary.healthBreakdown?.underBudgetActualAmount || 0, true)}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-amber-700/90 bg-amber-100/70 px-2 py-1 rounded-md border border-amber-200/60 font-medium flex items-center gap-1.5">
                      <TrendingDown className="w-3 h-3 shrink-0 text-amber-600" />
                      <span>{t.healthUnderBudgetRule}</span>
                    </div>
                  </div>
                </div>

                {/* Segmented Distribution Bar */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold mb-1.5">
                    <span>{t.healthDistribution}</span>
                    <span className="font-mono text-slate-400">
                      Total: {kpiSummary.healthBreakdown?.totalAccounts || 0} {t.accountsUnit}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                    {(kpiSummary.healthBreakdown?.overBudgetPct || 0) > 0 && (
                      <div 
                        className="bg-rose-500 h-full transition-all duration-500 hover:opacity-90"
                        style={{ width: `${kpiSummary.healthBreakdown.overBudgetPct}%` }}
                      />
                    )}
                    {(kpiSummary.healthBreakdown?.onBudgetPct || 0) > 0 && (
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-500 hover:opacity-90"
                        style={{ width: `${kpiSummary.healthBreakdown.onBudgetPct}%` }}
                      />
                    )}
                    {(kpiSummary.healthBreakdown?.underBudgetPct || 0) > 0 && (
                      <div 
                        className="bg-amber-400 h-full transition-all duration-500 hover:opacity-90"
                        style={{ width: `${kpiSummary.healthBreakdown.underBudgetPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold block mb-0.5">
                    {dataMode === 'budget_only' 
                      ? (language === 'ID' ? 'Status Kesehatan Anggaran memerlukan file GL Excel (transaksi aktual).' : 'Budget Health Status requires GL Excel file (actual transactions).')
                      : (language === 'ID' ? 'Status Kesehatan Anggaran memerlukan file Budget Excel (rencana anggaran).' : 'Budget Health Status requires Budget Excel file (planned budget).')}
                  </span>
                  <span className="text-amber-800">
                    {language === 'ID' 
                      ? 'Sistem tidak melakukan kalkulasi rasio penyerapan akun (Over, On, Under Budget) sampai kedua file tersedia.'
                      : 'System does not calculate account absorption ratios (Over, On, Under Budget) until both files are uploaded.'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 6. KPI Cards Grid */}
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Budget */}
            <div 
              id="kpi-budget-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiTotalBudget} (YTD)
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E5EFF] flex items-center justify-center font-bold">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {dataMode === 'gl_only' ? (
                  <div>
                    <div className="text-lg font-bold text-slate-400 font-mono">
                      {language === 'ID' ? 'Menunggu File Budget' : 'Awaiting Budget File'}
                    </div>
                    <div className="text-[11px] text-amber-600 mt-1 font-medium">
                      {language === 'ID' ? 'Unggah file Budget Excel' : 'Upload Budget Excel file'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {formatCurrencyUSD(kpiSummary.totalBudget, true)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      {formatCurrencyUSD(kpiSummary.totalBudget)}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{t.kpiAnnualBudget} ({language === 'ID' ? '12 Bulan' : '12 Months'})</span>
                <span className="font-mono font-bold text-slate-700">
                  {dataMode === 'gl_only' ? '–' : formatCurrencyUSD(kpiSummary.annualBudget, true)}
                </span>
              </div>
            </div>

            {/* Card 2: Total Actual */}
            <div 
              id="kpi-actual-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiTotalActual} (YTD)
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                {dataMode === 'budget_only' ? (
                  <div>
                    <div className="text-lg font-bold text-slate-400 font-mono">
                      {language === 'ID' ? 'Menunggu File GL' : 'Awaiting GL File'}
                    </div>
                    <div className="text-[11px] text-amber-600 mt-1 font-medium">
                      {language === 'ID' ? 'Unggah file GL Excel' : 'Upload GL Excel file'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                      {formatCurrencyUSD(kpiSummary.totalActual, true)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      {formatCurrencyUSD(kpiSummary.totalActual)}
                    </div>
                  </>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.kpiStatus}</span>
                <span className="font-mono font-bold text-slate-700">
                  {dataMode === 'both' ? `${currentStatusBadge.label} (${formatPercentage(kpiSummary.absorptionRate)})` : dataMode === 'gl_only' ? (language === 'ID' ? 'Realisasi GL Terbaca' : 'GL Actuals Ingested') : (language === 'ID' ? 'Menunggu File GL' : 'Awaiting GL File')}
                </span>
              </div>
            </div>

            {/* Card 3: Variance + Utilization % */}
            <div 
              id="kpi-variance-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiVariance} (Actual − Budget)
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                  dataMode === 'both' && kpiSummary.variance !== null && kpiSummary.variance > 0
                    ? 'bg-rose-50 text-rose-600'
                    : 'bg-emerald-50 text-emerald-600'
                }`}>
                  {dataMode === 'both' && kpiSummary.variance !== null && kpiSummary.variance > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="mt-3">
                {dataMode === 'both' && kpiSummary.variance !== null ? (
                  <>
                    <div className={`text-2xl font-black font-mono tracking-tight flex items-baseline gap-2 ${
                      kpiSummary.variance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      <span>{kpiSummary.variance > 0 ? '+' : ''}{formatCurrencyUSD(kpiSummary.variance, true)}</span>
                      <span className="text-sm font-bold">
                        ({formatPercentage(kpiSummary.variancePct, true)})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 font-mono">
                      {formatCurrencyUSD(kpiSummary.variance)}
                    </div>
                    {/* Math Detail */}
                    <div className="mt-2 text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-200/70 font-mono leading-tight">
                      <span>{formatCurrencyUSD(kpiSummary.totalActual, true)}</span>
                      <span className="mx-1 font-bold">-</span>
                      <span>{formatCurrencyUSD(kpiSummary.totalBudget, true)}</span>
                      <span className="mx-1 font-bold">=</span>
                      <span className="font-bold text-slate-900">{formatCurrencyUSD(kpiSummary.variance, true)}</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="text-lg font-bold text-amber-600 font-mono">
                      {t.requiresTwoFiles}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      {dataMode === 'budget_only' 
                        ? t.varianceGlMissingDesc
                        : t.varianceBudgetMissingDesc}
                    </div>
                  </div>
                )}
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.varianceType}</span>
                <span className={`font-bold ${
                  dataMode === 'both' && kpiSummary.variance !== null
                    ? kpiSummary.variance > 0 ? 'text-rose-600' : 'text-emerald-600'
                    : 'text-slate-400'
                }`}>
                  {dataMode === 'both' && kpiSummary.variance !== null
                    ? kpiSummary.variance > 0 ? t.overExpenditure : t.favorableSavings
                    : '–'}
                </span>
              </div>
            </div>

            {/* Card 4: Year-End Projection */}
            <div 
              id="kpi-projection-card"
              className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.kpiYearEndProjection}
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  {formatCurrencyUSD(kpiSummary.projectedYearEnd, true)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                  {dataMode === 'both' 
                    ? `Gap: ${formatCurrencyUSD(kpiSummary.projectedGap, true)}`
                    : dataMode === 'budget_only'
                    ? 'Target Anggaran Tahunan Penuh'
                    : 'Ekstrapolasi Run-Rate Realisasi GL'}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{t.kpiProjectedGap}</span>
                <span className={`font-mono font-bold ${
                  dataMode === 'both'
                    ? kpiSummary.projectedGap > 0 ? 'text-rose-600' : 'text-emerald-600'
                    : 'text-slate-400'
                }`}>
                  {dataMode === 'both' ? `${kpiSummary.projectedGap > 0 ? '+' : ''}${formatCurrencyUSD(kpiSummary.projectedGap, true)}` : '–'}
                </span>
              </div>
            </div>
          </div>

          {/* 7. Grouped Budget vs Actual Diagram Batang Chart */}
          <div className="w-full min-w-0 overflow-hidden">
            <GroupedBarChart 
              categorySummaries={categorySummaries} 
              monthlyData={monthlyBarData}
              dataMode={dataMode}
            />
          </div>

          {/* 8. Split Section: Worst COA & Budget Absorption */}
          <div className="space-y-4">
            {/* Executive Significance Callout */}
            <div className="w-full min-w-0 overflow-hidden bg-slate-50 border border-slate-200/90 rounded-2xl p-4 text-xs text-slate-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0 mt-0.5">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 text-sm">
                        {t.yoyComparisonTitle}
                      </h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                        {selectedFiscalYear} vs {priorFiscalYear || 'FY2025/2026'}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">
                      {t.analysisSignificanceDesc}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSignificance(!showSignificance)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 hover:shadow-xs transition cursor-pointer"
                >
                  {showSignificance ? t.hideContextBtn : t.strategicValueBtn}
                </button>
              </div>

              {showSignificance && (
                <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                  <div className="bg-white p-3 rounded-xl border border-rose-100">
                    <span className="font-bold text-rose-700 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {t.strategicWorstTitle}
                    </span>
                    <p className="text-slate-600 leading-normal">
                      {t.strategicWorstDesc}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-amber-100">
                    <span className="font-bold text-amber-700 flex items-center gap-1 mb-1">
                      <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
                      {t.strategicUnderTitle}
                    </span>
                    <p className="text-slate-600 leading-normal">
                      {t.strategicUnderDesc}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-emerald-100">
                    <span className="font-bold text-emerald-700 flex items-center gap-1 mb-1">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      {t.strategicVelocityTitle}
                    </span>
                    <p className="text-slate-600 leading-normal">
                      {t.strategicVelocityDesc}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Split Tables */}
            <div className="grid min-w-0 grid-cols-1 lg:grid-cols-2 gap-5 xl:gap-6 items-stretch">
              {/* Worst COA Card */}
              <div 
                id="worst-coa-card"
                className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>{t.worstCoaTitle} (Actual &gt; Budget)</span>
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                      {dataMode === 'both' ? `${worstCoaList.length} ${language === 'ID' ? 'Akun Defisit' : 'Deficit Accounts'}` : t.requiresTwoFiles}
                    </span>
                  </div>
                </div>

                {dataMode !== 'both' ? (
                  <div className="py-10 px-4 text-center space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="max-w-sm mx-auto">
                      <h4 className="text-xs font-bold text-slate-800">
                        {dataMode === 'budget_only' 
                          ? (language === 'ID' ? 'Perhitungan Worst COA Dinonaktifkan (Perlu File GL)' : 'Worst COA Calculation Disabled (Needs GL File)') 
                          : (language === 'ID' ? 'Perhitungan Worst COA Dinonaktifkan (Perlu File Budget)' : 'Worst COA Calculation Disabled (Needs Budget File)')}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {language === 'ID' 
                          ? 'Sesuai pedoman akuntansi, perbandingan varians akun (Actual > Budget) hanya dihitung bila kedua file tersedia.'
                          : 'In accordance with accounting rules, account variance comparison (Actual > Budget) is only calculated when both files are available.'}
                      </p>
                    </div>

                    {/* Single mode preview: Top 5 accounts */}
                    <div className="mt-4 pt-3 border-t border-slate-100 text-left">
                      <div className="text-[11px] font-bold text-slate-600 mb-2">
                        {dataMode === 'budget_only' 
                          ? (language === 'ID' ? '5 Akun Alokasi Anggaran Terbesar:' : 'Top 5 Budget Allocation Accounts:') 
                          : (language === 'ID' ? '5 Akun Realisasi Beban Terbesar:' : 'Top 5 Actual Expense Accounts:')}
                      </div>
                      <div className="space-y-1.5">
                        {(dataMode === 'budget_only' ? topBudgetAllocations : topActualExpenses).map((item) => (
                          <div key={item.coaCode} className="p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-slate-800 mr-2">{item.coaCode}</span>
                              <span className="text-slate-600 truncate">{item.accountName}</span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 shrink-0 ml-2">
                              {dataMode === 'budget_only' ? formatCurrencyUSD(item.budgetYtd) : formatCurrencyUSD(item.actualYtd)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : worstCoaList.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {t.worstCoaEmpty} {language === 'ID' ? '(Tidak ada akun dengan realisasi melebihi anggaran)' : '(No accounts with actuals exceeding budget)'}
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                    {worstCoaList.map((item) => (
                      <div 
                        key={item.coaCode} 
                        className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-slate-50 transition space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs shrink-0">
                              {item.coaCode}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate" title={item.accountName}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className="text-xs font-black font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                            +{formatCurrencyUSD(item.variance || 0, true)} ({formatPercentage(item.variancePct || 0, true)})
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">Budget YTD</span>
                            <span className="text-slate-700 font-bold">{formatCurrencyUSD(item.budgetYtd, true)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">Actual YTD</span>
                            <span className="text-slate-900 font-bold">{formatCurrencyUSD(item.actualYtd, true)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">Utilisasi %</span>
                            <span className="text-rose-600 font-bold">{formatPercentage(item.absorptionRate || 0)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Absorption Ranking Card */}
              <div 
                id="absorption-ranking-card"
                className="min-w-0 overflow-hidden bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col"
              >
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#1E5EFF]"></div>
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#1E5EFF] shrink-0" />
                      <span>{t.absorptionRankingTitle}</span>
                    </h3>
                  </div>

                  {dataMode === 'both' && (
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                      <button
                        onClick={() => setAbsorptionTab('lowest')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          absorptionTab === 'lowest' ? 'bg-[#1E5EFF] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.absorptionLowestBtn}
                      </button>
                      <button
                        onClick={() => setAbsorptionTab('highest')}
                        className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                          absorptionTab === 'highest' ? 'bg-[#1E5EFF] text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {t.absorptionHighestBtn}
                      </button>
                    </div>
                  )}
                </div>

                {dataMode !== 'both' ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    {t.absorptionNeedsBothDesc}
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
                    {(absorptionTab === 'lowest' ? lowestAbsorptionList : highestAbsorptionList).map((item) => (
                      <div 
                        key={item.coaCode} 
                        className="p-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 hover:bg-slate-50 transition space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs shrink-0">
                              {item.coaCode}
                            </span>
                            <span className="font-bold text-xs text-slate-800 truncate" title={item.accountName}>
                              {item.accountName}
                            </span>
                          </div>
                          <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border shrink-0 ${
                            (item.absorptionRate || 0) > 105 
                              ? 'text-rose-600 bg-rose-50 border-rose-200' 
                              : (item.absorptionRate || 0) < 95
                              ? 'text-amber-600 bg-amber-50 border-amber-200'
                              : 'text-emerald-600 bg-emerald-50 border-emerald-200'
                          }`}>
                            {formatPercentage(item.absorptionRate || 0)}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">Budget YTD</span>
                            <span className="text-slate-700 font-bold">{formatCurrencyUSD(item.budgetYtd, true)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">Actual YTD</span>
                            <span className="text-slate-900 font-bold">{formatCurrencyUSD(item.actualYtd, true)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase font-sans">{language === 'ID' ? 'Varians' : 'Variance'}</span>
                            <span className={`font-bold ${(item.variance || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {(item.variance || 0) > 0 ? '+' : ''}{formatCurrencyUSD(item.variance || 0, true)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
