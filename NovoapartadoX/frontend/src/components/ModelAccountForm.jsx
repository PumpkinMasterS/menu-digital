import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './ModelAccountForm.css';

function ModelAccountForm() {
  const { token } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [createdEmail, setCreatedEmail] = useState('')
  const [createdUserId, setCreatedUserId] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [showModal, setShowModal] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    try {
      const res = await axios.post('/api/admin/users', { name, email }, { headers: { Authorization: `Bearer ${token}` } })
      const pwd = res.data?.generatedPassword || ''
      setGeneratedPassword(pwd)
      setCreatedEmail(res.data?.email || email)
      setCreatedUserId(res.data?._id || res.data?.id || '')
      setShowModal(!!pwd)
      setName(''); setEmail('')
    } catch(e) {
      setErrorMessage(e?.response?.data?.error || 'Falha ao criar conta')
    } finally { setLoading(false) }
  }

  function closeModal() {
    setShowModal(false)
    setGeneratedPassword('')
  }

  function copyToClipboard() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generatedPassword).catch(() => {})
    }
  }

  function mailtoHref() {
    const subject = encodeURIComponent('Conta criada no NovoapartadoX')
    const body = encodeURIComponent(
      `Olá,
\nA sua conta foi criada.
\nEmail: ${createdEmail}
Password inicial: ${generatedPassword}
\nPor favor altere a password no primeiro login.`
    )
    return `mailto:${createdEmail}?subject=${subject}&body=${body}`
  }

  return (
    <div className="model-account-form">
      <div className="form-header">
        <h3>Criar Nova Modelo</h3>
        <p>Preencha os dados para criar uma conta de modelo</p>
      </div>

      <form onSubmit={submit} className="account-form">
        <div className="form-group">
          <label>Nome completo</label>
          <input 
            value={name} 
            onChange={e=>setName(e.target.value)} 
            placeholder="Digite o nome da modelo" 
            required 
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input 
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            placeholder="email@exemplo.com" 
            type="email" 
            required 
          />
        </div>

        <button className="btn btn-primary btn-lg" disabled={loading} style={{width: '100%', marginTop: 'var(--spacing-md)'}}>
          {loading ? (
            <>
              <div className="btn-spinner"></div>
              Criando conta...
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Criar Conta
            </>
          )}
        </button>
      </form>

      {errorMessage && (
        <div className="form-error">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          {errorMessage}
        </div>
      )}

      {showModal && (
        <div className="credentials-modal-overlay" onClick={closeModal}>
          <div className="credentials-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon-success">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>

            <h3>Conta criada com sucesso!</h3>
            <div className="modal-warning">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              Atenção: esta password só será exibida uma vez. Guarde-a com segurança.
            </div>

            <div className="credentials-box">
              <div className="credential-item">
                <span className="credential-label">Email</span>
                <code className="credential-value">{createdEmail}</code>
              </div>
              <div className="credential-item">
                <span className="credential-label">Password Inicial</span>
                <div className="credential-password">
                  <code className="credential-value">{generatedPassword}</code>
                  <button
                    type="button"
                    className="btn btn-icon btn-sm"
                    onClick={copyToClipboard}
                    title="Copiar password"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <a
                href={mailtoHref()}
                className="btn btn-primary"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                </svg>
                Enviar por Email
              </a>
              <button
                type="button"
                className="btn btn-outline"
                onClick={closeModal}
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModelAccountForm;
