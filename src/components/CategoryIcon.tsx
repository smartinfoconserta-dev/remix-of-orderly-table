import {
  Beef, Beer, CakeSlice, Coffee, CupSoda, Flame, House, Leaf, Package,
  Pizza, Popcorn, Star, Tag, Sandwich, IceCream, Wine,
  Cherry, Apple, Croissant, Egg, Fish,
  Cookie, Milk, GlassWater, Citrus, Wheat, UtensilsCrossed, ChefHat,
  Grape, Candy, Martini, ShoppingBag, Heart, Sparkles,
  Zap, Crown, Gift, Percent, Clock, ThumbsUp, Ban,
} from "lucide-react";

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
  // New icons
  "ice-cream": IceCream,
  wine: Wine,
  cherry: Cherry,
  apple: Apple,
  croissant: Croissant,
  egg: Egg,
  fish: Fish,
  cookie: Cookie,
  milk: Milk,
  "glass-water": GlassWater,
  citrus: Citrus,
  wheat: Wheat,
  utensils: UtensilsCrossed,
  "chef-hat": ChefHat,
  grape: Grape,
  candy: Candy,
  martini: Martini,
  "shopping-bag": ShoppingBag,
  heart: Heart,
  sparkles: Sparkles,
  zap: Zap,
  crown: Crown,
  gift: Gift,
  percent: Percent,
  clock: Clock,
  "thumbs-up": ThumbsUp,
  ban: Ban,
};

export const availableIcons = Object.keys(iconMap);

export const iconGroups = [
  { label: "Comidas", icons: ["burger", "pizza", "beef", "fish", "egg", "croissant", "wheat", "flame"] },
  { label: "Doces & Sobremesas", icons: ["cake", "cookie", "candy", "ice-cream", "cherry", "grape"] },
  { label: "Bebidas", icons: ["coffee", "beer", "wine", "martini", "cup-soda", "milk", "glass-water", "citrus"] },
  { label: "Especiais", icons: ["star", "sparkles", "crown", "heart", "gift", "percent", "zap", "thumbs-up", "clock"] },
  { label: "Outros", icons: ["utensils", "chef-hat", "leaf", "shopping-bag", "box", "tag", "popcorn", "ban", "apple"] },
];

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
