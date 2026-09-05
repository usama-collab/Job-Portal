import api from "./axios";

export interface Company {
  id: number;
  name: string;
  website?: string | null;
  description?: string | null;
  logo_url?: string | null;
  membership_role?: "owner" | "manager" | null;
  created_at: string;
}

export interface CompanyPayload {
  name: string;
  website?: string;
  description?: string;
}

export const getMyCompany = async (): Promise<Company> => {
  const response = await api.get("/companies/me");
  return response.data;
};

export const createCompany = async (payload: CompanyPayload): Promise<Company> => {
  const response = await api.post("/companies", payload);
  return response.data;
};

export const updateCompany = async (companyId: number, payload: CompanyPayload): Promise<Company> => {
  const response = await api.patch(`/companies/${companyId}`, payload);
  return response.data;
};

export const uploadCompanyLogo = async (companyId: number, file: File): Promise<Company> => {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await api.post(`/companies/${companyId}/logo`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
