const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');

const multer = require('multer');
const csv = require('csv-parser');
const { Readable } = require('stream');

// Use memory storage so we don't have to save temp files
const upload = multer({ storage: multer.memoryStorage() });

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

// POST /api/assets/import-csv
// Endpoint to upload and parse a CSV file
router.post('/import-csv', authenticateToken, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const stream = Readable.from(req.file.buffer);

    // Read the CSV file
    stream
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            let importedCount = 0;
            let updatedCount = 0;
            let failedCount = 0;

            try {
                // 1. Fetch all definitions to match the "Definition" column by name
                const definitions = await prisma.definition.findMany();
                const definitionMap = {};
                definitions.forEach(def => {
                    definitionMap[def.name.toLowerCase()] = def.id;
                });

                // 2. Loop through each row in the CSV
                for (const row of results) {
                    try {
                        const defName = (row.Definition || '').trim().toLowerCase();
                        const definitionId = definitionMap[defName];

                        if (!definitionId) {
                            console.warn(`Skipping row: Definition '${row.Definition}' not found in database.`);
                            failedCount++;
                            continue;
                        }

                        // Extract standard columns
                        const name = row.Name || 'Unnamed Asset';
                        const status = row.Status || 'active';
                        const description = row.Description || '';
                        const tags = row.Tags ? row.Tags.split(',').map(t => t.trim()) : [];

                        // 3. Extract dynamic fields 
                        const fieldValues = {};
                        for (const key in row) {
                            if (!['Name', 'Definition', 'Status', 'Description', 'Tags'].includes(key) && row[key] !== '') {
                                let val = row[key];

                                // Auto-detect data types
                                if (!isNaN(val) && val.trim() !== '') {
                                    val = Number(val); // Convert to Number
                                } else if (val.toLowerCase() === 'true') {
                                    val = true; // Convert to Boolean
                                } else if (val.toLowerCase() === 'false') {
                                    val = false; // Convert to Boolean
                                }

                                fieldValues[key] = val;
                            }
                        }

                        const existingAsset = await prisma.asset.findFirst({
                            where: {
                                name: name,
                                definitionId: definitionId
                            }
                        });

                        if (existingAsset) {
                            // UPDATE the existing asset
                            await prisma.asset.update({
                                where: { id: existingAsset.id },
                                data: { status, description, tags, fieldValues }
                            });
                            updatedCount++;
                        } else {
                            // CREATE a brand new asset
                            await prisma.asset.create({
                                data: { name, definitionId, status, description, tags, fieldValues }
                            });
                            importedCount++;
                        }
                    } catch (itemError) {
                        console.error('Error importing row:', itemError);
                        failedCount++;
                    }
                }

                res.status(200).json({
                    message: 'CSV import completed',
                    importedCount,
                    failedCount,
                    totalRows: results.length
                });
            } catch (error) {
                console.error('Import process error:', error);
                res.status(500).json({ error: 'Failed to process CSV data' });
            }
        });
});

module.exports = router;
