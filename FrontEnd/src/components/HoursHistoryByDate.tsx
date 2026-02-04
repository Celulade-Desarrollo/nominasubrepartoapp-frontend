import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Edit2, CheckCircle, XCircle, Clock, MapPin } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface HoursRecord {
  id?: number;
  clienteId: string;
  clienteNombre: string;
  elementoPEP?: string;
  horas: number;
  fecha: string;
  areaCliente?: string;
  aprobado?: number; // 0: Pending, 1: Approved, 2: Rejected
  documentoId?: number;
  latitud?: number;
  longitud?: number;
  firma?: string;
  tipoActividad?: string;
  horaInicio?: string;
  horaFin?: string;
  descripcion?: string;
}

interface HoursHistoryByDateProps {
  records: HoursRecord[];
  onEdit?: (record: HoursRecord) => void;
}

export function HoursHistoryByDate({ records, onEdit }: HoursHistoryByDateProps) {
  // Agrupar registros por fecha
  const groupedByDate = records.reduce((acc, record) => {
    const fecha = record.fecha;
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(record);
    return acc;
  }, {} as Record<string, HoursRecord[]>);

  // Ordenar fechas de más reciente a más antigua
  const sortedDates = Object.keys(groupedByDate).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  const getStatusBadge = (aprobado?: number) => {
    switch (aprobado) {
      case 1:
        // Approved
        return (
          <Badge className="bg-[#bbd531] text-[#303483] hover:bg-[#bbd531]/90 px-2 py-0.5 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobado
          </Badge>
        );
      case 2:
        // Rejected
        return (
          <Badge variant="destructive" className="px-2 py-0.5 text-xs">
            <XCircle className="w-3 h-3 mr-1" />
            Rechazado
          </Badge>
        );
      case 3:
        // Approved (Only Normal Hours)
        return (
          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 px-2 py-0.5 text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Aprobado (Sin Extras)
          </Badge>
        );
      default:
        // Pending (0 or undefined)
        return (
          <Badge variant="secondary" className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 hover:bg-gray-300">
            <Clock className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
    }
  };

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-500">No hay registros de horas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historial por Fecha</CardTitle>
          <CardDescription>
            Horas registradas organizadas por día
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedDates.map((fecha) => {
              const dayRecords = groupedByDate[fecha];
              const totalHorasDelDia = dayRecords.reduce((sum, r) => sum + r.horas, 0);
              const formattedDate = format(new Date(fecha + 'T00:00:00'), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });

              return (
                <div key={fecha} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3 pb-3 border-b">
                    <div className="flex items-center">
                      <CalendarIcon className="w-4 h-4 text-[#303483] mr-2" />
                      <h3 className="capitalize text-gray-900">{formattedDate}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total</p>
                      <p className="text-[#303483]">{totalHorasDelDia}h</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {dayRecords.map((record, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="w-full">
                              <p className="text-gray-900 font-medium">{record.clienteNombre}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {record.elementoPEP && (
                                  <span className="text-sm text-gray-500">{record.elementoPEP}</span>
                                )}
                                {record.areaCliente && (
                                  <span className="text-sm text-[#303483] bg-[#303483]/10 px-2 py-0.5 rounded">
                                    {record.areaCliente}
                                  </span>
                                )}
                              </div>

                              {/* Información adicional: horarios, tipo, descripción */}
                              <div className="mt-2 space-y-1">
                                {record.horaInicio && record.horaFin && (
                                  <p className="text-xs text-gray-600">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {record.horaInicio} - {record.horaFin}
                                  </p>
                                )}
                                {record.tipoActividad && (
                                  <p className="text-xs text-gray-600">
                                    Tipo: <span className="font-medium">{record.tipoActividad}</span>
                                  </p>
                                )}
                                {record.descripcion && (
                                  <p className="text-xs text-gray-600 italic">
                                    "{record.descripcion}"
                                  </p>
                                )}
                              </div>

                              {/* Ubicación */}
                              {record.latitud && record.longitud && (
                                <div className="mt-2">
                                  <a
                                    href={`https://www.google.com/maps?q=${record.latitud},${record.longitud}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <MapPin className="w-3 h-3" />
                                    Ver ubicación
                                  </a>
                                </div>
                              )}

                              {/* Firma */}
                              {record.firma && (
                                <div className="mt-2">
                                  <p className="text-xs text-gray-600 mb-1">Firma:</p>
                                  <img
                                    src={record.firma}
                                    alt="Firma del cliente"
                                    className="max-w-[200px] border rounded"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 ml-4">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-900 font-bold">{record.horas}h</span>
                            {getStatusBadge(record.aprobado)}
                          </div>

                          {/* Show edit button ONLY if rejected (status 2) and onEdit is provided */}
                          {record.aprobado === 2 && onEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-gray-500 hover:text-[#303483]"
                              onClick={() => onEdit(record)}
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Editar
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
