type LinkedInPost = {
  id: string;
  content: string;
  imageUrl?: string;
  likes: number;
  comments: number;
  shares: number;
  url: string;
  created_at: string;
};

type LinkedInStats = {
  followers: number;
  connections: number;
  profileViews: number;
  postImpressions: number;
}; 