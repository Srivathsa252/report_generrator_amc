import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { validateRequest, dateRangeSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validation = validateRequest(dateRangeSchema, queryParams);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { financialYear } = validation.data;
    const selectedMonth = searchParams.get('month') || 'May';
    const committeeId = searchParams.get('committeeId');
    
    if (!financialYear) {
      return errorResponse('Financial year is required', 400);
    }
    
    // Get committees
    const committees = await prisma.committee.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        ...(committeeId && { id: committeeId }),
      },
      include: {
        receipts: {
          where: {
            isActive: true,
            deletedAt: null,
            natureOfReceipt: 'MF',
          },
        },
        targets: {
          where: {
            isActive: true,
            deletedAt: null,
            financialYear,
          },
          include: {
            monthlyTargets: true,
          },
        },
      },
    });
    
    // Calculate report data
    const reportData = committees.map((committee, index) => {
      const target = committee.targets[0];
      const yearlyTarget = target ? Number(target.yearlyTarget) : 0;
      
      // Get monthly target for selected month
      const monthlyTarget = target?.monthlyTargets.find(
        mt => mt.month.toLowerCase() === selectedMonth.toLowerCase()
      );
      const monthlyTargetAmount = monthlyTarget ? Number(monthlyTarget.amount) : 0;
      
      // Calculate collections
      const currentYearReceipts = committee.receipts.filter(r => r.financialYear === financialYear);
      const previousYear = getPreviousFinancialYear(financialYear);
      const previousYearReceipts = committee.receipts.filter(r => r.financialYear === previousYear);
      
      // Current month collections
      const currentMonthCurrent = currentYearReceipts
        .filter(r => new Date(r.date).toLocaleDateString('en-US', { month: 'long' }) === selectedMonth)
        .reduce((sum, r) => sum + Number(r.marketFee), 0);
      
      const currentMonthPrev = previousYearReceipts
        .filter(r => new Date(r.date).toLocaleDateString('en-US', { month: 'long' }) === selectedMonth)
        .reduce((sum, r) => sum + Number(r.marketFee), 0);
      
      // Progressive totals (up to selected month)
      const monthIndex = getMonthIndex(selectedMonth);
      const cumulativeMonths = getFinancialYearMonths().slice(0, monthIndex + 1);
      
      const progressiveTotal2025 = currentYearReceipts
        .filter(r => {
          const receiptMonth = new Date(r.date).toLocaleDateString('en-US', { month: 'long' });
          return cumulativeMonths.includes(receiptMonth);
        })
        .reduce((sum, r) => sum + Number(r.marketFee), 0);
      
      const progressiveTotal2024 = previousYearReceipts
        .filter(r => {
          const receiptMonth = new Date(r.date).toLocaleDateString('en-US', { month: 'long' });
          return cumulativeMonths.includes(receiptMonth);
        })
        .reduce((sum, r) => sum + Number(r.marketFee), 0);
      
      // Calculate cumulative target
      const cumulativeTarget = target?.monthlyTargets
        .filter(mt => cumulativeMonths.includes(getMonthName(mt.month)))
        .reduce((sum, mt) => sum + Number(mt.amount), 0) || 0;
      
      const percentageAchieved = yearlyTarget > 0 ? (progressiveTotal2025 / yearlyTarget) * 100 : 0;
      
      return {
        slNo: index + 1,
        amcName: committee.name,
        amcCode: committee.code,
        yearlyTarget: yearlyTarget / 100000, // Convert to lakhs
        monthlyTarget: monthlyTargetAmount / 100000,
        currentMonthPrev: currentMonthPrev / 100000,
        currentMonthCurrent: currentMonthCurrent / 100000,
        difference: (currentMonthCurrent - currentMonthPrev) / 100000,
        cumulativeTarget: cumulativeTarget / 100000,
        progressiveTotal2024: progressiveTotal2024 / 100000,
        progressiveTotal2025: progressiveTotal2025 / 100000,
        progressiveDifference: (progressiveTotal2025 - progressiveTotal2024) / 100000,
        percentageAchieved: Math.round(percentageAchieved),
      };
    });
    
    return successResponse({
      reportData,
      metadata: {
        financialYear,
        selectedMonth,
        generatedAt: new Date().toISOString(),
        totalCommittees: committees.length,
      },
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

function getPreviousFinancialYear(financialYear: string): string {
  const [startYear] = financialYear.split('-');
  const prevStartYear = parseInt(startYear) - 1;
  const prevEndYear = parseInt(startYear);
  return `${prevStartYear}-${prevEndYear.toString().slice(-2)}`;
}

function getFinancialYearMonths(): string[] {
  return ['April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March'];
}

function getMonthIndex(monthName: string): number {
  return getFinancialYearMonths().indexOf(monthName);
}

function getMonthName(month: string): string {
  const monthMap: Record<string, string> = {
    'APRIL': 'April',
    'MAY': 'May',
    'JUNE': 'June',
    'JULY': 'July',
    'AUGUST': 'August',
    'SEPTEMBER': 'September',
    'OCTOBER': 'October',
    'NOVEMBER': 'November',
    'DECEMBER': 'December',
    'JANUARY': 'January',
    'FEBRUARY': 'February',
    'MARCH': 'March',
  };
  return monthMap[month.toUpperCase()] || month;
}