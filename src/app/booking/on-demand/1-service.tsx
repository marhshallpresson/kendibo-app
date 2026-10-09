import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';
import { useCategories } from '../../../services/queryClient';
import { pickEvidence } from '../../../utils/images';
import { uploadMedia } from '../../../services/media';
import { Camera, X } from 'lucide-react-native';

export default function CategoryScreen() {
  const router = useRouter();
  const setCategory = useOnDemandStore((s) => s.setCategory);
  const setDescription = useOnDemandStore((s) => s.setDescription);

  const { data: categories = [], isLoading } = useCategories();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [description, setDescriptionText] = useState('');
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleAddPhoto = async () => {
    if (photoUrls.length >= 4) {
      Alert.alert('Limit Reached', 'You can attach up to 4 photos.');
      return;
    }
    const pick = await pickEvidence('library');
    if (!pick) return;
    setUploading(true);
    try {
      const done = await uploadMedia(pick.uri, 'photo', pick.mime);
      setPhotoUrls((prev) => [...prev, done.url]);
    } catch (e) {
      Alert.alert(
        'Photo upload failed',
        e instanceof Error && e.message ? e.message : 'Check your connection and try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleNext = () => {
    if (!selectedId || !selectedName) return;
    if (description.trim().length < 10) {
      Alert.alert('Describe the job', 'Please describe what you need help with (at least 10 characters).');
      return;
    }
    setCategory(selectedId, selectedName);
    setDescription(description.trim(), photoUrls);
    router.push('/booking/on-demand/2-urgency-address');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What do you need help with?</Text>

      {isLoading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={theme.light.colors.primary} />
      ) : categories.length === 0 ? (
        <Text style={{ color: theme.light.colors.textMuted, marginBottom: 24 }}>
          No categories available right now. Pull to refresh from the home screen.
        </Text>
      ) : (
        <View style={styles.categoryList}>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryCard, selectedId === c.id && styles.categoryCardActive]}
              onPress={() => {
                setSelectedId(c.id);
                setSelectedName(c.name);
              }}
            >
              <Text style={[styles.categoryText, selectedId === c.id && styles.categoryTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Describe the job</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="E.g., The sink is leaking under the cabinet and water is pooling on the floor..."
        placeholderTextColor={theme.light.colors.textMuted}
        value={description}
        onChangeText={setDescriptionText}
      />

      <Text style={styles.label}>Add photos (optional)</Text>
      <View style={styles.photoRow}>
        {photoUrls.map((url) => (
          <View key={url} style={styles.photoThumbWrap}>
            <Image source={{ uri: url }} style={styles.photoThumb} />
            <TouchableOpacity style={styles.photoRemove} onPress={() => handleRemovePhoto(url)} hitSlop={8}>
              <X size={14} color={theme.light.colors.textInverse || '#fff'} />
            </TouchableOpacity>
          </View>
        ))}
        {photoUrls.length < 4 && (
          <TouchableOpacity
            style={[styles.photoThumb, styles.photoAdd]}
            onPress={handleAddPhoto}
            disabled={uploading}
            accessibilityLabel="Add photo"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.light.colors.primary} />
            ) : (
              <Camera size={22} color={theme.light.colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <Button
        title="Next"
        onPress={handleNext}
        disabled={!selectedId}
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.light.colors.background },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', color: theme.light.colors.textPrimary, marginBottom: 24 },
  categoryList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  categoryCard: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: theme.light.colors.border,
    backgroundColor: theme.light.colors.surface
  },
  categoryCardActive: {
    borderColor: theme.light.colors.primary, backgroundColor: `${theme.light.colors.primary}15`
  },
  categoryText: { fontSize: 15, fontFamily: 'Inter-Medium', color: theme.light.colors.textPrimary },
  categoryTextActive: { color: theme.light.colors.primary },
  label: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: theme.light.colors.border, borderRadius: 8,
    padding: 16, fontSize: 15, fontFamily: 'Inter-Regular',
    color: theme.light.colors.textPrimary, backgroundColor: theme.light.colors.surface,
    textAlignVertical: 'top', minHeight: 120, marginBottom: 24
  },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  photoThumbWrap: { position: 'relative' },
  photoThumb: { width: 72, height: 72, borderRadius: 8 },
  photoAdd: {
    borderWidth: 1, borderStyle: 'dashed', borderColor: theme.light.colors.primary,
    alignItems: 'center', justifyContent: 'center', backgroundColor: theme.light.colors.surface
  },
  photoRemove: {
    position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: theme.light.colors.error, alignItems: 'center', justifyContent: 'center'
  },
  button: { marginTop: 'auto' }
});
