import { useEffect, useState } from "react"
import { describeApiError } from "../api/http/errors"

export function useReportSection<T>(
  fetchData: () => Promise<T>,
  enabled = true,
) {
  const [attempt, retry] = useState(0)
  const [result, setResult] = useState<{
    request: typeof fetchData
    attempt: number
    data?: T
    error?: string
  }>()
  useEffect(() => {
    if (!enabled) return
    let active = true
    fetchData()
      .then((data) => {
        if (active) setResult({ request: fetchData, attempt, data })
      })
      .catch((err) => {
        if (active)
          setResult({
            request: fetchData,
            attempt,
            error: describeApiError(err),
          })
      })
    return () => {
      active = false
    }
  }, [enabled, fetchData, attempt])
  const visible =
    enabled && result?.request === fetchData && result.attempt === attempt
      ? result
      : undefined
  return {
    data: visible?.data,
    error: visible?.error,
    loading: enabled && !visible,
    reload: () => retry((n) => n + 1),
  }
}
