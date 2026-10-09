import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, Platform, Alert, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck, Info, X, MapPin, Camera } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../_layout';
import { radii, spacing, fonts, shadows } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { useCategories } from '../../services/queryClient';
import { apiFetch, ApiError } from '../../services/api/client';
import { uploadMedia } from '../../services/media';
import { pickEvidence } from '../../utils/images';
import { useAuthStore } from '../../stores/authStore';

const URGENCIES = [
  { id: 'this_week' as const, label: 'Standard', time: 'Within 24-48 hrs', fee: 'Free callout on repair' },
  { id: 'today' as const, label: 'Priority', time: 'Within 4-6 hrs', fee: 'Fast track dispatch' },
  { id: 'emergency' as const, label: 'Emergency', time: 'Within 90 mins', fee: 'Immediate technician' },
];

export default function QuoteRequestScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentAddress } = useLocationStore();
  const user = useAuthStore((s) => s.user);

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string>('');
  const [urgency, setUrgency] = useState<(typeof URGENCIES)[number]['id']>('this_week');
  const [equipmentBrand, setEquipmentBrand] = useState('');
  const [equipmentCapacity, setEquipmentCapacity] = useState('');
  const [symptomDescription, setSymptomDescription] = useState('');
  const [photos, setPhotos] = useState<{ uri: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const submitRequest = useMutation({
    mutationFn: async () => {
      const equipment = [equipmentBrand.trim(), equipmentCapacity.trim()].filter(Boolean).join(' — ');
      const details = [
        symptomDescription.trim(),
        equipment ? `Equipment: ${equipment}` : null,
      ].filter(Boolean).join('\n\n');
      return apiFetch<{ id: string }>('/v1/service-requests', {
        method: 'POST',
        body: {
          serviceId: categoryId ?? undefined,
          title: categoryName || 'Diagnostic quote request',
          details,
          urgency,
          addressId: currentAddress?.id ?? undefined,
          contactName: user?.name ?? undefined,
          contactPhone: currentAddress?.contactPhone || user?.phone || undefined,
          contactEmail: user?.email ?? undefined,
          notes: photos.length > 0 ? `Photos: ${photos.map((p) => p.url).join(', ')}` : undefined,
        },
      });
    },
    onSuccess: (data) => {
      router.replace({ pathname: '/booking/quote-review', params: { requestId: data.id } });
    },
    onError: (err) => {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof TypeError
            ? 'You appear to be offline. Check your connection and try again.'
            : 'Could not submit your request. Please try again.';
      Alert.alert('Request not sent', message);
    },
  });

  const handleAddPhoto = async () => {
    if (photos.length >= 4) {
      Alert.alert('Limit Reached', 'You can upload up to 4 diagnostic photos.');
      return;
    }
    const pick = await pickEvidence('library');
    if (!pick) return;
    setUploading(true);
    try {
      const done = await uploadMedia(pick.uri, 'photo', pick.mime);
      setPhotos((prev) => [...prev, { uri: pick.uri, url: done.url }]);
    } catch (e) {
      Alert.alert(
        'Photo upload failed',
        e instanceof Error && e.message ? e.message : 'Check your connection and try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p.uri !== uri));
  };

  const handleSubmit = async () => {
    if (!symptomDescription.trim()) {
      Alert.alert('Required', 'Please describe the problem symptoms.');
      return;
    }
    const { requireOnline } = require('../../services/txnGuard');
    if (!(await requireOnline('Quote request'))) return;
    submitRequest.mutate();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable
          style={[styles.backBtn, { backgroundColor: colors.surfaceCard }]}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Book a visit</Text>
        <View style={{ width: 42 }} />
      </View>
      <View style={styles.progressRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.progressSeg,
              i === 0 ? { backgroundColor: colors.primary } : { backgroundColor: colors.border },
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.stepLabel, { color: colors.textSecondary, fontFamily: fonts.semiBold }]}>1. Service</Text>
        <View style={[styles.infoBanner, { backgroundColor: colors.primaryLight }]}>
          <ShieldCheck size={20} color={colors.primary} />
          <View style={styles.infoBannerTextWrap}>
            <Text style={[styles.infoBannerTitle, { color: colors.primaryDark, fontFamily: fonts.bold }]}>
              Quote-Lock Process
            </Text>
            <Text style={[styles.infoBannerDesc, { color: colors.textPrimary, fontFamily: fonts.regular }]}>
              Physical inspection + itemized quote. Work never starts without your approval.
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Service Category</Text>
        {categoriesLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {categories.map((cat) => {
              const active = categoryId === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setCategoryId(cat.id);
                    setCategoryName(cat.name);
                  }}
                  style={[
                    styles.catChip,
                    active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.catChipText, { color: active ? '#FFFFFF' : colors.textPrimary, fontFamily: fonts.semiBold }]}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>2. Urgency & address</Text>
        <View style={styles.urgencyGrid}>
          {URGENCIES.map((u) => {
            const active = urgency === u.id;
            return (
              <Pressable
                key={u.id}
                onPress={() => setUrgency(u.id)}
                style={[
                  styles.urgencyCard,
                  active ? { backgroundColor: colors.primaryLight, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.urgencyLabel, { color: active ? colors.primary : colors.textPrimary, fontFamily: fonts.bold }]}>{u.label}</Text>
                <Text style={[styles.urgencyTime, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{u.time}</Text>
                <Text style={[styles.urgencyFee, { color: colors.textMuted, fontFamily: fonts.regular }]}>{u.fee}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.locCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}
          onPress={() => router.push('/booking/address')}
        >
          <MapPin size={18} color={colors.primary} />
          <View style={styles.locMeta}>
            <Text style={[styles.locStreet, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {currentAddress ? `${currentAddress.street}${currentAddress.landmark ? `, ${currentAddress.landmark}` : ''}` : 'Add a service address'}
            </Text>
            {!!currentAddress?.contactPhone && (
              <Text style={[styles.locPhone, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
                {currentAddress.contactPhone}
              </Text>
            )}
          </View>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Equipment Details</Text>
        <Input label="Brand / Manufacturer" value={equipmentBrand} onChangeText={setEquipmentBrand} placeholder="e.g. Thermocool, LG, Mikano, Daikin" />
        <Input label="Model / Capacity / Specs" value={equipmentCapacity} onChangeText={setEquipmentCapacity} placeholder="e.g. 2.0 HP Split AC or 15 kVA Diesel Generator" />

        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Describe the Problem *</Text>
        <Input
          value={symptomDescription}
          onChangeText={setSymptomDescription}
          placeholder="What is wrong? e.g. Not powering on, abnormal noise, water leakage..."
          multiline
          numberOfLines={4}
          helperText="Detailed descriptions help the technician arrive with the right tools."
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Photos</Text>
          <Text style={[styles.photoCountText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{photos.length}/4 uploaded</Text>
        </View>
        <View style={styles.photoList}>
          {photos.map((item) => (
            <View key={item.uri} style={[styles.photoItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Image source={{ uri: item.uri }} style={styles.photoThumb} />
              <Pressable onPress={() => handleRemovePhoto(item.uri)} hitSlop={8} style={styles.removePhotoBtn}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
          {photos.length < 4 && (
            <Pressable
              onPress={handleAddPhoto}
              disabled={uploading}
              style={[styles.addPhotoCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}
              accessibilityRole="button"
            >
              {uploading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <>
                  <Camera size={22} color={colors.primary} />
                  <Text style={[styles.addPhotoText, { color: colors.primary, fontFamily: fonts.bold }]}>Tap to add photo</Text>
                  <Text style={[styles.addPhotoSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>JPG or PNG</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={[styles.calloutPolicyBox, { backgroundColor: colors.primaryLight }]}>
          <Info size={16} color={colors.primary} />
          <Text style={[styles.calloutPolicyText, { color: colors.primaryDark, fontFamily: fonts.regular }]}>
            A pro will inspect and send an itemized quote. You approve before any paid work begins.
          </Text>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <Button
          title={submitRequest.isPending ? 'Dispatching…' : 'Request Now'}
          loading={submitRequest.isPending}
          onPress={handleSubmit}
          style={styles.submitBtn}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20 },
  progressRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
  progressSeg: { flex: 1, height: 4, borderRadius: 2 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  stepLabel: { fontSize: 12, marginBottom: 4 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: 20, marginBottom: spacing.md },
  infoBannerTextWrap: { flex: 1 },
  infoBannerTitle: { fontSize: 14, marginBottom: 2 },
  infoBannerDesc: { fontSize: 12, lineHeight: 16 },
  sectionTitle: { fontSize: 16, marginTop: spacing.md, marginBottom: spacing.xs },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  photoCountText: { fontSize: 12 },
  chipRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  catChip: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radii.full, borderWidth: 1.5, marginRight: spacing.xs },
  catChipText: { fontSize: 12 },
  urgencyGrid: { flexDirection: 'row', gap: spacing.xs },
  urgencyCard: { flex: 1, padding: spacing.sm, borderRadius: 20, borderWidth: 1.5 },
  urgencyLabel: { fontSize: 12, marginBottom: 2 },
  urgencyTime: { fontSize: 10, marginBottom: 2 },
  urgencyFee: { fontSize: 9 },
  locCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 20, borderWidth: 1, padding: spacing.md, marginTop: spacing.md },
  locMeta: { flex: 1 },
  locStreet: { fontSize: 13 },
  locPhone: { fontSize: 12 },
  photoList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: 4 },
  photoItem: { position: 'relative', borderRadius: 16, borderWidth: 1, padding: 4 },
  photoThumb: { width: 72, height: 72, borderRadius: 12 },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6, backgroundColor: '#B3261E', borderRadius: 10, padding: 2 },
  addPhotoCard: { padding: spacing.md, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minWidth: 110 },
  addPhotoText: { fontSize: 13, marginTop: 4 },
  addPhotoSub: { fontSize: 12, marginTop: 2 },
  calloutPolicyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs, padding: spacing.md, borderRadius: 20, marginTop: spacing.md, marginBottom: spacing.lg },
  calloutPolicyText: { fontSize: 12, flex: 1, lineHeight: 16 },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  submitBtn: { width: '100%' },
});
