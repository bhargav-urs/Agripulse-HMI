import type { NavigatorScreenParams } from '@react-navigation/native';

export type SystemStackParamList = {
  Settings: undefined;
  Diagnostics: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Pump: undefined;
  Automation: undefined;
  Alerts: undefined;
  History: undefined;
  System: NavigatorScreenParams<SystemStackParamList>;
};

export type RootStackParamList = {
  Splash: undefined;
  Operator: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
};
