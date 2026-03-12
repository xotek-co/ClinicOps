import * as React from "react"
import { cn } from "@/lib/utils"

export function TableContainer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("overflow-x-auto rounded-lg", className)}
      {...props}
    />
  )
}
