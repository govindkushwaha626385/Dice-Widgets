/**
 * DOM selectors for expense vouchers UI.
 * List: https://corporate.dice.tech/app/settlements/expenseVoucher
 * Detail: https://corporate.dice.tech/app/voucher/{id}/details
 */

export const listSelectors = {
  tableWrapper: ".scrollable-table .table-wrapper",
  table: ".scrollable-table table",
  row: ".scrollable-table tbody tr.FadeIn-Effect",
  rowFallback: ".scrollable-table tbody tr",
  /** Column indices: 1=checkbox, 2=Details (voucher id), 3=Office, 4=Department, 5=Created By, 6=Amount, 7=Claimed, 8=Voucher Type, 9=Created On, 10=Actions */
  cellDetails: "td:nth-child(2)",
  cellOffice: "td:nth-child(3)",
  cellDepartment: "td:nth-child(4)",
  cellCreatedBy: "td:nth-child(5)",
  cellAmount: "td:nth-child(6)",
  cellClaimed: "td:nth-child(7)",
  cellVoucherType: "td:nth-child(8)",
  cellCreatedOn: "td:nth-child(9)",
} as const;

export const detailSelectors = {
  overview: "#Overview",
  voucherDetailsHeading: "h6.heading-sm",
  /** Label-value pairs: p (label) + sibling/following div (value) in col-12 col-md-* blocks */
  detailRow: ".row .col-12 [class*='col-']",
  labelValuePair: "p",
  /** Right sidebar / summary */
  totalVoucherAmount: "[class*='Details']",
  voucherStatus: "[class*='VOUCHER STATUS']",
  /** Timeline */
  timelineSection: "[id='voucherTimeline'], .timeline-container, [class*='timeline']",
  timelineItem: ".timeline-item, [class*='timeline-item']",
  /** Approve / Decline buttons (detail page header) */
  approveBtn: "button.approve-btn",
  declineBtn: "button.decline-btn",
} as const;
