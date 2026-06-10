import { NextRequest, NextResponse } from 'next/server';
import { parseExcelToSheets, parsePdfToSheets, parseWordToSheets, getFilePreview } from '@/lib/file-parsers';
import { generateRuleFromFile } from '@/lib/ai';
import { saveRule } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) return NextResponse.json({ error: '未上传文件' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop()?.toLowerCase();

    // Parse file to get preview content
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

    // Get file preview for AI
    const preview = getFilePreview(sheets, 40);
    const fileType = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'xlsx';

    // Call AI to generate rule
    const ruleJson = await generateRuleFromFile(preview, file.name, fileType);
    
    let config;
    try {
      config = JSON.parse(ruleJson);
    } catch {
      return NextResponse.json({ error: 'AI生成的规则格式异常，请重试', raw: ruleJson }, { status: 500 });
    }

    // Save rule to DB
    const ruleId = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const rule = {
      id: ruleId,
      name: `AI生成 - ${file.name}`,
      description: `由AI根据文件 ${file.name} 自动生成的解析规则`,
      fileType,
      config,
    };

    await saveRule(rule);

    return NextResponse.json({ 
      ruleId, 
      rule,
      message: '规则生成成功' 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'AI规则生成失败' }, { status: 500 });
  }
}
