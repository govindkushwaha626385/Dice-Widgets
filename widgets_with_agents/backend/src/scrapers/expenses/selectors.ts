/**
 * DOM selectors for expenses transaction UI.
 * Keep in one file so you can update easily when the site’s DOM changes.
 * Base URL is configured via DICE_TRANSACTION_BASE_URL (e.g. https://corporate.dice.tech/app/transaction).
 */

export const listSelectors = {
  /** Container for the main expenses table */
  tableWrapper: ".scrollable-table .table-wrapper",
  /** Each expense row in the table body (primary: with animation class) */
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  /** Fallback: any table row if FadeIn-Effect is missing or DOM changed */
  rowFallback: ".scrollable-table tbody tr",
  /** Within a row: cells are ordered as Details, Service, Amount, Transaction Date, Submission Date, Created By, Type, Actions */
  cellDetailId: "td:nth-child(1) p.text", // first <p class="text"> is expense ID e.g. O-INTERN-000000547
  cellDetailIdFallback: "td:nth-child(1)", // full first cell text if structure changed
  cellService: "td:nth-child(2) p.text",
  cellAmount: "td:nth-child(3) p.text",
  cellTransactionDate: "td:nth-child(4) p.text",
  cellSubmissionDate: "td:nth-child(5) p.text",
  cellCreatedBy: "td:nth-child(6) p.text",
  cellType: "td:nth-child(7) p.text",
} as const;

export const detailSelectors = {
  /** Side pane / detail panel */
  sidepane: ".sidepane",
  /** Expense title / agent (e.g. Agent_Rapido) */
  heading: "h4.heading",
  /** Claimed amount (e.g. INR 80) */
  amountHeading: "h3.heading-md",
  /** Label-value blocks in Details section */
  detailBlock: ".content .w-100.align-center.mb2",
  /** Section headings (Details, Budget Details, etc.) */
  sectionHeading: "h6.heading-sm",
  /** Timeline (open the "Timeline" tab first if your UI uses tabs) */
  timelineContainer: ".timeline-container",
  timelineItem: ".timeline-item",
  timelineTitle: ".timeline-title",
  timelineMeta: ".timeline-meta",
  timelineTime: ".timeline-time",
} as const;
