-- Atualiza o tema padrão já gravado para a paleta atual do relatório.
update public.configuracoes_escritorio
set cores_tema = jsonb_build_object(
  'primaria', '#0E2A47',
  'secundaria', '#F0A202',
  'fundo', '#E7EEF6',
  'texto', '#142033',
  'destaque', '#1565C0'
)
where id = 1
  and coalesce(cores_tema ->> 'primaria', '') in ('#1C2430', '#143F45', '#143f45');
