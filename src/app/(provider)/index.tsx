import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/ui/Button';

export default function ProviderDashboard() {
  const router = useRouter();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Provider Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to the Technician Portal</Text>
      <Text style={styles.body}>This section is currently under construction. Job dispatching and provider wallet features will be available soon.</Text>
      <Button title="Log Out" onPress={() => router.replace('/login')} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#002a63'
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    color: '#5F7095'
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    color: '#333'
  },
  button: {
    minWidth: 200
  }
});

