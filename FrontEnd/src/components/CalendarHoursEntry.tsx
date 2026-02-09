import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Save, ChevronLeft, ChevronRight, AlertTriangle, MapPin, PenTool, Eraser } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { HoursRecord } from './HoursHistoryByDate';
import { areasEnCompanyAPI } from '../services/api';

// Fallback limit if settings not loaded
const WEEKLY_HOURS_LIMIT_DEFAULT = 44;

interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
  areas: string[];
}



interface CalendarHoursEntryProps {
  clientes: Cliente[];
  onSave: (clienteId: string, horas: number, fecha: Date, areaCliente?: string, horaInicio?: string, horaFin?: string, descripcion?: string, tipoActividad?: string, latitud?: number, longitud?: number, firma?: string) => void;
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
  const [horaInicio, setHoraInicio] = useState<string>('07:30');
  const [horaFin, setHoraFin] = useState<string>('17:30');
  const [areaCliente, setAreaCliente] = useState<string>('');
  const [dynamicAreas, setDynamicAreas] = useState<string[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [weeklyHoursError, setWeeklyHoursError] = useState<string | null>(null);

  // Advanced Reporting State
  const [descripcion, setDescripcion] = useState('');
  const [tipoActividad, setTipoActividad] = useState('En Oficina');
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [ubicacionRechazada, setUbicacionRechazada] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [firma, setFirma] = useState<string | null>(null);

  // Get active limits from settings or default (for weekly hours info display only)
  const activeWeeklyLimit = settings?.weekly_limit || WEEKLY_HOURS_LIMIT_DEFAULT;
  // Note: activeDailyLimits removed as limits are no longer enforced

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
      // Si el record tiene hora_inicio/hora_fin, usarlas; si no, calcular a partir de horas
      if ((recordToEdit as any).hora_inicio) {
        setHoraInicio((recordToEdit as any).hora_inicio);
        setHoraFin((recordToEdit as any).hora_fin || '17:30');
      } else {
        // Fallback para registros antiguos sin hora
        setHoraInicio('07:30');
        setHoraFin('17:30');
      }
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
      setHoraInicio('07:30');
      setHoraFin('17:30');
      setAreaCliente('');
      setDescripcion('');
      setTipoActividad('En Oficina');
      setUbicacion(null);
      setFirma(null);
      setLocationError(null);
    }
  };

  // Canvas Logic
  useEffect(() => {
    if (dialogOpen && tipoActividad === 'En Cliente' && canvasRef.current) {
      // Init canvas context if needed
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
      }
    }
  }, [dialogOpen, tipoActividad]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Scale coordinates from CSS space to canvas space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left) * scaleX;
    const y = (('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    // Scale coordinates from CSS space to canvas space
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (('clientX' in e ? e.clientX : e.touches[0].clientX) - rect.left) * scaleX;
    const y = (('clientY' in e ? e.clientY : e.touches[0].clientY) - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      setFirma(canvas.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setFirma(null);
  };

  // Geolocation Logic
  const getLocation = () => {
    setLocationLoading(true);
    setLocationError(null);
    setUbicacionRechazada(false);

    if (!navigator.geolocation) {
      setLocationError("Geolocalización no soportada por el navegador");
      setUbicacionRechazada(true);
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUbicacion({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setUbicacionRechazada(false);
        setLocationLoading(false);
      },
      (error) => {
        // Usuario rechazó permisos o hay error de geolocalización
        setLocationError("El usuario rechazó compartir la ubicación");
        setUbicacionRechazada(true);
        setLocationLoading(false);
      }
    );
  };

  useEffect(() => {
    if (dialogOpen && tipoActividad === 'En Cliente' && !ubicacion) {
      getLocation();
    }
  }, [dialogOpen, tipoActividad]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handleDayClick = (date: Date) => {
    if (date > new Date()) return; // No permitir fechas futuras

    setSelectedDate(date);

    // Configurar hora fin por defecto según el día y settings
    // Usar settings si existen, sino usar defaults
    const defaultStart = settings?.normal_hours_start ? settings.normal_hours_start.replace(/"/g, '') : '07:30';
    const defaultEnd = settings?.normal_hours_end ? settings.normal_hours_end.replace(/"/g, '') : '17:30';
    const defaultEndFriday = settings?.normal_hours_end_friday ? settings.normal_hours_end_friday.replace(/"/g, '') : '16:30';

    setHoraInicio(defaultStart);

    if (date.getDay() === 5) { // Viernes
      setHoraFin(defaultEndFriday);
    } else {
      setHoraFin(defaultEnd);
    }

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

    if (!horaInicio || !horaFin) {
      setWeeklyHoursError('Debe ingresar hora de inicio y fin');
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

    // Calcular minutos desde medianoche para horaInicio y horaFin
    const [horaInicioHH, horaInicioMM] = horaInicio.split(':').map(Number);
    const [horaFinHH, horaFinMM] = horaFin.split(':').map(Number);
    const inicioMinutos = horaInicioHH * 60 + horaInicioMM;
    const finMinutos = horaFinHH * 60 + horaFinMM;

    const horasCalculadas = (finMinutos - inicioMinutos) / 60;

    // Validar que las horas calculadas sean positivas
    if (horasCalculadas <= 0) {
      setWeeklyHoursError('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    // Validar que la descripción sea obligatoria
    if (!descripcion || !descripcion.trim()) {
      setWeeklyHoursError('La descripción es obligatoria');
      return;
    }

    // Validar que el área seleccionada pertenezca al cliente
    const clienteAreas = dynamicAreas.length > 0 ? dynamicAreas : selectedCompanyData.areas;
    if (!clienteAreas.includes(areaCliente.trim())) {
      setWeeklyHoursError(`El área "${areaCliente}" no está disponible para el cliente seleccionado. Por favor selecciona otra área.`);
      return;
    }

    if (tipoActividad === 'En Cliente') {
      // Si no hay ubicación Y tampoco fue rechazada, solicitar ubicación
      if (!ubicacion && !ubicacionRechazada) {
        setWeeklyHoursError('Se requiere ubicación para actividades en cliente');
        return;
      }
      if (!firma) {
        setWeeklyHoursError('Se requiere firma para actividades en cliente');
        return;
      }
    }

    const areaClienteValue = areaCliente.trim();

    onSave(
      selectedCliente,
      horasCalculadas,
      selectedDate,
      areaClienteValue,
      horaInicio,
      horaFin,
      descripcion,
      tipoActividad,
      ubicacion?.lat,
      ubicacion?.lng,
      firma || undefined
    );
    setDialogOpen(false);
    setWeeklyHoursError(null);

    // Reset for creating new entries
    if (!recordToEdit) {
      setSelectedCliente('');
      setHoraInicio('07:30');
      setHoraFin('17:30');
      setAreaCliente('');
      setDescripcion('');
      setTipoActividad('En Oficina');
      setUbicacion(null);
      setFirma(null);
    }
  };

  const handleAreaChange = (newArea: string) => {
    setAreaCliente(newArea);

    // Si hay un cliente seleccionado, verificar si el área nueva es válida para ese cliente
    if (selectedCliente) {
      const clienteData = clientes.find(c => c.elementoPEP === selectedCliente);
      const clienteAreas = dynamicAreas.length > 0 ? dynamicAreas : (clienteData?.areas || []);

      // Si el área nueva no está en las áreas del cliente, limpiar el cliente
      if (!clienteAreas.includes(newArea)) {
        setSelectedCliente('');
      }
    }
  };

  const handleClienteChange = (newClienteId: string) => {
    setSelectedCliente(newClienteId);
    // Si hay un área seleccionada, verificar con las áreas dinámicas del nuevo cliente
    // Si el cliente cambia, mantener el área solo si es válida para el nuevo cliente
    if (areaCliente && newClienteId) {
      // Esperar a que se carguen las áreas dinámicas del nuevo cliente
      // No limpiar automáticamente - el usuario puede querer mantener la selección
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

  // Siempre mostrar todas las áreas disponibles para permitir cambios flexibles
  // Si hay un cliente seleccionado, mostrar sus áreas primero, luego las demás
  const filteredAreas = cleanAreas(allAreas);

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

              // Ya no se bloquea por límite diario - solo días futuros están deshabilitados
              const isDisabled = isFuture;

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
                    {/* Removido indicador de día restringido - ya no hay restricciones por día */}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>{recordToEdit ? 'Editar Reporte' : 'Registrar Horas'}</DialogTitle>
            <DialogDescription>
              {selectedDate && format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="overflow-y-auto px-6 py-4 space-y-4" style={{ maxHeight: 'calc(90vh - 200px)' }}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora Inicio (24h)</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="font-mono"
                  step="60"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="horaFin">Hora Fin (24h)</Label>
                <Input
                  id="horaFin"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="font-mono"
                  step="60"
                  required
                />
              </div>
            </div>

            {/* Show calculated hours */}
            {horaInicio && horaFin && (() => {
              const [hiH, hiM] = horaInicio.split(':').map(Number);
              const [hfH, hfM] = horaFin.split(':').map(Number);
              const mins = (hfH * 60 + hfM) - (hiH * 60 + hiM);
              const horasCalc = mins > 0 ? mins / 60 : 0;
              return (
                <div className="rounded-lg p-3 text-sm border bg-green-50 border-green-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Horas a registrar:</span>
                    <span className="font-bold text-green-700">{horasCalc.toFixed(1)}h</span>
                  </div>
                </div>
              );
            })()}

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción de Actividad <span className="text-red-500">*</span></Label>
              <Textarea
                id="descripcion"
                placeholder="Describe qué se hizo... (obligatorio)"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={2}
                className="resize-none"
                required
              />
            </div>

            {/* Activity Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="tipoActividad">Tipo de Actividad</Label>
              <Select value={tipoActividad} onValueChange={setTipoActividad}>
                <SelectTrigger id="tipoActividad">
                  <SelectValue placeholder="Selecciona ubicación de actividad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="En Oficina">En Oficina</SelectItem>
                  <SelectItem value="En Cliente">En Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional Logic for 'En Cliente' */}
            {tipoActividad === 'En Cliente' && (
              <div className="space-y-4 border rounded-md p-4 bg-gray-50">
                <div className="space-y-2">
                  <Label>Ubicación</Label>
                  {locationLoading ? (
                    <div className="text-sm text-blue-600 flex items-center gap-2">
                      <MapPin className="animate-bounce w-4 h-4" /> Obteniendo ubicación...
                    </div>
                  ) : ubicacion ? (
                    <div className="text-sm text-green-600 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Lat: {ubicacion.lat.toFixed(6)}, Lng: {ubicacion.lng.toFixed(6)}
                    </div>
                  ) : ubicacionRechazada ? (
                    <div className="text-sm text-amber-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      El usuario rechazó compartir la ubicación
                      <Button size="sm" variant="outline" onClick={getLocation} type="button">Reintentar</Button>
                    </div>
                  ) : (
                    <div className="text-sm text-red-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {locationError || "Ubicación requerida"}
                      <Button size="sm" variant="outline" onClick={getLocation} type="button">Reintentar</Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>Firma del Cliente</Label>
                    <Button size="sm" variant="ghost" onClick={clearCanvas} type="button" className="h-6 px-2 text-xs">
                      <Eraser className="w-3 h-3 mr-1" /> Limpiar
                    </Button>
                  </div>
                  <div className="border border-gray-300 rounded-md bg-white overflow-hidden touch-none">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={100}
                      className="w-full h-[100px] cursor-crosshair block"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  {!firma && <p className="text-xs text-red-500">* Firma requerida</p>}
                </div>
              </div>
            )}

            {/* Información de horas semanales (solo informativo, sin restricciones) */}
            <div className="rounded-lg p-3 text-sm border bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-medium">Horas esta semana:</span>
                <span className="font-bold text-blue-700">
                  {weeklyHoursInfo.used}h
                </span>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                <span>Referencia: {activeWeeklyLimit}h semanales estándar</span>
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
              💡 Ingresa la hora de inicio y fin de tu jornada. Las horas se calculan automáticamente.
            </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!selectedCliente || !horaInicio || !horaFin || !areaCliente}>
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
