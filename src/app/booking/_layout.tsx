import React from 'react';
import { Stack } from 'expo-router';

export default function BookingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="schedule" options={{ title: 'Select Date & Time' }} />
      <Stack.Screen name="address" options={{ title: 'Select Service Address' }} />
      <Stack.Screen name="quote-request" options={{ title: 'Request Diagnostic Quote' }} />
      <Stack.Screen name="quote-review" options={{ title: 'Review Quote' }} />
      <Stack.Screen name="cart" options={{ title: 'Booking Summary' }} />
    </Stack>
  );
}
