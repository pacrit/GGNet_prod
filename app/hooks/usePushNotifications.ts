"use client";

import { useState, useEffect } from 'react';
import { message } from 'antd';

interface PushNotificationState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission;
  subscription: PushSubscription | null;
}

export function usePushNotifications(token: string | null) {
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    subscription: null,
  });

  // Verificar suporte a push notifications
  useEffect(() => {
    const checkSupport = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          
          setState(prev => ({
            ...prev,
            isSupported: true,
            isSubscribed: !!subscription,
            permission: Notification.permission,
            subscription,
          }));
        } catch (error) {
          console.error('Erro ao verificar push notifications:', error);
        }
      }
    };

    checkSupport();
  }, []);

  // Solicitar permissão e subscrever
  const subscribe = async () => {
    if (!state.isSupported) {
      message.error('Push notifications não são suportadas neste dispositivo');
      return false;
    }

    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        message.warning('Permissão para notificações negada');
        return false;
      }

      // Obter service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Chave pública VAPID (você precisa gerar uma)
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VAPID public key não configurada');
        message.error('Configuração de push notifications incompleta');
        return false;
      }

      // Subscrever
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Enviar subscription para o servidor
      if (token) {
        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subscription,
            userAgent: navigator.userAgent,
          }),
        });

        if (response.ok) {
          setState(prev => ({
            ...prev,
            isSubscribed: true,
            permission,
            subscription,
          }));
          
          message.success('Push notifications ativadas!');
          return true;
        } else {
          message.error('Erro ao registrar push notifications no servidor');
          return false;
        }
      }
    } catch (error) {
      console.error('Erro ao subscrever push notifications:', error);
      message.error('Erro ao ativar push notifications');
      return false;
    }

    return false;
  };

  // Cancelar subscrição
  const unsubscribe = async () => {
    if (!state.subscription) return true;

    try {
      await state.subscription.unsubscribe();
      
      if (token) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            endpoint: state.subscription.endpoint,
          }),
        });
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        subscription: null,
      }));

      message.success('Push notifications desativadas');
      return true;
    } catch (error) {
      console.error('Erro ao cancelar push notifications:', error);
      message.error('Erro ao desativar push notifications');
      return false;
    }
  };

  return {
    ...state,
    subscribe,
    unsubscribe,
  };
}

// Utility function
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}