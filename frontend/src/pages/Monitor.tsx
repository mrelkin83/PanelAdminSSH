/**
 * Monitor Page - Función #7: Monitor de Usuarios Conectados
 * Muestra conexiones SSH en tiempo real
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { monitorService } from '../services/monitor.service';
import { vpsService } from '../services/vps.service';
import { format } from 'date-fns';
import { Wifi, WifiOff, Activity, Clock, MapPin, Trash2, RotateCw, Server } from 'lucide-react';

export default function Monitor() {
  const [selectedVpsId, setSelectedVpsId] = useState<string>('');

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['connections'],
    queryFn: () => monitorService.getConnections(),
    refetchInterval: 3000, // Actualizar cada 3 segundos
  });

  // Query: Listar VPS
  const { data: vpsList = [] } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
  });

  // Mutations para mantenimiento
  const cleanVPSLogsMutation = useMutation({
    mutationFn: (vpsId: string) => monitorService.cleanVPSLogs(vpsId),
    onSuccess: () => {
      alert('✅ Logs del VPS limpiados exitosamente');
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const restartVPSMutation = useMutation({
    mutationFn: (vpsId: string) => monitorService.restartVPS(vpsId),
    onSuccess: () => {
      alert('✅ VPS reiniciándose... Tomará unos minutos.');
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const cleanAPILogsMutation = useMutation({
    mutationFn: () => monitorService.cleanAPILogs(),
    onSuccess: (data) => {
      alert(`✅ ${data.message || 'Logs de la API limpiados exitosamente'}`);
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleCleanVPSLogs = () => {
    if (!selectedVpsId) {
      alert('⚠️ Por favor selecciona un VPS primero');
      return;
    }
    const vps = vpsList.find(v => v.id === selectedVpsId);
    if (confirm(`¿Limpiar logs del VPS "${vps?.name}"?\n\nEsta acción eliminará los archivos de log del sistema.`)) {
      cleanVPSLogsMutation.mutate(selectedVpsId);
    }
  };

  const handleRestartVPS = () => {
    if (!selectedVpsId) {
      alert('⚠️ Por favor selecciona un VPS primero');
      return;
    }
    const vps = vpsList.find(v => v.id === selectedVpsId);
    if (confirm(`¿Reiniciar el VPS "${vps?.name}"?\n\n⚠️ ADVERTENCIA: Todos los usuarios conectados serán desconectados y el VPS estará inaccesible durante unos minutos.`)) {
      restartVPSMutation.mutate(selectedVpsId);
    }
  };

  const handleCleanAPILogs = () => {
    if (confirm('¿Limpiar logs de la API?\n\nEsta acción eliminará los archivos de log antiguos del panel.')) {
      cleanAPILogsMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-600" />
            Monitor de Conexiones
          </h1>
          <p className="text-gray-600 mt-2">
            {connections.length} usuario{connections.length !== 1 ? 's' : ''} conectado
            {connections.length !== 1 ? 's' : ''} ahora
          </p>
        </div>

        {/* Indicador en vivo */}
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-700">Actualización en tiempo real</span>
        </div>
      </div>

      {/* Sección de Mantenimiento */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl shadow-sm p-6 mb-8 border border-purple-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Server className="w-6 h-6 text-purple-600" />
          Opciones de Mantenimiento
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar VPS</label>
            <select
              value={selectedVpsId}
              onChange={(e) => setSelectedVpsId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">Seleccionar VPS para mantenimiento</option>
              {vpsList.map((vps) => (
                <option key={vps.id} value={vps.id}>
                  {vps.name} ({vps.host})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Limpieza de logs VPS */}
          <button
            onClick={handleCleanVPSLogs}
            disabled={!selectedVpsId || cleanVPSLogsMutation.isPending}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            {cleanVPSLogsMutation.isPending ? 'Limpiando...' : 'Limpiar Logs VPS'}
          </button>

          {/* Reinicio de VPS */}
          <button
            onClick={handleRestartVPS}
            disabled={!selectedVpsId || restartVPSMutation.isPending}
            className="flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className={`w-5 h-5 ${restartVPSMutation.isPending ? 'animate-spin' : ''}`} />
            {restartVPSMutation.isPending ? 'Reiniciando...' : 'Reiniciar VPS'}
          </button>

          {/* Limpieza de logs API */}
          <button
            onClick={handleCleanAPILogs}
            disabled={cleanAPILogsMutation.isPending}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-5 h-5" />
            {cleanAPILogsMutation.isPending ? 'Limpiando...' : 'Limpiar Logs API'}
          </button>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ Precaución:</strong> Las opciones de mantenimiento deben usarse con cuidado.
            El reinicio de VPS desconectará a todos los usuarios temporalmente.
          </p>
        </div>
      </div>

      {/* Lista de conexiones */}
      {connections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No hay usuarios conectados
          </h3>
          <p className="text-gray-600">
            Las conexiones aparecerán aquí cuando los usuarios se conecten vía SSH
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {connections.map((connection, index) => (
            <div
              key={connection.id || index}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-all border-l-4 border-green-500"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Usuario */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Wifi className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        {connection.username}
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Conectado
                        </span>
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        {connection.vps && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {connection.vps.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Detalles de conexión */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">IP de Origen</p>
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {connection.ipAddress}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1">Protocolo</p>
                      <p className="text-sm font-medium text-gray-900">
                        {connection.protocol || 'SSH'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Conectado desde
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(connection.connectedAt), 'HH:mm:ss - dd/MM/yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Activity className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Monitoreo en Tiempo Real</h4>
            <p className="text-sm text-blue-700">
              Esta página se actualiza automáticamente cada 3 segundos para mostrar las conexiones activas.
              Puedes ver quién está conectado, desde qué IP y a qué VPS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
