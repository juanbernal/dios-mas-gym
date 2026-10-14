import React, { useMemo } from 'react';
import { figuraSVG } from '../../services/figuras';

const sinMovimiento = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

// Figura animada del ejercicio (SVG generado por nosotros, sin datos del usuario)
const FiguraEjercicio: React.FC<{ nombre: string; className?: string }> = ({ nombre, className }) => {
  const svg = useMemo(() => figuraSVG(nombre, !sinMovimiento()), [nombre]);
  if (!svg) return null;
  return <div className={`[&>svg]:w-full [&>svg]:h-full ${className || ''}`} aria-label={`Cómo se hace: ${nombre}`} role="img" dangerouslySetInnerHTML={{ __html: svg }} />;
};

export const tieneFigura = (nombre: string) => !!figuraSVG(nombre, false);

export default FiguraEjercicio;
