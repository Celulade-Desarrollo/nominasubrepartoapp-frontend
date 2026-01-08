import { useState, useEffect } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { AdminDashboard } from "./components/AdminDashboard";
import { CoordinatorDashboard } from "./components/CoordinatorDashboard";
import { OperativeDashboard } from "./components/OperativeDashboard";
import { loginRequest } from "./auth/msalConfig";
import { usuariosAPI } from "./services/api";

export type UserProfile = "administrativo" | "coordinador" | "operativo" | null;

export interface User {
  id: string;
  cedula: string;
  nombre: string;
  perfil: UserProfile;
  rol: number;
  email: string;
}

const rolToProfile: Record<number, UserProfile> = {
  1: "operativo",
  2: "coordinador",
  3: "administrativo",
};






export default function App() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cuando el usuario se autentica con Microsoft, buscamos su info en nuestra BD
  useEffect(() => {
    const loadUserFromDatabase = async () => {
      // Si no está autenticado con Microsoft o ya tenemos el usuario cargado, no hacemos nada
      if (!isAuthenticated || !accounts[0] || user) {
        return;
      }

      setError(null);

      try {
        // Obtenemos el email del usuario autenticado con Microsoft
        const microsoftUser = accounts[0];
        const email = microsoftUser.username.toLowerCase(); // Este es el email corporativo

        console.log("Email de Microsoft:", email);
        console.log("Objeto completo de Microsoft:", microsoftUser);
        // Buscamos el usuario en nuestra base de datos por su email (Autenticado por Azure AD)
        const usuario = await usuariosAPI.getByEmail(email);

        if (usuario) {
          setUser({
            id: usuario.id,
            cedula: usuario.documento_id.toString(),
            nombre: usuario.nombre_usuario,
            perfil: rolToProfile[usuario.rol] || "operativo",
            rol: usuario.rol,
            email: email,
          });
        } else {
          // El usuario se autenticó con Microsoft pero no existe en nuestra BD
          // Esto puede pasar si es un empleado nuevo que aún no fue registrado
          setError(
            "Tu cuenta de Microsoft no está registrada en el sistema de nómina. Contacta al administrador."
          );
        }
      } catch (err) {
        console.error("Error loading user data:", err);
        setError("Error al cargar los datos del usuario. Verifica con tu administrador.");
      }
    };

    loadUserFromDatabase();
  }, [isAuthenticated, accounts, user]);

  // Función para cerrar sesión
  const handleLogout = () => {
    setUser(null);
    setError(null);
    instance.logoutPopup();
  };

  // Si no está autenticado, mostramos el botón de login con Azure AD
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Sistema de Nómina
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Ingresa con tu cuenta corporativa de Microsoft
          </p>

          <button
            onClick={() => instance.loginPopup(loginRequest)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-gray font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {/* Icono de Microsoft */}
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <rect x="1" y="1" width="9" height="9" fill="#f25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
              <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
              <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
            </svg>
            Iniciar Sesión con Microsoft
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Autenticado con Microsoft pero sin datos de nuestra BD todavía
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          {error ? (
            <>
              <h2 className="text-xl font-bold text-red-600 mb-4">
                Error de Acceso
              </h2>
              <p className="text-gray-600 mb-6">{error}</p>
              <button
                onClick={handleLogout}
                className="text-blue-600 hover:underline font-semibold"
              >
                Cerrar sesión e intentar con otra cuenta
              </button>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-gray-600">Cargando datos del usuario...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Usuario autenticado y con datos cargados - mostramos el dashboard correspondiente
  return (
    <div className="min-h-screen bg-gray-50">
      {user.perfil === "administrativo" && (
        <AdminDashboard user={user} onLogout={handleLogout} />
      )}
      {user.perfil === "coordinador" && (
        <CoordinatorDashboard user={user} onLogout={handleLogout} />
      )}
      {user.perfil === "operativo" && (
        <OperativeDashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
