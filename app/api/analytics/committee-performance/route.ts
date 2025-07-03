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
    const committeeId = searchParams.get('committeeId');
    
    // Get committee performance data
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
            ...(financialYear && { financialYear }),
          },
          select: {
            marketFee: true,
            date: true,
            commodity: true,
          },
        },
        targets: {
          where: {
            isActive: true,
            deletedAt: null,
            ...(financialYear && { financialYear }),
          },
          include: {
            monthlyTargets: true,
          },
        },
        checkposts: {
          where: { isActive: true, deletedAt: null },
          include: {
            receipts: {
              where: {
                isActive: true,
                deletedAt: null,
                natureOfReceipt: 'MF',
                ...(financialYear && { financialYear }),
              },
              select: { marketFee: true, date: true },
            },
          },
        },
      },
    });
    
    const performanceData = committees.map(committee => {
      const totalCollection = committee.receipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
      const yearlyTarget = committee.targets[0] ? Number(committee.targets[0].yearlyTarget) : 0;
      const achievement = yearlyTarget > 0 ? (totalCollection / yearlyTarget) * 100 : 0;
      
      // Monthly breakdown
      const monthlyData = Array.from({ length: 12 }, (_, i) => {
        const month = new Date(2024, i, 1).toLocaleDateString('en-US', { month: 'long' });
        const monthReceipts = committee.receipts.filter(r => 
          new Date(r.date).toLocaleDateString('en-US', { month: 'long' }) === month
        );
        const monthlyCollection = monthReceipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
        const monthlyTarget = committee.targets[0]?.monthlyTargets.find(
          mt => mt.month.toLowerCase() === month.toLowerCase()
        );
        
        return {
          month,
          collection: monthlyCollection,
          target: monthlyTarget ? Number(monthlyTarget.amount) : 0,
          achievement: monthlyTarget ? (monthlyCollection / Number(monthlyTarget.amount)) * 100 : 0,
        };
      });
      
      // Checkpost performance
      const checkpostPerformance = committee.checkposts.map(checkpost => ({
        id: checkpost.id,
        name: checkpost.name,
        collection: checkpost.receipts.reduce((sum, r) => sum + Number(r.marketFee), 0),
        receiptCount: checkpost.receipts.length,
      }));
      
      // Commodity breakdown
      const commodityBreakdown = committee.receipts.reduce((acc, receipt) => {
        const commodity = receipt.commodity;
        if (!acc[commodity]) {
          acc[commodity] = { count: 0, amount: 0 };
        }
        acc[commodity].count += 1;
        acc[commodity].amount += Number(receipt.marketFee);
        return acc;
      }, {} as Record<string, { count: number; amount: number }>);
      
      return {
        committee: {
          id: committee.id,
          name: committee.name,
          code: committee.code,
        },
        performance: {
          totalCollection,
          yearlyTarget,
          achievement: Math.round(achievement * 100) / 100,
          receiptCount: committee.receipts.length,
        },
        monthlyData,
        checkpostPerformance,
        commodityBreakdown: Object.entries(commodityBreakdown).map(([commodity, data]) => ({
          commodity,
          ...data,
        })),
      };
    });
    
    return successResponse(performanceData);
    
  } catch (error) {
    return handleApiError(error);
  }
}