import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000/api",

  withCredentials: true,
});

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// =====================================================
// REFRESH CONTROL
// =====================================================

let isRefreshing = false;

let refreshSubscribers = [];

// =====================================================
// SUBSCRIBE REQUEST
// =====================================================

const subscribeTokenRefresh = (callback) => {
  refreshSubscribers.push(callback);
};

// =====================================================
// RESOLVE QUEUED REQUESTS
// =====================================================

const onRefreshed = (newToken) => {
  refreshSubscribers.forEach((callback) => callback(newToken));

  refreshSubscribers = [];
};

// =====================================================
// REJECT QUEUED REQUESTS
// =====================================================

const onRefreshFailed = (error) => {
  refreshSubscribers.forEach((callback) => callback(null, error));

  refreshSubscribers = [];
};

// =====================================================
// LOGOUT
// =====================================================

const forceLogout = () => {
  localStorage.removeItem("accessToken");

  localStorage.removeItem("refreshToken");

  localStorage.removeItem("user");

  localStorage.removeItem("currentUser");

  window.location.href = "/login";
};

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    const status = error?.response?.status;
    if (status === 503 && error?.response?.data?.code === "MAINTENANCE") {
      localStorage.removeItem("accessToken"); localStorage.removeItem("refreshToken"); window.location.href = "/maintenance";
      return Promise.reject(error);
    }

    // Không phải 401
    if (status !== 401) {
      return Promise.reject(error);
    }

    // Request refresh chính nó bị 401
    if (originalRequest?.url?.includes("/auth/refresh")) {
      forceLogout();

      return Promise.reject(error);
    }

    // Tránh loop vô hạn
    if (originalRequest?._retry) {
      forceLogout();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = localStorage.getItem("refreshToken");

    // Không còn refresh token
    if (!refreshToken) {
      forceLogout();

      return Promise.reject(error);
    }

    // =================================================
    // ĐANG CÓ REQUEST KHÁC REFRESH
    // =================================================

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken, refreshError) => {
          if (refreshError || !newToken) {
            reject(refreshError || error);

            return;
          }

          originalRequest.headers = originalRequest.headers || {};

          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          resolve(api(originalRequest));
        });
      });
    }

    // =================================================
    // BẮT ĐẦU REFRESH
    // =================================================

    isRefreshing = true;

    try {
      const response = await axios.post(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:4000/api"
        }/auth/refresh`,
        {
          refreshToken,
        },
        {
          withCredentials: true,
        },
      );

      const newAccessToken = response.data?.data?.accessToken;

      const newRefreshToken = response.data?.data?.refreshToken;

      if (!newAccessToken) {
        throw new Error("Refresh response không có accessToken");
      }

      localStorage.setItem("accessToken", newAccessToken);

      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken);
      }

      // =================================================
      // SAVE NEW ACCESS TOKEN
      // =================================================

      localStorage.setItem("accessToken", newAccessToken);

      // Nếu backend rotate refresh token
      if (newRefreshToken) {
        localStorage.setItem("refreshToken", newRefreshToken);
      }

      // =================================================
      // RETRY CÁC REQUEST ĐANG CHỜ
      // =================================================

      onRefreshed(newAccessToken);

      // =================================================
      // RETRY REQUEST BAN ĐẦU
      // =================================================

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      onRefreshFailed(refreshError);

      forceLogout();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
