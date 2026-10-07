import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnDemandStore } from '../../../stores/onDemandStore';
import { theme } from '../../../constants/theme';
import { Button } from '../../../components/ui/Button';

// Dummy services list for UI representation (in production, fetch from catalog)
const SERVICES = [
  { id: 'srv_plumbing', name: 'Plumbing & Pipes' },
  { id: 'srv_electrical', name: 'Electrical Works' },
  { id: 'srv_cleaning', name: 'Home Cleaning' },
  { id: 'srv_ac', name: 'AC Maintenance' },
  { id: 'srv_painting', name: 'Painting' },
];

export default function ServiceScreen() {
  const router = useRouter();
  const setService = useOnDemandStore((s) => s.setService);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleNext = () => {
    if (!selectedId) return;
    setService(selectedId, notes);
    router.push('/booking/on-demand/2-urgency-address');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>What do you need help with?</Text>
      
      <View style={styles.serviceList}>
        {SERVICES.map((s) => (
          <TouchableOpacity 
            key={s.id} 
            style={[styles.serviceCard, selectedId === s.id && styles.serviceCardActive]}
            onPress={() => setSelectedId(s.id)}
          >
            <Text style={[styles.serviceText, selectedId === s.id && styles.serviceTextActive]}>
              {s.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Describe your problem (Optional)</Text>
      <TextInput
        style={styles.input}
        multiline
        numberOfLines={4}
        placeholder="E.g., The sink is leaking under the cabinet..."
        placeholderTextColor={theme.light.colors.textMuted}
        value={notes}
        onChangeText={setNotes}
      />

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
  content: { padding: 24 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', color: theme.light.colors.textPrimary, marginBottom: 24 },
  serviceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  serviceCard: { 
    paddingHorizontal: 16, paddingVertical: 12, 
    borderRadius: 8, borderWidth: 1, borderColor: theme.light.colors.border,
    backgroundColor: theme.light.colors.surface 
  },
  serviceCardActive: { 
    borderColor: theme.light.colors.primary, backgroundColor: `${theme.light.colors.primary}15` 
  },
  serviceText: { fontSize: 15, fontFamily: 'Inter-Medium', color: theme.light.colors.textPrimary },
  serviceTextActive: { color: theme.light.colors.primary },
  label: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: theme.light.colors.textPrimary, marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: theme.light.colors.border, borderRadius: 8,
    padding: 16, fontSize: 15, fontFamily: 'Inter-Regular',
    color: theme.light.colors.textPrimary, backgroundColor: theme.light.colors.surface,
    textAlignVertical: 'top', minHeight: 120, marginBottom: 40
  },
  button: { marginTop: 'auto' }
});

