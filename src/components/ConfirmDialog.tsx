import { useEffect } from 'react';

interface Props {
  message: string;
  confirmText: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ message, confirmText, busy, onConfirm, onCancel }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <div className="confirm-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div role="alertdialog" aria-modal="true" aria-label={message} className="confirm">
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn" onClick={onCancel} autoFocus>
            取消
          </button>
          <button className="btn btn-danger-text" style={{ fontWeight: 700 }} onClick={onConfirm} disabled={busy}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
