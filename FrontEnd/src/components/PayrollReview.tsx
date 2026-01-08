import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Clock, Loader2, ChevronLeft, ChevronRight, Calculator, User, ArrowLeft, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { reportesAPI, type Reporte } from '../services/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface PayrollReviewProps {
  coordinatorId: string;
}

type ViewMode = 'calendar' | 'employees' | 'reports';

export function PayrollReview({ coordinatorId }: PayrollReviewProps) {
  // Data State
  const [reports, setReports] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // Navigation State
  const [view, setView] = useState<ViewMode>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    fetchReports();
  }, [coordinatorId]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportesAPI.getByCoordinador(coordinatorId);
      setReports(data);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Error al cargar los reportes. Por favor intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: number) => {
    try {
      setProcessingId(id);
      await reportesAPI.update(id, { aprobado: newStatus });

      // Update local state
      setReports(reports.map(report =>
        report.id === id ? { ...report, aprobado: newStatus } : report
      ));
    } catch (err) {
      console.error('Error updating report status:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Calendar Helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getReportsForDate = (date: Date) => {
    return reports.filter(r => {
      if (!r.fecha_trabajada) return false;
      const reportDate = parseISO(r.fecha_trabajada);
      return isSameDay(reportDate, date);
    });
  };

  const dayStatus = (date: Date) => {
    const dayReports = getReportsForDate(date);
    if (dayReports.length === 0) return null;

    const hasPending = dayReports.some(r => r.aprobado !== 1 && r.aprobado !== 2);
    const hasRejected = dayReports.every(r => r.aprobado === 2);
    const allApproved = dayReports.every(r => r.aprobado === 1);
    const allMixed = dayReports.some(r => r.aprobado === 2) && dayReports.some(r => r.aprobado === 1) && dayReports.length > 1;

    if (allMixed) return 'mixed';

    if (hasPending) return 'pending';
    if (hasRejected) return 'rejected';
    if (allApproved) return 'approved';
  };

  const handleDayClick = (date: Date) => {
    const dayReports = getReportsForDate(date);
    if (dayReports.length > 0) {
      setSelectedDate(date);
      setView('employees');
    }
  };

  // Employee List Helpers
  const getEmployeesForSelectedDate = () => {
    if (!selectedDate) return [];
    const dayReports = getReportsForDate(selectedDate);
    const uniqueEmployees = new Map<number, { id: number; name: string; reports: Reporte[] }>();

    dayReports.forEach(r => {
      if (!uniqueEmployees.has(r.documento_id)) {
        uniqueEmployees.set(r.documento_id, {
          id: r.documento_id,
          name: r.nombre_empleado || `Empleado ${r.documento_id}`,
          reports: []
        });
      }
      uniqueEmployees.get(r.documento_id)!.reports.push(r);
    });

    return Array.from(uniqueEmployees.values());
  };

  // Views Renders
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#303483]" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // --- 1. REPORTS VIEW (Employee Detail) ---
  if (view === 'reports' && selectedEmployee && selectedDate) {
    const employeeReports = getReportsForDate(selectedDate).filter(r => r.documento_id === selectedEmployee.id);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView('employees')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <CardTitle>{selectedEmployee.name}</CardTitle>
              <CardDescription>
                Reportes del {format(selectedDate, "d 'de' MMMM", { locale: es })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {employeeReports.map(report => (
            <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{report.nombre_company || report.cliente}</p>
                  <div className="flex items-center text-sm text-gray-500 gap-4">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {report.horas} horas</span>
                    <span>{report.nombre_area}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {report.aprobado === 1 ? (
                    <Badge className="bg-[#bbd531] text-[#303483] hover:bg-[#bbd531]/90">Aprobado</Badge>
                  ) : report.aprobado === 2 ? (
                    <Badge variant="destructive">Rechazado</Badge>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        className="bg-[#303483] hover:bg-[#303483]/90"
                        onClick={() => handleUpdateStatus(report.id, 1)}
                        disabled={processingId === report.id}
                      >
                        {processingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleUpdateStatus(report.id, 2)}
                        disabled={processingId === report.id}
                      >
                        {processingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                        Rechazar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // --- 2. EMPLOYEES VIEW (Date Detail) ---
  if (view === 'employees' && selectedDate) {
    const employees = getEmployeesForSelectedDate();

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView('calendar')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <CardTitle>Reportes por Empleado</CardTitle>
              <CardDescription>
                {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {employees.map(emp => {
              const pending = emp.reports.filter(r => r.aprobado === 0 || r.aprobado === undefined).length;
              const total = emp.reports.length;

              return (
                <button
                  key={emp.id}
                  onClick={() => {
                    setSelectedEmployee({ id: emp.id, name: emp.name });
                    setView('reports');
                  }}
                  className="flex flex-col p-4 border rounded-lg hover:border-[#303483] hover:bg-gray-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-[#303483]/10 rounded-full text-[#303483]">
                      <User className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-[#303483]">{emp.name}</span>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Reportes:</span>
                      <span className="font-medium">{total}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-gray-500">Pendientes:</span>
                      <span className={`font-medium ${pending > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {pending}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- 3. CALENDAR VIEW (Default) ---
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Revisión de Nómina</CardTitle>
            <CardDescription>
              Selecciona un día para revisar los reportes de los empleados
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
            <span className="min-w-[180px] text-center capitalize font-medium">
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
        <div className="flex flex-wrap gap-4 mb-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full " style={{ backgroundColor: 'orange' }}></div>
            <span className="text-gray-600">Combinados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full " style={{ backgroundColor: 'blue' }}></div>
            <span className="text-gray-600">Pendientes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#bbd531]"></div>
            <span className="text-gray-600">Aprobados</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full " style={{ backgroundColor: 'red' }}></div>
            <span className="text-gray-600">Rechazados</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}

          {Array.from({ length: monthStart.getDay() }).map((_, idx) => (
            <div key={`empty-${idx}`} />
          ))}

          {daysInMonth.map((day) => {
            const status = dayStatus(day);
            const isToday = isSameDay(day, new Date());
            const isFuture = day > new Date();
            const hasContent = status !== null;

            let statusColor = "bg-transparent";
            if (status == 'pending') statusColor = "blue";
            else if (status == 'rejected') statusColor = "red";
            else if (status == 'approved') statusColor = "#bbd531";
            else if (status == 'mixed') statusColor = "orange";

            return (
              <button
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                disabled={!hasContent}
                className={`
                    relative min-h-[80px] p-2 rounded-lg border transition-all text-left flex flex-col justify-between
                    ${!hasContent ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-default' : 'hover:border-[#303483] hover:shadow-md cursor-pointer bg-white border-gray-200'}
                    ${isToday ? 'ring-2 ring-[#303483]/20' : ''}
                  `}
              >
                <span className={`text-sm font-medium ${isToday ? 'text-[#303483]' : ''}`}>
                  {format(day, 'd')}
                </span>


                {hasContent && (
                  <div className="flex justify-end mt-2">
                    <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: statusColor }} title={status || ''} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
