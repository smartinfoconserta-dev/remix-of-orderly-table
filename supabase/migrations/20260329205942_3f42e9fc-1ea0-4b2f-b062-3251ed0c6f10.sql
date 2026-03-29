-- Add anon SELECT policies for Realtime to work with operational (PIN) sessions
CREATE POLICY "pedidos_anon_read" ON public.pedidos FOR SELECT TO anon USING (true);
CREATE POLICY "fechamentos_anon_read" ON public.fechamentos FOR SELECT TO anon USING (true);
CREATE POLICY "estado_caixa_anon_read" ON public.estado_caixa FOR SELECT TO anon USING (true);
CREATE POLICY "movimentacoes_caixa_anon_read" ON public.movimentacoes_caixa FOR SELECT TO anon USING (true);
CREATE POLICY "eventos_anon_read" ON public.eventos_operacionais FOR SELECT TO anon USING (true);

-- Add missing tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE eventos_operacionais;
ALTER PUBLICATION supabase_realtime ADD TABLE movimentacoes_caixa;