CREATE TABLE "citas" (
	"id" serial PRIMARY KEY,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"servicio" text NOT NULL,
	"barbero" text NOT NULL,
	"fecha" date NOT NULL,
	"hora" time NOT NULL,
	"notas" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "citas_barbero_fecha_hora_idx" ON "citas" ("barbero","fecha","hora");