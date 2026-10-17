import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Lightbulb, ListChecks } from "lucide-react";
import type { Insight, Insights } from "@/lib/insights";
import { InfoTip } from "@/components/info-tip";
import { Block } from "@/components/executive/dense";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Grupo = {
  key: string;
  titulo: string;
  icon: typeof Lightbulb;
  items: (Insight | null)[];
  accent: string; // color del filete
  tono: string; // clase de color del icono
};

function Item({ i, accent }: { i: Insight; accent: string }) {
  const body = (
    <div className="relative flex flex-col gap-0.5 pl-3">
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0 w-[3px] rounded-full"
        style={{
          background: `linear-gradient(180deg, ${accent}, color-mix(in oklab, ${accent}, transparent 75%))`,
        }}
      />
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium leading-snug">{i.titulo}</span>
        <span className="font-numeric whitespace-nowrap text-sm" style={{ color: accent }}>
          {i.cifra}
        </span>
      </div>
      <p className="text-xs leading-snug text-muted-foreground">{i.texto}</p>
      {i.responsable && (
        <span className="text-[0.68rem] text-muted-foreground">
          Responsable sugerido: <span className="text-foreground">{i.responsable}</span>
        </span>
      )}
    </div>
  );
  if (!i.href) return body;
  return (
    <Link
      href={i.href}
      className="group/ins -mx-2 rounded-lg px-2 py-1 transition-colors hover:bg-background/60"
    >
      {body}
      <span className="sr-only">Ver detalle</span>
      <ArrowUpRight
        aria-hidden
        size={13}
        className="absolute right-2 top-1.5 opacity-0 transition-opacity group-hover/ins:opacity-60"
      />
    </Link>
  );
}

/** 3 conclusiones + 2 riesgos + 2 acciones, calculados en servidor con los filtros activos. */
export function InsightsBlock({ insights }: { insights: Insights }) {
  const grupos: Grupo[] = [
    {
      key: "conclusiones",
      titulo: "Conclusiones",
      icon: Lightbulb,
      items: insights.conclusiones,
      accent: "var(--chart-1)",
      tono: "text-[color:var(--chart-1)]",
    },
    {
      key: "riesgos",
      titulo: "Riesgos",
      icon: AlertTriangle,
      items: insights.riesgos,
      accent: "var(--exception)",
      tono: "text-[color:var(--exception)]",
    },
    {
      key: "acciones",
      titulo: "Acciones recomendadas",
      icon: ListChecks,
      items: insights.acciones,
      accent: "var(--ok)",
      tono: "text-[color:var(--ok)]",
    },
  ];

  return (
    <Block
      tint="violet"
      eyebrow="Lectura rápida"
      title="Qué dicen los datos"
      info={
        <InfoTip text="Reglas deterministas calculadas en el servidor con los filtros activos (umbrales en src/lib/insights.ts). Cada insight muestra la cifra que lo sustenta; si los datos filtrados no bastan, se indica «datos insuficientes». No hay IA generativa en esta fase." />
      }
    >
      <Tabs defaultValue={grupos[0].key}>
        <TabsList className="w-full">
          {grupos.map((g) => {
            const Icon = g.icon;
            return (
              <TabsTrigger key={g.key} value={g.key} className="px-2">
                <Icon aria-hidden size={13} className={g.tono} />
                {g.titulo}
              </TabsTrigger>
            );
          })}
        </TabsList>
        {grupos.map((g) => (
          <TabsContent key={g.key} value={g.key} className="flex flex-col gap-3 pt-3">
            {g.items.map((i, idx) =>
              i ? (
                <div key={i.id} className="relative">
                  <Item i={i} accent={g.accent} />
                </div>
              ) : (
                <p
                  key={`${g.key}-${idx}`}
                  className="pl-3 text-xs italic text-muted-foreground"
                >
                  Datos insuficientes con los filtros activos.
                </p>
              )
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Block>
  );
}
