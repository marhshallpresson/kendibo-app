import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Star,
  Camera,
  X,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  ThumbsUp,
  Heart,
  FileCheck,
} from '@/components/ui/icons';
import { useBooking } from '../../services/queryClient';
import { Booking } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Header } from '../../components/ui/Header';
import { Modal } from '../../components/ui/Modal';
import { spacing, typography, radii, ColorTokens } from '../../constants/theme';
import { useAppTheme } from '../_layout';
import { resolveImage, avatarSource } from '../../constants/images';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { formatDateWAT } from '../../utils/date';

const COMPLIMENT_TAGS = [
  'Punctual / On-Time',
  'Professional',
  'Clean Work',
  'Polite & Respectful',
  'Great Communication',
  'Fair Pricing',
  'Expert Workmanship',
  'Equipped with Right Tools',
];

const TIP_OPTIONS = [
  { label: 'No Tip', valueKobo: 0 },
  { label: '₦500', valueKobo: 50000 },
  { label: '₦1,000', valueKobo: 100000 },
  { label: '₦2,000', valueKobo: 200000 },
  { label: '₦5,000', valueKobo: 500000 },
];

const WARRANTY_ISSUE_CATEGORIES = [
  'Workmanship defect / Issue returned',
  'Incomplete service checklist',
  'Equipment malfunction after repair',
  'Property damage concern',
  'Other warranty claim',
];

export default function ReviewScreen() {
  const { colors } = useAppTheme();
  const styles = makeStyles(colors);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Fetch booking
  const { data: booking } = useBooking(typeof id === 'string' ? id : '');

  const provider = booking?.provider;

  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    'Punctual / On-Time',
    'Expert Workmanship',
  ]);
  const [feedbackNotes, setFeedbackNotes] = useState<string>('');
  const [selectedTipKobo, setSelectedTipKobo] = useState<number>(0);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  // 14-Day Warranty claim toggle
  const [isFilingWarranty, setIsFilingWarranty] = useState<boolean>(false);
  const [warrantyCategory, setWarrantyCategory] = useState<string>(WARRANTY_ISSUE_CATEGORIES[0]);
  const [warrantyDescription, setWarrantyDescription] = useState<string>('');

  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  const warrantyUntil = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/purity -- warranty deadline snapshot computed once per mount, not per render
      new Date(Date.now() + 14 * 86400000).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    []
  );

  const getRatingFeedbackLabel = (r: number): string => {
    switch (r) {
      case 1:
        return 'Poor • Needs Improvement';
      case 2:
        return 'Fair • Average Experience';
      case 3:
        return 'Good • Satisfactory';
      case 4:
        return 'Very Good • Exceeded Expectations';
      case 5:
      default:
        return 'Excellent! Loved the Workmanship';
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const { open: openAddPhoto, picker: addPhotoPicker } = useMediaPicker({
    title: 'Add Photo',
    allowCamera: false,
    onSelect: (media) => setUploadedPhotos((prev) => [...prev, media.uri]),
  });

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = () => {
    setShowSuccessModal(true);
  };

  return (
    <View style={styles.screen}>
      <Header title="Rate & Review Service" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Completed Service Summary */}
        <Card variant="flat" padding="md" style={styles.serviceHeaderCard}>
          <Image
            source={avatarSource(provider?.avatarUrl)}
            style={styles.providerAvatar}
          />
          <View style={styles.serviceHeaderInfo}>
            <Text style={styles.providerName}>{provider?.name || 'Technician'}</Text>
            <Text style={styles.serviceTitle}>{booking?.service?.name || 'Home Service'}</Text>
            <Text style={styles.orderNumberText}>
              Order #{booking?.bookingNumber} • Completed {booking?.scheduledAt ? formatDateWAT(booking.scheduledAt) : ''}
            </Text>
          </View>
        </Card>

        {/* 5-Star Rating Selector */}
        <Card variant="elevated" padding="md" style={styles.ratingCard}>
          <Text style={styles.ratingPrompt}>How was your experience?</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((starNumber) => {
              const isFilled = starNumber <= rating;
              return (
                <Pressable
                  key={starNumber}
                  onPress={() => setRating(starNumber)}
                  style={styles.starTouchArea}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${starNumber} stars`}
                >
                  <Star
                    size={36}
                    color={isFilled ? '#FF9800' : colors.border}
                    fill={isFilled ? '#FF9800' : 'none'}
                  />
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.ratingFeedbackLabel}>{getRatingFeedbackLabel(rating)}</Text>
        </Card>

        {/* Compliment / Feedback Tag Chips */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>What went well?</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        </View>

        <View style={styles.tagsContainer}>
          {COMPLIMENT_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                style={[
                  styles.tagChip,
                  isSelected && styles.tagChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.tagText,
                    isSelected && styles.tagTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Written Review Notes */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Detailed Feedback</Text>
        </View>

        <TextInput
          placeholder="Describe your service experience, quality of work, and technician punctuality..."
          placeholderTextColor={colors.textMuted}
          value={feedbackNotes}
          onChangeText={setFeedbackNotes}
          multiline
          numberOfLines={4}
          style={styles.feedbackInput}
        />

        {/* Workmanship Photos Upload */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Photos of Completed Work</Text>
          <Text style={styles.sectionSubtitle}>Verify quality and activate warranty</Text>
        </View>

        <View style={styles.photosGrid}>
          {uploadedPhotos.map((uri, index) => (
            <View key={`photo_${index}`} style={styles.photoThumbnailWrapper}>
              <Image source={resolveImage(uri)} style={styles.photoThumbnail} />
              <Pressable
                onPress={() => handleRemovePhoto(index)}
                style={styles.removePhotoBadge}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
              >
                <X size={12} color="#FFFFFF" />
              </Pressable>
            </View>
          ))}

          {uploadedPhotos.length < 4 && (
            <Pressable
              onPress={openAddPhoto}
              style={styles.addPhotoButton}
              accessibilityRole="button"
              accessibilityLabel="Add photo"
            >
              <Camera size={24} color={colors.primary} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </Pressable>
          )}
        </View>

        {/* Optional Technician Tip */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Add a Tip for {provider?.name?.split(' ')[0] || 'Technician'}</Text>
          <Text style={styles.sectionSubtitle}>100% of tips go directly to the verified specialist</Text>
        </View>

        <View style={styles.tipsRow}>
          {TIP_OPTIONS.map((tip) => {
            const isSelected = selectedTipKobo === tip.valueKobo;
            return (
              <Pressable
                key={tip.label}
                onPress={() => setSelectedTipKobo(tip.valueKobo)}
                style={[
                  styles.tipChip,
                  isSelected && styles.tipChipSelected,
                ]}
              >
                <Text
                  style={[
                    styles.tipText,
                    isSelected && styles.tipTextSelected,
                  ]}
                >
                  {tip.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 14-Day Warranty Claim Toggle & Form */}
        <Card variant="flat" padding="md" style={styles.warrantyToggleCard}>
          <View style={styles.warrantyToggleHeader}>
            <View style={styles.warrantyHeaderLeft}>
              <ShieldCheck size={20} color={colors.primary} />
              <View>
                <Text style={styles.warrantyToggleTitle}>14-Day Service Warranty</Text>
                <Text style={styles.warrantyToggleSub}>
                  Free rework guarantee on parts and workmanship
                </Text>
              </View>
            </View>
            <Switch
              value={isFilingWarranty}
              onValueChange={setIsFilingWarranty}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isFilingWarranty ? colors.primary : '#FFFFFF'}
            />
          </View>

          {isFilingWarranty && (
            <View style={styles.warrantyForm}>
              <View style={styles.warrantyAlertBox}>
                <ShieldAlert size={18} color={colors.error} />
                <Text style={styles.warrantyAlertText}>
                  Filing a warranty claim will trigger an immediate review by our Quality
                  Assurance inspection team within 24 hours.
                </Text>
              </View>

              <Text style={styles.warrantyCategoryLabel}>Select Issue Type:</Text>
              <View style={styles.warrantyCategories}>
                {WARRANTY_ISSUE_CATEGORIES.map((cat) => {
                  const isCatSelected = warrantyCategory === cat;
                  return (
                    <Pressable
                      key={cat}
                      onPress={() => setWarrantyCategory(cat)}
                      style={[
                        styles.warrantyCatOption,
                        isCatSelected && styles.warrantyCatOptionSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.warrantyCatText,
                          isCatSelected && styles.warrantyCatTextSelected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.warrantyCategoryLabel}>Describe the Defect / Issue:</Text>
              <TextInput
                placeholder="What went wrong after the service was completed?"
                placeholderTextColor={colors.textMuted}
                value={warrantyDescription}
                onChangeText={setWarrantyDescription}
                multiline
                numberOfLines={3}
                style={styles.warrantyInput}
              />
            </View>
          )}
        </Card>

        {/* Submit Review CTA */}
        <View style={styles.submitArea}>
          <Button
            title={isFilingWarranty ? 'Submit Review & Warranty Claim' : 'Submit Review'}
            variant="primary"
            size="lg"
            onPress={handleSubmitReview}
          />
        </View>
      </ScrollView>

      {/* Review Submission Success Modal */}
      <Modal
        visible={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          router.replace('/bookings');
        }}
        type="center"
      >
        <View style={styles.successModalContent}>
          <View style={styles.successIconWrapper}>
            <CheckCircle2 size={48} color={colors.success} />
          </View>
          <Text style={styles.successHeading}>Thank You for Your Review!</Text>
          <Text style={styles.successMessage}>
            Your rating and feedback help keep the KENDIBO marketplace trusted, transparent, and
            accountable for every Nigerian home.
          </Text>

          <Card variant="flat" padding="md" style={styles.warrantyStatusCard}>
            <View style={styles.warrantyStatusRow}>
              <ShieldCheck size={20} color={colors.success} />
              <View style={styles.warrantyStatusInfo}>
                <Text style={styles.warrantyStatusTitle}>14-Day Warranty Protection Active</Text>
                <Text style={styles.warrantyStatusSub}>
                  Order #{booking?.bookingNumber} is guaranteed until{' '}
                  {warrantyUntil}.
                </Text>
              </View>
            </View>
          </Card>

          <Button
            title="Back to My Bookings"
            variant="primary"
            size="md"
            onPress={() => {
              setShowSuccessModal(false);
              router.replace('/bookings');
            }}
            style={styles.modalCloseButton}
          />
        </View>
      </Modal>
      {addPhotoPicker}
    </View>
  );
}

const makeStyles = (colors: ColorTokens) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  serviceHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceCard,
  },
  providerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.surface,
    marginRight: spacing.md,
  },
  serviceHeaderInfo: {
    flex: 1,
  },
  providerName: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  serviceTitle: {
    ...typography.body,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 1,
  },
  orderNumberText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  ratingPrompt: {
    ...typography.title,
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  starTouchArea: {
    padding: spacing.xs,
  },
  ratingFeedbackLabel: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  sectionHeaderRow: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.title,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tagChip: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  tagChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tagText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  tagTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  feedbackInput: {
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.lg,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  photoThumbnailWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
  },
  removePhotoBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotoText: {
    ...typography.micro,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: 4,
  },
  tipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tipChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  tipChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  tipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  tipTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  warrantyToggleCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
  },
  warrantyToggleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warrantyHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  warrantyToggleTitle: {
    ...typography.bodyMedium,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  warrantyToggleSub: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  warrantyForm: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  warrantyAlertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.badgeRedBg,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  warrantyAlertText: {
    ...typography.caption,
    color: colors.badgeRedText,
    flex: 1,
    lineHeight: 16,
  },
  warrantyCategoryLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  warrantyCategories: {
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  warrantyCatOption: {
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  warrantyCatOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  warrantyCatText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  warrantyCatTextSelected: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  warrantyInput: {
    backgroundColor: colors.inputFill,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 4,
    ...typography.caption,
    color: colors.textPrimary,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  submitArea: {
    marginTop: spacing.xs,
  },
  successModalContent: {
    alignItems: 'center',
    padding: spacing.md,
  },
  successIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.badgeGreenBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  warrantyStatusCard: {
    width: '100%',
    backgroundColor: colors.badgeGreenBg,
    marginBottom: spacing.lg,
  },
  warrantyStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  warrantyStatusInfo: {
    flex: 1,
  },
  warrantyStatusTitle: {
    ...typography.caption,
    color: colors.badgeGreenText,
    fontWeight: '700',
  },
  warrantyStatusSub: {
    ...typography.micro,
    color: colors.badgeGreenText,
    marginTop: 2,
  },
  modalCloseButton: {
    width: '100%',
  },
});


