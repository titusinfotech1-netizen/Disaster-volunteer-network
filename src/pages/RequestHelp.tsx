import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle, MapPin, Camera, Info, Navigation2, CheckCircle2 } from 'lucide-react';
import { Urgency } from '../types';

export default function RequestHelp() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reqId, setReqId] = useState('');

  const [formData, setFormData] = useState({
    type: '',
    description: '',
    peopleAffected: 1,
    children: 0,
    elderly: 0,
    disabled: 0,
    medicalEmergency: false,
    address: '',
    lat: 0,
    lng: 0,
    urgency: 'MEDIUM' as Urgency,
  });

  const helpTypes = [
    '🚑 Medical Help', '🚨 Rescue', '🍚 Food', '💧 Drinking Water',
    '🏠 Shelter', '💊 Medicine', '🚚 Transportation', '👨‍👩‍👧 Family Assistance',
    '⚡ Electricity', '👕 Clothes', '🧹 Cleanup', '📦 Essential Supplies', 'Other'
  ];

  const urgencies: { level: Urgency, label: string, desc: string, color: string }[] = [
    { level: 'CRITICAL', label: 'CRITICAL', desc: 'Immediate danger / life-threatening', color: 'bg-red-100 border-red-500 text-red-900' },
    { level: 'HIGH', label: 'HIGH', desc: 'Urgent assistance required', color: 'bg-orange-100 border-orange-500 text-orange-900' },
    { level: 'MEDIUM', label: 'MEDIUM', desc: 'Important but not immediately life-threatening', color: 'bg-amber-100 border-amber-500 text-amber-900' },
    { level: 'LOW', label: 'LOW', desc: 'General assistance', color: 'bg-blue-100 border-blue-500 text-blue-900' },
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 6));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setFormData({
          ...formData,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Current GPS Location'
        });
      });
    }
  };

  const calculatePriority = () => {
    let score = 50;
    if (formData.urgency === 'CRITICAL') score += 40;
    if (formData.urgency === 'HIGH') score += 20;
    if (formData.medicalEmergency) score += 20;
    if (formData.elderly > 0 || formData.children > 0 || formData.disabled > 0) score += 10;
    return Math.min(score, 100);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const priorityScore = calculatePriority();
      const generatedId = `REQ-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      
      await addDoc(collection(db, 'requests'), {
        displayId: generatedId,
        requesterId: userProfile?.id,
        requesterName: userProfile?.name,
        requesterPhone: userProfile?.phone,
        type: formData.type,
        description: formData.description,
        location: {
          lat: formData.lat,
          lng: formData.lng,
          address: formData.address
        },
        peopleAffected: formData.peopleAffected,
        children: formData.children,
        elderly: formData.elderly,
        disabled: formData.disabled,
        medicalEmergency: formData.medicalEmergency,
        urgency: formData.urgency,
        priorityScore,
        status: 'submitted',
        createdAt: Date.now()
      });

      setReqId(generatedId);
      setSubmitted(true);
    } catch (error) {
      console.error("Failed to submit request", error);
      alert('Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white p-8 rounded-2xl border border-neutral-200 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-neutral-900">Request Submitted Successfully</h2>
        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
          <p className="text-sm text-neutral-500 mb-1">Your Request ID</p>
          <p className="text-2xl font-mono font-bold text-neutral-900">{reqId}</p>
        </div>
        <p className="text-neutral-600">
          Our AI system is analyzing your request. We will notify you as soon as a volunteer or service matches your needs.
        </p>
        <button 
          onClick={() => navigate('/requests')}
          className="w-full py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors"
        >
          Track My Request
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
      
      {/* Header */}
      <div className="bg-red-600 p-6 text-white flex items-center gap-4">
        <AlertTriangle className="w-8 h-8" />
        <div>
          <h1 className="text-2xl font-bold">Request Help</h1>
          <p className="text-red-100 text-sm">Step {step} of 5</p>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        
        {/* Step 1: What do you need? */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-neutral-900">What do you need?</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {helpTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFormData({ ...formData, type })}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    formData.type === type 
                      ? 'border-red-500 bg-red-50 text-red-900' 
                      : 'border-neutral-200 hover:border-red-200 hover:bg-neutral-50'
                  }`}
                >
                  <span className="font-medium text-sm">{type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Describe Situation */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-neutral-900">Describe the situation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Please provide details about what is happening..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Total People</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.peopleAffected}
                    onChange={(e) => setFormData({ ...formData, peopleAffected: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Elderly</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.elderly}
                    onChange={(e) => setFormData({ ...formData, elderly: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Disabled</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.disabled}
                    onChange={(e) => setFormData({ ...formData, disabled: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex items-center mt-4">
                <input
                  id="medicalEmergency"
                  type="checkbox"
                  checked={formData.medicalEmergency}
                  onChange={(e) => setFormData({ ...formData, medicalEmergency: e.target.checked })}
                  className="h-5 w-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <label htmlFor="medicalEmergency" className="ml-2 block text-sm font-bold text-red-700">
                  This involves a medical emergency
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-neutral-900">Where are you?</h2>
            
            <div className="space-y-4">
              <button 
                onClick={getLocation}
                className="w-full flex items-center justify-center gap-2 py-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl hover:bg-blue-100 transition-colors"
              >
                <Navigation2 className="w-5 h-5" />
                <span className="font-medium">Use my GPS location</span>
              </button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-neutral-300"></div>
                <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">or enter manually</span>
                <div className="flex-grow border-t border-neutral-300"></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Address / Landmark</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="E.g. Near Central Station, Main Street"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                />
              </div>

              {formData.lat !== 0 && (
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-green-600 shrink-0" />
                  <span className="text-sm text-neutral-700">Location captured: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Evidence (Mock) */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-neutral-900">Add Evidence (Optional)</h2>
            <p className="text-neutral-500 text-sm">Photos or videos help responders understand the situation better.</p>
            
            <div className="border-2 border-dashed border-neutral-300 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-neutral-50 transition-colors">
              <Camera className="w-12 h-12 text-neutral-400 mb-4" />
              <span className="text-neutral-600 font-medium">Tap to upload photos or videos</span>
              <span className="text-neutral-400 text-sm mt-1">Maximum 3 files</span>
            </div>
          </div>
        )}

        {/* Step 5: Urgency */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <h2 className="text-xl font-bold text-neutral-900">How urgent is this?</h2>
            
            <div className="space-y-3">
              {urgencies.map(u => (
                <div 
                  key={u.level}
                  onClick={() => setFormData({ ...formData, urgency: u.level })}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col ${
                    formData.urgency === u.level ? u.color : 'border-neutral-200 bg-white hover:border-neutral-300'
                  }`}
                >
                  <span className="font-bold text-lg">{u.label}</span>
                  <span className="text-sm opacity-80">{u.desc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-neutral-200 flex justify-between">
          {step > 1 ? (
            <button 
              onClick={handleBack}
              className="px-6 py-2 border border-neutral-300 rounded-full font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Back
            </button>
          ) : <div></div>}

          {step < 5 ? (
            <button 
              onClick={handleNext}
              disabled={step === 1 && !formData.type}
              className="px-8 py-2 bg-neutral-900 text-white rounded-full font-medium hover:bg-neutral-800 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
