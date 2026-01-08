// Configuración de MSAL para autenticación con Microsoft Entra ID
// Ubicación: src/auth/msalConfig.js

import { LogLevel } from "@azure/msal-browser";

// ===========================================
// CREDENCIALES DE TU APLICACIÓN
// Estos valores los obtienes del portal de Azure
// después de registrar tu aplicación
// ===========================================

const msalConfig = {
  auth: {
    // El Client ID de tu aplicación registrada en Azure
    // Lo encuentras en: Azure Portal > Tu App > Overview > Application (client) ID
    clientId: import.meta.env.VITE_AZURE_CLIENTE_ID,

    // La URL de autoridad incluye tu Tenant ID
    // Lo encuentras en: Azure Portal > Tu App > Overview > Directory (tenant) ID
    // El formato es: https://login.microsoftonline.com/{tu-tenant-id}
    authority: `https://login.microsoftonline.com/${
      import.meta.env.VITE_AZURE_DIRECTORY_ID
    }`,

    // La URL a donde Microsoft redirige después del login
    // Debe coincidir EXACTAMENTE con la que registraste en Azure Portal
    // En desarrollo usamos localhost, en producción será tu dominio real
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,

    // URL a donde redirigir después de cerrar sesión (opcional)
    postLogoutRedirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
  },

  cache: {
    // Dónde guardar el token en el navegador
    // "sessionStorage" = se borra al cerrar el navegador
    // "localStorage" = persiste aunque cierres el navegador
    cacheLocation: "sessionStorage",

    // Poner en true si tienes problemas con IE11 (probablemente no lo necesitas)
    storeAuthStateInCookie: false,
  },

  system: {
    // Configuración de logs para depuración
    // En producción puedes cambiar LogLevel.Warning a LogLevel.Error
    loggerOptions: {
      loggerCallback: (level: any, message: any, containsPii: any) => {
        // containsPii indica si el mensaje contiene información personal
        // No logueamos información personal por seguridad
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning,
    },
  },
};

// ===========================================
// SCOPES (PERMISOS)
// Define qué información puedes solicitar del usuario
// ===========================================

// Scopes para el login inicial
// "User.Read" permite leer el perfil básico del usuario autenticado
export const loginRequest = {
  scopes: ["User.Read"],
};

// Si después necesitas acceder a más APIs de Microsoft (como leer emails, calendario, etc.)
// puedes agregar más scopes aquí
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};

export default msalConfig;
