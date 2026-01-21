export type Artwork = {
  id: number;
  title: string | null;
  place_of_origin: string | null;
  artist_display: string | null;
  inscriptions: string | null;
  date_start: number | null;
  date_end: number | null;
};

export type ApiResponse = {
  data: Artwork[];
  pagination: {
    total: number;
    limit: number;
    page: number;
    total_pages: number;
  };
};
