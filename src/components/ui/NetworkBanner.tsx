import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../app/_layout';
import { typography } from '../../constants/theme';

export function NetworkBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();

  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 10), backgroundColor: colors.error }]}>
      <Text style={[styles.text, { color: colors.surface, ...typography.caption }]}>
        No internet connection. Some features may be limited.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    textAlign: 'center',
  },
});
