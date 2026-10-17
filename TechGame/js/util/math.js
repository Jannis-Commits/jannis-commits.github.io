export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + f(x), 0);

// Kurve aus [[x, y], …] auswerten. log=true interpoliert exponentiell (für Marktgrößen).
export function curve(points, x, log = false) {
  if (x <= points[0][0]) return points[0][1];
  const last = points[points.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      const t = (x - x0) / (x1 - x0);
      return log && y0 > 0 && y1 > 0 ? Math.exp(lerp(Math.log(y0), Math.log(y1), t)) : lerp(y0, y1, t);
    }
  }
  return last[1];
}

// Wert aus [[ab Jahr, Wert], …] (Stufen statt Interpolation)
export function stepAt(points, x) {
  let v = points[0][1];
  for (const [px, pv] of points) if (x >= px) v = pv;
  return v;
}
