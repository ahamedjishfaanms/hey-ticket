// Deterministic geometric + watermark background for certificates. Seeded
// by the certificate's own serial (the ticket code), so every certificate
// gets a distinct pattern, but reloading the same certificate always
// reproduces the exact same one — it's derived, not stored. A tiled
// micro-text watermark of the participant's name and the event name is
// layered underneath the geometric shapes, like a banknote or a diploma.

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PALETTE = ["#EF8B0C", "#3B6E5C", "#D64550", "#14151A", "#C96A05"];

export function generateCertificatePatternSvg(
  seedStr: string,
  participantName: string,
  eventTitle: string,
  width = 900,
  height = 640
): string {
  const rand = mulberry32(hashSeed(seedStr));
  const shapes: string[] = [];
  const count = 46;

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

  // Watermark: the participant's name and the event name, tiled
  // diagonally in faint micro-text across the whole certificate —
  // fading into the paper like a banknote or diploma watermark. Built
  // as an SVG <pattern> so it tiles cheaply regardless of canvas size.
  const watermarkText = escapeXml(
    `${participantName.toUpperCase()}  •  ${eventTitle.toUpperCase()}  •  `
  );
  const tileW = 360;
  const tileH = 70;
  const watermark = `
    <defs>
      <pattern id="wm" width="${tileW}" height="${tileH}" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
        <text x="0" y="${tileH * 0.65}" font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="11" letter-spacing="2" fill="#14151A" opacity="0.05">${watermarkText}</text>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#wm)" />`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${watermark}${shapes.join("")}</svg>`;
}

export function certificatePatternDataUri(
  seedStr: string,
  participantName: string,
  eventTitle: string,
  width = 900,
  height = 640
): string {
  const svg = generateCertificatePatternSvg(seedStr, participantName, eventTitle, width, height);
  const base64 =
    typeof window === "undefined"
      ? Buffer.from(svg).toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${base64}`;
}
