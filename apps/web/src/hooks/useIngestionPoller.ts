import { useState, useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import type { IngestionJob } from '@/types/api'

const POLL_INTERVAL_MS = 2000
const TERMINAL_STATUSES = new Set(['completed', 'failed'])

export function useIngestionPoller(jobId: string | null) {
  const [job, setJob] = useState<IngestionJob | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!jobId) {
      setJob(null)
      return
    }

    let cancelled = false

    async function poll() {
      if (cancelled || !jobId) return
      try {
        const response = await api.getJob(jobId)
        if (!cancelled) {
          const updatedJob = response.data
          setJob(updatedJob)
          if (TERMINAL_STATUSES.has(updatedJob.status)) {
            stopPolling()
          }
        }
      } catch {
        // Silently swallow transient errors; the interval will retry
      }
    }

    function stopPolling() {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    // Fetch immediately then on interval
    poll()
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [jobId])

  return job
}
