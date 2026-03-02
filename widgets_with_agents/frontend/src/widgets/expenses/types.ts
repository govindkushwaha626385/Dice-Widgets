/** Types for scraped expense data (from backend /api/widgets/expenses). */

export interface ScrapedExpenseItem {
  id: string;
  service: string;
  amount: string;
  transactionDate: string;
  submissionDate: string;
  createdBy: string;
  type: string;
}

export interface ScrapedExpenseDetail {
  id: string;
  heading: string;
  amount: string;
  details: Record<string, string>;
  timeline: Array<{ title: string; meta?: string; time?: string }>;
}
