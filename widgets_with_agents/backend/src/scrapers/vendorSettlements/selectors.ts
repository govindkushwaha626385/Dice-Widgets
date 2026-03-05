/**
 * DOM selectors for Vendor Settlements list.
 * Page: https://corporate.dice.tech/app/settlements/vendor
 * Table: .scrollable-table with columns [Checkbox], Details, Ledger Id, Type, Date, Amount, Actions.
 * Column 1 is often a checkbox, so Details=2, Ledger Id=3, etc.
 */
export const listSelectors = {
  tableWrapper: ".scrollable-table .table-wrapper",
  table: ".scrollable-table table",
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  rowFallback: ".scrollable-table tbody tr",
  /** Columns: 2=Details, 3=Ledger Id, 4=Type, 5=Date, 6=Amount, 7=Actions (1=checkbox when present) */
  cellDetails: "td:nth-child(2)",
  cellLedgerId: "td:nth-child(3)",
  cellType: "td:nth-child(4)",
  cellDate: "td:nth-child(5)",
  cellAmount: "td:nth-child(6)",
  cellActions: "td:nth-child(7)",
  paginationNav: "nav[aria-label='pagination']",
  nextButton: "button[aria-label='next']",
  previousButton: "button[aria-label='previous']",
  currentPageButton: "button[aria-current='page']",
} as const;
