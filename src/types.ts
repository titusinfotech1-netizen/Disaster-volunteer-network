export type Role = 'requester' | 'volunteer' | 'service_provider' | 'admin' | 'organization';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  role: Role;
  photoUrl?: string;
  language?: string;
  createdAt: number;
}

export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RequestStatus = 'submitted' | 'verified' | 'assigned' | 'in_progress' | 'completed';

export interface Request {
  id: string;
  requesterId: string;
  type: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  peopleAffected: number;
  children: number;
  elderly: number;
  disabled: number;
  medicalEmergency: boolean;
  urgency: Urgency;
  priorityScore: number;
  status: RequestStatus;
  createdAt: number;
  assignedVolunteerId?: string;
  requesterName?: string;
  requesterPhone?: string;
  volunteerName?: string;
  volunteerPhone?: string;
}

export interface VolunteerProfile {
  id: string; // same as user ID
  skills: string[];
  availability: string;
  rating: number;
  hours: number;
  completedTasks: number;
  verified: boolean;
}

export interface Shelter {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  capacity: number;
  occupied: number;
  contactInfo: string;
}
