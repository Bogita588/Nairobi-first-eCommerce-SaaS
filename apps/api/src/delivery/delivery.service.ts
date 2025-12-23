import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePartnerDto, CreateDeliveryOrderDto, UpdateDeliveryStatusDto } from './dto/delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(private readonly db: DatabaseService) {}

  async listPartners(tenantId: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        'SELECT id, name, provider, config, is_active, created_at FROM delivery_partners WHERE tenant_id = $1 ORDER BY created_at DESC',
        [tenantId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }

  async createPartner(tenantId: string, dto: CreatePartnerDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `INSERT INTO delivery_partners (id, tenant_id, name, provider, config, is_active, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, COALESCE($4,'{}'), COALESCE($5,true), now(), now())
         RETURNING id, name, provider, config, is_active`,
        [tenantId, dto.name, dto.provider, dto.config || {}, dto.isActive]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async createDeliveryOrder(tenantId: string, dto: CreateDeliveryOrderDto) {
    const client = await this.db.getClient();
    try {
      const order = await client.query('SELECT id FROM orders WHERE tenant_id = $1 AND id = $2 LIMIT 1', [tenantId, dto.orderId]);
      if (order.rows.length === 0) {
        throw new NotFoundException('Order not found');
      }
      const res = await client.query(
        `INSERT INTO delivery_orders (id, tenant_id, order_id, partner_id, status, notes, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, 'pending', $4, now(), now())
         RETURNING id, status, partner_id, order_id, eta_minutes, tracking_code`,
        [tenantId, dto.orderId, dto.partnerId || null, dto.notes || null]
      );
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async updateStatus(tenantId: string, deliveryId: string, dto: UpdateDeliveryStatusDto) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `UPDATE delivery_orders
         SET status = COALESCE($1, status),
             eta_minutes = COALESCE($2, eta_minutes),
             tracking_code = COALESCE($3, tracking_code),
             updated_at = now()
         WHERE tenant_id = $4 AND id = $5
         RETURNING id, status, eta_minutes, tracking_code, order_id`,
        [dto.status, dto.etaMinutes, dto.trackingCode, tenantId, deliveryId]
      );
      if (res.rows.length === 0) {
        throw new NotFoundException('Delivery order not found');
      }
      return res.rows[0];
    } finally {
      client.release();
    }
  }

  async listDeliveryOrders(tenantId: string) {
    const client = await this.db.getClient();
    try {
      const res = await client.query(
        `SELECT id, order_id, partner_id, status, eta_minutes, tracking_code, created_at, updated_at
         FROM delivery_orders
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 100`,
        [tenantId]
      );
      return res.rows;
    } finally {
      client.release();
    }
  }
}
