export interface Badge {
  slug: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
}

export const BADGES: Badge[] = [
  {
    slug: "active_member",
    label: "Active Member",
    description: "Posted your first update to the Live Feed",
    icon: "⚡",
    color: "text-yellow-400",
    bg: "bg-yellow-900/30",
    border: "border-yellow-700",
  },
  {
    slug: "community_pro",
    label: "Community Pro",
    description: "10 posts to the community",
    icon: "🏆",
    color: "text-orange-400",
    bg: "bg-orange-900/30",
    border: "border-orange-700",
  },
  {
    slug: "verified_contributor",
    label: "Verified Contributor",
    description: "20 posts within 60 days — earns 10% off verification",
    icon: "🎯",
    color: "text-green-400",
    bg: "bg-green-900/30",
    border: "border-green-700",
  },
  {
    slug: "profile_champion",
    label: "Profile Champion",
    description: "Trade Card 100% complete",
    icon: "⭐",
    color: "text-blue-400",
    bg: "bg-blue-900/30",
    border: "border-blue-700",
  },
  {
    slug: "networked",
    label: "Networked",
    description: "Made your first connection on the platform",
    icon: "🤝",
    color: "text-purple-400",
    bg: "bg-purple-900/30",
    border: "border-purple-700",
  },
];

export function getBadgeBySlug(slug: string): Badge | undefined {
  return BADGES.find(b => b.slug === slug);
}
