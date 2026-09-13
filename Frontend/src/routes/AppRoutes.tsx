import { lazy } from 'react'
import { LazyPage } from './LazyPage'
import GoogleCallback from "../pages/GoogleCallback"
import { Route, Routes } from 'react-router-dom'
import Home from '../pages/Home'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'
import GuestRoute from './GuestRoute'
import CompanyRoute from './CompanyRoute'


const Jobs = lazy(() => import('../pages/Jobs'))
const JobDetail = lazy(() => import('../pages/JobDetail'))
const Login = lazy(() => import('../pages/Login'))
const Register = lazy(() => import('../pages/Register'))
const MyApplications = lazy(() => import('../pages/MyApplications'))
const JobApplicants = lazy(() => import('../pages/JobApplicants'))
const EmployerDashboard = lazy(() => import('../pages/EmployerDashboard'))
const CreateJob = lazy(() => import('../pages/CreateJob'))
const EditJob = lazy(() => import('../pages/EditJob'))
const ApplyJob = lazy(() => import('../pages/ApplyJob'))
const Profile = lazy(() => import('../pages/Profile'))
const EmployerOnboarding = lazy(() => import('../pages/EmployerOnboarding'))
const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))
const ResetPassword = lazy(() => import('../pages/ResetPassword'))
const Notifications = lazy(() => import('../pages/Notifications'))
const Messages = lazy(() => import('../pages/Messages'))

const AppRoutes = () => {
  return (
    <Routes>
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />
        <Route path="/reset-password" element={<LazyPage><ResetPassword /></LazyPage>} />
        {/* Public Layout */}
        <Route element={<MainLayout/>}>
            <Route path='/' element={<Home/>}/>
            <Route path='/jobs' element={<LazyPage><Jobs /></LazyPage>}/>
            <Route path='/jobs/:id' element={<LazyPage><JobDetail /></LazyPage>}/>
            {/* Protected Route */}
            <Route element={<ProtectedRoute/>}>
                <Route path='/jobs/:id/apply' element={<LazyPage><ApplyJob /></LazyPage>}/>
                <Route path="/applications" element={<LazyPage><MyApplications /></LazyPage>} />
                <Route path="/notifications" element={<LazyPage><Notifications /></LazyPage>} />
                <Route path="/messages" element={<LazyPage><Messages /></LazyPage>} />
                <Route path="/messages/:applicationId" element={<LazyPage><Messages /></LazyPage>} />
                <Route path="/profile" element={<LazyPage><Profile /></LazyPage>} />
                <Route path="/employer/onboarding" element={<LazyPage><EmployerOnboarding /></LazyPage>} />
                <Route element={<CompanyRoute />}>
                    <Route path="/employer/jobs/:jobId/applicants" element={<LazyPage><JobApplicants /></LazyPage>} />
                    <Route path='/employer/dashboard' element={<LazyPage><EmployerDashboard /></LazyPage>}/>
                    <Route path='/employer/jobs/create' element={<LazyPage><CreateJob /></LazyPage>}/>
                    <Route path="/employer/jobs/:jobId/edit" element={<LazyPage><EditJob /></LazyPage>}/>
                </Route>
            </Route>
        </Route>
        {/* Guest-only auth pages without the main navbar */}
        <Route element={<GuestRoute/>}>
            <Route path='/login' element={<LazyPage><Login /></LazyPage>}/>
            <Route path='/register' element={<LazyPage><Register /></LazyPage>}/>
        </Route>
    </Routes>
  )
}

export default AppRoutes
