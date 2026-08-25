// Regenera las facturas del proveedor chino con el formato "Commercial Invoice"
// (referencia de diseño: ejemplo/facturas/F-2026-00349.pdf). Datos reales de Supabase.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "ejemplo", "facturas", "generadas_uipath");

const MESES_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDateEN(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MESES_EN[m - 1]} ${y}`;
}
function fmtNum(n) {
  return Number(n).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtInt(n) {
  return Number(n).toLocaleString("es-ES");
}
function csvFor(id) {
  const h = createHash("sha1").update(id).digest("hex").toUpperCase();
  const suffix = id.replace(/\D/g, "").slice(-3).padStart(3, "0");
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${suffix}${h[12]}`;
}

// Datos reales (facturas + facturas_lineas) obtenidos vía Supabase MCP para los proveedores
// chinos PROV-008 (Guangzhou Fashion Co. Ltd) y PROV-009 (Shenzhen Textile Export Ltd).
const PROVEEDORES_CN = {
  "CN6000008": {
    nombre: "Guangzhou Fashion Co. Ltd",
    nombreChino: "广州时尚服装有限公司",
    proveedorId: "PROV-008",
    uscc: "91440101MA5CQK5X6M",
    swift: "ICBKCNBJGZH",
    bancoCorresponsal: "Citibank N.A. — New York",
  },
  "CN6000009": {
    nombre: "Shenzhen Textile Export Ltd",
    nombreChino: "深圳纺织出口有限公司",
    proveedorId: "PROV-009",
    uscc: "91440300MA5DXW2Y8B",
    swift: "BKCHCNBJSZX",
    bancoCorresponsal: "JPMorgan Chase Bank, N.A. — New York",
  },
};

const facturas = JSON.parse(readFileSync(join(__dirname, "facturas-data.json"), "utf-8"));

function html(f) {
  const prov = PROVEEDORES_CN[f.nif_proveedor];
  const csv = csvFor(f.factura_id);

  const filasLineas = f.lineas
    .map(
      (l) => `
      <tr>
        <td class="desc">${l.descripcion ?? "—"}</td>
        <td class="ref">${l.sku ?? "—"}</td>
        <td class="num">${fmtInt(l.cantidad)}</td>
        <td class="num">${fmtNum(l.precio_unitario_original)} CNY</td>
        <td class="num dto">${l.descuento_pct && Number(l.descuento_pct) > 0 ? fmtInt(l.descuento_pct) + " %" : "—"}</td>
        <td class="num importe">${fmtNum(l.total_linea_original)} CNY</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1c1c1c; margin: 0; padding: 32px; font-size: 13px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; background: #17181a; color: #fff; padding: 20px 24px; }
  .header h1 { font-size: 20px; margin: 0; letter-spacing: 0.3px; }
  .header .cn { font-size: 12px; color: #b7b7b7; margin-top: 4px; }
  .header .right { text-align: right; }
  .header .right h2 { font-size: 16px; margin: 0; letter-spacing: 0.3px; }
  .header .right .num { color: #c9a24b; font-weight: 700; margin-top: 4px; font-size: 13px; }
  .redbar { height: 5px; background: #b3272d; }
  .currency-chip { display: inline-block; border: 1px solid #e7b9bb; color: #b3272d; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 4px; margin: 16px 0 14px; }
  .parties { display: flex; gap: 20px; margin-bottom: 14px; }
  .party { flex: 1; }
  .chip { display: block; background: #f7e3e4; color: #b3272d; font-size: 10px; font-weight: 700; letter-spacing: 0.4px; padding: 5px 10px; margin-bottom: 8px; }
  .party p { margin: 2px 0; font-size: 12px; }
  .party p.name { font-weight: 700; font-size: 13px; }
  .meta-row { display: flex; gap: 12px; margin-bottom: 12px; }
  .meta-box { flex: 1; border: 1px solid #e2e2e2; border-radius: 6px; padding: 8px 12px; }
  .meta-box .label { display: block; font-size: 9px; color: #888; letter-spacing: 0.4px; margin-bottom: 3px; }
  .meta-box .value { font-weight: 700; font-size: 12px; }
  .bank { margin-bottom: 16px; }
  .bank p { margin: 3px 0; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  thead tr { background: #17181a; color: #fff; }
  thead th { text-align: left; font-size: 10.5px; padding: 8px 10px; font-weight: 700; letter-spacing: 0.3px; }
  thead th.num { text-align: right; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; font-size: 12px; }
  tbody td.num { text-align: right; }
  tbody td.ref { color: #666; }
  .totals { width: 300px; margin-left: auto; margin-top: 14px; }
  .totals .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
  .totals .total { border-top: 2px solid #17181a; margin-top: 6px; padding-top: 8px; font-weight: 700; font-size: 15px; }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>${prov.nombre.toUpperCase()}</h1>
      <div class="cn">${prov.nombreChino}</div>
    </div>
    <div class="right">
      <h2>COMMERCIAL INVOICE</h2>
      <div class="num">${f.numero_factura}</div>
    </div>
  </div>
  <div class="redbar"></div>
  <div style="padding: 0 4px;">
    <div class="currency-chip">CURRENCY: ${f.moneda_original}</div>
    <div class="parties">
      <div class="party">
        <span class="chip">SELLER</span>
        <p class="name">${prov.nombre}</p>
        <p>USCC: ${prov.uscc}</p>
        <p>Supplier ref.: ${prov.proveedorId}</p>
        <p>Reg. ID: ${f.nif_proveedor}</p>
      </div>
      <div class="party">
        <span class="chip">BUYER</span>
        <p class="name">Nextwear, S.L.</p>
        <p>Tax ID: ${f.nif_cliente}</p>
        <p>Madrid, Spain</p>
      </div>
    </div>
    <div class="meta-row">
      <div class="meta-box"><span class="label">Invoice date</span><span class="value">${fmtDateEN(f.fecha_expedicion)}</span></div>
      <div class="meta-box"><span class="label">Due date</span><span class="value">${fmtDateEN(f.fecha_vencimiento)}</span></div>
      <div class="meta-box"><span class="label">Payment terms</span><span class="value">T/T 60 days</span></div>
      <div class="meta-box"><span class="label">Currency</span><span class="value">${f.moneda_original}</span></div>
    </div>
    <div class="meta-row">
      <div class="meta-box"><span class="label">PO ref.</span><span class="value">${f.pedido_id_ref ?? "—"}</span></div>
      <div class="meta-box"><span class="label">Delivery note ref.</span><span class="value">${f.albaran_ids_ref ?? "—"}</span></div>
    </div>
    <span class="chip" style="display:inline-block; margin-bottom:8px;">BANK DETAILS</span>
    <div class="bank">
      <p><strong>SWIFT/BIC:</strong> ${prov.swift}</p>
      <p><strong>Correspondent bank (USD):</strong> ${prov.bancoCorresponsal}</p>
    </div>
    <table>
      <thead><tr>
        <th>Description</th><th>SKU</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Disc.</th><th class="num">Amount</th>
      </tr></thead>
      <tbody>${filasLineas}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Subtotal</span><span>${fmtNum(f.base_imponible_original)} ${f.moneda_original}</span></div>
      <div class="row"><span>VAT (${Number(f.tipo_iva).toFixed(0)}%)</span><span>${fmtNum(f.cuota_iva_original)} ${f.moneda_original}</span></div>
      <div class="row total"><span>TOTAL</span><span>${fmtNum(f.total_factura_original)} ${f.moneda_original}</span></div>
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
console.log(`Regeneradas ${count} facturas chinas (formato Commercial Invoice) en ${OUT_DIR}`);
