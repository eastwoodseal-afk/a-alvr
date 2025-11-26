export const runtime = 'nodejs';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL inválida' }), { status: 400 });
    }
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);
    const images: string[] = [];
    $('img').each((_, el) => {
      let src = $(el).attr('src');
      if (src) {
        // Resolver URLs relativas
        if (!/^https?:\/\//.test(src)) {
          const base = new URL(url);
          src = new URL(src, base).href;
        }
        images.push(src);
      }
    });
    return new Response(JSON.stringify({ images }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'No se pudo extraer imágenes del sitio.' }), { status: 500 });
  }
}
