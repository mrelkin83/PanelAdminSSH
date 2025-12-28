/**
 * Dashboard - Panel principal con estadísticas
 */

import { useQuery } from '@tanstack/react-query';
import { monitorService } from '../services/monitor.service';
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
} from 'lucide-react';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => monitorService.getStats(),
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

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
      link: '/users',
    },
    {
      title: 'Usuarios Expirados',
      value: stats?.expiredUsers || 0,
      icon: UserX,
      color: 'red',
      link: '/users',
    },
    {
      title: 'Usuarios Bloqueados',
      value: stats?.blockedUsers || 0,
      icon: Shield,
      color: 'orange',
      link: '/users',
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
      link: '/users',
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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Vista general del sistema</p>
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
