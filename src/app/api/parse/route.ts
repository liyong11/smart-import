import { NextRequest, NextResponse } from 'next/server';
import { parseExcelToSheets, parsePdfToSheets, parseWordToSheets } from '@/lib/file-parsers';
import { RuleEngine } from '@/lib/rule-engine';
import { getRule } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const ruleId = formData.get('ruleId') as string;

    if (!file) return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    if (!ruleId) return NextResponse.json({ error: '未选择解析规则' }, { status: 400 });

    // Get rule from DB
    const rule = await getRule(ruleId);
    if (!rule) return NextResponse.json({ error: '规则不存在' }, { status: 404 });

    // Parse file to raw data
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();

    let sheets;
    if (ext === 'xlsx' || ext === 'xls') {
      sheets = parseExcelToSheets(buffer);
    } else if (ext === 'pdf') {
      sheets = await parsePdfToSheets(buffer);
    } else if (ext === 'docx') {
      sheets = await parseWordToSheets(buffer);
    } else {
      return NextResponse.json({ error: '不支持的文件格式' }, { status: 400 });
    }

    // Execute rule engine
    const engine = new RuleEngine(rule as any);
    const result = engine.execute(sheets);

    return NextResponse.json({
      records: result.records,
      errors: result.errors,
      totalRows: result.totalRows,
      parsedRows: result.parsedRows,
      success: result.success,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || '解析失败' }, { status: 500 });
  }
}
