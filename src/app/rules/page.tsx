'use client';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit3, Trash2, Copy, TestTube, Save, X, Code } from 'lucide-react';

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [showEditor, setShowEditor] = useState(false);

  const loadRules = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rules');
      const data = await res.json();
      setRules(data.rules || []);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRules(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该规则？')) return;
    await fetch(`/api/rules?id=${id}`, { method: 'DELETE' });
    toast.success('规则已删除');
    loadRules();
  };

  const handleCopy = async (rule: any) => {
    const newRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: `${rule.name} (副本)`,
    };
    await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    });
    toast.success('规则已复制');
    loadRules();
  };

  const handleSave = async () => {
    if (!editingRule) return;
    try {
      // Validate JSON config
      if (typeof editingRule.config === 'string') {
        editingRule.config = JSON.parse(editingRule.config);
      }
      if (!editingRule.id) {
        editingRule.id = `rule_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRule),
      });
      toast.success('规则已保存');
      setShowEditor(false);
      setEditingRule(null);
      loadRules();
    } catch (e: any) {
      toast.error(`保存失败: ${e.message}`);
    }
  };

  const handleNew = () => {
    setEditingRule({
      id: '',
      name: '新规则',
      description: '',
      fileType: 'xlsx',
      config: JSON.stringify({
        parsingMode: 'standard',
        headerDetection: { mode: 'rowIndex', rowIndex: 0, skipRows: 0 },
        dataRange: { startRow: 1, endRow: -1 },
        fieldMappings: [],
      }, null, 2),
    });
    setShowEditor(true);
  };

  const handleEdit = (rule: any) => {
    setEditingRule({
      ...rule,
      config: typeof rule.config === 'string' ? rule.config : JSON.stringify(rule.config, null, 2),
    });
    setShowEditor(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">解析规则管理</h1>
          <p className="text-gray-500 mt-1">管理文件解析规则，支持手动创建或AI自动生成</p>
        </div>
        <button className="btn-primary flex items-center gap-2" onClick={handleNew}>
          <Plus size={16} /> 新建规则
        </button>
      </div>

      {loading ? (
        <div className="empty-state">加载中...</div>
      ) : rules.length === 0 ? (
        <div className="empty-state">
          <Code size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-lg">暂无解析规则</p>
          <p className="text-sm mt-1">请新建规则或通过导入页面AI自动生成</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {rules.map(rule => (
            <div key={rule.id} className="card flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">{rule.name}</h3>
                  <span className="badge badge-success">{rule.fileType}</span>
                  {rule.config?.parsingMode && (
                    <span className="badge badge-warning">{rule.config.parsingMode}</span>
                  )}
                </div>
                {rule.description && (
                  <p className="text-sm text-gray-500 mt-1">{rule.description}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  更新于 {new Date(rule.updatedAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                  onClick={() => handleEdit(rule)}>
                  <Edit3 size={12} /> 编辑
                </button>
                <button className="btn-secondary text-sm px-3 py-1 flex items-center gap-1"
                  onClick={() => handleCopy(rule)}>
                  <Copy size={12} /> 复制
                </button>
                <button className="btn-secondary text-sm px-3 py-1 flex items-center gap-1 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(rule.id)}>
                  <Trash2 size={12} /> 删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rule Editor Modal */}
      {showEditor && editingRule && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">编辑规则</h2>
              <button onClick={() => { setShowEditor(false); setEditingRule(null); }}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">规则名称</label>
                  <input className="input" value={editingRule.name}
                    onChange={e => setEditingRule({ ...editingRule, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">文件类型</label>
                  <select className="input" value={editingRule.fileType}
                    onChange={e => setEditingRule({ ...editingRule, fileType: e.target.value })}>
                    <option value="xlsx">Excel (.xlsx/.xls)</option>
                    <option value="pdf">PDF</option>
                    <option value="docx">Word (.docx)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">描述</label>
                <input className="input" value={editingRule.description || ''}
                  onChange={e => setEditingRule({ ...editingRule, description: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">规则配置 (JSON)</label>
                <textarea className="input font-mono text-xs"
                  style={{ minHeight: '400px', resize: 'vertical' }}
                  value={typeof editingRule.config === 'string' ? editingRule.config : JSON.stringify(editingRule.config, null, 2)}
                  onChange={e => setEditingRule({ ...editingRule, config: e.target.value })} />
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-3">
              <button className="btn-secondary" onClick={() => { setShowEditor(false); setEditingRule(null); }}>取消</button>
              <button className="btn-primary flex items-center gap-2" onClick={handleSave}>
                <Save size={14} /> 保存规则
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
