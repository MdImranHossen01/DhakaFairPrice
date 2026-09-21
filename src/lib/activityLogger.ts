import dbConnect from '@/lib/db';
import ActivityLog from '@/models/ActivityLog';
import { headers } from 'next/headers';

interface LogActionParams {
  userId?: string;
  userEmail?: string;
  role?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  success?: boolean;
  errorMessage?: string;
}

/**
 * Logs an admin/reseller action to the ActivityLog collection.
 * Call this from API route handlers after critical operations.
 * 
 * @example
 * await logActivity({
 *   userId: session.user.id,
 *   userEmail: session.user.email,
 *   role: session.user.role,
 *   action: 'UPDATE_ORDER_STATUS',
 *   resource: 'Order',
 *   resourceId: orderId,
 *   details: { newStatus: 'Delivered', previousStatus: 'Ready for Delivery' },
 * });
 */
export async function logActivity(params: LogActionParams): Promise<void> {
  try {
    await dbConnect();
    
    let ip: string | undefined;
    let userAgent: string | undefined;
    
    try {
      const headersList = await headers();
      ip = headersList.get('x-forwarded-for') ?? headersList.get('x-real-ip') ?? undefined;
      userAgent = headersList.get('user-agent') ?? undefined;
    } catch {
      // headers() may not be available in all contexts; silently continue
    }

    await ActivityLog.create({
      userId: params.userId,
      userEmail: params.userEmail,
      role: params.role,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      details: params.details,
      ip,
      userAgent,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
    });
  } catch (err) {
    // Activity logging must never break the main request flow
    console.error('[ActivityLogger] Failed to write activity log:', err);
  }
}

// Predefined action constants for consistency
export const ACTIONS = {
  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  // Product
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  SYNC_PRODUCT: 'SYNC_PRODUCT',
  // Order
  CREATE_ORDER: 'CREATE_ORDER',
  UPDATE_ORDER_STATUS: 'UPDATE_ORDER_STATUS',
  CANCEL_ORDER: 'CANCEL_ORDER',
  DELETE_ORDER: 'DELETE_ORDER',
  // Reseller
  CREATE_RESELLER: 'CREATE_RESELLER',
  APPROVE_RESELLER: 'APPROVE_RESELLER',
  SUSPEND_RESELLER: 'SUSPEND_RESELLER',
  UPDATE_RESELLER: 'UPDATE_RESELLER',
  // Payout
  RELEASE_PAYOUT: 'RELEASE_PAYOUT',
  REQUEST_PAYOUT: 'REQUEST_PAYOUT',
  // User
  UPDATE_USER_ROLE: 'UPDATE_USER_ROLE',
  DELETE_USER: 'DELETE_USER',
  // Settings
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  UPDATE_SYSTEM_DESIGN: 'UPDATE_SYSTEM_DESIGN',
  // Courier
  BOOK_COURIER: 'BOOK_COURIER',
  // Supplier
  CREATE_SUPPLIER: 'CREATE_SUPPLIER',
  UPDATE_SUPPLIER: 'UPDATE_SUPPLIER',
  // Coupon
  CREATE_COUPON: 'CREATE_COUPON',
  DELETE_COUPON: 'DELETE_COUPON',
} as const;
