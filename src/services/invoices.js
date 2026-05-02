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
  UPDATE_INVOICE_ADVANCE: '/invoices/update_invoice_advance/',
  // ── PDF generation endpoints (POST, return blob) ──────────────────────────
  GENERATE_CONSTRUCTIVE_PDF:    '/invoices/generate_constructive_invoice_pdf/',
  GENERATE_OTHER_COMPANY_PDF:   '/invoices/generate_other_company_invoice_pdf/',
  GENERATE_PAYMENT_RECEIVED_PDF: '/invoices/generate_payment_received_pdf/',
};

const normalizeServiceResponse = (response) => response?.data || response;

// ─── Company ID constant ─────────────────────────────────────────────────────
// Company ID 1 = Constructive India (uses GST / constructive PDF endpoint)
// Company ID 2, 3, 4 = Other companies (uses generic other-company PDF endpoint)
export const CONSTRUCTIVE_INDIA_COMPANY_ID = 1;

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

  /**
   * Structural type detection — mirrors the logic in viewinvoicedetails.jsx.
   *
   * The backend returns HTTP 200 from ALL three invoice endpoints for any valid
   * invoice ID, sometimes with a wrong invoice_type string (e.g. the purchase
   * order endpoint returns "Vendor Compliance" for execution invoices).
   * We validate structurally before accepting a response.
   *
   * @param {object} data - Invoice response data
   * @param {string} endpointType - 'regulatory' | 'execution' | 'vendor'
   * @returns {boolean} true if this endpoint legitimately owns the invoice
   */
  const isCorrectEndpoint = (data, endpointType) => {
    if (!data) return false;

    // Vendor invoice: vendor field must be non-null and non-empty
    if (endpointType === 'vendor') {
      return data.vendor != null && data.vendor !== '';
    }

    // Client invoices (regulatory or execution): client field must be non-null
    if (endpointType === 'regulatory' || endpointType === 'execution') {
      if (data.client == null || data.client === '') return false;

      // Distinguish execution (has material/labour rates) from regulatory (does not)
      const hasRateBreakdown = Array.isArray(data.items) && data.items.some((item) =>
        (item?.material_rate   != null && parseFloat(item.material_rate)   !== 0) ||
        (item?.labour_rate     != null && parseFloat(item.labour_rate)     !== 0) ||
        (item?.material_amount != null && parseFloat(item.material_amount) !== 0) ||
        (item?.labour_amount   != null && parseFloat(item.labour_amount)   !== 0)
      );

      if (endpointType === 'execution') return hasRateBreakdown;
      if (endpointType === 'regulatory') return !hasRateBreakdown;
    }

    return true; // unknown type — accept
  };

  const tryFetch = async (fetchFn, type) => {
    try {
      const response = await fetchFn(id);
      const data = normalizeServiceResponse(response);
      if (!data || (!data.id && !data.invoice_number)) return null;

      // Structural validation: reject if this endpoint doesn't own the invoice
      if (!isCorrectEndpoint(data, type)) return null;

      return {
        status: 'success',
        data: {
          ...data,
          invoice_type: data.invoice_type || type,
        },
      };
    } catch (error) {
      const message = normalizeError(error);
      if (error?.response?.status === 404 || String(message).includes('404')) {
        return null;
      }
      return null;
    }
  };

  // Trial order: regulatory → execution → vendor
  // NEVER put vendor first — /get_purchase_order_invoice/ responds to all IDs
  // and may return misleading data (vendor=null, wrong invoice_type string).
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
 *
 * invoiceType: 'regulatory' | 'execution' | 'vendor' | '' (falls back to cascade)
 *
 * IMPORTANT: Even when invoiceType is provided, we structurally validate the
 * response. If the typed endpoint returns data that doesn't match the expected
 * type (e.g., hint says 'vendor' but response has client≠null), we fall back
 * to the full getInvoiceById() cascade which applies proper structural checks.
 */
export const getInvoiceByIdTyped = async (id, invoiceType = '') => {
  if (!id) throw new Error('Invoice ID is required');

  const type = String(invoiceType || '').toLowerCase().trim();

  // Map hint strings to endpoint function and canonical type key
  const hintMap = {
    vendor:     { fetchFn: getPurchaseOrderInvoiceById, canonical: 'vendor' },
    purchase:   { fetchFn: getPurchaseOrderInvoiceById, canonical: 'vendor' },
    execution:  { fetchFn: getExecutionInvoiceById,     canonical: 'execution' },
    regulatory: { fetchFn: getRegulatoryInvoiceById,    canonical: 'regulatory' },
  };

  const matched = Object.entries(hintMap).find(([key]) => type === key || type.includes(key));

  if (matched) {
    const [, { fetchFn, canonical }] = matched;
    try {
      const response = await fetchFn(id);
      const data = normalizeServiceResponse(response);
      if (!data || (!data.id && !data.invoice_number)) {
        // Endpoint returned empty — fall through to cascade
        return getInvoiceById(id);
      }
      // Structural validation: if this endpoint doesn't own the invoice, cascade
      // (avoids accepting a misidentified response with a wrong invoice_type string)
      const isVendor  = data.vendor != null && data.vendor !== '';
      const isClient  = data.client != null && data.client !== '';
      const hasRates  = Array.isArray(data.items) && data.items.some(item =>
        (item?.material_rate   != null && parseFloat(item.material_rate)   !== 0) ||
        (item?.labour_rate     != null && parseFloat(item.labour_rate)     !== 0) ||
        (item?.material_amount != null && parseFloat(item.material_amount) !== 0) ||
        (item?.labour_amount   != null && parseFloat(item.labour_amount)   !== 0)
      );

      const structuralType = isVendor ? 'vendor'
        : isClient && hasRates ? 'execution'
        : isClient             ? 'regulatory'
        : canonical; // no structural info — trust the hint

      if (structuralType !== canonical) {
        // Hint was wrong — let the cascade find the correct endpoint
        serviceLogger.warn(
          `[Invoice Service] getInvoiceByIdTyped: hint='${canonical}' but structural type='${structuralType}' for id=${id}. Falling back to cascade.`
        );
        return getInvoiceById(id);
      }

      return {
        status: 'success',
        data: { ...data, invoice_type: data.invoice_type || canonical },
      };
    } catch {
      // Endpoint threw — fall through to cascade
      return getInvoiceById(id);
    }
  }

  // Unknown or empty type — use full cascade with structural validation
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Internal helper: POST to a PDF endpoint, receive a blob, and trigger browser download.
 * @param {string} endpoint   - API path (from ENDPOINTS)
 * @param {object} payload    - Request body to send as JSON
 * @param {string} fileName   - Suggested filename for the downloaded file
 */
const _postAndDownloadPdf = async (endpoint, payload, fileName) => {
  const response = await api.post(endpoint, payload, { responseType: 'blob' });
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
};

/**
 * Generate & download a Constructive India invoice PDF.
 * Used ONLY when company ID === 1 (Constructive India).
 *
 * Endpoint: POST /invoices/generate_constructive_invoice_pdf/
 *
 * Payload shape:
 * {
 *   id, company_name, address, gst_no, state, sac_code, code,
 *   invoice_number, invoice_date, work_order_date, valid_from, valid_till,
 *   vendor_code, po_no, schedule_date, scope_of_work,
 *   items: [{ item_id, quantity }]
 * }
 */
export const generateConstructiveInvoicePdf = async (payload, fileName = 'invoice.pdf') => {
  try {
    if (!payload?.id) throw new Error('Invoice ID is required');
    serviceLogger.log('[Invoice Service] Generating Constructive India PDF:', payload);
    await _postAndDownloadPdf(ENDPOINTS.GENERATE_CONSTRUCTIVE_PDF, payload, fileName);
    serviceLogger.log(`[Invoice Service] Constructive PDF downloaded: ${fileName}`);
  } catch (error) {
    serviceLogger.error('[Invoice Service] generateConstructiveInvoicePdf failed:', error.message);
    throw new Error(error.message || 'Failed to generate PDF. Please try again.');
  }
};

/**
 * Generate & download an Other Company invoice PDF.
 * Used when company ID is 2, 3, or 4.
 *
 * Endpoint: POST /invoices/generate_other_company_invoice_pdf/
 *
 * Payload shape:
 * {
 *   id, invoice_number, company_name, address, gst_no, state, sac_code,
 *   po_no, schedule_date, scope_of_work,
 *   items: [{ item_id, quantity }]
 * }
 */
export const generateOtherCompanyInvoicePdf = async (payload, fileName = 'invoice.pdf') => {
  try {
    if (!payload?.id) throw new Error('Invoice ID is required');
    serviceLogger.log('[Invoice Service] Generating Other Company PDF:', payload);
    await _postAndDownloadPdf(ENDPOINTS.GENERATE_OTHER_COMPANY_PDF, payload, fileName);
    serviceLogger.log(`[Invoice Service] Other Company PDF downloaded: ${fileName}`);
  } catch (error) {
    serviceLogger.error('[Invoice Service] generateOtherCompanyInvoicePdf failed:', error.message);
    throw new Error(error.message || 'Failed to generate PDF. Please try again.');
  }
};

/**
 * Generate & download a Payment Received PDF.
 * Separate from invoice PDF — used to acknowledge received payment amount.
 *
 * Endpoint: POST /invoices/generate_payment_received_pdf/
 *
 * Payload shape:
 * {
 *   id, invoice_number, company_name, address, gst_no, state, sac_code,
 *   po_no, schedule_date, scope_of_work, received_amount
 * }
 */
export const generatePaymentReceivedPdf = async (payload, fileName = 'payment-received.pdf') => {
  try {
    if (!payload?.id) throw new Error('Invoice ID is required');
    if (!payload?.received_amount && payload?.received_amount !== 0) {
      throw new Error('Received amount is required');
    }
    serviceLogger.log('[Invoice Service] Generating Payment Received PDF:', payload);
    await _postAndDownloadPdf(ENDPOINTS.GENERATE_PAYMENT_RECEIVED_PDF, payload, fileName);
    serviceLogger.log(`[Invoice Service] Payment Received PDF downloaded: ${fileName}`);
  } catch (error) {
    serviceLogger.error('[Invoice Service] generatePaymentReceivedPdf failed:', error.message);
    throw new Error(error.message || 'Failed to generate Payment Received PDF. Please try again.');
  }
};

/**
 * Update the advance amount for an invoice.
 * Endpoint: POST /invoices/update_invoice_advance/
 *
 * Payload shape:
 * { invoice_id: <number>, advance_amount: "<string decimal>" }
 *
 * All balance / totals are recalculated server-side — frontend only needs
 * to re-fetch trackInvoice() after a successful call.
 */
export const updateInvoiceAdvance = async ({ invoice_id, advance_amount }) => {
  try {
    if (!invoice_id) throw new Error('Invoice ID is required');
    const parsed = parseFloat(advance_amount);
    if (isNaN(parsed) || parsed < 0) throw new Error('A valid advance amount (≥ 0) is required');

    const payload = {
      invoice_id:     Number(invoice_id),
      advance_amount: String(parsed.toFixed(2)),
    };

    serviceLogger.log('[Invoice Service] Updating invoice advance:', payload);
    const response = await api.post(ENDPOINTS.UPDATE_INVOICE_ADVANCE, payload);
    serviceLogger.log('[Invoice Service] Advance updated successfully:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      serviceLogger.error('[Invoice Service] updateInvoiceAdvance 400 error:', backendError);
      throw new Error(`Validation Error: ${backendError}`);
    }
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Invoice Service] updateInvoiceAdvance failed:', errorMessage);
    throw error;
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
  generateConstructiveInvoicePdf,
  generateOtherCompanyInvoicePdf,
  generatePaymentReceivedPdf,
  trackInvoice,
  updateInvoiceAdvance,
  cancelInvoice,
};