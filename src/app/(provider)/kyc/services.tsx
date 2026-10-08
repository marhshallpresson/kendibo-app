import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Check } from 'lucide-react-native';
import { Header, Button, EmptyState } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';
import { useCategories } from '../../../services/queryClient';

export default function KycServicesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { services, setServices } = useKycStore();
  const { data: categories = [], isLoading, isError, refetch } = useCategories();

  const toggleService = (id: string) => {
    if (services.includes(id)) {
      setServices(services.filter((s) => s !== id));
    } else {
      setServices([...services, id]);
    }
  };

  const handleNext = () => {
    if (services.length === 0) {
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

        {isLoading ? (
          <ActivityIndicator style={{ marginVertical: spacing.xl }} color={colors.primary} />
        ) : isError ? (
          <EmptyState
            title="Couldn't load categories"
            description="We couldn't fetch the service catalog. Please try again."
            buttonTitle="Retry"
            onButtonPress={() => refetch()}
          />
        ) : categories.length === 0 ? (
          <EmptyState
            title="No categories available"
            description="The service catalog is empty right now. Please check back soon."
          />
        ) : (
          <View style={styles.grid}>
            {categories.map((cat) => {
              const isSelected = services.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleService(cat.id)}
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
                    {cat.name}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.note, { color: colors.textSecondary }]}>
          Your final service offerings are confirmed after category qualification during verification.
        </Text>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Continue to Documents"
          onPress={handleNext}
          size="lg"
          disabled={services.length === 0}
        />
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
  note: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: spacing.lg,
    lineHeight: 17,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});
