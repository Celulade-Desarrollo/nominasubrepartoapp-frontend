// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://nominasubrepartoapp.onrender.com";

// Generic fetch wrapper with error handling
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Error de conexión' }));
        throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
}

// =====================
// TIPOS
// =====================

export interface Area {
    id: number;
    created_at: string;
    nombre_area: string;
    activo: boolean;
}

export interface Company {
    id: string;
    created_at: string;
    nombre_company: string;
    elemento_pep: string;
}

export interface IntermediArea {
    id: number;
    created_at: string;
    company_cliente: string;
    area_cliente: number;
    nombre_company?: string;
    nombre_area?: string;
}

export interface Reporte {
    id: number;
    created_at: string;
    horas: number;
    fecha_trabajada?: string;
    cliente: string;
    documento_id: number;
    area_trabajo: number;
    aprobado?: number; // 0: pendiente, 1: aprobado, 2: rechazado
    nombre_company?: string;
    nombre_area?: string;
    nombre_empleado?: string;
}

export interface Rol {
    id: number;
    created_at: string;
    nombre_rol: string;
}

export interface Usuario {
    id: string;
    created_at: string;
    documento_id: number;
    nombre_usuario: string;
    password?: string; // Only available on login endpoint
    rol: number;
    email: string | null;
    nombre_rol?: string;
}

// =====================
// AREAS API
// =====================

export const areasAPI = {
    getAll: () => fetchAPI<Area[]>('/Areas'),
    getById: (id: number) => fetchAPI<Area>(`/Areas/${id}`),
    create: (data: { nombre_area: string }) =>
        fetchAPI<Area>('/Areas', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { nombre_area?: string; activo?: boolean }) =>
        fetchAPI<Area>(`/Areas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};

// =====================
// COMPANIES API
// =====================

export const companiesAPI = {
    getAll: () => fetchAPI<Company[]>('/Companies'),
    getById: (id: string) => fetchAPI<Company>(`/Companies/${id}`),
    create: (data: { nombre_company: string; elemento_pep: string }) =>
        fetchAPI<Company>('/Companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { nombre_company?: string; elemento_pep?: string }) =>
        fetchAPI<Company>(`/Companies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
        fetchAPI<{ message: string; deleted: Company }>(`/Companies/${id}`, { method: 'DELETE' }),
};

// =====================
// AREAS EN COMPANY (INTERMEDIO) API
// =====================

export const areasEnCompanyAPI = {
    getAll: () => fetchAPI<IntermediArea[]>('/AreasEnCompany'),
    getById: (id: number) => fetchAPI<IntermediArea>(`/AreasEnCompany/${id}`),
    getByCompany: (companyId: string) => fetchAPI<IntermediArea[]>(`/AreasEnCompany/company/${companyId}`),
    create: (data: { company_cliente: string; area_cliente: number }) =>
        fetchAPI<IntermediArea>('/AreasEnCompany', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { company_cliente?: string; area_cliente?: number }) =>
        fetchAPI<IntermediArea>(`/AreasEnCompany/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
        fetchAPI<{ message: string; deleted: IntermediArea }>(`/AreasEnCompany/${id}`, { method: 'DELETE' }),
};

// =====================
// REPORTES API
// =====================

export const reportesAPI = {
    getAll: () => fetchAPI<Reporte[]>('/Reportes'),
    getById: (id: number) => fetchAPI<Reporte>(`/Reportes/${id}`),
    getByDocumento: (documentoId: number) => fetchAPI<Reporte[]>(`/Reportes/documento/${documentoId}`),
    getByCliente: (clienteId: string) => fetchAPI<Reporte[]>(`/Reportes/cliente/${clienteId}`),
    getByCoordinador: (coordinadorId: string) => fetchAPI<Reporte[]>(`/Reportes/coordinador/${coordinadorId}`),
    create: (data: { horas: number; fecha_trabajada: string; cliente: string; documento_id: number; area_trabajo: number; aprobado?: number }) =>
        fetchAPI<Reporte>('/Reportes', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { horas?: number; cliente?: string; documento_id?: number; area_trabajo?: number; aprobado?: number }) =>
        fetchAPI<Reporte>(`/Reportes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
        fetchAPI<{ message: string; deleted: Reporte }>(`/Reportes/${id}`, { method: 'DELETE' }),
};

// =====================
// ROLES API
// =====================

export const rolesAPI = {
    getAll: () => fetchAPI<Rol[]>('/Roles'),
    getById: (id: number) => fetchAPI<Rol>(`/Roles/${id}`),
    create: (data: { nombre_rol: string }) =>
        fetchAPI<Rol>('/Roles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: { nombre_rol: string }) =>
        fetchAPI<Rol>(`/Roles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: number) =>
        fetchAPI<{ message: string; deleted: Rol }>(`/Roles/${id}`, { method: 'DELETE' }),
};

// =====================
// USUARIOS API
// =====================

export const usuariosAPI = {
  getAll: () => fetchAPI<Usuario[]>("/Usuarios"),
  getById: (id: string) => fetchAPI<Usuario>(`/Usuarios/${id}`),
  getByDocumento: (documentoId: number) =>
  fetchAPI<Usuario>(`/Usuarios/documento/${documentoId}`),
  getByEmail: (email: string) => fetchAPI<Usuario>(`/Usuarios/email/${email}`),
  getByRol: (rolId: number) => fetchAPI<Usuario[]>(`/Usuarios/rol/${rolId}`),
  create: (data: {
    documento_id: number;
    nombre_usuario: string;
    password: string;
    rol: number;
    email?: string;
  }) =>
    fetchAPI<Usuario>("/Usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (
    id: string,
    data: {
      documento_id?: number;
      nombre_usuario?: string;
      password?: string;
      rol?: number;
      email?: string;
    }
  ) =>
    fetchAPI<Usuario>(`/Usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    fetchAPI<{ message: string; deleted: Usuario }>(`/Usuarios/${id}`, {
      method: "DELETE",
    }),
};

// =====================
// AUTH HELPER
// =====================

export async function loginUser(email: string, password: string): Promise<Usuario | null> {
    try {
        const user = await usuariosAPI.getByEmail(email);
        if (user && user.password === password) {
            // Don't return password to the app
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword as Usuario;
        }
        return null;
    } catch {
        return null;
    }
}
