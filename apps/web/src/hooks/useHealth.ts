import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAppStore } from '@/lib/store'

export function useHealth() {
  const { setDemoLoaded, setAttackVersion, setRuleCount } = useAppStore()

  const query = useQuery({
    queryKey: ['health'],
    queryFn: () => api.health().then((r) => r.data),
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  })

  useEffect(() => {
    const data = query.data
    if (!data) return

    if (data.demo_loaded === true) {
      setDemoLoaded(true)
    }
    if (data.attack_version) {
      setAttackVersion(data.attack_version)
    }
    if (typeof data.rule_count === 'number') {
      setRuleCount(data.rule_count)
    }
  }, [query.data, setDemoLoaded, setAttackVersion, setRuleCount])

  return query
}
