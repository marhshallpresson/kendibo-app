import React, { useState, useMemo } from 'react';
import { resolveImage } from '../../constants/images';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import {
  Bell,
  Bookmark,
  Search,
  SlidersHorizontal,
  Sparkles,
  Wind,
  Wrench,
  Zap,
  Cpu,
  Tv,
  Paintbrush,
  Hammer,
  Grid,
  Star,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import {
  spacing,
  radii,
  shadows,
  fonts,
  tileTints,
  tileTintIcons,
} from '../../constants/theme';
import { useCategories, useServices } from '../../services/queryClient';
import { useAuthStore, useLocationStore, useBookmarkStore } from '../../stores';
import { formatKoboToNaira } from '../../utils/currency';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { FloatingBookButton } from '../../components/ui/FloatingBookButton';
import { Service } from '../../types';

export default function HomeFeedScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const currentAddress = useLocationStore((state) => state.currentAddress);

  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const bookmarkedIds = useBookmarkStore((state) => state.savedServiceIds);
  const toggleBookmark = useBookmarkStore((state) => state.toggleBookmark);

  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    refetch: refetchCategories,
  } = useCategories();

  const {
    data: services = [],
    isLoading: isServicesLoading,
    refetch: refetchServices,
    isRefetching,
  } = useServices(
    selectedCategoryFilter === 'all' ? undefined : selectedCategoryFilter,
  );

  const onRefresh = async () => {
    await Promise.all([refetchCategories(), refetchServices()]);
  };

  const getCategoryIcon = (iconName: string, color: string) => {
    switch (iconName) {
      case 'Sparkles':
        return <Sparkles size={24} color={color} />;
      case 'Wind':
        return <Wind size={24} color={color} />;
      case 'Wrench':
        return <Wrench size={24} color={color} />;
      case 'Zap':
        return <Zap size={24} color={color} />;
      case 'Cpu':
        return <Cpu size={24} color={color} />;
      case 'Tv':
        return <Tv size={24} color={color} />;
      case 'Paintbrush':
        return <Paintbrush size={24} color={color} />;
      case 'Hammer':
        return <Hammer size={24} color={color} />;
      default:
        return <Sparkles size={24} color={color} />;
    }
  };

  const filteredServices = useMemo(() => services, [services]);

  const userName = user?.name || 'Kendibo User';
  const displayAddress = currentAddress
    ? `${currentAddress.street}, ${currentAddress.city || currentAddress.state || ''}`.replace(/, $/, '')
    : 'Add a service address to get started';

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
      {/* 1. Greeting header: avatar + name, bell + bookmark */}
      <View style={styles.topHeader}>
        <View style={styles.userRow}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {userName.charAt(0)}
            </Text>
          </View>
          <View style={styles.userTextCol}>
            <Text style={[styles.greetingText, { color: colors.textSecondary }]}>
              Good Morning 👋
            </Text>
            <Text style={[styles.userNameText, { color: colors.textPrimary }]}>
              {userName}
            </Text>
          </View>
        </View>

        <View style={styles.headerIconsRow}>
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            hitSlop={8}
            style={styles.headerIconBtn}
          >
            <Bell size={24} color={colors.textPrimary} />
            <View style={[styles.notificationDot, { borderColor: colors.background, backgroundColor: colors.error }]} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/saved')}
            accessibilityRole="button"
            accessibilityLabel="Saved services"
            hitSlop={8}
            style={styles.headerIconBtn}
          >
            <Bookmark size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {!!displayAddress && (
        <Pressable
          onPress={() => router.push('/booking/address')}
          accessibilityRole="button"
          accessibilityLabel="Change location"
          style={styles.addressRow}
        >
          <Text style={[styles.addressText, { color: colors.textMuted }]} numberOfLines={1}>
            {displayAddress}
          </Text>
        </Pressable>
      )}

      {/* 2. Search bar with filter icon */}
      <Pressable
        style={[styles.searchBar, { backgroundColor: colors.inputFill }]}
        onPress={() => router.push('/search')}
        accessibilityRole="button"
        accessibilityLabel="Search services"
      >
        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
        <Text style={[styles.searchPlaceholder, { color: colors.textMuted }]}>
          Search
        </Text>
        <SlidersHorizontal size={20} color={colors.primary} />
      </Pressable>

      {/* 3. Service categories icon grid in tinted circles */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Services
          </Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text style={[styles.sectionSeeAll, { color: colors.primary }]}>
              See All
            </Text>
          </Pressable>
        </View>

        {isCategoriesLoading ? (
          <View style={styles.categoriesSkeletonRow}>
            {[1, 2, 3, 4].map((n) => (
              <LoadingSkeleton key={n} width={64} height={64} borderRadius={32} />
            ))}
          </View>
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.slice(0, 7).map((category, idx) => {
              const tint = tileTints[idx % tileTints.length];
              const iconColor = tileTintIcons[idx % tileTintIcons.length];
              return (
                <Pressable
                  key={category.id}
                  style={styles.categoryItem}
                  onPress={() => router.push(`/service/category/${category.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={category.name}
                >
                  <View style={[styles.categoryIconCircle, { backgroundColor: tint }]}>
                    {getCategoryIcon(category.iconName, iconColor)}
                  </View>
                  <Text
                    style={[styles.categoryName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              style={styles.categoryItem}
              onPress={() => router.push('/search')}
              accessibilityRole="button"
              accessibilityLabel="More services"
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: tileTints[7 % tileTints.length] }]}>
                <Grid size={24} color={tileTintIcons[7 % tileTintIcons.length]} />
              </View>
              <Text style={[styles.categoryName, { color: colors.textPrimary }]}>
                More
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* 5. Most Popular Services */}
      <View style={styles.sectionWrap}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Most Popular Services
          </Text>
          <Pressable onPress={() => router.push('/search')}>
            <Text style={[styles.sectionSeeAll, { color: colors.primary }]}>
              See All
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterPillsContainer}
        >
          <Pressable
            style={[
              styles.filterPill,
              selectedCategoryFilter === 'all'
                ? { backgroundColor: colors.primary, borderColor: colors.primary }
                : { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedCategoryFilter('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: selectedCategoryFilter === 'all' ? '#FFFFFF' : colors.primary },
              ]}
            >
              All
            </Text>
          </Pressable>
          {categories.map((cat) => {
            const isActive = selectedCategoryFilter === cat.id;
            return (
              <Pressable
                key={cat.id}
                style={[
                  styles.filterPill,
                  isActive
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedCategoryFilter(cat.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isActive ? '#FFFFFF' : colors.primary },
                  ]}
                >
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isServicesLoading ? (
          <View style={styles.servicesLoadingWrap}>
            <LoadingSkeleton width="100%" height={120} borderRadius={16} />
            <View style={{ height: 12 }} />
            <LoadingSkeleton width="100%" height={120} borderRadius={16} />
          </View>
        ) : filteredServices.length === 0 ? (
          <EmptyState
            title="No Services Found"
            description="Try a different category to explore verified home service specialists."
            actionTitle="Explore All"
            onActionPress={() => setSelectedCategoryFilter('all')}
          />
        ) : (
          <View style={styles.servicesList}>
            {filteredServices.slice(0, 8).map((service: Service) => {
              const isBookmarked = bookmarkedIds.includes(service.id);
              const categoryName = categories.find(
                (c) => c.id === service.categoryId,
              )?.name;
              const providerLine = categoryName || service.providerName || '';
              const hasReviews = service.reviewCount > 0 || service.rating > 0;
              return (
                <Pressable
                  key={service.id}
                  style={[styles.serviceCard, { backgroundColor: colors.surface }]}
                  onPress={() => router.push(`/service/${service.id}`)}
                >
                  <Image source={resolveImage(service.imageUrl)} style={styles.serviceImage} />

                  <View style={styles.serviceDetails}>
                    {!!providerLine && (
                      <Text
                        style={[styles.providerName, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {providerLine}
                      </Text>
                    )}
                    <Text
                      style={[styles.serviceName, { color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {service.name}
                    </Text>
                    <Text style={[styles.priceTag, { color: colors.primary }]}>
                      {service.isQuoteBased
                        ? 'Inspection fee on quote'
                        : formatKoboToNaira(service.priceKobo)}
                    </Text>
                    {hasReviews && (
                      <View style={styles.ratingRow}>
                        <Star size={14} color={colors.warning} fill={colors.warning} />
                        <Text style={[styles.ratingScore, { color: colors.textPrimary }]}>
                          {service.rating}
                        </Text>
                        <Text style={[styles.reviewCount, { color: colors.textMuted }]}>
                          | {service.reviewCount} reviews
                        </Text>
                      </View>
                    )}
                  </View>

                  <Pressable
                    onPress={() => toggleBookmark(service.id)}
                    hitSlop={8}
                    style={styles.bookmarkBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Bookmark service"
                  >
                    <Bookmark
                      size={22}
                      color={isBookmarked ? colors.primary : colors.primary}
                      fill={isBookmarked ? colors.primary : 'transparent'}
                    />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      <View style={{ height: 40 }} />
      </ScrollView>
      <FloatingBookButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontSize: 20,
    fontFamily: fonts.display,
  },
  userTextCol: {
    flex: 1,
  },
  greetingText: {
    fontSize: 13,
    fontFamily: fonts.regular,
  },
  userNameText: {
    fontSize: 19,
    fontFamily: fonts.display,
    marginTop: 1,
  },
  headerIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerIconBtn: {
    position: 'relative',
    padding: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  addressRow: {
    marginBottom: spacing.sm,
    marginLeft: 56,
  },
  addressText: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: fonts.display,
  },
  sectionSeeAll: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  categoriesSkeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryItem: {
    width: '25%',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    textAlign: 'center',
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.2,
  },
  filterPillText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  servicesLoadingWrap: {
    marginTop: spacing.sm,
  },
  servicesList: {
    gap: spacing.md,
  },
  serviceCard: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  serviceImage: {
    width: 110,
    height: 110,
    borderRadius: radii.lg,
  },
  serviceDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  providerName: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  serviceName: {
    fontSize: 16,
    fontFamily: fonts.display,
  },
  priceTag: {
    fontSize: 16,
    fontFamily: fonts.display,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingScore: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
  reviewCount: {
    fontSize: 11,
    fontFamily: fonts.regular,
  },
  bookmarkBtn: {
    padding: 4,
    alignSelf: 'flex-start',
  },
});


