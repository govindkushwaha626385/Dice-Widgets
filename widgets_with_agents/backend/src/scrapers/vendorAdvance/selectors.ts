/**
 * DOM selectors for Vendor Advance list and detail (side panel).
 * List: https://corporate.dice.tech/app/vendor/advance
 * Detail: opened in side panel via View button.
 */

export const listSelectors = {
  tableWrapper: ".scrollable-table .table-wrapper",
  table: ".scrollable-table table",
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  rowFallback: ".scrollable-table tbody tr",
  /** Columns: 1=ID, 2=Vendor Name, 3=TDS/CODE, 4=PO NUMBER, 5=Amount, 6=Actions */
  cellId: "td:nth-child(1) p.text",
  cellVendorName: "td:nth-child(2) p.text",
  cellTdsCode: "td:nth-child(3) p.text",
  cellPoNumber: "td:nth-child(4) p.text",
  cellAmount: "td:nth-child(5) p.text",
  /** View button or link in actions column */
  cellActions: "td:nth-child(6)",
  viewButton: "td:nth-child(6) button, td:nth-child(6) a[href*='advance']",
  paginationNav: "nav[aria-label='pagination']",
  nextButton: "button[aria-label='next']",
  previousButton: "button[aria-label='previous']",
  currentPageButton: "button[aria-current='page']",
} as const;

/** Detail side panel: .sidepane, Advance Details, Timeline */
export const detailSelectors = {
  sidepane: ".sidepane-wrapper .sidepane, .FadeInRight-Effect.sidepane",
  content: ".sidepane .content, [class*='content']",
  /** Section headings */
  headingSm: "h6.heading-sm",
  /** Advance Details: div.w-100.align-center.mb2 with p (label) + div (value) */
  detailBlock: ".w-100.align-center.mb2",
  detailLabel: "p",
  detailValue: "p + div, .w-100.align-center.mb2 > div:last-child",
  /** Timeline */
  timelineSection: ".timeline",
  timelineStage: ".stage",
  pointText: ".point-text",
  /** Action buttons (for reference) */
  approveBtn: "button.approve-btn",
  declineBtn: "button.decline-btn",
} as const;
