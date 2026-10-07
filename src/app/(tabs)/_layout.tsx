import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import {
  Home,
  CalendarCheck,
  Calendar,
  MessageSquare,
  User,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { fonts } from '../../constants/theme';

import { GeofenceGuard } from '@/components/GeofenceGuard';

export default function TabLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <GeofenceGuard>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.borderSubtle,
          },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Home size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <CalendarCheck size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <Calendar size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <MessageSquare size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <View style={focused ? styles.activeIconWrap : undefined}>
              <User size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
            </View>
          ),
        }}
      />
    </Tabs>
    </GeofenceGuard>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontFamily: fonts.semiBold,
    marginTop: 2,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  activeIconWrap: {
    transform: [{ scale: 1.05 }],
  },
});
