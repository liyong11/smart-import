'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Save, Download, Trash2, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface OrderRecord {
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

const FIELDS = [
  { key: 'externalCode', label: '外部编码', required: false },
  { key: 'storeName', label: '收货门店', required: false },
  { key: 'recipientName', label: '收件人姓名', required: false },
  { key: 'recipientPhone', label: '收件人电话', required: false },
  { key: 'recipientAddress', label: '收件人地址', required: false },
  { key: 'skuCode', label: 'SKU编码', required: true },
  { key: 'skuName', label: 'SKU名称', required: true },
  { key: 'skuQuantity', label: '发货数量', required: true },
  { key: 'skuSpec', label: '规格型号', required: false },
  { key: 'remarks', label: '备注', required: false },
];

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function PreviewPage() {
  const [records, setRecords] = useState<OrderRecord[]>([]);
  const [parseInfo, setParseInfo] = useState<any>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const data = sessionStorage.getItem('parsedData');
    const info = sessionStorage.getItem('parseInfo');
    if (data) setRecords(JSON.parse(data));
    if (info) setParseInfo(JSON.parse(info));
    if (!data) {
      toast.error('无解析数据，请先导入文件');
      router.push('/');
    }
  }, [router]);

  // Validate all records
  const validate = useCallback((recs: OrderRecord[]) => {
    const errs: ValidationError[] = [];
    recs.forEach((rec, idx) => {
      // Required fields
      if (!rec.skuCode) errs.push({ row: idx, field: 'skuCode', message: 'SKU编码不能为空' });
      if (!rec.skuName) errs.push({ row: idx, field: 'skuName', message: 'SKU名称不能为空' });
      if (!rec.skuQuantity || rec.skuQuantity <= 0) errs.push({ row: idx, field: 'skuQuantity', message: '发货数量必须为正数' });
      
      // Group A or B required
      const hasA = !!rec.storeName;
      const hasB = !!rec.recipientName && !!rec.recipientPhone && !!rec.recipientAddress;
      if (!hasA && !hasB) {
        errs.push({ row: idx, field: 'storeName', message: '收货门店或收件人信息至少填写一组' });
      }

      // Phone format
      if (rec.recipientPhone && !/^[\d\-+]{7,15}$/.test(rec.recipientPhone)) {
        errs.push({ row: idx, field: 'recipientPhone', message: '电话格式不正确' });
      }
    });
    return errs;
  }, []);

  useEffect(() => {
    if (records.length > 0) setErrors(validate(records));
  }, [records, validate]);

  // Virtual list for performance
  const rowVirtualizer = useVirtualizer({
    count: records.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 20,
  });

  const handleCellEdit = (rowIdx: number, field: string, value: string) => {
    setRecords(prev => {
      const updated = [...prev];
      const rec = { ...updated[rowIdx] };
      if (field === 'skuQuantity') {
        (rec as any)[field] = parseFloat(value) || 0;
      } else {
        (rec as any)[field] = value;
      }
      updated[rowIdx] = rec;
      return updated;
    });
    setEditingCell(null);
  };

  const handleDeleteRow = (idx: number) => {
    setRecords(prev => prev.filter((_, i) => i !== idx));
    toast.success('已删除行');
  };

  const handleAddRow = () => {
    setRecords(prev => [...prev, { skuCode: '', skuName: '', skuQuantity: 0 }]);
  };

  const handleExport = async () => {
    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(records);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入数据');
    XLSX.writeFile(wb, `导出_${parseInfo?.fileName || 'data'}.xlsx`);
    toast.success('导出成功');
  };

  const handleSubmit = async () => {
    const currentErrors = validate(records);
    if (currentErrors.length > 0) {
      toast.error(`存在 ${currentErrors.length} 个错误，请先修正`);
      setErrors(currentErrors);
      return;
    }
    setSubmitting(true);
    setProgress(0);
    try {
      const batchSize = 100;
      let submitted = 0;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orders: batch,
            fileName: parseInfo?.fileName,
            ruleName: parseInfo?.ruleName,
          }),
        });
        submitted += batch.length;
        setProgress(Math.round((submitted / records.length) * 100));
      }
      toast.success(`提交成功！共 ${records.length} 条`);
      sessionStorage.removeItem('parsedData');
      sessionStorage.removeItem('parseInfo');
      router.push('/orders');
    } catch (e: any) {
      toast.error(`提交失败: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getCellError = (row: number, field: string) => {
    return errors.find(e => e.row === row && e.field === field);
  };

  if (records.length === 0) {
    return (
      <div className="empty-state">
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">数据预览</h1>
          <p className="text-gray-500 text-sm mt-1">
            {parseInfo?.fileName} | 共 {records.length} 条记录
            {errors.length > 0 && (
              <span className="text-red-500 ml-2">
                <AlertCircle size={14} className="inline" /> {errors.length} 个错误
              </span>
            )}
            {errors.length === 0 && records.length > 0 && (
              <span className="text-green-600 ml-2">
                <CheckCircle size={14} className="inline" /> 校验通过
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary flex items-center gap-1" onClick={handleAddRow}>
            <Plus size={14} /> 新增行
          </button>
          <button className="btn-secondary flex items-center gap-1" onClick={handleExport}>
            <Download size={14} /> 导出Excel
          </button>
          <button className="btn-primary flex items-center gap-1" onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            提交下单
          </button>
        </div>
      </div>

      {submitting && (
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-1">
            <span>提交进度</span><span>{progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="card bg-red-50 border-red-200">
          <h3 className="text-sm font-semibold text-red-700 mb-2">错误列表（共{errors.length}项）</h3>
          <div className="max-h-32 overflow-y-auto">
            {errors.slice(0, 20).map((err, i) => (
              <p key={i} className="text-xs text-red-600">
                第{err.row + 1}行 - {FIELDS.find(f=>f.key===err.field)?.label}: {err.message}
              </p>
            ))}
            {errors.length > 20 && <p className="text-xs text-red-400">...还有{errors.length-20}项错误</p>}
          </div>
        </div>
      )}

      {/* Virtual Table */}
      <div className="table-container" ref={parentRef} style={{ height: 'calc(100vh - 320px)', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{width:40}}>#</th>
              {FIELDS.map(f => (
                <th key={f.key}>
                  {f.label}{f.required && <span className="text-red-500">*</span>}
                </th>
              ))}
              <th style={{width:50}}>操作</th>
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map(virtualRow => {
              const rec = records[virtualRow.index];
              return (
                <tr key={virtualRow.index}
                  style={{ position: 'absolute', top: virtualRow.start, width: '100%', display: 'table-row' }}>
                  <td className="text-gray-400 text-xs">{virtualRow.index + 1}</td>
                  {FIELDS.map(f => {
                    const cellErr = getCellError(virtualRow.index, f.key);
                    const isEditing = editingCell?.row === virtualRow.index && editingCell?.field === f.key;
                    const value = (rec as any)[f.key] ?? '';
                    return (
                      <td key={f.key}
                        className={cellErr ? 'cell-error' : ''}
                        title={cellErr?.message}
                        onClick={() => setEditingCell({ row: virtualRow.index, field: f.key })}>
                        {isEditing ? (
                          <input className="input text-xs p-1" autoFocus
                            defaultValue={value}
                            onBlur={e => handleCellEdit(virtualRow.index, f.key, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <span className="text-xs">{String(value)}</span>
                        )}
                      </td>
                    );
                  })}
                  <td>
                    <button className="text-red-400 hover:text-red-600"
                      onClick={() => handleDeleteRow(virtualRow.index)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
