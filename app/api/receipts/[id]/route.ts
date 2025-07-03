import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, updateReceiptSchema } from '@/lib/validation';
import { createAuditLog, softDelete } from '@/lib/database-utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const receipt = await prisma.receipt.findFirst({
      where: {
        id: params.id,
        isActive: true,
        deletedAt: null,
      },
      include: {
        committee: {
          select: { id: true, name: true, code: true },
        },
        checkpost: {
          select: { id: true, name: true, location: true },
        },
      },
    });
    
    if (!receipt) {
      return errorResponse('Receipt not found', 404);
    }
    
    return successResponse(receipt);
    
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
    const validation = validateRequest(updateReceiptSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    // Get current receipt for audit log
    const currentReceipt = await prisma.receipt.findFirst({
      where: { id: params.id, isActive: true, deletedAt: null },
    });
    
    if (!currentReceipt) {
      return errorResponse('Receipt not found', 404);
    }
    
    const updateData = {
      ...validation.data,
      ...(validation.data.date && { date: new Date(validation.data.date) }),
      updatedBy: auth.userId,
      updatedAt: new Date(),
    };
    
    const updatedReceipt = await prisma.receipt.update({
      where: { id: params.id },
      data: updateData,
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
      params.id,
      'UPDATE',
      currentReceipt,
      updateData,
      auth.userId
    );
    
    return successResponse(updatedReceipt, 'Receipt updated successfully');
    
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
    // Get current receipt for audit log
    const currentReceipt = await prisma.receipt.findFirst({
      where: { id: params.id, isActive: true, deletedAt: null },
    });
    
    if (!currentReceipt) {
      return errorResponse('Receipt not found', 404);
    }
    
    // Soft delete receipt
    const result = await softDelete(prisma.receipt, params.id);
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to delete receipt', 500);
    }
    
    // Create audit log
    await createAuditLog(
      'receipts',
      params.id,
      'DELETE',
      currentReceipt,
      null,
      auth.userId
    );
    
    return successResponse(null, 'Receipt deleted successfully');
    
  } catch (error) {
    return handleApiError(error);
  }
});