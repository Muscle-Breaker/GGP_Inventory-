'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Check, X, Upload, Download,
  RefreshCw, ShoppingBag, FileSpreadsheet, Settings,
  ExternalLink, AlertCircle
} from 'lucide-react';
import type { SalesChannel } from '@/lib/types';

export default function SettingsPage() {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [newChannel, setNewChannel] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [importType, setImportType] = useState<'products' | 'inventory'>('products');
  const [gsUrl, setGsUrl] = useState('');
  const [gsLoading, setGsLoading] = useState(false);
  const [gsResult, setGsResult] = useState<string | null>(null);

  const fetchChannels = async () => {
    const res = await fetch('/api/channels');
    setChannels(await res.json());
  };

  useEffect(() => { fetchChannels(); }, []);

  const addChannel = async () => {
    if (!newChannel.trim()) return;
    setSaving(true);
    await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newChannel.trim() }),
    });
    setNewChannel('');
    setSaving(false);
    fetchChannels();
  };

  const updateChannel = async (id: number) => {
    await fetch(`/api/channels/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    setEditId(null);
    fetchChannels();
  };

  const toggleChannel = async (c: SalesChannel) => {
    await fetch(`/api/channels/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !c.is_active }),
    });
    fetchChannels();
  };

  const deleteChannel = async (id: number) => {
    await fetch(`/api/channels/${id}`, { method: 'DELETE' });
    fetchChannels();
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', importType);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    const data = await res.json();
    setImportResult(data);
    setImporting(false);
    e.target.value = '';
  };

  const handleGoogleSheets = async () => {
    if (!gsUrl.trim()) return;
    setGsLoading(true);
    setGsResult(null);
    const res = await fetch('/api/import', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gsUrl, importType }),
    });
    const data = await res.json();
    if (data.error) setGsResult(`오류: ${data.error}`);
    else setGsResult(`완료: ${data.imported}개 가져옴, ${data.skipped}개 건너뜀`);
    setGsLoading(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-0.5">판매처, 데이터 가져오기/내보내기 관리</p>
      </div>

      {/* Sales Channels */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <ShoppingBag size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">판매처 관리</h2>
        </div>
        <div className="p-5 space-y-3">
          {channels.map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              {editId === c.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && updateChannel(c.id)}
                  className="form-input flex-1 mr-3 py-1.5"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                  {!c.is_active && <span className="text-xs text-gray-400">(비활성)</span>}
                </div>
              )}
              <div className="flex items-center gap-1">
                {editId === c.id ? (
                  <>
                    <button onClick={() => updateChannel(c.id)} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditId(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => toggleChannel(c)}
                      className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                        c.is_active ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {c.is_active ? '비활성' : '활성'}
                    </button>
                    <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteChannel(c.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {/* Add Channel */}
          <div className="flex items-center gap-2 mt-4">
            <input
              type="text"
              value={newChannel}
              onChange={e => setNewChannel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addChannel()}
              className="form-input flex-1"
              placeholder="판매처 이름 (예: 무신사)"
            />
            <button onClick={addChannel} disabled={saving || !newChannel.trim()} className="btn-primary">
              <Plus size={16} /> 추가
            </button>
          </div>
        </div>
      </div>

      {/* Data Import */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Upload size={16} className="text-green-600" />
          <h2 className="font-semibold text-gray-800">데이터 가져오기</h2>
        </div>
        <div className="p-5 space-y-5">
          {/* Import Type */}
          <div>
            <label className="form-label">가져오기 유형</label>
            <div className="flex gap-3 mt-1">
              {[
                { value: 'products' as const, label: '상품 목록' },
                { value: 'inventory' as const, label: '재고 내역' },
              ].map(t => (
                <button
                  key={t.value}
                  onClick={() => setImportType(t.value)}
                  className={`flex-1 py-2 text-sm font-medium border rounded-lg transition-all ${
                    importType === t.value ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* File Import */}
          <div className="border border-dashed border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <FileSpreadsheet size={20} className="text-green-500" />
              <div>
                <p className="text-sm font-semibold text-gray-700">엑셀 / CSV 파일 가져오기</p>
                <p className="text-xs text-gray-400">.xlsx, .xls, .csv 지원</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mb-3 space-y-1">
              <p className="font-semibold text-gray-600">필수 컬럼 (상품):</p>
              <p>상품명, SKU, 카테고리, 색상, 사이즈, 판매가, 원가, 현재재고</p>
              <p className="font-semibold text-gray-600 mt-1">필수 컬럼 (재고 내역):</p>
              <p>SKU, 유형(입고/판매/반품/폐기/기타출고), 수량</p>
            </div>
            {importResult && (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-3 ${
                importResult.imported > 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
              }`}>
                <Check size={14} />
                {importResult.imported}개 가져옴, {importResult.skipped}개 건너뜀
              </div>
            )}
            <div className="flex gap-2 flex-wrap">
              <label className={`btn-primary cursor-pointer ${importing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                {importing ? <><RefreshCw size={14} className="animate-spin" /> 가져오는 중...</> : <><Upload size={14} /> 파일 선택</>}
                <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={importing} className="hidden" />
              </label>
              <a
                href={`/api/template?type=${importType}`}
                className="btn-secondary"
              >
                <Download size={14} /> 양식 다운로드
              </a>
            </div>
          </div>

          {/* Google Sheets Import */}
          <div className="border border-dashed border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
                  <rect width="24" height="24" rx="4" fill="#0F9D58" />
                  <rect x="6" y="8" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="11.25" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="14.5" width="8" height="1.5" rx="0.75" fill="white" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Google Sheets 연동</p>
                <p className="text-xs text-gray-400">공유 가능한 URL로 직접 가져오기</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-blue-50 rounded-lg p-3 mb-3 flex items-start gap-2">
              <AlertCircle size={12} className="text-blue-500 mt-0.5 shrink-0" />
              <p>구글 시트를 <strong>"링크가 있는 모든 사용자"</strong>에게 공유하거나 CSV 내보내기 URL을 입력하세요.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={gsUrl}
                onChange={e => setGsUrl(e.target.value)}
                className="form-input flex-1"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <button onClick={handleGoogleSheets} disabled={gsLoading || !gsUrl.trim()} className="btn-primary whitespace-nowrap">
                {gsLoading ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                가져오기
              </button>
            </div>
            {gsResult && (
              <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${
                gsResult.startsWith('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
              }`}>
                {gsResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Export */}
      <div className="card">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
          <Download size={16} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">데이터 내보내기</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'all', label: '전체 내보내기', desc: '상품 + 재고 내역 + 요약', color: 'bg-blue-600 hover:bg-blue-700' },
              { type: 'products', label: '상품만', desc: '상품 목록 전체', color: 'bg-green-600 hover:bg-green-700' },
              { type: 'inventory', label: '재고 내역만', desc: '입출고 전체 내역', color: 'bg-purple-600 hover:bg-purple-700' },
            ].map(item => (
              <a
                key={item.type}
                href={`/api/export?type=${item.type}`}
                className={`flex flex-col items-center gap-2 p-4 text-white rounded-xl transition-colors cursor-pointer ${item.color}`}
              >
                <Download size={20} />
                <span className="text-sm font-semibold">{item.label}</span>
                <span className="text-xs opacity-75">{item.desc}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
