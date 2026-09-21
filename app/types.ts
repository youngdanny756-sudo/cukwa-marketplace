export type Product = {
  id: string;
  title: string;
  category: string | null;
  price: number;
  description: string | null;
  image_url: string | null;
  image_urls?: string[];
  phone: string | null;
  location: string | null;
  seller_id: string;
  status?: 'active' | 'sold' | 'removed';
  approval_status?: 'pending' | 'approved' | 'rejected';
  expires_at?: string | null;
  is_draft?: boolean;
  created_at?: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  is_verified: boolean;
  verification_status?: 'not_requested' | 'pending' | 'approved' | 'rejected';
  role: 'user' | 'admin';
};

export type Listing = Product;
