/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import RequestHelp from './pages/RequestHelp';
import VolunteerDashboard from './pages/VolunteerDashboard';
import VolunteerOnboarding from './pages/VolunteerOnboarding';
import LiveMap from './pages/LiveMap';
import MyRequests from './pages/MyRequests';

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route path="/" element={<Home />} />
            <Route path="/request-help" element={<RequestHelp />} />
            <Route path="/volunteer-dashboard" element={<VolunteerDashboard />} />
            <Route path="/volunteer-onboarding" element={<VolunteerOnboarding />} />
            <Route path="/map" element={<LiveMap />} />
            <Route path="/requests" element={<MyRequests />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
