import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { unregisterPushNotificationsAsync } from '../services/notifications';

interface OrdersDashboardProps {
  staff: any;
  fcmToken: string | null;
  selectedOrder: any | null;
  onLogout: () => void;
}

export default function OrdersDashboard({ staff, fcmToken, selectedOrder, onLogout }: OrdersDashboardProps) {
  const handleLogout = async () => {
    try {
      if (fcmToken) {
        await unregisterPushNotificationsAsync(fcmToken);
      }
      await SecureStore.deleteItemAsync('staff_jwt');
      await SecureStore.deleteItemAsync('staff_info');
      onLogout();
    } catch (err: any) {
      Alert.alert('Logout Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.staffName}>{staff?.name || 'Staff Member'}</Text>
          <Text style={styles.roleBadge}>{String(staff?.role || 'staff').toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Push Notification Status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, fcmToken ? styles.dotActive : styles.dotInactive]} />
            <Text style={styles.statusText}>
              {fcmToken ? 'Registered with Backend FCM Gateway' : 'Push Registration Pending / No Device'}
            </Text>
          </View>
        </View>

        {selectedOrder ? (
          <View style={[styles.card, styles.highlightCard]}>
            <Text style={styles.highlightTitle}>🔔 Notification Tapped — Order Deep-Link</Text>
            <Text style={styles.orderText}>Order ID: #{selectedOrder.order_id || selectedOrder.id}</Text>
            <Text style={styles.orderText}>Status: {selectedOrder.status || 'placed'}</Text>
            <Text style={styles.orderText}>Table: {selectedOrder.table_number || 'N/A'}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Orders & Push Alert Feed</Text>
            <Text style={styles.emptyText}>Waiting for real-time customer order events...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: 48,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  staffName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
  },
  roleBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#818cf8',
    marginTop: 2,
    letterSpacing: 1,
  },
  logoutBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  highlightCard: {
    borderColor: '#6366f1',
    backgroundColor: '#1e1b4b',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  highlightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#818cf8',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dotActive: {
    backgroundColor: '#22c55e',
  },
  dotInactive: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 13,
    color: '#cbd5e1',
  },
  orderText: {
    fontSize: 14,
    color: '#f1f5f9',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 4,
  },
});
