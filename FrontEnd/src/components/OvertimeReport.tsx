import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Download, Loader2, Filter } from 'lucide-react';
import { reportesAPI, settingsAPI, Reporte, Area, areasAPI } from '../services/api';
import { parseISO, format } from 'date-fns';
import * as XLSX from 'xlsx';

export function OvertimeReport() {
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [reports, setReports] = useState<Reporte[]>([]);
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedArea, setSelectedArea] = useState<string>("all");

    // Set default dates (current month)
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        setDateFrom(firstDay.toISOString().split('T')[0]);
        setDateTo(lastDay.toISOString().split('T')[0]);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [settingsData, areasData, reportsData] = await Promise.all([
                    settingsAPI.getAll(),
                    areasAPI.getAll(),
                    reportesAPI.getAll()
                ]);
                setSettings(settingsData);
                setAreas(areasData);
                setReports(reportsData);
            } catch (error) {
                console.error("Error loading data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Helper: Convertir "HH:MM" a minutos desde medianoche
    const timeToMinutes = (timeStr: string) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    // Helper: Calcular desglose de horas (Duplicado de PayrollReview para aislamiento)
    const calculateHoursBreakdown = (report: Reporte) => {
        if (!report.hora_inicio || !report.hora_fin || !report.fecha_trabajada || !settings) {
            return { normal: report.horas, extra: 0, total: report.horas };
        }

        const startMin = timeToMinutes(report.hora_inicio);
        const endMin = timeToMinutes(report.hora_fin);

        // Total trabajado
        let totalMinutes = endMin - startMin;
        if (totalMinutes < 0) totalMinutes += 24 * 60;

        // Determinar horario normal según el día
        const date = parseISO(report.fecha_trabajada);
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

        // DOMINGO: Todo el día son horas extras
        if (dayOfWeek === 0) {
            return {
                normal: 0,
                extra: parseFloat((totalMinutes / 60).toFixed(2)),
                total: parseFloat((totalMinutes / 60).toFixed(2))
            };
        }

        // CONFIGURAR HORARIOS NORMALES
        let normalStartStr = settings.normal_hours_start?.replace(/"/g, '') || '07:30';
        let normalEndStr = settings.normal_hours_end?.replace(/"/g, '') || '17:30';

        // SÁBADO: De 7:30 a 12:00 son normales, después son extras
        if (dayOfWeek === 6) {
            normalStartStr = settings.saturday_hours_start?.replace(/"/g, '') || '07:30';
            normalEndStr = settings.saturday_hours_end?.replace(/"/g, '') || '12:00';
        }

        // Viernes usa horario especial si existe
        if (dayOfWeek === 5 && settings.normal_hours_end_friday) {
            normalEndStr = settings.normal_hours_end_friday.replace(/"/g, '');
        }

        const limitStart = timeToMinutes(normalStartStr);
        const limitEnd = timeToMinutes(normalEndStr);

        // Calcular intersección (Horas Normales)
        const overlapStart = Math.max(startMin, limitStart);
        const overlapEnd = Math.min(endMin, limitEnd);

        let normalMinutes = 0;
        if (overlapStart < overlapEnd) {
            normalMinutes = overlapEnd - overlapStart;
        }

        const extraMinutes = Math.max(0, totalMinutes - normalMinutes);

        return {
            normal: parseFloat((normalMinutes / 60).toFixed(2)),
            extra: parseFloat((extraMinutes / 60).toFixed(2)),
            total: parseFloat((totalMinutes / 60).toFixed(2))
        };
    };

    // Filter and aggregate data
    const summaryData = reports.reduce((acc, report) => {
        if (!report.fecha_trabajada || !dateFrom || !dateTo) return acc;

        const reportDate = parseISO(report.fecha_trabajada);
        const from = new Date(dateFrom);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);

        // Filter by date range
        if (reportDate < from || reportDate > to) {
            return acc;
        }

        if (selectedArea !== "all" && report.nombre_area !== selectedArea) {
            return acc;
        }

        const breakdown = calculateHoursBreakdown(report);
        const empId = report.documento_id;

        if (!acc[empId]) {
            acc[empId] = {
                id: empId,
                name: report.nombre_empleado || `User ${empId}`,
                area: report.nombre_area || 'N/A',
                normal: 0,
                extra: 0,
                total: 0
            };
        }

        acc[empId].normal += breakdown.normal;

        // Si aprobado === 3, las horas extras fueron rechazadas, no incluirlas
        if (report.aprobado !== 3) {
            acc[empId].extra += breakdown.extra;
        }

        acc[empId].total += breakdown.total;

        return acc;
    }, {} as Record<number, { id: number, name: string, area: string, normal: number, extra: number, total: number }>);

    const summaryList = Object.values(summaryData).sort((a, b) => b.extra - a.extra);

    const totalExtras = summaryList.reduce((sum, item) => sum + item.extra, 0);

    // Function to export to Excel
    const handleExportToExcel = () => {
        // Prepare data for Excel
        const excelData = summaryList.map(item => ({
            'Empleado': item.name,
            'Área': item.area,
            'Horas Normales': item.normal.toFixed(2),
            'Horas Extras': item.extra.toFixed(2),
            'Total Horas': item.total.toFixed(2)
        }));

        // Add total row
        excelData.push({
            'Empleado': 'TOTAL',
            'Área': '',
            'Horas Normales': summaryList.reduce((sum, item) => sum + item.normal, 0).toFixed(2),
            'Horas Extras': totalExtras.toFixed(2),
            'Total Horas': summaryList.reduce((sum, item) => sum + item.total, 0).toFixed(2)
        });

        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(excelData);

        // Set column widths
        ws['!cols'] = [
            { wch: 30 }, // Empleado
            { wch: 20 }, // Área
            { wch: 15 }, // Horas Normales
            { wch: 15 }, // Horas Extras
            { wch: 15 }  // Total Horas
        ];

        // Create workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Horas Extras');

        // Generate filename with date range
        const fromDate = dateFrom ? format(new Date(dateFrom), 'dd-MM-yyyy') : 'inicio';
        const toDate = dateTo ? format(new Date(dateTo), 'dd-MM-yyyy') : 'fin';
        const filename = `Reporte_Horas_Extras_${fromDate}_a_${toDate}.xlsx`;

        // Download
        XLSX.writeFile(wb, filename);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="space-y-4">
                    <div>
                        <CardTitle>Reporte de Horas Extras</CardTitle>
                        <CardDescription>Resumen de horas normales y extras por empleado</CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Desde</label>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Hasta</label>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-2 border rounded-md"
                            />
                        </div>
                        <Select value={selectedArea} onValueChange={setSelectedArea}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Filtrar por Área" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las Áreas</SelectItem>
                                {areas.map(area => (
                                    <SelectItem key={area.id} value={area.nombre_area}>{area.nombre_area}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-8 h-8 animate-spin text-[#303483]" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-amber-50 p-4 rounded-lg border border-amber-100">
                            <div className="flex items-center gap-4">
                                <div>
                                    <span className="text-amber-800 font-medium">Total Horas Extras del Mes: </span>
                                    <span className="text-2xl font-black text-amber-600 ml-4">{totalExtras.toFixed(2)}h</span>
                                </div>
                            </div>
                            <Button
                                onClick={handleExportToExcel}
                                className="bg-[#303483] hover:bg-[#303483]/90"
                                disabled={summaryList.length === 0}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Descargar Excel
                            </Button>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Empleado</TableHead>
                                        <TableHead>Área</TableHead>
                                        <TableHead className="text-right">H. Normales</TableHead>
                                        <TableHead className="text-right">H. Extras</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryList.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No se encontraron registros.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        summaryList.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.area}</TableCell>
                                                <TableCell className="text-right">{item.normal.toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold text-amber-600">{item.extra.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">{item.total.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
