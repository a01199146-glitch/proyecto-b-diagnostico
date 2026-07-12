(function defineDiagnosticConfig(global) {
  "use strict";

  const option = (value, label, score) => ({ value, label, score });

  const sections = [
    {
      id: "contexto",
      title: "Contexto del negocio",
      description: "Información general para presentar el resultado con el contexto correcto.",
      questions: [
        {
          id: "q1_businessType",
          number: 1,
          text: "¿Cuál describe mejor el giro principal del negocio?",
          options: [
            option("comercio", "Comercio o venta de productos"),
            option("servicios", "Servicios"),
            option("alimentos", "Alimentos y bebidas"),
            option("manufactura", "Manufactura o transformación"),
            option("otro", "Otro")
          ]
        },
        {
          id: "q2_teamSize",
          number: 2,
          text: "¿Cuántas personas trabajan habitualmente en el negocio?",
          options: [
            option("1_5", "1 a 5"),
            option("6_15", "6 a 15"),
            option("16_50", "16 a 50"),
            option("mas_50", "Más de 50")
          ]
        },
        {
          id: "q3_mainConcern",
          number: 3,
          text: "¿Cuál es hoy la principal preocupación operativa?",
          concern: true,
          options: [
            option("ventas", "No se tiene suficiente control de las ventas", 1),
            option("inventario", "Hay problemas con existencias o inventario", 1),
            option("procesos", "El trabajo depende demasiado de cómo lo hace cada persona", 1),
            option("costos", "No están claros los costos o márgenes", 1),
            option("tiempos", "Hay retrasos o tiempos de espera", 1),
            option("clientes", "Falta seguimiento a clientes u oportunidades", 1)
          ]
        }
      ]
    },
    {
      id: "ventas",
      title: "Ventas",
      description: "Registro y visibilidad del desempeño comercial.",
      questions: [
        {
          id: "q4_salesRecord",
          number: 4,
          category: "ventas",
          text: "¿Cómo se registran las ventas?",
          options: [
            option("centralizado", "En un sistema o archivo único, actualizado y revisado", 0),
            option("incompleto", "En un archivo único, pero con retrasos o datos incompletos", 1),
            option("disperso", "En varios archivos, libretas o mensajes", 2),
            option("sin_registro", "No existe un registro consistente", 3)
          ]
        },
        {
          id: "q5_salesVisibility",
          number: 5,
          category: "ventas",
          text: "¿Con qué claridad se puede saber qué productos o servicios venden más?",
          options: [
            option("claro", "Se consulta con datos actualizados", 0),
            option("manual", "Se puede calcular, pero requiere trabajo manual", 1),
            option("aproximado", "Solo existe una idea aproximada", 2),
            option("desconocido", "No se puede determinar", 3)
          ]
        }
      ]
    },
    {
      id: "inventario",
      title: "Inventario",
      description: "Exactitud de existencias y frecuencia de incidentes.",
      questions: [
        {
          id: "q6_inventoryAccuracy",
          number: 6,
          category: "inventario",
          text: "¿Qué tan confiable es la cantidad registrada frente a la existencia real?",
          options: [
            option("confiable", "Coincide casi siempre y se verifica", 0),
            option("diferencias_menores", "Hay diferencias menores ocasionales", 1),
            option("diferencias_frecuentes", "Hay diferencias frecuentes", 2),
            option("sin_control", "No existe un registro confiable", 3)
          ]
        },
        {
          id: "q7_inventoryIncidents",
          number: 7,
          category: "inventario",
          text: "¿Con qué frecuencia hay faltantes, compras urgentes o exceso de inventario?",
          options: [
            option("casi_nunca", "Casi nunca", 0),
            option("mensual", "Una o dos veces al mes", 1),
            option("semanal", "Todas las semanas", 2),
            option("muy_frecuente", "Varias veces por semana", 3)
          ]
        }
      ]
    },
    {
      id: "procesos",
      title: "Procesos",
      description: "Estandarización del trabajo y presencia de reprocesos.",
      questions: [
        {
          id: "q8_processDocumentation",
          number: 8,
          category: "procesos",
          text: "¿Qué tan documentadas están las actividades principales?",
          options: [
            option("documentadas", "Están documentadas y el equipo las sigue", 0),
            option("parciales", "Algunas están documentadas", 1),
            option("verbales", "Se explican verbalmente y varían entre personas", 2),
            option("sin_estandar", "No hay una forma de trabajo definida", 3)
          ]
        },
        {
          id: "q9_reworkFrequency",
          number: 9,
          category: "procesos",
          text: "¿Con qué frecuencia se repite trabajo por errores, omisiones o instrucciones poco claras?",
          options: [
            option("casi_nunca", "Casi nunca", 0),
            option("mensual", "Una o dos veces al mes", 1),
            option("semanal", "Todas las semanas", 2),
            option("muy_frecuente", "Varias veces por semana", 3)
          ]
        }
      ]
    },
    {
      id: "costos",
      title: "Costos",
      description: "Actualización de costos y conocimiento del margen.",
      questions: [
        {
          id: "q10_costUpdate",
          number: 10,
          category: "costos",
          text: "¿Qué tan actualizados están los costos de los productos o servicios?",
          options: [
            option("actualizados", "Están actualizados y se revisan periódicamente", 0),
            option("irregulares", "Se actualizan de forma irregular", 1),
            option("estimados", "Se usan estimaciones antiguas o incompletas", 2),
            option("desconocidos", "No están calculados", 3)
          ]
        },
        {
          id: "q11_marginKnowledge",
          number: 11,
          category: "costos",
          text: "¿Se conoce el margen de ganancia por producto o servicio?",
          options: [
            option("conocido", "Sí, se calcula y revisa", 0),
            option("parcial", "Se conoce para algunos productos o servicios", 1),
            option("estimado", "Solo existe una estimación general", 2),
            option("desconocido", "No se conoce", 3)
          ]
        }
      ]
    },
    {
      id: "tiempos",
      title: "Tiempos",
      description: "Retrasos, esperas y medición del ciclo operativo.",
      questions: [
        {
          id: "q12_delayFrequency",
          number: 12,
          category: "tiempos",
          text: "¿Con qué frecuencia se incumplen fechas o se generan esperas para clientes o para el equipo?",
          options: [
            option("casi_nunca", "Casi nunca", 0),
            option("mensual", "Una o dos veces al mes", 1),
            option("semanal", "Todas las semanas", 2),
            option("muy_frecuente", "Varias veces por semana", 3)
          ]
        },
        {
          id: "q13_cycleTimeMeasurement",
          number: 13,
          category: "tiempos",
          text: "¿Se mide cuánto tarda el proceso principal desde que inicia hasta que termina?",
          options: [
            option("medido", "Sí, se mide y se revisa", 0),
            option("parcial", "Se mide solo en algunos casos", 1),
            option("estimado", "Se estima sin registros", 2),
            option("desconocido", "No se conoce", 3)
          ]
        }
      ]
    },
    {
      id: "clientes",
      title: "Clientes",
      description: "Seguimiento y pérdida de oportunidades comerciales.",
      questions: [
        {
          id: "q14_customerFollowUp",
          number: 14,
          category: "clientes",
          text: "¿Cómo se da seguimiento a solicitudes, cotizaciones o clientes pendientes?",
          options: [
            option("estructurado", "En un sistema o registro único con responsables y fechas", 0),
            option("lista_simple", "En una lista, pero sin revisión constante", 1),
            option("disperso", "En mensajes, notas o memoria personal", 2),
            option("sin_seguimiento", "No existe un seguimiento definido", 3)
          ]
        },
        {
          id: "q15_lostOpportunities",
          number: 15,
          category: "clientes",
          text: "¿Con qué frecuencia se pierden oportunidades por respuesta tardía o falta de seguimiento?",
          options: [
            option("casi_nunca", "Casi nunca", 0),
            option("mensual", "Una o dos veces al mes", 1),
            option("semanal", "Todas las semanas", 2),
            option("muy_frecuente", "Varias veces por semana", 3)
          ]
        }
      ]
    }
  ];

  const categories = {
    ventas: {
      label: "Ventas",
      questionIds: ["q4_salesRecord", "q5_salesVisibility"],
      causeRules: {
        q4_salesRecord: ["Los registros de ventas podrían estar dispersos, incompletos o actualizarse tarde."],
        q5_salesVisibility: ["La falta de una revisión uniforme podría limitar la visibilidad por producto o servicio."]
      },
      kpis: [
        ["Ventas semanales", "Permite observar la evolución comercial en periodos comparables."],
        ["Número de transacciones", "Distingue crecimiento por volumen de operaciones."],
        ["Ticket promedio", "Muestra el valor promedio de cada venta."],
        ["Participación por producto o servicio", "Identifica qué ofertas concentran la venta."]
      ],
      quickActions: ["Concentrar las ventas de una semana en un solo formato.", "Definir campos obligatorios para cada registro.", "Revisar semanalmente ventas y diferencias."],
      mediumActions: ["Establecer un proceso único de captura.", "Crear un tablero mensual.", "Asignar un responsable de calidad del registro."],
      nextStep: "Consolidar una semana ficticia o anonimizada de registros y comprobar si se puede responder qué se vendió, cuánto y cuándo."
    },
    inventario: {
      label: "Inventario",
      questionIds: ["q6_inventoryAccuracy", "q7_inventoryIncidents"],
      causeRules: {
        q6_inventoryAccuracy: ["Algunas entradas o salidas podrían no registrarse de forma consistente.", "Los conteos físicos podrían ser insuficientes para detectar diferencias a tiempo."],
        q7_inventoryIncidents: ["Las compras podrían estar respondiendo a urgencias en vez de puntos de reorden definidos."]
      },
      kpis: [
        ["Exactitud de inventario", "Mide el porcentaje de artículos cuyo registro coincide con el conteo físico."],
        ["Frecuencia de faltantes", "Cuenta las ocasiones sin existencia para atender una necesidad."],
        ["Rotación de inventario", "Muestra el ritmo al que se vende o utiliza la existencia."],
        ["Días de inventario", "Estima el tiempo que puede cubrir la existencia actual."]
      ],
      quickActions: ["Contar físicamente los 10 artículos de mayor movimiento.", "Registrar durante una semana todas las entradas y salidas en un único formato.", "Separar faltantes, sobrantes y compras urgentes."],
      mediumActions: ["Establecer conteos cíclicos para artículos prioritarios.", "Definir puntos de reorden.", "Revisar mensualmente rotación y artículos sin movimiento."],
      nextStep: "Realizar un conteo piloto de los 10 artículos de mayor movimiento y comparar la existencia física contra el registro."
    },
    procesos: {
      label: "Procesos",
      questionIds: ["q8_processDocumentation", "q9_reworkFrequency"],
      causeRules: {
        q8_processDocumentation: ["Las instrucciones podrían depender de explicaciones verbales o variar entre personas.", "Las responsabilidades y puntos de control podrían no estar definidos."],
        q9_reworkFrequency: ["La falta de verificación en pasos críticos podría estar generando errores y repeticiones."]
      },
      kpis: [
        ["Porcentaje de reprocesos", "Mide cuánto trabajo necesita repetirse."],
        ["Errores por periodo", "Permite observar la frecuencia de fallas."],
        ["Cumplimiento del estándar", "Verifica si el proceso acordado se ejecuta."],
        ["Incidencias por etapa", "Ubica dónde se concentran los problemas."]
      ],
      quickActions: ["Documentar el proceso más frecuente en cinco a siete pasos.", "Asignar responsables por etapa.", "Usar una lista de verificación simple."],
      mediumActions: ["Validar el estándar con el equipo.", "Capacitar sobre el proceso acordado.", "Revisar causas de error y actualizar el estándar."],
      nextStep: "Observar una ejecución real o simulada del proceso prioritario y registrar pasos, responsable y errores."
    },
    costos: {
      label: "Costos",
      questionIds: ["q10_costUpdate", "q11_marginKnowledge"],
      causeRules: {
        q10_costUpdate: ["Los costos podrían estar desactualizados o excluir gastos indirectos relevantes.", "Los precios podrían apoyarse en estimaciones antiguas."],
        q11_marginKnowledge: ["La falta de margen por producto o servicio podría ocultar diferencias de rentabilidad."]
      },
      kpis: [
        ["Costo unitario", "Resume los recursos asociados con una unidad de venta."],
        ["Margen bruto", "Muestra la diferencia entre venta y costo directo."],
        ["Margen por producto o servicio", "Compara rentabilidad entre ofertas."],
        ["Variación de costo", "Compara costo estimado contra costo observado."]
      ],
      quickActions: ["Recalcular el costo de tres productos o servicios representativos.", "Separar costos directos e indirectos.", "Registrar la fecha de cada actualización."],
      mediumActions: ["Establecer una revisión mensual.", "Crear una hoja de costos estándar.", "Comparar margen esperado contra margen observado."],
      nextStep: "Construir una ficha de costo piloto para el producto o servicio de mayor venta, usando datos ficticios durante la demostración."
    },
    tiempos: {
      label: "Tiempos",
      questionIds: ["q12_delayFrequency", "q13_cycleTimeMeasurement"],
      causeRules: {
        q12_delayFrequency: ["Podrían existir esperas entre etapas o prioridades cambiantes.", "La carga de trabajo podría estar desequilibrada."],
        q13_cycleTimeMeasurement: ["La ausencia de mediciones podría impedir localizar la espera principal."]
      },
      kpis: [
        ["Tiempo total de ciclo", "Mide cuánto tarda un caso de inicio a fin."],
        ["Tiempo de espera", "Separa periodos sin trabajo efectivo."],
        ["Entregas a tiempo", "Mide el cumplimiento de fechas acordadas."],
        ["Trabajos pendientes", "Muestra la carga acumulada."]
      ],
      quickActions: ["Medir cinco ciclos.", "Separar tiempo de trabajo y espera.", "Registrar el motivo de cada retraso."],
      mediumActions: ["Atender el principal cuello de botella.", "Definir tiempos objetivo.", "Revisar capacidad y carga semanal."],
      nextStep: "Medir de inicio a fin cinco casos ficticios o simulados del proceso principal y ubicar la espera más larga."
    },
    clientes: {
      label: "Clientes",
      questionIds: ["q14_customerFollowUp", "q15_lostOpportunities"],
      causeRules: {
        q14_customerFollowUp: ["El seguimiento podría estar distribuido en mensajes, notas o memoria personal.", "Las oportunidades podrían carecer de responsable y próxima fecha."],
        q15_lostOpportunities: ["La respuesta tardía podría estar provocando pérdida de oportunidades."]
      },
      kpis: [
        ["Tiempo de primera respuesta", "Mide cuánto espera un cliente antes del primer contacto."],
        ["Seguimientos a tiempo", "Muestra el porcentaje atendido en la fecha acordada."],
        ["Conversión de cotizaciones", "Relaciona cotizaciones enviadas y ventas logradas."],
        ["Oportunidades sin actividad", "Detecta casos que no tienen un siguiente movimiento."]
      ],
      quickActions: ["Crear una lista única de oportunidades.", "Agregar responsable y próxima fecha.", "Revisar pendientes diariamente."],
      mediumActions: ["Definir etapas de seguimiento.", "Establecer recordatorios.", "Revisar conversión y motivos de pérdida cada mes."],
      nextStep: "Registrar diez oportunidades ficticias en una lista única y verificar que todas tengan responsable y fecha siguiente."
    }
  };

  const testCases = {
    inventario: {
      name: "Caso A · Inventario",
      expected: { category: "inventario", priority: "alta", scores: { ventas: 1, inventario: 6, procesos: 2, costos: 2, tiempos: 2, clientes: 1 } },
      answers: {
        q1_businessType: "comercio", q2_teamSize: "6_15", q3_mainConcern: "inventario",
        q4_salesRecord: "centralizado", q5_salesVisibility: "manual",
        q6_inventoryAccuracy: "diferencias_frecuentes", q7_inventoryIncidents: "muy_frecuente",
        q8_processDocumentation: "parciales", q9_reworkFrequency: "mensual",
        q10_costUpdate: "irregulares", q11_marginKnowledge: "parcial",
        q12_delayFrequency: "mensual", q13_cycleTimeMeasurement: "parcial",
        q14_customerFollowUp: "lista_simple", q15_lostOpportunities: "casi_nunca"
      }
    },
    costos: {
      name: "Caso B · Costos",
      expected: { category: "costos", priority: "media", scores: { ventas: 2, inventario: 0, procesos: 4, costos: 4, tiempos: 2, clientes: 4 } },
      answers: {
        q1_businessType: "servicios", q2_teamSize: "1_5", q3_mainConcern: "costos",
        q4_salesRecord: "incompleto", q5_salesVisibility: "manual",
        q6_inventoryAccuracy: "confiable", q7_inventoryIncidents: "casi_nunca",
        q8_processDocumentation: "verbales", q9_reworkFrequency: "semanal",
        q10_costUpdate: "estimados", q11_marginKnowledge: "parcial",
        q12_delayFrequency: "mensual", q13_cycleTimeMeasurement: "parcial",
        q14_customerFollowUp: "disperso", q15_lostOpportunities: "semanal"
      }
    },
    clientes: {
      name: "Caso C · Clientes",
      expected: { category: "clientes", priority: "alta", scores: { ventas: 3, inventario: 2, procesos: 2, costos: 2, tiempos: 4, clientes: 7 } },
      answers: {
        q1_businessType: "alimentos", q2_teamSize: "16_50", q3_mainConcern: "clientes",
        q4_salesRecord: "incompleto", q5_salesVisibility: "aproximado",
        q6_inventoryAccuracy: "diferencias_menores", q7_inventoryIncidents: "mensual",
        q8_processDocumentation: "parciales", q9_reworkFrequency: "mensual",
        q10_costUpdate: "irregulares", q11_marginKnowledge: "parcial",
        q12_delayFrequency: "semanal", q13_cycleTimeMeasurement: "estimado",
        q14_customerFollowUp: "sin_seguimiento", q15_lostOpportunities: "muy_frecuente"
      }
    }
  };

  global.DIAGNOSTIC_CONFIG = {
    sections,
    categories,
    testCases,
    tieBreakOrder: ["costos", "inventario", "ventas", "clientes", "tiempos", "procesos"],
    disclaimer: "Este resultado es un diagnóstico preliminar basado en respuestas declaradas. No sustituye una evaluación operativa ni comprueba causas o impactos económicos. Valide las recomendaciones antes de tomar decisiones."
  };
})(globalThis);
