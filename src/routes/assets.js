const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');

// Get all assets (optional filter by definitionId or status)
router.get('/', authenticateToken, async (req, res) => {
    const { definitionId, status } = req.query;
    const where = {};
    if (definitionId) where.definitionId = definitionId;
    if (status) where.status = status;

    try {
        const assets = await prisma.asset.findMany({ where });
        res.json(assets);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch assets' });
    }
});

// Get single asset
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const asset = await prisma.asset.findUnique({ where: { id } });
        if (!asset) return res.status(404).json({ error: 'Asset not found' });
        res.json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch asset' });
    }
});

// Create asset
router.post('/', authenticateToken, async (req, res) => {
    const { name, definitionId, status, tags, description, fieldValues } = req.body;
    try {
        const asset = await prisma.asset.create({
            data: { name, definitionId, status, tags, description, fieldValues },
        });
        res.status(201).json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create asset' });
    }
});

// Update asset
router.put('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, definitionId, status, tags, description, fieldValues } = req.body;
    try {
        const asset = await prisma.asset.update({
            where: { id },
            data: { name, definitionId, status, tags, description, fieldValues },
        });
        res.json(asset);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update asset' });
    }
});

// Delete asset
router.delete('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.asset.delete({ where: { id } });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete asset' });
    }
});

module.exports = router;
