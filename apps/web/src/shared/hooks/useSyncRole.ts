import { useEffect } from 'react'
import { getToken } from '../api/client'
import { fetchMe } from '../../store/authSlice'
import { useAppDispatch } from '../../store/hooks'

export function useSyncRole() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!getToken()) return

    function sync() {
      dispatch(fetchMe())
    }

    sync()
    window.addEventListener('focus', sync)
    return () => window.removeEventListener('focus', sync)
  }, [dispatch])
}
