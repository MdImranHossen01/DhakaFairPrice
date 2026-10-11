import { ShippingOrderData, ShippingOrderResponse, ShippingProvider } from '../index';

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  storeId?: string;
  username?: string;
  password?: string;
  isSandbox?: boolean;
}

export class PathaoProvider implements ShippingProvider {
  private clientId: string;
  private clientSecret: string;
  private storeId: string;
  private username?: string;
  private password?: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private accessTokenExpiry: number | null = null;

  constructor(
    clientIdOrConfig: string | PathaoConfig,
    clientSecret?: string,
    storeId?: string,
    username?: string,
    password?: string,
    isSandbox?: boolean
  ) {
    if (typeof clientIdOrConfig === 'object') {
      this.clientId = clientIdOrConfig.clientId;
      this.clientSecret = clientIdOrConfig.clientSecret;
      this.storeId = clientIdOrConfig.storeId || '';
      this.username = clientIdOrConfig.username;
      this.password = clientIdOrConfig.password;
      this.baseUrl = clientIdOrConfig.isSandbox
        ? 'https://courier-api-sandbox.pathao.com'
        : 'https://api-hermes.pathao.com';
    } else {
      this.clientId = clientIdOrConfig;
      this.clientSecret = clientSecret || '';
      this.storeId = storeId || '';
      this.username = username;
      this.password = password;
      this.baseUrl = isSandbox
        ? 'https://courier-api-sandbox.pathao.com'
        : 'https://api-hermes.pathao.com';
    }
  }

  public async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessTokenExpiry && this.accessTokenExpiry > Date.now()) {
      return this.accessToken;
    }

    const payload: Record<string, any> = {
      client_id: this.clientId,
      client_secret: this.clientSecret,
    };

    if (this.username && this.password) {
      payload.username = this.username;
      payload.password = this.password;
      payload.grant_type = 'password';
    } else {
      payload.grant_type = 'client_credentials';
    }

    const response = await fetch(`${this.baseUrl}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Pathao token issuance failed (${response.status})`;
      try {
        const parsed = JSON.parse(errorText);
        errorMsg = parsed.message || parsed.error_description || parsed.error || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    const result = await response.json();
    if (result.access_token) {
      this.accessToken = result.access_token;
      const expiresIn = result.expires_in || 3600;
      this.accessTokenExpiry = Date.now() + (expiresIn * 1000) - 60000;
      return result.access_token;
    }

    throw new Error(result.message || result.error || 'Failed to obtain Pathao access token');
  }

  async getStores(): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/aladdin/api/v1/stores`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.data || data.data || [];
    } catch (e) {
      console.error('Error fetching Pathao stores:', e);
      return [];
    }
  }

  async getCities(): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/aladdin/api/v1/countries/1/city-list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.data || data.data || [];
    } catch (e) {
      console.error('Error fetching Pathao cities:', e);
      return [];
    }
  }

  async getZones(cityId: number | string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/aladdin/api/v1/cities/${cityId}/zone-list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.data || data.data || [];
    } catch (e) {
      console.error('Error fetching Pathao zones:', e);
      return [];
    }
  }

  async getAreas(zoneId: number | string): Promise<any[]> {
    try {
      const token = await this.getAccessToken();
      const res = await fetch(`${this.baseUrl}/aladdin/api/v1/zones/${zoneId}/area-list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data?.data || data.data || [];
    } catch (e) {
      console.error('Error fetching Pathao areas:', e);
      return [];
    }
  }

  async createOrder(data: ShippingOrderData): Promise<ShippingOrderResponse> {
    try {
      const token = await this.getAccessToken();

      let storeId = Number(data.store_id || this.storeId || 0);
      if (!storeId || isNaN(storeId)) {
        try {
          const stores = await this.getStores();
          if (stores && stores.length > 0) {
            storeId = Number(stores[0].store_id || stores[0].id);
          }
        } catch (e) {
          console.warn('Could not auto-fetch Pathao stores:', e);
        }
      }

      const phone = data.recipient_phone ? data.recipient_phone.replace(/\D/g, '').slice(-11) : '';

      const payload: Record<string, any> = {
        store_id: storeId,
        merchant_order_id: data.invoice,
        recipient_name: data.recipient_name,
        recipient_phone: phone,
        recipient_address: data.recipient_address,
        recipient_city: Number(data.city_id) || 1, // Default to Dhaka (1)
        recipient_zone: Number(data.zone_id) || 1, // Default to Zone (1)
        delivery_type: Number(data.delivery_type) || 48, // 48: Normal Delivery
        item_type: Number(data.item_type) || 2, // 2: Parcel
        special_instruction: data.note || '',
        item_quantity: Number(data.item_quantity) || 1,
        item_weight: Number(data.item_weight) || 0.5,
        amount_to_collect: Math.round(Number(data.cod_amount) || 0),
        item_description: data.item_description || data.note || 'Product Order',
      };

      if (data.area_id && Number(data.area_id) > 0) {
        payload.recipient_area = Number(data.area_id);
      }

      const response = await fetch(`${this.baseUrl}/aladdin/api/v1/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch {
        throw new Error(`Pathao response error (${response.status}): ${responseText.slice(0, 150)}`);
      }

      if (response.ok && (result.type === 'success' || result.data?.consignment_id)) {
        const consignmentId = result.data?.consignment_id || result.consignment_id;
        return {
          success: true,
          tracking_code: consignmentId,
          consignment_id: consignmentId,
          status: result.data?.order_status || result.data?.status || 'Pending',
          tracking_url: `https://merchant.pathao.com/tracking?consignment_id=${consignmentId}`,
          url: `https://merchant.pathao.com/tracking?consignment_id=${consignmentId}`,
        };
      }

      let errorMsg = result.message || 'Pathao order creation failed';
      if (result.errors && typeof result.errors === 'object') {
        const errorDetails = Object.entries(result.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('; ');
        if (errorDetails) {
          errorMsg = `${errorMsg} (${errorDetails})`;
        }
      }

      return {
        success: false,
        message: errorMsg,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Pathao Integration Error',
      };
    }
  }

  async trackOrder(trackingId: string): Promise<any> {
    const trackingUrl = `https://merchant.pathao.com/tracking?consignment_id=${trackingId}`;
    return {
      status: 'check_portal',
      tracking_url: trackingUrl,
      url: trackingUrl,
    };
  }
}

