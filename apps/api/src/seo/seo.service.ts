import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SeoService {
  constructor(private readonly db: DatabaseService) {}

  async sitemap(tenantId: string, host: string) {
    const client = await this.db.getClient();
    try {
      const categories = await client.query<{ slug: string }>('SELECT slug FROM categories WHERE tenant_id = $1 ORDER BY slug', [tenantId]);
      const products = await client.query<{ slug: string }>('SELECT slug FROM products WHERE tenant_id = $1 ORDER BY slug', [tenantId]);
      const urls = [
        ...categories.rows.map((c) => this.url(host, `/category/${c.slug}`)),
        ...products.rows.map((p) => this.url(host, `/product/${p.slug}`))
      ];
      return this.buildXml(urls);
    } finally {
      client.release();
    }
  }

  async areas() {
    const estates = ['westlands', 'lavington', 'karen', 'ruiru', 'thika-road', 'kitengela', 'ngong'];
    return estates.map((e) => ({
      slug: e,
      title: `${this.titleCase(e)} deals in Nairobi`,
      description: `Fast delivery and pickup options for ${this.titleCase(e)}`
    }));
  }

  private buildXml(urls: string[]) {
    const items = urls
      .map(
        (u) => `<url>
  <loc>${u}</loc>
  <changefreq>daily</changefreq>
  <priority>0.8</priority>
</url>`
      )
      .join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>`;
  }

  private url(host: string, path: string) {
    const normalized = host.startsWith('http') ? host : `https://${host}`;
    return `${normalized}${path}`;
  }

  private titleCase(str: string) {
    return str
      .split('-')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }
}
