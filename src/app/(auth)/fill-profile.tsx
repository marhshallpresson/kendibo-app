import React, { useState } from 'react';
import {
import { resolveImage } from '../../constants/images';
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil, Calendar, Mail, MapPin } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { pickEvidence, uriToBase64 } from '../../utils/images';
import { apiFetch } from '../../services/api/client';
import { resolveImage } from '../../constants/images';

/**
 * Fill Your Profile (onboarding) — mirrors the reference design:
 * avatar + Full Name / Nickname / Date of Birth / Email / Phone (+234) /
 * Address, Continue. Dark/light via theme. Persists to PATCH /v1/me.
 */
export default function FillProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const saveProfile = useAuthStore((s) => s.saveProfile);

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
  const [dob, setDob] = useState(user?.dob ?? '');
  const [email] = useState(user?.email ?? '');
  const [phone] = useState(user?.phone ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleAvatar = async () => {
    setError('');
    const pick = await pickEvidence('library');
    if (!pick) return;
    setUploading(true);
    try {
      const presign = await apiFetch<{ uploadUrl: string; assetId: string }>('/v1/media/presign', {
        method: 'POST', body: { kind: 'photo' },
      });
      const base64 = await uriToBase64(pick.uri);
      const done = await apiFetch<{ url?: string }>('/v1/media/ingest', {
        method: 'POST', body: { dataBase64: base64, mime: pick.mime },
      });
      void presign;
      if (done?.url) setAvatarUrl(done.url);
      else setAvatarUrl(pick.uri);
    } catch {
      setAvatarUrl(pick.uri);
    } finally {
      setUploading(false);
    }
  };

  const handleContinue = async () => {
    setError('');
    if (fullName.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) { setError('Date of birth must be YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      await saveProfile({
        name: fullName.trim(),
        nickname: nickname.trim() || undefined,
        dob: dob.trim() || undefined,
        avatarUrl: avatarUrl || undefined,
      });
      router.push('/(auth)/create-pin');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Fill Your Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={resolveImage(avatarUrl)} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceCard }]}>
              <Text style={[styles.avatarLetter, { color: colors.textSecondary }]}>
                {(fullName || 'K').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Pressable
            style={[styles.editBadge, { backgroundColor: colors.primary }]}
            onPress={handleAvatar}
            accessibilityRole="button"
            accessibilityLabel="Upload profile photo"
          >
            {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Pencil size={14} color="#FFFFFF" />}
          </Pressable>
        </View>

        <Input label="Full Name" value={fullName} onChangeText={setFullName} placeholder="e.g. Adaeze Okafor" autoCapitalize="words" />
        <Input label="Nickname" value={nickname} onChangeText={setNickname} placeholder="e.g. Ada" autoCapitalize="words" />
        <Input
          label="Date of Birth" value={dob} onChangeText={setDob} placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation" maxLength={10}
          rightIcon={<Calendar size={18} color={colors.textSecondary} />}
        />
        <Input label="Email" value={email} onChangeText={() => {}} placeholder="you@example.com" disabled
          rightIcon={<Mail size={18} color={colors.textSecondary} />} />
        <Input label="Phone Number" value={phone ? `+234 ${phone.replace(/^(\+234|0)/, '')}` : ''} onChangeText={() => {}} placeholder="+234 ..." disabled />

        <Pressable style={styles.addressRow} onPress={() => router.push('/booking/address')}>
          <MapPin size={18} color={colors.textSecondary} />
          <Text style={[styles.addressText, { color: colors.textSecondary }]}>Add your service address</Text>
        </Pressable>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Continue'} onPress={handleContinue} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 20 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },
  avatarWrap: { alignSelf: 'center', marginVertical: spacing.md },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 44, fontFamily: fonts.bold },
  editBadge: { position: 'absolute', right: 2, bottom: 6, width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  addressText: { fontSize: 14 },
  error: { fontSize: 13, textAlign: 'center' },
});

