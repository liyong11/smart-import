// AI client - Alibaba Qwen via OpenAI-compatible API
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || '',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
});

export async function generateRuleFromFile(
  fileContent: string,
  fileName: string,
  fileType: string
): Promise<string> {
  const systemPrompt = `你是一个智能文件解析专家。用户会给你一个文件的内容预览，你需要分析其结构并生成一个JSON格式的解析规则。

规则格式说明：
- parsingMode: "standard"(标准表格) | "matrix"(矩阵转置) | "card"(卡片式) | "aggregation"(跨行聚合) | "text"(纯文本) | "composite"(复合)
- headerDetection: { mode: "rowIndex", rowIndex: 数字, skipRows: 跳过行数 }
- dataRange: { startRow: 数据起始行, endRow: 结束行(-1自动), endPattern: "结束标记正则" }
- fieldMappings: 字段映射数组，每项包含 sourceColumn(列索引) 和 targetField(目标字段)
- extractionZones: 特殊提取区域（如尾部的收货人信息）
- aggregation: { groupByField: "分组字段" }
- matrix: { fixedColumns: [固定列], pivotStartColumn: 转置起始列, pivotFieldMapping: "列头映射字段", valueField: "值字段" }
- card: { boundaryPattern: "边界正则", headerLines: 头部行数, fieldExtractPatterns: {字段: 正则} }

目标字段包括：externalCode, storeName, recipientName, recipientPhone, recipientAddress, skuCode, skuName, skuQuantity, skuSpec, remarks

请仔细分析文件结构，输出一个完整的JSON规则配置。只输出JSON，不要其他说明。`;

  const userPrompt = `文件名: ${fileName}
文件类型: ${fileType}

文件内容预览:
${fileContent.slice(0, 8000)}`;

  const response = await client.chat.completions.create({
    model: 'qwen-plus',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.1,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content || '{}';
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
  return jsonMatch[1]?.trim() || content.trim();
}

export { client };
