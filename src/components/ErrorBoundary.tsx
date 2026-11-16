import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    let friendly = error.message || '發生未預期的程式錯誤';
    try {
      const parsed = JSON.parse(friendly) as { error?: string; operationType?: string };
      if (parsed && parsed.error) {
        friendly = `雲端同步或資料庫存取錯誤（${parsed.operationType ?? 'unknown'}）：${parsed.error}`;
      }
    } catch {
      // Plain text error message
    }
    return { hasError: true, message: friendly };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#070B14] p-6 text-slate-100">
          <div className="w-full max-w-lg rounded-2xl border border-rose-500/40 bg-[#0D1424] p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6 shrink-0" aria-hidden="true" />
              <h1 className="text-lg font-bold">領航系統偵測到異常狀態</h1>
            </div>
            <p className="mt-3 rounded-xl border border-slate-800 bg-[#080D1A] p-4 font-mono text-xs leading-relaxed text-slate-300">
              {this.state.message}
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>重新啟動領航介面</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
