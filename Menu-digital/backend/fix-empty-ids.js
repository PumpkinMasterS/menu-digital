const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

async function fixEmptyIds() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://whiswher_db_user:KgvXln6lckWmgGgB@cluster0.nrsrh8h.mongodb.net/menu_digital?retryWrites=true&w=majority&appName=Cluster0';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Conectado ao MongoDB');
    
    const database = client.db();
    const products = database.collection('products');
    
    // Encontrar produtos com ID vazio
    const emptyIdProducts = await products.find({ id: '' }).toArray();
    console.log(`Encontrados ${emptyIdProducts.length} produtos com ID vazio`);
    
    // Atualizar cada produto com um novo ID
    for (const product of emptyIdProducts) {
      const newId = new ObjectId().toHexString();
      await products.updateOne(
        { _id: product._id },
        { $set: { id: newId, updatedAt: new Date().toISOString() } }
      );
      console.log(`Produto "${product.name}" atualizado com ID: ${newId}`);
    }
    
    console.log('Correção concluída!');
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await client.close();
  }
}

fixEmptyIds();








