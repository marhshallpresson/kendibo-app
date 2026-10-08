import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Plus,
  Check,
  Edit2,
  Trash2,
  Building,
  Home,
  Briefcase,
  Navigation,
  Phone,
  ShieldAlert,
} from 'lucide-react-native';
import { Header, Button, Input, Badge, Modal } from '../../components/ui';
import { useLocationStore } from '../../stores/locationStore';
import { useAddresses, useAddAddress, useDeleteAddress, useUpdateAddress, useSetDefaultAddress } from '../../services/queryClient';
import { Address } from '../../types';
import { useAppTheme } from '../_layout';
import { fonts, radii, spacing } from '../../constants/theme';

const ADDRESS_TYPES = ['Home', 'Office', 'Apartment', 'Other'];

export default function BookingAddressScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { currentAddress, setAddress, savedAddresses, addSavedAddress } = useLocationStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    currentAddress?.id || (savedAddresses[0]?.id ?? '')
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [label, setLabel] = useState<string>('Home');
  const [street, setStreet] = useState<string>('');
  const [houseNumber, setHouseNumber] = useState<string>('');
  const [estate, setEstate] = useState<string>('');
  const [floor, setFloor] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [gateInstructions, setGateInstructions] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  const { data: liveAddresses = [] } = useAddresses();
  const addAddressMutation = useAddAddress();
  const deleteAddressMutation = useDeleteAddress();
  const updateAddressMutation = useUpdateAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const addressList: Address[] = liveAddresses.length > 0 ? liveAddresses : savedAddresses;

  useEffect(() => {
    if (liveAddresses.length > 0 && !selectedAddressId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional default-selection sync when async addresses arrive
      setSelectedAddressId(liveAddresses[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveAddresses]);

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setAddress(addr);
  };

  const handleOpenAddModal = () => {
    router.push('/booking/add-location');
  };

  const handleOpenEditModal = (addr: Address) => {
    setEditingAddressId(addr.id);
    setLabel(addr.label);
    setStreet(addr.street);
    setHouseNumber(addr.houseNumber || '');
    setEstate(addr.estate || '');
    setFloor(addr.floor || '');
    setLandmark(addr.landmark);
    setGateInstructions(addr.gateInstructions || '');
    setContactPerson('');
    setContactPhone(addr.contactPhone);
    setIsDefault(addr.isDefault);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleDeleteAddress = (id: string) => {
    Alert.alert('Delete Address', 'Are you sure you want to remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAddressMutation.mutateAsync(id);
          } catch {
            Alert.alert('Delete unavailable', 'The backend address delete endpoint is not available yet.');
            return;
          }
          const remaining = addressList.filter((a) => a.id !== id);
          if (selectedAddressId === id && remaining.length > 0) {
            setSelectedAddressId(remaining[0].id);
            setAddress(remaining[0]);
          }
        },
      },
    ]);
  };

  const handleSaveAddress = async () => {
    if (!street.trim()) {
      setFormError('Street name is required.');
      return;
    }
    if (!landmark.trim()) {
      setFormError('Landmark is required to assist technician navigation.');
      return;
    }
    if (!contactPhone.trim()) {
      setFormError('Contact phone number is required.');
      return;
    }

    try {
      if (editingAddressId) {
        const updated = await updateAddressMutation.mutateAsync({
          addressId: editingAddressId,
          patch: {
            label,
            street,
            houseNumber,
            estate,
            floor,
            landmark,
            gateInstructions,
            contactPhone,
            isDefault,
          },
        });
        if (isDefault && !updated.isDefault) {
          await setDefaultMutation.mutateAsync(editingAddressId);
        }
        setSelectedAddressId(updated.id);
        setAddress({ ...updated, isDefault });
      } else {
        const newAddress = await addAddressMutation.mutateAsync({
          userId: '',
          label,
          street,
          houseNumber,
          estate,
          floor,
          landmark,
          gateInstructions,
          contactPhone,
          isDefault,
          city: 'Uyo',
          state: 'Akwa Ibom',
          coordinates: { latitude: 5.0377, longitude: 7.9128 },
        });

        setSelectedAddressId(newAddress.id);
        setAddress(newAddress);
        addSavedAddress(newAddress);
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save address.');
    }
  };

  const handleConfirmSelection = () => {
    const selected = addressList.find((a) => a.id === selectedAddressId);
    if (selected) {
      setAddress(selected);
    }
    router.back();
  };

  const getAddressIcon = (lbl: string) => {
    switch (lbl.toLowerCase()) {
      case 'home':
        return <Home size={20} color={colors.primary} />;
      case 'office':
        return <Briefcase size={20} color={colors.primary} />;
      default:
        return <Building size={20} color={colors.primary} />;
    }
  };

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        safeArea: {
          flex: 1,
          backgroundColor: colors.background,
        },
        scrollContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: 120,
        },
        pageTitle: {
          fontFamily: fonts.display,
          fontSize: 26,
          lineHeight: 34,
          color: colors.textPrimary,
          textAlign: 'center',
          marginVertical: spacing.md,
        },
        addBanner: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.primaryLight,
          borderRadius: radii.md,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          marginBottom: spacing.md,
        },
        addIconCircle: {
          width: 26,
          height: 26,
          borderRadius: 13,
          borderWidth: 1.5,
          borderColor: colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
        },
        addBannerText: {
          fontFamily: fonts.semiBold,
          fontSize: 15,
          lineHeight: 22,
          color: colors.primary,
        },
        addressCard: {
          padding: spacing.lg,
          borderRadius: radii.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          marginBottom: spacing.md,
        },
        addressCardSelected: {
          borderColor: colors.primary,
          borderWidth: 1.5,
        },
        cardHeader: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xs,
        },
        typeBadgeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
        },
        addrTypeTitle: {
          fontFamily: fonts.bold,
          fontSize: 16,
          lineHeight: 24,
          color: colors.textPrimary,
        },
        checkbox: {
          width: 24,
          height: 24,
          borderRadius: 7,
          borderWidth: 1.5,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        },
        checkboxSelected: {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
        fullStreet: {
          fontFamily: fonts.regular,
          fontSize: 14,
          lineHeight: 22,
          color: colors.textPrimary,
          marginBottom: 2,
        },
        detailRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          marginTop: 6,
        },
        landmarkText: {
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
          flex: 1,
        },
        gateText: {
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
          flex: 1,
        },
        contactText: {
          fontFamily: fonts.semiBold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
        cardFooterRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: spacing.md,
        },
        editLink: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.primary,
        },
        deleteLink: {
          fontFamily: fonts.semiBold,
          fontSize: 13,
          lineHeight: 18,
          color: colors.error,
        },
        actionBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 4,
        },
        bottomBar: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
          alignItems: 'center',
        },
        bottomBarButton: {
          maxWidth: 480,
          width: '100%',
        },
        modalScroll: {
          maxHeight: 520,
        },
        modalContent: {
          paddingBottom: spacing.lg,
          gap: spacing.sm,
        },
        errorBanner: {
          padding: spacing.sm,
          backgroundColor: colors.badgeRedBg,
          borderRadius: radii.md,
          marginBottom: spacing.xs,
        },
        errorBannerText: {
          fontFamily: fonts.semiBold,
          fontSize: 12,
          lineHeight: 18,
          color: colors.error,
        },
        inputLabel: {
          fontFamily: fonts.semiBold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
        },
        categoryChipsRow: {
          flexDirection: 'row',
          gap: spacing.sm,
          marginBottom: spacing.xs,
          flexWrap: 'wrap',
        },
        chip: {
          paddingVertical: spacing.xs + 2,
          paddingHorizontal: spacing.md,
          borderRadius: radii.full,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipActive: {
          backgroundColor: colors.primaryLight,
          borderColor: colors.primary,
        },
        chipText: {
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
        },
        chipTextActive: {
          fontFamily: fonts.semiBold,
          color: colors.primary,
        },
        switchRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: spacing.sm,
        },
        switchLabel: {
          fontFamily: fonts.semiBold,
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
        modalSaveBtn: {
          marginTop: spacing.md,
        },
        defaultRow: {
          marginLeft: spacing.sm,
        },
      }),
    [colors]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Header title="" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Manage Address</Text>

        <Pressable
          onPress={handleOpenAddModal}
          style={styles.addBanner}
          accessibilityRole="button"
          accessibilityLabel="Add new address"
        >
          <View style={styles.addIconCircle}>
            <Plus size={14} color={colors.primary} strokeWidth={2.5} />
          </View>
          <Text style={styles.addBannerText}>Add New Address</Text>
        </Pressable>

        {addressList.map((addr) => {
          const isSelected = selectedAddressId === addr.id;
          return (
            <Pressable
              key={addr.id}
              onPress={() => handleSelectAddress(addr)}
              style={[styles.addressCard, isSelected && styles.addressCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.typeBadgeRow}>
                  {getAddressIcon(addr.label)}
                  <Text style={styles.addrTypeTitle}>{addr.label}</Text>
                  {addr.isDefault && (
                    <View style={styles.defaultRow}>
                      <Badge label="Default" variant="info" size="sm" />
                    </View>
                  )}
                </View>

                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Check size={15} color={colors.textInverse} strokeWidth={3} />}
                </View>
              </View>

              <Text style={styles.fullStreet}>
                {addr.houseNumber ? `${addr.houseNumber}, ` : ''}
                {addr.street}
                {addr.estate ? `, ${addr.estate}` : ''}
              </Text>
              <Text style={styles.fullStreet}>
                {addr.landmark}
              </Text>

              {addr.floor ? (
                <Text style={styles.landmarkText}>Floor/Flat: {addr.floor}</Text>
              ) : null}

              <View style={styles.detailRow}>
                <Navigation size={14} color={colors.textSecondary} />
                <Text style={styles.landmarkText}>Landmark: {addr.landmark}</Text>
              </View>

              {addr.gateInstructions ? (
                <View style={styles.detailRow}>
                  <ShieldAlert size={14} color={colors.textSecondary} />
                  <Text style={styles.gateText}>Gate: {addr.gateInstructions}</Text>
                </View>
              ) : null}

              <View style={styles.detailRow}>
                <Phone size={14} color={colors.textSecondary} />
                <Text style={styles.contactText}>{addr.contactPhone}</Text>
              </View>

              <View style={styles.cardFooterRow}>
                <Pressable
                  onPress={() => handleOpenEditModal(addr)}
                  style={styles.actionBtn}
                  hitSlop={8}
                  accessibilityLabel={`Edit ${addr.label} address`}
                >
                  <Edit2 size={14} color={colors.primary} />
                  <Text style={styles.editLink}>Edit Address</Text>
                </Pressable>

                {addressList.length > 1 && (
                  <Pressable
                    onPress={() => handleDeleteAddress(addr.id)}
                    style={styles.actionBtn}
                    hitSlop={8}
                    accessibilityLabel={`Delete ${addr.label} address`}
                  >
                    <Trash2 size={14} color={colors.error} />
                    <Text style={styles.deleteLink}>Delete</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          title="Save & Continue"
          onPress={handleConfirmSelection}
          disabled={!selectedAddressId}
          style={styles.bottomBarButton}
        />
      </View>

      <Modal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddressId ? 'Update Address' : 'Add New Address'}
        type="bottomSheet"
      >
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          {formError ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Save as</Text>
          <View style={styles.categoryChipsRow}>
            {ADDRESS_TYPES.map((type) => {
              const active = label.toLowerCase() === type.toLowerCase();
              return (
                <Pressable
                  key={type}
                  onPress={() => setLabel(type)}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="radio"
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>

          <Input
            label="House / Flat Number"
            value={houseNumber}
            onChangeText={setHouseNumber}
            placeholder="e.g. Plot 24 or Flat 4B"
          />

          <Input
            label="Complete Address"
            value={street}
            onChangeText={setStreet}
            placeholder="e.g. 14 Oron Road"
          />

          <Input
            label="Building or Estate Name"
            value={estate}
            onChangeText={setEstate}
            placeholder="e.g. Ewet Housing Estate"
          />

          <Input
            label="Floor / Unit Details"
            value={floor}
            onChangeText={setFloor}
            placeholder="e.g. 2nd Floor, Left Wing"
          />

          <Input
            label="Nearby Landmark"
            value={landmark}
            onChangeText={setLandmark}
            placeholder="e.g. Opposite Ibom Plaza"
            helperText="Key visual landmark for technician to locate your building"
          />

          <Input
            label="Gate Access / Security Instructions"
            value={gateInstructions}
            onChangeText={setGateInstructions}
            placeholder="e.g. Call host on arrival at gate"
          />

          <Input
            label="Contact Person Name"
            value={contactPerson}
            onChangeText={setContactPerson}
            placeholder="e.g. Chidi Okonkwo"
          />

          <Input
            label="Contact Phone Number"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
            placeholder="+234 801 000 0000"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Set as Default Address</Text>
            <Switch
              value={isDefault}
              onValueChange={setIsDefault}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={isDefault ? colors.primary : colors.surface}
            />
          </View>

          <Button
            title={editingAddressId ? 'Save Changes' : 'Save and Proceed'}
            onPress={handleSaveAddress}
            style={styles.modalSaveBtn}
          />
        </ScrollView>
      </Modal>
    </SafeAreaView>
  );
}
