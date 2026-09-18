import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast, { Toaster } from 'react-hot-toast';
import { Request } from '../types';
import { Menu, X, Home, Map, ClipboardList, Settings, User, LogOut, HeartHandshake, FileText, Bell, Smartphone, Sparkles, ExternalLink } from 'lucide-react';
import { 
  getNotificationPermissionStatus, 
  requestPushNotificationPermission, 
  triggerMobilePushNotification,
  isInIframe,
  playEmergencyAlertSound,
  triggerDeviceVibration
} from '../lib/pushNotifications';
import NotificationSettingsModal from './NotificationSettingsModal';

export default function Layout() {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('default');
  const [showPermissionBanner, setShowPermissionBanner] = useState(true);
  const [isIframeDetected, setIsIframeDetected] = useState(false);
  const [isEnabling, setIsEnabling] = useState(false);
  const mountedAtRef = useRef(Date.now());
  const hasLoadedInitialRef = useRef(false);

  useEffect(() => {
    setIsIframeDetected(isInIframe());
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  // Listen for open/submitted emergency requests
  useEffect(() => {
    const q = query(
      collection(db, 'requests'), 
      where('status', '==', 'submitted')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      if (!hasLoadedInitialRef.current) {
        hasLoadedInitialRef.current = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const req = { id: change.doc.id, ...change.doc.data() } as Request & { id: string };
          if (req.createdAt && req.createdAt >= mountedAtRef.current) {
            setUnreadCount(prev => prev + 1);

            // Push notification directly to mobile device tray / lock screen
            triggerMobilePushNotification({
              title: `🚨 Emergency Alert: ${req.type}`,
              body: `${req.peopleAffected || 1} people affected at ${req.location?.address || 'GPS coordinates'}. Tap to view task.`,
              url: '/volunteer-dashboard',
              tag: `emergency-task-${req.id}`,
              playSound: localStorage.getItem('dvn_alert_sound') !== 'false',
              vibrate: localStorage.getItem('dvn_alert_vibrate') !== 'false',
              data: { requestId: req.id, type: req.type }
            });

            // Foreground toast banner
            toast(`New Emergency Request: ${req.type} in your area!`, {
              icon: '🚨',
              duration: 6000,
              style: {
                borderRadius: '12px',
                background: '#fff',
                color: '#171717',
                fontWeight: 'bold',
                border: '1px solid #fee2e2'
              },
            });
          }
        }
      });
    });

    return () => unsub();
  }, []);

  // Listen for requester's task updates (when volunteer accepts or assists)
  useEffect(() => {
    if (!userProfile?.id || userProfile.role !== 'requester') return;
    const qRequester = query(
      collection(db, 'requests'),
      where('requesterId', '==', userProfile.id)
    );

    let initialLoaded = false;
    const unsubRequester = onSnapshot(qRequester, (snapshot) => {
      if (!initialLoaded) {
        initialLoaded = true;
        return;
      }

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const req = change.doc.data() as Request;
          if (req.status === 'assigned') {
            triggerMobilePushNotification({
              title: '🤝 Volunteer Assigned to Your Request!',
              body: `${req.volunteerName || 'A volunteer'} has accepted your emergency request for ${req.type}. Tap to contact them.`,
              url: '/requests',
              tag: `status-assigned-${change.doc.id}`,
              playSound: true,
              vibrate: true,
            });
            toast.success(`Volunteer ${req.volunteerName || ''} assigned to your request!`, {
              duration: 6000
            });
          } else if (req.status === 'in_progress') {
            triggerMobilePushNotification({
              title: '🏃 Assistance In Progress!',
              body: `A responder is actively assisting your ${req.type} emergency request.`,
              url: '/requests',
              tag: `status-prog-${change.doc.id}`,
              playSound: true,
              vibrate: true,
            });
          } else if (req.status === 'completed') {
            triggerMobilePushNotification({
              title: '✅ Request Completed',
              body: `Your request for ${req.type} has been marked as resolved.`,
              url: '/requests',
              tag: `status-comp-${change.doc.id}`,
              playSound: false,
              vibrate: true,
            });
          }
        }
      });
    });

    return () => unsubRequester();
  }, [userProfile?.id, userProfile?.role]);

  const handleEnablePushBanner = async () => {
    if (isInIframe()) {
      setIsNotifModalOpen(true);
      toast('Open in a new tab to grant device push permissions', {
        icon: '📲',
        duration: 5000,
      });
      return;
    }

    setIsEnabling(true);
    try {
      const res = await requestPushNotificationPermission();
      setPermissionStatus(res.permission);
      if (res.success) {
        setShowPermissionBanner(false);
        toast.success('Mobile push alerts activated!', { icon: '🔔' });
        playEmergencyAlertSound();
        triggerDeviceVibration();
      } else {
        toast.error(res.message, { duration: 5000 });
        setIsNotifModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to enable push alerts:', err);
      toast.error('Could not enable notifications. Opening settings...');
      setIsNotifModalOpen(true);
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Map', path: '/map', icon: Map },
    ...(userProfile?.role === 'volunteer' ? [
      { name: 'Tasks', path: '/volunteer-dashboard', icon: ClipboardList }
    ] : []),
    ...(userProfile?.role === 'requester' ? [
      { name: 'My Requests', path: '/requests', icon: FileText }
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <nav className="bg-white border-b border-neutral-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-red-600 flex items-center gap-2">
                  <HeartHandshake className="w-6 h-6" />
                  <span className="hidden sm:inline">Disaster Response Network</span>
                  <span className="sm:hidden">DRN</span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                        isActive
                          ? 'border-red-500 text-neutral-900'
                          : 'border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700'
                      }`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
              <button 
                onClick={() => {
                  setUnreadCount(0);
                  setIsNotifModalOpen(true);
                }}
                className="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-xl relative transition-colors"
                title="Mobile Push Notifications & Alerts"
                aria-label="Mobile Push Notifications"
              >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-600 ring-2 ring-white text-[10px] font-bold text-white animate-pulse">
                    {unreadCount}
                  </span>
                ) : permissionStatus === 'granted' ? (
                  <span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" title="Push Alerts Active"></span>
                ) : null}
              </button>
              
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-neutral-900">{userProfile?.name}</span>
                    <span className="text-xs text-neutral-500 capitalize">{userProfile?.role}</span>
                  </div>
                  <button 
                    onClick={handleSignOut}
                    className="p-2 text-neutral-400 hover:text-neutral-500"
                    title="Sign Out"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex items-center gap-1 sm:hidden">
              <button 
                onClick={() => {
                  setUnreadCount(0);
                  setIsNotifModalOpen(true);
                }}
                className="p-2 text-neutral-500 hover:text-neutral-700 relative"
                title="Mobile Push Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 ? (
                  <span className="absolute top-1 right-1 flex items-center justify-center h-4 w-4 rounded-full bg-red-600 ring-2 ring-white text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : permissionStatus === 'granted' ? (
                  <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                ) : null}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100"
              >
                {isMobileMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Permission Banner for Mobile Push Notifications */}
        {showPermissionBanner && permissionStatus !== 'granted' && (
          <div className="bg-gradient-to-r from-red-600 via-red-700 to-rose-700 text-white px-4 py-2.5 shadow-sm flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="p-1.5 bg-white/20 rounded-lg shrink-0">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="truncate">
                <span className="font-bold">Mobile Device Alerts:</span> Get instant push notifications & sirens on your phone when tasks are created.
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {isIframeDetected ? (
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-xs text-xs whitespace-nowrap cursor-pointer"
                >
                  <span>Open in New Tab to Enable</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  onClick={handleEnablePushBanner}
                  disabled={isEnabling}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-red-700 font-bold rounded-lg hover:bg-red-50 transition-colors shadow-xs text-xs whitespace-nowrap cursor-pointer disabled:opacity-75"
                >
                  {isEnabling ? 'Enabling...' : 'Enable on Phone'}
                </button>
              )}
              <button
                onClick={() => setIsNotifModalOpen(true)}
                className="px-2 py-1 bg-red-800/60 hover:bg-red-800 text-white font-medium rounded-lg transition-colors text-xs whitespace-nowrap"
                title="Settings & Guide"
              >
                Settings
              </button>
              <button
                onClick={() => setShowPermissionBanner(false)}
                className="p-1 hover:bg-white/10 rounded-md text-red-200 hover:text-white transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden border-t border-neutral-200">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                      isActive
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon className="w-5 h-5 mr-3" />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
              
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsNotifModalOpen(true);
                }}
                className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
              >
                <div className="flex items-center">
                  <Smartphone className="w-5 h-5 mr-3 text-red-600" />
                  Mobile Push Alerts
                </div>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
                className="w-full text-left block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-800"
              >
                <div className="flex items-center">
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </div>
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>

      <NotificationSettingsModal 
        isOpen={isNotifModalOpen} 
        onClose={() => {
          setIsNotifModalOpen(false);
          setPermissionStatus(getNotificationPermissionStatus());
        }} 
      />

      <Toaster position="top-right" />
    </div>
  );
}
