import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

export const useProfile = () => {
    // By adding token to the queryKey, the query will automatically
    // refetch whenever the token changes (e.g., from null to "abc...")
    const token = localStorage.getItem('token');

    return useQuery({
        queryKey: ['profile-me', token], // Added token here
        queryFn: async () => {
            const res = await api.get('/users/profile/me');
            return res.data;
        },
        enabled: !!token,
        staleTime: 1000 * 60 * 5,
    });
};
