import api from './api';

/**
 * ============================================================================
 * NOCS SERVICE - PRODUCTION-READY API LAYER
 * ============================================================================
 *
 * Covers three resource groups:
 *   1. NOC Types   — /api/noctypes/…
 *   2. Authorities — /api/authorities/…
 *   3. NOCs        — /api/nocs/…
 *
 * createNoc payload (matches backend schema exactly):
 *   client_id, project_id, noc_type_id, authority_id,
 *   address, state, city, pincode,
 *   applicant_name, applicant_type, company_name, contact_info
 *
 * submitNoc(id, applicationNumber, applicationDate)
 *   → POST /api/nocs/submit_noc/
 *   → { id, application_number, application_date }
 *
 * approveNoc(id, nocNumber, issueDate, validFrom, validTill)
 *   → POST /api/nocs/approve_noc/
 *   → { id, noc_number, issue_date, valid_from, valid_till }
 *
 * rejectNoc(id, reason)
 *   → POST /api/nocs/reject_noc/
 *   → { id, reason }
 *
 * @module nocsService
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const ENABLE_SERVICE_LOGGING = import.meta.env.MODE === 'development';

const serviceLogger = {
  log:   (...args) => ENABLE_SERVICE_LOGGING && console.log('[NOCs Service]', ...args),
  warn:  (...args) => console.warn('[NOCs Service]', ...args),
  error: (...args) => console.error('[NOCs Service]', ...args),
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

const NOC_TYPE_ENDPOINTS = {
  GET_ALL:   '/noctypes/get_all_noc_types/',   // GET  ?page=&page_size=&search=
  GET_BY_ID: '/noctypes/get_noc_type/',        // GET  ?id=
  CREATE:    '/noctypes/create_noc_type/',     // POST { name, description }
  UPDATE:    '/noctypes/update_noc_type/',     // PUT  { id, name, description }
  DELETE:    '/noctypes/delete_noc_type/',     // DELETE ?id=
};

const AUTHORITY_ENDPOINTS = {
  GET_ALL:   '/nocauthorities/get_all_authorities/',  // GET  ?page=&page_size=&search=
  GET_BY_ID: '/nocauthorities/get_authority/',        // GET  ?id=
  CREATE:    '/nocauthorities/create_authority/',     // POST { authority_name, department, contact_info }
  UPDATE:    '/nocauthorities/update_authority/',     // PUT  { id, authority_name, department, contact_info }
  DELETE:    '/nocauthorities/delete_authority/',     // DELETE ?id=
};

const NOC_ENDPOINTS = {
  GET_ALL:   '/nocs/get_all_nocs/',     // GET  ?page=&page_size=&search=
  GET_BY_ID: '/nocs/get_noc/',          // GET  ?id=
  CREATE:    '/nocs/create_noc/',       // POST (see payload shape below)
  UPDATE:    '/nocs/update_noc/',       // PUT
  DELETE:    '/nocs/delete_noc/',       // DELETE ?id=
  APPROVE:   '/nocs/approve_noc/',      // POST { id }
  REJECT:    '/nocs/reject_noc/',       // POST { id }
  REAPPLY:   '/nocs/reapply_noc/',      // POST { id }
  SUBMIT:    '/nocs/submit_noc/',       // POST { id }
};

// ============================================================================
// UTILITY — Error parser
// ============================================================================

/**
 * Converts an axios error into a clean user-facing string.
 *
 * Handles:
 *   { errors: { field: ["msg"] } }
 *   { detail: "msg" }
 *   { message: "msg" }
 *   { errors: "string" }
 */
const parseApiError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))
      return 'Request timed out. Please check your connection and try again.';
    if (error.message === 'Network Error')
      return 'Unable to reach the server. Please check your internet connection.';
    return error.message || fallback;
  }

  const { status, data } = error.response;

  const statusMessages = {
    401: 'Your session has expired. Please log in again.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. This record may already exist.',
    413: 'The data you submitted is too large.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An internal server error occurred. Please try again later.',
    502: 'Server is temporarily unavailable. Please try again later.',
    503: 'Service is under maintenance. Please try again later.',
  };

  if (data) {
    // Shape: { errors: { field: ["msg"] } }
    if (data.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)) {
      // Known field label map — extend as needed
      const fieldLabels = {
        client_id:          'Client',
        project_id:         'Project',
        noc_type_id:        'NOC Type',
        authority_id:       'Authority',
        applicant_name:     'Applicant Name',
        applicant_type:     'Applicant Type',
        company_name:       'Company Name',
        contact_info:       'Contact Info',
        address:            'Address',
        state:              'State',
        city:               'City',
        pincode:            'Pincode',
        name:               'Name',
        description:        'Description',
        // submit_noc fields
        application_number: 'Application Number',
        application_date:   'Application Date',
        // approve_noc fields
        noc_number:         'NOC Number',
        issue_date:         'Issue Date',
        valid_from:         'Valid From',
        valid_till:         'Valid Till',
        // reject_noc fields
        reason:             'Rejection Reason',
        id:                 null, // suppress
      };

      const messages = [];
      Object.entries(data.errors).forEach(([field, msgs]) => {
        if (field === 'non_field_errors') {
          const list = Array.isArray(msgs) ? msgs : [msgs];
          messages.push(...list);
        } else {
          const label = field in fieldLabels ? fieldLabels[field] : null;
          if (label === null) return; // suppress id errors
          const displayLabel = label || field.replace(/_/g, ' ');
          const list = Array.isArray(msgs) ? msgs : [String(msgs)];
          messages.push(`${displayLabel}: ${list[0]}`);
        }
      });

      if (messages.length > 0) return messages.join(' • ');
    }

    if (data.detail && typeof data.detail === 'string') return data.detail;
    if (data.message && typeof data.message === 'string') return data.message;
    if (typeof data.errors === 'string') return data.errors;
  }

  return statusMessages[status] || fallback;
};

// ============================================================================
// ── NOC TYPES ────────────────────────────────────────────────────────────────
// ============================================================================

/**
 * GET all NOC types with pagination + optional search.
 *
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.page_size=10]
 * @param {string} [params.search]
 */
export const getAllNocTypes = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('Fetching NOC types with params:', queryParams);
    const response = await api.get(NOC_TYPE_ENDPOINTS.GET_ALL, { params: queryParams });
    serviceLogger.log('NOC types fetched:', {
      count: response.data?.data?.results?.length || 0,
      total: response.data?.data?.total_count     || 0,
    });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load NOC types. Please try again.');
    serviceLogger.error('getAllNocTypes failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * GET a single NOC type by ID.
 * @param {number|string} id
 */
export const getNocTypeById = async (id) => {
  try {
    if (!id) throw new Error('NOC Type ID is required');
    const response = await api.get(NOC_TYPE_ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load NOC type. Please try again.');
    serviceLogger.error(`getNocTypeById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Create a new NOC type.
 * @param {{ name: string, description?: string }} typeData
 */
export const createNocType = async (typeData) => {
  try {
    if (!typeData?.name?.trim()) throw new Error('NOC Type name is required');

    const payload = {
      name:        typeData.name.trim(),
      description: typeData.description?.trim() || '',
    };

    serviceLogger.log('Creating NOC type:', JSON.stringify(payload, null, 2));
    const response = await api.post(NOC_TYPE_ENDPOINTS.CREATE, payload);
    serviceLogger.log('NOC type created:', response.data);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to create NOC type. Please try again.');
    serviceLogger.error('createNocType failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * PUT — Update an existing NOC type.
 * @param {number|string} id
 * @param {{ name: string, description?: string }} typeData
 */
export const updateNocType = async (id, typeData) => {
  try {
    if (!id) throw new Error('NOC Type ID is required');
    if (!typeData?.name?.trim()) throw new Error('NOC Type name is required');

    const payload = {
      id:          Number(id),
      name:        typeData.name.trim(),
      description: typeData.description?.trim() || '',
    };

    serviceLogger.log(`Updating NOC type ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.put(NOC_TYPE_ENDPOINTS.UPDATE, payload);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to update NOC type. Please try again.');
    serviceLogger.error(`updateNocType(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * DELETE — Delete a NOC type by ID.
 * @param {number|string} id
 */
export const deleteNocType = async (id) => {
  try {
    if (!id) throw new Error('NOC Type ID is required');
    serviceLogger.log(`Deleting NOC type ID: ${id}`);
    const response = await api.delete(NOC_TYPE_ENDPOINTS.DELETE, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to delete NOC type. Please try again.');
    serviceLogger.error(`deleteNocType(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// ── AUTHORITIES ───────────────────────────────────────────────────────────────
// ============================================================================

/**
 * GET all authorities with pagination + optional search.
 */
export const getAllAuthorities = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('Fetching authorities:', queryParams);
    const response = await api.get(AUTHORITY_ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load authorities. Please try again.');
    serviceLogger.error('getAllAuthorities failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * GET a single authority by ID.
 */
export const getAuthorityById = async (id) => {
  try {
    if (!id) throw new Error('Authority ID is required');
    const response = await api.get(AUTHORITY_ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load authority. Please try again.');
    serviceLogger.error(`getAuthorityById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Create a new authority.
 */
export const createAuthority = async (data) => {
  try {
    if (!data?.authority_name?.trim()) throw new Error('Authority name is required');

    const payload = {
      authority_name: data.authority_name.trim(),
      department:     data.department?.trim()   || '',
      contact_info:   data.contact_info?.trim() || '',
    };

    serviceLogger.log('Creating authority:', JSON.stringify(payload, null, 2));
    const response = await api.post(AUTHORITY_ENDPOINTS.CREATE, payload);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to create authority. Please try again.');
    serviceLogger.error('createAuthority failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * PUT — Update an existing authority.
 */
export const updateAuthority = async (id, data) => {
  try {
    if (!id) throw new Error('Authority ID is required');
    if (!data?.authority_name?.trim()) throw new Error('Authority name is required');

    const payload = {
      id:             Number(id),
      authority_name: data.authority_name.trim(),
      department:     data.department?.trim()   || '',
      contact_info:   data.contact_info?.trim() || '',
    };

    serviceLogger.log(`Updating authority ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.put(AUTHORITY_ENDPOINTS.UPDATE, payload);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to update authority. Please try again.');
    serviceLogger.error(`updateAuthority(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * DELETE — Delete an authority by ID.
 */
export const deleteAuthority = async (id) => {
  try {
    if (!id) throw new Error('Authority ID is required');
    const response = await api.delete(AUTHORITY_ENDPOINTS.DELETE, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to delete authority. Please try again.');
    serviceLogger.error(`deleteAuthority(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// ── NOCs ─────────────────────────────────────────────────────────────────────
// ============================================================================

/**
 * GET all NOCs with pagination + optional search/sort.
 */
export const getAllNocs = async (params = {}) => {
  try {
    const queryParams = { page: 1, page_size: 10, ...params };
    serviceLogger.log('Fetching NOCs:', queryParams);
    const response = await api.get(NOC_ENDPOINTS.GET_ALL, { params: queryParams });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load NOCs. Please try again.');
    serviceLogger.error('getAllNocs failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * GET a single NOC by ID.
 * @param {number|string} id
 */
export const getNocById = async (id) => {
  try {
    if (!id) throw new Error('NOC ID is required');
    const response = await api.get(NOC_ENDPOINTS.GET_BY_ID, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to load NOC. Please try again.');
    serviceLogger.error(`getNocById(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Create a new NOC.
 *
 * Full payload (matches /api/nocs/create_noc/ exactly):
 * {
 *   client_id:      number   (required)
 *   project_id:     number   (required)
 *   noc_type_id:    number   (required)
 *   authority_id:   number   (required)
 *   address:        string
 *   state:          string
 *   city:           string
 *   pincode:        string
 *   applicant_name: string   (required)
 *   applicant_type: number   (1=Individual, 2=Company, 3=Government, 4=NGO)
*   company_name:   string
 *   contact_info:   string
 * }
 *
 * @param {Object} nocData
 */
export const createNoc = async (nocData) => {
  try {
    // ── Client-side validation ──────────────────────────────────────────────
    if (!nocData?.client_id)      throw new Error('Client is required');
    if (!nocData?.project_id)     throw new Error('Project is required');
    if (!nocData?.noc_type_id)    throw new Error('NOC Type is required');
    if (!nocData?.authority_id)   throw new Error('Authority is required');
    if (!nocData?.applicant_name?.trim()) throw new Error('Applicant name is required');
    if (!nocData?.applicant_type) throw new Error('Applicant type is required');

    const applicantType = parseInt(nocData.applicant_type, 10);



    // ── Build payload ──────────────────────────────────────────────────────
    const payload = {
      client_id:      parseInt(nocData.client_id,    10),
      project_id:     parseInt(nocData.project_id,   10),
      noc_type_id:    parseInt(nocData.noc_type_id,  10),
      authority_id:   parseInt(nocData.authority_id, 10),
      applicant_name: nocData.applicant_name.trim(),
      applicant_type: applicantType,
      address:        nocData.address?.trim()      || '',
      state:          nocData.state?.trim()        || '',
      city:           nocData.city?.trim()         || '',
      pincode:        nocData.pincode?.trim()      || '',
      company_name:   nocData.company_name?.trim() || '',
      contact_info:   nocData.contact_info?.trim() || '',
    };

    serviceLogger.log('Creating NOC:', JSON.stringify(payload, null, 2));

    const response = await api.post(NOC_ENDPOINTS.CREATE, payload);

    serviceLogger.log('NOC created successfully:', response.data);
    return response.data;

  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to create NOC. Please try again.');
    serviceLogger.error('createNoc failed:', errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * PUT — Update an existing NOC.
 * @param {number|string} id
 * @param {Object} nocData
 */
export const updateNoc = async (id, nocData) => {
  try {
    if (!id) throw new Error('NOC ID is required');

    const payload = {
      id: Number(id),
      ...(nocData.client_id    && { client_id:      parseInt(nocData.client_id,    10) }),
      ...(nocData.project_id   && { project_id:     parseInt(nocData.project_id,   10) }),
      ...(nocData.noc_type_id  && { noc_type_id:    parseInt(nocData.noc_type_id,  10) }),
      ...(nocData.authority_id && { authority_id:   parseInt(nocData.authority_id, 10) }),
      ...(nocData.applicant_name  && { applicant_name: nocData.applicant_name.trim()  }),
      ...(nocData.applicant_type  && { applicant_type: parseInt(nocData.applicant_type, 10) }),
      ...(nocData.company_name    && { company_name:   nocData.company_name.trim()    }),
      ...(nocData.contact_info    && { contact_info:   nocData.contact_info.trim()    }),
      address: nocData.address?.trim() || '',
      state:   nocData.state?.trim()   || '',
      city:    nocData.city?.trim()    || '',
      pincode: nocData.pincode?.trim() || '',
    };

    serviceLogger.log(`Updating NOC ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.put(NOC_ENDPOINTS.UPDATE, payload);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to update NOC. Please try again.');
    serviceLogger.error(`updateNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * DELETE — Delete a NOC by ID.
 * @param {number|string} id
 */
export const deleteNoc = async (id) => {
  try {
    if (!id) throw new Error('NOC ID is required');
    serviceLogger.log(`Deleting NOC ID: ${id}`);
    const response = await api.delete(NOC_ENDPOINTS.DELETE, { params: { id } });
    return response.data;
  } catch (error) {
    const errorMessage = parseApiError(error, 'Failed to delete NOC. Please try again.');
    serviceLogger.error(`deleteNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Approve a submitted NOC.
 *
 * @param {number|string} id         - NOC ID (required)
 * @param {string}        nocNumber  - Official NOC number issued by authority (required)
 * @param {string}        issueDate  - ISO date string — date of issue (required)
 * @param {string}        validFrom  - ISO date string — validity start (required)
 * @param {string}        validTill  - ISO date string — validity end (required)
 */
export const approveNoc = async (id, nocNumber, issueDate, validFrom, validTill) => {
  try {
    if (!id)             throw new Error('NOC ID is required');
    if (!nocNumber?.trim()) throw new Error('NOC number is required');
    if (!issueDate)      throw new Error('Issue date is required');
    if (!validFrom)      throw new Error('Valid from date is required');
    if (!validTill)      throw new Error('Valid till date is required');

    const payload = {
      id:         Number(id),
      noc_number: nocNumber.trim(),
      issue_date: issueDate,
      valid_from: validFrom,
      valid_till: validTill,
    };

    serviceLogger.log(`Approving NOC ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.post(NOC_ENDPOINTS.APPROVE, payload);
    serviceLogger.log(`NOC ${id} approved successfully`);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to approve NOC. Please try again.');
    serviceLogger.error(`approveNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Reject a submitted NOC.
 *
 * @param {number|string} id     - NOC ID (required)
 * @param {string}        reason - Reason for rejection (required)
 */
export const rejectNoc = async (id, reason) => {
  try {
    if (!id)            throw new Error('NOC ID is required');
    if (!reason?.trim()) throw new Error('Rejection reason is required');

    const payload = {
      id:     Number(id),
      reason: reason.trim(),
    };

    serviceLogger.log(`Rejecting NOC ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.post(NOC_ENDPOINTS.REJECT, payload);
    serviceLogger.log(`NOC ${id} rejected`);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to reject NOC. Please try again.');
    serviceLogger.error(`rejectNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Reapply for a rejected NOC.
 * Creates a new Draft NOC (with R- prefix) from the rejected one.
 *
 * @param {number|string} id - NOC ID to reapply (required)
 */
export const reapplyNoc = async (id) => {
  try {
    if (!id) throw new Error('NOC ID is required');

    // Backend expects "id" as a query param AND the full NOC body,
    // but the minimal required field is the noc primary key sent as "id".
    const payload = { id: Number(id) };

    serviceLogger.log(`Reapplying NOC ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.post(NOC_ENDPOINTS.REAPPLY, payload, {
      params: { id: Number(id) },   // also pass as query param — backend accepts either
    });
    serviceLogger.log(`NOC ${id} reapplied successfully:`, response.data);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;   // network / timeout — rethrow as-is
    const errorMessage = parseApiError(error, 'Failed to reapply NOC. Please try again.');
    serviceLogger.error(`reapplyNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

/**
 * POST — Submit a draft NOC for approval.
 *
 * @param {number|string} id                - NOC ID (required)
 * @param {string}        applicationNumber - Application reference number (required)
 * @param {string}        applicationDate   - ISO date string (required)
 */
export const submitNoc = async (id, applicationNumber, applicationDate) => {
  try {
    if (!id)                       throw new Error('NOC ID is required');
    if (!applicationNumber?.trim()) throw new Error('Application number is required');
    if (!applicationDate)           throw new Error('Application date is required');

    const payload = {
      id:                 Number(id),
      application_number: applicationNumber.trim(),
      application_date:   applicationDate,
    };

    serviceLogger.log(`Submitting NOC ${id}:`, JSON.stringify(payload, null, 2));
    const response = await api.post(NOC_ENDPOINTS.SUBMIT, payload);
    serviceLogger.log(`NOC ${id} submitted successfully`);
    return response.data;
  } catch (error) {
    if (!error.response) throw error;
    const errorMessage = parseApiError(error, 'Failed to submit NOC. Please try again.');
    serviceLogger.error(`submitNoc(${id}) failed:`, errorMessage);
    throw new Error(errorMessage);
  }
};

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  // NOC Types
  getAllNocTypes,
  getNocTypeById,
  createNocType,
  updateNocType,
  deleteNocType,

  // Authorities
  getAllAuthorities,
  getAuthorityById,
  createAuthority,
  updateAuthority,
  deleteAuthority,

  // NOCs
  getAllNocs,
  getNocById,
  createNoc,
  updateNoc,
  deleteNoc,
  approveNoc,
  rejectNoc,
  reapplyNoc,
  submitNoc,
};
