// import { useState, useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
// import { FileText, Download, Send, Edit, Building2, MapPin, Mail, Phone, Clock, CheckCircle, XCircle, AlertCircle, X, User, Loader2 } from 'lucide-react';
// import { createProforma } from '../../services/proforma';

// // ============================================================================
// // SEND MAIL TO CLIENT MODAL
// // ============================================================================

// const SendMailModal = ({ isOpen, onClose, proforma, onSend }) => {
//   const [message, setMessage] = useState('');
//   const [attachments] = useState([null, null, null]);

//   useEffect(() => {
//     if (isOpen) {
//       const scrollY = window.scrollY;
//       document.body.style.position = 'fixed';
//       document.body.style.top = `-${scrollY}px`;
//       document.body.style.width = '100%';
//       document.body.style.overflow = 'hidden';
//     } else {
//       const scrollY = document.body.style.top;
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//       if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
//     }
//     return () => {
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//     };
//   }, [isOpen]);

//   if (!isOpen) return null;

//   // TODO (backend): wire to API call
//   const handleSend = () => {
//     onSend();
//   };

//   // TODO (backend): wire to save draft API
//   const handleSaveDraft = () => {
//     onClose();
//   };

//   // TODO (backend): wire to file upload handler
//   const handleAttach = () => {
//     // e.g. open file picker, upload to S3, store URL in attachments[index]
//   };

//   const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

//   return (
//     <div
//       className="fixed inset-0 z-[9999] animate-fadeIn"
//       style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}
//     >
//       {/* Backdrop */}
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
//         style={{ width: '100vw', height: '100vh', position: 'fixed' }}
//         onClick={onClose}
//       />

//       {/* Perfectly centered wrapper */}
//       <div
//         className="relative z-10 flex items-center justify-center px-4"
//         style={{ width: '100vw', height: '100dvh' }}
//       >
//         <div
//           className="relative bg-white rounded-2xl shadow-2xl animate-scaleIn flex flex-col overflow-hidden"
//           style={{ width: '100%', maxWidth: '600px', maxHeight: 'min(94dvh, 760px)' }}
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* ── Header ── */}
//           <div className="bg-teal-600 text-white px-6 py-4 flex items-center justify-between flex-shrink-0">
//             <div className="flex items-center gap-2.5">
//               <Send className="w-4 h-4" />
//               <h2 className="text-sm font-semibold tracking-wide">Send Mail To client</h2>
//             </div>
//             <button onClick={onClose} className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors">
//               <X className="w-4 h-4" />
//             </button>
//           </div>

//           {/* ── Scrollable content ── */}
//           <div className="flex-1 overflow-y-auto min-h-0 px-6 pt-5 pb-3 space-y-3">

//             {/* To */}
//             <div className="flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3">
//               <span className="text-sm text-gray-800 truncate">
//                 <span className="font-semibold">To:</span> {proforma?.client?.email || proforma?.clientEmail || 'client@email.com'}
//               </span>
//               <User className="w-4 h-4 text-teal-500 flex-shrink-0 ml-3" />
//             </div>

//             {/* Subject */}
//             <div className="border border-gray-200 rounded-xl px-4 py-3">
//               <p className="text-sm text-gray-800 leading-relaxed">
//                 <span className="font-semibold">Subject:</span>{' '}
//                 <span className="text-gray-600">{proforma?.subject || `Proforma ${proforma?.number || proforma?.proforma_number}`}</span>
//               </p>
//             </div>

//             {/* Proforma card */}
//             <div className="border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3">
//               <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
//                 <FileText className="w-5 h-5 text-blue-600" />
//               </div>
//               <div className="flex-1 min-w-0">
//                 <div className="text-sm font-bold text-gray-900">{proforma?.number || proforma?.proforma_number}</div>
//                 <div className="text-xs text-gray-500 truncate mt-0.5">
//                   {proforma?.client?.name || proforma?.clientName}, {proforma?.project?.name || proforma?.projectName}
//                 </div>
//               </div>
//               <CheckCircle className="w-5 h-5 text-teal-500 flex-shrink-0" />
//             </div>

//             {/* Message */}
//             <div className="border border-gray-200 rounded-xl px-4 py-3">
//               <textarea
//                 className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none resize-none bg-transparent leading-relaxed"
//                 placeholder="Type your Message......"
//                 rows={2}
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//               />
//             </div>

//             {/* Attach documents */}
//             {[1, 2, 3].map((num, index) => (
//               <button
//                 key={num}
//                 onClick={() => handleAttach(index)}
//                 className="w-full flex items-center justify-between border border-gray-200 rounded-xl px-4 py-3 hover:border-teal-400 transition-colors group"
//               >
//                 <div className="flex items-center gap-3">
//                   <FileText className="w-4 h-4 text-gray-400 group-hover:text-teal-500 transition-colors flex-shrink-0" />
//                   <span className="text-sm text-gray-500">
//                     {attachments[index] ? attachments[index].name : `Attach document ${num}`}
//                   </span>
//                 </div>
//                 <span className="w-6 h-6 flex-shrink-0 inline-flex items-center justify-center border border-gray-300 rounded-full text-gray-400 group-hover:border-teal-400 group-hover:text-teal-500 transition-colors">
//                   <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
//                     <path d="M5 1V9M1 5H9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
//                   </svg>
//                 </span>
//               </button>
//             ))}
//           </div>

//           {/* ── Bottom section: dates + buttons ── */}
//           <div className="flex-shrink-0 px-6 pb-5 pt-3 flex flex-col items-end gap-2.5">

//             {/* Dates — right-aligned */}
//             <div className="flex items-center gap-5 text-xs text-gray-400">
//               <div className="flex items-center gap-1.5">
//                 <Clock className="w-3 h-3" />
//                 <span>Date: {today}</span>
//               </div>
//               <div className="flex items-center gap-1.5">
//                 <Clock className="w-3 h-3" />
//                 <span>Date: {today}</span>
//               </div>
//             </div>

//             {/* Buttons */}
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={handleSaveDraft}
//                 className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
//               >
//                 <FileText className="w-4 h-4" />
//                 Save Draft
//               </button>
//               <button
//                 onClick={handleSend}
//                 className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium text-sm transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
//               >
//                 <Send className="w-4 h-4" />
//                 Send to Client
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ============================================================================
// // SEND FOR APPROVAL SUCCESS MODAL
// // ============================================================================

// const SendApprovalSuccessModal = ({ isOpen, onClose }) => {
//   useEffect(() => {
//     if (isOpen) {
//       const scrollY = window.scrollY;
//       document.body.style.position = 'fixed';
//       document.body.style.top = `-${scrollY}px`;
//       document.body.style.width = '100%';
//       document.body.style.overflow = 'hidden';
//     } else {
//       const scrollY = document.body.style.top;
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//       if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
//     }
//     return () => {
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//     };
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[9999] animate-fadeIn"
//       style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
//     >
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
//         style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
//         onClick={onClose}
//       />
//       <div className="relative z-10 flex items-center justify-center px-4" style={{ width: '100vw', height: '100dvh' }}>
//         <div
//           className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full pt-12 pb-8 px-8 text-center animate-scaleIn"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div className="mb-5 flex justify-center">
//             <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
//               <CheckCircle className="w-12 h-12 text-teal-600" />
//             </div>
//           </div>
//           <h3 className="text-2xl font-bold text-gray-800 mb-1">Successfully</h3>
//           <p className="text-lg font-semibold text-gray-700 mb-8">Proforma Send For Approval</p>
//           <div className="space-y-3">
//             <button
//               onClick={onClose}
//               className="w-full px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
//             >
//               OK
//             </button>
//             <button
//               onClick={onClose}
//               className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
//             >
//               Skip
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ============================================================================
// // SEND SUCCESS MODAL
// // ============================================================================

// const SendSuccessModal = ({ isOpen, onClose }) => {
//   useEffect(() => {
//     if (isOpen) {
//       const scrollY = window.scrollY;
//       document.body.style.position = 'fixed';
//       document.body.style.top = `-${scrollY}px`;
//       document.body.style.width = '100%';
//       document.body.style.overflow = 'hidden';
//     } else {
//       const scrollY = document.body.style.top;
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//       if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
//     }
//     return () => {
//       document.body.style.position = '';
//       document.body.style.top = '';
//       document.body.style.width = '';
//       document.body.style.overflow = '';
//     };
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div
//       className="fixed inset-0 z-[9999] animate-fadeIn"
//       style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'fixed', overflow: 'hidden' }}
//     >
//       <div
//         className="absolute inset-0 bg-black/60 backdrop-blur-sm"
//         style={{ width: '100vw', height: '100vh', top: 0, left: 0, position: 'fixed', overflow: 'hidden' }}
//         onClick={onClose}
//       />
//       <div className="relative z-10 flex items-center justify-center px-4" style={{ width: '100vw', height: '100dvh' }}>
//         <div
//           className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full pt-12 pb-8 px-8 text-center animate-scaleIn"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <div className="mb-5 flex justify-center">
//             <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center animate-bounce">
//               <CheckCircle className="w-12 h-12 text-teal-600" />
//             </div>
//           </div>
//           <h3 className="text-2xl font-bold text-gray-800 mb-1">Successfully</h3>
//           <p className="text-lg font-semibold text-gray-700 mb-8">Proforma Send to Client</p>
//           <div className="space-y-3">
//             <button
//               onClick={onClose}
//               className="w-full px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
//             >
//               OK
//             </button>
//             <button
//               onClick={onClose}
//               className="w-full px-6 py-3 bg-white text-gray-600 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium transform hover:scale-[1.02] active:scale-[0.98]"
//             >
//               Skip
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// const formatProformaNumber = (number) => {
//   if (!number) return 'N/A';
//   if (String(number).startsWith('QT-') || String(number).startsWith('PF-')) return number;
//   const s = String(number);
//   if (s.length >= 8) return `PF-${s.substring(0, 4)}-${s.substring(4).padStart(5, '0')}`;
//   return `PF-2026-${String(number).padStart(5, '0')}`;
// };

// const formatDate = (dateString) => {
//   if (!dateString) return 'N/A';
//   try {
//     const date = new Date(dateString);
//     return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
//   } catch { return 'N/A'; }
// };

// // ============================================================================
// // MAIN COMPONENT
// // ============================================================================

// export default function Proforma({ onUpdateNavigation }) {
//   const location = useLocation();
//   // State from proformaList navigation (when creating new proforma from list)
//   const selectedClientFromState = location.state?.selectedClient;
//   const selectedQuotationFromState = location.state?.selectedQuotation;
//   const isCreationMode = !!(selectedClientFromState && selectedQuotationFromState);

//   // ── Creation form state (only used when navigated from proformaList) ──
//   const [submitting, setSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState('');
//   const [showCreationSuccess, setShowCreationSuccess] = useState(false);

//   // ── View / detail state ──
//   const [proformas, setProformas] = useState([
//     {
//       id: 1,
//       number: 'QT-2026-02034',
//       client: {
//         name: 'ACME Corporation',
//         contact: 'Robert Johnson',
//         email: 'robert@acmecorp.com',
//         phone: '+1 (555) 123-4567'
//       },
//       company: {
//         name: 'BuildPro Construction',
//         address: '123 Builder Street, Construction District',
//         city: 'Mumbai, Maharashtra 400001',
//         email: 'info@buildpro.com',
//         phone: '+91 22 1234 5678'
//       },
//       project: {
//         name: 'Riverside Corporate Tower',
//         location: 'Downtown District, Mumbai',
//         plot: 'CTS-458/2B'
//       },
//       version: 'Rev 2',
//       issueDate: '2026-01-01',
//       validUntil: '2026-01-31',
//       subject: 'Proforma to Acme Corporation about construction services',
//       sections: [
//         {
//           title: 'Section A - Construction Certificate',
//           items: [
//             {
//               description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
//               quantity: 1,
//               unit: 'Cubic ft',
//               rate: 555,
//               amount: 555
//             },
//             {
//               description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
//               quantity: 1,
//               unit: 'Cubic ft',
//               rate: 555,
//               amount: 555
//             }
//           ]
//         },
//         {
//           title: 'Section B - Occupational Certificate',
//           items: [
//             {
//               description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
//               quantity: 1,
//               unit: 'Cubic ft',
//               rate: 555,
//               amount: 555
//             },
//             {
//               description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
//               quantity: 1,
//               unit: 'Cubic ft',
//               rate: 555,
//               amount: 555
//             },
//             {
//               description: 'To obtain Extra Water & Extra Sewerage Charges & No Dues NOC from Water Dept.',
//               quantity: 1,
//               unit: 'Cubic ft',
//               rate: 555,
//               amount: 555
//             }
//           ]
//         }
//       ],
//       subTotal: 636512,
//       gst: {
//         enabled: true,
//         rate: 18,
//         amount: 25325
//       },
//       discount: {
//         type: 'Percentage',
//         value: 0
//       },
//       grandTotal: 612322,
//       status: 'Draft',
//       timeline: [
//         {
//           title: 'Quotation Created',
//           date: '01-01-2026, 09:30 AM',
//           user: 'Mr. ABC'
//         },
//         {
//           title: 'Revised to version 2 - update pricing',
//           date: '01-01-2026, 09:30 AM',
//           user: 'Mr. ABC'
//         },
//         {
//           title: 'Proforma Generated',
//           date: '01-01-2026, 09:30 AM',
//           user: 'Mr. ABC'
//         },
//         {
//           title: 'Send to client via Email',
//           date: '01-01-2026, 09:30 AM',
//           user: 'Mr. ABC'
//         },
//         {
//           title: 'Awaiting for client approval',
//           date: '',
//           user: '',
//           pending: true
//         }
//       ]
//     }
//   ]);

//   const [selectedProforma, setSelectedProforma] = useState(proformas[0]);
//   const [activeTab, setActiveTab] = useState('preview'); // 'preview' or 'timeline'
//   const [showSendMailModal, setShowSendMailModal] = useState(false);
//   const [showSendSuccessModal, setShowSendSuccessModal] = useState(false);
//   const [showApprovalSuccessModal, setShowApprovalSuccessModal] = useState(false);

//   // ── Navigation breadcrumbs ──
//   useEffect(() => {
//     if (onUpdateNavigation) {
//       onUpdateNavigation({
//         breadcrumbs: ['Proforma', 'Generate Proforma']
//       });
//     }
//     return () => {
//       if (onUpdateNavigation) onUpdateNavigation(null);
//     };
//   }, [onUpdateNavigation]);

//   // ── If navigated with a selected client + quotation, auto-submit to create proforma ──
//   useEffect(() => {
//     if (isCreationMode) {
//       handleAutoCreate();
//     }
//   }, []);

//   const handleAutoCreate = async () => {
//     setSubmitting(true);
//     setSubmitError('');
//     try {
//       const proformaData = {
//         client: selectedClientFromState.id,
//         quotation: selectedQuotationFromState.id,
//         quotation_type: selectedQuotationFromState.quotation_type,
//         gst_rate: '18',
//         discount_rate: '0',
//         // Items are inherited from the quotation on the backend
//         items: (selectedQuotationFromState.items || []).map(item => ({
//           description: item.description,
//           quantity: Number(item.quantity),
//           unit_price: Number(item.unit_price || item.rate || 0),
//           tax_rate: String(item.tax_rate || '10'),
//         })),
//       };

//       const response = await createProforma(proformaData);

//       if (response.status === 'success' && response.data) {
//         // Build a display-friendly proforma from the API response
//         const data = response.data;
//         const displayProforma = {
//           id: data.id,
//           number: formatProformaNumber(data.proforma_number),
//           client: {
//             name: selectedClientFromState.first_name + ' ' + selectedClientFromState.last_name,
//             contact: selectedClientFromState.first_name + ' ' + selectedClientFromState.last_name,
//             email: selectedClientFromState.email,
//             phone: selectedClientFromState.phone_number || '',
//           },
//           company: {
//             name: 'BuildPro Construction',
//             address: '123 Builder Street, Construction District',
//             city: 'Mumbai, Maharashtra 400001',
//             email: 'info@buildpro.com',
//             phone: '+91 22 1234 5678'
//           },
//           project: {
//             name: selectedQuotationFromState.client_name || 'Project',
//             location: '',
//             plot: ''
//           },
//           version: 'Rev 1',
//           issueDate: formatDate(data.created_at),
//           validUntil: formatDate(data.valid_until) || 'N/A',
//           subject: `Proforma to ${selectedClientFromState.first_name} ${selectedClientFromState.last_name} about construction services`,
//           sections: buildSectionsFromItems(data.items || []),
//           subTotal: Number(data.total_amount || 0),
//           gst: {
//             enabled: true,
//             rate: Number(data.gst_rate || 18),
//             amount: Number(data.total_gst_amount || 0),
//           },
//           discount: { type: 'Percentage', value: Number(data.discount_rate || 0) },
//           grandTotal: Number(data.grand_total || 0),
//           status: 'Draft',
//           timeline: [
//             { title: 'Proforma Generated', date: formatDate(data.created_at) + ', ' + new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), user: 'You' },
//             { title: 'Awaiting for client approval', date: '', user: '', pending: true }
//           ]
//         };
//         setSelectedProforma(displayProforma);
//         setProformas([displayProforma]);
//         setShowCreationSuccess(true);
//         setTimeout(() => setShowCreationSuccess(false), 3000);
//       }
//     } catch (err) {
//       setSubmitError(err.message || 'Failed to create proforma');
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const buildSectionsFromItems = (items) => {
//     if (!items || items.length === 0) return [];
//     // Group all items into one section
//     return [{
//       title: 'Section A - Services',
//       items: items.map(item => ({
//         description: item.description,
//         quantity: item.quantity,
//         unit: item.unit || 'Cubic ft',
//         rate: item.unit_price || 0,
//         amount: item.total || (item.quantity * item.unit_price) || 0,
//       }))
//     }];
//   };

//   const handleSendToClient = () => {
//     setShowSendMailModal(true);
//   };

//   const handleMailSend = () => {
//     setShowSendMailModal(false);
//     setShowSendSuccessModal(true);
//   };

//   // TODO (backend): wire to approval request API
//   const handleSendForApproval = () => {
//     setShowApprovalSuccessModal(true);
//   };

//   const handleSaveDraft = () => {
//     alert('Proforma saved as draft!');
//   };

//   const handleDownloadPDF = () => {
//     alert('PDF download will be implemented with backend integration');
//   };

//   const handleTurnIntoInvoice = () => {
//     if (selectedProforma.status === 'Draft') {
//       alert('Please get client approval before converting to invoice');
//       return;
//     }
//     alert('Invoice generation will be implemented');
//   };

//   // Loading state while auto-creating
//   if (submitting) {
//     return (
//       <div className="flex items-center justify-center min-h-[60vh]">
//         <div className="text-center">
//           <Loader2 className="w-12 h-12 text-teal-600 animate-spin mx-auto mb-4" />
//           <p className="text-gray-600 font-medium">Creating Proforma...</p>
//           <p className="text-gray-400 text-sm mt-1">Please wait</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-4 sm:space-y-6">

//       {/* Creation success banner */}
//       {showCreationSuccess && (
//         <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 flex items-center gap-3">
//           <CheckCircle className="w-5 h-5 text-teal-600 flex-shrink-0" />
//           <p className="text-teal-800 text-sm font-medium">Proforma created successfully!</p>
//         </div>
//       )}

//       {/* Submit error banner */}
//       {submitError && (
//         <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center gap-3">
//           <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
//           <p className="text-red-700 text-sm">{submitError}</p>
//           <button onClick={() => setSubmitError('')} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
//         </div>
//       )}

//       {/* Header */}
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200">
//         <div className="p-4 sm:p-6 border-b border-gray-200">
//           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
//             <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Proforma Generation</h1>
//             <div className="flex gap-2 sm:gap-3">
//               <button
//                 onClick={handleDownloadPDF}
//                 className="px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
//               >
//                 <Download className="w-4 h-4" />
//                 <span className="hidden sm:inline">PDF</span>
//               </button>
//               <button
//                 onClick={handleSendToClient}
//                 className="px-3 sm:px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium"
//               >
//                 <Send className="w-4 h-4" />
//                 Send to Client
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Proforma Number */}
//         <div className="p-4 sm:p-6 border-b border-gray-200">
//           <div className="flex items-center gap-4">
//             <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
//               <FileText className="w-6 h-6 text-white" />
//             </div>
//             <div>
//               <div className="text-xl font-bold text-gray-900">{selectedProforma.number}</div>
//               <div className="text-sm text-gray-500">{selectedProforma.client.name}, {selectedProforma.project.name}</div>
//             </div>
//           </div>
//         </div>

//         {/* Main Content */}
//         <div className="p-4 sm:p-6">
//           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//             {/* Left Column - Proforma Details */}
//             <div className="lg:col-span-2 space-y-6">
//               {/* Company & Client Info */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 {/* Company Info */}
//                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                   <div className="flex items-center gap-2 mb-4">
//                     <Building2 className="w-5 h-5 text-teal-600" />
//                     <h3 className="font-semibold text-gray-800">{selectedProforma.company.name}</h3>
//                   </div>
//                   <div className="space-y-2 text-sm text-gray-600">
//                     <p>{selectedProforma.company.address}</p>
//                     <p>{selectedProforma.company.city}</p>
//                     <div className="flex items-center gap-2">
//                       <Mail className="w-4 h-4" />
//                       <span>{selectedProforma.company.email}</span>
//                     </div>
//                     <div className="flex items-center gap-2">
//                       <Phone className="w-4 h-4" />
//                       <span>{selectedProforma.company.phone}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Client Info */}
//                 <div className="space-y-4">
//                   <div className="bg-white p-4 rounded-lg border border-gray-200">
//                     <h4 className="text-xs font-medium text-gray-500 mb-2">To</h4>
//                     <div className="space-y-1">
//                       <div className="font-semibold text-gray-900">{selectedProforma.client.name}</div>
//                       <div className="text-sm text-gray-600">{selectedProforma.client.contact}</div>
//                       <div className="text-sm text-gray-600">{selectedProforma.client.email}</div>
//                       <div className="text-sm text-gray-600">{selectedProforma.client.phone}</div>
//                     </div>
//                   </div>

//                   <div className="bg-white p-4 rounded-lg border border-gray-200">
//                     <div className="flex items-center gap-2 mb-2">
//                       <MapPin className="w-4 h-4 text-teal-600" />
//                       <h4 className="text-xs font-medium text-gray-500">Project Details</h4>
//                     </div>
//                     <div className="space-y-1">
//                       <div className="text-sm font-medium text-gray-900">{selectedProforma.project.name}</div>
//                       <div className="text-sm text-gray-600">{selectedProforma.project.location}</div>
//                       {selectedProforma.project.plot && (
//                         <div className="text-sm text-gray-600">Plot: {selectedProforma.project.plot}</div>
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Quotation Details */}
//               <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
//                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
//                   <div>
//                     <div className="text-gray-600 mb-1">Quotation Number</div>
//                     <div className="font-semibold text-gray-900">{selectedProforma.number}</div>
//                   </div>
//                   <div>
//                     <div className="text-gray-600 mb-1">Version</div>
//                     <div className="font-semibold text-gray-900">{selectedProforma.version}</div>
//                   </div>
//                   <div>
//                     <div className="text-gray-600 mb-1">Issue Date</div>
//                     <div className="font-semibold text-gray-900">{selectedProforma.issueDate}</div>
//                   </div>
//                   <div>
//                     <div className="text-gray-600 mb-1">Valid Until</div>
//                     <div className="font-semibold text-gray-900">{selectedProforma.validUntil}</div>
//                   </div>
//                 </div>
//               </div>

//               {/* Subject */}
//               <div>
//                 <h4 className="font-semibold text-gray-800 mb-2">Subject :</h4>
//                 <p className="text-gray-600">{selectedProforma.subject}</p>
//               </div>

//               {/* Service Description */}
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Service Description</h3>
                
//                 {selectedProforma.sections.map((section, sectionIndex) => (
//                   <div key={sectionIndex} className="mb-6">
//                     <div className="flex items-center gap-2 mb-3">
//                       <div className="w-1 h-6 bg-teal-500 rounded"></div>
//                       <h4 className="font-semibold text-gray-800">{section.title}</h4>
//                     </div>

//                     <div className="overflow-x-auto">
//                       <table className="w-full border-collapse">
//                         <thead>
//                           <tr className="bg-gray-50 border-b border-gray-200">
//                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
//                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
//                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
//                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
//                             <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
//                           </tr>
//                         </thead>
//                         <tbody className="divide-y divide-gray-200">
//                           {section.items.map((item, itemIndex) => (
//                             <tr key={itemIndex} className="hover:bg-gray-50">
//                               <td className="px-4 py-3 text-sm text-gray-700">{item.description}</td>
//                               <td className="px-4 py-3 text-sm text-gray-700 text-center">{item.quantity}</td>
//                               <td className="px-4 py-3 text-sm text-gray-700">{item.unit}</td>
//                               <td className="px-4 py-3 text-sm text-gray-700">{item.rate}</td>
//                               <td className="px-4 py-3 text-sm font-semibold text-gray-900">Rs. {item.amount}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     </div>
//                   </div>
//                 ))}

//                 {/* Totals */}
//                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-6">
//                   <div className="space-y-2 text-sm">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">Sub Total:</span>
//                       <span className="font-semibold text-gray-900">Rs. {selectedProforma.subTotal.toLocaleString('en-IN')}</span>
//                     </div>
//                     {selectedProforma.gst.enabled && (
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">GST ({selectedProforma.gst.rate}%):</span>
//                         <span className="font-semibold text-gray-900">Rs. {selectedProforma.gst.amount.toLocaleString('en-IN')}</span>
//                       </div>
//                     )}
//                     <div className="flex justify-between pt-2 border-t border-gray-300">
//                       <span className="font-semibold text-gray-800">Grand Total:</span>
//                       <span className="text-xl font-bold text-teal-600">Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>

//               {/* Terms & Conditions */}
//               <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
//                 <h4 className="font-semibold text-gray-800 mb-3">Terms & Conditions</h4>
//                 <p className="text-sm text-gray-600">
//                   Payment terms: Net 30 days from invoice date. All services subject to availability and standard terms and conditions. Prices are valid for 30 days from quotation date. Any changes to the scope of work may result in price adjustments.
//                 </p>
//               </div>

//               {/* Signatures */}
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//                 <div className="bg-white p-4 rounded-lg border border-gray-200">
//                   <h4 className="text-sm font-medium text-gray-600 mb-2">Prepared By :</h4>
//                   <div className="text-sm">
//                     <div className="font-semibold text-gray-900">Mr. ABC</div>
//                     <div className="text-gray-600">Project Manager</div>
//                   </div>
//                 </div>
//                 <div className="bg-white p-4 rounded-lg border border-gray-200">
//                   <h4 className="text-sm font-medium text-gray-600 mb-2">Client Approval :</h4>
//                   <div className="text-sm">
//                     <div className="font-semibold text-gray-900">Sign:</div>
//                     <div className="text-gray-600">Date:</div>
//                   </div>
//                 </div>
//               </div>
//             </div>

//             {/* Right Column - Summary & Timeline */}
//             <div className="space-y-6">
//               {/* Quick Summary */}
//               <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//                 <div className="bg-gradient-to-r from-teal-500 to-blue-500 px-4 py-3">
//                   <h3 className="font-semibold text-white">Quotation Summary</h3>
//                 </div>
//                 <div className="p-4 space-y-3">
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Total Amount</span>
//                     <span className="font-bold text-gray-900">Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Valid Until</span>
//                     <span className="font-medium text-gray-900">{selectedProforma.validUntil}</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Sections</span>
//                     <span className="font-medium text-gray-900">{selectedProforma.sections.length}</span>
//                   </div>
//                   <div className="flex justify-between text-sm">
//                     <span className="text-gray-600">Line Items</span>
//                     <span className="font-medium text-gray-900">
//                       {selectedProforma.sections.reduce((total, section) => total + section.items.length, 0)}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               {/* Quick Info / Timeline Toggle */}
//               <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
//                 <div className="border-b border-gray-200">
//                   <div className="flex">
//                     <button
//                       onClick={() => setActiveTab('preview')}
//                       className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
//                         activeTab === 'preview'
//                           ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
//                           : 'text-gray-600 hover:text-gray-800'
//                       }`}
//                     >
//                       Quick Info
//                     </button>
//                     <button
//                       onClick={() => setActiveTab('timeline')}
//                       className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
//                         activeTab === 'timeline'
//                           ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50'
//                           : 'text-gray-600 hover:text-gray-800'
//                       }`}
//                     >
//                       Timeline
//                     </button>
//                   </div>
//                 </div>

//                 {activeTab === 'preview' ? (
//                   <div className="p-4 space-y-4">
//                     <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
//                       <FileText className="w-5 h-5 text-purple-600" />
//                       <div className="flex-1">
//                         <div className="text-xs text-gray-500">Quotation Created</div>
//                         <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
//                       <Clock className="w-5 h-5 text-blue-600" />
//                       <div className="flex-1">
//                         <div className="text-xs text-gray-500">Revised to version 2 - update pricing</div>
//                         <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
//                       <CheckCircle className="w-5 h-5 text-green-600" />
//                       <div className="flex-1">
//                         <div className="text-xs text-gray-500">Proforma Generated</div>
//                         <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
//                       <Send className="w-5 h-5 text-teal-600" />
//                       <div className="flex-1">
//                         <div className="text-xs text-gray-500">Send to client via Email</div>
//                         <div className="text-sm font-medium text-gray-900">01-01-2026, 09:30 AM by Mr. ABC</div>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
//                       <AlertCircle className="w-5 h-5 text-yellow-600" />
//                       <div className="flex-1">
//                         <div className="text-xs text-gray-500">Awaiting for client approval</div>
//                         <div className="text-sm font-medium text-yellow-600">Pending</div>
//                       </div>
//                     </div>
//                   </div>
//                 ) : (
//                   <div className="p-4">
//                     <div className="relative">
//                       <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
//                       <div className="space-y-4">
//                         {selectedProforma.timeline.map((event, index) => (
//                           <div key={index} className="relative flex gap-3">
//                             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
//                               event.pending 
//                                 ? 'bg-yellow-100 border-2 border-yellow-400' 
//                                 : 'bg-teal-100 border-2 border-teal-400'
//                             }`}>
//                               {event.pending ? (
//                                 <Clock className="w-4 h-4 text-yellow-600" />
//                               ) : (
//                                 <CheckCircle className="w-4 h-4 text-teal-600" />
//                               )}
//                             </div>
//                             <div className="flex-1 pb-4">
//                               <div className={`text-sm font-medium ${event.pending ? 'text-yellow-600' : 'text-gray-900'}`}>
//                                 {event.title}
//                               </div>
//                               {!event.pending && (
//                                 <div className="text-xs text-gray-500 mt-1">
//                                   {event.date} by {event.user}
//                                 </div>
//                               )}
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
//         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//           <div className="text-sm whitespace-nowrap">
//             <span className="font-semibold">Total:</span> Rs. {selectedProforma.grandTotal.toLocaleString('en-IN')}
//             <span className="mx-3">|</span>
//             <span className="font-semibold">Items:</span> {selectedProforma.sections.reduce((total, section) => total + section.items.length, 0)}
//             <span className="mx-3">|</span>
//             <span className="font-semibold">Status:</span>
//             <span className={`ml-1 ${selectedProforma.status === 'Draft' ? 'text-yellow-600' : 'text-green-600'}`}>
//               {selectedProforma.status}
//             </span>
//           </div>
//           <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
//             <button
//               onClick={handleSaveDraft}
//               className="flex-shrink-0 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
//             >
//               <FileText className="w-4 h-4" />
//               Save Draft
//             </button>
//             <button
//               onClick={handleDownloadPDF}
//               className="flex-shrink-0 px-4 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
//             >
//               <Download className="w-4 h-4" />
//               PDF
//             </button>
//             <button
//               disabled
//               className="flex-shrink-0 px-4 py-2.5 border border-yellow-400 text-yellow-600 bg-white rounded-lg flex items-center gap-2 text-sm font-medium cursor-default whitespace-nowrap"
//             >
//               <Clock className="w-4 h-4" />
//               Editable until Approved
//             </button>
//             <button
//               className="flex-shrink-0 px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
//               onClick={handleTurnIntoInvoice}
//             >
//               <FileText className="w-4 h-4" />
//               Turn into Invoice
//             </button>
//             <button
//               onClick={handleSendForApproval}
//               className="flex-shrink-0 px-4 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors flex items-center gap-2 text-sm font-medium whitespace-nowrap"
//             >
//               <Send className="w-4 h-4" />
//               Send For Approval
//             </button>
//           </div>
//         </div>

//         <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
//           <p className="text-sm text-yellow-800">
//             <span className="font-semibold">Note:</span> Turn into Invoice option will enable once client approve the Proforma
//           </p>
//         </div>
//       </div>

//       {/* ══════════════ MODALS ══════════════ */}

//       <SendMailModal
//         isOpen={showSendMailModal}
//         onClose={() => setShowSendMailModal(false)}
//         proforma={selectedProforma}
//         onSend={handleMailSend}
//       />

//       <SendSuccessModal
//         isOpen={showSendSuccessModal}
//         onClose={() => setShowSendSuccessModal(false)}
//       />

//       <SendApprovalSuccessModal
//         isOpen={showApprovalSuccessModal}
//         onClose={() => setShowApprovalSuccessModal(false)}
//       />

//       {/* Animations */}
//       <style>{`
//         @keyframes fadeIn {
//           from { opacity: 0; }
//           to { opacity: 1; }
//         }
//         @keyframes scaleIn {
//           from { opacity: 0; transform: scale(0.95); }
//           to { opacity: 1; transform: scale(1); }
//         }
//         .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
//         .animate-scaleIn { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
//       `}</style>
//     </div>
//   );
// }
