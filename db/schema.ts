import { pgTable, serial, text, date, time, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const citas = pgTable(
  "citas",
  {
    id: serial().primaryKey(),
    nombre: text().notNull(),
    telefono: text().notNull(),
    servicio: text().notNull(),
    barbero: text().notNull(),
    fecha: date().notNull(),
    hora: time().notNull(),
    notas: text().notNull().default(""),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => [uniqueIndex("citas_barbero_fecha_hora_idx").on(t.barbero, t.fecha, t.hora)]
);
