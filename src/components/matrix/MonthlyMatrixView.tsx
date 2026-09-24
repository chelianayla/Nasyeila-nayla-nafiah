import React, { useState, useMemo, useEffect } from 'react';
import { 
  TableProperties, 
  Search, 
  Download, 
  FileSpreadsheet, 
  Filter, 
  ArrowUpDown, 
  Check,
  AlertTriangle,
  Info,
  RotateCcw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { FISCAL_MONTHS, FiscalMonth, CoaCategory } from '../../types';
import { formatCurrencyUSD } from '../../lib/calculations';

type MetricMode = 'actuals' | 'budget' | 'variance';

export const MonthlyMatrixView: React.FC = () => {
  const { 
    monthlyMatrixRows, 
    selectedFiscalYear, 
    selectedCategory, 
    setSelectedCategory,
    latestClosedMonth,
    dataMode,
    dataUploadStatus
  } = useData();

  const { t, language } = useAuth();
  
  // Set default metricMode according to available data
  const [metricMode, setMetricMode] = useState<MetricMode>(() => {
    if (dataMode === 'budget_only') return 'budget';
    return 'actuals';
  });

  useEffect(() => {
    if (dataMode === 'budget_only' && metricMode === 'actuals') {
      setMetricMode('budget');
    } else if (dataMode === 'gl_only' && metricMode === 'budget') {
      setMetricMode('actuals');
    }
  }, [dataMode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [displayCompact, setDisplayCompact] = useState(true);

  // Filter rows by search and category
  const filteredRows = useMemo(() => {
    return monthlyMatrixRows.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchCode = r.coa.code.toLowerCase().includes(q);
        const matchName = r.coa.accountName.toLowerCase().includes(q);
        const matchDept = r.coa.department.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchDept) return false;
      }
      if (selectedCategory !== 'All' && r.coa.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [monthlyMatrixRows, searchQuery, selectedCategory]);

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    const dataForSheet = filteredRows.map((row) => {
      const entry: Record<string, any> = {
        'COA Code': row.coa.code,
        'Account Name': row.coa.accountName,
        'Category': row.coa.category,
        'Department': row.coa.department,
      };

      FISCAL_MONTHS.forEach((m) => {
        let val: number | null = null;
        if (metricMode === 'actuals') {
          val = row.monthlyActuals[m];
        } else if (metricMode === 'budget') {
          val = row.monthlyBudgets[m];
        } else {
          // variance
          const act = row.monthlyActuals[m];
          const bud = row.monthlyBudgets[m] || 0;
          val = act !== null ? act - bud : null;
        }
        entry[m] = val !== null ? val : '–';
      });

      if (metricMode === 'actuals') {
        entry['Total YTD'] = row.ytdActual;
      } else if (metricMode === 'budget') {
        entry['Total YTD'] = row.ytdBudget;
      } else {
        entry['Total YTD'] = row.ytdVariance;
      }

      return entry;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Matrix_${selectedFiscalYear.replace('/', '_')}`);
    
    // Auto column widths
    const cols = Object.keys(dataForSheet[0] || {}).map(() => ({ wch: 16 }));
    worksheet['!cols'] = cols;

    XLSX.writeFile(workbook, `VEGA_${selectedFiscalYear}_Matrix_${metricMode}.xlsx`);
  };

  // Helper to format values in matrix cell
  const renderCellValue = (val: number | null, isVariance: boolean = false) => {
    if (val === null || val === undefined) {
      return <span className="text-slate-300 font-normal select-none">–</span>;
    }
    if (val === 0) {
      return <span className="text-slate-400 font-mono">0</span>;
    }

    if (isVariance) {
      const isOver = val > 0;
      return (
        <span className={`font-mono font-semibold ${isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
          {isOver ? '+' : ''}{formatCurrencyUSD(val, displayCompact)}
        </span>
      );
    }

    return (
      <span className="font-mono text-slate-800">
        {formatCurrencyUSD(val, displayCompact)}
      </span>
    );
  };

  // Warning when selected mode is unavailable due to missing file
  const isModeUnavailable = 
    (dataMode === 'budget_only' && (metricMode === 'actuals' || metricMode === 'variance')) ||
    (dataMode === 'gl_only' && (metricMode === 'budget' || metricMode === 'variance')) ||
    dataMode === 'none';

  return (
    <div className="space-y-5 pb-12">
      {/* Controls and Header Card */}
      <div 
        id="matrix-controls-card"
        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Metric mode toggle: Actuals / Budget / Variance */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              id="matrix-mode-actuals"
              onClick={() => setMetricMode('actuals')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'actuals'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixActuals} {dataMode === 'budget_only' ? (language === 'ID' ? '(Perlu GL)' : '(Needs GL)') : ''}
            </button>
            <button
              id="matrix-mode-budget"
              onClick={() => setMetricMode('budget')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'budget'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixBudget} {dataMode === 'gl_only' ? (language === 'ID' ? '(Perlu Budget)' : '(Needs Budget)') : ''}
            </button>
            <button
              id="matrix-mode-variance"
              onClick={() => setMetricMode('variance')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                metricMode === 'variance'
                  ? 'bg-[#1E5EFF] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t.matrixVarianceVal} {dataMode !== 'both' ? (language === 'ID' ? '(Perlu 2 File)' : '(Needs 2 Files)') : ''}
            </button>
          </div>

          {/* Compact number toggle */}
          <button
            onClick={() => setDisplayCompact(!displayCompact)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 transition cursor-pointer"
          >
            {language === 'ID'
              ? (displayCompact ? 'Satuan Ringkas ($Jt / $Rb)' : 'Angka Penuh USD ($)')
              : (displayCompact ? 'Compact Units ($M / $K)' : 'Full USD ($)')}
          </button>
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="matrix-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.matrixSearchPlaceholder}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E5EFF]"
            />
          </div>

          {/* Export Excel Button */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            disabled={filteredRows.length === 0}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition ${
              filteredRows.length === 0 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>
        </div>
      </div>

      {/* Missing File Notice Banner if current metric mode requires missing file */}
      {isModeUnavailable && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold block">
                {dataMode === 'budget_only'
                  ? (language === 'ID' ? 'File GL Excel belum diunggah.' : 'GL Excel file not uploaded.')
                  : dataMode === 'gl_only'
                  ? (language === 'ID' ? 'File Budget Excel belum diunggah.' : 'Budget Excel file not uploaded.')
                  : (language === 'ID' ? 'Belum ada data Excel yang diunggah.' : 'No Excel data uploaded yet.')}
              </span>
              <span>
                {dataMode === 'budget_only'
                  ? (language === 'ID' 
                    ? 'Tampilan Realisasi Aktual (Actuals) dan Varians memerlukan data GL. Klik tab "Budget" untuk melihat matriks rencana anggaran.' 
                    : 'Actuals and Variance views require GL data. Click the "Budget" tab to view planned budget matrix.')
                  : dataMode === 'gl_only'
                  ? (language === 'ID' 
                    ? 'Tampilan Alokasi Anggaran (Budget) dan Varians memerlukan file Budget. Klik tab "Actuals" untuk melihat matriks realisasi transaksi GL.' 
                    : 'Budget and Variance views require Budget file. Click the "Actuals" tab to view actual transactions matrix.')
                  : (language === 'ID' 
                    ? 'Silakan unggah file Budget atau GL untuk melihat matriks 12 bulan.' 
                    : 'Please upload Budget or GL file to view 12-month matrix.')}
              </span>
            </div>
          </div>
          {dataMode === 'budget_only' && (
            <button
              onClick={() => setMetricMode('budget')}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl shrink-0 cursor-pointer"
            >
              {language === 'ID' ? 'Lihat Matriks Budget' : 'View Budget Matrix'}
            </button>
          )}
          {dataMode === 'gl_only' && (
            <button
              onClick={() => setMetricMode('actuals')}
              className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-xl shrink-0 cursor-pointer"
            >
              {language === 'ID' ? 'Lihat Matriks Actuals' : 'View Actuals Matrix'}
            </button>
          )}
        </div>
      )}

      {/* Matrix Table Card */}
      <div 
        id="monthly-matrix-table-container"
        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      >
        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">
              {language === 'ID' 
                ? `Menampilkan ${filteredRows.length} Akun COA Terunggah` 
                : `Showing ${filteredRows.length} Uploaded Accounts`}
            </span>
            <span>•</span>
            <span>
              {language === 'ID' ? 'Periode Pelaporan:' : 'Reporting period:'}{' '}
              <strong className="text-slate-800">
                {language === 'ID' ? `Apr s.d. ${latestClosedMonth} ${selectedFiscalYear}` : `Apr through ${latestClosedMonth} ${selectedFiscalYear}`}
              </strong>
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400">
            {metricMode === 'actuals' 
              ? (language === 'ID' ? 'Metrik: Realisasi Aktual GL' : 'Metric: GL Actual Transactions') 
              : metricMode === 'budget' 
              ? (language === 'ID' ? 'Metrik: Rencana Alokasi Anggaran' : 'Metric: Planned Budget') 
              : (language === 'ID' ? 'Metrik: Varians (Actual − Budget)' : 'Metric: Variance (Actual − Budget)')}
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            {dataMode === 'none' 
              ? (language === 'ID' ? 'Belum ada data terunggah. Silakan unggah file Excel untuk melihat matriks bulanan.' : 'No data uploaded yet. Please upload Excel files to view monthly matrix.')
              : (language === 'ID' ? 'Tidak ada baris COA yang sesuai dengan kriteria pencarian.' : 'No COA rows match your search criteria.')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100/90 z-20 min-w-[200px]">
                    {t.coaCodeCol} &amp; {t.accountNameCol}
                  </th>
                  <th className="py-3 px-3 min-w-[90px]">{t.categoryCol}</th>
                  {FISCAL_MONTHS.map((m) => (
                    <th key={m} className="py-3 px-3 text-right min-w-[85px] font-mono">
                      {m}
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right min-w-[110px] font-mono sticky right-0 bg-slate-100/90 z-20">
                    Total YTD
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {filteredRows.map((row) => {
                  let totalYtd: number = 0;
                  if (metricMode === 'actuals') totalYtd = row.ytdActual;
                  else if (metricMode === 'budget') totalYtd = row.ytdBudget;
                  else totalYtd = row.ytdVariance;

                  return (
                    <tr 
                      key={row.coa.code} 
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Fixed Left Header (Code & Name) */}
                      <td className="py-2.5 px-4 sticky left-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-r border-slate-100">
                        <div className="font-bold text-slate-900">{row.coa.code}</div>
                        <div className="text-[11px] font-sans text-slate-500 truncate max-w-[200px]" title={row.coa.accountName}>
                          {row.coa.accountName}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-sans text-slate-600 text-[11px]">
                        {row.coa.category}
                      </td>

                      {/* 12 Months */}
                      {FISCAL_MONTHS.map((m) => {
                        let cellVal: number | null = null;
                        if (metricMode === 'actuals') {
                          cellVal = row.monthlyActuals[m];
                        } else if (metricMode === 'budget') {
                          cellVal = row.monthlyBudgets[m];
                        } else {
                          // variance: only if both actual and budget are valid
                          const act = row.monthlyActuals[m];
                          const bud = row.monthlyBudgets[m];
                          cellVal = (act !== null && bud !== null && dataMode === 'both') ? (act - bud) : null;
                        }

                        return (
                          <td key={m} className="py-2.5 px-3 text-right">
                            {renderCellValue(cellVal, metricMode === 'variance')}
                          </td>
                        );
                      })}

                      {/* Sticky Right Total YTD */}
                      <td className="py-2.5 px-4 text-right font-bold sticky right-0 bg-white group-hover:bg-slate-50 transition-colors z-10 border-l border-slate-100">
                        {renderCellValue(totalYtd, metricMode === 'variance')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
