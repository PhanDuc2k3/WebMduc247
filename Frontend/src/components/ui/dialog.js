import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import { createPortal } from "react-dom";
export const Dialog = ({ open, onOpenChange, children }) => {
    if (!open)
        return null;
    const dialogContent = (_jsx("div", { className: "fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-md z-[99999]", style: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
        }, onClick: () => onOpenChange && onOpenChange(false), children: _jsx("div", { className: "bg-white rounded-lg shadow-lg w-full max-w-2xl p-4", onClick: (e) => e.stopPropagation(), children: children }) }));
    return createPortal(dialogContent, document.body);
};
export const DialogContent = ({ children, className = "", }) => _jsx("div", { className: `p-4 ${className}`, children: children });
export const DialogHeader = ({ children }) => (_jsx("div", { className: "mb-3 border-b pb-2", children: children }));
export const DialogTitle = ({ children }) => (_jsx("h2", { className: "text-xl font-bold", children: children }));
export const DialogFooter = ({ children }) => (_jsx("div", { className: "mt-4 border-t pt-2 flex justify-end gap-2", children: children }));
