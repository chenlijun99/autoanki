export interface Tag {
  id: string | null;
  title: string;
  created_time: number;
  updated_time: number;
  user_created_time: number;
  user_updated_time: number;
  encryption_cipher_text: string;
  encryption_applied: number;
  is_shared: number;
  parent_id: string;
}
