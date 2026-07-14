import type { AreaId } from "./models";

export interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

export interface OperationalQuestion {
  id: string;
  number: number;
  areaId: AreaId;
  text: string;
  options: QuestionOption[];
}

export interface KpiDefinition {
  name: string;
  purpose: string;
}

export interface AreaConfig {
  id: AreaId;
  label: string;
  description: string;
  questions: [OperationalQuestion, OperationalQuestion];
  causeRules: Record<string, string[]>;
  kpis: KpiDefinition[];
  quickActions: string[];
  mediumActions: string[];
  nextStep: string;
}

const option = (value: string, label: string, score: number): QuestionOption => ({ value, label, score });
const question = (areaId: AreaId, id: string, number: number, text: string, options: QuestionOption[]): OperationalQuestion => ({
  areaId,
  id,
  number,
  text,
  options
});

export const areas: AreaConfig[] = [
  {
    id: "ventas",
    label: "Ventas",
    description: "Registro y visibilidad del desempeño comercial.",
    questions: [
      question("ventas", "q4_salesRecord", 4, "¿Cómo se registran las ventas?", [
        option("centralizado", "En un sistema o archivo único, actualizado y revisado", 0),
        option("incompleto", "En un archivo único, pero con retrasos o datos incompletos", 1),
        option("disperso", "En varios archivos, libretas o mensajes", 2),
        option("sin_registro", "No existe un registro consistente", 3)
      ]),
      question("ventas", "q5_salesVisibility", 5, "¿Con qué claridad se puede saber qué productos o servicios venden más?", [
        option("claro", "Se consulta con datos actualizados", 0),
        option("manual", "Se puede calcular, pero requiere trabajo manual", 1),
        option("aproximado", "Solo existe una idea aproximada", 2),
        option("desconocido", "No se puede determinar", 3)
      ])
    ],
    causeRules: {
      q4_salesRecord: ["Los registros de ventas podrían estar dispersos, incompletos o actualizarse tarde."],
      q5_salesVisibility: ["La falta de una revisión uniforme podría limitar la visibilidad por producto o servicio."]
    },
    kpis: [
      { name: "Ventas semanales", purpose: "Permite observar la evolución comercial en periodos comparables." },
      { name: "Número de transacciones", purpose: "Distingue crecimiento por volumen de operaciones." },
      { name: "Ticket promedio", purpose: "Muestra el valor promedio de cada venta." },
      { name: "Participación por producto o servicio", purpose: "Identifica qué ofertas concentran la venta." }
    ],
    quickActions: ["Concentrar las ventas de una semana en un solo formato.", "Definir campos obligatorios para cada registro.", "Revisar semanalmente ventas y diferencias."],
    mediumActions: ["Establecer un proceso único de captura.", "Crear un tablero mensual.", "Asignar un responsable de calidad del registro."],
    nextStep: "Consolidar una semana ficticia o anonimizada de registros y comprobar si se puede responder qué se vendió, cuánto y cuándo."
  },
  {
    id: "inventario",
    label: "Inventario",
    description: "Exactitud de existencias y frecuencia de incidentes.",
    questions: [
      question("inventario", "q6_inventoryAccuracy", 6, "¿Qué tan confiable es la cantidad registrada frente a la existencia real?", [
        option("confiable", "Coincide casi siempre y se verifica", 0),
        option("diferencias_menores", "Hay diferencias menores ocasionales", 1),
        option("diferencias_frecuentes", "Hay diferencias frecuentes", 2),
        option("sin_control", "No existe un registro confiable", 3)
      ]),
      question("inventario", "q7_inventoryIncidents", 7, "¿Con qué frecuencia hay faltantes, compras urgentes o exceso de inventario?", [
        option("casi_nunca", "Casi nunca", 0),
        option("mensual", "Una o dos veces al mes", 1),
        option("semanal", "Todas las semanas", 2),
        option("muy_frecuente", "Varias veces por semana", 3)
      ])
    ],
    causeRules: {
      q6_inventoryAccuracy: ["Algunas entradas o salidas podrían no registrarse de forma consistente.", "Los conteos físicos podrían ser insuficientes para detectar diferencias a tiempo."],
      q7_inventoryIncidents: ["Las compras podrían estar respondiendo a urgencias en vez de puntos de reorden definidos."]
    },
    kpis: [
      { name: "Exactitud de inventario", purpose: "Mide el porcentaje de artículos cuyo registro coincide con el conteo físico." },
      { name: "Frecuencia de faltantes", purpose: "Cuenta las ocasiones sin existencia para atender una necesidad." },
      { name: "Rotación de inventario", purpose: "Muestra el ritmo al que se vende o utiliza la existencia." },
      { name: "Días de inventario", purpose: "Estima el tiempo que puede cubrir la existencia actual." }
    ],
    quickActions: ["Contar físicamente los 10 artículos de mayor movimiento.", "Registrar durante una semana todas las entradas y salidas en un único formato.", "Separar faltantes, sobrantes y compras urgentes."],
    mediumActions: ["Establecer conteos cíclicos para artículos prioritarios.", "Definir puntos de reorden.", "Revisar mensualmente rotación y artículos sin movimiento."],
    nextStep: "Realizar un conteo piloto de los 10 artículos de mayor movimiento y comparar la existencia física contra el registro."
  },
  {
    id: "procesos",
    label: "Procesos",
    description: "Estandarización del trabajo y presencia de reprocesos.",
    questions: [
      question("procesos", "q8_processDocumentation", 8, "¿Qué tan documentadas están las actividades principales?", [
        option("documentadas", "Están documentadas y el equipo las sigue", 0),
        option("parciales", "Algunas están documentadas", 1),
        option("verbales", "Se explican verbalmente y varían entre personas", 2),
        option("sin_estandar", "No hay una forma de trabajo definida", 3)
      ]),
      question("procesos", "q9_reworkFrequency", 9, "¿Con qué frecuencia se repite trabajo por errores, omisiones o instrucciones poco claras?", [
        option("casi_nunca", "Casi nunca", 0),
        option("mensual", "Una o dos veces al mes", 1),
        option("semanal", "Todas las semanas", 2),
        option("muy_frecuente", "Varias veces por semana", 3)
      ])
    ],
    causeRules: {
      q8_processDocumentation: ["Las instrucciones podrían depender de explicaciones verbales o variar entre personas.", "Las responsabilidades y puntos de control podrían no estar definidos."],
      q9_reworkFrequency: ["La falta de verificación en pasos críticos podría estar generando errores y repeticiones."]
    },
    kpis: [
      { name: "Porcentaje de reprocesos", purpose: "Mide cuánto trabajo necesita repetirse." },
      { name: "Errores por periodo", purpose: "Permite observar la frecuencia de fallas." },
      { name: "Cumplimiento del estándar", purpose: "Verifica si el proceso acordado se ejecuta." },
      { name: "Incidencias por etapa", purpose: "Ubica dónde se concentran los problemas." }
    ],
    quickActions: ["Documentar el proceso más frecuente en cinco a siete pasos.", "Asignar responsables por etapa.", "Usar una lista de verificación simple."],
    mediumActions: ["Validar el estándar con el equipo.", "Capacitar sobre el proceso acordado.", "Revisar causas de error y actualizar el estándar."],
    nextStep: "Observar una ejecución real o simulada del proceso prioritario y registrar pasos, responsable y errores."
  },
  {
    id: "costos",
    label: "Costos",
    description: "Actualización de costos y conocimiento del margen.",
    questions: [
      question("costos", "q10_costUpdate", 10, "¿Qué tan actualizados están los costos de los productos o servicios?", [
        option("actualizados", "Están actualizados y se revisan periódicamente", 0),
        option("irregulares", "Se actualizan de forma irregular", 1),
        option("estimados", "Se usan estimaciones antiguas o incompletas", 2),
        option("desconocidos", "No están calculados", 3)
      ]),
      question("costos", "q11_marginKnowledge", 11, "¿Se conoce el margen de ganancia por producto o servicio?", [
        option("conocido", "Sí, se calcula y revisa", 0),
        option("parcial", "Se conoce para algunos productos o servicios", 1),
        option("estimado", "Solo existe una estimación general", 2),
        option("desconocido", "No se conoce", 3)
      ])
    ],
    causeRules: {
      q10_costUpdate: ["Los costos podrían estar desactualizados o excluir gastos indirectos relevantes.", "Los precios podrían apoyarse en estimaciones antiguas."],
      q11_marginKnowledge: ["La falta de margen por producto o servicio podría ocultar diferencias de rentabilidad."]
    },
    kpis: [
      { name: "Costo unitario", purpose: "Resume los recursos asociados con una unidad de venta." },
      { name: "Margen bruto", purpose: "Muestra la diferencia entre venta y costo directo." },
      { name: "Margen por producto o servicio", purpose: "Compara rentabilidad entre ofertas." },
      { name: "Variación de costo", purpose: "Compara costo estimado contra costo observado." }
    ],
    quickActions: ["Recalcular el costo de tres productos o servicios representativos.", "Separar costos directos e indirectos.", "Registrar la fecha de cada actualización."],
    mediumActions: ["Establecer una revisión mensual.", "Crear una hoja de costos estándar.", "Comparar margen esperado contra margen observado."],
    nextStep: "Construir una ficha de costo piloto para el producto o servicio de mayor venta, usando datos ficticios durante la demostración."
  },
  {
    id: "tiempos",
    label: "Tiempos",
    description: "Retrasos, esperas y medición del ciclo operativo.",
    questions: [
      question("tiempos", "q12_delayFrequency", 12, "¿Con qué frecuencia se incumplen fechas o se generan esperas para clientes o para el equipo?", [
        option("casi_nunca", "Casi nunca", 0),
        option("mensual", "Una o dos veces al mes", 1),
        option("semanal", "Todas las semanas", 2),
        option("muy_frecuente", "Varias veces por semana", 3)
      ]),
      question("tiempos", "q13_cycleTimeMeasurement", 13, "¿Se mide cuánto tarda el proceso principal desde que inicia hasta que termina?", [
        option("medido", "Sí, se mide y se revisa", 0),
        option("parcial", "Se mide solo en algunos casos", 1),
        option("estimado", "Se estima sin registros", 2),
        option("desconocido", "No se conoce", 3)
      ])
    ],
    causeRules: {
      q12_delayFrequency: ["Podrían existir esperas entre etapas o prioridades cambiantes.", "La carga de trabajo podría estar desequilibrada."],
      q13_cycleTimeMeasurement: ["La ausencia de mediciones podría impedir localizar la espera principal."]
    },
    kpis: [
      { name: "Tiempo total de ciclo", purpose: "Mide cuánto tarda un caso de inicio a fin." },
      { name: "Tiempo de espera", purpose: "Separa periodos sin trabajo efectivo." },
      { name: "Entregas a tiempo", purpose: "Mide el cumplimiento de fechas acordadas." },
      { name: "Trabajos pendientes", purpose: "Muestra la carga acumulada." }
    ],
    quickActions: ["Medir cinco ciclos.", "Separar tiempo de trabajo y espera.", "Registrar el motivo de cada retraso."],
    mediumActions: ["Atender el principal cuello de botella.", "Definir tiempos objetivo.", "Revisar capacidad y carga semanal."],
    nextStep: "Medir de inicio a fin cinco casos ficticios o simulados del proceso principal y ubicar la espera más larga."
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Seguimiento y pérdida de oportunidades comerciales.",
    questions: [
      question("clientes", "q14_customerFollowUp", 14, "¿Cómo se da seguimiento a solicitudes, cotizaciones o clientes pendientes?", [
        option("estructurado", "En un sistema o registro único con responsables y fechas", 0),
        option("lista_simple", "En una lista, pero sin revisión constante", 1),
        option("disperso", "En mensajes, notas o memoria personal", 2),
        option("sin_seguimiento", "No existe un seguimiento definido", 3)
      ]),
      question("clientes", "q15_lostOpportunities", 15, "¿Con qué frecuencia se pierden oportunidades por respuesta tardía o falta de seguimiento?", [
        option("casi_nunca", "Casi nunca", 0),
        option("mensual", "Una o dos veces al mes", 1),
        option("semanal", "Todas las semanas", 2),
        option("muy_frecuente", "Varias veces por semana", 3)
      ])
    ],
    causeRules: {
      q14_customerFollowUp: ["El seguimiento podría estar distribuido en mensajes, notas o memoria personal.", "Las oportunidades podrían carecer de responsable y próxima fecha."],
      q15_lostOpportunities: ["La respuesta tardía podría estar provocando pérdida de oportunidades."]
    },
    kpis: [
      { name: "Tiempo de primera respuesta", purpose: "Mide cuánto espera un cliente antes del primer contacto." },
      { name: "Seguimientos a tiempo", purpose: "Muestra el porcentaje atendido en la fecha acordada." },
      { name: "Conversión de cotizaciones", purpose: "Relaciona cotizaciones enviadas y ventas logradas." },
      { name: "Oportunidades sin actividad", purpose: "Detecta casos que no tienen un siguiente movimiento." }
    ],
    quickActions: ["Crear una lista única de oportunidades.", "Agregar responsable y próxima fecha.", "Revisar pendientes diariamente."],
    mediumActions: ["Definir etapas de seguimiento.", "Establecer recordatorios.", "Revisar conversión y motivos de pérdida cada mes."],
    nextStep: "Registrar diez oportunidades ficticias en una lista única y verificar que todas tengan responsable y fecha siguiente."
  }
];

export const areaMap = Object.fromEntries(areas.map((area) => [area.id, area])) as Record<AreaId, AreaConfig>;
export const operationalQuestions = areas.flatMap((area) => area.questions);
export const questionMap = Object.fromEntries(operationalQuestions.map((item) => [item.id, item])) as Record<string, OperationalQuestion>;
export const inventoryQuestions = areaMap.inventario.questions;
export const tieBreakOrder: AreaId[] = ["costos", "inventario", "ventas", "clientes", "tiempos", "procesos"];

export const sectorOptions = [
  ["comercio", "Comercio o venta de productos"],
  ["servicios", "Servicios"],
  ["alimentos", "Alimentos y bebidas"],
  ["manufactura", "Manufactura o transformación"],
  ["otro", "Otro"]
] as const;

export const concernOptions: ReadonlyArray<readonly [AreaId, string]> = [
  ["ventas", "No se tiene suficiente control de las ventas"],
  ["inventario", "Hay problemas con existencias o inventario"],
  ["procesos", "El trabajo depende demasiado de cómo lo hace cada persona"],
  ["costos", "No están claros los costos o márgenes"],
  ["tiempos", "Hay retrasos o tiempos de espera"],
  ["clientes", "Falta seguimiento a clientes u oportunidades"]
];

export const diagnosticDisclaimer = "Este resultado es un diagnóstico preliminar basado en respuestas declaradas. No sustituye una evaluación operativa ni comprueba causas o impactos económicos. Valide las recomendaciones antes de tomar decisiones.";
