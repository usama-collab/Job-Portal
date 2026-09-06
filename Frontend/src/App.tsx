
import './App.css'
import AppRoutes from './routes/AppRoutes'
import { Toaster } from 'sonner'
import { CircleCheck, CircleX, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import ScrollToTop from './routes/ScrollToTop'

function App() {
  return (
    <>
      <ScrollToTop />
      <AppRoutes />
      <Toaster
        position="top-right"
        theme="light"
        closeButton
        offset={{ top: 80, right: 20 }}
        mobileOffset={{ top: 80, right: 16, left: 16 }}
        visibleToasts={4}
        gap={12}
        className="jobify-toaster"
        icons={{
          success: <CircleCheck className="h-5 w-5" />,
          error: <CircleX className="h-5 w-5" />,
          info: <Info className="h-5 w-5" />,
          warning: <TriangleAlert className="h-5 w-5" />,
          loading: <LoaderCircle className="h-5 w-5 animate-spin" />,
        }}
        toastOptions={{
          duration: 4500,
          classNames: {
            toast: 'jobify-toast',
            title: 'jobify-toast-title',
            description: 'jobify-toast-description',
            icon: 'jobify-toast-icon',
            closeButton: 'jobify-toast-close',
            actionButton: 'jobify-toast-action',
            cancelButton: 'jobify-toast-cancel',
          },
        }}
      />
    </>
  )
}

export default App
