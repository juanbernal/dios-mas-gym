import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import { rasterizeIconsForCanvas } from '../../services/canvasIcons';
import { fetchMusicCatalog } from "../../services/musicService";
import { generateSocialCaption, SocialCaptionResult } from "../../services/geminiService";
import { MusicItem } from "../../types";
import { getCorsFriendlyUrl } from "../../services/imageHelpers";

const sizes = {
  instagram: { w: 500, h: 650, title: 32 },
  story: { w: 500, h: 900, title: 42 },
  post: { w: 900, h: 600, title: 36 },
  square: { w: 600, h: 600, title: 34 },
  youtube: { w: 960, h: 540, title: 34 },
};
type SizeKey = keyof typeof sizes;

const sizeLabels: Record<SizeKey, { label: string; hint: string }> = {
  instagram: { label: '4:5 Feed', hint: 'Instagram / Facebook' },
  story: { label: '9:16 Story', hint: 'Stories / Reels / TikTok' },
  post: { label: '3:2 Post', hint: 'Horizontal' },
  square: { label: '1:1', hint: 'Cuadrado' },
  youtube: { label: '16:9', hint: 'YouTube / Portada' },
};

// Los navegadores (sobre todo Safari) fallan con canvas de mas de ~16 MP: se limita
// el master por area en vez de por ancho fijo (una story a 3840 px de ancho eran 26 MP).
const MAX_MASTER_PIXELS = 16_000_000;
const MAX_MASTER_WIDTH = 3840;
const getMasterWidth = (key: SizeKey): number => {
  const { w, h } = sizes[key];
  return Math.min(MAX_MASTER_WIDTH, Math.floor(Math.sqrt(MAX_MASTER_PIXELS * w / h)));
};
const PROMO_EXPORT_WIDTHS = {
  share: 1440,
  social: 2160,
};

// Zona que Instagram/TikTok tapan con su interfaz en una story de 1080x1920 (px)
const STORY_SAFE_ZONE = { top: 250, bottom: 340, total: 1920 };

// Fondos de estudio locales (SVG): no dependen de servicios externos ni de CORS al exportar
const svgBg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='1440' height='1800' viewBox='0 0 1440 1800'>${body}</svg>`)}`;
const radial = (id: string, cx: number, cy: number, stops: [number, string][]) =>
  `<defs><radialGradient id='${id}' cx='${cx}%' cy='${cy}%' r='80%'>${stops.map(([o, c]) => `<stop offset='${o}' stop-color='${c}'/>`).join('')}</radialGradient></defs><rect width='100%' height='100%' fill='url(#${id})'/>`;
const LOCAL_BACKGROUNDS = [
  { id: 'studio-dark', label: '🌌 Dark Studio', url: svgBg(radial('a', 50, 28, [[0, '#26345a'], [0.5, '#0c1226'], [1, '#03050a']])) },
  { id: 'gold-abstract', label: '👑 Luxury Gold', url: svgBg(radial('a', 50, 30, [[0, '#8a6a2b'], [0.45, '#2a1e0a'], [1, '#050402']])) },
  { id: 'stage-lights', label: '⚡ Cyber Stage', url: svgBg(radial('a', 30, 20, [[0, '#0e5c6b'], [0.5, '#0a1430'], [1, '#02030a']]) + radial('b', 85, 85, [[0, 'rgba(160,30,200,.45)'], [1, 'rgba(0,0,0,0)']])) },
  { id: 'crimson-steel', label: '🔥 Crimson Steel', url: svgBg(radial('a', 50, 25, [[0, '#7a1414'], [0.5, '#210608'], [1, '#050203']])) },
  { id: 'toxic', label: '☣️ Toxic Green', url: svgBg(radial('a', 50, 25, [[0, '#1d6b12'], [0.5, '#07200a'], [1, '#020503']])) },
];
const PHOTO_BACKGROUNDS = [
  { id: 'gym-dark', label: '🏋️ Hierro & Gym', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1440&auto=format&fit=crop' },
  { id: 'chihuahua-sierra', label: '🌵 Sierra Norte', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?q=80&w=1440&auto=format&fit=crop' },
];

// Texto de cuenta regresiva a partir de la fecha del estreno (dias naturales, hora local)
const getCountdownLabel = (date: string): string => {
  const target = new Date(date.includes('T') ? date : `${date}T12:00:00`);
  if (isNaN(target.getTime())) return '';
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(target) - startOfDay(new Date())) / 86400000);
  if (days < 0) return '';
  if (days === 0) return 'ESTRENO HOY';
  if (days === 1) return 'ESTRENO MAÑANA';
  return `FALTAN ${days} DÍAS`;
};
const STATUS_SUGGESTIONS = ['PRE-SAVE', 'ESTE VIERNES', 'NUEVO SENCILLO', 'ESCÚCHALA YA'];

// Ajustes de estilo que se recuerdan entre sesiones y que los "Looks" pueden cambiar de golpe
const DEFAULT_STYLE: Record<string, any> = {
  template: 'original-v1', colorFilter: 'none', titleFont: 'bebas', titleEffect: 'glow',
  footerStyle: 'minimal', coverMockup: 'vinyl', badgeType: 'biblical-advisory', showLensFlare: false,
  autoColor: true, glow: true,
  grit: 0, noise: false, scanlines: 0, vignette: 0, industrial: false,
  bgBlur: 0, bgBrightness: 100, bgContrast: 100, bgScale: 100,
  watermarkEnabled: false, watermarkStyle: 'diagonal', watermarkText: '#PuroSeñorJesucristoCompa', watermarkOpacity: 12, watermarkSize: 100,
  ribbonStyle: 'none', ribbonText: '#PuroSeñorJesucristoCompa', ribbonColor: 'gold', ribbonOpacity: 90,
  watermarkLogo: 'none', watermarkLogoPos: 'top-left', watermarkLogoOpacity: 75, watermarkLogoScale: 100,
  customFooterUrl: '', exportFormat: 'png', exportQuality: 0.92, size: 'instagram', statusCountdown: false,
};
const STYLE_STORAGE_KEY = 'promo_studio_style_v1';
const CUSTOM_LOOKS_KEY = 'promo_studio_custom_looks_v1';
// Ajustes que forman parte de un "look" (los que guarda "Guardar mi look actual")
const LOOK_KEYS = ['template', 'colorFilter', 'titleFont', 'titleEffect', 'footerStyle', 'coverMockup', 'badgeType', 'showLensFlare', 'autoColor'];

// "Looks": un clic aplica plantilla + filtro + tipografia + portada + footer + sello
const LOOKS: { id: string; label: string; icon: string; color: string; style: Record<string, any> }[] = [
  { id: 'estreno-gold', label: 'Estreno Gold', icon: 'fa-crown', color: '#c5a059',
    style: { template: 'original-v1', colorFilter: 'warm-gold', titleFont: 'bebas', titleEffect: 'gold', coverMockup: 'vinyl', footerStyle: 'minimal', badgeType: 'exclusive' } },
  { id: 'urbano-crimson', label: 'Urbano Crimson', icon: 'fa-fire', color: '#ff4444',
    style: { template: 'beat-crimson', colorFilter: 'none', titleFont: 'anton', titleEffect: 'solid', coverMockup: 'flat', footerStyle: 'record', badgeType: 'biblical-advisory' } },
  { id: 'cyber', label: 'Cyber Electric', icon: 'fa-bolt', color: '#00f2ff',
    style: { template: 'beat-cyber', colorFilter: 'midnight-blue', titleFont: 'grotesk', titleEffect: 'glow', coverMockup: 'cd', footerStyle: 'glass', badgeType: 'hires' } },
  { id: 'platinum', label: 'Platinum Elegante', icon: 'fa-gem', color: '#e5e4e2',
    style: { template: 'beat-platinum', colorFilter: 'none', titleFont: 'cinzel', titleEffect: 'chrome', coverMockup: 'frame', footerStyle: 'minimal', badgeType: 'none' } },
  { id: 'toxic', label: 'Toxic Sierra', icon: 'fa-biohazard', color: '#39ff14',
    style: { template: 'beat-toxic', colorFilter: 'bleach-bypass', titleFont: 'bebas', titleEffect: 'glow', coverMockup: 'vinyl', footerStyle: 'qr', badgeType: 'chihuahua' } },
  { id: 'limpio', label: 'Limpio', icon: 'fa-circle-half-stroke', color: '#ffffff',
    style: { template: 'original-v1', colorFilter: 'none', titleFont: 'bebas', titleEffect: 'solid', coverMockup: 'flat', footerStyle: 'minimal', badgeType: 'none', showLensFlare: false } },
];
const LOOK_RESET = { grit: 0, noise: false, scanlines: 0, vignette: 0, industrial: false, watermarkEnabled: false, ribbonStyle: 'none', showLensFlare: false };

const countryOptions = [
  { name: 'GLOBAL (TODAS)', flag: '🌎', iso: 'un' },
  { name: 'México', flag: '🇲🇽', iso: 'mx' },
  { name: 'Estados Unidos', flag: '🇺🇸', iso: 'us' },
  { name: 'Colombia', flag: '🇨🇴', iso: 'co' },
  { name: 'Argentina', flag: '🇦🇷', iso: 'ar' },
  { name: 'España', flag: '🇪🇸', iso: 'es' },
  { name: 'Chile', flag: '🇨🇱', iso: 'cl' },
  { name: 'Puerto Rico', flag: '🇵🇷', iso: 'pr' },
  { name: 'Guatemala', flag: '🇬🇹', iso: 'gt' },
  { name: 'El Salvador', flag: '🇸🇻', iso: 'sv' }
];

// UTILITY TO CONVERT RGB TO HEX
const rgbToHex = (r: number, g: number, b: number): string => {
  const clamp = (val: number) => Math.max(0, Math.min(255, val));
  return "#" + [clamp(r), clamp(g), clamp(b)].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
};

// COLOR / CONTRASTE (WCAG)
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.padEnd(6, '0');
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
};
const relLuminance = (r: number, g: number, b: number): number => {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrastRatio = (l1: number, l2: number): number => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
const mixRgb = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hslToHex = (h: number, s: number, l: number): string => {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return rgbToHex(f(0), f(8), f(4));
};

// BIBLIA API DATA & PRESETS
const BIBLE_BOOKS: Record<string, { apiName: string; prettyName: string; chapters: number }> = {
  genesis: { apiName: "genesis", prettyName: "Génesis", chapters: 50 },
  josue: { apiName: "josue", prettyName: "Josué", chapters: 24 },
  salmos: { apiName: "salmos", prettyName: "Salmos", chapters: 150 },
  proverbios: { apiName: "proverbios", prettyName: "Proverbios", chapters: 31 },
  isaias: { apiName: "isaias", prettyName: "Isaías", chapters: 66 },
  jeremias: { apiName: "jeremias", prettyName: "Jeremías", chapters: 52 },
  romanos: { apiName: "romanos", prettyName: "Romanos", chapters: 16 },
  "1-corintios": { apiName: "1-corintios", prettyName: "1 Corintios", chapters: 16 },
  efesios: { apiName: "efesios", prettyName: "Efesios", chapters: 6 },
  filipenses: { apiName: "filipenses", prettyName: "Filipenses", chapters: 4 },
  hebreos: { apiName: "hebreos", prettyName: "Hebreos", chapters: 13 },
  santiago: { apiName: "santiago", prettyName: "Santiago", chapters: 5 },
  "1-pedro": { apiName: "1-pedro", prettyName: "1 Pedro", chapters: 5 },
  "1-juan": { apiName: "1-juan", prettyName: "1 Juan", chapters: 5 },
  mateo: { apiName: "mateo", prettyName: "Mateo", chapters: 28 },
  juan: { apiName: "juan", prettyName: "Juan", chapters: 21 }
};

const DGM_FAVORITE_BOOKS = ["josue", "salmos", "proverbios", "romanos", "1-corintios", "efesios", "filipenses", "isaias", "hebreos", "santiago"];
const JUAN_FAVORITE_BOOKS = ["salmos", "proverbios", "filipenses", "efesios", "juan", "mateo", "1-juan", "romanos"];

const PRESET_VERSES = [
  { ref: "Filipenses 4:13", text: "Todo lo puedo en Cristo que me fortalece." },
  { ref: "Juan 6:14", text: "Este verdaderamente es el profeta que había de venir al mundo." },
  { ref: "Josué 1:9", text: "Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes." },
  { ref: "Salmos 27:1", text: "Jehová es mi luz y mi salvación; ¿de quién temeré?" },
  { ref: "Proverbios 3:5", text: "Confía en Jehová con todo tu corazón, y no te apoyes en tu propia prudencia." },
  { ref: "Romanos 8:31", text: "Si Dios es por nosotros, ¿quién contra nosotros?" },
  { ref: "Salmos 46:1", text: "Dios es nuestro refugio y fortaleza, nuestro pronto auxilio en las tribulaciones." },
  { ref: "Mateo 19:26", text: "Para los hombres esto es imposible; mas para Dios todo es posible." },
  { ref: "2 Timoteo 1:7", text: "No nos ha dado Dios espíritu de cobardía, sino de poder, de amor y de dominio propio." },
  { ref: "Isaías 40:31", text: "Los que esperan en Jehová tendrán nuevas fuerzas; levantarán alas como las águilas." },
  { ref: "Salmos 23:1", text: "Jehová es mi pastor; nada me faltará." },
  { ref: "Jeremías 29:11", text: "Porque yo sé los pensamientos que tengo acerca de vosotros, pensamientos de paz, y no de mal." },
  { ref: "Salmos 28:7", text: "Jehová es mi fortaleza y mi escudo; en él confió mi corazón, y fui ayudado." },
  { ref: "1 Corintios 9:26", text: "De esta manera corro, no como a la ventura; de esta manera peleo, no como quien golpea el aire." }
];

// UTILITY TO UPGRADE ALL EXTERNAL URLS TO ABSOLUTE ORIGINAL RESOLUTION AND PROXY THEM FOR CORS SAFETY
const getHighResUrl = (url: string | null): string | null => {
  if (!url) return null;
  return getCorsFriendlyUrl(url);
};

const PromoImageApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("CARGANDO CANCIÓN...");
  const [artist, setArtist] = useState("Diosmasgym");
  const [bg, setBg] = useState<string | null>(null);
  const [coverArt, setCoverArt] = useState<string | null>(null); // portada del mockup (independiente del fondo)
  const [mode, setMode] = useState("proximamente");
  const [size, setSize] = useState<SizeKey>("instagram");
  const sizeRef = useRef<SizeKey>("instagram");
  const overlayColorRef = useRef("#000000");
  const previewBoxRef = useRef<HTMLDivElement>(null);
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [renderMaster, setRenderMaster] = useState(false); // el master 4K solo existe mientras se exporta
  const [hydrated, setHydrated] = useState(false);
  const [statusText, setStatusText] = useState(""); // texto del sello superior (vacio = automatico)
  const [statusCountdown, setStatusCountdown] = useState(false); // cuenta regresiva automatica en "proximamente"
  const [customLooks, setCustomLooks] = useState<{ id: string; label: string; style: Record<string, any> }[]>([]);
  const [bgAvg, setBgAvg] = useState<[number, number, number] | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState("");
  const [date, setDate] = useState("2026-04-05T23:00");
  const [overlay, setOverlay] = useState(0.65);
  const [tracks, setTracks] = useState("INTRO\nTEMA UNO\nTEMA DOS");
  const [textColor, setTextColor] = useState("#ffffff");
  const [contrastColor, setContrastColor] = useState("#000000");
  const [glow, setGlow] = useState(true);
  const [stroke, setStroke] = useState(false); // Default to false for solid look
  const containerRef = useRef<HTMLDivElement>(null);
  const masterRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [catalog, setCatalog] = useState<MusicItem[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // NEW AESTHETICS 2026
  const [template, setTemplate] = useState("original-v1");
  const [grit, setGrit] = useState(0.0); // Clean background by default (0% grit)
  const [noise, setNoise] = useState(false); // No grain by default
  const [scanlines, setScanlines] = useState(0.0); // No scanlines by default
  const [vignette, setVignette] = useState(0.0); // No vignette by default
  const [industrial, setIndustrial] = useState(false);
  const [autoColor, setAutoColor] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false); // Progress feedback state
  const [country, setCountry] = useState(countryOptions[0]);

  // SOCIAL SHARE PANEL STATE
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [aiCaption, setAiCaption] = useState("");
  const [aiHashtags, setAiHashtags] = useState("");
  const [shareImageBlob, setShareImageBlob] = useState<Blob | null>(null);
  const [copySuccess, setCopySuccess] = useState("");
  const [songId, setSongId] = useState<string>("");

  // NUEVAS MEJORAS 2026 (v4.5)
  const [slogan, setSlogan] = useState(""); // #2 Versículo / Slogan opcional
  const [isLoadingVerse, setIsLoadingVerse] = useState(false); // Cargando versículo de API
  const [showVerseModal, setShowVerseModal] = useState(false); // Modal biblioteca de versículos
  const [overlayColor, setOverlayColor] = useState("#000000"); // #3 Color de overlay (antes solo negro)
  const [customFooterUrl, setCustomFooterUrl] = useState(""); // #8 URL personalizable en footer
  const [exportFormat, setExportFormat] = useState<"png" | "jpeg">("png"); // #9 Formato de exportación
  const [exportQuality, setExportQuality] = useState(0.92); // #9 Calidad de exportación JPEG
  const [quickCopySuccess, setQuickCopySuccess] = useState(""); // #1 Toast del botón rápido de copia

  // NUEVAS MEJORAS PRO v5.0 & v5.5 (FONDO & MARCA DE AGUA MANDO EJECUTIVO)
  const [footerStyle, setFooterStyle] = useState<'glass' | 'record' | 'qr' | 'minimal'>('minimal');
  const [coverMockup, setCoverMockup] = useState<'flat' | 'vinyl' | 'cd' | 'frame'>('vinyl');
  const [titleFont, setTitleFont] = useState<'bebas' | 'cinzel' | 'grotesk' | 'anton'>('bebas');
  const [titleEffect, setTitleEffect] = useState<'glow' | 'gold' | 'chrome' | 'solid'>('glow');
  const [badgeType, setBadgeType] = useState<'none' | 'biblical-advisory' | 'exclusive' | 'hires' | 'chihuahua'>('biblical-advisory');
  const [colorFilter, setColorFilter] = useState<'none' | 'warm-gold' | 'midnight-blue' | 'bleach-bypass' | 'vintage' | 'noir'>('none');
  const [showLensFlare, setShowLensFlare] = useState<boolean>(false);

  // ESTADOS DE FONDO & TEXTURAS HD
  const [bgBlur, setBgBlur] = useState<number>(0);
  const [bgBrightness, setBgBrightness] = useState<number>(100);
  const [bgContrast, setBgContrast] = useState<number>(100);
  const [bgScale, setBgScale] = useState<number>(100);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  // ESTADOS DE MARCA DE AGUA & LISTONES (SUITE MANDO EJECUTIVO)
  const [watermarkEnabled, setWatermarkEnabled] = useState<boolean>(false);
  const [watermarkStyle, setWatermarkStyle] = useState<'diagonal' | 'tiled' | 'center'>('diagonal');
  const [watermarkText, setWatermarkText] = useState<string>('#PuroSeñorJesucristoCompa');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(12);
  const [watermarkSize, setWatermarkSize] = useState<number>(100);

  const [ribbonStyle, setRibbonStyle] = useState<'none' | 'bottom' | 'top' | 'diagonal-left'>('none');
  const [ribbonText, setRibbonText] = useState<string>('#PuroSeñorJesucristoCompa');
  const [ribbonColor, setRibbonColor] = useState<'gold' | 'black' | 'white' | 'red' | 'blue' | 'green'>('gold');
  const [ribbonOpacity, setRibbonOpacity] = useState<number>(90);

  const [watermarkLogo, setWatermarkLogo] = useState<'none' | 'mando' | 'diosmasgym' | 'juan614'>('none');
  const [watermarkLogoPos, setWatermarkLogoPos] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('top-left');
  const [watermarkLogoOpacity, setWatermarkLogoOpacity] = useState<number>(75);
  const [watermarkLogoScale, setWatermarkLogoScale] = useState<number>(100);

  useEffect(() => { sizeRef.current = size; }, [size]);
  useEffect(() => { overlayColorRef.current = overlayColor; }, [overlayColor]);

  // ESTILO: aplicar / recordar / restablecer
  const styleSetters: Record<string, (v: any) => void> = {
    template: setTemplate, colorFilter: setColorFilter, titleFont: setTitleFont, titleEffect: setTitleEffect,
    footerStyle: setFooterStyle, coverMockup: setCoverMockup, badgeType: setBadgeType, showLensFlare: setShowLensFlare,
    autoColor: setAutoColor, glow: setGlow,
    grit: setGrit, noise: setNoise, scanlines: setScanlines, vignette: setVignette, industrial: setIndustrial,
    bgBlur: setBgBlur, bgBrightness: setBgBrightness, bgContrast: setBgContrast, bgScale: setBgScale,
    watermarkEnabled: setWatermarkEnabled, watermarkStyle: setWatermarkStyle, watermarkText: setWatermarkText,
    watermarkOpacity: setWatermarkOpacity, watermarkSize: setWatermarkSize,
    ribbonStyle: setRibbonStyle, ribbonText: setRibbonText, ribbonColor: setRibbonColor, ribbonOpacity: setRibbonOpacity,
    watermarkLogo: setWatermarkLogo, watermarkLogoPos: setWatermarkLogoPos,
    watermarkLogoOpacity: setWatermarkLogoOpacity, watermarkLogoScale: setWatermarkLogoScale,
    customFooterUrl: setCustomFooterUrl, exportFormat: setExportFormat, exportQuality: setExportQuality, size: setSize,
    statusCountdown: setStatusCountdown,
  };
  const applyStyle = (s: Record<string, any>) => {
    Object.entries(s).forEach(([k, v]) => styleSetters[k]?.(v));
  };
  const currentStyle: Record<string, any> = {
    template, colorFilter, titleFont, titleEffect, footerStyle, coverMockup, badgeType, showLensFlare,
    autoColor, glow, grit, noise, scanlines, vignette, industrial,
    bgBlur, bgBrightness, bgContrast, bgScale,
    watermarkEnabled, watermarkStyle, watermarkText, watermarkOpacity, watermarkSize,
    ribbonStyle, ribbonText, ribbonColor, ribbonOpacity,
    watermarkLogo, watermarkLogoPos, watermarkLogoOpacity, watermarkLogoScale,
    customFooterUrl, exportFormat, exportQuality, size, statusCountdown,
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STYLE_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        // Solo se aceptan claves conocidas
        applyStyle(Object.fromEntries(Object.entries(saved).filter(([k]) => k in DEFAULT_STYLE)));
      }
    } catch (e) { console.warn("No se pudo leer el estilo guardado:", e); }
    try {
      const rawLooks = localStorage.getItem(CUSTOM_LOOKS_KEY);
      if (rawLooks) {
        const parsed = JSON.parse(rawLooks);
        if (Array.isArray(parsed)) setCustomLooks(parsed.filter(l => l && l.id && l.label && l.style));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const currentStyleJson = JSON.stringify(currentStyle);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STYLE_STORAGE_KEY, currentStyleJson); } catch { /* cuota / modo privado */ }
  }, [currentStyleJson, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(CUSTOM_LOOKS_KEY, JSON.stringify(customLooks)); } catch { /* ignore */ }
  }, [customLooks, hydrated]);

  const handleSaveLook = () => {
    const name = window.prompt('Nombre para tu look:');
    if (!name || !name.trim()) return;
    const style = Object.fromEntries(LOOK_KEYS.map(k => [k, currentStyle[k]]));
    setCustomLooks(list => [...list, { id: 'custom-' + Date.now(), label: name.trim().slice(0, 24), style }]);
  };

  const handleResetStyle = () => {
    applyStyle(DEFAULT_STYLE);
    try { localStorage.removeItem(STYLE_STORAGE_KEY); } catch { /* ignore */ }
  };

  // El QR se descarga una vez como data-URL: exportar no depende de un servicio externo en ese momento
  const smartLinkForQr = songId
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/link/${songId}`
    : (artist.toLowerCase().includes('juan') ? 'https://juan614.diosmasgym.com' : 'https://musica.diosmasgym.com');
  useEffect(() => {
    let cancelled = false;
    setQrDataUrl(null);
    (async () => {
      try {
        const res = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smartLinkForQr)}&bgcolor=000000&color=ffffff&margin=1`);
        if (!res.ok) return;
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch { /* se usa la URL remota como respaldo */ }
    })();
    return () => { cancelled = true; };
  }, [smartLinkForQr]);

  // FUNCIÓN PARA TRAER VERSÍCULO DE LA API DE LA BIBLIA (rv1960)
  const fetchRandomBibleVerse = async (targetArtist?: string) => {
    setIsLoadingVerse(true);
    const isJuan = (targetArtist || artist).toLowerCase().includes("juan");
    const booksList = isJuan ? JUAN_FAVORITE_BOOKS : DGM_FAVORITE_BOOKS;
    let success = false;
    let attempts = 0;
    
    while (attempts < 3 && !success) {
      attempts++;
      try {
        const randomBookKey = booksList[Math.floor(Math.random() * booksList.length)];
        const bookData = BIBLE_BOOKS[randomBookKey];
        if (!bookData) continue;
        const randomChapter = Math.floor(Math.random() * bookData.chapters) + 1;
        const url = `https://bible-api.deno.dev/api/read/rv1960/${bookData.apiName}/${randomChapter}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        if (data && data.vers && Array.isArray(data.vers) && data.vers.length > 0) {
          const randomVerseObj = data.vers[Math.floor(Math.random() * data.vers.length)];
          const cleanText = randomVerseObj.verse.replace(/^["'\s]+|["'\s]+$/g, '').trim();
          const citation = `${bookData.prettyName} ${randomChapter}:${randomVerseObj.number}`;
          setSlogan(`"${cleanText}" · ${citation}`);
          success = true;
        }
      } catch (e) {
        console.warn("Bible API attempt error:", e);
      }
    }

    if (!success) {
      const preset = PRESET_VERSES[Math.floor(Math.random() * PRESET_VERSES.length)];
      setSlogan(`"${preset.text}" · ${preset.ref}`);
    }
    setIsLoadingVerse(false);
  };



  // REFS PARA EVITAR CLAUSURAS DESACTUALIZADAS (Fijar datos en memoria real)
  // Esto garantiza que handleSendToMake siempre vea lo que hay en pantalla actualmente
  const titleRef = useRef(title);
  const artistRef = useRef(artist);
  const modeRef = useRef(mode);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { artistRef.current = artist; }, [artist]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const loadCatalog = async () => {
      setIsLoadingCatalog(true);
      try {
        const [dM, j6] = await Promise.all([
          fetchMusicCatalog('diosmasgym'),
          fetchMusicCatalog('juan614')
        ]);
        const fullCatalog = [...dM, ...j6];
        setCatalog(fullCatalog);

        // 1. Prioridad: Canción pasada desde el Asistente
        const incomingSong = location.state?.song as MusicItem;
        if (incomingSong) {
          handleSelectSong(incomingSong);
          return;
        }

        // 2. Fallback: Aleatorio si no viene nada
        if (fullCatalog.length > 0) {
          const song = fullCatalog[Math.floor(Math.random() * fullCatalog.length)];
          handleSelectSong(song);
        }
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        setIsLoadingCatalog(false);
      }
    };
    loadCatalog();
  }, [location.state?.song]);

  useEffect(() => {
    if (location.state?.autoShare && title !== "CARGANDO CANCIÓN..." && !showSharePanel) {
      handleOpenSharePanel();
      window.history.replaceState({}, document.title);
    }
  }, [location.state?.autoShare, title, showSharePanel]);

  const handleSelectSong = (song: MusicItem) => {
    let normalizedArtist = song.artist;
    if (normalizedArtist.toLowerCase().includes("juan")) normalizedArtist = "Juan 614";
    if (normalizedArtist.toLowerCase().includes("dios")) normalizedArtist = "Diosmasgym";

    setTitle(song.name.toUpperCase());
    setArtist(normalizedArtist);
    setBg(song.cover);
    setCoverArt(song.cover);
    setSongId(song.id || "");
    setMode("disponible");
    setSize("instagram");
    setSearchQuery("");
    setIsSearchOpen(false);
    fetchRandomBibleVerse(normalizedArtist);
  };

  const handleRandomFromCatalog = () => {
    if (catalog.length === 0) return;
    const song = catalog[Math.floor(Math.random() * catalog.length)];
    handleSelectSong(song);
  };

  const filteredCatalog = catalog.filter(song => 
    song.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 10);

  const config = sizes[size];

  // La vista previa se ajusta al espacio real disponible (ancho y alto), no a un ancho fijo de 500 px
  useEffect(() => {
    const box = previewBoxRef.current;
    if (!box) return;
    const updateScale = () => {
      const availW = Math.max(200, box.clientWidth - 48);
      // Solo en escritorio la caja tiene alto fijo (preview sticky); en movil crece con la imagen
      const isLg = typeof window.matchMedia === 'function' ? window.matchMedia('(min-width: 1024px)').matches : true;
      const availH = isLg ? Math.max(240, box.clientHeight - 80 - 48) : Infinity; // padding inferior (botones de formato) + aire
      setScale(Math.min(availW / config.w, availH / config.h, 1.6));
    };
    updateScale();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScale) : null;
    ro?.observe(box);
    window.addEventListener('resize', updateScale);
    return () => { ro?.disconnect(); window.removeEventListener('resize', updateScale); };
  }, [config.w, config.h]);

  useEffect(() => {
    if (!bg) return;
    const img = new Image();
    img.crossOrigin = "anonymous"; 
    img.onerror = () => {
      console.warn("⚠️ [AUTO-COLOR] Error cargando imagen para análisis. Fallback.");
      if (autoColor) setContrastColor("#c5a059");
    };
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const N = 24;
        canvas.width = N;
        canvas.height = N;
        ctx.drawImage(img, 0, 0, N, N);
        const data = ctx.getImageData(0, 0, N, N).data;

        // Promedio (para saber cuanta luz hay) + color "vibrante" ponderado por saturacion
        // (el promedio simple mezcla todo y sale un marron/gris apagado como acento)
        let r = 0, g = 0, b = 0, vr = 0, vg = 0, vb = 0, vw = 0;
        const pixelCount = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          const pr = data[i], pg = data[i + 1], pb = data[i + 2];
          r += pr; g += pg; b += pb;
          const [, s, l] = rgbToHsl(pr, pg, pb);
          const w = s * (1 - Math.abs(l - 0.5) * 2);
          vr += pr * w; vg += pg * w; vb += pb * w; vw += w;
        }
        const avg: [number, number, number] = [Math.round(r / pixelCount), Math.round(g / pixelCount), Math.round(b / pixelCount)];
        const brightness = (avg[0] + avg[1] + avg[2]) / 3;
        setBgAvg(avg);

        if (autoColor) {
          // Acento: matiz dominante de la portada, saturado y claro para que destaque sobre el overlay
          if (vw > 10) {
            const [h, s] = rgbToHsl(vr / vw, vg / vw, vb / vw);
            setContrastColor(hslToHex(h, Math.max(s, 0.55), 0.62));
          } else {
            setContrastColor("#c5a059"); // portada sin color (blanco y negro): dorado de la marca
          }

          // Texto y oscurecimiento: el minimo overlay que garantiza contraste WCAG AA (4.5:1)
          const ovRgb = hexToRgb(overlayColorRef.current);
          const darkText = relLuminance(...ovRgb) > 0.6; // overlay claro => texto oscuro
          const textRgb: [number, number, number] = darkText ? [11, 13, 18] : [248, 245, 238];
          const textLum = relLuminance(...textRgb);
          let chosen = 0.9;
          for (let ov = 0.45; ov <= 0.9001; ov += 0.05) {
            if (contrastRatio(relLuminance(...mixRgb(avg, ovRgb, ov)), textLum) >= 4.5) { chosen = ov; break; }
          }
          setOverlay(Math.round(chosen * 100) / 100);
          setTextColor(rgbToHex(...textRgb));
          setGlow(true);
        } else {
          setOverlay(brightness > 140 ? 0.75 : 0.45);
        }
      } catch (err) {
        console.warn("⚠️ [AUTO-COLOR] Error en análisis. Fallback.");
        if (autoColor) setContrastColor("#c5a059");
      }
    };
    img.src = getCorsFriendlyUrl(bg) || bg;
  }, [bg, autoColor]);

  // ASYNC PREPARE CANVAS: Ghost Master Engine (Native 4K Native Resolution)
  // Las exportaciones se encolan: el master se monta/desmonta y dos a la vez se pisarian
  const exportLockRef = useRef<Promise<unknown>>(Promise.resolve());
  const prepareCanvas = (customScale = 1): Promise<HTMLCanvasElement> => {
    const run = exportLockRef.current.catch(() => {}).then(() => renderMasterCanvas(customScale));
    exportLockRef.current = run;
    return run;
  };

  const renderMasterCanvas = async (customScale: number): Promise<HTMLCanvasElement> => {
    const exportSize = sizeRef.current;
    const masterW = getMasterWidth(exportSize);
    console.log("[MASTER] MONTANDO MASTER BAJO DEMANDA...");

    // El master 4K solo existe mientras se exporta (antes vivia siempre y se redibujaba con cada slider)
    setRenderMaster(true);
    try {
      let captureEl: HTMLElement | null = null;
      for (let i = 0; i < 40 && !captureEl; i++) {
        await new Promise(r => setTimeout(r, 50));
        const el = masterRef.current?.querySelector('.promo-master-target') as HTMLElement | null;
        // debe estar montado con el tamano del formato pedido
        if (el && Math.abs(el.offsetWidth - masterW) < 2) captureEl = el;
      }
      if (!captureEl) throw new Error("No se pudo montar el master. Intenta de nuevo.");
      return await captureMaster(captureEl, customScale, exportSize, masterW);
    } finally {
      setRenderMaster(false);
    }
  };

  const captureMaster = async (captureEl: HTMLElement, customScale: number, exportSize: SizeKey, masterW: number): Promise<HTMLCanvasElement> => {

    // 1. Force Load ALL Images in the Master Render
    const images = Array.from(captureEl.querySelectorAll('img, [style*="background-image"]'));
    await Promise.all(images.map(img => {
      let src = "";
      if (img instanceof HTMLImageElement) {
        src = img.src;
      } else {
        const bgStyle = (img as HTMLElement).style.backgroundImage;
        const match = bgStyle.match(/url\(['"]?([^'"]+)['"]?\)/);
        src = match ? match[1] : "";
      }
      
      if (!src || src === 'none' || src === '""') return Promise.resolve();
      
      return new Promise(resolve => {
        const testImg = new Image();
        testImg.crossOrigin = "anonymous";
        const t = setTimeout(() => resolve(false), 20000); 
        testImg.onload = () => { clearTimeout(t); resolve(true); };
        testImg.onerror = () => { clearTimeout(t); resolve(false); };
        testImg.src = src;
      });
    }));

    // 1.5 Stabilization Wait (Browser rasterization at high-res)
    // 2. Fuentes: se piden explicitamente las del titulo (fonts.ready no espera a las aun no usadas)
    try {
      if (typeof document !== 'undefined') {
        await Promise.all(['Bebas Neue', 'Anton', 'DM Serif Display', 'Space Grotesk', 'Inter'].map(f => document.fonts.load(`700 40px "${f}"`).catch(() => [])));
        await document.fonts.ready;
      }
    } catch (e) { console.warn("Font loading fallback."); }

    // 3. Dos frames para que el navegador termine de pintar el master (antes: espera fija de 2 s)
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    await new Promise(r => setTimeout(r, 350));

    console.log("[MASTER] CAPTURING MASTER...");

    return await html2canvas(captureEl, {
      scale: customScale, // Usually 1 for native master
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      imageTimeout: 15000,
      onclone: (clonedDoc) => {
        // Los iconos son mascaras SVG y html2canvas no las rasteriza
        rasterizeIconsForCanvas(clonedDoc);

        // FONT INJECTION: Critical for 4K Master Parity on Windows/Vercel
        const fontLink = clonedDoc.createElement('link');
        fontLink.rel = 'stylesheet';
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cinzel:wght@600;900&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;700;900&family=Space+Grotesk:wght@400;700;900&family=Satisfy&display=swap';
        clonedDoc.head.appendChild(fontLink);

        const clonedWrapper = clonedDoc.querySelector('.promo-master-target') as HTMLElement;
        if (clonedWrapper) {
          // FORCE EXACT PIXEL DIMENSIONS TO PREVENT 0x0 PATTERN ERRORS
          clonedWrapper.style.transform = 'none';
          clonedWrapper.style.boxShadow = 'none';
          clonedWrapper.style.width = `${masterW}px`;
          clonedWrapper.style.height = `${masterW * (sizes[exportSize].h / sizes[exportSize].w)}px`;
          clonedWrapper.style.display = 'block';
        }

        const findAndFixNoise = (selector: string, multiplier: number) => {
          const el = clonedDoc.querySelector(selector) as HTMLElement;
          if (el) { 
            // PRESERVE ORIGINAL BLEND MODE FROM CSS (No more forcing to 'normal')
            el.style.opacity = (grit * multiplier).toString(); 
          }
        };
        findAndFixNoise('.noise-layer', 0.1);
        findAndFixNoise('.real-grain', 0.12);
        
        // 4. Backdrop-Filter Fallback (Subtle for readability)
        const polyfills = clonedDoc.querySelectorAll('[data-backdrop-polyfill]');
        polyfills.forEach(el => {
          const h = el as HTMLElement;
          h.style.backdropFilter = 'none';
          (h.style as any).webkitBackdropFilter = 'none';
          // Keep the transparent-to-dark radial gradient rather than overlaying a solid dark layer
        });

        // 5. No Global Sharpening (Matches Preview exactly)
        if (clonedWrapper) {
          clonedWrapper.style.filter = 'none'; 
        }
      }
    });
  };

  const prepareCanvasForWidth = async (targetWidth: number) => {
    const masterW = getMasterWidth(sizeRef.current);
    return prepareCanvas(Math.min(1, targetWidth / masterW));
  };

  // SMART LINK REAL — usa la ruta del proyecto igual que SmartLinksAdmin
  const getSmartLink = useCallback(() => {
    if (songId) return `${window.location.origin}/link/${songId}`;
    // Fallback si no hay id (selección manual de imagen)
    return artist.toLowerCase().includes('juan')
      ? 'https://juan614.diosmasgym.com'
      : 'https://musica.diosmasgym.com';
  }, [songId, artist]);

  // OPEN SOCIAL SHARE PANEL
  const handleOpenSharePanel = async () => {
    setShowSharePanel(true);
    setAiCaption(location.state?.presetCaption || "");
    setAiHashtags(location.state?.presetHashtags || "");
    setShareImageBlob(null);
    setIsGeneratingCaption(true);
    try {
      const skipAi = !!(location.state?.presetCaption && location.state?.presetHashtags);
      // Generate image blob and AI caption in parallel
      const [result, canvas] = await Promise.all([
        skipAi ? Promise.resolve({ caption: location.state.presetCaption, hashtags: location.state.presetHashtags }) : generateSocialCaption(title, artist, getSmartLink()),
        prepareCanvasForWidth(PROMO_EXPORT_WIDTHS.share)
      ]);
      if (!skipAi) {
        setAiCaption(result.caption);
        setAiHashtags(result.hashtags);
      }
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.92));
      if (blob) setShareImageBlob(blob);
    } catch (err) {
      console.error("Share panel error:", err);
      // Fallback caption
      if (!location.state?.presetCaption) {
        setAiCaption(`🎵 "${title}" de ${artist} ya disponible!\n\n¡Escúchala ahora! 🎧\n👉 ${getSmartLink()}`);
        setAiHashtags(`#${title.replace(/\s+/g,'')} #${artist.replace(/\s+/g,'')} #DiosMasGym #NuevaMusica #Corridos #MusicaCristiana`);
      }
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleCopyAll = async () => {
    const text = `${aiCaption}\n\n${getSmartLink()}\n\n${aiHashtags}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess("✅ ¡Copiado!");
      setTimeout(() => setCopySuccess(""), 2500);
    } catch {
      setCopySuccess('⚠️ Error al copiar');
      setTimeout(() => setCopySuccess(''), 2500);
    }
  };

  // Copia la imagen generada al portapapeles del sistema
  const handleCopyImage = async () => {
    if (!shareImageBlob) {
      setCopySuccess('⏳ Imagen todavía generándose...');
      setTimeout(() => setCopySuccess(''), 2000);
      return;
    }
    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareImageBlob })]);
        setCopySuccess('🖼️ ¡Imagen copiada! Pégala en cualquier app.');
      } else {
        throw new Error('ClipboardItem not supported');
      }
    } catch {
      if (shareImageBlob) {
        const url = URL.createObjectURL(shareImageBlob);
        const a = document.createElement('a');
        a.download = `PROMO-${title.replace(/\s+/g, '-')}.png`;
        a.href = url; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setCopySuccess('📥 Imagen descargada (portapapeles no disponible en este navegador)');
      }
    }
    setTimeout(() => setCopySuccess(''), 3500);
  };

  const handlePlatformShare = async (platform: 'facebook' | 'twitter' | 'instagram' | 'tiktok') => {
    const smartLink = getSmartLink();
    // Texto limpio: solo caption + hashtags (el link va SEPARADO como url)
    const shareText = `${aiCaption}\n\n${aiHashtags}`;
    // Texto completo para portapapeles (manual paste en desktop)
    const fullText = `${aiCaption}\n\n${smartLink}\n\n${aiHashtags}`;
    const fileName = `PROMO-${title.replace(/\s+/g, '-')}.png`;

    // ──────────────────────────────────────────────────
    // MÓVIL: Web Share API nativa — url va SEPARADO de text
    // ──────────────────────────────────────────────────
    if (shareImageBlob && navigator.share && navigator.canShare) {
      const file = new File([shareImageBlob], fileName, { type: 'image/png' });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title, text: shareText, url: smartLink });
          return; // ¡Éxito en móvil!
        } catch (e) { /* usuario canceló o error, fallback desktop */ }
      }
    }

    // ──────────────────────────────────────────────────
    // DESKTOP: Descargar imagen + copiar texto + abrir plataforma
    // ──────────────────────────────────────────────────

    // Paso 1: Intentar copiar imagen al portapapeles
    let imageCopied = false;
    if (shareImageBlob && typeof ClipboardItem !== 'undefined') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': shareImageBlob })]);
        imageCopied = true;
      } catch { /* permiso negado o HTTPS requerido */ }
    }

    // Paso 2: Descargar imagen (siempre, como respaldo)
    if (shareImageBlob) {
      const blobUrl = URL.createObjectURL(shareImageBlob);
      const a = document.createElement('a');
      a.download = fileName;
      a.href = blobUrl;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    }

    // Paso 3: Copiar texto al portapapeles (sobreescribe la imagen)
    try { await navigator.clipboard.writeText(fullText); } catch { /* ignore */ }

    // Paso 4: Abrir la plataforma
    if (platform === 'twitter') {
      // Twitter: texto corto + link correctamente formateado
      const tweetText = `${aiCaption.substring(0, 220)}\n\n${aiHashtags.split(' ').slice(0, 5).join(' ')}`;
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(smartLink)}`, '_blank');
    } else {
      const platformUrls: Record<string, string> = {
        facebook: 'https://www.facebook.com/',
        instagram: 'https://www.instagram.com/',
        tiktok: 'https://www.tiktok.com/upload'
      };
      window.open(platformUrls[platform], '_blank');
    }

    // Paso 5: Toast de instrucciones
    const platformNames: Record<string, string> = {
      facebook: 'Facebook', twitter: 'Twitter/X', instagram: 'Instagram', tiktok: 'TikTok'
    };
    const msg = imageCopied
      ? `🖼️ Imagen copiada + descargada. Texto copiado. ¡Pégala en ${platformNames[platform]}!`
      : `📥 Imagen descargada. Texto copiado. Súbela en ${platformNames[platform]}.`;
    setCopySuccess(msg);
    setTimeout(() => setCopySuccess(''), 5000);
  };


  // #1 — Quick copy: copia la imagen de la preview directamente al portapapeles
  const handleQuickCopy = async () => {
    setIsGenerating(true);
    try {
      const canvas = await prepareCanvasForWidth(PROMO_EXPORT_WIDTHS.share);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.92));
      if (!blob) throw new Error("Blob failed");
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setQuickCopySuccess("🖼️ ¡Imagen copiada!");
      } else {
        // Fallback: descargar
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `PROMO-${title.replace(/\s+/g, '-')}-quick.png`;
        a.href = url; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setQuickCopySuccess("📥 Imagen descargada");
      }
    } catch (err) {
      setQuickCopySuccess("⚠️ Error al copiar");
    } finally {
      setIsGenerating(false);
      setTimeout(() => setQuickCopySuccess(""), 3000);
    }
  };

  const handleDownload = async (isUltra = true) => {
    setIsGenerating(true);
    const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = exportFormat === 'jpeg' ? exportQuality : 1.0;
    const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
    console.log(`[DOWNLOAD] STARTING ${isUltra ? '4K' : '1:1'} EXPORT (${exportFormat.toUpperCase()})...`);
    try {
      const canvas = await prepareCanvasForWidth(isUltra ? getMasterWidth(sizeRef.current) : PROMO_EXPORT_WIDTHS.social);
      console.log("[DOWNLOAD] CANVAS GENERATED, CREATING BLOB...");
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, mimeType, quality));
      if (!blob) throw new Error("Blob generation failed");

      console.log("[DOWNLOAD] BLOB READY, TRIGGERING DOWNLOAD...");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `PROMO-${title.replace(/\s+/g, '-')}-${isUltra ? '4K' : 'SocialHD'}.${ext}`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      console.log("[DOWNLOAD] PROCESS COMPLETE");
    } catch (e: any) {
      console.error("Critical Export Error:", e);
      alert(`⚠️ Export Error: ${e.message || 'Browser Memory/Connection Issue'}. Try lowering resolution or checking connection.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Todos los formatos de una vez en un ZIP (jszip ya es dependencia del proyecto)
  const handleExportAll = async () => {
    setIsGenerating(true);
    const original = sizeRef.current;
    const mimeType = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    const quality = exportFormat === 'jpeg' ? exportQuality : 1.0;
    const ext = exportFormat === 'jpeg' ? 'jpg' : 'png';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'promo';
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const keys = Object.keys(sizes) as SizeKey[];
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        setExportProgress(`${i + 1}/${keys.length} · ${sizeLabels[k].label}`);
        sizeRef.current = k;
        setSize(k);
        await new Promise(r => setTimeout(r, 400)); // deja que la vista previa se redibuje con el nuevo formato
        const canvas = await prepareCanvasForWidth(PROMO_EXPORT_WIDTHS.social);
        const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, mimeType, quality));
        if (blob) zip.file(`PROMO-${slug}-${k}.${ext}`, blob);
      }
      setExportProgress('Comprimiendo ZIP...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.download = `PROMO-${slug}-todos-los-formatos.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e: any) {
      console.error("Export-all error:", e);
      alert(`⚠️ No se pudo exportar todo: ${e.message || 'error desconocido'}`);
    } finally {
      sizeRef.current = original;
      setSize(original);
      setExportProgress('');
      setIsGenerating(false);
    }
  };

  const handleGoToSnippet = async () => {
    setIsGenerating(true);
    try {
      // Capture the visible preview instead of the ghost 4K master
      // This is much lighter and prevents memory issues
      const previewEl = document.querySelector('.promo-container-wrapper') as HTMLElement;
      if (!previewEl) throw new Error("Preview element not found");

      const canvas = await html2canvas(previewEl, {
        onclone: (clonedDoc: Document) => {
          rasterizeIconsForCanvas(clonedDoc);
          clonedDoc.querySelectorAll('.safe-zone-guide').forEach(el => el.remove());
        },
        scale: 1.5, // Enough for a snippet, light enough for memory
        useCORS: true,
        backgroundColor: '#000',
        logging: false
      });
      
      const dataUrl = canvas.toDataURL('image/png');
      localStorage.setItem('last_generated_promo', dataUrl);
      navigate('/admin/video-snippet', { 
        state: { 
          promoImage: dataUrl
        } 
      });
    } catch (e: any) {
      console.error("Error going to snippet:", e);
      alert("⚠️ No se pudo preparar la imagen automáticamente (CORS o Memoria). Navegando al Snippet Creator...");
      navigate('/admin/video-snippet');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const data = ev.target?.result as string; setBg(data); setCoverArt(data); }; // imagen manual = portada + fondo
    reader.readAsDataURL(file);
  };

  const formatDate = () => {
    try {
      // FIXING TIMEZONE OFFSET (Input 12 show 11) - Force local parsing
      // replace('-','/') ensures browser treats it as local date if time not present
      const dateString = date.includes('T') ? date : `${date}T12:00:00`;
      const d = new Date(dateString);
      const fecha = d.toLocaleDateString("es-MX", { day: "numeric", month: "long" }).toUpperCase();
      
      if (mode === 'proximamente') {
         return `ESTRENO ${fecha}`;
      }
      
      const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });
      return `ESTRENO ${fecha} · ${hora}`;
    } catch {
      return "PRÓXIMAMENTE";
    }
  };

  // Contraste estimado del titulo sobre el fondo ya oscurecido (WCAG)
  const contrastInfo = (() => {
    if (!bgAvg) return null;
    const eff = mixRgb(bgAvg, hexToRgb(overlayColor), overlay);
    const ratio = contrastRatio(relLuminance(...eff), relLuminance(...hexToRgb(textColor)));
    const level = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'Bajo' : 'Ilegible';
    return { ratio, level };
  })();

  const handleFixContrast = () => {
    if (!bgAvg) return;
    const ovRgb = hexToRgb(overlayColor);
    const textLum = relLuminance(...hexToRgb(textColor));
    for (let ov = Math.max(overlay, 0.3); ov <= 0.951; ov += 0.05) {
      if (contrastRatio(relLuminance(...mixRgb(bgAvg, ovRgb, ov)), textLum) >= 4.5) { setOverlay(Math.round(ov * 100) / 100); return; }
    }
    setOverlay(0.95);
  };

  const smartLinkUrl = getSmartLink();

  // Prioridad: texto propio > cuenta regresiva (solo "proximamente") > automatico de la plantilla
  const statusLabel = statusText.trim() || (mode === 'proximamente' && statusCountdown ? getCountdownLabel(date) : '');

  const commonProps = {
    title, artist, bg, cover: coverArt, mode, size, date, overlay, overlayColor, textColor, contrastColor, glow, stroke,
    formatDate, country, trackList: tracks.split("\n"),
    config: sizes[size],
    grit, noise, scanlines, vignette, industrial, template,
    slogan, customFooterUrl,
    footerStyle, coverMockup, titleFont, titleEffect, badgeType, colorFilter, showLensFlare: false, // el destello horizontal ya no se ofrece ni se dibuja
    smartLinkUrl, qrDataUrl, statusLabel,
    bgBlur, bgBrightness, bgContrast, bgScale,
    watermarkEnabled, watermarkStyle, watermarkText, watermarkOpacity, watermarkSize,
    ribbonStyle, ribbonText, ribbonColor, ribbonOpacity,
    watermarkLogo, watermarkLogoPos, watermarkLogoOpacity, watermarkLogoScale
  };

  // 4K MASTER PROPS: Scaled configuration for high-res render
  const masterWidth = getMasterWidth(size);
  const masterMultiplier = masterWidth / sizes[size].w;
  const masterCommonProps = {
    ...commonProps,
    config: {
      ...sizes[size],
      w: masterWidth,
      h: sizes[size].h * masterMultiplier,
      title: sizes[size].title * masterMultiplier, // SCALING FONT SIZES FOR 4K
    }
  };

  return (
    <div className="flex flex-col bg-[#020617] min-h-screen text-white">
      {/* APP HEADER */}
      <div className="sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 p-4 flex items-center justify-between">
        <button 
          onClick={() => navigate('/admin')}
          className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:text-white transition-all bg-[#c5a059]/10 px-4 py-2 rounded-full border border-[#c5a059]/20"
        >
          <i className="fas fa-chevron-left text-[8px]"></i>
          Volver al Centro de Control
        </button>
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-white/40">Studio <span className="text-[#c5a059]">PRO GENERATOR</span></h1>
        </div>
        <button
          type="button"
          onClick={handleResetStyle}
          title="Vuelve a los ajustes de estilo por defecto"
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all px-4 py-2 rounded-full border border-white/10 hover:border-white/30"
        >
          <i className="fas fa-rotate-left text-[8px]"></i>
          Restablecer estilo
        </button>
      </div>

      <div ref={containerRef} className="flex-1 p-4 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COMPONENT: CONTROLS */}
        <div className="lg:col-span-5 space-y-8 animate-fade-in-up">
          
          {/* GROUP: CONTENT & SEARCH */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl scale-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059]">Contenido</h2>
              <button 
                onClick={handleRandomFromCatalog}
                disabled={isLoadingCatalog}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-full text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all disabled:opacity-50"
              >
                <i className={`fas ${isLoadingCatalog ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>
                {isLoadingCatalog ? 'Sorteando...' : 'Azar'}
              </button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#c5a059]/40">
                <i className="fas fa-search text-xs"></i>
              </div>
              <input 
                type="text"
                placeholder="BUSCAR CANCIÓN EN CATÁLOGO..."
                className="w-full bg-black/40 border border-white/5 pl-12 pr-4 py-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-[10px] font-black tracking-widest transition-all"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(e.target.value.length > 0);
                }}
                onFocus={() => searchQuery.length > 0 && setIsSearchOpen(true)}
              />
              
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-hidden z-[200] shadow-2xl animate-fade-in">
                  {filteredCatalog.length > 0 ? (
                    filteredCatalog.map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handleSelectSong(song)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors text-left"
                      >
                        <img src={song.cover} className="w-10 h-10 rounded-lg object-cover bg-black" />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-white/90 truncate uppercase tracking-widest">{song.name}</div>
                          <div className="text-[8px] font-bold text-[#c5a059] truncate uppercase tracking-widest">{song.artist}</div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-8 text-center text-white/20 text-[9px] font-black uppercase tracking-[0.2em]">No se encontraron temas</div>
                  )}
                </div>
              )}
            </div>

            {/* BOTÓN DE CARGA MANUAL RESPALDADO */}
            <div className="mb-8">
              <button 
                onClick={() => document.getElementById('manual-bg-upload')?.click()}
                className="w-full flex items-center justify-center gap-3 p-4 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all group"
              >
                <i className="fas fa-cloud-upload-alt group-hover:scale-110 transition-transform"></i>
                Subir Imagen Manual (Local)
              </button>
              <input 
                id="manual-bg-upload"
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleBg} 
              />
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Título de la Obra</label>
                <input 
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-lg font-serif italic transition-all"
                  value={title} 
                  onChange={(e)=>setTitle(e.target.value.toUpperCase())} 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Artista</label>
                  <select 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                    value={artist} 
                    onChange={(e)=>setArtist(e.target.value)}
                  >
                    <option value="Diosmasgym">Diosmasgym</option>
                    <option value="Juan 614">Juan 614</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Estado</label>
                  <select 
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                    value={mode} 
                    onChange={(e)=>setMode(e.target.value)}
                  >
                    <option value="proximamente">Próximamente</option>
                    <option value="disponible">Disponible</option>
                    <option value="album">Álbum / EP</option>
                    <option value="branding">Branding / Identidad</option>
                  </select>
                </div>
              </div>

              {/* TRACKLIST FOR ALBUM/EP */}
              {mode === 'album' && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Canciones del Álbum / EP</label>
                  <textarea
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest text-[#c5a059] resize-none"
                    rows={6}
                    placeholder={"INTRO\nTEMA UNO\nTEMA DOS\nTEMA TRES"}
                    value={tracks}
                    onChange={(e) => setTracks(e.target.value)}
                  />
                  <p className="text-[8px] text-white/20 tracking-widest">Una canción por línea</p>
                </div>
              )}

              

              {/* DATE PICKER (Conditional Simple Calendar for Proximamente) */}
              {mode !== 'branding' && (
                <div className="space-y-2 pt-4 border-t border-white/5">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">
                    {mode === 'proximamente' ? 'Día del Estreno (Calendario)' : 'Fecha y Hora Oficial'}
                  </label>
                  <input 
                    type={mode === 'proximamente' ? "date" : "datetime-local"}
                    className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest text-[#c5a059]"
                    value={mode === 'proximamente' ? (date.includes('T') ? date.split('T')[0] : date) : date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              )}

              {/* TEXTO DEL SELLO SUPERIOR + CUENTA REGRESIVA */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-2">
                  <i className="fas fa-tag text-[#c5a059]" />
                  Texto del sello (vacío = automático)
                </label>
                <input
                  type="text"
                  maxLength={24}
                  className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-black tracking-widest text-[#c5a059] uppercase transition-all"
                  placeholder={mode === 'proximamente' ? 'PRÓXIMO ESTRENO' : mode === 'disponible' ? 'YA DISPONIBLE' : 'AUTOMÁTICO'}
                  value={statusText}
                  onChange={(e) => setStatusText(e.target.value.toUpperCase())}
                />
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_SUGGESTIONS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setStatusText(t)}
                      className="px-2.5 py-1 rounded-md bg-white/[0.03] hover:bg-[#c5a059]/15 border border-white/5 hover:border-[#c5a059]/30 text-[8px] font-bold text-white/50 hover:text-[#c5a059] transition-all"
                    >
                      {t}
                    </button>
                  ))}
                  {mode === 'proximamente' && (
                    <button
                      type="button"
                      onClick={() => { if (statusText) { setStatusText(''); setStatusCountdown(true); } else { setStatusCountdown(v => !v); } }}
                      title="Calcula sola «FALTAN N DÍAS» a partir de la fecha del estreno"
                      className={`px-2.5 py-1 rounded-md border text-[8px] font-black uppercase tracking-widest transition-all ${statusCountdown && !statusText ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-white/[0.03] border-white/10 text-white/50 hover:text-white'}`}
                    >
                      <i className="fas fa-hourglass-half mr-1.5"></i>Cuenta regresiva{statusCountdown && !statusText && getCountdownLabel(date) ? `: ${getCountdownLabel(date)}` : ''}
                    </button>
                  )}
                  {statusText && (
                    <button type="button" onClick={() => setStatusText('')} className="px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest">
                      Borrar
                    </button>
                  )}
                </div>
              </div>

              {/* #2 — VERSÍCULO / SLOGAN CONEXIÓN DIRECTA API BIBLIA */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-2">
                    <i className="fas fa-book-bible text-[#c5a059]" />
                    Versículo Bíblico / Slogan
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Botón API Aleatorio */}
                    <button
                      type="button"
                      onClick={() => fetchRandomBibleVerse()}
                      disabled={isLoadingVerse}
                      className="flex items-center gap-1.5 px-3 py-1 bg-[#c5a059]/10 border border-[#c5a059]/30 rounded-lg text-[8px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059] hover:text-black transition-all disabled:opacity-50"
                      title="Obtener versículo aleatorio de la API de la Biblia"
                    >
                      <i className={`fas ${isLoadingVerse ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>
                      {isLoadingVerse ? 'Buscando...' : 'Otro'}
                    </button>
                    {/* Botón Biblioteca */}
                    <button
                      type="button"
                      onClick={() => setShowVerseModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:bg-white/10 transition-all"
                      title="Elegir de la biblioteca de versículos seleccionados"
                    >
                      <i className="fas fa-bookmark text-[#c5a059]"></i>
                      Biblioteca
                    </button>
                    {slogan && (
                      <button
                        type="button"
                        onClick={() => setSlogan("")}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white text-[9px] transition-all"
                        title="Borrar versículo"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  rows={2}
                  className="w-full bg-black/40 border border-white/5 p-3 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-serif italic tracking-wide text-[#c5a059] resize-none transition-all"
                  placeholder='Ej: "Todo lo puedo en Cristo que me fortalece." · Filipenses 4:13'
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                />

                
              </div>

              <details className="rounded-2xl border border-white/5 bg-black/20 p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer text-[9px] uppercase font-black tracking-[0.25em] text-white/50 hover:text-white flex items-center gap-2">
                  <i className="fas fa-chevron-down text-[8px]"></i> Más opciones
                </summary>
                <div>
              {/* #8 — URL PERSONALIZADA EN FOOTER */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest flex items-center gap-2">
                  <i className="fas fa-link text-[#c5a059]" />
                  URL en Footer (deja vacío para automático)
                </label>
                <input
                  type="text"
                  className="w-full bg-black/40 border border-white/5 p-4 rounded-xl outline-none focus:border-[#c5a059]/50 text-xs font-mono text-[#c5a059] tracking-wide transition-all"
                  placeholder="diosmasgym.com / musica.diosmasgym.com"
                  value={customFooterUrl}
                  onChange={(e) => setCustomFooterUrl(e.target.value)}
                />
              </div>
                </div>
              </details>
            </div>
          </div>

          {/* GROUP: LOOKS (un clic) */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-2 flex items-center gap-2">
              <i className="fas fa-wand-magic-sparkles"></i>
              Looks
            </h2>
            <p className="text-[9px] text-white/30 tracking-wide mb-5">Un clic aplica plantilla, filtro, tipografía, portada, footer y sticker.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[...LOOKS, ...customLooks.map(c => ({ ...c, icon: 'fa-star', color: '#c5a059', custom: true }))].map((l: any) => {
                const active = Object.entries(l.style).every(([k, v]) => currentStyle[k] === v);
                return (
                  <div key={l.id} className="relative">
                    <button
                      type="button"
                      onClick={() => applyStyle({ ...LOOK_RESET, ...l.style })}
                      className={`w-full h-full py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all flex flex-col items-center gap-1.5 ${active ? 'text-black' : 'bg-black/40 text-white/50 border-white/5 hover:text-white hover:border-white/20'}`}
                      style={active ? { backgroundColor: l.color, borderColor: l.color, boxShadow: `0 0 24px ${l.color}33` } : {}}
                    >
                      <i className={`fas ${l.icon} text-sm`} style={active ? {} : { color: l.color }}></i>
                      {l.label}
                    </button>
                    {l.custom && (
                      <button
                        type="button"
                        title="Borrar este look"
                        onClick={() => setCustomLooks(list => list.filter(x => x.id !== l.id))}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={handleSaveLook}
              className="mt-3 w-full py-2.5 rounded-xl border border-dashed border-[#c5a059]/40 text-[9px] font-black uppercase tracking-widest text-[#c5a059] hover:bg-[#c5a059]/10 transition-all"
            >
              <i className="fas fa-plus mr-2"></i>Guardar mi look actual
            </button>
          </div>

          {/* AJUSTES AVANZADOS: todo lo demas queda plegado para que lo esencial se vea de un vistazo */}
          <details className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer text-[11px] font-black uppercase tracking-[0.3em] text-white/60 hover:text-white flex items-center justify-between">
              <span><i className="fas fa-sliders mr-3 text-[#c5a059]"></i>Ajustes avanzados</span>
              <span className="text-[8px] text-white/30 tracking-widest normal-case font-bold">fondo · marca · portada · tipografía · color</span>
            </summary>
            <div className="space-y-8 pt-6">

          {/* GROUP: FONDO & TEXTURAS HD (BACKGROUND SUITE) */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] flex items-center gap-2">
                <i className="fas fa-image"></i>
                Fondo & Texturas HD
              </h2>
              <button
                type="button"
                onClick={() => bgFileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-[#c5a059] hover:bg-[#d6b26b] text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-[#c5a059]/20"
              >
                <i className="fas fa-upload"></i> Subir Fondo
              </button>
            </div>

            <input
              ref={bgFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    if (ev.target?.result) {
                      setBg(ev.target.result as string);
                    }
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            <div className="space-y-6">
              {/* PRESETS DE FONDOS DE ESTUDIO */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Fondos de Estudio Prediseñados</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'original', label: '🎵 Portada Tema', url: null as string | null },
                    { id: 'cover-blur', label: '🖼️ Portada difuminada', url: null as string | null },
                    ...LOCAL_BACKGROUNDS,
                    ...PHOTO_BACKGROUNDS,
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (p.url) {
                          setBg(p.url); setBgBlur(0); setBgScale(100); setBgBrightness(100);
                        } else {
                          const currentSong = catalog.find(s => s.name.toUpperCase() === title.toUpperCase());
                          const cover = currentSong?.cover || coverArt;
                          if (cover) {
                            const blurred = p.id === 'cover-blur'; // la portada como fondo, desenfocada y ampliada para que no se vean bordes
                            setBg(cover);
                            setBgBlur(blurred ? 14 : 0);
                            setBgScale(blurred ? 118 : 100);
                            setBgBrightness(blurred ? 90 : 100);
                          }
                        }
                      }}
                      className="py-2.5 px-2 bg-black/40 hover:bg-[#c5a059]/20 border border-white/5 hover:border-[#c5a059]/40 rounded-xl text-[8px] font-black uppercase tracking-wider text-white/70 hover:text-white transition-all text-center"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SLIDERS DE PROCESAMIENTO DE FONDO */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Desenfoque (Blur)</label>
                    <span className="text-[9px] font-mono text-[#c5a059]">{bgBlur}px</span>
                  </div>
                  <input
                    type="range" min="0" max="25" step="1"
                    value={bgBlur}
                    onChange={(e) => setBgBlur(parseInt(e.target.value))}
                    className="w-full accent-[#c5a059]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Zoom / Escala</label>
                    <span className="text-[9px] font-mono text-[#c5a059]">{bgScale}%</span>
                  </div>
                  <input
                    type="range" min="100" max="150" step="2"
                    value={bgScale}
                    onChange={(e) => setBgScale(parseInt(e.target.value))}
                    className="w-full accent-[#c5a059]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Brillo Fondo</label>
                    <span className="text-[9px] font-mono text-[#c5a059]">{bgBrightness}%</span>
                  </div>
                  <input
                    type="range" min="40" max="160" step="5"
                    value={bgBrightness}
                    onChange={(e) => setBgBrightness(parseInt(e.target.value))}
                    className="w-full accent-[#c5a059]"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Contraste Fondo</label>
                    <span className="text-[9px] font-mono text-[#c5a059]">{bgContrast}%</span>
                  </div>
                  <input
                    type="range" min="50" max="160" step="5"
                    value={bgContrast}
                    onChange={(e) => setBgContrast(parseInt(e.target.value))}
                    className="w-full accent-[#c5a059]"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Oscurecimiento (Overlay)</label>
                  <span className="text-[9px] font-mono text-[#c5a059]">{Math.round(overlay * 100)}%</span>
                </div>
                <input
                  type="range" min="0" max="0.95" step="0.05"
                  value={overlay}
                  onChange={(e) => setOverlay(parseFloat(e.target.value))}
                  className="w-full accent-[#c5a059]"
                />
              </div>
            </div>
          </div>

          {/* GROUP: MARCA DE AGUA & LISTONES (SUITE MANDO EJECUTIVO) */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 flex items-center gap-2">
              <i className="fas fa-shield-halved"></i>
              Marca de Agua & Listones (Mando Ejecutivo)
            </h2>

            <div className="space-y-6">
              {/* Marca de agua y listón: poco usados, plegados por defecto (el sello/logo queda a la vista) */}
              <details open={watermarkEnabled || ribbonStyle !== 'none'} className="rounded-2xl border border-white/5 bg-black/20 p-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="cursor-pointer text-[9px] uppercase font-black tracking-[0.25em] text-white/50 hover:text-white flex items-center gap-2">
                  <i className="fas fa-chevron-down text-[8px]"></i> Avanzado: marca de agua y listón
                </summary>
                <div className="space-y-6 pt-5">
              {/* SUB-SECCIÓN 1: HASHTAG MARCA DE AGUA EN FONDO */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest">Marca de Agua en Fondo (Hashtags)</label>
                  <button
                    type="button"
                    onClick={() => setWatermarkEnabled(!watermarkEnabled)}
                    className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all ${watermarkEnabled ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'border-white/10 text-white/30'}`}
                  >
                    {watermarkEnabled ? 'ACTIVADO' : 'APAGADO'}
                  </button>
                </div>

                {watermarkEnabled && (
                  <div className="space-y-3 p-4 bg-black/30 rounded-2xl border border-white/5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'diagonal', label: '📐 Diagonal' },
                        { id: 'tiled', label: '🔲 Mosaico' },
                        { id: 'center', label: '🎯 Centro' },
                      ].map((ws) => (
                        <button
                          key={ws.id}
                          type="button"
                          onClick={() => setWatermarkStyle(ws.id as any)}
                          className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all ${watermarkStyle === ws.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/40 border-white/5 hover:text-white'}`}
                        >
                          {ws.label}
                        </button>
                      ))}
                    </div>

                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder="#PuroSeñorJesucristoCompa"
                      className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-[#c5a059] font-black tracking-wider outline-none"
                    />

                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '#PuroSeñorJesucristoCompa',
                        'Puro Chihuahua',
                        'Diosmasgym Records',
                        'La Gloria es de Dios',
                        'Diosmasgym.com'
                      ].map((txt) => (
                        <button
                          key={txt}
                          type="button"
                          onClick={() => setWatermarkText(txt)}
                          className="px-2 py-0.5 rounded bg-white/[0.03] hover:bg-[#c5a059]/20 border border-white/5 text-[7px] font-bold text-white/50 hover:text-[#c5a059] transition-all"
                        >
                          {txt}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <label className="text-[8px] uppercase font-bold text-white/30 tracking-widest">Opacidad: {watermarkOpacity}%</label>
                      <input
                        type="range" min="3" max="35" step="1"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                        className="w-1/2 accent-[#c5a059]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* SUB-SECCIÓN 2: LISTÓN / RIBBON DE FE */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Listón / Ribbon de Fe (Banner)</label>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Sin Listón' },
                    { id: 'bottom', label: '🎗️ Inferior' },
                    { id: 'top', label: '🎗️ Superior' },
                    { id: 'diagonal-left', label: '📐 Diagonal Esquina' },
                  ].map((rs) => (
                    <button
                      key={rs.id}
                      type="button"
                      onClick={() => setRibbonStyle(rs.id as any)}
                      className={`py-2 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all text-center ${ribbonStyle === rs.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/40 border-white/5 hover:text-white'}`}
                    >
                      {rs.label}
                    </button>
                  ))}
                </div>

                {ribbonStyle !== 'none' && (
                  <div className="space-y-3 p-4 bg-black/30 rounded-2xl border border-white/5 animate-in fade-in duration-150">
                    <div className="space-y-1.5">
                      <label className="text-[8px] uppercase font-bold text-white/30 tracking-widest block">Color del Listón</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'gold', label: '👑 Oro Real' },
                          { id: 'black', label: '⬛ Negro Élite' },
                          { id: 'white', label: '⬜ Blanco Puro' },
                          { id: 'red', label: '🔴 Carmesí' },
                          { id: 'blue', label: '🔵 Azul Real' },
                          { id: 'green', label: '🟢 Esmeralda' },
                        ].map((rc) => (
                          <button
                            key={rc.id}
                            type="button"
                            onClick={() => setRibbonColor(rc.id as any)}
                            className={`py-1.5 px-2 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all ${ribbonColor === rc.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/40 border-white/5 hover:text-white'}`}
                          >
                            {rc.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={ribbonText}
                      onChange={(e) => setRibbonText(e.target.value)}
                      placeholder="#PuroSeñorJesucristoCompa"
                      className="w-full bg-black/40 border border-white/10 p-2.5 rounded-xl text-xs text-white font-bold outline-none"
                    />

                    <div className="flex justify-between items-center pt-1">
                      <label className="text-[8px] uppercase font-bold text-white/30 tracking-widest">Opacidad Listón: {ribbonOpacity}%</label>
                      <input
                        type="range" min="50" max="100" step="5"
                        value={ribbonOpacity}
                        onChange={(e) => setRibbonOpacity(parseInt(e.target.value))}
                        className="w-1/2 accent-[#c5a059]"
                      />
                    </div>
                  </div>
                )}
              </div>

                              </div>
              </details>

              {/* SUB-SECCIÓN 3: SELLO / LOGO FLOTANTE */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Sello / Logo Flotante</label>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Sin Sello' },
                    { id: 'mando', label: '🛡️ Mando Ejecutivo' },
                    { id: 'diosmasgym', label: '👑 Diosmasgym' },
                    { id: 'juan614', label: '✝️ Juan 614' },
                  ].map((wl) => (
                    <button
                      key={wl.id}
                      type="button"
                      onClick={() => setWatermarkLogo(wl.id as any)}
                      className={`py-2 px-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all text-center ${watermarkLogo === wl.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/40 border-white/5 hover:text-white'}`}
                    >
                      {wl.label}
                    </button>
                  ))}
                </div>

                {watermarkLogo !== 'none' && (
                  <div className="space-y-3 p-4 bg-black/30 rounded-2xl border border-white/5 animate-in fade-in duration-150">
                    <div className="space-y-1.5">
                      <label className="text-[8px] uppercase font-bold text-white/30 tracking-widest block">Posición del Logo</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'top-left', label: '↖ Sup. Izq' },
                          { id: 'top-right', label: '↗ Sup. Der' },
                          { id: 'bottom-left', label: '↙ Inf. Izq' },
                          { id: 'bottom-right', label: '↘ Inf. Der' },
                          { id: 'center', label: '🎯 Centro' },
                        ].map((pos) => (
                          <button
                            key={pos.id}
                            type="button"
                            onClick={() => setWatermarkLogoPos(pos.id as any)}
                            className={`py-1.5 px-2 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all ${watermarkLogoPos === pos.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/40 border-white/5 hover:text-white'}`}
                          >
                            {pos.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <label className="text-[8px] uppercase font-bold text-white/30 tracking-widest">Opacidad Logo: {watermarkLogoOpacity}%</label>
                      <input
                        type="range" min="20" max="100" step="5"
                        value={watermarkLogoOpacity}
                        onChange={(e) => setWatermarkLogoOpacity(parseInt(e.target.value))}
                        className="w-1/2 accent-[#c5a059]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 flex items-center gap-2">
              <i className="fas fa-compact-disc"></i>
              Mockup de Portada 3D & Badges
            </h2>
            
            <div className="space-y-6">
              {/* COVER MOCKUP SELECTOR */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Estilo de Portada</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'vinyl', label: '💿 Vinilo 3D', desc: 'Disco saliendo' },
                    { id: 'cd', label: '💿 Caja CD', desc: 'Acrílico & reflejo' },
                    { id: 'frame', label: '👑 Marco Oro', desc: 'Doble bisel de gala' },
                    { id: 'flat', label: '🖼️ Plano Clean', desc: '2D Ultra limpio' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setCoverMockup(m.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all ${coverMockup === m.id ? 'bg-[#c5a059] text-black border-[#c5a059] shadow-lg shadow-[#c5a059]/20' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20 hover:text-white'}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider">{m.label}</div>
                      <div className={`text-[8px] tracking-wide ${coverMockup === m.id ? 'text-black/70' : 'text-white/30'}`}>{m.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* BADGE / STICKER SELECTOR */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Sticker / Badge Coleccionable</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'none', label: 'Sin Sticker' },
                    { id: 'biblical-advisory', label: '🏷️ Advisory Bíblico' },
                    { id: 'exclusive', label: '★ Estreno Exclusivo' },
                    { id: 'hires', label: '🎧 Master 24-Bit' },
                    { id: 'chihuahua', label: '🤠 Puro Chihuahua' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setBadgeType(b.id as any)}
                      className={`py-2.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider border transition-all text-center ${badgeType === b.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/40 border-white/5 hover:text-white'}`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GROUP: FOOTER STYLE (EL FOSTER) */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 flex items-center gap-2">
              <i className="fas fa-sliders"></i>
              Estilo del Footer Flotante (Sin Barra)
            </h2>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Distribución de Elementos (100% Transparente)</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'minimal', label: '⚡ Flotante Minimal', desc: 'Limpio y directo sobre el arte' },
                    { id: 'glass', label: '🌟 Audio Spec + Redes', desc: 'Hi-Res Audio y plataformas' },
                    { id: 'record', label: '💿 Sello & Soundwave', desc: 'Ficha de catálogo y onda' },
                    { id: 'qr', label: '📱 Smart QR Code', desc: 'Código QR y enlaces' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFooterStyle(f.id as any)}
                      className={`p-3 rounded-xl text-left border transition-all ${footerStyle === f.id ? 'bg-[#c5a059] text-black border-[#c5a059] shadow-lg shadow-[#c5a059]/20' : 'bg-black/40 text-white/50 border-white/5 hover:border-white/20 hover:text-white'}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider">{f.label}</div>
                      <div className={`text-[8px] tracking-wide ${footerStyle === f.id ? 'text-black/70' : 'text-white/30'}`}>{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* GROUP: TYPOGRAPHY & TITLE EFFECTS */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6 flex items-center gap-2">
              <i className="fas fa-font"></i>
              Tipografía
            </h2>

            <div className="space-y-6">
              {/* FONT SELECTOR */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase font-bold text-white/40 tracking-widest block">Fuente del Título</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'bebas', label: 'Bebas Neue (Urbano)' },
                    { id: 'cinzel', label: 'DM Serif (Elegante)' },
                    { id: 'grotesk', label: 'Space Grotesk (Modern)' },
                    { id: 'anton', label: 'Anton (Impacto)' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setTitleFont(font.id as any)}
                      className={`py-2.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${titleFont === font.id ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/40 text-white/40 border-white/5 hover:text-white'}`}
                    >
                      {font.label}
                    </button>
                  ))}
                </div>
              </div>

              
            </div>
          </div>

          {/* GROUP: AESTHETICS, FILTERS & TEMPLATES */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059]">Gradación & Plantilla</h2>
              <button 
                onClick={() => setAutoColor(!autoColor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[8px] font-black uppercase tracking-widest transition-all ${autoColor ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'border-white/10 text-white/40'}`}
              >
                <i className={`fas ${autoColor ? 'fa-magic' : 'fa-palette'}`}></i>
                {autoColor ? 'Smart Color ON' : 'Manual Color'}
              </button>
            </div>
            
            {contrastInfo && (
              <div className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-widest ${contrastInfo.ratio >= 4.5 ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/40 bg-amber-500/10 text-amber-300'}`}>
                <span>
                  <i className={`fas ${contrastInfo.ratio >= 4.5 ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-2`}></i>
                  Contraste del título: {contrastInfo.ratio.toFixed(1)}:1 · {contrastInfo.level}
                </span>
                {contrastInfo.ratio < 4.5 && (
                  <button type="button" onClick={handleFixContrast} className="px-3 py-1.5 rounded-lg bg-amber-400 text-black hover:bg-amber-300 transition-all">
                    Corregir
                  </button>
                )}
              </div>
              )}
            <div className="grid grid-cols-1 gap-8">
              {/* TEMPLATE SELECTOR: THE BEAT SERIES */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                 <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">The Beat Series (Variaciones Estéticas)</label>
                 <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'original-v1', label: 'GOLD CLASSIC', icon: 'fa-history', color: '#c5a059' },
                      { id: 'beat-crimson', label: 'CRIMSON STEEL', icon: 'fa-face-angry', color: '#ff4444' },
                      { id: 'beat-cyber', label: 'CYBER ELECTRIC', icon: 'fa-bolt', color: '#00f2ff' },
                      { id: 'beat-platinum', label: 'PLATINUM GHOST', icon: 'fa-ghost', color: '#e5e4e2' },
                      { id: 'beat-toxic', label: 'TOXIC EMERALD', icon: 'fa-biohazard', color: '#39ff14' }
                    ].map((t) => (
                      <button 
                        key={t.id}
                        onClick={() => setTemplate(t.id)}
                        className={`py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center justify-center gap-3 ${template === t.id ? 'bg-white text-black border-white shadow-xl scale-[1.02]' : 'bg-black/40 text-white/30 border-white/5 hover:text-white hover:border-white/20'}`}
                        style={template === t.id ? { backgroundColor: t.color, color: '#000', borderColor: t.color, boxShadow: `0 0 30px ${t.color}33` } : {}}
                      >
                         <i className={`fas ${t.icon}`}></i>
                         {t.label}
                      </button>
                    ))}
                 </div>
              </div>

              

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/5">
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Color Título</label>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="color" className="w-9 h-9 bg-transparent rounded-lg cursor-pointer border-none" value={textColor} onChange={(e)=>setTextColor(e.target.value)} />
                    <span className="text-[9px] font-mono opacity-40">{textColor.toUpperCase()}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Color Glow</label>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="color" className="w-9 h-9 bg-transparent rounded-lg cursor-pointer border-none" value={contrastColor} onChange={(e)=>setContrastColor(e.target.value)} />
                    <span className="text-[9px] font-mono opacity-40">{contrastColor.toUpperCase()}</span>
                  </div>
                </div>
                {/* #3 — COLOR DE OVERLAY */}
                <div className="space-y-2">
                  <label className="text-[9px] uppercase font-bold text-white/30 tracking-widest">Overlay Color</label>
                  <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-white/5">
                    <input type="color" className="w-9 h-9 bg-transparent rounded-lg cursor-pointer border-none" value={overlayColor} onChange={(e)=>setOverlayColor(e.target.value)} />
                    <span className="text-[9px] font-mono opacity-40">{overlayColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

                      </div>
          </details>

          {/* GROUP: EXPORT */}
          <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
             <h2 className="text-sm font-black uppercase tracking-[0.3em] text-[#c5a059] mb-6">Exportar</h2>
             <div className="flex flex-col gap-5">

               {/* Formato del archivo */}
               <div className="grid grid-cols-2 gap-3">
                 {(['png', 'jpeg'] as const).map(fmt => (
                   <button
                     key={fmt}
                     onClick={() => setExportFormat(fmt)}
                     className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${exportFormat === fmt ? 'bg-[#c5a059] text-black border-[#c5a059]' : 'bg-black/30 text-white/30 border-white/5 hover:text-white'}`}
                   >
                     {fmt === 'png' ? 'PNG · máxima calidad' : 'JPG · más ligero'}
                   </button>
                 ))}
               </div>

               <button
                 onClick={() => handleDownload(false)}
                 disabled={isGenerating}
                 className="w-full py-6 bg-white text-black font-black uppercase text-[11px] tracking-[0.4em] rounded-2xl hover:bg-[#c5a059] transition-all flex items-center justify-center gap-4 group shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 disabled:opacity-50"
               >
                 <i className="fas fa-download group-hover:scale-110 transition-transform"></i> Descargar imagen
               </button>

               <div className="grid grid-cols-2 gap-3">
                 <button
                   onClick={() => handleDownload(true)}
                   disabled={isGenerating}
                   title="Máxima resolución (hasta ~16 megapíxeles)"
                   className="py-3.5 bg-white/5 border border-white/10 text-white/60 font-black uppercase text-[9px] tracking-[0.2em] rounded-xl hover:bg-white/10 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <i className="fas fa-crown"></i> Master 4K
                 </button>
                 <button
                   onClick={handleExportAll}
                   disabled={isGenerating}
                   className="py-3.5 bg-white/5 border border-[#c5a059]/30 text-[#c5a059] font-black uppercase text-[9px] tracking-[0.2em] rounded-xl hover:bg-[#c5a059] hover:text-black transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <i className="fas fa-file-zipper"></i> {exportProgress ? 'Exportando...' : 'Todos (ZIP)'}
                 </button>
               </div>

               <button
                 onClick={handleGoToSnippet}
                 disabled={isGenerating}
                 className="w-full py-4 bg-gradient-to-r from-[#c5a059] to-[#8B5A2B] text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#c5a059]/20 disabled:opacity-50"
               >
                 <i className="fas fa-video"></i> Crear Video Snippet
               </button>

               {/* PREPARAR PARA REDES: imagen + caption con IA + compartir */}
               <button
                 id="btn-preparar-redes"
                 onClick={handleOpenSharePanel}
                 disabled={isGenerating}
                 className="w-full py-6 rounded-2xl font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                 style={{
                   background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
                   boxShadow: '0 20px 50px rgba(131,58,180,0.35)',
                   color: 'white'
                 }}
               >
                 <i className="fas fa-rocket"></i>
                 Preparar para Redes Sociales
               </button>
             </div>
          </div>

        </div>

        {/* RIGHT COMPONENT: PREVIEW */}
        <div className="lg:col-span-7 flex flex-col items-center justify-start gap-4 lg:sticky lg:top-24 lg:self-start w-full">
          <div ref={previewBoxRef} className="w-full pb-20 min-h-[460px] lg:h-[calc(100vh-8rem)] bg-black/60 rounded-[40px] border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-inner">
            {/* STUDIO LIGHTING EFFECTS */}
            <div className="absolute top-0 left-1/4 w-1/2 h-40 bg-[#c5a059]/10 blur-[100px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-1/2 h-40 bg-blue-500/5 blur-[100px] pointer-events-none"></div>
            
            <div 
              style={{
                width: config.w * scale, 
                height: config.h * scale, 
                display: 'block',
                position: 'relative',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              className="promo-container-wrapper"
            >
              <div 
                style={{ 
                  width: config.w, 
                  height: config.h, 
                  borderRadius: 12, 
                  position: "absolute", 
                  overflow: "hidden", 
                  display: 'block',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top left',
                  backgroundColor: '#000',
                  boxShadow: '0 100px 200px -50px rgba(0,0,0,0.8)'
                }}
              >
                <PromoTemplate {...commonProps} />
                {size === 'story' && showSafeZone && (
                  <div className="safe-zone-guide" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 999 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: config.h * STORY_SAFE_ZONE.top / STORY_SAFE_ZONE.total, background: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.28) 0 6px, rgba(239,68,68,0.10) 6px 12px)', borderBottom: '1px dashed rgba(239,68,68,0.9)' }} />
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: config.h * STORY_SAFE_ZONE.bottom / STORY_SAFE_ZONE.total, background: 'repeating-linear-gradient(45deg, rgba(239,68,68,0.28) 0 6px, rgba(239,68,68,0.10) 6px 12px)', borderTop: '1px dashed rgba(239,68,68,0.9)' }} />
                  </div>
                )}
              </div>
            </div>

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-[250] bg-black/60 backdrop-blur-md animate-fade-in rounded-[40px]">
                <div className="w-16 h-16 border-t-2 border-r-2 border-[#c5a059] rounded-full animate-spin shadow-[0_0_30px_rgba(197,160,89,0.3)]"></div>
                <div className="text-[10px] font-black uppercase tracking-[1em] text-[#c5a059] animate-pulse text-center px-4">{exportProgress ? `Exportando ${exportProgress}` : 'Masterizando'}</div>
              </div>
            )}
            
            {/* SELECTOR DE FORMATO (siempre visible: antes solo aparecia con hover y no existia en tactil) */}
            <div className="absolute bottom-4 inset-x-0 flex justify-center px-3 z-[200] pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap justify-center items-center gap-1.5 bg-black/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl shadow-2xl">
              {(Object.keys(sizes) as SizeKey[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  title={sizeLabels[s].hint}
                  onClick={(e) => { e.stopPropagation(); setSize(s); }}
                  className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${size === s ? 'bg-[#c5a059] text-black' : 'text-white/50 hover:text-white'}`}
                >
                  {sizeLabels[s].label}
                </button>
              ))}
              {size === 'story' && (
                <button
                  type="button"
                  title="Muestra la zona que Instagram/TikTok tapan con su interfaz (no aparece en la imagen exportada)"
                  onClick={(e) => { e.stopPropagation(); setShowSafeZone(v => !v); }}
                  className={`ml-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showSafeZone ? 'border-red-400/60 text-red-300 bg-red-500/10' : 'border-white/10 text-white/40 hover:text-white'}`}
                >
                  <i className="fas fa-ruler-vertical mr-1.5"></i>Zona segura
                </button>
              )}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleQuickCopy(); }}
                disabled={isGenerating}
                title="Copiar imagen al portapapeles"
                className="ml-1 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-all disabled:opacity-50"
              >
                <i className="fas fa-copy mr-1.5 text-[#c5a059]"></i>Copiar
              </button>
            </div>
            </div>

            

            {/* Quick copy toast */}
            {quickCopySuccess && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[201] px-4 py-2 rounded-full bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-widest animate-pulse shadow-lg">
                {quickCopySuccess}
              </div>
            )}
          </div>
          
          
        </div>
      </div>

      {/* GHOST MASTER: NATIVE 4K RENDERER (OFF-SCREEN BUT VISIBLE FOR CAPTURE) */}
      <div 
        style={{ 
          position: 'fixed', 
          left: -4000, 
          top: -4000, 
          width: masterWidth, 
          pointerEvents: 'none',
          zIndex: -1000,
          opacity: 1, // Fix: Opacity 1 ensures images aren't black
          visibility: 'visible',
          overflow: 'hidden',
          background: '#000'
        }}
      >
                <div ref={masterRef}>
          {/* Solo se monta mientras se exporta: mantenerlo siempre duplicaba el render y frenaba los sliders */}
          {renderMaster && (
            <div
              className="promo-master-target"
              style={{
                width: masterWidth,
                height: masterWidth * (sizes[size].h / sizes[size].w),
                position: 'relative',
                display: 'block'
              }}
            >
               <PromoTemplate {...masterCommonProps} isExport={true} />
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════
          SOCIAL SHARE PANEL — Drawer premium
          ═══════════════════════════════════════════════════════ */}
      {showSharePanel && (
        <div
          className="fixed inset-0 z-[500] flex items-end lg:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSharePanel(false); }}
        >
          <div
            className="w-full max-w-2xl mx-auto rounded-t-[40px] lg:rounded-[32px] overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, #0a0f1d 0%, #020617 100%)',
              border: '1px solid rgba(197,160,89,0.25)',
              boxShadow: '0 -40px 120px rgba(131,58,180,0.3), 0 0 0 1px rgba(197,160,89,0.1)',
              maxHeight: '95vh',
              overflowY: 'auto'
            }}
          >
            {/* PANEL HEADER */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'rgba(197,160,89,0.15)' }}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)' }}>
                  <i className="fas fa-rocket"></i>
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.25em] text-white">Preparar para Redes</h2>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-0.5">IA · SmartLink · Hashtags</p>
                </div>
              </div>
              <button
                onClick={() => setShowSharePanel(false)}
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>

            <div className="p-6 space-y-6">

              {/* SONG INFO BADGE */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: 'rgba(197,160,89,0.08)', border: '1px solid rgba(197,160,89,0.15)' }}>
                {bg && <img src={bg} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                <div className="min-w-0">
                  <div className="text-xs font-black text-white uppercase tracking-widest truncate">{title}</div>
                  <div className="text-[10px] text-[#c5a059] font-bold uppercase tracking-widest mt-1">{artist}</div>
                  <div className="text-[9px] text-white/30 mt-1 flex items-center gap-1">
                    <i className="fas fa-link text-[8px]"></i>
                    <span className="truncate">{getSmartLink()}</span>
                  </div>
                </div>
              </div>

              {/* AI CAPTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[9px] uppercase font-black tracking-widest text-[#c5a059] flex items-center gap-2">
                    <i className="fas fa-wand-magic-sparkles"></i>
                    Descripción IA
                  </label>
                  <div className="flex items-center gap-3">
                    {/* #6 — Botón regenerar caption sin cerrar panel */}
                    {!isGeneratingCaption && (
                      <button
                        onClick={async () => {
                          setIsGeneratingCaption(true);
                          try {
                            const result = await generateSocialCaption(title, artist, getSmartLink());
                            setAiCaption(result.caption);
                            setAiHashtags(result.hashtags);
                          } catch {
                            // mantiene el caption actual
                          } finally {
                            setIsGeneratingCaption(false);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                        style={{ background: 'rgba(197,160,89,0.12)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.2)' }}
                        title="Generar nueva descripción con IA"
                      >
                        <i className="fas fa-rotate-right text-[8px]"></i>
                        Nueva
                      </button>
                    )}
                    {isGeneratingCaption && (
                      <div className="flex items-center gap-2 text-[8px] text-white/40 uppercase tracking-widest">
                        <i className="fas fa-circle-notch fa-spin text-[#c5a059]"></i>
                        Generando...
                      </div>
                    )}
                  </div>
                </div>
                {isGeneratingCaption ? (
                  <div className="w-full rounded-2xl p-5 space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="h-3 bg-white/5 rounded animate-pulse w-full"></div>
                    <div className="h-3 bg-white/5 rounded animate-pulse w-5/6"></div>
                    <div className="h-3 bg-white/5 rounded animate-pulse w-4/6"></div>
                    <div className="h-3 bg-white/5 rounded animate-pulse w-3/4"></div>
                  </div>
                ) : (
                  <textarea
                    value={aiCaption}
                    onChange={(e) => setAiCaption(e.target.value)}
                    rows={6}
                    className="w-full rounded-2xl p-5 text-[11px] text-white/80 font-medium leading-relaxed resize-none outline-none transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', caretColor: '#c5a059' }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(197,160,89,0.4)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                  />
                )}
              </div>

              {/* SMART LINK */}
              <div className="space-y-2">
                <label className="text-[9px] uppercase font-black tracking-widest text-white/30 flex items-center gap-2">
                  <i className="fas fa-link"></i>
                  SmartLink
                </label>
                <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <i className="fas fa-globe text-[#c5a059] text-sm"></i>
                  <span className="text-[11px] text-[#c5a059] font-bold flex-1">{getSmartLink()}</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(getSmartLink()).then(() => { setCopySuccess('🔗 Link copiado'); setTimeout(() => setCopySuccess(''), 2000); })}
                    className="text-[9px] px-3 py-1.5 rounded-lg font-black uppercase tracking-widest transition-all"
                    style={{ background: 'rgba(197,160,89,0.15)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.2)' }}
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* HASHTAGS */}
              <div className="space-y-3">
                <label className="text-[9px] uppercase font-black tracking-widest text-white/30 flex items-center gap-2">
                  <i className="fas fa-hashtag"></i>
                  Hashtags
                </label>
                {isGeneratingCaption ? (
                  <div className="h-10 bg-white/3 rounded-xl animate-pulse"></div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {aiHashtags.split(' ').filter(h => h.startsWith('#')).map((tag, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full text-[9px] font-black cursor-pointer transition-all hover:scale-105"
                        style={{
                          background: i % 3 === 0 ? 'rgba(131,58,180,0.2)' : i % 3 === 1 ? 'rgba(253,29,29,0.15)' : 'rgba(197,160,89,0.15)',
                          border: i % 3 === 0 ? '1px solid rgba(131,58,180,0.3)' : i % 3 === 1 ? '1px solid rgba(253,29,29,0.25)' : '1px solid rgba(197,160,89,0.25)',
                          color: i % 3 === 0 ? '#c084fc' : i % 3 === 1 ? '#fc8181' : '#c5a059'
                        }}
                        onClick={() => navigator.clipboard.writeText(tag)}
                        title="Clic para copiar"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* COPY SUCCESS TOAST */}
              {copySuccess && (
                <div className="text-center py-3 rounded-xl text-[10px] font-black uppercase tracking-widest animate-pulse" style={{ background: 'rgba(197,160,89,0.1)', color: '#c5a059', border: '1px solid rgba(197,160,89,0.2)' }}>
                  {copySuccess}
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="space-y-3 pt-2">
                {/* COPY ALL */}
                <button
                  id="btn-copy-all-social"
                  onClick={handleCopyAll}
                  disabled={isGeneratingCaption}
                  className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(197,160,89,0.12)', border: '1px solid rgba(197,160,89,0.3)', color: '#c5a059' }}
                >
                  <i className="fas fa-clipboard"></i>
                  Copiar Descripción + Link + Hashtags
                </button>

                {/* COPIAR IMAGEN */}
                <button
                  id="btn-copy-image"
                  onClick={handleCopyImage}
                  disabled={isGeneratingCaption || !shareImageBlob}
                  className="w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
                >
                  <i className="fas fa-image"></i>
                  {shareImageBlob ? 'Copiar Imagen al Portapapeles' : 'Generando imagen...'}
                </button>

                {/* 4 PLATAFORMAS */}
                <div className="grid grid-cols-2 gap-3">
                  {/* FACEBOOK */}
                  <button
                    id="btn-share-facebook"
                    onClick={() => handlePlatformShare('facebook')}
                    disabled={isGeneratingCaption}
                    className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 text-white"
                    style={{ background: 'linear-gradient(135deg, #1877F2 0%, #0d5ebc 100%)', boxShadow: '0 10px 30px rgba(24,119,242,0.35)' }}
                  >
                    <i className="fab fa-facebook-f text-base"></i>
                    Facebook
                  </button>

                  {/* TWITTER / X */}
                  <button
                    id="btn-share-twitter"
                    onClick={() => handlePlatformShare('twitter')}
                    disabled={isGeneratingCaption}
                    className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #111 0%, #222 100%)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  >
                    <i className="fab fa-x-twitter text-base"></i>
                    Twitter / X
                  </button>

                  {/* INSTAGRAM */}
                  <button
                    id="btn-share-instagram"
                    onClick={() => handlePlatformShare('instagram')}
                    disabled={isGeneratingCaption}
                    className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 text-white"
                    style={{ background: 'linear-gradient(135deg, #833ab4 0%, #fd1d1d 60%, #fcb045 100%)', boxShadow: '0 10px 30px rgba(131,58,180,0.35)' }}
                  >
                    <i className="fab fa-instagram text-base"></i>
                    Instagram
                  </button>

                  {/* TIKTOK */}
                  <button
                    id="btn-share-tiktok"
                    onClick={() => handlePlatformShare('tiktok')}
                    disabled={isGeneratingCaption}
                    className="py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #010101 0%, #1a1a2e 100%)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                  >
                    <i className="fab fa-tiktok text-base"></i>
                    TikTok
                  </button>

                  {/* #10 — WHATSAPP EN PANEL PREMIUM */}
                  <button
                    id="btn-share-whatsapp-premium"
                    onClick={() => {
                      const smartLink = getSmartLink();
                      const text = `${aiCaption}\n\n${smartLink}\n\n${aiHashtags}`;
                      if (shareImageBlob && navigator.share && navigator.canShare) {
                        const file = new File([shareImageBlob], `PROMO-${title.replace(/\s+/g,'-')}.png`, { type: 'image/png' });
                        if (navigator.canShare({ files: [file] })) {
                          navigator.share({ files: [file], text, url: smartLink });
                          return;
                        }
                      }
                      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                    }}
                    disabled={isGeneratingCaption}
                    className="col-span-2 py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 text-white"
                    style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', boxShadow: '0 10px 30px rgba(37,211,102,0.3)' }}
                  >
                    <i className="fab fa-whatsapp text-base"></i>
                    WhatsApp (imagen + texto)
                  </button>
                </div>

                <p className="text-center text-[8px] text-white/20 tracking-widest uppercase">
                  📱 En móvil: comparte directo · 💻 En escritorio: descarga imagen + texto copiado
                </p>
              </div>

            </div>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════
          BIBLIOTECA DE VERSÍCULOS BÍBLICOS MODAL
          ═══════════════════════════════════════════════════════ */}
      {showVerseModal && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
          onClick={() => setShowVerseModal(false)}
        >
          <div
            className="w-full max-w-2xl bg-[#0a0f1d] border border-[#c5a059]/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c5a059]/10 border border-[#c5a059]/30 flex items-center justify-center text-[#c5a059] text-base">
                  <i className="fas fa-book-bible"></i>
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Biblioteca de Versículos</h3>
                  <p className="text-[9px] uppercase tracking-widest text-[#c5a059]/70 mt-0.5">Selecciona un versículo para tu promo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { fetchRandomBibleVerse(); setShowVerseModal(false); }}
                  disabled={isLoadingVerse}
                  className="px-3 py-1.5 rounded-lg bg-[#c5a059] text-black text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-1.5"
                >
                  <i className={`fas ${isLoadingVerse ? 'fa-spinner fa-spin' : 'fa-dice'}`}></i>
                  Sorprender (API)
                </button>
                <button
                  onClick={() => setShowVerseModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {PRESET_VERSES.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSlogan(`"${v.text}" · ${v.ref}`);
                    setShowVerseModal(false);
                  }}
                  className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-[#c5a059]/10 border border-white/5 hover:border-[#c5a059]/30 transition-all group flex flex-col gap-2"
                >
                  <p className="text-xs font-serif italic text-white/90 group-hover:text-white leading-relaxed">
                    "{v.text}"
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#c5a059]">
                      {v.ref}
                    </span>
                    <span className="text-[8px] uppercase tracking-widest text-white/30 group-hover:text-[#c5a059] transition-colors">
                      Usar este <i className="fas fa-chevron-right ml-1 text-[7px]"></i>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// En lienzos anchos (1:1, 3:2, 16:9) la plantilla vertical se recortaba o se solapaba.
// El contenido se dibuja en un "escenario" 4:5 centrado; el fondo sigue cubriendo todo el lienzo.
const StageWrap: React.FC<{ on: boolean; width: number; children: React.ReactNode }> = ({ on, width, children }) =>
  on
    ? <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width, marginLeft: -width / 2, zIndex: 10 }}>{children}</div>
    : <>{children}</>;

const PromoTemplate: React.FC<any> = ({ 
    title, artist, bg, cover = null, mode, config: canvasConfig, overlay, overlayColor, textColor, contrastColor, glow, stroke,
    formatDate, trackList, isExport = false, country,
    grit, noise, scanlines, vignette, industrial, template,
    slogan, customFooterUrl,
    footerStyle = 'glass', coverMockup = 'vinyl', titleFont = 'bebas', titleEffect = 'glow',
    badgeType = 'biblical-advisory', colorFilter = 'none', showLensFlare = false,
    smartLinkUrl = 'https://diosmasgym.com', qrDataUrl = null, statusLabel = '',
    bgBlur = 0, bgBrightness = 100, bgContrast = 100, bgScale = 100,
    watermarkEnabled = false, watermarkStyle = 'diagonal', watermarkText = '#PuroSeñorJesucristoCompa', watermarkOpacity = 12, watermarkSize = 100,
    ribbonStyle = 'none', ribbonText = '#PuroSeñorJesucristoCompa', ribbonColor = 'gold', ribbonOpacity = 90,
    watermarkLogo = 'none', watermarkLogoPos = 'top-left', watermarkLogoOpacity = 75, watermarkLogoScale = 100
}) => {
    const coverSrc: string | null = cover || bg;
    const isWide = canvasConfig.w / canvasConfig.h > 0.85;
    const stageW = canvasConfig.h * (500 / 650);
    const config = isWide ? { ...canvasConfig, w: stageW, title: 32 * canvasConfig.h / 650 } : canvasConfig;

    // Los textos secundarios se calculaban como fracciones del titulo (2.5-5 px en una imagen de 500 px):
    // ilegibles al exportar. Se fija un minimo proporcional al ancho del lienzo.
    const fz = (k: number) => Math.max(config.title * k, 9 * (config.w / 500));

    // Titulo: tamano continuo segun largo y ancho del lienzo (antes solo 3 saltos fijos)
    const titleFs = (() => {
      const charW = ({ bebas: 0.42, anton: 0.46, cinzel: 0.56, grotesk: 0.6 } as Record<string, number>)[titleFont] ?? 0.5;
      const avail = config.w * 0.84;
      const base = config.title * 1.9;
      const len = Math.max(title.length, 1);
      const single = avail / (len * charW);      // tamano con el que cabe en una linea
      if (single >= base) return base;
      if (single >= config.title * 1.15) return single;
      const two = (avail * 2 * 0.9) / (len * charW); // dos lineas (90%: el corte cae en espacios)
      return Math.max(config.title, Math.min(config.title * 1.4, two));
    })();

    // Dynamic theme mapping
    const theme = {
      'original-v1': { accent: contrastColor || '#c5a059', glow: glow ? contrastColor : 'rgba(197,160,89,0.15)', effect: null },
      'beat-crimson': { accent: '#ff4444', glow: 'rgba(255,68,68,0.2)', effect: 'grunge' },
      'beat-cyber': { accent: '#00f2ff', glow: 'rgba(0,242,255,0.25)', effect: 'glitch' },
      'beat-platinum': { accent: '#e5e4e2', glow: 'rgba(255,255,255,0.1)', effect: 'glass' },
      'beat-toxic': { accent: '#39ff14', glow: 'rgba(57,255,20,0.2)', effect: 'radar' }
    }[template] || { accent: '#c5a059', glow: 'rgba(197,160,89,0.15)', effect: null };

    // Font Family resolution
    const titleFontFamily = {
      bebas: "'Bebas Neue', sans-serif",
      cinzel: "'DM Serif Display', serif",
      grotesk: "'Space Grotesk', sans-serif",
      anton: "'Anton', sans-serif"
    }[titleFont] || "'Bebas Neue', sans-serif";

    // QR Code URL (clean high-res SVG/PNG proxied for 4K)
    const qrCodeSrc = qrDataUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(smartLinkUrl)}&bgcolor=000000&color=ffffff&margin=1`;

    const displayUrl = customFooterUrl && customFooterUrl.trim()
      ? customFooterUrl.trim().replace(/^https?:\/\//i, '')
      : artist.toUpperCase().includes('JUAN 614') ? 'juan614.diosmasgym.com' : 'musica.diosmasgym.com';

    return (
        <div style={{ width: "100%", height: "100%", position: 'relative', overflow: 'hidden', backgroundColor: '#000' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Cinzel:wght@600;900&family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;700;900&family=Space+Grotesk:wght@400;700;900&family=Satisfy&display=swap');
            * { 
              -webkit-font-smoothing: antialiased; 
              -moz-osx-font-smoothing: grayscale;
              text-rendering: optimizeLegibility;
            }
            
            img {
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
            
            .noise-layer {
              position: absolute;
              inset: 0;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
              background-size: 100% 100%;
              opacity: ${grit * 0.1};
              mix-blend-mode: overlay;
              pointer-events: none;
              z-index: 7;
            }

            .real-grain {
              position: absolute;
              inset: 0;
              background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grainFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grainFilter)'/%3E%3C/svg%3E");
              background-size: 100% 100%;
              opacity: ${grit * 0.12};
              pointer-events: none;
              mix-blend-mode: soft-light;
              z-index: 6;
            }

            .halftone-grid {
              position: absolute;
              inset: 0;
              background-image: radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
              background-size: 8px 8px;
              background-repeat: repeat;
              pointer-events: none;
              z-index: 10;
              opacity: ${grit * 0.5};
            }

            .light-leak {
              position: absolute;
              top: -20%;
              left: -10%;
              width: 140%;
              height: 140%;
              background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0%, transparent 40%),
                          radial-gradient(circle at 80% 80%, rgba(197, 160, 89, 0.05) 0%, transparent 40%);
              pointer-events: none;
              z-index: 5;
              mix-blend-mode: screen;
            }

            .industrial-overlay {
              position: absolute;
              inset: 0;
              background: ${industrial ? 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255, 255, 255, 0.02) 1px, rgba(255, 255, 255, 0.02) 2px)' : 'none'};
              pointer-events: none;
              z-index: 4;
            }

            .scanlines {
              position: absolute;
              inset: 0;
              background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,${scanlines * 0.5}) 50%);
              background-size: 100% 2px;
              pointer-events: none;
              z-index: 8;
            }

            .vignette {
              position: absolute;
              inset: 0;
              background: radial-gradient(circle, transparent 40%, rgba(0,0,0,${vignette * 0.8}) 100%);
              pointer-events: none;
              z-index: 9;
            }

            .glitch-scan {
              position: absolute;
              inset: 0;
              background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
              background-size: 100% 2px, 3px 100%;
              pointer-events: none;
              z-index: 12;
              opacity: 0.1;
            }
          `}</style>

          {/* BACKGROUND ART (WITH PRO BLUR, BRIGHTNESS, CONTRAST, SCALE) */}
          {bg && (
            <div 
              data-export-bg
              data-export-master-img
              style={{ 
                position: "absolute", 
                inset: "-4%", 
                backgroundImage: `url("${getHighResUrl(bg)}${isExport && bg && !bg.startsWith('data:') && !bg.startsWith('blob:') ? '&export_cb=' + Date.now() : ''}")`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center', 
                backgroundRepeat: 'no-repeat',
                imageRendering: 'smooth' as any,
                transform: `scale(${bgScale / 100})`,
                filter: `blur(${bgBlur}px) brightness(${bgBrightness / 100}) contrast(${bgContrast / 100}) ${colorFilter === 'noir' 
                  ? 'grayscale(1) contrast(1.3)' 
                  : colorFilter === 'bleach-bypass' 
                  ? 'saturate(0.55)' 
                  : ''}`
              }} 
            />
          )}
          
          {/* SILK SMOOTHING OVERLAY */}
          <div 
            data-backdrop-polyfill
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.2) 100%)`,
              backdropFilter: 'contrast(1.02)',
              zIndex: 1,
              pointerEvents: 'none'
            }} 
          />

          {/* COLOR FILTER OVERLAYS */}
          {colorFilter === 'warm-gold' && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(245,158,11,0.18) 0%, rgba(180,83,9,0.25) 100%)', mixBlendMode: 'screen', zIndex: 2, pointerEvents: 'none' }} />
          )}
          {colorFilter === 'midnight-blue' && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(2,132,199,0.15) 0%, rgba(15,23,42,0.4) 100%)', mixBlendMode: 'color-dodge', zIndex: 2, pointerEvents: 'none' }} />
          )}
          {colorFilter === 'vintage' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(254, 243, 199, 0.12)', mixBlendMode: 'multiply', zIndex: 2, pointerEvents: 'none' }} />
          )}

          {/* LAYER 1: OVERLAY BASE */}
          <div style={{ 
            position: "absolute", 
            inset: 0, 
            backgroundColor: overlayColor || '#000000',
            opacity: overlay,
            zIndex: 3
          }} />

          {/* WATERMARK HASHTAG BACKGROUND (SUITE MANDO EJECUTIVO) */}
          {watermarkEnabled && watermarkText && (
            <div style={{
              position: 'absolute',
              inset: 0,
              zIndex: 4,
              pointerEvents: 'none',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: watermarkOpacity / 100
            }}>
              {watermarkStyle === 'diagonal' && (
                <div style={{
                  transform: 'rotate(-30deg)',
                  fontSize: config.title * 0.9 * (watermarkSize / 100),
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontFamily: "'Montserrat', 'Bebas Neue', sans-serif",
                  color: '#ffffff',
                  whiteSpace: 'nowrap',
                  textShadow: '0 4px 30px rgba(0,0,0,0.95)',
                  letterSpacing: '0.05em'
                }}>
                  {watermarkText}
                </div>
              )}
              {watermarkStyle === 'center' && (
                <div style={{
                  fontSize: config.title * 1.1 * (watermarkSize / 100),
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontFamily: "'Montserrat', 'Bebas Neue', sans-serif",
                  color: '#ffffff',
                  textAlign: 'center',
                  textShadow: '0 4px 30px rgba(0,0,0,0.95)',
                  letterSpacing: '0.05em',
                  padding: '0 40px'
                }}>
                  {watermarkText}
                </div>
              )}
              {watermarkStyle === 'tiled' && (
                <div style={{
                  position: 'absolute',
                  inset: '-50%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: `${config.title * 1.5}px ${config.title * 2}px`,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'rotate(-15deg)'
                }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <span key={i} style={{
                      fontSize: config.title * 0.45 * (watermarkSize / 100),
                      fontWeight: 900,
                      fontStyle: 'italic',
                      fontFamily: "'Montserrat', 'Bebas Neue', sans-serif",
                      color: '#ffffff',
                      textShadow: '0 2px 15px rgba(0,0,0,0.8)',
                      letterSpacing: '0.1em'
                    }}>
                      {watermarkText}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* RIBBON / LISTÓN DE FE (SUITE MANDO EJECUTIVO) */}
          {ribbonStyle !== 'none' && ribbonText && (
            <div style={{
              position: 'absolute',
              zIndex: 22,
              pointerEvents: 'none',
              ...(ribbonStyle === 'top' ? {
                top: 0,
                left: 0,
                right: 0,
                padding: `${config.title * 0.16}px 0`,
                background: ribbonColor === 'gold' 
                  ? 'linear-gradient(90deg, #78531b 0%, #c5a059 50%, #78531b 100%)'
                  : ribbonColor === 'black'
                  ? 'rgba(10, 12, 20, 0.95)'
                  : ribbonColor === 'white'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : ribbonColor === 'red'
                  ? 'linear-gradient(90deg, #590909 0%, #bd2c2c 50%, #590909 100%)'
                  : ribbonColor === 'blue'
                  ? 'linear-gradient(90deg, #0a225c 0%, #2b62d9 50%, #0a225c 100%)'
                  : 'linear-gradient(90deg, #093a1d 0%, #228b4c 50%, #093a1d 100%)',
                borderBottom: `2px solid ${ribbonColor === 'gold' ? '#fff2a3' : 'rgba(255,255,255,0.3)'}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.7)',
                opacity: ribbonOpacity / 100,
                textAlign: 'center'
              } : ribbonStyle === 'bottom' ? {
                bottom: `${config.title * 1.7}px`,
                left: 0,
                right: 0,
                padding: `${config.title * 0.16}px 0`,
                background: ribbonColor === 'gold' 
                  ? 'linear-gradient(90deg, #78531b 0%, #c5a059 50%, #78531b 100%)'
                  : ribbonColor === 'black'
                  ? 'rgba(10, 12, 20, 0.95)'
                  : ribbonColor === 'white'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : ribbonColor === 'red'
                  ? 'linear-gradient(90deg, #590909 0%, #bd2c2c 50%, #590909 100%)'
                  : ribbonColor === 'blue'
                  ? 'linear-gradient(90deg, #0a225c 0%, #2b62d9 50%, #0a225c 100%)'
                  : 'linear-gradient(90deg, #093a1d 0%, #228b4c 50%, #093a1d 100%)',
                borderTop: `2px solid ${ribbonColor === 'gold' ? '#fff2a3' : 'rgba(255,255,255,0.3)'}`,
                borderBottom: `2px solid ${ribbonColor === 'gold' ? '#fff2a3' : 'rgba(255,255,255,0.3)'}`,
                boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                opacity: ribbonOpacity / 100,
                textAlign: 'center'
              } : {
                top: `${config.title * 0.8}px`,
                left: `-${config.title * 1.8}px`,
                width: `${config.title * 8}px`,
                padding: `${config.title * 0.12}px 0`,
                transform: 'rotate(-45deg)',
                background: ribbonColor === 'gold' 
                  ? 'linear-gradient(90deg, #78531b 0%, #c5a059 50%, #78531b 100%)'
                  : ribbonColor === 'black'
                  ? 'rgba(10, 12, 20, 0.95)'
                  : ribbonColor === 'white'
                  ? 'rgba(255, 255, 255, 0.95)'
                  : ribbonColor === 'red'
                  ? 'linear-gradient(90deg, #590909 0%, #bd2c2c 50%, #590909 100%)'
                  : ribbonColor === 'blue'
                  ? 'linear-gradient(90deg, #0a225c 0%, #2b62d9 50%, #0a225c 100%)'
                  : 'linear-gradient(90deg, #093a1d 0%, #228b4c 50%, #093a1d 100%)',
                borderTop: '1px solid rgba(255,255,255,0.4)',
                borderBottom: '1px solid rgba(255,255,255,0.4)',
                boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                opacity: ribbonOpacity / 100,
                textAlign: 'center'
              })
            }}>
              <span style={{
                fontSize: fz(0.22),
                fontWeight: 900,
                letterSpacing: '0.15em',
                fontStyle: 'italic',
                fontFamily: "'Montserrat', 'Bebas Neue', sans-serif",
                color: ribbonColor === 'white' ? '#000000' : '#ffffff',
                textShadow: ribbonColor === 'white' ? 'none' : '0 2px 8px rgba(0,0,0,0.8)',
                textTransform: 'uppercase' as const
              }}>
                {ribbonText}
              </span>
            </div>
          )}

          {/* WATERMARK LOGO FLOTANTE (SUITE MANDO EJECUTIVO) */}
          {watermarkLogo !== 'none' && (
            <div style={{
              position: 'absolute',
              zIndex: 21,
              pointerEvents: 'none',
              opacity: watermarkLogoOpacity / 100,
              ...(watermarkLogoPos === 'top-left' ? { top: config.title * 0.6, left: config.title * 1.5 }
                : watermarkLogoPos === 'top-right' ? { top: config.title * 0.6, right: config.title * 0.8 }
                : watermarkLogoPos === 'bottom-left' ? { bottom: config.title * 1.5, left: config.title * 1.5 }
                : watermarkLogoPos === 'bottom-right' ? { bottom: config.title * 1.5, right: config.title * 1.5 }
                : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
            }}>
              <img
                src={watermarkLogo === 'mando' ? '/logo-mando-ejecutivo.png' : watermarkLogo === 'juan614' ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'}
                style={{
                  width: `${config.title * 2.2 * (watermarkLogoScale / 100)}px`,
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.9))'
                }}
              />
            </div>
          )}

          <div className="vignette" />
          <div className="light-leak" />
          <div className="halftone-grid" />
          {scanlines > 0 && <div className="scanlines" />}
          {noise && <div className="real-grain" />}
          {industrial && <div className="industrial-overlay" />}

          <StageWrap on={isWide} width={stageW}>
          {/* === BOKEH BACKGROUND === */}
          {[{x:'15%',y:'20%',s:80,o:0.07},{x:'75%',y:'10%',s:120,o:0.05},{x:'88%',y:'55%',s:60,o:0.08},{x:'5%',y:'70%',s:100,o:0.06},{x:'50%',y:'85%',s:90,o:0.05},{x:'30%',y:'40%',s:50,o:0.04}].map((b,i) => (
            <div key={i} style={{ position:'absolute', left:b.x, top:b.y, width:b.s, height:b.s, borderRadius:'50%', background:`radial-gradient(circle, ${theme.accent}${b.o}) 0%, transparent 70%)`, filter:'blur(12px)', zIndex:3, pointerEvents:'none' }} />
          ))}

          {/* === DIAGONAL ACCENT LINES === */}
          <div style={{ position:'absolute', inset:0, zIndex:11, pointerEvents:'none', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, width:'180px', height:'180px' }}>
              <div style={{ position:'absolute', top:'30px', left:'-60px', width:'200px', height:'1px', background:`linear-gradient(to right, transparent, ${theme.accent}44, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
              <div style={{ position:'absolute', top:'50px', left:'-60px', width:'200px', height:'1px', background:`linear-gradient(to right, transparent, ${theme.accent}22, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
            </div>
            <div style={{ position:'absolute', bottom:0, right:0, width:'180px', height:'180px' }}>
              <div style={{ position:'absolute', bottom:'30px', right:'-60px', width:'200px', height:'1px', background:`linear-gradient(to left, transparent, ${theme.accent}44, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
              <div style={{ position:'absolute', bottom:'50px', right:'-60px', width:'200px', height:'1px', background:`linear-gradient(to left, transparent, ${theme.accent}22, transparent)`, transform:'rotate(-45deg)', transformOrigin:'center' }} />
            </div>
          </div>

          {/* === HORIZONTAL ANAMORPHIC LENS FLARE === */}
          {showLensFlare && (
            <div style={{ position:'absolute', left:0, right:0, top:'40%', height: config.title * 3.0, zIndex:11, pointerEvents:'none', mixBlendMode:'screen' as const, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {/* Central horizontal laser beam */}
              <div style={{ position:'absolute', width:'100%', height:'2px', background:`linear-gradient(90deg, transparent 0%, ${theme.accent}22 20%, ${theme.accent} 50%, ${theme.accent}22 80%, transparent 100%)`, boxShadow:`0 0 15px ${theme.accent}, 0 0 30px ${theme.accent}88` }} />
              {/* Soft vertical dispersion */}
              <div style={{ position:'absolute', width:'60%', height:'100%', background:`radial-gradient(ellipse at center, ${theme.accent}26 0%, transparent 70%)` }} />
              {/* Center starburst */}
              <div style={{ position:'absolute', width: config.title * 1.5, height: config.title * 1.5, borderRadius:'50%', background:`radial-gradient(circle, #ffffff 0%, ${theme.accent} 40%, transparent 70%)`, filter:'blur(4px)', opacity:0.65 }} />
            </div>
          )}

          {/* === VERTICAL SIDEBAR === */}
          <div style={{ position:'absolute', left:0, top:0, bottom:0, width: config.title * 1.0, zIndex:13, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
            <div style={{ transform:'rotate(-90deg)', whiteSpace:'nowrap', fontSize: fz(0.13), fontWeight:900, letterSpacing:'0.35em', color: theme.accent, opacity:0.6, fontFamily:'Inter', textTransform:'uppercase' as const }}>
              {artist.toUpperCase().includes('JUAN 614') ? 'JUAN 614 · JESUCRISTO · 2026 · DIOSMASGYM' : 'DIOSMASGYM RECORDS · PURO CHIHUAHUA · 2026'}
            </div>
            <div style={{ position:'absolute', right:0, top:'10%', bottom:'10%', width:'1px', background:`linear-gradient(to bottom, transparent, ${theme.accent}55, transparent)` }} />
          </div>

          {/* BADGE / STICKER IN TOP RIGHT OR TOP LEFT */}
          {badgeType !== 'none' && (
            <div style={{ position: 'absolute', top: config.title * 0.6, right: config.title * 0.8, zIndex: 25, pointerEvents: 'none' }}>
              {badgeType === 'biblical-advisory' && (
                <div style={{
                  padding: `${config.title * 0.08}px ${config.title * 0.25}px`,
                  backgroundColor: '#000',
                  border: `2px solid #fff`,
                  boxShadow: `0 8px 24px rgba(0,0,0,0.8), 0 0 0 1px ${theme.accent}88`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1.1,
                  transform: 'rotate(-2deg)'
                }}>
                  <span style={{ fontSize: fz(0.16), fontWeight: 900, color: '#fff', letterSpacing: '0.2em', fontFamily: "'Bebas Neue', sans-serif" }}>PARENTAL ADVISORY</span>
                  <span style={{ fontSize: fz(0.11), fontWeight: 900, color: theme.accent, letterSpacing: '0.12em', fontFamily: 'Inter' }}>100% MENSAJE BÍBLICO</span>
                  <span style={{ fontSize: fz(0.08), fontWeight: 700, color: '#aaa', letterSpacing: '0.15em', fontFamily: 'Inter' }}>EDIFICACIÓN PURA</span>
                </div>
              )}
              {badgeType === 'exclusive' && (
                <div style={{
                  padding: `${config.title * 0.1}px ${config.title * 0.3}px`,
                  background: `linear-gradient(135deg, ${theme.accent} 0%, #000 100%)`,
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 100,
                  boxShadow: `0 8px 30px ${theme.accent}44`,
                  color: '#fff',
                  fontSize: fz(0.13),
                  fontWeight: 900,
                  letterSpacing: '0.25em',
                  fontFamily: 'Inter',
                  textTransform: 'uppercase' as const,
                  transform: 'rotate(2deg)'
                }}>
                  ★ ESTRENO MUNDIAL EXCLUSIVO ★
                </div>
              )}
              {badgeType === 'hires' && (
                <div style={{
                  padding: `${config.title * 0.1}px ${config.title * 0.25}px`,
                  backgroundColor: 'rgba(0,0,0,0.85)',
                  border: `1px solid ${theme.accent}`,
                  borderRadius: 4,
                  boxShadow: `0 6px 20px rgba(0,0,0,0.8)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: config.title * 0.15
                }}>
                  <div style={{ width: config.title * 0.35, height: config.title * 0.35, borderRadius: '50%', border: `1.5px solid ${theme.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: fz(0.18), color: theme.accent, fontWeight: 900 }}>Hi</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: fz(0.13), fontWeight: 900, color: '#fff', letterSpacing: '0.15em', fontFamily: 'Inter' }}>HI-RES AUDIO</span>
                    <span style={{ fontSize: fz(0.08), fontWeight: 700, color: theme.accent, letterSpacing: '0.2em', fontFamily: 'Inter' }}>24-BIT / 96kHz</span>
                  </div>
                </div>
              )}
              {badgeType === 'chihuahua' && (
                <div style={{
                  padding: `${config.title * 0.1}px ${config.title * 0.3}px`,
                  backgroundColor: '#000',
                  border: `1.5px solid ${theme.accent}`,
                  borderRadius: 6,
                  boxShadow: `0 10px 30px rgba(0,0,0,0.8)`,
                  color: theme.accent,
                  fontSize: fz(0.13),
                  fontWeight: 900,
                  letterSpacing: '0.2em',
                  fontFamily: 'Inter',
                  textTransform: 'uppercase' as const
                }}>
                  🤠 100% PURO CHIHUAHUA
                </div>
              )}
            </div>
          )}

          {/* MAIN PROMO STRUCTURE */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", zIndex: 10 }}>
            {theme.effect === 'glitch' && <div className="glitch-scan" />}

            {/* INNER CONTENT AREA */}
            <div style={{ flex: 1, padding: config.title * 1.2, paddingLeft: config.title * 2.2, paddingBottom: config.title * 0.6, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>

              {/* HEADER ROW */}
              <div style={{ display: "flex", flexWrap: 'wrap', justifyContent: "space-between", alignItems: 'flex-start', gap: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: fz(0.28), fontWeight: 900, letterSpacing: '0.5em', color: theme.accent, fontFamily: 'Inter' }}>{artist.toUpperCase() === "JUAN 614" ? "JUAN 614" : `${artist.toUpperCase()} RECORDS`}</div>
                    <div style={{ fontSize: fz(0.12), letterSpacing: '0.8em', opacity: 0.5, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: theme.accent }}>{artist.toUpperCase().includes('JUAN 614') ? 'PURO SEÑOR JESUCRISTO' : 'PURO CHIHUAHUA'}</span>
                    </div>
                </div>
                <div 
                  data-backdrop-polyfill
                  style={{ padding: "8px 20px", borderRadius: 4, border: `1px solid ${theme.accent}66`, background: "rgba(0, 0, 0, 0.5)", backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: theme.accent, fontSize: fz(0.22), fontWeight: '900', letterSpacing: '0.2em', fontFamily: 'Inter', boxShadow: `0 4px 20px rgba(0,0,0,0.5)` }}>
                  {statusLabel || (mode === "proximamente" ? "PRÓXIMO ESTRENO" : mode === "disponible" ? "YA DISPONIBLE" : mode === "branding" ? "MINISTERIO" : "EXTENDED PLAY")}
                </div>
              </div>

              {/* CENTER DISPLAY: 3D COVER MOCKUP & TITLE */}
              <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                
                {/* 3D COVER MOCKUP WRAPPER */}
                {coverSrc && (
                  <div style={{ position: 'relative', margin: `${config.title * 0.2}px 0`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    
                    {/* VINYL 3D RECORD DISK POPPING OUT */}
                    {coverMockup === 'vinyl' && (
                      <div style={{
                        position: 'absolute',
                        left: '42%',
                        width: config.title * 5.4,
                        height: config.title * 5.4,
                        borderRadius: '50%',
                        backgroundColor: '#0a0a0a',
                        backgroundImage: `
                          radial-gradient(circle, #0a0a0a 0%, #151515 20%, #0a0a0a 40%, #181818 60%, #0a0a0a 80%, #151515 100%),
                          conic-gradient(from 30deg, transparent 0deg, rgba(255,255,255,0.14) 40deg, transparent 80deg, transparent 180deg, rgba(255,255,255,0.14) 220deg, transparent 260deg)
                        `,
                        boxShadow: `0 30px 80px rgba(0,0,0,0.9), inset 0 0 0 2px rgba(255,255,255,0.06)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1,
                        transform: 'rotate(15deg)'
                      }}>
                        {/* Realistic concentric grooves micro-pattern */}
                        <div style={{
                          position: 'absolute',
                          inset: '4px',
                          borderRadius: '50%',
                          border: '1px dashed rgba(255,255,255,0.08)',
                          boxShadow: 'inset 0 0 0 8px rgba(0,0,0,0.5), inset 0 0 0 16px rgba(255,255,255,0.02), inset 0 0 0 24px rgba(0,0,0,0.5)'
                        }} />
                        {/* Center Vinyl Label (Galleta) */}
                        <div style={{
                          width: config.title * 1.8,
                          height: config.title * 1.8,
                          borderRadius: '50%',
                          backgroundColor: '#111',
                          border: `2px solid ${theme.accent}`,
                          boxShadow: `0 0 20px ${theme.accent}55`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundImage: `url("${getHighResUrl(coverSrc)}")`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                          overflow: 'hidden'
                        }}>
                          <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)' }} />
                          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', color: theme.accent, fontSize: fz(0.11), fontWeight: 900, letterSpacing: '0.15em' }}>
                            33⅓ RPM
                          </div>
                          {/* Center Spindle Hole */}
                          <div style={{
                            width: config.title * 0.35,
                            height: config.title * 0.35,
                            borderRadius: '50%',
                            backgroundColor: '#000',
                            border: '2px solid rgba(255,255,255,0.6)',
                            position: 'relative',
                            zIndex: 3
                          }} />
                        </div>
                      </div>
                    )}

                    {/* MAIN COVER JACKET / FRAME */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      padding: coverMockup === 'frame' ? 8 : 4,
                      background: coverMockup === 'frame'
                        ? `linear-gradient(135deg, ${theme.accent} 0%, rgba(0,0,0,0.6) 50%, ${theme.accent} 100%)`
                        : `linear-gradient(135deg, ${theme.accent} 0%, transparent 50%, ${theme.accent} 100%)`,
                      borderRadius: coverMockup === 'cd' ? 6 : 4,
                      boxShadow: "0 40px 120px rgba(0,0,0,1)",
                      border: coverMockup === 'frame' ? `1px solid ${theme.accent}` : 'none'
                    }}>
                      <div style={{
                        width: config.title * 5.6,
                        height: config.title * 5.6,
                        overflow: 'hidden',
                        borderRadius: 3,
                        position: 'relative'
                      }}>
                        <div 
                          data-export-cover
                          data-export-master-img
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            backgroundImage: `url("${getHighResUrl(coverSrc)}${isExport && coverSrc && !coverSrc.startsWith('data:') && !coverSrc.startsWith('blob:') ? '&export_cb=' + Date.now() : ''}")`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            display: 'block', 
                            filter: theme.effect === 'grunge' ? 'grayscale(0.3) contrast(1.2)' : 'none' 
                          }} 
                        />
                        
                        {/* CD JEWEL CASE ACRYLIC SHEEN OVERLAY */}
                        {coverMockup === 'cd' && (
                          <>
                            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: config.title * 0.35, background: 'linear-gradient(90deg, rgba(255,255,255,0.25) 0%, rgba(0,0,0,0.6) 40%, rgba(255,255,255,0.1) 100%)', borderRight: '1px solid rgba(255,255,255,0.2)', zIndex: 5 }} />
                            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 45%, rgba(255,255,255,0.06) 55%, transparent 100%)', pointerEvents: 'none', zIndex: 6 }} />
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                )}

                {/* TITLE & ARTIST SECTION */}
                <div style={{ marginBottom: config.title * 0.3, width: '100%' }}>
                  {mode === 'proximamente' && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 15 }}>
                      <div style={{ height: 1, width: 40, background: `linear-gradient(to right, transparent, ${theme.accent})` }}></div>
                      <h4 style={{ 
                        fontSize: fz(0.22), 
                        color: theme.accent, 
                        fontWeight: 900, 
                        letterSpacing: '0.6em', 
                        textShadow: `0 4px 20px ${theme.accent}44`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        ESTRENO MUNDIAL
                      </h4>
                      <div style={{ height: 1, width: 40, background: `linear-gradient(to left, transparent, ${theme.accent})` }}></div>
                    </div>
                  )}

                  {/* HIGH-IMPACT TITLE WITH CUSTOM FONT & EFFECT */}
                  <h1 style={{ 
                    fontSize: titleFs, 
                    fontWeight: 900, 
                    lineHeight: 0.88, 
                    fontFamily: titleFontFamily,
                    letterSpacing: titleFont === 'bebas' ? '-0.5px' : '0.02em',
                    paddingBottom: config.title * 0.1,
                    // Dynamic Title Effects
                    ...(titleEffect === 'gold' ? {
                      background: `linear-gradient(180deg, #ffffff 0%, #fff2a3 25%, #c5a059 60%, #785215 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: `drop-shadow(0 4px 20px rgba(197,160,89,0.6)) drop-shadow(0 10px 40px rgba(0,0,0,0.8))`
                    } : titleEffect === 'chrome' ? {
                      background: `linear-gradient(180deg, #ffffff 0%, #e2e8f0 30%, #64748b 50%, #ffffff 55%, #94a3b8 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: `drop-shadow(0 4px 20px rgba(255,255,255,0.4)) drop-shadow(0 10px 40px rgba(0,0,0,0.8))`
                    } : titleEffect === 'solid' ? {
                      color: textColor,
                      filter: `drop-shadow(2px 2px 0px rgba(0,0,0,0.9)) drop-shadow(4px 4px 0px rgba(0,0,0,0.7)) drop-shadow(0 10px 30px rgba(0,0,0,0.9))`
                    } : {
                      color: textColor,
                      textShadow: `0 0 80px ${theme.accent}88, 0 0 30px ${theme.accent}55, 0 10px 20px rgba(0,0,0,0.6)`,
                      filter: stroke ? `drop-shadow(0 0 3px ${theme.accent})` : `drop-shadow(0 2px 8px rgba(0,0,0,0.8))`
                    })
                  }}>
                    {title}
                  </h1>

                  {/* ARTIST BADGE */}
                  <div style={{ marginTop: config.title * 0.25 }}>
                    <h2 style={{
                      fontSize: config.title * 0.35,
                      fontWeight: 700,
                      color: theme.accent,
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                      textShadow: `0 2px 10px rgba(0,0,0,0.5)`,
                      fontFamily: 'Inter',
                      display: 'inline-block',
                      background: 'rgba(0,0,0,0.5)',
                      backdropFilter: 'blur(10px)',
                      padding: `${config.title * 0.12}px ${config.title * 0.5}px`,
                      borderRadius: 100,
                      border: `1px solid ${theme.accent}44`,
                      boxShadow: `0 8px 30px rgba(0,0,0,0.4)`
                    }}>
                      {artist}
                    </h2>
                  </div>

                  {/* VERSÍCULO / SLOGAN */}
                  {slogan && slogan.trim() && (
                    <div style={{
                      marginTop: config.title * 0.25,
                      fontSize: fz(0.28),
                      color: theme.accent,
                      fontFamily: "'DM Serif Display', serif",
                      fontStyle: 'italic',
                      letterSpacing: '0.04em',
                      textAlign: 'center',
                      opacity: 0.95,
                      textShadow: `0 2px 10px rgba(0,0,0,0.8)`,
                      padding: `${config.title * 0.1}px ${config.title * 0.5}px`,
                      borderTop: `1px solid ${theme.accent}33`,
                      borderBottom: `1px solid ${theme.accent}33`,
                      maxWidth: '85%',
                      margin: `${config.title * 0.25}px auto 0 auto`,
                      lineHeight: 1.4
                    }}>
                      {slogan}
                    </div>
                  )}
                </div>

                {/* PROXIMAMENTE DATE DISPLAY */}
                {mode === "proximamente" && (
                  <div style={{ marginTop: config.title * 0.2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div 
                      data-backdrop-polyfill
                      style={{ 
                        padding: "10px 36px", 
                        background: "rgba(255, 255, 255, 0.06)", 
                        backdropFilter: 'blur(20px)', 
                        border: `1px solid ${theme.accent}44`, 
                        borderRadius: 100,
                        boxShadow: `0 10px 40px rgba(0,0,0,0.5)`
                      }}>
                      <div style={{ fontSize: config.title * 0.45, color: textColor, fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', letterSpacing: '0.05em' }}>
                        {formatDate()}
                      </div>
                    </div>
                    {country && country.iso !== 'un' && (
                      <div style={{ fontSize: fz(0.15), fontWeight: 900, letterSpacing: '0.5em', color: theme.accent, opacity: 0.7, marginTop: 4 }}>
                        EXCLUSIVO // {country.name.toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                {/* DISPONIBLE PLATFORMS ROW (When inside center) */}
                {mode === "disponible" && footerStyle !== 'qr' && (
                  <div style={{ marginTop: config.title * 0.3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: fz(0.25), color: theme.accent, fontWeight: 900, letterSpacing: '0.3em' }}>
                       <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${theme.accent}80)`, width: 50 }}></div>
                       <span>PLATAFORMAS DIGITALES</span>
                       <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${theme.accent}80)`, width: 50 }}></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: config.title * 0.7, color: theme.accent, opacity: 0.9 }}>
                      <i className="fab fa-spotify" style={{ fontSize: config.title * 0.65 }}></i>
                      <i className="fab fa-apple" style={{ fontSize: config.title * 0.65 }}></i>
                      <i className="fab fa-youtube" style={{ fontSize: config.title * 0.65 }}></i>
                      <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.65 }}></i>
                      <i className="fab fa-amazon" style={{ fontSize: config.title * 0.65 }}></i>
                    </div>
                  </div>
                )}

                {/* ALBUM TRACKLIST */}
                {mode === 'album' && trackList && trackList.filter(t => t.trim()).length > 0 && (
                  <div style={{ width: '100%', marginTop: config.title * 0.25, marginBottom: config.title * 0.2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: config.title * 0.15 }}>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(to right, transparent, ${theme.accent}80)` }}></div>
                      <div style={{ fontSize: fz(0.2), fontWeight: 900, letterSpacing: '0.5em', color: theme.accent }}>TRACKLIST</div>
                      <div style={{ height: 1, flex: 1, background: `linear-gradient(to left, transparent, ${theme.accent}80)` }}></div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: trackList.filter(t => t.trim()).length > 5 ? '1fr 1fr' : '1fr', gap: `${config.title * 0.1}px ${config.title * 0.6}px` }}>
                      {trackList.filter(t => t.trim()).map((track, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.15, borderBottom: `1px solid ${theme.accent}22`, paddingBottom: config.title * 0.07 }}>
                          <span style={{ fontSize: fz(0.18), fontWeight: 900, color: theme.accent, minWidth: config.title * 0.45, opacity: 0.7 }}>{String(i + 1).padStart(2, '0')}</span>
                          <span style={{ fontSize: fz(0.22), fontWeight: 700, color: textColor, letterSpacing: '0.1em', opacity: 0.9, textTransform: 'uppercase' }}>{track.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>{/* END CENTER DISPLAY */}

            </div>{/* END INNER CONTENT AREA */}

            {/* ═══════════════════════════════════════════════════════
                REFINED MODERN FOOTERS (100% TRANSPARENT FLOATING)
                ═══════════════════════════════════════════════════════ */}

            {/* 1. MINIMAL FLOATING FOOTER (CLEAN & DIRECT OVER ARTWORK) */}
            {footerStyle === 'minimal' && (
              <div style={{
                background: 'transparent',
                padding: `${config.title * 0.4}px ${config.title * 1.4}px ${config.title * 0.5}px ${config.title * 1.4}px`,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {/* Left: Floating Artist / Edition */}
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: fz(0.18), fontWeight: 900, letterSpacing: '0.4em', color: theme.accent, fontFamily: 'Inter', textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.8)' }}>
                    {artist.toUpperCase()}
                  </div>
                  <div style={{ fontSize: fz(0.11), color: '#ffffff', letterSpacing: '0.2em', fontWeight: 700, opacity: 0.85, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {template.split('-')[1]?.toUpperCase() || 'PRO'} RELEASE · 2026
                  </div>
                </div>

                {/* Center: Floating URL & Streaming */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.3, color: theme.accent, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.95))' }}>
                    <i className="fab fa-spotify" style={{ fontSize: config.title * 0.32 }}></i>
                    <i className="fab fa-apple" style={{ fontSize: config.title * 0.32 }}></i>
                    <i className="fab fa-youtube" style={{ fontSize: config.title * 0.32 }}></i>
                    <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.3 }}></i>
                  </div>
                  <div style={{ fontSize: fz(0.16), color: '#ffffff', fontWeight: 900, letterSpacing: '0.25em', fontFamily: 'Inter', textTransform: 'uppercase' as const, textShadow: '0 2px 8px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.8)' }}>
                    {displayUrl}
                  </div>
                </div>

                {/* Right: Floating Logo */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{ width: config.title * 2.4, height: config.title * 1.1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <img
                      src={artist.toUpperCase().includes('JUAN 614') ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: `drop-shadow(0 2px 10px rgba(0,0,0,0.95)) drop-shadow(0 0 12px ${theme.accent}66)`,
                        transform: 'scale(1.5)', transformOrigin: 'right center'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: fz(0.09), color: '#ffffff', fontWeight: 800, letterSpacing: '0.15em', opacity: 0.6, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>© 2026 DIOSMASGYM</div>
                </div>
              </div>
            )}

            {/* 2. AUDIO SPEC & STREAMING ICONS (TRANSPARENT FLOATING) */}
            {footerStyle === 'glass' && (
              <div style={{
                background: 'transparent',
                padding: `${config.title * 0.4}px ${config.title * 1.4}px ${config.title * 0.5}px ${config.title * 1.4}px`,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {/* Left: Audio spec + Edition */}
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: fz(0.16), fontWeight: 900, letterSpacing: '0.35em', color: theme.accent, fontFamily: 'Inter', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                    {template.split('-')[1]?.toUpperCase() || 'GOLD'} EDITION
                  </div>
                  <div style={{ fontSize: fz(0.11), color: '#ffffff', letterSpacing: '0.2em', fontWeight: 700, fontFamily: 'Inter', opacity: 0.85, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    HI-RES AUDIO · 24-BIT / 96kHz
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.2, marginTop: 4, opacity: 0.95, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.9))' }}>
                    <i className="fab fa-spotify" style={{ fontSize: fz(0.28), color: theme.accent }}></i>
                    <i className="fab fa-apple" style={{ fontSize: fz(0.28), color: theme.accent }}></i>
                    <i className="fab fa-youtube" style={{ fontSize: fz(0.28), color: theme.accent }}></i>
                    <i className="fab fa-tiktok" style={{ fontSize: fz(0.26), color: theme.accent }}></i>
                  </div>
                </div>

                {/* Center: Floating URL & Tagline (No colored pill) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{
                    fontWeight: 900,
                    fontSize: fz(0.18),
                    color: theme.accent,
                    letterSpacing: '0.25em',
                    fontFamily: 'Inter',
                    textTransform: 'uppercase' as const,
                    textShadow: '0 2px 10px rgba(0,0,0,0.95), 0 0 16px rgba(0,0,0,0.85)'
                  }}>
                    {displayUrl}
                  </div>
                  <div style={{ fontSize: fz(0.13), color: '#ffffff', letterSpacing: '0.25em', opacity: 0.85, fontWeight: 700, fontFamily: 'Inter', textTransform: 'uppercase' as const, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    {artist.toUpperCase().includes('JUAN 614') ? 'Puro Señor Jesucristo' : 'Puro Chihuahua · Records'}
                  </div>
                </div>

                {/* Right: Artist Logo with drop shadow */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <div style={{ width: config.title * 2.6, height: config.title * 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <img
                      src={artist.toUpperCase().includes('JUAN 614') ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: `drop-shadow(0 2px 10px rgba(0,0,0,0.95)) drop-shadow(0 0 10px ${theme.accent}66)`,
                        transform: artist.toUpperCase().includes('JUAN 614') ? 'scale(1.1)' : 'scale(1.25)'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: fz(0.09), color: '#ffffff', fontWeight: 800, letterSpacing: '0.15em', opacity: 0.6, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>© 2026 DIOSMASGYM</div>
                </div>
              </div>
            )}

            {/* 3. RECORD LABEL & SOUNDWAVE (TRANSPARENT FLOATING) */}
            {footerStyle === 'record' && (
              <div style={{
                background: 'transparent',
                padding: `${config.title * 0.45}px ${config.title * 1.4}px ${config.title * 0.5}px ${config.title * 1.4}px`,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {/* Left: Catalog Ficha */}
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: fz(0.16), fontWeight: 900, letterSpacing: '0.3em', color: theme.accent, fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                    CAT: DGM-2026-X
                  </div>
                  <div style={{ fontSize: fz(0.11), color: '#ffffff', letterSpacing: '0.15em', fontWeight: 700, opacity: 0.85, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    PROD // DIOSMASGYM RECORDS
                  </div>
                  <div style={{ fontSize: fz(0.1), color: theme.accent, opacity: 0.8, letterSpacing: '0.15em', fontWeight: 900, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                    STEREO MASTERING 24-BIT
                  </div>
                </div>

                {/* Center: Audio Soundwave Graphic */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  {/* Soundwave SVG */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: config.title * 0.45, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.95))' }}>
                    {[8, 14, 22, 30, 18, 12, 28, 35, 24, 16, 26, 32, 18, 10, 22, 15, 8].map((h, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          width: config.title * 0.04, 
                          height: (config.title * 0.45) * (h / 35), 
                          backgroundColor: idx % 2 === 0 ? theme.accent : '#ffffff',
                          borderRadius: 2,
                          opacity: 0.95 
                        }} 
                      />
                    ))}
                  </div>
                  <div style={{ fontSize: fz(0.16), fontWeight: 900, color: '#fff', letterSpacing: '0.25em', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                    {displayUrl}
                  </div>
                </div>

                {/* Right: Seal & Logo */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                  <div style={{ width: config.title * 2.6, height: config.title * 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <img
                      src={artist.toUpperCase().includes('JUAN 614') ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: `drop-shadow(0 2px 10px rgba(0,0,0,0.95)) drop-shadow(0 0 10px ${theme.accent}66)`,
                        transform: 'scale(1.5)', transformOrigin: 'right center'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: fz(0.1), color: theme.accent, fontWeight: 800, letterSpacing: '0.2em', textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>OFFICIAL RELEASE</div>
                </div>
              </div>
            )}

            {/* 4. SMART QR SCANNER (TRANSPARENT FLOATING) */}
            {footerStyle === 'qr' && (
              <div style={{
                background: 'transparent',
                padding: `${config.title * 0.4}px ${config.title * 1.4}px ${config.title * 0.5}px ${config.title * 1.4}px`,
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box' as const,
              }}>
                {/* Left: Dynamic QR Code */}
                <div style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.3 }}>
                  <div style={{
                    padding: 3,
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    border: `1.5px solid ${theme.accent}`,
                    borderRadius: 6,
                    boxShadow: `0 4px 20px rgba(0,0,0,0.9)`,
                    width: config.title * 1.4,
                    height: config.title * 1.4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <img 
                      src={qrCodeSrc} 
                      data-export-master-img
                      crossOrigin="anonymous"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 3 }} 
                    />
                  </div>
                  <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ fontSize: fz(0.16), fontWeight: 900, letterSpacing: '0.2em', color: theme.accent, fontFamily: 'Inter', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                      ESCANEA PARA ESCUCHAR
                    </div>
                    <div style={{ fontSize: fz(0.11), color: '#ffffff', letterSpacing: '0.15em', fontWeight: 700, opacity: 0.85, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>
                      SMART LINK OFICIAL
                    </div>
                  </div>
                </div>

                {/* Center: Streaming Icons & URL */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: config.title * 0.3, color: theme.accent, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.95))' }}>
                    <i className="fab fa-spotify" style={{ fontSize: config.title * 0.35 }}></i>
                    <i className="fab fa-apple" style={{ fontSize: config.title * 0.35 }}></i>
                    <i className="fab fa-youtube" style={{ fontSize: config.title * 0.35 }}></i>
                    <i className="fab fa-tiktok" style={{ fontSize: config.title * 0.32 }}></i>
                  </div>
                  <div style={{ fontSize: fz(0.15), color: '#fff', fontWeight: 900, letterSpacing: '0.2em', fontFamily: 'monospace', textShadow: '0 2px 8px rgba(0,0,0,0.95)' }}>
                    {displayUrl}
                  </div>
                </div>

                {/* Right: Artist Logo */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <div style={{ width: config.title * 2.6, height: config.title * 1.2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                    <img
                      src={artist.toUpperCase().includes('JUAN 614') ? '/logo-juan614-v2.png' : '/logo-diosmasgym.png'}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        filter: `drop-shadow(0 2px 10px rgba(0,0,0,0.95)) drop-shadow(0 0 10px ${theme.accent}66)`,
                        transform: 'scale(1.5)', transformOrigin: 'right center'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: fz(0.09), color: '#ffffff', fontWeight: 800, letterSpacing: '0.15em', opacity: 0.6, textShadow: '0 2px 6px rgba(0,0,0,0.9)' }}>© 2026 DIOSMASGYM</div>
                </div>
              </div>
            )}

          </div>
          </StageWrap>
        </div>
    );
};

export default PromoImageApp;
