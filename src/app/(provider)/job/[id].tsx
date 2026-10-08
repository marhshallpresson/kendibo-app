import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation } from '@tanstack/react-query';
import { jobApi } from '@/services/api/jobs';
import { fileManager } from '@/services/fileManager';
import { MapPin, Navigation, Camera, CheckSquare, Square, CheckCircle2 } from 'lucide-react-native';
import { useAppTheme } from '../../_layout';
import { fonts, spacing, radii } from '../../../constants/theme';
import { Header, Button } from '../../../components/ui';



export default function JobExecutionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();

  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [jobStatus, setJobStatus] = useState<string>('PROVIDER_ACCEPTED');

  // Mutation to transition state
  const transitionMutation = useMutation({
    mutationFn: (status: string) => jobApi.transitionState(id as string, status),
    onSuccess: (_: any, status: string) => {
      setJobStatus(status);
      if (status === 'COMPLETED') {
        Alert.alert('Success', 'Job marked as complete!');
        router.back();
      }
    }
  });

  const uploadEvidence = async (uri: string) => {
    try {
      await fileManager.queueForUpload({
        localUri: uri,
        endpoint: `/v1/provider/jobs/${id}/evidence`,
        mimeType: 'image/jpeg',
        fieldName: 'file',
        additionalData: { type: 'post_service' }
      });
      await fileManager.processOutbox();
    } catch (e) {
      console.error(e);
    }
  };

  const toggleCheck = (cid: string) => {
    if (checkedItems.includes(cid)) {
      setCheckedItems(prev => prev.filter(item => item !== cid));
    } else {
      setCheckedItems(prev => [...prev, cid]);
    }
  };

  const addEvidence = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setEvidence(prev => [...prev, uri]);
      uploadEvidence(uri);
    }
  };

  const handleComplete = () => {
    if (checkedItems.length < [{ id: '1', text: 'Arrive at location' }, { id: '2', text: 'Complete requested service' }, { id: '3', text: 'Clean up' }].length) {
      Alert.alert('Incomplete', 'Please complete all checklist items.');
      return;
    }
    if (evidence.length === 0) {
      Alert.alert('Missing Evidence', 'Please upload at least one photo of the completed work.');
      return;
    }
    Alert.alert('Success', 'Job marked as completed!');
    router.replace('/(provider)/bookings');
  };

  const openNavigation = () => {
    // External navigation (PRD PRO-008). Coords come with the dispatch
    // offer; until then route to the launch city.
    const query = encodeURIComponent('Uyo, Akwa Ibom, Nigeria');
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${query}`).catch(() => {
      Alert.alert('Navigation unavailable', 'Could not open the maps app.');
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Job Execution" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Job Header Info */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{"Service " + id}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{"Customer"} • {"Now"}</Text>
          <View style={styles.addressRow}>
            <MapPin size={16} color={colors.primary} />
            <Text style={[styles.address, { color: colors.textPrimary }]}>{"Service Location"}</Text>
          </View>
          <Button 
            title="Navigate to Location" 
            variant="outline" 
            style={styles.navBtn} 
            onPress={openNavigation}
          />
        </View>

        {/* Checklist */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Service Checklist</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Check off items as you complete them</Text>
          
          <View style={styles.checklist}>
              {[{ id: '1', text: 'Arrive at location' }, { id: '2', text: 'Complete requested service' }, { id: '3', text: 'Clean up' }].map((item) => {
                const isChecked = checkedItems.includes(item.id);
                return (
                  <Pressable key={item.id} style={styles.checkItem} onPress={() => toggleCheck(item.id)}>
                    {isChecked ? (
                    <CheckSquare size={24} color={colors.primary} />
                  ) : (
                    <Square size={24} color={colors.border} />
                  )}
                  <Text style={[
                    styles.checkText, 
                    { color: isChecked ? colors.textPrimary : colors.textSecondary },
                    isChecked && { textDecorationLine: 'line-through' }
                  ]}>
                    {item.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Evidence Upload */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Proof of Work</Text>
          <Text style={[styles.helper, { color: colors.textSecondary }]}>Take photos to verify completion</Text>
          
          <View style={styles.evidenceGrid}>
            {evidence.map((uri, i) => (
              <Image key={i} source={{ uri }} style={styles.evidenceImage} />
            ))}
            <Pressable style={[styles.addEvidence, { borderColor: colors.border }]} onPress={addEvidence}>
              <Camera size={32} color={colors.textSecondary} />
              <Text style={[styles.addEvidenceText, { color: colors.textSecondary }]}>Add Photo</Text>
            </Pressable>
          </View>
        </View>

        <Button 
          title="Mark Job as Completed" 
          onPress={handleComplete} 
          size="lg" 
          style={styles.completeBtn}
        />

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
  title: { fontFamily: fonts.bold, fontSize: 20, marginBottom: 4 },
  subtitle: { fontFamily: fonts.medium, fontSize: 14, marginBottom: spacing.md },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.lg },
  address: { fontFamily: fonts.medium, fontSize: 14, flex: 1 },
  navBtn: { width: '100%' },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 18 },
  helper: { fontFamily: fonts.regular, fontSize: 13, marginBottom: spacing.md, marginTop: 2 },
  checklist: { gap: spacing.md },
  checkItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  checkText: { fontFamily: fonts.medium, fontSize: 15, flex: 1 },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  evidenceImage: { width: 80, height: 80, borderRadius: radii.md, resizeMode: 'cover' },
  addEvidence: {
    width: 80, height: 80, 
    borderWidth: 2, borderStyle: 'dashed', 
    borderRadius: radii.md, 
    alignItems: 'center', justifyContent: 'center'
  },
  addEvidenceText: { fontFamily: fonts.medium, fontSize: 11, marginTop: 4 },
  completeBtn: { marginTop: spacing.md, marginBottom: spacing.xxl }
});
