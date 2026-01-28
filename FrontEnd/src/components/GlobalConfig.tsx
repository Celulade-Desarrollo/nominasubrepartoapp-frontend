import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Settings, Save, Loader2, Info } from 'lucide-react';
import { settingsAPI } from '../services/api';
import { Alert, AlertDescription } from './ui/alert';

export function GlobalConfig() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Local form state
    const [weeklyLimit, setWeeklyLimit] = useState<string>('44');
    const [dailyLimits, setDailyLimits] = useState({
        monday: 9,
        tuesday: 9,
        wednesday: 9,
        thursday: 9,
        friday: 8,
        saturday: 0,
        sunday: 0
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await settingsAPI.getAll();
            if (data) {
                if (data.weekly_limit) setWeeklyLimit(data.weekly_limit.toString());
                if (data.daily_limits) setDailyLimits(data.daily_limits);
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
                settingsAPI.update({ key: 'weekly_limit', value: parseInt(weeklyLimit) }),
                settingsAPI.update({ key: 'daily_limits', value: dailyLimits })
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

    const updateDailyLimit = (day: string, value: string) => {
        const num = parseFloat(value);
        if (isNaN(num)) return;
        setDailyLimits(prev => ({ ...prev, [day]: num }));
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

                    <div className="max-w-md space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="weeklyLimit">Límite Semanal Total (Horas)</Label>
                            <Input
                                id="weeklyLimit"
                                type="number"
                                value={weeklyLimit}
                                onChange={(e) => setWeeklyLimit(e.target.value)}
                                className="font-bold text-lg"
                            />
                            <p className="text-xs text-gray-500">Actualmente establecido en 44 horas semanales.</p>
                        </div>
                    </div>

                    <div className="space-y-4 border-t pt-6">
                        <h3 className="font-medium flex items-center gap-2">
                            Límites Diarios Máximos
                            <Info className="w-4 h-4 text-gray-400" />
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                            {[
                                { id: 'monday', label: 'Lunes' },
                                { id: 'tuesday', label: 'Martes' },
                                { id: 'wednesday', label: 'Miércoles' },
                                { id: 'thursday', label: 'Jueves' },
                                { id: 'friday', label: 'Viernes' },
                                { id: 'saturday', label: 'Sábado' },
                                { id: 'sunday', label: 'Domingo' }
                            ].map(day => (
                                <div key={day.id} className="space-y-2">
                                    <Label htmlFor={day.id} className="text-xs uppercase text-gray-500">{day.label}</Label>
                                    <Input
                                        id={day.id}
                                        type="number"
                                        step="0.5"
                                        value={(dailyLimits as any)[day.id]}
                                        onChange={(e) => updateDailyLimit(day.id, e.target.value)}
                                        className={(dailyLimits as any)[day.id] === 0 ? "bg-gray-100" : ""}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-100">
                            💡 Establezca 0 para deshabilitar el registro en un día específico (ej. Sábados y Domingos).
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
