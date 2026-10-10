import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2 } from '@/components/ui/icons';
import { useAppTheme } from '../_layout';
import { spacing, radii, fonts } from '../../constants/theme';
import { Button } from '../../components/ui/Button';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();

  const [orderUpdates, setOrderUpdates] = useState(true);
  const [chatAlerts, setChatAlerts] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(false);

  const [promotions, setPromotions] = useState(true);
  const [cashbackUpdates, setCashbackUpdates] = useState(false);

  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [newTipsEnabled, setNewTipsEnabled] = useState(false);

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const toggleRow = (
    label: string,
    value: boolean,
    onChange: (v: boolean) => void,
    key: string
  ) => (
    <View key={key} style={styles.toggleRow}>
      <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notification</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isSaved && (
          <View style={[styles.toastCard, { backgroundColor: colors.primaryLight }]}>
            <CheckCircle2 size={18} color={colors.primary} />
            <Text style={[styles.toastText, { color: colors.primary }]}>
              Notification preferences updated successfully!
            </Text>
          </View>
        )}

        {toggleRow('General Notification', orderUpdates, setOrderUpdates, 'order')}
        {toggleRow('Sound', chatAlerts, setChatAlerts, 'chat')}
        {toggleRow('Vibrate', maintenanceReminders, setMaintenanceReminders, 'maint')}
        {toggleRow('Special Offers', promotions, setPromotions, 'promo')}
        {toggleRow('Promo & Discount', cashbackUpdates, setCashbackUpdates, 'cashback')}
        {toggleRow('Payments', pushEnabled, setPushEnabled, 'push')}
        {toggleRow('Cashback', smsEnabled, setSmsEnabled, 'sms')}
        {toggleRow('App Updates', whatsappEnabled, setWhatsappEnabled, 'wa')}
        {toggleRow('New Service Available', emailEnabled, setEmailEnabled, 'email')}
        {toggleRow('New Tips Available', newTipsEnabled, setNewTipsEnabled, 'tips')}

        <View style={styles.saveArea}>
          <Button
            title="Save Preferences"
            variant="primary"
            size="lg"
            onPress={handleSave}
          />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.display,
    flex: 1,
  },
  headerSpacer: {
    width: 24,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 40,
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  toastText: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + 4,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: fonts.regular,
  },
  saveArea: {
    marginTop: spacing.xl,
  },
});
