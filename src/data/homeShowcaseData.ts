import bannerCombo from "@/assets/banner-combo-obsidian.jpg";
import bannerHappyHour from "@/assets/banner-happyhour-obsidian.jpg";
import bannerWifi from "@/assets/banner-wifi-obsidian.jpg";
import bannerInstagram from "@/assets/banner-instagram-obsidian-v2.jpg";

export interface HomeHeroSlide {
  id: string;
  image: string;
  label: string;
  alt: string;
}

export interface HomeShowcaseConfig {
  featuredLabel: string;
  featuredTitle: string;
}

export const homeHeroSlides: HomeHeroSlide[] = [
  {
    id: "combo",
    image: bannerCombo,
    label: "Combos",
    alt: "Banner de combo premium do restaurante",
  },
  {
    id: "happy-hour",
    image: bannerHappyHour,
    label: "Promoções",
    alt: "Banner de porções e drinks em destaque",
  },
  {
    id: "wifi",
    image: bannerWifi,
    label: "Wi‑Fi",
    alt: "Banner do ambiente do restaurante com informação visual de Wi‑Fi",
  },
  {
    id: "instagram",
    image: bannerInstagram,
    label: "Instagram",
    alt: "Banner visual da vitrine gastronômica do restaurante",
  },
];

export const homeShowcaseConfig: HomeShowcaseConfig = {
  featuredLabel: "Mais pedidos",
  featuredTitle: "Favoritos da casa",
};

export const HOME_CAROUSEL_INTERVAL_MS = 4000;
