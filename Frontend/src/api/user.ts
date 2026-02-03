import api from "./axios";

export const getMyProfile = async () => {
    const response = await api.get('/users/profile/me');
    return response.data;
};

// We'll also need the update profile function later
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