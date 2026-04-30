import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * DEBUG ENDPOINT: Test AI usage logging and retrieval
 * POST: Insert a test record
 * GET: Retrieve all records
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[DEBUG] POST /api/debug/ai-usage - Creating test record...');

    const body = await request.json();

    const record = await prisma.aIUsageLog.create({
      data: {
        user_id: body.user_id || null,
        endpoint: body.endpoint || "debug-test",
        feature_name: body.feature_name || "Debug Test",
        input_tokens: body.input_tokens || 100,
        output_tokens: body.output_tokens || 50,
        total_tokens: body.total_tokens || 150,
        model_used: body.model_used || "debug",
        status: body.status || "success",
        error_message: body.error_message || null,
        response_time_ms: body.response_time_ms || 100,
        metadata: body.metadata || { debug: true },
      },
    });

    console.log('[DEBUG] Record created successfully:', record);

    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error('[DEBUG] Error creating record:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    console.log('[DEBUG] GET /api/debug/ai-usage - Retrieving all records...');

    // Get count
    const count = await prisma.aIUsageLog.count();
    console.log('[DEBUG] Total records in database:', count);

    // Get recent records
    const records = await prisma.aIUsageLog.findMany({
      take: 10,
      orderBy: { created_at: 'desc' },
    });

    console.log('[DEBUG] Retrieved', records.length, 'recent records');

    // Try aggregation like the dashboard does
    const aggregation = await prisma.aIUsageLog.groupBy({
      by: ['endpoint'],
      _count: {
        _all: true,
      },
      _sum: {
        input_tokens: true,
        output_tokens: true,
        total_tokens: true,
      },
    });

    console.log('[DEBUG] Aggregation result:', aggregation);

    return NextResponse.json(
      {
        success: true,
        summary: {
          totalCount: count,
          recentRecords: records.length,
          aggregationByEndpoint: aggregation,
        },
        recentRecords: records,
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    console.error('[DEBUG] Error retrieving records:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('[DEBUG] DELETE /api/debug/ai-usage - Deleting all debug records...');

    const result = await prisma.aIUsageLog.deleteMany({
      where: { metadata: { path: ['debug'], equals: true } },
    });

    console.log('[DEBUG] Deleted', result.count, 'records');

    return NextResponse.json({ success: true, deletedCount: result.count });
  } catch (error) {
    console.error('[DEBUG] Error deleting records:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
