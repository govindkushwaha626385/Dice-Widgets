/** Transfer/account item from GET /api/widgets/transfers-accounts (scraped from payout page). */
export interface TransferAccountItem {
  transferId: string;
  name: string;
  number: string;
  addedOn: string;
  office: string;
  status: string;
  account: string;
  amount: string;
}
