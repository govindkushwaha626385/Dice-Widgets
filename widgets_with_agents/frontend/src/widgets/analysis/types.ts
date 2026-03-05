/** Chart data from GET /api/analysis/chart-data */

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface ExpensesChartData {
  byService: ChartDataPoint[];
  byType: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface VouchersChartData {
  byType: ChartDataPoint[];
  byStatus: ChartDataPoint[];
  byOffice: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  byTypeAmount: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface TripsChartData {
  byStatus: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  count: number;
}

export interface PRsChartData {
  byStatus: ChartDataPoint[];
  count: number;
}

export interface VendorAdvanceChartData {
  byVendor: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface VendorSettlementsChartData {
  byType: ChartDataPoint[];
  byVendor: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface EmployeeSettlementsChartData {
  byType: ChartDataPoint[];
  byMonth: ChartDataPoint[];
  totalAmount: number;
  count: number;
}

export interface AnalysisChartData {
  expenses: ExpensesChartData;
  vouchers: VouchersChartData;
  trips: TripsChartData;
  purchase_requisitions: PRsChartData;
  vendor_advance: VendorAdvanceChartData;
  vendor_settlements: VendorSettlementsChartData;
  employee_settlements: EmployeeSettlementsChartData;
}
