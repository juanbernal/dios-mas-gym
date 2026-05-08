import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SocialLink, LinkBioData } from '../../types';

const LinkBioAdmin: React.FC = () => {
    const navigate = useNavigate();
    const [data, setData] = useState<LinkBioData>({
        profile: {
            name: "Dios Mas Gym",
            bio: "El Arsenal de Fe | Música, Disciplina y Transformación",
            avatar: "https://blogger.googleusercontent.com/img/a/AVvXsEhr22diix5Quy0JfWnP8RAFo9pjrz2GmR_OoewVIu2pUfv4OCQ1Byd3ZRlqqvbgW-_lU8mg7py9FQa_rMs0fMSIMhiivHSZBB7alzg7fT4eQleMkomvPZrnHloINLMr09ruIZjb74cEaYaYg7QxN8r95zo2ApaUXkcbW5xlisfFtxTrablnG0HXvl_UVxg=s1600"
        },
        links: []
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{show: boolean, msg: string}>({show: false, msg: ''});

    const showToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: '' }), 3000);
    };

    useEffect(() => {
        fetch('/api/links')
            .then(res => res.json())
            .then(json => {
                console.log("Links API response:", json);
                if (json.links) setData(json);
                setIsLoading(false);
            })
            .catch(err => {
                console.error("Error loading links:", err);
                setIsLoading(false);
            });
    }, []);

    const saveData = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/links', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) showToast("Configuración guardada");
            else showToast("Error al guardar");
        } catch (err) {
            showToast("Error de conexión");
        } finally {
            setIsSaving(false);
        }
    };

    const addLink = () => {
        const newLink: SocialLink = {
            id: Date.now().toString(),
            title: "Nuevo Enlace",
            url: "https://",
            enabled: true,
            icon: "fas fa-link",
            type: 'secondary'
        };
        setData({ ...data, links: [...data.links, newLink] });
    };

    const updateLink = (id: string, field: keyof SocialLink, value: any) => {
        const newLinks = data.links.map(l => l.id === id ? { ...l, [field]: value } : l);
        setData({ ...data, links: newLinks });
    };

    const removeLink = (id: string) => {
        setData({ ...data, links: data.links.filter(l => l.id !== id) });
    };

    const moveLink = (index: number, direction: 'up' | 'down') => {
        const newLinks = [...data.links];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newLinks.length) return;
        [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
        setData({ ...data, links: newLinks });
    };

    if (isLoading) return (
        <div className="min-h-screen bg-[#05070a] flex items-center justify-center">
            <i className="fas fa-spinner fa-spin text-[#c5a059] text-3xl"></i>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#05070a] text-white font-['Poppins']">
            {/* Header */}
            <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
                <button 
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
                >
                    <i className="fas fa-chevron-left text-[8px]"></i>
                    Volver al Panel
                </button>
                <div className="flex items-center gap-4">
                    <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Link <span className="text-[#c5a059]">Bio</span> <span className="text-white/20 ml-2">v1.2</span></h1>
                </div>
                <button 
                    onClick={saveData}
                    disabled={isSaving}
                    className="bg-[#c5a059] text-black px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50"
                >
                    {isSaving ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-save mr-2"></i>}
                    Guardar Cambios
                </button>
            </div>

            <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Editor Section */}
                <div className="lg:col-span-7 space-y-8">
                    {/* Perfil */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                        <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest mb-8 border-b border-white/10 pb-4">
                            <i className="fas fa-user-circle mr-2"></i> Configuración del Perfil
                        </h3>
                        <div className="flex gap-6 items-start">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-[#c5a059]/30 shrink-0 bg-black">
                                <img src={data.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block font-bold">Nombre del Perfil</label>
                                    <input 
                                        type="text" 
                                        value={data.profile.name}
                                        onChange={e => setData({...data, profile: {...data.profile, name: e.target.value}})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#c5a059] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block font-bold">Bio / Descripción</label>
                                    <textarea 
                                        value={data.profile.bio}
                                        onChange={e => setData({...data, profile: {...data.profile, bio: e.target.value}})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#c5a059] outline-none h-20 resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-white/40 uppercase tracking-widest mb-1 block font-bold">URL de Avatar (JPG/PNG)</label>
                                    <input 
                                        type="text" 
                                        value={data.profile.avatar}
                                        onChange={e => setData({...data, profile: {...data.profile, avatar: e.target.value}})}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-[#c5a059] outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enlaces */}
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-sm">
                        <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
                            <h3 className="text-[#c5a059] text-[10px] font-black uppercase tracking-widest">
                                <i className="fas fa-list mr-2"></i> Mis Enlaces
                            </h3>
                            <button 
                                onClick={addLink}
                                className="bg-[#c5a059]/10 text-[#c5a059] px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-[#c5a059] hover:text-black transition-all border border-[#c5a059]/20"
                            >
                                <i className="fas fa-plus mr-2"></i> Añadir Enlace
                            </button>
                        </div>

                        <div className="space-y-4">
                            {data.links.map((link, index) => (
                                <div key={link.id} className="bg-black/40 border border-white/5 rounded-2xl p-4 group hover:border-[#c5a059]/30 transition-all">
                                    <div className="flex gap-4 items-center mb-4">
                                        <div className="flex flex-col gap-1 text-white/20">
                                            <button onClick={() => moveLink(index, 'up')} className="hover:text-[#c5a059]"><i className="fas fa-caret-up"></i></button>
                                            <button onClick={() => moveLink(index, 'down')} className="hover:text-[#c5a059]"><i className="fas fa-caret-down"></i></button>
                                        </div>
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                value={link.title}
                                                onChange={e => updateLink(link.id, 'title', e.target.value)}
                                                className="bg-transparent border-none text-white font-bold text-sm w-full outline-none p-0 focus:text-[#c5a059]"
                                                placeholder="Título del Enlace"
                                            />
                                            <input 
                                                type="text" 
                                                value={link.url}
                                                onChange={e => updateLink(link.id, 'url', e.target.value)}
                                                className="bg-transparent border-none text-white/40 text-[10px] w-full outline-none p-0"
                                                placeholder="URL (https://...)"
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select 
                                                value={link.type}
                                                onChange={e => updateLink(link.id, 'type', e.target.value)}
                                                className="bg-black/60 border border-white/10 rounded-lg text-[9px] px-2 py-1 outline-none text-white/60"
                                            >
                                                <option value="primary">Destacado</option>
                                                <option value="secondary">Normal</option>
                                                <option value="special">Brillante</option>
                                            </select>
                                            <button 
                                                onClick={() => removeLink(link.id)}
                                                className="text-white/20 hover:text-red-500 transition-colors"
                                            >
                                                <i className="fas fa-trash-alt"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex gap-4 items-center">
                                        <div className="flex items-center gap-2">
                                            <i className={`${link.icon} text-[#c5a059] text-xs`}></i>
                                            <input 
                                                type="text" 
                                                value={link.icon}
                                                onChange={e => updateLink(link.id, 'icon', e.target.value)}
                                                className="bg-black/20 border border-white/5 rounded px-2 py-1 text-[9px] outline-none text-white/40 w-32"
                                                placeholder="Icono (FA class)"
                                            />
                                        </div>
                                        <div className="flex-1"></div>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={link.enabled}
                                                onChange={e => updateLink(link.id, 'enabled', e.target.checked)}
                                                className="hidden"
                                            />
                                            <div className={`w-8 h-4 rounded-full relative transition-colors ${link.enabled ? 'bg-green-500' : 'bg-white/10'}`}>
                                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${link.enabled ? 'left-4.5' : 'left-0.5'}`}></div>
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Visible</span>
                                        </label>
                                    </div>
                                </div>
                            ))}
                            {data.links.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl text-white/20 text-[10px] uppercase tracking-widest">
                                    No hay enlaces aún. Pulsa el botón arriba para añadir uno.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="lg:col-span-5 relative">
                    <div className="sticky top-24">
                        <h3 className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] mb-4 text-center">Previsualización Móvil</h3>
                        <div className="mx-auto w-[320px] h-[640px] bg-[#05070a] border-[8px] border-black rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,1)] overflow-hidden relative group">
                            {/* Mobile Notch */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50"></div>
                            
                            {/* Inner Content */}
                            <div className="h-full overflow-y-auto custom-scrollbar p-6 pt-12 text-center bg-gradient-to-b from-[#0a0f1d] to-[#05070a]">
                                <div className="w-20 h-20 rounded-full border-2 border-[#c5a059] mx-auto mb-4 overflow-hidden shadow-[0_0_20px_rgba(197,160,89,0.3)]">
                                    <img src={data.profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <h4 className="text-lg font-bold mb-1">{data.profile.name}</h4>
                                <p className="text-[10px] text-white/60 mb-8 max-w-[200px] mx-auto leading-relaxed">{data.profile.bio}</p>
                                
                                <div className="space-y-3">
                                    {data.links.filter(l => l.enabled).map(link => (
                                        <div 
                                            key={link.id}
                                            className={`
                                                w-full py-4 px-6 rounded-2xl flex items-center gap-3 transition-all cursor-pointer border
                                                ${link.type === 'special' 
                                                    ? 'bg-[#c5a059] text-black border-[#c5a059] shadow-[0_0_15px_rgba(197,160,89,0.4)] animate-pulse' 
                                                    : link.type === 'primary'
                                                        ? 'bg-white/10 text-white border-white/10 hover:bg-white/20'
                                                        : 'bg-transparent text-white/80 border-white/5 hover:bg-white/5'}
                                            `}
                                        >
                                            <i className={`${link.icon} w-5 text-center`}></i>
                                            <span className="text-xs font-black uppercase tracking-widest flex-1 text-center pr-5">{link.title}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-12 flex justify-center gap-6 text-white/30 text-lg">
                                    <i className="fab fa-instagram hover:text-white transition-colors"></i>
                                    <i className="fab fa-spotify hover:text-white transition-colors"></i>
                                    <i className="fab fa-youtube hover:text-white transition-colors"></i>
                                </div>

                                <div className="mt-12 mb-4">
                                    <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/10 italic">Dios Mas Gym Records</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-8 flex justify-center">
                            <button 
                                onClick={() => window.open('/#/bio', '_blank')}
                                className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-[#c5a059] hover:text-white transition-all bg-white/5 px-6 py-3 rounded-xl border border-white/10"
                            >
                                <i className="fas fa-external-link-alt"></i>
                                Ver Página Pública
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast */}
            {toast.show && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[1000] animate-bounce-subtle">
                    <div className="bg-black/80 backdrop-blur-xl border border-[#c5a059]/30 px-8 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_20px_rgba(197,160,89,0.1)] flex items-center gap-4 transition-all scale-110">
                        <div className="w-10 h-10 bg-[#c5a059] rounded-xl flex items-center justify-center text-black shadow-[0_0_15px_rgba(197,160,89,0.5)]">
                            <i className="fas fa-check text-lg"></i>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#c5a059]">Éxito</span>
                            <span className="text-xs font-medium text-white/90 tracking-wide">
                                {toast.msg}
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LinkBioAdmin;
