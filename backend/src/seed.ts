import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/menu_digital';

async function seed() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    const categoriesCol = db.collection('categories');
    const productsCol = db.collection('products');
    const modifiersCol = db.collection('modifiers');
    const variantsCol = db.collection('variants');
    
    const existingCategories = await categoriesCol.countDocuments();
    if (existingCategories > 0) {
      console.log('Database already has data. Skipping seed.');
      return;
    }
    
    console.log('Seeding categories...');
    const now = new Date().toISOString();
    
    const burgersCatId = new ObjectId().toHexString();
    const drinksCatId = new ObjectId().toHexString();
    const sidesCatId = new ObjectId().toHexString();
    const dessertsCatId = new ObjectId().toHexString();
    
    await categoriesCol.insertMany([
      {
        id: burgersCatId,
        name: 'Hambúrgueres',
        description: 'Hambúrgueres artesanais',
        order: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: drinksCatId,
        name: 'Bebidas',
        description: 'Bebidas frias e quentes',
        order: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: sidesCatId,
        name: 'Acompanhamentos',
        description: 'Batatas, anéis de cebola e mais',
        order: 3,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: dessertsCatId,
        name: 'Sobremesas',
        description: 'Doces e gelados',
        order: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    
    console.log('Seeding modifier groups...');
    const extrasGroupId = new ObjectId().toHexString();
    await modifiersCol.insertOne({
      id: extrasGroupId,
      name: 'Extras',
      description: 'Adicione extras ao seu hambúrguer',
      type: 'extra',
      isActive: true,
      selection: { type: 'multiple', required: false, min: 0, max: 10 },
      options: [
        { id: new ObjectId().toHexString(), label: 'Bacon', priceDelta: 1.5, isDefault: false, isAvailable: true },
        { id: new ObjectId().toHexString(), label: 'Queijo extra', priceDelta: 1.0, isDefault: false, isAvailable: true },
        { id: new ObjectId().toHexString(), label: 'Ovo', priceDelta: 1.0, isDefault: false, isAvailable: true },
        { id: new ObjectId().toHexString(), label: 'Cogumelos', priceDelta: 1.5, isDefault: false, isAvailable: true },
      ],
      createdAt: now,
      updatedAt: now,
    });
    
    console.log('Seeding variant groups...');
    const drinksVariantId = new ObjectId().toHexString();
    await variantsCol.insertOne({
      id: drinksVariantId,
      name: 'Tamanhos de Bebida',
      description: 'Escolha o tamanho',
      isActive: true,
      options: [
        { id: new ObjectId().toHexString(), label: 'Pequeno (300ml)', priceDelta: 0, isDefault: true },
        { id: new ObjectId().toHexString(), label: 'Médio (500ml)', priceDelta: 0.5, isDefault: false },
        { id: new ObjectId().toHexString(), label: 'Grande (700ml)', priceDelta: 1.0, isDefault: false },
      ],
      createdAt: now,
      updatedAt: now,
    });
    
    console.log('Seeding products...');
    await productsCol.insertMany([
      {
        id: new ObjectId().toHexString(),
        categoryId: burgersCatId,
        name: 'Classic Burger',
        description: 'Hambúrguer clássico com alface, tomate e molho especial',
        price: 7.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        composition: {
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: [extrasGroupId],
          variantGroupIds: [],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: burgersCatId,
        name: 'Cheese Burger',
        description: 'Hambúrguer com queijo cheddar derretido',
        price: 8.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        composition: {
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: [extrasGroupId],
          variantGroupIds: [],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: burgersCatId,
        name: 'Bacon Burger',
        description: 'Hambúrguer com bacon crocante e molho barbecue',
        price: 9.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        composition: {
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: [extrasGroupId],
          variantGroupIds: [],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: drinksCatId,
        name: 'Coca-Cola',
        description: 'Refrigerante',
        price: 2.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        composition: {
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: [],
          variantGroupIds: [drinksVariantId],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: drinksCatId,
        name: 'Sumo de Laranja',
        description: 'Sumo natural de laranja',
        price: 3.0,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        composition: {
          pricingStrategy: 'base_plus_modifiers',
          modifierGroupIds: [],
          variantGroupIds: [drinksVariantId],
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: sidesCatId,
        name: 'Batatas Fritas',
        description: 'Batatas fritas crocantes',
        price: 3.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: sidesCatId,
        name: 'Anéis de Cebola',
        description: 'Anéis de cebola empanados',
        price: 4.0,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: new ObjectId().toHexString(),
        categoryId: dessertsCatId,
        name: 'Gelado de Chocolate',
        description: 'Gelado artesanal de chocolate',
        price: 3.5,
        stockQuantity: -1,
        imageUrl: '',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    
    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Seed error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

seed().catch(console.error);

