"use client"

import { Card } from "@/components/ui/card"
import { Activity, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ProcessingDashboardProps {
  stats: Record<string, any>
  totalRows: number
  totalColumns: number
}

export function ProcessingDashboard({ stats, totalRows, totalColumns }: ProcessingDashboardProps) {
  // Calculate data quality metrics
  const calculateDataQuality = () => {
    const columns = Object.values(stats)
    const totalCells = totalRows * totalColumns
    let missingCells = 0
    const duplicateRows = 0

    columns.forEach((col: any) => {
      missingCells += col.missing_count
    })

    const qualityScore = ((totalCells - missingCells) / totalCells) * 100

    return {
      qualityScore: qualityScore.toFixed(1),
      missingCells,
      completeness: qualityScore,
    }
  }

  const quality = calculateDataQuality()
  const columnsWithIssues = Object.values(stats).filter(
    (col: any) => col.missing_count > 0 || col.duplicate_count > 0,
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Data Quality Dashboard</h2>
      </div>

      {/* Quality Score */}
      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Overall Quality Score</div>
            <div className="text-3xl font-bold text-foreground">{quality.qualityScore}%</div>
          </div>
          <div
            className={`h-12 w-12 rounded-full flex items-center justify-center ${
              Number.parseFloat(quality.qualityScore) >= 90
                ? "bg-chart-2/20"
                : Number.parseFloat(quality.qualityScore) >= 70
                  ? "bg-chart-3/20"
                  : "bg-destructive/20"
            }`}
          >
            {Number.parseFloat(quality.qualityScore) >= 90 ? (
              <CheckCircle className="h-6 w-6 text-chart-2" />
            ) : Number.parseFloat(quality.qualityScore) >= 70 ? (
              <TrendingUp className="h-6 w-6 text-chart-3" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-destructive" />
            )}
          </div>
        </div>
        <Progress value={quality.completeness} className="h-2" />
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Missing Cells</div>
          <div className="text-2xl font-bold text-foreground">{quality.missingCells.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {((quality.missingCells / (totalRows * totalColumns)) * 100).toFixed(2)}% of total
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Columns with Issues</div>
          <div className="text-2xl font-bold text-foreground">{columnsWithIssues}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {((columnsWithIssues / totalColumns) * 100).toFixed(0)}% of columns
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Data Completeness</div>
          <div className="text-2xl font-bold text-foreground">{quality.qualityScore}%</div>
          <div className="text-xs text-muted-foreground mt-1">Ready for analysis</div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-muted-foreground mb-1">Total Data Points</div>
          <div className="text-2xl font-bold text-foreground">{(totalRows * totalColumns).toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">{totalRows.toLocaleString()} rows</div>
        </Card>
      </div>

      {/* Column Health Overview */}
      <Card className="p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Column Health Overview</h3>
        <div className="space-y-3">
          {Object.values(stats)
            .slice(0, 5)
            .map((col: any) => {
              const healthScore = 100 - col.missing_percentage
              return (
                <div key={col.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground font-medium">{col.name}</span>
                    <span className="text-xs text-muted-foreground">{healthScore.toFixed(1)}% complete</span>
                  </div>
                  <Progress value={healthScore} className="h-1.5" />
                </div>
              )
            })}
        </div>
      </Card>
    </div>
  )
}
