const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

const seedDefinitions = [
    {
        id: 'def-vm',
        name: 'Virtual Machine',
        description: 'VM instances running on hypervisors',
        icon: 'cloud',
        color: '#3c83f6',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'vCPU', type: 'number', required: true },
            { id: 'f3', name: 'RAM (GB)', type: 'number', required: true },
            { id: 'f4', name: 'OS', type: 'select', required: false, options: ['Ubuntu', 'CentOS', 'Windows Server', 'RHEL', 'Debian'] },
            { id: 'f5', name: 'Hypervisor', type: 'select', required: false, options: ['VMware', 'Proxmox', 'Hyper-V', 'KVM'] },
            { id: 'f6', name: 'Monitored', type: 'boolean', required: false },
        ],
    },
    {
        id: 'def-switch',
        name: 'Network Switch',
        description: 'Layer 2/3 network switches',
        icon: 'dns',
        color: '#06b6d4',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'Port Count', type: 'number', required: true },
            { id: 'f3', name: 'VLAN Support', type: 'boolean', required: false },
            { id: 'f4', name: 'Model', type: 'text', required: false },
            { id: 'f5', name: 'Location', type: 'text', required: false },
        ],
    },
    {
        id: 'def-firewall',
        name: 'Firewall',
        description: 'Network firewalls and security appliances',
        icon: 'security',
        color: '#f59e0b',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'Throughput (Gbps)', type: 'number', required: false },
            { id: 'f3', name: 'Rules Count', type: 'number', required: false },
            { id: 'f4', name: 'Vendor', type: 'select', required: false, options: ['Fortinet', 'Palo Alto', 'pfSense', 'Cisco ASA'] },
            { id: 'f5', name: 'HA Enabled', type: 'boolean', required: false },
        ],
    },
    {
        id: 'def-database',
        name: 'Database',
        description: 'Database servers and instances',
        icon: 'storage',
        color: '#8b5cf6',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'Port', type: 'number', required: true },
            { id: 'f3', name: 'Engine', type: 'select', required: true, options: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQL Server'] },
            { id: 'f4', name: 'Version', type: 'text', required: false },
            { id: 'f5', name: 'Storage (GB)', type: 'number', required: false },
        ],
    },
    {
        id: 'def-router',
        name: 'Router',
        description: 'Network routers',
        icon: 'router',
        color: '#22c55e',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'Protocol', type: 'select', required: false, options: ['BGP', 'OSPF', 'EIGRP', 'Static'] },
            { id: 'f3', name: 'Interfaces', type: 'number', required: false },
            { id: 'f4', name: 'Model', type: 'text', required: false },
        ],
    },
    {
        id: 'def-storage',
        name: 'Storage',
        description: 'NAS, SAN, and storage arrays',
        icon: 'hard_drive',
        color: '#64748b',
        fields: [
            { id: 'f1', name: 'IP Address', type: 'text', required: true },
            { id: 'f2', name: 'Capacity (TB)', type: 'number', required: true },
            { id: 'f3', name: 'RAID Level', type: 'select', required: false, options: ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10'] },
            { id: 'f4', name: 'Protocol', type: 'select', required: false, options: ['NFS', 'SMB', 'iSCSI', 'FC'] },
            { id: 'f5', name: 'Used (%)', type: 'number', required: false },
        ],
    },
    {
        id: 'def-k8s',
        name: 'Kubernetes Cluster',
        description: 'Container orchestration clusters',
        icon: 'terminal',
        color: '#3b82f6',
        fields: [
            { id: 'f1', name: 'API Endpoint', type: 'url', required: true },
            { id: 'f2', name: 'Node Count', type: 'number', required: true },
            { id: 'f3', name: 'Version', type: 'text', required: false },
            { id: 'f4', name: 'CNI Plugin', type: 'select', required: false, options: ['Calico', 'Flannel', 'Cilium', 'WeaveNet'] },
        ],
    },
    {
        id: 'def-cloud',
        name: 'Cloud Infrastructure',
        description: 'Cloud provider resources (AWS, GCP, Azure)',
        icon: 'cloud',
        color: '#ec4899',
        fields: [
            { id: 'f1', name: 'Provider', type: 'select', required: true, options: ['AWS', 'GCP', 'Azure', 'DigitalOcean'] },
            { id: 'f2', name: 'Region', type: 'text', required: true },
            { id: 'f3', name: 'Instance Type', type: 'text', required: false },
            { id: 'f4', name: 'Monthly Cost ($)', type: 'number', required: false },
        ],
    },
];

const seedAssets = [
    {
        id: 'asset-1',
        name: 'AWS-Prod-Node-01',
        definitionId: 'def-cloud',
        status: 'active',
        tags: ['prod', 'aws', 'web'],
        description: 'Primary production application node on AWS',
        fieldValues: { Provider: 'AWS', Region: 'ap-southeast-1', 'Instance Type': 'm5.xlarge', 'Monthly Cost ($)': 180 },
    },
    {
        id: 'asset-2',
        name: 'Core-Switch-L3',
        definitionId: 'def-switch',
        status: 'maintenance',
        tags: ['core', 'network', 'datacenter'],
        description: 'Core Layer 3 switch for datacenter backbone',
        fieldValues: { 'IP Address': '10.0.0.1', 'Port Count': 48, 'VLAN Support': true, Model: 'Cisco Catalyst 9300', Location: 'DC-1 Rack A' },
    },
    {
        id: 'asset-3',
        name: 'K8s-Cluster-Main',
        definitionId: 'def-k8s',
        status: 'active',
        tags: ['prod', 'kubernetes', 'orchestration'],
        description: 'Main Kubernetes cluster for production workloads',
        fieldValues: { 'API Endpoint': 'https://k8s-api.internal:6443', 'Node Count': 12, Version: '1.28.4', 'CNI Plugin': 'Cilium' },
    },
    {
        id: 'asset-4',
        name: 'Legacy-Archive-02',
        definitionId: 'def-storage',
        status: 'decommissioned',
        tags: ['legacy', 'archive', 'storage'],
        description: 'Legacy archive storage server — decommissioned',
        fieldValues: { 'IP Address': '10.0.5.202', 'Capacity (TB)': 24, 'RAID Level': 'RAID 6', Protocol: 'NFS', 'Used (%)': 89 },
    },
    {
        id: 'asset-5',
        name: 'PROD-WEB-01',
        definitionId: 'def-vm',
        status: 'active',
        tags: ['prod', 'web', 'frontend'],
        description: 'Production web server running Nginx + Node.js',
        fieldValues: { 'IP Address': '192.168.1.101', vCPU: 4, 'RAM (GB)': 16, OS: 'Ubuntu', Hypervisor: 'Proxmox', Monitored: true },
    },
    {
        id: 'asset-6',
        name: 'PROD-WEB-02',
        definitionId: 'def-vm',
        status: 'active',
        tags: ['prod', 'web', 'frontend'],
        description: 'Secondary production web server',
        fieldValues: { 'IP Address': '192.168.1.102', vCPU: 4, 'RAM (GB)': 16, OS: 'Ubuntu', Hypervisor: 'Proxmox', Monitored: true },
    },
    {
        id: 'asset-7',
        name: 'DB-MYSQL-01',
        definitionId: 'def-database',
        status: 'active',
        tags: ['prod', 'database', 'mysql'],
        description: 'Primary MySQL database server',
        fieldValues: { 'IP Address': '192.168.1.201', Port: 3306, Engine: 'MySQL', Version: '8.0.35', 'Storage (GB)': 500 },
    },
    {
        id: 'asset-8',
        name: 'DB-POSTGRES-01',
        definitionId: 'def-database',
        status: 'maintenance',
        tags: ['prod', 'database', 'postgres'],
        description: 'PostgreSQL analytics database',
        fieldValues: { 'IP Address': '192.168.1.202', Port: 5432, Engine: 'PostgreSQL', Version: '16.1', 'Storage (GB)': 1000 },
    },
    {
        id: 'asset-9',
        name: 'FW-EDGE-01',
        definitionId: 'def-firewall',
        status: 'active',
        tags: ['edge', 'security', 'firewall'],
        description: 'Edge firewall for external traffic',
        fieldValues: { 'IP Address': '10.0.0.254', 'Throughput (Gbps)': 10, 'Rules Count': 245, Vendor: 'Fortinet', 'HA Enabled': true },
    },
    {
        id: 'asset-10',
        name: 'RTR-WAN-01',
        definitionId: 'def-router',
        status: 'active',
        tags: ['wan', 'router', 'network'],
        description: 'Primary WAN router',
        fieldValues: { 'IP Address': '10.0.0.253', Protocol: 'BGP', Interfaces: 8, Model: 'Cisco ISR 4451' },
    },
    {
        id: 'asset-11',
        name: 'SAN-PROD-01',
        definitionId: 'def-storage',
        status: 'active',
        tags: ['prod', 'storage', 'san'],
        description: 'Production SAN storage array',
        fieldValues: { 'IP Address': '10.0.5.100', 'Capacity (TB)': 100, 'RAID Level': 'RAID 10', Protocol: 'FC', 'Used (%)': 67 },
    },
    {
        id: 'asset-12',
        name: 'NAS-BACKUP-01',
        definitionId: 'def-storage',
        status: 'active',
        tags: ['backup', 'storage', 'nas'],
        description: 'Backup NAS for daily snapshots',
        fieldValues: { 'IP Address': '10.0.5.200', 'Capacity (TB)': 50, 'RAID Level': 'RAID 6', Protocol: 'NFS', 'Used (%)': 42 },
    },
];

const seedRelationships = [
    { id: 'rel-1', sourceId: 'asset-5', targetId: 'asset-2', type: 'connects_to', label: 'Network uplink' },
    { id: 'rel-2', sourceId: 'asset-6', targetId: 'asset-2', type: 'connects_to', label: 'Network uplink' },
    { id: 'rel-3', sourceId: 'asset-5', targetId: 'asset-7', type: 'depends_on', label: 'App database' },
    { id: 'rel-4', sourceId: 'asset-6', targetId: 'asset-7', type: 'depends_on', label: 'App database' },
    { id: 'rel-5', sourceId: 'asset-3', targetId: 'asset-5', type: 'manages', label: 'K8s → VM pods' },
    { id: 'rel-6', sourceId: 'asset-3', targetId: 'asset-6', type: 'manages', label: 'K8s → VM pods' },
    { id: 'rel-7', sourceId: 'asset-9', targetId: 'asset-10', type: 'connects_to', label: 'FW → Router' },
    { id: 'rel-8', sourceId: 'asset-10', targetId: 'asset-2', type: 'connects_to', label: 'WAN → Core Switch' },
    { id: 'rel-9', sourceId: 'asset-12', targetId: 'asset-7', type: 'backs_up', label: 'Daily snapshot' },
    { id: 'rel-10', sourceId: 'asset-12', targetId: 'asset-8', type: 'backs_up', label: 'Daily snapshot' },
    { id: 'rel-11', sourceId: 'asset-1', targetId: 'asset-3', type: 'hosted_on', label: 'Cloud → K8s' },
];

async function main() {
    console.log('Seeding database...');

    // Seed User
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@gram.app' },
        update: {},
        create: {
            email: 'admin@gram.app',
            name: 'Admin User',
            passwordHash: hashedPassword,
            role: 'admin',
        },
    });
    console.log({ user });

    // Seed Definitions
    for (const def of seedDefinitions) {
        await prisma.definition.upsert({
            where: { id: def.id },
            update: {},
            create: def,
        });
    }
    console.log('Definitions seeded.');

    // Seed Assets
    for (const asset of seedAssets) {
        await prisma.asset.upsert({
            where: { id: asset.id },
            update: {},
            create: asset,
        });
    }
    console.log('Assets seeded.');

    // Seed Relationships
    for (const rel of seedRelationships) {
        await prisma.relationship.upsert({
            where: { id: rel.id },
            update: {},
            create: rel,
        });
    }
    console.log('Relationships seeded.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
