import React from 'react';
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="splash" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="create-pin" />
      <Stack.Screen name="confirm-pin" />
      <Stack.Screen name="biometrics" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
