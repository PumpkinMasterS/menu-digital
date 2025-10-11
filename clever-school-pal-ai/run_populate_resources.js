import dotenv from 'dotenv';
import { popularRecursosEducacionais } from './populate_educational_resources.js';

// Carregar variáveis de ambiente
dotenv.config();

// Definir VITE_SUPABASE_URL a partir de SUPABASE_URL
process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;

// Executar a função
popularRecursosEducacionais().catch(console.error);