import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Request } from '../types';
import { FileText, MapPin, Users, Clock, ArrowRight } from 'lucide-react';

export default function MyRequests() {
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState<(Request & { id: string, displayId?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!userProfile) return;
      try {
        const q = query(
          collection(db, 'requests'),
          where('requesterId', '==', userProfile.id)
        );
        const snapshot = await getDocs(q);
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as (Request & { id: string, displayId?: string })));
        // sort client side since we don't have a composite index for requesterId + createdAt
        reqs.sort((a, b) => b.createdAt - a.createdAt);
        setRequests(reqs);
      } catch (error) {
        console.error("Error fetching requests", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [userProfile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-100 text-blue-700';
      case 'verified': return 'bg-indigo-100 text-indigo-700';
      case 'assigned': return 'bg-amber-100 text-amber-700';
      case 'in_progress': return 'bg-orange-100 text-orange-700';
      case 'completed': return 'bg-green-100 text-green-700';
      default: return 'bg-neutral-100 text-neutral-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'submitted': return 'Submitted';
      case 'verified': return 'Verified';
      case 'assigned': return 'Volunteer Assigned';
      case 'in_progress': return 'Assistance In Progress';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const getTimelineStage = (status: string) => {
    const stages = ['submitted', 'verified', 'assigned', 'in_progress', 'completed'];
    return stages.indexOf(status);
  };

  if (loading) return <div className="text-center py-12">Loading requests...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <FileText className="w-8 h-8 text-neutral-900" />
        <h1 className="text-3xl font-bold text-neutral-900">My Requests</h1>
      </div>

      {requests.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-neutral-200">
          <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900">No active requests</h3>
          <p className="text-neutral-500">You haven't requested any assistance yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {requests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col md:flex-row gap-6">
              
              <div className="flex-1 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-mono text-neutral-500">{req.displayId || req.id}</span>
                    <h3 className="text-xl font-bold text-neutral-900 mt-1">{req.type}</h3>
                  </div>
                  <span className={`px-3 py-1 text-sm font-bold rounded-full ${getStatusColor(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                </div>
                
                <p className="text-neutral-600">{req.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-neutral-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-neutral-400" />
                    <span className="truncate">{req.location.address || 'GPS Location'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-neutral-400" />
                    <span>{req.peopleAffected} people</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-neutral-400" />
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {req.volunteerName && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl flex flex-col gap-1">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Assigned Volunteer</h4>
                    <span className="text-sm font-bold text-neutral-900">{req.volunteerName}</span>
                    <span className="text-sm text-neutral-600">{req.volunteerPhone}</span>
                  </div>
                )}
              </div>

              <div className="w-full md:w-48 shrink-0 bg-neutral-50 rounded-xl p-4 border border-neutral-100 flex flex-col justify-center">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-4 text-center">Timeline</h4>
                
                <div className="space-y-4">
                  {['Submitted', 'Assigned', 'In Progress', 'Completed'].map((stage, idx) => {
                    const currentStageIdx = getTimelineStage(req.status);
                    const isCompleted = idx <= (currentStageIdx === 4 ? 3 : currentStageIdx === 3 ? 2 : currentStageIdx >= 2 ? 1 : 0);
                    const isActive = isCompleted && idx === (currentStageIdx === 4 ? 3 : currentStageIdx === 3 ? 2 : currentStageIdx >= 2 ? 1 : 0);

                    return (
                      <div key={stage} className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isCompleted ? 'bg-red-500 border-red-500' : 'border-neutral-300'
                        } ${isActive ? 'ring-4 ring-red-100' : ''}`} />
                        <span className={`text-sm ${isCompleted ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
