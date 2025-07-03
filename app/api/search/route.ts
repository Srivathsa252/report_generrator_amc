import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { validateRequest, paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validation = validateRequest(paginationSchema, queryParams);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { search, page, limit } = validation.data;
    const type = searchParams.get('type') || 'all'; // all, receipts, committees, checkposts
    
    if (!search || search.length < 2) {
      return errorResponse('Search query must be at least 2 characters', 400);
    }
    
    const results: any = {
      query: search,
      type,
      results: {},
    };
    
    const skip = (page - 1) * limit;
    
    if (type === 'all' || type === 'receipts') {
      const receipts = await prisma.receipt.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { receiptNumber: { contains: search, mode: 'insensitive' } },
            { bookNumber: { contains: search, mode: 'insensitive' } },
            { traderName: { contains: search, mode: 'insensitive' } },
            { payeeName: { contains: search, mode: 'insensitive' } },
            { commodity: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          committee: {
            select: { name: true, code: true },
          },
        },
        skip: type === 'receipts' ? skip : 0,
        take: type === 'receipts' ? limit : 5,
        orderBy: { createdAt: 'desc' },
      });
      
      results.results.receipts = receipts.map(receipt => ({
        id: receipt.id,
        type: 'receipt',
        title: `Receipt ${receipt.receiptNumber}`,
        subtitle: `${receipt.traderName} - ${receipt.committee?.name}`,
        amount: Number(receipt.marketFee),
        date: receipt.date,
        url: `/receipts/${receipt.id}`,
      }));
    }
    
    if (type === 'all' || type === 'committees') {
      const committees = await prisma.committee.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          _count: {
            select: {
              receipts: { where: { isActive: true, deletedAt: null } },
              checkposts: { where: { isActive: true, deletedAt: null } },
            },
          },
        },
        skip: type === 'committees' ? skip : 0,
        take: type === 'committees' ? limit : 5,
        orderBy: { name: 'asc' },
      });
      
      results.results.committees = committees.map(committee => ({
        id: committee.id,
        type: 'committee',
        title: committee.name,
        subtitle: `Code: ${committee.code}`,
        stats: {
          receipts: committee._count.receipts,
          checkposts: committee._count.checkposts,
        },
        url: `/committees/${committee.id}`,
      }));
    }
    
    if (type === 'all' || type === 'checkposts') {
      const checkposts = await prisma.checkpost.findMany({
        where: {
          isActive: true,
          deletedAt: null,
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { location: { contains: search, mode: 'insensitive' } },
          ],
        },
        include: {
          committee: {
            select: { name: true, code: true },
          },
          _count: {
            select: {
              receipts: { where: { isActive: true, deletedAt: null } },
            },
          },
        },
        skip: type === 'checkposts' ? skip : 0,
        take: type === 'checkposts' ? limit : 5,
        orderBy: { name: 'asc' },
      });
      
      results.results.checkposts = checkposts.map(checkpost => ({
        id: checkpost.id,
        type: 'checkpost',
        title: checkpost.name,
        subtitle: `${checkpost.committee.name} - ${checkpost.location || 'No location'}`,
        stats: {
          receipts: checkpost._count.receipts,
        },
        url: `/checkposts/${checkpost.id}`,
      }));
    }
    
    // Calculate total results
    const totalResults = Object.values(results.results).reduce(
      (sum: number, items: any) => sum + (Array.isArray(items) ? items.length : 0),
      0
    );
    
    results.totalResults = totalResults;
    results.pagination = {
      page,
      limit,
      hasMore: totalResults === limit,
    };
    
    return successResponse(results);
    
  } catch (error) {
    return handleApiError(error);
  }
}