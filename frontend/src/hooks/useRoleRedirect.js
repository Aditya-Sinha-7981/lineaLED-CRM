import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function useRoleRedirect(profile, loading) {
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return
    if (!profile) {
      navigate('/login', { replace: true })
      return
    }

    switch (profile.role) {
      case 'admin':
        navigate('/admin', { replace: true })
        break
      case 'staff':
        navigate('/staff', { replace: true })
        break
      case 'client_user':
        navigate('/client', { replace: true })
        break
      default:
        navigate('/login', { replace: true })
    }
  }, [profile, loading, navigate])
}