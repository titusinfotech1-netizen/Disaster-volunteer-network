import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Request } from '../types';

// Fix for default marker icon in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons based on priority
const createCustomIcon = (color: string) => {
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const icons = {
  CRITICAL: createCustomIcon('#dc2626'), // red-600
  HIGH: createCustomIcon('#f97316'), // orange-500
  MEDIUM: createCustomIcon('#f59e0b'), // amber-500
  LOW: createCustomIcon('#3b82f6'), // blue-500
};

export default function LiveMap() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  // Default center (can be updated to user's location)
  const defaultCenter: [number, number] = [37.7749, -122.4194]; 

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const q = query(collection(db, 'requests'), where('status', 'in', ['submitted', 'verified', 'assigned', 'in_progress']));
        const snapshot = await getDocs(q);
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request));
        // Filter out those without valid coordinates
        setRequests(reqs.filter(r => r.location && r.location.lat && r.location.lng));
      } catch (error) {
        console.error("Error fetching map data", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLocations();
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] w-full rounded-2xl overflow-hidden border border-neutral-200 shadow-sm relative">
      <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-md border border-neutral-200">
        <h3 className="font-bold text-sm mb-2">Map Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-600"></div> Critical</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500"></div> High Priority</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Medium Priority</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Low Priority</div>
        </div>
      </div>
      
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-neutral-50">
          <p>Loading map data...</p>
        </div>
      ) : (
        <MapContainer 
          center={requests.length > 0 ? [requests[0].location.lat, requests[0].location.lng] : defaultCenter} 
          zoom={11} 
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {requests.map(req => (
            <Marker 
              key={req.id} 
              position={[req.location.lat, req.location.lng]}
              icon={icons[req.urgency] || icons.LOW}
            >
              <Popup>
                <div className="p-1">
                  <h4 className="font-bold text-sm mb-1">{req.type}</h4>
                  <p className="text-xs text-neutral-600 mb-2">{req.description}</p>
                  <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-neutral-200">
                    <span className="font-bold">{req.urgency}</span>
                    <span className="text-neutral-500">{req.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
