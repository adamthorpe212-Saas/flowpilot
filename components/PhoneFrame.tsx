import type { ReactNode } from "react";

/**
 * Bare phone bezel. Sizing is always passed in by the caller so the same frame
 * can sit inside the lifecycle ring on the home page and stand full height on
 * /how-it-works.
 */
export default function PhoneFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[1.75rem] border border-white/25 bg-black ${className}`}
    >
      <div className="flex h-4 flex-none items-center justify-center">
        <div className="h-1 w-8 rounded-full bg-white/25" />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
