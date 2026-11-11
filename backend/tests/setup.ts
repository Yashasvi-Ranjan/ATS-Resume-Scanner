import dotenv from 'dotenv';
import path from 'path';

// Force load .env.test before any test execution
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
process.env.NODE_ENV = 'test';

import prisma from '../src/config/prisma';

beforeAll(async () => {
  // Ensure DB connection is active
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
