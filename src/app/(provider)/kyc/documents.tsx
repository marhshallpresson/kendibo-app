import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { UploadCloud, CheckCircle2 } from 'lucide-react-native';
import { Header, Button } from '../../../components/ui';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { useKycStore } from '../../../stores/kycStore';

export default function KycDocumentsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { documents, setDocuments } = useKycStore();

  const pickImage = async (key: 'idFrontUri' | 'idBackUri' | 'selfieUri') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setDocuments({ [key]: uri });
    }
  };

  const handleNext = () => {
    if (!documents.idFrontUri || !documents.idBackUri || !documents.selfieUri) {
      Alert.alert('Missing documents', 'Please upload all required documents.');
      return;
    }
    router.push('/(provider)/kyc/location');
  };

  const renderUploadBox = (key: 'idFrontUri' | 'idBackUri' | 'selfieUri', label: string) => {
    const uri = documents[key];
    return (
      <View style={styles.uploadSection}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Pressable
          onPress={() => pickImage(key)}
          style={[
            styles.uploadBox,
            { backgroundColor: colors.surface, borderColor: colors.border },
            uri && { borderColor: colors.primary },
          ]}
        >
          {uri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri }} style={styles.previewImage} />
              <View style={styles.successBadge}>
                <CheckCircle2 size={24} color={colors.primary} fill={colors.surface} />
              </View>
            </View>
          ) : (
            <View style={styles.uploadPlaceholder}>
              <UploadCloud size={32} color={colors.textSecondary} />
              <Text style={[styles.uploadText, { color: colors.textSecondary }]}>
                Tap to upload
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="KYC Verification" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Step 3: Identity Verification</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please upload clear photos of your valid Government ID and a selfie.
        </Text>

        {renderUploadBox('idFrontUri', 'Government ID (Front)')}
        {renderUploadBox('idBackUri', 'Government ID (Back)')}
        {renderUploadBox('selfieUri', 'Live Selfie')}
        
      </ScrollView>

      <View style={styles.footer}>
        <Button title="Continue to Location" onPress={handleNext} size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.xl },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    marginBottom: spacing.xl,
  },
  uploadSection: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  uploadBox: {
    height: 160,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  uploadText: {
    fontFamily: fonts.medium,
    fontSize: 14,
  },
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  successBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  footer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
});

