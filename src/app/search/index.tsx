import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  X,
  SlidersHorizontal,
  Star,
  Bookmark,
  SearchX,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, shadows, fonts } from '../../constants/theme';
import { useCategories, useSearchServices, useServices } from '../../services/queryClient';
import { formatKoboToNaira } from '../../utils/currency';
import { Modal } from '../../components/ui/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Service, Category } from '../../types';

type SortOption = 'recommended' | 'highest_rated' | 'price_low_high' | 'price_high_low' | 'most_popular';

export default function SearchScreen() {
  const { colors } = useAppTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedPriceBracket, setSelectedPriceBracket] = useState<string>('all');
  const [selectedMinRating, setSelectedMinRating] = useState<number>(0);
  const [selectedSort, setSelectedSort] = useState<SortOption>('recommended');

  const { data: allServices = [], isLoading: isServicesLoading } = useServices();
  const { data: liveSearch = [] } = useSearchServices(searchQuery.trim());

  const { data: categories = [] } = useCategories();

  // Live search: when a query is present use the server search results,
  // otherwise fall back to the full catalog list.

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedCategories.size > 0) count += selectedCategories.size;
    if (selectedPriceBracket !== 'all') count += 1;
    if (selectedMinRating > 0) count += 1;
    if (selectedSort !== 'recommended') count += 1;
    return count;
  }, [selectedCategories, selectedPriceBracket, selectedMinRating, selectedSort]);

  const toggleBookmark = (serviceId: string) => {
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const toggleCategoryFilter = (catId: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const resetFilters = () => {
    setSelectedCategories(new Set());
    setSelectedPriceBracket('all');
    setSelectedMinRating(0);
    setSelectedSort('recommended');
  };

  const services: Service[] = searchQuery.trim().length > 0 ? liveSearch : allServices;

  const filteredServices = useMemo(() => {
    let results = [...services];

    if (searchQuery.trim().length > 0 && liveSearch.length === 0) {
      const q = searchQuery.toLowerCase().trim();
      results = results.filter(
        (s: Service) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tagline?.toLowerCase().includes(q) ||
          categories.find((c: Category) => c.id === s.categoryId)?.name.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.size > 0) {
      results = results.filter((s) => selectedCategories.has(s.categoryId));
    }

    if (selectedPriceBracket === 'under_15k') {
      results = results.filter((s) => s.priceKobo < 1500000);
    } else if (selectedPriceBracket === '15k_30k') {
      results = results.filter((s) => s.priceKobo >= 1500000 && s.priceKobo <= 3000000);
    } else if (selectedPriceBracket === '30k_50k') {
      results = results.filter((s) => s.priceKobo > 3000000 && s.priceKobo <= 5000000);
    } else if (selectedPriceBracket === 'above_50k') {
      results = results.filter((s) => s.priceKobo > 5000000);
    }

    if (selectedMinRating > 0) {
      results = results.filter((s) => s.rating >= selectedMinRating);
    }

    if (selectedSort === 'highest_rated') {
      results.sort((a, b) => b.rating - a.rating);
    } else if (selectedSort === 'price_low_high') {
      results.sort((a, b) => a.priceKobo - b.priceKobo);
    } else if (selectedSort === 'price_high_low') {
      results.sort((a, b) => b.priceKobo - a.priceKobo);
    } else if (selectedSort === 'most_popular') {
      results.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    return results;
  }, [
    services,
    liveSearch,
    categories,
    searchQuery,
    selectedCategories,
    selectedPriceBracket,
    selectedMinRating,
    selectedSort,
  ]);

  const isSearchActive = searchQuery.trim().length > 0 || activeFiltersCount > 0;
  const trimmedQuery = searchQuery.trim();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header: back + search box + filter */}
      <View style={styles.headerBar}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <View style={[styles.searchBox, { backgroundColor: colors.inputFill }]}>
          <Search size={18} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={[styles.searchInput, { color: colors.textPrimary }]}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8} style={styles.clearBtn}>
              <X size={16} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => setIsFilterModalOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          hitSlop={8}
          style={styles.filterButton}
        >
          <SlidersHorizontal size={22} color={colors.primary} />
          {activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.filterBadgeText}>{activeFiltersCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isSearchActive ? (
          <View style={styles.emptyHintWrap}>
            <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
              Search verified cleaners, AC engineers, plumbers and more.
            </Text>
          </View>
        ) : (
          <View>
            {/* Results header */}
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>
                Results for{' '}
                <Text style={{ color: colors.primary }}>
                  “{trimmedQuery || 'filters'}”
                </Text>
              </Text>
              <Text style={[styles.resultsCount, { color: colors.primary }]}>
                {filteredServices.length} found
              </Text>
            </View>

            {isServicesLoading ? (
              <View style={styles.loadingList}>
                <LoadingSkeleton width="100%" height={120} borderRadius={16} />
                <View style={{ height: 12 }} />
                <LoadingSkeleton width="100%" height={120} borderRadius={16} />
              </View>
            ) : filteredServices.length > 0 ? (
              <View style={styles.resultsList}>
                {filteredServices.map((service: Service) => {
                  const providerName =
                    categories.find((c) => c.id === service.categoryId)?.name ||
                    'Verified Pro';
                  const isBookmarked = bookmarkedIds.has(service.id);
                  return (
                    <Pressable
                      key={service.id}
                      style={[styles.resultCard, { backgroundColor: colors.surface }]}
                      onPress={() => router.push(`/service/${service.id}`)}
                    >
                      <Image source={resolveImage(service.imageUrl)} style={styles.resultImage} />
                      <View style={styles.resultDetails}>
                        <Text
                          style={[styles.resultProvider, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {providerName}
                        </Text>
                        <Text
                          style={[styles.resultTitle, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {service.name}
                        </Text>
                        <Text style={[styles.resultPrice, { color: colors.primary }]}>
                          {service.isQuoteBased
                            ? 'Diagnostic Quote'
                            : formatKoboToNaira(service.priceKobo)}
                        </Text>
                        <View style={styles.ratingRow}>
                          <Star size={14} color={colors.warning} fill={colors.warning} />
                          <Text style={[styles.ratingScore, { color: colors.textPrimary }]}>
                            {service.rating}
                          </Text>
                          <Text style={[styles.reviewCount, { color: colors.textMuted }]}>
                            | {service.reviewCount} reviews
                          </Text>
                        </View>
                      </View>
                      <Pressable
                        onPress={() => toggleBookmark(service.id)}
                        hitSlop={8}
                        style={styles.resultBookmark}
                        accessibilityRole="button"
                        accessibilityLabel="Bookmark service"
                      >
                        <Bookmark
                          size={22}
                          color={colors.primary}
                          fill={isBookmarked ? colors.primary : 'transparent'}
                        />
                      </Pressable>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.notFoundWrap}>
                <View style={[styles.notFoundArt, { backgroundColor: colors.primaryLight }]}>
                  <SearchX size={72} color={colors.primary} />
                </View>
                <Text style={[styles.notFoundTitle, { color: colors.textPrimary }]}>
                  Not Found
                </Text>
                <Text style={[styles.notFoundSubtitle, { color: colors.textSecondary }]}>
                  Sorry, the keyword you entered cannot be found, please check again
                  or search with another keyword.
                </Text>
                <View style={styles.suggestedChipsRow}>
                  {['Cleaning', 'AC Servicing', 'Plumber', 'Generator'].map((tag) => (
                    <Pressable
                      key={tag}
                      style={[styles.suggestedChip, { backgroundColor: colors.inputFill }]}
                      onPress={() => setSearchQuery(tag)}
                    >
                      <Text style={[styles.suggestedChipText, { color: colors.primary }]}>
                        {tag}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {activeFiltersCount > 0 && (
                  <Pressable onPress={resetFilters} style={styles.resetBtn}>
                    <Text style={[styles.resetBtnText, { color: colors.primary }]}>
                      Reset Filters
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter bottom sheet */}
      <Modal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        type="bottomSheet"
        title="Filter"
      >
        <ScrollView style={styles.filterSheetContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.filterGroupTitle, { color: colors.textPrimary }]}>
            Category
          </Text>
          <View style={styles.filterChipsRow}>
            <Pressable
              style={[
                styles.filterChip,
                selectedCategories.size === 0
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedCategories(new Set())}
            >
              <Text
                style={[
                  styles.filterChipLabel,
                  { color: selectedCategories.size === 0 ? '#FFFFFF' : colors.primary },
                ]}
              >
                All
              </Text>
            </Pressable>
            {categories.map((cat: Category) => {
              const isSelected = selectedCategories.has(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.filterChip,
                    isSelected
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.primary },
                  ]}
                  onPress={() => toggleCategoryFilter(cat.id)}
                >
                  <Text
                    style={[
                      styles.filterChipLabel,
                      { color: isSelected ? '#FFFFFF' : colors.primary },
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.filterGroupTitle, { color: colors.textPrimary }]}>
            Price
          </Text>
          <View style={styles.filterChipsRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'under_15k', label: 'Under ₦15k' },
              { id: '15k_30k', label: '₦15k - ₦30k' },
              { id: '30k_50k', label: '₦30k - ₦50k' },
              { id: 'above_50k', label: '₦50k+' },
            ].map((bracket) => {
              const isSelected = selectedPriceBracket === bracket.id;
              return (
                <Pressable
                  key={bracket.id}
                  style={[
                    styles.filterChip,
                    isSelected
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedPriceBracket(bracket.id)}
                >
                  <Text
                    style={[
                      styles.filterChipLabel,
                      { color: isSelected ? '#FFFFFF' : colors.primary },
                    ]}
                  >
                    {bracket.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.filterGroupTitle, { color: colors.textPrimary }]}>
            Rating
          </Text>
          <View style={styles.filterChipsRow}>
            {[
              { rating: 0, label: 'All' },
              { rating: 5, label: '5' },
              { rating: 4, label: '4' },
              { rating: 3, label: '3' },
              { rating: 2, label: '2' },
            ].map((item) => {
              const isSelected = selectedMinRating === item.rating;
              return (
                <Pressable
                  key={item.rating}
                  style={[
                    styles.filterChip,
                    isSelected
                      ? { backgroundColor: colors.primary, borderColor: colors.primary }
                      : { backgroundColor: colors.surface, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedMinRating(item.rating)}
                >
                  <Star
                    size={13}
                    color={isSelected ? '#FFFFFF' : colors.primary}
                    fill={isSelected ? '#FFFFFF' : 'transparent'}
                  />
                  <Text
                    style={[
                      styles.filterChipLabel,
                      { color: isSelected ? '#FFFFFF' : colors.primary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.filterGroupTitle, { color: colors.textPrimary }]}>
            Sort By
          </Text>
          <View style={styles.sortList}>
            {[
              { id: 'recommended', label: 'Recommended' },
              { id: 'highest_rated', label: 'Highest Rated' },
              { id: 'most_popular', label: 'Most Popular' },
              { id: 'price_low_high', label: 'Price: Low to High' },
              { id: 'price_high_low', label: 'Price: High to Low' },
            ].map((sortItem) => {
              const isSelected = selectedSort === sortItem.id;
              return (
                <Pressable
                  key={sortItem.id}
                  style={styles.sortRow}
                  onPress={() => setSelectedSort(sortItem.id as SortOption)}
                >
                  <Text style={[styles.sortLabel, { color: colors.textPrimary }]}>
                    {sortItem.label}
                  </Text>
                  <View
                    style={[
                      styles.radioCircle,
                      { borderColor: isSelected ? colors.primary : colors.border },
                    ]}
                  >
                    {isSelected && (
                      <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.filterModalButtonsRow}>
            <Pressable
              style={[styles.resetButton, { backgroundColor: colors.primaryLight }]}
              onPress={resetFilters}
            >
              <Text style={[styles.resetButtonText, { color: colors.primary }]}>Reset</Text>
            </Pressable>
            <Pressable
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={() => setIsFilterModalOpen(false)}
            >
              <Text style={styles.applyButtonText}>Filter</Text>
            </Pressable>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.regular,
    paddingVertical: 4,
  },
  clearBtn: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontFamily: fonts.bold,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyHintWrap: {
    paddingTop: spacing.xl,
    alignItems: 'center',
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  resultsTitle: {
    fontSize: 17,
    fontFamily: fonts.display,
    flex: 1,
  },
  resultsCount: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  loadingList: {
    marginTop: spacing.sm,
  },
  resultsList: {
    gap: spacing.md,
  },
  resultCard: {
    flexDirection: 'row',
    borderRadius: radii.xl,
    padding: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
    ...shadows.sm,
  },
  resultImage: {
    width: 100,
    height: 100,
    borderRadius: radii.lg,
  },
  resultDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  resultProvider: {
    fontSize: 12,
    fontFamily: fonts.regular,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: fonts.display,
  },
  resultPrice: {
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
  resultBookmark: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  notFoundWrap: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  notFoundArt: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  notFoundTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    marginBottom: spacing.sm,
  },
  notFoundSubtitle: {
    fontSize: 14,
    fontFamily: fonts.regular,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  suggestedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  suggestedChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  suggestedChipText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  resetBtn: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
  resetBtnText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  filterSheetContent: {
    maxHeight: 520,
  },
  filterGroupTitle: {
    fontSize: 17,
    fontFamily: fonts.display,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  filterChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.2,
    gap: 5,
  },
  filterChipLabel: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
  },
  sortList: {
    marginTop: spacing.xs,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
  },
  sortLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  filterModalButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
