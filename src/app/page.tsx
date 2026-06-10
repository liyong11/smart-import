'use client';
import { useState, useCallback, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, File, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [selectedRule, setSelectedRule] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load rules on mount
  useState(() => {
    fetch('/api/rules').then(r => r.json()).then(data => {
      if (data.rules) setRules(data.rules);
    }).catch(() => {});
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) validateAndSetFile(f);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f: File) => {
    const validTypes = ['.xlsx', '.xls', '.docx', '.pdf'];
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error('不支持的文件格式，请上传 Excel/Word/PDF 文件');
      return;
    }
    setFile(f);
    toast.success(`已选择文件: ${f.name}`);
  };

  const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="text-red-500" size={20} />;
    if (ext === 'docx') return <File className="text-blue-500" size={20} />;
    return <FileSpreadsheet className="text-green-500" size={20} />;
  };

  const handleAIGenerate = async () => {
    if (!file) return;
    setAiLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/ai-generate-rule', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('AI规则生成成功！请前往规则管理页面查看和编辑');
      // Refresh rules list
      const rulesRes = await fetch('/api/rules');
      const rulesData = await rulesRes.json();
      if (rulesData.rules) {
        setRules(rulesData.rules);
        setSelectedRule(data.ruleId);
      }
    } catch (e: any) {
      toast.error(`AI生成失败: ${e.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleParse = async () => {
    if (!file || !selectedRule) {
      toast.error('请先选择文件和解析规则');
      return;
    }
    setLoading(true);
    setProgress(10);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('ruleId', selectedRule);
      
      setProgress(30);
      const res = await fetch('/api/parse', { method: 'POST', body: formData });
      setProgress(70);
      const data = await res.json();
      setProgress(100);

      if (data.error) throw new Error(data.error);

      // Store parsed data in sessionStorage for preview page
      sessionStorage.setItem('parsedData', JSON.stringify(data.records));
      sessionStorage.setItem('parseInfo', JSON.stringify({
        fileName: file.name,
        ruleName: rules.find(r => r.id === selectedRule)?.name || '',
        ruleId: selectedRule,
        totalRows: data.totalRows,
        parsedRows: data.parsedRows,
      }));

      toast.success(`解析成功！共 ${data.parsedRows} 条记录`);
      router.push('/preview');
    } catch (e: any) {
      toast.error(`解析失败: ${e.message}`);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">文件导入</h1>
        <p className="text-gray-500 mt-1">上传出库单文件，通过AI智能解析为结构化下单数据</p>
      </div>

      {/* Upload Area */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">第一步：选择文件</h2>
        <div
          className={`drop-zone ${dragActive ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" className="hidden"
            accept=".xlsx,.xls,.docx,.pdf" onChange={handleFileSelect} />
          <Upload size={40} className="mx-auto mb-3 text-gray-400" />
          <p className="text-gray-600 font-medium">拖拽文件到此处，或点击选择文件</p>
          <p className="text-sm text-gray-400 mt-1">支持 Excel(.xlsx/.xls)、Word(.docx)、PDF 格式</p>
        </div>

        {file && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {getFileIcon(file.name)}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">{file.name}</p>
              <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button className="text-xs text-red-500 hover:text-red-700"
              onClick={() => setFile(null)}>移除</button>
          </div>
        )}
      </div>

      {/* Rule Selection */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">第二步：选择解析规则</h2>
        
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-sm text-gray-500 mb-1 block">已有规则</label>
            <select className="input" value={selectedRule}
              onChange={e => setSelectedRule(e.target.value)}>
              <option value="">-- 选择一条规则 --</option>
              {rules.map(r => (
                <option key={r.id} value={r.id}>{r.name} ({r.fileType})</option>
              ))}
            </select>
          </div>
          <button className="btn-primary flex items-center gap-2 whitespace-nowrap"
            onClick={handleAIGenerate}
            disabled={!file || aiLoading}>
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            AI生成新规则
          </button>
        </div>

        {aiLoading && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              AI正在分析文件结构并生成解析规则，请稍候...
            </p>
          </div>
        )}
      </div>

      {/* Parse Button */}
      <div className="card">
        <h2 className="font-semibold text-gray-700 mb-4">第三步：执行解析</h2>
        
        {progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-500 mb-1">
              <span>解析进度</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button className="btn-primary flex items-center gap-2"
          onClick={handleParse}
          disabled={!file || !selectedRule || loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
          开始解析
        </button>
      </div>
    </div>
  );
}
