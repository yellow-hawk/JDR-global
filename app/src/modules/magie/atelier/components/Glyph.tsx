import { GLYPHS, GERCE } from '../data/glyphs';

/** Dessine un signe dans sa boîte locale 0..100 */
export function GlyphPaths({ id, color, width = 5, gerce = false, gerceColor }: { id: string; color: string; width?: number; gerce?: boolean; gerceColor?: string }) {
  const prims = GLYPHS[id] ?? [];
  return (
    <>
      {prims.map((p, i) => {
        if ('d' in p) return <path key={i} d={p.d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />;
        if ('circle' in p) return <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} fill="none" stroke={color} strokeWidth={width} strokeDasharray={p.dash ? '5 5' : undefined} />;
        return <circle key={i} cx={p.dot[0]} cy={p.dot[1]} r={p.dot[2]} fill={color} />;
      })}
      {gerce && <path d={GERCE} stroke={gerceColor ?? color} strokeWidth={width + 1} strokeLinecap="round" />}
    </>
  );
}

/** Petite vignette d'un signe (palette) */
export function GlyphIcon({ id, kind, inv = false, size = 44 }: { id: string; kind: 'coeur' | 'rameau' | 'noeud'; inv?: boolean; size?: number }) {
  const color = inv ? 'var(--inv)' : 'var(--ink)';
  if (kind === 'noeud') {
    return (
      <svg viewBox="0 0 100 120" width={size} height={size * 1.2} aria-hidden="true">
        <path d="M2 66 Q50 50 98 66" fill="none" stroke="var(--muted)" strokeWidth={3} />
        <g transform={inv ? 'rotate(180 50 60)' : undefined}><GlyphPaths id={id} color={color} width={6} /></g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <g transform={kind === 'rameau' && inv ? 'rotate(180 50 50)' : undefined}>
        <GlyphPaths id={id} color={color} width={6} gerce={kind === 'coeur' && inv} gerceColor="var(--inv)" />
      </g>
    </svg>
  );
}
