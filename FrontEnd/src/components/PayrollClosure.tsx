import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Download, CheckCircle } from 'lucide-react';
import type { Employee, Cliente, HorasTrabajadas } from './AdminDashboard';

interface PayrollClosureProps {
  employees: Employee[];
  clientes: Cliente[];
  horasTrabajadas: HorasTrabajadas[];
}

interface ClosureRecord {
  cedula: string;
  nombre: string;
  salarioBruto: number;
  distribuciones: {
    clienteNombre: string;
    elementoPEP: string;
    porcentaje: number;
    monto: number;
  }[];
}

export function PayrollClosure({ employees, clientes, horasTrabajadas }: PayrollClosureProps) {
  const [isClosed, setIsClosed] = useState(false);

  const generateClosureData = (): ClosureRecord[] => {
    return employees.map(employee => {
      const employeeHours = horasTrabajadas.filter(
        h => h.empleadoCedula === employee.cedula
      );

      const totalHoras = employeeHours.reduce((sum, h) => sum + h.horas, 0);

      const distribuciones = employeeHours.map(hora => {
        const cliente = clientes.find(c => c.id === hora.clienteId);
        const porcentaje = totalHoras > 0 ? (hora.horas / totalHoras) * 100 : 0;
        const monto = (employee.salarioBruto * porcentaje) / 100;

        return {
          clienteNombre: cliente?.nombre || 'Desconocido',
          elementoPEP: cliente?.elementoPEP || 'N/A',
          porcentaje,
          monto,
        };
      });

      return {
        cedula: employee.cedula,
        nombre: employee.nombre,
        salarioBruto: employee.salarioBruto,
        distribuciones,
      };
    });
  };

  const closureData = generateClosureData();

  const handleClosureConfirmation = () => {
    setIsClosed(true);
  };

  const handleExportToExcel = () => {
    // Preparar datos para CSV (compatible con Excel)
    const headers = ['Cédula', 'Nombre', 'Salario Bruto', 'Cliente', 'Elemento PEP', 'Porcentaje', 'Monto'];
    const rows: string[][] = [];

    closureData.forEach(record => {
      if (record.distribuciones.length === 0) {
        rows.push([
          record.cedula,
          record.nombre,
          record.salarioBruto.toString(),
          'Sin distribución',
          '',
          '',
          ''
        ]);
      } else {
        record.distribuciones.forEach((dist, idx) => {
          rows.push([
            idx === 0 ? record.cedula : '',
            idx === 0 ? record.nombre : '',
            idx === 0 ? record.salarioBruto.toString() : '',
            dist.clienteNombre,
            dist.elementoPEP,
            dist.porcentaje.toFixed(2),
            dist.monto.toFixed(2)
          ]);
        });
      }
    });

    // Agregar fila de total
    rows.push([]);
    rows.push([
      'TOTAL',
      '',
      employees.reduce((sum, emp) => sum + emp.salarioBruto, 0).toString(),
      '',
      '',
      '',
      ''
    ]);

    // Convertir a CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Crear y descargar el archivo
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `cierre_nomina_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allEmployeesHaveHours = employees.every(emp => 
    horasTrabajadas.some(h => h.empleadoCedula === emp.cedula)
  );

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cierre de Nómina</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No hay empleados cargados. Por favor, carga el archivo maestro primero.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!allEmployeesHaveHours && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Algunos empleados no tienen horas registradas. El cierre estará incompleto.
          </AlertDescription>
        </Alert>
      )}

      {isClosed && (
        <Alert className="bg-[#bbd531]/20 border-[#bbd531]">
          <CheckCircle className="h-4 w-4 text-[#303483]" />
          <AlertDescription className="text-[#303483]">
            Cierre de nómina confirmado exitosamente
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cierre de Nómina</CardTitle>
          <CardDescription>
            Resumen final con nombre y valor bruto de cada empleado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {closureData.map((record, idx) => (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-gray-900">{record.nombre}</h3>
                    <p className="text-sm text-gray-500">Cédula: {record.cedula}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Salario Bruto</p>
                    <p className="text-gray-900">${record.salarioBruto.toLocaleString()}</p>
                  </div>
                </div>

                {record.distribuciones.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">Distribución:</p>
                    {record.distribuciones.map((dist, distIdx) => (
                      <div key={distIdx} className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm">
                        <div>
                          <span className="text-gray-900">{dist.clienteNombre}</span>
                          <span className="text-gray-500 ml-2">({dist.elementoPEP})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900">${dist.monto.toLocaleString()}</span>
                          <span className="text-gray-500 ml-2">({dist.porcentaje.toFixed(1)}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Sin horas registradas</p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span>Total Empleados:</span>
              <span>{employees.length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
              <span>Nómina Total Bruta:</span>
              <span>
                ${employees.reduce((sum, emp) => sum + emp.salarioBruto, 0).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={handleClosureConfirmation}
              disabled={isClosed || !allEmployeesHaveHours}
              className="flex-1"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Cierre
            </Button>
            <Button 
              onClick={handleExportToExcel}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
