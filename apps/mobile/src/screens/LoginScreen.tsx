import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { apiRequest } from '../services/api';

interface LoginScreenProps {
  onLoginSuccess: (staffData: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [restaurantId, setRestaurantId] = useState('00000000-0000-0000-0000-000000000001');
  const [pin, setPin] = useState('1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!restaurantId || !pin) {
      Alert.alert('Error', 'Please enter Restaurant ID and PIN');
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest('/api/staff/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: restaurantId.trim(),
          device_token: 'mobile-pos-terminal',
          pin: pin.trim(),
        }),
      });

      if (res.success && res.token) {
        await SecureStore.setItemAsync('staff_jwt', res.token);
        await SecureStore.setItemAsync('staff_info', JSON.stringify(res.staff));
        onLoginSuccess(res.staff);
      } else {
        Alert.alert('Login Failed', res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      Alert.alert('Authentication Error', err.message || 'Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TRINETRA RESTAURANT OS</Text>
      <Text style={styles.subtitle}>Staff Mobile Terminal Login</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Restaurant ID</Text>
        <TextInput
          style={styles.input}
          value={restaurantId}
          onChangeText={setRestaurantId}
          placeholder="Enter Restaurant UUID"
          placeholderTextColor="#64748b"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>4-Digit Staff PIN</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={setPin}
          placeholder="••••"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          secureTextEntry
          maxLength={8}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>LOGIN TO TERMINAL</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#6366f1',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8fafc',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
