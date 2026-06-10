// Type definitions for the smart-import system

export interface ParseRule {
  id: string;
  name: string;
  description?: string;
  fileType: 'xlsx' | 'docx' | 'pdf';
  createdAt: string;
  updatedAt: string;
  config: RuleConfig;
}

export interface RuleConfig {
  // Sheet selection (for Excel)
  sheetSelection?: {
    mode: 'all' | 'byIndex' | 'byName';
    indices?: number[];
    names?: string[];
  };

  // Parsing mode
  parsingMode: 
    | 'standard'        // Standard row-by-row table
    | 'matrix'          // Matrix transpose (columns become records)
    | 'card'            // Card-style with boundary detection
    | 'aggregation'     // Cross-row aggregation by key
    | 'text'            // Pure text parsing with regex
    | 'composite';      // Composite cell splitting

  // Header detection
  headerDetection: {
    mode: 'rowIndex' | 'pattern';
    rowIndex?: number;       // 0-based
    skipRows?: number;       // rows to skip before header
    pattern?: string;        // regex to match header row
  };

  // Data range
  dataRange?: {
    startRow?: number;      // 0-based, after header
    endRow?: number;        // exclusive, -1 for auto-detect
    endPattern?: string;    // regex to detect end (e.g., "合计")
  };

  // Field mappings
  fieldMappings: FieldMapping[];

  // Special extraction zones (e.g., footer with address info)
  extractionZones?: ExtractionZone[];

  // Aggregation config
  aggregation?: {
    groupByField: string;   // field to group by (e.g., external code column)
  };

  // Matrix config
  matrix?: {
    fixedColumns: number[];       // indices of fixed columns (SKU info)
    pivotStartColumn: number;     // where pivot columns start
    pivotFieldMapping: string;    // what the column headers represent (e.g., "storeName")
    valueField: string;           // what cell values represent (e.g., "quantity")
    valueSplitPattern?: string;   // pattern to split composite values
  };

  // Card config
  card?: {
    boundaryPattern: string;      // regex to detect card start
    headerLines: number;          // lines in card header
    fieldExtractPatterns: Record<string, string>; // field -> regex
  };

  // Text parsing config
  textParsing?: {
    recordSeparator: string;      // regex for record boundary
    fieldPatterns: Record<string, string>; // field -> regex
  };
}

export interface FieldMapping {
  sourceColumn?: number;          // column index (0-based)
  sourceColumnName?: string;      // column name (for header matching)
  sourcePattern?: string;         // regex to extract value
  targetField: OrderField;
  transform?: 'trim' | 'number' | 'phone' | 'none';
  defaultValue?: string;
  staticValue?: string;           // hardcoded value
}

export interface ExtractionZone {
  location: 'footer' | 'header' | 'specific';
  rowIndex?: number;
  columnIndex?: number;
  pattern?: string;
  targetField: OrderField;
}

export type OrderField = 
  | 'externalCode'
  | 'storeName'
  | 'recipientName'
  | 'recipientPhone'
  | 'recipientAddress'
  | 'skuCode'
  | 'skuName'
  | 'skuQuantity'
  | 'skuSpec'
  | 'remarks';

export interface OrderRecord {
  externalCode?: string;
  storeName?: string;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  skuCode: string;
  skuName: string;
  skuQuantity: number;
  skuSpec?: string;
  remarks?: string;
}

export interface ParseResult {
  success: boolean;
  records: OrderRecord[];
  errors: ParseError[];
  totalRows: number;
  parsedRows: number;
}

export interface ParseError {
  row?: number;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface OrderSubmission {
  id?: string;
  records: OrderRecord[];
  submittedAt: string;
  fileName: string;
  ruleName: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
}
