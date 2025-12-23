import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { InboundMessageDto, SendTemplateDto } from './dto/whatsapp.dto';

@Injectable()
export class WhatsappService {
  constructor(private readonly db: DatabaseService) {}

  async sendTemplate(tenantId: string, dto: SendTemplateDto) {
    const client = await this.db.getClient();
    try {
      const thread = await this.ensureThread(client, tenantId, dto.toPhone, dto.cartId);
      const res = await client.query(
        `INSERT INTO whatsapp_messages (id, tenant_id, thread_id, direction, template_name, body, metadata, sent_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'outbound', $3, $4, $5, now(), now())
         RETURNING id, thread_id, sent_at`,
        [tenantId, thread, dto.templateName, this.render(dto), dto.variables || {}]
      );
      return { messageId: res.rows[0].id, threadId: res.rows[0].thread_id, status: 'queued' };
    } finally {
      client.release();
    }
  }

  async inbound(tenantId: string, dto: InboundMessageDto) {
    const client = await this.db.getClient();
    try {
      const thread = dto.threadId || (await this.ensureThread(client, tenantId, dto.from, undefined));
      const res = await client.query(
        `INSERT INTO whatsapp_messages (id, tenant_id, thread_id, direction, body, metadata, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'inbound', $3, $4, now())
         RETURNING id, thread_id`,
        [tenantId, thread, dto.body, { template: dto.isTemplate || false }]
      );
      return { messageId: res.rows[0].id, threadId: res.rows[0].thread_id };
    } finally {
      client.release();
    }
  }

  private async ensureThread(client: any, tenantId: string, _phone: string, cartId?: string): Promise<string> {
    // Simple new thread per send for now; can be enhanced to reuse by phone once column exists.
    const res = await client.query<{ id: string }>(
      `INSERT INTO whatsapp_threads (id, tenant_id, cart_id, last_message_at, status, created_at)
       VALUES (gen_random_uuid(), $1, $2, now(), 'open', now())
       RETURNING id`,
      [tenantId, cartId || null]
    );
    return res.rows[0].id;
  }

  private render(dto: SendTemplateDto) {
    if (!dto.variables) return dto.templateName;
    let body = dto.templateName;
    Object.entries(dto.variables).forEach(([k, v]) => {
      body = body.replace(`{{${k}}}`, v);
    });
    return body;
  }
}
