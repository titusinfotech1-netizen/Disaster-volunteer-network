import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, Volume2, VolumeX, Vibrate, CheckCircle2, AlertTriangle, X, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestPushNotificationPermission, 
  testMobilePushNotification,
  playEmergencyAlertSound,
  triggerDeviceVibration
} from '../lib/pushNotifications';
import toast from 'react-hot-toast';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dvn_alert_sound') !== 'false';
  });
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('dvn_alert_vibrate') !== 'false';
  });
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermissionStatus());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPermission = async () => {
    const res = await requestPushNotificationPermission();
    setPermission(res);
    if (res === 'granted') {
      toast.success('Mobile push notifications enabled!');
    } else if (res === 'denied') {
      toast.error('Notifications blocked by browser settings.');
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
        toast.success('Alert pushed to your device! Check your notification bar.', {
          icon: '📲',
          duration: 4000
        });
      } else {
        toast('Notification test sent (allow permissions to see device tray alert)', {
          icon: 'ℹ️'
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-xs">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Mobile Push Notifications</h3>
              <p className="text-xs text-red-100">Direct phone alerts for urgent disaster tasks</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Permission Status Box */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            permission === 'granted' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : permission === 'denied'
              ? 'bg-red-50 border-red-200 text-red-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            {permission === 'granted' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {permission === 'denied' && <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
            {permission === 'default' && <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />}
            
            <div className="text-sm">
              <div className="font-bold flex items-center gap-1.5">
                {permission === 'granted' && 'Push Notifications Active'}
                {permission === 'denied' && 'Notifications Blocked'}
                {permission === 'default' && 'Device Permissions Needed'}
                {permission === 'unsupported' && 'Not Supported in this Browser'}
              </div>
              <p className="text-xs mt-1 text-neutral-600">
                {permission === 'granted' && 'Your phone will receive high-priority push alerts, sound, and vibrations when new emergency tasks are posted.'}
                {permission === 'denied' && 'Push notifications are currently blocked in your browser. Click the site settings / lock icon in your browser address bar and switch Notifications to "Allow".'}
                {permission === 'default' && 'Enable permission so your mobile device gets real-time alerts even when the browser is closed or phone is locked.'}
                {permission === 'unsupported' && 'Your current browser does not support Web Push notifications. Try Chrome, Edge, or Firefox on mobile.'}
              </p>
            </div>
          </div>

          {/* Action to Enable if not granted */}
          {permission !== 'granted' && permission !== 'unsupported' && (
            <button
              onClick={handleRequestPermission}
              className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Smartphone className="w-5 h-5" />
              Enable Mobile Push Notifications
            </button>
          )}

          {/* Settings / Controls */}
          <div className="space-y-3 pt-2">
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
                  <div className="text-xs text-neutral-500">Vibrate phone on incoming emergencies</div>
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
              {isTesting ? 'Sending Alert...' : 'Send Test Mobile Push Alert'}
            </button>
          </div>

          {/* Mobile OS Installation Hint */}
          <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs text-neutral-600 space-y-1.5">
            <div className="font-bold text-neutral-800 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-red-600" />
              Mobile Tips:
            </div>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-neutral-700">Android:</strong> Notifications show in the top notification tray and lock screen with sound.</li>
              <li><strong className="text-neutral-700">iPhone / iPad (iOS 16.4+):</strong> Tap the <em>Share icon</em> (square with arrow) &rarr; <em>"Add to Home Screen"</em> to get full background push notifications.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-50 border-t border-neutral-200 flex justify-end">
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
