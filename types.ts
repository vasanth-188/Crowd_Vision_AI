
export interface CrowdAnalysis {
  headcount: number;
  density: number; // People per sq meter
  maxCapacity: number;
  riskLevel: 'Low' | 'Moderate' | 'High' | 'Critical';
  predictiveAlert?: string;
  recommendations: string[];
}

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: Date;
}

export interface MissingPersonResult {
  found: boolean;
  confidence: number;
  locationDescription?: string;
  message: string;
}

export enum AnalysisStatus {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  ERROR = 'error'
}

export type AnalysisMode = 'live' | 'manual';

export interface MediaState {
  url: string | null;
  type: 'image' | 'video' | null;
  file: File | null;
}
