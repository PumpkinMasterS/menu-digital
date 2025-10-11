import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from 'react-query';
import { Search, Eye, Edit, UserPlus, DollarSign, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const queryClient = useQueryClient();

  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [balanceForm, setBalanceForm] = useState({ amount: '', type: 'credit', reason: '', description: '' });

  const { data: users, isLoading, error } = useQuery(
    ['users', currentPage, searchTerm, limit],
    () => api.get(`/admin/users?page=${currentPage}&limit=${limit}&search=${searchTerm}`).then(res => res.data),
    {
      keepPreviousData: true,
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const formatCurrency = (value) => {
    const num = Number(value || 0);
    return `€ ${num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatId = (id) => {
    if (!id) return '';
    const s = String(id);
    if (s.length <= 12) return s;
    return `${s.slice(0, 8)}…${s.slice(-4)}`;
  };

  const openBalanceModal = (user) => {
    setSelectedUser(user);
    setBalanceForm({ amount: '', type: 'credit', reason: '', description: '' });
    setIsBalanceModalOpen(true);
  };

  const closeBalanceModal = () => {
    setIsBalanceModalOpen(false);
    setSelectedUser(null);
  };

  const handleBalanceChange = (e) => {
    const { name, value } = e.target;
    setBalanceForm((prev) => ({ ...prev, [name]: value }));
  };

  // Acessibilidade do modal: foco inicial e tecla Esc para fechar
  const amountInputRef = useRef(null);
  useEffect(() => {
    if (isBalanceModalOpen) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          closeBalanceModal();
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', onKeyDown);
      };
    }
  }, [isBalanceModalOpen]);

  const submitBalanceUpdate = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const amount = parseFloat(balanceForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Informe um valor válido maior que zero');
      return;
    }
    if (!balanceForm.reason) {
      toast.error('Informe um motivo para o ajuste');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        amount,
        type: balanceForm.type,
        reason: balanceForm.reason,
        description: balanceForm.description
      };
      const response = await api.post(`/admin/users/${selectedUser._id}/balance`, payload);
      toast.success(response.data?.message || 'Saldo atualizado com sucesso');
      await queryClient.invalidateQueries('users');
      closeBalanceModal();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao ajustar saldo';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="users-page">
        <h1>Gerenciamento de Usuários</h1>
        <div className="loading">Carregando usuários...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="users-page">
        <h1>Gerenciamento de Usuários</h1>
        <div className="error">Erro ao carregar usuários: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Gerenciamento de Usuários</h1>
        <Link to="/users/new" className="btn btn-primary">
          <UserPlus size={16} />
          Novo Usuário
        </Link>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Buscar usuários..."
          value={searchTerm}
          onChange={handleSearch}
        />
        <div className="limit-select">
          <label htmlFor="limit">Exibir</label>
          <select
            id="limit"
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setCurrentPage(1); }}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span>por página</span>
        </div>
      </div>

      <div className="table-info">
        Total de usuários: {users?.total ?? 0}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Saldo</th>
              <th>Status</th>
              <th>Data de Cadastro</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users?.users?.map((user) => (
              <tr key={user._id}>
                <td>{formatId(user._id)}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{formatCurrency(user.balance)}</td>
                <td>
                  <span className={`badge ${(user.status === 'active' || user.isActive) ? 'badge-success' : 'badge-danger'}`}>
                    {(user.status === 'active' || user.isActive) ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="actions">
                    <Link to={`/users/${user._id}`} className="btn btn-sm btn-info">
                      <Eye size={14} />
                    </Link>
                    <Link to={`/users/${user._id}/edit`} className="btn btn-sm btn-warning">
                      <Edit size={14} />
                    </Link>
                    <button onClick={() => openBalanceModal(user)} className="btn btn-sm btn-success" title="Editar Saldo">
                      <DollarSign size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users?.totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-sm"
          >
            Anterior
          </button>
          <span className="page-info">
            Página {currentPage} de {users.totalPages} — mostrando {users?.users?.length ?? 0} de {users?.total ?? 0}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, users.totalPages))}
            disabled={currentPage === users.totalPages}
            className="btn btn-sm"
          >
            Próxima
          </button>
        </div>
      )}
      {isBalanceModalOpen && (
        <div className="modal-overlay" onClick={closeBalanceModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <h3 id="modal-title">Editar Saldo</h3>
              <button className="btn btn-sm btn-danger" onClick={closeBalanceModal} aria-label="Fechar">
                <X size={14} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Usuário</label>
                <div className="form-control" style={{ background: '#f8fafc' }}>
                  {selectedUser?.name} — {selectedUser?.email}
                </div>
              </div>

              <form onSubmit={submitBalanceUpdate}>
                <div className="form-group">
                  <label className="form-label" htmlFor="amount">Valor</label>
                  <input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={balanceForm.amount}
                    onChange={handleBalanceChange}
                    placeholder="Ex: 100.00"
                    ref={amountInputRef}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="type">Tipo</label>
                  <select
                    id="type"
                    name="type"
                    className="form-control"
                    value={balanceForm.type}
                    onChange={handleBalanceChange}
                    required
                  >
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="reason">Motivo</label>
                  <input
                    id="reason"
                    name="reason"
                    type="text"
                    className="form-control"
                    value={balanceForm.reason}
                    onChange={handleBalanceChange}
                    placeholder="Ex: Ajuste manual, bônus, correção"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="description">Descrição (opcional)</label>
                  <textarea
                    id="description"
                    name="description"
                    className="form-control"
                    rows={3}
                    value={balanceForm.description}
                    onChange={handleBalanceChange}
                    placeholder="Detalhes adicionais sobre o ajuste"
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-sm" onClick={closeBalanceModal} disabled={submitting}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Salvar Ajuste'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;