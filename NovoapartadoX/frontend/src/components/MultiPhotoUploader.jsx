import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

function MultiPhotoUploader({ modelId, onUploaded }) {
  const { token } = useAuth()
  const [items, setItems] = useState([]) // { id, file, preview, status, progress, error }
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    // cleanup previews on unmount
    return () => {
      items.forEach(i => i.preview && URL.revokeObjectURL(i.preview))
    }
  }, [items])

  const addFiles = (files) => {
    const mapped = Array.from(files).slice(0, 20).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      error: null,
    }))
    setItems((prev) => [...prev, ...mapped].slice(0, 20))
  }

  const onSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files)
      // reset input so selecting the same files again triggers onChange
      e.target.value = ''
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
      e.dataTransfer.clearData()
    }
  }

  const onDragOver = (e) => {
    e.preventDefault()
  }

  const removeItem = (id) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      const removed = prev.find((i) => i.id === id)
      if (removed?.preview) URL.revokeObjectURL(removed.preview)
      return next
    })
  }

  const clearAll = () => {
    setItems((prev) => {
      prev.forEach((i) => i.preview && URL.revokeObjectURL(i.preview))
      return []
    })
  }

  const uploadAll = async () => {
    if (!modelId || items.length === 0 || uploading) return
    setUploading(true)
    // mark all pending as uploading
    setItems((prev) => prev.map((i) => ({ ...i, status: 'uploading', progress: 0, error: null })))

    const form = new FormData()
    items.forEach((i) => form.append('photos', i.file))

    console.log('Iniciando upload para o modelo:', modelId)
    console.log('Número de arquivos:', items.length)

    try {
      const response = await axios.post(`/api/admin/models/${modelId}/photos`, form, {
        headers: { Authorization: `Bearer ${token}` },
        onUploadProgress: (evt) => {
          const total = evt.total || 0
          const loaded = evt.loaded || 0
          const pct = total > 0 ? Math.round((loaded / total) * 100) : 0
          setItems((prev) => prev.map((i) => ({ ...i, progress: pct })))
        },
      })
      console.log('Resposta do upload:', response.data)
      // mark all as done
      setItems((prev) => prev.map((i) => ({ ...i, status: 'done', progress: 100 })))
      if (typeof onUploaded === 'function') onUploaded()
    } catch (err) {
      console.error('Erro no upload:', err)
      const message = err?.response?.data?.error || err?.message || 'Falha no upload'
      setItems((prev) => prev.map((i) => ({ ...i, status: 'error', error: message })))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ border: '1px dashed #ccc', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        style={{
          padding: 16,
          borderRadius: 8,
          background: '#fafafa',
          textAlign: 'center',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
        aria-label="Zona de drop para fotos"
      >
        <p style={{ margin: 0 }}>
          Arraste e largue fotos aqui ou clique para selecionar
        </p>
        <small style={{ color: '#666' }}>Até 20 imagens por carregamento</small>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={onSelect}
        style={{ display: 'none' }}
      />

      {items.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {items.map((i) => (
              <div key={i.id} style={{ width: 120 }}>
                <div style={{ position: 'relative' }}>
                  <img
                    src={i.preview}
                    alt={i.file.name}
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }}
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i.id)}
                    disabled={uploading}
                    title="Remover"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      border: 'none',
                      background: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      borderRadius: 4,
                      padding: '2px 6px',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
                <div style={{ marginTop: 4 }}>
                  <div style={{ height: 6, background: '#eee', borderRadius: 4 }}>
                    <div
                      style={{
                        width: `${i.progress}%`,
                        height: 6,
                        background: i.status === 'error' ? '#dc3545' : '#2E6CF6',
                        borderRadius: 4,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                  <small style={{ color: i.status === 'error' ? '#dc3545' : '#666' }}>
                    {i.status === 'pending' && 'Pendente'}
                    {i.status === 'uploading' && `A enviar… ${i.progress}%`}
                    {i.status === 'done' && 'Concluído'}
                    {i.status === 'error' && (i.error || 'Erro')}
                  </small>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={uploadAll} disabled={uploading}>
              {uploading ? 'A enviar…' : 'Enviar'}
            </button>
            <button className="btn btn-outline" onClick={clearAll} disabled={uploading}>
              Limpar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiPhotoUploader