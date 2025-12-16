"use client"

import { Card } from "@/components/ui/card"
import { AlertCircle, CheckCircle2 } from "lucide-react"

interface ColumnStatsProps {
  stats: Array<{
    column: string
    missing: number
    unique: number
    dtype: string
    sample_values?: string[]
  }>
}

export function ColumnStats({ stats }: ColumnStatsProps) {
  if (!stats || stats.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground mb-3">Column Statistics</h3>
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground mb-3">Column Statistics</h3>
      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {stats.map((col) => {
          const hasIssues = col.missing > 0
          const missingPercentage = col.missing > 0 ? (col.missing / (col.missing + col.unique)) * 100 : 0

          return (
            <Card key={col.column} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-foreground text-sm mb-1">{col.column}</div>
                  <div className="text-xs text-muted-foreground">{col.dtype}</div>
                </div>
                {hasIssues ? (
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-chart-2 flex-shrink-0" />
                )}
              </div>

              <div className="space-y-2 mt-3">
                {col.missing > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Missing</span>
                    <span className="text-destructive font-medium">
                      {col.missing} ({missingPercentage.toFixed(1)}%)
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unique</span>
                  <span className="text-foreground">{col.unique?.toLocaleString() || 0}</span>
                </div>

                {col.sample_values && col.sample_values.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-1">Sample Values</div>
                    <div className="text-xs text-foreground space-y-1">
                      {col.sample_values.slice(0, 3).map((val, idx) => (
                        <div key={idx} className="truncate">
                          {String(val)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
