import { usePageLoading } from '../lib/page-loading'
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { PageSkeleton } from '../components/page-skeletons';
import { skeletonKindForPath } from '../lib/page-skeleton-kind';

const CompanyRoute = () => {
  const location = useLocation();
  const { data: profile, isLoading, isError } = useProfile();

  usePageLoading(isLoading)

  if (isLoading) {
    return <PageSkeleton kind={skeletonKindForPath(location.pathname)} />;
  }
  if (isError || !profile?.company_membership) {
    return <Navigate to="/employer/onboarding" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
};

export default CompanyRoute;
