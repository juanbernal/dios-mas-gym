import React from 'react';
import { MusicItem } from '../types';
import MusicCard from './MusicCard';

interface RecommendedSongsProps {
  songs: MusicItem[];
  onPlay: (song: MusicItem) => void;
}

const RecommendedSongs: React.FC<RecommendedSongsProps> = ({ songs, onPlay }) => {
  if (songs.length === 0) return null;

  return (
    <section className="mt-20 py-20 border-t border-white/5 animate-fade-in">
      <div className="flex flex-col items-center mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.6em] text-[#c5a059]">
            Lo Que Se Recomienda Escuchar
          </h3>
          <div className="w-1.5 h-1.5 rounded-full bg-[#c5a059] animate-pulse"></div>
        </div>
        <p className="text-[9px] text-white/20 font-bold uppercase tracking-[0.2em]">
          Banda Sonora para tu Espíritu
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {songs.map(song => (
          <div key={song.id} className="transition-all hover:scale-[1.02] duration-300">
            <MusicCard item={song} onPlay={() => onPlay(song)} />
          </div>
        ))}
      </div>

      <div className="mt-16 text-center border-t border-white/5 pt-12">
        <p className="text-[10px] text-white/10 font-black uppercase tracking-[0.5em]">
          El Arsenal de Fe | Dios Mas Gym &copy; 2026
        </p>
      </div>
    </section>
  );
};

export default RecommendedSongs;
