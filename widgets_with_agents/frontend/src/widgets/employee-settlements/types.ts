/** Employee settlement item (from GET /api/widgets/employee-settlements). */
export interface SettlementItem {
  ledgerId: string;
  employeeName: string;
  voucherNumber: string;
  entityName: string;
  type: string;
  date: string;
  amount: string;
}
