import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, createTargetSchema, paginationSchema } from '@/lib/validation';
import { paginate, createAuditLog, withTransaction } from '@/lib/database-utils';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const validation = validateRequest(paginationSchema, queryParams);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { page, limit, sortBy, sortOrder } = validation.data;
    
    const where = {
      isActive: true,
      deletedAt: null,
      ...(queryParams.committeeId && { committeeId: queryParams.committeeId }),
      ...(queryParams.financialYear && { financialYear: queryParams.financialYear }),
    };
    
    const orderBy = sortBy ? { [sortBy]: sortOrder } : { financialYear: sortOrder };
    
    const result = await paginate(prisma.target, {
      page,
      limit,
      where,
      orderBy,
      include: {
        committee: {
          select: { id: true, name: true, code: true },
        },
        monthlyTargets: {
          orderBy: { month: 'asc' },
        },
        checkpostTargets: {
          include: {
            checkpost: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ checkpost: { name: 'asc' } }, { month: 'asc' }],
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
    const validation = validateRequest(createTargetSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { committeeId, financialYear, yearlyTarget, description, monthlyTargets, checkpostTargets } = validation.data;
    
    // Use transaction to ensure data consistency
    const result = await withTransaction(async (tx) => {
      // Create target
      const target = await tx.target.create({
        data: {
          committeeId,
          financialYear,
          yearlyTarget,
          description,
          createdBy: auth.userId,
        },
      });
      
      // Create monthly targets
      if (monthlyTargets && monthlyTargets.length > 0) {
        await tx.monthlyTarget.createMany({
          data: monthlyTargets.map(mt => ({
            targetId: target.id,
            month: mt.month,
            amount: mt.amount,
          })),
        });
      }
      
      // Create checkpost targets
      if (checkpostTargets && checkpostTargets.length > 0) {
        await tx.checkpostTarget.createMany({
          data: checkpostTargets.map(ct => ({
            targetId: target.id,
            checkpostId: ct.checkpostId,
            month: ct.month,
            amount: ct.amount,
          })),
        });
      }
      
      // Return complete target with relations
      return tx.target.findUnique({
        where: { id: target.id },
        include: {
          committee: {
            select: { id: true, name: true, code: true },
          },
          monthlyTargets: true,
          checkpostTargets: {
            include: {
              checkpost: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });
    });
    
    if (!result.success || !result.data) {
      return errorResponse(result.error || 'Failed to create target', 500);
    }
    
    // Create audit log
    await createAuditLog(
      'targets',
      result.data.id,
      'CREATE',
      null,
      validation.data,
      auth.userId
    );
    
    return successResponse(result.data, 'Target created successfully', 201);
    
  } catch (error) {
    return handleApiError(error);
  }
});