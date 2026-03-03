import * as React from 'react'
import { cn } from '@/lib/utils'

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label?: string
  showValue?: boolean
  onValueChange?: (value: number) => void
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, showValue = true, onValueChange, ...props }, ref) => {
    return (
      <div className="flex items-center gap-3">
        {label && <span className="text-sm text-muted-foreground whitespace-nowrap">{label}</span>}
        <input
          type="range"
          ref={ref}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full bg-secondary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow',
            className
          )}
          onChange={(e) => onValueChange?.(Number(e.target.value))}
          {...props}
        />
        {showValue && (
          <span className="text-sm text-muted-foreground tabular-nums w-8 text-right">
            {props.value ?? props.defaultValue}
          </span>
        )}
      </div>
    )
  }
)
Slider.displayName = 'Slider'

export { Slider }
