/**
 * Server-safe major metadata.
 *
 * This file intentionally has no "use client" directive and no React imports so
 * it can be used from `sitemap.ts`, metadata generators and static pages.
 * `lib/useMajor.ts` re-exports the same list for client components.
 */

export type MajorKey =
  | "data_science"
  | "computer_science"
  | "cybersecurity"
  | "game_design"
  | "electrical_engineering"
  | "energy_engineering"
  | "industrial_engineering"
  | "mechanical_engineering";

export interface Major {
  key: MajorKey;
  label: string;
  description: string;
  icon: string;
  color: string;
  school: "Engineering" | "Computing";
}

export const MAJOR_LIST: Major[] = [
  {
    key: "data_science",
    label: "Data Science & AI",
    description: "Machine Learning, Analytics, and Artificial Intelligence",
    icon: "🧠",
    color: "from-blue-500 to-purple-600",
    school: "Computing",
  },
  {
    key: "computer_science",
    label: "Computer Science",
    description: "Software Engineering, Algorithms, and Systems",
    icon: "💻",
    color: "from-emerald-500 to-teal-600",
    school: "Computing",
  },
  {
    key: "cybersecurity",
    label: "Cybersecurity",
    description: "Network Security, Ethical Hacking, and Cryptography",
    icon: "🔐",
    color: "from-orange-500 to-red-600",
    school: "Computing",
  },
  {
    key: "game_design",
    label: "Game Design",
    description: "Game Mechanics, Graphics, and Interactive Design",
    icon: "🎮",
    color: "from-pink-500 to-rose-600",
    school: "Computing",
  },
  {
    key: "electrical_engineering",
    label: "Electrical Engineering",
    description: "Power Systems, Electronics, and Control Systems",
    icon: "⚡",
    color: "from-yellow-400 to-amber-500",
    school: "Engineering",
  },
  {
    key: "energy_engineering",
    label: "Energy Engineering",
    description: "Renewable Energy, Power Generation, and Sustainability",
    icon: "🔋",
    color: "from-lime-500 to-emerald-600",
    school: "Engineering",
  },
  {
    key: "industrial_engineering",
    label: "Industrial Engineering",
    description: "Optimization, Logistics, and Manufacturing Systems",
    icon: "🏭",
    color: "from-slate-400 to-gray-500",
    school: "Engineering",
  },
  {
    key: "mechanical_engineering",
    label: "Mechanical Engineering",
    description: "Thermodynamics, Robotics, and Machine Design",
    icon: "⚙️",
    color: "from-blue-500 to-indigo-600",
    school: "Engineering",
  },
];

/** URL slug for a major key: `computer_science` -> `computer-science`. */
export function majorSlug(key: MajorKey): string {
  return key.replaceAll("_", "-");
}

/** Reverse of `majorSlug`; returns null for unknown slugs. */
export function majorFromSlug(slug: string): Major | null {
  const normalized = slug.replaceAll("-", "_");
  return MAJOR_LIST.find((major) => major.key === normalized) ?? null;
}

export const MAJOR_KEYS = MAJOR_LIST.map((major) => major.key);
