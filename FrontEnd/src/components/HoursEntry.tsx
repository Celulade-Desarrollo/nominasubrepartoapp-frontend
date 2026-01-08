import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Save, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Cliente {
  id: string;
  nombre: string;
  elementoPEP: string;
}

interface HoursEntryProps {
  clientes: Cliente[];
  onSave: (clienteId: string, horas: number, fecha: Date, areaCliente?: string) => void;
  simplified?: boolean;
}

export function HoursEntry({ clientes, onSave, simplified = false }: HoursEntryProps) {
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [horas, setHoras] = useState<string>('');
  const [areaCliente, setAreaCliente] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCliente && horas) {
      onSave(selectedCliente, parseFloat(horas), selectedDate, areaCliente || undefined);
      setSelectedCliente('');
      setHoras('');
      setAreaCliente('');
    }
  };

  const selectedClienteData = clientes.find(c => c.id === selectedCliente);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fecha">Fecha</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="fecha"
              variant="outline"
              className="w-full justify-start text-left"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Selecciona una fecha"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={es}
              disabled={(date) => date > new Date() || date < new Date("2024-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cliente">Cliente</Label>
        <Select value={selectedCliente} onValueChange={setSelectedCliente}>
          <SelectTrigger id="cliente">
            <SelectValue placeholder="Selecciona un cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((cliente) => (
              <SelectItem key={cliente.id} value={cliente.id}>
                {cliente.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClienteData && (
          <p className="text-sm text-gray-500">
            Elemento PEP: {selectedClienteData.elementoPEP}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="areaCliente">Área del Cliente / Proceso</Label>
        <Input
          id="areaCliente"
          value={areaCliente}
          onChange={(e) => setAreaCliente(e.target.value)}
          placeholder="Ej: Desarrollo, Soporte, Consultoría"
        />
        <p className="text-xs text-gray-500">
          Opcional: Especifica el área o proceso en el que trabajaste
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

      <Button type="submit" className="w-full" disabled={!selectedCliente || !horas}>
        <Save className="w-4 h-4 mr-2" />
        Guardar Horas
      </Button>

      {!simplified && (
        <div className="bg-[#bbd531]/10 border border-[#bbd531]/30 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            💡 Consejo: Puedes registrar fracciones de hora (ej: 0.5, 1.5, 2.5)
          </p>
        </div>
      )}
    </form>
  );
}
