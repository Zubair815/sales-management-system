export default function Skeleton({
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-lg',
  className = '',
  ariaLabel = 'Loading content',
}) {
  const containerClasses = [
    'relative overflow-hidden bg-slate-200',
    width,
    height,
    rounded,
    className,
  ].filter(Boolean).join(' ')

  const shimmerClasses = [
    'absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent',
    rounded,
    'motion-reduce:hidden',
  ].join(' ')

  return (
    <div className={containerClasses} role="status" aria-label={ariaLabel}>
      <div className={shimmerClasses} aria-hidden="true" />
    </div>
  )
}
