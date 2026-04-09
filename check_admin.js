const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function check() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: 'admin@gram.app' },
        });
        console.log('User found:', user);

        if (user) {
            const match = await bcrypt.compare('admin123', user.passwordHash);
            console.log('Password match:', match);
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

check();
