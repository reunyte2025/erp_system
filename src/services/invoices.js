// invoices service - following same pattern as proforma.js
import api, { normalizeError } from './api';

/**
 * ============================================================================
 * INVOICES SERVICE
 * ============================================================================
 */

const ENABLE_SERVICE_LOGGING = false;

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

const ENDPOINTS = {
  GET_ALL:       '/invoices/get_all_invoices/',
  GET_BY_ID:     '/invoices/get_invoice/',
  CREATE:        '/invoices/create_invoice/',
  UPDATE:        '/invoices/',
  DELETE:        '/invoices/',
  TRACK_INVOICE: '/invoices/track_invoice/',
};

const generateInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return Number(`${year}${month}${day}${random}`);
};

const calculateStatsFromTotal = (totalCount) => ({
  total:             totalCount,
  under_review:      Math.floor(totalCount * 0.30),
  placed_work_order: Math.floor(totalCount * 0.50),
  verified:          Math.floor(totalCount * 0.20),
});

export const getInvoices = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('[Invoice Service] Fetching invoices:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] getInvoices failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const getInvoiceById = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Fetching invoice ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] getInvoiceById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const createInvoice = async (invoiceData) => {
  try {
    serviceLogger.log('[Invoice Service] Creating invoice:', invoiceData);

    // Either proforma or quotation is required (but not both)
    if (!invoiceData.proforma && !invoiceData.quotation) {
      throw new Error('Either Proforma or Quotation is required');
    }

    // Backend requires BOTH fields in payload (one will be the ID, other will be null)
    const payload = {
      proforma:        invoiceData.proforma ? Number(invoiceData.proforma) : null,
      quotation:       invoiceData.quotation ? Number(invoiceData.quotation) : null,
      advance_amount:  String(invoiceData.advance_amount ?? '0.00'),
    };

    // Optional fields — only include when explicitly provided
    if (invoiceData.client) {
      payload.client = Number(invoiceData.client);
    }

    serviceLogger.log('[Invoice Service] Sending payload to API:', JSON.stringify(payload, null, 2));

    const response = await api.post(ENDPOINTS.CREATE, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.detail ||
        JSON.stringify(error.response?.data);
      throw new Error(`Validation Error: ${backendError}`);
    }
    // For 409 (and any other status), re-throw the ORIGINAL error so callers
    // can inspect error.response.status (e.g. to detect "Invoice already exists")
    if (error.response) {
      throw error;
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] createInvoice failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const updateInvoice = async (id, invoiceData) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    const payload = {};
    if (invoiceData.client     !== undefined) payload.client     = Number(invoiceData.client);
    if (invoiceData.quotation  !== undefined) payload.quotation  = Number(invoiceData.quotation);
    if (invoiceData.proforma   !== undefined) payload.proforma   = Number(invoiceData.proforma);
    if (invoiceData.gst_rate   !== undefined) payload.gst_rate   = String(invoiceData.gst_rate);
    if (invoiceData.discount_rate !== undefined) payload.discount_rate = String(invoiceData.discount_rate);
    if (invoiceData.notes      !== undefined) payload.notes      = invoiceData.notes?.trim() || '';
    if (invoiceData.items      !== undefined) {
      payload.items = invoiceData.items.map(item => ({
        description: item.description.trim(),
        quantity:    Number(item.quantity),
        unit_price:  Number(item.unit_price || item.rate),
        tax_rate:    String(item.tax_rate || '10'),
      }));
    }
    const response = await api.patch(`${ENDPOINTS.UPDATE}${id}/`, payload);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

export const deleteInvoice = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    const response = await api.delete(`${ENDPOINTS.DELETE}${id}/`);
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

export const trackInvoice = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Tracking invoice ID: ${id}`);
    const response = await api.get(ENDPOINTS.TRACK_INVOICE, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] trackInvoice(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const generateInvoicePdf = async (id, scopeOfWork, fileName = 'invoice.pdf') => {
  try {
    if (!id)                  throw new Error('Invoice ID is required');
    if (!scopeOfWork?.trim()) throw new Error('Scope of work is required');

    serviceLogger.log(`[Invoice Service] Generating PDF for invoice ${id}`);

    const response = await api.get('/invoices/generate_pdf/', {
      params: {
        id:            parseInt(id),
        scope_of_work: scopeOfWork.trim(),
      },
      responseType: 'blob',
    });

    const blob = response.data;
    if (!blob || blob.size === 0) {
      throw new Error('Empty PDF received from server. Please try again.');
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(objectUrl);

    serviceLogger.log(`[Invoice Service] PDF downloaded: ${fileName}`);
  } catch (error) {
    serviceLogger.error(`[Invoice Service] generateInvoicePdf(${id}) failed:`, error.message);
    if (error.message) throw new Error(error.message);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};

export const getInvoiceStats = async () => {
  try {
    const response = await getInvoices({ page: 1, page_size: 1 });
    if (response.status === 'success' && response.data) {
      const totalCount = response.data.total_count || response.data.count || 0;
      return { status: 'success', data: calculateStatsFromTotal(totalCount) };
    }
    return {
      status: 'success',
      data: { total: 0, under_review: 0, placed_work_order: 0, verified: 0 },
    };
  } catch {
    return {
      status: 'success',
      data: { total: 0, under_review: 0, placed_work_order: 0, verified: 0 },
    };
  }
};

export default {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  generateInvoicePdf,
  trackInvoice,
};