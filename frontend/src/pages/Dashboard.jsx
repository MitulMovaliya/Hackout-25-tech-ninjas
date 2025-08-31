import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../Components/Navbar";
import { isAuthenticated, getAuthToken } from "../utils/auth";
import ProtectedRoute from "../Components/ProtectedRoute";

const Dashboard = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();
  const serverurl = import.meta.env.VITE_SERVER_URL;

  // Fetch reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const queryParams = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...(filterStatus && { status: filterStatus }),
      }).toString();

      const response = await fetch(`${serverurl}/reports?${queryParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch reports");
      }

      const result = await response.json();

      if (result.success) {
        setReports(result.data.reports);
        setTotalPages(result.data.pagination.pages);
      } else {
        throw new Error(result.message || "Error fetching reports");
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch report details
  const fetchReportDetails = async (id) => {
    try {
      setLoading(true);
      const token = getAuthToken();
      const response = await fetch(`/api/reports/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch report details");
      }

      const result = await response.json();

      if (result.success) {
        setSelectedReport(result.data.report);
      } else {
        throw new Error(result.message || "Error fetching report details");
      }
    } catch (err) {
      console.error("Error fetching report details:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle report validation
  const handleValidation = async (action, reviewNotes) => {
    try {
      if (!selectedReport) return;

      const token = getAuthToken();
      const response = await fetch(
        `/api/reports/${selectedReport._id}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            reviewNotes,
            evidenceQuality: "good",
            validationScore: action === "approve" ? 8 : 3,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to validate report");
      }

      const result = await response.json();

      if (result.success) {
        setSelectedReport(null);
        fetchReports();
      } else {
        throw new Error(result.message || "Error validating report");
      }
    } catch (err) {
      console.error("Error validating report:", err);
      setError(err.message);
    }
  };

  // Load reports on component mount and when filters/page change
  useEffect(() => {
    if (isAuthenticated()) {
      fetchReports();
    }
  }, [currentPage, filterStatus]);

  // Status badge component
  const StatusBadge = ({ status }) => {
    const colorMap = {
      pending: "bg-yellow-100 text-yellow-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
      action_taken: "bg-blue-100 text-blue-700",
      ai_processing: "bg-purple-100 text-purple-700",
    };

    const displayMap = {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      action_taken: "Action Taken",
      ai_processing: "AI Processing",
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          colorMap[status] || "bg-gray-100 text-gray-700"
        }`}
      >
        {displayMap[status] || status}
      </span>
    );
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
        <Navbar />

        <div className="container mx-auto px-4 pt-24 pb-10">
          <h1 className="text-2xl font-bold text-green-800 mb-6">
            Report Management Dashboard
          </h1>

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="action_taken">Action Taken</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading && !selectedReport ? (
            <div className="flex justify-center py-10">
              <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {selectedReport ? (
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {selectedReport.title}
                      </h2>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={selectedReport.status} />
                        <span className="text-sm text-gray-500">
                          Reported by:{" "}
                          {selectedReport.reporter?.fullName || "Anonymous"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(
                            selectedReport.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedReport(null)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="mb-4">
                        <h3 className="text-md font-semibold mb-2">
                          Description
                        </h3>
                        <p className="text-gray-700 whitespace-pre-line">
                          {selectedReport.description}
                        </p>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-md font-semibold mb-2">Details</h3>
                        <ul className="space-y-2">
                          <li>
                            <span className="font-medium">Incident Type:</span>{" "}
                            {selectedReport.incidentType}
                          </li>
                          <li>
                            <span className="font-medium">Severity:</span>{" "}
                            {selectedReport.severity}
                          </li>
                          <li>
                            <span className="font-medium">Urgent:</span>{" "}
                            {selectedReport.isUrgent ? "Yes" : "No"}
                          </li>
                          {selectedReport.location?.address && (
                            <li>
                              <span className="font-medium">Location:</span>{" "}
                              {selectedReport.location.address}
                            </li>
                          )}
                        </ul>
                      </div>

                      {selectedReport.tags?.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-md font-semibold mb-2">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedReport.tags.map((tag, i) => (
                              <span
                                key={i}
                                className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div>
                      {selectedReport.media?.images?.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-md font-semibold mb-2">
                            Evidence Images
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedReport.media.images.map((image, index) => (
                              <div
                                key={index}
                                className="aspect-square bg-gray-100 rounded-lg overflow-hidden"
                              >
                                <img
                                  src={`/uploads/reports/${image.filename}`}
                                  alt={`Report evidence ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedReport.status === "pending" && (
                        <div className="mt-4">
                          <h3 className="text-md font-semibold mb-2">
                            Validate Report
                          </h3>
                          <div className="flex flex-col gap-4">
                            <textarea
                              id="reviewNotes"
                              placeholder="Add your review notes here..."
                              className="w-full px-3 py-2 text-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                              rows="3"
                            ></textarea>
                            <div className="flex gap-3">
                              <button
                                onClick={() =>
                                  handleValidation(
                                    "approve",
                                    document.getElementById("reviewNotes").value
                                  )
                                }
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex-1"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() =>
                                  handleValidation(
                                    "reject",
                                    document.getElementById("reviewNotes").value
                                  )
                                }
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex-1"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Report
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Submitted By
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reports.length > 0 ? (
                          reports.map((report) => (
                            <tr
                              key={report._id}
                              className="hover:bg-green-50 transition-colors cursor-pointer"
                              onClick={() => fetchReportDetails(report._id)}
                            >
                              <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {report.title}
                                </div>
                                <div className="text-xs text-gray-500 truncate max-w-xs">
                                  {report.description.substring(0, 50)}
                                  {report.description.length > 50 ? "..." : ""}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {report.reporter?.fullName || "Anonymous"}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {new Date(
                                  report.createdAt
                                ).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <StatusBadge status={report.status} />
                              </td>
                              <td className="px-6 py-4 text-sm">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchReportDetails(report._id);
                                  }}
                                  className="text-green-600 hover:text-green-800 mr-3"
                                >
                                  <i className="fa-solid fa-eye"></i> View
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="5"
                              className="px-6 py-10 text-center text-gray-500"
                            >
                              No reports found matching your criteria
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
                      <nav className="flex items-center space-x-2">
                        <button
                          onClick={() =>
                            setCurrentPage(Math.max(1, currentPage - 1))
                          }
                          disabled={currentPage === 1}
                          className={`px-3 py-1 rounded-md ${
                            currentPage === 1
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-white text-green-700 hover:bg-green-50"
                          }`}
                        >
                          <i className="fa-solid fa-chevron-left"></i>
                        </button>

                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 rounded-md ${
                                currentPage === pageNum
                                  ? "bg-green-600 text-white"
                                  : "bg-white text-green-700 hover:bg-green-50"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}

                        <button
                          onClick={() =>
                            setCurrentPage(
                              Math.min(totalPages, currentPage + 1)
                            )
                          }
                          disabled={currentPage === totalPages}
                          className={`px-3 py-1 rounded-md ${
                            currentPage === totalPages
                              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                              : "bg-white text-green-700 hover:bg-green-50"
                          }`}
                        >
                          <i className="fa-solid fa-chevron-right"></i>
                        </button>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default Dashboard;
