// Authentication utility functions

export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  return !!(token && user);
};

export const getAuthToken = () => {
  return localStorage.getItem("token");
};

export const getUser = () => {
  const user = localStorage.getItem("user");
  try {
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error("Error parsing user data:", error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export const requireAuth = (navigate) => {
  if (!isAuthenticated()) {
    navigate("/login");
    return false;
  }
  return true;
};

// Check if token is expired
export const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

export const refreshAuthState = () => {
  const token = getAuthToken();
  if (token && isTokenExpired(token)) {
    logout();
    return false;
  }
  return isAuthenticated();
};
