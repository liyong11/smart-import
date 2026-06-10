import { NextRequest, NextResponse } from 'next/server';
import { getRules, saveRule, deleteRule, initDatabase } from '@/lib/db';

export async function GET() {
  try {
    await initDatabase();
    const rules = await getRules();
    return NextResponse.json({ rules });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, rules: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const body = await req.json();
    await saveRule(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少规则ID' }, { status: 400 });
    await deleteRule(id);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
