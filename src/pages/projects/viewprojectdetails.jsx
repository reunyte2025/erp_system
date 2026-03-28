import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FolderKanban,
  Hash,
  MapPin,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Building2,
  Edit2,
  X,
  CheckCircle,
  BookOpen,
  RefreshCw,
  Navigation,
  LocateFixed,
  Send,
} from 'lucide-react';
import { getProjectById, updateProject } from '../../services/projects';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META = {
  1: { label: 'Draft',     color: '#92400e', bg: '#fffbeb', border: '#fcd34d', dot: '#f59e0b', Icon: BookOpen   },
  2: { label: 'Active',    color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', dot: '#14b8a6', Icon: ShieldCheck },
  3: { label: 'Completed', color: '#166534', bg: '#f0fdf4', border: '#86efac', dot: '#22c55e', Icon: CheckCircle },
  4: { label: 'On Hold',   color: '#9a3412', bg: '#fff7ed', border: '#fdba74', dot: '#f97316', Icon: Clock3     },
};

const getStatusMeta = (project) => {
  if (project?.is_draft || Number(project?.status) === 1) return STATUS_META[1];
  return STATUS_META[Number(project?.status)] || STATUS_META[2];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
};

// ─── Loading ──────────────────────────────────────────────────────────────────

const LoadingView = () => (
  <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)',
        border: '2px solid #99f6e4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        boxShadow: '0 8px 24px rgba(20,184,166,.15)',
      }}>
        <Loader2 size={26} color="#0d9488" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
      <p style={{ fontSize: 14, fontWeight: 500, color: '#64748b', letterSpacing: '.01em' }}>
        Loading project details…
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  </div>
);

// ─── Error ────────────────────────────────────────────────────────────────────

const ErrorView = ({ message, onRetry, onBack }) => (
  <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
    <div style={{ textAlign: 'center', maxWidth: 400, padding: '0 24px' }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#fef2f2', border: '2px solid #fca5a5',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <AlertCircle size={28} color="#ef4444" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>Failed to Load Project</h2>
      <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onRetry} style={{
          padding: '10px 20px', borderRadius: 10, background: '#0d9488',
          color: '#fff', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <RefreshCw size={14} /> Try Again
        </button>
        <button onClick={onBack} style={{
          padding: '10px 20px', borderRadius: 10, background: '#fff',
          color: '#475569', fontSize: 13, fontWeight: 600,
          border: '1.5px solid #e2e8f0', cursor: 'pointer',
        }}>
          Go Back
        </button>
      </div>
    </div>
  </div>
);

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const EditProjectModal = ({ project, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name:       project?.name       || '',
    cts_number: project?.cts_number || '',
    address:    project?.address    || '',
    city:       project?.city       || '',
    state:      project?.state      || '',
    pincode:    project?.pincode    || '',
  });
  const [saving, setSaving]   = useState(false);
  const [error,  setError]    = useState('');

  const field = (key, label, placeholder, required = false) => (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: '#94a3b8', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      <input
        value={formData[key]}
        onChange={e => { setFormData(p => ({ ...p, [key]: e.target.value })); if (error) setError(''); }}
        placeholder={placeholder}
        disabled={saving}
        style={{
          width: '100%', padding: '10px 14px', borderRadius: 10,
          border: '1.5px solid #e2e8f0', fontSize: 14, color: '#1e293b',
          background: saving ? '#f8fafc' : '#fff', outline: 'none',
          transition: 'border-color .15s',
          boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#0d9488'}
        onBlur={e  => e.target.style.borderColor = '#e2e8f0'}
      />
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) { setError('Project name is required'); return; }
    setSaving(true);
    try { await onSave(formData); }
    catch (err) { setError(err.message || 'Failed to update project'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', pointerEvents: 'auto' }} onClick={onClose} />
      <div style={{ position: 'relative', zIndex: 1, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, pointerEvents: 'none' }}>
        <div style={{
          width: '100%', maxWidth: 520, borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(0,0,0,.22)', background: '#fff',
          pointerEvents: 'auto', animation: 'scaleIn .22s cubic-bezier(.16,1,.3,1)',
        }} onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg,#0f766e,#0d9488)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Edit2 size={16} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15 }}>Edit Project</div>
                <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 1 }}>Update project details</div>
              </div>
            </div>
            <button onClick={onClose} disabled={saving} style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div style={{ padding: '20px 20px 0', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '65vh', overflowY: 'auto' }}>
              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1.5px solid #fca5a5', color: '#dc2626', fontSize: 13 }}>
                  {error}
                </div>
              )}
              {field('name',       'Project Name',  'Enter project name', true)}
              {field('cts_number', 'CTS Number',    'Enter CTS number')}
              {field('address',    'Address',       'Enter address')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {field('city',    'City',    'City')}
                {field('state',   'State',   'State')}
                {field('pincode', 'Pincode', 'Pincode')}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 20px 20px', display: 'flex', gap: 10 }}>
              <button type="button" onClick={onClose} disabled={saving} style={{
                flex: 1, padding: '11px 16px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                color: '#64748b', fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button type="submit" disabled={saving} style={{
                flex: 1, padding: '11px 16px', borderRadius: 10, border: 'none',
                background: saving ? '#e2e8f0' : 'linear-gradient(135deg,#0f766e,#0d9488)',
                color: saving ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                {saving ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Send size={14} /> Save Changes</>}
              </button>
            </div>
          </form>
        </div>
      </div>
      <style>{`@keyframes scaleIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value, accent = false }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderRadius: 10,
    background: accent ? 'linear-gradient(135deg,#f0fdfa,#fff)' : '#f8fafc',
    border: `1.5px solid ${accent ? '#5eead4' : '#cbd5e1'}`,
    gap: 12,
  }}>
    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: 13, color: accent ? '#0f766e' : '#0f172a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word', maxWidth: '60%' }}>
      {value || '—'}
    </span>
  </div>
);

// ─── Detail Card ──────────────────────────────────────────────────────────────

const DetailCard = ({ icon: Icon, iconBg, iconColor, iconBorder, label, value, fullWidth = false }) => (
  <div style={{
    background: '#fff',
    borderRadius: 14,
    border: '1.5px solid #cbd5e1',
    padding: '16px 18px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    boxShadow: '0 2px 8px rgba(15,23,42,.06)',
    gridColumn: fullWidth ? '1 / -1' : undefined,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 11,
      background: iconBg,
      border: `1.5px solid ${iconBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={18} color={iconColor} />
    </div>
    <div style={{ minWidth: 0, flex: 1 }}>
      <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: '#64748b', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', wordBreak: 'break-word', lineHeight: 1.45 }}>
        {value || <span style={{ color: '#94a3b8', fontWeight: 500 }}>Not added</span>}
      </div>
    </div>
  </div>
);

// ─── Timeline Item ────────────────────────────────────────────────────────────

const TimelineItem = ({ icon: Icon, label, date, isLast = false }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11,
        background: 'rgba(255,255,255,.15)', border: '1.5px solid rgba(255,255,255,.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color="rgba(255,255,255,.95)" />
      </div>
      {!isLast && (
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.2)', marginTop: 4 }} />
      )}
    </div>
    <div style={{ paddingTop: 4 }}>
      <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.15em', color: 'rgba(255,255,255,.65)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>{date}</div>
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, iconBg, iconColor, iconBorder, title }) => (
  <div style={{ padding: '14px 20px', borderBottom: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 9,
      background: iconBg, border: `1.5px solid ${iconBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={15} color={iconColor} />
    </div>
    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', letterSpacing: '-.01em' }}>{title}</span>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ViewProjectDetails({ onUpdateNavigation }) {
  const { id }       = useParams();
  const navigate     = useNavigate();

  const [project,    setProject]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    onUpdateNavigation?.({ breadcrumbs: ['Projects', 'Project Details'] });
    return () => onUpdateNavigation?.(null);
  }, [onUpdateNavigation]);

  const fetchProject = useCallback(async () => {
    if (!id) { setError('No project ID provided'); setLoading(false); return; }
    try {
      setLoading(true); setError('');
      const response = await getProjectById(id);
      const data = response?.data || response;
      if (!data?.id) throw new Error('Project details are not available.');
      setProject(data);
    } catch (err) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  const handleBack = () => navigate('/projects');

  const handleSaveProject = async (formData) => {
    await updateProject(project.id, formData);
    setProject(prev => ({ ...prev, ...formData }));
    setIsEditOpen(false);
  };

  if (loading) return <LoadingView />;
  if (error)   return <ErrorView message={error} onRetry={fetchProject} onBack={handleBack} />;
  if (!project) return <ErrorView message="Project data not available." onRetry={fetchProject} onBack={handleBack} />;

  const meta        = getStatusMeta(project);
  const StatusIcon  = meta.Icon;
  const fullAddress = [project.address, project.city, project.state, project.pincode].filter(Boolean).join(', ');

  return (
    <>
      <style>{`
        .vpd-root { font-family: 'Outfit', 'DM Sans', system-ui, sans-serif; }
        .vpd-back:hover { background: #f0fdfa !important; border-color: #0d9488 !important; color: #0f766e !important; }
        .vpd-edit-btn:hover { background: linear-gradient(135deg,#f0fdfa,#fff) !important; border-color: #0d9488 !important; color: #0f766e !important; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .vpd-animate { animation: fadeUp .35s cubic-bezier(.16,1,.3,1) both; }
        .vpd-animate-d1 { animation-delay: .05s }
        .vpd-animate-d2 { animation-delay: .10s }
        .vpd-animate-d3 { animation-delay: .15s }
        .vpd-animate-d4 { animation-delay: .20s }
      `}</style>

      <div className="vpd-root" style={{ minHeight: '100vh', background: '#f8fafc' }}>

        {/* Back button */}
        <div style={{ padding: '0 0 20px' }}>
          <button
            onClick={handleBack}
            className="vpd-back"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px', borderRadius: 50,
              border: '1.5px solid #cbd5e1', background: '#fff',
              fontSize: 13, fontWeight: 600, color: '#475569',
              cursor: 'pointer', transition: 'all .18s',
              boxShadow: '0 1px 4px rgba(15,23,42,.08)',
            }}
          >
            <ArrowLeft size={15} />
            Back to Projects
          </button>
        </div>

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <div className="vpd-animate" style={{
          borderRadius: 20, background: '#fff',
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 4px 20px rgba(15,23,42,.08)',
          overflow: 'hidden', marginBottom: 16,
        }}>
          {/* Teal top accent bar */}
          <div style={{ height: 4, background: 'linear-gradient(90deg,#0f766e,#0d9488,#14b8a6,#06b6d4)' }} />

          <div style={{ padding: '24px 24px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            {/* Left: Icon + Name + badges */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flex: 1, minWidth: 0 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                background: 'linear-gradient(135deg,#0f766e,#0d9488)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(13,148,136,.30)',
              }}>
                <FolderKanban size={28} color="#fff" />
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.20em', color: '#64748b', marginBottom: 5 }}>
                  Project Record
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', letterSpacing: '-.02em', margin: 0, lineHeight: 1.25, wordBreak: 'break-word' }}>
                  {project.name || 'Untitled Project'}
                </h1>

                {/* Badges row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  {/* Status badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '5px 12px', borderRadius: 50,
                    background: meta.bg, border: `1.5px solid ${meta.border}`,
                    fontSize: 12, fontWeight: 700, color: meta.color,
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
                    {meta.label}
                  </span>

                  {/* Active indicator */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 50,
                    background: project.is_active ? '#f0fdf4' : '#fef2f2',
                    border: `1.5px solid ${project.is_active ? '#4ade80' : '#f87171'}`,
                    fontSize: 12, fontWeight: 600, color: project.is_active ? '#166534' : '#dc2626',
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.is_active ? '#22c55e' : '#ef4444', display: 'inline-block' }} />
                    {project.is_active ? 'Active Record' : 'Inactive Record'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Edit button */}
            <button
              onClick={() => setIsEditOpen(true)}
              className="vpd-edit-btn"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '9px 18px', borderRadius: 12,
                border: '1.5px solid #94a3b8', background: '#fff',
                fontSize: 13, fontWeight: 700, color: '#334155',
                cursor: 'pointer', transition: 'all .18s', flexShrink: 0,
                boxShadow: '0 1px 4px rgba(15,23,42,.08)',
              }}
            >
              <Edit2 size={14} /> Edit Project
            </button>
          </div>
        </div>

        {/* ── Two-column body ──────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

          {/* LEFT: Project info cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Project Details section */}
            <div className="vpd-animate vpd-animate-d1" style={{
              background: '#fff', borderRadius: 16, border: '1.5px solid #cbd5e1',
              boxShadow: '0 2px 12px rgba(15,23,42,.07)', overflow: 'hidden',
            }}>
              <SectionHeader
                icon={FolderKanban}
                iconBg="#f0fdfa"
                iconBorder="#5eead4"
                iconColor="#0d9488"
                title="Project Details"
              />

              <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <DetailCard
                  icon={Hash}
                  iconBg="#f1f5f9"
                  iconBorder="#94a3b8"
                  iconColor="#334155"
                  label="CTS Number"
                  value={project.cts_number}
                />
                <DetailCard
                  icon={Building2}
                  iconBg="#f0fdfa"
                  iconBorder="#5eead4"
                  iconColor="#0d9488"
                  label="City"
                  value={project.city}
                />
                <DetailCard
                  icon={Navigation}
                  iconBg="#fff7ed"
                  iconBorder="#fb923c"
                  iconColor="#ea580c"
                  label="State"
                  value={project.state}
                />
                <DetailCard
                  icon={LocateFixed}
                  iconBg="#faf5ff"
                  iconBorder="#c084fc"
                  iconColor="#9333ea"
                  label="Pincode"
                  value={project.pincode}
                />
                {fullAddress && (
                  <DetailCard
                    icon={MapPin}
                    iconBg="#fef2f2"
                    iconBorder="#f87171"
                    iconColor="#dc2626"
                    label="Full Address"
                    value={fullAddress}
                    fullWidth
                  />
                )}
              </div>
            </div>

            {/* Record Summary */}
            <div className="vpd-animate vpd-animate-d2" style={{
              background: '#fff', borderRadius: 16, border: '1.5px solid #cbd5e1',
              boxShadow: '0 2px 12px rgba(15,23,42,.07)', overflow: 'hidden',
            }}>
              <SectionHeader
                icon={ShieldCheck}
                iconBg="#f0f9ff"
                iconBorder="#7dd3fc"
                iconColor="#0284c7"
                title="Record Summary"
              />
              <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <InfoRow label="Current Status"  value={meta.label} accent />
                <InfoRow label="Active Record"    value={project.is_active ? 'Yes — record is active' : 'No — record is inactive'} />
              </div>
            </div>
          </div>

          {/* RIGHT: Timeline + Status card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Timeline card (dark) */}
            <div className="vpd-animate vpd-animate-d3" style={{
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(15,23,42,.18)',
            }}>
              <div style={{
                background: 'linear-gradient(160deg,#0f172a 0%,#134e4a 60%,#115e59 100%)',
                padding: '20px 20px 22px',
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.22em', color: 'rgba(255,255,255,.55)', marginBottom: 20 }}>
                  Project Timeline
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <TimelineItem icon={CalendarDays} label="Created On"    date={formatDate(project.created_at)} />
                  <TimelineItem icon={Clock3}       label="Last Updated"  date={formatDate(project.updated_at)} isLast />
                </div>
              </div>

              {/* Status panel */}
              <div style={{
                background: meta.bg, borderTop: `3px solid ${meta.border}`,
                padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: '#fff', border: `2px solid ${meta.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,.08)',
                  flexShrink: 0,
                }}>
                  <StatusIcon size={20} color={meta.color} />
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: meta.color, opacity: .8, marginBottom: 3 }}>
                    Project Status
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: meta.color, letterSpacing: '-.01em' }}>
                    {meta.label}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {isEditOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setIsEditOpen(false)}
          onSave={handleSaveProject}
        />
      )}
    </>
  );
}