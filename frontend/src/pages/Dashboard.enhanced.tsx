/**
 * Dashboard Enhanced - Panel principal con estadísticas mejoradas
 * Incluye: Filtros, búsqueda, actualización configurable, vista detallada por VPS
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { monitorService } from '../services/monitor.service';
import { vpsService } from '../services/vps.service';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  Wifi,
  Server,
  TrendingUp,
  Activity,
  RefreshCw,
  Search,
  Clock,
  Filter,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';

export default function DashboardEnhanced() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVPS, setSelectedVPS] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 segundos por defecto
  const [showFilters, setShowFilters] = useState(false);

  // Query: Estadísticas generales
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => monitorService.getStats(),
    refetchInterval: refreshInterval,
  });

  // Query: Lista de VPS
  const { data: vpsList = [] } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
    refetchInterval: 60000, // Actualizar cada minuto
  });

  // Configurar intervalo de actualización
  const intervalOptions = [
    { value: 30000, label: '30 segundos' },
    { value: 60000, label: '1 minuto' },
    { value: 180000, label: '3 minutos' },
    { value: 300000, label: '5 minutos' },
    { value: 0, label: 'Manual' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Usuarios',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'blue',
      link: '/users',
    },
    {
      title: 'Usuarios Activos',
      value: stats?.activeUsers || 0,
      icon: UserCheck,
      color: 'green',
      link: '/users?status=active',
    },
    {
      title: 'Usuarios Expirados',
      value: stats?.expiredUsers || 0,
      icon: UserX,
      color: 'red',
      link: '/users?status=expired',
    },
    {
      title: 'Usuarios Bloqueados',
      value: stats?.blockedUsers || 0,
      icon: Shield,
      color: 'orange',
      link: '/users?status=blocked',
    },
    {
      title: 'Conectados Ahora',
      value: stats?.currentConnections || 0,
      icon: Wifi,
      color: 'purple',
      link: '/monitor',
    },
    {
      title: 'Total VPS',
      value: stats?.totalVPS || 0,
      icon: Server,
      color: 'indigo',
      link: '/vps',
    },
  ];

  const colorMap: Record<string, any> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', icon: 'bg-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', icon: 'bg-orange-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'bg-purple-100' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-100' },
  };

  // Filtrar VPS por búsqueda
  const filteredVPS = vpsList.filter((vps) =>
    vps.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vps.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vps.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header con controles */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Vista general del sistema</p>
          </div>

          {/* Controles */}
          <div className="flex gap-3 items-center">
            {/* Selector de intervalo de actualización */}
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border">
              <Clock className="w-5 h-5 text-gray-500" />
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="text-sm border-none focus:ring-0 bg-transparent cursor-pointer"
              >
                {intervalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Botón de actualización manual */}
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border shadow-sm transition-colors"
              title="Actualizar ahora"
            >
              <RefreshCw className="w-5 h-5" />
              Actualizar
            </button>

            {/* Botón de filtros */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border shadow-sm transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        {showFilters && (
          <div className="bg-white rounded-lg shadow-sm p-4 mb-4 border">
            <div className="flex gap-4">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Buscar VPS por nombre, IP o ubicación..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Selector de VPS */}
              <div className="w-64">
                <select
                  value={selectedVPS}
                  onChange={(e) => setSelectedVPS(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">Todos los VPS</option>
                  {vpsList.map((vps) => (
                    <option key={vps.id} value={vps.id}>
                      {vps.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {cards.map((card) => {
          const Icon = card.icon;
          const colors = colorMap[card.color];

          return (
            <Link
              key={card.title}
              to={card.link}
              className={`${colors.bg} rounded-xl p-6 hover:shadow-lg transition-all transform hover:-translate-y-1`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                  <p className={`text-3xl font-bold ${colors.text}`}>{card.value}</p>
                </div>
                <div className={`${colors.icon} p-3 rounded-lg`}>
                  <Icon className={`w-8 h-8 ${colors.text}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Lista de VPS (Vista Detallada) */}
      {filteredVPS.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
            <BarChart3 className="w-6 h-6 mr-2 text-blue-600" />
            VPS Activos
          </h2>

          <div className="grid gap-4">
            {filteredVPS.map((vps) => (
              <div
                key={vps.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Estado */}
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                      {vps.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Información */}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{vps.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Server className="w-4 h-4" />
                          {vps.host}:{vps.port}
                        </span>
                        {vps.location && (
                          <span>{vps.location}</span>
                        )}
                        {vps.status === 'online' ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                            Online
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            Offline
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Estadísticas del VPS */}
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{vps._count?.sshUsers || 0}</p>
                        <p className="text-xs text-gray-500">Usuarios</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{vps._count?.connections || 0}</p>
                        <p className="text-xs text-gray-500">Conexiones</p>
                      </div>
                    </div>

                    {/* Botón Ver Detalle */}
                    <Link
                      to={`/vps/${vps.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Ver Detalle
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-blue-600" />
          Acciones Rápidas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/users?action=create"
            className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all group"
          >
            <div className="bg-white/20 p-3 rounded-lg mr-4 group-hover:bg-white/30">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Crear Nuevo Usuario</h3>
              <p className="text-sm text-blue-100">Agregar usuario SSH al sistema</p>
            </div>
          </Link>

          <Link
            to="/monitor"
            className="flex items-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all group"
          >
            <div className="bg-white/20 p-3 rounded-lg mr-4 group-hover:bg-white/30">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Ver Usuarios Conectados</h3>
              <p className="text-sm text-purple-100">Monitorear conexiones en tiempo real</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
