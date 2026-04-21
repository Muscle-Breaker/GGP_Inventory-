'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Edit2, Trash2, Check, X, Upload, Download,
  RefreshCw, ShoppingBag, FileSpreadsheet, ExternalLink, AlertCircle
} from 'lucide-react';
import type { SalesChannel } from '@/lib/types';

type TabType = 'channels' | 'products' | 'inventory' | 'transactions';

const TABS: { id: TabType; label: string }[] = [
  { id: 'channels',     label: '판매처 관리' },
  { id: 'products',     label: '상품 관리' },
  { id: 'inventory',    label: '재고 관리' },
  { id: 'transactions', label: '입출고 관리' },
];

// ── 재사용 컴포넌트: 가져오기 / 내보내기 섹션 ──────────────────────────
function DataSection({
  title, importType, exportType, exportLabel,
}: {
  title: string;
  importType: 'products' | 'inventory' | 'transactions';
  exportType: string;
  exportLabel: string;
}) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [gsUrl, setGsUrl] = useState('');
  const [gsLoading, setGsLoading] = useState(false);
  const [gsResult, setGsResult] = useState<string | null>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true); setResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', importType === 'transactions' ? 'inventory' : importType);
    const res = await fetch('/api/import', { method: 'POST', body: fd });
    setResult(await res.json());
    setImporting(false);
    e.target.value = '';
  };

  const handleGoogleSheets = async () => {
    if (!gsUrl.trim()) return;
    setGsLoading(true); setGsResult(null);
    const res = await fetch('/api/import', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: gsUrl, importType: importType === 'transactions' ? 'inventory' : importType }),
    });
    const data = await res.json();
    setGsResult(data.error ? `오류: ${data.error}` : `완료: ${data.imported}개 가져옴, ${data.skipped}개 건너뜀`);
    setGsLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* 엑셀/CSV 가져오기 */}
      <div className="border border-dashed border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <FileSpreadsheet size={20} className="text-green-500" />
          <div>
            <p className="text-sm font-semibold text-gray-700">엑셀 / CSV 파일 가져오기</p>
            <p className="text-xs text-gray-400">.xlsx, .xls, .csv 지원</p>
          </div>
        </div>
        {result && (
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg mb-3 ${result.imported > 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <Check size={14} /> {result.imported}개 가져옴, {result.skipped}개 건너뜀
          </div>
        )}
        <div className="flex gap-2 flex-wrap">
          <label className={`btn-primary cursor-pointer ${importing ? 'opacity-60 cursor-not-allowed' : ''}`}>
            {importing ? <><RefreshCw size={14} className="animate-spin" /> 가져오는 중...</> : <><Upload size={14} /> 파일 선택</>}
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={importing} className="hidden" />
          </label>
          <a href={`/api/template?type=${importType === 'transactions' ? 'inventory' : importType}`} className="btn-secondary">
            <Download size={14} /> 양식 다운로드
          </a>
        </div>
      </div>

      {/* 구글 시트 연동 */}
      <div className="border border-dashed border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-5 h-5 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none">
              <rect width="24" height="24" rx="4" fill="#0F9D58" />
              <rect x="6" y="8" width="12" height="1.5" rx="0.75" fill="white" />
              <rect x="6" y="11.25" width="12" height="1.5" rx="0.75" fill="white" />
              <rect x="6" y="14.5" width="8" height="1.5" rx="0.75" fill="white" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Google Sheets 연동</p>
            <p className="text-xs text-gray-400">공유 URL로 직접 가져오기</p>
          </div>
        </div>
        <div className="text-xs text-blue-50 bg-blue-50 rounded-lg p-3 mb-3 flex items-start gap-2">
          <AlertCircle size={12} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-blue-700">구글 시트를 <strong>"링크가 있는 모든 사용자"</strong>에게 공유 후 URL 입력</p>
        </div>
        <div className="flex gap-2">
          <input type="text" value={gsUrl} onChange={e => setGsUrl(e.target.value)}
            className="form-input flex-1" placeholder="https://docs.google.com/spreadsheets/d/..." />
          <button onClick={handleGoogleSheets} disabled={gsLoading || !gsUrl.trim()} className="btn-primary whitespace-nowrap">
            {gsLoading ? <RefreshCw size={14} className="animate-spin" /> : <ExternalLink size={14} />} 가져오기
          </button>
        </div>
        {gsResult && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${gsResult.startsWith('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
            {gsResult}
          </div>
        )}
      </div>

      {/* 내보내기 */}
      <div className="border border-gray-100 rounded-xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <Download size={20} className="text-blue-500" />
          <p className="text-sm font-semibold text-gray-700">엑셀로 내보내기</p>
        </div>
        <a href={`/api/export?type=${exportType}`}
          className="btn-primary inline-flex">
          <Download size={14} /> {exportLabel} 다운로드
        </a>
      </div>
    </div>
  );
}

// ── 판매처 관리 탭 ────────────────────────────────────────────────────────
function ChannelsTab() {
  const [channels, setChannels] = useState<SalesChannel[]>([]);
  const [newChannel, setNewChannel] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetch_ = async () => {
    const res = await fetch('/api/channels');
    setChannels(await res.json());
  };
  useEffect(() => { fetch_(); }, []);

  const add = async () => {
    if (!newChannel.trim()) return;
    setSaving(true);
    await fetch('/api/channels', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newChannel.trim() }) });
    setNewChannel(''); setSaving(false); fetch_();
  };
  const update = async (id: number) => {
    await fetch(`/api/channels/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName }) });
    setEditId(null); fetch_();
  };
  const toggle = async (c: SalesChannel) => {
    await fetch(`/api/channels/${c.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !c.is_active }) });
    fetch_();
  };
  const del = async (id: number) => {
    await fetch(`/api/channels/${id}`, { method: 'DELETE' }); fetch_();
  };

  return (
    <div className="space-y-3">
      {channels.map(c => (
        <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          {editId === c.id ? (
            <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && update(c.id)}
              className="form-input flex-1 mr-3 py-1.5" autoFocus />
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
                <button onClick={() => update(c.id)} className="p-1.5 hover:bg-green-100 rounded-lg text-green-600"><Check size={14} /></button>
                <button onClick={() => setEditId(null)} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><X size={14} /></button>
              </>
            ) : (
              <>
                <button onClick={() => toggle(c)} className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${c.is_active ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {c.is_active ? '비활성' : '활성'}
                </button>
                <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                <button onClick={() => del(c.id)} className="p-1.5 hover:bg-red-100 rounded-lg text-red-400"><Trash2 size={14} /></button>
              </>
            )}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-4">
        <input type="text" value={newChannel} onChange={e => setNewChannel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          className="form-input flex-1" placeholder="판매처 이름 (예: 무신사)" />
        <button onClick={add} disabled={saving || !newChannel.trim()} className="btn-primary">
          <Plus size={16} /> 추가
        </button>
      </div>
    </div>
  );
}

// ── 메인 설정 페이지 ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tab, setTab] = useState<TabType>('channels');

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div>
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
        <p className="text-sm text-gray-500 mt-0.5">판매처, 데이터 가져오기/내보내기 관리</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="card p-5">
        {tab === 'channels' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800">판매처 관리</h2>
            </div>
            <ChannelsTab />
          </>
        )}

        {tab === 'products' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={16} className="text-green-600" />
              <h2 className="font-semibold text-gray-800">상품 관리 — 데이터 가져오기 / 내보내기</h2>
            </div>
            <DataSection
              title="상품 관리"
              importType="products"
              exportType="products"
              exportLabel="상품 목록"
            />
          </>
        )}

        {tab === 'inventory' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={16} className="text-blue-600" />
              <h2 className="font-semibold text-gray-800">재고 관리 — 데이터 가져오기 / 내보내기</h2>
            </div>
            <DataSection
              title="재고 관리"
              importType="inventory"
              exportType="products"
              exportLabel="재고 현황"
            />
          </>
        )}

        {tab === 'transactions' && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet size={16} className="text-purple-600" />
              <h2 className="font-semibold text-gray-800">입출고 관리 — 데이터 가져오기 / 내보내기</h2>
            </div>
            <DataSection
              title="입출고 관리"
              importType="transactions"
              exportType="inventory"
              exportLabel="입출고 내역"
            />
          </>
        )}
      </div>

      {/* 전체 내보내기 */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Download size={16} className="text-gray-600" />
          <h2 className="font-semibold text-gray-800">전체 내보내기</h2>
        </div>
        <a href="/api/export?type=all" className="btn-primary inline-flex">
          <Download size={14} /> 전체 데이터 다운로드 (상품 + 재고 + 입출고)
        </a>
      </div>
    </div>
  );
}
