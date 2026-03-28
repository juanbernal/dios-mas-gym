
export interface ContentPost {
  id: string;
  title: string;
  content: string;
  published: string;
  url: string;
  images?: { url: string }[];
  author: {
    displayName: string;
    image: {
      url: string;
    };
  };
  labels?: string[];
  readingTime?: number;
}

export interface ContentApiResponse {
  items: ContentPost[];
  nextPageToken?: string;
}

export type AppView = 'inicio' | 'reflexiones' | 'categorias' | 'favoritos' | 'musica' | 'testimonios' | 'comunidad' | 'acerca';

export interface MusicItem {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
  type: string;
  date: string;
}

export interface AppState {
  currentView: AppView;
  allPosts: ContentPost[];
  musicDiosmasgym: MusicItem[];
  musicJuan614: MusicItem[];
  loading: boolean;
  selectedPost: ContentPost | null;
  searchTerm: string;
  favorites: string[];
  selectedCategory: string | null;
  nextPageToken?: string;
  error?: string | null;
}
