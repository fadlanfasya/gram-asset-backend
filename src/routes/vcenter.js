const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');
const axios = require('axios');
const https = require('https');

// Create an HTTPS agent that ignores self-signed certificate errors.
// vCenter servers almost always use self-signed certs out of the box, 
// which Node.js will reject by default.
const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// POST /api/vcenter/sync
// Endpoint to pull VMs directly from vCenter
router.post('/sync', authenticateToken, async (req, res) => {
    const vcenterHost = process.env.VCENTER_HOST;
    const username = process.env.VCENTER_USERNAME;
    const password = process.env.VCENTER_PASSWORD;

    if (!vcenterHost || !username || !password) {
        return res.status(500).json({ error: 'vCenter credentials are not configured in the server environment.' });
    }

    try {
        console.log('1. Authenticating with vCenter...');
        // Encode credentials to Base64 for Basic Auth
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        
        // Note: For vSphere 7.0+, the endpoint is usually /api/session
        // For older versions (6.5, 6.7), it might be /rest/com/vmware/cis/session
        const sessionResponse = await axios.post(`https://${vcenterHost}/api/session`, {}, {
            headers: {
                'Authorization': `Basic ${authString}`
            },
            httpsAgent: httpsAgent
        });

        // The token is returned in the response data
        const sessionId = sessionResponse.data;
        console.log('vCenter authentication successful.');

        console.log('2. Fetching VMs from vCenter...');
        // Now use the Session ID to fetch the VMs
        const vmResponse = await axios.get(`https://${vcenterHost}/api/vcenter/vm`, {
            headers: {
                'vmware-api-session-id': sessionId
            },
            httpsAgent: httpsAgent
        });

        const vms = vmResponse.data; // vCenter returns an array of VM objects
        console.log(`Found ${vms.length} VMs.`);

        console.log('3. Saving to database...');
        const vmDefinition = await prisma.definition.findFirst({
            where: { name: 'Virtual Machine' }
        });

        if (!vmDefinition) {
             return res.status(404).json({ error: 'Virtual Machine definition not found in database.' });
        }

        let importedCount = 0;

        for (const vm of vms) {
            // Check if asset already exists to avoid duplicates (optional but recommended)
            const existingAsset = await prisma.asset.findFirst({
                where: { name: vm.name, definitionId: vmDefinition.id }
            });

            if (!existingAsset) {
                await prisma.asset.create({
                    data: {
                        name: vm.name,
                        definitionId: vmDefinition.id,
                        status: vm.power_state === 'POWERED_ON' ? 'active' : 'inactive', // Map vCenter power state
                        tags: ['vcenter', 'auto-sync'],
                        description: `Imported from vCenter. ID: ${vm.vm}`,
                        fieldValues: {
                            'vCPU': vm.cpu_count || 0,
                            'RAM (GB)': vm.memory_size_MiB ? (vm.memory_size_MiB / 1024) : 0, // Convert MB to GB
                            'Hypervisor': 'VMware vCenter',
                            'Monitored': true 
                        }
                    }
                });
                importedCount++;
            }
        }

        res.status(200).json({
            message: `vCenter sync complete. Imported ${importedCount} new VMs.`,
            totalVMsInVcenter: vms.length,
            newlyImported: importedCount
        });

    } catch (error) {
        console.error('vCenter Sync Error:', error.message);
        if (error.response) {
            console.error('vCenter Response Data:', error.response.data);
        }
        res.status(500).json({ error: 'Failed to sync with vCenter. Check server logs.' });
    }
});

module.exports = router;