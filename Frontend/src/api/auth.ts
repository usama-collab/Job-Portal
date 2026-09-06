import api from "./axios";
import { REFRESH_TOKEN_STORAGE_KEY } from "../store/authStore";


export interface LoginPayload{
    email: string
    password: string
}

export interface RegisterPayload{
    name: string
    email: string
    password: string
}

export interface LoginResponse{
    access_token: string
    refresh_token: string
}

export interface MessageResponse {
    message: string
}

export const loginUser = async (data: LoginPayload): Promise<LoginResponse> => {
    const formData = new URLSearchParams()
    formData.append("username", data.email)
    formData.append("password", data.password)
    const response = await api.post("/auth/login", formData, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    });
    return response.data
}

export const logoutUser = async (): Promise<void> => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (!refreshToken) return;

    await api.post(
        "/auth/logout",
        { refresh_token: refreshToken },
        { skipAuthRefresh: true },
    );
}

export const registerUser = async (data: RegisterPayload) => {
    const response = await api.post("/users/register", data)
    return response.data
}

export const requestPasswordReset = async (email: string): Promise<MessageResponse> => {
    const response = await api.post(
        "/auth/forgot-password",
        { email },
        { skipAuthRefresh: true },
    )
    return response.data
}

export const resetPassword = async (token: string, newPassword: string): Promise<MessageResponse> => {
    const response = await api.post(
        "/auth/reset-password",
        { token, new_password: newPassword },
        { skipAuthRefresh: true },
    )
    return response.data
}
