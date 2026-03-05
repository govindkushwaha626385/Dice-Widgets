/** Types for scraped vendor advance data (from backend /api/widgets/vendor-advances). */

export interface ScrapedVendorAdvanceItem {
  id: string;
  vendorName: string;
  tdsCode: string;
  poNumber: string;
  amount: string;
  numericId?: number;
}

export interface VendorAdvanceDetailFields {
  advanceId?: string;
  baseAmount?: string;
  taxAmount?: string;
  tdsPercent?: string;
  tdsDescription?: string;
  category?: string;
  remarks?: string;
  advanceAmount?: string;
  [key: string]: string | undefined;
}

export interface VendorAdvanceTimelineEvent {
  title: string;
  submittedBy?: string;
  type?: string;
  sentOn?: string;
  approvedOn?: string;
  text: string;
}

export interface ScrapedVendorAdvanceDetail {
  id: string;
  numericId?: number;
  advanceDetails: VendorAdvanceDetailFields;
  timeline: VendorAdvanceTimelineEvent[];
}
