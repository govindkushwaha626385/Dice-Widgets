/** Types for scraped voucher data (from backend /api/widgets/vouchers). */

export interface ScrapedVoucherItem {
  id: string;
  office: string;
  department: string;
  createdBy: string;
  amount: string;
  claimed: string;
  voucherType: string;
  createdOn: string;
}

export interface ScrapedVoucherDetail {
  id: string;
  voucherDetails: Record<string, string>;
  employeeDetails: Record<string, string>;
  totalVoucherAmount: string;
  totalReimbursedAmount: string;
  voucherStatus: string;
  transactionCount: string;
  timeline: Array<{ title: string; meta?: string; time?: string }>;
}
