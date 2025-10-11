import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// Criar uma imagem de teste simples
const createTestImage = () => {
  const width = 100;
  const height = 100;
  const buffer = Buffer.alloc(width * height * 4);
  
  // Preencher com pixels simples (gradiente)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      buffer[index] = Math.floor((x / width) * 255);     // R
      buffer[index + 1] = Math.floor((y / height) * 255); // G
      buffer[index + 2] = 128;                           // B
      buffer[index + 3] = 255;                           // A
    }
  }
  
  fs.writeFileSync('test-image.png', buffer);
  console.log('Imagem de teste criada: test-image.png');
};

// Testar upload
const testUpload = async () => {
  try {
    // Criar imagem de teste
    createTestImage();
    
    // Preparar form data
    const formData = new FormData();
    formData.append('photos', fs.createReadStream('test-image.png'));
    
    // Fazer upload
    console.log('Fazendo upload de teste...');
    const response = await axios.post('http://localhost:4000/api/upload-multiple', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbi1tb2NrIiwicm9sZSI6ImFkbWluIiwiZW1haWwiOiJhZG1pbkBzaXRlLnRlc3QiLCJpYXQiOjE3NTgxNDYxMzYsImV4cCI6MTc1ODc1MDkzNn0.7QvQpQ8X7Z8X7Z8X7Z8X7Z8X7Z8X7Z8X7Z8X7Z8X7Z8'
      }
    });
    
    console.log('✅ Upload bem-sucedido!');
    console.log('Resposta:', response.data);
    
    // Limpar
    fs.unlinkSync('test-image.png');
    
  } catch (error) {
    console.error('❌ Erro no upload:', error.response?.data || error.message);
    // Limpar mesmo em caso de erro
    if (fs.existsSync('test-image.png')) {
      fs.unlinkSync('test-image.png');
    }
  }
};

// Executar teste
testUpload();