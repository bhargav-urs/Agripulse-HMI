import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'agripulse.operator';

interface OperatorState {
  entered: boolean;
  operatorName: string;
  hydrated: boolean;
  enterAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useOperatorStore = create<OperatorState>((set) => ({
  entered: false,
  operatorName: 'Demo Operator',
  hydrated: false,

  enterAsDemo: async () => {
    await AsyncStorage.setItem(KEY, 'demo');
    set({ entered: true });
  },

  signOut: async () => {
    await AsyncStorage.removeItem(KEY);
    set({ entered: false });
  },

  hydrate: async () => {
    const value = await AsyncStorage.getItem(KEY);
    set({ entered: value === 'demo', hydrated: true });
  },
}));
