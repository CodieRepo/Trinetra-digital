import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { staffOrderStore, StaffUser } from '../store/useStaffOrderStore';
import { unregisterPushNotificationsAsync } from '../services/notifications';

interface StaffProfileScreenProps {
  staff: StaffUser | null;
  fcmToken: string | null;
}

export default function StaffProfileScreen({ staff, fcmToken }: StaffProfileScreenProps) {
  const handleLogout = async () => {
    try {
      if (fcmToken) {
        await unregisterPushNotificationsAsync(fcmToken);
      }
      await staffOrderStore.getState().clearSession();
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Terminal Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(staff?.name || 'S').slice(0, 2).toUpperCase()}</Text>
        </View>

        <Text style={styles.nameText}>{staff?.name || 'Staff Member'}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>{String(staff?.role || 'staff').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardHeader}>Push Notification Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, fcmToken ? styles.dotActive : styles.dotInactive]} />
          <Text style={styles.statusText}>
            {fcmToken ? 'FCM Device Token Registered' : 'Push Notification Service Disconnected'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>LOGOUT STAFF TERMINAL</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    padding: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 16,
  },
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleBadge: {
    backgroundColor: '#312e81',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  roleText: {
    color: '#a5b4fc',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotActive: { backgroundColor: '#22c55e' },
  dotInactive: { backgroundColor: '#ef4444' },
  statusText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  logoutBtn: {
    backgroundColor: '#7f1d1d',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#fecaca',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
