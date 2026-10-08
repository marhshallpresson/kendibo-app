import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bookmark, Star } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useBookmarkStore } from '../../stores/bookmarkStore';
import { useServices } from '../../services/queryClient';
import { resolveImage } from '../../constants/images';
import { formatKoboToNaira } from '../../utils/currency';
import { goBack } from '../../utils/navigation';

export default function SavedServicesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const savedServiceIds = useBookmarkStore((s) => s.savedServiceIds);
  const toggleBookmark = useBookmarkStore((s) => s.toggleBookmark);

  const { data: services = [], isLoading } = useServices();

  const savedServices = services.filter((s) => savedServiceIds.includes(s.id));

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => goBack('/(tabs)')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Saved Services</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ScrollView contentContainerStyle={styles.list}>
          <LoadingSkeleton width="100%" height={120} borderRadius={16} />
          <LoadingSkeleton width="100%" height={120} borderRadius={16} />
        </ScrollView>
      ) : savedServices.length === 0 ? (
        <EmptyState
          title="Nothing saved yet"
          description="Tap the bookmark icon on any service to save it here for quick access."
          icon={<Bookmark size={48} color={colors.primary} />}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {savedServices.map((service) => (
            <Pressable
              key={service.id}
              style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
              onPress={() => router.push(`/service/${service.id}`)}
            >
              <Image source={resolveImage(service.imageUrl)} style={styles.cardImage} />
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                  {service.name}
                </Text>
                <View style={styles.cardMetaRow}>
                  <Star size={13} color={colors.warning} fill={colors.warning} />
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                    {service.rating > 0 ? service.rating.toFixed(1) : 'New'}
                  </Text>
                </View>
                <Text style={[styles.cardPrice, { color: colors.primary }]}>
                  From {formatKoboToNaira(service.priceKobo)}
                </Text>
              </View>
              <Pressable
                onPress={() => toggleBookmark(service.id)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${service.name} from saved`}
                style={styles.bookmarkBtn}
              >
                <Bookmark size={20} color={colors.primary} fill={colors.primary} />
              </Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: { fontSize: 20, fontFamily: fonts.display, flex: 1 },
  list: { paddingHorizontal: spacing.md, paddingBottom: 40, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    borderRadius: radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  cardImage: { width: 96, height: 96 },
  cardBody: { flex: 1, padding: spacing.md, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: fonts.semiBold },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardMeta: { fontSize: 12, fontFamily: fonts.regular },
  cardPrice: { fontSize: 13, fontFamily: fonts.bold, marginTop: 2 },
  bookmarkBtn: { padding: spacing.md },
});
