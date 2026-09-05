
import './App.css'
import AppRoutes from './routes/AppRoutes'
import { Toaster } from 'sonner'
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
        offset={20}
        mobileOffset={16}
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '16px',
            padding: '16px',
          },
          classNames: {
            toast: 'group !flex !items-center !gap-3 !border !border-slate-200 !bg-white !text-slate-600 !shadow-[0_18px_50px_-18px_rgba(15,23,42,0.28)]',
            success: '!border-l-4 !border-l-emerald-500 !text-emerald-600',
            error: '!border-l-4 !border-l-red-500 !text-red-500',
            info: '!border-l-4 !border-l-blue-500 !text-blue-600',
            warning: '!border-l-4 !border-l-amber-500 !text-amber-600',
            loading: '!border-l-4 !border-l-blue-500 !text-blue-600',
            title: '!text-sm !font-bold !text-slate-900',
            description: '!text-xs !font-medium !leading-5 !text-slate-500',
            icon: '!text-inherit',
            closeButton: '!border-slate-200 !bg-white !text-slate-500 !shadow-sm hover:!bg-slate-50 hover:!text-slate-900',
            actionButton: '!rounded-lg !bg-blue-600 !px-3 !font-bold !text-white hover:!bg-blue-700',
            cancelButton: '!rounded-lg !bg-slate-100 !px-3 !font-bold !text-slate-700 hover:!bg-slate-200',
          },
        }}
      />
    </>
  )
}

export default App
