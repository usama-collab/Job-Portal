import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useProfile } from "../hooks/useProfile";

const CompanyRoute = () => {
  const location = useLocation();
  const { data: profile, isLoading, isError } = useProfile();

  if (isLoading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }
  if (isError || !profile?.company_membership) {
    return <Navigate to="/employer/onboarding" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export default CompanyRoute;
