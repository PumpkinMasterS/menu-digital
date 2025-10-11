import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const UploadWidget = ({ onUploadSuccess, label = 'Upload', className = 'btn btn-outline' }) => {
  const { token } = useAuth()
  const cloudinaryRef = useRef()
  const widgetRef = useRef()
  const fileInputRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const enableCloudinary = import.meta.env.VITE_CLOUDINARY_ENABLED === 'true'

  useEffect(() => {
    if (!enableCloudinary) return
    if (!window.cloudinary) return

    cloudinaryRef.current = window.cloudinary
    widgetRef.current = cloudinaryRef.current.createUploadWidget(
      {
        cloudName: 'drurqeytn',
        uploadPreset: 'ml_default',
      },
      function (error, result) {
        if (!error && result && result.event === 'success') {
          const info = result.info
          if (onUploadSuccess) onUploadSuccess(info)
        }
      }
    )
  }, [onUploadSuccess, enableCloudinary])

  const handleClick = () => {
    if (enableCloudinary && widgetRef.current) {
      widgetRef.current.open()
    } else if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleLocalFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const form = new FormData()
    // Backend espera o campo 'photos' (smartUpload)
    form.append('photos', file)

    try {
      setUploading(true)
      const { data } = await axios.post('/api/upload', form, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const url = data?.url
      if (url && onUploadSuccess) {
        // Normalizar para compatibilidade com handleAvatarUploaded (usa secure_url ou url)
        onUploadSuccess({ url, secure_url: url })
      }
    } catch (err) {
      console.error('Falha no upload local', err)
      alert('Falha no upload. Tente novamente.')
    } finally {
      setUploading(false)
      // limpar o input para permitir re-selecionar o mesmo arquivo depois
      if (e.target) e.target.value = ''
    }
  }

  return (
    <>
      <button className={className} onClick={handleClick} disabled={uploading}>
        {uploading ? 'A enviar...' : label}
      </button>
      {/* Fallback local: input de ficheiro oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleLocalFileChange}
        style={{ display: 'none' }}
      />
    </>
  )
}

export default UploadWidget