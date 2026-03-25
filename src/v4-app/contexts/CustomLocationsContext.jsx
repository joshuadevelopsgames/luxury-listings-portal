import { createContext } from 'react';

export const CustomLocationsContext = createContext({ locations: [], loading: false });

export const useCustomLocations = () => ({ locations: [], loading: false });
