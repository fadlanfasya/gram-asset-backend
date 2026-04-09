const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');

// Get relationships (by asset ID or all)
router.get('/', authenticateToken, async (req, res) => {
    const { assetId } = req.query;
    const where = {};
    if (assetId) {
        where.OR = [
            { sourceId: assetId },
            { targetId: assetId }
        ];
    }

    try {
        const relationships = await prisma.relationship.findMany({ where });
        res.json(relationships);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch relationships' });
    }
});

// Create relationship
router.post('/', authenticateToken, async (req, res) => {
    const { sourceId, targetId, type, label } = req.body;
    try {
        const relationship = await prisma.relationship.create({
            data: { sourceId, targetId, type, label },
        });
        res.status(201).json(relationship);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create relationship' });
    }
});

// Delete relationship
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.relationship.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete relationship' });
    }
});

module.exports = router;
