# Sistema de Subreparto de Nómina

Sistema integral para la gestión y distribución de nómina basado en horas trabajadas por cliente.

## Características Principales

### 🎨 Diseño de Marca
- Colores corporativos: #303483 (azul oscuro) y #bbd531 (verde lima)
- Interfaz moderna y consistente

### 👥 Tres Perfiles de Usuario

#### 1. Perfil Administrativo
- Carga de archivo Excel maestro con información de empleados
- Gestión de clientes y elementos PEP por unidad de negocio
- Agregado rápido manual de empleados y clientes
- Visualización de distribución de nómina por porcentaje
- Sistema de validación automática (distribución debe sumar 100%)
- Cierre de nómina con reporte detallado

#### 2. Perfil Coordinador
- Registro de horas trabajadas con selección de fecha
- Revisión y aprobación de entradas de nómina
- Visualización de historial organizado por fecha
- Confirmación de valores ingresados por empleados

#### 3. Perfil Operativo
- Interfaz simplificada para registro de horas
- Selección de fecha mediante calendario
- Registro de cliente y horas trabajadas
- Historial organizado por fecha
- Estadísticas de horas diarias y totales

### 📅 Registro por Fecha con Calendario Interactivo
- Calendario visual mensual que muestra todos los días
- Haz clic en cualquier día para abrir el formulario de registro
- Muestra las horas ya registradas en cada día del calendario
- Indicador visual del día actual
- Navegación entre meses
- Posibilidad de registrar horas de días anteriores
- Prevención de registro en fechas futuras
- Historial organizado cronológicamente por fecha

### 📊 Exportación a Excel
- Los administradores pueden descargar el cierre de nómina en formato Excel/CSV
- Incluye toda la información de distribución: empleados, clientes, PEP, porcentajes y montos
- Archivo listo para procesar o importar en otros sistemas

### 💰 Distribución de Nómina
- Cálculo automático de porcentajes según horas trabajadas
- Distribución de salarios entre diferentes clientes
- Validación de que la distribución suma 100%
- Visualización por empleado y por cliente
- Reportes detallados con elementos PEP

## Usuarios de Prueba

- **123456** - Perfil Administrativo
- **234567** - Perfil Coordinador
- **345678** - Perfil Operativo

## Tecnologías

- React + TypeScript
- Tailwind CSS v4.0
- Shadcn/ui Components
- date-fns para manejo de fechas
