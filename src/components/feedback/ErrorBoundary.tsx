import { Component, type ErrorInfo, type ReactNode } from 'react';
import { L } from '@/i18n/labels';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /**
   * Lối thoát quan trọng nhất: cứu dữ liệu ra file trước khi làm gì khác.
   * Tuỳ chọn vì tầng dữ liệu chỉ có từ giai đoạn C — trước đó chưa có gì để cứu.
   */
  readonly onExportBackup?: () => void;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
}

/**
 * Lỗi trong một màn hình không được làm trắng cả app.
 * Người dùng luôn thấy hai lối thoát: tải lại, và lưu dữ liệu ra file.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center p-4">
        <ErrorState
          title={L.errorTitle}
          description={L.errorHint}
          detail={error.message}
          actions={
            <>
              <Button tone="primary" onClick={() => window.location.reload()}>
                {L.reload}
              </Button>
              {this.props.onExportBackup && (
                <Button onClick={this.props.onExportBackup}>{L.exportBackup}</Button>
              )}
            </>
          }
        />
      </div>
    );
  }
}
