import { useState } from "react"; // 1. Added useState
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { User, LogOut, LayoutDashboard, UserCircle, Briefcase } from 'lucide-react'
import { jwtDecode } from "jwt-decode";
import { useAuthStore } from '../store/authStore';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"

export interface DecodedToken {
    email: string;
    role: string;
    exp: number;
}

const MainLayout = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const logoutStore = useAuthStore((state) => state.logout)
    const token = localStorage.getItem('token')
    
    // 2. Added open state for Popover
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    
    let userRole = null;
    let userEmail = "";

    if (token) {
        try {
            const decoded = jwtDecode<DecodedToken>(token);
            userRole = decoded.role; 
            userEmail = decoded.email;
        } catch (error) {
            console.error("Invalid token", error);
        }
    }

    // 3. Updated helper to navigate and close popover
    const handleNavClick = (path: string) => {
        navigate(path);
        setIsPopoverOpen(false);
    };

    const handleLogout = () => {
        if (logoutStore) logoutStore();
        setIsPopoverOpen(false); // Close on logout
        navigate('/jobs');
    };

    const canAccessDashboard = userRole === 'admin' || userRole === 'employer';

    const linkStyle = (path: string) => 
        `text-sm font-semibold transition-colors hover:text-blue-600 ${
            location.pathname === path ? "text-blue-600" : "text-gray-600"
        }`;

    return (
        <div className='min-h-screen flex flex-col bg-slate-50/30'>
            <nav className='sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md'>
                <div className='container mx-auto flex h-16 items-center justify-between px-6'>
                    
                    <Link to="/" className='flex items-center gap-2'>
                        <div className='bg-blue-600 p-1.5 rounded-lg'>
                            <Briefcase className='text-white w-5 h-5' />
                        </div>
                        <span className='text-xl font-black tracking-tight text-slate-900'>Jobify</span>
                    </Link>

                    <div className='flex items-center gap-8'>
                        <div className='hidden md:flex items-center gap-6 mr-4 border-r pr-8 h-6 border-slate-200'>
                            <Link to="/" className={linkStyle("/")}>Home</Link>
                            <Link to="/jobs" className={linkStyle("/jobs")}>Find Jobs</Link>
                            
                            {token && canAccessDashboard && (
                                <Link to="/employer/dashboard" className={linkStyle("/employer/dashboard")}>
                                    Recruiting
                                </Link>
                            )}
                        </div>

                        <div className='flex items-center gap-3'>
                            {!token ? (
                                <>
                                    <Link to="/login">
                                        <Button variant="ghost" className='font-semibold text-slate-600'>Sign in</Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button className='bg-blue-600 hover:bg-blue-700 shadow-sm'>Get Started</Button>
                                    </Link>
                                </>
                            ) : (
                                /* 4. Controlled Popover */
                                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-slate-100 p-0 border border-slate-200 hover:bg-slate-200 transition-all">
                                            <User className="h-5 w-5 text-slate-600" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-64 mt-2 shadow-xl border-slate-100 rounded-xl" align="end">
                                        <div className="flex flex-col space-y-4 p-2">
                                            <div className="flex flex-col space-y-1 px-2 py-1">
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Account</p>
                                                <p className="text-sm font-semibold truncate text-slate-700">
                                                    {userEmail}
                                                </p>
                                                <span className='text-[10px] bg-blue-50 text-blue-600 w-fit px-2 py-0.5 rounded-full font-bold uppercase'>
                                                    {userRole}
                                                </span>
                                            </div>
                                            
                                            <div className='space-y-1'>
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full justify-start gap-3 h-10 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg"
                                                    onClick={() => handleNavClick('/profile')} // Closes popover
                                                >
                                                    <UserCircle size={18} />
                                                    My Profile
                                                </Button>

                                                {canAccessDashboard && (
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start gap-3 h-10 px-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg"
                                                        onClick={() => handleNavClick('/employer/dashboard')} // Closes popover
                                                    >
                                                        <LayoutDashboard size={18} />
                                                        Dashboard
                                                    </Button>
                                                )}
                                            </div>

                                            <div className='pt-2 border-t'>
                                                <Button 
                                                    variant="ghost" 
                                                    className="w-full justify-start gap-3 h-10 px-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                                    onClick={handleLogout}
                                                >
                                                    <LogOut size={18} />
                                                    Sign out
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            <main className='flex-1'>
                <Outlet />
            </main>
        </div>
    )
}

export default MainLayout