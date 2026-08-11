export type AppView = 'inicio' | 'musica' | 'testimonios' | 'comunidad' | 'acerca';

export interface MusicItem {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
  type: string;
  date: string;
  album?: string;
  lyrics?: string;
}

export interface AppState {
  currentView: AppView;
  musicDiosmasgym: MusicItem[];
  musicJuan614: MusicItem[];
  activeSong: MusicItem | null;
  loading: boolean;
  error?: string | null;
}

export interface SocialLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  enabled: boolean;
  type?: 'primary' | 'secondary' | 'special';
}

export interface LinkBioData {
  profile: {
    name: string;
    bio: string;
    avatar: string;
    theme?: string;
  };
  links: SocialLink[];
}
