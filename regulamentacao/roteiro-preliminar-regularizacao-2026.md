# GiraPrêmios — roteiro preliminar de regularização da distribuição de brindes
**Data da pesquisa:** 15/10/2026  
**Situação:** documento preparatório, não é aprovação, autorização, protocolo nem regulamento aprovado.  
**Site:** https://girapremios.vercel.app/

## 1. Enquadramento que precisa ser confirmado
A proposta é uma plataforma gratuita na qual o participante pode realizar giros virtuais. Todos receberiam um benefício, porém brindes físicos limitados, oferecidos por apoiadores, seriam atribuídos a alguns participantes conforme a mecânica da roleta.

**Ponto de atenção:** distribuir moedas virtuais ou um benefício a todos não afasta a aleatoriedade usada para escolher quem recebe o brinde físico escasso. Orientação atual da SPA: benefícios e descontos objetivos concedidos a todos, em regra, dispensam autorização SOMENTE quando não há sorte, aleatoriedade, competição nem limitação de estoque promocional.

Segundo a SPA, operações assemelhadas a vale-brinde não podem definir contemplados por método randômico. Portanto, NÃO presumir que a roleta aleatória programada, como concebida, possa ser autorizada sem adaptações. É preciso definir, com orientação do órgão e assessor jurídico, modalidade e forma de apuração apropriadas.

Base: https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/promocoes-comerciais/54-programas-de-fidelidade-descontos
https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/promocoes-comerciais/o-que-e-operacao-assemelhada

## 2. Caminho formal
1. Identificar a **pessoa jurídica elegível** que será promotora/requerente: [PENDENTE — titular, CNPJ, atividade, documentação e comprovação fiscal]. Pessoa física/CPF isolado não pode solicitar autorização para promoção comercial.
2. Se a ação envolver apoiadores como promotores conjuntamente, verificar estrutura de promoção coletiva, mandatária e adesões formais. A simples doação/venda de um produto para premiação não torna automaticamente sua marca aderente.
3. Definir modalidade de promoção e regras com a Secretaria de Prêmios e Apostas (SPA) e assessoria jurídica: critérios de participação, seleção, brindes, estoque, cronograma, auditoria, impedimentos, entrega, proteção dos dados pessoais e tratamento de falhas.
4. Consolidar relação de prêmios: nome, valor, quantidade, apoiador/proprietário, comprovação de aquisição/doação, estoque e forma de entrega. Verificar elegibilidade dos itens.
5. Preparar plano de operação e regulamento ao consumidor, documentação societária e fiscal, comprovante de pagamento da taxa e, quando cabível, termos de adesão.
6. Protocolar pedido no SCPC e acompanhar exigências. **Não ativar sorteio ou distribuição aleatória de brindes antes da autorização aplicável e publicação do regulamento e certificado.**
7. Se autorizado, implementar tecnicamente a mecânica EXATA aprovada, com registros e controles auditáveis, antes do lançamento.

Portal do SCPC: https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/scpc
FAQ e procedimentos: https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/

## 3. Prazos e custos oficiais (sujeitos à revisão)
Regra geral: apresentar pedido 40 a 120 dias antes do início. Possibilidade de redução a critério do órgão, **não garantida**. Prazo decisório citado pela SPA: até 30 dias após o pedido, ressalvadas suspensões.
Taxa varia de acordo com valor total dos prêmios: até R$ 1.000: R$ 34; R$ 1.000,01–5.000: R$ 166; R$ 5.000,01–10.000: R$ 334; demais faixas consultar a SPA.
Fontes:
https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/promocoes-comerciais/qual-o-prazo-para-pedir-autorizacao
https://www.gov.br/fazenda/pt-br/composicao/orgaos/secretaria-de-premios-e-apostas/promocao-comercial/promocao-comercial/promocoes-comerciais/o-que-e-onde-e-como-pagar-a-taxa-de-autorizacao

## 4. Informações que faltam
- Titular da promoção: [CNPJ próprio, CNPJ de apoiador ou ainda nenhum?]
- Natureza da pessoa jurídica: [PENDENTE].
- O benefício na roleta exige compra, doação ou é gratuito? [PROJETO ATUAL: gratuito, confirmar].
- Cidades/estados de atuação: [PENDENTE].
- Prazo desejado para iniciar: [PENDENTE].
- Catálogo dos brindes físicos, valor e quantidades: [PENDENTE].
- Quem entrega cada brinde e como comprovar propriedade: [PENDENTE].
- Uso exato das moedas: [FUTURA TROCA POR BENEFÍCIOS, sem dinheiro; regras pendentes].
- Validação da modalidade e mecânica (sem sorteio randômico vedado em certas modalidades): [PENDENTE].

## 5. Estado técnico verificado no GiraPrêmios
- Painel administrativo em V2.8: permite cadastrar foto, quantidade, apoiador, data de início e término, mínimo de giros anteriores, chance planejada, limite diário e limite por participante.
- Configurações de chance são SOMENTE planejamento; não se aplicam à roleta demonstrativa.
- Backend de giros V2.6: consumo transacional de um giro virtual e resultado ilustrativo, sem crédito de prêmio.
- **A existência dessas configurações não constitui autorização ou conformidade legal.**

## 6. Versão rápida sem distribuição aleatória
É possível operar a comunidade, os apoiadores, os giros meramente recreativos e a concessão objetiva, não aleatória, de benefícios uniformes (por exemplo, desconto digital definido e amplamente disponível a quem cumpra o critério publicado), após revisão dos termos. **Evitar incluir brindes físicos limitados e moedas obtidas aleatoriamente como se fossem automaticamente isentos.**

## 7. Consulta técnica sugerida à SPA
Destinatário divulgado em FAQ oficial: promcomercial.autorizacao@fazenda.gov.br.
Assunto: Consulta sobre enquadramento de roleta digital gratuita com benefício universal e brindes limitados.
Questões:
- Qual modalidade é aplicável quando uma roleta digital oferece um benefício geral a todos e brindes limitados a alguns participantes?
- Um algoritmo de chance por giro é admitido nessa modalidade? Se não, qual modalidade/mecanismo de apuração é adequado?
- A atribuição de moedas virtuais acumuláveis para futura troca por brindes altera o enquadramento?
- Uma empresa apoiadora elegível pode figurar como promotora? Quais documentos e regras são necessários se houver várias participantes?
- É possível solicitar redução do prazo inicial de protocolo e em quais condições?

**Não enviado:** este arquivo é apenas preparação. A consulta e o protocolo dependem de informações, autorização do titular e acesso ao canal oficial.
