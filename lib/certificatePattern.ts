// Deterministic geometric + watermark background for certificates. Seeded
// by the certificate's own serial (the ticket code), so every certificate
// gets a distinct pattern, but reloading the same certificate always
// reproduces the exact same one — it's derived, not stored. The
// watermark is the participant's name, the event name, and the
// certificate's own serial number, flowing along wavy lines across the
// page — like the flowing guilloché lines on currency or a diploma,
// rather than plain diagonally-tiled text. The geometric shapes on top
// are unchanged.

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

  // Watermark: name, event, and serial repeated and set along gently
  // undulating wave paths stacked across the page — a flowing, banknote-
  // style watermark rather than flat diagonal tiling. Each row's wave is
  // its own <path>, and the text rides it via <textPath>, so the letters
  // themselves curve up and down with the line.
  const watermarkText = escapeXml(
    `${participantName.toUpperCase()}  •  ${eventTitle.toUpperCase()}  •  ${seedStr}  •  `
  );
  // Tight row spacing, like ruled notebook paper, rather than wide gaps
  // between lines — and a smaller, quieter font so it genuinely reads as
  // background texture sitting behind the geometric shapes, not a
  // second layer of content competing with them.
  const rowSpacing = 17;
  const rows = Math.ceil(height / rowSpacing) + 1;
  const wavePaths: string[] = [];
  const waveTexts: string[] = [];

  for (let row = 0; row < rows; row++) {
    const baseY = row * rowSpacing + rowSpacing / 2;
    const amplitude = 2.5 + rand() * 3;
    const waveLength = 90 + rand() * 50;
    const phaseFlip = row % 2 === 0 ? 1 : -1;

    let d = `M-20,${baseY.toFixed(1)}`;
    let dir = phaseFlip;
    for (let x = -20; x < width + waveLength; x += waveLength) {
      const midX = x + waveLength / 2;
      const endX = x + waveLength;
      d += ` Q${midX.toFixed(1)},${(baseY + dir * amplitude).toFixed(1)} ${endX.toFixed(1)},${baseY.toFixed(1)}`;
      dir *= -1;
    }

    const id = `wmwave${row}`;
    wavePaths.push(`<path id="${id}" d="${d}" fill="none" />`);

    // Repeat the text enough times to fill the row at this font size,
    // with a per-row offset so rows don't all start aligned — it reads
    // less like a grid and more like a continuous flowing pattern.
    const repeated = watermarkText.repeat(8);
    const startOffset = (rand() * 200).toFixed(0);
    waveTexts.push(
      `<text font-family="ui-monospace, 'JetBrains Mono', monospace" font-size="7" letter-spacing="1.2" fill="#14151A" opacity="0.045"><textPath href="#${id}" xlink:href="#${id}" startOffset="${startOffset}">${repeated}</textPath></text>`
    );
  }

  const watermark = `<defs>${wavePaths.join("")}</defs>${waveTexts.join("")}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${watermark}${shapes.join("")}</svg>`;
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
