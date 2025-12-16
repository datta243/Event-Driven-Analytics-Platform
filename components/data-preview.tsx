"use client"

import { Card } from "@/components/ui/card"
import { Eye } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

interface DataPreviewProps {
  data: any[]
  columns: string[]
  isProcessing: boolean
}

export function DataPreview({ data, columns, isProcessing }: DataPreviewProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Data Preview</h2>
        </div>
        <span className="text-sm text-muted-foreground">
          Showing {Math.min(data.length, 100)} of {data.length} rows
        </span>
      </div>

      {isProcessing && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {!isProcessing && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columns.map((col) => (
                  <th key={col} className="text-left py-3 px-4 font-medium text-foreground whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, idx) => (
                <tr key={idx} className="border-b border-border hover:bg-muted/50">
                  {columns.map((col) => (
                    <td key={col} className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {row[col] !== null && row[col] !== undefined ? String(row[col]) : "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
