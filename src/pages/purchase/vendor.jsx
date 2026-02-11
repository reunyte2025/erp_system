import { useEffect, useState } from "react";
import { Pencil, Plus, FileText, Search } from "lucide-react";

// ---------------- API LAYER (easy to swap with real backend) ----------------
const api = {
  getVendor: async () => {
    // replace with: fetch('/api/vendors/:id')
    return {
      id: 1,
      name: "ABC Infra",
      email: "abcinfra@gmail.com",
      phone: "+91 123456789",
      category: "Plumbing",
      address: "19, A, Mumbai (E), 201, abc society",
      notes: "Discussed scope in first meeting. Client focused on XYZ things.",
      paymentsDone: 8,
      totalProjects: 10,
    };
  },

  getProjects: async () => {
    // replace with: fetch('/api/vendors/:id/projects')
    return [
      { id: 1, name: "ACME Corporation", status: "In Progress" },
      { id: 2, name: "ACME Corporation", status: "Pending" },
      { id: 3, name: "ACME Corporation", status: "Draft" },
      { id: 4, name: "ACME Corporation", status: "Failed" },
      { id: 5, name: "ACME Corporation", status: "Completed" },
      { id: 6, name: "XYZ Pvt Ltd", status: "Completed" },
    ];
  },

  getPayments: async () => {
    // replace with: fetch('/api/vendors/:id/payments')
    return [
      { id: 1, amount: 102000, status: "Pending", date: "2025-02-10" },
      { id: 2, amount: 102000, status: "Pending", date: "2025-02-12" },
      { id: 3, amount: 102000, status: "Completed", date: "2025-02-15" },
      { id: 4, amount: 102000, status: "Completed", date: "2025-02-18" },
      { id: 5, amount: 102000, status: "Completed", date: "2025-02-20" },
      { id: 6, amount: 85000, status: "Completed", date: "2025-02-22" },
    ];
  },
};
const clientNotes = [
  "we discuss about some points at first meeting and the client had focused on xyz things so we need to do those AEAP",
  "we discuss about some points at first meeting and the client had focused on xyz things so we need to do those AEAP",
  "we discuss about some points at first meeting and the client had focused on xyz things so we need to do those AEAP",
  "we discuss about some points at first meeting and the client had focused on xyz things so we need to do those AEAP",
  "we discuss about some points at first meeting and the client had focused on xyz things so we need to do those AEAP",
];

// ---------------- UI HELPERS ----------------
const StatusBadge = ({ status }) => {
  const map = {
    "In Progress": "bg-yellow-100 text-yellow-700",
    Pending: "bg-orange-100 text-orange-700",
    Draft: "bg-blue-100 text-blue-700",
    Failed: "bg-red-100 text-red-700",
    Completed: "bg-green-100 text-green-700",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs ${map[status]}`}>
      {status}
    </span> 
  );
};

// ---------------- MAIN PAGE ----------------
export default function VendorPage() {
  const [vendor, setVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isViewAllNotesOpen, setIsViewAllNotesOpen] = useState(false);
  const [notes, setNotes] = useState(clientNotes); // wrap existing notes
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [projects, setProjects] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showAllPayments, setShowAllPayments] = useState(false);

  useEffect(() => {
    api.getVendor().then(setVendor);
    api.getProjects().then(setProjects);
    api.getPayments().then(setPayments);
  }, []);
  const [attachments, setAttachments] = useState([
    "Aadhaar Card",
    "PAN Card",
    "GST Certificate",
  ]);
  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files).map((f) => f.name);
    setAttachments((prev) => [...prev, ...files]);
  };
  const removeFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };
  const handleSaveClientInfo = () => {
  console.log("Saved Vendor Info:", vendor);

  setIsModalOpen(false);        // close edit form modal
  setShowSuccessModal(true);    // show success popup
  };
  const filteredProjects = projects.filter((p) =>
  p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!vendor) return <div className="p-6">Loading...</div>;

  const visibleProjects = showAllProjects ? projects : projects.slice(0, 5);
  const visiblePayments = showAllPayments ? payments : payments.slice(0, 5);

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* LEFT: VENDOR INFO */}
      <div className="lg:col-span-1 bg-white rounded-2xl shadow p-6">
        <div className="h-28 bg-gradient-to-r from-cyan-300 to-blue-500 rounded-lg relative mb-14">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="profile"
              className="w-24 h-24 rounded-full border-4 border-white absolute -bottom-12 left-6"
            />
          </div>
        <h2 className="text-xl font-semibold">{vendor.name}</h2>
        <p className="text-sm text-gray-500">{vendor.email}</p>
        <p className="text-sm text-gray-500">{vendor.phone}</p>
        <div className="flex gap-3 mt-4 items-center">
            <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm">
              Send Email
            </button>
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm">
            {vendor.category}
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 border rounded-md hover:bg-gray-100"
            >
              <Pencil size={16} />
            </button>
          </div>

        <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold">Notes</h4>

            <button
              onClick={() => setIsViewAllNotesOpen(true)}
              className="text-sm text-teal-600 font-medium"
            >
              View All
            </button>
          </div>

            <p className="text-sm text-gray-500 mt-1">{vendor.notes}</p>
          </div>
          <div className="mt-4">
            <h4 className="font-semibold">Address:</h4>
            <p className="text-sm text-gray-500">{vendor.address}</p>
            <div className="mt-2 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-sm font-medium">
              View Map
            </div>
          </div>

          {/* Attachments */}
          <div className="mt-6">
            <h4 className="font-semibold mb-2">Attachments</h4>
            <label className="border px-4 py-2 rounded-lg text-sm mb-3 inline-block cursor-pointer">
              ⬆ Add Files
              <input type="file" multiple hidden onChange={handleFileAdd} />
            </label>

            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex justify-between items-center bg-gray-50 p-3 rounded-lg mb-2"
              >
                <span className="text-sm">{file}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-red-500"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
      </div>
       

      {/* RIGHT: PROJECTS + PAYMENTS */}
      <div className="lg:col-span-2 space-y-6">
        {/* HEADER ACTIONS */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
          {/* Search */}
          <div className="flex items-center border rounded-lg px-3 py-2 w-full sm:w-72 bg-white">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search projects...."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="outline-none text-sm w-full"
            />
          </div>
          <button
            onClick={() => setAssignOpen(true)}
            className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm"
          >
            <span>📂</span>
            Assign Project
          </button>
          </div>
        </div>
        {/* STATS */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-cyan-100 rounded-2xl shadow p-4">
            <p className="text-sm text-gray-500">Payments Done</p>
            <p className="text-2xl font-semibold">{vendor.paymentsDone}</p>
          </div>
          <div className="bg-pink-100 rounded-2xl shadow p-4">
            <p className="text-sm text-gray-500">Total Projects</p>
            <p className="text-2xl font-semibold">{vendor.totalProjects}</p>
          </div>
        </div>

        {/* PROJECTS TABLE */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold mb-4">Projects</h3>
          <table className="w-full text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left py-2">Project Name</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(showAllProjects ? filteredProjects : filteredProjects.slice(0, 5)).map((p, i) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2">{p.name}</td>
                  <td className="py-2 text-right">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {projects.length > 5 && (
            <button
              onClick={() => setShowAllProjects(!showAllProjects)}
              className="mt-3 text-sm text-blue-600"
            >
              {showAllProjects ? "Show Less" : "See More"}
            </button>
          )}
        </div>

        {/* PAYMENTS TABLE */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold mb-4">Payments</h3>
          <table className="w-full text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left py-2">Amount</th>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {visiblePayments.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-2">₹ {p.amount.toLocaleString()}</td>
                  <td className="py-2">{p.date}</td>
                  <td className="py-2 text-right">
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {payments.length > 5 && (
            <button
              onClick={() => setShowAllPayments(!showAllPayments)}
              className="mt-3 text-sm text-blue-600"
            >
              {showAllPayments ? "Show Less" : "See More"}
            </button>
          )}
        </div>
      </div>
      {/* 🔹 Edit Modal */}
      {isModalOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">

      {/* ================= Header ================= */}
      <div className="flex items-center justify-between bg-teal-700 px-5 py-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <span className="text-lg">🏢</span>
          <span>Vendor Details</span>
        </div>
        <button
          onClick={() => setIsModalOpen(false)}
          className="text-white text-xl"
        >
          ×
        </button>
      </div>

      {/* ================= Form ================= */}
      <div className="p-5 space-y-4 text-sm">

        {/* Client Name */}
        <div>
          <label className="block mb-1 text-gray-600">Vendor Name</label>
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400">👤</span>
            <input
              value={vendor.name}
              onChange={(e) =>
                setVendor({ ...vendor, name: e.target.value })
              }
              placeholder="Vendor Name"
              className="w-full outline-none"
            />
          </div>
        </div>
        {/* Category */}
        <div>
          <label className="block mb-1 text-gray-600">Vendor Category</label>
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400">🧩</span>
            <input
              value={vendor.category}
              onChange={(e) =>
                setVendor({ ...vendor, category: e.target.value })
              }
              placeholder="Vendor Category"
              className="w-full outline-none"
            />
          </div>
        </div>

        {/* Phone Number */}
        <div>
          <label className="block mb-1 text-gray-600">Phone Number</label>
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400">📞</span>
            <input
              value={vendor.phone}
              onChange={(e) =>
                setVendor({ ...vendor, phone: e.target.value })
              }
              placeholder="Phone Number"
              className="w-full outline-none"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block mb-1 text-gray-600">Address</label>
          <div className="flex items-start border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400 mt-1">🏠</span>
            <textarea
              rows={2}
              value={vendor.address}
              onChange={(e) =>
                setVendor({ ...vendor, address: e.target.value })
              }
              placeholder="Address"
              className="w-full outline-none resize-none"
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label className="block mb-1 text-gray-600">Email Address</label>
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400">✉️</span>
            <input
              value={vendor.email}
              onChange={(e) =>
                setVendor({ ...vendor, email: e.target.value })
              }
              placeholder="Email Address"
              className="w-full outline-none"
            />
          </div>
        </div>

        {/* ================= Buttons ================= */}
        <div className="space-y-3 pt-3">
          <button
            onClick={handleSaveClientInfo}
            className="w-full py-3 rounded-lg font-medium bg-teal-700 text-white"
          >
            Save Info
          </button>


          <button
            onClick={() => setIsModalOpen(false)}
            className="w-full py-3 rounded-lg font-medium border border-teal-700 text-teal-700"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  </div>
  )}
  {showSuccessModal && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-[90%] max-w-md rounded-2xl shadow-2xl p-8 text-center animate-scale-in">
      
      {/* Check Icon */}
      <div className="w-20 h-20 mx-auto mb-5 rounded-full border-4 border-teal-600 flex items-center justify-center">
        <span className="text-teal-600 text-4xl">✓</span>
      </div>

      {/* Text */}
      <h2 className="text-teal-700 text-2xl font-semibold">Successfully</h2>
      <p className="text-lg font-medium mt-1">Updates Vendor Details</p>

      {/* OK Button */}
      <button
        onClick={() => setShowSuccessModal(false)}
        className="mt-8 w-full bg-teal-700 hover:bg-teal-800 text-white py-3 rounded-xl text-lg font-medium transition"
      >
        OK
      </button>
    </div>
  </div>
  )}
   {isViewAllNotesOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md rounded-xl shadow-lg">

      {/* Header */}
      <div className="flex items-center justify-between bg-teal-600 text-white px-4 py-3 rounded-t-xl">
        <h3 className="font-semibold">Vendor Notes</h3>
        <button onClick={() => setIsViewAllNotesOpen(false)}>✕</button>
      </div>

      {/* Notes List */}
      <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {notes.map((note, index) => (
        <div
          key={index}
          className="flex items-start justify-between border rounded-lg p-3"
        >
          <div className="flex gap-2">
            <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></span>
            <p className="text-sm text-gray-600">{note}</p>
          </div>
          <button className="text-teal-500">×</button>
        </div>
      ))}

      </div>

    {/* Footer */}
          <div className="space-y-3 p-4">
            <button
              onClick={() => setIsAddNoteOpen(true)}
              className="w-full bg-teal-700 text-white py-2 rounded-lg"
            >
              Add New Notes
            </button>
            <button
              onClick={() => setIsViewAllNotesOpen(false)}
              className="w-full bg-teal-600 text-white py-2 rounded-lg"
            >
              Save and Exit
            </button>
          </div>
        </div>
      </div>
    )}
    {isAddNoteOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between bg-teal-700 px-5 py-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <span className="text-lg">📝</span>
          <span>Add Notes</span>
        </div>
        <button
          onClick={() => setIsAddNoteOpen(false)}
          className="text-white text-xl"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 text-sm">
        <div className="flex items-start gap-2 border rounded-lg p-3">
          <span className="w-2 h-2 bg-yellow-400 rounded-full mt-2"></span>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Type here..."
            rows={3}
            className="w-full outline-none resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => {
              if (!newNote.trim()) return;
              setNotes((prev) => [...prev, newNote]);
              setNewNote("");
              setIsAddNoteOpen(false);
            }}
            className="w-full bg-teal-700 text-white py-2 rounded-lg"
          >
            Save Added
          </button>

          <button
            onClick={() => setIsAddNoteOpen(false)}
            className="w-full border border-teal-700 text-teal-700 py-2 rounded-lg"
          >
            Save and Exit
          </button>
        </div>
      </div>
    </div>
  </div>
  )}
    {/* ASSIGN PROJECT MODAL */}
      {assignOpen && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow">
      <div className="flex justify-between items-center px-5 py-4 bg-teal-600 text-white rounded-t-2xl">
      <h4 className="font-semibold"><span>📂</span>Assign Project</h4>
      <button onClick={() => setAssignOpen(false)}>✕</button>
      </div>


      <div className="p-4">
      {filteredProjects.slice(0, 5).map((p) => (
      <div
      key={p.id}
      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50"
      >
      <div>
      <p className="font-medium">{p.name}</p>
      <p className="text-xs text-gray-500">Riverside Corporate Tower</p>
      </div>
      <button className="px-3 py-1 border rounded-lg text-sm">
      View Project
      </button>
      </div>
      ))}


      <button className="text-sm text-blue-600 mt-2">See 5 More</button>
      </div>


      <div className="p-4">
      <button className="w-full bg-teal-600 text-white py-2 rounded-lg">
      Done
      </button>
      <button
      onClick={() => setAssignOpen(false)}
      className="w-full mt-2 border border-teal-600 text-teal-600 py-2 rounded-lg"
      >
      Cancel
      </button>
      </div>
      </div>
      </div>
      )}
  </div>   
  );
}