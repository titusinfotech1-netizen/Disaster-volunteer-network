import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartHandshake, Check, ShieldAlert, Award, AlertTriangle } from 'lucide-react';

const SKILLS_LIST = [
  { id: 'first_aid', name: 'First Aid & Medical Support', description: 'CPR, basic wound care, or medical professional experience' },
  { id: 'search_rescue', name: 'Search & Rescue', description: 'Debris clearing, physical navigation, tracking' },
  { id: 'logistics', name: 'Logistics & Distribution', description: 'Sorting supplies, managing inventory, transport' },
  { id: 'shelter', name: 'Shelter & Care', description: 'Assisting at shelter centers, elderly/children support' },
  { id: 'communication', name: 'Disaster Communication', description: 'Ham radio, translator, call center routing' },
];

export default function VolunteerOnboarding() {
  const { userProfile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [name, setName] = useState(userProfile?.name || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSkill = (skillId: string) => {
    if (selectedSkills.includes(skillId)) {
      setSelectedSkills(selectedSkills.filter(id => id !== skillId));
    } else {
      setSelectedSkills([...selectedSkills, skillId]);
    }
  };

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please enter your name');
    if (!phone.trim()) return alert('Please enter your mobile number');

    setIsSubmitting(true);
    try {
      updateProfile({
        name,
        phone,
        role: 'volunteer'
      });
      // Small timeout to guarantee local storage write before redirecting
      setTimeout(() => {
        navigate('/volunteer-dashboard');
      }, 300);
    } catch (error) {
      console.error('Failed to onboard as volunteer', error);
      alert('Failed to register. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-4">
      <div className="text-center space-y-3">
        <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-100">
          <HeartHandshake className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Become a Disaster Volunteer</h1>
        <p className="text-neutral-500 max-w-md mx-auto text-sm">
          Join the community first-responders. Select your capabilities to receive relevant active relief tasks.
        </p>
      </div>

      <form onSubmit={handleOnboard} className="bg-white rounded-2xl border border-neutral-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-800">Your Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-800">Mobile Phone Number (Required for coordinate relief)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +1 555-0199"
              className="mt-1 block w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            Select Your Relief Capabilities
          </label>
          <div className="space-y-2">
            {SKILLS_LIST.map(skill => {
              const isSelected = selectedSkills.includes(skill.id);
              return (
                <div
                  key={skill.id}
                  onClick={() => toggleSkill(skill.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/50'
                      : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 bg-white'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 leading-tight">{skill.name}</p>
                    <p className="text-xs text-neutral-500 mt-0.5 leading-snug">{skill.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-bold">Important Relief Safety Guideline</p>
            <p>Always respect official response protocols, follow command center instructions, and never venture into dangerous areas alone.</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-emerald-400 transition-colors shadow-sm text-sm"
        >
          {isSubmitting ? 'Registering...' : 'Register as Volunteer'}
        </button>
      </form>
    </div>
  );
}
