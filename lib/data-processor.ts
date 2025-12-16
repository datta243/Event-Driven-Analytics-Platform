export interface DataStats {
  column: string
  missing: number
  unique: number
  dtype: string
  sample_values?: string[]
}

export interface DatasetInfo {
  dataset_id: string
  filename: string
  rows: number
  columns: number
  column_names: string[]
  preview: any[]
  stats: DataStats[]
}

export class DataProcessor {
  private data: any[] = []
  private filename = ""

  async parseFile(file: File): Promise<DatasetInfo> {
    this.filename = file.name
    const extension = file.name.split(".").pop()?.toLowerCase()

    switch (extension) {
      case "csv":
        return await this.parseCSV(file)
      case "json":
        return await this.parseJSON(file)
      case "xlsx":
      case "xls":
        return await this.parseExcel(file)
      default:
        throw new Error("Unsupported file format")
    }
  }

  private async parseCSV(file: File): Promise<DatasetInfo> {
    const text = await file.text()
    const lines = text.split("\n").filter((line) => line.trim())
    const headers = lines[0].split(",").map((h) => h.trim())

    this.data = lines.slice(1).map((line) => {
      const values = line.split(",")
      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || ""
      })
      return row
    })

    return this.generateDatasetInfo()
  }

  private async parseJSON(file: File): Promise<DatasetInfo> {
    const text = await file.text()
    this.data = JSON.parse(text)

    if (!Array.isArray(this.data)) {
      throw new Error("JSON must be an array of objects")
    }

    return this.generateDatasetInfo()
  }

  private async parseExcel(file: File): Promise<DatasetInfo> {
    // For demo purposes, treat as CSV-like structure
    // In production, you'd use a library like xlsx
    const text = await file.text()
    return this.parseCSV(file)
  }

  private generateDatasetInfo(): DatasetInfo {
    const datasetId = `dataset_${Date.now()}`
    const columnNames = this.data.length > 0 ? Object.keys(this.data[0]) : []
    const stats = this.calculateStats(columnNames)

    return {
      dataset_id: datasetId,
      filename: this.filename,
      rows: this.data.length,
      columns: columnNames.length,
      column_names: columnNames,
      preview: this.data.slice(0, 100),
      stats,
    }
  }

  private calculateStats(columns: string[]): DataStats[] {
    return columns.map((column) => {
      const values = this.data.map((row) => row[column])
      const missing = values.filter((v) => v === "" || v === null || v === undefined).length
      const unique = new Set(values.filter((v) => v !== "" && v !== null && v !== undefined)).size
      const dtype = this.inferType(values)
      const sample_values = Array.from(new Set(values.filter((v) => v !== "" && v !== null && v !== undefined))).slice(
        0,
        5,
      )

      return {
        column,
        missing,
        unique,
        dtype,
        sample_values,
      }
    })
  }

  private inferType(values: any[]): string {
    const nonEmpty = values.filter((v) => v !== "" && v !== null && v !== undefined)
    if (nonEmpty.length === 0) return "unknown"

    const sample = nonEmpty[0]
    if (!isNaN(Number(sample))) return "numeric"
    if (sample === "true" || sample === "false") return "boolean"
    return "string"
  }

  // Cleaning operations
  removeMissingValues(column?: string): { data: any[]; rows: number; stats: DataStats[] } {
    if (column) {
      this.data = this.data.filter((row) => {
        const value = row[column]
        return value !== "" && value !== null && value !== undefined
      })
    } else {
      this.data = this.data.filter((row) => {
        return Object.values(row).every((value) => value !== "" && value !== null && value !== undefined)
      })
    }

    return {
      data: this.data.slice(0, 100),
      rows: this.data.length,
      stats: this.calculateStats(Object.keys(this.data[0] || {})),
    }
  }

  fillMissingValues(
    column: string,
    strategy: "mean" | "median" | "mode" | "forward" | "backward",
  ): {
    data: any[]
    rows: number
    stats: DataStats[]
  } {
    const values = this.data.map((row) => row[column])
    let fillValue: any

    switch (strategy) {
      case "mean":
        const numericValues = values.filter((v) => !isNaN(Number(v))).map(Number)
        fillValue = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
        break
      case "median":
        const sorted = values
          .filter((v) => !isNaN(Number(v)))
          .map(Number)
          .sort((a, b) => a - b)
        fillValue = sorted[Math.floor(sorted.length / 2)]
        break
      case "mode":
        const counts: { [key: string]: number } = {}
        values.forEach((v) => {
          if (v !== "" && v !== null && v !== undefined) {
            counts[v] = (counts[v] || 0) + 1
          }
        })
        fillValue = Object.keys(counts).reduce((a, b) => (counts[a] > counts[b] ? a : b))
        break
      case "forward":
        let lastValue: any = null
        this.data = this.data.map((row) => {
          if (row[column] === "" || row[column] === null || row[column] === undefined) {
            row[column] = lastValue
          } else {
            lastValue = row[column]
          }
          return row
        })
        return {
          data: this.data.slice(0, 100),
          rows: this.data.length,
          stats: this.calculateStats(Object.keys(this.data[0] || {})),
        }
      case "backward":
        let nextValue: any = null
        this.data = this.data.reverse().map((row) => {
          if (row[column] === "" || row[column] === null || row[column] === undefined) {
            row[column] = nextValue
          } else {
            nextValue = row[column]
          }
          return row
        })
        this.data.reverse()
        return {
          data: this.data.slice(0, 100),
          rows: this.data.length,
          stats: this.calculateStats(Object.keys(this.data[0] || {})),
        }
    }

    this.data = this.data.map((row) => {
      if (row[column] === "" || row[column] === null || row[column] === undefined) {
        row[column] = fillValue
      }
      return row
    })

    return {
      data: this.data.slice(0, 100),
      rows: this.data.length,
      stats: this.calculateStats(Object.keys(this.data[0] || {})),
    }
  }

  removeDuplicates(): { data: any[]; rows: number; stats: DataStats[] } {
    const seen = new Set<string>()
    this.data = this.data.filter((row) => {
      const key = JSON.stringify(row)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    return {
      data: this.data.slice(0, 100),
      rows: this.data.length,
      stats: this.calculateStats(Object.keys(this.data[0] || {})),
    }
  }

  standardizeTypes(
    column: string,
    targetType: "numeric" | "string" | "boolean",
  ): {
    data: any[]
    rows: number
    stats: DataStats[]
  } {
    this.data = this.data.map((row) => {
      const value = row[column]

      switch (targetType) {
        case "numeric":
          row[column] = isNaN(Number(value)) ? 0 : Number(value)
          break
        case "string":
          row[column] = String(value)
          break
        case "boolean":
          row[column] = value === "true" || value === true
          break
      }

      return row
    })

    return {
      data: this.data.slice(0, 100),
      rows: this.data.length,
      stats: this.calculateStats(Object.keys(this.data[0] || {})),
    }
  }

  removeOutliers(column: string, method: "iqr" | "zscore"): { data: any[]; rows: number; stats: DataStats[] } {
    const values = this.data
      .map((row) => row[column])
      .filter((v) => !isNaN(Number(v)))
      .map(Number)

    if (method === "iqr") {
      values.sort((a, b) => a - b)
      const q1 = values[Math.floor(values.length * 0.25)]
      const q3 = values[Math.floor(values.length * 0.75)]
      const iqr = q3 - q1
      const lower = q1 - 1.5 * iqr
      const upper = q3 + 1.5 * iqr

      this.data = this.data.filter((row) => {
        const value = Number(row[column])
        return !isNaN(value) && value >= lower && value <= upper
      })
    } else {
      // Z-score method
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const std = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length)

      this.data = this.data.filter((row) => {
        const value = Number(row[column])
        if (isNaN(value)) return true
        const zscore = Math.abs((value - mean) / std)
        return zscore <= 3
      })
    }

    return {
      data: this.data.slice(0, 100),
      rows: this.data.length,
      stats: this.calculateStats(Object.keys(this.data[0] || {})),
    }
  }

  exportData(format: "csv" | "json"): Blob {
    if (format === "csv") {
      const headers = Object.keys(this.data[0] || {})
      const csv = [headers.join(","), ...this.data.map((row) => headers.map((header) => row[header]).join(","))].join(
        "\n",
      )
      return new Blob([csv], { type: "text/csv" })
    } else {
      return new Blob([JSON.stringify(this.data, null, 2)], { type: "application/json" })
    }
  }

  getData(): any[] {
    return this.data
  }
}
