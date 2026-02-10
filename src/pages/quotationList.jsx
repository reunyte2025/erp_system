import { useState } from "react";
import { User, X } from "lucide-react";
import StatsCard from "../components/QuotationSummary";
import StatusBadge from "../components/StatusBadge";
import { dummyQuotations } from "../services/quotationService";

export default function Quotations() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  const filtered = dummyQuotations.filter((q) => {
  const matchesSearch = q.customerName
    .toLowerCase()
    .includes(search.toLowerCase());

  const matchesStatus =
    !statusFilter || statusFilter === "All" || q.status === statusFilter;

  return matchesSearch && matchesStatus;
  });

  const stats = {
    total: dummyQuotations.length,
    draft: dummyQuotations.filter((q) => q.status === "Draft").length,
    review: dummyQuotations.filter((q) => q.status === "Pending").length,
    completed: dummyQuotations.filter((q) => q.status === "Completed").length,
  };

  return (
    <div className="space-y-6">
      {/* ---------------- STATS ---------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Quotations" value={stats.total} type="total" bg="bg-teal-50" />
        <StatsCard title="Draft Quotations" value={stats.draft} type="draft" bg="bg-red-50" />
        <StatsCard title="Under Review" value={stats.review} type="review" bg="bg-yellow-50" />
        <StatsCard title="Completed" value={stats.completed} type="completed" bg="bg-green-50" />
      </div>

      {/* ---------------- TABLE ---------------- */}
      <div className="bg-white rounded-xl border shadow-sm">
        <div className="p-5 flex justify-between items-center border-b">
          <div>
            <h2 className="font-semibold">Quotation List</h2>
            <p className="text-sm text-gray-500">Total {stats.total}</p>
          </div>

          <div className="flex gap-3">
            {/* SEARCH */}
            <input
              className="border rounded-lg px-4 py-2"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* STATUS FILTER */}
            <select
              className="border rounded-lg px-3 py-2 text-sm text-gray-600"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="" disabled>
                Filter
              </option>
              <option value="All">All Status</option>
              <option value="Draft">Draft</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>

            <button
              onClick={() => setShowAdd(true)}
              className="bg-teal-700 text-white px-5 py-2 rounded-lg"
            >
              Add Quotation
            </button>
          </div>
        </div>

        <p className="px-5 py-3 text-sm text-gray-500 border-b">
          <span className="text-red-500 font-medium">Note:</span> Click on
          Quotation to get more details
        </p>

        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="p-3 text-left">Quotation ID</th>
              <th className="p-3 text-left">Customer Name</th>
              <th className="p-3 text-left">User Name</th>
              <th className="p-3 text-left">Notes</th>
              <th className="p-3 text-left">Total Outstanding</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((q) => (
              <tr
                key={q.id}
                onClick={() => setSelected(q)}
                className="border-b hover:bg-gray-50 cursor-pointer"
              >
                <td className="p-3 font-medium">{q.id}</td>
                <td className="p-3">{q.customerName}</td>
                <td className="p-3">{q.userName}</td>
                <td className="p-3">{q.notes}</td>
                <td className="p-3">
                  ₹ {q.amount.toLocaleString()}
                </td>
                <td className="p-3">{q.date}</td>
                <td className="p-3">
                  <StatusBadge status={q.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="p-5 flex justify-between text-sm">
          <span>Page 1 of 10</span>
          <div className="flex gap-3">
            <button className="border px-4 py-2 rounded-lg">
              Previous
            </button>
            <button className="border px-4 py-2 rounded-lg text-teal-700">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ---------------- ADD QUOTATION MODAL ---------------- */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl overflow-hidden">
            <div className="bg-teal-700 text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 font-medium">
                <User size={18} />
                Add Quotation
              </div>
              <button onClick={() => setShowAdd(false)}>
                <X />
              </button>
            </div>

            <div className="p-5">
              <p className="text-sm font-medium mb-1">Select Client</p>
              <p className="text-xs text-gray-500 mb-3">
                Please select client u wants to add quotation for
              </p>

              <div className="border rounded-lg px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-3 text-gray-700">
                  <User size={18} />
                  Acme Corporation
                </div>
                <span className="text-gray-400">⌄</span>
              </div>

              <button className="w-full bg-teal-700 text-white py-3 rounded-lg mt-4 font-medium">
                Next
              </button>

              <div className="flex items-center gap-3 my-4 text-gray-400 text-sm">
                <div className="flex-1 border-t" />
                OR
                <div className="flex-1 border-t" />
              </div>

              <button className="w-full border border-teal-700 text-teal-700 py-3 rounded-lg font-medium">
                Create New Client
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- DETAILS MODAL ---------------- */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Quotation Details
              </h2>
              <button onClick={() => setSelected(null)}>
                <X />
              </button>
            </div>

            {Object.entries(selected).map(([k, v]) => (
              <p key={k} className="text-sm mb-2">
                <strong>{k}:</strong> {String(v)}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

