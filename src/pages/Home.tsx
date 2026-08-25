import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartHandshake, AlertTriangle, MapPin, Search, Users, Activity, PhoneCall } from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Request } from '../types';

export default function Home() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [activeAlerts, setActiveAlerts] = useState([
    { id: '1', title: 'Flash Flood Warning - Central District', time: '10 mins ago', level: 'CRITICAL' },
    { id: '2', title: 'Power Outage - North Suburbs', time: '1 hour ago', level: 'HIGH' }
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Welcome Banner */}
      <div className="text-center space-y-2 mt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
          Disaster Response & Recovery
        </h1>
        <p className="text-neutral-500 text-lg">
          Connecting people in need with those who can help.
        </p>
      </div>

      {/* Main Action Buttons */}
      <div className="grid sm:grid-cols-2 gap-6 mt-8">
        
        {/* Volunteer Button */}
        <div 
          onClick={() => navigate(userProfile?.role === 'volunteer' ? '/volunteer-dashboard' : '/volunteer-onboarding')}
          className="group cursor-pointer rounded-2xl bg-white border-2 border-emerald-100 hover:border-emerald-500 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center space-y-4"
        >
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <HeartHandshake className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">I WANT TO HELP</h2>
            <p className="mt-2 text-neutral-500">Join the response and help people in need.</p>
          </div>
          <button className="mt-4 w-full py-3 px-6 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors">
            Become a Volunteer
          </button>
        </div>

        {/* Request Button */}
        <div 
          onClick={() => navigate('/request-help')}
          className="group cursor-pointer rounded-2xl bg-white border-2 border-red-100 hover:border-red-500 hover:shadow-lg transition-all p-8 flex flex-col items-center text-center space-y-4"
        >
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-10 h-10 text-red-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900">I NEED HELP</h2>
            <p className="mt-2 text-neutral-500">Request assistance for yourself or someone else.</p>
          </div>
          <button className="mt-4 w-full py-3 px-6 rounded-full bg-red-600 text-white font-medium hover:bg-red-700 transition-colors">
            Request Help
          </button>
        </div>

      </div>

      {/* Secondary Quick Links Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-8">
        <Link to="/map" className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-neutral-200 hover:border-blue-300 hover:shadow-sm transition-all text-center group">
          <MapPin className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-neutral-700">Live Map</span>
        </Link>
        <Link to="/requests" className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-neutral-200 hover:border-amber-300 hover:shadow-sm transition-all text-center group">
          <Search className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-neutral-700">Active Requests</span>
        </Link>
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-neutral-200 hover:border-rose-300 hover:shadow-sm transition-all text-center group cursor-pointer" onClick={() => alert('Dialing local emergency services...')}>
          <PhoneCall className="w-8 h-8 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium text-neutral-700">Emergency Call</span>
        </div>
      </div>

      {/* Active Disaster Alerts */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-neutral-700" />
          <h3 className="text-lg font-bold text-neutral-900">Active Disaster Alerts</h3>
        </div>
        <div className="space-y-3">
          {activeAlerts.map(alert => (
            <div key={alert.id} className={`flex items-center justify-between p-4 rounded-xl border-l-4 ${alert.level === 'CRITICAL' ? 'border-red-500 bg-red-50' : 'border-amber-500 bg-amber-50'}`}>
              <div className="flex flex-col">
                <span className="font-semibold text-neutral-900">{alert.title}</span>
                <span className="text-sm text-neutral-500">{alert.time}</span>
              </div>
              <span className={`px-2 py-1 text-xs font-bold rounded-md ${alert.level === 'CRITICAL' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                {alert.level}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Disclaimer */}
      <div className="mt-12 p-4 bg-neutral-100 rounded-xl text-center border border-neutral-200">
        <p className="text-sm text-neutral-600 font-medium">
          This platform coordinates community assistance and <strong className="text-neutral-900">does not replace official emergency services</strong>. If you are in immediate life-threatening danger, please contact your local authorities directly.
        </p>
      </div>

    </div>
  );
}
