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
  GET_ALL:               '/invoices/get_all_invoices/',
  GET_REGULATORY:        '/invoices/get_regulatory_invoice/',
  GET_EXECUTION:         '/invoices/get_execution_invoice/',
  GET_PURCHASE_ORDER:    '/invoices/get_purchase_order_invoice/',
  CREATE_PURCHASE_ORDER: '/invoices/create_purchase_order_invoice/',
  CREATE_REGULATORY:     '/invoices/create_regulatory_invoice/',
  CREATE_EXECUTION:      '/invoices/create_execution_invoice/',
  TRACK_INVOICE:         '/invoices/track_invoice/',
  CANCEL_INVOICE:        '/invoices/cancelled_invoice/',
};

const normalizeServiceResponse = (response) => response?.data || response;

export const getInvoices = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    if (!queryParams.company) delete queryParams.company;
    serviceLogger.log('[Invoice Service] Fetching invoices:', queryParams);
    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] getInvoices failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetches a Regulatory invoice by ID.
 * Endpoint: GET /invoices/get_regulatory_invoice/?id=<id>
 */
export const getRegulatoryInvoiceById = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Fetching regulatory invoice ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_REGULATORY, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] getRegulatoryInvoiceById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetches an Execution invoice by ID.
 * Endpoint: GET /invoices/get_execution_invoice/?id=<id>
 */
export const getExecutionInvoiceById = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Fetching execution invoice ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_EXECUTION, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] getExecutionInvoiceById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetches a Purchase Order (Vendor) invoice by ID.
 * Endpoint: GET /invoices/get_purchase_order_invoice/?id=<id>
 */
export const getPurchaseOrderInvoiceById = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Fetching purchase order invoice ID: ${id}`);
    const response = await api.get(ENDPOINTS.GET_PURCHASE_ORDER, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] getPurchaseOrderInvoiceById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const getInvoiceById = async (id) => {
  if (!id) throw new Error('Invoice ID is required');

  const tryFetch = async (fetchFn, type) => {
    try {
      const response = await fetchFn(id);
      const data = normalizeServiceResponse(response);
      if (data && (data.id || data.invoice_number)) {
        return {
          status: 'success',
          data: {
            ...data,
            invoice_type: data.invoice_type || type,
          },
        };
      }
      return null;
    } catch (error) {
      const message = normalizeError(error);
      if (error?.response?.status === 404 || String(message).includes('404')) {
        return null;
      }
      return null;
    }
  };

  const regulatory = await tryFetch(getRegulatoryInvoiceById, 'regulatory');
  if (regulatory) return regulatory;

  const execution = await tryFetch(getExecutionInvoiceById, 'execution');
  if (execution) return execution;

  const purchaseOrder = await tryFetch(getPurchaseOrderInvoiceById, 'vendor');
  if (purchaseOrder) return purchaseOrder;

  throw new Error('Invoice not found. It may have been deleted or does not exist.');
};

/**
 * Creates a Regulatory Compliance invoice.
 * Payload: { proforma: <id>, advance_amount: "0.00" }
 */
export const createRegulatoryInvoice = async ({ proforma, advance_amount }) => {
  try {
    if (!proforma) throw new Error('Proforma ID is required for a Regulatory invoice');
    const payload = {
      proforma:       Number(proforma),
      advance_amount: String(advance_amount ?? '0.00'),
    };
    serviceLogger.log('[Invoice Service] Creating regulatory invoice:', payload);
    const response = await api.post(ENDPOINTS.CREATE_REGULATORY, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      throw new Error(`Validation Error: ${backendError}`);
    }
    if (error.response) throw error;
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] createRegulatoryInvoice failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Creates an Execution Compliance invoice.
 * Payload: { proforma: <id>, advance_amount: "0.00" }
 */
export const createExecutionInvoice = async ({ proforma, advance_amount }) => {
  try {
    if (!proforma) throw new Error('Proforma ID is required for an Execution invoice');
    const payload = {
      proforma:       Number(proforma),
      advance_amount: String(advance_amount ?? '0.00'),
    };
    serviceLogger.log('[Invoice Service] Creating execution invoice:', payload);
    const response = await api.post(ENDPOINTS.CREATE_EXECUTION, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      throw new Error(`Validation Error: ${backendError}`);
    }
    if (error.response) throw error;
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] createExecutionInvoice failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Creates a Purchase Order (Vendor) invoice.
 * Payload: { quotation: <id>, advance_amount: "0.00" }
 */
export const createPurchaseOrderInvoice = async ({ quotation, advance_amount }) => {
  try {
    if (!quotation) throw new Error('Quotation ID is required for a Purchase Order invoice');
    const payload = {
      quotation:      Number(quotation),
      advance_amount: String(advance_amount ?? '0.00'),
    };
    serviceLogger.log('[Invoice Service] Creating purchase-order invoice:', payload);
    const response = await api.post(ENDPOINTS.CREATE_PURCHASE_ORDER, payload);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      throw new Error(`Validation Error: ${backendError}`);
    }
    if (error.response) throw error;
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] createPurchaseOrderInvoice failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * Fetches an invoice by ID using the CORRECT endpoint for the known type.
 * Avoids the wrong-order cascade in getInvoiceById() which can return a
 * regulatory invoice when a vendor invoice was requested (both share the same
 * numeric ID namespace across different tables).
 *
 * invoiceType: 'regulatory' | 'execution' | 'vendor' | '' (falls back to cascade)
 */
export const getInvoiceByIdTyped = async (id, invoiceType = '') => {
  if (!id) throw new Error('Invoice ID is required');

  const type = String(invoiceType || '').toLowerCase().trim();

  const wrap = async (fetchFn, resolvedType) => {
    const response = await fetchFn(id);
    const data = normalizeServiceResponse(response);
    if (!data || (!data.id && !data.invoice_number)) throw new Error('Invoice not found');
    return {
      status: 'success',
      data: { ...data, invoice_type: data.invoice_type || resolvedType },
    };
  };

  if (type === 'vendor' || type.includes('vendor') || type.includes('purchase')) {
    return wrap(getPurchaseOrderInvoiceById, 'vendor');
  }
  if (type === 'execution' || type.includes('execution')) {
    return wrap(getExecutionInvoiceById, 'execution');
  }
  if (type === 'regulatory' || type.includes('regulatory')) {
    return wrap(getRegulatoryInvoiceById, 'regulatory');
  }

  // Unknown type — fall back to the original cascade
  return getInvoiceById(id);
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

export const cancelInvoice = async (id) => {
  try {
    if (!id) throw new Error('Invoice ID is required');
    serviceLogger.log(`[Invoice Service] Cancelling invoice ID: ${id}`);
    const response = await api.delete(ENDPOINTS.CANCEL_INVOICE, { params: { id } });
    return { status: 'success', data: response.data };
  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error(`[Invoice Service] cancelInvoice(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export default {
  getInvoices,
  getInvoiceById,
  getInvoiceByIdTyped,
  getRegulatoryInvoiceById,
  getExecutionInvoiceById,
  getPurchaseOrderInvoiceById,
  createRegulatoryInvoice,
  createExecutionInvoice,
  createPurchaseOrderInvoice,
  generateInvoicePdf,
  trackInvoice,
  cancelInvoice,
};