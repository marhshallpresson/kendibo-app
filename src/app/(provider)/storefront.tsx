import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Switch,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star, Camera, X } from '@/components/ui/icons';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header, Button, Badge, EmptyState } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui/Badge';
import { jobApi } from '@/services/api/jobs';
import { useProviderProfile } from '@/hooks/useProviderId';
import { useAuthStore } from '@/stores/authStore';
import { useMediaPicker } from '../../hooks/useMediaPicker';
import { addGalleryPhoto, galleryUrl, listMyGallery, removeGalleryPhoto } from '@/services/api/gallery';

function kycBadge(kycStatus: string): { label: string; variant: BadgeVariant } {
  const s = (kycStatus || '').toLowerCase();
  if (s === 'verified' || s === 'approved') return { label: 'KYC Verified', variant: 'success' };
  if (s === 'rejected') return { label: 'KYC Rejected', variant: 'error' };
  if (s === 'pending' || s === 'review' || s === 'in_review') return { label: 'KYC Pending', variant: 'warning' };
  return { label: 'KYC Not Started', variant: 'neutral' };
}

export default function StorefrontScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading, isError, refetch } = useProviderProfile();

  const onboardMutation = useMutation({
    mutationFn: () => jobApi.onboard(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
      qc.invalidateQueries({ queryKey: ['provider-id'] });
    },
  });

  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ['provider-gallery', profile?.id],
    enabled: !!profile?.id,
    queryFn: () => listMyGallery(),
  });

  const addPhoto = useMutation({
    mutationFn: (media: { uri: string; mime?: string }) => addGalleryPhoto(media.uri, media.mime),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-gallery'] }),
    onError: (e) =>
      Alert.alert(
        'Photo upload failed',
        e instanceof Error && e.message ? e.message : 'Check your connection and try again.',
      ),
  });

  const { open: openAddPhoto, picker: addPhotoPicker } = useMediaPicker({
    title: 'Add Storefront Photo',
    onSelect: (media) => addPhoto.mutate({ uri: media.uri, mime: media.mime }),
  });

  const removePhoto = useMutation({
    mutationFn: (entryId: string) => removeGalleryPhoto(entryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['provider-gallery'] }),
    onError: (e) =>
      Alert.alert(
        "Couldn't remove photo",
        e instanceof Error && e.message ? e.message : 'Check your connection and try again.',
      ),
  });

  const onlineMutation = useMutation({
    mutationFn: (online: boolean) => jobApi.setOnline(online),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['provider-profile'] });
    },
  });

  const header = <Header title="My Storefront" onBack={() => router.back()} />;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <EmptyState
          title="Couldn't load your profile"
          description="We couldn't fetch your provider profile. Check your connection and try again."
          buttonTitle="Retry"
          onButtonPress={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {header}
        <EmptyState
          title="No provider profile yet"
          description="Set up your provider profile to start receiving jobs."
          buttonTitle={onboardMutation.isPending ? 'Creating…' : 'Create provider profile'}
          onButtonPress={() => onboardMutation.mutate()}
        />
      </SafeAreaView>
    );
  }

  const kyc = kycBadge(profile.kycStatus);
  const kycVerified = kyc.variant === 'success';
  const displayName = profile.displayName ?? user?.name ?? 'Provider';
  const hasRating = typeof profile.rating === 'number' && profile.rating > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {header}

      <ScrollView contentContainerStyle={styles.content}>
        {/* Identity */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{displayName}</Text>
          <View style={styles.badgeRow}>
            <Badge label={kyc.label} variant={kyc.variant} />
            <Badge
              label={onlineMutation.isPending ? 'Updating…' : profile.online ? 'Online' : 'Offline'}
              variant={profile.online ? 'success' : 'neutral'}
            />
          </View>
          {/* Online/offline switch — only meaningful once KYC-verified */}
          <View style={styles.onlineRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.onlineLabel, { color: colors.textPrimary }]}>
                Accept new jobs
              </Text>
              <Text style={[styles.note, { color: colors.textSecondary }]}>
                {kycVerified
                  ? profile.online
                    ? 'Customers can book you right now.'
                    : 'Turn on to appear in dispatch.'
                  : 'Available after KYC verification.'}
              </Text>
            </View>
            <Switch
              value={profile.online}
              disabled={!kycVerified || onlineMutation.isPending}
              onValueChange={(v) => onlineMutation.mutate(v)}
              trackColor={{ true: colors.primary, false: colors.border }}
              thumbColor="#fff"
            />
          </View>
          {hasRating && (
            <View style={styles.ratingRow}>
              <Star size={16} color={colors.primary} fill={colors.primary} />
              <Text style={[styles.ratingText, { color: colors.textPrimary }]}>
                {profile.rating!.toFixed(1)}
                {profile.reviewCount ? ` · ${profile.reviewCount} review${profile.reviewCount === 1 ? '' : 's'}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Storefront photos */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Storefront Photos</Text>
          <Text style={[styles.note, { color: colors.textSecondary, marginBottom: spacing.md }]}>
            Photos help customers see your work and trust your profile.
          </Text>
          <View style={styles.photoRow}>
            {photos.length === 0 && !photosLoading && (
              <Text style={[styles.note, { color: colors.textSecondary, marginBottom: spacing.md }]}>
                No photos yet. Add a few to show customers your work.
              </Text>
            )}
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoItem}>
                <Image source={{ uri: galleryUrl(photo) }} style={styles.photoThumb} />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => removePhoto.mutate(photo.id)}
                  hitSlop={8}
                  accessibilityLabel="Remove photo"
                >
                  <X size={12} color="#fff" />
                </Pressable>
              </View>
            ))}
            <Pressable
              style={[styles.photoAdd, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={openAddPhoto}
              accessibilityLabel="Add storefront photo"
            >
              {addPhoto.isPending || photosLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Camera size={22} color={colors.primary} />
              )}
            </Pressable>
          </View>
        </View>

        {/* Skills / services */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Skills & Services</Text>
          {profile.skills.length > 0 ? (
            <View style={styles.chipRow}>
              {profile.skills.map((skill) => (
                <View key={skill} style={[styles.chip, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.chipText, { color: colors.primary }]}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={[styles.note, { color: colors.textSecondary }]}>No skills added yet.</Text>
          )}
          <Text style={[styles.note, { color: colors.textSecondary, marginTop: spacing.md }]}>
            Services offered to customers are assigned automatically once your categories are qualified.
          </Text>
        </View>

        {/* KYC prompt */}
        {!kycVerified && (
          <Button
            title="Complete KYC Verification"
            onPress={() => router.push('/(provider)/kyc')}
            size="lg"
          />
        )}

        {/* Edit profile placeholder — no backend endpoint yet */}
        <Button title="Edit Profile" variant="outline" disabled onPress={() => {}} />
        <Text style={[styles.placeholderNote, { color: colors.textSecondary }]}>
          Profile editing is coming soon. Your details are managed during verification.
        </Text>
        {addPhotoPicker}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  name: { fontFamily: fonts.bold, fontSize: 22, marginBottom: spacing.sm },
  badgeRow: { flexDirection: 'row', gap: spacing.sm },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  onlineLabel: { fontFamily: fonts.semiBold, fontSize: 15, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  ratingText: { fontFamily: fonts.semiBold, fontSize: 14 },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.full,
  },
  chipText: { fontFamily: fonts.semiBold, fontSize: 13 },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoItem: { width: 72, height: 72, borderRadius: radii.md, overflow: 'hidden' },
  photoThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 72,
    height: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  placeholderNote: {
    fontFamily: fonts.regular,
    fontSize: 12,
    textAlign: 'center',
    marginTop: -spacing.xs,
  },
});
