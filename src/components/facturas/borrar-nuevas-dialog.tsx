"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatEUR, formatDate } from "@/lib/finance";

interface FacturaNueva {
  factura_id: string;
  numero_factura: string | null;
  razon_social_proveedor: string | null;
  fecha_expedicion: string | null;
  total_factura_eur: number | null;
  estado: string | null;
  albaranes_vinculados: number;
  logs_vinculados: number;
  historial_vinculado: number;
}

type Paso = "buscando" | "confirmar" | "borrando" | "hecho" | "vacio";

export function BorrarNuevasDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState<Paso>("buscando");
  const [facturas, setFacturas] = useState<FacturaNueva[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [borradas, setBorradas] = useState(0);
  const [albaranesVinculosBorrados, setAlbaranesVinculosBorrados] = useState(0);
  const [logsAgentesBorrados, setLogsAgentesBorrados] = useState(0);
  const [historialBorrado, setHistorialBorrado] = useState(0);
  const [logsHuerfanos, setLogsHuerfanos] = useState(0);

  async function abrirYBuscar() {
    setOpen(true);
    setPaso("buscando");
    setError(null);
    try {
      const res = await fetch("/api/facturas/nuevas");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setLogsHuerfanos(json.logsCapturaHuerfanos ?? 0);
      if (json.facturas.length === 0 && !json.logsCapturaHuerfanos) {
        setFacturas([]);
        setPaso("vacio");
        return;
      }
      setFacturas(json.facturas);
      setPaso("confirmar");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPaso("vacio");
    }
  }

  function cerrar(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setFacturas([]);
      setLogsHuerfanos(0);
      setError(null);
      setBorradas(0);
      setAlbaranesVinculosBorrados(0);
      setLogsAgentesBorrados(0);
      setHistorialBorrado(0);
    }
  }

  async function confirmarBorrado() {
    setPaso("borrando");
    setError(null);
    try {
      const res = await fetch("/api/facturas/nuevas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factura_ids: facturas.map((f) => f.factura_id) }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setBorradas(json.borradas);
      setAlbaranesVinculosBorrados(json.albaranesVinculosBorrados ?? 0);
      setLogsAgentesBorrados(json.logsAgentesBorrados ?? 0);
      setHistorialBorrado(json.historialBorrado ?? 0);
      setPaso("hecho");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPaso("confirmar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={abrirYBuscar}
      >
        <Trash2Icon data-icon="inline-start" />
        Borrar facturas nuevas
      </Button>

      <DialogContent className="sm:max-w-lg">
        {paso === "buscando" && (
          <>
            <DialogHeader>
              <DialogTitle>Buscando facturas nuevas…</DialogTitle>
              <DialogDescription>
                Comprobando qué facturas hay por encima de las 340 del
                dataset base.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          </>
        )}

        {paso === "vacio" && (
          <>
            <DialogHeader>
              <DialogTitle>Sin facturas nuevas</DialogTitle>
              <DialogDescription>
                {error ??
                  "No hay ninguna factura por encima de las 340 del dataset base. Nada que borrar."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => cerrar(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}

        {(paso === "confirmar" || paso === "borrando") && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="size-4" />
                {facturas.length > 0
                  ? `Confirmar borrado de ${facturas.length} factura${facturas.length === 1 ? "" : "s"}`
                  : "Confirmar borrado de logs de captura"}
              </DialogTitle>
              <DialogDescription>
                Esta acción es irreversible: se borrarán estas facturas y sus
                líneas, vínculos con albaranes, logs de agente (log_agentes),
                historial de estados (historial_estado_factura) y casos de
                excepción asociados, dejando el dataset base de 340
                facturas intacto. Revisa las referencias antes de confirmar.
              </DialogDescription>
            </DialogHeader>
            {logsHuerfanos > 0 && (
              <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
                Además se borrarán <strong>{logsHuerfanos}</strong> log
                {logsHuerfanos === 1 ? "" : "s"} de captura en log_agentes
                (agente = «captura») sin factura ni caso asociado.
              </p>
            )}
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº factura</th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-right">Total EUR</th>
                    <th className="px-3 py-2 text-right">Albaranes</th>
                    <th className="px-3 py-2 text-right">Logs agente</th>
                    <th className="px-3 py-2 text-right">Historial</th>
                  </tr>
                </thead>
                <tbody>
                  {facturas.map((f) => (
                    <tr key={f.factura_id} className="border-t">
                      <td className="px-3 py-2 font-mono">
                        {f.numero_factura}
                      </td>
                      <td className="px-3 py-2">
                        {f.razon_social_proveedor ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        {formatDate(f.fecha_expedicion)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {formatEUR(f.total_factura_eur)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {f.albaranes_vinculados}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {f.logs_vinculados}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {f.historial_vinculado}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => cerrar(false)}
                disabled={paso === "borrando"}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmarBorrado}
                disabled={paso === "borrando"}
              >
                {paso === "borrando" && (
                  <Loader2Icon className="animate-spin" />
                )}
                {facturas.length > 0
                  ? `Sí, borrar ${facturas.length} factura${facturas.length === 1 ? "" : "s"} definitivamente`
                  : "Sí, borrar logs definitivamente"}
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "hecho" && (
          <>
            <DialogHeader>
              <DialogTitle>Facturas borradas</DialogTitle>
              <DialogDescription>
                Se han borrado {borradas} factura{borradas === 1 ? "" : "s"},{" "}
                {albaranesVinculosBorrados} vínculo
                {albaranesVinculosBorrados === 1 ? "" : "s"} en
                facturas_albaranes, {logsAgentesBorrados} log
                {logsAgentesBorrados === 1 ? "" : "s"} en log_agentes,{" "}
                {historialBorrado} registro{historialBorrado === 1 ? "" : "s"} en
                historial_estado_factura y sus demás datos relacionados. El dataset base de 340 queda
                intacto.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => cerrar(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
