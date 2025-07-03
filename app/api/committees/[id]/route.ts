import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, updateCommitteeSchema } from '@/lib/validation';
import { createAuditLog, softDelete } from '@/lib/database-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const committee = await prisma.committee.findFirst({
      where: {
        id: params.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        checkposts: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
        },
        targets: {
          where: { isActive: true, deletedAt: null },
          include: {
            monthlyTargets: true,
            checkpostTargets: {
              include: { checkpost: true },
            },
          },
          orderBy: { financialYear: 'desc' },
        },
        _count: {
          select: {
            receipts: { where: { isActive: true, deletedAt: null } },
          },
        },
      },
    });
    
    if (!committee) {
      return errorResponse('Committee not found', 404);
    }
    
    return successResponse(committee);
    
  } catch (error) {
    return handleApiError(error);
  }
}

export const PUT = requireAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: { id: string } }
) => {
  try {
    const body = await request.json();
    const validation = validateRequest(updateCommitteeSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    // Get current committee for audit log
    const currentCommittee = await prisma.committee.findFirst({
      where: { id: params.id, isActive: true, deletedAt: null },
    });
    
    if (!currentCommittee) {
      return errorResponse('Committee not found', 404);
    }
    
    const updatedCommittee = await prisma.committee.update({
      where: { id: params.id },
      data: {
        ...validation.data,
        updatedAt: new Date(),
      },
      include: {
        checkposts: {
          where: { isActive: true, deletedAt: null },
        },
      },
    });
    
    // Create audit log
    await createAuditLog(
      'committees',
      params.id,
      'UPDATE',
      currentCommittee,
      validation.data,
      auth.userId
    );
    
    return successResponse(updatedCommittee, 'Committee updated successfully');
    
  } catch (error) {
    return handleApiError(error);
  }
});

export const DELETE = requireAuth(async (
  request: NextRequest,
  auth,
  { params }: { params: { id: string } }
) => {
  try {
    // Get current committee for audit log
    const currentCommittee = await prisma.committee.findFirst({
      where: { id: params.id, isActive: true, deletedAt: null },
    });
    
    if (!currentCommittee) {
      return errorResponse('Committee not found', 404);
    }
    
    // Soft delete committee
    const result = await softDelete(prisma.committee, params.id);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to delete committee', 500);
    }
    
    // Create audit log
    await createAuditLog(
      'committees',
      params.id,
      'DELETE',
      currentCommittee,
      null,
      auth.userId
    );
    
    return successResponse(null, 'Committee deleted successfully');
    
  } catch (error) {
    return handleApiError(error);
  }
});