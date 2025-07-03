import { NextRequest } from 'next/server';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { requireRole } from '@/lib/auth';
import { exportData } from '@/lib/database-utils';

export const GET = requireRole(['ADMIN'])(async (request: NextRequest, auth) => {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const includeAuditLogs = searchParams.get('includeAuditLogs') === 'true';
    
    const result = await exportData();
    
    if (!result.success) {
      return errorResponse(result.error || 'Failed to create backup', 500);
    }
    
    const backupData = {
      ...result.data,
      metadata: {
        createdBy: auth.userId,
        createdAt: new Date().toISOString(),
        version: '1.0.0',
        includeAuditLogs,
      },
    };
    
    if (format === 'json') {
      return new Response(JSON.stringify(backupData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="amc-backup-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }
    
    return successResponse(backupData, 'Backup created successfully');
    
  } catch (error) {
    return handleApiError(error);
  }
});