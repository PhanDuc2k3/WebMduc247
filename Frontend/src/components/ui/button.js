import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
export const Button = ({ variant = "primary", className = "", children, ...props }) => {
    const base = "px-4 py-2 rounded font-medium transition text-sm focus:outline-none";
    const styles = variant === "outline"
        ? "border border-gray-400 text-gray-700 hover:bg-gray-100"
        : "bg-blue-600 text-white hover:bg-blue-700";
    return (_jsx("button", { className: `${base} ${styles} ${className}`, ...props, children: children }));
};
