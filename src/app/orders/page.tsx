'use client';
import { useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const pageSize = 50;

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/orders?${params}`);
      const data = await res.json();
      setOrders(data.rows || []);
      setTotal(data.total || 0);
    } catch { } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadOrders();
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">已导入运单</h1>
        <p className="text-gray-500 mt-1">查看所有已提交的运单记录</p>
      </div>

      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="搜索外部编码、收件人、SKU名称..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary">搜索</button>
        </form>

        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <p>暂无运单数据</p>
            <p className="text-sm mt-1">导入并提交文件后，数据将显示在此处</p>
          </div>
        ) : (
          <>
            <div className="table-container" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              <table>
                <thead>
                  <tr>
                    <th>外部编码</th>
                    <th>收货门店</th>
                    <th>收件人</th>
                    <th>电话</th>
                    <th>SKU编码</th>
                    <th>SKU名称</th>
                    <th>数量</th>
                    <th>来源文件</th>
                    <th>提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr key={idx}>
                      <td>{order.external_code || '-'}</td>
                      <td>{order.store_name || '-'}</td>
                      <td>{order.recipient_name || '-'}</td>
                      <td>{order.recipient_phone || '-'}</td>
                      <td>{order.sku_code}</td>
                      <td>{order.sku_name}</td>
                      <td>{order.sku_quantity}</td>
                      <td className="text-xs text-gray-400">{order.file_name || '-'}</td>
                      <td className="text-xs text-gray-400">
                        {order.submitted_at ? new Date(order.submitted_at).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                共 {total} 条，第 {page}/{totalPages} 页
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary text-sm px-3 py-1"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </button>
                <button className="btn-secondary text-sm px-3 py-1"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
