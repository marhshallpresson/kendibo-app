import React, { useState, useMemo } from 'react';
import { resolveImage } from '../../constants/images';
import { View, Text, ScrollView, StyleSheet, Pressable, Image, Share } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import {
  ArrowLeft,
  Share2,
  Bookmark,
  Star,
  Clock,
  ShieldCheck,
  Check,
  X,
  Plus,
  Minus,
  ChevronRight,
  MapPin,
  Heart,
} from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { spacing, radii, shadows, fonts } from '../../constants/theme';
import { useService } from '../../services/queryClient';
import { useCartStore } from '../../stores';
import { formatKoboToNaira } from '../../utils/currency';
import { Badge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { Button } from '../../components/ui/Button';
import { ServiceAddOn } from '../../types';

const STAR_AMBER = '#FFB800';

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const addItemToCart = useCartStore((state) => state.addItem);

  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedAddonQuantities, setSelectedAddonQuantities] = useState<Record<string, number>>({});
  const [aboutExpanded, setAboutExpanded] = useState(false);
  // Inline reviews preview (mockup 45 bottom half) — local likes only, logic preserved
  const [likedPreview, setLikedPreview] = useState<Set<string>>(new Set());

  const { data: service, isLoading } = useService(id || '');

  const handleShare = async () => {
    if (service) {
      await Share.share({ message: `Book ${service.name} on KENDIBO - Verified Home Services in Nigeria!` });
    }
  };

  const updateAddonQty = (addonId: string, delta: number, maxQty: number) => {
    setSelectedAddonQuantities((prev) => {
      const current = prev[addonId] || 0;
      const next = Math.max(0, Math.min(maxQty, current + delta));
      return { ...prev, [addonId]: next };
    });
  };

  const totalPriceKobo = useMemo(() => {
    if (!service) return 0;
    let total = service.priceKobo;
    if (service.addOns && service.addOns.length > 0) {
      for (const addon of service.addOns) {
        const qty = selectedAddonQuantities[addon.id] || 0;
        total += addon.priceKobo * qty;
      }
    }
    return total;
  }, [service, selectedAddonQuantities]);

  const handleBookNow = () => {
    if (!service) return;
    if (service.isQuoteBased) {
      router.push('/booking/quote-request');
      return;
    }
    const selectedAddOns: Array<{ addOn: ServiceAddOn; quantity: number }> = [];
    if (service.addOns) {
      for (const addon of service.addOns) {
        const qty = selectedAddonQuantities[addon.id] || 0;
        if (qty > 0) selectedAddOns.push({ addOn: addon, quantity: qty });
      }
    }
    addItemToCart(service, selectedAddOns);
    router.push('/booking/schedule');
  };

  const togglePreviewLike = (rid: string) => {
    setLikedPreview((prev) => {
      const next = new Set(prev);
      if (next.has(rid)) next.delete(rid);
      else next.add(rid);
      return next;
    });
  };

  if (isLoading || !service) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.md }]}>
        <LoadingSkeleton width="100%" height={260} borderRadius={20} />
        <View style={{ height: 20 }} />
        <LoadingSkeleton width="70%" height={28} />
        <View style={{ height: 12 }} />
        <LoadingSkeleton width="40%" height={22} />
        <View style={{ height: 20 }} />
        <LoadingSkeleton width="100%" height={100} lines={3} />
      </View>
    );
  }

  const aboutText = service.description;
  const aboutShort = aboutText.length > 140 && !aboutExpanded ? `${aboutText.slice(0, 140)}...` : aboutText;
  const gallery = [service.imageUrl, service.imageUrl, service.imageUrl, service.imageUrl];
  const previewReviews = [
    { id: 'pr1', name: 'Lauralee Quintero', rating: 5, text: 'Awesome! This is what I was looking for, I recommend to everyone.', likes: 724, date: '3 weeks ago' },
    { id: 'pr2', name: 'Clinton Mcclure', rating: 4, text: 'The workers are very professional and the results are very satisfying! I like it very much.', likes: 783, date: '1 week ago' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mockup 45: full-bleed hero with floating actions + dots */}
        <View style={styles.heroContainer}>
          <Image source={resolveImage(service.imageUrl)} style={styles.heroImage} />
          <View style={styles.heroOverlay}>
            <Pressable
              style={[styles.floatingIconBtn, { backgroundColor: colors.surface }]}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <ArrowLeft size={20} color={colors.textPrimary} />
            </Pressable>
            <View style={styles.heroRightActions}>
              <Pressable
                style={[styles.floatingIconBtn, { backgroundColor: colors.surface }]}
                onPress={handleShare}
                accessibilityRole="button"
                accessibilityLabel="Share"
              >
                <Share2 size={19} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                style={[styles.floatingIconBtn, { backgroundColor: colors.surface }]}
                onPress={() => setIsBookmarked(!isBookmarked)}
                accessibilityRole="button"
                accessibilityLabel="Bookmark"
              >
                <Bookmark size={19} color={isBookmarked ? colors.primary : colors.textPrimary} fill={isBookmarked ? colors.primary : 'transparent'} />
              </Pressable>
            </View>
          </View>
          <View style={styles.dotsRow}>
            {[0, 1, 2, 3].map((d) => (
              <View
                key={d}
                style={[
                  styles.dot,
                  d === 0 ? { backgroundColor: colors.primary, width: 22 } : { backgroundColor: 'rgba(255,255,255,0.7)' },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.mainInfoSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.serviceTitle, { color: colors.textPrimary, fontFamily: fonts.extraBold }]}>
              {service.name}
            </Text>
            <Pressable onPress={() => setIsBookmarked(!isBookmarked)} hitSlop={8} accessibilityLabel="Bookmark service">
              <Bookmark size={22} color={colors.primary} fill={isBookmarked ? colors.primary : 'transparent'} />
            </Pressable>
          </View>
          <View style={styles.providerRow}>
            <Text style={[styles.providerName, { color: colors.primary, fontFamily: fonts.bold }]}>
              {service.tagline ? service.tagline.split('•')[0].trim() : 'KENDIBO Verified Pro'}
            </Text>
            <Star size={14} color={STAR_AMBER} fill={STAR_AMBER} />
            <Text style={[styles.ratingScore, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>
              {service.rating} ({service.reviewCount} reviews)
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Badge label={service.isQuoteBased ? 'Inspection & Diagnosis' : 'Cleaning'} variant={service.isQuoteBased ? 'warning' : 'info'} size="sm" />
            <MapPin size={14} color={colors.primary} />
            <Text style={[styles.metaAddress, { color: colors.textSecondary, fontFamily: fonts.regular }]} numberOfLines={1}>
              Ewet Housing Estate, Uyo
            </Text>
          </View>
          <Text style={[styles.price, { color: colors.primary, fontFamily: fonts.extraBold }]}>
            {service.isQuoteBased ? '₦3,000 ' : formatKoboToNaira(service.priceKobo)}{' '}
            <Text style={[styles.priceNote, { color: colors.textMuted, fontFamily: fonts.regular }]}>
              (Floor price)
            </Text>
          </Text>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>About me</Text>
          <Text style={[styles.bodyDescription, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
            {aboutShort}{' '}
            {aboutText.length > 140 && (
              <Text style={{ color: colors.primary, fontFamily: fonts.bold }} onPress={() => setAboutExpanded(!aboutExpanded)}>
                {aboutExpanded ? 'Show less' : 'Read more...'}
              </Text>
            )}
          </Text>
        </View>

        {/* Mockup 45: Photos & Videos — 2-col staggered grid reusing service.imageUrl */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Photos & Videos</Text>
            <Text style={[styles.seeAll, { color: colors.primary, fontFamily: fonts.bold }]}>See All</Text>
          </View>
          <View style={styles.photoGrid}>
            {gallery.map((uri, i) => (
              <Image key={i} source={{ uri }} style={[styles.photoThumb, i % 2 === 1 && styles.photoThumbTall]} />
            ))}
          </View>
        </View>

        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>What&apos;s Included</Text>
          <View style={styles.checklist}>
            {(service.inclusions || [
              'Complete inspection of work area',
              'Industrial-grade equipment and materials included',
              'Final cleanup and debris disposal',
            ]).map((inc, i) => (
              <View key={i} style={styles.checkItem}>
                <View style={[styles.checkCircle, { backgroundColor: colors.badgeGreenBg }]}>
                  <Check size={13} color={colors.success} />
                </View>
                <Text style={[styles.checkText, { color: colors.textPrimary, fontFamily: fonts.regular }]}>{inc}</Text>
              </View>
            ))}
          </View>
          {service.exclusions && service.exclusions.length > 0 && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={[styles.subHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>What&apos;s Not Included</Text>
              <View style={styles.checklist}>
                {service.exclusions.map((exc, i) => (
                  <View key={i} style={styles.checkItem}>
                    <View style={[styles.checkCircle, { backgroundColor: colors.badgeRedBg }]}>
                      <X size={13} color={colors.error} />
                    </View>
                    <Text style={[styles.checkText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{exc}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {service.addOns && service.addOns.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Available Add-ons</Text>
              <Text style={[styles.optionalTag, { color: colors.textMuted, fontFamily: fonts.regular }]}>Optional</Text>
            </View>
            <View style={styles.addonsList}>
              {service.addOns.map((addon) => {
                const qty = selectedAddonQuantities[addon.id] || 0;
                return (
                  <View
                    key={addon.id}
                    style={[styles.addonCard, { backgroundColor: colors.surface, borderColor: qty > 0 ? colors.primary : colors.border }]}
                  >
                    <View style={styles.addonInfo}>
                      <Text style={[styles.addonName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{addon.name}</Text>
                      {addon.description && (
                        <Text style={[styles.addonDesc, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{addon.description}</Text>
                      )}
                      <Text style={[styles.addonPrice, { color: colors.primary, fontFamily: fonts.extraBold }]}>
                        +{formatKoboToNaira(addon.priceKobo)}
                      </Text>
                    </View>
                    <View style={[styles.stepperWrap, { backgroundColor: colors.surfaceCard }]}>
                      <Pressable
                        style={[styles.stepperBtn, { backgroundColor: colors.primaryLight }, qty === 0 && styles.stepperBtnDisabled]}
                        onPress={() => updateAddonQty(addon.id, -1, addon.maxQuantity)}
                        disabled={qty === 0}
                      >
                        <Minus size={14} color={colors.primary} />
                      </Pressable>
                      <Text style={[styles.stepperCount, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{qty}</Text>
                      <Pressable
                        style={[styles.stepperBtn, { backgroundColor: colors.primaryLight }, qty >= addon.maxQuantity && styles.stepperBtnDisabled]}
                        onPress={() => updateAddonQty(addon.id, 1, addon.maxQuantity)}
                        disabled={qty >= addon.maxQuantity}
                      >
                        <Plus size={14} color={colors.primary} />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Mockup 45: inline reviews preview */}
        <View style={styles.sectionBlock}>
          <Pressable style={styles.reviewsLink} onPress={() => router.push(`/service/reviews/${service.id}`)}>
            <Star size={14} color={STAR_AMBER} fill={STAR_AMBER} />
            <Text style={[styles.reviewsLinkText, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {service.rating} ({service.reviewCount} reviews)
            </Text>
            <Text style={[styles.seeAll, { color: colors.primary, fontFamily: fonts.bold }]}>See All</Text>
            <ChevronRight size={14} color={colors.primary} />
          </Pressable>
          <View style={styles.previewList}>
            {previewReviews.map((rev) => {
              const liked = likedPreview.has(rev.id);
              return (
                <View key={rev.id} style={styles.previewCard}>
                  <View style={styles.previewHeader}>
                    <View style={[styles.previewAvatar, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.previewInitial, { color: colors.primary, fontFamily: fonts.bold }]}>
                        {rev.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={[styles.previewName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{rev.name}</Text>
                    <View style={[styles.previewRatingPill, { borderColor: colors.primary }]}>
                      <Star size={11} color={colors.primary} fill={colors.primary} />
                      <Text style={[styles.previewRatingText, { color: colors.primary, fontFamily: fonts.bold }]}>{rev.rating}</Text>
                    </View>
                  </View>
                  <Text style={[styles.previewComment, { color: colors.textPrimary, fontFamily: fonts.regular }]}>{rev.text}</Text>
                  <View style={styles.previewFooter}>
                    <Pressable style={styles.previewLike} onPress={() => togglePreviewLike(rev.id)}>
                      <Heart size={15} color={liked ? colors.error : colors.textMuted} fill={liked ? colors.error : 'transparent'} />
                      <Text style={[styles.previewLikes, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>{rev.likes + (liked ? 1 : 0)}</Text>
                    </Pressable>
                    <Text style={[styles.previewDate, { color: colors.textMuted, fontFamily: fonts.regular }]}>{rev.date}</Text>
                  </View>
                </View>
              );
            })}
          </View>
          <Button title="Read All Reviews" variant="outline" size="md" onPress={() => router.push(`/service/reviews/${service.id}`)} />
        </View>

        <View style={[styles.warrantyCard, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={30} color={colors.primary} />
          <View style={styles.warrantyTextCol}>
            <Text style={[styles.warrantyTitle, { color: colors.primaryDark, fontFamily: fonts.bold }]}>
              {service.warrantyDays || 7}-Day KENDIBO Satisfaction Guarantee
            </Text>
            <Text style={[styles.warrantyBody, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              Free re-visit if anything isn&apos;t right. ({service.durationMinutes} mins standard)
            </Text>
          </View>
          <View style={[styles.clockChip, { backgroundColor: colors.surface }]}>
            <Clock size={14} color={colors.primary} />
            <Text style={[styles.clockText, { color: colors.textPrimary, fontFamily: fonts.semiBold }]}>{service.durationMinutes}m</Text>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Mockup 45/52: Message (light lavender) + Book Now (primary) */}
      <View style={[styles.stickyBottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Pressable
          style={[styles.messageBtn, { backgroundColor: colors.primaryLight }]}
          onPress={() => router.push(`/service/reviews/${service.id}`)}
          accessibilityRole="button"
          accessibilityLabel="Message"
        >
          <Text style={[styles.messageBtnText, { color: colors.primary, fontFamily: fonts.bold }]}>Message</Text>
        </Pressable>
        <Pressable
          style={[styles.bookNowBtn, { backgroundColor: colors.primary }]}
          onPress={handleBookNow}
          accessibilityRole="button"
          accessibilityLabel={service.isQuoteBased ? 'Request Quote' : 'Book Now'}
        >
          <View>
            <Text style={[styles.bookNowBtnText, { fontFamily: fonts.bold }]}>
              {service.isQuoteBased ? 'Request Quote' : 'Book Now'}
            </Text>
            <Text style={[styles.bookNowSub, { fontFamily: fonts.semiBold }]}>
              {service.isQuoteBased ? '₦3,000 Callout' : formatKoboToNaira(totalPriceKobo)}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: spacing.lg },
  heroContainer: { position: 'relative', width: '100%', height: 300 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  heroRightActions: { flexDirection: 'row', gap: spacing.sm },
  dotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  mainInfoSection: { padding: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  serviceTitle: { fontSize: 26, flex: 1 },
  providerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  providerName: { fontSize: 15 },
  ratingScore: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  metaAddress: { fontSize: 13, flex: 1 },
  price: { fontSize: 24, marginTop: 8 },
  priceNote: { fontSize: 13 },
  reviewsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: spacing.sm },
  reviewsLinkText: { fontSize: 14 },
  seeAll: { fontSize: 13, marginLeft: 'auto' },
  previewList: { gap: spacing.md, marginBottom: spacing.md },
  previewCard: { gap: 6 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  previewAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  previewInitial: { fontSize: 14 },
  previewName: { fontSize: 14, flex: 1 },
  previewRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  previewRatingText: { fontSize: 12 },
  previewComment: { fontSize: 13, lineHeight: 19 },
  previewFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  previewLike: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  previewLikes: { fontSize: 12 },
  previewDate: { fontSize: 11 },
  sectionBlock: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionHeading: { fontSize: 18 },
  bodyDescription: { fontSize: 14, lineHeight: 22, marginTop: 4 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  photoThumb: { width: '48%', height: 150, borderRadius: 16 },
  photoThumbTall: { height: 190 },
  subHeading: { fontSize: 14, marginBottom: spacing.xs },
  optionalTag: { fontSize: 12 },
  checklist: { gap: spacing.sm, marginTop: spacing.xs },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  checkCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontSize: 13, flex: 1 },
  addonsList: { gap: spacing.sm, marginTop: spacing.xs },
  addonCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  addonInfo: { flex: 1, marginRight: spacing.md },
  addonName: { fontSize: 14 },
  addonDesc: { fontSize: 12, marginTop: 2 },
  addonPrice: { fontSize: 14, marginTop: 4 },
  stepperWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: radii.full, paddingHorizontal: 4, paddingVertical: 4, gap: 2 },
  stepperBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stepperBtnDisabled: { opacity: 0.4 },
  stepperCount: { fontSize: 14, paddingHorizontal: spacing.sm },
  warrantyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: 20,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  warrantyTextCol: { flex: 1 },
  warrantyTitle: { fontSize: 13, marginBottom: 2 },
  warrantyBody: { fontSize: 11, lineHeight: 16 },
  clockChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.full },
  clockText: { fontSize: 12 },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  messageBtn: { flex: 1, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  messageBtnText: { fontSize: 15 },
  bookNowBtn: { flex: 1.4, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  bookNowBtnText: { color: '#FFFFFF', fontSize: 15, textAlign: 'center' },
  bookNowSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, textAlign: 'center' },
});

