import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Plus, Trash2, Building, MapPin, Loader2 } from 'lucide-react';
import {
    companyCoordinatorAPI,
    coordinatorAreasAPI,
    companiesAPI,
    areasAPI,
    type Area
} from '../services/api';

interface CoordinatorConfigProps {
    coordinatorId: string;
}

interface AssignedCompany {
    id: number;
    nombre_company?: string;
    elemento_pep: string;
}

interface AssignedArea {
    id: number;
    nombre_area?: string;
    area_id?: number;
}

export function CoordinatorConfig({ coordinatorId }: CoordinatorConfigProps) {
    const [assignedCompanies, setAssignedCompanies] = useState<AssignedCompany[]>([]);
    const [assignedAreas, setAssignedAreas] = useState<AssignedArea[]>([]);
    const [allAreas, setAllAreas] = useState<Area[]>([]);

    // Select state
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchAllData();
    }, [coordinatorId]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            console.log("🔍 Fetching Config Data for Coordinator:", coordinatorId);
            const [myCompanies, myAreas, companies, areas] = await Promise.all([
                companyCoordinatorAPI.getCompaniesByCoordinator(coordinatorId),
                coordinatorAreasAPI.getAreasByCoordinator(coordinatorId),
                companiesAPI.getAll(),
                areasAPI.getAll()
            ]);

            console.log("✅ Data Loaded:", {
                myCompanies: myCompanies.length,
                myAreas: myAreas.length,
                allCompanies: companies.length,
                allAreas: areas.length
            });
            console.log("All Companies Raw:", companies);

            setAssignedCompanies(myCompanies);
            setAssignedAreas(myAreas);
            setAllAreas(areas);
        } catch (error) {
            console.error("❌ Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArea = async () => {
        if (!selectedArea) return;
        try {
            setProcessing(true);
            await coordinatorAreasAPI.create({
                area_encargada: parseInt(selectedArea),
                coordinador: parseInt(coordinatorId)
            });

            // Refresh
            const myAreas = await coordinatorAreasAPI.getAreasByCoordinator(coordinatorId);
            setAssignedAreas(myAreas);
            setSelectedArea('');
        } catch (error) {
            console.error("Error adding area:", error);
        } finally {
            setProcessing(false);
        }
    };

    const handleRemoveArea = async (id: number) => {
        try {
            setProcessing(true);
            await coordinatorAreasAPI.delete(id);
            setAssignedAreas(assignedAreas.filter(a => a.id !== id));
        } catch (error) {
            console.error("Error removing area:", error);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#303483]" /></div>;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {/* VIEW ASSIGNED COMPANIES (CLIENTS) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5 text-[#303483]" />
                        Mis Clientes Asignados
                    </CardTitle>
                    <CardDescription>
                        Empresas cuyos reportes supervisas (Asignadas por Administración).
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2 mt-4 max-h-[400px] overflow-y-auto pr-2">
                        {assignedCompanies.map(company => (
                            <div key={company.id} className="flex items-center justify-between p-4 bg-white rounded-lg border shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-50 rounded-full">
                                        <Building className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">{company.nombre_company}</div>
                                        <div className="text-xs text-gray-500 font-mono">{company.elemento_pep}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {assignedCompanies.length === 0 && (
                            <div className="text-center py-10 text-gray-500 text-sm italic bg-gray-50 rounded-lg border-2 border-dashed">
                                No tienes clientes asignados por administración.
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* MANAGE AREAS - KEEPING FOR NOW AS REQUEST DIDN'T EXPLICITLY FORBID IT, BUT SIMPLIFIED */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#303483]" />
                        Mis Áreas Asignadas
                    </CardTitle>
                    <CardDescription>
                        Gestiona las áreas de trabajo que supervisas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-[#303483] focus:outline-none"
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            disabled={processing}
                        >
                            <option value="">Seleccionar Área...</option>
                            {allAreas.filter(a => !assignedAreas.some(assigned => assigned.area_id === a.id)).map(a => (
                                <option key={a.id} value={a.id}>
                                    {a.nombre_area}
                                </option>
                            ))}
                        </select>
                        <Button
                            onClick={handleAddArea}
                            disabled={!selectedArea || processing}
                            className="bg-[#303483] hover:bg-[#303483]/90"
                        >
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto pr-2">
                        {assignedAreas.map(area => (
                            <div key={area.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border hover:border-gray-300 transition-colors">
                                <div className="font-medium text-gray-700">
                                    {area.nombre_area}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveArea(area.id)}
                                    disabled={processing}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
