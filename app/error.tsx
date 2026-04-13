'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Optionally log the error to an error reporting service
    console.error('Error caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-50 rounded-full p-4 w-16 h-16 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-[#191F28] text-center mb-3">
            문제가 발생했어요
          </h1>

          {/* Description */}
          <p className="text-[#575C66] text-center text-sm leading-relaxed mb-2">
            요청을 처리하는 중에 오류가 발생했습니다.
          </p>

          {/* Error Details (in development) */}
          {process.env.NODE_ENV === 'development' && error.message && (
            <div className="bg-[#F3F5F7] rounded-lg p-3 mb-6 text-xs text-[#191F28] overflow-auto max-h-24">
              <code className="text-red-600 font-mono break-words">
                {error.message}
              </code>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full bg-[#3182F6] hover:bg-[#2A6FE0] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              다시 시도
            </button>

            <Link
              href="/"
              className="w-full bg-[#F3F5F7] hover:bg-[#E8EAF0] text-[#191F28] font-semibold py-3 px-4 rounded-lg transition-colors duration-200 text-center"
            >
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
