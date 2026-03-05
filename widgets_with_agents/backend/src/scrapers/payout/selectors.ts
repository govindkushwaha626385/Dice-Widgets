/**
 * DOM selectors for Transfers & Accounts (payout) list.
 * Page: https://corporate.dice.tech/app/payout
 * Table: .scrollable-table with columns [Checkbox], Details, Status, Account, Amount, Actions.
 */
export const listSelectors = {
  tableWrapper: ".scrollable-table .table-wrapper",
  table: ".scrollable-table table",
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  rowFallback: ".scrollable-table tbody tr",
  /** Columns: 2=Details, 3=Status, 4=Account, 5=Amount, 6=Actions (1=checkbox when present) */
  cellDetails: "td:nth-child(2)",
  cellStatus: "td:nth-child(3)",
  cellAccount: "td:nth-child(4)",
  cellAmount: "td:nth-child(5)",
  cellActions: "td:nth-child(6)",
  paginationNav: "nav[aria-label='pagination']",
  nextButton: "button[aria-label='next']",
  previousButton: "button[aria-label='previous']",
  currentPageButton: "button[aria-current='page']",
} as const;
