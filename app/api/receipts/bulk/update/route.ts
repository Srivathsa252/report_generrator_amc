import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, updateReceiptSchema } from '@/lib/validation';
import { withTransaction, createAuditLog } from '@/lib/database-utils';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string().min(1, 'Receipt ID is required'),
    data: updateReceiptSchema,
  })).min(1, 'At least one update is required').max(50, 'Maximum 50 updates allowed'),
});

export const PUT = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validation = validateRequest(bulkUpdateSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { updates } = validation.data;
    
    // Validate all receipt IDs exist
    const receiptIds = updates.map(u => u.id);
    const existingReceipts = await prisma.receipt.findMany({
      where: {
        id: { in: receiptIds },
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    
    const existingIds = existingReceipts.map(r => r.id);
    const missingIds = receiptIds.filter(id => !existingIds.includes(id));
    
    if (missingIds.length > 0) {
      return errorResponse(`Receipts not found: ${missingIds.join(', ')}`, 404);
    }
    
    // Use transaction for bulk update
    const result = await withTransaction(async (tx) => {
      const updatedReceipts = [];
      
      for (const update of updates) {
        // Get current receipt for audit log
        const currentReceipt = await tx.receipt.findUnique({
          where: { id: update.id },
        });
        
        if (!currentReceipt) continue;
        
        const updateData = {
          ...update.data,
          ...(update.data.date && { date: new Date(update.data.date) }),
          updatedBy: auth.userId,
          updatedAt: new Date(),
        };
        
        const updatedReceipt = await tx.receipt.update({
          where: { id: update.id },
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
        
        updatedReceipts.push(updatedReceipt);
        
        // Create audit log
        await createAuditLog(
          'receipts',
          update.id,
          'UPDATE',
          currentReceipt,
          updateData,
          auth.userId
        );
      }
      
      return updatedReceipts;
    });
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to update receipts', 500);
    }
    
    return successResponse({
      receipts: result.data,
      count: result.data?.length || 0,
    }, `Successfully updated ${result.data?.length || 0} receipts`);
    
  } catch (error) {
    return handleApiError(error);
  }
});