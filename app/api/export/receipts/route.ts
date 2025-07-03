import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { validateRequest, dateRangeSchema, paginationSchema } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams);
    
    const dateValidation = validateRequest(dateRangeSchema, queryParams);
    const paginationValidation = validateRequest(paginationSchema, queryParams);
    
    if (!dateValidation.success) {
      return errorResponse(dateValidation.error, 400);
    }
    
    if (!paginationValidation.success) {
      return errorResponse(paginationValidation.error, 400);
    }
    
    const { startDate, endDate, financialYear } = dateValidation.data;
    const format = searchParams.get('format') || 'json';
    
    const where = {
      isActive: true,
      deletedAt: null,
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
    
    const receipts = await prisma.receipt.findMany({
      where,
      include: {
        committee: {
          select: { id: true, name: true, code: true },
        },
        checkpost: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: { date: 'desc' },
    });
    
    if (format === 'csv') {
      const csvData = generateCSV(receipts);
      return new Response(csvData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="receipts-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }
    
    return successResponse({
      receipts: receipts.map(receipt => ({
        ...receipt,
        marketFee: Number(receipt.marketFee),
        transactionValue: Number(receipt.transactionValue),
      })),
      count: receipts.length,
      exportedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}

function generateCSV(receipts: any[]): string {
  const headers = [
    'Receipt Number',
    'Book Number',
    'Date',
    'Financial Year',
    'Trader Name',
    'Payee Name',
    'Commodity',
    'Transaction Value',
    'Market Fee',
    'Nature of Receipt',
    'Collection Location',
    'Committee Name',
    'Committee Code',
    'Checkpost Name',
    'Supervisor Name',
    'Created At',
  ];
  
  const rows = receipts.map(receipt => [
    receipt.receiptNumber,
    receipt.bookNumber,
    receipt.date.toISOString().split('T')[0],
    receipt.financialYear,
    receipt.traderName,
    receipt.payeeName,
    receipt.commodity,
    Number(receipt.transactionValue),
    Number(receipt.marketFee),
    receipt.natureOfReceipt,
    receipt.collectionLocation,
    receipt.committee?.name || '',
    receipt.committee?.code || '',
    receipt.checkpost?.name || '',
    receipt.supervisorName || '',
    receipt.createdAt.toISOString(),
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  
  return csvContent;
}