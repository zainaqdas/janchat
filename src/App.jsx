import ErrorBoundary from './components/ErrorBoundary'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

  return (
    <CallProvider>
      <ChatProvider>
        <div className="flex h-screen">
          {/* Sidebar - hidden on mobile when chat is active */}
          <div className="hidden w-80 flex-shrink-0 md:block">
            <Sidebar />
          </div>

          {/* Main content area - ChatWindow or Contacts */}
          <div className="flex flex-1">
            <Routes>
              <Route path="/contacts" element={<Contacts />} />
              <Route path="/chat/:contactId" element={<><ChatPage /><ChatWindow /></>} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/" element={<Navigate to="/contacts" replace />} />
            </Routes>
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
