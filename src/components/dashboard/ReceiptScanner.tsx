'use client';

import { useState, useRef } from 'react';

interface ParsedReceipt {
  merchant: string | null;
  date: string | null;
  amount: number | null;
  currency: string | null;
  converted_amount: number | null;
  home_currency: string;
  category: string | null;
  line_items: { description: string; price: number }[];
  tip: number | null;
  tax: number | null;
  confidence: 'high' | 'medium' | 'low';
}

interface Props {
  homeCurrency?: string;
  onReceiptParsed?: (data: ParsedReceipt) => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍜', Transport: '🚗', Accommodation: '🏨',
  Activities: '🎭', Shopping: '🛍️', Other: '🧾',
};

/**
 * ReceiptScanner — Finance Auditor UI (Pillar III)
 * Lets users upload a photo of any travel receipt.
 * Sends it to /api/finance/parse-receipt (Gemini Vision).
 * Returns structured expense data with currency conversion.
 */
export function ReceiptScanner({ homeCurrency = 'USD', onReceiptParsed }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParsedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/finance/parse-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type,
          homeCurrency,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? 'Failed to parse receipt');
      }

      const data: ParsedReceipt = await res.json();
      setResult(data);
      onReceiptParsed?.(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const confidenceColor = result?.confidence === 'high'
    ? 'text-emerald-400' : result?.confidence === 'medium'
    ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      {!result && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all
            ${dragging ? 'border-violet-500 bg-violet-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
          />
          {loading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              <p className="text-sm text-white/50">Gemini Vision is reading your receipt…</p>
            </>
          ) : (
            <>
              <span className="text-4xl">📷</span>
              <div className="text-center">
                <p className="font-semibold text-white text-sm">Scan a Receipt</p>
                <p className="text-xs text-white/40 mt-1">Take a photo or upload any receipt image</p>
              </div>
              <span className="rounded-full bg-violet-600/20 px-3 py-1 text-xs text-violet-400">
                Converts to {homeCurrency} automatically
              </span>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Parsed Result */}
      {result && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">{CATEGORY_EMOJI[result.category ?? 'Other'] ?? '🧾'}</span>
                <p className="font-bold text-white">{result.merchant ?? 'Unknown Merchant'}</p>
              </div>
              <p className="text-xs text-white/40 mt-0.5">{result.date ?? 'Date unknown'}</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-white">
                {result.amount != null ? `${result.amount} ${result.currency}` : '—'}
              </p>
              {result.converted_amount != null && result.currency !== result.home_currency && (
                <p className="text-xs text-white/50">
                  ≈ {result.converted_amount.toFixed(2)} {result.home_currency}
                </p>
              )}
            </div>
          </div>

          {/* Line Items */}
          {result.line_items?.length > 0 && (
            <div className="rounded-xl bg-white/5 divide-y divide-white/5">
              {result.line_items.map((item, i) => (
                <div key={i} className="flex justify-between px-3 py-2 text-xs">
                  <span className="text-white/60">{item.description}</span>
                  <span className="text-white">{item.price} {result.currency}</span>
                </div>
              ))}
              {result.tax != null && (
                <div className="flex justify-between px-3 py-2 text-xs text-white/40">
                  <span>Tax</span><span>{result.tax}</span>
                </div>
              )}
              {result.tip != null && (
                <div className="flex justify-between px-3 py-2 text-xs text-white/40">
                  <span>Tip</span><span>{result.tip}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1">
            <span className={`text-xs ${confidenceColor}`}>
              {result.confidence} confidence
            </span>
            <button
              onClick={() => setResult(null)}
              className="text-xs text-white/30 hover:text-white/60 transition"
            >
              Scan another →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
