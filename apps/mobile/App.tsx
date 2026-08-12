import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import LoginScreen from './src/screens/LoginScreen';
import LiveOrdersScreen from './src/screens/LiveOrdersScreen';
import TablesSessionsScreen from './src/screens/TablesSessionsScreen';
import StaffProfileScreen from './src/screens/StaffProfileScreen';
import { registerForPushNotificationsAsync } from './src/services/notifications';
import { staffOrderStore, StaffOrderStoreState } from './src/store/useStaffOrderStore';
import { mobileRealtimeService } from './src/services/realtime';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

export default function App() {
  const [storeState, setStoreState] = useState<StaffOrderStoreState>(staffOrderStore.getState());
  const [activeTab, setActiveTab] = useState<'orders' | 'tables' | 'profile'>('orders');
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Subscribe to store updates
    const unsubscribe = staffOrderStore.subscribe(() => {
      const state = staffOrderStore.getState();
      setStoreState({ ...state });

      // Clean up Realtime subscriptions if logged out
      if (!state.staff) {
        mobileRealtimeService.unsubscribeAll();
      }
    });

    // Check existing stored authentication session
    const restoreSession = async () => {
      try {
        const token = await SecureStore.getItemAsync('staff_jwt');
        const staffInfo = await SecureStore.getItemAsync('staff_info');

        if (token && staffInfo) {
          const parsedStaff = JSON.parse(staffInfo);
          staffOrderStore.getState().setStaffSession(parsedStaff, token);
        }
      } catch (err) {
        console.error('[App] Session restoration error:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();

    return () => unsubscribe();
  }, []);

  const staff = storeState.staff;

  useEffect(() => {
    if (!staff) {
      mobileRealtimeService.unsubscribeAll();
      return;
    }

    // 1. Register push notification token upon staff login
    registerForPushNotificationsAsync().then((token) => {
      if (token) setFcmToken(token);
    });

    // 2. Initialize tenant-scoped Supabase Realtime subscription
    if (staff.tenant_id && staff.restaurant_id) {
      mobileRealtimeService.initialize(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        staff.tenant_id,
        staff.restaurant_id
      );
    }

    // Handle incoming notification while app is in foreground
    const notificationSubscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[ForegroundNotification] Received:', notification.request.content.data);
      staffOrderStore.getState().fetchOrders();
    });

    // Handle notification tap action (Deep-Linking)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      console.log('[NotificationTap] User tapped notification:', data);
      if (data && data.order_id) {
        setActiveTab('orders');
        staffOrderStore.getState().fetchOrders();
      }
    });

    return () => {
      notificationSubscription.remove();
      responseSubscription.remove();
      mobileRealtimeService.unsubscribeAll();
    };
  }, [staff]);

  if (checkingAuth) {
    return null;
  }

  if (!staff) {
    return (
      <LoginScreen
        onLoginSuccess={(staffData) => {
          SecureStore.getItemAsync('staff_jwt').then((token) => {
            if (token) {
              staffOrderStore.getState().setStaffSession(staffData, token);
            }
          });
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Main Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.brandTitle}>TRINETRA RESTAURANT OS</Text>
          <Text style={styles.staffHeaderRole}>
            {staff.name} • {String(staff.role).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Screen Container */}
      <View style={styles.screenContainer}>
        {activeTab === 'orders' && <LiveOrdersScreen />}
        {activeTab === 'tables' && <TablesSessionsScreen />}
        {activeTab === 'profile' && <StaffProfileScreen staff={staff} fcmToken={fcmToken} />}
      </View>

      {/* Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Text style={[styles.tabIcon, activeTab === 'orders' && styles.tabTextActive]}>📋</Text>
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>ORDERS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tables' && styles.tabItemActive]}
          onPress={() => setActiveTab('tables')}
        >
          <Text style={[styles.tabIcon, activeTab === 'tables' && styles.tabTextActive]}>🪑</Text>
          <Text style={[styles.tabText, activeTab === 'tables' && styles.tabTextActive]}>TABLES</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'profile' && styles.tabItemActive]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.tabIcon, activeTab === 'profile' && styles.tabTextActive]}>👤</Text>
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>PROFILE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6366f1',
    letterSpacing: 1.5,
  },
  staffHeaderRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 2,
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingVertical: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#6366f1',
  },
  tabIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#818cf8',
    opacity: 1,
  },
});
