# Servidor do Trainer Pro Studio (Supabase)

Projeto: `trainer-pro-studio` (ref `dzmgbvyffxtcjsdpedqb`, São Paulo).
As migrações foram aplicadas nesta ordem pelo painel/MCP do Supabase:

1. `initial_schema` – tabelas `items`, `student_access`, `workout_logs`, `access_attempts`, bucket `slides`
2. `fix_attempt_counting` – funções do aluno devolvem erro em JSON (a tentativa errada fica registrada)
3. `fix_check_access_ip_var` – correção de variável em `check_access`
4. `slides_storage_select_policy` – política de leitura do bucket para o upload com `upsert`

O estado final está em `schema.sql`.

## Como funciona
- **Personal**: conta por e-mail/senha (Supabase Auth). Os dados do app (programas, alunos, perfil,
  ajustes) ficam em `items` (um JSON por registro), protegidos por RLS (`owner = auth.uid()`).
- **Aluno**: não cria conta. Entra com o código de 8 caracteres gerado pelo personal
  (`student_access`). As funções `student_open`, `student_save_log` e `student_delete_log`
  validam o código (ativo, dentro da validade) e limitam a 20 tentativas erradas por IP por hora.
- **Acompanhamento**: o aluno grava em `workout_logs` só pelas funções; o personal lê via RLS.
- **Slides importados de PDF**: imagens no bucket público `slides`, pasta do personal.

## Configuração pendente no painel
Authentication → Sign In / Providers → Email → desligar **Confirm email**
(ou configurar um SMTP próprio). Sem isso, personais novos precisam confirmar o e-mail,
e o SMTP padrão do Supabase só entrega para membros da equipe do projeto.
