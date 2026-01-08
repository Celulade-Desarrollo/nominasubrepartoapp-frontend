import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus, X, Loader2, Trash2, Building2 } from 'lucide-react';
import {
    companiesAPI,
    areasAPI,
    areasEnCompanyAPI,
    type Company,
    type Area,
    type IntermediArea
} from '../services/api';

interface ClientesManagerProps {
    onCompanySelect?: (company: Company | null) => void;
}

export function ClientesManager({ onCompanySelect }: ClientesManagerProps) {
    // State for companies
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(true);
    const [errorCompanies, setErrorCompanies] = useState<string | null>(null);

    // State for areas
    const [areas, setAreas] = useState<Area[]>([]);
    const [loadingAreas, setLoadingAreas] = useState(true);

    // State for company-area assignments
    const [companyAreas, setCompanyAreas] = useState<IntermediArea[]>([]);

    // Form states
    const [newCompanyName, setNewCompanyName] = useState('');
    const [newCompanyPEP, setNewCompanyPEP] = useState('');
    const [newAreaName, setNewAreaName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Selected company for area assignment
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedAreaToAdd, setSelectedAreaToAdd] = useState<number | ''>('');

    // Load companies on mount
    useEffect(() => {
        loadCompanies();
        loadAreas();
    }, []);

    // Load company areas when a company is selected
    useEffect(() => {
        if (selectedCompany) {
            loadCompanyAreas(selectedCompany.id);
            onCompanySelect?.(selectedCompany);
        } else {
            setCompanyAreas([]);
            onCompanySelect?.(null);
        }
    }, [selectedCompany]);

    const loadCompanies = async () => {
        try {
            setLoadingCompanies(true);
            const data = await companiesAPI.getAll();
            setCompanies(data);
            setErrorCompanies(null);
        } catch (err) {
            setErrorCompanies('Error al cargar compañías');
            console.error(err);
        } finally {
            setLoadingCompanies(false);
        }
    };

    const loadAreas = async () => {
        try {
            setLoadingAreas(true);
            const data = await areasAPI.getAll();
            setAreas(data);
        } catch (err) {
            console.error('Error loading areas:', err);
        } finally {
            setLoadingAreas(false);
        }
    };

    const loadCompanyAreas = async (companyId: string) => {
        try {
            const data = await areasEnCompanyAPI.getByCompany(companyId);
            setCompanyAreas(data);
        } catch (err) {
            console.error('Error loading company areas:', err);
        }
    };

    const handleAddCompany = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompanyName.trim() || !newCompanyPEP.trim()) return;

        try {
            setIsSubmitting(true);
            await companiesAPI.create({
                nombre_company: newCompanyName.trim(),
                elemento_pep: newCompanyPEP.trim(),
            });
            setNewCompanyName('');
            setNewCompanyPEP('');
            await loadCompanies();
        } catch (err) {
            console.error('Error creating company:', err);
            alert('Error al crear la compañía');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta compañía?')) return;

        try {
            await companiesAPI.delete(id);
            if (selectedCompany?.id === id) {
                setSelectedCompany(null);
            }
            await loadCompanies();
        } catch (err) {
            console.error('Error deleting company:', err);
            alert('Error al eliminar la compañía');
        }
    };

    const handleAddArea = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newAreaName.trim()) return;

        try {
            setIsSubmitting(true);
            await areasAPI.create({ nombre_area: newAreaName.trim() });
            setNewAreaName('');
            await loadAreas();
        } catch (err) {
            console.error('Error creating area:', err);
            alert('Error al crear el área');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssignAreaToCompany = async () => {
        if (!selectedCompany || !selectedAreaToAdd) return;

        try {
            setIsSubmitting(true);
            await areasEnCompanyAPI.create({
                company_cliente: selectedCompany.id,
                area_cliente: selectedAreaToAdd as number,
            });
            setSelectedAreaToAdd('');
            await loadCompanyAreas(selectedCompany.id);
        } catch (err) {
            console.error('Error assigning area:', err);
            alert('Error al asignar el área');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAreaFromCompany = async (intermedioId: number) => {
        try {
            await areasEnCompanyAPI.delete(intermedioId);
            if (selectedCompany) {
                await loadCompanyAreas(selectedCompany.id);
            }
        } catch (err) {
            console.error('Error removing area:', err);
            alert('Error al remover el área');
        }
    };

    // Get available areas (not yet assigned to selected company)
    const availableAreas = areas.filter(
        area => !companyAreas.some(ca => ca.area_cliente === area.id)
    );

    return (
        <div className="space-y-6">
            {/* Add new company form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Agregar Nueva Compañía</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddCompany} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="companyName">Nombre</Label>
                            <Input
                                id="companyName"
                                value={newCompanyName}
                                onChange={(e) => setNewCompanyName(e.target.value)}
                                placeholder="Nombre de la compañía"
                                disabled={isSubmitting}
                            />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="companyPEP">Elemento PEP</Label>
                            <Input
                                id="companyPEP"
                                value={newCompanyPEP}
                                onChange={(e) => setNewCompanyPEP(e.target.value)}
                                placeholder="Código PEP"
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting || !newCompanyName.trim() || !newCompanyPEP.trim()}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span className="ml-2">Agregar</span>
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Add new area form */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Agregar Nueva Área de Trabajo</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleAddArea} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <Label htmlFor="areaName">Nombre del Área</Label>
                            <Input
                                id="areaName"
                                value={newAreaName}
                                onChange={(e) => setNewAreaName(e.target.value)}
                                placeholder="Ej: Soldadura, Pintura, Mantenimiento"
                                disabled={isSubmitting}
                            />
                        </div>
                        <Button type="submit" disabled={isSubmitting || !newAreaName.trim()}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            <span className="ml-2">Agregar Área</span>
                        </Button>
                    </form>

                    {/* Show existing areas */}
                    {!loadingAreas && areas.length > 0 && (
                        <div className="mt-4">
                            <p className="text-sm text-gray-500 mb-2">Áreas existentes:</p>
                            <div className="flex flex-wrap gap-2">
                                {areas.map((area) => (
                                    <span
                                        key={area.id}
                                        className={`px-3 py-1 rounded-full text-sm ${area.activo
                                            ? 'bg-[#303483]/10 text-[#303483]'
                                            : 'bg-gray-100 text-gray-400'
                                            }`}
                                    >
                                        {area.nombre_area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Companies list */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Compañías Clientes ({companies.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {loadingCompanies ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-[#303483]" />
                            <span className="ml-2">Cargando compañías...</span>
                        </div>
                    ) : errorCompanies ? (
                        <div className="text-red-500 text-center py-4">{errorCompanies}</div>
                    ) : companies.length === 0 ? (
                        <div className="text-gray-500 text-center py-8">
                            No hay compañías registradas. Agrega una arriba.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {companies.map((company) => (
                                <div
                                    key={company.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${selectedCompany?.id === company.id
                                        ? 'bg-[#303483]/10 border-[#303483]'
                                        : 'bg-white hover:bg-gray-50'
                                        }`}
                                    onClick={() => setSelectedCompany(
                                        selectedCompany?.id === company.id ? null : company
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Building2 className="w-5 h-5 text-[#303483]" />
                                        <div>
                                            <p className="font-medium">{company.nombre_company}</p>
                                            <p className="text-sm text-gray-500">PEP: {company.elemento_pep}</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCompany(company.id);
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Selected company areas management */}
            {selectedCompany && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Áreas asignadas a: {selectedCompany.nombre_company}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Assign area form */}
                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <Label>Asignar área</Label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={selectedAreaToAdd}
                                    onChange={(e) => setSelectedAreaToAdd(e.target.value ? Number(e.target.value) : '')}
                                    disabled={isSubmitting || availableAreas.length === 0}
                                >
                                    <option value="">Seleccionar área...</option>
                                    {availableAreas.map((area) => (
                                        <option key={area.id} value={area.id}>
                                            {area.nombre_area}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <Button
                                onClick={handleAssignAreaToCompany}
                                disabled={isSubmitting || !selectedAreaToAdd}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Asignar
                            </Button>
                        </div>

                        {/* Current assigned areas */}
                        {companyAreas.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {companyAreas.map((ca) => (
                                    <span
                                        key={ca.id}
                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#bbd531]/20 text-[#303483]"
                                    >
                                        {ca.nombre_area}
                                        <button
                                            onClick={() => handleRemoveAreaFromCompany(ca.id)}
                                            className="hover:text-red-600 ml-1"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500">
                                Esta compañía no tiene áreas asignadas aún.
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
