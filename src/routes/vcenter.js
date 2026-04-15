const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authenticateToken = require('../middleware/authMiddleware');
const axios = require('axios');
const https = require('https');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

router.post('/sync', authenticateToken, async (req, res) => {
    const vcenterHost = process.env.VCENTER_HOST;
    const username = process.env.VCENTER_USERNAME;
    const password = process.env.VCENTER_PASSWORD;

    if (!vcenterHost || !username || !password) {
        return res.status(500).json({ error: 'vCenter credentials missing in .env' });
    }

    try {
        console.log('1. Authenticating with vCenter...');
        const authString = Buffer.from(`${username}:${password}`).toString('base64');
        
        const sessionResponse = await axios.post(`https://${vcenterHost}/api/session`, {}, {
            headers: { 'Authorization': `Basic ${authString}` },
            httpsAgent: httpsAgent
        });

        const sessionId = sessionResponse.data;

        console.log('2. Fetching VMs from vCenter...');
        const vmResponse = await axios.get(`https://${vcenterHost}/api/vcenter/vm`, {
            headers: { 'vmware-api-session-id': sessionId },
            httpsAgent: httpsAgent
        });

        const vms = vmResponse.data;
        console.log(`Found ${vms.length} VMs. Syncing details...`);

        const vmDefinition = await prisma.definition.findFirst({
            where: { name: 'Virtual Machine' }
        });

        if (!vmDefinition) {
             return res.status(404).json({ error: 'Virtual Machine definition not found.' });
        }

        let importedCount = 0;
        let updatedCount = 0;

        for (const vm of vms) {
            let ipAddress = '';
            let os = '';

            if (vm.power_state === 'POWERED_ON') {
                try {
                    const detailResponse = await axios.get(`https://${vcenterHost}/api/vcenter/vm/${vm.vm}/guest/identity`, {
                        headers: { 'vmware-api-session-id': sessionId },
                        httpsAgent: httpsAgent
                    });
                    
                    const guestData = detailResponse.data.value || detailResponse.data;
                    ipAddress = guestData.ip_address || '';
                    
                    // Safely parse the OS
                    if (guestData.full_name) {
                        if (typeof guestData.full_name === 'string') {
                            os = guestData.full_name;
                        } else if (guestData.full_name.default_message) {
                            // Extract the default message
                            os = guestData.full_name.default_message; 
                        } else if (guestData.full_name.name) {
                            os = guestData.full_name.name;
                        } else {
                           os = JSON.stringify(guestData.full_name); 
                        }
                    } else if (guestData.family) {
                         os = typeof guestData.family === 'string' ? guestData.family : JSON.stringify(guestData.family);
                    } else if (guestData.name) {
                         os = typeof guestData.name === 'string' ? guestData.name : JSON.stringify(guestData.name);
                    }

                } catch (detailError) {
                    console.log(`Notice: Could not fetch IP/OS for ${vm.name}. VMware Tools might not be running.`);
                }
            }

            // Define the fields we want to save
            const updatedFieldValues = {
                'vCPU': vm.cpu_count || 0,
                'RAM (GB)': vm.memory_size_MiB ? (vm.memory_size_MiB / 1024) : 0,
                'Hypervisor': 'stlvc02',
                'Monitored': true,
                'IP Address': ipAddress,
                'OS': os
            };

            const existingAsset = await prisma.asset.findFirst({
                where: { name: vm.name, definitionId: vmDefinition.id }
            });

            if (existingAsset) {
                // UPDATE: The VM already exists, let's update it with the new IP/OS
                await prisma.asset.update({
                    where: { id: existingAsset.id },
                    data: {
                        status: vm.power_state === 'POWERED_ON' ? 'active' : 'inactive',
                        fieldValues: {
                            ...(typeof existingAsset.fieldValues === 'object' ? existingAsset.fieldValues : {}), 
                            ...updatedFieldValues // Overwrite with freshly synced vCenter data
                        }
                    }
                });
                updatedCount++;
            } else {
                // CREATE: It's a brand new VM
                await prisma.asset.create({
                    data: {
                        name: vm.name,
                        definitionId: vmDefinition.id,
                        status: vm.power_state === 'POWERED_ON' ? 'active' : 'inactive',
                        tags: ['vcenter', 'auto-sync'],
                        description: `Imported from vCenter. ID: ${vm.vm}`,
                        fieldValues: updatedFieldValues
                    }
                });
                importedCount++;
            }
        }

        res.status(200).json({
            message: `vCenter sync complete. Created ${importedCount} new VMs. Updated ${updatedCount} existing VMs.`,
            totalVMsInVcenter: vms.length,
            newlyImported: importedCount,
            updated: updatedCount
        });

    } catch (error) {
        console.error('vCenter Sync Error:', error.message);
        res.status(500).json({ error: 'Failed to sync with vCenter.' });
    }
});

module.exports = router;