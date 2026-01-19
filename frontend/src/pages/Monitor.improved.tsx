/**
 * Monitor Page Mejorado - Monitoreo de Todas las VPS
 * Muestra métricas en tiempo real: CPU, RAM, Disk, Uptime, Puertos
 * Basado en el proyecto modelo
 */

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { vpsService } from '../services/vps.service';
import { monitorService } from '../services/monitor.service';
import { Server, Cpu, HardDrive, Activity, Clock, Wifi, WifiOff, AlertCircle, Trash2, RotateCw } from 'lucide-react';

interface VPSMetrics {
  vpsId: string;
  vpsName: string;
  status: 'online' | 'offline' | 'error';
  cpuUsage?: number;
  ramUsage?: number;
  ramTotal?: number;
  ramUsed?: number;
  diskUsage?: number;
  diskTotal?: string;
  diskUsed?: string;
  uptime?: string;
  ports?: number[];
  error?: string;
}

export default function MonitorImproved() {
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 segundos por defecto
  const [selectedVpsId, setSelectedVpsId] = useState<string>('');

  // Obtener lista de VPS
  const { data: vpsList = [] } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
    refetchInterval: 30000, // Actualizar lista cada 30s
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

  // Obtener métricas de cada VPS
  const { data: metricsMap = {}, isLoading } = useQuery<Record<string, VPSMetrics>>({
    queryKey: ['vps-metrics'],
    queryFn: async () => {
      const metrics: Record<string, VPSMetrics> = {};

      await Promise.allSettled(
        vpsList.map(async (vps) => {
          try {
            const vpsMetrics = await vpsService.getVPSMetrics(vps.id);
            metrics[vps.id] = vpsMetrics;
          } catch (error: any) {
            metrics[vps.id] = {
              vpsId: vps.id,
              vpsName: vps.name,
              status: 'error',
              error: error.message || 'Error obteniendo métricas',
            };
          }
        })
      );

      return metrics;
    },
    enabled: vpsList.length > 0,
    refetchInterval: refreshInterval,
  });

  const onlineCount = Object.values(metricsMap).filter((m) => m.status === 'online').length;
  const offlineCount = Object.values(metricsMap).filter(
    (m) => m.status === 'offline' || m.status === 'error'
  ).length;

  if (isLoading && vpsList.length > 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-gray-600">Cargando métricas de {vpsList.length} VPS...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Activity className="w-8 h-8 text-purple-600" />
              Monitor de VPS
            </h1>
            <p className="text-gray-600 mt-2">
              {vpsList.length} VPS • {onlineCount} Online • {offlineCount} Offline
            </p>
          </div>

          {/* Controles */}
          <div className="flex items-center gap-4">
            {/* Selector de intervalo */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Actualizar cada:</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={5000}>5 segundos</option>
                <option value={10000}>10 segundos</option>
                <option value={30000}>30 segundos</option>
                <option value={60000}>1 minuto</option>
              </select>
            </div>

            {/* Indicador en vivo */}
            <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">En vivo</span>
            </div>
          </div>
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

      {/* Grid de VPS */}
      {vpsList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Server className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay VPS configurados</h3>
          <p className="text-gray-600">Agrega un VPS desde Admin VPS para comenzar el monitoreo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vpsList.map((vps) => {
            const metrics = metricsMap[vps.id];
            const isOnline = metrics?.status === 'online';
            const isError = metrics?.status === 'error';

            return (
              <div
                key={vps.id}
                className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-all border-l-4 ${
                  isOnline
                    ? 'border-green-500'
                    : isError
                    ? 'border-red-500'
                    : 'border-gray-300'
                }`}
              >
                {/* Header del VPS */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          isOnline ? 'bg-green-100' : isError ? 'bg-red-100' : 'bg-gray-100'
                        }`}
                      >
                        <Server
                          className={`w-6 h-6 ${
                            isOnline
                              ? 'text-green-600'
                              : isError
                              ? 'text-red-600'
                              : 'text-gray-400'
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{vps.name}</h3>
                        <p className="text-sm text-gray-500 font-mono">{vps.host}</p>
                      </div>
                    </div>
                    {isOnline ? (
                      <Wifi className="w-5 h-5 text-green-500" />
                    ) : (
                      <WifiOff className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Estado */}
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        isOnline
                          ? 'bg-green-100 text-green-700'
                          : isError
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {isOnline ? '● Online' : isError ? '● Error' : '● Offline'}
                    </span>
                  </div>
                </div>

                {/* Métricas */}
                {isOnline && metrics ? (
                  <div className="p-6 space-y-4">
                    {/* CPU */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium text-gray-700">CPU</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {metrics.cpuUsage?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (metrics.cpuUsage || 0) > 80
                              ? 'bg-red-500'
                              : (metrics.cpuUsage || 0) > 50
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(metrics.cpuUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* RAM */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">RAM</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {metrics.ramUsage?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (metrics.ramUsage || 0) > 80
                              ? 'bg-red-500'
                              : (metrics.ramUsage || 0) > 50
                              ? 'bg-yellow-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${Math.min(metrics.ramUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics.ramUsed?.toFixed(0)} MB / {metrics.ramTotal?.toFixed(0)} MB
                      </p>
                    </div>

                    {/* Disco */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-orange-600" />
                          <span className="text-sm font-medium text-gray-700">Disco</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {metrics.diskUsage?.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            (metrics.diskUsage || 0) > 80
                              ? 'bg-red-500'
                              : (metrics.diskUsage || 0) > 50
                              ? 'bg-yellow-500'
                              : 'bg-orange-500'
                          }`}
                          style={{ width: `${Math.min(metrics.diskUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {metrics.diskUsed} / {metrics.diskTotal}
                      </p>
                    </div>

                    {/* Uptime */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Uptime:</span>
                        <span>{metrics.uptime || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Puertos */}
                    {metrics.ports && metrics.ports.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-2">Puertos Abiertos:</p>
                        <div className="flex flex-wrap gap-1">
                          {metrics.ports.slice(0, 6).map((port) => (
                            <span
                              key={port}
                              className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-mono rounded"
                            >
                              {port}
                            </span>
                          ))}
                          {metrics.ports.length > 6 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                              +{metrics.ports.length - 6}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : isError ? (
                  <div className="p-6">
                    <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Error de conexión</p>
                        <p className="text-xs text-red-700 mt-1">{metrics?.error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    <p className="text-sm">VPS Offline</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
