import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Platform } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { useAppTheme } from '../app/_layout';
import { Button } from './ui/Button';

export function PinLockScreen() {
  const { colors } = useAppTheme();
  const unlockApp = useAuthStore(s => s.unlockApp);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleUnlock = () => {
    if (unlockApp(pin)) {
      setError(false);
      setPin('');
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Session Locked</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Please enter your PIN to continue.
      </Text>
      
      <TextInput
        style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={4}
        value={pin}
        onChangeText={(text) => {
          setPin(text);
          if (text.length === 4) {
             // Auto unlock when 4 digits are entered
             setTimeout(() => {
               if (!useAuthStore.getState().unlockApp(text)) {
                 setError(true);
                 setPin('');
               }
             }, 100);
          }
        }}
        placeholder="••••"
        placeholderTextColor={colors.textSecondary}
        autoFocus
      />
      {error && <Text style={styles.error}>Incorrect PIN</Text>}
      
      <Button title="Unlock" onPress={handleUnlock} style={{ marginTop: 20 }} />
      
      <Button 
        title="Logout instead" 
        variant="ghost" 
        onPress={() => useAuthStore.getState().logout()} 
        style={{ marginTop: 20 }} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  input: {
    fontSize: 32,
    letterSpacing: 16,
    textAlign: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    width: 200,
    marginBottom: 16,
  },
  error: {
    color: 'red',
    marginTop: 8,
  },
});
