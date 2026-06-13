'use strict';
'use client';

import React, { useState } from 'react';
import axiosInstance from '@/lib/axios';
import { 
  BrainCircuit, 
  Sparkles, 
  Send, 
  Loader2, 
  CheckCircle,
  HelpCircle,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

// A simple but powerful Markdown-to-HTML formatter component that doesn't need external dependencies
function CustomMarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');

  return (
    <div className="space-y-4 text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
      {lines.map((line, index) => {
        let trimmed = line.trim();
        
        // 1. Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={index} className="text-lg font-bold text-slate-900 dark:text-white mt-5 mb-2 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-yellow-500 dark:text-yellow-400 animate-pulse" />
              {trimmed.substring(4)}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={index} className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mt-4 mb-2">
              {trimmed.substring(5)}
            </h4>
          );
        }

        // 2. Lists
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
          const listText = trimmed.substring(2);
          // Parse bold text **bold** -> <strong>bold</strong>
          const formatted = parseInlineFormatting(listText);
          return (
            <li key={index} className="list-disc list-inside ml-4 text-slate-700 dark:text-slate-300 mt-1" dangerouslySetInnerHTML={{ __html: formatted }}></li>
          );
        }

        // 3. Number lists
        if (/^\d+\.\s/.test(trimmed)) {
          const listText = trimmed.replace(/^\d+\.\s/, '');
          const formatted = parseInlineFormatting(listText);
          return (
            <div key={index} className="flex gap-2.5 ml-2 mt-1.5">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">{trimmed.match(/^\d+/)![0]}.</span>
              <span className="text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formatted }}></span>
            </div>
          );
        }

        // 4. Empty line
        if (trimmed === '') {
          return <div key={index} className="h-2"></div>;
        }

        // 5. Normal paragraph
        const formattedParagraph = parseInlineFormatting(trimmed);
        return (
          <p key={index} className="text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: formattedParagraph }}></p>
        );
      })}
    </div>
  );
}

// Helpers for bold, inline code, and backticks formatting
function parseInlineFormatting(text: string) {
  let res = text;
  // Bold **word**
  res = res.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900 dark:text-white font-semibold">$1</strong>');
  // Inline code `code`
  res = res.replace(/`(.*?)`/g, '<code class="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 text-xs text-indigo-600 dark:text-indigo-400 font-mono">$1</code>');
  return res;
}

export default function AiAdvisorPage() {
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);

  const handleGetAdvice = async () => {
    setLoading(true);
    setAdvice(null);
    try {
      const res = await axiosInstance.post('/ai/savings-suggestion');
      if (res.data.success) {
        setAdvice(res.data.data);
      }
    } catch (err) {
      console.error(err);
      setAdvice('### Lỗi hệ thống\n\nKhông thể kết nối đến AI Advisor. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau ít phút.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
          <BrainCircuit className="h-8 w-8 text-indigo-600 dark:text-indigo-500" />
          Cố vấn tài chính AI
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Cung cấp báo cáo phân tích chi tiêu cá nhân thông minh và các giải pháp tiết kiệm hiệu quả từ Trí tuệ Nhân tạo.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Intro Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-950/20 p-6 shadow-xl backdrop-blur-md">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
          <div className="flex gap-4 items-start z-10 relative">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shrink-0 text-white shadow-lg shadow-indigo-600/20">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Bạn muốn tối ưu hóa chi tiêu trong tháng?</h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1.5 leading-relaxed">
                Hệ thống sẽ lấy danh sách các giao dịch tài chính gần nhất của bạn, phân tích thói quen mua sắm, ăn uống và hóa đơn, sau đó đưa ra báo cáo chi tiết kèm theo các giải pháp vàng để tiết kiệm tiền mặt hữu hiệu.
              </p>
              
              <button
                onClick={handleGetAdvice}
                disabled={loading}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang phân tích dữ liệu...
                  </>
                ) : (
                  <>
                    <BrainCircuit className="h-4 w-4" />
                    Phân tích & Nhận lời khuyên AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* AI Response Output Block */}
        {(loading || advice) && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-xl backdrop-blur-md min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 dark:text-slate-400">
                <div className="relative">
                  <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                  <BrainCircuit className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-2">Cố vấn AI đang xử lý giao dịch của bạn...</p>
                <p className="text-xs max-w-sm text-center">Chúng tôi đang trích xuất dữ liệu, định dạng prompt và gọi Gemini API để tổng hợp lời khuyên tài chính cá nhân tốt nhất cho bạn.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                    <BrainCircuit className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Trí tuệ nhân tạo Finance Advisor</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Phản hồi dựa trên dữ liệu thu chi thực tế của bạn</p>
                  </div>
                </div>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <CustomMarkdownRenderer content={advice || ''} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
