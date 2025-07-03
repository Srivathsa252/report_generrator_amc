import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, createCommitteeSchema, paginationSchema } from '@/lib/validation';
import { paginate, createAuditLog } from '@/lib/database-utils';

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const queryValidation = validateRequest(paginationSchema, Object.fromEntries(searchParams));
    
    if (!queryValidation.success) {
      return errorResponse(queryValidation.error, 400);
    }
    
    const { page, limit, search, sortBy, sortOrder } = queryValidation.data;
    
    const where = {
      isActive: true,
      deletedAt: null,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };
    
    const orderBy = sortBy ? { [sortBy]: sortOrder } : { createdAt: sortOrder };
    
    const result = await paginate(prisma.committee, {
      page,
      limit,
      where,
      orderBy,
      include: {
        checkposts: {
          where: { isActive: true, deletedAt: null },
          select: { id: true, name: true, location: true },
        },
        _count: {
          select: {
            receipts: { where: { isActive: true, deletedAt: null } },
            targets: { where: { isActive: true, deletedAt: null } },
          },
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
    const validation = validateRequest(createCommitteeSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const committee = await prisma.committee.create({
      data: validation.data,
      include: {
        checkposts: {
          where: { isActive: true, deletedAt: null },
        },
      },
    });
    
    // Create audit log
    await createAuditLog(
      'committees',
      committee.id,
      'CREATE',
      null,
      validation.data,
      auth.userId
    );
    
    return successResponse(committee, 'Committee created successfully', 201);
    
  } catch (error) {
    return handleApiError(error);
  }
});