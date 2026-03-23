/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FlowOption {
  txt: string;
  next?: number | string;
}

export interface FlowStep {
  cat: string;
  q: string;
  type: 'single' | 'multi' | 'text' | 'final';
  options?: FlowOption[];
  next?: number | string;
}

export const FLOW_DATA: Record<string | number, FlowStep> = {
  10: {
    cat: "INFORMAÇÕES GERAIS",
    q: "INFORMAÇÕES GERAIS",
    type: "info" as any,
    options: [
      { txt: "1. DATA DO SERVIÇO" },
      { txt: "2. BLOCO" },
      { txt: "3. EQUIPE" },
      { txt: "4. SUPERINTENDÊNCIA" },
      { txt: "5. PROTOCOLO DE ORIGEM" },
      { txt: "6. QUAL CÓDIGO/DESCRIÇÃO DE SERVIÇO?" },
      { txt: "7. MATRÍCULA" },
      { txt: "8. BAIRRO" },
      { txt: "9. CIDADE" },
      { txt: "10. PARECER" }
    ],
    next: 11
  },
  11: {
    cat: "STATUS DO SERVIÇO",
    q: "11. STATUS DA EXECUÇÃO",
    type: "single",
    options: [
      { txt: "EXEC", next: 13 },
      { txt: "EXOC", next: 12 }
    ]
  },
  12: {
    cat: "STATUS DO SERVIÇO",
    q: "12. MOTIVO DO ENCERRAMENTO COM OCORRÊNCIA",
    type: "single",
    options: [
      { txt: "ÁREA DE RISCO", next: 13 },
      { txt: "AMEAÇA AO COLABORADOR", next: 13 },
      { txt: "CHUVA", next: 13 },
      { txt: "CLIENTE AUSENTE", next: 13 },
      { txt: "DUPLICIDADE", next: 13 },
      { txt: "ENDEREÇO NÃO LOCALIZADO", next: 13 },
      { txt: "HD INTERNO IMÓVEL FECHADO", next: 13 },
      { txt: "IMÓVEL DEMOLIDO / LOTE VAGO", next: 13 },
      { txt: "IMÓVEL DESOCUPADO", next: 13 },
      { txt: "LOCAL DESABASTECIDO", next: 13 },
      { txt: "LIGAÇÃO NÃO EXISTENTE", next: 13 },
      { txt: "MORADOR IMPEDIU", next: 13 },
      { txt: "NADA A FAZER", next: 13 },
      { txt: "RETORNAR DEPOIS", next: 13 },
      { txt: "SERVIÇO JÁ EXECUTADO", next: 13 },
      { txt: "SUSPENSO", next: 13 },
      { txt: "IMÓVEL À VENDA/ALUGUEL", next: 13 },
      { txt: "INVIABILIDADE TÉCNICA", next: 13 },
      { txt: "COMPROVOU PAGAMENTO", next: 13 },
      { txt: "UTILIZA POÇO", next: 13 }
    ]
  },
  13: {
    cat: "IMÓVEL",
    q: "13. SITUAÇÃO DO IMÓVEL?",
    type: "single",
    options: [
      { txt: "ALUGUEL/VENDA", next: 14 },
      { txt: "DEMOLIDO", next: 14 },
      { txt: "DESABITADO", next: 14 },
      { txt: "FECHADO/VAZIO", next: 14 },
      { txt: "HABITADO", next: 16 },
      { txt: "NÃO INFORMADO PELA EQUIPE", next: 16 }
    ]
  },
  14: {
    cat: "IMÓVEL",
    q: "14. A SITUAÇÃO DO IMÓVEL ESTÁ CORRETA?",
    type: "single",
    options: [
      { txt: "SIM", next: 15 },
      { txt: "NÃO", next: 15 }
    ]
  },
  15: {
    cat: "IMÓVEL",
    q: "15. EXISTEM INDÍCIOS?",
    type: "single",
    options: [
      { txt: "IMÓVEL EM ESTADO DE ABANDONO", next: 16 },
      { txt: "IMÓVEL EM RUÍNAS", next: 16 },
      { txt: "LOCAL FECHADO", next: 16 },
      { txt: "LOCAL EM OBRAS", next: 16 },
      { txt: "LOTE VAGO", next: 16 },
      { txt: "SEM INDÍCIOS", next: 16 },
      { txt: "PLACA DE ALUGUEL/VENDA", next: 16 }
    ]
  },
  16: {
    cat: "CLIENTE",
    q: "16. SITUAÇÃO DO CLIENTE",
    type: "single",
    options: [
      { txt: "CLIENTE PRESENTE", next: 19 },
      { txt: "CLIENTE AUSENTE", next: 17 },
      { txt: "CLIENTE ATRITADO/IMPEDIU EXECUÇÃO", next: 18 }
    ]
  },
  17: {
    cat: "CLIENTE",
    q: "17. PROCEDIMENTOS ADOTADOS",
    type: "single",
    options: [
      { txt: "ESCAVAÇÃO", next: 19 },
      { txt: "ENTREGA DE COMUNICADO", next: 19 },
      { txt: "NENHUMA DAS ANTERIORES", next: 19 }
    ]
  },
  18: {
    cat: "CLIENTE",
    q: "18. ETAPA IMPEDIDA",
    type: "single",
    options: [
      { txt: "TESTE DPD", next: 19 },
      { txt: "ESCAVAÇÃO", next: 19 },
      { txt: "EXECUÇÃO COMPLETA", next: 19 }
    ]
  },
  19: {
    cat: "HIDRÔMETRO",
    q: "19. LOCAL POSSUI HIDRÔMETRO?",
    type: "single",
    options: [
      { txt: "SIM", next: 20 },
      { txt: "NÃO", next: 25 },
      { txt: "EQUIPE NÃO TEVE ACESSO AO HD", next: 28 }
    ]
  },
  20: {
    cat: "HIDRÔMETRO",
    q: "20. LOCAL DA INSTALAÇÃO DO HD",
    type: "single",
    options: [
      { txt: "INTERNO", next: 21 },
      { txt: "EXTERNO", next: 21 }
    ]
  },
  21: {
    cat: "HIDRÔMETRO",
    q: "21. ALGUMA IRREGULARIDADE NO HIDRÔMETRO?",
    type: "single",
    options: [
      { txt: "SIM", next: 22 },
      { txt: "NÃO", next: 22 }
    ]
  },
  22: {
    cat: "HIDRÔMETRO",
    q: "22. HIDRÔMETRO POSSUI AVARIA?",
    type: "single",
    options: [
      { txt: "SIM", next: 23 },
      { txt: "NÃO", next: 27 }
    ]
  },
  23: {
    cat: "HIDRÔMETRO",
    q: "23. TIPO DE AVARIA",
    type: "single",
    options: [
      { txt: "CÚPULA FURADA", next: 24 },
      { txt: "CÚPULA QUEBRADA", next: 24 },
      { txt: "CÚPULA EMBAÇADA", next: 24 },
      { txt: "ÍMÃ", next: 24 },
      { txt: "HD TRAVADO", next: 24 },
      { txt: "HD DESCONECTADO", next: 24 }
    ]
  },
  24: {
    cat: "HIDRÔMETRO",
    q: "24. FOI AVARIADO PELO CLIENTE?",
    type: "single",
    options: [
      { txt: "SIM", next: 25 },
      { txt: "NÃO", next: 25 }
    ]
  },
  25: {
    cat: "HIDRÔMETRO",
    q: "25. HIDRÔMETRO FOI SUBSTITUÍDO?",
    type: "single",
    options: [
      { txt: "SIM", next: 26 },
      { txt: "NÃO", next: 27 }
    ]
  },
  26: {
    cat: "HIDRÔMETRO",
    q: "26. TIPO DE SUBSTITUIÇÃO",
    type: "single",
    options: [
      { txt: "COM CUSTO", next: 27 },
      { txt: "SEM CUSTO", next: 27 }
    ]
  },
  27: {
    cat: "HIDRÔMETRO",
    q: "27. LOCALIZAÇÃO DO RAMAL",
    type: "single",
    options: [
      { txt: "DIREITA", next: 28 },
      { txt: "ESQUERDA", next: 28 },
      { txt: "CENTRO", next: 28 },
      { txt: "NÃO LOCALIZADO", next: 28 }
    ]
  },
  28: {
    cat: "FONTE DE ABASTECIMENTO",
    q: "28. FONTE DE ABASTECIMENTO",
    type: "single",
    options: [
      { txt: "IRREGULARIDADE/BYPASS", next: 31 },
      { txt: "LIGAÇÃO NORMAL", next: 31 },
      { txt: "CAMINHÃO PIPA", next: 29 },
      { txt: "NASCENTE", next: 31 },
      { txt: "POÇO", next: 31 },
      { txt: "POÇO COMPARTILHADO", next: 31 },
      { txt: "TERCEIROS", next: 31 },
      { txt: "NÃO INFORMADO", next: 31 }
    ]
  },
  29: {
    cat: "FONTE DE ABASTECIMENTO",
    q: "29. COMPROVAÇÃO DO CAMINHÃO PIPA?",
    type: "single",
    options: [
      { txt: "SIM", next: 30 },
      { txt: "NÃO", next: 30 }
    ]
  },
  30: {
    cat: "FONTE DE ABASTECIMENTO",
    q: "30. TIPO DE CAMINHÃO PIPA",
    type: "single",
    options: [
      { txt: "ÁGUAS DO RIO", next: 31 },
      { txt: "TERCEIROS", next: 31 }
    ]
  },
  31: {
    cat: "TESTE DPD",
    q: "31. TESTE DPD",
    type: "single",
    options: [
      { txt: "POSITIVO", next: 32 },
      { txt: "NEGATIVO", next: 32 },
      { txt: "NÃO REALIZADO", next: 32 }
    ]
  },
  32: {
    cat: "ESCAVAÇÃO",
    q: "32. ESCAVAÇÃO FOI FEITA CORRETAMENTE?",
    type: "single",
    options: [
      { txt: "SIM", next: 34 },
      { txt: "NÃO", next: 33 },
      { txt: "ESCAVAÇÃO NÃO NECESSÁRIA", next: 33 }
    ]
  },
  33: {
    cat: "ESCAVAÇÃO",
    q: "33. MOTIVOS DA NÃO ESCAVAÇÃO",
    type: "single",
    options: [
      { txt: "IMPEDIMENTO DO MORADOR", next: 36 },
      { txt: "GRANDE CIRCULAÇÃO", next: 36 },
      { txt: "PAVIMENTOS ESPECIAIS", next: 36 },
      { txt: "OBJETO IMPEDINDO", next: 36 },
      { txt: "NENHUMA ESCAVAÇÃO", next: 36 },
      { txt: "DESVIO TÉCNICO", next: 36 }
    ]
  },
  34: {
    cat: "ESCAVAÇÃO",
    q: "34. TIPO DE ESCAVAÇÃO",
    type: "single",
    options: [
      { txt: "1 VALA", next: 35 },
      { txt: "2 VALAS", next: 35 },
      { txt: "3 VALAS", next: 35 },
      { txt: "VALA CONTÍNUA", next: 35 }
    ]
  },
  35: {
    cat: "ESCAVAÇÃO",
    q: "35. PROFUNDIDADE FOI SUFICIENTE?",
    type: "single",
    options: [
      { txt: "SIM", next: 36 },
      { txt: "NÃO", next: 36 }
    ]
  },
  36: {
    cat: "IRREGULARIDADE",
    q: "36. IRREGULARIDADE IDENTIFICADA?",
    type: "single",
    options: [
      { txt: "SIM", next: 37 },
      { txt: "NÃO", next: 41 }
    ]
  },
  37: {
    cat: "IRREGULARIDADE",
    q: "37. TIPO DE IRREGULARIDADE",
    type: "single",
    options: [
      { txt: "BY-PASS", next: 38 },
      { txt: "CAMINHÃO PIPA", next: 38 },
      { txt: "TERCEIROS", next: 38 },
      { txt: "HIDRÔMETRO", next: 38 },
      { txt: "LIGAÇÃO CLANDESTINA", next: 38 },
      { txt: "CORTE VIOLADO", next: 38 }
    ]
  },
  38: {
    cat: "IRREGULARIDADE",
    q: "38. FOI APLICADO TERMO?",
    type: "single",
    options: [
      { txt: "SIM", next: 39 },
      { txt: "NÃO", next: 41 }
    ]
  },
  39: {
    cat: "IRREGULARIDADE",
    q: "39. TERMO PREENCHIDO CORRETAMENTE?",
    type: "single",
    options: [
      { txt: "SIM", next: 41 },
      { txt: "NÃO", next: 40 }
    ]
  },
  40: {
    cat: "IRREGULARIDADE",
    q: "40. INCONFORMIDADES",
    type: "multi",
    options: [
      { txt: "DOCUMENTO RASURADO" },
      { txt: "MOTIVO INCORRETO" }
    ],
    next: 41
  },
  41: {
    cat: "NEGOCIAÇÃO",
    q: "41. HOUVE NEGOCIAÇÃO?",
    type: "single",
    options: [
      { txt: "SIM", next: 42 },
      { txt: "NÃO", next: 45 }
    ]
  },
  42: {
    cat: "NEGOCIAÇÃO",
    q: "42. COMUNICADO FOI DEIXADO?",
    type: "single",
    options: [
      { txt: "SIM", next: 43 },
      { txt: "NÃO", next: 43 }
    ]
  },
  43: {
    cat: "NEGOCIAÇÃO",
    q: "43. ORDEM DE RELIGAÇÃO GERADA?",
    type: "single",
    options: [
      { txt: "SIM", next: 44 },
      { txt: "NÃO", next: 44 }
    ]
  },
  44: {
    cat: "NEGOCIAÇÃO",
    q: "44. COMPROVANTE ANEXADO?",
    type: "single",
    options: [
      { txt: "SIM", next: 45 },
      { txt: "NÃO", next: 45 }
    ]
  },
  45: {
    cat: "DESDOBROS",
    q: "45. DESDOBROS CORRETOS?",
    type: "single",
    options: [
      { txt: "SIM", next: 47 },
      { txt: "NÃO", next: 46 }
    ]
  },
  46: {
    cat: "DESDOBROS",
    q: "46. ERROS DE DESDOBRO",
    type: "multi",
    options: [
      { txt: "EXCESSO" },
      { txt: "FALTA" },
      { txt: "INCORRETO" }
    ],
    next: 47
  },
  47: {
    cat: "DESDOBROS",
    q: "47. NECESSÁRIO RECOMPOSIÇÃO?",
    type: "single",
    options: [
      { txt: "SIM", next: 48 },
      { txt: "NÃO", next: 49 }
    ]
  },
  48: {
    cat: "DESDOBROS",
    q: "48. TIPO DE PAVIMENTAÇÃO",
    type: "single",
    options: [
      { txt: "CALÇADA FISCALIZAÇÃO", next: 49 },
      { txt: "CALÇADA CORTE", next: 49 },
      { txt: "ASFALTO", next: 49 },
      { txt: "BLOCO/PARALELO", next: 49 },
      { txt: "CERÂMICA", next: 49 }
    ]
  },
  49: {
    cat: "DESDOBROS",
    q: "49. ALTERAÇÃO CADASTRAL?",
    type: "single",
    options: [
      { txt: "SIM", next: 50 },
      { txt: "NÃO", next: 50 }
    ]
  },
  50: {
    cat: "ANÁLISE",
    q: "50. EXECUÇÃO DO SERVIÇO",
    type: "single",
    options: [
      { txt: "CORRETA", next: 52 },
      { txt: "INCORRETA", next: 51 }
    ]
  },
  51: {
    cat: "ANÁLISE",
    q: "51. INCONFORMIDADES",
    type: "multi",
    options: [
      { txt: "ERRO NO PADRÃO DE FOTOS" },
      { txt: "NÃO ESCAVOU" },
      { txt: "NÃO FEZ TESTE DPD" },
      { txt: "SERVIÇO ERRADO" }
    ],
    next: 52
  },
  52: {
    cat: "ANÁLISE",
    q: "52. PARECER TÉCNICO",
    type: "text",
    next: 53
  },
  53: {
    cat: "CONCLUSÃO",
    q: "53. SITUAÇÃO FINAL",
    type: "single",
    options: [
      { txt: "ATIVO", next: 54 },
      { txt: "NEGOCIADO", next: 54 },
      { txt: "CORTADO", next: 54 },
      { txt: "INCONCLUSIVO", next: 54 }
    ]
  },
  54: {
    cat: "CONCLUSÃO",
    q: "54. SEGUNDA VISITA?",
    type: "single",
    options: [
      { txt: "SIM", next: 55 },
      { txt: "NÃO", next: "final" }
    ]
  },
  55: {
    cat: "CONCLUSÃO",
    q: "55. INSTRUÇÕES SEGUNDA VISITA",
    type: "text",
    next: "final"
  },
  final: {
    cat: "FINAL",
    q: "FINAL DO FORMULÁRIO",
    type: "final"
  }
};
