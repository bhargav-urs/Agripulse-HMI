import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useOperatorStore } from '../store/useOperatorStore';
import { SplashScreen } from '../screens/SplashScreen';
import { OperatorScreen } from '../screens/OperatorScreen';
import { MainTabs } from './MainTabs';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const hydrated = useOperatorStore((s) => s.hydrated);
  const entered = useOperatorStore((s) => s.entered);
  const hydrate = useOperatorStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {!hydrated ? (
        <Stack.Screen name="Splash" component={SplashScreen} />
      ) : !entered ? (
        <Stack.Screen name="Operator" component={OperatorScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
    </Stack.Navigator>
  );
};
