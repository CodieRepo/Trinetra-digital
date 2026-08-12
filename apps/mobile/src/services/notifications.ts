import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiRequest } from './api';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('[PushNotification] Physical device required for native FCM push notifications.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PushNotification] Permission not granted for push notifications.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('restaurant_orders_channel', {
      name: 'Restaurant Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  try {
    const tokenData = await Notifications.getDevicePushTokenAsync();
    const fcmToken = tokenData.data;

    // Register token with backend
    await apiRequest('/api/staff/mobile/devices/register', {
      method: 'POST',
      body: JSON.stringify({
        device_token: fcmToken,
        platform: Platform.OS,
        device_name: `${Device.brand || ''} ${Device.modelName || ''}`.trim() || 'Android Staff Device',
        app_version: '1.0.0',
      }),
    });

    console.log('[PushNotification] Registered FCM device token successfully.');
    return fcmToken;
  } catch (err: any) {
    console.error('[PushNotification] Token registration failed:', err.message);
    return null;
  }
}

export async function unregisterPushNotificationsAsync(fcmToken: string): Promise<void> {
  try {
    if (fcmToken) {
      await apiRequest('/api/staff/mobile/devices/unregister', {
        method: 'POST',
        body: JSON.stringify({ device_token: fcmToken }),
      });
      console.log('[PushNotification] Unregistered FCM device token.');
    }
  } catch (err: any) {
    console.error('[PushNotification] Unregistration error:', err.message);
  }
}
