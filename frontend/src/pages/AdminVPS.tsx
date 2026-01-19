/**
 * Admin VPS Page - Gestión Completa de VPS
 * Solo accesible para superadmin
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vpsService } from '../services/vps.service';
import { adminService, CreateVPSPayload } from '../services/admin.service';
import {
  Server,
  Plus,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Cloud,
  Key,
  Lock,
} from 'lucide-react';

export default function AdminVPS() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<'password' | 'privateKey'>('password');

  // Query: Listar VPS
  const { data: vpsList = [], isLoading } = useQuery({
    queryKey: ['vps'],
    queryFn: () => vpsService.getAllVPS(),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateVPSPayload) => adminService.createVPS(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['vps'] });
      setShowCreateModal(false);

      const warnings = response.warnings || [];
      if (warnings.length > 0) {
        alert(`⚠️ VPS agregado con advertencias:\n\n${warnings.join('\n')}`);
      } else {
        alert('✅ VPS agregado exitosamente');
      }
    },
    onError: (error: any) => {
      const errorData = error.response?.data || {};
      const errorMessage = errorData.message || errorData.error || error.message;
      const details = errorData.details;
      const suggestion = errorData.suggestion;

      let fullMessage = `❌ Error al agregar VPS:\n\n${errorMessage}`;

      if (details) {
        fullMessage += `\n\nDetalles:\n${JSON.stringify(details, null, 2)}`;
      }

      if (suggestion) {
        fullMessage += `\n\n💡 Sugerencia:\n${suggestion}`;
      }

      alert(fullMessage);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteVPS(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vps'] });
      alert('✅ VPS eliminado');
    },
    onError: (error: any) => {
      alert(`❌ Error: ${error.response?.data?.error || error.message}`);
    },
  });

  const handleDelete = (vps: any) => {
    if (
      confirm(
        `¿Eliminar VPS "${vps.name}"?\n\n⚠️ ADVERTENCIA: Esto también eliminará todos los usuarios SSH asociados.\n\nEsta acción no se puede deshacer.`
      )
    ) {
      deleteMutation.mutate(vps.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
      case 'offline':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle };
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
            <Server className="w-8 h-8 text-blue-600" />
            Administración de VPS
          </h1>
          <p className="text-gray-600 mt-2">
            {vpsList.length} VPS configurado{vpsList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Agregar VPS
        </button>
      </div>

      {/* Lista de VPS */}
      <div className="grid gap-4">
        {vpsList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay VPS configurados</h3>
            <p className="text-gray-600 mb-4">Agrega tu primer VPS para comenzar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Agregar VPS
            </button>
          </div>
        ) : (
          vpsList.map((vps) => {
            const statusInfo = getStatusColor(vps.status);
            const StatusIcon = statusInfo.icon;

            return (
              <div
                key={vps.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Nombre y estado */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Server className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{vps.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                            {vps.host}:{vps.port}
                          </code>
                        </div>
                      </div>
                    </div>

                    {/* Información */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 ${statusInfo.bg} ${statusInfo.text} rounded-full text-xs font-medium`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {vps.status}
                        </span>
                      </div>

                      {vps.location && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Ubicación
                          </p>
                          <p className="text-sm font-medium text-gray-900">{vps.location}</p>
                        </div>
                      )}

                      {vps.provider && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                            Proveedor
                          </p>
                          <p className="text-sm font-medium text-gray-900">{vps.provider}</p>
                        </div>
                      )}

                      {vps.version && (
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Versión</p>
                          <p className="text-sm font-medium text-gray-900">{vps.version}</p>
                        </div>
                      )}
                    </div>

                    {/* Estadísticas */}
                    {vps._count && (
                      <div className="flex gap-4 text-sm">
                        <span className="text-gray-600">
                          👥 {vps._count.sshUsers} usuario{vps._count.sshUsers !== 1 ? 's' : ''}
                        </span>
                        <span className="text-gray-600">
                          🔌 {vps._count.connections} conexión
                          {vps._count.connections !== 1 ? 'es' : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleDelete(vps)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                      title="Eliminar VPS"
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

      {/* Modal: Crear VPS */}
      {showCreateModal && (
        <CreateVPSModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          authMethod={authMethod}
          setAuthMethod={setAuthMethod}
        />
      )}
    </div>
  );
}

// Componente: Modal Crear VPS
function CreateVPSModal({
  onClose,
  onSubmit,
  isLoading,
  authMethod,
  setAuthMethod,
}: {
  onClose: () => void;
  onSubmit: (data: CreateVPSPayload) => void;
  isLoading: boolean;
  authMethod: 'password' | 'privateKey';
  setAuthMethod: (method: 'password' | 'privateKey') => void;
}) {
  const [formData, setFormData] = useState<CreateVPSPayload & { skipValidation?: boolean }>({
    name: '',
    host: '',
    port: 22,
    username: 'root',
    password: '',
    privateKey: '',
    location: '',
    provider: '',
    skipValidation: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que tenga password O privateKey
    if (!formData.password && !formData.privateKey) {
      alert('Debes proporcionar un password o una clave privada SSH');
      return;
    }

    // Enviar solo el método de autenticación seleccionado
    const payload: CreateVPSPayload & { skipValidation?: boolean } = {
      name: formData.name,
      host: formData.host,
      port: formData.port,
      username: formData.username,
      location: formData.location || undefined,
      provider: formData.provider || undefined,
      skipValidation: formData.skipValidation,
    };

    if (authMethod === 'password') {
      payload.password = formData.password;
    } else {
      payload.privateKey = formData.privateKey;
    }

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Agregar Nuevo VPS</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del VPS *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="VPS Miami Principal"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Host (IP o Dominio) *
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="192.168.1.100 o vps.example.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Puerto SSH *</label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                required
                min={1}
                max={65535}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuario SSH *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Método de autenticación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Método de Autenticación SSH *
            </label>
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setAuthMethod('password')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  authMethod === 'password'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Lock className="w-5 h-5" />
                Password
              </button>
              <button
                type="button"
                onClick={() => setAuthMethod('privateKey')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 rounded-lg transition-colors ${
                  authMethod === 'privateKey'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Key className="w-5 h-5" />
                Clave Privada
              </button>
            </div>

            {authMethod === 'password' ? (
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Password SSH"
              />
            ) : (
              <textarea
                value={formData.privateKey}
                onChange={(e) => setFormData({ ...formData, privateKey: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;MIIEpAIBAAKCAQEA...&#10;-----END RSA PRIVATE KEY-----"
              />
            )}
          </div>

          {/* Información opcional */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación (Opcional)
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Miami, FL"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proveedor (Opcional)
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="DigitalOcean, AWS, etc."
              />
            </div>
          </div>

          {/* Opciones avanzadas */}
          <div className="border-t border-gray-200 pt-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.skipValidation}
                onChange={(e) =>
                  setFormData({ ...formData, skipValidation: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Omitir validación SSH (Avanzado)
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Permite agregar el VPS sin validar la conexión SSH. Útil si el VPS está
                  temporalmente inaccesible o si quieres configurarlo más tarde.
                </p>
              </div>
            </label>
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
              {isLoading ? 'Agregando...' : 'Agregar VPS'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <strong>Nota:</strong> {formData.skipValidation
            ? 'La validación SSH está deshabilitada. El VPS se agregará sin verificar la conexión.'
            : 'El sistema verificará la conexión SSH antes de agregar el VPS. Asegúrate de que las credenciales sean correctas.'}
        </div>
      </div>
    </div>
  );
}
