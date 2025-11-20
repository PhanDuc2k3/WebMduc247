import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  loading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  type = "warning",
  loading = false,
}) => {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const getTypeStyles = () => {
    switch (type) {
      case "danger":
        return {
          icon: "text-red-500",
          button: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        };
      case "warning":
        return {
          icon: "text-yellow-500",
          button: "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
        };
      case "info":
        return {
          icon: "text-blue-500",
          button: "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
        };
      default:
        return {
          icon: "text-yellow-500",
          button: "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600",
        };
    }
  };

  const styles = getTypeStyles();

  const dialogContent = (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b-2 border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full bg-gray-100 ${styles.icon}`}>
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{title}</h3>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6">
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{message}</p>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t-2 border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 ${styles.button} text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Render vào body để đảm bảo che phủ toàn bộ màn hình
  return createPortal(dialogContent, document.body);
};

export default ConfirmDialog;

