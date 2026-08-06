"use client";

import Script from "next/script";

declare global {
  interface Window {
    botpress?: {
      init: (config: Record<string, unknown>) => void;
    };
  }
}

const BOTPRESS_CONFIG = {
  botId: "7eca4b6e-dcb2-488b-851d-b774948a8e84",
  clientId: "eb7bdc71-8792-4649-9004-cce4561bf003",
  configuration: {
    version: "v2",
    composerPlaceholder: "Escribe tu consulta aquí...",
    botName: "Copiloto NextWear",
    botDescription: "Tu asistente de Cuentas por Pagar. Lánzame una consulta.",
    website: {},
    email: {},
    phone: {},
    termsOfService: {},
    privacyPolicy: {},
    color: "#7c3aed",
    variant: "solid",
    themeMode: "light",
    fontFamily: "Roboto",
    feedbackEnabled: true,
    footer: "[⚡ by Botpress](https://botpress.com/?from=webchat)",
    allowFileUpload: true,
    soundEnabled: true,
    conversationHistory: true,
    homePageEnabled: true,
    welcomeHeading: "¡Hola! Lánzame una consulta.",
    welcomeSubtitle: "",
    conversationStartersEnabled: true,
    conversationStarters: [
      {
        id: "invoice_status",
        text: "¿Hay facturas con entrega incompleta?",
        title: "Entregas y Facturas",
        icon: "truck",
        enabled: true,
        description: "¿Hay facturas con entrega incompleta?",
      },
      {
        id: "payment_timelines",
        text: "¿Hay facturas sin pedido?",
        title: "Pedidos y Facturas",
        icon: "circle-help",
        enabled: true,
        description: "¿Hay facturas sin pedido?",
      },
      {
        id: "approval_process",
        text: "¿Hay facturas duplicadas?",
        title: "Duplicados",
        enabled: true,
        icon: "users",
        description: "¿Hay facturas duplicadas?",
      },
      {
        id: "submission_guidelines",
        text: "¿Hay facturas con importe distinto?",
        title: "Importes erroneos",
        icon: "zap",
        enabled: true,
        description: "¿Hay facturas con importe distinto?",
      },
      {
        id: "6a45d93e-ce90-446e-af0c-d0843968e949",
        text: "¿Hay facturas con salto de divisa?",
        enabled: true,
        icon: "receipt",
        title: "Divisa",
        description: "¿Hay facturas con salto de divisa?",
      },
      {
        id: "8dd2abf1-9fd5-43a5-b89c-60467c07b4b8",
        text: "¿Hay notas de crédito?",
        enabled: true,
        icon: "gift",
        title: "Credito y Devoluciones",
        description: "¿Hay notas de crédito?",
      },
    ],
    conversationStartersDisplayStyle: "grid",
    citationsEnabled: true,
    agentPresenceEnabled: true,
  },
};

/** Widget de copiloto Botpress (conectado a Supabase), disponible en todas las pestañas vía su propio botón flotante. */
export function CopilotLauncher() {
  return (
    <Script
      src="https://cdn.botpress.cloud/webchat/v5.0/inject.js"
      strategy="afterInteractive"
      onReady={() => {
        window.botpress?.init(BOTPRESS_CONFIG);
      }}
    />
  );
}
