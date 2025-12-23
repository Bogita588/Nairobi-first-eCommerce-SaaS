import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../database/database.service';
import { AddItemDto, CheckoutDto, InitCartDto, PaymentMethod, QuoteDto, UpdateItemDto } from './dto/cart.dto';

type CartRow = {
  id: string;
  cart_token: string;
  status: string;
  currency: string;
  subtotal_cents: number;
  delivery_fee_cents: number;
  discount_cents: number;
};

type CartItemRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  product_name: string;
  product_slug: string;
};

@Injectable()
export class CheckoutService {
  constructor(private readonly db: DatabaseService) {}

  async initCart(tenantId: string, dto: InitCartDto) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      const token = dto.cartToken || randomUUID();
      const existing = await client.query<CartRow>(
        'SELECT id, cart_token, status, currency, subtotal_cents, delivery_fee_cents, discount_cents FROM carts WHERE cart_token = $1 AND tenant_id = $2 LIMIT 1',
        [token, tenantId]
      );
      if (existing.rows.length > 0) {
        const items = await this.loadCartItems(client, existing.rows[0].id);
        return this.toCartPayload(existing.rows[0], items);
      }
      const insert = await client.query<CartRow>(
        `INSERT INTO carts (tenant_id, cart_token, channel, status, currency, subtotal_cents, delivery_fee_cents, discount_cents, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'open', COALESCE($4,'KES'), 0, 0, 0, now() + interval '7 days', now(), now())
         RETURNING id, cart_token, status, currency, subtotal_cents, delivery_fee_cents, discount_cents`,
        [tenantId, token, dto.channel || 'web', dto.currency || 'KES']
      );
      return this.toCartPayload(insert.rows[0], []);
    } finally {
      client.release();
    }
  }

  async getCart(tenantId: string, cartToken: string) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      const cartRes = await client.query<CartRow>(
        'SELECT id, cart_token, status, currency, subtotal_cents, delivery_fee_cents, discount_cents FROM carts WHERE tenant_id = $1 AND cart_token = $2 LIMIT 1',
        [tenantId, cartToken]
      );
      if (cartRes.rows.length === 0) {
        throw new NotFoundException('Cart not found');
      }
      const items = await this.loadCartItems(client, cartRes.rows[0].id);
      return this.toCartPayload(cartRes.rows[0], items);
    } finally {
      client.release();
    }
  }

  async addItem(tenantId: string, cartToken: string, dto: AddItemDto) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      await client.query('BEGIN');
      const cart = await this.requireCart(client, tenantId, cartToken);
      const productRes = await client.query<{ id: string; base_price_cents: number; currency: string }>(
        'SELECT id, base_price_cents, currency FROM products WHERE tenant_id = $1 AND id = $2 LIMIT 1',
        [tenantId, dto.productId]
      );
      if (productRes.rows.length === 0) {
        throw new NotFoundException('Product not found');
      }
      const unitPrice = productRes.rows[0].base_price_cents;
      const existing = await client.query<CartItemRow>(
        `SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, ci.unit_price_cents, ci.line_total_cents,
                p.name as product_name, p.slug as product_slug
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id
         WHERE ci.cart_id = $1
           AND ci.product_id = $2
           AND ( (ci.variant_id IS NULL AND $3::uuid IS NULL) OR ci.variant_id = $3::uuid )
         LIMIT 1`,
        [cart.id, dto.productId, dto.variantId || null]
      );
      if (existing.rows.length > 0) {
        const newQty = existing.rows[0].quantity + dto.quantity;
        await client.query('UPDATE cart_items SET quantity = $1, line_total_cents = $2, updated_at = now() WHERE id = $3', [
          newQty,
          newQty * unitPrice,
          existing.rows[0].id
        ]);
      } else {
        await client.query(
          `INSERT INTO cart_items (tenant_id, cart_id, product_id, variant_id, quantity, unit_price_cents, line_total_cents, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, '{}', now(), now())`,
          [tenantId, cart.id, dto.productId, dto.variantId || null, dto.quantity, unitPrice, unitPrice * dto.quantity]
        );
      }
      await this.recalculateCart(client, cart.id);
      await client.query('COMMIT');
      const updated = await this.getCart(tenantId, cartToken);
      return updated;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateItem(tenantId: string, cartToken: string, itemId: string, dto: UpdateItemDto) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      await client.query('BEGIN');
      const cart = await this.requireCart(client, tenantId, cartToken);
      const item = await client.query<{ id: string; unit_price_cents: number }>(
        'SELECT id, unit_price_cents FROM cart_items WHERE cart_id = $1 AND id = $2',
        [cart.id, itemId]
      );
      if (item.rows.length === 0) {
        throw new NotFoundException('Cart item not found');
      }
      await client.query('UPDATE cart_items SET quantity = $1, line_total_cents = $2, updated_at = now() WHERE id = $3', [
        dto.quantity,
        dto.quantity * item.rows[0].unit_price_cents,
        itemId
      ]);
      await this.recalculateCart(client, cart.id);
      await client.query('COMMIT');
      return this.getCart(tenantId, cartToken);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteItem(tenantId: string, cartToken: string, itemId: string) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      await client.query('BEGIN');
      const cart = await this.requireCart(client, tenantId, cartToken);
      await client.query('DELETE FROM cart_items WHERE cart_id = $1 AND id = $2', [cart.id, itemId]);
      await this.recalculateCart(client, cart.id);
      await client.query('COMMIT');
      return this.getCart(tenantId, cartToken);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async quoteDelivery(tenantId: string, dto: QuoteDto) {
    const isPickup = dto.cityArea.toLowerCase().includes('pickup');
    const fee = isPickup ? 0 : this.estimateDeliveryFee(dto.cityArea);
    const eta = isPickup ? 5 : this.estimateEta(dto.cityArea);
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      const cart = await this.requireCart(client, tenantId, dto.cartToken);
      await client.query('UPDATE carts SET delivery_fee_cents = $1, updated_at = now() WHERE id = $2', [fee, cart.id]);
      return { cartToken: cart.cart_token, feeCents: fee, etaMinutes: eta, rule: isPickup ? 'pickup' : 'nairobi-area-rule' };
    } finally {
      client.release();
    }
  }

  async checkout(tenantId: string, dto: CheckoutDto) {
    const client = await this.db.getClient();
    try {
      await this.setTenant(client, tenantId);
      await client.query('BEGIN');
      const cart = await this.requireCart(client, tenantId, dto.cartToken, true);
      const items = await this.loadCartItems(client, cart.id);
      if (items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const customerId = await this.findOrCreateCustomer(client, tenantId, dto);
      const storeId = await this.getDefaultStoreId(client, tenantId);
      const orderNumber = await this.nextOrderNumber(client, tenantId);

      const isPickup = dto.paymentMethod === PaymentMethod.PICKUP;
      const deliveryFee = isPickup ? 0 : cart.delivery_fee_cents || this.estimateDeliveryFee(dto.cityArea);
      const subtotal = cart.subtotal_cents;
      const discount = cart.discount_cents || 0;
      const total = subtotal + deliveryFee - discount;

      const orderRes = await client.query<{ id: string }>(
        `INSERT INTO orders (
           tenant_id, store_id, customer_id, cart_id, order_number, status, channel, currency,
           subtotal_cents, delivery_fee_cents, discount_cents, total_cents, payment_status, payment_method,
           delivery_city_area, shipping_address, notes, placed_at, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, 'pending', 'web', $6,
           $7, $8, $9, $10, 'unpaid', $11,
           $12, $13, $14, now(), now(), now()
         )
         RETURNING id`,
        [
          tenantId,
          storeId,
          customerId,
          cart.id,
          orderNumber,
          cart.currency,
          subtotal,
          deliveryFee,
          discount,
          total,
          dto.paymentMethod,
          dto.cityArea,
          {
            streetAddress: dto.streetAddress,
            deliveryInstructions: dto.deliveryInstructions,
            phone: dto.phone,
            email: dto.email,
            firstName: dto.firstName,
            lastName: dto.lastName
          },
          'Nairobi checkout'
        ]
      );
      const orderId = orderRes.rows[0].id;

      for (const item of items) {
        await client.query(
          `INSERT INTO order_items (
             tenant_id, order_id, product_id, variant_id, name_snapshot, variant_snapshot,
             quantity, unit_price_cents, line_total_cents, tax_cents, created_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, now())`,
          [
            tenantId,
            orderId,
            item.product_id,
            item.variant_id,
            item.product_name,
            item.variant_id,
            item.quantity,
            item.unit_price_cents,
            item.line_total_cents
          ]
        );
      }

      const payment = await this.createPaymentRecord(client, tenantId, orderId, total, cart.currency, dto, isPickup);

      await client.query('UPDATE carts SET status = $1, delivery_fee_cents = $2, updated_at = now() WHERE id = $3', [
        'converted',
        deliveryFee,
        cart.id
      ]);

      await client.query('COMMIT');
      return {
        orderId,
        orderNumber,
        totalCents: total,
        currency: cart.currency,
        payment
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async requireCart(client: any, tenantId: string, cartToken: string, requireOpen = false): Promise<CartRow> {
    const res = await client.query<CartRow>(
      'SELECT id, cart_token, status, currency, subtotal_cents, delivery_fee_cents, discount_cents FROM carts WHERE tenant_id = $1 AND cart_token = $2 LIMIT 1',
      [tenantId, cartToken]
    );
    if (res.rows.length === 0) {
      throw new NotFoundException('Cart not found');
    }
    if (requireOpen && res.rows[0].status !== 'open') {
      throw new BadRequestException('Cart already checked out');
    }
    return res.rows[0];
  }

  private async loadCartItems(client: any, cartId: string): Promise<CartItemRow[]> {
    const items = await client.query<CartItemRow>(
      `SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity, ci.unit_price_cents, ci.line_total_cents,
              p.name AS product_name, p.slug AS product_slug
       FROM cart_items ci
       JOIN products p ON p.id = ci.product_id
       WHERE ci.cart_id = $1
       ORDER BY ci.created_at ASC`,
      [cartId]
    );
    return items.rows;
  }

  private async recalculateCart(client: any, cartId: string) {
    const totals = await client.query<{ subtotal: number }>('SELECT COALESCE(sum(line_total_cents),0) AS subtotal FROM cart_items WHERE cart_id = $1', [cartId]);
    const subtotal = Number(totals.rows[0].subtotal || 0);
    await client.query('UPDATE carts SET subtotal_cents = $1, updated_at = now() WHERE id = $2', [subtotal, cartId]);
  }

  private toCartPayload(cart: CartRow, items: CartItemRow[]) {
    const subtotal = Number(cart.subtotal_cents || 0);
    const deliveryFee = Number(cart.delivery_fee_cents || 0);
    const discount = Number(cart.discount_cents || 0);
    return {
      cartToken: cart.cart_token,
      status: cart.status,
      currency: cart.currency,
      subtotalCents: subtotal,
      deliveryFeeCents: deliveryFee,
      discountCents: discount,
      totalCents: subtotal + deliveryFee - discount,
      items: items.map((item) => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        quantity: item.quantity,
        unitPriceCents: item.unit_price_cents,
        lineTotalCents: item.line_total_cents,
        name: item.product_name,
        slug: item.product_slug
      }))
    };
  }

  private estimateDeliveryFee(cityArea: string): number {
    const key = cityArea.toLowerCase();
    if (key.includes('westlands') || key.includes('lavington')) return 250;
    if (key.includes('karen') || key.includes('ngong')) return 300;
    if (key.includes('thika') || key.includes('ruiru')) return 350;
    return 300;
  }

  private estimateEta(cityArea: string): number {
    const key = cityArea.toLowerCase();
    if (key.includes('cbd') || key.includes('westlands')) return 45;
    if (key.includes('karen') || key.includes('kitengela')) return 70;
    return 60;
  }

  private async findOrCreateCustomer(client: any, tenantId: string, dto: CheckoutDto): Promise<string> {
    const existing = await client.query<{ id: string }>(
      'SELECT id FROM customers WHERE tenant_id = $1 AND (phone = $2 OR email = $3) LIMIT 1',
      [tenantId, dto.phone, dto.email || null]
    );
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    const insert = await client.query<{ id: string }>(
      `INSERT INTO customers (tenant_id, phone, email, first_name, last_name, whatsapp_opt_in, city_area, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6,false), $7, now(), now())
       RETURNING id`,
      [tenantId, dto.phone, dto.email || null, dto.firstName || null, dto.lastName || null, dto.whatsappOptIn, dto.cityArea]
    );
    return insert.rows[0].id;
  }

  private async nextOrderNumber(client: any, tenantId: string): Promise<number> {
    const res = await client.query<{ next: number }>('SELECT COALESCE(MAX(order_number), 1000) + 1 AS next FROM orders WHERE tenant_id = $1', [
      tenantId
    ]);
    return Number(res.rows[0].next);
  }

  private async getDefaultStoreId(client: any, tenantId: string): Promise<string> {
    const existing = await client.query<{ id: string }>('SELECT id FROM stores WHERE tenant_id = $1 ORDER BY created_at ASC LIMIT 1', [tenantId]);
    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }
    const insert = await client.query<{ id: string }>(
      `INSERT INTO stores (tenant_id, name, slug, default_currency, is_live, created_at, updated_at)
       VALUES ($1, 'Default Store', 'default', 'KES', false, now(), now())
       RETURNING id`,
      [tenantId]
    );
    return insert.rows[0].id;
  }

  private async createPaymentRecord(
    client: any,
    tenantId: string,
    orderId: string,
    total: number,
    currency: string,
    dto: CheckoutDto,
    isPickup: boolean
  ) {
    const providerRef = randomUUID();
    const status = 'pending'; // pay on delivery or pickup
    const payment = await client.query<{ id: string; status: string; provider_reference: string }>(
      `INSERT INTO payments (tenant_id, order_id, method, amount_cents, currency, status, provider_reference, phone, requested_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())
       RETURNING id, status, provider_reference`,
      [tenantId, orderId, dto.paymentMethod, total, currency, status, providerRef, dto.phone]
    );
    return {
      id: payment.rows[0].id,
      status: payment.rows[0].status,
      providerReference: payment.rows[0].provider_reference,
      nextAction: isPickup ? 'Customer will pay at pickup location' : 'Collect payment on delivery (cash/MPesa at door)'
    };
  }

  private async setTenant(client: any, tenantId: string) {
    await client.query('SELECT set_config($1, $2, false)', ['app.current_tenant', tenantId]);
  }
}
