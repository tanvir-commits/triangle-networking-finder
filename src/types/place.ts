export type PlaceCategory =
  | 'Church'
  | 'Premium Fitness'
  | 'Yoga & Pilates'
  | 'Country & Social Club'
  | 'Professional Networking'
  | 'Charity & Culture'
  | 'Upscale Social Venue';

export type NetworkingPotential = 'Excellent' | 'Good' | 'Moderate';

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  city: string;
  address: string;
  driveTimeMinutes: number;
  distanceMiles?: number;
  websiteUrl: string;
  googleMapsUrl: string;
  estimatedCost: string;
  audience: string;
  networkingPotential: NetworkingPotential;
  bestFor: string[];
  bestTimeToGo: string;
  whyItFits: string;
  socialOpportunities: string;
  couplesFriendly: boolean;
  wifeFriendly: boolean;
  membershipRequired: boolean;
  sourceNotes?: string;
};

export type SortOption =
  | 'networking'
  | 'closest'
  | 'lowest-cost'
  | 'couples';

export type UserPlaceData = {
  favorite: boolean;
  visited: boolean;
  rating?: number;
  notes?: string;
};

export type UserData = Record<string, UserPlaceData>;

export const CATEGORY_FILTERS: { label: string; value: PlaceCategory | 'All' }[] = [
  { label: 'All', value: 'All' },
  { label: 'Church', value: 'Church' },
  { label: 'Fitness', value: 'Premium Fitness' },
  { label: 'Yoga', value: 'Yoga & Pilates' },
  { label: 'Clubs', value: 'Country & Social Club' },
  { label: 'Professional', value: 'Professional Networking' },
  { label: 'Charity & Culture', value: 'Charity & Culture' },
  { label: 'Social Venues', value: 'Upscale Social Venue' },
];
