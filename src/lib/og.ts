import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const FONT_PATH = resolve(process.cwd(), 'scripts/_assets/InterDisplay-Regular.otf');
const FONT_DATA = readFileSync(FONT_PATH);

export interface OgInput {
  title: string;
  subtitle?: string;
}

export async function renderOgImage(input: OgInput): Promise<Buffer> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter',
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontSize: 36, fontWeight: 500, letterSpacing: '0.02em', color: '#38bdf8' },
              children: 'KLOOPIK',
            },
          },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', gap: 16 },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      fontSize: 72,
                      fontWeight: 700,
                      lineHeight: 1.1,
                      maxWidth: 1072,
                    },
                    children: input.title,
                  },
                },
                input.subtitle
                  ? {
                      type: 'div',
                      props: {
                        style: { fontSize: 32, color: '#94a3b8' },
                        children: input.subtitle,
                      },
                    }
                  : null,
              ].filter(Boolean),
            },
          },
          {
            type: 'div',
            props: {
              style: { fontSize: 28, color: '#94a3b8' },
              children: 'Play free browser games at kloopik.com',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Inter',
          data: FONT_DATA,
          weight: 400,
          style: 'normal',
        },
      ],
    },
  );

  const resvg = new Resvg(svg, { background: '#0f172a' });
  return resvg.render().asPng();
}
