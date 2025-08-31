import { getAuthToken } from "./auth";

const API_BASE_URL = process.env.REACT_APP_API_URL || "";

// API utility functions
export const fetchWithAuth = async (endpoint, options = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle HTTP errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `HTTP error! status: ${response.status}`,
    }));
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`
    );
  }

  return response.json();
};

// Report API functions
export const fetchReports = async (params = {}) => {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 10,
    ...(params.status && { status: params.status }),
    ...(params.search && { search: params.search }),
    ...(params.incidentType && { incidentType: params.incidentType }),
    ...(params.severity && { severity: params.severity }),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
  }).toString();

  return fetchWithAuth(`/api/reports?${queryParams}`);
};

export const fetchReportById = (id) => {
  return fetchWithAuth(`/api/reports/${id}`);
};

export const validateReport = (id, data) => {
  return fetchWithAuth(`/api/reports/${id}/validate`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const takeAction = (id, data) => {
  return fetchWithAuth(`/api/reports/${id}/action`, {
    method: "POST",
    body: JSON.stringify(data),
  });
};

export const voteOnReport = (id, vote) => {
  return fetchWithAuth(`/api/reports/${id}/vote`, {
    method: "POST",
    body: JSON.stringify({ vote }),
  });
};

export const addComment = (id, content, isPublic = true) => {
  return fetchWithAuth(`/api/reports/${id}/comment`, {
    method: "POST",
    body: JSON.stringify({ content, isPublic }),
  });
};

export const getReportStats = () => {
  return fetchWithAuth("/api/reports/analytics/stats");
};

export const getReportsByUser = (userId, page = 1, limit = 10) => {
  return fetchWithAuth(
    `/api/reports/user/${userId}?page=${page}&limit=${limit}`
  );
};

// AI Analysis API functions
export const processReportWithAI = (id) => {
  return fetchWithAuth(`/api/reports/${id}/process-ai`, {
    method: "POST",
  });
};

export const getMapData = () => {
  return fetchWithAuth("/api/reports/map-data");
};

// Upload utility for report images
export const uploadReportImages = async (formData) => {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/api/uploads/report-images`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData, // FormData containing the image files
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Upload error! status: ${response.status}`,
    }));
    throw new Error(
      errorData.message || `Upload error! status: ${response.status}`
    );
  }

  return response.json();
};
