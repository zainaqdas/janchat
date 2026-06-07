import ErrorBoundary from './components/ErrorBoundary'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import { CallProvider } from './contexts/CallContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Contacts from './pages/Contacts'
import ChatPage from './pages/Chat'
import Settings from './pages/Settings'
import Sidebar from './components/layout/Sidebar'
import ChatWindow from './components/chat/ChatWindow'
import MobileNav from './components/layout/MobileNav'
import IncomingCall from './components/call/IncomingCall'
import AudioCall from './components/call/AudioCall'
import VideoCall from './components/call/VideoCall'
import { useNotifications } from './hooks/useNotifications'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

function AppLayout() {
  useNotifications()
  const location = useLocation()
  const isChatRoute = location.pathname.startsWith('/chat/')

  return (
    <CallProvider>
      <ChatProvider>
        <div className="flex h-dvh">
          {/* Desktop sidebar */}
          <div className="hidden w-80 flex-shrink-0 md:block">
            <Sidebar />
          </div>

          {/* Main content + mobile bottom nav */}
          <div className="flex flex-1 flex-col min-w-0">
            <div className="flex flex-1 overflow-hidden min-h-0">
              <Routes>
                <Route path="/contacts" element={<Contacts />} />
                <Route path="/chat/:contactId" element={<><ChatPage /><ChatWindow /></>} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/" element={<Navigate to="/contacts" replace />} />
              </Routes>
            </div>

            {/* Mobile bottom nav - hidden during chat and on desktop */}
            {!isChatRoute && (
              <div className="md:hidden flex-shrink-0">
                <MobileNav />
              </div>
            )}
          </div>
        </div>

        {/* Call overlays */}
        <IncomingCall />
        <AudioCall />
        <VideoCall />
      </ChatProvider>
    </CallProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
