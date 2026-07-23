/**
 * @module hooks/useApi
 * @description Generic hook for managing API call state (loading, data, error).
 *
 * Provides a reusable pattern for components that need to fetch data from
 * the API. Handles loading states, error states, and request cancellation.
 *
 * ## Usage
 *
 * ```tsx
 * function DatabaseList() {
 *   const { data, loading, error, execute } = useApi<DashboardItem[]>()
 *
 *   useEffect(() => {
 *     execute(() => listDatabases())
 *   }, [execute])
 *
 *   if (loading) return <Skeleton />
 *   if (error) return <ErrorMessage message={error} />
 *   return <List items={data} />
 * }
 * ```
 *
 * ## Features
 *
 * - **Automatic abort**: If a new request is made before the previous one completes,
 *   the old request is aborted (prevents stale data overwrites).
 * - **Trace ID tracking**: Backend traceId is preserved for debugging 500 errors.
 * - **Reset method**: Allows clearing state without making a new request.
 */

import { useState, useCallback, useRef } from 'react'
import type { ApiResult } from '../api/types'

/**
 * Internal state shape for the hook.
 *
 * @typeParam T - The expected data type from the API
 */
interface UseApiState<T> {
  /** Response data, or null if no request has completed yet. */
  data: T | null
  /** Whether a request is currently in flight. */
  loading: boolean
  /** Error message from the last failed request, or null. */
  error: string | null
  /** Backend traceId from the last error, for debugging. */
  traceId: string | null
}

/**
 * Generic hook for managing API call lifecycle.
 *
 * @typeParam T - The expected success data type
 * @returns State object with `data`, `loading`, `error`, `traceId`, plus `execute` and `reset` methods
 *
 * @example
 * ```tsx
 * const { data, loading, error, traceId, execute } = useApi<MetricasPublicas>()
 *
 * useEffect(() => {
 *   execute(() => getStats())
 * }, [execute])
 * ```
 */
export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
    traceId: null,
  })

  /** Reference to the current AbortController for request cancellation. */
  const abortRef = useRef<AbortController | null>(null)

  /**
   * Executes an API function and updates state accordingly.
   *
   * Automatically cancels any in-flight request before starting a new one.
   * This prevents race conditions where a slow request overwrites a fast one.
   *
   * @param fn - Async function that returns `ApiResult<T>` (e.g., `() => listDatabases()`)
   */
  const execute = useCallback(async (fn: () => Promise<ApiResult<T>>) => {
    // Cancel any previous in-flight request
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setState({ data: null, loading: true, error: null, traceId: null })

    const result = await fn()

    // If a newer request has started, discard this result
    if (controller.signal.aborted) return

    if (result.ok) {
      setState({ data: result.data, loading: false, error: null, traceId: null })
    } else {
      setState({
        data: null,
        loading: false,
        error: result.error.error,
        traceId: result.error.traceId ?? null,
      })
    }
  }, [])

  /**
   * Resets the hook state to its initial values.
   *
   * Useful for clearing errors or preparing for a fresh request.
   */
  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, traceId: null })
  }, [])

  return { ...state, execute, reset }
}
