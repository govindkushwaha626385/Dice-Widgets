/**
 * DOM selectors for Employee Settlements list.
 * Page: https://corporate.dice.tech/app/settlements/employee
 * Table: .scrollable-table with columns Details, Ledger Id, Type, Date, Amount, Actions.
 */

export const listSelectors = {
  tableWrapper: ".scrollable-table .table-wrapper",
  table: ".scrollable-table table",
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  rowFallback: ".scrollable-table tbody tr",
  /** Columns: 1=Details, 2=Ledger Id, 3=Type, 4=Date, 5=Amount, 6=Actions */
  cellDetails: "td:nth-child(1)",
  cellLedgerId: "td:nth-child(2)",
  cellType: "td:nth-child(3)",
  cellDate: "td:nth-child(4)",
  cellAmount: "td:nth-child(5)",
  cellActions: "td:nth-child(6)",
  paginationNav: "nav[aria-label='pagination']",
  nextButton: "button[aria-label='next']",
  previousButton: "button[aria-label='previous']",
  currentPageButton: "button[aria-current='page']",
} as const;
