import type { SVGProps } from 'react';

type GithubIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/**
 * GitHub mark icon.
 *
 * lucide-react removed brand icons (including `Github`) in v1.x, so we ship a
 * small inline SVG that is API-compatible with the lucide icon usage
 * (`<Github size={20} />`, `<Github className="w-4 h-4" />`).
 */
export function GithubIcon({ size = 24, className, ...props }: GithubIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12 .5C5.37.5 0 5.78 0 12.29c0 5.21 3.44 9.63 8.21 11.19.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.72-4.04-1.59-4.04-1.59-.55-1.38-1.34-1.75-1.34-1.75-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.23 1.84 1.23 1.07 1.8 2.81 1.28 3.5.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.31-5.47-5.84 0-1.29.47-2.34 1.23-3.17-.12-.3-.53-1.51.12-3.15 0 0 1-.32 3.3 1.21a11.6 11.6 0 0 1 6 0c2.28-1.53 3.29-1.21 3.29-1.21.65 1.64.24 2.85.12 3.15.77.83 1.23 1.88 1.23 3.17 0 4.54-2.81 5.53-5.49 5.83.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12.04 12.04 0 0 0 24 12.29C24 5.78 18.63.5 12 .5z" />
    </svg>
  );
}
