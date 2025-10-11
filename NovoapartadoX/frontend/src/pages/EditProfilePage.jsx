import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

function EditProfilePage() {
  const { user, token, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const userId = user.id || user._id;
      const response = await axios.patch(
        `/api/users/${userId}`,
        { name: formData.name, email: formData.email },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data?.user) {
        setUser(response.data.user); // Atualiza o usuário no contexto
      }
      setMessage('Perfil atualizado com sucesso!');
    } catch (error) {
      setMessage('Erro ao atualizar o perfil: ' + (error.response?.data?.message || error.message));
    }
  };

  if (!user) {
    return <p>A carregar...</p>;
  }

  return (
    <div className="edit-profile-page">
      <h1>Editar Perfil</h1>
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label htmlFor="name">Nome</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
        <button type="submit" className="btn-submit">Guardar Alterações</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default EditProfilePage;