
import './App.css'
import AppRoutes from './routes/AppRoutes'
import { Toaster } from 'sonner'



function App() {

  return (
    <>
    <AppRoutes/>
    <Toaster
  position="top-right"
  toastOptions={{
    style: {
      borderRadius: '16px',
      padding: '16px',
      border: 'none',
    },
    classNames: {
      // 1. Remove !bg-white and !text-slate-900 from here
      toast: 'group !border-none !shadow-2xl !flex !items-center !gap-3', 
      
      // 2. These will now work correctly without being fighting the base class
      success: '!bg-blue-600 !text-white',
      error: '!bg-red-500 !text-white',
      info: '!bg-slate-900 !text-white',
      loading: '!bg-slate-900 !text-white',
      
      title: '!font-bold !text-sm !text-inherit',
      description: '!text-xs !font-medium !text-inherit !opacity-90',
      icon: '!text-inherit',
    },
  }}
/>
    
    </>
  )
}

export default App
