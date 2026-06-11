import type { SVGProps } from 'react'

/**
 * GitHub Octocat icon.
 *
 * Why hand-rolled SVG instead of `lucide-react`'s `Github`? lucide-react
 * 1.x removed the brand icon set (Github, Gitlab, etc.) to avoid trademark
 * issues, so it is no longer exported. This component matches lucide's
 * interface (`size`, `strokeWidth`, `color`, `...rest`) so existing call
 * sites can keep passing the same props.
 *
 * Source path is the standard Octocat silhouette, MIT, public domain.
 */
export function Github({
  size = 24,
  // lucide's icons are stroke-based; this one is fill-based. The
  // strokeWidth prop is accepted for API compatibility but ignored.
  strokeWidth: _strokeWidth,
  color = 'currentColor',
  fill = 'currentColor',
  ...rest
}: SVGProps<SVGSVGElement> & {
  size?: number
  strokeWidth?: number
  color?: string
  fill?: string
}) {
  void _strokeWidth
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill === 'currentColor' ? color : fill}
      color={color}
      role="img"
      aria-hidden="true"
      {...rest}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.27-.01-1.16-.02-2.11-3.2.69-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.25 5.68.41.36.78 1.06.78 2.13 0 1.54-.01 2.78-.01 3.16 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z" />
    </svg>
  )
}

export default Github
