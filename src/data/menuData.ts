export interface Adicional {
  id: string;
  nome: string;
  preco: number;
}

export interface OpcaoGrupo {
  id: string;
  nome: string;
  preco: number; // 0 = grátis
}

export interface GrupoPersonalizacao {
  id: string;
  nome: string;
  obrigatorio: boolean;
  opcoes: OpcaoGrupo[];
}

export type ProductStep = "adicionais" | "bebida" | "remover" | "tipo" | "embalagem" | "quantidade";

export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  imagem: string;
  ingredientesRemoviveis?: string[];
  adicionais?: Adicional[];
  etapasFluxo?: ProductStep[];
  bebidaOptions?: string[];
  tipoOptions?: string[];
  embalagemOptions?: string[];
  grupos?: GrupoAdicional[];
}

export interface Categoria {
  id: string;
  nome: string;
  icone: string;
}

export interface HomeQuickLink {
  categoriaId: string;
  label: string;
  title: string;
}

export interface HomeSectionConfig {
  hero: {
    kicker: string;
    title: string;
    description: string;
    highlight: string;
  };
  quickLinks: HomeQuickLink[];
  wifi: {
    enabled: boolean;
    title: string;
    networkLabel: string;
    passwordLabel: string;
  };
  instagram: {
    enabled: boolean;
    title: string;
    handle: string;
    description: string;
    cta: string;
  };
  notice: {
    title: string;
    description: string;
    helper: string;
  };
  bulletin: {
    title: string;
    items: string[];
  };
}

export const categorias: Categoria[] = [
  { id: "lanches", nome: "Lanches", icone: "beef" },
  { id: "porcoes", nome: "Porções", icone: "popcorn" },
  { id: "bebidas", nome: "Bebidas", icone: "cup-soda" },
  { id: "sobremesas", nome: "Sobremesas", icone: "cake-slice" },
  { id: "combos", nome: "Combos", icone: "package" },
  { id: "promocoes", nome: "Promoções", icone: "flame" },
];

export const homeSectionContent: HomeSectionConfig = {
  hero: {
    kicker: "Boas-vindas",
    title: "Peça com calma, veja os destaques e escolha o melhor momento da casa.",
    description:
      "Esta área inicial foi preparada para virar uma vitrine editável do restaurante, com promoções, avisos, conectividade e canais oficiais.",
    highlight: "Casa aberta • pedidos saindo rápido",
  },
  quickLinks: [
    { categoriaId: "promocoes", label: "Aproveite agora", title: "Promoções do dia" },
    { categoriaId: "combos", label: "Mais pedidos", title: "Combos completos" },
    { categoriaId: "lanches", label: "Clássicos", title: "Lanches da casa" },
  ],
  wifi: {
    enabled: true,
    title: "Conecte-se ao Wi‑Fi",
    networkLabel: "Rede: OBSIDIAN_GUEST",
    passwordLabel: "Senha: mesa+numero",
  },
  instagram: {
    enabled: true,
    title: "Acompanhe a loja",
    handle: "@obsidian.burger",
    description: "Novidades, promoções relâmpago e bastidores da cozinha publicados diariamente.",
    cta: "Escaneie ou procure o perfil para seguir.",
  },
  notice: {
    title: "Atendimento direto e cardápio sempre visível",
    description:
      "Use esta tela como ponto de entrada do salão: promoções, mensagens da casa e atalhos rápidos para categorias com maior giro.",
    helper: "Se precisar, toque em “Chamar Garçom” a qualquer momento.",
  },
  bulletin: {
    title: "Avisos importantes de hoje",
    items: [
      "Happy hour de porções até 19h.",
      "Milkshake em produção limitada nesta noite.",
      "Tempo médio atual de preparo: 18 a 25 minutos.",
    ],
  },
};

const adicionaisLanche: Adicional[] = [
  { id: "bacon", nome: "Bacon", preco: 5 },
  { id: "queijo-extra", nome: "Queijo extra", preco: 4 },
  { id: "ovo", nome: "Ovo", preco: 3 },
  { id: "cheddar", nome: "Cheddar", preco: 4 },
];

const ingredientesLanche = ["Cebola", "Alface", "Tomate", "Picles", "Molho"];

const adicionaisPorcao: Adicional[] = [
  { id: "cheddar-p", nome: "Cheddar", preco: 6 },
  { id: "bacon-p", nome: "Bacon", preco: 5 },
];

const bebidasCombo = ["Coca-Cola 350ml", "Guaraná 350ml", "Suco Natural", "Água sem gás"];

export const produtos: Produto[] = [
  { id: "l1", nome: "X-Burguer Clássico", descricao: "Hambúrguer artesanal 180g, queijo cheddar, alface e tomate", preco: 28.9, categoria: "lanches", imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, etapasFluxo: ["adicionais", "remover", "quantidade"] },
  { id: "l2", nome: "X-Bacon Especial", descricao: "Hambúrguer 200g com bacon crocante e queijo prato", preco: 34.9, categoria: "lanches", imagem: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, etapasFluxo: ["adicionais", "remover", "quantidade"] },
  { id: "l3", nome: "Smash Burger Duplo", descricao: "Dois smash burgers com queijo derretido e molho especial", preco: 38.9, categoria: "lanches", imagem: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, etapasFluxo: ["adicionais", "remover", "quantidade"] },
  { id: "l4", nome: "Frango Crocante", descricao: "Filé de frango empanado com maionese da casa", preco: 26.9, categoria: "lanches", imagem: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop", ingredientesRemoviveis: ["Alface", "Tomate", "Molho"], adicionais: adicionaisLanche, etapasFluxo: ["adicionais", "remover", "quantidade"] },

  { id: "p1", nome: "Batata Frita", descricao: "Porção generosa de batata frita crocante com sal", preco: 22.9, categoria: "porcoes", imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapasFluxo: ["adicionais", "quantidade"] },
  { id: "p2", nome: "Onion Rings", descricao: "Anéis de cebola empanados e fritos", preco: 24.9, categoria: "porcoes", imagem: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapasFluxo: ["adicionais", "quantidade"] },
  { id: "p3", nome: "Nuggets (12un)", descricao: "Nuggets de frango crocantes com molho barbecue", preco: 29.9, categoria: "porcoes", imagem: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapasFluxo: ["adicionais", "quantidade"] },
  { id: "p4", nome: "Polenta Frita", descricao: "Palitos de polenta frita com parmesão", preco: 19.9, categoria: "porcoes", imagem: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapasFluxo: ["adicionais", "quantidade"] },

  { id: "b1", nome: "Coca-Cola 350ml", descricao: "Refrigerante Coca-Cola lata gelada", preco: 7.9, categoria: "bebidas", imagem: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },
  { id: "b2", nome: "Suco Natural", descricao: "Suco de laranja natural 500ml", preco: 12.9, categoria: "bebidas", imagem: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },
  { id: "b3", nome: "Água Mineral", descricao: "Água mineral sem gás 500ml", preco: 4.9, categoria: "bebidas", imagem: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },
  { id: "b4", nome: "Milkshake Chocolate", descricao: "Milkshake cremoso de chocolate 400ml", preco: 18.9, categoria: "bebidas", imagem: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },

  { id: "s1", nome: "Petit Gâteau", descricao: "Bolo de chocolate com sorvete de baunilha", preco: 24.9, categoria: "sobremesas", imagem: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },
  { id: "s2", nome: "Brownie com Sorvete", descricao: "Brownie quentinho com sorvete e calda", preco: 22.9, categoria: "sobremesas", imagem: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },
  { id: "s3", nome: "Churros (3un)", descricao: "Churros recheados com doce de leite", preco: 16.9, categoria: "sobremesas", imagem: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop", etapasFluxo: ["quantidade"] },

  { id: "c1", nome: "Combo Clássico", descricao: "X-Burguer + batata frita + refrigerante", preco: 44.9, categoria: "combos", imagem: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, bebidaOptions: bebidasCombo, etapasFluxo: ["adicionais", "bebida", "remover", "quantidade"] },
  { id: "c2", nome: "Combo Família", descricao: "2 lanches + porção grande + 2 bebidas", preco: 89.9, categoria: "combos", imagem: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, bebidaOptions: bebidasCombo, etapasFluxo: ["adicionais", "bebida", "remover", "quantidade"] },
  { id: "c3", nome: "Combo Kids", descricao: "Mini burguer + nuggets + suco + sobremesa", preco: 34.9, categoria: "combos", imagem: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=300&fit=crop", ingredientesRemoviveis: ["Cebola", "Picles", "Molho"], adicionais: adicionaisLanche, bebidaOptions: ["Suco Natural", "Água sem gás"], etapasFluxo: ["adicionais", "bebida", "remover", "quantidade"] },

  { id: "pr1", nome: "2 por 1 Smash", descricao: "Leve 2 smash burgers pelo preço de 1!", preco: 38.9, categoria: "promocoes", imagem: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", ingredientesRemoviveis: ingredientesLanche, adicionais: adicionaisLanche, etapasFluxo: ["adicionais", "remover", "quantidade"] },
  { id: "pr2", nome: "Happy Hour Porções", descricao: "Todas as porções com 30% de desconto até 19h", preco: 15.9, categoria: "promocoes", imagem: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapasFluxo: ["adicionais", "quantidade"] },
];

export const banners = [
  {
    id: "b1",
    titulo: "Combo Família",
    subtitulo: "2 lanches + porção + 2 bebidas por apenas",
    destaque: "R$ 89,90",
    cor: "from-white/10 to-white/[0.03]",
  },
  {
    id: "b2",
    titulo: "2 por 1 Smash",
    subtitulo: "Toda terça e quinta",
    destaque: "Aproveite!",
    cor: "from-white/[0.07] to-white/[0.02]",
  },
  {
    id: "b3",
    titulo: "Happy Hour",
    subtitulo: "Porções com 30% OFF até 19h",
    destaque: "Imperdível",
    cor: "from-white/[0.08] to-white/[0.03]",
  },
];
