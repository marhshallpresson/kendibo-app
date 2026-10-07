import * as Device from 'expo-device';
import { Platform } from 'react-native';

// NOTE: expo-notifications must NEVER be statically imported — its push
// capability was removed from Expo Go (SDK 53+) and a static import crashes
// every route on load. Always lazy-require it (dev builds/production only).
type NotificationsModule = typeof import('expo-notifications');
let notificationsModule: NotificationsModule | null | undefined;
function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

let handlerSet = false;
function ensureHandler() {
  const Notifications = getNotifications();
  if (!Notifications || handlerSet) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerSet = true;
}

export async function registerForPushNotificationsAsync() {
  const Notifications = getNotifications();
  if (!Notifications) {
    console.log('Push unavailable in this runtime (Expo Go) — needs a dev build.');
    return;
  }
  let token;

  if (Platform.OS === 'android') {
    ensureHandler();
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    try {
      // Use Sender ID directly for FCM
      const tokenData = await Notifications.getDevicePushTokenAsync();
      token = tokenData.data;
      console.log('FCM Push Token:', token);
    } catch (e) {
      console.log('Error getting push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
