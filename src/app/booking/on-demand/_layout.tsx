import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { theme } from '../../../constants/theme';

export default function OnDemandLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.light.colors.background },
        headerTintColor: theme.light.colors.textPrimary,
        headerTitleStyle: { fontFamily: 'Inter-SemiBold' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
            <ArrowLeft size={24} color={theme.light.colors.textPrimary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="1-service" options={{ title: 'Book a visit' }} />
      <Stack.Screen name="2-urgency-address" options={{ title: 'Urgency & Address' }} />
      <Stack.Screen name="3-date-time" options={{ title: 'Date & Time' }} />
      <Stack.Screen name="4-contact" options={{ title: 'Contact Details' }} />
      <Stack.Screen name="5-confirmation" options={{ title: 'Confirmation', headerShown: false }} />
    </Stack>
  );
}

