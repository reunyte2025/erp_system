import { useEffect, useState } from "react";
import { Pencil, Plus, FileText, Search } from "lucide-react";

/* 🔹 Dummy API Call (Replace with real backend later) */
const fetchClientDetails = () =>
  new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: "Jennie Fernandies",
        email: "Jennie@gmail.com",
        phone: "+91 123456789",
        notes:
          "We discussed some points at first meeting and the client had focused on XYZ things so we need to do those ASAP.",
        address: "19, A, Mumbai (E), 201, abc society",
        quotations: 200,
        projectsCount: 10,
        projects: [
          { name: "ACME Corporation", date: "Newly added", status: "In Progress" },
          { name: "ACME Corporation", date: "Last Month", status: "Pending" },
          { name: "ACME Corporation", date: "Newly added", status: "Draft" },
          { name: "ACME Corporation", date: "Newly added", status: "Failed" },
          { name: "ACME Corporation", date: "Newly added", status: "Completed" },
        ],
        invoices: [
          { id: "QT-2026-02034", time: "Tue 27 Nov 2025 11:35 AM", status: "In Progress" },
          { id: "QT-2026-02035", time: "Tue 27 Nov 2025 11:35 AM", status: "Pending" },
          { id: "QT-2026-02036", time: "Tue 27 Nov 2025 11:35 AM", status: "Draft" },
          { id: "QT-2026-02037", time: "Tue 27 Nov 2025 11:35 AM", status: "Failed" },
          { id: "QT-2026-02038", time: "Tue 27 Nov 2025 11:35 AM", status: "Completed" },
        ],
      });
    }, 700);
  });

/* 🔹 Status Badge Colors */
const statusColors = {
  "In Progress": "bg-yellow-100 text-yellow-700",
  Pending: "bg-orange-100 text-orange-700",
  Draft: "bg-blue-100 text-blue-700",
  Failed: "bg-red-100 text-red-700",
  Completed: "bg-green-100 text-green-700",
};

export default function ClientDetails() {
  const [client, setClient] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

const [newProject, setNewProject] = useState({
  name: "",
  date: "",
  status: "Pending",
});
  
  const [attachments, setAttachments] = useState([
    "Aadhaar Card",
    "PAN Card",
    "GST Certificate",
  ]);

  useEffect(() => {
    fetchClientDetails().then(setClient);
  }, []);

  const handleFileAdd = (e) => {
    const files = Array.from(e.target.files).map((f) => f.name);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };
  const addProject = () => {
  if (!newProject.name.trim()) return;

  setClient((prev) => ({
    ...prev,
    projects: [...prev.projects, newProject],
    projectsCount: prev.projectsCount + 1,
  }));

  // Reset form after adding
  setNewProject({ name: "", date: "", status: "Pending" });
  setIsProjectModalOpen(false);
};

  if (!client) return <div className="p-10">Loading client data...</div>;
  const errors = {
  name: !newProject.name || newProject.name.length < 3
    ? "Project name must be at least 3 characters"
    : "",

  date: !newProject.date
    ? "Plot / CTS / Survey number is required"
    : "",

  location: !newProject.location
    ? "Location is required"
    : "",

  gst: !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    newProject.gst || ""
  )
    ? "Enter a valid 15-character GST number"
    : "",

  sac: !/^\d{6}$/.test(newProject.sac || "")
    ? "SAC number must be 6 digits"
    : "",
};

const isFormValid = Object.values(errors).every((e) => e === "");


  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ================= LEFT PROFILE CARD ================= */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="h-28 bg-gradient-to-r from-cyan-300 to-blue-500 rounded-lg relative mb-14">
            <img
              src="https://randomuser.me/api/portraits/women/44.jpg"
              alt="profile"
              className="w-24 h-24 rounded-full border-4 border-white absolute -bottom-12 left-6"
            />
          </div>

          <h3 className="text-xl font-semibold">{client.name}</h3>
          <p className="text-sm mt-2">Email: {client.email}</p>
          <p className="text-sm">Phone: {client.phone}</p>

          <div className="flex gap-3 mt-4 items-center">
            <button className="bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm">
              Send Email
            </button>
            <button className="border px-4 py-2 rounded-lg text-sm">Analytics</button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="p-2 border rounded-md hover:bg-gray-100"
            >
              <Pencil size={16} />
            </button>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold">Notes:</h4>
            <p className="text-sm text-gray-500 mt-1">{client.notes}</p>
          </div>

          <div className="mt-4">
            <h4 className="font-semibold">Address:</h4>
            <p className="text-sm text-gray-500">{client.address}</p>
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

        {/* ================= RIGHT SIDE ================= */}
        <div className="lg:col-span-2 space-y-6">
          {/* 🔹 Top Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          {/* Search */}
          <div className="flex items-center border rounded-lg px-3 py-2 w-full sm:w-72 bg-white">
            <Search size={16} className="text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Search projects, invoices..."
              className="outline-none text-sm w-full"
            />
          </div>

          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus size={16} /> Add Project
          </button>

          <button className="flex items-center justify-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm">
            <FileText size={16} /> Generate Quotation
          </button>
        </div>
      </div>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-cyan-100 p-4 rounded-xl">
              <h3 className="text-xl font-bold">{client.quotations}</h3>
              <p className="text-sm text-gray-600">Total Quotations</p>
            </div>

            <div className="bg-pink-100 p-4 rounded-xl">
              <h3 className="text-xl font-bold">{client.projectsCount}</h3>
              <p className="text-sm text-gray-600">Total Projects</p>
            </div>
          </div>
          {/* Projects */}
          <div className="bg-white rounded-xl shadow p-6">
  <h4 className="font-semibold mb-4">Projects</h4>

  <div className="space-y-4">
    {(showAllProjects ? [...client.projects] : client.projects.slice(0, 5)).map((p, i) => (
      <div
        key={i}
        className="flex justify-between items-center border-b pb-3 last:border-none"
      >
        <div>
          <p className="font-medium">{p.name}</p>
          <p className="text-xs text-gray-400">{p.date}</p>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            statusColors[p.status] || "bg-gray-100 text-gray-600"
          }`}
        >
          {p.status}
        </span>
      </div>
    ))}
  </div>

  {client.projects.length > 5 && (
    <button
      onClick={() => setShowAllProjects((prev) => !prev)}
      className="text-blue-600 text-sm mt-4"
    >
      {showAllProjects ? "Show Less" : "See More"}
    </button>
  )}
</div>


          {/* Invoices */}
          <div className="bg-white rounded-xl shadow p-6">
            <h4 className="font-semibold mb-4">Invoices</h4>
            <div className="space-y-4">
              {client.invoices.map((inv, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center border-b pb-3 last:border-none"
                >
                  <div>
                    <p className="font-medium">{inv.id}</p>
                    <p className="text-xs text-gray-400">{inv.time}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[inv.status]}`}
                  >
                    {inv.status}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-blue-600 text-sm mt-4 cursor-pointer">See More</p>
          </div>
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
          <span>Client Details</span>
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
          <label className="block mb-1 text-gray-600">Client Name</label>
          <div className="flex items-center border rounded-lg px-3 py-2 gap-2">
            <span className="text-gray-400">👤</span>
            <input
              value={client.name}
              onChange={(e) =>
                setClient({ ...client, name: e.target.value })
              }
              placeholder="Client Name"
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
              value={client.phone}
              onChange={(e) =>
                setClient({ ...client, phone: e.target.value })
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
              value={client.address}
              onChange={(e) =>
                setClient({ ...client, address: e.target.value })
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
              value={client.email}
              onChange={(e) =>
                setClient({ ...client, email: e.target.value })
              }
              placeholder="Email Address"
              className="w-full outline-none"
            />
          </div>
        </div>

        {/* ================= Buttons ================= */}
        <div className="space-y-3 pt-3">
          <button
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

      {/* 🔹 ADD PROJECT MODAL */}
      {isProjectModalOpen && (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">

      {/* ================= Header ================= */}
      <div className="flex items-center justify-between bg-teal-700 px-5 py-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <span className="text-lg">📄</span>
          <span>Project Details</span>
        </div>
        <button
          onClick={() => setIsProjectModalOpen(false)}
          className="text-white text-xl"
        >
          ×
        </button>
      </div>

      {/* ================= Validation ================= */}
      {(() => {
        const errors = {
          name:
            !newProject.name
              ? "Project name is required"
              : newProject.name.length < 3
              ? "Project name must be at least 3 characters"
              : "",

          date: !newProject.date
            ? "Plot / CTS / Survey number is required"
            : "",

          location: !newProject.location
            ? "Location is required"
            : "",

          gst: !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
            newProject.gst || ""
          )
            ? "Enter a valid 15-character GST number"
            : "",

          sac: !/^\d{6}$/.test(newProject.sac || "")
            ? "SAC number must be exactly 6 digits"
            : "",
        };

        const isFormValid = Object.values(errors).every((e) => e === "");

        return (
          <div className="p-5 space-y-4 text-sm">

            {/* ================= Project Name ================= */}
            <div>
              <label className="block mb-1 text-gray-600">
                Project / Property Name
              </label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 gap-2
                  ${errors.name ? "border-red-500" : "border-gray-300"}`}
              >
                <span className="text-gray-400">🏢</span>
                <input
                  type="text"
                  placeholder="Project Name"
                  value={newProject.name}
                  onChange={(e) =>
                    setNewProject({ ...newProject, name: e.target.value })
                  }
                  className="w-full outline-none"
                />
              </div>
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            {/* ================= Plot / CTS ================= */}
            <div>
              <label className="block mb-1 text-gray-600">
                Plot / CTS / Survey Number
              </label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 gap-2
                  ${errors.date ? "border-red-500" : "border-gray-300"}`}
              >
                <span className="text-gray-400">#</span>
                <input
                  type="text"
                  placeholder="Survey Number"
                  value={newProject.date}
                  onChange={(e) =>
                    setNewProject({ ...newProject, date: e.target.value })
                  }
                  className="w-full outline-none"
                />
              </div>
              {errors.date && (
                <p className="text-red-500 text-xs mt-1">{errors.date}</p>
              )}
            </div>

            {/* ================= Location ================= */}
            <div>
              <label className="block mb-1 text-gray-600">
                Location
              </label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 gap-2
                  ${errors.location ? "border-red-500" : "border-gray-300"}`}
              >
                <span className="text-gray-400">📍</span>
                <input
                  type="text"
                  placeholder="Location"
                  value={newProject.location}
                  onChange={(e) =>
                    setNewProject({ ...newProject, location: e.target.value })
                  }
                  className="w-full outline-none"
                />
              </div>
              {errors.location && (
                <p className="text-red-500 text-xs mt-1">{errors.location}</p>
              )}
            </div>

            {/* ================= GST ================= */}
            <div>
              <label className="block mb-1 text-gray-600">
                GST Number
              </label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 gap-2
                  ${errors.gst ? "border-red-500" : "border-gray-300"}`}
              >
                <span className="text-gray-400">🧾</span>
                <input
                  type="text"
                  placeholder="GST Number"
                  value={newProject.gst}
                  onChange={(e) =>
                    setNewProject({
                      ...newProject,
                      gst: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full outline-none"
                />
              </div>
              {errors.gst && (
                <p className="text-red-500 text-xs mt-1">{errors.gst}</p>
              )}
            </div>

            {/* ================= SAC ================= */}
            <div>
              <label className="block mb-1 text-gray-600">
                SAC Number
              </label>
              <div
                className={`flex items-center border rounded-lg px-3 py-2 gap-2
                  ${errors.sac ? "border-red-500" : "border-gray-300"}`}
              >
                <span className="text-gray-400">🧮</span>
                <input
                  type="text"
                  placeholder="SAC Number"
                  value={newProject.sac}
                  onChange={(e) =>
                    setNewProject({ ...newProject, sac: e.target.value })
                  }
                  className="w-full outline-none"
                />
              </div>
              {errors.sac && (
                <p className="text-red-500 text-xs mt-1">{errors.sac}</p>
              )}
            </div>

            {/* ================= Buttons ================= */}
            <div className="space-y-3 pt-3">
              <button
                onClick={addProject}
                disabled={!isFormValid}
                className={`w-full py-3 rounded-lg font-medium flex justify-center gap-2
                  ${
                    isFormValid
                      ? "bg-teal-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
              >
                🏢 Add Project
              </button>

              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="w-full py-3 rounded-lg font-medium border border-teal-700 text-teal-700 flex justify-center gap-2"
              >
                🏢 Save Draft
              </button>
            </div>

          </div>
        );
      })()}
    </div>
  </div>
)}
    </div>
  );
}
