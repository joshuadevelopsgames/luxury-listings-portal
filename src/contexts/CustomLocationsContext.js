import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabaseService } from '../services/supabaseService';
import { CRM_LOCATIONS } from '../services/crmService';

const CustomLocationsContext = createContext(null);

export function useCustomLocations() {
  const ctx = useContext(CustomLocationsContext);
  return ctx || {
    customLocations: [],
    customLocationsWithMeta: [],
    allLocationOptions: CRM_LOCATIONS,
    addCustomLocation: async () => {},
    removeCustomLocation: async () => {},
    refresh: () => {}
  };
}

export function CustomLocationsProvider({ children }) {
  const [customLocationsWithMeta, setCustomLocationsWithMeta] = useState([]);

  const refresh = useCallback(async () => {
    const list = await supabaseService.getCustomLocations();
    setCustomLocationsWithMeta(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const customLocations = customLocationsWithMeta.map((x) => x.value);
  const seenLower = new Set();
  const allLocationOptions = [...CRM_LOCATIONS, ...customLocations]
    .filter((loc) => {
      const key = (loc || '').toLowerCase();
      if (seenLower.has(key)) return false;
      seenLower.add(key);
      return true;
    })
    .sort();

  const addCustomLocation = useCallback(async (value, createdBy) => {
    await supabaseService.addCustomLocation(value, createdBy);
    await refresh();
  }, [refresh]);

  const removeCustomLocation = useCallback(async (value) => {
    await supabaseService.removeCustomLocation(value);
    await refresh();
  }, [refresh]);

  const value = {
    customLocations,
    customLocationsWithMeta,
    allLocationOptions,
    addCustomLocation,
    removeCustomLocation,
    refresh
  };

  return (
    <CustomLocationsContext.Provider value={value}>
      {children}
    </CustomLocationsContext.Provider>
  );
}
