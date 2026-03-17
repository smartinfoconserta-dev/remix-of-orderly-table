import { Beef, CupSoda, CakeSlice, Package, Flame, CircleDot } from "lucide-react";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  beef: Beef,
  "french-fries": CircleDot, // Lucide has no fries icon; using a neutral fallback
  "cup-soda": CupSoda,
  "cake-slice": CakeSlice,
  package: Package,
  flame: Flame,
};

interface Props {
  name: string;
  className?: string;
}

const CategoryIcon = ({ name, className = "w-5 h-5" }: Props) => {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon className={className} />;
};

export default CategoryIcon;
