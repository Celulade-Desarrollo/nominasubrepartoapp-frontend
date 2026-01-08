import { Card, CardContent } from './ui/card';
import { Calendar, MousePointer, Clock } from 'lucide-react';

export function CalendarInstructions() {
  return (
    <Card className="bg-gradient-to-r from-[#303483]/5 to-[#bbd531]/5 border-[#303483]/20">
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-[#303483] text-white rounded-full p-2">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm text-[#303483] mb-1">Selecciona el día</h4>
              <p className="text-xs text-gray-600">
                Usa el calendario para elegir la fecha en la que trabajaste
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-[#303483] text-white rounded-full p-2">
              <MousePointer className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm text-[#303483] mb-1">Haz clic en el día</h4>
              <p className="text-xs text-gray-600">
                Al hacer clic, se abrirá un formulario para registrar las horas
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-[#bbd531] text-[#303483] rounded-full p-2">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm text-[#303483] mb-1">Registra las horas</h4>
              <p className="text-xs text-gray-600">
                Ingresa el cliente, área y las horas trabajadas ese día
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
