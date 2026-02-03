import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LogOut, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { CalendarHoursEntry } from './CalendarHoursEntry';
import { CalendarInstructions } from './CalendarInstructions';
import { HoursHistoryByDate, HoursRecord } from './HoursHistoryByDate';
import { Alert, AlertDescription } from './ui/alert';
import { areasEnCompanyAPI, reportesAPI, settingsAPI } from '../services/api';
import { es } from 'date-fns/locale';
import type { User } from '../App';
import compunetLogo from '../assets/images/compunet_logo.jpg';

interface OperativeDashboardProps {
  user: User;
  onLogout: () => void;
}



interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
  areas: string[];
}

export function OperativeDashboard({ user, onLogout }: OperativeDashboardProps) {
  const [hoursRecords, setHoursRecords] = useState<HoursRecord[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<HoursRecord | null>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    if (user && user.cedula) {
      loadData(user);
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user.cedula]);

  const loadSettings = async () => {
    try {
      const data = await settingsAPI.getAll();
      setSettings(data);
    } catch (err) {
      console.error("Error loading settings:", err);
    }
  };

  const loadData = async (currentUser: User) => {
    try {
      setLoading(true);
      // Load active companies and their areas (backend filters by is_active=true)
      const activeCompaniesWithAreas = await areasEnCompanyAPI.getAllCompanies();

      // Group by company
      const companiesMap = new Map<string, Cliente>();
      activeCompaniesWithAreas.forEach((item: any) => {
        if (!companiesMap.has(item.company_cliente)) {
          companiesMap.set(item.company_cliente, {
            id: item.company_cliente,
            nombre: item.nombre_company,
            elementoPEP: item.elemento_pep,
            areas: [],
          });
        }
        const cliente = companiesMap.get(item.company_cliente);
        if (cliente && item.nombre_area) {
          cliente.areas.push(item.nombre_area);
        }
      });

      const activeClientesWithAreas = Array.from(companiesMap.values());
      setClientes(activeClientesWithAreas);

      // Load existing reports for this user
      if (currentUser.cedula) {
        const documentoId = parseInt(currentUser.cedula);
        const reportes = await reportesAPI.getByDocumento(documentoId);

        const mappedRecords: HoursRecord[] = reportes.map(r => ({
          id: r.id,
          clienteId: r.cliente,
          clienteNombre: r.nombre_company || 'Desconocido',
          elementoPEP: '', // We would need to join this or fetch it, currently optional in UI
          horas: parseFloat(r.horas.toString()),
          // Use fecha_trabajada if available, otherwise fallback to created_at
          fecha: r.fecha_trabajada ? new Date(r.fecha_trabajada).toISOString().split('T')[0] : new Date(r.created_at).toISOString().split('T')[0],
          areaCliente: r.nombre_area,
          documentoId: r.documento_id,
          aprobado: r.aprobado
        }));

        setHoursRecords(mappedRecords);
      }

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos del servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleEditReport = (record: HoursRecord) => {
    setEditingRecord(record);
  };

  const handleCancelEdit = () => {
    setEditingRecord(null);
  };

  const handleSaveHours = async (clienteId: string, horas: number, fecha: Date, areaCliente?: string, horaInicio?: string, horaFin?: string, descripcion?: string, tipoActividad?: string, latitud?: number, longitud?: number, firma?: string) => {
    try {
      // clienteId receives the elementoPEP now
      const cliente = clientes.find(c => c.elementoPEP === clienteId);
      if (!cliente) return;

      // Find area ID based on name (reverse lookup needed because select uses names)
      let areaTrabajoId = 0;

      if (areaCliente) {
        const areas = await areasEnCompanyAPI.getByCompany(cliente.id);
        const foundArea = areas.find(a => a.nombre_area === areaCliente);
        if (foundArea) {
          areaTrabajoId = foundArea.area_cliente;
        }
      }

      const formattedDate = format(fecha, 'yyyy-MM-dd');

      if (editingRecord && editingRecord.id) {
        // UPDATE EXISTING REPORT
        await reportesAPI.update(editingRecord.id, {
          horas: horas,
          cliente: clienteId,
          area_trabajo: areaTrabajoId,
          aprobado: 0, // Reset to pending when edited
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          descripcion,
          tipo_actividad: tipoActividad,
          latitud,
          longitud,
          firma
        });

        // Update local state
        setHoursRecords(hoursRecords.map(r =>
          r.id === editingRecord.id ? {
            ...r,
            horas,
            clienteId,
            clienteNombre: cliente.nombre,
            areaCliente,
            aprobado: 0,
            fecha: formattedDate
          } : r
        ));

        setEditingRecord(null);
        setShowSuccess(true);
      } else {
        // CREATE NEW REPORT
        const newReport = await reportesAPI.create({
          horas: horas,
          fecha_trabajada: formattedDate,
          cliente: clienteId,
          documento_id: parseInt(user.cedula),
          area_trabajo: areaTrabajoId,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          descripcion,
          tipo_actividad: tipoActividad,
          latitud,
          longitud,
          firma
        });

        // Update local state
        const newRecord: HoursRecord = {
          id: newReport.id,
          clienteId,
          clienteNombre: cliente.nombre,
          elementoPEP: '',
          horas,
          fecha: formattedDate,
          areaCliente,
          aprobado: 0
        };

        setHoursRecords([...hoursRecords, newRecord]);
        setShowSuccess(true);
      }

      setTimeout(() => setShowSuccess(false), 3000);

    } catch (err) {
      console.error('Error saving/updating hours:', err);
      setError('Error al guardar el reporte');
    }
  };

  const totalHorasHoy = hoursRecords
    .filter(r => r.fecha === new Date().toISOString().split('T')[0])
    .reduce((sum, record) => sum + record.horas, 0);

  const totalHorasMes = hoursRecords
    .filter(r => {
      const rDate = new Date(r.fecha + 'T12:00:00');
      const now = new Date();
      return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, record) => sum + record.horas, 0);

  const totalHoras = hoursRecords.reduce((sum, record) => sum + record.horas, 0);

  const MONTHLY_TARGET = 176;
  const mesActual = format(new Date(), 'MMMM', { locale: es });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#303483]" />
        <span className="ml-2 text-gray-600">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={compunetLogo}
                alt="Compunet Logo"
                className="h-10 w-auto object-contain"
              />
              <div>
                <h1 className="text-gray-900">Registro de Horas</h1>
                <p className="text-sm text-gray-500">Bienvenido, {user.nombre}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {showSuccess && (
            <Alert className="bg-[#bbd531]/20 border-[#bbd531]">
              <CheckCircle2 className="h-4 w-4 text-[#303483]" />
              <AlertDescription className="text-[#303483]">
                Horas registradas correctamente
              </AlertDescription>
            </Alert>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Horas Hoy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-[#303483] mr-3" />
                  <span className="text-3xl">{totalHorasHoy}h</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Horas Registradas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Clock className="w-8 h-8 text-[#bbd531] mr-3" />
                  <span className="text-3xl">{totalHoras}h</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Acumulado {mesActual}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <CheckCircle2 className="w-8 h-8 text-[#bbd531] mr-3" />
                    <span className="text-3xl font-bold">{totalHorasMes} <span className="text-lg text-gray-400 font-normal">/ {MONTHLY_TARGET}h</span></span>
                  </div>
                  <div className="mt-4 w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="bg-[#303483] h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (totalHorasMes / MONTHLY_TARGET) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500 text-right">
                    {Math.round((totalHorasMes / MONTHLY_TARGET) * 100)}% de la meta mensual
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <CalendarInstructions />

          {/* Hours Entry */}
          <CalendarHoursEntry
            clientes={clientes}
            onSave={handleSaveHours}
            existingRecords={hoursRecords}
            recordToEdit={editingRecord}
            onCancelEdit={handleCancelEdit}
            settings={settings}
          />

          {/* Recent Records */}
          {hoursRecords.length > 0 && (
            <HoursHistoryByDate
              records={hoursRecords}
              onEdit={handleEditReport}
            />
          )}
        </div>
      </main>
    </div>
  );
}
