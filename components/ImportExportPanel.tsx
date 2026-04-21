'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload, Download, FileSpreadsheet, ExternalLink,
  Check, RefreshCw, AlertCircle, ChevronDown, ChevronUp,
  Plus, Trash2, X, Clock,
} from 'lucide-react';
import type { GoogleSheetConnection } from '@/lib/types';

interface Props {
  scope: 'products' | 'inventory' | 'transactions';
  importType: 'products' | 'inventory';
  exportType: 'products' | 'inventory';
  exportLabel: string;
  onImported?: () => void;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '미동기화';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return '방금 전';
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}

export default function ImportExportPanel({ scope, importType, exportType, exportLabel, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [sheets, setSheets] = useState<GoogleSheetConnection[]>([]);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [syncResults, setSyncResults] = useState<Record<number, string>>({});

  // file import
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);

  const fetchSheets = useCallback(async () => {
    const res = await fetch(`/api/gsheets?scope=${scope}`);
    if (res.ok) setSheets(await res.json());
  }, [scope]);

  useEffect(() => {
    if (open) fetchSheets();
  }, [open, fetchSheets]);

  // Auto-sync stale sheets (>10 min) when panel opens
  useEffect(() => {
    if (!open || sheets.length === 0) return;
    const stale = sheets.filter(s => {
      if (!s.last_synced) return true;
      const diff = (Date.now() - new Date(s.last_synced).getTime()) / 1000;
      return diff > 600; // 10 minutes
    });
    stale.forEach(s => syncSheet(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sheets.length]);

  const syncSheet = async (id: number) => {
    setSyncingId(id);
    setSyncResults(r => ({ ...r, [id]: '' }));
    try {
      const res = await fetch(`/api/gsheets/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setSyncResults(r => ({ ...r, [id]: `오류: ${data.error}` }));
      } else {
        setSyncResults(r => ({ ...r, [id]: `${data.imported}개 가져옴, ${data.skipped}개 건너뜀` }));
        setSheets(prev => prev.map(s => s.id === id ? data.connection : s));
        if (data.imported > 0) onImported?.();
      }
    } catch {
      setSyncResults(r => ({ ...r, [id]: '오류: 네트워크 실패' }));
    } finally {
      setSyncingId(null);
    }
  };

  const syncAll = async () => {
    for (const s of sheets) {
      await syncSheet(s.id);
    }
  };

  const deleteSheet = async (id: number) => {
    await fetch(`/api/gsheets/${id}`, { method: 'DELETE' });
    setSheets(prev => prev.filter(s => s.id !== id));
  };

  const addSheet = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setAdding(true);
    const res = await fetch('/api/gsheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), url: newUrl.trim(), scope, import_type: importType }),
    });
    if (res.ok) {
      const conn: GoogleSheetConnection = await res.json();
      setSheets(prev => [...prev, conn]);
      setNewName('');
      setNewUrl('');
      setAddOpen(false);
      // sync immediately
      syncSheet(conn.id);
    }
    setAdding(false);
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
    if (data.imported > 0) onImported?.();
  };

  return (
    <div className="card overflow-hidden">
      {/* Toggle Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FileSpreadsheet size={15} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">데이터 가져오기 / 내보내기</span>
          {sheets.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">
              시트 {sheets.length}개
            </span>
          )}
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 p-5 space-y-5">

          {/* ── 구글 시트 연동 ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                  <rect width="24" height="24" rx="4" fill="#0F9D58" />
                  <rect x="6" y="8" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="11.25" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="14.5" width="8" height="1.5" rx="0.75" fill="white" />
                </svg>
                <p className="text-sm font-semibold text-gray-700">Google Sheets 연동</p>
              </div>
              <div className="flex items-center gap-2">
                {sheets.length > 1 && (
                  <button onClick={syncAll} disabled={syncingId !== null}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors">
                    <RefreshCw size={12} className={syncingId !== null ? 'animate-spin' : ''} /> 전체 동기화
                  </button>
                )}
                <button onClick={() => setAddOpen(o => !o)}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                  <Plus size={12} /> 시트 추가
                </button>
              </div>
            </div>

            {/* 시트 추가 폼 */}
            {addOpen && (
              <div className="bg-gray-50 rounded-xl p-4 mb-3 space-y-2.5">
                <div className="flex items-start gap-2 bg-blue-50 rounded-lg p-2.5">
                  <AlertCircle size={12} className="text-blue-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-700">"링크가 있는 모든 사용자" 공유 후 URL 입력</p>
                </div>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                  className="form-input text-sm" placeholder="시트 이름 (예: 4월 판매내역)" />
                <input type="text" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                  className="form-input text-sm" placeholder="https://docs.google.com/spreadsheets/d/..." />
                <div className="flex gap-2">
                  <button onClick={addSheet} disabled={adding || !newName.trim() || !newUrl.trim()}
                    className="btn-primary text-sm flex-1 justify-center">
                    {adding ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />} 연동 추가
                  </button>
                  <button onClick={() => setAddOpen(false)} className="btn-secondary text-sm px-3">
                    <X size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* 연동된 시트 목록 */}
            {sheets.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-xl p-4 text-center text-sm text-gray-400">
                연동된 시트가 없습니다. 시트 추가를 눌러 연동하세요.
              </div>
            ) : (
              <div className="space-y-2">
                {sheets.map(s => (
                  <div key={s.id} className="border border-gray-100 rounded-xl p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${syncingId === s.id ? 'bg-blue-400 animate-pulse' : s.last_synced ? 'bg-green-400' : 'bg-gray-300'}`} />
                        <span className="text-sm font-medium text-gray-800 truncate">{s.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => syncSheet(s.id)} disabled={syncingId === s.id}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors">
                          <RefreshCw size={12} className={syncingId === s.id ? 'animate-spin' : ''} />
                          동기화
                        </button>
                        <button onClick={() => deleteSheet(s.id)}
                          className="p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 pl-4">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} /> {timeAgo(s.last_synced)}
                      </span>
                      {s.last_synced && (
                        <span className="text-xs text-gray-400">
                          {s.last_imported}개 가져옴
                        </span>
                      )}
                    </div>
                    {syncResults[s.id] && (
                      <p className={`text-xs mt-1.5 pl-4 ${syncResults[s.id].startsWith('오류') ? 'text-red-500' : 'text-green-600'}`}>
                        {syncResults[s.id]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 구분선 ── */}
          <div className="border-t border-gray-100" />

          {/* ── 파일 가져오기 + 내보내기 ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 엑셀/CSV 가져오기 */}
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet size={15} className="text-green-500" />
                <p className="text-xs font-semibold text-gray-700">엑셀 / CSV 가져오기</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">.xlsx, .xls, .csv 지원</p>
              {importResult && (
                <div className={`flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-lg mb-3 ${importResult.imported > 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                  <Check size={12} /> {importResult.imported}개 가져옴, {importResult.skipped}개 건너뜀
                </div>
              )}
              <div className="flex flex-col gap-2">
                <label className={`btn-primary text-xs cursor-pointer justify-center ${importing ? 'opacity-60 cursor-not-allowed' : ''}`}>
                  {importing ? <><RefreshCw size={12} className="animate-spin" /> 가져오는 중...</> : <><Upload size={12} /> 파일 선택</>}
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileImport} disabled={importing} className="hidden" />
                </label>
                <a href={`/api/template?type=${importType}`} className="btn-secondary text-xs justify-center">
                  <Download size={12} /> 양식 다운로드
                </a>
              </div>
            </div>

            {/* 내보내기 */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Download size={15} className="text-blue-500" />
                <p className="text-xs font-semibold text-gray-700">엑셀로 내보내기</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">현재 데이터를 엑셀 파일로 다운로드</p>
              <a href={`/api/export?type=${exportType}`} className="btn-primary text-xs inline-flex justify-center w-full">
                <Download size={12} /> {exportLabel} 다운로드
              </a>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
