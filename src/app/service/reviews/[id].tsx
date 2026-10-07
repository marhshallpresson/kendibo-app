import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ArrowLeft, Star, Heart, MoreHorizontal, MessageSquare } from 'lucide-react-native';
import { useAppTheme } from '../../_layout';
import { spacing, radii, shadows, fonts } from '../../../constants/theme';
import { useService } from '../../../services/queryClient';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';

const STAR_AMBER = '#FFB800';

interface MockReviewItem {
  id: string;
  userName: string;
  avatarUrl?: string;
  rating: number;
  date: string;
  comment: string;
  likes: number;
  tags: string[];
}

const INITIAL_REVIEWS: MockReviewItem[] = [
  {
    id: 'rev-1',
    userName: 'Lauralee Quintero',
    rating: 5,
    date: '3 weeks ago',
    comment: 'Awesome! This is what I was looking for, I recommend to everyone.',
    likes: 724,
    tags: ['On Time'],
  },
  {
    id: 'rev-2',
    userName: 'Clinton Mcclure',
    rating: 4,
    date: '1 weeks ago',
    comment: 'The workers are very professional and the results are very satisfying! I like it very much.',
    likes: 783,
    tags: ['Professional'],
  },
  {
    id: 'rev-3',
    userName: 'Chidinma Adeleke',
    rating: 5,
    date: '2 days ago',
    comment: 'Super impressive work! The crew arrived on time in Ewet Housing. Deep cleaned all kitchen oil spots and bathroom grout.',
    likes: 14,
    tags: ['Spotless', 'Polite'],
  },
  {
    id: 'rev-4',
    userName: 'Ngozi Eze',
    rating: 4,
    date: '2 weeks ago',
    comment: 'Very thorough sofa shampooing. Took about 3 hours to dry. Will book again next month.',
    likes: 5,
    tags: ['Good Value'],
  },
];

export default function ServiceReviewsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();

  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'all'>('all');
  // Live backend has no public GET reviews endpoint — start empty and show
  // an EmptyState until the user writes one (no hardcoded fixtures).
  const [reviewsList, setReviewsList] = useState<MockReviewItem[]>([]);
  const [likedReviewIds, setLikedReviewIds] = useState<Set<string>>(new Set());
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newReviewerName, setNewReviewerName] = useState('');

  const { data: service } = useService(typeof id === 'string' ? id : '');

  const toggleLike = (reviewId: string) => {
    setLikedReviewIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const handleAddReview = () => {
    if (!newComment.trim()) return;
    const newRev: MockReviewItem = {
      id: `rev-${Date.now()}`,
      userName: newReviewerName.trim() || 'Verified Customer',
      rating: newRating,
      date: 'Just now',
      comment: newComment.trim(),
      likes: 0,
      tags: ['Verified Booking'],
    };
    setReviewsList([newRev, ...reviewsList]);
    setNewComment('');
    setNewReviewerName('');
    setIsWriteModalOpen(false);
  };

  const filteredReviews = useMemo(() => {
    if (selectedRatingFilter === 'all') return reviewsList;
    return reviewsList.filter((r) => r.rating === selectedRatingFilter);
  }, [reviewsList, selectedRatingFilter]);

  const avgRating = service?.rating || 4.8;
  const reviewCount = service?.reviewCount || 142;
  const filterOptions: Array<{ label: string; value: number | 'all' }> = [
    { label: 'All', value: 'all' },
    { label: '5', value: 5 },
    { label: '4', value: 4 },
    { label: '3', value: 3 },
    { label: '2', value: 2 },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          {service?.name || 'Reviews'}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Mockup 45: rating summary + outlined filter pills */}
        <View style={styles.ratingHeader}>
          <Star size={20} color={STAR_AMBER} fill={STAR_AMBER} />
          <Text style={[styles.ratingBig, { color: colors.textPrimary, fontFamily: fonts.extraBold }]}>
            {avgRating} ({reviewCount} reviews)
          </Text>
          <Pressable onPress={() => setSelectedRatingFilter('all')}>
            <Text style={[styles.seeAll, { color: colors.primary, fontFamily: fonts.bold }]}>See All</Text>
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {filterOptions.map((opt) => {
            const isSelected = selectedRatingFilter === opt.value;
            return (
              <Pressable
                key={opt.label}
                style={[
                  styles.filterPill,
                  isSelected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedRatingFilter(opt.value)}
              >
                <Star size={12} color={isSelected ? '#FFFFFF' : colors.primary} fill={isSelected ? '#FFFFFF' : colors.primary} />
                <Text
                  style={[
                    styles.filterPillText,
                    { color: isSelected ? '#FFFFFF' : colors.primary, fontFamily: fonts.bold },
                  ]}
                >
                  {opt.label === 'All' ? 'All' : opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.reviewsList}>
          {filteredReviews.map((rev) => {
            const isLiked = likedReviewIds.has(rev.id);
            const totalLikes = rev.likes + (isLiked ? 1 : 0);
            return (
              <View key={rev.id} style={styles.reviewRow}>
                <View style={styles.reviewHeader}>
                  <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.avatarInitial, { color: colors.primary, fontFamily: fonts.bold }]}>
                      {rev.userName.charAt(0)}
                    </Text>
                  </View>
                  <Text style={[styles.userName, { color: colors.textPrimary, fontFamily: fonts.bold }]}>{rev.userName}</Text>
                  <View style={[styles.ratingPill, { borderColor: colors.primary }]}>
                    <Star size={11} color={colors.primary} fill={colors.primary} />
                    <Text style={[styles.ratingPillText, { color: colors.primary, fontFamily: fonts.bold }]}>{rev.rating}</Text>
                  </View>
                  <Pressable hitSlop={8} accessibilityLabel="More options">
                    <MoreHorizontal size={18} color={colors.textMuted} />
                  </Pressable>
                </View>
                <Text style={[styles.commentText, { color: colors.textPrimary, fontFamily: fonts.regular }]}>{rev.comment}</Text>
                <View style={styles.reviewFooter}>
                  <Pressable style={styles.likeRow} onPress={() => toggleLike(rev.id)}>
                    <Heart size={15} color={isLiked ? colors.error : colors.textMuted} fill={isLiked ? colors.error : 'transparent'} />
                    <Text style={[styles.likeCount, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>{totalLikes}</Text>
                  </Pressable>
                  <Text style={[styles.reviewDate, { color: colors.textMuted, fontFamily: fonts.regular }]}>{rev.date}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Button
          title="Write a Review"
          icon={<MessageSquare size={18} color="#FFFFFF" />}
          onPress={() => setIsWriteModalOpen(true)}
          variant="primary"
        />
      </View>

      <Modal visible={isWriteModalOpen} onClose={() => setIsWriteModalOpen(false)} type="bottomSheet" title="Leave Your Feedback">
        <ScrollView style={styles.modalScroll}>
          <Text style={[styles.modalLabel, { color: colors.textPrimary, fontFamily: fonts.bold }]}>How was your experience?</Text>
          <View style={styles.starPickerRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Pressable key={s} onPress={() => setNewRating(s)} style={styles.starPickerBtn}>
                <Star size={32} color={s <= newRating ? STAR_AMBER : colors.border} fill={s <= newRating ? STAR_AMBER : 'transparent'} />
              </Pressable>
            ))}
          </View>
          <Input label="Your Name" value={newReviewerName} onChangeText={setNewReviewerName} placeholder="e.g. Chidinma Adeleke" />
          <Input
            label="Your Review"
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Tell us about punctuality, work quality, and cleanliness..."
            multiline
            numberOfLines={4}
          />
          <View style={{ marginTop: spacing.md, marginBottom: spacing.xl }}>
            <Button title="Submit Review" onPress={handleAddReview} variant="primary" disabled={!newComment.trim()} />
          </View>
        </ScrollView>
      </Modal>
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
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, flex: 1, textAlign: 'center' },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  ratingHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: spacing.sm },
  ratingBig: { fontSize: 16, flex: 1 },
  seeAll: { fontSize: 13 },
  filterRow: { gap: spacing.sm, paddingBottom: spacing.md },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radii.full,
    borderWidth: 1.5,
    gap: 5,
  },
  filterPillText: { fontSize: 13 },
  reviewsList: { gap: spacing.lg },
  reviewRow: { gap: 6 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 15 },
  userName: { fontSize: 14, flex: 1 },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  ratingPillText: { fontSize: 12 },
  commentText: { fontSize: 13, lineHeight: 19, marginVertical: spacing.xs },
  reviewFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  likeRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  likeCount: { fontSize: 12 },
  reviewDate: { fontSize: 11 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  modalScroll: { maxHeight: 460 },
  modalLabel: { fontSize: 15, textAlign: 'center', marginBottom: spacing.sm },
  starPickerRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.lg },
  starPickerBtn: { padding: spacing.xs },
});
