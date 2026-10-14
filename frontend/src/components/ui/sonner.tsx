import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4 shrink-0 text-[#2e7d32] dark:text-[#4ade80]" />
        ),
        info: (
          <InfoIcon className="size-4 shrink-0 text-[#0284c7] dark:text-[#38bdf8]" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4 shrink-0 text-[#b45309] dark:text-[#fbbf24]" />
        ),
        error: (
          <OctagonXIcon className="size-4 shrink-0 text-[#c0453c] dark:text-[#f87171]" />
        ),
        loading: (
          <Loader2Icon className="size-4 shrink-0 animate-spin text-primary" />
        ),
      }}
      toastOptions={{
        classNames: {
          toast: "group toast",
          error:
            "!text-[#c0453c] dark:!text-[#f87171] [&_[data-title]]:!text-[#c0453c] dark:[&_[data-title]]:!text-[#f87171] [&_[data-description]]:!text-[#c0453c]/90 dark:[&_[data-description]]:!text-[#f87171]/90 [&_[data-icon]]:!text-[#c0453c] dark:[&_[data-icon]]:!text-[#f87171] [&_svg]:!text-[#c0453c] dark:[&_svg]:!text-[#f87171]",
          success:
            "!text-[#2e7d32] dark:!text-[#4ade80] [&_[data-title]]:!text-[#2e7d32] dark:[&_[data-title]]:!text-[#4ade80] [&_[data-description]]:!text-[#2e7d32]/90 dark:[&_[data-description]]:!text-[#4ade80]/90 [&_[data-icon]]:!text-[#2e7d32] dark:[&_[data-icon]]:!text-[#4ade80] [&_svg]:!text-[#2e7d32] dark:[&_svg]:!text-[#4ade80]",
          warning:
            "!text-[#b45309] dark:!text-[#fbbf24] [&_[data-title]]:!text-[#b45309] dark:[&_[data-title]]:!text-[#fbbf24] [&_[data-description]]:!text-[#b45309]/90 dark:[&_[data-description]]:!text-[#fbbf24]/90 [&_[data-icon]]:!text-[#b45309] dark:[&_[data-icon]]:!text-[#fbbf24] [&_svg]:!text-[#b45309] dark:[&_svg]:!text-[#fbbf24]",
          info:
            "!text-[#0284c7] dark:!text-[#38bdf8] [&_[data-title]]:!text-[#0284c7] dark:[&_[data-title]]:!text-[#38bdf8] [&_[data-description]]:!text-[#0284c7]/90 dark:[&_[data-description]]:!text-[#38bdf8]/90 [&_[data-icon]]:!text-[#0284c7] dark:[&_[data-icon]]:!text-[#38bdf8] [&_svg]:!text-[#0284c7] dark:[&_svg]:!text-[#38bdf8]",
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
