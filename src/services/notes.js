/**
 * ============================================================================
 * NOTES SERVICE  —  src/services/notes.js
 * ============================================================================
 * NOTE: api.baseURL is already "http://host/api" (from config.apiUrl)
 * so all paths here must start with /notes/... NOT /api/notes/...
 * ============================================================================
 */

import api from './api';

// ── Entity type constants ────────────────────────────────────────────────────
export const NOTE_ENTITY = {
  CLIENT:         'client',
  PROJECT:        'project',
  QUOTATION:      'quotation',
  PROFORMA:       'proforma',
  INVOICE:        'invoice',
  VENDOR:         'vendor',
  PURCHASE_ORDER: 'purchaseorder',
};

/**
 * Create a new note for any entity.
 */
export const createNote = async (entityType, entityId, note) => {
  const res = await api.post('/notes/create_note/', {
    entity_type: entityType,
    entity_id:   entityId,
    note,
  });
  return res.data;
};

/**
 * Fetch all notes for a specific entity.
 */
export const getAllNotes = async (entityType, entityId) => {
  const res = await api.get('/notes/get_all_notes/', {
    params: { entity_type: entityType, entity_id: entityId },
  });
  return res.data;
};

/**
 * Delete a note by its ID.
 */
export const deleteNote = async (noteId) => {
  const res = await api.delete('/notes/delete_note/', {
    params: { id: noteId },
  });
  return res.data;
};