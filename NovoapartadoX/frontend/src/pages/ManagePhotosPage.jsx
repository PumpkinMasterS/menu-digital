import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UploadWidget from '../components/UploadWidget';
import { useAuth } from '../contexts/AuthContext';

const ManagePhotosPage = () => {
  const [photos, setPhotos] = useState([]);
  const { token } = useAuth();

  useEffect(() => {
    // Fetch existing photos from the backend
    axios.get('/api/photos', { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setPhotos(response.data);
      })
      .catch(error => {
        console.error('Error fetching photos:', error);
      });
  }, [token]);

  const handleUploadSuccess = (result) => {
    const newPhoto = { url: result.secure_url, public_id: result.public_id };
    // Optionally, save the new photo info to the backend right away
    axios.post('/api/photos', newPhoto, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => {
        setPhotos(prevPhotos => [...prevPhotos, response.data]);
      })
      .catch(error => {
        console.error('Error saving photo:', error);
      });
  };

  const handleDelete = (public_id) => {
    axios.delete(`/api/photos/${public_id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(() => {
        setPhotos(prevPhotos => prevPhotos.filter(photo => photo.public_id !== public_id));
      })
      .catch(error => {
        console.error('Error deleting photo:', error);
      });
  };

  return (
    <div>
      <h1>Gerir Fotos</h1>
      <p>Aqui poderá fazer o upload, visualizar e apagar as fotos dos apartamentos.</p>
      <UploadWidget onUploadSuccess={handleUploadSuccess} />
      
      <div className="photos-grid">
        {photos.map(photo => (
          <div key={photo.public_id} className="photo-item">
            <img src={photo.url} alt="Apartment" />
            <button onClick={() => handleDelete(photo.public_id)}>Apagar</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ManagePhotosPage;