/**
 * Users Page MEJORADA - Optimizada para 60+ VPS
 * Características:
 * - Búsqueda y filtrado avanzado
 * - Agrupación por país/proveedor
 * - Vista de tarjetas y lista
 * - Selección múltiple optimizada
 * - Creación masiva de usuarios
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../services/users.service';
import { vpsService } from '../services/vps.service';
import { format, differenceInDays } from 'date-fns';
import {
  UserPlus,
  RefreshCw,
  Shield,
  ShieldOff,
  Trash2,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Server,
  Search,
  Filter,
  Grid3x3,
  List,
  MapPin,
  Building2,
  Check,
} from 'lucide-react';
import type { SSHUser, CreateUserPayload } from '../types';

export default function UsersImproved() {
  const queryClient = useQueryClient();

  // Estados de UI
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SSHUser | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewFromToday, setRenewFromToday] = useState(true);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'blocked'>('all');
  const [filterVPS, setFilterVPS] = useState<string>('all');
  const [filterCountry, setFilterCountry] = useState<string>('all');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Queries
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAllUsers(),
    refetchInterval: 10000,
  });

  const { data: vpsList = [] } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
  });

  // Mutations (existentes del archivo original)
  const createMutation = useMutation({
    mutationFn: (data: CreateUserPayload) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      alert('✅ Usuario creado exitosamente');
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const createMultipleMutation = useMutation({
    mutationFn: (data: any) => usersService.createMultiple(data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowCreateModal(false);
      alert(`✅ Usuarios creados: ${result.data.created}/${result.data.total}\n${result.data.failed > 0 ? `⚠️ Fallos: ${result.data.failed}` : ''}`);
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const renewMutation = useMutation({
    mutationFn: ({ id, days, fromToday }: { id: string; days: number; fromToday: boolean }) =>
      usersService.renewUser(id, days, fromToday),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowRenewModal(false);
      setSelectedUser(null);
      alert('✅ Usuario renovado exitosamente');
    },
  });

  const blockMutation = useMutation({
    mutationFn: (id: string) => usersService.blockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('✅ Usuario bloqueado');
    },
  });

  const unblockMutation = useMutation({
    mutationFn: (id: string) => usersService.unblockUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('✅ Usuario desbloqueado');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert('✅ Usuario eliminado');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (vpsId: string) => vpsService.syncUsers(vpsId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      alert(`✅ Sincronización completada:\n${data.imported} nuevos\n${data.skipped} actualizados\nTotal: ${data.total} usuarios`);
    },
  });

  // Calcular listas únicas para filtros
  const countries = useMemo(() => {
    const uniqueCountries = new Set(vpsList.map(v => v.location).filter(Boolean));
    return Array.from(uniqueCountries).sort();
  }, [vpsList]);

  const providers = useMemo(() => {
    const uniqueProviders = new Set(vpsList.map(v => v.provider).filter(Boolean));
    return Array.from(uniqueProviders).sort();
  }, [vpsList]);

  // Usuarios filtrados
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Filtro de búsqueda
      const matchesSearch = searchTerm === '' ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.alias?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.vps?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.vps?.host.toLowerCase().includes(searchTerm.toLowerCase());

      // Filtro de estado
      const daysRemaining = differenceInDays(new Date(user.expiresAt), new Date());
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && user.isActive && !user.isBlocked && daysRemaining >= 0) ||
        (filterStatus === 'expired' && daysRemaining < 0) ||
        (filterStatus === 'blocked' && user.isBlocked);

      // Filtro de VPS
      const matchesVPS = filterVPS === 'all' || user.vpsId === filterVPS;

      // Filtro de país
      const matchesCountry = filterCountry === 'all' || user.vps?.location === filterCountry;

      // Filtro de proveedor
      const matchesProvider = filterProvider === 'all' || user.vps?.provider === filterProvider;

      return matchesSearch && matchesStatus && matchesVPS && matchesCountry && matchesProvider;
    });
  }, [users, searchTerm, filterStatus, filterVPS, filterCountry, filterProvider]);

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.isActive && !u.isBlocked && differenceInDays(new Date(u.expiresAt), new Date()) >= 0).length,
      expired: users.filter(u => differenceInDays(new Date(u.expiresAt), new Date()) < 0).length,
      blocked: users.filter(u => u.isBlocked).length,
    };
  }, [users]);

  // Handlers
  const handleDelete = (user: SSHUser) => {
    if (confirm(`¿Eliminar usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`)) {
      deleteMutation.mutate(user.id);
    }
  };

  const handleRenew = (user: SSHUser) => {
    setSelectedUser(user);
    setShowRenewModal(true);
  };

  const getDaysRemaining = (expiresAt: string) => {
    return differenceInDays(new Date(expiresAt), new Date());
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
      {/* Header con estadísticas */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Gestión de Usuarios SSH</h1>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-blue-500">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-green-500">
            <p className="text-sm text-gray-600">Activos</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-red-500">
            <p className="text-sm text-gray-600">Expirados</p>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border-l-4 border-orange-500">
            <p className="text-sm text-gray-600">Bloqueados</p>
            <p className="text-2xl font-bold text-orange-600">{stats.blocked}</p>
          </div>
        </div>

        {/* Barra de búsqueda y acciones */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white rounded-lg shadow-sm p-4">
          {/* Búsqueda */}
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por usuario, VPS, IP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Botones de vista */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="Vista de lista"
            >
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="Vista de cuadrícula"
            >
              <Grid3x3 className="w-5 h-5" />
            </button>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2">
            {vpsList.length > 0 && (
              <button
                onClick={() => {
                  if (vpsList.length === 1) {
                    syncMutation.mutate(vpsList[0].id);
                  } else {
                    const vpsId = prompt(`Selecciona VPS:\n\n${vpsList.map((v, i) => `${i + 1}. ${v.name}`).join('\n')}\n\nNúmero:`);
                    const index = parseInt(vpsId || '0') - 1;
                    if (index >= 0 && index < vpsList.length) {
                      syncMutation.mutate(vpsList[index].id);
                    }
                  }
                }}
                disabled={syncMutation.isPending}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          </div>
        </div>

        {/* Filtros avanzados */}
        <div className="bg-white rounded-lg shadow-sm p-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold text-gray-900">Filtros</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Estado */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Solo activos</option>
              <option value="expired">Solo expirados</option>
              <option value="blocked">Solo bloqueados</option>
            </select>

            {/* VPS */}
            <select
              value={filterVPS}
              onChange={(e) => setFilterVPS(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los VPS</option>
              {vpsList.map(vps => (
                <option key={vps.id} value={vps.id}>{vps.name}</option>
              ))}
            </select>

            {/* País */}
            <select
              value={filterCountry}
              onChange={(e) => setFilterCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los países</option>
              {countries.map(country => (
                <option key={country} value={country}>{country}</option>
              ))}
            </select>

            {/* Proveedor */}
            <select
              value={filterProvider}
              onChange={(e) => setFilterProvider(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los proveedores</option>
              {providers.map(provider => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </div>

          <div className="mt-3 text-sm text-gray-600">
            Mostrando {filteredUsers.length} de {users.length} usuarios
          </div>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron usuarios</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || filterStatus !== 'all' || filterVPS !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Crea tu primer usuario SSH para comenzar'}
            </p>
            {!searchTerm && filterStatus === 'all' && filterVPS === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Crear Usuario
              </button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const daysRemaining = getDaysRemaining(user.expiresAt);
            const isExpired = daysRemaining < 0;
            const isExpiringSoon = daysRemaining >= 0 && daysRemaining <= 3;

            return (
              <div
                key={user.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Usuario y VPS */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{user.username}</h3>
                        {user.alias && (
                          <p className="text-sm text-blue-600 font-medium truncate">{user.alias}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Server className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{user.vps?.name || 'VPS'}</span>
                          <span className="text-gray-400">•</span>
                          <span className="truncate">{user.vps?.host}</span>
                        </div>
                        {user.vps?.location && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3" />
                            {user.vps.location}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Estados */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {isExpired ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <AlertCircle className="w-4 h-4" />
                          Expirado hace {Math.abs(daysRemaining)} días
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                          <Clock className="w-4 h-4" />
                          Expira en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          {daysRemaining} días restantes
                        </span>
                      )}

                      {user.isBlocked && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <ShieldOff className="w-4 h-4" />
                          Bloqueado
                        </span>
                      )}

                      <span className="text-sm text-gray-600">
                        Expira: {format(new Date(user.expiresAt), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleRenew(user)}
                      className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                      title="Renovar Usuario"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>

                    {user.isBlocked ? (
                      <button
                        onClick={() => unblockMutation.mutate(user.id)}
                        className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="Desbloquear Usuario"
                      >
                        <Shield className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => blockMutation.mutate(user.id)}
                        className="p-2 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg transition-colors"
                        title="Bloquear Usuario"
                      >
                        <ShieldOff className="w-5 h-5" />
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(user)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Eliminar Usuario"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Renovar Usuario */}
      {showRenewModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Renovar Usuario</h2>
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-2">Usuario: <strong>{selectedUser.username}</strong></p>
              <p className="text-gray-600">
                Expira actualmente: {format(new Date(selectedUser.expiresAt), 'dd/MM/yyyy')}
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Días a agregar
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={renewDays}
                onChange={(e) => setRenewDays(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={renewFromToday}
                  onChange={(e) => setRenewFromToday(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm text-gray-700">
                  Renovar desde hoy (en lugar de desde la fecha de expiración)
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setSelectedUser(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => renewMutation.mutate({ id: selectedUser.id, days: renewDays, fromToday: renewFromToday })}
                disabled={renewMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {renewMutation.isPending ? 'Renovando...' : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Usuario (componente separado más abajo) */}
      {showCreateModal && (
        <CreateUserModalImproved
          vpsList={vpsList}
          onClose={() => setShowCreateModal(false)}
          onSubmitSingle={(data) => createMutation.mutate(data)}
          onSubmitMultiple={(data) => createMultipleMutation.mutate(data)}
          isLoading={createMutation.isPending || createMultipleMutation.isPending}
        />
      )}
    </div>
  );
}

// Componente: Modal Mejorado para Crear Usuario
function CreateUserModalImproved({
  vpsList,
  onClose,
  onSubmitSingle,
  onSubmitMultiple,
  isLoading,
}: {
  vpsList: any[];
  onClose: () => void;
  onSubmitSingle: (data: CreateUserPayload) => void;
  onSubmitMultiple: (data: any) => void;
  isLoading: boolean;
}) {
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [selectedVPS, setSelectedVPS] = useState<Set<string>>(new Set());
  const [searchVPS, setSearchVPS] = useState('');
  const [username, setUsername] = useState('');
  const [alias, setAlias] = useState('');
  const [password, setPassword] = useState('');
  const [days, setDays] = useState(30);
  const [maxConnections, setMaxConnections] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');

  // Filtrar VPS por búsqueda
  const filteredVPS = useMemo(() => {
    if (!searchVPS) return vpsList;
    const term = searchVPS.toLowerCase();
    return vpsList.filter(vps =>
      vps.name.toLowerCase().includes(term) ||
      vps.host.toLowerCase().includes(term) ||
      vps.location?.toLowerCase().includes(term) ||
      vps.provider?.toLowerCase().includes(term)
    );
  }, [vpsList, searchVPS]);

  const toggleVPS = (vpsId: string) => {
    const newSet = new Set(selectedVPS);
    if (newSet.has(vpsId)) {
      newSet.delete(vpsId);
    } else {
      newSet.add(vpsId);
    }
    setSelectedVPS(newSet);
  };

  const selectAll = () => {
    setSelectedVPS(new Set(filteredVPS.map(v => v.id)));
  };

  const deselectAll = () => {
    setSelectedVPS(new Set());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'single' && selectedVPS.size !== 1) {
      alert('Selecciona exactamente un VPS para modo individual');
      return;
    }

    if (mode === 'multiple' && selectedVPS.size === 0) {
      alert('Selecciona al menos un VPS para modo múltiple');
      return;
    }

    const baseData = {
      username,
      alias: alias || undefined,
      password,
      days,
      maxConnections,
      notes,
    };

    if (mode === 'single') {
      const vpsId = Array.from(selectedVPS)[0];
      onSubmitSingle({ ...baseData, vpsId });
    } else {
      const vpsIds = Array.from(selectedVPS);
      onSubmitMultiple({ ...baseData, vpsIds });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Crear Nuevo Usuario SSH</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de modo */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              mode === 'single'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Un VPS
          </button>
          <button
            onClick={() => setMode('multiple')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium ${
              mode === 'multiple'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Múltiples VPS ({selectedVPS.size} seleccionados)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Datos del usuario */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario SSH</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: 26b18e2158ff1ac"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Alias (Identificación)</label>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={100}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="ej: Cliente Juan Pérez, Usuario Premium, etc."
              />
              <p className="text-xs text-gray-500 mt-1">Opcional: Ayuda a identificar al usuario</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Días de validez</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value))}
                required
                min={1}
                max={365}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Límite de conexiones (opcional)</label>
              <input
                type="number"
                value={maxConnections || ''}
                onChange={(e) => setMaxConnections(e.target.value ? parseInt(e.target.value) : undefined)}
                min={1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Sin límite"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Información adicional sobre el usuario"
            />
          </div>

          {/* Selección de VPS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Seleccionar VPS {mode === 'multiple' && `(${selectedVPS.size} seleccionados)`}
              </label>
              {mode === 'multiple' && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Seleccionar todos
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAll}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              )}
            </div>

            {/* Búsqueda de VPS */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar VPS por nombre, IP, país..."
                value={searchVPS}
                onChange={(e) => setSearchVPS(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Lista de VPS */}
            <div className="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              {filteredVPS.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron VPS
                </div>
              ) : (
                filteredVPS.map(vps => (
                  <div
                    key={vps.id}
                    onClick={() => toggleVPS(vps.id)}
                    className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      selectedVPS.has(vps.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        selectedVPS.has(vps.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedVPS.has(vps.id) && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{vps.name}</span>
                          <span className={`w-2 h-2 rounded-full ${
                            vps.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                          }`}></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                          <Server className="w-3 h-3" />
                          <span className="truncate">{vps.host}:{vps.port}</span>
                          {vps.location && (
                            <>
                              <span className="text-gray-400">•</span>
                              <MapPin className="w-3 h-3" />
                              <span>{vps.location}</span>
                            </>
                          )}
                          {vps.provider && (
                            <>
                              <span className="text-gray-400">•</span>
                              <Building2 className="w-3 h-3" />
                              <span>{vps.provider}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || selectedVPS.size === 0}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading
                ? 'Creando...'
                : mode === 'single'
                ? 'Crear Usuario'
                : `Crear en ${selectedVPS.size} VPS`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
