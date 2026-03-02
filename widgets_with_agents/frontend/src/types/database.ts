/**
 * Supabase database types (extend as we add tables).
 * All tables include id (uuid), user_id (uuid), created_at (timestamptz).
 */
export type Json = Record<string, unknown> | unknown[];

export interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  account_no: string | null;
  ifsc: string | null;
  uid: string;
  created_at: string;
  updated_at?: string;
}

export type ApprovalStatus = "pending" | "approved" | "declined";

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  category: "Travel" | "Food";
  date: string;
  merchant: string | null;
  amount: number;
  bill_no: string | null;
  file_url: string | null;
  status?: ApprovalStatus;
  created_at: string;
}

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  source: string | null;
  destination: string | null;
  amount: number | null;
  status?: ApprovalStatus;
  created_at: string;
}

export interface CustomField {
  id: string;
  user_id: string;
  title: string;
  field_id: string;
  type: "text" | "date" | "number" | "email" | "textarea" | "select";
  placeholder: string | null;
  created_at: string;
}

export interface Shortcut {
  id: string;
  user_id: string;
  title: string;
  url: string;
  created_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  name: string;
  sku: string | null;
  description: string | null;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface PurchaseRequisition {
  id: string;
  user_id: string;
  pr_number: string;
  status: string;
  items: Json;
  created_at: string;
}

export interface Voucher {
  id: string;
  user_id: string;
  vid: string;
  amount: number;
  type: string | null;
  reference_id: string | null;
  status?: ApprovalStatus;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  widget_type: string;
  action: string;
  entity_id: string | null;
  payload: Json | null;
  created_at: string;
}

export interface WhatsAppContact {
  id: string;
  user_id: string;
  label: string;
  phone: string;
  created_at: string;
}

// Supabase generated types shape (minimal for client)
export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, "id" | "created_at">; Update: Partial<Profile> };
      expenses: { Row: Expense; Insert: Omit<Expense, "id" | "created_at">; Update: Partial<Expense> };
      trips: { Row: Trip; Insert: Omit<Trip, "id" | "created_at">; Update: Partial<Trip> };
      custom_fields: { Row: CustomField; Insert: Omit<CustomField, "id" | "created_at">; Update: Partial<CustomField> };
      shortcuts: { Row: Shortcut; Insert: Omit<Shortcut, "id" | "created_at">; Update: Partial<Shortcut> };
      notes: { Row: Note; Insert: Omit<Note, "id" | "created_at">; Update: Partial<Note> };
      products: { Row: Product; Insert: Omit<Product, "id" | "created_at">; Update: Partial<Product> };
      purchase_requisitions: { Row: PurchaseRequisition; Insert: Omit<PurchaseRequisition, "id" | "created_at">; Update: Partial<PurchaseRequisition> };
      vouchers: { Row: Voucher; Insert: Omit<Voucher, "id" | "created_at">; Update: Partial<Voucher> };
      activity_logs: { Row: ActivityLog; Insert: Omit<ActivityLog, "id" | "created_at">; Update: Partial<ActivityLog> };
      whatsapp_contacts: { Row: WhatsAppContact; Insert: Omit<WhatsAppContact, "id" | "created_at">; Update: Partial<WhatsAppContact> };
    };
  };
}
