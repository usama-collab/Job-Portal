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
