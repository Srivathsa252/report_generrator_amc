import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, createReceiptSchema, paginationSchema, dateRangeSchema } from '@/lib/validation';
import { paginate, createAuditLog } from '@/lib/database-utils';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const paginationValidation = validateRequest(paginationSchema, queryParams);
    const dateRangeValidation = validateRequest(dateRangeSchema, queryParams);
    
    if (!paginationValidation.success) {
      return errorResponse(paginationValidation.error, 400);
    }
    
    if (!dateRangeValidation.success) {
      return errorResponse(dateRangeValidation.error, 400);
    }
    
    const { page, limit, search, sortBy, sortOrder } = paginationValidation.data;
    const { startDate, endDate, financialYear } = dateRangeValidation.data;
    
    const where = {
      isActive: true,
      deletedAt: null,
      ...(search && {
        OR: [
          { receiptNumber: { contains: search, mode: 'insensitive' as const } },
          { traderName: { contains: search, mode: 'insensitive' as const } },
          { payeeName: { contains: search, mode: 'insensitive' as const } },
          { commodity: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(startDate && endDate && {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
      ...(financialYear && { financialYear }),
      ...(queryParams.committeeId && { committeeId: queryParams.committeeId }),
      ...(queryParams.checkpostId && { checkpostId: queryParams.checkpostId }),
      ...(queryParams.natureOfReceipt && { natureOfReceipt: queryParams.natureOfReceipt }),
    };
    
    const orderBy = sortBy ? { [sortBy]: sortOrder } : { date: sortOrder };
    
    const result = await paginate(prisma.receipt, {
      page,
      limit,
      where,
      orderBy,
      include: {
        committee: {
          select: { id: true, name: true, code: true },
        },
        checkpost: {
          select: { id: true, name: true, location: true },
        },
      },
    });
    
    return paginatedResponse(result.data, result.pagination);
    
  } catch (error) {
    return handleApiError(error);
  }
};

export const POST = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validation = validateRequest(createReceiptSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const receiptData = {
      ...validation.data,
      date: new Date(validation.data.date),
      createdBy: auth.userId,
    };
    
    const receipt = await prisma.receipt.create({
      data: receiptData,
      include: {
        committee: {
          select: { id: true, name: true, code: true },
        },
        checkpost: {
          select: { id: true, name: true, location: true },
        },
      },
    });
    
    // Create audit log
    await createAuditLog(
      'receipts',
      receipt.id,
      'CREATE',
      null,
      receiptData,
      auth.userId
    );
    
    return successResponse(receipt, 'Receipt created successfully', 201);
    
  } catch (error) {
    return handleApiError(error);
  }
});