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
    const period = searchParams.get('period') || 'monthly'; // monthly, quarterly, yearly
    const committeeId = searchParams.get('committeeId');
    
    // Get receipts for trend analysis
    const receipts = await prisma.receipt.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        natureOfReceipt: 'MF',
        ...(financialYear && { financialYear }),
        ...(committeeId && { committeeId }),
      },
      select: {
        marketFee: true,
        date: true,
        committeeId: true,
        commodity: true,
      },
      orderBy: { date: 'asc' },
    });
    
    // Generate trend data based on period
    let trendData: any[] = [];
    
    if (period === 'monthly') {
      trendData = generateMonthlyTrends(receipts);
    } else if (period === 'quarterly') {
      trendData = generateQuarterlyTrends(receipts);
    } else if (period === 'yearly') {
      trendData = generateYearlyTrends(receipts);
    }
    
    // Calculate growth rates
    const trendsWithGrowth = trendData.map((item, index) => {
      const previousItem = trendData[index - 1];
      const growthRate = previousItem && previousItem.amount > 0 
        ? ((item.amount - previousItem.amount) / previousItem.amount) * 100 
        : 0;
      
      return {
        ...item,
        growthRate: Math.round(growthRate * 100) / 100,
      };
    });
    
    // Calculate commodity trends
    const commodityTrends = generateCommodityTrends(receipts);
    
    // Calculate seasonal patterns
    const seasonalPatterns = generateSeasonalPatterns(receipts);
    
    return successResponse({
      trends: trendsWithGrowth,
      commodityTrends,
      seasonalPatterns,
      summary: {
        totalAmount: receipts.reduce((sum, r) => sum + Number(r.marketFee), 0),
        totalReceipts: receipts.length,
        averageAmount: receipts.length > 0 ? receipts.reduce((sum, r) => sum + Number(r.marketFee), 0) / receipts.length : 0,
        period,
        financialYear,
      },
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

function generateMonthlyTrends(receipts: any[]) {
  const monthlyData = new Map();
  
  receipts.forEach(receipt => {
    const date = new Date(receipt.date);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    if (!monthlyData.has(key)) {
      monthlyData.set(key, {
        period: monthName,
        amount: 0,
        count: 0,
        date: new Date(date.getFullYear(), date.getMonth(), 1),
      });
    }
    
    const data = monthlyData.get(key);
    data.amount += Number(receipt.marketFee);
    data.count += 1;
  });
  
  return Array.from(monthlyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function generateQuarterlyTrends(receipts: any[]) {
  const quarterlyData = new Map();
  
  receipts.forEach(receipt => {
    const date = new Date(receipt.date);
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const key = `${date.getFullYear()}-Q${quarter}`;
    
    if (!quarterlyData.has(key)) {
      quarterlyData.set(key, {
        period: `Q${quarter} ${date.getFullYear()}`,
        amount: 0,
        count: 0,
        date: new Date(date.getFullYear(), (quarter - 1) * 3, 1),
      });
    }
    
    const data = quarterlyData.get(key);
    data.amount += Number(receipt.marketFee);
    data.count += 1;
  });
  
  return Array.from(quarterlyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function generateYearlyTrends(receipts: any[]) {
  const yearlyData = new Map();
  
  receipts.forEach(receipt => {
    const date = new Date(receipt.date);
    const year = date.getFullYear();
    
    if (!yearlyData.has(year)) {
      yearlyData.set(year, {
        period: year.toString(),
        amount: 0,
        count: 0,
        date: new Date(year, 0, 1),
      });
    }
    
    const data = yearlyData.get(year);
    data.amount += Number(receipt.marketFee);
    data.count += 1;
  });
  
  return Array.from(yearlyData.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

function generateCommodityTrends(receipts: any[]) {
  const commodityData = new Map();
  
  receipts.forEach(receipt => {
    const commodity = receipt.commodity;
    
    if (!commodityData.has(commodity)) {
      commodityData.set(commodity, {
        commodity,
        amount: 0,
        count: 0,
        percentage: 0,
      });
    }
    
    const data = commodityData.get(commodity);
    data.amount += Number(receipt.marketFee);
    data.count += 1;
  });
  
  const totalAmount = receipts.reduce((sum, r) => sum + Number(r.marketFee), 0);
  
  return Array.from(commodityData.values())
    .map(item => ({
      ...item,
      percentage: totalAmount > 0 ? (item.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function generateSeasonalPatterns(receipts: any[]) {
  const seasonalData = new Map();
  const seasons = {
    'Spring': [2, 3, 4], // Mar, Apr, May
    'Summer': [5, 6, 7], // Jun, Jul, Aug
    'Monsoon': [8, 9, 10], // Sep, Oct, Nov
    'Winter': [11, 0, 1], // Dec, Jan, Feb
  };
  
  // Initialize seasons
  Object.keys(seasons).forEach(season => {
    seasonalData.set(season, { season, amount: 0, count: 0 });
  });
  
  receipts.forEach(receipt => {
    const month = new Date(receipt.date).getMonth();
    
    for (const [season, months] of Object.entries(seasons)) {
      if (months.includes(month)) {
        const data = seasonalData.get(season);
        data.amount += Number(receipt.marketFee);
        data.count += 1;
        break;
      }
    }
  });
  
  return Array.from(seasonalData.values());
}