"use client";

import {
  Toast,
  ToastClose,
  ToastTitle,
  ToastDescription,
  ToastIcon,
} from "@/components/ui/toast";
import * as React from "react";
import { createContext, useContext, useState } from "react";

interface ToastProps {
  id: string;
  title?: string;
  description?: string;
  duration?: number;
  variant?: "default" | "success" | "destructive";
}

interface ToastContextType {
  toasts: ToastProps[];
  addToast: (toast: Omit<ToastProps, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const addToast = (toast: Omit<ToastProps, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id);
      }, toast.duration || 5000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}

      <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 p-4 md:max-w-[420px]">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex items-center w-full">
            <Toast variant={toast.variant} className="flex gap-3 items-start">
              {toast.variant && <ToastIcon variant={toast.variant} />}
              <div className="flex-1">
                {toast.title && <ToastTitle>{toast.title}</ToastTitle>}
                {toast.description && (
                  <ToastDescription>{toast.description}</ToastDescription>
                )}
              </div>
              <ToastClose onClick={() => removeToast(toast.id)} />
            </Toast>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};