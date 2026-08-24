import axios from "axios"
import {
    ACCESS_TOKEN_STORAGE_KEY,
    AUTH_LOGOUT_EVENT,
    AUTH_TOKEN_REFRESHED_EVENT,
    REFRESH_TOKEN_STORAGE_KEY,
} from "../store/authStore";

declare module "axios" {
    interface AxiosRequestConfig {
        _retry?: boolean;
        skipAuthRefresh?: boolean;
    }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json"
    }
})

let refreshPromise: Promise<string | null> | null = null;

const clearAuthentication = () => {
    localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));

    if (window.location.pathname !== "/login") {
        window.location.href = "/login";
    }
};

const refreshAccessToken = (): Promise<string | null> => {
    if (refreshPromise) return refreshPromise;

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) return Promise.resolve(null);

    refreshPromise = axios.post(
        `${String(API_BASE_URL).replace(/\/$/, "")}/auth/refresh`,
        { refresh_token: refreshToken },
        { headers: { "Content-Type": "application/json" } },
    )
        .then((response) => {
            const accessToken = response.data?.access_token;
            const rotatedRefreshToken = response.data?.refresh_token;
            if (!accessToken || !rotatedRefreshToken) return null;

            localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, rotatedRefreshToken);
            window.dispatchEvent(new Event(AUTH_TOKEN_REFRESHED_EVENT));
            return accessToken;
        })
        .catch(() => null)
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
};

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config
    }
)

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        if (error.response?.status !== 401 || !config) {
            return Promise.reject(error);
        }

        const isAuthEndpoint = ["/auth/login", "/auth/refresh", "/auth/logout"]
            .some((path) => config.url?.includes(path));

        if (config.skipAuthRefresh || isAuthEndpoint) {
            return Promise.reject(error);
        }

        if (config._retry) {
            clearAuthentication();
            return Promise.reject(error);
        }

        config._retry = true;
        const accessToken = await refreshAccessToken();
        if (!accessToken) {
            clearAuthentication();
            return Promise.reject(error);
        }

        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
    }
)

export default api
