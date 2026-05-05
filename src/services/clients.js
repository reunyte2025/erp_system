import api, { normalizeError } from './api';

/**
 * ============================================================================
 * CLIENTS SERVICE
 * ============================================================================
 *
 * Stats (total, draft, star, newly added) are returned directly by the
 * get_all_client endpoint — no separate stats API call is needed.
 *
 * API schema fields accepted by create_client:
 *   first_name, last_name, email, phone_number,
 *   address, city, state, pincode, gst_number, is_draft
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = false;

const serviceLogger = {
  log: (...args) => ENABLE_SERVICE_LOGGING && console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const ENDPOINTS = {
  GET_ALL:      '/clients/get_all_client/',
  GET_BY_NAME:  '/clients/get_all_client_by_name/', // GET ?search=<query>
  GET_BY_ID:    '/clients/get_client/',              // query param: ?id=
  CREATE:       '/clients/create_client/',
  UPDATE:       '/clients/update_client/',           // PUT /clients/update_client/
  DELETE:       '/clients/delete_client/',           // DELETE /clients/delete_client/?id=
  UNDO:         '/clients/undo_client/',             // PATCH /clients/undo_client/?id=
  SEARCH:       '/clients/search/',
  EXPORT:       '/clients/export/',
  TOGGLE_STAR:  '/clients/change_star_client_status/', // PUT ?id=&is_star=
  BULK_DELETE:  '/clients/bulk-delete/',
  BULK_UPDATE:  '/clients/bulk-update/',
};

const NOTE_ENDPOINTS = {
  GET_ALL: '/notes/get_all_notes/',   // query param: ?client_id=
  CREATE:  '/notes/create_note/',
  DELETE:  '/notes/delete_note/',     // DELETE /notes/delete_note/:id/
};

// ============================================================================
// UTILITY
// ============================================================================

const sanitizePhoneNumber = (phone) => {
  if (!phone) return '';
  // Keep leading + for international format (e.g. +919856789654)
  // Only strip spaces, dashes, parentheses, dots — NOT the + sign
  const trimmed = phone.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/[\s\-().]/g, '');
  return hasPlus ? digits : digits.replace(/[^0-9]/g, '');
};

const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// ============================================================================
// GET ALL CLIENTS
// Response includes: total_count, draft_count, star_count, new_count, results[]
// Supports filter params: first_name, last_name, email, gst_number
// ============================================================================

export const getClients = async (params = {}) => {
  try {
    const queryParams = {
      page: 1,
      page_size: 10,
      ...params,
    };

    const response = await api.get(ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Clients Service] getClients failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// SEARCH CLIENTS BY NAME
// GET /clients/get_all_client_by_name/?search=<query>
// Returns a flat array of matching client objects.
// ============================================================================

export const searchClientsByName = async (query) => {
  try {
    if (!query || !query.trim()) return [];

    serviceLogger.log(`[Clients Service] Searching clients by name: "${query}"`);

    const response = await api.get(ENDPOINTS.GET_BY_NAME, {
      params: { search: query.trim() },
    });

    // API may return a flat array OR a paginated object { results: [] }
    const data = response.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.data?.results)) return data.data.results;

    serviceLogger.warn('[Clients Service] Unexpected searchClientsByName response shape:', data);
    return [];

  } catch (error) {
    const errorMessage = normalizeError(error);
    serviceLogger.error('[Clients Service] searchClientsByName failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// GET CLIENT BY ID
// ============================================================================

export const getClientById = async (id) => {
  try {
    if (!id) throw new Error('Client ID is required');

    serviceLogger.log(`[Clients Service] Fetching client ID: ${id}`);

    const response = await api.get(ENDPOINTS.GET_BY_ID, { params: { id } });

    serviceLogger.log('[Clients Service] Client data:', response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] getClientById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// CREATE CLIENT
//
// is_draft controls whether client is saved as active (false) or draft (true).
// Backend schema: first_name, last_name, email, phone_number,
//                 address, city, state, pincode, gst_number, is_draft
// ============================================================================

export const createClient = async (clientData) => {
  try {
    serviceLogger.log('[Clients Service] Creating client:', clientData);

    // ── Validation ────────────────────────────────────────────────────────
    if (!clientData.first_name || !clientData.last_name) {
      throw new Error('First name and last name are required');
    }

    // For drafts, phone/email may be empty — only validate when provided
    const isDraft = clientData.is_draft === true;

    if (!isDraft) {
      if (!clientData.email) throw new Error('Email is required');
      if (!isValidEmail(clientData.email)) throw new Error('Invalid email format');
      if (!clientData.phone_number) throw new Error('Phone number is required');

      const cleanPhone = sanitizePhoneNumber(clientData.phone_number);
      const digitCount = cleanPhone.replace(/[^0-9]/g, '').length;
      if (digitCount < 10) throw new Error('Phone number must be at least 10 digits');
    }

    // ── Payload ───────────────────────────────────────────────────────────
    const cleanPhone = sanitizePhoneNumber(clientData.phone_number || '');

    const payload = {
      first_name:   clientData.first_name.trim(),
      last_name:    clientData.last_name.trim(),
      email:        clientData.email?.trim().toLowerCase() || '',
      phone_number: cleanPhone,
      is_draft:     isDraft,               // ← required by backend
      address:      clientData.address?.trim()    || '',
      city:         clientData.city?.trim()        || '',
      state:        clientData.state?.trim()       || '',
      pincode:      clientData.pincode?.trim()     || '',
      gst_number:   clientData.gst_number?.trim().toUpperCase() || '',
    };

    serviceLogger.log('[Clients Service] Payload:', JSON.stringify(payload, null, 2));

    const response = await api.post(ENDPOINTS.CREATE, payload);

    serviceLogger.log('[Clients Service] Created successfully:', response.data);
    return response.data;

  } catch (error) {
    serviceLogger.error('[Clients Service] createClient failed:', error);
    serviceLogger.error('[Clients Service] Error response:', error.response?.data);

    if (error.response?.status === 400) {
      const backendError =
        error.response?.data?.message  ||
        error.response?.data?.error    ||
        error.response?.data?.detail   ||
        JSON.stringify(error.response?.data);
      const err400 = new Error(`Validation error: ${backendError}`);
      err400.response = error.response;
      throw err400;
    }

    if (error.response?.status === 409) {
      // Backend returned 409 but may have actually created the client anyway,
      // OR the delete+create had a race and the record now exists as active.
      // Either way — try to find the client by fetching the list filtered by email.
      // If found, return it as a success so navigation works correctly.
      try {
        const email = clientData.email?.trim().toLowerCase();
        const searchResp = await api.get('/clients/get_all_client/', {
          params: { search: email, page: 1, page_size: 5 },
        });
        const results = searchResp.data?.data?.results || [];
        const match = results.find(c =>
          c.email?.toLowerCase() === email &&
          c.first_name?.toLowerCase() === (clientData.first_name || '').trim().toLowerCase() &&
          c.last_name?.toLowerCase()  === (clientData.last_name  || '').trim().toLowerCase()
        );
        if (match) {
          console.log('[Clients Service] 409 recovery — found client via search:', match.id);
          return match; // Return flat client object — id is at top level
        }
      } catch (searchErr) {
        console.error('[Clients Service] 409 recovery search failed:', searchErr);
      }
      // Could not recover — throw original error
      const backendError =
        error.response?.data?.errors   ||
        error.response?.data?.message  ||
        error.response?.data?.error    ||
        error.response?.data?.detail   ||
        'Client already exists with this details';
      const err409 = new Error(typeof backendError === 'string' ? backendError : JSON.stringify(backendError));
      err409.response = error.response;
      throw err409;
    }

    if (error.response?.status === 500) {
      // Log full response so we can see exactly what Django reports
      console.error('[Clients Service] Full 500 response body:', JSON.stringify(error.response?.data, null, 2));
      const backendError =
        error.response?.data?.message ||
        error.response?.data?.error   ||
        error.response?.data?.detail  ||
        JSON.stringify(error.response?.data);
      const err500 = new Error(backendError
        ? `Server error: ${backendError}`
        : 'Server error occurred. Please try again.');
      err500.response = error.response;
      throw err500;
    }

    const errorMessage = normalizeError(error);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// UPDATE CLIENT
// ============================================================================

export const updateClient = async (id, clientData) => {
  try {
    if (!id) throw new Error('Client ID is required');

    console.log(`[Clients Service] Updating client ${id}:`, clientData);

    // Build payload — id goes as query param so Django's UniqueTogetherValidator
    // can exclude the current instance and avoid false 400 unique-set errors.
    const payload = {
      first_name:   (clientData.first_name  || '').trim(),
      last_name:    (clientData.last_name   || '').trim(),
      email:        (clientData.email       || '').trim().toLowerCase(),
      phone_number: sanitizePhoneNumber(clientData.phone_number || ''),
      address:      (clientData.address     || '').trim(),
      city:         (clientData.city        || '').trim(),
      state:        (clientData.state       || '').trim(),
      pincode:      (clientData.pincode     || '').trim(),
      gst_number:   (clientData.gst_number  || '').trim().toUpperCase(),
    };

    if (clientData.is_draft !== undefined) payload.is_draft = clientData.is_draft;

    console.log('[Clients Service] Update payload:', JSON.stringify(payload, null, 2));

    // PUT is the only method accepted by update_client.
    // id is passed both in the body and as a query param for max compatibility.
    const response = await api.put(ENDPOINTS.UPDATE, { id, ...payload }, { params: { id } });

    console.log(`[Clients Service] Client ${id} updated:`, response.data);
    return response.data;

  } catch (error) {
    // Log full response so we can see exactly what the backend rejects
    if (error.response) {
      console.error(`[Clients Service] updateClient(${id}) — HTTP ${error.response.status}:`,
        JSON.stringify(error.response.data, null, 2));

      // Re-throw preserving the original axios error so callers can read
      // error.response.data for structured error extraction
      throw error;
    }
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] updateClient(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// DELETE CLIENT
// ============================================================================

export const deleteClient = async (id) => {
  try {
    if (!id) throw new Error('Client ID is required');

    console.log(`[Clients Service] Deleting client ${id}...`);

    // API returns 204 No Content on success — no response body.
    // validateStatus: accept 204 explicitly so axios/interceptor doesn't reject it.
    // delete_client returns 200 with no body (not 204)
    const response = await api.delete(ENDPOINTS.DELETE, {
      params: { id },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    console.log(`[Clients Service] ✅ Client ${id} deleted successfully (HTTP ${response.status})`);
    return true;

  } catch (error) {
    console.error(`[Clients Service] ❌ deleteClient(${id}) FAILED:`, error);
    console.error(`[Clients Service] ❌ deleteClient HTTP status:`, error.response?.status);
    console.error(`[Clients Service] ❌ deleteClient response body:`, JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================================================
// UNDO / RESTORE CLIENT  — PATCH /clients/undo_client/?id=
// Restores a deactive client (status 3) back to active (status 2)
// ============================================================================

export const undoClient = async (id) => {
  try {
    if (!id) throw new Error('Client ID is required');

    console.log(`[Clients Service] Restoring client ${id}...`);

    // PATCH with id as query param — no request body needed
    const response = await api.patch(ENDPOINTS.UNDO, null, {
      params: { id },
      validateStatus: (status) => status >= 200 && status < 300,
    });

    console.log(`[Clients Service] ✅ Client ${id} restored successfully (HTTP ${response.status})`);
    return response.data;

  } catch (error) {
    console.error(`[Clients Service] ❌ undoClient(${id}) FAILED:`, error);
    console.error(`[Clients Service] ❌ undoClient HTTP status:`, error.response?.status);
    console.error(`[Clients Service] ❌ undoClient response body:`, JSON.stringify(error.response?.data, null, 2));
    throw error;
  }
};

// ============================================================================
// SEARCH CLIENTS (legacy — kept for backward compatibility)
// ============================================================================

export const searchClients = async (query, filters = {}) => {
  try {
    if (!query) throw new Error('Search query is required');

    const response = await api.get(ENDPOINTS.SEARCH, {
      params: { q: query, ...filters },
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error('[Clients Service] searchClients failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// EXPORT CLIENTS
// ============================================================================

export const exportClients = async (params = {}) => {
  try {
    const response = await api.get(ENDPOINTS.EXPORT, {
      params,
      responseType: 'blob',
    });

    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error('[Clients Service] exportClients failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkDeleteClients = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Client IDs array is required and cannot be empty');
    }

    const response = await api.post(ENDPOINTS.BULK_DELETE, { ids });
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error('[Clients Service] bulkDeleteClients failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

export const bulkUpdateClients = async (ids, updates) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error('Client IDs array is required and cannot be empty');
    }

    const response = await api.post(ENDPOINTS.BULK_UPDATE, { ids, updates });
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error('[Clients Service] bulkUpdateClients failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// NOTES — GET ALL BY CLIENT ID
// ============================================================================

export const getNotesByClientId = async (clientId) => {
  try {
    if (!clientId) throw new Error('Client ID is required');

    serviceLogger.log(`[Clients Service] Fetching notes for client ID: ${clientId}`);

    const response = await api.get(NOTE_ENDPOINTS.GET_ALL, {
      params: { client_id: clientId },
    });

    serviceLogger.log('[Clients Service] Notes data:', response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] getNotesByClientId(${clientId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// NOTES — CREATE
// Schema: { note: "string", client_id: integer }
// ============================================================================

export const createNote = async (clientId, note) => {
  try {
    if (!clientId) throw new Error('Client ID is required');
    if (!note || !note.trim()) throw new Error('Note content is required');

    const payload = {
      note:      note.trim(),
      client_id: Number(clientId),
    };

    serviceLogger.log('[Clients Service] Creating note:', payload);

    const response = await api.post(NOTE_ENDPOINTS.CREATE, payload);

    serviceLogger.log('[Clients Service] Note created:', response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error('[Clients Service] createNote failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// NOTES — DELETE
// ============================================================================

export const deleteNote = async (noteId) => {
  try {
    if (!noteId) throw new Error('Note ID is required');

    serviceLogger.log(`[Clients Service] Deleting note ID: ${noteId}`);

    // API uses query param: DELETE /api/notes/delete_note/?id=noteId
    const response = await api.delete(NOTE_ENDPOINTS.DELETE, { params: { id: noteId } });

    serviceLogger.log(`[Clients Service] Note ${noteId} deleted`);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] deleteNote(${noteId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// CLIENT PROJECTS — GET ALL PROJECTS FOR A CLIENT
// ============================================================================

export const getClientProjects = async (clientId, params = {}) => {
  try {
    if (!clientId) throw new Error('Client ID is required');

    const queryParams = {
      client_id: clientId,
      page: 1,
      page_size: 100,
      ...params,
    };

    serviceLogger.log(`[Clients Service] Fetching projects for client ID: ${clientId}`);

    const response = await api.get('/projects/get_all_Project/', { params: queryParams });

    serviceLogger.log(`[Clients Service] Projects fetched for client ${clientId}:`, response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] getClientProjects(${clientId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// CLIENT INVOICES — GET ALL INVOICES FOR A CLIENT
// ============================================================================

export const getClientInvoices = async (clientId, params = {}) => {
  try {
    if (!clientId) throw new Error('Client ID is required');

    const queryParams = {
      client: clientId,
      page: 1,
      page_size: 100,
      ...params,
    };

    serviceLogger.log(`[Clients Service] Fetching invoices for client ID: ${clientId}`);

    const response = await api.get('/invoices/get_all_invoices/', { params: queryParams });

    serviceLogger.log(`[Clients Service] Invoices fetched for client ${clientId}:`, response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] getClientInvoices(${clientId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// TOGGLE STAR CLIENT
// ============================================================================

export const toggleStarClient = async (clientId, isStar) => {
  try {
    if (!clientId) throw new Error('Client ID is required');

    serviceLogger.log(`[Clients Service] Toggling star for client ${clientId} → is_star=${isStar}`);

    // API: PUT /api/clients/change_star_client_status/?id=&is_star=
    const response = await api.put(ENDPOINTS.TOGGLE_STAR, null, {
      params: { id: clientId, is_star: isStar },
    });

    serviceLogger.log(`[Clients Service] Star toggled for client ${clientId}:`, response.data);
    return response.data;

  } catch (error) {
    const errorMessage = normalizeError(error);
    console.error(`[Clients Service] toggleStarClient(${clientId}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  getClients,
  searchClientsByName,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  undoClient,
  searchClients,
  exportClients,
  bulkDeleteClients,
  bulkUpdateClients,
  getNotesByClientId,
  createNote,
  deleteNote,
  getClientProjects,
  getClientInvoices,
  toggleStarClient,
};