import api from "./api";

export const login = async (username, password) => {
  const response = await api.post("/auth/login", {
    username,
    password,
  });

  const data = response.data.data;

  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify(data.user));

  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/auth/me");

  return response.data;
};

export const refreshToken = async () => {
  const storedRefreshToken = localStorage.getItem("refreshToken");

  const response = await api.post("/auth/refresh", {
    refreshToken: storedRefreshToken,
  });

  const newAccessToken = response.data.data.accessToken;

  localStorage.setItem("accessToken", newAccessToken);

  return response.data;
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");

  try {
    const response = await api.post("/auth/logout", {
      refreshToken,
    });

    return response.data;
  } finally {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  }
};

export const getLoginUsers = async () => {
  const response = await api.get("/auth/login-users");
  return response.data;
};
