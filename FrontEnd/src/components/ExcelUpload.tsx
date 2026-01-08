import { useState } from 'react';
import { Button } from './ui/button';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import type { Employee } from './AdminDashboard';

interface ExcelUploadProps {
  onUpload: (data: Employee[]) => void;
}

export function ExcelUpload({ onUpload }: ExcelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls') || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Por favor selecciona un archivo Excel válido (.xlsx, .xls, .csv)');
        setFile(null);
      }
    }
  };

  const handleUpload = () => {
    if (!file) return;

    // Simular procesamiento de Excel - en producción usarías una librería como xlsx
    // Por ahora creamos datos de ejemplo
    const mockData: Employee[] = [
      {
        cedula: '111222333',
        nombre: 'Juan Pérez',
        unidadNegocio: 'Unidad A',
        salarioBruto: 3500000,
      },
      {
        cedula: '444555666',
        nombre: 'María González',
        unidadNegocio: 'Unidad A',
        salarioBruto: 4200000,
      },
      {
        cedula: '777888999',
        nombre: 'Carlos Rodríguez',
        unidadNegocio: 'Unidad B',
        salarioBruto: 3800000,
      },
      {
        cedula: '123123123',
        nombre: 'Ana Martínez',
        unidadNegocio: 'Unidad B',
        salarioBruto: 4500000,
      },
      {
        cedula: '456456456',
        nombre: 'Luis Fernández',
        unidadNegocio: 'Unidad C',
        salarioBruto: 3900000,
      },
    ];

    onUpload(mockData);
    setFile(null);
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors">
        <input
          type="file"
          id="excel-upload"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
        />
        <label
          htmlFor="excel-upload"
          className="cursor-pointer flex flex-col items-center"
        >
          <FileSpreadsheet className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">
            {file ? file.name : 'Haz clic para seleccionar un archivo Excel'}
          </p>
          <p className="text-sm text-gray-500">
            Formatos soportados: .xlsx, .xls, .csv
          </p>
        </label>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {file && (
        <div className="flex items-center justify-between p-4 bg-[#bbd531]/10 border border-[#bbd531]/30 rounded-lg">
          <div className="flex items-center">
            <FileSpreadsheet className="w-5 h-5 text-[#303483] mr-2" />
            <span className="text-sm text-gray-900">{file.name}</span>
          </div>
          <Button onClick={handleUpload}>
            <Upload className="w-4 h-4 mr-2" />
            Procesar Archivo
          </Button>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-700 mb-2">Formato esperado del archivo:</p>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Columna 1: Cédula</li>
          <li>• Columna 2: Nombre</li>
          <li>• Columna 3: Unidad de Negocio</li>
          <li>• Columna 4: Salario Bruto</li>
        </ul>
      </div>
    </div>
  );
}
