import { ShippingOrderData, ShippingOrderResponse, ShippingProvider } from '../index';

export interface RedXConfig {
  apiKey?: string;
  isSandbox?: boolean;
}

export class RedXProvider implements ShippingProvider {
  private apiKey: string;
  private isSandbox: boolean;
  private baseUrl: string;

  constructor(config: string | RedXConfig) {
    if (typeof config === 'string') {
      this.apiKey = config;
      this.isSandbox = false;
    } else {
      this.apiKey = config.apiKey || '';
      this.isSandbox = Boolean(config.isSandbox);
    }

    this.baseUrl = this.isSandbox
      ? 'https://sandbox.redx.com.bd/v1.0.0-beta'
      : 'https://openapi.redx.com.bd/v1.0.0-beta';
  }

  async getAreas(postCode?: string, district?: string): Promise<any[]> {
    try {
      const url = new URL(`${this.baseUrl}/areas`);
      if (postCode) url.searchParams.set('post_code', postCode);
      if (district) url.searchParams.set('district_name', district);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Try fallback to api.redx.com.bd/v1
        const fallbackUrl = new URL(`https://api.redx.com.bd/v1/areas`);
        if (postCode) fallbackUrl.searchParams.set('post_code', postCode);
        const fallbackRes = await fetch(fallbackUrl.toString(), {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          return fallbackData.areas || fallbackData.data || (Array.isArray(fallbackData) ? fallbackData : []);
        }
        return [];
      }

      const result = await response.json();
      return result.areas || result.data || (Array.isArray(result) ? result : []);
    } catch (error: any) {
      console.error('[RedX getAreas Error]:', error.message);
      return [];
    }
  }

  async createOrder(data: ShippingOrderData): Promise<ShippingOrderResponse> {
    try {
      const areaId = parseInt(String(data.area_id), 10);
      const safeAreaId = isNaN(areaId) ? 0 : areaId;
      const weightNum = Number(data.item_weight) || 0.5;

      const payload = {
        customer_name: data.recipient_name,
        customer_phone: data.recipient_phone,
        customer_address: data.recipient_address,
        cash_to_collect: data.cod_amount,
        delivery_area_id: safeAreaId,
        area_id: safeAreaId,
        merchant_order_id: data.invoice,
        parcel_weight: weightNum,
        instruction: data.note || '',
        value: data.cod_amount || 0,
      };

      let response = await fetch(`${this.baseUrl}/parcels`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      // If openapi fails with 404, try legacy endpoint
      if (response.status === 404 && !this.isSandbox) {
        response = await fetch(`https://api.redx.com.bd/v1/parcels`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }

      const result = await response.json();

      if (response.ok) {
        const trackingId = result.tracking_id || result.trackingId || result.data?.tracking_id || result.parcel?.tracking_id;
        if (!trackingId) {
          throw new Error(result.message || 'RedX response missing tracking_id despite successful status');
        }
        return {
          success: true,
          tracking_code: String(trackingId),
          consignment_id: String(trackingId),
          status: 'booked',
          tracking_url: `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`,
          url: `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`,
        };
      }

      return {
        success: false,
        message: result.message || result.error || 'RedX order creation failed',
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'RedX Integration Error',
      };
    }
  }

  async trackOrder(trackingId: string): Promise<any> {
    const trackingUrl = `https://redx.com.bd/track-parcel/?trackingId=${trackingId}`;
    try {
      const response = await fetch(`${this.baseUrl}/parcels/${trackingId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        return {
          status: data.status || 'in_transit',
          tracking_url: trackingUrl,
          url: trackingUrl,
          details: data,
        };
      }
    } catch {
      // Fallback
    }

    return { 
      status: 'check_portal', 
      tracking_url: trackingUrl,
      url: trackingUrl,
    };
  }
}


