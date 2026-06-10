import { NextRequest, NextResponse } from 'next/server';
import { saveOrders, getOrders, initDatabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const result = await getOrders({ search, page, pageSize });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, rows: [], total: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    const { orders, fileName, ruleName } = body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: '无有效订单数据' }, { status: 400 });
    }

    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await saveOrders(orders, fileName || '', ruleName || '', batchId);

    return NextResponse.json({
      success: true,
      batchId,
      totalCount: orders.length,
      successCount: orders.length,
      failedCount: 0,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
