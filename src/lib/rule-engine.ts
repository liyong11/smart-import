// Core Rule Engine - parses any file using configured rules
import { ParseRule, RuleConfig, OrderRecord, ParseResult, ParseError, FieldMapping, ExtractionZone } from '@/types';

export class RuleEngine {
  private rule: ParseRule;

  constructor(rule: ParseRule) {
    this.rule = rule;
  }

  /**
   * Execute parsing on raw file data (2D array for Excel, text for PDF/Word)
   */
  execute(data: SheetData[]): ParseResult {
    const config = this.rule.config;
    const errors: ParseError[] = [];
    let records: OrderRecord[] = [];

    try {
      switch (config.parsingMode) {
        case 'standard':
          records = this.parseStandard(data, config, errors);
          break;
        case 'matrix':
          records = this.parseMatrix(data, config, errors);
          break;
        case 'card':
          records = this.parseCard(data, config, errors);
          break;
        case 'aggregation':
          records = this.parseAggregation(data, config, errors);
          break;
        case 'text':
          records = this.parseText(data, config, errors);
          break;
        case 'composite':
          records = this.parseComposite(data, config, errors);
          break;
        default:
          errors.push({ message: `Unknown parsing mode: ${config.parsingMode}`, severity: 'error' });
      }
    } catch (e: any) {
      errors.push({ message: `Parse error: ${e.message}`, severity: 'error' });
    }

    return {
      success: errors.filter(e => e.severity === 'error').length === 0,
      records,
      errors,
      totalRows: data.reduce((sum, s) => sum + s.rows.length, 0),
      parsedRows: records.length,
    };
  }

  private parseStandard(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    const records: OrderRecord[] = [];
    const sheets = this.selectSheets(data, config);

    for (const sheet of sheets) {
      const { rows } = sheet;
      const headerRow = config.headerDetection.rowIndex ?? (config.headerDetection.skipRows ?? 0);
      const startRow = (config.dataRange?.startRow ?? headerRow + 1);
      const endRow = config.dataRange?.endRow ?? rows.length;

      for (let i = startRow; i < Math.min(endRow, rows.length); i++) {
        const row = rows[i];
        if (!row || row.every(cell => !cell && cell !== 0)) continue;

        // Check end pattern
        if (config.dataRange?.endPattern) {
          const rowText = row.join(' ');
          if (new RegExp(config.dataRange.endPattern).test(rowText)) break;
        }

        const record = this.mapRowToRecord(row, config.fieldMappings);
        if (record) {
          // Apply extraction zones (footer info etc)
          this.applyExtractionZones(record, rows, config.extractionZones);
          records.push(record);
        }
      }
    }

    return records;
  }

  private parseMatrix(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    const records: OrderRecord[] = [];
    const sheets = this.selectSheets(data, config);
    const matrix = config.matrix;
    if (!matrix) {
      errors.push({ message: 'Matrix config missing', severity: 'error' });
      return records;
    }

    for (const sheet of sheets) {
      const { rows } = sheet;
      const headerRow = config.headerDetection.rowIndex ?? 0;
      const headers = rows[headerRow] || [];
      const startRow = (config.dataRange?.startRow ?? headerRow + 1);

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(cell => !cell && cell !== 0)) continue;
        if (config.dataRange?.endPattern && new RegExp(config.dataRange.endPattern).test(row.join(' '))) break;

        // Get fixed values (SKU info)
        const fixedValues: Record<number, string> = {};
        for (const colIdx of matrix.fixedColumns) {
          fixedValues[colIdx] = String(row[colIdx] ?? '');
        }

        // Pivot: each column from pivotStartColumn becomes a record
        for (let col = matrix.pivotStartColumn; col < row.length; col++) {
          const cellValue = row[col];
          if (!cellValue && cellValue !== 0) continue;

          const values = matrix.valueSplitPattern
            ? String(cellValue).split(new RegExp(matrix.valueSplitPattern))
            : [String(cellValue)];

          for (const val of values) {
            if (!val.trim()) continue;
            const record: Partial<OrderRecord> = {};
            
            // Map pivot header to target field
            if (matrix.pivotFieldMapping && headers[col]) {
              (record as any)[matrix.pivotFieldMapping] = String(headers[col]);
            }

            // Map fixed columns via fieldMappings
            for (const mapping of config.fieldMappings) {
              if (mapping.sourceColumn !== undefined && mapping.sourceColumn in fixedValues) {
                this.setRecordField(record, mapping.targetField, fixedValues[mapping.sourceColumn], mapping);
              }
            }

            // Set value field
            if (matrix.valueField) {
              (record as any)[matrix.valueField] = this.parseNumber(val.trim());
            }

            if (record.skuName || record.skuCode) {
              records.push(record as OrderRecord);
            }
          }
        }
      }
    }

    return records;
  }

  private parseCard(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    const records: OrderRecord[] = [];
    const sheets = this.selectSheets(data, config);
    const cardConfig = config.card;
    if (!cardConfig) {
      errors.push({ message: 'Card config missing', severity: 'error' });
      return records;
    }

    for (const sheet of sheets) {
      const { rows } = sheet;
      const boundaries: number[] = [];

      // Find card boundaries
      for (let i = 0; i < rows.length; i++) {
        const rowText = rows[i]?.join(' ') || '';
        if (new RegExp(cardConfig.boundaryPattern).test(rowText)) {
          boundaries.push(i);
        }
      }

      // Parse each card
      for (let b = 0; b < boundaries.length; b++) {
        const startIdx = boundaries[b];
        const endIdx = b + 1 < boundaries.length ? boundaries[b + 1] : rows.length;
        const cardRows = rows.slice(startIdx, endIdx);

        // Extract card-level fields from header lines
        const sharedFields: Partial<OrderRecord> = {};
        const headerText = cardRows.slice(0, cardConfig.headerLines + 1).map(r => r?.join(' ') || '').join('\n');
        
        for (const [field, pattern] of Object.entries(cardConfig.fieldExtractPatterns)) {
          const match = headerText.match(new RegExp(pattern));
          if (match && match[1]) {
            (sharedFields as any)[field] = match[1].trim();
          }
        }

        // Parse data rows within card (skip header lines)
        const dataStart = cardConfig.headerLines + 1;
        for (let i = dataStart; i < cardRows.length; i++) {
          const row = cardRows[i];
          if (!row || row.every(cell => !cell && cell !== 0)) continue;
          
          const record = this.mapRowToRecord(row, config.fieldMappings);
          if (record) {
            // Merge shared fields
            Object.assign(record, { ...sharedFields, ...record });
            records.push(record);
          }
        }
      }
    }

    return records;
  }

  private parseAggregation(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    const records: OrderRecord[] = [];
    const sheets = this.selectSheets(data, config);
    const groupByField = config.aggregation?.groupByField;

    for (const sheet of sheets) {
      const { rows } = sheet;
      const headerRow = config.headerDetection.rowIndex ?? 0;
      const startRow = (config.dataRange?.startRow ?? headerRow + 1);

      // First pass: collect all rows with field mappings
      const rawRecords: OrderRecord[] = [];
      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every(cell => !cell && cell !== 0)) continue;
        if (config.dataRange?.endPattern && new RegExp(config.dataRange.endPattern).test(row.join(' '))) break;

        const record = this.mapRowToRecord(row, config.fieldMappings);
        if (record) rawRecords.push(record);
      }

      // If groupBy, records already have correct per-row data
      // Aggregation means shared info (like address) from first row of group
      if (groupByField) {
        const groups = new Map<string, OrderRecord[]>();
        for (const rec of rawRecords) {
          const key = (rec as any)[groupByField] || '';
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(rec);
        }

        for (const [, group] of groups) {
          const shared = group[0];
          for (const rec of group) {
            records.push({
              ...rec,
              externalCode: shared.externalCode || rec.externalCode,
              storeName: rec.storeName || shared.storeName,
              recipientName: rec.recipientName || shared.recipientName,
              recipientPhone: rec.recipientPhone || shared.recipientPhone,
              recipientAddress: rec.recipientAddress || shared.recipientAddress,
            });
          }
        }
      } else {
        records.push(...rawRecords);
      }

      // Apply extraction zones
      for (const record of records) {
        this.applyExtractionZones(record, rows, config.extractionZones);
      }
    }

    return records;
  }

  private parseText(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    const records: OrderRecord[] = [];
    const textConfig = config.textParsing;
    if (!textConfig) {
      errors.push({ message: 'Text parsing config missing', severity: 'error' });
      return records;
    }

    // For text mode, data comes as single-column rows (lines)
    const fullText = data.map(s => s.rows.map(r => r.join(' ')).join('\n')).join('\n');
    const blocks = fullText.split(new RegExp(textConfig.recordSeparator));

    for (const block of blocks) {
      if (!block.trim()) continue;
      const record: Partial<OrderRecord> = {};

      for (const [field, pattern] of Object.entries(textConfig.fieldPatterns)) {
        const match = block.match(new RegExp(pattern));
        if (match && match[1]) {
          (record as any)[field] = match[1].trim();
        }
      }

      if (record.skuName || record.skuCode) {
        records.push(record as OrderRecord);
      }
    }

    return records;
  }

  private parseComposite(data: SheetData[], config: RuleConfig, errors: ParseError[]): OrderRecord[] {
    // Composite = standard + cell splitting
    const baseRecords = this.parseStandard(data, config, errors);
    // Additional splitting logic handled via matrix.valueSplitPattern in mappings
    return baseRecords;
  }

  // --- Helpers ---

  private selectSheets(data: SheetData[], config: RuleConfig): SheetData[] {
    const sel = config.sheetSelection;
    if (!sel || sel.mode === 'all') return data;
    if (sel.mode === 'byIndex' && sel.indices) {
      return sel.indices.map(i => data[i]).filter(Boolean);
    }
    if (sel.mode === 'byName' && sel.names) {
      return data.filter(s => sel.names!.includes(s.name));
    }
    return data;
  }

  private mapRowToRecord(row: CellValue[], mappings: FieldMapping[]): OrderRecord | null {
    const record: Partial<OrderRecord> = {};

    for (const mapping of mappings) {
      let value: string = '';

      if (mapping.staticValue !== undefined) {
        value = mapping.staticValue;
      } else if (mapping.sourceColumn !== undefined) {
        value = String(row[mapping.sourceColumn] ?? '');
      } else if (mapping.sourcePattern) {
        const rowText = row.join(' ');
        const match = rowText.match(new RegExp(mapping.sourcePattern));
        value = match ? (match[1] || match[0]) : '';
      }

      this.setRecordField(record, mapping.targetField, value, mapping);
    }

    // Must have at least SKU name or code
    if (!record.skuName && !record.skuCode) return null;
    return record as OrderRecord;
  }

  private setRecordField(record: Partial<OrderRecord>, field: string, value: string, mapping: FieldMapping) {
    value = value?.trim() || mapping.defaultValue || '';
    
    if (mapping.transform === 'number') {
      (record as any)[field] = this.parseNumber(value);
    } else if (mapping.transform === 'phone') {
      (record as any)[field] = value.replace(/[^0-9+\-]/g, '');
    } else {
      (record as any)[field] = value;
    }
  }

  private applyExtractionZones(record: Partial<OrderRecord>, rows: CellValue[][], zones?: ExtractionZone[]) {
    if (!zones) return;
    for (const zone of zones) {
      let value = '';
      if (zone.location === 'specific' && zone.rowIndex !== undefined) {
        const row = rows[zone.rowIndex];
        if (row && zone.columnIndex !== undefined) {
          value = String(row[zone.columnIndex] ?? '');
        } else if (row && zone.pattern) {
          const rowText = row.join(' ');
          const match = rowText.match(new RegExp(zone.pattern));
          value = match ? (match[1] || match[0]) : '';
        }
      } else if (zone.location === 'footer') {
        // Search from bottom
        for (let i = rows.length - 1; i >= 0; i--) {
          if (zone.pattern) {
            const rowText = rows[i]?.join(' ') || '';
            const match = rowText.match(new RegExp(zone.pattern));
            if (match) {
              value = match[1] || match[0];
              break;
            }
          }
        }
      }
      if (value) {
        (record as any)[zone.targetField] = value.trim();
      }
    }
  }

  private parseNumber(val: string): number {
    const num = parseFloat(val.replace(/[^\d.\-]/g, ''));
    return isNaN(num) ? 0 : num;
  }
}

// Data types for parsed file content
export type CellValue = string | number | null;

export interface SheetData {
  name: string;
  rows: CellValue[][];
}
