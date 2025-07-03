import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const financialYear = searchParams.get('financialYear') || '2025-26';
    const month = searchParams.get('month');
    
    // Get current date for financial year calculation
    const currentDate = new Date();
    const currentFinancialYear = currentDate.getMonth() >= 3 ? 
      `${currentDate.getFullYear()}-${(currentDate.getFullYear() + 1).toString().slice(-2)}` :
      `${currentDate.getFullYear() - 1}-${currentDate.getFullYear().toString().slice(-2)}`;
    
    // Basic statistics
    const [
      totalCommittees,
      totalCheckposts,
      totalReceipts,
      totalTargets,
      totalMarketFee,
      currentYearReceipts,
      previousYearReceipts,
    ] = await Promise.all([
      prisma.committee.count({ where: { isActive: true, deletedAt: null } }),
      prisma.checkpost.count({ where: { isActive: true, deletedAt: null } }),
      prisma.receipt.count({ where: { isActive: true, deletedAt: null } }),
      prisma.target.count({ where: { isActive: true, deletedAt: null } }),
      prisma.receipt.aggregate({
        where: { isActive: true, deletedAt: null, natureOfReceipt: 'MF' },
        _sum: { marketFee: true },
      }),
      prisma.receipt.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          financialYear,
          natureOfReceipt: 'MF',
        },
        select: {
          marketFee: true,
          date: true,
          committeeId: true,
        },
      }),
      prisma.receipt.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          financialYear: getPreviousFinancialYear(financialYear),
          natureOfReceipt: 'MF',
        },
        select: {
          marketFee: true,
          date: true,
          committeeId: true,
        },
      }),
    ]);
    
    // Committee-wise performance
    const committees = await prisma.committee.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        receipts: {
          where: {
            isActive: true,
            deletedAt: null,
            financialYear,
            natureOfReceipt: 'MF',
          },
          select: { marketFee: true, date: true },
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
    
    // Calculate committee performance
    const committeePerformance = committees.map(committee => {
      const totalCollected = committee.receipts.reduce((sum, receipt) => sum + Number(receipt.marketFee), 0);
      const yearlyTarget = committee.targets[0]?.yearlyTarget || 0;
      const achievement = yearlyTarget > 0 ? (totalCollected / Number(yearlyTarget)) * 100 : 0;
      
      return {
        id: committee.id,
        name: committee.name,
        code: committee.code,
        totalCollected,
        yearlyTarget: Number(yearlyTarget),
        achievement: Math.round(achievement * 100) / 100,
        receiptCount: committee.receipts.length,
      };
    });
    
    // Monthly trends
    const monthlyTrends = getMonthlyTrends(currentYearReceipts, previousYearReceipts);
    
    // Top performing committees
    const topPerformers = committeePerformance
      .sort((a, b) => b.achievement - a.achievement)
      .slice(0, 5);
    
    // Recent receipts
    const recentReceipts = await prisma.receipt.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        committee: {
          select: { name: true, code: true },
        },
      },
    });
    
    const dashboardData = {
      overview: {
        totalCommittees,
        totalCheckposts,
        totalReceipts,
        totalTargets,
        totalMarketFee: Number(totalMarketFee._sum.marketFee || 0),
        currentYearCollection: currentYearReceipts.reduce((sum, r) => sum + Number(r.marketFee), 0),
        previousYearCollection: previousYearReceipts.reduce((sum, r) => sum + Number(r.marketFee), 0),
      },
      committeePerformance,
      monthlyTrends,
      topPerformers,
      recentReceipts: recentReceipts.map(receipt => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        date: receipt.date,
        traderName: receipt.traderName,
        marketFee: Number(receipt.marketFee),
        committee: receipt.committee,
        createdAt: receipt.createdAt,
      })),
    };
    
    return successResponse(dashboardData);
    
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

function getMonthlyTrends(currentYearReceipts: any[], previousYearReceipts: any[]) {
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  
  const currentYearData = months.map(month => {
    const monthReceipts = currentYearReceipts.filter(r => {
      const receiptMonth = new Date(r.date).toLocaleDateString('en-US', { month: 'short' });
      return receiptMonth === month;
    });
    return monthReceipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
  });
  
  const previousYearData = months.map(month => {
    const monthReceipts = previousYearReceipts.filter(r => {
      const receiptMonth = new Date(r.date).toLocaleDateString('en-US', { month: 'short' });
      return receiptMonth === month;
    });
    return monthReceipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
  });
  
  return {
    months,
    currentYear: currentYearData,
    previousYear: previousYearData,
  };
}