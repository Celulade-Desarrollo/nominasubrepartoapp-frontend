import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { User, Building, Plus, Trash2, Loader2 } from 'lucide-react';
import {
    usuariosAPI,
    companiesAPI,
    companyCoordinatorAPI,
    reportesAPI,
    type Usuario,
    type Company,
    type CompanyCoordinator
} from '../services/api';

export function AdminAssignments() {
    const [coordinators, setCoordinators] = useState<Usuario[]>([]);
    const [allCompanies, setAllCompanies] = useState<Company[]>([]);
    const [selectedCoordinator, setSelectedCoordinator] = useState<Usuario | null>(null);
    const [assignedCompanies, setAssignedCompanies] = useState<CompanyCoordinator[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [selectedCompanyToAdd, setSelectedCompanyToAdd] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedCoordinator) {
            loadAssignments(selectedCoordinator.documento_id);
        } else {
            setAssignedCompanies([]);
        }
    }, [selectedCoordinator]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Rol 2 is Coordinator (based on previous context, verify if needed)
            const [users, companies] = await Promise.all([
                usuariosAPI.getByRol(2),
                companiesAPI.getAll(true) // Get only active
            ]);
            setCoordinators(users);
            setAllCompanies(companies);
        } catch (error) {
            console.error("Error loading coordinators/companies:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadAssignments = async (coordinatorId: number) => {
        try {
            const data = await companyCoordinatorAPI.getCompaniesByCoordinator(coordinatorId);
            setAssignedCompanies(data);
        } catch (error) {
            console.error("Error loading assignments:", error);
        }
    };

    const handleAddAssignment = async () => {
        if (!selectedCoordinator || !selectedCompanyToAdd) return;

        try {
            setProcessing(true);
            await companyCoordinatorAPI.create({
                elemento_pep: selectedCompanyToAdd,
                documento_id_coordinador: selectedCoordinator.documento_id
            });
            await loadAssignments(selectedCoordinator.documento_id);
            setSelectedCompanyToAdd('');
        } catch (error) {
            console.error("Error adding assignment:", error);
            alert("Error al asignar compañía");
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveAssignment = async (assignment: CompanyCoordinator) => {
        if (!selectedCoordinator) return;

        try {
            setProcessing(true);

            // Check if there are hours for this client/coordinator combo
            // Simplified check: Get all reports for coordinator and filter by client
            const reports = await reportesAPI.getByCoordinador(selectedCoordinator.documento_id.toString());
            const hasHours = reports.some(r => r.cliente === assignment.elemento_pep);

            if (hasHours) {
                const proceed = confirm("⚠️ ATENCIÓN: Este cliente tiene horas registradas bajo la coordinación de este usuario. Al retirarlo, ya no podrá ver ni aprobar esas horas. ¿Desea continuar?");
                if (!proceed) {
                    setProcessing(false);
                    return;
                }
            } else {
                if (!confirm("¿Decea retirar este cliente de la coordinación?")) {
                    setProcessing(false);
                    return;
                }
            }

            await companyCoordinatorAPI.delete(assignment.id);
            await loadAssignments(selectedCoordinator.documento_id);
        } catch (error) {
            console.error("Error removing assignment:", error);
            alert("Error al remover asignación");
        } finally {
            setProcessing(false);
        }
    };

    const availableCompanies = allCompanies.filter(
        c => !assignedCompanies.some(assigned => assigned.elemento_pep === c.elemento_pep)
    );

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#303483]" /></div>;

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {/* List Coordinators */}
            <Card className="md:col-span-1">
                <CardHeader>
                    <CardTitle className="text-lg">Coordinadores</CardTitle>
                    <CardDescription>Selecciona un coordinador</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {coordinators.map(coord => (
                        <div
                            key={coord.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${selectedCoordinator?.id === coord.id ? 'bg-[#303483]/10 border-[#303483]' : 'hover:bg-gray-50'}`}
                            onClick={() => setSelectedCoordinator(coord)}
                        >
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-[#303483]" />
                                <span className="font-medium text-sm">{coord.nombre_usuario}</span>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{coord.documento_id}</Badge>
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* Assignments Matrix */}
            <Card className="md:col-span-2">
                <CardHeader>
                    <CardTitle className="text-lg">
                        {selectedCoordinator ? `Asignaciones: ${selectedCoordinator.nombre_usuario}` : 'Seleccione un coordinador'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {selectedCoordinator ? (
                        <>
                            <div className="flex gap-2">
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-[#303483] focus:outline-none"
                                    value={selectedCompanyToAdd}
                                    onChange={(e) => setSelectedCompanyToAdd(e.target.value)}
                                    disabled={processing}
                                >
                                    <option value="">Asignar Cliente...</option>
                                    {availableCompanies.map(c => (
                                        <option key={c.id} value={c.elemento_pep}>
                                            {c.nombre_company} ({c.elemento_pep})
                                        </option>
                                    ))}
                                </select>
                                <Button
                                    onClick={handleAddAssignment}
                                    disabled={!selectedCompanyToAdd || processing}
                                    className="bg-[#303483] hover:bg-[#303483]/90"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Asignar
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                {assignedCompanies.length > 0 ? (
                                    assignedCompanies.map(assignment => (
                                        <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                                            <div className="flex items-center gap-3">
                                                <Building className="w-4 h-4 text-gray-500" />
                                                <div>
                                                    <div className="font-medium text-sm">{assignment.nombre_company || assignment.elemento_pep}</div>
                                                    <div className="text-[10px] text-gray-400">{assignment.elemento_pep}</div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveAssignment(assignment)}
                                                disabled={processing}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-gray-500 italic text-sm">
                                        No hay clientes asignados a este coordinador.
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                            <User className="w-12 h-12 mb-2 opacity-20" />
                            <p>Seleccione un coordinador del panel izquierdo para gestionar sus clientes asignados.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
