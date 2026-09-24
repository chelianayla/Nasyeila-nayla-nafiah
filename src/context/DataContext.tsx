import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  CoaItem, 
  BudgetRecord, 
  GlTransaction, 
  UploadBatch, 
  AuditNote, 
  CoaCategory, 
  ITDepartment, 
  FiscalMonth, 
  FISCAL_MONTHS, 
  CategorySummary, 
  AccountVarianceSummary,
  UploadType,
  BudgetStatus,
  BudgetHealthBreakdown,
  MonthlyValues,
  DashboardDataMode,
  DataUploadStatus
} from '../types';
import { 
  INITIAL_COA, 
  INITIAL_BUDGETS, 
  INITIAL_GL_TRANSACTIONS, 
  INITIAL_UPLOADS, 
  INITIAL_AUDIT_NOTES 
} from '../lib/mockData';
import { 
  calculateVariance, 
  calculateVariancePercentage, 
  calculateAbsorptionRate,
  calculateUtilizationPercentage,
  determineBudgetStatus,
  calculateBudgetHealthBreakdown,
  calculateYearEndProjection,
  getElapsedMonths,
  normalizeFiscalYear,
  getPriorFiscalYear,
  parseGlAccountNumber
} from '../lib/calculations';
import { useAuth } from './AuthContext';

export const isCoaMatch = (recordCode: string, targetCoa: CoaItem): boolean => {
  if (!recordCode || !targetCoa) return false;
  const rc = recordCode.toUpperCase().trim();
  const tc = targetCoa.code.toUpperCase().trim();
  if (rc === tc) return true;
  if (targetCoa.accountPattern && rc === targetCoa.accountPattern.toUpperCase().trim()) return true;
  if (targetCoa.accountName && rc === targetCoa.accountName.toUpperCase().trim()) return true;

  const extractCode = (str: string) => {
    const itMatch = str.match(/IT-\d{5}/i);
    if (itMatch) return itMatch[0].toUpperCase();
    const digitMatch = str.match(/\b\d{9}\b/);
    if (digitMatch) return digitMatch[0];
    const fiveDigit = str.match(/\b\d{5}\b/);
    if (fiveDigit) return `IT-${fiveDigit[0]}`;
    return str.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  };

  const cleanRc = extractCode(rc);
  const cleanTc = extractCode(tc);
  if (cleanRc && cleanTc && cleanRc === cleanTc) return true;
  if (rc.startsWith(tc) || tc.startsWith(rc)) return true;
  return false;
};

export interface ParsedGlCommitRecord {
  coaCode: string;
  amount: number;
  description?: string;
  docNo?: string;
  vendor?: string;
  postingDate?: string;
  periodMonth?: FiscalMonth;
  category?: string;
  department?: string;
  sectionCode?: string;
  currency?: string;
  accountNumberPattern?: string;
}

interface DataContextType {
  coaList: CoaItem[];
  addCoas: (newCoas: CoaItem[]) => void;
  addNewCoa: (newCoa: CoaItem, initialBudgetAnnual?: number) => { success: boolean; message: string };
  budgets: BudgetRecord[];
  glTransactions: GlTransaction[];
  uploads: UploadBatch[];
  auditNotes: AuditNote[];
  
  // Filters
  selectedFiscalYear: string;
  setSelectedFiscalYear: (fy: string) => void;
  availableFiscalYears: string[];
  selectedQuarter: string;
  setSelectedQuarter: (q: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (dept: string) => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;

  // Analytical summaries
  latestClosedMonth: FiscalMonth;
  dataUploadStatus: DataUploadStatus;
  dataMode: DashboardDataMode;
  kpiSummary: {
    totalBudget: number;
    totalActual: number;
    variance: number | null;
    variancePct: number | null;
    status: BudgetStatus;
    annualBudget: number;
    projectedYearEnd: number;
    projectedGap: number;
    absorptionRate: number | null;
    healthBreakdown: BudgetHealthBreakdown;
    dataMode: DashboardDataMode;
    missingFileMessage?: string;
  };
  categorySummaries: CategorySummary[];
  worstCoaList: AccountVarianceSummary[];
  highestAbsorptionList: AccountVarianceSummary[];
  lowestAbsorptionList: AccountVarianceSummary[];
  allAccountSummaries: AccountVarianceSummary[];
  priorFiscalYear: string;
  
  // Matrix data
  monthlyMatrixRows: Array<{
    coa: CoaItem;
    monthlyActuals: Record<FiscalMonth, number | null>;
    monthlyBudgets: Record<FiscalMonth, number | null>;
    ytdActual: number;
    ytdBudget: number;
    ytdVariance: number;
  }>;

  // Upload Actions & Reset
  clearAllUploadedData: () => void;
  loadSampleBudgetOnly: () => void;
  loadSampleGlOnly: () => void;
  loadBothSamples: () => void;
  checkPeriodCollision: (type: UploadType, fiscalYear: string, month?: FiscalMonth) => UploadBatch | null;
  commitUpload: (params: {
    uploadType: UploadType;
    fiscalYear: string;
    targetMonth?: FiscalMonth;
    fileName: string;
    fileSize: string;
    rowCount: number;
    acceptedRows: number;
    rejectedRows: number;
    totalAmount: number;
    replaceReason?: string;
    parsedGlRecords?: ParsedGlCommitRecord[];
    parsedBudgetRecords?: Array<{ coaCode: string; monthly: Record<FiscalMonth, number>; annual: number }>;
    newCoas?: CoaItem[];
  }) => { 
    success: boolean; 
    batchId: string;
    isOverBudget?: boolean;
    budgetStatus?: BudgetStatus;
    overBudgetAmount?: number;
    overBudgetPercentage?: number;
    varianceAmount?: number;
    targetBudgetAmount?: number;
    overBudgetAccountsCount?: number;
    topOverBudgetCoa?: {
      code: string;
      accountName: string;
      overAmount: number;
      variancePct: number;
    };
    detailsSummary?: string;
  };

  // Audit Actions
  appendAuditNote: (content: string, category: 'Upload' | 'Replacement' | 'Budget Revision' | 'System' | 'Policy', relatedBatchId?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Storage keys for dynamic data
const LS_COA_KEY = 'vega_coa_v2';
const LS_BUDGETS_KEY = 'vega_budgets_dynamic_v2';
const LS_GL_KEY = 'vega_gl_dynamic_v2';
const LS_UPLOADS_KEY = 'vega_uploads_dynamic_v2';
const LS_AUDIT_NOTES_KEY = 'vega_audit_notes_dynamic_v2';

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();

  // Master COA list
  const [coaList, setCoaList] = useState<CoaItem[]>(() => {
    try {
      const saved = localStorage.getItem(LS_COA_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const map = new Map<string, CoaItem>();
        parsed.forEach((c: CoaItem) => map.set(c.code.toUpperCase(), c));
        INITIAL_COA.forEach((c) => {
          if (!map.has(c.code.toUpperCase())) {
            map.set(c.code.toUpperCase(), c);
          }
        });
        return Array.from(map.values());
      }
    } catch {}
    return INITIAL_COA;
  });

  const addCoas = (newCoas: CoaItem[]) => {
    if (!newCoas || newCoas.length === 0) return;
    setCoaList((prev) => {
      const existing = new Set(prev.map((c) => c.code.toUpperCase()));
      const toAdd = newCoas.filter((c) => !existing.has(c.code.toUpperCase()));
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
    });
  };

  useEffect(() => {
    try {
      localStorage.setItem(LS_COA_KEY, JSON.stringify(coaList));
    } catch {}
  }, [coaList]);

  // Dynamic uploads state: initialize empty by default to prevent hardcoded dummy numbers
  const [budgets, setBudgets] = useState<BudgetRecord[]>(() => {
    try {
      const saved = localStorage.getItem(LS_BUDGETS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [glTransactions, setGlTransactions] = useState<GlTransaction[]>(() => {
    try {
      const saved = localStorage.getItem(LS_GL_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [uploads, setUploads] = useState<UploadBatch[]>(() => {
    try {
      const saved = localStorage.getItem(LS_UPLOADS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [auditNotes, setAuditNotes] = useState<AuditNote[]>(() => {
    try {
      const saved = localStorage.getItem(LS_AUDIT_NOTES_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_BUDGETS_KEY, JSON.stringify(budgets));
    } catch {}
  }, [budgets]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_GL_KEY, JSON.stringify(glTransactions));
    } catch {}
  }, [glTransactions]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_UPLOADS_KEY, JSON.stringify(uploads));
    } catch {}
  }, [uploads]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_AUDIT_NOTES_KEY, JSON.stringify(auditNotes));
    } catch {}
  }, [auditNotes]);

  // Filters
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>('FY2026/2027');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('MIS Department');

  // Dynamic available fiscal years based on existing data and uploads
  const availableFiscalYears = useMemo(() => {
    const list = new Set<string>();
    list.add('FY2026/2027');
    list.add('FY2025/2026');
    budgets.forEach(b => {
      if (b.fiscalYear) list.add(normalizeFiscalYear(b.fiscalYear));
    });
    glTransactions.forEach(g => {
      if (g.fiscalYear) list.add(normalizeFiscalYear(g.fiscalYear));
    });
    uploads.forEach(u => {
      if (u.fiscalYear) list.add(normalizeFiscalYear(u.fiscalYear));
    });
    return Array.from(list).sort().reverse();
  }, [budgets, glTransactions, uploads]);

  const hasActiveFilters = useMemo(() => {
    return selectedQuarter !== 'All' || selectedCategory !== 'All';
  }, [selectedQuarter, selectedCategory]);

  const resetFilters = () => {
    setSelectedQuarter('All');
    setSelectedCategory('All');
    setSelectedDepartment('MIS Department');
  };

  const normFy = normalizeFiscalYear(selectedFiscalYear);

  // Filter budgets for the active FY
  const fyBudgets = useMemo(() => {
    return budgets.filter((b) => normalizeFiscalYear(b.fiscalYear) === normFy);
  }, [budgets, normFy]);

  // Raw GL transactions for the active FY
  const rawFyGls = useMemo(() => {
    return glTransactions.filter((gl) => normalizeFiscalYear(gl.fiscalYear) === normFy);
  }, [glTransactions, normFy]);

  // CALCULATION LOGIC:
  // - Read COA, section/cost center, and department from the GL Account Number
  // - Filter the relevant department/cost center before calculating Actual
  const fyGls = useMemo(() => {
    return rawFyGls.filter((gl) => {
      if (selectedDepartment === 'All') return true;
      const meta = parseGlAccountNumber(gl.accountNumberPattern || gl.coaCode, gl.description, gl.department);
      if (selectedDepartment === 'MIS Department') {
        return meta.isInScopeDept;
      }
      return (
        gl.department?.toLowerCase() === selectedDepartment.toLowerCase() ||
        meta.department.toLowerCase() === selectedDepartment.toLowerCase()
      );
    });
  }, [rawFyGls, selectedDepartment]);

  // UPLOAD LOGIC:
  // - If only Budget is uploaded → show Budget analysis only.
  // - If only GL is uploaded → show Actual/GL analysis only.
  // - If both are uploaded → enable the full Budget vs Actual dashboard.
  // - If neither is uploaded → show 'none'.
  const hasBudget = fyBudgets.length > 0;
  const hasGl = fyGls.length > 0;

  const dataMode: DashboardDataMode = useMemo(() => {
    if (hasBudget && hasGl) return 'both';
    if (hasBudget) return 'budget_only';
    if (hasGl) return 'gl_only';
    return 'none';
  }, [hasBudget, hasGl]);

  // Determine latest closed month from active GL batches
  const latestClosedMonth: FiscalMonth = useMemo(() => {
    const activeGlMonths = fyGls.map((gl) => gl.periodMonth);
    let maxIdx = -1;
    FISCAL_MONTHS.forEach((m, idx) => {
      if (activeGlMonths.includes(m)) {
        maxIdx = Math.max(maxIdx, idx);
      }
    });
    return maxIdx >= 0 ? FISCAL_MONTHS[maxIdx] : 'Aug';
  }, [fyGls]);

  // Active fiscal months for calculation
  const activeFiscalMonths = useMemo((): FiscalMonth[] => {
    if (selectedQuarter === 'Q1') return ['Apr', 'May', 'Jun'];
    if (selectedQuarter === 'Q2') return ['Jul', 'Aug', 'Sep'];
    if (selectedQuarter === 'Q3') return ['Oct', 'Nov', 'Dec'];
    if (selectedQuarter === 'Q4') return ['Jan', 'Feb', 'Mar'];
    
    // In 'All' mode:
    if (hasGl) {
      return getElapsedMonths(latestClosedMonth);
    }
    // If budget only, default to all 12 months or elapsed up to Aug
    return getElapsedMonths('Aug');
  }, [selectedQuarter, latestClosedMonth, hasGl]);

  // Data Upload Status info & message
  const dataUploadStatus: DataUploadStatus = useMemo(() => {
    const activeBudgetBatch = uploads.find(
      (u) => u.uploadType === 'Budget' && normalizeFiscalYear(u.fiscalYear) === normFy && u.status === 'Active'
    );
    const activeGlBatches = uploads.filter(
      (u) => u.uploadType === 'Monthly GL' && normalizeFiscalYear(u.fiscalYear) === normFy && u.status === 'Active'
    );
    const glMonths = Array.from(new Set(fyGls.map((g) => g.periodMonth))) as FiscalMonth[];

    let missingFileMessage: string | undefined = undefined;
    if (dataMode === 'budget_only') {
      missingFileMessage = 'File GL Excel (transaksi aktual) belum diunggah. Menampilkan analisis alokasi anggaran saja. Unggah file GL Excel untuk menghitung varians dan persentase utilisasi Budget vs Actual.';
    } else if (dataMode === 'gl_only') {
      missingFileMessage = 'File Budget Excel (rencana anggaran) belum diunggah. Menampilkan analisis transaksi aktual saja. Unggah file Budget Excel untuk mengaktifkan perhitungan Budget vs Actual.';
    } else if (dataMode === 'none') {
      missingFileMessage = 'Belum ada data finansial yang diunggah. Silakan unggah file Budget Excel dan/atau GL Excel untuk memulai analisis.';
    }

    return {
      hasBudget,
      hasGl,
      dataMode,
      budgetFileName: activeBudgetBatch?.fileName,
      budgetUploadedAt: activeBudgetBatch?.uploadedAt,
      glFileName: activeGlBatches[0]?.fileName,
      glUploadedAt: activeGlBatches[0]?.uploadedAt,
      glMonths,
      missingFileMessage
    };
  }, [hasBudget, hasGl, dataMode, uploads, normFy, fyGls]);

  // Filter master COAs by category and department
  const filteredCoa = useMemo(() => {
    return coaList.filter((item) => {
      if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
      if (selectedDepartment !== 'All' && item.department !== selectedDepartment) return false;
      return true;
    });
  }, [coaList, selectedCategory, selectedDepartment]);

  // Account Summaries computation - 100% dynamic from uploaded Excel
  const allAccountSummaries = useMemo((): AccountVarianceSummary[] => {
    if (dataMode === 'none') return [];

    const coaMap = new Map<string, CoaItem>();
    filteredCoa.forEach((c) => coaMap.set(c.code.toUpperCase(), c));

    // Ingest all COAs from uploaded budget records
    if (hasBudget) {
      fyBudgets.forEach((b) => {
        const key = b.coaCode.toUpperCase();
        if (!coaMap.has(key)) {
          const matched = coaList.find((c) => isCoaMatch(b.coaCode, c));
          const cat = matched?.category || 'Operational';
          const dept = matched?.department || 'MIS Department';
          if (
            (selectedCategory === 'All' || selectedCategory === cat) &&
            (selectedDepartment === 'All' || selectedDepartment === dept)
          ) {
            coaMap.set(key, matched || {
              code: b.coaCode,
              accountName: b.coaCode,
              category: cat,
              department: dept,
              registerSystem: 'SAP ERP',
              status: 'Active',
              description: ''
            });
          }
        }
      });
    }

    // Ingest all COAs from uploaded GL transactions
    if (hasGl) {
      fyGls.forEach((g) => {
        const key = g.coaCode.toUpperCase();
        if (!coaMap.has(key)) {
          const matched = coaList.find((c) => isCoaMatch(g.coaCode, c));
          const cat = matched?.category || (g.category as CoaCategory) || 'Operational';
          const dept = matched?.department || g.department || 'MIS Department';
          if (
            (selectedCategory === 'All' || selectedCategory === cat) &&
            (selectedDepartment === 'All' || selectedDepartment === dept)
          ) {
            coaMap.set(key, matched || {
              code: g.coaCode,
              accountName: g.description || g.coaCode,
              category: cat,
              department: dept,
              registerSystem: 'SAP ERP',
              status: 'Active',
              description: ''
            });
          }
        }
      });
    }

    // Only include accounts that are present in the uploaded dataset
    const effectiveCoas = Array.from(coaMap.values()).filter((coa) => {
      const inBudget = hasBudget && fyBudgets.some((b) => isCoaMatch(b.coaCode, coa));
      const inGl = hasGl && fyGls.some((g) => isCoaMatch(g.coaCode, coa));
      return inBudget || inGl;
    });

    const elapsedCount = Math.max(1, activeFiscalMonths.length);

    // Prior fiscal year comparison (if prior batches exist)
    const priorFiscalYear = getPriorFiscalYear(normFy);
    const priorBudgets = budgets.filter((b) => normalizeFiscalYear(b.fiscalYear) === priorFiscalYear);
    const priorGls = glTransactions.filter((gl) => normalizeFiscalYear(gl.fiscalYear) === priorFiscalYear);

    return effectiveCoas.map((coa) => {
      const budgetRecord = hasBudget ? fyBudgets.find((b) => isCoaMatch(b.coaCode, coa)) : undefined;
      const annualBudget = budgetRecord?.annualTotal || 0;

      // Calculate YTD budget for selected active reporting months
      let budgetYtd = 0;
      if (hasBudget && budgetRecord) {
        activeFiscalMonths.forEach((m) => {
          budgetYtd += (budgetRecord.monthlyBudget[m] || 0);
        });
      }

      // Calculate YTD actuals (Actual = Debit - Credit from GL) matched by reporting month
      let actualYtd = 0;
      if (hasGl) {
        const accountGls = fyGls.filter((gl) => isCoaMatch(gl.coaCode, coa) && activeFiscalMonths.includes(gl.periodMonth));
        actualYtd = accountGls.reduce((acc, curr) => acc + curr.actualAmount, 0);
      }

      let variance: number | null = null;
      let variancePct: number | null = null;
      let absorptionRate: number | null = null;
      let status: BudgetStatus = 'On Track';
      let projectedYearEnd = 0;
      let projectedGap = 0;

      if (dataMode === 'both') {
        variance = calculateVariance(actualYtd, budgetYtd);
        variancePct = calculateVariancePercentage(variance, budgetYtd);
        absorptionRate = calculateAbsorptionRate(actualYtd, budgetYtd);
        status = determineBudgetStatus(actualYtd, budgetYtd);
        const proj = calculateYearEndProjection(actualYtd, budgetYtd, annualBudget, elapsedCount);
        projectedYearEnd = proj.projectedYearEnd;
        projectedGap = proj.projectedGap;
      } else if (dataMode === 'budget_only') {
        // Single file: do not calculate Budget vs Actual
        variance = null;
        variancePct = null;
        absorptionRate = null;
        status = 'On Track';
        projectedYearEnd = annualBudget;
        projectedGap = 0;
      } else if (dataMode === 'gl_only') {
        // Single file: do not calculate Budget vs Actual
        variance = null;
        variancePct = null;
        absorptionRate = null;
        status = 'On Track';
        projectedYearEnd = Math.round(actualYtd * (12 / elapsedCount));
        projectedGap = 0;
      }

      // Prior Year YTD Budget & Actuals for the same active fiscal months
      let priorYearBudgetYtd = 0;
      let priorYearActualYtd = 0;
      let priorYearVariance: number | null = null;
      let priorYearVariancePct: number | null = null;
      let priorYearAbsorptionRate: number | null = null;
      let yoyActualGrowthPct: number | undefined = undefined;
      let yoyVarianceDelta: number | undefined = undefined;
      let yoyTrend: 'Worsening' | 'Improving' | 'Stable' | 'New Overrun' | 'High Velocity' | 'Lagging' = 'Stable';

      if (priorFiscalYear && (priorBudgets.length > 0 || priorGls.length > 0)) {
        const priorBgtRec = priorBudgets.find((b) => isCoaMatch(b.coaCode, coa));
        if (priorBgtRec) {
          activeFiscalMonths.forEach((m) => {
            priorYearBudgetYtd += (priorBgtRec.monthlyBudget[m] || 0);
          });
        }
        const priorAccountGls = priorGls.filter((gl) => isCoaMatch(gl.coaCode, coa) && activeFiscalMonths.includes(gl.periodMonth));
        priorYearActualYtd = priorAccountGls.reduce((acc, curr) => acc + curr.actualAmount, 0);

        if (priorBudgets.length > 0 && priorGls.length > 0) {
          priorYearVariance = priorYearActualYtd - priorYearBudgetYtd;
          priorYearVariancePct = calculateVariancePercentage(priorYearVariance, priorYearBudgetYtd);
          priorYearAbsorptionRate = calculateAbsorptionRate(priorYearActualYtd, priorYearBudgetYtd);
        }

        if (priorYearActualYtd > 0) {
          yoyActualGrowthPct = ((actualYtd - priorYearActualYtd) / priorYearActualYtd) * 100;
        } else if (actualYtd > 0) {
          yoyActualGrowthPct = 100;
        }

        if (variance !== null && priorYearVariance !== null) {
          yoyVarianceDelta = variance - priorYearVariance;
          if (variance > 0) {
            yoyTrend = priorYearVariance > 0 ? (variance > priorYearVariance ? 'Worsening' : 'Improving') : 'New Overrun';
          } else {
            yoyTrend = priorYearVariance > 0 ? 'Improving' : (absorptionRate ?? 0) >= 100 ? 'High Velocity' : (absorptionRate ?? 0) < 80 ? 'Lagging' : 'Stable';
          }
        }
      }

      return {
        coaCode: coa.code,
        accountName: coa.accountName,
        category: coa.category,
        department: coa.department,
        budgetYtd,
        actualYtd,
        variance,
        variancePct,
        absorptionRate,
        annualBudget,
        projectedYearEnd,
        projectedGap,
        status,
        priorYearBudgetYtd,
        priorYearActualYtd,
        priorYearVariance,
        priorYearVariancePct,
        priorYearAbsorptionRate,
        yoyActualGrowthPct,
        yoyVarianceDelta,
        yoyTrend
      };
    });
  }, [dataMode, hasBudget, hasGl, filteredCoa, fyBudgets, fyGls, activeFiscalMonths, selectedCategory, selectedDepartment, coaList, normFy, budgets, glTransactions]);

  // Overall KPI Summary
  const kpiSummary = useMemo(() => {
    if (dataMode === 'none' || allAccountSummaries.length === 0) {
      return {
        totalBudget: 0,
        totalActual: 0,
        variance: null,
        variancePct: null,
        status: 'On Track' as BudgetStatus,
        annualBudget: 0,
        projectedYearEnd: 0,
        projectedGap: 0,
        absorptionRate: null,
        healthBreakdown: {
          totalAccounts: 0,
          totalBudget: 0,
          totalActual: 0,
          overBudgetCount: 0,
          overBudgetPct: 0,
          overBudgetBudgetAmount: 0,
          overBudgetActualAmount: 0,
          onBudgetCount: 0,
          onBudgetPct: 0,
          onBudgetBudgetAmount: 0,
          onBudgetActualAmount: 0,
          underBudgetCount: 0,
          underBudgetPct: 0,
          underBudgetBudgetAmount: 0,
          underBudgetActualAmount: 0,
          overallStatus: 'On Track' as BudgetStatus,
          overallAbsorption: 0,
          overallVariancePct: 0
        },
        dataMode,
        missingFileMessage: dataUploadStatus.missingFileMessage
      };
    }

    const totalBudget = hasBudget ? allAccountSummaries.reduce((acc, curr) => acc + curr.budgetYtd, 0) : 0;
    const totalActual = hasGl ? allAccountSummaries.reduce((acc, curr) => acc + curr.actualYtd, 0) : 0;
    const annualBudget = hasBudget ? allAccountSummaries.reduce((acc, curr) => acc + curr.annualBudget, 0) : 0;
    const projectedYearEnd = allAccountSummaries.reduce((acc, curr) => acc + curr.projectedYearEnd, 0);
    const projectedGap = dataMode === 'both' ? projectedYearEnd - annualBudget : 0;

    let variance: number | null = null;
    let variancePct: number | null = null;
    let absorptionRate: number | null = null;
    let status: BudgetStatus = 'On Track';
    let healthBreakdown: BudgetHealthBreakdown;

    if (dataMode === 'both') {
      variance = calculateVariance(totalActual, totalBudget);
      variancePct = calculateVariancePercentage(variance, totalBudget);
      absorptionRate = calculateAbsorptionRate(totalActual, totalBudget);
      status = determineBudgetStatus(totalActual, totalBudget);
      healthBreakdown = calculateBudgetHealthBreakdown(
        allAccountSummaries.map((a) => ({ ...a, variance: a.variance ?? 0, absorptionRate: a.absorptionRate ?? 0 })),
        totalBudget,
        totalActual
      );
    } else {
      // Single file mode: do not calculate Budget vs Actual
      variance = null;
      variancePct = null;
      absorptionRate = null;
      status = 'On Track';
      healthBreakdown = {
        totalAccounts: allAccountSummaries.length,
        totalBudget,
        totalActual,
        overBudgetCount: 0,
        overBudgetPct: 0,
        overBudgetBudgetAmount: 0,
        overBudgetActualAmount: 0,
        onBudgetCount: 0,
        onBudgetPct: 0,
        onBudgetBudgetAmount: 0,
        onBudgetActualAmount: 0,
        underBudgetCount: 0,
        underBudgetPct: 0,
        underBudgetBudgetAmount: 0,
        underBudgetActualAmount: 0,
        overallStatus: 'On Track',
        overallAbsorption: 0,
        overallVariancePct: 0
      };
    }

    return {
      totalBudget,
      totalActual,
      variance,
      variancePct,
      status,
      annualBudget,
      projectedYearEnd,
      projectedGap,
      absorptionRate,
      healthBreakdown,
      dataMode,
      missingFileMessage: dataUploadStatus.missingFileMessage
    };
  }, [allAccountSummaries, dataMode, hasBudget, hasGl, dataUploadStatus.missingFileMessage]);

  // Category Summaries for grouped chart
  const categorySummaries = useMemo((): CategorySummary[] => {
    if (dataMode === 'none' || allAccountSummaries.length === 0) return [];
    const standardCategories: CoaCategory[] = ['Hardware', 'Software', 'Network', 'Consulting', 'Maintenance', 'Training'];
    const observedCategories = Array.from(new Set(allAccountSummaries.map((a) => a.category)));
    const categories = Array.from(new Set([...standardCategories, ...observedCategories])) as CoaCategory[];

    return categories.map((cat) => {
      const catAccounts = allAccountSummaries.filter((a) => a.category === cat);
      const budget = hasBudget ? catAccounts.reduce((acc, a) => acc + a.budgetYtd, 0) : 0;
      const actual = hasGl ? catAccounts.reduce((acc, a) => acc + a.actualYtd, 0) : 0;

      let variance: number | null = null;
      let variancePct: number | null = null;
      let absorptionRate: number | null = null;
      let status: BudgetStatus = 'On Track';

      if (dataMode === 'both') {
        variance = calculateVariance(actual, budget);
        variancePct = calculateVariancePercentage(variance, budget);
        absorptionRate = calculateAbsorptionRate(actual, budget);
        status = determineBudgetStatus(actual, budget);
      }

      return {
        category: cat,
        budget,
        actual,
        variance,
        variancePct,
        absorptionRate,
        accountCount: catAccounts.length,
        status
      };
    });
  }, [allAccountSummaries, dataMode, hasBudget, hasGl]);

  // Worst COA: Accounts with positive variance (Actual > Budget), sorted descending by variance amount
  // Only calculated when both files are available!
  const worstCoaList = useMemo(() => {
    if (dataMode !== 'both') return [];
    return [...allAccountSummaries]
      .filter((a) => a.variance !== null && a.variance > 0)
      .sort((a, b) => (b.variance ?? 0) - (a.variance ?? 0))
      .slice(0, 5);
  }, [allAccountSummaries, dataMode]);

  // Highest 5 Absorption: non-zero budget, sorted descending by absorption rate
  const highestAbsorptionList = useMemo(() => {
    if (dataMode !== 'both') return [];
    return [...allAccountSummaries]
      .filter((a) => a.budgetYtd > 0 && a.absorptionRate !== null)
      .sort((a, b) => (b.absorptionRate ?? 0) - (a.absorptionRate ?? 0))
      .slice(0, 5);
  }, [allAccountSummaries, dataMode]);

  // Lowest 5 Absorption: non-zero budget, sorted ascending by absorption rate
  const lowestAbsorptionList = useMemo(() => {
    if (dataMode !== 'both') return [];
    return [...allAccountSummaries]
      .filter((a) => a.budgetYtd > 0 && a.absorptionRate !== null)
      .sort((a, b) => (a.absorptionRate ?? 0) - (b.absorptionRate ?? 0))
      .slice(0, 5);
  }, [allAccountSummaries, dataMode]);

  const priorFiscalYear = getPriorFiscalYear(selectedFiscalYear);

  // Monthly Matrix Rows for Monthly Matrix View
  const monthlyMatrixRows = useMemo(() => {
    if (dataMode === 'none' || allAccountSummaries.length === 0) return [];
    const elapsedMonthsList = getElapsedMonths(latestClosedMonth);

    return allAccountSummaries.map((summary) => {
      const coa = coaList.find((c) => c.code === summary.coaCode) || {
        code: summary.coaCode,
        accountName: summary.accountName,
        category: summary.category,
        department: summary.department,
        registerSystem: 'SAP ERP',
        status: 'Active',
        description: ''
      };

      const budgetRec = hasBudget ? fyBudgets.find((b) => isCoaMatch(b.coaCode, coa)) : undefined;
      const monthlyBudgets: Record<FiscalMonth, number | null> = {} as any;
      const monthlyActuals: Record<FiscalMonth, number | null> = {} as any;

      let ytdActual = 0;
      let ytdBudget = 0;

      FISCAL_MONTHS.forEach((m) => {
        // Budget
        if (hasBudget) {
          monthlyBudgets[m] = budgetRec?.monthlyBudget[m] ?? 0;
        } else {
          monthlyBudgets[m] = null;
        }

        // Actual
        if (hasGl) {
          const matchingGls = fyGls.filter((g) => isCoaMatch(g.coaCode, coa) && g.periodMonth === m);
          const hasActualGls = matchingGls.length > 0;
          const isMonthElapsed = elapsedMonthsList.includes(m) || hasActualGls;

          if (isMonthElapsed) {
            const val = matchingGls.reduce((sum, g) => sum + g.actualAmount, 0);
            monthlyActuals[m] = val;
            ytdActual += val;
          } else {
            monthlyActuals[m] = null;
          }
        } else {
          monthlyActuals[m] = null;
        }

        if (hasBudget && elapsedMonthsList.includes(m)) {
          ytdBudget += (monthlyBudgets[m] || 0);
        }
      });

      const ytdVariance = dataMode === 'both' ? ytdActual - ytdBudget : 0;

      return {
        coa,
        monthlyActuals,
        monthlyBudgets,
        ytdActual: hasGl ? ytdActual : 0,
        ytdBudget: hasBudget ? ytdBudget : 0,
        ytdVariance
      };
    });
  }, [allAccountSummaries, coaList, dataMode, hasBudget, hasGl, fyBudgets, fyGls, latestClosedMonth]);

  // Check period collision
  const checkPeriodCollision = (type: UploadType, fiscalYear: string, month?: FiscalMonth): UploadBatch | null => {
    return uploads.find((u) => {
      if (u.status !== 'Active') return false;
      if (u.uploadType !== type) return false;
      if (u.fiscalYear !== fiscalYear) return false;
      if (type === 'Monthly GL') {
        return u.targetMonth === month;
      }
      return true; // For Budget, 1 active budget per fiscal year
    }) || null;
  };

  // Append audit trail note
  const appendAuditNote = (content: string, category: 'Upload' | 'Replacement' | 'Budget Revision' | 'System' | 'Policy', relatedBatchId?: string) => {
    const newNote: AuditNote = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB',
      userName: currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'Administrator',
      userRole: currentUser?.role || 'Administrator',
      category,
      relatedBatchId,
      content
    };
    setAuditNotes((prev) => [newNote, ...prev]);
  };

  // Commit upload batch
  const commitUpload = (params: {
    uploadType: UploadType;
    fiscalYear: string;
    targetMonth?: FiscalMonth;
    fileName: string;
    fileSize: string;
    rowCount: number;
    acceptedRows: number;
    rejectedRows: number;
    totalAmount: number;
    replaceReason?: string;
    parsedGlRecords?: ParsedGlCommitRecord[];
    parsedBudgetRecords?: Array<{ coaCode: string; monthly: Record<FiscalMonth, number>; annual: number }>;
    newCoas?: CoaItem[];
  }): { 
    success: boolean; 
    batchId: string;
    isOverBudget?: boolean;
    budgetStatus?: BudgetStatus;
    overBudgetAmount?: number;
    overBudgetPercentage?: number;
    varianceAmount?: number;
    targetBudgetAmount?: number;
    overBudgetAccountsCount?: number;
    topOverBudgetCoa?: {
      code: string;
      accountName: string;
      overAmount: number;
      variancePct: number;
    };
    detailsSummary?: string;
  } => {
    const existing = checkPeriodCollision(params.uploadType, params.fiscalYear, params.targetMonth);
    const newBatchId = `batch-${params.uploadType === 'Budget' ? 'bgt' : 'gl'}-${Date.now()}`;
    const timestampStr = new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) + ' WIB';
    const userName = currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'admin_hendra (Administrator)';
    const userRole = currentUser?.role || 'Administrator';

    let batchBudgetStatus: BudgetStatus = 'On Budget';
    let isOver = false;
    let overAmount = 0;
    let overPct = 0;
    let targetBudget = 0;
    let variance = 0;
    let overAccountsCount = 0;
    let topOverCoa: { code: string; accountName: string; overAmount: number; variancePct: number } | undefined;
    let detailSummaryText = '';

    if (params.uploadType === 'Monthly GL' && params.targetMonth) {
      const budgetBatches = uploads.filter(
        (u) => u.uploadType === 'Budget' && u.fiscalYear === params.fiscalYear && u.status === 'Active'
      );
      if (budgetBatches.length > 0) {
        targetBudget = Math.round(budgetBatches[0].totalAmount / 12);
        variance = params.totalAmount - targetBudget;
        if (targetBudget > 0) {
          overPct = (variance / targetBudget) * 100;
        }

        if (variance > targetBudget * 0.05) {
          batchBudgetStatus = 'Over Budget';
          isOver = true;
          overAmount = variance;
        } else if (variance < -targetBudget * 0.05) {
          batchBudgetStatus = 'Under Budget';
        } else {
          batchBudgetStatus = 'On Budget';
        }
      }

      if (params.parsedGlRecords && params.parsedGlRecords.length > 0) {
        const coaAgg = new Map<string, number>();
        params.parsedGlRecords.forEach((r) => {
          coaAgg.set(r.coaCode, (coaAgg.get(r.coaCode) || 0) + r.amount);
        });

        let highestOver = 0;
        coaAgg.forEach((actualAmt, code) => {
          const bRec = budgets.find((b) => b.coaCode === code && b.fiscalYear === params.fiscalYear);
          const bMonth = bRec?.monthlyBudget[params.targetMonth!] || (bRec ? Math.round(bRec.annualTotal / 12) : 0);
          const diff = actualAmt - bMonth;
          if (diff > 0) {
            overAccountsCount++;
            if (diff > highestOver) {
              highestOver = diff;
              const coaInfo = coaList.find((c) => c.code === code);
              topOverCoa = {
                code,
                accountName: coaInfo?.accountName || code,
                overAmount: diff,
                variancePct: bMonth > 0 ? (diff / bMonth) * 100 : 100
              };
            }
          }
        });
      }

      detailSummaryText = `Realisasi GL periode ${params.targetMonth} ${params.fiscalYear}: ${batchBudgetStatus.toUpperCase()}` +
        (isOver ? ` (Lebih Anggaran: +$${Math.round(overAmount).toLocaleString()} / +${overPct.toFixed(1)}%)` : '');
    } else if (params.uploadType === 'Budget') {
      batchBudgetStatus = 'On Budget';
      detailSummaryText = `Rencana Alokasi Anggaran Disetujui ${params.fiscalYear}: $${Math.round(params.totalAmount).toLocaleString()} (12 Bulan)`;
    }

    const newBatch: UploadBatch = {
      id: newBatchId,
      uploadType: params.uploadType,
      fiscalYear: params.fiscalYear,
      targetMonth: params.targetMonth,
      fileName: params.fileName,
      fileSize: params.fileSize,
      uploadedAt: timestampStr,
      uploadedBy: userName,
      status: 'Active',
      rowCount: params.rowCount,
      acceptedRows: params.acceptedRows,
      rejectedRows: params.rejectedRows,
      totalAmount: params.totalAmount,
      budgetStatus: batchBudgetStatus,
      isOverBudget: isOver,
      overBudgetAmount: overAmount,
      overBudgetPercentage: overPct,
      varianceAmount: variance,
      targetBudgetAmount: targetBudget,
      overBudgetAccountsCount: overAccountsCount,
      topOverBudgetCoa: topOverCoa,
      detailsSummary: detailSummaryText
    };

    // If replacement, update existing batch
    if (existing) {
      setUploads((prev) =>
        prev.map((b) => {
          if (b.id === existing.id) {
            return {
              ...b,
              status: 'Replaced',
              replacedAt: timestampStr,
              replacedBy: userName,
              replaceReason: params.replaceReason,
              replacedBatchId: newBatchId
            };
          }
          return b;
        })
      );

      appendAuditNote(
        `[PENGGANTIAN DATA / REPLACEMENT] Batch #${existing.id} (${existing.fileName}) DIGANTIKAN oleh Batch #${newBatchId} (${params.fileName}). Alasan Penggantian: "${params.replaceReason || 'Pembaruan data resmi'}". Operator: ${userName}.`,
        'Replacement',
        newBatchId
      );
    } else {
      appendAuditNote(
        `[UNGGAH DATA BARU] Batch #${newBatchId} berhasil diunggah (${params.fileName}, ${params.acceptedRows} baris valid, total $${params.totalAmount.toLocaleString()}). Upload Type: ${params.uploadType}. Status Anggaran: ${batchBudgetStatus}. Operator: ${userName}.`,
        'Upload',
        newBatchId
      );
    }

    setUploads((prev) => [newBatch, ...prev]);

    // Commit budget records to state
    if (params.uploadType === 'Budget' && params.parsedBudgetRecords) {
      const recordsToCommit: BudgetRecord[] = params.parsedBudgetRecords.map((r) => ({
        id: `bgt-${r.coaCode}-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        fiscalYear: params.fiscalYear,
        coaCode: r.coaCode,
        monthlyBudget: r.monthly,
        annualTotal: r.annual,
        updatedAt: timestampStr,
        updatedBy: userName
      }));

      setBudgets((prev) => {
        const otherYears = prev.filter((b) => b.fiscalYear !== params.fiscalYear);
        return [...otherYears, ...recordsToCommit];
      });
    }

    // Commit GL records to state
    if (params.uploadType === 'Monthly GL' && params.parsedGlRecords) {
      const glRecordsToCommit: GlTransaction[] = params.parsedGlRecords.map((r, idx) => ({
        id: `gl-${newBatchId}-${idx}`,
        fiscalYear: params.fiscalYear,
        periodMonth: r.periodMonth || params.targetMonth || 'Aug',
        coaCode: r.coaCode,
        actualAmount: r.amount,
        glDocumentNo: r.docNo || `DOC-${Date.now()}-${idx}`,
        postingDate: r.postingDate || new Date().toISOString().slice(0, 10),
        vendorName: r.vendor,
        description: r.description,
        uploadBatchId: newBatchId,
        category: r.category,
        department: r.department || 'MIS Department',
        sectionCode: r.sectionCode,
        currency: r.currency || 'USD',
        accountNumberPattern: r.accountNumberPattern
      }));

      setGlTransactions((prev) => {
        // If replacing a batch, strip old records
        const filtered = existing
          ? prev.filter((g) => g.uploadBatchId !== existing.id)
          : prev;
        return [...filtered, ...glRecordsToCommit];
      });
    }

    // Register any new COAs detected during upload
    if (params.newCoas && params.newCoas.length > 0) {
      addCoas(params.newCoas);
    }

    return {
      success: true,
      batchId: newBatchId,
      isOverBudget: isOver,
      budgetStatus: batchBudgetStatus,
      overBudgetAmount: overAmount,
      overBudgetPercentage: overPct,
      varianceAmount: variance,
      targetBudgetAmount: targetBudget,
      overBudgetAccountsCount: overAccountsCount,
      topOverBudgetCoa: topOverCoa,
      detailsSummary: detailSummaryText
    };
  };

  // Clear all uploaded datasets & reset state to clean empty baseline
  const clearAllUploadedData = () => {
    setBudgets([]);
    setGlTransactions([]);
    setUploads([]);
    setAuditNotes([]);
    try {
      localStorage.removeItem(LS_BUDGETS_KEY);
      localStorage.removeItem(LS_GL_KEY);
      localStorage.removeItem(LS_UPLOADS_KEY);
      localStorage.removeItem(LS_AUDIT_NOTES_KEY);
    } catch {}
  };

  // Quick Sample Loaders for interactive testing
  const loadSampleBudgetOnly = () => {
    clearAllUploadedData();
    commitUpload({
      uploadType: 'Budget',
      fiscalYear: 'FY2026/2027',
      fileName: 'MIS_IT_Approved_Budget_FY2026_2027.xlsx',
      fileSize: '184.2 KB',
      rowCount: INITIAL_BUDGETS.length,
      acceptedRows: INITIAL_BUDGETS.length,
      rejectedRows: 0,
      totalAmount: INITIAL_BUDGETS.reduce((acc, b) => acc + b.annualTotal, 0),
      parsedBudgetRecords: INITIAL_BUDGETS.map((b) => ({
        coaCode: b.coaCode,
        monthly: b.monthlyBudget as Record<FiscalMonth, number>,
        annual: b.annualTotal
      }))
    });
  };

  const loadSampleGlOnly = () => {
    clearAllUploadedData();
    commitUpload({
      uploadType: 'Monthly GL',
      fiscalYear: 'FY2026/2027',
      targetMonth: 'Aug',
      fileName: 'SAP_GL_Actuals_MIS_FY26_YTD_Aug.xlsx',
      fileSize: '348.6 KB',
      rowCount: INITIAL_GL_TRANSACTIONS.length,
      acceptedRows: INITIAL_GL_TRANSACTIONS.length,
      rejectedRows: 0,
      totalAmount: INITIAL_GL_TRANSACTIONS.reduce((acc, g) => acc + g.actualAmount, 0),
      parsedGlRecords: INITIAL_GL_TRANSACTIONS.map((g) => ({
        coaCode: g.coaCode,
        amount: g.actualAmount,
        description: g.description,
        docNo: g.glDocumentNo,
        vendor: g.vendorName,
        postingDate: g.postingDate,
        periodMonth: g.periodMonth,
        category: g.category,
        department: g.department,
        sectionCode: g.sectionCode,
        accountNumberPattern: g.accountNumberPattern
      }))
    });
  };

  const loadBothSamples = () => {
    clearAllUploadedData();
    commitUpload({
      uploadType: 'Budget',
      fiscalYear: 'FY2026/2027',
      fileName: 'MIS_IT_Approved_Budget_FY2026_2027.xlsx',
      fileSize: '184.2 KB',
      rowCount: INITIAL_BUDGETS.length,
      acceptedRows: INITIAL_BUDGETS.length,
      rejectedRows: 0,
      totalAmount: INITIAL_BUDGETS.reduce((acc, b) => acc + b.annualTotal, 0),
      parsedBudgetRecords: INITIAL_BUDGETS.map((b) => ({
        coaCode: b.coaCode,
        monthly: b.monthlyBudget as Record<FiscalMonth, number>,
        annual: b.annualTotal
      }))
    });

    commitUpload({
      uploadType: 'Monthly GL',
      fiscalYear: 'FY2026/2027',
      targetMonth: 'Aug',
      fileName: 'SAP_GL_Actuals_MIS_FY26_YTD_Aug.xlsx',
      fileSize: '348.6 KB',
      rowCount: INITIAL_GL_TRANSACTIONS.length,
      acceptedRows: INITIAL_GL_TRANSACTIONS.length,
      rejectedRows: 0,
      totalAmount: INITIAL_GL_TRANSACTIONS.reduce((acc, g) => acc + g.actualAmount, 0),
      parsedGlRecords: INITIAL_GL_TRANSACTIONS.map((g) => ({
        coaCode: g.coaCode,
        amount: g.actualAmount,
        description: g.description,
        docNo: g.glDocumentNo,
        vendor: g.vendorName,
        postingDate: g.postingDate,
        periodMonth: g.periodMonth,
        category: g.category,
        department: g.department,
        sectionCode: g.sectionCode,
        accountNumberPattern: g.accountNumberPattern
      }))
    });
  };

  // Add new COA dynamically
  const addNewCoa = (newCoa: CoaItem, initialBudgetAnnual?: number): { success: boolean; message: string } => {
    if (!newCoa.code || !newCoa.accountName) {
      return { success: false, message: 'Nomor COA dan Nama Akun wajib diisi.' };
    }

    const codeExists = coaList.some((c) => c.code.toUpperCase() === newCoa.code.toUpperCase());
    if (codeExists) {
      return { success: false, message: `COA dengan kode ${newCoa.code} sudah terdaftar di Master COA.` };
    }

    const cleanedCoa: CoaItem = {
      ...newCoa,
      code: newCoa.code.trim().toUpperCase(),
      accountName: newCoa.accountName.trim(),
      category: newCoa.category || 'Other',
      department: newCoa.department || 'MIS Department',
      registerSystem: newCoa.registerSystem || 'SAP ERP',
      status: newCoa.status || 'Active',
      description: newCoa.description?.trim() || `${newCoa.accountName} registered in Master COA`,
      inScope: newCoa.inScope !== false
    };

    setCoaList((prev) => [...prev, cleanedCoa]);

    if (initialBudgetAnnual && initialBudgetAnnual > 0) {
      const monthlyVal = Math.round(initialBudgetAnnual / 12);
      const monthlyBudget: MonthlyValues = {
        Apr: monthlyVal, May: monthlyVal, Jun: monthlyVal,
        Jul: monthlyVal, Aug: monthlyVal, Sep: monthlyVal,
        Oct: monthlyVal, Nov: monthlyVal, Dec: monthlyVal,
        Jan: monthlyVal, Feb: monthlyVal, Mar: monthlyVal
      };

      const newBudgetRecord: BudgetRecord = {
        id: `bgt-${cleanedCoa.code}-${Date.now()}`,
        fiscalYear: selectedFiscalYear || 'FY2026/2027',
        coaCode: cleanedCoa.code,
        monthlyBudget,
        annualTotal: initialBudgetAnnual,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser?.username || 'admin_hendra'
      };

      setBudgets((prev) => [...prev, newBudgetRecord]);
    }

    const userName = currentUser ? `${currentUser.fullName} (${currentUser.username})` : 'Administrator';
    appendAuditNote(
      `[MASTER COA] Administrator ${userName} mendaftarkan nomor COA baru: ${cleanedCoa.code} - ${cleanedCoa.accountName} (Kategori: ${cleanedCoa.category}, Dept: ${cleanedCoa.department}). COA aktif dan langsung dikenali oleh sistem untuk alokasi anggaran & pencatatan GL actuals.`,
      'Policy'
    );

    return {
      success: true,
      message: `COA ${cleanedCoa.code} - ${cleanedCoa.accountName} berhasil didaftarkan ke Master COA dan siap digunakan.`
    };
  };

  return (
    <DataContext.Provider
      value={{
        coaList,
        addCoas,
        addNewCoa,
        budgets,
        glTransactions,
        uploads,
        auditNotes,
        selectedFiscalYear,
        setSelectedFiscalYear,
        availableFiscalYears,
        selectedQuarter,
        setSelectedQuarter,
        selectedCategory,
        setSelectedCategory,
        selectedDepartment,
        setSelectedDepartment,
        resetFilters,
        hasActiveFilters,
        latestClosedMonth,
        dataUploadStatus,
        dataMode,
        kpiSummary,
        categorySummaries,
        worstCoaList,
        highestAbsorptionList,
        lowestAbsorptionList,
        allAccountSummaries,
        priorFiscalYear,
        monthlyMatrixRows,
        clearAllUploadedData,
        loadSampleBudgetOnly,
        loadSampleGlOnly,
        loadBothSamples,
        checkPeriodCollision,
        commitUpload,
        appendAuditNote
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
