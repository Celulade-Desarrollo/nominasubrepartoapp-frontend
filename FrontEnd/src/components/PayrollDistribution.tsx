import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, DollarSign, Percent } from 'lucide-react';
import type { Employee, Cliente, HorasTrabajadas } from './AdminDashboard';

interface PayrollDistributionProps {
  employees: Employee[];
  clientes: Cliente[];
  horasTrabajadas: HorasTrabajadas[];
}

interface Distribution {
  empleadoCedula: string;
  empleadoNombre: string;
  clienteId: string;
  clienteNombre: string;
  elementoPEP: string;
  horas: number;
  porcentaje: number;
  monto: number;
}

export function PayrollDistribution({ employees, clientes, horasTrabajadas }: PayrollDistributionProps) {
  // Calcular distribución
  const calculateDistribution = (): Distribution[] => {
    const distributions: Distribution[] = [];

    employees.forEach(employee => {
      // Obtener horas del empleado
      const employeeHours = horasTrabajadas.filter(
        h => h.empleadoCedula === employee.cedula
      );

      if (employeeHours.length === 0) return;

      // Total de horas del empleado
      const totalHoras = employeeHours.reduce((sum, h) => sum + h.horas, 0);

      // Calcular distribución por cliente
      employeeHours.forEach(hora => {
        const cliente = clientes.find(c => c.id === hora.clienteId);
        if (!cliente) return;

        const porcentaje = (hora.horas / totalHoras) * 100;
        const monto = (employee.salarioBruto * porcentaje) / 100;

        distributions.push({
          empleadoCedula: employee.cedula,
          empleadoNombre: employee.nombre,
          clienteId: hora.clienteId,
          clienteNombre: cliente.nombre,
          elementoPEP: cliente.elementoPEP,
          horas: hora.horas,
          porcentaje,
          monto,
        });
      });
    });

    return distributions;
  };

  const distributions = calculateDistribution();

  // Verificar que las distribuciones sumen 100% por empleado
  const employeePercentages = employees.map(emp => {
    const empDistributions = distributions.filter(d => d.empleadoCedula === emp.cedula);
    const totalPercentage = empDistributions.reduce((sum, d) => sum + d.porcentaje, 0);
    return {
      cedula: emp.cedula,
      nombre: emp.nombre,
      totalPercentage,
      isValid: Math.abs(totalPercentage - 100) < 0.01,
    };
  });

  if (employees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Nómina</CardTitle>
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
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Nómina por Porcentaje</CardTitle>
          <CardDescription>
            Distribución del salario según las horas trabajadas por cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distributions.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No hay horas registradas. Los empleados deben registrar sus horas trabajadas.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-6">
              {employees.map(employee => {
                const empDistributions = distributions.filter(
                  d => d.empleadoCedula === employee.cedula
                );
                const totalHoras = empDistributions.reduce((sum, d) => sum + d.horas, 0);
                const totalMonto = empDistributions.reduce((sum, d) => sum + d.monto, 0);
                const percentageInfo = employeePercentages.find(ep => ep.cedula === employee.cedula);

                if (empDistributions.length === 0) return null;

                return (
                  <div key={employee.cedula} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-gray-900">{employee.nombre}</h3>
                        <p className="text-sm text-gray-500">
                          Cédula: {employee.cedula} • Salario: ${employee.salarioBruto.toLocaleString()}
                        </p>
                      </div>
                      {percentageInfo && (
                        <div className="text-right">
                          <p className={`text-sm ${percentageInfo.isValid ? 'text-green-600' : 'text-red-600'}`}>
                            {percentageInfo.isValid ? '✓' : '⚠'} {percentageInfo.totalPercentage.toFixed(2)}%
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {empDistributions.map((dist, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-sm text-gray-900">{dist.clienteNombre}</p>
                              <p className="text-xs text-gray-500">{dist.elementoPEP}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-900">{dist.horas}h</p>
                              <p className="text-xs text-gray-500">{dist.porcentaje.toFixed(2)}%</p>
                            </div>
                          </div>
                          <div className="h-2 mb-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-[#bbd531]" 
                              style={{ width: `${dist.porcentaje}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-1" />
                              <span>${dist.monto.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Percent className="w-4 h-4 mr-1" />
                              <span>{dist.porcentaje.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="pt-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Horas:</span>
                          <span>{totalHoras}h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Total Distribuido:</span>
                          <span>${totalMonto.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary by Client */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por Cliente</CardTitle>
          <CardDescription>
            Total de costos distribuidos por cliente y elemento PEP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distributions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Cliente</th>
                    <th className="text-left p-2">Elemento PEP</th>
                    <th className="text-left p-2">Total Horas</th>
                    <th className="text-left p-2">Monto Total</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map(cliente => {
                    const clienteDistributions = distributions.filter(
                      d => d.clienteId === cliente.id
                    );
                    if (clienteDistributions.length === 0) return null;

                    const totalHoras = clienteDistributions.reduce((sum, d) => sum + d.horas, 0);
                    const totalMonto = clienteDistributions.reduce((sum, d) => sum + d.monto, 0);

                    return (
                      <tr key={cliente.id} className="border-b">
                        <td className="p-2">{cliente.nombre}</td>
                        <td className="p-2">{cliente.elementoPEP}</td>
                        <td className="p-2">{totalHoras}h</td>
                        <td className="p-2">${totalMonto.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No hay distribuciones para mostrar</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
