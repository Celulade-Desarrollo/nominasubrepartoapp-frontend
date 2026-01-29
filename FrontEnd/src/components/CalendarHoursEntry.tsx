import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Save, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { HoursRecord } from './HoursHistoryByDate';
import { areasEnCompanyAPI } from '../services/api';

// Fallback limits if settings not loaded
const WEEKLY_HOURS_LIMIT_DEFAULT = 44;
const DAILY_LIMITS_DEFAULT = {
  1: 9, // Lunes
  2: 9, // Martes
  3: 9, // Miércoles
  4: 9, // Jueves
  5: 8, // Viernes
  6: 0, // Sábado
  0: 0  // Domingo
};

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
  settings?: any;
}

export function CalendarHoursEntry({
  clientes,
  onSave,
  existingRecords = [],
  recordToEdit,
  onCancelEdit,
  settings
}: CalendarHoursEntryProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [areaCliente, setAreaCliente] = useState<string>('');
  const [dynamicAreas, setDynamicAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [weeklyHoursError, setWeeklyHoursError] = useState<string | null>(null);

  // Get active limits from settings or default
  const activeWeeklyLimit = settings?.weekly_limit || WEEKLY_HOURS_LIMIT_DEFAULT;
  const activeDailyLimits = useMemo(() => {
    if (settings?.daily_limits) {
      return {
        1: settings.daily_limits.monday,
        2: settings.daily_limits.tuesday,
        3: settings.daily_limits.wednesday,
        4: settings.daily_limits.thursday,
        5: settings.daily_limits.friday,
        6: settings.daily_limits.saturday,
        0: settings.daily_limits.sunday
      };
    }
    return DAILY_LIMITS_DEFAULT;
  }, [settings]);

  // Calcular horas de la semana para una fecha dada
  const getWeeklyHours = (date: Date): number => {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Lunes como inicio
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 }); // Domingo como fin

    return existingRecords
      .filter(record => {
        const recordDate = new Date(record.fecha + 'T12:00:00');
        return isWithinInterval(recordDate, { start: weekStart, end: weekEnd });
      })
      .reduce((sum, record) => sum + record.horas, 0);
  };

  // Calcular horas ya registradas en un día específico
  const getDailyHours = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return existingRecords
      .filter(record => record.fecha === dateStr)
      .reduce((sum, record) => sum + record.horas, 0);
  };

  // Calcular horas disponibles para la semana seleccionada
  const weeklyHoursInfo = useMemo(() => {
    if (!selectedDate) return { used: 0, remaining: activeWeeklyLimit };

    const usedHours = getWeeklyHours(selectedDate);
    // Si estamos editando, restar las horas del registro que editamos
    const editingHours = recordToEdit ? recordToEdit.horas : 0;
    const adjustedUsed = usedHours - editingHours;

    return {
      used: adjustedUsed,
      remaining: activeWeeklyLimit - adjustedUsed
    };
  }, [selectedDate, existingRecords, recordToEdit, activeWeeklyLimit]);

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

  // Auto-dismiss errors after 5 seconds
  useEffect(() => {
    if (weeklyHoursError) {
      const timer = setTimeout(() => {
        setWeeklyHoursError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [weeklyHoursError]);

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
    if (date.getDay() === 0) return; // No permitir domingos
    setSelectedDate(date);
    setDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWeeklyHoursError(null);

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

    // Validar que la empresa esté activa
    const selectedCompanyData = clientes.find(c => c.elementoPEP === selectedCliente);
    if (!selectedCompanyData) {
      setWeeklyHoursError('Cliente no encontrado o inactivo. Por favor recarga la página y selecciona otro cliente.');
      return;
    }

    const horasNumero = parseFloat(horas);
    const dayOfWeek = selectedDate.getDay() as keyof typeof activeDailyLimits;

    // Validar Límite Diario dinámico (incluye Sábado/Domingo si es 0)
    const maxPermitido = activeDailyLimits[dayOfWeek];

    // Calcular horas ya registradas ese día
    const horasYaRegistradas = getDailyHours(selectedDate);
    // Si estamos editando, restar las horas del registro que editamos
    const horasEditando = recordToEdit ? recordToEdit.horas : 0;
    const horasExistentesAjustadas = horasYaRegistradas - horasEditando;
    const totalHorasDia = horasExistentesAjustadas + horasNumero;

    if (maxPermitido === 0) {
      setWeeklyHoursError(`No se permite registrar horas los ${format(selectedDate, 'EEEE', { locale: es })}s.`);
      return;
    }

    if (totalHorasDia > maxPermitido) {
      const disponibles = maxPermitido - horasExistentesAjustadas;
      if (disponibles <= 0) {
        setWeeklyHoursError(`Ya tienes ${horasExistentesAjustadas}h registradas este día. El límite es ${maxPermitido}h.`);
      } else {
        setWeeklyHoursError(`No puedes registrar ${horasNumero}h. Ya tienes ${horasExistentesAjustadas}h registradas. Solo te quedan ${disponibles}h disponibles para este día (límite: ${maxPermitido}h).`);
      }
      return;
    }

    // Validar límite semanal
    if (horasNumero > weeklyHoursInfo.remaining) {
      setWeeklyHoursError(
        `No puedes registrar ${horasNumero}h. Solo te quedan ${weeklyHoursInfo.remaining}h disponibles esta semana (límite: ${activeWeeklyLimit}h).`
      );
      return;
    }

    const areaClienteValue = areaCliente.trim();

    onSave(selectedCliente, horasNumero, selectedDate, areaClienteValue);
    setDialogOpen(false);
    setWeeklyHoursError(null);

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

              // Bloquear si el límite diario para ese día es 0 en la configuración
              const limitForDay = activeDailyLimits[day.getDay() as keyof typeof activeDailyLimits];
              const isDisabled = isFuture || limitForDay === 0;

              return (
                <button
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  disabled={isDisabled}
                  className={`
                    min-h-[80px] p-2 rounded-lg border-2 transition-all relative
                    ${isDisabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'hover:border-[#303483] hover:bg-[#303483]/5 hover:shadow-sm cursor-pointer border-gray-200'}
                    ${isToday ? 'border-[#bbd531] bg-[#bbd531]/10 shadow-sm' : ''}
                    ${hasHours && !isToday ? 'bg-[#303483]/5 border-[#303483]/20' : ''}
                  `}
                  style={{
                    backgroundColor: isToday ? '#bad53194' : isDisabled ? '#f0f0f0' : 'transparent',
                  }}
                >
                  <div className="flex flex-col h-full">
                    <span className={`text-sm ${isToday ? 'text-[#303483] ' : isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>
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
                    {!isFuture && limitForDay === 0 && (
                      <div className="mt-auto flex justify-center">
                        <div className="text-[10px] text-gray-400">Restringido</div>
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
                  {filteredClientes
                    .filter(cliente => cliente.elementoPEP != null && cliente.elementoPEP !== '')
                    .map((cliente) => (
                      <SelectItem key={`cliente-${cliente.id}-${cliente.elementoPEP}`} value={cliente.elementoPEP}>
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

            {/* Información de horas semanales */}
            <div className={`rounded-lg p-3 text-sm border ${weeklyHoursInfo.remaining < 0
              ? 'bg-red-50 border-red-200'
              : weeklyHoursInfo.used < activeWeeklyLimit
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
              }`}>
              <div className="flex items-center justify-between">
                <span className="font-medium">Horas esta semana:</span>
                <span className={`font-bold ${weeklyHoursInfo.remaining < 0
                  ? 'text-red-700'
                  : weeklyHoursInfo.used < activeWeeklyLimit
                    ? 'text-amber-700'
                    : 'text-green-700'
                  }`}>
                  {weeklyHoursInfo.used}h / {activeWeeklyLimit}h
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600 flex justify-between items-center">
                <span>
                  Disponibles: <span className="font-semibold">{Math.max(0, weeklyHoursInfo.remaining)}h</span>
                </span>
                {weeklyHoursInfo.used < activeWeeklyLimit && (
                  <span className="text-amber-600 font-medium">Semana Incompleta</span>
                )}
                {weeklyHoursInfo.used >= activeWeeklyLimit && (
                  <span className="text-green-600 font-medium">Semana Completa</span>
                )}
              </div>
            </div>

            {/* Error de límite semanal */}
            {weeklyHoursError && (
              <Alert variant="destructive" className="bg-red-50 border-red-300">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-red-700">
                  {weeklyHoursError}
                </AlertDescription>
              </Alert>
            )}

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
