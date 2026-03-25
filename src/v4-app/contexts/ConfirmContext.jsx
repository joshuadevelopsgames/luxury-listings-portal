/**
 * V4 ConfirmContext — mirrors V3 useConfirm() API.
 * Provides a simple confirm dialog that V3 pages use for destructive actions.
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialog({
        title: options.title || 'Are you sure?',
        message: options.message || options.description || '',
        confirmLabel: options.confirmLabel || options.confirmText || 'Confirm',
        cancelLabel: options.cancelLabel || options.cancelText || 'Cancel',
        variant: options.variant || options.type || 'default',
        onConfirm: () => { setDialog(null); resolve(true); },
        onCancel: () => { setDialog(null); resolve(false); },
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{dialog.title}</h3>
            {dialog.message && <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">{dialog.message}</p>}
            <div className="flex gap-3 justify-end">
              <button
                onClick={dialog.onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
              >
                {dialog.cancelLabel}
              </button>
              <button
                onClick={dialog.onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition ${
                  dialog.variant === 'destructive' || dialog.variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#0071e3] hover:bg-[#0077ed]'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
