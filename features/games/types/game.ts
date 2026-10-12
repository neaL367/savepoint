export type GameId = string;
export type GameSlug = string;

export type GamePlatform = {
  id: number;
  name: string;
  slug: string;
};

export type GameStudio = {
  id: number;
  name: string;
  slug: string;
};

export type GameGenre = {
  id: number;
  name: string;
  slug: string;
};

export type ReleasePrecision = 'day' | 'month' | 'year' | 'unknown';
export type ReleaseStatus = 'announced' | 'released' | 'delayed';

export type GameRelease = {
  platformId: number | null;
  date: string | null; // YYYY-MM-DD
  precision: ReleasePrecision;
  status: ReleaseStatus;
};

export type GameSource = {
  provider: string;
  externalId: string;
  updatedAt: string | null;
};

export type Game = {
  id: GameId;
  slug: GameSlug;
  title: string;
  summary: string | null;
  coverImage: string | null;
  screenshots: string[];
  genres: GameGenre[];
  platforms: GamePlatform[];
  developers: GameStudio[];
  publishers: GameStudio[];
  releases: GameRelease[];
  mechanics: string[];
  source: GameSource;
};

export type GameSort = 'relevance' | 'release-date' | 'title';

export type GameSearchParams = {
  query: string;
  genre: string | null;
  platform: string | null;
  sort: GameSort;
  page: number;
  pageSize: number;
};

export type GameSearchResult = {
  results: Game[];
  page: number;
  pageSize: number;
  /** IGDB lists carry no total count, so pagination is hasMore-based. */
  hasMore: boolean;
};
