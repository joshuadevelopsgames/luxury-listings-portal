/**
 * useOpenClientCard - Shared hook to open the unified client profile modal.
 * Use for row/card click so "edit client" is always the same ClientDetailModal.
 */

import { useState, useCallback } from 'react';

export function useOpenClientCard() {
  const [clientForModal, setClientForModal] = useState(null);

  const openClientCard = useCallback((client) => {
    if (client) setClientForModal(client);
  }, []);

  const closeClientCard = useCallback(() => {
    setClientForModal(null);
  }, []);

  return { clientForModal, openClientCard, closeClientCard };
}
