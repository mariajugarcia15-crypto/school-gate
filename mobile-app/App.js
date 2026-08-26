// App.js
import { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/screens/LoginScreen';
import GateScreen from './src/screens/GateScreen';
import PermitsScreen from './src/screens/PermitsScreen';
import LogsScreen from './src/screens/LogsScreen';
import { AuthContext } from './src/context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#1a56db',
        tabBarInactiveTintColor: '#6b7280',
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 17, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Gate"
        component={GateScreen}
        options={{ title: 'Portería', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⬡</Text> }}
      />
      <Tab.Screen
        name="Permits"
        component={PermitsScreen}
        options={{ title: 'Permisos', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>◇</Text> }}
      />
      <Tab.Screen
        name="Logs"
        component={LogsScreen}
        options={{ title: 'Historial', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>▤</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('user').then((stored) => {
      if (stored) setUser(JSON.parse(stored));
      setLoading(false);
    });
  }, []);

  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              <Stack.Screen name="Main" component={MainTabs} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
}
