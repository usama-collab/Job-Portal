import { create } from "zustand";

export const ACCESS_TOKEN_STORAGE_KEY = "token";
export const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
export const AUTH_TOKEN_REFRESHED_EVENT = "auth:token-refreshed";
export const AUTH_LOGOUT_EVENT = "auth:logout";

interface AuthState {
    token: string | null,
    refreshToken: string | null,
    isAuthenticated: boolean,
    login: (token: string, refreshToken: string) => void
    logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
    token: localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),
    refreshToken: localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY),
    isAuthenticated: !!localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY),

    login: (token, refreshToken) => {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        set({ token, refreshToken, isAuthenticated: true })
    },

    logout: () => {
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
        set({ token: null, refreshToken: null, isAuthenticated: false })
    }
}) )

if (typeof window !== "undefined") {
    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, () => {
        const token = localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        useAuthStore.setState({
            token,
            refreshToken,
            isAuthenticated: !!token,
        });
    });

    window.addEventListener(AUTH_LOGOUT_EVENT, () => {
        useAuthStore.getState().logout();
    });
}
