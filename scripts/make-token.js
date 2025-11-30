import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const token = jwt.sign({ id: 5, username: 'liuliu', email: '2310364@mail.nankai.edu.cn', role: 'user' }, secret, { expiresIn: '7d', issuer: 'ssr-blog', audience: 'user' });
console.log(token);
