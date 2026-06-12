import { Navigate, Outlet } from 'react-router-dom'
import { useRole } from '../../shared/hooks/useRole'

export function ManagerRoute() {
  const { isManager } = useRole()

  if (!isManager) {
    return <Navigate to="/?notice=team-access" replace />
  }

  return <Outlet />
}
