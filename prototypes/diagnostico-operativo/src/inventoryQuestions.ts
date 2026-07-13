export interface QuestionOption {
  value: string;
  label: string;
  score: number;
}

export interface InventoryQuestion {
  id: string;
  number: 6 | 7;
  text: string;
  options: QuestionOption[];
}

export const inventoryQuestions: InventoryQuestion[] = [
  {
    id: "q6_inventoryAccuracy",
    number: 6,
    text: "¿Qué tan confiable es la cantidad registrada frente a la existencia real?",
    options: [
      { value: "confiable", label: "Coincide casi siempre y se verifica", score: 0 },
      { value: "diferencias_menores", label: "Hay diferencias menores ocasionales", score: 1 },
      { value: "diferencias_frecuentes", label: "Hay diferencias frecuentes", score: 2 },
      { value: "sin_control", label: "No existe un registro confiable", score: 3 }
    ]
  },
  {
    id: "q7_inventoryIncidents",
    number: 7,
    text: "¿Con qué frecuencia hay faltantes, compras urgentes o exceso de inventario?",
    options: [
      { value: "casi_nunca", label: "Casi nunca", score: 0 },
      { value: "mensual", label: "Una o dos veces al mes", score: 1 },
      { value: "semanal", label: "Todas las semanas", score: 2 },
      { value: "muy_frecuente", label: "Varias veces por semana", score: 3 }
    ]
  }
];

export const sectorOptions = [
  ["comercio", "Comercio o venta de productos"],
  ["servicios", "Servicios"],
  ["alimentos", "Alimentos y bebidas"],
  ["manufactura", "Manufactura o transformación"],
  ["otro", "Otro"]
] as const;

export const concernOptions = [
  ["ventas", "Control de ventas"],
  ["inventario", "Existencias o inventario"],
  ["procesos", "Procesos y formas de trabajo"],
  ["costos", "Costos o márgenes"],
  ["tiempos", "Retrasos o tiempos de espera"],
  ["clientes", "Seguimiento a clientes" ]
] as const;
