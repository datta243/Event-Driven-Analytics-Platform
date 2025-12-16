"use client"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Clock, CheckCircle2, XCircle } from "lucide-react"

interface ActivityLogProps {
  activities: Array<{
    id: string
    action: string
    timestamp: Date
    status: "success" | "error"
    details?: string
  }>
}

export function ActivityLog({ activities }: ActivityLogProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Activity Log</h2>
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No activities yet</div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50">
                <div className="mt-0.5">
                  {activity.status === "success" ? (
                    <CheckCircle2 className="h-4 w-4 text-chart-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{activity.action}</div>
                  {activity.details && <div className="text-xs text-muted-foreground mt-1">{activity.details}</div>}
                  <div className="text-xs text-muted-foreground mt-1">{activity.timestamp.toLocaleTimeString()}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  )
}
