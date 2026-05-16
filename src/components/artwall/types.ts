export interface Profile {
  id: string;
  username: string;
  is_verified?: boolean;
}

export interface ArtFavorite {
  user_id: string;
  profiles?: Profile;
}

export interface ArtPost {
  id: string;
  user_id: string;
  image_url: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles: Profile;
  art_favorites?: ArtFavorite[];
}

export interface ArtComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles: Profile;
}
