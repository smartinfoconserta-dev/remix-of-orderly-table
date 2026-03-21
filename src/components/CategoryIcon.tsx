import { Beef, Beer, CakeSlice, Coffee, CupSoda, Flame, House, Leaf, Package, Pizza, Popcorn, Star, Tag, Sandwich } from "lucide-react";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  house: House,
  home: House,
  beef: Beef,
  burger: Sandwich,
  popcorn: Popcorn,
  "cup-soda": CupSoda,
  "cake-slice": CakeSlice,
  cake: CakeSlice,
  package: Package,
  box: Package,
  flame: Flame,
  pizza: Pizza,
  coffee: Coffee,
  beer: Beer,
  star: Star,
  leaf: Leaf,
  tag: Tag,
};

export const availableIcons = Object.keys(iconMap);

interface Props {
  name: string;
  className?: string;
}

const CategoryIcon = ({ name, className = "w-5 h-5" }: Props) => {
  const Icon = iconMap[name];
  if (!Icon) return <Tag className={className} />;
  return <Icon className={className} />;
};

export default CategoryIcon;