import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { LogOut, Building2, Download } from 'lucide-react';
import { ClientesManager } from './ClientesManager';
import { ReportDownload } from './ReportDownload';
import type { User } from '../App';

interface AdminDashboardProps {
  user: User;
  onLogout: () => void;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
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
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients">
              <Building2 className="w-4 h-4 mr-2" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="download">
              <Download className="w-4 h-4 mr-2" />
              Descargar Reportes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-[#303483]" />
                  <div>
                    <CardTitle>Gestión de Clientes y Áreas</CardTitle>
                    <CardDescription>
                      Administra compañías clientes, elementos PEP y áreas de trabajo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ClientesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="download">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Download className="w-6 h-6 text-[#303483]" />
                  <div>
                    <CardTitle>Descargar Reportes de Horas</CardTitle>
                    <CardDescription>
                      Genera y descarga reportes consolidados de horas trabajadas por empresa y empleado
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ReportDownload />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
