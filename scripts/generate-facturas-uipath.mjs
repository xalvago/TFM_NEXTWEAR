// Generador de facturas PDF (formato Veri·factu) para entrenamiento de UiPath Document Understanding.
// Datos reales extraídos de Supabase (proyecto EBIS_TFM_RETAIL_NEXTWEAR). No se inventan importes ni proveedores.
import { chromium } from "playwright";
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "ejemplo", "facturas", "generadas_uipath");
mkdirSync(OUT_DIR, { recursive: true });

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MESES[m - 1]} ${y}`;
}

function fmtNum(n) {
  const v = Number(n);
  return v.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMoneda(n, moneda) {
  const s = fmtNum(n);
  return moneda === "EUR" ? `${s} €` : `${s} ${moneda}`;
}

function fmtInt(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString("es-ES");
}

function csvFor(id) {
  const h = createHash("sha1").update(id).digest("hex").toUpperCase();
  const suffix = id.replace(/\D/g, "").slice(-3).padStart(3, "0");
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${suffix}${h[12]}`;
}

function formaPago(raw) {
  if (!raw) return "Transferencia 60 días";
  const m = raw.match(/(\d+)/);
  return m ? `Transferencia ${m[1]} días` : "Transferencia 30 días";
}

// ---------------------------------------------------------------------------
// Datos reales (facturas + facturas_lineas) obtenidos vía Supabase MCP.
// ---------------------------------------------------------------------------
const dataFiles = ["facturas-data.json", "facturas-data-espana.json", "facturas-data-eu.json", "facturas-data-usa-nc.json"];
const facturas = dataFiles.flatMap((f) => JSON.parse(readFileSync(join(__dirname, f), "utf-8")));

function html(f) {
  const moneda = f.moneda_original;
  const esNC = !!f.es_nota_credito;
  const ivaPct = f.tipo_iva ? Number(f.tipo_iva).toFixed(0) : "21";
  const csv = csvFor(f.factura_id);
  const vencimiento = f.fecha_vencimiento || f.fecha_expedicion;

  const filasLineas = f.lineas
    .map(
      (l) => `
      <tr>
        <td class="desc">${l.descripcion ?? "—"}</td>
        <td class="ref">${l.sku ?? "—"}</td>
        <td class="num">${fmtInt(l.cantidad)}</td>
        <td class="num">${fmtMoneda(l.precio_unitario_original, moneda)}</td>
        <td class="num dto">${l.descuento_pct && Number(l.descuento_pct) > 0 ? fmtInt(l.descuento_pct) + " %" : "—"}</td>
        <td class="num importe">${fmtMoneda(l.total_linea_original, moneda)}</td>
      </tr>`
    )
    .join("");

  const bannerNC = esNC
    ? `<div class="nc-banner">Rectifica la factura <strong>${f.factura_original_id_num}</strong> del ${fmtDate(f.factura_original_id_fecha)} — ajuste parcial del importe facturado.</div>`
    : "";

  const refRow =
    f.pedido_id_ref || f.albaran_ids_ref
      ? `<div class="meta-row">
          <div class="meta-box"><span class="label">Ref. pedido</span><span class="value">${f.pedido_id_ref ?? "—"}</span></div>
          <div class="meta-box"><span class="label">Ref. albarán(es)</span><span class="value">${f.albaran_ids_ref ?? "—"}</span></div>
        </div>`
      : "";

  const ibanLine = f.iban_proveedor ? `<p>IBAN: ${f.iban_proveedor}</p>` : "";

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1c1c1c; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: center; background: #1c3f66; color: #fff; padding: 18px 24px; border-radius: 6px; }
  .header h1 { font-size: 22px; margin: 0; letter-spacing: 0.3px; }
  .veri { background: #fff; color: #1c3f66; border-radius: 20px; padding: 6px 16px; text-align: right; }
  .veri .top { font-weight: 700; font-size: 13px; }
  .veri .top::before { content: "✓ "; color: #2e9e5b; }
  .veri .bottom { font-size: 8px; letter-spacing: 0.5px; color: #555; }
  .numfac { font-size: 22px; font-weight: 700; margin: 18px 0 6px; }
  hr { border: none; border-top: 1px solid #e2e2e2; margin: 8px 0 18px; }
  .parties { display: flex; gap: 20px; margin-bottom: 18px; }
  .party { flex: 1; }
  .chip { display: inline-block; background: #e7eef7; color: #1c3f66; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; padding: 3px 10px; border-radius: 10px; margin-bottom: 6px; }
  .party p { margin: 2px 0; font-size: 12px; }
  .party p.name { font-weight: 700; font-size: 13px; }
  .meta-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .meta-box { flex: 1; border: 1px solid #e2e2e2; border-radius: 6px; padding: 8px 12px; }
  .meta-box .label { display: block; font-size: 9px; color: #888; letter-spacing: 0.4px; margin-bottom: 3px; }
  .meta-box .value { font-weight: 700; font-size: 12px; }
  .nc-banner { background: #fdf3e0; border: 1px solid #f0cd8a; color: #7a5a10; padding: 10px 14px; border-radius: 6px; margin-bottom: 14px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  thead tr { background: #1c3f66; color: #fff; }
  thead th { text-align: left; font-size: 10.5px; padding: 8px 10px; font-weight: 700; letter-spacing: 0.3px; }
  thead th.num { text-align: right; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  tbody td.num { text-align: right; }
  tbody td.ref { color: #666; }
  .totals { width: 300px; margin-left: auto; margin-top: 14px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .totals .total { border-top: 2px solid #1c3f66; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; color: #1c3f66; }
  .footer { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 40px; border-top: 1px solid #eee; padding-top: 14px; }
  .qr { width: 46px; height: 46px; background:
    repeating-linear-gradient(0deg, #000 0 4px, #fff 4px 8px),
    repeating-linear-gradient(90deg, #000 0 4px, #fff 4px 8px);
    background-blend-mode: multiply; border: 1px solid #000; }
  .foot-left { display: flex; gap: 10px; }
  .foot-left p { margin: 2px 0; font-size: 10px; color: #666; }
  .foot-right { text-align: right; }
  .verificada { color: #2e9e5b; font-weight: 700; font-size: 11px; }
  .csv { font-family: "Courier New", monospace; font-size: 10px; color: #777; margin-top: 4px; }
</style></head>
<body>
  <div class="header">
    <h1>${esNC ? "NOTA DE CRÉDITO" : "FACTURA ELECTRÓNICA"}</h1>
    <div class="veri"><div class="top">Veri·factu</div><div class="bottom">SISTEMA DE EMISIÓN VERIFICABLE</div></div>
  </div>
  <div class="numfac">${f.numero_factura}</div>
  <hr />
  <div class="parties">
    <div class="party">
      <span class="chip">EMISOR</span>
      <p class="name">${f.razon_social_proveedor}</p>
      <p>NIF: ${f.nif_proveedor}</p>
      <p>${f.direccion_proveedor}</p>
      ${ibanLine}
    </div>
    <div class="party">
      <span class="chip">CLIENTE</span>
      <p class="name">${f.razon_social_cliente}</p>
      <p>NIF: ${f.nif_cliente}</p>
      <p>Madrid, España</p>
    </div>
  </div>
  <div class="meta-row">
    <div class="meta-box"><span class="label">Expedición</span><span class="value">${fmtDate(f.fecha_expedicion)}</span></div>
    <div class="meta-box"><span class="label">Vencimiento</span><span class="value">${fmtDate(vencimiento)}</span></div>
    <div class="meta-box"><span class="label">Forma de pago</span><span class="value">${formaPago(f.forma_pago)}</span></div>
    <div class="meta-box"><span class="label">Moneda</span><span class="value">${moneda}</span></div>
  </div>
  ${refRow}
  ${bannerNC}
  <table>
    <thead><tr>
      <th>Descripción</th><th>Referencia</th><th class="num">Cant.</th><th class="num">P. unit.</th><th class="num">Dto.</th><th class="num">Importe</th>
    </tr></thead>
    <tbody>${filasLineas}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Base imponible</span><span>${fmtMoneda(f.base_imponible_original, moneda)}</span></div>
    <div class="row"><span>IVA (${ivaPct}%)</span><span>${fmtMoneda(f.cuota_iva_original, moneda)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${fmtMoneda(f.total_factura_original, moneda)}</span></div>
  </div>
  <div class="footer">
    <div class="foot-left">
      <div class="qr"></div>
      <div>
        <p>Factura emitida bajo el sistema <strong>Veri·factu</strong>.</p>
        <p>Verificable en <strong>www.agenciatributaria.gob.es</strong></p>
      </div>
    </div>
    <div class="foot-right">
      <div class="verificada">✓ VERIFICADA</div>
      <div class="csv">CSV: ${csv}</div>
    </div>
  </div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage();

let count = 0;
for (const f of facturas) {
  await page.setContent(html(f), { waitUntil: "load" });
  const outPath = join(OUT_DIR, `${f.numero_factura}.pdf`);
  await page.pdf({ path: outPath, format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  count++;
}

await browser.close();
console.log(`Generadas ${count} facturas en ${OUT_DIR}`);
