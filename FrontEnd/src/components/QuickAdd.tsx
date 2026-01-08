import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Plus, X } from 'lucide-react';

// Types defined locally since they're not exported from AdminDashboard
export interface Employee {
  cedula: string;
  nombre: string;
  unidadNegocio: string;
  salarioBruto: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
  areas: string[];
}

interface QuickAddProps {
  onAdd: (data: Employee | Cliente) => void;
  type?: 'employee' | 'cliente';
}



export function QuickAdd({ onAdd, type = 'employee' }: QuickAddProps) {
  const [formData, setFormData] = useState<{
    cedula: string;
    nombre: string;
    unidadNegocio: string;
    salarioBruto: string;
    elementoPEP: string;
  }>({
    cedula: '',
    nombre: '',
    unidadNegocio: '',
    salarioBruto: '',
    elementoPEP: '',
  });


  const [currentArea, setCurrentArea] = useState('');

  //manejo de areas
  const [areas, setAreas] = useState<string[]>([]);
  //manejo de carga
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {

    async function SearchData() {
      const response = await fetch(import.meta.env.VITE_API_URL);
      const data = await response.json();
      setAreas(data.map((item: { NombreArea: string }) => item.NombreArea));
      setIsLoading(false);
    }
    SearchData();
  }, [])

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const generateClienteId = () => {
    // Genera un ID único basado en timestamp y random
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 5);
    return `C-${timestamp}-${random}`.toUpperCase();
  };

  const handleAddArea = () => {
    if (currentArea.trim() && !areas.includes(currentArea.trim())) {
      setAreas([...areas, currentArea.trim()]);
      setCurrentArea('');
    }
  };

  const handleRemoveArea = (areaToRemove: string) => {
    setAreas(areas.filter(area => area !== areaToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (type === 'employee') {
      const employee: Employee = {
        cedula: formData.cedula,
        nombre: formData.nombre,
        unidadNegocio: formData.unidadNegocio,
        salarioBruto: parseFloat(formData.salarioBruto) || 0,
      };
      onAdd(employee);
    } else {
      const cliente: Cliente = {
        id: generateClienteId(), // ID autogenerado
        nombre: formData.nombre,
        elementoPEP: formData.elementoPEP,
        areas: areas,
      };
      onAdd(cliente);
    }

    // Reset form
    setFormData({
      cedula: '',
      nombre: '',
      unidadNegocio: '',
      salarioBruto: '',
      elementoPEP: '',
    });
    setAreas([]);
    setCurrentArea('');
  };

  if (type === 'cliente') {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre Cliente</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              placeholder="Cliente ABC"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="elementoPEP">Elemento PEP</Label>
            <Input
              id="elementoPEP"
              value={formData.elementoPEP}
              onChange={(e) => handleChange('elementoPEP', e.target.value)}
              placeholder="PEP-001"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="area">Áreas/Procesos del Cliente</Label>
          <div className="flex gap-2">
            <Input
              id="area"
              value={currentArea}
              onChange={(e) => setCurrentArea(e.target.value)}
              placeholder="Ej: Desarrollo, Soporte, Consultoría"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddArea();
                }
              }}
            />
            <Button
              type="button"
              onClick={handleAddArea}
              variant="outline"
              disabled={!currentArea.trim()}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {areas.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {areas.map((area, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#303483]/10 text-[#303483]">
                  {area}
                  <button
                    type="button"
                    onClick={() => handleRemoveArea(area)}
                    className="hover:text-red-600 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500">
            Agrega al menos un área o proceso para este cliente
          </p>
        </div>

        <div className="bg-[#bbd531]/10 border border-[#bbd531]/30 rounded-lg p-3 text-sm text-gray-700">
          💡 El ID del cliente se generará automáticamente. Puedes agregar múltiples áreas.
        </div>
        <Button type="submit" className="w-full md:w-auto" disabled={areas.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar Cliente
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cedula">Cédula</Label>
          <Input
            id="cedula"
            value={formData.cedula}
            onChange={(e) => handleChange('cedula', e.target.value)}
            placeholder="123456789"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre Completo</Label>
          <Input
            id="nombre"
            value={formData.nombre}
            onChange={(e) => handleChange('nombre', e.target.value)}
            placeholder="Juan Pérez"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unidadNegocio">Unidad de Negocio</Label>
          <Input
            id="unidadNegocio"
            value={formData.unidadNegocio}
            onChange={(e) => handleChange('unidadNegocio', e.target.value)}
            placeholder="Unidad A"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salarioBruto">Salario Bruto</Label>
          <Input
            id="salarioBruto"
            type="number"
            value={formData.salarioBruto}
            onChange={(e) => handleChange('salarioBruto', e.target.value)}
            placeholder="3500000"
            required
          />
        </div>
      </div>
      <Button type="submit" className="w-full md:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Agregar Empleado
      </Button>
    </form>
  );
}
