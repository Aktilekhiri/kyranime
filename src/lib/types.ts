export type Title = {
  id: string;
  slug: string;
  title_ky: string;
  title_ru: string;
  title_orig: string | null;
  description_ky: string | null;
  description_ru: string | null;
  poster_url: string | null;
  banner_url: string | null;
  year: number | null;
  genres: string[];
  release_days: number[];
  status: "ongoing" | "completed";
  dubbed_by: string | null;
  created_at: string;
};

export type Episode = {
  id: string;
  title_id: string;
  season: number;
  number: number;
  name_ky: string | null;
  name_ru: string | null;
  hls_url: string;
  thumbnail_url: string | null;
  duration_sec: number | null;
  published: boolean;
  dub_id: string | null;
};

export type Dub = {
  id: string;
  title_id: string;
  studio_name: string;
  studio_url: string | null;
  sort: number;
  published: boolean;
};

export type Review = {
  id: string;
  title_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  username: string;
};

export type Rating = { avg_rating: number; reviews_count: number };

export type Comment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
  username: string;
};
