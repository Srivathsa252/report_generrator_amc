import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, createReceiptSchema } from '@/lib/validation';
import { withTransaction, createAuditLog } from '@/lib/database-utils';
import { z } from 'zod';

const bulkReceiptSchema = z.object({
  receipts: z.array(createReceiptSchema).min(1, 'At least one receipt is required').max(100, 'Maximum 100 receipts allowed'),
});

export const POST = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validation = validateRequest(bulkReceiptSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { receipts } = validation.data;
    
    // Validate unique receipt numbers within the batch
    const receiptNumbers = receipts.map(r => `${r.bookNumber}-${r.receiptNumber}-${r.committeeId}`);
    const uniqueNumbers = new Set(receiptNumbers);
    
    if (receiptNumbers.length !== uniqueNumbers.size) {
      return errorResponse('Duplicate receipt numbers found in the batch', 400);
    }
    
    // Check for existing receipts in database
    const existingReceipts = await prisma.receipt.findMany({
      where: {
        OR: receipts.map(r => ({
          bookNumber: r.bookNumber,
          receiptNumber: r.receiptNumber,
          committeeId: r.committeeId,
        })),
        isActive: true,
        deletedAt: null,
      },
      select: { bookNumber: true, receiptNumber: true, committeeId: true },
    });
    
    if (existingReceipts.length > 0) {
      const duplicates = existingReceipts.map(r => `${r.bookNumber}-${r.receiptNumber}`);
      return errorResponse(`Duplicate receipts found: ${duplicates.join(', ')}`, 409);
    }
    
    // Use transaction for bulk insert
    const result = await withTransaction(async (tx) => {
      const createdReceipts = [];
      
      for (const receiptData of receipts) {
        const receipt = await tx.receipt.create({
          data: {
            ...receiptData,
            date: new Date(receiptData.date),
            createdBy: auth.userId,
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
        
        createdReceipts.push(receipt);
        
        // Create audit log for each receipt
        await createAuditLog(
          'receipts',
          receipt.id,
          'CREATE',
          null,
          receiptData,
          auth.userId
        );
      }
      
      return createdReceipts;
    });
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to create receipts', 500);
    }
    
    return successResponse({
      receipts: result.data,
      count: result.data?.length || 0,
    }, `Successfully created ${result.data?.length || 0} receipts`, 201);
    
  } catch (error) {
    return handleApiError(error);
  }
});