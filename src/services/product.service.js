import prisma from '../utils/prisma.js';
import { stringify } from 'csv-stringify/sync';
import { parse } from 'csv-parse/sync';

// ✅ Create Product
export async function createProductService(tenantId, data) {
  return await prisma.product.create({
    data: {
      ...data,
      tenantId,
    },
  });
}

// ✅ Get All Products (with optional filters/pagination)
export async function getProductsService(tenantId, query = {}) {
  const { skip = 0, take = 50, search } = query;

  return await prisma.product.findMany({
    where: {
      tenantId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' },
      }),
    },
    skip: Number(skip),
    take: Number(take),
    orderBy: { createdAt: 'desc' },
  });
}

// ✅ Get Product by ID
export async function getProductByIdService(tenantId, id) {
  return await prisma.product.findFirst({
    where: { id, tenantId },
  });
}

// ✅ Update Product
export async function updateProductService(tenantId, id, data) {
  return await prisma.product.updateMany({
    where: { id, tenantId },
    data,
  });
}

// ✅ Delete Product
export async function deleteProductService(tenantId, id) {
  return await prisma.product.deleteMany({
    where: { id, tenantId },
  });
}

// ✅ Export Products to CSV
export async function exportProductsToCSVService(tenantId) {
  const products = await prisma.product.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  const plainProducts = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    stock: p.stock,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));

  return stringify(plainProducts, {
    header: true,
    columns: [
      { key: 'id', header: 'ID' },
      { key: 'name', header: 'Name' },
      { key: 'description', header: 'Description' },
      { key: 'price', header: 'Price' },
      { key: 'stock', header: 'Stock' },
      { key: 'createdAt', header: 'Created At' },
      { key: 'updatedAt', header: 'Updated At' },
    ],
  });
}

// ✅ Bulk Import Products from CSV
export async function bulkImportProductsService(tenantId, fileBuffer) {
  const records = parse(fileBuffer.toString(), {
    columns: true,
    skip_empty_lines: true,
  });

  const created = [];
  for (const record of records) {
    const product = await prisma.product.create({
      data: {
        name: record.name,
        description: record.description || '',
        price: parseFloat(record.price) || 0,
        stock: parseInt(record.stock) || 0,
        tenantId,
      },
    });
    created.push(product);
  }

  return created;
}
