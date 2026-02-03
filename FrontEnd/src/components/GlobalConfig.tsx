import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Settings, Save, Loader2, Clock } from 'lucide-react';
import { settingsAPI } from '../services/api';
import { Alert, AlertDescription } from './ui/alert';

export function GlobalConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Local form state
    const [normalHoursStart, setNormalHoursStart] = useState<string>('07:30');
    const [normalHoursEnd, setNormalHoursEnd] = useState<string>('17:30');
    const [normalHoursEndFriday, setNormalHoursEndFriday] = useState<string>('16:30');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await settingsAPI.getAll();
            if (data) {
                if (data.normal_hours_start) setNormalHoursStart(data.normal_hours_start.replace(/"/g, ''));
                if (data.normal_hours_end) setNormalHoursEnd(data.normal_hours_end.replace(/"/g, ''));
                if (data.normal_hours_end_friday) setNormalHoursEndFriday(data.normal_hours_end_friday.replace(/"/g, ''));
            }
        } catch (error) {
            console.error("Error loading settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setMessage(null);

            await Promise.all([
                settingsAPI.update({ key: 'normal_hours_start', value: normalHoursStart }),
                settingsAPI.update({ key: 'normal_hours_end', value: normalHoursEnd }),
                settingsAPI.update({ key: 'normal_hours_end_friday', value: normalHoursEndFriday })
            ]);

            setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-[#303483]" /></div>;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#303483]" />
                        <CardTitle>Configuración Global de Horas</CardTitle>
                    </div>
                    <CardDescription>
                        Define los límites permitidos para el registro de horas de los técnicos.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    {message && (
                        <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
                            <AlertDescription className={message.type === 'success' ? 'text-green-700' : 'text-red-700'}>
                                {message.text}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Configuración de Horas Extras */}
                    <div className="space-y-4 border-t pt-6">
                        <h3 className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-[#303483]" />
                            Configuración de Horas Extras
                        </h3>
                        <p className="text-sm text-gray-600">
                            Define el horario laboral normal. Las horas trabajadas fuera de este rango se considerarán horas extras.
                        </p>
                        <div className="grid grid-cols-2 gap-4 max-w-md">
                            <div className="space-y-2">
                                <Label htmlFor="normalStart">Hora Inicio Normal</Label>
                                <Input
                                    id="normalStart"
                                    type="time"
                                    value={normalHoursStart}
                                    onChange={(e) => setNormalHoursStart(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="normalEnd">Hora Fin Normal</Label>
                                <Input
                                    id="normalEnd"
                                    type="time"
                                    value={normalHoursEnd}
                                    onChange={(e) => setNormalHoursEnd(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="normalEndFriday">Hora Fin Normal (Viernes)</Label>
                                <Input
                                    id="normalEndFriday"
                                    type="time"
                                    value={normalHoursEndFriday}
                                    onChange={(e) => setNormalHoursEndFriday(e.target.value)}
                                    className="font-mono"
                                />
                            </div>
                        </div>
                        <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md border border-blue-100">
                            ⏰ Horario normal: L-J hasta <strong>{normalHoursEnd}</strong>, Viernes hasta <strong>{normalHoursEndFriday}</strong>.
                            Trabajo antes o después de este horario = horas extras.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#303483] hover:bg-[#303483]/90"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                            Guardar Configuración
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
