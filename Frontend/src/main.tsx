import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"
import './index.css'
import App from './App.tsx'
import { installNotificationSession } from './lib/notification-session'

const queryClient = new QueryClient()
const uninstallNotificationSession = installNotificationSession(queryClient)
if (import.meta.hot) import.meta.hot.dispose(uninstallNotificationSession)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
