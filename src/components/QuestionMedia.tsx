import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { MathDiagram } from './MathDiagrams';

interface QuestionMediaProps {
  diagramId?: string;
  imageUrl?: string;
  className?: string;
}

export function QuestionMedia({ diagramId, imageUrl, className = '' }: QuestionMediaProps) {
  const [zoomed, setZoomed] = useState(false);

  if (!diagramId && !imageUrl) return null;

  return (
    <>
      <div className={`space-y-2.5 ${className}`}>
        {diagramId && (
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 dark:border-slate-800 dark:bg-slate-950/75">
            <MathDiagram id={diagramId} />
          </div>
        )}

        {imageUrl && (
          <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-950">
            <img
              src={imageUrl}
              alt="題目附圖"
              onClick={() => setZoomed(true)}
              className="mx-auto max-h-56 w-auto cursor-zoom-in rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setZoomed(true)}
              title="點擊放大圖片"
              className="absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-lg bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white opacity-85 hover:opacity-100"
            >
              <Maximize2 className="h-3 w-3" aria-hidden="true" />
              <span>放大圖表</span>
            </button>
          </div>
        )}
      </div>

      {zoomed && imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88dvh] max-w-4xl overflow-auto rounded-2xl border border-slate-700 bg-white p-3.5 shadow-2xl sm:p-4 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              aria-label="關閉圖片放大預覽"
              className="absolute top-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/85 text-white hover:bg-slate-800 sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <img src={imageUrl} alt="題目附圖放大" className="max-h-[78dvh] w-auto rounded-xl object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
