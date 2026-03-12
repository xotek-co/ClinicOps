"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SortableHeaderProps {
  label: string
  column: string
  currentSort: string | null
  ascending: boolean
  onSort: (column: string, ascending: boolean) => void
  className?: string
}

export function SortableHeader({
  label,
  column,
  currentSort,
  ascending,
  onSort,
  className,
}: SortableHeaderProps) {
  const isActive = currentSort === column
  const handleClick = () => {
    if (isActive) {
      onSort(column, !ascending)
    } else {
      onSort(column, true)
    }
  }
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle font-semibold text-muted-foreground [&:has([role=checkbox])]:pr-0 cursor-pointer select-none hover:text-foreground transition-colors",
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          ascending ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50" />
        )}
      </div>
    </th>
  )
}
