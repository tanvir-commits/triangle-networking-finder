export type EventCategory =
  | 'Networking'
  | 'Startup'
  | 'Professional'
  | 'Nightlife'
  | 'Social'
  | 'Biotech'
  | 'Other';

export type TriangleEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  city?: string;
  category: string;
  url?: string;
  source?: string;
  description?: string;
  disclaimer?: string;
  addedBy?: 'seed' | 'ai' | 'user' | 'local';
  createdAt?: string;
  removed?: boolean;
};

export type ProposedEventAction = {
  action: 'add' | 'remove';
  id?: string;
  title: string;
  date: string;
  time?: string;
  venue: string;
  city?: string;
  category: string;
  url?: string;
  source?: string;
  description?: string;
  persisted?: boolean;
};
