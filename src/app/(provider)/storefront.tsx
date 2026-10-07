import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Plus } from 'lucide-react-native';
import { useAppTheme } from '../_layout';
import { fonts, spacing, radii } from '../../constants/theme';
import { Header, Input, Button } from '../../components/ui';

export default function StorefrontScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();

  const [bio, setBio] = useState('Professional technician with 5 years of experience in deep cleaning and home organization.');
  const [basePrice, setBasePrice] = useState('5000');
  const [isHourly, setIsHourly] = useState(false);
  const [gallery, setGallery] = useState<string[]>([]);
  const [isAvailable, setIsAvailable] = useState(true);

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setGallery(prev => [...prev, ...uris]);
    }
  };

  const removePhoto = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    // In a real app, this would PATCH /provider/storefront
    alert('Storefront updated successfully!');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Storefront Editor"  />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Availability Toggle */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Accepting Jobs</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Toggle your visibility in search</Text>
            </View>
            <Switch
              value={isAvailable}
              onValueChange={setIsAvailable}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isAvailable ? colors.primary : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Bio Section */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>About Me (Bio)</Text>
          <Input
            value={bio}
            onChangeText={setBio}
            placeholder="Tell customers about your experience..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Pricing Section */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Pricing Structure</Text>
          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Charge by the hour?</Text>
            <Switch
              value={isHourly}
              onValueChange={setIsHourly}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isHourly ? colors.primary : '#f4f3f4'}
            />
          </View>
          <View style={{ marginTop: spacing.md }}>
            <Input
              label={isHourly ? 'Hourly Rate (₦)' : 'Starting Price (₦)'}
              value={basePrice}
              onChangeText={setBasePrice}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Gallery Section */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Portfolio Gallery</Text>
              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>Showcase your best work</Text>
            </View>
            <Pressable onPress={addPhoto} style={[styles.addButton, { backgroundColor: colors.primaryLight }]}>
              <Plus size={20} color={colors.primary} />
            </Pressable>
          </View>
          
          <View style={styles.galleryGrid}>
            {gallery.map((uri, i) => (
              <View key={i} style={styles.galleryItem}>
                <Image source={{ uri }} style={styles.galleryImage} />
                <Pressable
                  style={styles.removeBtn}
                  onPress={() => removePhoto(i)}
                >
                  <Text style={styles.removeText}>X</Text>
                </Pressable>
              </View>
            ))}
            {gallery.length === 0 && (
              <Pressable onPress={addPhoto} style={[styles.emptyGallery, { borderColor: colors.border }]}>
                <Camera size={32} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Add Photos</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Button title="Save Changes" onPress={handleSave} style={{ marginTop: spacing.lg }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
  },
  cardDesc: {
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.md,
  },
  galleryItem: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: fonts.bold,
  },
  emptyGallery: {
    width: '100%',
    height: 120,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

