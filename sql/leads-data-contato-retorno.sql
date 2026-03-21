-- Campos opcionais no CRM: primeiro contato (data completa) e retorno (data; compara-se só dia/mês no app).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_contato date;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS data_retorno date;

COMMENT ON COLUMN leads.data_contato IS 'Data em que o vendedor entrou em contato pela primeira vez (opcional).';
COMMENT ON COLUMN leads.data_retorno IS 'Data de retorno; o aviso dispara quando dia e mês coincidem com hoje (ano ignorado no app).';
