import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { HoursRecord } from './HoursHistoryByDate';
import { areasEnCompanyAPI } from '../services/api';

interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
  areas: string[];
}



interface CalendarHoursEntryProps {
  clientes: Cliente[];
  onSave: (clienteId: string, horas: number, fecha: Date, areaCliente?: string) => void;
  existingRecords?: HoursRecord[];
  recordToEdit?: HoursRecord | null;
  onCancelEdit?: () => void;
}

export function CalendarHoursEntry({
  clientes,
  onSave,
  existingRecords = [],
  recordToEdit,
  onCancelEdit
}: CalendarHoursEntryProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [areaCliente, setAreaCliente] = useState<string>('');
  const [dynamicAreas, setDynamicAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Effect to handle edit mode
  useEffect(() => {
    if (recordToEdit) {
      setSelectedDate(new Date(recordToEdit.fecha + 'T12:00:00')); // Use noon to avoid timezone overlaps
      setSelectedCliente(recordToEdit.clienteId);
      setHoras(recordToEdit.horas.toString());
      setAreaCliente(recordToEdit.areaCliente || '');
      setDialogOpen(true);
    }
  }, [recordToEdit]);

  // Effect para cargar áreas dinámicamente cuando cambia el cliente
  useEffect(() => {
    const loadAreasForCliente = async () => {
      if (!selectedCliente) {
        setDynamicAreas([]);
        return;
      }

      try {
        setLoadingAreas(true);
        
        // SIEMPRE consultar el backend para garantizar datos frescos y correctos
        const areasData = await areasEnCompanyAPI.getByCompany(selectedCliente);
        
        const areaNames = areasData
          .map(a => a.nombre_area)
          .filter((name): name is string => name !== null && name !== undefined && name.trim().length > 0)
          .map(name => name.trim());
        
        setDynamicAreas(areaNames);
      } catch (err) {
        console.error("❌ Error al cargar áreas:", err);
        setDynamicAreas([]);
      } finally {
        setLoadingAreas(false);
      }
    };

    loadAreasForCliente();
  }, [selectedCliente, clientes]);

  // Handle dialog close (reset edit state)
  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open && onCancelEdit) {
      onCancelEdit();
    }
    if (!open) {
      // Reset form if closing
      setSelectedCliente('');
      setHoras('');
      setAreaCliente('');
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDayClick = (date: Date) => {
    if (date > new Date()) return; // No permitir fechas futuras
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones estrictas
    if (!selectedCliente) {
      return;
    }

    if (!areaCliente || !areaCliente.trim()) {
      return;
    }

    if (!horas || parseFloat(horas) <= 0) {
      return;
    }

    if (!selectedDate) {
      return;
    }

    const areaClienteValue = areaCliente.trim();

    onSave(selectedCliente, parseFloat(horas), selectedDate, areaClienteValue);
    setDialogOpen(false);
    
    // Reset is handled by useEffect or handleOpenChange if strictly needed, 
    // but usually good to reset here too for creating new entries
    if (!recordToEdit) {
      setSelectedCliente('');
      setHoras('');
      setAreaCliente('');
    }
  };

  const handleAreaChange = (newArea: string) => {
    setAreaCliente(newArea);
    // Si hay un cliente seleccionado que no tiene esta área, limpiar la selección del cliente
    if (selectedCliente) {
      const cliente = clientes.find(c => c.elementoPEP === selectedCliente);
      if (cliente && !cliente.areas.includes(newArea)) {
        setSelectedCliente('');
      }
    }
  };

  const handleClienteChange = (newClienteId: string) => {
    setSelectedCliente(newClienteId);
    // Validar si el área actual es válida para el nuevo cliente
    // Si es válida, mantenerla; si no, limpiarla
    if (areaCliente) {
      const nuevoCliente = clientes.find(c => c.elementoPEP === newClienteId);
      if (nuevoCliente && !nuevoCliente.areas.includes(areaCliente)) {
        // El área NO existe en el nuevo cliente, limpiarla
        setAreaCliente('');
      }
      // Si el área EXISTS, la mantenemos (no hacemos nada)
    }
  };

  // Función helper para limpiar y validar áreas
  const cleanAreas = (areas: string[]) => {
    return Array.from(new Set(
      areas
        .filter(area => area && typeof area === 'string' && area.trim().length > 0)
        .map(area => area.trim())
    )).sort();
  };

  const getHoursForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingRecords
      .filter(record => record.fecha === dateStr)
      .reduce((sum, record) => sum + record.horas, 0);
  };

  const selectedClienteData = clientes.find(c => c.elementoPEP === selectedCliente);

  // Obtener todas las áreas únicas de todos los clientes (para el dropdown de área)
  const allAreas = cleanAreas(clientes.flatMap(c => c.areas || []));

  // Filtrar clientes basado en el área seleccionada
  const filteredClientes = areaCliente
    ? clientes.filter(c => c.areas && c.areas.includes(areaCliente))
    : clientes;

  // Usar áreas dinámicas cargadas del backend, o áreas estáticas si no hay dinámicas
  const filteredAreas = cleanAreas(
    selectedCliente && dynamicAreas.length > 0
      ? dynamicAreas
      : (selectedCliente ? selectedClienteData?.areas || [] : allAreas)
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Calendario de Registro de Horas</CardTitle>
              <CardDescription>
                Haz clic en un día para registrar horas trabajadas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[180px] text-center capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                disabled={currentMonth >= new Date()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Leyenda */}
          <div className="flex flex-wrap gap-4 mb-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[#bbd531] bg-[#bbd531]/10"></div>
              <span className="text-gray-600">Hoy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[#303483]/20 bg-[#303483]/5"></div>
              <span className="text-gray-600">Con horas registradas</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-gray-200 bg-gray-100"></div>
              <span className="text-gray-600">Fecha futura</span>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Encabezados de días */}
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
              <div key={day} className="text-center text-sm text-gray-500 p-2">
                {day}
              </div>
            ))}

            {/* Días vacíos al inicio */}
            {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="p-2" />
            ))}

            {/* Días del mes */}
            {daysInMonth.map((day) => {
              const hoursForDay = getHoursForDate(day);
              const isToday = isSameDay(day, new Date());
              const isFuture = day > new Date();
              const hasHours = hoursForDay > 0;

              return (
                <button
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  disabled={isFuture}
                  className={`
                    min-h-[80px] p-2 rounded-lg border-2 transition-all relative
                    ${isFuture ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'hover:border-[#303483] hover:bg-[#303483]/5 hover:shadow-sm cursor-pointer border-gray-200'}
                    ${isToday ? 'border-[#bbd531] bg-[#bbd531]/10 shadow-sm' : ''}
                    ${hasHours && !isToday ? 'bg-[#303483]/5 border-[#303483]/20' : ''}
                  `}
                  style={{
                    backgroundColor: isToday ? '#bad53194' : isFuture ? '#f0f0f0' : 'transparent',
                  }}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-sm ${isToday ? 'text-[#303483] ' : isFuture ? 'text-gray-400' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                    {hasHours && (
                      <div className="mt-auto flex justify-center">
                        <div className="text-xs bg-[#303483] text-white rounded-full px-2 py-0.5">
                          {hoursForDay}h
                        </div>
                      </div>
                    )}
                    {isToday && !hasHours && (
                      <div className="mt-auto flex justify-center">
                        <div className="text-xs text-[#303483]">Hoy</div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{recordToEdit ? 'Editar Reporte' : 'Registrar Horas'}</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="areaCliente">Área del Cliente / Proceso</Label>
              <Select value={areaCliente} onValueChange={handleAreaChange}>
                <SelectTrigger id="areaCliente">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {filteredAreas
                    .filter(area => area && area.trim() && typeof area === 'string')
                    .map((area, idx) => (
                      <SelectItem key={`area-${idx}-${area}`} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {selectedCliente
                  ? 'Áreas disponibles para el cliente seleccionado'
                  : 'Selecciona un área para filtrar los clientes disponibles'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={selectedCliente} onValueChange={handleClienteChange}>
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClientes.map((cliente, idx) => (
                    <SelectItem key={`cliente-${idx}-${cliente.elementoPEP}`} value={cliente.elementoPEP}>
                      {cliente.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClienteData && (
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Elemento PEP: {selectedClienteData.elementoPEP}</p>
                  <p>Áreas: {(dynamicAreas.length > 0 ? dynamicAreas : selectedClienteData.areas).join(', ') || 'Cargando...'}</p>
                  {loadingAreas && <p className="text-xs text-blue-600">Cargando áreas...</p>}
                </div>
              )}
              <p className="text-xs text-gray-500">
                {areaCliente
                  ? 'Clientes con el área seleccionada'
                  : 'Todos los clientes disponibles'
                }
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horas">Número de Horas</Label>
              <Input
                id="horas"
                type="number"
                min="0.5"
                step="0.5"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
                placeholder="8"
                required
              />
            </div>

            <div className="bg-[#bbd531]/10 border border-[#bbd531]/30 rounded-lg p-3 text-sm text-gray-700">
              💡 Puedes registrar fracciones de hora (ej: 0.5, 1.5, 2.5)
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!selectedCliente || !horas || !areaCliente}>
                <Save className="w-4 h-4 mr-2" />
                Guardar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
