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

export interface RequestPermissionResult {
  permission: NotificationPermission | 'unsupported';
  success: boolean;
  isInIframe: boolean;
  message: string;
}

// Detect if running inside an iframe (e.g. AI Studio preview)
export function isInIframe(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

// Detect iOS devices (iPhone, iPad)
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

// Detect if running as standalone installed PWA
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS Safari proprietary property
    window.navigator.standalone === true
  );
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
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
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

// Request permission from the user with full diagnostics and iframe protection
export async function requestPushNotificationPermission(): Promise<RequestPermissionResult> {
  if (typeof window === 'undefined') {
    return {
      permission: 'unsupported',
      success: false,
      isInIframe: false,
      message: 'Window object not available',
    };
  }

  const inIframe = isInIframe();
  if (inIframe) {
    return {
      permission: isPushNotificationSupported() ? Notification.permission : 'unsupported',
      success: false,
      isInIframe: true,
      message: 'Browser security blocks notification requests inside preview frames. Please open the app in a new tab.',
    };
  }

  if (!isPushNotificationSupported()) {
    return {
      permission: 'unsupported',
      success: false,
      isInIframe: false,
      message: isIOS()
        ? 'iOS Safari requires adding this app to your Home Screen first to enable Web Push.'
        : 'Web Push notifications are not supported in this browser.',
    };
  }

  try {
    // Non-blocking attempt to register Service Worker
    registerPushServiceWorker().catch(() => {});

    // Support both Promise and callback forms of Notification.requestPermission
    let permission: NotificationPermission;
    const req = Notification.requestPermission();
    if (req && typeof req.then === 'function') {
      permission = await req;
    } else {
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    if (permission === 'granted') {
      // Send welcome / confirmation push
      triggerMobilePushNotification({
        title: '🔔 Mobile Alerts Activated',
        body: 'You will now receive instant push alerts for emergency tasks in your area.',
        tag: 'welcome-alert',
        playSound: true,
        vibrate: true,
      }).catch(() => {});

      return {
        permission: 'granted',
        success: true,
        isInIframe: false,
        message: 'Mobile push notifications successfully enabled!',
      };
    } else if (permission === 'denied') {
      return {
        permission: 'denied',
        success: false,
        isInIframe: false,
        message: 'Notifications are blocked in your browser settings. Please allow notifications in site settings.',
      };
    } else {
      return {
        permission: 'default',
        success: false,
        isInIframe: false,
        message: 'Notification permission request was dismissed.',
      };
    }
  } catch (error: unknown) {
    console.error('Error requesting notification permission:', error);
    const errMessage = error instanceof Error ? error.message : String(error);
    const isFrameError = errMessage.includes('top-level browsing context') || errMessage.includes('SecurityError');

    return {
      permission: 'denied',
      success: false,
      isInIframe: isFrameError || inIframe,
      message: isFrameError
        ? 'Browser security blocks notification requests inside preview frames. Please open the app in a new tab.'
        : errMessage,
    };
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
