import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Request } from '../types';
import { MapPin, Users, AlertTriangle, CheckCircle, Navigation, ShieldAlert, FileText } from 'lucide-react';

export default function VolunteerDashboard() {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<(Request & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;

    if (userProfile.role !== 'volunteer') {
      navigate('/volunteer-onboarding');
      return;
    }

    setLoading(true);

    const qOpen = query(collection(db, 'requests'), where('status', 'in', ['submitted', 'verified']));
    const qAssigned = query(collection(db, 'requests'), where('assignedVolunteerId', '==', userProfile.id));

    let openTasks: (Request & { id: string })[] = [];
    let assignedTasks: (Request & { id: string })[] = [];

    const updateTasks = () => {
      // De-duplicate tasks by ID
      const merged = [...openTasks, ...assignedTasks];
      const uniqueMap = new Map<string, Request & { id: string }>();
      merged.forEach(task => {
        uniqueMap.set(task.id, task);
      });
      const allTasks = Array.from(uniqueMap.values()).sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
      setTasks(allTasks);
      setLoading(false);
    };

    const unsubOpen = onSnapshot(qOpen, (snapshot) => {
      openTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request & { id: string }));
      updateTasks();
    }, (error) => {
      console.error("Error fetching open tasks in real-time:", error);
      setLoading(false);
    });

    const unsubAssigned = onSnapshot(qAssigned, (snapshot) => {
      assignedTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Request & { id: string }));
      updateTasks();
    }, (error) => {
      console.error("Error fetching assigned tasks in real-time:", error);
      setLoading(false);
    });

    return () => {
      unsubOpen();
      unsubAssigned();
    };
  }, [userProfile]);

  const handleAcceptTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'requests', taskId), {
        status: 'assigned',
        assignedVolunteerId: userProfile?.id,
        volunteerName: userProfile?.name,
        volunteerPhone: userProfile?.phone
      });
    } catch (error) {
      console.error("Failed to accept task", error);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'requests', taskId), {
        status: newStatus
      });
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-neutral-100 text-neutral-800';
    }
  };

  if (loading) return <div className="text-center py-12">Loading tasks...</div>;

  const assignedTasks = tasks.filter(t => t.assignedVolunteerId === userProfile?.id && t.status !== 'completed');
  const availableTasks = tasks.filter(t => !t.assignedVolunteerId);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Volunteer Dashboard</h1>
          <p className="text-neutral-500">Find nearby requests and manage your active tasks.</p>
        </div>
      </div>

      {assignedTasks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
            Your Active Tasks
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {assignedTasks.map(task => (
              <div key={task.id} className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-500 text-white px-3 py-1 text-xs font-bold rounded-bl-lg">
                  ACTIVE
                </div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-emerald-900">{task.type}</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded-md border ${getUrgencyColor(task.urgency)}`}>
                    {task.urgency}
                  </span>
                </div>
                
                <p className="text-emerald-800 text-sm mb-4 flex-grow">{task.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-emerald-700 text-sm gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate">{task.location?.address || 'GPS Location'}</span>
                  </div>
                  <div className="flex items-center text-emerald-700 text-sm gap-2">
                    <Users className="w-4 h-4 shrink-0" />
                    <span>{task.peopleAffected} people affected</span>
                  </div>
                  
                  <div className="mt-4 p-3 bg-white rounded-lg border border-emerald-100 flex flex-col gap-1">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">Requester Contact</h4>
                    <span className="text-sm font-bold text-neutral-900">{task.requesterName || 'Unknown'}</span>
                    <span className="text-sm text-neutral-600">{task.requesterPhone || 'No phone provided'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto">
                  {task.status === 'assigned' && (
                    <button onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="col-span-2 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 text-sm">
                      Start Task
                    </button>
                  )}
                  {task.status === 'in_progress' && (
                    <>
                      <button onClick={() => navigate(`/track/${task.id}`)} className="py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 text-sm">
                        Live GPS Track
                      </button>
                      <button onClick={() => handleUpdateStatus(task.id, 'completed')} className="py-2 bg-emerald-800 text-white rounded-lg font-medium hover:bg-emerald-900 text-sm">
                        Mark Completed
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-neutral-700" />
          Available Emergency Requests
        </h2>
        
        {availableTasks.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-2xl border border-neutral-200">
            <ShieldAlert className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900">No active requests</h3>
            <p className="text-neutral-500">There are currently no requests matching your skills in this area.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableTasks.map(task => (
              <div key={task.id} className="bg-white rounded-2xl border border-neutral-200 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
                
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-neutral-900">{task.type}</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded-md border ${getUrgencyColor(task.urgency)}`}>
                    {task.urgency}
                  </span>
                </div>
                
                <p className="text-neutral-600 text-sm mb-4 line-clamp-3 flex-grow">{task.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-neutral-500 text-sm gap-2">
                    <MapPin className="w-4 h-4 shrink-0 text-blue-500" />
                    <span className="truncate">{task.location?.address || 'GPS Location'}</span>
                  </div>
                  <div className="flex items-center text-neutral-500 text-sm gap-2">
                    <Users className="w-4 h-4 shrink-0 text-amber-500" />
                    <span>{task.peopleAffected} people affected</span>
                  </div>
                  {task.medicalEmergency && (
                    <div className="flex items-center text-red-600 font-medium text-sm gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Medical Emergency</span>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-neutral-100 flex justify-between items-center">
                  <div className="text-xs text-neutral-400">
                    Priority: <span className="font-bold text-neutral-700">{task.priorityScore}/100</span>
                  </div>
                  <button 
                    onClick={() => handleAcceptTask(task.id)}
                    className="px-4 py-2 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors text-sm"
                  >
                    Accept Task
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
