import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HeartHandshake } from 'lucide-react';
import { Role } from '../types';

export default function Login() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('requester');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(name || 'Guest User', role, phone);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-red-600">
          <HeartHandshake className="w-16 h-16" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-neutral-900">
          Disaster Volunteer Network
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-600">
          Coordination platform for emergency response
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-neutral-200">
          
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Your Name</label>
              <div className="mt-1">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Mobile Number</label>
              <div className="mt-1">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 234 567 8900"
                  className="appearance-none block w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">How would you like to use the platform?</label>
              <div className="space-y-3">
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="role"
                    value="volunteer"
                    checked={role === 'volunteer'}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-neutral-300"
                  />
                  <span className="ml-3 font-medium">I want to Volunteer</span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="role"
                    value="requester"
                    checked={role === 'requester'}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-neutral-300"
                  />
                  <span className="ml-3 font-medium">I may Need Help</span>
                </label>
                <label className="flex items-center p-3 border rounded-md cursor-pointer hover:bg-neutral-50">
                  <input
                    type="radio"
                    name="role"
                    value="service_provider"
                    checked={role === 'service_provider'}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="h-4 w-4 text-red-600 focus:ring-red-500 border-neutral-300"
                  />
                  <span className="ml-3 font-medium">I'm a Recovery Professional</span>
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Enter Platform
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
