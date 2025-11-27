// app/(tabs)/_layout.js
import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';

export default function TabsLayout() {
  const [role, setRole] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const json = await AsyncStorage.getItem('@sanaol/auth/user');
        if (json) {
          const user = JSON.parse(json);
          setRole(user.role); // student / faculty
        } else {
          setRole('student'); // fallback
        }
      } catch {
        setRole('student');
      }
    };
    loadUser();
  }, []);

  if (role === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="orange" />
      </View>
    );
  }

  return (
    <Tabs
      initialRouteName="home-dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'orange',
      }}
    >
      <Tabs.Screen
        name="home-dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      {/* 👇 Only show Catering tab if FACULTY */}
      {role === 'faculty' && (
        <Tabs.Screen
          name="catering"
          options={{
            title: 'Catering',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="restaurant-outline" size={size} color={color} />
            ),
          }}
        />
      )}

      <Tabs.Screen
        name="customer-cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="order-tracking"
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="account-profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
