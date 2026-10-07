import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Header, Button } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';

const AVAILABLE_SERVICES = [
  'Cleaning',
  'Repairing',
  'Painting',
  'Laundry',
  'Appliance',
  'Plumbing',
  'Shifting',
];

export default function KycServicesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { services, setServices } = useKycStore();

  const toggleService = (svc: string) => {
    if (services.includes(svc)) {
      setServices(services.filter((s) => s !== svc));
    } else {
      setServices([...services, svc]);
    }
  };

  const handleNext = () => {
    if (services.length === 0) {
      alert('Please select at least one service category.');
      return;
    }
    router.push('/(provider)/kyc/documents');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Service Selection" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 2: What do you do?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Select all the service categories you provide.
        </Text>

        <View style={styles.grid}>
          {AVAILABLE_SERVICES.map((svc) => {
            const isSelected = services.includes(svc);
            return (
              <Pressable
                key={svc}
                onPress={() => toggleService(svc)}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                ]}
              >
                <Text
                  style={[
                    styles.cardText,
                    { color: colors.textPrimary },
                    isSelected && { color: colors.primary, fontFamily: fonts.bold },
                  ]}
                >
                  {svc}
                </Text>
                {isSelected && <Check size={16} color={colors.primary} />}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Continue to Documents" onPress={handleNext} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: spacing.xxl,
  },
  grid: {
    gap: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  cardText: {
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});
