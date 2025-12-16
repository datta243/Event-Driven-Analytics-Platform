"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { Upload, FileSpreadsheet, FileJson, Database } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { DataProcessor } from "@/lib/data-processor"

interface FileUploadProps {
  onDatasetUploaded: (data: any, processor: DataProcessor) => void
}

export function FileUpload({ onDatasetUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const uploadFile = async (file: File) => {
    setIsUploading(true)

    try {
      const processor = new DataProcessor()
      const datasetInfo = await processor.parseFile(file)
      onDatasetUploaded(datasetInfo, processor)
    } catch (error) {
      console.error("Upload error:", error)
      alert("Failed to process file. Please ensure it's a valid CSV, JSON, or Excel file.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        await uploadFile(file)
      }
    },
    [onDatasetUploaded],
  )

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        await uploadFile(file)
      }
    },
    [onDatasetUploaded],
  )

  return (
    <Card className="w-full max-w-2xl p-12">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-foreground mb-2">Upload Your Dataset</h3>
        <p className="text-muted-foreground mb-6">Drag and drop your file here, or click to browse</p>

        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".csv,.xlsx,.xls,.json,.parquet"
          onChange={handleFileSelect}
          disabled={isUploading}
        />

        <Button onClick={() => document.getElementById("file-upload")?.click()} disabled={isUploading} size="lg">
          {isUploading ? "Uploading..." : "Select File"}
        </Button>

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span>CSV, Excel</span>
          </div>
          <div className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            <span>JSON</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>Parquet</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
