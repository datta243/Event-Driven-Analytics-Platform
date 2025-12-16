"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Wand2, Trash, Type } from "lucide-react"
import type { DataProcessor } from "@/lib/data-processor"

interface CleaningActionsProps {
  datasetId: string
  columns: string[]
  processor: DataProcessor | null
  onDataCleaned: (data: any, actionDescription: string) => void
  setIsProcessing: (processing: boolean) => void
}

export function CleaningActions({
  datasetId,
  columns,
  processor,
  onDataCleaned,
  setIsProcessing,
}: CleaningActionsProps) {
  const [selectedColumn, setSelectedColumn] = useState<string>(columns[0])
  const [missingStrategy, setMissingStrategy] = useState("mean")
  const [standardizeOp, setStandardizeOp] = useState("lowercase")

  const handleMissingValues = async () => {
    if (!processor) return

    setIsProcessing(true)
    try {
      let result
      if (missingStrategy === "remove") {
        result = processor.removeMissingValues(selectedColumn)
        onDataCleaned(result, `Removed rows with missing values in ${selectedColumn}`)
      } else {
        result = processor.fillMissingValues(selectedColumn, missingStrategy as any)
        onDataCleaned(result, `Applied ${missingStrategy} imputation to ${selectedColumn}`)
      }
    } catch (error) {
      console.error("Cleaning failed:", error)
      alert("Failed to clean data. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRemoveDuplicates = async () => {
    if (!processor) return

    setIsProcessing(true)
    try {
      const beforeRows = processor.getData().length
      const result = processor.removeDuplicates()
      const removedCount = beforeRows - result.rows
      onDataCleaned(result, `Removed ${removedCount} duplicate rows`)
    } catch (error) {
      console.error("Cleaning failed:", error)
      alert("Failed to remove duplicates. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStandardize = async () => {
    if (!processor) return

    setIsProcessing(true)
    try {
      let result

      switch (standardizeOp) {
        case "to_numeric":
          result = processor.standardizeTypes(selectedColumn, "numeric")
          onDataCleaned(result, `Converted ${selectedColumn} to numeric`)
          break
        case "lowercase":
        case "uppercase":
        case "trim":
          result = processor.standardizeTypes(selectedColumn, "string")
          onDataCleaned(result, `Standardized ${selectedColumn} with ${standardizeOp} operation`)
          break
        default:
          result = processor.standardizeTypes(selectedColumn, "string")
          onDataCleaned(result, `Standardized ${selectedColumn}`)
      }
    } catch (error) {
      console.error("Cleaning failed:", error)
      alert("Failed to standardize data. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Wand2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Cleaning Actions</h2>
      </div>

      <div className="space-y-6">
        {/* Missing Values */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Handle Missing Values</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={missingStrategy} onValueChange={setMissingStrategy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remove">Remove Rows</SelectItem>
                <SelectItem value="mean">Fill with Mean</SelectItem>
                <SelectItem value="median">Fill with Median</SelectItem>
                <SelectItem value="mode">Fill with Mode</SelectItem>
                <SelectItem value="forward">Forward Fill</SelectItem>
                <SelectItem value="backward">Backward Fill</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleMissingValues} className="w-full">
              Apply
            </Button>
          </div>
        </div>

        {/* Remove Duplicates */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Remove Duplicates</h3>
          <Button onClick={handleRemoveDuplicates} variant="outline" className="w-full bg-transparent">
            <Trash className="h-4 w-4 mr-2" />
            Remove Duplicate Rows
          </Button>
        </div>

        {/* Standardize */}
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Standardize Data</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select value={selectedColumn} onValueChange={setSelectedColumn}>
              <SelectTrigger>
                <SelectValue placeholder="Select column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={standardizeOp} onValueChange={setStandardizeOp}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lowercase">Lowercase</SelectItem>
                <SelectItem value="uppercase">Uppercase</SelectItem>
                <SelectItem value="trim">Trim Whitespace</SelectItem>
                <SelectItem value="parse_date">Parse as Date</SelectItem>
                <SelectItem value="to_numeric">Convert to Number</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleStandardize} className="w-full">
              <Type className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
