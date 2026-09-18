/**
 * Mobile Push Notification and Emergency Alert Engine
 * Enables native device push notifications, emergency sound chimes, and haptic vibrations.
 */

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  playSound?: boolean;
  vibrate?: boolean;
  data?: Record<string, unknown>;
}

// Synthesize an audible emergency alert chime via Web Audio API
export function playEmergencyAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Emergency two-tone alert: High (880Hz) -> Low (660Hz) -> High (880Hz)
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };

    playTone(880, 0, 0.2);
    playTone(660, 0.22, 0.2);
    playTone(880, 0.44, 0.35);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  } catch (err) {
    console.warn('AudioContext alert playback not allowed before user gesture:', err);
  }
}

// Trigger device haptic vibration pattern for emergency urgency
export function triggerDeviceVibration(pattern: number[] = [300, 100, 300, 100, 400]) {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.warn('Vibration API not supported or permitted on this device:', e);
  }
}

// Verify if native push/web notifications are supported on this browser
export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

// Current status of browser notification permissions
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Register service worker for native mobile notification tray integration
export async function registerPushServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('Service worker registration failed:', err);
    return null;
  }
}

// Request permission from the user
export async function requestPushNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isPushNotificationSupported()) {
    return 'unsupported';
  }

  try {
    // Register service worker first
    await registerPushServiceWorker();
    
    // Request native permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Send welcome / confirmation push
      await triggerMobilePushNotification({
        title: '🔔 Mobile Alerts Activated',
        body: 'You will now receive instant push alerts for emergency tasks in your area.',
        tag: 'welcome-alert',
        playSound: true,
        vibrate: true,
      });
    }
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

// Send push notification to user's mobile device
export async function triggerMobilePushNotification(payload: NotificationPayload): Promise<boolean> {
  const {
    title,
    body,
    url = '/volunteer-dashboard',
    tag = 'emergency-' + Date.now(),
    playSound = true,
    vibrate = true,
    data = {},
  } = payload;

  // 1. Play alert sound on device
  if (playSound) {
    playEmergencyAlertSound();
  }

  // 2. Vibrate mobile device
  if (vibrate) {
    triggerDeviceVibration();
  }

  // 3. If notifications are not supported or permission denied, cannot push to OS tray
  if (!isPushNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions: NotificationOptions & { renotify?: boolean; vibrate?: number[] } = {
    body,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag,
    renotify: true,
    requireInteraction: true,
    data: {
      url,
      ...data,
    },
    vibrate: [300, 100, 300, 100, 400],
  };

  // 4. Prefer ServiceWorker registration to push directly to Android / iOS notification center
  try {
    if ('serviceWorker' in navigator) {
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await registerPushServiceWorker();
      }
      if (reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }
  } catch (err) {
    console.warn('ServiceWorker showNotification failed, falling back to window Notification:', err);
  }

  // 5. Fallback to standard window Notification constructor
  try {
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      window.location.href = url;
      notif.close();
    };
    return true;
  } catch (err) {
    console.error('Native Notification error:', err);
    return false;
  }
}

// Test trigger for users to verify mobile notification on their phone
export async function testMobilePushNotification(): Promise<boolean> {
  return triggerMobilePushNotification({
    title: '🚨 Urgent: Test Emergency Task',
    body: 'Medical evacuation needed for 2 people near Downtown. Tap to view location and coordinates.',
    url: '/volunteer-dashboard',
    tag: 'test-emergency-' + Date.now(),
    playSound: true,
    vibrate: true,
  });
}
