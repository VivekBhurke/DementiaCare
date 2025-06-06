// Update the ScheduleItem interface to include alarm settings
export type UserRole = 'patient' | 'caretaker';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  profileImage?: string;
  connectedPatients?: string[]; // IDs of patients connected to caretaker
  caretakerId?: string; // ID of caretaker connected to patient
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  time: string;
  frequency: string;
  instructions?: string;
  patientId: string;
}

export interface ScheduleItem {
  id: string;
  time: string;
  title: string;
  type: string;
  completed: boolean;
  patientId: string;
  alarms?: {
    enabled: boolean;
    time: string; // Time before event to trigger alarm (e.g., "15" for 15 minutes)
    unit: 'minutes' | 'hours';
    sound?: boolean;
    vibration?: boolean;
  }[];
}

export interface WalkingRoute {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  }[];
  patientId: string;
  directions?: RouteDirection[];
}

export interface RouteDirection {
  instruction: string;
  distance: number;
  maneuver: string;
  index: number;
}

export interface FamilyPhoto {
  id: string;
  uri: string;
  title: string;
  description?: string;
  uploadedAt: string;
  patientId: string;
  isLocal?: boolean;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  icon: string;
  patientId: string;
  gameType: 'memory' | 'word' | 'pattern';
  customInstructions?: string;
  enabled?: boolean;
  content?: {
    // For memory game
    memoryCards?: string[];
    // For word game
    wordPairs?: Array<{
      scrambled: string;
      answer: string;
    }>;
    // For pattern game
    patterns?: Array<{
      sequence: number[];
      options: number[];
      answer: number;
    }>;
  };
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  isVoice: boolean;
  voiceDuration?: number;
  audioUri?: string;
}