"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2Icon, Loader2Icon, AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

type Paso = "referencia" | "confirmar" | "borrando" | "hecho";

export function BorrarNuevasDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paso, setPaso] = useState<Paso>("referencia");
  const [referencia, setReferencia] = useState("");
  const [facturas, setFacturas] = useState<FacturaNueva[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [borradas, setBorradas] = useState(0);

  function resetYCerrar(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPaso("referencia");
      setReferencia("");
      setFacturas([]);
      setError(null);
      setBorradas(0);
    }
  }

  async function buscar() {
    if (!referencia.trim()) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/facturas/nuevas?referencia=${encodeURIComponent(referencia.trim())}`
      );
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      if (json.facturas.length === 0) {
        setError(
          `No hay facturas con número posterior a "${referencia.trim()}".`
        );
        setFacturas([]);
        return;
      }
      setFacturas(json.facturas);
      setPaso("confirmar");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCargando(false);
    }
  }

  async function confirmarBorrado() {
    setPaso("borrando");
    setError(null);
    try {
      const res = await fetch("/api/facturas/nuevas", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          referencia: referencia.trim(),
          factura_ids: facturas.map((f) => f.factura_id),
        }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setBorradas(json.borradas);
      setPaso("hecho");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPaso("confirmar");
    }
  }

  return (
    <Dialog open={open} onOpenChange={resetYCerrar}>
      <Button
        variant="outline"
        size="sm"
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon data-icon="inline-start" />
        Borrar facturas nuevas
      </Button>

      <DialogContent className="sm:max-w-lg">
        {paso === "referencia" && (
          <>
            <DialogHeader>
              <DialogTitle>Borrar facturas nuevas</DialogTitle>
              <DialogDescription>
                Introduce el número de la última factura que quieres
                conservar. Se buscarán todas las facturas con número
                posterior (p. ej. las últimas 7-8 subidas por el robot
                UiPath) para poder revisarlas antes de borrar nada.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="referencia">Número de factura de referencia</Label>
              <Input
                id="referencia"
                placeholder="F-2026-00342"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => resetYCerrar(false)}>
                Cancelar
              </Button>
              <Button onClick={buscar} disabled={cargando || !referencia.trim()}>
                {cargando && <Loader2Icon className="animate-spin" />}
                Buscar facturas nuevas
              </Button>
            </DialogFooter>
          </>
        )}

        {(paso === "confirmar" || paso === "borrando") && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangleIcon className="size-4" />
                Confirmar borrado de {facturas.length} factura
                {facturas.length === 1 ? "" : "s"}
              </DialogTitle>
              <DialogDescription>
                Esta acción es irreversible: se borrarán estas facturas y sus
                líneas, vínculos con albaranes y casos de excepción
                asociados. Revisa las referencias antes de confirmar.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Nº factura</th>
                    <th className="px-3 py-2 text-left">Proveedor</th>
                    <th className="px-3 py-2 text-left">Fecha</th>
                    <th className="px-3 py-2 text-right">Total EUR</th>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setPaso("referencia")}
                disabled={paso === "borrando"}
              >
                Atrás
              </Button>
              <Button
                variant="destructive"
                onClick={confirmarBorrado}
                disabled={paso === "borrando"}
              >
                {paso === "borrando" && (
                  <Loader2Icon className="animate-spin" />
                )}
                Sí, borrar {facturas.length} factura
                {facturas.length === 1 ? "" : "s"} definitivamente
              </Button>
            </DialogFooter>
          </>
        )}

        {paso === "hecho" && (
          <>
            <DialogHeader>
              <DialogTitle>Facturas borradas</DialogTitle>
              <DialogDescription>
                Se han borrado {borradas} factura{borradas === 1 ? "" : "s"} y
                sus datos relacionados.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => resetYCerrar(false)}>Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
