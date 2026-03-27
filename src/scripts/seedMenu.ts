/**
 * Script para popular o banco de dados com os dados iniciais do cardápio.
 * Execute no console do navegador ou importe em uma página temporária.
 *
 * Uso: import { seedMenuData } from "@/scripts/seedMenu"; seedMenuData("STORE_ID");
 */

import { supabase } from "@/integrations/supabase/client";

const CATEGORIAS = [
  { id: "lanches", nome: "Lanches", icone: "beef", ordem: 0 },
  { id: "porcoes", nome: "Porções", icone: "popcorn", ordem: 1 },
  { id: "bebidas", nome: "Bebidas", icone: "cup-soda", ordem: 2 },
  { id: "sobremesas", nome: "Sobremesas", icone: "cake-slice", ordem: 3 },
  { id: "combos", nome: "Combos", icone: "package", ordem: 4 },
  { id: "promocoes", nome: "Promoções", icone: "flame", ordem: 5 },
];

const adicionaisLanche = [
  { id: "bacon", nome: "Bacon", preco: 5 },
  { id: "queijo-extra", nome: "Queijo extra", preco: 4 },
  { id: "ovo", nome: "Ovo", preco: 3 },
  { id: "cheddar", nome: "Cheddar", preco: 4 },
];

const ingredientesLanche = ["Cebola", "Alface", "Tomate", "Picles", "Molho"];

const adicionaisPorcao = [
  { id: "cheddar-p", nome: "Cheddar", preco: 6 },
  { id: "bacon-p", nome: "Bacon", preco: 5 },
];

const bebidasCombo = ["Coca-Cola 350ml", "Guaraná 350ml", "Suco Natural", "Água sem gás"];

const PRODUTOS = [
  { nome: "X-Burguer Clássico", descricao: "Hambúrguer artesanal 180g, queijo cheddar, alface e tomate", preco: 28.9, categoria_id: "lanches", imagem: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, etapas_fluxo: ["adicionais", "remover", "quantidade"], ordem: 0, setor: "cozinha" },
  { nome: "X-Bacon Especial", descricao: "Hambúrguer 200g com bacon crocante e queijo prato", preco: 34.9, categoria_id: "lanches", imagem: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, etapas_fluxo: ["adicionais", "remover", "quantidade"], ordem: 1, setor: "cozinha" },
  { nome: "Smash Burger Duplo", descricao: "Dois smash burgers com queijo derretido e molho especial", preco: 38.9, categoria_id: "lanches", imagem: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, etapas_fluxo: ["adicionais", "remover", "quantidade"], ordem: 2, setor: "cozinha" },
  { nome: "Frango Crocante", descricao: "Filé de frango empanado com maionese da casa", preco: 26.9, categoria_id: "lanches", imagem: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&h=300&fit=crop", ingredientes_removiveis: ["Alface", "Tomate", "Molho"], adicionais: adicionaisLanche, etapas_fluxo: ["adicionais", "remover", "quantidade"], ordem: 3, setor: "cozinha" },

  { nome: "Batata Frita", descricao: "Porção generosa de batata frita crocante com sal", preco: 22.9, categoria_id: "porcoes", imagem: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapas_fluxo: ["adicionais", "quantidade"], ordem: 4, setor: "cozinha" },
  { nome: "Onion Rings", descricao: "Anéis de cebola empanados e fritos", preco: 24.9, categoria_id: "porcoes", imagem: "https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapas_fluxo: ["adicionais", "quantidade"], ordem: 5, setor: "cozinha" },
  { nome: "Nuggets (12un)", descricao: "Nuggets de frango crocantes com molho barbecue", preco: 29.9, categoria_id: "porcoes", imagem: "https://images.unsplash.com/photo-1562967914-608f82629710?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapas_fluxo: ["adicionais", "quantidade"], ordem: 6, setor: "cozinha" },
  { nome: "Polenta Frita", descricao: "Palitos de polenta frita com parmesão", preco: 19.9, categoria_id: "porcoes", imagem: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapas_fluxo: ["adicionais", "quantidade"], ordem: 7, setor: "cozinha" },

  { nome: "Coca-Cola 350ml", descricao: "Refrigerante Coca-Cola lata gelada", preco: 7.9, categoria_id: "bebidas", imagem: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 8, setor: "bar" },
  { nome: "Suco Natural", descricao: "Suco de laranja natural 500ml", preco: 12.9, categoria_id: "bebidas", imagem: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 9, setor: "bar" },
  { nome: "Água Mineral", descricao: "Água mineral sem gás 500ml", preco: 4.9, categoria_id: "bebidas", imagem: "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 10, setor: "bar" },
  { nome: "Milkshake Chocolate", descricao: "Milkshake cremoso de chocolate 400ml", preco: 18.9, categoria_id: "bebidas", imagem: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 11, setor: "bar" },

  { nome: "Petit Gâteau", descricao: "Bolo de chocolate com sorvete de baunilha", preco: 24.9, categoria_id: "sobremesas", imagem: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 12, setor: "cozinha" },
  { nome: "Brownie com Sorvete", descricao: "Brownie quentinho com sorvete e calda", preco: 22.9, categoria_id: "sobremesas", imagem: "https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 13, setor: "cozinha" },
  { nome: "Churros (3un)", descricao: "Churros recheados com doce de leite", preco: 16.9, categoria_id: "sobremesas", imagem: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400&h=300&fit=crop", etapas_fluxo: ["quantidade"], ordem: 14, setor: "cozinha" },

  { nome: "Combo Clássico", descricao: "X-Burguer + batata frita + refrigerante", preco: 44.9, categoria_id: "combos", imagem: "https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, bebida_options: bebidasCombo, etapas_fluxo: ["adicionais", "bebida", "remover", "quantidade"], ordem: 15, setor: "cozinha" },
  { nome: "Combo Família", descricao: "2 lanches + porção grande + 2 bebidas", preco: 89.9, categoria_id: "combos", imagem: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, bebida_options: bebidasCombo, etapas_fluxo: ["adicionais", "bebida", "remover", "quantidade"], ordem: 16, setor: "cozinha" },
  { nome: "Combo Kids", descricao: "Mini burguer + nuggets + suco + sobremesa", preco: 34.9, categoria_id: "combos", imagem: "https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400&h=300&fit=crop", ingredientes_removiveis: ["Cebola", "Picles", "Molho"], adicionais: adicionaisLanche, bebida_options: ["Suco Natural", "Água sem gás"], etapas_fluxo: ["adicionais", "bebida", "remover", "quantidade"], ordem: 17, setor: "cozinha" },

  { nome: "2 por 1 Smash", descricao: "Leve 2 smash burgers pelo preço de 1!", preco: 38.9, categoria_id: "promocoes", imagem: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=400&h=300&fit=crop", ingredientes_removiveis: ingredientesLanche, adicionais: adicionaisLanche, etapas_fluxo: ["adicionais", "remover", "quantidade"], ordem: 18, setor: "cozinha" },
  { nome: "Happy Hour Porções", descricao: "Todas as porções com 30% de desconto até 19h", preco: 15.9, categoria_id: "promocoes", imagem: "https://images.unsplash.com/photo-1585109649139-366815a0d713?w=400&h=300&fit=crop", adicionais: adicionaisPorcao, etapas_fluxo: ["adicionais", "quantidade"], ordem: 19, setor: "cozinha" },
];

export async function seedMenuData(storeId: string) {
  console.log("🌱 Iniciando seed do cardápio para store:", storeId);

  // 1. Insert categories
  const catRows = CATEGORIAS.map((c) => ({
    nome: c.nome,
    icone: c.icone,
    ordem: c.ordem,
    store_id: storeId,
  }));

  const { error: catError } = await supabase.from("restaurant_categories").insert(catRows as any);
  if (catError) {
    console.error("❌ Erro ao inserir categorias:", catError);
    return;
  }
  console.log(`✅ ${catRows.length} categorias inseridas`);

  // 2. Fetch inserted categories to get real UUIDs mapped by nome
  const { data: insertedCats } = await supabase
    .from("restaurant_categories")
    .select("id, nome")
    .eq("store_id", storeId);

  const catMap = new Map<string, string>();
  for (const cat of insertedCats ?? []) {
    // Map old slug id to new UUID
    const match = CATEGORIAS.find((c) => c.nome === cat.nome);
    if (match) catMap.set(match.id, cat.id);
  }

  // 3. Insert products
  const prodRows = PRODUTOS.map((p) => ({
    store_id: storeId,
    nome: p.nome,
    descricao: p.descricao,
    preco: p.preco,
    categoria_id: catMap.get(p.categoria_id) ?? p.categoria_id,
    imagem: p.imagem,
    ingredientes_removiveis: (p as any).ingredientes_removiveis ?? [],
    adicionais: (p as any).adicionais ?? [],
    etapas_fluxo: p.etapas_fluxo,
    bebida_options: (p as any).bebida_options ?? [],
    tipo_options: [],
    embalagem_options: [],
    grupos: [],
    ordem: p.ordem,
    setor: p.setor,
    ativo: true,
    removido: false,
    disponivel_delivery: true,
    permite_levar: false,
  }));

  const { error: prodError } = await supabase.from("produtos").insert(prodRows as any);
  if (prodError) {
    console.error("❌ Erro ao inserir produtos:", prodError);
    return;
  }
  console.log(`✅ ${prodRows.length} produtos inseridos`);
  console.log("🎉 Seed completo!");
}
