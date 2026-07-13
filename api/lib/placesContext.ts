/** Condensed places context for the AI system prompt (58 curated venues). */
export const PLACES_OVERVIEW = `
Triangle Networking Finder — 58 curated real venues near Durham, NC 27707.

Categories and counts:
- Church (8): St. Stephen's Episcopal, Westminster Presbyterian, Hope Valley Baptist, Holy Family, Duke Chapel, etc.
- Premium Fitness (8): Lifetime Athletic, Equinox-adjacent clubs, CrossFit, Orange Theory, etc.
- Yoga & Pilates (6): CorePower, local studios in Durham/Raleigh/Cary.
- Country & Social Club (6): Hope Valley Country Club, Raleigh Country Club, Carolina Country Club, etc.
- Professional Networking (8): Frontier RTP, HQ Raleigh, American Underground, NC Biotech Center, etc.
- Charity & Culture (8): DPAC, NC Museum of Art, Durham Performing Arts, symphony events, etc.
- Upscale Social Venue (8): Washington Duke Inn, The Umstead, boutique hotels, fine dining.
- Nightlife (12): Boxyard RTP, Watts & Ward, C. Grace, Foundation, Lynnwood, etc.

User home base: Durham 27707. Drive times are approximate from there.
Recommend only place IDs from the client-supplied list. Never invent venues.
For events, prefer Triangle networking, social, nightlife, and professional mixers.
`;

export type PlaceSummary = {
  id: string;
  name: string;
  category: string;
  city: string;
  driveTimeMinutes: number;
  couplesFriendly: boolean;
  wifeFriendly: boolean;
  bestFor: string[];
};

export function filterPlaces(
  places: PlaceSummary[],
  opts: { categories?: string[]; maxDriveTime?: number; keywords?: string },
): PlaceSummary[] {
  let result = [...places];
  if (opts.maxDriveTime) {
    result = result.filter((p) => p.driveTimeMinutes <= opts.maxDriveTime!);
  }
  if (opts.categories?.length) {
    const cats = new Set(opts.categories.map((c) => c.toLowerCase()));
    result = result.filter((p) => cats.has(p.category.toLowerCase()));
  }
  if (opts.keywords) {
    const q = opts.keywords.toLowerCase();
    result = result.filter((p) =>
      [p.name, p.category, p.city, ...p.bestFor].join(' ').toLowerCase().includes(q),
    );
  }
  return result.slice(0, 12);
}
