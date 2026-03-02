/**
 * DOM selectors for trips list and detail pages.
 * List: https://corporate.dice.tech/app/travel/trips
 * Detail: https://corporate.dice.tech/app/travel/trips/details/TRIPS-INTERN-*
 */

export const listSelectors = {
  cardContainer: ".card-container",
  tripCard: ".FadeInUp-Effect.card-border",
  tripCardFallback: ".card-border",
  /** Trip ID in div.w-auto.absolute (top-left of card) */
  tripId: "div.w-auto.absolute",
  tripIdFallback: "[class*='absolute']",
  /** Cities: container is .flex with gap; each city in .text-small.text-pill p */
  citiesContainer: "div.flex",
  cityPill: ".text-small.text-pill",
  cityName: ".text-small.text-pill p",
  locationName: ".text-small.text-pill p",
  tripImage: ".text-small.text-pill img",
  tripTitle: "h6.heading-sm.fw-bold",
  dateText: ".text-small",
  paginationNav: "nav[aria-label='pagination']",
  nextButton: "button[aria-label='next']",
  previousButton: "button[aria-label='previous']",
  currentPageButton: "button[aria-current='page']",
} as const;

/** Detail page: overview, itinerary, transactions */
export const detailSelectors = {
  /** Overview section */
  overviewHeading: "h4.heading",
  deleteButton: "button.decline-btn",
  deleteButtonFallback: "button:has-text('Delete')",
  /** Status, Employee, Cash Advances - label in p, value in following div */
  statBlock: ".col-12.col-md-3 .w-100, .col-12.col-md-6 .w-100",
  /** Travel Advance summary (INR x / y) */
  travelAdvanceCard: ".stats-card",
  /** Calculated Budget, Used Budget, Total Txns - in row after Overview */
  budgetRow: ".row.border.rounded-md .pd3",
  /** Itinerary section */
  itineraryHeading: "h4.heading",
  itineraryContainer: ".itinerary-container",
  tripCard: ".trip-card",
  /** Transactions section */
  transactionsHeading: "h4.heading",
  expenseCard: ".expense-card",
  expenseAmount: "h4.heading.fw-bold",
  expenseId: ".fw-bold.text-truncate.text-small",
  expenseOwner: ".text-small",
  expenseDate: ".text-small",
  expenseService: ".text-small",
} as const;
