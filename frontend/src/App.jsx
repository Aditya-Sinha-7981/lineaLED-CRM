import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import StaffDashboard from './pages/StaffDashboard'
import SurveyScreen from './pages/SurveyScreen'
import QuotePreview from './pages/QuotePreview'
import OwnerDashboard from './pages/OwnerDashboard'
import ApprovalDetail from './pages/ApprovalDetail'
import ClientPortal from './pages/ClientPortal'
import ApprovalLanding from './pages/ApprovalLanding'

function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-gray-500">Loading…</div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/login" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/survey/:siteId"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <SurveyScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/quote/:boardId"
          element={
            <ProtectedRoute allowedRoles={['staff']}>
              <QuotePreview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/approval/:estimateId"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ApprovalDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client"
          element={
            <ProtectedRoute allowedRoles={['client_user']}>
              <ClientPortal />
            </ProtectedRoute>
          }
        />
        <Route path="/approve/:token" element={<ApprovalLanding />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App