"use client";

// Reusable avatar — shows photo if available, initials fallback.
// size classes follow Tailwind: "sm"=8, "md"=12, "lg"=16, "xl"=20 (rem units)

interface Props {
  avatarUrl?: string | null;
  initials: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP = {
  sm:  "w-8 h-8 text-xs",
  md:  "w-10 h-10 text-sm",
  lg:  "w-14 h-14 text-lg",
  xl:  "w-20 h-20 text-2xl",
};

export default function AvatarImage({ avatarUrl, initials, size = "md", className = "" }: Props) {
  const sizeClass = SIZE_MAP[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={initials}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full bg-orange-600/20 border-2 border-orange-600/40 flex items-center justify-center font-black text-orange-400 flex-shrink-0 ${className}`}>
      {initials.slice(0, 2).toUpperCase()}
    </div>
  );
}
