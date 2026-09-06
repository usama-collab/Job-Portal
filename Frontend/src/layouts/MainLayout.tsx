import { useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { 
  User, 
  LogOut, 
  LayoutDashboard, 
  UserCircle, 
  Bookmark, // Added Bookmark icon
  Menu,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore';
import { logoutUser } from '../api/auth';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover"
import { useProfile } from "../hooks/useProfile";
import { BrandLogo } from "../components/brand-logo";

const MainLayout = () => {
    const { data: profile } = useProfile(); // Fetch profile data
    const baseURL = import.meta.env.VITE_API_BASE_URL.replace('/api', ''); // Get base server URL
    const navigate = useNavigate()
    const location = useLocation()
    const logoutStore = useAuthStore((state) => state.logout)
    const token = localStorage.getItem('token')
    
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const userEmail = profile?.email ?? "";

    const handleNavClick = (path: string) => {
        navigate(path);
        setIsPopoverOpen(false);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
        } catch {
            // Local logout still completes when the backend is unavailable.
        } finally {
            logoutStore();
            setIsPopoverOpen(false);
            navigate('/jobs');
        }
    };

    const canAccessDashboard = Boolean(profile?.company_membership);
    const employerPath = canAccessDashboard ? "/employer/dashboard" : "/employer/onboarding";
    const employerLabel = canAccessDashboard ? "Recruiting" : "Start recruiting";

    const linkStyle = (path: string) => 
        `text-sm font-semibold transition-colors hover:text-blue-600 ${
            location.pathname === path ? "text-blue-600" : "text-gray-600"
        }`;

    const mobileLinkStyle = (path: string) =>
        `flex h-11 items-center rounded-xl px-3 text-sm font-bold transition-colors ${
            location.pathname === path
                ? "bg-blue-50 text-blue-600"
                : "text-slate-600 hover:bg-slate-50 hover:text-blue-600"
        }`;

    return (
        <div className='min-h-screen flex flex-col bg-slate-50/30'>
            <nav className='sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md'>
                <div className='mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6'>
                    
                    {/* Logo Section */}
                    <BrandLogo markClassName="h-10 w-10" />

                    <div className='flex items-center gap-8'>
                        <div className='hidden md:flex items-center gap-6 mr-4 border-r pr-8 h-6 border-slate-200'>
                            <Link to="/" className={linkStyle("/")}>Home</Link>
                            <Link to="/jobs" className={linkStyle("/jobs")}>Find Jobs</Link>
                            {token && (
                                <Link to={employerPath} className={linkStyle(employerPath)}>
                                    {employerLabel}
                                </Link>
                            )}
                        </div>

                        <div className='flex items-center gap-3'>
                            {!token ? (
                                <>
                                    <Link to="/login" className="hidden md:block">
                                        <Button variant="ghost" className='font-semibold text-slate-600'>Sign in</Button>
                                    </Link>
                                    <Link to="/register" className="hidden md:block">
                                        <Button className='bg-blue-600 hover:bg-blue-700 shadow-sm'>Get Started</Button>
                                    </Link>
                                </>
                            ) : (
                                <>
                                    {/* 1. New Save/Applications Icon Button */}
                                    <Button 
                                        variant="ghost" 
                                        className={`group h-10 w-10 rounded-full p-0 transition-all focus-visible:text-blue-600 ${
                                            location.pathname === '/applications' 
                                            ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                            : "text-slate-600 hover:bg-slate-100"
                                        }`}
                                        onClick={() => navigate('/applications')}
                                        title="My Applications"
                                    >
                                        <Bookmark className={`h-5 w-5 transition-[fill] group-focus-visible:fill-current ${location.pathname === '/applications' ? 'fill-current' : ''}`} />
                                    </Button>

                                    {/* User Popover */}
                                    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 border border-slate-200 overflow-hidden hover:opacity-80 transition-all">
                                                {profile?.avatar_url ? (
                                                    <img
                                                        src={`${baseURL}${profile.avatar_url}`}
                                                        alt="Profile"
                                                        className="h-full w-full object-cover"
                                                        onError={(e) => {
                                                            // Fallback if image fails to load
                                                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + userEmail;
                                                        }}
                                                    />
                                                ) : (
                                                    <User className="h-5 w-5 text-slate-600" />
                                                )}
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
                                                        {profile?.is_admin ? "Administrator" : profile?.company_membership ? "Company owner" : "Job seeker"}
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

                            <Popover open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="h-10 w-10 rounded-full p-0 text-slate-600 hover:bg-slate-100 md:hidden"
                                        aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                                    >
                                        <Menu className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    align="end"
                                    className="mt-2 w-64 rounded-2xl border-slate-100 p-2 shadow-xl md:hidden"
                                >
                                    <nav aria-label="Mobile navigation" className="grid gap-1">
                                        <Link
                                            to="/"
                                            className={mobileLinkStyle("/")}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Home
                                        </Link>
                                        <Link
                                            to="/jobs"
                                            className={mobileLinkStyle("/jobs")}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            Find Jobs
                                        </Link>
                                        {token && (
                                            <Link
                                                to={employerPath}
                                                className={mobileLinkStyle(employerPath)}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {employerLabel}
                                            </Link>
                                        )}

                                        {!token && (
                                            <div className="mt-1 grid gap-2 border-t border-slate-100 pt-3">
                                                <Link
                                                    to="/login"
                                                    className={mobileLinkStyle("/login")}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                >
                                                    Sign in
                                                </Link>
                                                <Button asChild className="h-11 rounded-xl bg-blue-600 font-bold hover:bg-blue-700">
                                                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                                                        Get Started
                                                    </Link>
                                                </Button>
                                            </div>
                                        )}
                                    </nav>
                                </PopoverContent>
                            </Popover>
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
