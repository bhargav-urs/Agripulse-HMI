import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabParamList, SystemStackParamList } from './types';
import { colors } from '../theme';
import { useRealtime } from '../hooks/useRealtime';
import { useAckToast } from '../hooks/useAckToast';

import { DashboardScreen } from '../screens/DashboardScreen';
import { PumpControlScreen } from '../screens/PumpControlScreen';
import { AutomationScreen } from '../screens/AutomationScreen';
import { AlertsScreen } from '../screens/AlertsScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DiagnosticsScreen } from '../screens/DiagnosticsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const SystemStack = createNativeStackNavigator<SystemStackParamList>();

const SystemNavigator: React.FC = () => (
  <SystemStack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: colors.surface },
      headerTitleStyle: { color: colors.text },
      headerTintColor: colors.primary,
      contentStyle: { backgroundColor: colors.bg },
    }}>
    <SystemStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Device Settings' }} />
    <SystemStack.Screen
      name="Diagnostics"
      component={DiagnosticsScreen}
      options={{ title: 'Network Diagnostics' }}
    />
  </SystemStack.Navigator>
);

const tabIcon =
  (emoji: string) =>
  ({ focused }: { focused: boolean }) =>
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;

export const MainTabs: React.FC = () => {
  // Establish the realtime pipeline once, for the whole authenticated app.
  useRealtime();
  useAckToast();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}>
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ tabBarIcon: tabIcon('📊') }} />
      <Tab.Screen
        name="Pump"
        component={PumpControlScreen}
        options={{ tabBarIcon: tabIcon('🎛️') }}
      />
      <Tab.Screen
        name="Automation"
        component={AutomationScreen}
        options={{ tabBarLabel: 'Auto', tabBarIcon: tabIcon('🤖') }}
      />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ tabBarIcon: tabIcon('🔔') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ tabBarIcon: tabIcon('📈') }} />
      <Tab.Screen
        name="System"
        component={SystemNavigator}
        options={{ tabBarIcon: tabIcon('⚙️') }}
      />
    </Tab.Navigator>
  );
};
