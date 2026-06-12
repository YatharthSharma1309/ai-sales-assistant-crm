import { useAppSelector } from '../../store/hooks'
import { isAdmin, isManager } from '../constants/roles'

export function useRole() {
  const role = useAppSelector((state) => state.auth.role)

  return {
    role,
    isManager: isManager(role),
    isAdmin: isAdmin(role),
    isRep: role === 'REP',
  }
}
