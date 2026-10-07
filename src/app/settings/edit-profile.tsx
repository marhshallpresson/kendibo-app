import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Pencil } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { pickEvidence, uriToBase64 } from '../../utils/images';
import { apiFetch } from '../../services/api/client';

/**
 * Edit Profile — mirrors the reference design: avatar with edit badge,
 * underline fields (Full Name / Email / Mobile Number), Save changes.
 * Email + phone are identity-verified: read-only here, changed via OTP
 * re-verify. Persists name/nickname/avatar to PATCH /v1/me.
 */
export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const saveProfile = useAuthStore((s) => s.saveProfile);

  const [fullName, setFullName] = useState(user?.name ?? '');
  const [nickname, setNickname] = useState(user?.nickname ?? '');
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
      const base64 = await uriToBase64(pick.uri);
      const done = await apiFetch<{ url?: string }>('/v1/media/ingest', {
        method: 'POST',
        body: { dataBase64: base64, mime: pick.mime },
      });
      setAvatarUrl(done?.url ?? pick.uri);
    } catch {
      setAvatarUrl(pick.uri);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    if (fullName.trim().length < 2) { setError('Please enter your full name.'); return; }
    setSaving(true);
    try {
      await saveProfile({ name: fullName.trim(), nickname: nickname.trim() || undefined, avatarUrl: avatarUrl || undefined });
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save changes.');
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
        <Text style={[styles.title, { color: colors.textPrimary, fontFamily: fonts.bold }]}>Edit Profile</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarWrap}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
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
            accessibilityLabel="Change profile photo"
          >
            {uploading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Pencil size={14} color="#FFFFFF" />}
          </Pressable>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
          <Input value={fullName} onChangeText={setFullName} placeholder="Your full name" autoCapitalize="words" />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nickname</Text>
          <Input value={nickname} onChangeText={setNickname} placeholder="What should we call you?" autoCapitalize="words" />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <Input value={user?.email ?? ''} onChangeText={() => {}} disabled />
        </View>
        <View style={styles.field}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Number</Text>
          <Input value={user?.phone ?? ''} onChangeText={() => {}} disabled keyboardType="phone-pad" />
        </View>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Email and phone are verified at sign-in. Contact support to change them.
        </Text>

        {error ? <Text style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <Button title={saving ? 'Saving…' : 'Save changes'} onPress={handleSave} disabled={saving} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: 20 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm },
  avatarWrap: { alignSelf: 'center', marginVertical: spacing.md },
  avatar: { width: 120, height: 120, borderRadius: 60 },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 44, fontFamily: fonts.bold },
  editBadge: { position: 'absolute', right: 2, bottom: 6, width: 32, height: 32, borderRadius: radii.full, alignItems: 'center', justifyContent: 'center' },
  field: { gap: 2 },
  label: { fontSize: 13 },
  hint: { fontSize: 12, textAlign: 'center' },
  error: { fontSize: 13, textAlign: 'center' },
});
