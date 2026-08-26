import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Request } from '../types';
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { ArrowLeft, Navigation, MapPin } from 'lucide-react';

const API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

function MapUpdater({ center, zoom }: { center: { lat: number, lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.setCenter(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);
  return null;
}

export default function TaskTracker() {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [volunteerLocation, setVolunteerLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'requests', id), (docSnap) => {
      if (docSnap.exists()) {
        setTask(docSnap.data() as Request);
      } else {
        setError('Task not found');
      }
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError('Error loading task');
      setLoading(false);
    });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setVolunteerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (err) => {
        console.error('Error watching position', err);
        setError('Could not get your location');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  if (loading) return <div className="p-8 text-center">Loading tracker...</div>;
  if (error || !task) return <div className="p-8 text-center text-red-600">{error || 'Task not found'}</div>;
  if (!API_KEY) return <div className="p-8 text-center text-amber-600">Please set VITE_GOOGLE_MAPS_API_KEY to use the live tracker.</div>;

  const targetLocation = task.location && task.location.lat ? {
    lat: task.location.lat,
    lng: task.location.lng
  } : { lat: 0, lng: 0 };

  const center = volunteerLocation || targetLocation;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/volunteer-dashboard')}
        className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      <div className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Live GPS Tracker</h1>
          <p className="text-neutral-500">Tracking route to: <span className="font-bold text-neutral-700">{task.type}</span></p>
        </div>
        <div className="flex items-center gap-4 text-sm bg-neutral-50 p-3 rounded-xl border border-neutral-100">
          <div className="flex items-center gap-2 text-emerald-700 font-medium">
            <Navigation className="w-4 h-4" />
            Your Location
          </div>
          <div className="w-px h-6 bg-neutral-200"></div>
          <div className="flex items-center gap-2 text-red-600 font-medium">
            <MapPin className="w-4 h-4" />
            Emergency Target
          </div>
        </div>
      </div>

      <div className="h-[60vh] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-sm relative">
        <APIProvider apiKey={API_KEY}>
          <Map
            mapId={'DEMO_MAP_ID'}
            defaultCenter={center}
            defaultZoom={volunteerLocation ? 15 : 12}
            gestureHandling={'greedy'}
            disableDefaultUI={false}
            style={{ width: '100%', height: '100%' }}
            // internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
          >
            <MapUpdater center={center} zoom={volunteerLocation ? 14 : 12} />
            
            {volunteerLocation && (
              <AdvancedMarker position={volunteerLocation} zIndex={20}>
                <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-emerald-600/30">
                  <Navigation className="w-3 h-3 fill-current" />
                </div>
              </AdvancedMarker>
            )}

            {targetLocation.lat !== 0 && (
              <AdvancedMarker position={targetLocation} zIndex={10}>
                <div className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg shadow-red-600/30">
                  <MapPin className="w-4 h-4 fill-current" />
                </div>
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}
