import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL inválida' });
  }
  try {
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
    res.status(200).json({ images });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo extraer imágenes del sitio.' });
  }
}
