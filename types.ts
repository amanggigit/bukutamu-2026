
export interface Guest {
  id: string;
  name: string;
  groupSize: number;
  contact: string;
  room: string;
  official: string;
  category: string;
  purpose: string;
  timestamp: string;
  photo?: string; // Base64 string
}

export enum ViewMode {
  REGISTRATION = 'registration',
  REPORT = 'report'
}

export interface VisitStats {
  category: string;
  count: number;
}
