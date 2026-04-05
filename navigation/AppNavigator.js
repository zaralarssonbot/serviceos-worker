import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import LoginScreen from '../screens/LoginScreen';
import HemScreen from '../screens/HemScreen';
import SchemaScreen from '../screens/SchemaScreen';
import JobbDetaljerScreen from '../screens/JobbDetaljerScreen';
import LönScreen from '../screens/LönScreen';
import ProfilScreen from '../screens/ProfilScreen';
import { navigationRef } from '../services/navigationService';
import { COLORS } from '../services/auth';
import { useAuth } from '../context/AuthContext';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabIkon({ ruta, fokuserad }) {
  const ikoner = {
    Hem: fokuserad ? '🏠' : '🏡',
    Schema: fokuserad ? '📅' : '📆',
    Lön: fokuserad ? '💰' : '💳',
    Profil: fokuserad ? '👤' : '👥',
  };
  return <Text style={{ fontSize: 22 }}>{ikoner[ruta] || '•'}</Text>;
}

function HuvudTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0 },
        headerTitleStyle: { fontWeight: '800', fontSize: 18, color: COLORS.textPrimary },
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => <TabIkon ruta={route.name} fokuserad={focused} />,
      })}
    >
      <Tab.Screen
        name="Hem"
        component={HemScreen}
        options={{ title: 'Hem', headerTitle: 'serviceOS' }}
      />
      <Tab.Screen
        name="Schema"
        component={SchemaScreen}
        options={{ title: 'Schema', headerTitle: 'Mitt schema' }}
      />
      <Tab.Screen
        name="Lön"
        component={LönScreen}
        options={{ title: 'Lön', headerTitle: 'Löner' }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{ title: 'Profil', headerTitle: 'Min profil' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, kollar } = useAuth();

  // Vänta på att AsyncStorage-kontrollen är klar — undviker Login-flash
  if (kollar) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primary }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 }}>
          serviceOS
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="HuvudNavigator" component={HuvudTabs} />
            <Stack.Screen
              name="JobbDetaljer"
              component={JobbDetaljerScreen}
              options={{
                headerShown: true,
                title: 'Jobbdetaljer',
                headerStyle: { backgroundColor: COLORS.white },
                headerTitleStyle: { fontWeight: '800', color: COLORS.textPrimary },
                headerTintColor: COLORS.primary,
                presentation: 'card',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
    paddingBottom: 4,
    height: 62,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
});
