/** Scraped trip item from GET /api/widgets/trips */

export interface ScrapedTripItem {
  id: string;
  tripId: string;
  title: string;
  /** Cities in order e.g. "Indore → Amritsar" */
  citiesSequence?: string;
  location: string;
  imageUrl: string;
  startDate: string;
  endDate: string;
  dateDisplay: string;
}

/** Trip detail from GET /api/widgets/trips/:id */

export interface TripDetailOverview {
  status?: string;
  employee?: string;
  cashAdvances?: string;
  travelAdvance?: string;
  calculatedBudget?: string;
  usedBudget?: string;
  totalTxns?: string;
}

export interface TripDetailItineraryItem {
  text: string;
}

export interface TripDetailTransaction {
  amount: string;
  id: string;
  owner?: string;
  date?: string;
  service?: string;
}

export interface ScrapedTripDetail {
  tripId: string;
  overview: TripDetailOverview;
  itinerary: TripDetailItineraryItem[];
  transactions: TripDetailTransaction[];
}
