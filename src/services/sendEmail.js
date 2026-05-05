/**
 * sendEmail.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Universal email service — owns the /notifications/send_email/ endpoint.
 *
 * Used by SendEmailModal.jsx and any other part of the system that needs to
 * send an email. Contains ZERO domain-specific logic (no quotation, proforma,
 * invoice knowledge). All of that belongs in the caller.
 *
 * Production rules:
 *  • This is the ONLY file that imports or references SEND_EMAIL endpoint.
 *  • Never import this service inside domain service files (quotation.js etc.).
 *  • Domain service files should NOT have sendXxxToClient functions anymore.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import api, { normalizeError } from './api';

// ─── Config ───────────────────────────────────────────────────────────────────

const ENABLE_LOGGING = import.meta.env.MODE === 'development';

const log = {
  info:  (...a) => { if (ENABLE_LOGGING) console.log('[Email Service]', ...a); },
  warn:  (...a) => console.warn('[Email Service]', ...a),
  error: (...a) => console.error('[Email Service]', ...a),
};

const ENDPOINTS = {
  SEND_EMAIL: '/notifications/send_email/',
};

export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024; // 25 MB

// ─── Types (JSDoc only — no TypeScript) ──────────────────────────────────────

/**
 * @typedef {Object} SendEmailParams
 * @property {string}   recipients        - Comma-separated recipient email address(es)
 * @property {string}   subject           - Email subject line
 * @property {string}   body              - Plain-text email body
 * @property {File[]}   [attachments=[]]  - File objects to attach (already resolved by caller)
 */

// ─── Validators ───────────────────────────────────────────────────────────────

/**
 * Validates one or more email addresses (comma-separated).
 * Returns an error string, or '' if valid.
 */
export const validateEmail = (value = '') => {
  const addresses = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (addresses.length === 0) return 'Recipient email is required.';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalid = addresses.filter((a) => !EMAIL_RE.test(a));
  if (invalid.length > 0) {
    return `Invalid email address${invalid.length > 1 ? 'es' : ''}: ${invalid.join(', ')}`;
  }
  return '';
};

/**
 * Returns the total byte size of an array of File objects.
 */
export const getTotalAttachmentSize = (files = []) =>
  files.reduce((sum, f) => sum + (f?.size || 0), 0);

/**
 * Returns a human-readable file size string.
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ─── Core send function ───────────────────────────────────────────────────────

/**
 * sendEmail
 * Sends an email via the /notifications/send_email/ endpoint.
 *
 * @param {SendEmailParams} params
 * @returns {Promise<object>} Backend response data
 * @throws {Error} Human-readable error message
 */
export const sendEmail = async ({
  recipients,
  subject,
  body,
  attachments = [],
}) => {
  // ── Client-side validation ────────────────────────────────────────────────
  const emailError = validateEmail(recipients);
  if (emailError) throw new Error(emailError);

  if (!subject?.trim()) throw new Error('Subject is required.');
  if (!body?.trim())    throw new Error('Message body is required.');

  const totalSize = getTotalAttachmentSize(attachments);
  if (totalSize > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Total attachment size (${formatFileSize(totalSize)}) exceeds the 25 MB limit.`
    );
  }

  log.info(`Sending email to "${recipients}" | subject: "${subject}" | attachments: ${attachments.length}`);

  // ── Build FormData ────────────────────────────────────────────────────────
  const formData = new FormData();
  formData.append('subject',    subject.trim());
  formData.append('recipients', recipients.trim());
  formData.append('body',       body.trim());
  attachments.forEach((file) => formData.append('attachments', file));

  // ── POST ──────────────────────────────────────────────────────────────────
  try {
    const response = await api.post(ENDPOINTS.SEND_EMAIL, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    log.info('Email sent successfully');
    return response.data;
  } catch (error) {
    // Map backend 400 field errors → friendly message
    if (error.response?.status === 400) {
      const data   = error.response.data;
      const errors = data?.errors && typeof data.errors === 'object'
        ? data.errors
        : (data && typeof data === 'object' ? data : {});

      if (Array.isArray(errors.recipients) && errors.recipients.length) {
        throw new Error('Please enter a valid recipient email address before sending.');
      }

      const missing = [];
      if (Array.isArray(errors.subject)  && errors.subject.length)  missing.push('a subject');
      if (Array.isArray(errors.body)     && errors.body.length)     missing.push('a message body');
      if (Array.isArray(errors.attachments) && errors.attachments.length) missing.push('at least one attachment');

      if (missing.length > 0) {
        const join = (p) =>
          p.length === 1 ? p[0]
          : p.length === 2 ? `${p[0]} and ${p[1]}`
          : `${p.slice(0, -1).join(', ')}, and ${p[p.length - 1]}`;
        throw new Error(`Please add ${join(missing)} before sending.`);
      }

      throw new Error(
        data?.message || data?.detail || 'Please check the email details and try again.'
      );
    }

    const msg = normalizeError(error);
    log.error('sendEmail failed:', msg);
    throw new Error(msg);
  }
};

// ─── Default export ───────────────────────────────────────────────────────────

export default {
  sendEmail,
  validateEmail,
  getTotalAttachmentSize,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
};