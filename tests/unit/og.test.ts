import { describe, it, expect } from 'vitest';
import { renderOgImage } from '../../src/lib/og';

describe('renderOgImage', () => {
  it('returns a PNG buffer of the expected dimensions', async () => {
    const png = await renderOgImage({
      title: 'Test Game',
      subtitle: 'Puzzle',
    });
    // PNG magic bytes: 0x89 0x50 0x4E 0x47
    expect(png.slice(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    // IHDR width/height live at bytes 16-23 (big-endian).
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    expect(width).toBe(1200);
    expect(height).toBe(630);
  }, 15_000);

  it('handles long titles without throwing', async () => {
    const title = 'A Very Long Game Title That Should Still Render Because We Truncate Or Wrap';
    const png = await renderOgImage({ title, subtitle: 'Puzzle' });
    expect(png.length).toBeGreaterThan(1000);
  }, 15_000);
});
