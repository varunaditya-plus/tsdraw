import { DEFAULT_COLORS } from '../types.js';

export type TsdrawRenderTheme = 'light' | 'dark';

export function resolveThemeColor(colorStyle: string, theme: TsdrawRenderTheme): string {
  const paletteColor = DEFAULT_COLORS[colorStyle];
  if (!paletteColor) return colorStyle;
  if (theme === 'light') return paletteColor;
  return invertAndHueRotate180(paletteColor);
}

// temporary fix for dark mode colors. eventually make custom dark mode pallete mappings
function invertAndHueRotate180(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return color;

  const inverted = {
    r: 255 - rgb.r,
    g: 255 - rgb.g,
    b: 255 - rgb.b,
  };
  const hsl = rgbToHsl(inverted.r, inverted.g, inverted.b);
  const rotated = hslToRgb((hsl.h + 180) % 360, hsl.s, hsl.l);

  return rgbToHex(rotated.r, rotated.g, rotated.b);
}

function parseHexColor(color: string): { r: number; g: number; b: number } | null {
  const normalized = color.trim().toLowerCase();
  if (!normalized.startsWith('#')) return null;

  if (normalized.length === 4) {
    return {
      r: parseInt(normalized[1]! + normalized[1]!, 16),
      g: parseInt(normalized[2]! + normalized[2]!, 16),
      b: parseInt(normalized[3]! + normalized[3]!, 16),
    };
  }

  if (normalized.length !== 7) return null;

  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function toHex(value: number): string {
  return Math.round(Math.max(0, Math.min(255, value))).toString(16).padStart(2, '0');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  const delta = maxChannel - minChannel;
  const lightness = (maxChannel + minChannel) / 2;

  if (delta === 0) {
    return { h: 0, s: 0, l: lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - maxChannel - minChannel) : delta / (maxChannel + minChannel);

  let hue = 0;
  if (maxChannel === red) {
    hue = ((green - blue) / delta + (green < blue ? 6 : 0)) * 60;
  } else if (maxChannel === green) {
    hue = ((blue - red) / delta + 2) * 60;
  } else {
    hue = ((red - green) / delta + 4) * 60;
  }

  return { h: hue, s: saturation, l: lightness };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  if (s === 0) {
    const channel = l * 255;
    return { r: channel, g: channel, b: channel };
  }

  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hueSegment = h / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  let red = 0;
  let green = 0;
  let blue = 0;

  if (hueSegment >= 0 && hueSegment < 1) {
    red = chroma;
    green = x;
  } else if (hueSegment < 2) {
    red = x;
    green = chroma;
  } else if (hueSegment < 3) {
    green = chroma;
    blue = x;
  } else if (hueSegment < 4) {
    green = x;
    blue = chroma;
  } else if (hueSegment < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = l - chroma / 2;
  return {
    r: (red + match) * 255,
    g: (green + match) * 255,
    b: (blue + match) * 255,
  };
}
