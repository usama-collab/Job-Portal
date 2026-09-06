import GoogleCallback from "../pages/GoogleCallback"
import { Route, Routes } from 'react-router-dom'
import Home from '../pages/Home'
import Jobs from '../pages/Jobs'
import JobDetail from '../pages/JobDetail'
import Login from '../pages/Login'
import Register from '../pages/Register'
import MainLayout from '../layouts/MainLayout'
import ProtectedRoute from './ProtectedRoute'
import GuestRoute from './GuestRoute'
import MyApplications from '../pages/MyApplications'
import JobApplicants from '../pages/JobApplicants'
import EmployerDashboard from '../pages/EmployerDashboard'
import CreateJob from '../pages/CreateJob'
import EditJob from '../pages/EditJob'
import ApplyJob from '../pages/ApplyJob'
import Profile from '../pages/Profile'
import CompanyRoute from './CompanyRoute'
import EmployerOnboarding from '../pages/EmployerOnboarding'


const AppRoutes = () => {
  return (
    <Routes>
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        {/* Public Layout */}
        <Route element={<MainLayout/>}>
            <Route path='/' element={<Home/>}/>
            <Route path='/jobs' element={<Jobs/>}/>
            <Route path='/jobs/:id' element={<JobDetail/>}/>
            {/* Protected Route */}
            <Route element={<ProtectedRoute/>}>
                <Route path='/jobs/:id/apply' element={<ApplyJob/>}/>
                <Route path="/applications" element={<MyApplications />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/employer/onboarding" element={<EmployerOnboarding />} />
                <Route element={<CompanyRoute />}>
                    <Route path="/employer/jobs/:jobId/applicants" element={<JobApplicants />} />
                    <Route path='/employer/dashboard' element={<EmployerDashboard/>}/>
                    <Route path='/employer/jobs/create' element={<CreateJob/>}/>
                    <Route path="/employer/jobs/:jobId/edit" element={<EditJob />}/>
                </Route>
            </Route>
        </Route>
        {/* Guest-only auth pages without the main navbar */}
        <Route element={<GuestRoute/>}>
            <Route path='/login' element={<Login/>}/>
            <Route path='/register' element={<Register/>}/>
        </Route>
    </Routes>
  )
}

export default AppRoutes
