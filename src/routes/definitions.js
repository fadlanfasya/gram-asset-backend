const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');

// Get all definitions
router.get('/', authenticateToken, async (req, res) => {
    try {
        const definitions = await prisma.definition.findMany();
        res.json(definitions);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch definitions' });
    }
});

// Create definition
router.post('/', authenticateToken, async (req, res) => {
    const { name, description, icon, color, fields } = req.body;
    try {
        const definition = await prisma.definition.create({
            data: { name, description, icon, color, fields },
        });
        res.status(201).json(definition);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create definition' });
    }
});

// Update definition
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, icon, color, fields } = req.body;
    try {
        const definition = await prisma.definition.update({
            where: { id },
            data: { name, description, icon, color, fields },
        });
        res.json(definition);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update definition' });
    }
});

// Delete definition
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.definition.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete definition' });
    }
});

module.exports = router;
