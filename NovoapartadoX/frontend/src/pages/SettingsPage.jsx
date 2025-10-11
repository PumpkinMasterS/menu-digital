import React, { useState } from 'react';

function SettingsPage() {
  const [settings, setSettings] = useState({
    notifications: true,
    theme: 'light',
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prevSettings => ({
      ...prevSettings,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui, você normalmente enviaria as configurações para o backend
    alert('Configurações guardadas: ' + JSON.stringify(settings));
  };

  return (
    <div className="settings-page">
      <h1>Configurações</h1>
      <form onSubmit={handleSubmit} className="settings-form">
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="notifications"
              checked={settings.notifications}
              onChange={handleChange}
            />
            Receber notificações por email
          </label>
        </div>
        <div className="form-group">
          <label htmlFor="theme">Tema</label>
          <select
            id="theme"
            name="theme"
            value={settings.theme}
            onChange={handleChange}
          >
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </select>
        </div>
        <button type="submit" className="btn-submit">Guardar Alterações</button>
      </form>
    </div>
  );
}

export default SettingsPage;