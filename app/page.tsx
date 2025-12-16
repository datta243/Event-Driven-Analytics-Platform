"use client"

import { useState } from "react"
import { Database, Sparkles, FileDown, Trash2 } from "lucide-react"
import { FileUpload } from "@/components/file-upload"
import { DataPreview } from "@/components/data-preview"
import { CleaningActions } from "@/components/cleaning-actions"
import { ColumnStats } from "@/components/column-stats"
import { ProcessingDashboard } from "@/components/processing-dashboard"
import { ActivityLog } from "@/components/activity-log"
import { Button } from "@/components/ui/button"
import type { DataProcessor } from "@/lib/data-processor"

export default function DataCleaningTool() {
  const [datasetId, setDatasetId] = useState<string | null>(null)
  const [datasetInfo, setDatasetInfo] = useState<any>(null)
  const [processor, setProcessor] = useState<DataProcessor | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activities, setActivities] = useState<
    Array<{
      id: string
      action: string
      timestamp: Date
      status: "success" | "error"
      details?: string
    }>
  >([])

  const handleDatasetUploaded = (data: any, processorInstance: DataProcessor) => {
    setDatasetId(data.dataset_id)
    setDatasetInfo(data)
    setProcessor(processorInstance)
    setActivities([
      {
        id: Date.now().toString(),
        action: "Dataset uploaded",
        timestamp: new Date(),
        status: "success",
        details: `${data.filename} - ${data.rows.toLocaleString()} rows, ${data.columns} columns`,
      },
    ])
  }

  const handleDataCleaned = (data: any, actionDescription: string) => {
    setDatasetInfo((prev: any) => ({
      ...prev,
      rows: data.rows,
      preview: data.data,
      stats: data.stats,
    }))
    setActivities((prev) => [
      {
        id: Date.now().toString(),
        action: actionDescription,
        timestamp: new Date(),
        status: "success",
        details: `${data.rows?.toLocaleString()} rows remaining`,
      },
      ...prev,
    ])
  }

  const handleExport = async (format: "csv" | "json") => {
    if (!processor) return

    try {
      const blob = processor.exportData(format)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `cleaned_dataset.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      setActivities((prev) => [
        {
          id: Date.now().toString(),
          action: `Exported as ${format.toUpperCase()}`,
          timestamp: new Date(),
          status: "success",
        },
        ...prev,
      ])
    } catch (error) {
      console.error("Export failed:", error)
      setActivities((prev) => [
        {
          id: Date.now().toString(),
          action: "Export failed",
          timestamp: new Date(),
          status: "error",
        },
        ...prev,
      ])
    }
  }

  const handleReset = () => {
    setDatasetId(null)
    setDatasetInfo(null)
    setProcessor(null)
    setActivities([])
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                <Database className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">DataClean Pro</h1>
                <p className="text-sm text-muted-foreground">Analysis preparation toolkit</p>
              </div>
            </div>

            {datasetId && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExport("json")}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export JSON
                </Button>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {!datasetId ? (
          <div className="flex items-center justify-center min-h-[600px]">
            <FileUpload onDatasetUploaded={handleDatasetUploaded} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Dashboard and Stats */}
            <div className="lg:col-span-3 space-y-6">
              <ProcessingDashboard
                stats={datasetInfo.stats}
                totalRows={datasetInfo.rows}
                totalColumns={datasetInfo.columns}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-6 space-y-6">
              {/* Cleaning Actions */}
              <CleaningActions
                datasetId={datasetId}
                columns={datasetInfo.column_names}
                processor={processor}
                onDataCleaned={handleDataCleaned}
                setIsProcessing={setIsProcessing}
              />

              {/* Data Preview */}
              <DataPreview data={datasetInfo.preview} columns={datasetInfo.column_names} isProcessing={isProcessing} />
            </div>

            {/* Right Sidebar - Column Stats and Activity Log */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Dataset Overview</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">{datasetInfo.rows.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-card">
                    <div className="text-2xl font-bold text-foreground">{datasetInfo.columns}</div>
                    <div className="text-sm text-muted-foreground">Columns</div>
                  </div>
                </div>
              </div>

              <ColumnStats stats={datasetInfo.stats} />

              <ActivityLog activities={activities} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
