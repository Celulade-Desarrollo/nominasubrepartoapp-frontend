import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { LogOut, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { CalendarHoursEntry } from './CalendarHoursEntry';
import { CalendarInstructions } from './CalendarInstructions';
import { HoursHistoryByDate } from './HoursHistoryByDate';
import { PayrollReview } from './PayrollReview';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { companiesAPI, areasEnCompanyAPI, reportesAPI } from '../services/api';
import type { User } from '../App';

interface CoordinatorDashboardProps {
  user: User;
  onLogout: () => void;
}

export interface HoursRecord {
  clienteId: string;
  clienteNombre: string;
  horas: number;
  fecha: string;
  areaCliente?: string;
  aprobado?: number;
}

interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
  areas: string[];
}

export function CoordinatorDashboard({ user, onLogout }: CoordinatorDashboardProps) {
  const [hoursRecords, setHoursRecords] = useState<HoursRecord[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar las áreas y empresas específicas del coordinador usando documento_id
      const coordinadorDocumentoId = String(user.documento_id);
      console.log("📊 Cargando datos del coordinador:", coordinadorDocumentoId);
      
      const areasData = await areasEnCompanyAPI.getAreasByCoordinator(coordinadorDocumentoId);
      const companiesData = await areasEnCompanyAPI.getByCoordinator(coordinadorDocumentoId);

      const clientesWithAreas: Cliente[] = companiesData.map((company) => ({
        id: company.company_cliente,
        nombre: company.nombre_company,
        elementoPEP: company.elemento_pep,
        areas: [company.nombre_area],
      }));

      setClientes(clientesWithAreas);
      console.log("✅ Datos del coordinador cargados:", clientesWithAreas);
    } catch (error) {
      console.error("❌ Error al cargar datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHours = async (clienteId: string, horas: number, fecha: Date, areaCliente?: string) => {
    try {
      const cliente = clientes.find(c => c.elementoPEP === clienteId);
      if (!cliente) return;

      let areaTrabajoId = 0;
      if (areaCliente) {
        const areas = await areasEnCompanyAPI.getByCompany(cliente.id);
        const foundArea = areas.find(a => a.nombre_area === areaCliente);
        if (foundArea) {
          areaTrabajoId = foundArea.area_cliente;
        }
      }

      await reportesAPI.create({
        horas,
        fecha_trabajada: fecha.toISOString().split('T')[0],
        cliente: clienteId,
        documento_id: parseInt(user.cedula),
        area_trabajo: areaTrabajoId,
        aprobado: 1 // Auto-approve for coordinators
      });

      const newRecord: HoursRecord = {
        clienteId,
        clienteNombre: cliente.nombre,
        horas,
        fecha: fecha.toISOString().split('T')[0],
        areaCliente,
        aprobado: 1,
      };
      setHoursRecords([...hoursRecords, newRecord]);
    } catch (error) {
      console.error('Error saving hours:', error);
    }
  };

  const totalHoras = hoursRecords.reduce((sum, record) => sum + record.horas, 0);

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
            <div>
              <h1 className="text-gray-900">Panel de Coordinador</h1>
              <p className="text-sm text-gray-500">Bienvenido, {user.nombre}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="hours" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="hours">
              <Clock className="w-4 h-4 mr-2" />
              Mis Horas
            </TabsTrigger>
            <TabsTrigger value="review">
              <CheckCircle className="w-4 h-4 mr-2" />
              Revisar Nómina
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hours" className="space-y-6">
            <CalendarInstructions />

            <CalendarHoursEntry
              clientes={clientes}
              onSave={handleSaveHours}
              existingRecords={hoursRecords}
            />

            {hoursRecords.length > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Resumen Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-[#bbd531]/10 border border-[#bbd531]/30 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="w-8 h-8 text-[#303483] mr-3" />
                        <span className="text-gray-700">Total de horas registradas</span>
                      </div>
                      <span className="text-2xl text-[#303483]">{totalHoras}h</span>
                    </div>
                  </CardContent>
                </Card>
                <HoursHistoryByDate records={hoursRecords} />
              </>
            )}
          </TabsContent>

          <TabsContent value="review">
            <PayrollReview coordinatorId={user.cedula} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
