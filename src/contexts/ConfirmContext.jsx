import React, { createContext, useContext, useState, useCallback } from 'react';
import ConfirmModal from '../components/ui/ConfirmModal';

const ConfirmContext = createContext(null);

/**
 * Provider for global confirmation dialogs
 * Replaces browser confirm() with custom modal
 * 
 * Usage:
 *   const { confirm } = useConfirm();
 *   const confirmed = await confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure?',
 *     variant: 'danger'
 *   });
 *   if (confirmed) { ... }
 */
export const ConfirmProvider = ({ children }) => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    isLoading: false,
    resolve: null
  });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        isLoading: false,
        resolve
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (state.resolve) {
      state.resolve(false);
    }
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleConfirm = useCallback(() => {
    if (state.resolve) {
      state.resolve(true);
    }
    setState(prev => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  // For async operations where you want to show loading state
  const confirmWithLoading = useCallback((options = {}) => {
    return new Promise((resolve) => {
      const wrappedResolve = async (result) => {
        if (result && options.onConfirm) {
          setState(prev => ({ ...prev, isLoading: true }));
          try {
            await options.onConfirm();
            resolve(true);
          } catch (error) {
            resolve(false);
          } finally {
            setState(prev => ({ ...prev, isOpen: false, isLoading: false, resolve: null }));
          }
        } else {
          resolve(result);
          setState(prev => ({ ...prev, isOpen: false, resolve: null }));
        }
      };

      setState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure you want to proceed?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        isLoading: false,
        resolve: wrappedResolve
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm, confirmWithLoading }}>
      {children}
      <ConfirmModal
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
        isLoading={state.isLoading}
      />
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export default ConfirmContext;
