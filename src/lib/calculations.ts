import { BudgetStatus, FiscalMonth, FISCAL_MONTHS, BudgetHealthBreakdown, AccountVarianceSummary } from '../types';

/**
 * Calculates Variance = Actual - Budget
 */
export function calculateVariance(actual: number, budget: number): number {
  return actual - budget;
}

/**
 * Calculates Variance % = (Variance / Budget) * 100
 * Prevents division by zero safely
 */
export function calculateVariancePercentage(variance: number, budget: number): number {
  if (!budget || budget === 0) {
    return 0;
  }
  return (variance / budget) * 100;
}

/**
 * Calculates Utilization % / Absorption Rate % = (Actual / Budget) * 100
 * Prevents division by zero safely
 */
export function calculateUtilizationPercentage(actual: number, budget: number): number {
  if (!budget || budget <= 0) {
    return actual > 0 ? 100 : 0;
  }
  return (actual / budget) * 100;
}

export function calculateAbsorptionRate(actual: number, budget: number): number {
  return calculateUtilizationPercentage(actual, budget);
}

/**
 * Determines Status based on criteria:
 * - Under Budget < 90%
 * - On Budget 90–110%
 * - Over Budget > 110%
 */
export function determineBudgetStatus(actual: number, budget: number): BudgetStatus {
  if (budget <= 0) {
    return actual > 0 ? 'Over Budget' : 'On Budget';
  }

  const absorption = (actual / budget) * 100;

  // Over Budget: > 110%
  if (absorption > 110) {
    return 'Over Budget';
  }

  // Under Budget: < 90%
  if (absorption < 90) {
    return 'Under Budget';
  }

  // On Budget: 90% - 110%
  return 'On Budget';
}

/**
 * Calculates Budget Health Breakdown (Over Budget, On Budget, Under Budget percentages & counts)
 * As required by SPV for Status Kesehatan Anggaran.
 */
export function calculateBudgetHealthBreakdown(
  accounts: AccountVarianceSummary[],
  totalBudget: number,
  totalActual: number
): BudgetHealthBreakdown {
  const total = accounts.length;
  if (total === 0) {
    const overallStatus = determineBudgetStatus(totalActual, totalBudget);
    const overallAbsorption = calculateAbsorptionRate(totalActual, totalBudget);
    const overallVariancePct = calculateVariancePercentage(totalActual - totalBudget, totalBudget);
    return {
      totalAccounts: 0,
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
      overallStatus,
      overallAbsorption,
      overallVariancePct
    };
  }

  let overCount = 0;
  let onCount = 0;
  let underCount = 0;

  let overBudgetSum = 0;
  let onBudgetSum = 0;
  let underBudgetSum = 0;

  let overActualSum = 0;
  let onActualSum = 0;
  let underActualSum = 0;

  accounts.forEach((acc) => {
    if (acc.status === 'Over Budget') {
      overCount++;
      overBudgetSum += acc.budgetYtd;
      overActualSum += acc.actualYtd;
    } else if (acc.status === 'Under Budget') {
      underCount++;
      underBudgetSum += acc.budgetYtd;
      underActualSum += acc.actualYtd;
    } else {
      // 'On Budget' or 'On Track'
      onCount++;
      onBudgetSum += acc.budgetYtd;
      onActualSum += acc.actualYtd;
    }
  });

  const overBudgetPct = (overCount / total) * 100;
  const onBudgetPct = (onCount / total) * 100;
  const underBudgetPct = (underCount / total) * 100;

  const overallAbsorption = calculateAbsorptionRate(totalActual, totalBudget);
  const overallVariancePct = calculateVariancePercentage(totalActual - totalBudget, totalBudget);
  const overallStatus = determineBudgetStatus(totalActual, totalBudget);

  return {
    totalAccounts: total,
    totalBudget,
    totalActual,
    overBudgetCount: overCount,
    overBudgetPct,
    overBudgetBudgetAmount: overBudgetSum,
    overBudgetActualAmount: overActualSum,
    onBudgetCount: onCount,
    onBudgetPct,
    onBudgetBudgetAmount: onBudgetSum,
    onBudgetActualAmount: onActualSum,
    underBudgetCount: underCount,
    underBudgetPct,
    underBudgetBudgetAmount: underBudgetSum,
    underBudgetActualAmount: underActualSum,
    overallStatus,
    overallAbsorption,
    overallVariancePct
  };
}

/**
 * Calculates Year-End Projection:
 * If we have elapsed months, annualize the run-rate or use remaining scheduled budget
 * Standard IT model: YTD Actual + Remaining months scheduled budget
 */
export function calculateYearEndProjection(
  ytdActual: number,
  ytdBudget: number,
  annualBudget: number,
  elapsedMonths: number
): { projectedYearEnd: number; projectedGap: number } {
  if (elapsedMonths <= 0) {
    return { projectedYearEnd: annualBudget, projectedGap: 0 };
  }
  
  // Projection method: YTD Actual + ((Annual Budget - YTD Budget) adjusted for current burn trend)
  const remainingMonths = Math.max(0, 12 - elapsedMonths);
  const averageMonthlyActual = ytdActual / elapsedMonths;
  const runRateProjection = ytdActual + (averageMonthlyActual * remainingMonths);
  
  const projectedGap = runRateProjection - annualBudget;
  return {
    projectedYearEnd: runRateProjection,
    projectedGap
  };
}

/**
 * Currency Formatter: USD ($)
 * Displays all financial nominals in US Dollars across the dashboard, charts, upload, and matrix.
 */
export function formatCurrencyUSD(amount: number, compact: boolean = false): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '$0';
  }
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (compact) {
    if (abs >= 1_000_000_000) {
      return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
    }
    if (abs >= 1_000_000) {
      return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
    }
    if (abs >= 1_000) {
      return `${sign}$${(abs / 1_000).toFixed(1)}K`;
    }
    if (abs > 0 && abs < 10) {
      return `${sign}$${abs.toFixed(2)}`;
    }
    return `${sign}$${abs.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  // Determine decimal fraction digits
  const maxFraction = abs > 0 && abs % 1 !== 0 ? 2 : 0;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: maxFraction > 0 ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount);
}

// Global aliases to ensure all components render in USD consistently
export const formatCurrency = formatCurrencyUSD;
export const formatCurrencyIDR = formatCurrencyUSD;

/**
 * Percentage Formatter
 */
export function formatPercentage(val: number, withSign: boolean = false): string {
  if (val === undefined || val === null || isNaN(val)) return '0.0%';
  const formatted = val.toFixed(1) + '%';
  if (withSign && val > 0) {
    return '+' + formatted;
  }
  return formatted;
}

/**
 * Helper to get months up to a specific fiscal month
 */
export function getElapsedMonths(upToMonth: FiscalMonth): FiscalMonth[] {
  const index = FISCAL_MONTHS.indexOf(upToMonth);
  if (index === -1) return FISCAL_MONTHS.slice(0, 5); // default Apr-Aug
  return FISCAL_MONTHS.slice(0, index + 1);
}

/**
 * Normalizes Fiscal Year strings and repairs typos such as FY2025/20263 -> FY2025/2026.
 * Guarantees standard uniform 'FYyyyy/yyyy' format.
 */
export function normalizeFiscalYear(raw: string | undefined | null): string {
  if (!raw) return 'FY2026/2027';
  let s = String(raw).trim();

  // Explicit fix for the known typo FY2025/20263 and similar extra-digit typos
  s = s.replace(/FY2025\/20263/gi, 'FY2025/2026');
  s = s.replace(/FY2026\/20273/gi, 'FY2026/2027');

  // Any FY year ending with extra trailing digit(s)
  const trailingDigitsMatch = s.match(/^(?:FY)?\s*(\d{4})[\/-](\d{4})\d+$/i);
  if (trailingDigitsMatch) {
    return `FY${trailingDigitsMatch[1]}/${trailingDigitsMatch[2]}`;
  }

  // Standard range e.g. FY2026/2027 or FY 2026/2027 or FY2026-2027 or 2026/2027
  const stdMatch = s.match(/^(?:FY)?\s*(\d{4})[\/-](\d{4})$/i);
  if (stdMatch) {
    return `FY${stdMatch[1]}/${stdMatch[2]}`;
  }

  // Single year e.g. FY2026 or 2026
  const singleMatch = s.match(/^(?:FY)?\s*(\d{4})$/i);
  if (singleMatch) {
    const y = parseInt(singleMatch[1], 10);
    return `FY${y}/${y + 1}`;
  }

  return s;
}

/**
 * Derives the Prior Fiscal Year dynamically based on the current Fiscal Year.
 * e.g. FY2026/2027 -> FY2025/2026; FY2025/2026 -> FY2024/2025
 */
export function getPriorFiscalYear(currentFy: string | undefined | null): string {
  const norm = normalizeFiscalYear(currentFy);
  const match = norm.match(/^FY(\d{4})\/(\d{4})$/i);
  if (match) {
    const y1 = parseInt(match[1], 10);
    const y2 = parseInt(match[2], 10);
    return `FY${y1 - 1}/${y2 - 1}`;
  }
  return 'FY2025/2026';
}

export interface ParsedGlAccountMetadata {
  coaCode: string;
  costCenter?: string;
  sectionCode?: string;
  department: string;
  accountPattern: string;
  isInScopeDept: boolean;
}

/**
 * Reads and decomposes a GL Account Number into its components:
 * - COA Code (9-digit, 5-digit, or IT-60xxx)
 * - Section / Cost Center (e.g. A7744, COMM00, ME0000, MIS)
 * - Department (e.g. MIS Department)
 */
export function parseGlAccountNumber(
  rawAccountStr: string | number | undefined | null,
  rawAccountName?: string,
  rawDept?: string
): ParsedGlAccountMetadata {
  if (rawAccountStr === undefined || rawAccountStr === null) {
    return {
      coaCode: '',
      department: rawDept || 'MIS Department',
      accountPattern: '',
      isInScopeDept: true
    };
  }

  let str = String(rawAccountStr).trim();
  // Strip Excel numeric float artifact (e.g. 752201001.0)
  if (str.endsWith('.0')) {
    str = str.slice(0, -2);
  }
  str = str.replace(/^['"`\s]+|['"`\s]+$/g, '');

  let cleanCoaCode = '';
  let costCenter: string | undefined = undefined;
  let sectionCode: string | undefined = undefined;
  let department = String(rawDept || '').trim();

  // Split tokens by standard delimiters: '-', '/', '_', '|', space
  const tokens = str.split(/[-/_|\s]+/).map(t => t.trim()).filter(Boolean);

  // 1. Identify COA Code:
  for (const token of tokens) {
    if (/^\d{9}$/.test(token)) {
      cleanCoaCode = token;
      break;
    } else if (/^IT-\d{5}$/i.test(token) || /^IT\d{5}$/i.test(token)) {
      cleanCoaCode = token.toUpperCase().replace(/^IT/, 'IT-');
      break;
    } else if (/^\d{5}$/.test(token)) {
      cleanCoaCode = `IT-${token}`;
      break;
    }
  }

  if (!cleanCoaCode && tokens.length > 0) {
    cleanCoaCode = tokens[0];
  }

  // 2. Identify Cost Center (e.g. A7744 or letter followed by digits):
  for (const token of tokens) {
    const up = token.toUpperCase();
    if (/^[A-Z]\d{4,5}$/i.test(up) && up !== cleanCoaCode.toUpperCase()) {
      costCenter = up;
      break;
    }
  }

  // 3. Identify Section Code (e.g. COMM00, ME0000, MIS, IT, COMM, INFRA):
  for (const token of tokens) {
    const up = token.toUpperCase();
    if (/^(COMM00|ME0000|COMM|MIS|IT|INFRA|MIS00|OPR)$/i.test(up)) {
      sectionCode = up;
      break;
    } else if (up.length >= 4 && !/^\d+$/.test(up) && up !== cleanCoaCode.toUpperCase() && up !== costCenter) {
      if (!sectionCode) sectionCode = up;
    }
  }

  // 4. Resolve Department:
  // If costCenter is A7744 or sectionCode is COMM00 / ME0000 / MIS / IT -> MIS Department
  const isMis = 
    costCenter === 'A7744' || 
    sectionCode === 'COMM00' || 
    sectionCode === 'ME0000' || 
    sectionCode === 'MIS' || 
    sectionCode === 'IT' || 
    str.toUpperCase().includes('MIS') || 
    str.toUpperCase().includes('A7744') ||
    str.toUpperCase().includes('COMM00') ||
    (rawDept && /MIS|IT|COMM/i.test(rawDept));

  if (isMis) {
    department = 'MIS Department';
  } else if (!department) {
    department = 'MIS Department'; // Default in IT ops context
  }

  const accountPattern = str || `${cleanCoaCode}-${costCenter || 'A7744'}-${sectionCode || 'COMM00'}`;

  return {
    coaCode: cleanCoaCode,
    costCenter,
    sectionCode,
    department,
    accountPattern,
    isInScopeDept: isMis
  };
}
