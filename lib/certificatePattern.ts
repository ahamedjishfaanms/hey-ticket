// Deterministic geometric background for certificates. Seeded by the
// certificate's own serial (the ticket code), so every certificate gets
// a distinct pattern, but reloading the same certificate always
// reproduces the exact same one — it's derived, not stored.

function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = ["#EF8B0C", "#3B6E5C", "#D64550", "#14151A", "#C96A05"];

export function generateCertificatePatternSvg(
  seedStr: string,
  width = 900,
  height = 640
): string {
  const rand = mulberry32(hashSeed(seedStr));
  const shapes: string[] = [];
  const count = 52;

  for (let i = 0; i < count; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const size = 16 + rand() * 48;
    const rotation = Math.floor(rand() * 360);
    const color = PALETTE[Math.floor(rand() * PALETTE.length)];
    const opacity = (0.035 + rand() * 0.06).toFixed(3);
    const kind = rand();

    if (kind < 0.4) {
      const points = `0,${-size} ${size * 0.87},${size * 0.5} ${-size * 0.87},${size * 0.5}`;
      shapes.push(
        `<polygon points="${points}" transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)}) rotate(${rotation})" fill="${color}" opacity="${opacity}" />`
      );
    } else if (kind < 0.75) {
      shapes.push(
        `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(size * 0.45).toFixed(1)}" fill="${color}" opacity="${opacity}" />`
      );
    } else {
      const s = size * 0.8;
      shapes.push(
        `<rect x="${(cx - s / 2).toFixed(1)}" y="${(cy - s / 2).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" transform="rotate(${rotation} ${cx.toFixed(1)} ${cy.toFixed(1)})" fill="${color}" opacity="${opacity}" />`
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${shapes.join("")}</svg>`;
}

export function certificatePatternDataUri(seedStr: string, width = 900, height = 640): string {
  const svg = generateCertificatePatternSvg(seedStr, width, height);
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
