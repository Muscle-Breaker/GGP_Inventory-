'use client';

import { useState } from 'react';
import {
  Upload, Download, FileSpreadsheet, ExternalLink,
  Check, RefreshCw, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

interface Props {
  importType: 'products' | 'inventory';
  exportType: 'products' | 'inventory';
  exportLabel: string;
  onImported?: () => void;
}

export default function ImportExportPanel({ importType, exportType, exportLabel, onImported }: Props) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [gsUrl, setGsUrl] = useState('');
  const [gsLoading, setGsLoading] = useState(false);
  const [gsResult, setGsResult] = useState<string | null>(null);

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
    setGsResult(data.error ? `오류: ${data.error}` : `완료: ${data.imported}개 가져옴, ${data.skipped}개 건너뜀`);
    setGsLoading(false);
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
        </div>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* 엑셀/CSV 가져오기 */}
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSpreadsheet size={16} className="text-green-500" />
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

            {/* 구글 시트 연동 */}
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
                  <rect width="24" height="24" rx="4" fill="#0F9D58" />
                  <rect x="6" y="8" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="11.25" width="12" height="1.5" rx="0.75" fill="white" />
                  <rect x="6" y="14.5" width="8" height="1.5" rx="0.75" fill="white" />
                </svg>
                <p className="text-xs font-semibold text-gray-700">Google Sheets 연동</p>
              </div>
              <div className="flex items-start gap-1.5 bg-blue-50 rounded-lg px-2.5 py-2 mb-3">
                <AlertCircle size={11} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700">"링크가 있는 모든 사용자" 공유 후 URL 입력</p>
              </div>
              <input
                type="text"
                value={gsUrl}
                onChange={e => setGsUrl(e.target.value)}
                className="form-input text-xs mb-2"
                placeholder="https://docs.google.com/spreadsheets/d/..."
              />
              <button
                onClick={handleGoogleSheets}
                disabled={gsLoading || !gsUrl.trim()}
                className="btn-primary text-xs w-full justify-center"
              >
                {gsLoading ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />} 가져오기
              </button>
              {gsResult && (
                <div className={`mt-2 text-xs px-2.5 py-2 rounded-lg ${gsResult.startsWith('오류') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                  {gsResult}
                </div>
              )}
            </div>

            {/* 내보내기 */}
            <div className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Download size={16} className="text-blue-500" />
                <p className="text-xs font-semibold text-gray-700">엑셀로 내보내기</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">현재 데이터를 엑셀 파일로 다운로드합니다</p>
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
