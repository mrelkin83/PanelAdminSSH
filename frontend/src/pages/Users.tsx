/**
 * Users Page - Gestión de Usuarios SSH
 * Implementa las 7 funciones esenciales del panel
 */

import { useState } from 'react';
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
} from 'lucide-react';
import type { SSHUser, CreateUserPayload } from '../types';

export default function Users() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SSHUser | null>(null);
  const [renewDays, setRenewDays] = useState(30);

  // Query: Listar usuarios
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getAllUsers(),
    refetchInterval: 10000, // Actualizar cada 10s
  });

  // Query: Listar VPS
  const { data: vpsList = [] } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
  });

  // Mutations
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

  const renewMutation = useMutation({
    mutationFn: ({ id, days }: { id: string; days: number }) =>
      usersService.renewUser(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowRenewModal(false);
      setSelectedUser(null);
      alert('✅ Usuario renovado exitosamente');
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
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
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

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
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios SSH</h1>
          <p className="text-gray-600 mt-2">
            {users.length} usuario{users.length !== 1 ? 's' : ''} en el sistema
          </p>
        </div>
        <div className="flex gap-3">
          {vpsList.length > 0 && (
            <button
              onClick={() => {
                if (vpsList.length === 1) {
                  syncMutation.mutate(vpsList[0].id);
                } else {
                  const vpsId = prompt(
                    `Selecciona VPS para sincronizar:\n\n${vpsList.map((v, i) => `${i + 1}. ${v.name}`).join('\n')}\n\nIngresa el número:`
                  );
                  const index = parseInt(vpsId || '0') - 1;
                  if (index >= 0 && index < vpsList.length) {
                    syncMutation.mutate(vpsList[index].id);
                  }
                }
              }}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              title="Importar usuarios existentes desde el VPS"
            >
              <RefreshCw className={`w-5 h-5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              Sincronizar VPS
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* Lista de usuarios */}
      <div className="grid gap-4">
        {users.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay usuarios</h3>
            <p className="text-gray-600 mb-4">Crea tu primer usuario SSH para comenzar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Crear Usuario
            </button>
          </div>
        ) : (
          users.map((user) => {
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
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{user.username}</h3>
                        {user.alias && (
                          <p className="text-sm text-blue-600 font-medium">{user.alias}</p>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Server className="w-4 h-4" />
                          {user.vps?.name || 'VPS'} ({user.vps?.host || user.vpsId})
                        </div>
                      </div>
                    </div>

                    {/* Estados y fecha */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* Estado expiración */}
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

                      {/* Estado bloqueado */}
                      {user.isBlocked && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          <ShieldOff className="w-4 h-4" />
                          Bloqueado
                        </span>
                      )}

                      {/* Fecha de expiración */}
                      <span className="text-sm text-gray-600">
                        Expira: {format(new Date(user.expiresAt), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex flex-wrap gap-2 ml-4">
                    {/* Función #3: Renovar */}
                    <button
                      onClick={() => handleRenew(user)}
                      className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-colors"
                      title="Renovar Usuario"
                    >
                      <RefreshCw className="w-5 h-5" />
                    </button>

                    {/* Función #4: Bloquear/Desbloquear */}
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

                    {/* Función #2: Eliminar */}
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

      {/* Modal: Función #1 - Crear Usuario */}
      {showCreateModal && (
        <CreateUserModal
          vpsList={vpsList}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Modal: Función #3 - Renovar Usuario */}
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
                onClick={() => renewMutation.mutate({ id: selectedUser.id, days: renewDays })}
                disabled={renewMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {renewMutation.isPending ? 'Renovando...' : 'Renovar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente: Modal Crear Usuario
function CreateUserModal({
  vpsList,
  onClose,
  onSubmit,
  isLoading,
}: {
  vpsList: any[];
  onClose: () => void;
  onSubmit: (data: CreateUserPayload) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CreateUserPayload>({
    vpsId: '',
    username: '',
    alias: '',
    password: '',
    days: 30,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Crear Nuevo Usuario SSH</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">VPS</label>
            <select
              value={formData.vpsId}
              onChange={(e) => setFormData({ ...formData, vpsId: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar VPS</option>
              {vpsList.map((vps) => (
                <option key={vps.id} value={vps.id}>
                  {vps.name} ({vps.host})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario SSH</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              pattern="[a-zA-Z0-9_-]+"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="nombreusuario"
            />
            <p className="text-xs text-gray-500 mt-1">Solo minúsculas, números, guiones y guion bajo</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alias (Identificación)</label>
            <input
              type="text"
              value={formData.alias || ''}
              onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="ej: Cliente Juan Pérez, Usuario Premium, etc."
            />
            <p className="text-xs text-gray-500 mt-1">Opcional: Ayuda a identificar al usuario</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
              value={formData.days}
              onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) })}
              required
              min={1}
              max={365}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

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
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
