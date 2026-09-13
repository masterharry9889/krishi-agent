import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md text-sm font-medium transition-colors select-none outline-none disabled:pointer-events-none disabled:opacity-45 focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 active:scale-[0.99] cursor-pointer [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90 active:bg-primary/95",
        outline:
          "border border-border bg-background shadow-2xs hover:bg-secondary hover:text-foreground active:bg-muted text-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/90",
        ghost:
          "hover:bg-secondary hover:text-foreground text-foreground/80 active:bg-muted",
        destructive:
          "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 active:bg-destructive/20",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto font-normal",
        accent:
          "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/95 shadow-xs font-semibold",
      },
      size: {
        default: "h-8.5 px-3 py-1.5 gap-1.5 text-xs sm:text-sm",
        xs: "h-6 px-2 text-[11px] gap-1 rounded",
        sm: "h-7.5 px-2.5 text-xs gap-1.5 rounded",
        lg: "h-10 px-4 text-sm gap-2 rounded-md font-medium",
        icon: "size-8.5 p-0",
        "icon-xs": "size-6 p-0 rounded",
        "icon-sm": "size-7.5 p-0 rounded",
        "icon-lg": "size-10 p-0 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
