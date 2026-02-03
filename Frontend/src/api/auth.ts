import api from "./axios";


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

export const registerUser = async (data: RegisterPayload) => {
    const response = await api.post("/users/register", data)
    return response.data
}