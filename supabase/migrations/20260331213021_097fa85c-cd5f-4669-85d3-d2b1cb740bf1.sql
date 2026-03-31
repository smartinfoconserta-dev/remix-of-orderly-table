UPDATE restaurant_config rc
SET plano = mc.plano_modulos,
    updated_at = now()
FROM master_clientes mc
JOIN stores s ON lower(s.name) = lower(mc.nome_restaurante)
WHERE rc.store_id = s.id
  AND mc.plano_modulos IS NOT NULL
  AND mc.plano_modulos != ''
  AND rc.plano != mc.plano_modulos;

UPDATE restaurant_license rl
SET plano = mc.plano_modulos,
    updated_at = now()
FROM master_clientes mc
JOIN stores s ON lower(s.name) = lower(mc.nome_restaurante)
WHERE rl.store_id = s.id
  AND mc.plano_modulos IS NOT NULL
  AND mc.plano_modulos != ''
  AND rl.plano != mc.plano_modulos;