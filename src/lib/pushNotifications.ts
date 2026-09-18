/**
 * Mobile Push Notification and Emergency Alert Engine
 * Supports:
 * 1. Android APKs built with Capacitor (@capacitor/local-notifications)
 * 2. Android WebView APKs with JavascriptInterface bridges (Android, AndroidInterface, AndroidBridge)
 * 3. Cordova / PhoneGap APKs
 * 4. Mobile Progressive Web Apps (PWA) & standard browser Web Notifications
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

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
  isApk: boolean;
  message: string;
}

// Global flag to track initialized Android notification channel
let isChannelCreated = false;
let isListenerRegistered = false;

// Convert string tag into a stable 32-bit integer ID for Android NotificationManager
function generateNotificationId(tag?: string): number {
  if (!tag) return Math.floor(Math.random() * 2147483647);
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    const char = tag.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 2147483647 || 1001;
}

/**
 * Detect if running inside a native Android or mobile APK environment
 */
export function isAndroidApk(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Capacitor Native Platform check
  try {
    if (Capacitor.isNativePlatform()) return true;
    if (Capacitor.getPlatform() === 'android') return true;
  } catch {
    // Ignore error if capacitor runtime is not ready
  }

  // 2. Window Capacitor property
  // @ts-expect-error Global window inspection
  if (typeof window.Capacitor !== 'undefined' && window.Capacitor?.isNativePlatform?.()) {
    return true;
  }

  // 3. Android WebView JavascriptInterface bridges
  const win = window as unknown as Record<string, unknown>;
  if (
    win.Android ||
    win.AndroidInterface ||
    win.AndroidBridge ||
    win.AndroidNotification ||
    win.NativeApp
  ) {
    return true;
  }

  // 4. Android WebView User Agent / Protocol inspection
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    // Typical Android WebView tokens
    const isWebView = /wv|Version\/[\d.]+/i.test(ua) || (isAndroid && !/Chrome\/[\d.]+\s+Mobile/i.test(ua));
    if (isAndroid && isWebView) return true;
  }

  // 5. Custom packaged protocol schemes (e.g. capacitor://, ionic://, file://)
  if (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'ionic:' ||
    window.location.protocol === 'file:' ||
    window.location.protocol === 'android-app:'
  ) {
    return true;
  }

  return false;
}

/**
 * Detect if running inside an iframe (e.g. AI Studio preview), BUT return false if running in APK
 */
export function isInIframe(): boolean {
  if (isAndroidApk()) return false;
  try {
    return typeof window !== 'undefined' && window.self !== window.top;
  } catch {
    return true;
  }
}

/**
 * Detect iOS devices (iPhone, iPad)
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Detect if running as standalone installed PWA
 */
export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // @ts-expect-error iOS Safari proprietary property
    window.navigator.standalone === true
  );
}

/**
 * Synthesize an audible emergency alert chime via Web Audio API + HTML5 Audio fallback
 */
export function playEmergencyAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Emergency siren tone sequence: High (880Hz) -> Low (660Hz) -> High (880Hz)
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.04);
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
    }
  } catch (err) {
    console.warn('Audio playback restricted before user interaction:', err);
  }
}

/**
 * Trigger device haptic vibration pattern for emergency urgency
 */
export function triggerDeviceVibration(pattern: number[] = [300, 100, 300, 100, 400]) {
  try {
    // 1. Android / Web Vibration API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }

    // 2. Android WebView bridge vibration if available
    const win = window as unknown as Record<string, unknown>;
    // @ts-expect-error Custom Android bridge
    if (win.Android?.vibrate) {
      // @ts-expect-error Custom Android bridge
      win.Android.vibrate(500);
    }
  } catch (e) {
    console.warn('Vibration API not supported or permitted on this device:', e);
  }
}

/**
 * Ensure the Android High-Priority Notification Channel exists
 */
export async function ensureAndroidNotificationChannel(): Promise<void> {
  if (isChannelCreated) return;
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      await LocalNotifications.createChannel({
        id: 'emergency_alerts',
        name: 'Emergency Disaster Alerts',
        description: 'Instant loud alerts for critical disaster response tasks and requests',
        importance: 5, // MAX IMPORTANCE in Android: produces sound and heads-up popdown banner
        visibility: 1, // VISIBILITY_PUBLIC on lock screen
        vibration: true,
        lights: true,
        lightColor: '#DC2626',
      });
      isChannelCreated = true;
    }
  } catch (err) {
    console.warn('Unable to create Android notification channel:', err);
  }
}

/**
 * Setup notification click listener to navigate when user taps on Android notification
 */
export function setupNotificationListeners(onNavigate?: (url: string) => void) {
  if (isListenerRegistered) return;
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
        const extra = notificationAction.notification.extra as Record<string, unknown> | undefined;
        const targetUrl = (extra?.url as string) || '/volunteer-dashboard';
        if (onNavigate) {
          onNavigate(targetUrl);
        } else if (typeof window !== 'undefined') {
          window.location.href = targetUrl;
        }
      });
      isListenerRegistered = true;
    }
  } catch (err) {
    console.warn('Could not register notification action listener:', err);
  }
}

/**
 * Verify if native push or local notifications are supported in this environment
 */
export function isPushNotificationSupported(): boolean {
  // If running in APK, local notifications and bridge are always supported
  if (isAndroidApk()) return true;
  return typeof window !== 'undefined' && ('Notification' in window || 'serviceWorker' in navigator);
}

/**
 * Check current status of notification permissions across Android APK and Browsers
 */
export async function checkNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  // 1. Android APK with Capacitor
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') return 'granted';
      if (status.display === 'denied') return 'denied';
      return 'default';
    }
  } catch (err) {
    console.warn('Capacitor checkPermissions error:', err);
  }

  // 2. Android WebView Bridge
  const win = window as unknown as Record<string, unknown>;
  if (win.Android || win.AndroidInterface || win.AndroidBridge || win.AndroidNotification) {
    return 'granted';
  }

  // 3. Web Notification API
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      return Notification.permission;
    } catch {
      return 'unsupported';
    }
  }

  return 'unsupported';
}

/**
 * Synchronous status helper for UI components
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (isAndroidApk()) {
    // In an APK, default to checking localStorage or assume capable
    const saved = localStorage.getItem('dvn_apk_notif_enabled');
    if (saved === 'granted') return 'granted';
    if (saved === 'denied') return 'denied';
    return 'default';
  }

  if (!isPushNotificationSupported()) return 'unsupported';
  try {
    return Notification.permission;
  } catch {
    return 'unsupported';
  }
}

/**
 * Register service worker for native mobile notification tray integration (Web fallback)
 */
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

/**
 * Request notification permission from the user
 * Supports Android APK (Capacitor LocalNotifications), Android WebView bridges, and Web
 */
export async function requestPushNotificationPermission(): Promise<RequestPermissionResult> {
  if (typeof window === 'undefined') {
    return {
      permission: 'unsupported',
      success: false,
      isInIframe: false,
      isApk: false,
      message: 'Window object not available',
    };
  }

  const isApk = isAndroidApk();

  // 1. If running inside an embedded iframe (and NOT an APK)
  if (isInIframe()) {
    return {
      permission: isPushNotificationSupported() ? Notification.permission : 'unsupported',
      success: false,
      isInIframe: true,
      isApk: false,
      message: 'Browser security blocks notification requests inside preview frames. Please open the app in a new tab.',
    };
  }

  // 2. If running as an Android APK via Capacitor
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      await ensureAndroidNotificationChannel();
      const status = await LocalNotifications.requestPermissions();
      
      if (status.display === 'granted') {
        localStorage.setItem('dvn_apk_notif_enabled', 'granted');
        
        // Trigger welcome test notification to verify native Android tray
        await triggerMobilePushNotification({
          title: '🚨 Emergency Mobile Alerts Active',
          body: 'Native Android notifications are enabled. You will receive immediate status bar alerts for urgent tasks.',
          tag: 'welcome-apk-alert',
          playSound: true,
          vibrate: true,
        });

        return {
          permission: 'granted',
          success: true,
          isInIframe: false,
          isApk: true,
          message: 'Android notifications successfully enabled!',
        };
      } else if (status.display === 'denied') {
        localStorage.setItem('dvn_apk_notif_enabled', 'denied');
        return {
          permission: 'denied',
          success: false,
          isInIframe: false,
          isApk: true,
          message: 'Notification permission was denied. Please allow notifications in Android App Settings.',
        };
      }
    }
  } catch (err) {
    console.warn('Capacitor LocalNotifications request failed, attempting bridge fallback:', err);
  }

  // 3. If running in an Android WebView with JavascriptInterface bridge
  const win = window as unknown as Record<string, unknown>;
  if (win.Android || win.AndroidInterface || win.AndroidBridge || win.AndroidNotification) {
    localStorage.setItem('dvn_apk_notif_enabled', 'granted');
    // @ts-expect-error Custom Android bridge
    if (win.Android?.requestPermission) {
      // @ts-expect-error Custom Android bridge
      win.Android.requestPermission();
    }
    
    await triggerMobilePushNotification({
      title: '🚨 Mobile Alerts Active',
      body: 'Notifications are enabled for disaster response tasks.',
      tag: 'welcome-bridge-alert',
      playSound: true,
      vibrate: true,
    });

    return {
      permission: 'granted',
      success: true,
      isInIframe: false,
      isApk: true,
      message: 'Mobile notifications successfully enabled!',
    };
  }

  // 4. Fallback to standard Web Push Notification API (Browser / PWA)
  if (!isPushNotificationSupported()) {
    return {
      permission: 'unsupported',
      success: false,
      isInIframe: false,
      isApk,
      message: isIOS()
        ? 'iOS Safari requires adding this app to your Home Screen first to enable Web Push.'
        : 'Web Push notifications are not supported in this environment.',
    };
  }

  try {
    registerPushServiceWorker().catch(() => {});

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
      localStorage.setItem('dvn_apk_notif_enabled', 'granted');
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
        isApk: false,
        message: 'Mobile push notifications successfully enabled!',
      };
    } else if (permission === 'denied') {
      localStorage.setItem('dvn_apk_notif_enabled', 'denied');
      return {
        permission: 'denied',
        success: false,
        isInIframe: false,
        isApk: false,
        message: 'Notifications are blocked in your browser settings. Please allow notifications in site settings.',
      };
    } else {
      return {
        permission: 'default',
        success: false,
        isInIframe: false,
        isApk: false,
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
      isInIframe: isFrameError,
      isApk,
      message: isFrameError
        ? 'Browser security blocks notification requests inside preview frames. Please open the app in a new tab.'
        : errMessage,
    };
  }
}

/**
 * Send push / local notification directly to the user's mobile device
 * Works on:
 * - Android APK (via Capacitor LocalNotifications -> Native Android NotificationManager)
 * - Android WebView bridges (window.Android)
 * - ServiceWorker / Web Notification in browsers
 */
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

  let delivered = false;

  // 1. Play audible emergency siren / sound on device
  if (playSound) {
    playEmergencyAlertSound();
  }

  // 2. Vibrate mobile device
  if (vibrate) {
    triggerDeviceVibration();
  }

  // 3. Dispatch an in-app emergency event so open UI components can display a banner/modal
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('dvn:emergency_notification', {
        detail: { title, body, url, tag, data },
      })
    );
  }

  // 4. Android APK with Capacitor: Trigger native Android status bar notification
  try {
    if (Capacitor.isPluginAvailable('LocalNotifications')) {
      await ensureAndroidNotificationChannel();
      const notifId = generateNotificationId(tag);

      await LocalNotifications.schedule({
        notifications: [
          {
            id: notifId,
            title,
            body,
            channelId: 'emergency_alerts',
            extra: {
              url,
              tag,
              ...data,
            },
            schedule: {
              at: new Date(Date.now() + 100), // Fire immediately
              allowWhileIdle: true,           // Wake device from Doze mode if idle
            },
            ongoing: false,
            autoCancel: true,
          },
        ],
      });
      delivered = true;
    }
  } catch (err) {
    console.warn('Capacitor LocalNotifications schedule failed:', err);
  }

  // 5. Android WebView custom bridge
  const win = window as unknown as Record<string, unknown>;
  try {
    // @ts-expect-error Custom Android bridge
    if (win.Android?.showNotification) {
      // @ts-expect-error Custom Android bridge
      win.Android.showNotification(title, body, tag);
      delivered = true;
    // @ts-expect-error Custom Android bridge
    } else if (win.AndroidInterface?.showNotification) {
      // @ts-expect-error Custom Android bridge
      win.AndroidInterface.showNotification(title, body);
      delivered = true;
    // @ts-expect-error Custom Android bridge
    } else if (win.AndroidBridge?.showNotification) {
      // @ts-expect-error Custom Android bridge
      win.AndroidBridge.showNotification(title, body);
      delivered = true;
    // @ts-expect-error Custom Android bridge
    } else if (win.AndroidNotification?.show) {
      // @ts-expect-error Custom Android bridge
      win.AndroidNotification.show(title, body);
      delivered = true;
    // @ts-expect-error Custom Android bridge
    } else if (win.NativeApp?.showNotification) {
      // @ts-expect-error Custom Android bridge
      win.NativeApp.showNotification(title, body);
      delivered = true;
    }
  } catch (bridgeErr) {
    console.warn('Android bridge error:', bridgeErr);
  }

  // 6. Cordova / PhoneGap local notification
  try {
    // @ts-expect-error Cordova plugin
    if (win.cordova?.plugins?.notification?.local?.schedule) {
      // @ts-expect-error Cordova plugin
      win.cordova.plugins.notification.local.schedule({
        id: generateNotificationId(tag),
        title,
        text: body,
        foreground: true,
        priority: 2,
      });
      delivered = true;
    }
  } catch (cordovaErr) {
    console.warn('Cordova notification error:', cordovaErr);
  }

  // 7. Browser Web Notification / Service Worker fallback
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      if (Notification.permission === 'granted') {
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

        // Prefer ServiceWorker for background lock screen delivery
        if ('serviceWorker' in navigator) {
          try {
            let reg = await navigator.serviceWorker.getRegistration();
            if (!reg) {
              reg = await registerPushServiceWorker();
            }
            if (reg) {
              await reg.showNotification(title, notificationOptions);
              delivered = true;
              return true;
            }
          } catch {
            // Fallback to window Notification
          }
        }

        const notif = new Notification(title, notificationOptions);
        notif.onclick = () => {
          window.focus();
          window.location.href = url;
          notif.close();
        };
        delivered = true;
      }
    } catch {
      // Ignored
    }
  }

  return delivered;
}

/**
 * Test trigger for users to verify mobile notification on their phone / APK
 */
export async function testMobilePushNotification(): Promise<boolean> {
  return triggerMobilePushNotification({
    title: '🚨 URGENT: Test Disaster Alert',
    body: 'Medical evacuation needed for 2 people near Downtown. Tap to open coordinates.',
    url: '/volunteer-dashboard',
    tag: 'test-emergency-' + Date.now(),
    playSound: true,
    vibrate: true,
    data: { isTest: true },
  });
}
