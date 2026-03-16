// payments service - following same pattern as invoices.js / proforma.js
import api, { normalizeError } from './api';

/**
 * ============================================================================
 * PAYMENTS SERVICE
 * ============================================================================
 */

const ENABLE_SERVICE_LOGGING = false;

const serviceLogger = {
  log:   (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn:  (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

const ENDPOINTS = {
  GET_ALL: '/payments/get_all_payments/',
  CREATE:  '/payments/create_payment/',
  UPDATE:  '/payments/update_payment/',
};

// ============================================================================
// FETCH ALL PAYMENTS
// Optionally filter by invoice ID — backend accepts ?invoice=<id>
// ============================================================================

export const getPayments = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 100, ...params };
    serviceLogger.log('[Payment Service] Fetching payments:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Payment Service] getPayments failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// FETCH PAYMENTS FOR A SPECIFIC INVOICE
// ============================================================================

export const getPaymentsByInvoice = async (invoiceId) => {
  try {
    if (!invoiceId) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Payment Service] Fetching payments for invoice ID: ${invoiceId}`);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: { invoice: invoiceId } });
    const data = response.data;

    // Actual backend shape:
    // { status: 'success', data: { page, page_size, total_count, results: [...] } }
    if (Array.isArray(data?.data?.results))  return data.data.results;

    // Fallbacks for any other shape
    if (Array.isArray(data?.results))        return data.results;
    if (Array.isArray(data?.data))           return data.data;
    if (Array.isArray(data))                 return data;

    return [];
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Payment Service] getPaymentsByInvoice(${invoiceId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// CREATE PAYMENT
// ============================================================================

export const createPayment = async (paymentData) => {
  try {
    serviceLogger.log('[Payment Service] Creating payment:', paymentData);

    if (!paymentData.invoice_id) throw new Error('Invoice ID is required');
    if (!paymentData.client_id)  throw new Error('Client ID is required');
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0)
      throw new Error('A valid payment amount is required');
    if (!paymentData.payment_date) throw new Error('Payment date is required');

    const payload = {
      invoice_id:     Number(paymentData.invoice_id),
      client_id:      Number(paymentData.client_id),
      payment_date:   new Date(paymentData.payment_date).toISOString(),
      payment_method: Number(paymentData.payment_method),
      reference:      String(paymentData.reference ?? '').trim(),
      note:           String(paymentData.note ?? '').trim(),
      amount:         String(parseFloat(paymentData.amount).toFixed(2)),
    };

    serviceLogger.log('[Payment Service] createPayment payload:', payload);
    const response = await api.post(ENDPOINTS.CREATE, payload);
    serviceLogger.log('[Payment Service] Payment created successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      serviceLogger.error('[Payment Service] createPayment 400 error:', backendError);
      throw new Error(`Validation Error: ${backendError}`);
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Payment Service] createPayment failed:', errorMessage);
    throw error; // re-throw original so caller can read error.response.data
  }
};

// ============================================================================
// UPDATE PAYMENT
// Request: id, payment_date, payment_method, reference, note, amount
// ============================================================================

export const updatePayment = async (paymentData) => {
  try {
    if (!paymentData.id) throw new Error('Payment ID is required');
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0)
      throw new Error('A valid payment amount is required');
    if (!paymentData.payment_date) throw new Error('Payment date is required');

    const payload = {
      id:             Number(paymentData.id),
      payment_date:   new Date(paymentData.payment_date).toISOString(),
      payment_method: Number(paymentData.payment_method),
      reference:      String(paymentData.reference ?? '').trim(),
      note:           String(paymentData.note ?? '').trim(),
      amount:         String(parseFloat(paymentData.amount).toFixed(2)),
    };

    serviceLogger.log('[Payment Service] updatePayment payload:', payload);
    const response = await api.put(ENDPOINTS.UPDATE, payload);
    serviceLogger.log('[Payment Service] Payment updated successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      serviceLogger.error('[Payment Service] updatePayment 400 error:', backendError);
      throw new Error(`Validation Error: ${backendError}`);
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Payment Service] updatePayment failed:', errorMessage);
    throw error;
  }
};

export default {
  getPayments,
  getPaymentsByInvoice,
  createPayment,
  updatePayment,
};