interface SearchResultsProps {
  results: any
  isLoading: boolean
  error: string | null
}

export default function SearchResults({ results, isLoading, error }: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-blue-400">Searching databases...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
        <h3 className="text-red-400 font-semibold mb-2">Search Error</h3>
        <p className="text-red-300">{error}</p>
      </div>
    )
  }

  if (!results || !results.List) {
    return null
  }

  const databases = Object.entries(results.List)

  return (
    <div className="space-y-4">
      {databases.map(([dbName, dbData]: [string, any]) => (
        <div key={dbName} className="bg-secondary/50 border border-primary/20 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-primary">{dbName}</h3>
            <span className="text-sm text-muted-foreground">
              {dbData.Size} {dbData.Size === 1 ? "record" : "records"}
            </span>
          </div>

          <div className="space-y-2">
            {dbData.Data?.map((record: any, index: number) => (
              <div key={index} className="p-3 bg-background/50 rounded border border-primary/10">
                {Object.entries(record).map(([key, value]: [string, any]) => (
                  <div key={key} className="flex justify-between py-1">
                    <span className="text-muted-foreground capitalize">{key}:</span>
                    <span className="text-foreground font-mono text-sm">{String(value)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
