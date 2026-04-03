import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api, { BASE_URL } from './api';

// Visar notiser när appen är öppen
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registreraPushToken(workerId) {
  // Expo push-tokens fungerar bara på fysiska enheter (ej simulator)
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[PUSH] Notisbehörighet nekad');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoToken = tokenData.data;
  console.log('[PUSH] Token:', expoToken);

  // Skicka token till backend
  try {
    await api.post(`/api/workers/${workerId}/push-token`, {
      expo_push_token: expoToken,
    });
    console.log('[PUSH] Token registrerad för worker', workerId);
  } catch (e) {
    console.log('[PUSH] Backend-registrering misslyckades:', e.message);
  }

  // Android behöver en notiskanal
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'serviceOS',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  return expoToken;
}
