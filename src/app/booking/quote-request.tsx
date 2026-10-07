import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, SafeAreaView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Camera, Check, ShieldCheck, Info, X, MapPin } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAppTheme } from '../_layout';
import { radii, spacing, fonts, shadows } from '../../constants/theme';
import { useLocationStore } from '../../stores/locationStore';
import { formatKoboToNaira } from '../../utils/currency';

const CATEGORIES = [
  'Air Conditioning & Refrigeration',
  'Heavy Generator & Power',
  'Complex Plumbing & Drain',
  'Electrical & Inverter Systems',
  'Appliance Diagnostics',
];

const URGENCIES = [
  { id: 'STANDARD', label: 'Standard', time: 'Within 24-48 hrs', fee: 'Free callout on repair' },
  { id: 'URGENT', label: 'Priority', time: 'Within 4-6 hrs', fee: 'Fast track dispatch' },
  { id: 'EMERGENCY', label: 'Emergency', time: 'Within 90 mins', fee: 'Immediate technician' },
];

export default function QuoteRequestScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentAddress } = useLocationStore();

  const [selectedCategory, setSelectedCategory] = useState<string>(CATEGORIES[0]);
  const [urgency, setUrgency] = useState<string>('STANDARD');
  const [equipmentBrand, setEquipmentBrand] = useState<string>('Panasonic / LG');
  const [equipmentCapacity, setEquipmentCapacity] = useState<string>('1.5 HP Inverter Split Unit');
  const [symptomDescription, setSymptomDescription] = useState<string>(
    'AC blower runs continuously but blows ambient warm air. Strange humming noise from outdoor compressor unit and ice forming on copper pipe.'
  );
  const [photos, setPhotos] = useState<Array<{ id: string; name: string; size: string }>>([
    { id: 'p1', name: 'outdoor_unit_copper_frost.jpg', size: '2.4 MB' },
    { id: 'p2', name: 'indoor_display_code.jpg', size: '1.8 MB' },
  ]);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleAddMockPhoto = () => {
    if (photos.length >= 4) {
      Alert.alert('Limit Reached', 'You can upload up to 4 diagnostic photos/videos.');
      return;
    }
    const newId = `p_${Date.now()}`;
    setPhotos([...photos, { id: newId, name: `diagnostic_snap_${photos.length + 1}.jpg`, size: '2.1 MB' }]);
  };

  const handleRemovePhoto = (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
  };

  const handleSubmit = () => {
    if (!symptomDescription.trim()) {
      Alert.alert('Required', 'Please describe the problem symptoms.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      router.push({
        pathname: '/booking/quote-review',
        params: {
          category: selectedCategory,
          equipment: `${equipmentBrand} - ${equipmentCapacity}`,
        },
      });
    }, 600);
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
      {/* Book-a-visit progress (mockups 1-5): step 1 active */}
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.catChip,
                  active ? { backgroundColor: colors.primary, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.catChipText, { color: active ? '#FFFFFF' : colors.textPrimary, fontFamily: fonts.semiBold }]}>{cat}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

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
                <View style={styles.urgencyHeader}>
                  <Text style={[styles.urgencyLabel, { color: active ? colors.primary : colors.textPrimary, fontFamily: fonts.bold }]}>{u.label}</Text>
                  {active && <Check size={16} color={colors.primary} />}
                </View>
                <Text style={[styles.urgencyTime, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{u.time}</Text>
                <Text style={[styles.urgencyFee, { color: colors.textMuted, fontFamily: fonts.regular }]}>{u.fee}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.locCard, { backgroundColor: colors.surface, borderColor: colors.borderSubtle }]}>
          <MapPin size={18} color={colors.primary} />
          <View style={styles.locMeta}>
            <Text style={[styles.locStreet, { color: colors.textPrimary, fontFamily: fonts.bold }]}>
              {currentAddress ? `${currentAddress.street}, ${currentAddress.landmark}` : '14 Oron Road, Ewet Housing Estate, Uyo'}
            </Text>
            <Text style={[styles.locPhone, { color: colors.textSecondary, fontFamily: fonts.regular }]}>
              {currentAddress?.contactPhone || '+234 801 234 5678'}
            </Text>
          </View>
        </View>

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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Photos / Videos</Text>
          <Text style={[styles.photoCountText, { color: colors.textSecondary, fontFamily: fonts.regular }]}>{photos.length}/4 uploaded</Text>
        </View>
        <View style={styles.photoList}>
          {photos.map((item) => (
            <View key={item.id} style={[styles.photoItem, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
              <Camera size={16} color={colors.primary} />
              <View style={styles.photoMeta}>
                <Text style={[styles.photoName, { color: colors.textPrimary, fontFamily: fonts.semiBold }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.photoSize, { color: colors.textMuted, fontFamily: fonts.regular }]}>{item.size}</Text>
              </View>
              <Pressable onPress={() => handleRemovePhoto(item.id)} hitSlop={8} style={styles.removePhotoBtn}>
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
          {photos.length < 4 && (
            <Pressable onPress={handleAddMockPhoto} style={[styles.addPhotoCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]} accessibilityRole="button">
              <Camera size={22} color={colors.primary} />
              <Text style={[styles.addPhotoText, { color: colors.primary, fontFamily: fonts.bold }]}>Tap to add photo / video</Text>
              <Text style={[styles.addPhotoSub, { color: colors.textMuted, fontFamily: fonts.regular }]}>JPG, PNG, MP4 up to 15MB</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.calloutPolicyBox, { backgroundColor: colors.primaryLight }]}>
          <Info size={16} color={colors.primary} />
          <Text style={[styles.calloutPolicyText, { color: colors.primaryDark, fontFamily: fonts.regular }]}>
            Diagnostic inspection fee is ₦3,000 (300,000 kobo). Deducted from your final bill when you approve the repair.
          </Text>
        </View>
        <View style={{ height: 110 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.borderSubtle }]}>
        <View style={styles.bottomFee}>
          <Text style={[styles.bottomFeeLabel, { color: colors.textSecondary, fontFamily: fonts.regular }]}>Diagnostic Callout:</Text>
          <Text style={[styles.bottomFeeValue, { color: colors.primary, fontFamily: fonts.extraBold }]}>{formatKoboToNaira(300000)}</Text>
        </View>
        <Button title={submitting ? 'Dispatching...' : 'Request Now'} loading={submitting} onPress={handleSubmit} style={styles.submitBtn} />
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
  urgencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  urgencyLabel: { fontSize: 12 },
  urgencyTime: { fontSize: 10, marginBottom: 2 },
  urgencyFee: { fontSize: 9 },
  locCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 20, borderWidth: 1, padding: spacing.md, marginTop: spacing.md },
  locMeta: { flex: 1 },
  locStreet: { fontSize: 13 },
  locPhone: { fontSize: 12 },
  photoList: { gap: spacing.xs, marginTop: 4 },
  photoItem: { flexDirection: 'row', alignItems: 'center', padding: spacing.sm, borderRadius: 16, borderWidth: 1, gap: spacing.sm },
  photoMeta: { flex: 1 },
  photoName: { fontSize: 12 },
  photoSize: { fontSize: 10 },
  removePhotoBtn: { padding: 4 },
  addPhotoCard: { padding: spacing.md, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    ...shadows.lg,
  },
  bottomFee: { flex: 1 },
  bottomFeeLabel: { fontSize: 12 },
  bottomFeeValue: { fontSize: 16 },
  submitBtn: { flex: 1.3 },
});
