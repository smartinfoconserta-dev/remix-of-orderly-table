import bannerAvisos from "@/assets/banner-avisos-obsidian.jpg";
import bannerCombo from "@/assets/banner-combo-obsidian.jpg";
import bannerHappyHour from "@/assets/banner-happyhour-obsidian.jpg";
import bannerInstagram from "@/assets/banner-instagram-obsidian-v2.jpg";

export interface HomeHeroSlide {
  id: string;
  image: string;
  label: string;
  title: string;
  description: string;
  price: string;
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
    title: "Combo Família",
    description: "2 lanches, porção generosa e 2 bebidas para compartilhar.",
    price: "R$ 69,90",
    alt: "Banner promocional de combo família do restaurante",
  },
  {
    id: "happy-hour",
    image: bannerHappyHour,
    label: "Promoções",
    title: "Happy Hour da Casa",
    description: "Petiscos selecionados com drinks em oferta por tempo limitado.",
    price: "R$ 39,90",
    alt: "Banner promocional de happy hour com porções e drinks",
  },
  {
    id: "instagram",
    image: bannerInstagram,
    label: "Mais pedidos",
    title: "Burger Signature",
    description: "Pão brioche, burger artesanal, cheddar e fritas crocantes.",
    price: "R$ 32,90",
    alt: "Banner promocional de hambúrguer artesanal com fritas",
  },
  {
    id: "avisos",
    image: bannerAvisos,
    label: "Destaque",
    title: "Executivo do Dia",
    description: "Prato completo com acompanhamento e bebida em condição especial.",
    price: "R$ 28,90",
    alt: "Banner promocional do prato executivo do dia",
  },
];

export const homeShowcaseConfig: HomeShowcaseConfig = {
  featuredLabel: "Mais pedidos",
  featuredTitle: "Favoritos da casa",
};

export const HOME_CAROUSEL_INTERVAL_MS = 4000;
