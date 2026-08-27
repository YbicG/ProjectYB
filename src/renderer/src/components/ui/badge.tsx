import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@renderer/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-zinc-50 text-zinc-900 hover:bg-zinc-50/80",
        secondary: "border-transparent bg-zinc-800 text-zinc-50 hover:bg-zinc-800/80",
        destructive: "border-transparent bg-red-500 text-zinc-50 hover:bg-red-500/80",
        outline: "text-zinc-50 border-zinc-800",
        success: "border-transparent bg-green-500 text-zinc-950 hover:bg-green-500/80",
        warning: "border-transparent bg-yellow-500 text-zinc-950 hover:bg-yellow-500/80",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
