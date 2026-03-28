import { useState, useEffect, useRef } from 'react';
import {
  Trash2, CheckCircle2, XCircle, RotateCcw, Send, MoreVertical,
} from 'lucide-react';

const NocActionsMenu = ({ row, handlers }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => setOpen(false);
  const status = String(row.status || '').toLowerCase();
  const isPending  = status === 'pending' || status === 'submitted';
  const isRejected = status === 'rejected';
  const isDraft    = status === 'draft' || status === '';

  return (
    <div className="relative flex justify-center" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150
          ${open ? 'text-teal-700 bg-teal-100' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        title="Actions"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-10 z-50 w-52 bg-white rounded-xl border border-gray-200 py-1.5 shadow-xl overflow-hidden"
          style={{ animation: 'nocDropIn 0.15s ease-out' }}
          onClick={(e) => e.stopPropagation()}
        >
          {isDraft && (
            <button
              onClick={() => { close(); handlers?.onSubmitNoc?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
            >
              <Send className="w-4 h-4 flex-shrink-0" />
              Submit NOC
            </button>
          )}

          {isPending && handlers?.onApproveNoc && (
            <button
              onClick={() => { close(); handlers?.onApproveNoc?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Approve NOC
            </button>
          )}
          {isPending && handlers?.onRejectNoc && (
            <button
              onClick={() => { close(); handlers?.onRejectNoc?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <XCircle className="w-4 h-4 flex-shrink-0" />
              Reject NOC
            </button>
          )}

          {isRejected && (
            <button
              onClick={() => { close(); handlers?.onReapplyNoc?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4 flex-shrink-0" />
              Reapply NOC
            </button>
          )}

          <div className="my-1 border-t border-gray-100" />

          {handlers?.onDeleteNoc && (
            <button
              onClick={() => { close(); handlers?.onDeleteNoc?.(row); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              Delete NOC
            </button>
          )}
        </div>
      )}

      <style>{`
        @keyframes nocDropIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default NocActionsMenu;