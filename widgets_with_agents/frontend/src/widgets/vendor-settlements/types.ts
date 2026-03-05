/** Vendor settlement item (from GET /api/widgets/vendor-settlements). */
export interface VendorSettlementItem {
  ledgerId: string;
  vendorName: string;
  description: string;
  type: string;
  date: string;
  amount: string;
}
