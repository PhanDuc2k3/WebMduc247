import React from "react";
import { createPortal } from "react-dom";

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-[99999]"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
      }}
      onClick={() => onOpenChange && onOpenChange(false)}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
};

export const DialogContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = "",
}) => <div className={`p-4 ${className}`}>{children}</div>;

export const DialogHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-3 border-b pb-2">{children}</div>
);

export const DialogTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-xl font-bold">{children}</h2>
);

export const DialogFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mt-4 border-t pt-2 flex justify-end gap-2">{children}</div>
);
