export type Quote = {
  id: string;
  client_id: string;
  project_type: 'web' | 'mobile' | 'desktop' | 'outros';
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected';
  valid_until: string;
  notes?: string;
  created_at: string;
  client?: {
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
};

export type QuoteItem = {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}; 