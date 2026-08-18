import { AlertTriangle } from "lucide-react";

type UnsavedChangesDialogProps = {
  isOpen: boolean;
  fileName: string;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
};

export function UnsavedChangesDialog({
  isOpen,
  fileName,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="unsaved-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-icon warning">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 id="unsaved-title">是否保存未保存的修改？</h3>
            <p className="modal-desc">
              文件 <strong>{fileName}</strong> 已被修改，离开或关闭前若不保存，所做更改将会丢失。
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="button" className="btn btn-danger" onClick={onDiscard}>
            放弃更改
          </button>
          <button type="button" className="btn btn-primary" onClick={onSave} autoFocus>
            保存文件
          </button>
        </div>
      </div>
    </div>
  );
}
