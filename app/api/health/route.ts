import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-response';
import { checkDatabaseHealth, getDatabaseStats } from '@/lib/database-utils';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth.status === 'unhealthy') {
      return errorResponse(`Database health check failed: ${dbHealth.error}`, 503);
    }
    
    const healthData: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };
    
    if (detailed) {
      try {
        const stats = await getDatabaseStats();
        healthData.databaseStats = stats;
      } catch (error) {
        healthData.databaseStats = { error: 'Failed to fetch database statistics' };
      }
    }
    
    return successResponse(healthData);
    
  } catch (error) {
    return errorResponse('Health check failed', 503);
  }
}