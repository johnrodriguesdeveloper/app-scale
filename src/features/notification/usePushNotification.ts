import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotification() {
  const registerPush = async (userId: string) => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push não é suportado neste dispositivo/navegador.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permissão de notificação negada pelo usuário.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      
      const publicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        console.error('Chave pública VAPID não encontrada no .env');
        return;
      }
      const convertedKey = urlBase64ToUint8Array(publicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      const subJson = subscription.toJSON();
      const endpoint = subJson.endpoint;
      const p256dh = subJson.keys?.p256dh;
      const auth = subJson.keys?.auth;

      if (!endpoint || !p256dh || !auth) return;

      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', endpoint);

      const { error } = await supabase
        .from('push_subscriptions')
        .insert({
          user_id: userId,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth
        });

      if (error) throw error;

      console.log('Navegador inscrito no sistema de notificações com sucesso!');
    } catch (error) {
      console.error('Erro ao configurar push notifications:', error);
    }
  };

  return { registerPush };
}