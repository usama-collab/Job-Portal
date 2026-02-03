
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
        // Apply to all toasts
        style: {
          borderRadius: '16px',
          padding: '16px',
          border: 'none',
        },
        // Use the 'unstyled' prop for success/error so they don't inherit weird defaults
        classNames: {
          toast: 'group !border-none !shadow-2xl',
          // Success: Jobify Blue with White Text
          success: '!bg-blue-600 !text-white !flex !items-center !gap-3',
          // Error: Clean Red with White Text
          error: '!bg-red-500 !text-white !flex !items-center !gap-3',
          // Title and Description styling
          title: '!text-white !font-bold !text-sm',
          description: '!text-blue-100 !text-xs !font-medium',
          icon: '!text-white', // Makes the checkmark/x-mark white
        },
      }}
    />
    
    </>
  )
}

export default App
