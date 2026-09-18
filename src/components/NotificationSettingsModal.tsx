import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, Volume2, VolumeX, Vibrate, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles, ExternalLink, Copy, Check, Info } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestPushNotificationPermission, 
  testMobilePushNotification,
  playEmergencyAlertSound,
  triggerDeviceVibration,
  isInIframe,
  isAndroidApk,
  isIOS,
  isStandalonePWA
} from '../lib/pushNotifications';
import toast from 'react-hot-toast';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [inIframe, setInIframe] = useState(false);
  const [isApk, setIsApk] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dvn_alert_sound') !== 'false';
  });
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dvn_alert_vibrate') !== 'false';
  });
  const [isTesting, setIsTesting] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermissionStatus());
      setInIframe(isInIframe());
      setIsApk(isAndroidApk());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success('App link copied! Open on your mobile phone browser.');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Failed to copy URL');
    }
  };

  const handleRequestPermission = async () => {
    if (inIframe && !isApk) {
      window.open(window.location.href, '_blank');
      toast('Opening in a new tab to enable notifications...', { icon: '↗️' });
      return;
    }

    setIsRequesting(true);
    try {
      const res = await requestPushNotificationPermission();
      setPermission(res.permission);
      if (res.success) {
        toast.success(res.isApk ? 'Android phone notifications enabled!' : res.message);
        if (soundEnabled) playEmergencyAlertSound();
        if (vibrationEnabled) triggerDeviceVibration();
      } else {
        toast.error(res.message, { duration: 5000 });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to request permission.');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      if (soundEnabled) {
        playEmergencyAlertSound();
      }
      if (vibrationEnabled) {
        triggerDeviceVibration();
      }
      
      const sent = await testMobilePushNotification();
      if (sent) {
        toast.success(isApk ? 'Alert delivered to Android notification drawer!' : 'Alert pushed to your device! Check your notification bar.', {
          icon: '📲',
          duration: 4500
        });
      } else {
        toast('Emergency test chime & vibration played!', {
          icon: '🚨',
          duration: 4500
        });
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to trigger test notification');
    } finally {
      setIsTesting(false);
    }
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('dvn_alert_sound', String(next));
    if (next) playEmergencyAlertSound();
  };

  const toggleVibration = () => {
    const next = !vibrationEnabled;
    setVibrationEnabled(next);
    localStorage.setItem('dvn_alert_vibrate', String(next));
    if (next) triggerDeviceVibration();
  };

  const isIosDevice = isIOS();
  const isPwa = isStandalonePWA();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Mobile Device Alerts</h3>
              <p className="text-xs text-red-100">Push notifications & sirens for urgent disaster tasks</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* APK Native Banner indicator */}
          {isApk && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-bold">Android APK Mode Active:</span> Native Android status bar & heads-up alerts.
              </div>
              <span className="text-[11px] font-semibold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">Native OS</span>
            </div>
          )}

          {/* If inside iframe: explain browser restriction & provide direct 1-click open */}
          {inIframe && !isApk && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-950 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-sm text-amber-900">Preview Frame Detected</div>
                  <p className="text-amber-800">
                    Web browsers strictly restrict requesting device push notifications inside embedded preview frames. Open the app directly in a new window or your phone browser to enable native alerts.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open App in New Tab
                </a>
                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto py-2 px-3 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}
                </button>
              </div>
            </div>
          )}

          {/* Permission Status Box */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            permission === 'granted' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : permission === 'denied'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-neutral-50 border-neutral-200 text-neutral-800'
          }`}>
            {permission === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {permission === 'denied' && <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {permission === 'default' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            {permission === 'unsupported' && <AlertTriangle className="w-5 h-5 text-neutral-500 shrink-0 mt-0.5" />}
            
            <div className="text-sm">
              <div className="font-bold flex items-center gap-1.5">
                {permission === 'granted' && (isApk ? 'Android Native Alerts Active' : 'Push Notifications Active')}
                {permission === 'denied' && (isApk ? 'Android Notification Permission Denied' : 'Notifications Blocked by Browser')}
                {permission === 'default' && (isApk ? 'Android Notification Permission Needed' : 'Device Permissions Not Yet Granted')}
                {permission === 'unsupported' && (isApk ? 'Android Local Notifications Ready' : 'Browser Support Note')}
              </div>
              <p className="text-xs mt-1 text-neutral-600">
                {permission === 'granted' && (isApk 
                  ? 'Your Android device will receive status bar notifications, sirens, and vibrations when new emergency tasks arrive.'
                  : 'Your device will receive instant push notifications, audible sirens, and vibrations when new emergency tasks arrive.')}
                {permission === 'denied' && (isApk
                  ? 'Notifications are disabled for this app. Go to Android Settings > Apps > Disaster Volunteer Network > Notifications and switch them to "Allow".'
                  : 'Push notifications are currently blocked in your browser settings. To allow them: tap the lock or tune icon in your address bar and set Notifications to "Allow", then reload.')}
                {permission === 'default' && (isApk
                  ? 'Tap the button below to allow Android to display emergency notifications on your status bar and lock screen.'
                  : 'Click the button below to grant permission. Your browser will show a prompt to allow notifications.')}
                {permission === 'unsupported' && (isApk
                  ? 'Android notification channels are initialized and ready.'
                  : (isIosDevice 
                    ? 'On iOS Safari, Apple requires adding the app to your Home Screen to receive Web Push.'
                    : 'Your browser environment does not support Web Push notifications.'))}
              </p>
            </div>
          </div>

          {/* Action to Enable if not granted */}
          {permission !== 'granted' && (
            inIframe && !isApk ? (
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open App in New Tab to Enable Alerts
              </a>
            ) : (
              <button
                onClick={handleRequestPermission}
                disabled={isRequesting}
                className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 text-sm disabled:opacity-75 cursor-pointer"
              >
                <Smartphone className="w-5 h-5" />
                {isRequesting ? 'Requesting Android Permission...' : (isApk ? 'Enable Android Device Notifications' : 'Enable Mobile Push Notifications')}
              </button>
            )
          )}

          {/* Settings / Controls */}
          <div className="space-y-2.5 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">Alert Preferences</h4>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-red-600" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Emergency Siren Chime</div>
                  <div className="text-xs text-neutral-500">Audible tone when new tasks arrive</div>
                </div>
              </div>
              <button
                onClick={toggleSound}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  soundEnabled ? 'bg-red-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 border border-neutral-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-neutral-200 flex items-center justify-center text-neutral-700">
                  <Vibrate className={`w-4 h-4 ${vibrationEnabled ? 'text-red-600' : 'text-neutral-400'}`} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-800">Mobile Vibration</div>
                  <div className="text-xs text-neutral-500">Haptic vibration pattern on incoming emergencies</div>
                </div>
              </div>
              <button
                onClick={toggleVibration}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  vibrationEnabled ? 'bg-red-600 justify-end' : 'bg-neutral-300 justify-start'
                }`}
              >
                <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
              </button>
            </div>
          </div>

          {/* Test Push Button */}
          <div className="pt-1">
            <button
              onClick={handleTestNotification}
              disabled={isTesting}
              className="w-full py-2.5 px-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold rounded-xl text-sm transition-colors border border-neutral-300 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-red-600" />
              {isTesting ? 'Playing & Sending Alert...' : 'Send Test Alert (Sound & Vibration)'}
            </button>
          </div>

          {/* Mobile OS Installation Hint */}
          <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 space-y-2">
            <div className="font-bold text-neutral-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-red-600" />
              How to setup on Mobile:
            </div>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong className="text-neutral-800">Android APK (Installed App):</strong> Tap "Enable Android Device Notifications" above to allow system notifications. In Android Phone Settings &gt; Apps &gt; Disaster Volunteer Network, ensure notifications and alarms are permitted and battery optimization is set to "Unrestricted" so alerts fire even when your phone is sleeping.
              </li>
              <li>
                <strong className="text-neutral-800">Android Web Browser (Chrome / Edge / Firefox):</strong> Open the link directly on your phone and tap <em>"Allow"</em> when prompted for notifications. Alerts will appear in your top notification tray.
              </li>
              <li>
                <strong className="text-neutral-800">iPhone / iPad (iOS 16.4+):</strong> In Safari, tap the <span className="font-semibold text-neutral-800">Share icon</span> (box with arrow pointing up) &rarr; select <span className="font-semibold text-neutral-800">"Add to Home Screen"</span>. Launch the app from your Home Screen to activate notifications.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex items-center justify-between shrink-0">
          <button
            onClick={handleCopyLink}
            className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? 'Link Copied' : 'Copy Mobile Link'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-800 hover:bg-neutral-900 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
