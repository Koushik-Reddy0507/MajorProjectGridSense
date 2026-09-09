import { useQuery } from '@tanstack/react-query'
import { datasetApi } from '@/services/api'
import { useDatasetStore } from '@/store'

export interface DatasetInfo {
  id: string
  filename: string
  file_size?: number
  format?: string
  uploaded_at?: string
  processing_status?: string
  rows_count?: number
  columns_count?: number
  quality_score?: number
  timestamp_column?: string | null
  error_message?: string | null
}

export interface AnalysisBody<T> {
  success?: boolean
  message?: string | null
  data?: T | null
  error?: string | null
}

/** Normalizes an analysis APIResponse into { data, error, message } */
export function unwrapAnalysis<T = Record<string, unknown>>(
  body?: AnalysisBody<T> | null,
): { data: T | null; error: string | null; message: string | null } {
  if (!body) return { data: null, error: 'No response received from the server', message: null }
  return {
    data: body.data ?? null,
    error: body.error ?? null,
    message: body.message ?? null,
  }
}

/**
 * Picks the dataset every feature page should operate on:
 * the explicitly selected one, or the most recent completed upload.
 */
export function useActiveDataset() {
  const selectedDatasetId = useDatasetStore((s) => s.selectedDatasetId)

  const query = useQuery({
    queryKey: ['datasets', 'active'],
    queryFn: async (): Promise<DatasetInfo[]> => {
      const res = await datasetApi.list()
      const payload = res.data?.data as { items?: DatasetInfo[] } | undefined
      return payload?.items ?? []
    },
    staleTime: 10_000,
  })

  const datasets = query.data ?? []
  const byNewest = [...datasets].sort((a, b) => (b.uploaded_at ?? '').localeCompare(a.uploaded_at ?? ''))
  const dataset =
    datasets.find((d) => d.id === selectedDatasetId) ??
    byNewest.find((d) => d.processing_status === 'completed') ??
    byNewest[0]

  return {
    datasets,
    dataset,
    datasetId: dataset?.id as string | undefined,
    isLoading: query.isLoading,
    refetch: query.refetch,
  }
}