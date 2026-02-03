import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  UserCircle, 
  Briefcase, 
  Bookmark // Added Bookmark icon
} from 'lucide-react'
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

    const handleNavClick = (path: string) => {
        navigate(path);
        setIsPopoverOpen(false);
    };

    const handleLogout = () => {
        if (logoutStore) logoutStore();
        setIsPopoverOpen(false);
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
                    
                    {/* Logo Section */}
                    <Link to="/" className='flex items-center gap-3 group transition-transform active:scale-95'>
                        <div className='relative flex items-center justify-center'>
                            <div className='absolute inset-0 bg-blue-400 blur-md opacity-20 group-hover:opacity-40 transition-opacity' />
                            <div className='relative bg-linear-to-br from-blue-500 to-blue-700 p-2 rounded-xl shadow-lg shadow-blue-200'>
                                <Briefcase className='text-white w-6 h-6' />
                                <div className='absolute top-1 right-1 w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse' />
                            </div>
                        </div>
                        <div className='flex flex-col leading-none'>
                            <span className='text-2xl font-[1000] tracking-tighter text-slate-900 flex items-baseline'>
                                Jobify
                                <span className='text-blue-600 ml-0.5 text-3xl'>.</span>
                            </span>
                        </div>
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
                                <>
                                    {/* 1. New Save/Applications Icon Button */}
                                    <Button 
                                        variant="ghost" 
                                        className={`h-10 w-10 rounded-full p-0 transition-all ${
                                            location.pathname === '/applications' 
                                            ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                            : "text-slate-600 hover:bg-slate-100"
                                        }`}
                                        onClick={() => navigate('/applications')}
                                        title="My Applications"
                                    >
                                        <Bookmark className="h-5 w-5" />
                                    </Button>

                                    {/* User Popover */}
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="relative h-10 w-10 rounded-full bg-slate-100 p-0 border border-slate-200 hover:bg-slate-200 transition-all">
                                                <User className="h-5 w-5 text-slate-600" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-64 mt-2 shadow-xl border-slate-100 rounded-2xl p-2" align="end">
                                            <div className="flex flex-col space-y-4">
                                                <div className="flex flex-col space-y-1 px-3 py-2 bg-slate-50 rounded-xl">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account</p>
                                                    <p className="text-sm font-bold truncate text-slate-700">
                                                        {userEmail}
                                                    </p>
                                                    <span className='text-[10px] bg-blue-600 text-white w-fit px-2 py-0.5 rounded-md font-black uppercase'>
                                                        {userRole}
                                                    </span>
                                                </div>
                                                
                                                <div className='space-y-1'>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start gap-3 h-11 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl font-bold"
                                                        onClick={() => handleNavClick('/profile')}
                                                    >
                                                        <UserCircle size={18} />
                                                        My Profile
                                                    </Button>

                                                    {/* Added applications link here too for convenience */}
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start gap-3 h-11 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl font-bold"
                                                        onClick={() => handleNavClick('/applications')}
                                                    >
                                                        <Bookmark size={18} />
                                                        My Applications
                                                    </Button>

                                                    {canAccessDashboard && (
                                                        <Button 
                                                            variant="ghost" 
                                                            className="w-full justify-start gap-3 h-11 px-3 text-slate-600 hover:text-blue-600 hover:bg-blue-50/50 rounded-xl font-bold"
                                                            onClick={() => handleNavClick('/employer/dashboard')}
                                                        >
                                                            <LayoutDashboard size={18} />
                                                            Dashboard
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className='pt-2 border-t border-slate-100'>
                                                    <Button 
                                                        variant="ghost" 
                                                        className="w-full justify-start gap-3 h-11 px-3 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl font-bold"
                                                        onClick={handleLogout}
                                                    >
                                                        <LogOut size={18} />
                                                        Sign out
                                                    </Button>
                                                </div>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </>
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