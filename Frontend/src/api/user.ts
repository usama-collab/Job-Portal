import api from "./axios";

export const getMyProfile = async () => {
    const response = await api.get('/users/profile/me');
    return response.data;
};

// Add this function:
export const uploadAvatar = async (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file); // "avatar" must match the parameter name in your FastAPI route

    const response = await api.post("/users/me/avatar", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data;
};

export const updateProfile = async (payload: any) => {
    const response = await api.put('/users/me/update', payload);
    return response.data;
};

export const updateMyProfile = async (payload: {
    name?: string;
    bio?: string;
    skills?: string;
    experience?: string;
}) => {
    const response = await api.put('/users/me/update', payload);
    return response.data;
};