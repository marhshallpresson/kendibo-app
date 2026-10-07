import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Star,
  Check,
  ShieldCheck,
  Plus,
  ShoppingCart,
  ArrowRight,
  Bookmark,
} from 'lucide-react-native';
import { useAppTheme } from '../../_layout';
import { spacing, radii, shadows, fonts, tileTints } from '../../../constants/theme';
import { useCategories, useServices } from '../../../services/queryClient';
import { useCartStore } from '../../../stores';
import { formatKoboToNaira } from '../../../utils/currency';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { Service, Category } from '../../../types';

const STAR_AMBER = '#FFB800';

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const cartItems = useCartStore((state) => state.items);
  const addItemToCart = useCartStore((state) => state.addItem);
  const cartTotal = useCartStore((state) => state.total);
  const [bookmarked, setBookmarked] = useState<Set<string>>(new Set());
  const [activeSubcategory, setActiveSubcategory] = useState<string>('all');

  const { data: categories = [] } = useCategories();

  const currentCategory: Category | undefined = useMemo(() => {
    return (
      categories.find((c: Category) => c.id === id || c.slug === id) || {
        id: id || 'services',
        name: typeof id === 'string' ? id : 'Service Category',
        slug: typeof id === 'string' ? id : 'services',
        description: 'Professional verified home services across Nigeria',
        iconName: 'Sparkles',
        sortOrder: 1,
        isActive: true,
      }
    );
  }, [categories, id]);

  const { data: allServices = [], isLoading: isServicesLoading } = useServices(
    typeof id === 'string' ? id : undefined,
  );

  const categoryServices = useMemo(() => {
    if (!allServices.length) return allServices;
    return allServices.filter(
      (s: Service) =>
        !currentCategory ||
        s.categoryId === currentCategory.id ||
        s.categoryId === currentCategory.slug ||
        (typeof id === 'string' && s.categoryId.includes(id))
    );
  }, [allServices, currentCategory, id]);

  const subcategories = useMemo(() => {
    const slug = currentCategory.slug;
    if (slug.includes('cleaning')) return ['All', 'Deep Cleaning', 'Sofa & Velvet', 'Post Construction', 'Move In/Out'];
    if (slug.includes('ac')) return ['All', 'General Servicing', 'Gas Refill', 'Installation', 'Diagnosis'];
    if (slug.includes('plumb')) return ['All', 'Pipe Leaks', 'Drainage', 'Pumping Machine', 'Water Heater'];
    if (slug.includes('electric')) return ['All', 'Wiring Faults', 'DB Board', 'Lighting & Sockets', 'Inverter'];
    if (slug.includes('generator')) return ['All', 'Periodic Service', 'Lister', 'Mikano & Perkins', 'Engine Check'];
    if (slug.includes('appliance')) return ['All', 'Refrigerator', 'Washing Machine', 'Microwave', 'Gas Cooker'];
    return ['All', 'Wall Painting', 'Wood Varnish', 'Carpentry', 'Waterproofing'];
  }, [currentCategory.slug]);

  const displayedServices = useMemo(() => {
    if (activeSubcategory === 'All' || activeSubcategory === 'all') return categoryServices;
    const keyword = activeSubcategory.toLowerCase();
    return categoryServices.filter(
      (s) =>
        s.name.toLowerCase().includes(keyword) ||
        s.description.toLowerCase().includes(keyword) ||
        s.tagline?.toLowerCase().includes(keyword)
    );
  }, [categoryServices, activeSubcategory]);

  const isServiceInCart = (serviceId: string) => cartItems.some((item) => item.service.id === serviceId);

  const toggleBookmark = (serviceId: string) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) next.delete(serviceId);
      else next.add(serviceId);
      return next;
    });
  };

  const handleCheckout = () => {
    // FIX: forward the tapped/cart service so schedule can seed correctly.
    const seedId = cartItems[0]?.service.id;
    if (seedId) {
      router.push({ pathname: '/booking/schedule', params: { serviceId: seedId } });
    } else {
      router.push('/booking/schedule');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Mockup 38: back + title + search */}
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
          {currentCategory.name}
        </Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.push('/search')}
          accessibilityRole="button"
          accessibilityLabel="Search"
        >
          <Search size={20} color={colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroStrip, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={16} color={colors.primary} />
          <Text style={[styles.heroStripText, { color: colors.primaryDark, fontFamily: fonts.semiBold }]}>
            Verified Artisans • 7–30 Days Rework Warranty
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subScroll}>
          {subcategories.map((subcat) => {
            const isActive = activeSubcategory === subcat;
            return (
              <Pressable
                key={subcat}
                style={[
                  styles.subcatPill,
                  isActive
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
                onPress={() => setActiveSubcategory(subcat)}
              >
                <Text
                  style={[
                    styles.subcatText,
                    { color: isActive ? '#FFFFFF' : colors.textSecondary, fontFamily: fonts.semiBold },
                  ]}
                >
                  {subcat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isServicesLoading ? (
          <View style={styles.loadingList}>
            <LoadingSkeleton width="100%" height={132} borderRadius={20} />
            <View style={{ height: 12 }} />
            <LoadingSkeleton width="100%" height={132} borderRadius={20} />
          </View>
        ) : displayedServices.length > 0 ? (
          <View style={styles.list}>
            {displayedServices.map((service: Service, idx: number) => {
              const inCart = isServiceInCart(service.id);
              const isMarked = bookmarked.has(service.id);
              const tint = tileTints[idx % tileTints.length];
              return (
                <Pressable
                  key={service.id}
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
                  onPress={() => router.push(`/service/${service.id}`)}
                >
                  {/* Tinted thumb behind Unsplash photo (mockup 38: rounded square left) */}
                  <View style={[styles.thumbWrap, { backgroundColor: tint }]}>
                    <Image source={resolveImage(service.imageUrl)} style={styles.thumb} />
                  </View>
                  <View style={styles.cardMain}>
                    <Text style={[styles.providerLine, { color: colors.textMuted, fontFamily: fonts.regular }]} numberOfLines={1}>
                      {service.tagline || currentCategory.name}
                    </Text>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]} numberOfLines={1}>
                      {service.name}
                    </Text>
                    <Text style={[styles.price, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                      {service.isQuoteBased ? 'Inspection ₦3,000' : formatKoboToNaira(service.priceKobo)}
                    </Text>
                    <View style={styles.ratingRow}>
                      <Star size={13} color={STAR_AMBER} fill={STAR_AMBER} />
                      <Text style={[styles.ratingText, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
                        {service.rating}
                      </Text>
                      <Text style={[styles.reviewText, { color: colors.textMuted, fontFamily: fonts.regular }]}>
                        | {service.reviewCount} reviews
                      </Text>
                    </View>
                    <View style={styles.cardActions}>
                      <Badge
                        label={service.isQuoteBased ? 'Quote' : 'Fixed Price'}
                        variant={service.isQuoteBased ? 'warning' : 'info'}
                        size="sm"
                      />
                      <Pressable
                        style={[
                          styles.bookPill,
                          inCart
                            ? { backgroundColor: colors.badgeGreenBg, borderColor: colors.success }
                            : { backgroundColor: colors.primary },
                        ]}
                        onPress={() => {
                          if (!inCart) addItemToCart(service);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={inCart ? 'In cart' : 'Add to cart'}
                      >
                        {inCart ? <Check size={14} color={colors.success} /> : <Plus size={14} color="#FFFFFF" />}
                        <Text style={[styles.bookPillText, { color: inCart ? colors.success : '#FFFFFF', fontFamily: fonts.bold }]}>
                          {inCart ? 'Added' : 'Book'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                  <Pressable
                    style={styles.bookmarkBtn}
                    onPress={() => toggleBookmark(service.id)}
                    hitSlop={8}
                    accessibilityLabel="Bookmark service"
                  >
                    <Bookmark
                      size={18}
                      color={isMarked ? colors.primary : colors.textMuted}
                      fill={isMarked ? colors.primary : 'transparent'}
                    />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>No services found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              There are currently no listed services in this subcategory.
            </Text>
          </View>
        )}
        <View style={{ height: 110 }} />
      </ScrollView>

      {cartItems.length > 0 && (
        <View style={[styles.floatingCartBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
          <View style={styles.floatingCartLeft}>
            <View style={[styles.cartIconCircle, { backgroundColor: colors.primaryLight }]}>
              <ShoppingCart size={20} color={colors.primary} />
              <View style={[styles.cartCountBadge, { backgroundColor: colors.error }]}>
                <Text style={styles.cartCountText}>{cartItems.length}</Text>
              </View>
            </View>
            <View>
              <Text style={[styles.cartItemsLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {cartItems.length} service{cartItems.length === 1 ? '' : 's'} in cart
              </Text>
              <Text style={[styles.cartTotalPrice, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                {formatKoboToNaira(cartTotal)}
              </Text>
            </View>
          </View>
          <Pressable
            style={[styles.checkoutBtn, { backgroundColor: colors.primary }]}
            onPress={handleCheckout}
            accessibilityRole="button"
            accessibilityLabel="Proceed to Schedule"
          >
            <Text style={[styles.checkoutBtnText, { fontFamily: fonts.bold }]}>Checkout</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, flex: 1 },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  heroStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroStripText: { fontSize: 12 },
  subScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  subcatPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1.5,
  },
  subcatText: { fontSize: 13 },
  loadingList: { marginTop: spacing.md },
  list: { gap: spacing.sm, marginTop: spacing.xs },
  card: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },
  thumbWrap: {
    width: 104,
    height: 118,
    borderRadius: 16,
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%' },
  cardMain: { flex: 1, justifyContent: 'center', gap: 2, paddingRight: 26 },
  providerLine: { fontSize: 11 },
  cardTitle: { fontSize: 16 },
  price: { fontSize: 16 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 12 },
  reviewText: { fontSize: 11 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  bookPillText: { fontSize: 13 },
  bookmarkBtn: { position: 'absolute', top: 10, right: 10, padding: 4 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 18, marginBottom: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
  floatingCartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  floatingCartLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cartIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartCountBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartCountText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  cartItemsLabel: { fontSize: 11 },
  cartTotalPrice: { fontSize: 16 },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.full,
    gap: 6,
  },
  checkoutBtnText: { color: '#FFFFFF', fontSize: 14 },
});
