import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, XCircle, Clock, Loader2, ChevronLeft, ChevronRight, Calculator, User, ArrowLeft, CheckCheck, XOctagon, RefreshCw, Users } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { reportesAPI, type Reporte } from '../services/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';

interface PayrollReviewProps {
  coordinatorId: string;
}

type ViewMode = 'calendar' | 'employees' | 'reports' | 'technicians';

export function PayrollReview({ coordinatorId }: PayrollReviewProps) {
  // Data State
  const [reports, setReports] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);

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

  // Bulk approval handler - approve/reject all pending reports for a date
  const handleBulkApproval = async (date: Date, newStatus: number) => {
    const dayReports = getReportsForDate(date);
    const pendingReports = dayReports.filter(r => r.aprobado !== 1 && r.aprobado !== 2);

    if (pendingReports.length === 0) return;

    try {
      setBulkProcessing(true);

      // Update all pending reports
      await Promise.all(
        pendingReports.map(report =>
          reportesAPI.update(report.id, {
            aprobado: newStatus,
            // @ts-ignore - The API supports this but type definition might lag
            aprobadopor: parseInt(coordinatorId)
          })
        )
      );

      // Refresh data to get audit info properly
      await fetchReports();
    } catch (err) {
      console.error('Error en aprobación masiva:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  // Get pending reports count for a date
  const getPendingCountForDate = (date: Date) => {
    const dayReports = getReportsForDate(date);
    return dayReports.filter(r => r.aprobado !== 1 && r.aprobado !== 2).length;
  };

  // Bulk week approval handler - approve/reject all pending reports for a week
  const handleBulkWeekApproval = async (weekStart: Date, weekEnd: Date, newStatus: number) => {
    const pendingReportsInWeek = reports.filter(report => {
      if (!report.fecha_trabajada) return false;
      if (report.aprobado === 1 || report.aprobado === 2) return false;
      const reportDate = parseISO(report.fecha_trabajada);
      return isWithinInterval(reportDate, { start: weekStart, end: weekEnd });
    });

    if (pendingReportsInWeek.length === 0) return;

    try {
      setBulkProcessing(true);

      // Update all pending reports in the week
      await Promise.all(
        pendingReportsInWeek.map(report =>
          reportesAPI.update(report.id, {
            aprobado: newStatus,
            // @ts-ignore
            aprobadopor: parseInt(coordinatorId)
          })
        )
      );

      // Refresh data
      await fetchReports();
    } catch (err) {
      console.error('Error en aprobación semanal masiva:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  interface WeekData {
    weekStart: Date;
    weekEnd: Date;
    totalHours: number;
    approved: number;
    pending: number;
    rejected: number;
    byClient: Map<string, { total: number; approved: number; pending: number; rejected: number; name: string }>;
  }

  // Weekly totals calculation with client breakdown
  const weeklyTotals = useMemo(() => {
    const weeks = new Map<string, WeekData>();

    reports.forEach(report => {
      if (!report.fecha_trabajada) return;
      const reportDate = parseISO(report.fecha_trabajada);
      const weekStart = startOfWeek(reportDate, { weekStartsOn: 1 }); // Lunes
      const weekEnd = endOfWeek(reportDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const clientKey = report.cliente || 'Sin Cliente';
      const clientName = report.nombre_company || clientKey;

      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, {
          weekStart,
          weekEnd,
          totalHours: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          byClient: new Map()
        });
      }

      const week = weeks.get(weekKey)!;

      // Update week totals
      week.totalHours += report.horas;
      if (report.aprobado === 1) week.approved += report.horas;
      else if (report.aprobado === 2) week.rejected += report.horas;
      else week.pending += report.horas;

      // Update client totals
      if (!week.byClient.has(clientKey)) {
        week.byClient.set(clientKey, { total: 0, approved: 0, pending: 0, rejected: 0, name: clientName });
      }
      const clientData = week.byClient.get(clientKey)!;
      clientData.total += report.horas;
      if (report.aprobado === 1) clientData.approved += report.horas;
      else if (report.aprobado === 2) clientData.rejected += report.horas;
      else clientData.pending += report.horas;
    });

    // Filter to show only weeks in current month view
    return Array.from(weeks.values())
      .filter(week => {
        return isWithinInterval(week.weekStart, { start: monthStart, end: monthEnd }) ||
          isWithinInterval(week.weekEnd, { start: monthStart, end: monthEnd });
      })
      .sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [reports, currentMonth]);

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

  // Monthly summary calculation
  const monthlyTechnicianSummary = useMemo(() => {
    const startOfCurrentMonth = startOfMonth(new Date());
    const endOfCurrentMonth = endOfMonth(new Date());

    const summary = new Map<number, { name: string; total: number; reports: number }>();

    reports.forEach(r => {
      if (!r.fecha_trabajada) return;
      const reportDate = parseISO(r.fecha_trabajada);
      if (isWithinInterval(reportDate, { start: startOfCurrentMonth, end: endOfCurrentMonth })) {
        if (!summary.has(r.documento_id)) {
          summary.set(r.documento_id, {
            name: r.nombre_empleado || `User ${r.documento_id}`,
            total: 0,
            reports: 0
          });
        }
        const data = summary.get(r.documento_id)!;
        data.total += r.horas;
        data.reports += 1;
      }
    });

    return Array.from(summary.values()).sort((a, b) => b.total - a.total);
  }, [reports]);

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
                  {(report.aprobado === 1 || report.aprobado === 2) && report.nombre_aprobador && (
                    <div className="text-xs text-gray-400 mt-1">
                      {report.aprobado === 1 ? 'Aprobado' : 'Rechazado'} por: {report.nombre_aprobador}
                    </div>
                  )}
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
                        onClick={async () => {
                          try {
                            setProcessingId(report.id);
                            await reportesAPI.update(report.id, {
                              aprobado: 1,
                              // @ts-ignore
                              aprobadopor: parseInt(coordinatorId)
                            });
                            await fetchReports();
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setProcessingId(null);
                          }
                        }}
                        disabled={processingId === report.id}
                      >
                        {processingId === report.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            setProcessingId(report.id);
                            await reportesAPI.update(report.id, {
                              aprobado: 2,
                              // @ts-ignore
                              aprobadopor: parseInt(coordinatorId)
                            });
                            await fetchReports();
                          } catch (e) {
                            console.error(e);
                          } finally {
                            setProcessingId(null);
                          }
                        }}
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
          {/* Botones de aprobación masiva del día */}
          {getPendingCountForDate(selectedDate) > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#303483] hover:bg-[#303483]/90"
                onClick={() => handleBulkApproval(selectedDate, 1)}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCheck className="w-4 h-4 mr-1" />}
                Aprobar Todos
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleBulkApproval(selectedDate, 2)}
                disabled={bulkProcessing}
              >
                {bulkProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XOctagon className="w-4 h-4 mr-1" />}
                Rechazar Todos
              </Button>
            </div>
          )}
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

  // --- 2.5 TECHNICIANS SUMMARY VIEW ---
  if (view === 'technicians') {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setView('calendar')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <CardTitle>Consolidado Mensual por Técnico</CardTitle>
              <CardDescription>
                Total de horas registradas en {format(new Date(), 'MMMM', { locale: es })} (Todos los clientes)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-4 font-semibold text-gray-900">Técnico</th>
                  <th className="text-center p-4 font-semibold text-gray-900">Reportes</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Total Horas</th>
                  <th className="text-right p-4 font-semibold text-gray-900">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {monthlyTechnicianSummary.map((tech, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-[#303483]/10 rounded-full text-[#303483]">
                          <User className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-gray-900">{tech.name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-center text-gray-600">{tech.reports}</td>
                    <td className="p-4 text-right font-bold text-[#303483]">{tech.total}h</td>
                    <td className="p-4 text-right">
                      <Badge className={tech.total >= 170 ? "bg-green-100 text-green-700 hover:bg-green-100/80" : "bg-amber-100 text-amber-700 hover:bg-amber-100/80"}>
                        {tech.total >= 170 ? 'Completo' : 'En proceso'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {monthlyTechnicianSummary.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-gray-500 italic">
                      No hay registros de horas en este mes aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
            <CardTitle className="flex items-center gap-2">
              Revisión de Nómina
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchReports}
                className="h-8 w-8 ml-2"
                title="Refrescar datos"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </CardTitle>
            <CardDescription>
              Selecciona un día para revisar los reportes de los empleados
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView('technicians')}
              className="mr-4 gap-2"
            >
              <Users className="w-4 h-4" />
              Resumen Mensual
            </Button>
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

        {reports.length === 0 && !loading && (
          <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-100 flex flex-col items-center justify-center text-center">
            <p className="font-medium">No se encontraron reportes</p>
            <p className="text-sm mt-1">
              Si deberías ver horas aquí, asegúrate de tener asignados los <span className="font-bold">Clientes</span> y <span className="font-bold">Áreas</span> correspondientes en la pestaña de <span className="font-bold">Configuración</span>.
            </p>
          </div>
        )}

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
            const hasContent = status !== null;
            const pendingCount = getPendingCountForDate(day);
            const dayReports = getReportsForDate(day);
            const totalHoursDay = dayReports.reduce((sum, r) => sum + r.horas, 0);

            let statusColor = "bg-transparent";
            if (status == 'pending') statusColor = "blue";
            else if (status == 'rejected') statusColor = "red";
            else if (status == 'approved') statusColor = "#bbd531";
            else if (status == 'mixed') statusColor = "orange";

            return (
              <div key={day.toString()} className="relative">
                <button
                  onClick={() => handleDayClick(day)}
                  disabled={!hasContent}
                  className={`
                      w-full min-h-[80px] p-2 rounded-lg border transition-all text-left flex flex-col justify-between
                      ${!hasContent ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-default' : 'hover:border-[#303483] hover:shadow-md cursor-pointer bg-white border-gray-200'}
                      ${isToday ? 'ring-2 ring-[#303483]/20' : ''}
                    `}
                >
                  <span className={`text-sm font-medium ${isToday ? 'text-[#303483]' : ''}`}>
                    {format(day, 'd')}
                  </span>

                  {hasContent && (
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="text-xs text-gray-600">{totalHoursDay}h</div>
                      <div className="flex items-center justify-between">
                        {pendingCount > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                            {pendingCount} pend.
                          </span>
                        )}
                        <div className={`w-3 h-3 rounded-full ml-auto`} style={{ backgroundColor: statusColor }} title={status || ''} />
                      </div>
                    </div>
                  )}
                </button>

                {/* Botones de aprobación rápida si hay pendientes */}
                {hasContent && pendingCount > 0 && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity bg-white rounded-full shadow-lg p-0.5 z-10"
                    style={{ opacity: bulkProcessing ? 0.5 : undefined }}>


                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Resumen de Horas Semanales */}
        {weeklyTotals.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#303483]" />
              Resumen de Horas por Semana
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {weeklyTotals.map((week, idx) => (
                <div key={idx} className="bg-white border rounded-lg p-4 shadow-sm">
                  <div className="text-sm text-gray-500 mb-2">
                    {format(week.weekStart, "d MMM", { locale: es })} - {format(week.weekEnd, "d MMM", { locale: es })}
                  </div>
                  <div className="text-2xl font-bold text-[#303483]">
                    {week.totalHours}h
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">✓ Aprobadas:</span>
                      <span className="font-medium">{week.approved}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-blue-600">⏳ Pendientes:</span>
                      <span className="font-medium">{week.pending}h</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">✗ Rechazadas:</span>
                      <span className="font-medium">{week.rejected}h</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                    {week.approved > 0 && (
                      <div
                        className="bg-[#bbd531] h-full"
                        style={{ width: `${(week.approved / week.totalHours) * 100}%` }}
                      />
                    )}
                    {week.pending > 0 && (
                      <div
                        className="bg-blue-400 h-full"
                        style={{ width: `${(week.pending / week.totalHours) * 100}%` }}
                      />
                    )}
                    {week.rejected > 0 && (
                      <div
                        className="bg-red-400 h-full"
                        style={{ width: `${(week.rejected / week.totalHours) * 100}%` }}
                      />
                    )}
                  </div>

                  {/* Desglose por cliente */}
                  <div className="mt-4 pt-3 border-t space-y-3">
                    {Array.from(week.byClient.entries()).map(([key, data]) => (
                      <div key={key} className="text-sm border-b border-dashed pb-2 last:border-0 last:pb-0">
                        <div className="font-medium text-gray-700 mb-1">{data.name}</div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Tot: {data.total}h</span>
                          <span className="text-green-600">Apr: {data.approved}h</span>
                          <span className="text-blue-600">Pend: {data.pending}h</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Botones de aprobación/rechazo de semana */}
                  {week.pending > 0 && (
                    <div className="mt-4 pt-3 border-t flex gap-2">

                      <Button
                        size="sm"
                        className="flex-1 bg-[#303483] hover:bg-[#303483]/90 text-white"
                        onClick={() => handleBulkWeekApproval(week.weekStart, week.weekEnd, 1)}
                        disabled={bulkProcessing}
                      >
                        {bulkProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <CheckCheck className="w-4 h-4 mr-1" />
                        )}
                        Aprobar Semana
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => handleBulkWeekApproval(week.weekStart, week.weekEnd, 2)}
                        disabled={bulkProcessing}
                      >
                        {bulkProcessing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <XOctagon className="w-4 h-4 mr-1" />
                        )}
                        Rechazar
                      </Button>
                    </div>
                  )}

                  {/* Indicador cuando todo está aprobado */}
                  {week.pending === 0 && week.approved > 0 && week.rejected === 0 && (
                    <div className="mt-4 pt-3 border-t text-center text-sm text-green-600 font-medium">
                      ✓ Semana completamente aprobada
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* NUEVA SECCIÓN: Resumen por Usuario */}
            <div className="mt-12">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-[#303483]" />
                Resumen por Usuario (Semanal)
              </h3>
              <div className="space-y-6">
                {weeklyTotals.map((week, weekIdx) => {
                  // Calcular resumen por usuarios dinámicamente para esta semana
                  const usersMap = new Map<number, {
                    name: string;
                    total: number;
                    clients: Map<string, { name: string; total: number }>
                  }>();

                  // Filtrar reportes de esta semana
                  const weekReports = reports.filter(r => {
                    if (!r.fecha_trabajada) return false;
                    const rDate = parseISO(r.fecha_trabajada);
                    return isWithinInterval(rDate, { start: week.weekStart, end: week.weekEnd });
                  });

                  weekReports.forEach(r => {
                    if (!usersMap.has(r.documento_id)) {
                      usersMap.set(r.documento_id, {
                        name: r.nombre_empleado || `User ${r.documento_id}`,
                        total: 0,
                        clients: new Map()
                      });
                    }
                    const u = usersMap.get(r.documento_id)!;
                    u.total += r.horas;

                    const clientKey = r.cliente || 'Desconocido';
                    if (!u.clients.has(clientKey)) {
                      u.clients.set(clientKey, { name: r.nombre_company || clientKey, total: 0 });
                    }
                    u.clients.get(clientKey)!.total += r.horas;
                  });

                  if (usersMap.size === 0) return null;

                  return (
                    <div key={`user-summary-${weekIdx}`} className="bg-gray-50 border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 px-4 py-3 border-b flex justify-between items-center">
                        <span className="font-semibold text-[#303483]">
                          Semana: {format(week.weekStart, "d MMM", { locale: es })} - {format(week.weekEnd, "d MMM", { locale: es })}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">Total: {week.totalHours}h</span>
                      </div>
                      <div className="divide-y">
                        {Array.from(usersMap.values()).map((user, uIdx) => (
                          <div key={uIdx} className="p-4 bg-white">
                            <div className="flex justify-between items-center mb-2">
                              <div className="font-medium text-gray-900">{user.name}</div>
                              <div className="font-bold text-[#303483]">{user.total}h</div>
                            </div>
                            <div className="pl-4 border-l-2 border-gray-100 space-y-1">
                              {Array.from(user.clients.values()).map((client, cIdx) => (
                                <div key={cIdx} className="flex justify-between text-sm text-gray-600">
                                  <span>{client.name}</span>
                                  <span>{client.total}h</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}
      </CardContent>
    </Card>
  );
}
