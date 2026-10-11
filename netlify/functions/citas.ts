import type { Config } from "@netlify/functions";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { citas } from "../../db/schema.js";

const SERVICIOS = ["Corte clásico", "Corte + barba", "Arreglo de barba", "Fade / degradado", "Corte infantil"];
const BARBEROS = ["Cualquiera", "Fernando", "Carlos", "Luis"];
const HORAS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const error = (message: string, status = 400) => Response.json({ error: message }, { status });

export default async (req: Request) => {
  const url = new URL(req.url);

  // Horas ocupadas para un barbero y fecha
  if (req.method === "GET") {
    const fecha = url.searchParams.get("fecha") ?? "";
    const barbero = url.searchParams.get("barbero") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !BARBEROS.includes(barbero)) {
      return error("Parámetros inválidos");
    }
    const rows = await db
      .select({ hora: citas.hora })
      .from(citas)
      .where(and(eq(citas.fecha, fecha), eq(citas.barbero, barbero)));
    return Response.json({ ocupadas: rows.map((r) => r.hora.slice(0, 5)) });
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return error("Solicitud inválida");
    }
    const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
    const nombre = str("nombre");
    const telefono = str("telefono");
    const servicio = str("servicio");
    const barbero = str("barbero");
    const fecha = str("fecha");
    const hora = str("hora");
    const notas = str("notas").slice(0, 500);

    if (nombre.length < 2 || nombre.length > 100) return error("Ingresa tu nombre");
    if (!/^[0-9+\-\s()]{8,20}$/.test(telefono)) return error("Teléfono inválido");
    if (!SERVICIOS.includes(servicio)) return error("Selecciona un servicio");
    if (!BARBEROS.includes(barbero)) return error("Selecciona un barbero");
    if (!HORAS.includes(hora)) return error("Selecciona una hora");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return error("Selecciona una fecha");

    const today = new Date().toISOString().slice(0, 10);
    const day = new Date(`${fecha}T12:00:00Z`).getUTCDay();
    if (fecha < today) return error("La fecha ya pasó");
    if (day === 0) return error("Los domingos estamos cerrados");

    try {
      const [cita] = await db
        .insert(citas)
        .values({ nombre, telefono, servicio, barbero, fecha, hora, notas })
        .returning({ id: citas.id });
      return Response.json({ id: cita.id }, { status: 201 });
    } catch (e) {
      if (String((e as { code?: string })?.code) === "23505" || /unique|duplicate/i.test(String(e))) {
        return error("Esa hora ya fue reservada, elige otra", 409);
      }
      throw e;
    }
  }

  return error("Método no permitido", 405);
};

export const config: Config = {
  path: "/api/citas",
};
