import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CalendarType = 'Lanzamiento' | 'Post' | 'Reel' | 'Historia' | 'Campaña' | 'Devocional';
type CalendarStatus = 'Idea' | 'En progreso' | 'Programado' | 'Publicado';

interface CalendarItem {
    id: string;
    title: string;
    date: string;
    type: CalendarType;
    status: CalendarStatus;
    platform: string;
    artist: string;
    notes: string;
}

const STORAGE_KEY = 'dg_content_calendar';

const TYPES: CalendarType[] = ['Lanzamiento', 'Post', 'Reel', 'Historia', 'Campaña', 'Devocional'];
const STATUSES: CalendarStatus[] = ['Idea', 'En progreso', 'Programado', 'Publicado'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook', 'Blog', 'Smart Link', 'WhatsApp'];

const typeStyles: Record<CalendarType, { icon: string; color: string }> = {
    Lanzamiento: { icon: 'fa-rocket', color: '#ff4b2b' },
    Post: { icon: 'fa-square-pen', color: '#fbbf24' },
    Reel: { icon: 'fa-video', color: '#d946ef' },
    Historia: { icon: 'fa-bolt', color: '#38bdf8' },
    Campaña: { icon: 'fa-bullhorn', color: '#c5a059' },
    Devocional: { icon: 'fa-book-bible', color: '#10b981' }
};

const loadItems = (): CalendarItem[] => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const saveItems = (items: CalendarItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const toDateInput = (date: Date) => date.toISOString().split('T')[0];

const getMonthLabel = (date: Date) => date.toLocaleDateString('es-US', { month: 'long', year: 'numeric' });

const getMonthDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = [];

    for (let i = 0; i < startOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(new Date(year, month, day));
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
};

const emptyForm = (date = toDateInput(new Date())): Omit<CalendarItem, 'id'> => ({
    title: '',
    date,
    type: 'Post',
    status: 'Idea',
    platform: 'Instagram',
    artist: 'Diosmasgym',
    notes: ''
});

const ContentCalendar: React.FC = () => {
    const navigate = useNavigate();
    const [items, setItems] = useState<CalendarItem[]>(loadItems);
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));
    const [filter, setFilter] = useState<CalendarType | 'Todos'>('Todos');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<CalendarItem, 'id'>>(emptyForm());

    const persist = (nextItems: CalendarItem[]) => {
        const sorted = [...nextItems].sort((a, b) => `${a.date}-${a.title}`.localeCompare(`${b.date}-${b.title}`));
        setItems(sorted);
        saveItems(sorted);
    };

    const filteredItems = useMemo(() => {
        return filter === 'Todos' ? items : items.filter(item => item.type === filter);
    }, [items, filter]);

    const selectedItems = useMemo(() => {
        return filteredItems.filter(item => item.date === selectedDate);
    }, [filteredItems, selectedDate]);

    const upcomingItems = useMemo(() => {
        const today = toDateInput(new Date());
        return filteredItems.filter(item => item.date >= today).slice(0, 6);
    }, [filteredItems]);

    const stats = useMemo(() => ({
        total: items.length,
        scheduled: items.filter(item => item.status === 'Programado').length,
        launches: items.filter(item => item.type === 'Lanzamiento').length,
        published: items.filter(item => item.status === 'Publicado').length
    }), [items]);

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!formData.title.trim()) return;

        if (editingId) {
            persist(items.map(item => item.id === editingId ? { ...formData, id: editingId } : item));
        } else {
            persist([...items, { ...formData, id: crypto.randomUUID() }]);
        }

        setEditingId(null);
        setSelectedDate(formData.date);
        setFormData(emptyForm(formData.date));
    };

    const editItem = (item: CalendarItem) => {
        setEditingId(item.id);
        setFormData({
            title: item.title,
            date: item.date,
            type: item.type,
            status: item.status,
            platform: item.platform,
            artist: item.artist,
            notes: item.notes
        });
        setSelectedDate(item.date);
    };

    const deleteItem = (id: string) => {
        persist(items.filter(item => item.id !== id));
        if (editingId === id) {
            setEditingId(null);
            setFormData(emptyForm(selectedDate));
        }
    };

    const changeMonth = (direction: number) => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    };

    const selectDay = (day: Date) => {
        const nextDate = toDateInput(day);
        setSelectedDate(nextDate);
        if (!editingId) setFormData(prev => ({ ...prev, date: nextDate }));
    };

    const exportCalendar = async () => {
        const body = items.map(item => `${item.date} | ${item.type} | ${item.status} | ${item.artist} | ${item.platform} | ${item.title}${item.notes ? `\nNotas: ${item.notes}` : ''}`).join('\n\n');
        await navigator.clipboard.writeText(body || 'Calendario vacio');
    };

    return (
        <div className="min-h-screen bg-[#05070a] pt-32 pb-40 px-6 md:px-8 font-['Poppins'] text-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
                    <div>
                        <button onClick={() => navigate('/admin')} className="mb-8 text-[9px] font-black uppercase tracking-[0.4em] text-[#c5a059] flex items-center gap-4 group">
                            <div className="w-12 h-px bg-[#c5a059] group-hover:w-20 transition-all"></div> Volver al Panel
                        </button>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#c5a059] mb-4">Plan Maestro</p>
                        <h1 className="font-serif italic text-5xl md:text-7xl leading-tight">Calendario de <span className="text-[#c5a059]">Contenido</span></h1>
                    </div>
                    <button onClick={exportCalendar} className="px-6 py-4 rounded-full border border-[#c5a059]/30 text-[#c5a059] text-[9px] font-black uppercase tracking-[0.3em] hover:bg-[#c5a059] hover:text-black transition-all">
                        <i className="fas fa-copy mr-3"></i> Copiar Plan
                    </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {[
                        ['Total', stats.total, 'fa-layer-group'],
                        ['Programados', stats.scheduled, 'fa-calendar-check'],
                        ['Lanzamientos', stats.launches, 'fa-rocket'],
                        ['Publicados', stats.published, 'fa-circle-check']
                    ].map(([label, value, icon]) => (
                        <div key={label as string} className="bg-[#0f111a] border border-white/5 rounded-3xl p-6">
                            <i className={`fas ${icon} text-[#c5a059] mb-8`}></i>
                            <p className="font-serif italic text-4xl text-white">{value}</p>
                            <p className="text-[8px] font-black uppercase tracking-[0.3em] text-white/25">{label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <section className="xl:col-span-8 bg-[#0f111a] border border-white/5 rounded-[2.5rem] p-5 md:p-8 overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <button onClick={() => changeMonth(-1)} className="w-11 h-11 rounded-full border border-white/10 text-white/50 hover:text-black hover:bg-[#c5a059] transition-all"><i className="fas fa-chevron-left"></i></button>
                                <h2 className="font-serif italic text-3xl md:text-5xl capitalize min-w-[260px] text-center">{getMonthLabel(currentMonth)}</h2>
                                <button onClick={() => changeMonth(1)} className="w-11 h-11 rounded-full border border-white/10 text-white/50 hover:text-black hover:bg-[#c5a059] transition-all"><i className="fas fa-chevron-right"></i></button>
                            </div>
                            <select value={filter} onChange={(e) => setFilter(e.target.value as CalendarType | 'Todos')} className="bg-[#05070a] border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-[#c5a059]/50">
                                <option>Todos</option>
                                {TYPES.map(type => <option key={type}>{type}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-7 gap-2 mb-3">
                            {['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'].map(day => (
                                <div key={day} className="text-center text-[8px] font-black uppercase tracking-widest text-white/20 py-2">{day}</div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-2">
                            {getMonthDays(currentMonth).map((day, index) => {
                                const dateKey = day ? toDateInput(day) : `empty-${index}`;
                                const dayItems = day ? filteredItems.filter(item => item.date === dateKey) : [];
                                const isSelected = day && dateKey === selectedDate;
                                const isToday = day && dateKey === toDateInput(new Date());

                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => day && selectDay(day)}
                                        disabled={!day}
                                        className={`min-h-[92px] md:min-h-[122px] rounded-2xl border p-2 md:p-3 text-left transition-all disabled:opacity-0 ${isSelected ? 'border-[#c5a059] bg-[#c5a059]/10' : 'border-white/5 bg-[#05070a]/70 hover:border-[#c5a059]/30'} ${isToday ? 'shadow-[0_0_0_1px_rgba(197,160,89,0.25)]' : ''}`}
                                    >
                                        {day && (
                                            <>
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-xs font-black ${isToday ? 'text-[#c5a059]' : 'text-white/70'}`}>{day.getDate()}</span>
                                                    {dayItems.length > 0 && <span className="text-[8px] font-black text-black bg-[#c5a059] px-2 py-0.5 rounded-full">{dayItems.length}</span>}
                                                </div>
                                                <div className="space-y-1">
                                                    {dayItems.slice(0, 3).map(item => (
                                                        <div key={item.id} className="truncate rounded-lg px-2 py-1 text-[8px] font-black uppercase tracking-wider text-black" style={{ backgroundColor: typeStyles[item.type].color }}>
                                                            {item.title}
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <aside className="xl:col-span-4 space-y-8">
                        <form onSubmit={handleSubmit} className="bg-[#0f111a] border border-[#c5a059]/15 rounded-[2rem] p-6 md:p-8">
                            <div className="flex items-center justify-between mb-7">
                                <h3 className="font-serif italic text-3xl">{editingId ? 'Editar pieza' : 'Nueva pieza'}</h3>
                                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData(emptyForm(selectedDate)); }} className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white">Cancelar</button>}
                            </div>

                            <div className="space-y-4">
                                <input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título del contenido" className="w-full bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50" />
                                <input type="date" value={formData.date} onChange={(e) => { setFormData({ ...formData, date: e.target.value }); setSelectedDate(e.target.value); }} className="w-full bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50" />
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as CalendarType })} className="bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50">
                                        {TYPES.map(type => <option key={type}>{type}</option>)}
                                    </select>
                                    <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as CalendarStatus })} className="bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50">
                                        {STATUSES.map(status => <option key={status}>{status}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={formData.platform} onChange={(e) => setFormData({ ...formData, platform: e.target.value })} className="bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50">
                                        {PLATFORMS.map(platform => <option key={platform}>{platform}</option>)}
                                    </select>
                                    <select value={formData.artist} onChange={(e) => setFormData({ ...formData, artist: e.target.value })} className="bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50">
                                        <option>Diosmasgym</option>
                                        <option>Juan 614</option>
                                        <option>Ambos</option>
                                        <option>Comunidad</option>
                                    </select>
                                </div>
                                <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notas, copy, hook, CTA o idea visual..." className="w-full min-h-[120px] bg-[#05070a] border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-[#c5a059]/50 resize-none" />
                            </div>

                            <button type="submit" className="w-full mt-6 py-5 bg-[#c5a059] text-black text-[10px] font-black uppercase tracking-[0.35em] hover:bg-white transition-all disabled:opacity-30" disabled={!formData.title.trim()}>
                                {editingId ? 'Guardar Cambios' : 'Agregar al Calendario'}
                            </button>
                        </form>

                        <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 md:p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-6">Día seleccionado</h3>
                            <p className="font-serif italic text-3xl mb-6">{new Date(`${selectedDate}T00:00:00`).toLocaleDateString('es-US', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                            <div className="space-y-3">
                                {selectedItems.length === 0 && <p className="text-white/25 text-sm">No hay contenido programado para este día.</p>}
                                {selectedItems.map(item => (
                                    <div key={item.id} className="bg-[#05070a] border border-white/5 rounded-2xl p-4 group">
                                        <div className="flex items-start justify-between gap-4 mb-3">
                                            <div>
                                                <p className="text-white font-bold">{item.title}</p>
                                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30">{item.artist} · {item.platform} · {item.status}</p>
                                            </div>
                                            <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => editItem(item)} className="text-[#c5a059] hover:text-white"><i className="fas fa-pen"></i></button>
                                                <button onClick={() => deleteItem(item.id)} className="text-red-400 hover:text-red-300"><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>
                                        <span className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-black" style={{ backgroundColor: typeStyles[item.type].color }}>
                                            <i className={`fas ${typeStyles[item.type].icon}`}></i>{item.type}
                                        </span>
                                        {item.notes && <p className="mt-3 text-white/35 text-xs leading-relaxed">{item.notes}</p>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-[#0f111a] border border-white/5 rounded-[2rem] p-6 md:p-8">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#c5a059] mb-6">Próxima agenda</h3>
                            <div className="space-y-4">
                                {upcomingItems.length === 0 && <p className="text-white/25 text-sm">Todavía no hay próximos contenidos.</p>}
                                {upcomingItems.map(item => (
                                    <button key={item.id} onClick={() => editItem(item)} className="w-full flex items-center gap-4 text-left group">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-black shrink-0" style={{ backgroundColor: typeStyles[item.type].color }}>
                                            <i className={`fas ${typeStyles[item.type].icon}`}></i>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate group-hover:text-[#c5a059] transition-colors">{item.title}</p>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-white/25">{item.date} · {item.type}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default ContentCalendar;
