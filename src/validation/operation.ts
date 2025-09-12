import { z } from 'zod';

export const OperationSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  local: z.string().min(1, 'Local é obrigatório'),
  reserva: z
    .string()
    .min(1, 'Reserva é obrigatória')
    .regex(/^[A-Z0-9-]+$/i, 'Formato de reserva inválido'),
  deadline: z.string().min(1, 'Deadline é obrigatório'),
  ship: z.string().min(1, 'AMV é obrigatório'),
  cliente: z.string().min(1, 'Cliente é obrigatório'),
  exporter: z.string().min(1, 'Exportador é obrigatório'),
  destination: z.string().min(1, 'Destino é obrigatório'),
  navio: z.string().min(1, 'Navio é obrigatório'),
  data: z.string().min(1, 'Data é obrigatória'),
  entrega: z.string().min(1, 'Entrega é obrigatória'),
});

export type OperationForm = z.infer<typeof OperationSchema>;

