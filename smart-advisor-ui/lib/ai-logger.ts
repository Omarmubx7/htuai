import { prisma } from './prisma';

interface AIUsageLogData {
  userId?: number | null;
  endpoint: string;
  featureName?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  modelUsed?: string;
  status?: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  responseTimeMs?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Log AI usage to the database
 */
export async function logAIUsage(data: AIUsageLogData): Promise<void> {
  try {
    await prisma.aIUsageLog.create({
      data: {
        user_id: data.userId,
        endpoint: data.endpoint,
        feature_name: data.featureName,
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        total_tokens: data.totalTokens,
        model_used: data.modelUsed,
        status: data.status || 'success',
        error_message: data.errorMessage,
        response_time_ms: data.responseTimeMs,
        metadata: data.metadata || {},
      },
    });
  } catch (error) {
    // Silently fail - don't break the main flow if logging fails
    console.error('Failed to log AI usage:', error);
  }
}

/**
 * Get AI usage statistics for admin dashboard
 */
export async function getAIUsageStats(days: number = 7) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalCalls,
      callsByEndpoint,
      callsByModel,
      callsByStatus,
      totalTokens,
      avgResponseTime,
      recentLogs,
    ] = await Promise.all([
      // Total calls
      prisma.aIUsageLog.count({
        where: { created_at: { gte: cutoffDate } },
      }),

      // Calls by endpoint
      prisma.aIUsageLog.groupBy({
        by: ['endpoint'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
        orderBy: { _count: { endpoint: 'desc' } },
      }),

      // Calls by model
      prisma.aIUsageLog.groupBy({
        by: ['model_used'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
        orderBy: { _count: { model_used: 'desc' } },
      }),

      // Calls by status
      prisma.aIUsageLog.groupBy({
        by: ['status'],
        where: { created_at: { gte: cutoffDate } },
        _count: true,
      }),

      // Total tokens
      prisma.aIUsageLog.aggregate({
        where: { created_at: { gte: cutoffDate } },
        _sum: {
          total_tokens: true,
          input_tokens: true,
          output_tokens: true,
        },
      }),

      // Average response time
      prisma.aIUsageLog.aggregate({
        where: {
          created_at: { gte: cutoffDate },
          response_time_ms: { not: null },
        },
        _avg: { response_time_ms: true },
      }),

      // Recent logs
      prisma.aIUsageLog.findMany({
        where: { created_at: { gte: cutoffDate } },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: { user: { select: { student_id: true, email: true } } },
      }),
    ]);

    return {
      totalCalls,
      callsByEndpoint: callsByEndpoint.map(item => ({
        endpoint: item.endpoint,
        count: item._count._all,
      })),
      callsByModel: callsByModel.map(item => ({
        model: item.model_used || 'unknown',
        count: item._count._all,
      })),
      callsByStatus: callsByStatus.map(item => ({
        status: item.status,
        count: item._count._all,
      })),
      totalTokens: {
        input: totalTokens._sum.input_tokens || 0,
        output: totalTokens._sum.output_tokens || 0,
        total: totalTokens._sum.total_tokens || 0,
      },
      avgResponseTimeMs: avgResponseTime._avg.response_time_ms || 0,
      recentLogs: recentLogs.map(log => ({
        id: log.id,
        endpoint: log.endpoint,
        featureName: log.feature_name,
        studentId: log.user?.student_id,
        email: log.user?.email,
        status: log.status,
        totalTokens: log.total_tokens,
        responseTimeMs: log.response_time_ms,
        createdAt: log.created_at,
      })),
    };
  } catch (error) {
    console.error('Failed to get AI usage stats:', error);
    return null;
  }
}

/**
 * Get AI usage stats by endpoint
 */
export async function getEndpointStats(endpoint: string, days: number = 7) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await prisma.aIUsageLog.aggregate({
      where: {
        endpoint,
        created_at: { gte: cutoffDate },
      },
      _count: true,
      _sum: {
        total_tokens: true,
        input_tokens: true,
        output_tokens: true,
        response_time_ms: true,
      },
      _avg: { response_time_ms: true },
    });

    const errorCount = await prisma.aIUsageLog.count({
      where: {
        endpoint,
        created_at: { gte: cutoffDate },
        status: { not: 'success' },
      },
    });

    return {
      endpoint,
      totalCalls: stats._count,
      successRate: stats._count > 0 ? Math.round(((stats._count - errorCount) / stats._count) * 100) : 0,
      totalTokens: stats._sum.total_tokens || 0,
      inputTokens: stats._sum.input_tokens || 0,
      outputTokens: stats._sum.output_tokens || 0,
      avgResponseTimeMs: Math.round(stats._avg.response_time_ms || 0),
      errorCount,
    };
  } catch (error) {
    console.error('Failed to get endpoint stats:', error);
    return null;
  }
}
