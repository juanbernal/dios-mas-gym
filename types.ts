
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
}

export interface ContentApiResponse {
  items: ContentPost[];
  nextPageToken?: string;
}

export type AppView = 'inicio' | 'reflexiones' | 'categorias' | 'favoritos' | 'musica' | 'testimonios' | 'comunidad' | 'acerca';

export interface AppState {
  currentView: AppView;
  allPosts: ContentPost[];
  loading: boolean;
  selectedPost: ContentPost | null;
  searchTerm: string;
  favorites: string[];
  selectedCategory: string | null;
}
