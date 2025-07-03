import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateRequest, createReceiptSchema } from '@/lib/validation';
import { withTransaction, createAuditLog } from '@/lib/database-utils';
import { z } from 'zod';

const importReceiptsSchema = z.object({
  receipts: z.array(z.object({
    bookNumber: z.string(),
    receiptNumber: z.string(),
    date: z.string(),
    traderName: z.string(),
    payeeName: z.string(),
    commodity: z.string(),
    transactionValue: z.number(),
    marketFee: z.number(),
    natureOfReceipt: z.enum(['MF', 'OTHERS']),
    natureOfReceiptOther: z.string().optional(),
    collectionLocation: z.enum(['OFFICE', 'CHECKPOST', 'SUPERVISOR']),
    collectionLocationOther: z.string().optional(),
    checkpostName: z.string().optional(),
    supervisorName: z.string().optional(),
    committeeCode: z.string(),
    financialYear: z.string(),
    remarks: z.string().optional(),
  })),
  validateOnly: z.boolean().default(false),
});

export const POST = requireAuth(async (request: NextRequest, auth) => {
  try {
    const body = await request.json();
    const validation = validateRequest(importReceiptsSchema, body);
    
    if (!validation.success) {
      return errorResponse(validation.error, 400);
    }
    
    const { receipts, validateOnly } = validation.data;
    
    // Get committee mappings
    const committees = await prisma.committee.findMany({
      where: { isActive: true, deletedAt: null },
      include: {
        checkposts: {
          where: { isActive: true, deletedAt: null },
        },
      },
    });
    
    const committeeMap = new Map(committees.map(c => [c.code, c]));
    
    // Validate and transform receipts
    const validationErrors: string[] = [];
    const transformedReceipts: any[] = [];
    
    for (let i = 0; i < receipts.length; i++) {
      const receipt = receipts[i];
      const rowNum = i + 1;
      
      // Find committee
      const committee = committeeMap.get(receipt.committeeCode);
      if (!committee) {
        validationErrors.push(`Row ${rowNum}: Committee with code '${receipt.committeeCode}' not found`);
        continue;
      }
      
      // Find checkpost if specified
      let checkpostId: string | undefined;
      if (receipt.checkpostName && receipt.collectionLocation === 'CHECKPOST') {
        const checkpost = committee.checkposts.find(cp => cp.name === receipt.checkpostName);
        if (!checkpost) {
          validationErrors.push(`Row ${rowNum}: Checkpost '${receipt.checkpostName}' not found for committee '${receipt.committeeCode}'`);
          continue;
        }
        checkpostId = checkpost.id;
      }
      
      // Validate receipt data
      const receiptValidation = validateRequest(createReceiptSchema, {
        ...receipt,
        committeeId: committee.id,
        checkpostId,
      });
      
      if (!receiptValidation.success) {
        validationErrors.push(`Row ${rowNum}: ${receiptValidation.error}`);
        continue;
      }
      
      transformedReceipts.push(receiptValidation.data);
    }
    
    if (validationErrors.length > 0) {
      return errorResponse(`Validation failed:\n${validationErrors.join('\n')}`, 400);
    }
    
    if (validateOnly) {
      return successResponse({
        valid: true,
        count: transformedReceipts.length,
        message: `${transformedReceipts.length} receipts are valid and ready for import`,
      });
    }
    
    // Check for duplicate receipts
    const existingReceipts = await prisma.receipt.findMany({
      where: {
        OR: transformedReceipts.map(r => ({
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
    
    // Import receipts
    const result = await withTransaction(async (tx) => {
      const createdReceipts = [];
      
      for (const receiptData of transformedReceipts) {
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
        
        // Create audit log
        await createAuditLog(
          'receipts',
          receipt.id,
          'CREATE',
          null,
          { ...receiptData, importedBy: auth.userId },
          auth.userId
        );
      }
      
      return createdReceipts;
    });
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to import receipts', 500);
    }
    
    return successResponse({
      receipts: result.data,
      count: result.data?.length || 0,
      importedAt: new Date().toISOString(),
    }, `Successfully imported ${result.data?.length || 0} receipts`, 201);
    
  } catch (error) {
    return handleApiError(error);
  }
});