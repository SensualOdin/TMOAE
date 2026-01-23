// T-Mobile A/E Inventory Hub - Main JavaScript

// Global data storage
let prosysData = [];
let connectionData = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeTheme();
    initializeEventListeners();
    loadInventoryData();
    updateLastUpdated();
});

// ==========================================
// Theme Management
// ==========================================

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

// ==========================================
// Event Listeners
// ==========================================

function initializeEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Global search
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', handleGlobalSearch);
    }

    // Page-specific search
    const pageSearch = document.getElementById('pageSearch');
    if (pageSearch) {
        pageSearch.addEventListener('input', handlePageSearch);
    }
}

// ==========================================
// Excel Data Loading
// ==========================================

async function loadInventoryData() {
    try {
        // Load Prosys data
        const prosysFile = 'Mobility Hardware Report 01.16.2026.xlsx';
        prosysData = await loadExcelFile(prosysFile, 'Prosys');

        // Load Connection data
        const connectionFile = 'T-Mobile Formatted Inventory Report 1.20.26.xlsx';
        connectionData = await loadExcelFile(connectionFile, 'Connection');

        console.log('Inventory data loaded successfully');
        updatePageData();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
}

async function loadExcelFile(filename, vendor) {
    try {
        const response = await fetch(filename);
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        if (vendor === 'Prosys') {
            return parseProsysData(workbook);
        } else if (vendor === 'Connection') {
            return parseConnectionData(workbook);
        }
    } catch (error) {
        console.error(`Error loading ${filename}:`, error);
        return [];
    }
}

function parseProsysData(workbook) {
    const sheetName = 'Report';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        console.error('Sheet "Report" not found in Prosys file');
        return [];
    }

    // Convert to JSON, starting from row 10 (header rows are 9-10, data starts at 11)
    // Using range: 8 means start from row 9 (0-indexed), which will use row 9 as headers
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: 8, // Start from row 9 (0-indexed: 8) - this is the header row
        defval: ''
    });

    return jsonData.map(row => {
        const mapped = {
            kit: row['Kit'] || '',
            device: row['Device'] || '',
            deviceType: row['Computacenter Device Type'] || '',
            manufacturer: row['MFR'] || '',
            partNumber: row['Part#'] || '',
            description: row['Description'] || '',
            // Based on console logs, __EMPTY columns are the "On Order" sub-headers
            totalOnHand: parseNumber(row['Total Count']) || 0,
            totalOnOrder: parseNumber(row['__EMPTY']) || 0,
            depotOnHand: parseNumber(row['Depot Pool']) || 0,
            depotOnOrder: parseNumber(row['__EMPTY_1']) || 0,
            deploymentOnHand: parseNumber(row['Deployment Pool']) || 0,
            deploymentOnOrder: parseNumber(row['__EMPTY_2']) || 0,
            newRemodelOnHand: parseNumber(row['New/Remodel Pool']) || 0,
            newRemodelOnOrder: parseNumber(row['__EMPTY_3']) || 0,
            safetyOnHand: parseNumber(row['Safety Pool']) || 0,
            safetyOnOrder: parseNumber(row['__EMPTY_4']) || 0,
            vendorOnHand: parseNumber(row['Vendor Owned']) || 0,
            vendorOnOrder: parseNumber(row['__EMPTY_5']) || 0,
            refurbOnHand: parseNumber(row['Refurbished Pool']) || 0,
            refurbOnOrder: parseNumber(row['__EMPTY_6']) || 0,
            dateReceived: row['Date Vendor Stock Received'] || '',
            comments: row['Comments/Repairs Processing'] || '',
            vendor: 'Prosys'
        };
        return mapped;
    }).filter(item => {
        // Filter out rows with no device name or CDC kit items
        if (!item.device || item.device.trim() === '') return false;
        if (item.kit && item.kit.toUpperCase() === 'CDC') return false;
        return true;
    });
}

function parseConnectionData(workbook) {
    const sheetName = 'Formatted Report';
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
        console.error('Sheet "Formatted Report" not found in Connection file');
        return [];
    }

    // Convert to JSON, starting from row 1 (header row)
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        range: 1,
        defval: ''
    });

    return jsonData.map(row => ({
        kit: row['Bundle /Kit'] || '',
        device: row['Device'] || '',
        totalOnHand: parseNumber(row['On Hand']) || 0,
        totalOnOrder: parseNumber(row['On Order']) || 0,
        depotCOR: parseNumber(row['COR']) || 0,
        depotMetro: parseNumber(row['Metro']) || 0,
        depotOnOrder: parseNumber(row['On Order__1']) || 0,
        safetyOnHand: parseNumber(row['On Hand__1']) || 0,
        safetyOnOrder: parseNumber(row['On Order__2']) || 0,
        refurbOnHand: parseNumber(row['On Hand__2']) || 0,
        refurbPrice: parseNumber(row['Refurb Price']) || 0,
        vendorOnHand: parseNumber(row['On Hand__3']) || 0,
        vendorOnOrder: parseNumber(row['On Order__3']) || 0,
        mobilityDevice: row['Device__1'] || '',
        mobilityQty: parseNumber(row['Qty']) || 0,
        mobilityNotes: row['Notes'] || '',
        constructionDevice: row['Device__2'] || '',
        constructionOnHand: parseNumber(row['Qty On Hand']) || 0,
        constructionProjected: parseNumber(row['Qty Projected']) || 0,
        vendor: 'Connection'
    })).filter(item => {
        // Filter out rows with no device name or CDC kit items
        if (!item.device || item.device.trim() === '') return false;
        if (item.kit && item.kit.toUpperCase() === 'CDC') return false;
        return true;
    });
}

function parseNumber(value) {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
}

// ==========================================
// Data Display Functions
// ==========================================

function updatePageData() {
    const currentPage = getCurrentPage();

    switch(currentPage) {
        case 'prosys':
            displayProsysData();
            break;
        case 'connection':
            displayConnectionData();
            break;
        case 'totals':
            displayTotalsData();
            break;
        default:
            // Home page - update stats
            updateHomeStats();
    }
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('prosys.html')) return 'prosys';
    if (path.includes('connection.html')) return 'connection';
    if (path.includes('totals.html')) return 'totals';
    return 'home';
}

function updateHomeStats() {
    // Update stats on home page
    const totalDevices = prosysData.length + connectionData.length;

    const totalOnOrder = prosysData.reduce((sum, item) => sum + item.totalOnOrder, 0) +
                        connectionData.reduce((sum, item) => sum + item.totalOnOrder, 0);

    updateElement('totalDevices', totalDevices);
    updateElement('onOrder', formatNumber(totalOnOrder));
}

function displayProsysData() {
    const tableBody = document.getElementById('prosysTableBody');
    if (!tableBody) return;

    console.log('Displaying Prosys data:', prosysData.length, 'items');

    if (prosysData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 40px;">No data available</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    // Sort data by kit (REMO Kit first) then by device name
    const sortedData = [...prosysData].sort((a, b) => {
        const kitA = a.kit || 'zzz';
        const kitB = b.kit || 'zzz';

        if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
        if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

        const kitCompare = kitA.localeCompare(kitB);
        if (kitCompare !== 0) return kitCompare;

        return a.device.localeCompare(b.device);
    });

    // Add rows with kit group headers
    let currentKit = null;
    sortedData.forEach(item => {
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, sortedData.filter(i => i.kit === currentKit).length, 10);
            tableBody.appendChild(headerRow);
        }

        const row = createProsysRow(item);
        tableBody.appendChild(row);
    });

    // Update stats
    updateProsysStats();

    // Populate kit filter dropdown
    populateProsysKitFilter();
}

function createProsysRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span class="badge ${item.kit === 'REMO Kit' ? 'badge-magenta' : ''}">${item.kit}</span></td>
        <td><strong>${item.device}</strong></td>
        <td>${item.manufacturer}</td>
        <td>${item.partNumber}</td>
        <td class="text-right">${formatNumber(item.totalOnHand)}</td>
        <td class="text-right">${formatNumber(item.totalOnOrder)}</td>
        <td class="text-right">${formatNumber(item.depotOnHand)}</td>
        <td class="text-right">${formatNumber(item.deploymentOnHand)}</td>
        <td class="text-right">${formatNumber(item.safetyOnHand)}</td>
        <td class="text-right">${formatNumber(item.refurbOnHand)}</td>
    `;
    row.classList.add('fade-in');
    return row;
}

function displayConnectionData() {
    const tableBody = document.getElementById('connectionTableBody');
    if (!tableBody) return;

    console.log('Displaying Connection data:', connectionData.length, 'items');

    if (connectionData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" class="text-center" style="padding: 40px;">No data available</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    // Sort data by kit (REMO Kit first) then by device name
    const sortedData = [...connectionData].sort((a, b) => {
        const kitA = a.kit || 'zzz';
        const kitB = b.kit || 'zzz';

        if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
        if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

        const kitCompare = kitA.localeCompare(kitB);
        if (kitCompare !== 0) return kitCompare;

        return a.device.localeCompare(b.device);
    });

    // Add rows with kit group headers
    let currentKit = null;
    sortedData.forEach(item => {
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, sortedData.filter(i => i.kit === currentKit).length, 10);
            tableBody.appendChild(headerRow);
        }

        const row = createConnectionRow(item);
        tableBody.appendChild(row);
    });

    // Update stats
    updateConnectionStats();

    // Populate kit filter dropdown
    populateConnectionKitFilter();
}

function createConnectionRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span class="badge ${item.kit === 'REMO Kit' ? 'badge-magenta' : ''}">${item.kit}</span></td>
        <td><strong>${item.device}</strong></td>
        <td class="text-right">${formatNumber(item.totalOnHand)}</td>
        <td class="text-right">${formatNumber(item.totalOnOrder)}</td>
        <td class="text-right">${formatNumber(item.depotCOR + item.depotMetro)}</td>
        <td class="text-right">${formatNumber(item.safetyOnHand)}</td>
        <td class="text-right">${formatNumber(item.refurbOnHand)}</td>
        <td class="text-right">${formatNumber(item.vendorOnHand)}</td>
        <td class="text-right">${formatNumber(item.mobilityQty)}</td>
        <td class="text-right">${formatNumber(item.constructionOnHand)}</td>
    `;
    row.classList.add('fade-in');
    return row;
}

function displayTotalsData() {
    const tableBody = document.getElementById('totalsTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Create aggregated totals by device
    const aggregatedData = aggregateInventoryData();

    // Filter out rows with zero inventory from both vendors
    const filteredData = aggregatedData.filter(item =>
        item.totalOnHand > 0 || item.totalOnOrder > 0
    );

    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 40px;">No data available</td></tr>';
        return;
    }

    // Add rows with kit group headers
    let currentKit = null;
    filteredData.forEach(item => {
        // Add group header when kit changes
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, filteredData.filter(i => i.kit === currentKit).length);
            tableBody.appendChild(headerRow);
        }

        const row = createAggregatedTotalsRow(item);
        tableBody.appendChild(row);
    });

    // Update summary cards
    updateTotalsStats();

    // Populate kit filter dropdown
    populateKitFilter();
}

function populateKitFilter() {
    const kitFilterSelect = document.getElementById('kitFilter');
    if (!kitFilterSelect) return;

    // Get unique kits from both vendors
    const allData = [...prosysData, ...connectionData];
    const uniqueKits = [...new Set(allData.map(item => item.kit).filter(kit => kit && kit.trim() !== ''))];

    // Sort kits: REMO Kit first, then alphabetically
    uniqueKits.sort((a, b) => {
        if (a === 'REMO Kit') return -1;
        if (b === 'REMO Kit') return 1;
        return a.localeCompare(b);
    });

    // Clear existing options except the first "All Kits"
    kitFilterSelect.innerHTML = '<option value="">All Kits</option>';

    // Add kit options
    uniqueKits.forEach(kit => {
        const option = document.createElement('option');
        option.value = kit;
        option.textContent = kit;
        kitFilterSelect.appendChild(option);
    });
}

function populateProsysKitFilter() {
    const kitFilterSelect = document.getElementById('prosysKitFilter');
    if (!kitFilterSelect) return;

    // Get unique kits from prosys data
    const uniqueKits = [...new Set(prosysData.map(item => item.kit).filter(kit => kit && kit.trim() !== ''))];

    // Sort kits: REMO Kit first, then alphabetically
    uniqueKits.sort((a, b) => {
        if (a === 'REMO Kit') return -1;
        if (b === 'REMO Kit') return 1;
        return a.localeCompare(b);
    });

    // Clear existing options except the first "All Kits"
    kitFilterSelect.innerHTML = '<option value="">All Kits</option>';

    // Add kit options
    uniqueKits.forEach(kit => {
        const option = document.createElement('option');
        option.value = kit;
        option.textContent = kit;
        kitFilterSelect.appendChild(option);
    });
}

function populateConnectionKitFilter() {
    const kitFilterSelect = document.getElementById('connectionKitFilter');
    if (!kitFilterSelect) return;

    // Get unique kits from connection data
    const uniqueKits = [...new Set(connectionData.map(item => item.kit).filter(kit => kit && kit.trim() !== ''))];

    // Sort kits: REMO Kit first, then alphabetically
    uniqueKits.sort((a, b) => {
        if (a === 'REMO Kit') return -1;
        if (b === 'REMO Kit') return 1;
        return a.localeCompare(b);
    });

    // Clear existing options except the first "All Kits"
    kitFilterSelect.innerHTML = '<option value="">All Kits</option>';

    // Add kit options
    uniqueKits.forEach(kit => {
        const option = document.createElement('option');
        option.value = kit;
        option.textContent = kit;
        kitFilterSelect.appendChild(option);
    });
}

function filterByKitDropdown() {
    const currentPage = getCurrentPage();
    let kitFilterSelect, selectedKit;

    // Get the appropriate select element based on current page
    switch(currentPage) {
        case 'prosys':
            kitFilterSelect = document.getElementById('prosysKitFilter');
            break;
        case 'connection':
            kitFilterSelect = document.getElementById('connectionKitFilter');
            break;
        case 'totals':
            kitFilterSelect = document.getElementById('kitFilter');
            break;
        default:
            return;
    }

    if (!kitFilterSelect) return;

    selectedKit = kitFilterSelect.value;

    if (selectedKit === '') {
        // Show all data
        resetFilters();
    } else {
        // Filter by selected kit
        filterByKit(selectedKit);
    }
}

function createTotalsRow(item) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><span class="badge badge-${item.vendor.toLowerCase()}">${item.vendor}</span></td>
        <td><span class="badge ${item.kit === 'REMO Kit' ? 'badge-magenta' : ''}">${item.kit}</span></td>
        <td><strong>${item.device}</strong></td>
        <td class="text-right">${formatNumber(item.totalOnHand)}</td>
        <td class="text-right">${formatNumber(item.totalOnOrder)}</td>
        <td class="text-right">${formatNumber(getDepotTotal(item))}</td>
        <td class="text-right">${formatNumber(getSafetyTotal(item))}</td>
        <td class="text-right">${formatNumber(getRefurbTotal(item))}</td>
    `;
    row.classList.add('fade-in');
    return row;
}

function getDepotTotal(item) {
    if (item.vendor === 'Prosys') {
        return item.depotOnHand || 0;
    } else {
        return (item.depotCOR || 0) + (item.depotMetro || 0);
    }
}

function getSafetyTotal(item) {
    return item.safetyOnHand || 0;
}

function getRefurbTotal(item) {
    return item.refurbOnHand || 0;
}

// ==========================================
// Data Aggregation for Totals Page
// ==========================================

// Helper function to normalize device names for grouping
function normalizeDeviceName(deviceName) {
    return deviceName
        .toLowerCase()
        .replace(/\s+/g, '') // Remove all spaces
        .trim();
}

function aggregateInventoryData() {
    // Create a map to aggregate data by device name
    const deviceMap = new Map();

    // Process Connection data first (prefer Connection's naming with spaces)
    connectionData.forEach(item => {
        const key = normalizeDeviceName(item.device);
        if (!deviceMap.has(key)) {
            deviceMap.set(key, {
                device: item.device,
                kit: item.kit,
                prosysOnHand: 0,
                prosysOnOrder: 0,
                connectionOnHand: 0,
                connectionOnOrder: 0,
                totalOnHand: 0,
                totalOnOrder: 0,
                depotTotal: 0,
                safetyTotal: 0,
                refurbTotal: 0
            });
        }
        const aggregated = deviceMap.get(key);
        aggregated.connectionOnHand += item.totalOnHand || 0;
        aggregated.connectionOnOrder += item.totalOnOrder || 0;
        aggregated.totalOnHand += item.totalOnHand || 0;
        aggregated.totalOnOrder += item.totalOnOrder || 0;
        aggregated.depotTotal += (item.depotCOR || 0) + (item.depotMetro || 0);
        aggregated.safetyTotal += item.safetyOnHand || 0;
        aggregated.refurbTotal += item.refurbOnHand || 0;
    });

    // Process Prosys data
    prosysData.forEach(item => {
        const key = normalizeDeviceName(item.device);
        if (!deviceMap.has(key)) {
            deviceMap.set(key, {
                device: item.device,
                kit: item.kit,
                prosysOnHand: 0,
                prosysOnOrder: 0,
                connectionOnHand: 0,
                connectionOnOrder: 0,
                totalOnHand: 0,
                totalOnOrder: 0,
                depotTotal: 0,
                safetyTotal: 0,
                refurbTotal: 0
            });
        }
        const aggregated = deviceMap.get(key);
        aggregated.prosysOnHand += item.totalOnHand || 0;
        aggregated.prosysOnOrder += item.totalOnOrder || 0;
        aggregated.totalOnHand += item.totalOnHand || 0;
        aggregated.totalOnOrder += item.totalOnOrder || 0;
        aggregated.depotTotal += item.depotOnHand || 0;
        aggregated.safetyTotal += item.safetyOnHand || 0;
        aggregated.refurbTotal += item.refurbOnHand || 0;
    });

    // Convert map to array and sort by kit first, then by device name
    return Array.from(deviceMap.values()).sort((a, b) => {
        // Sort by kit first (REMO Kit at top, then alphabetically by kit)
        const kitA = a.kit || 'zzz'; // Push empty kits to bottom
        const kitB = b.kit || 'zzz';

        // Prioritize REMO Kit at the top
        if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
        if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

        // Then sort by kit name
        const kitCompare = kitA.localeCompare(kitB);
        if (kitCompare !== 0) return kitCompare;

        // Then by device name within the same kit
        return a.device.localeCompare(b.device);
    });
}

function getKitColor(kitName) {
    const colors = {
        'REMO Kit': { bg: 'rgba(226, 0, 116, 0.08)', border: '#E20074', badge: 'badge-magenta' },
        'HC Bundle': { bg: 'rgba(102, 126, 234, 0.08)', border: '#667eea', badge: '' },
        'SSR': { bg: 'rgba(249, 147, 251, 0.08)', border: '#f093fb', badge: '' },
        'TIMO Kit': { bg: 'rgba(0, 166, 81, 0.08)', border: '#00A651', badge: '' },
        'default': { bg: 'rgba(150, 150, 150, 0.08)', border: '#999', badge: '' }
    };
    return colors[kitName] || colors['default'];
}

function createKitGroupHeader(kitName, itemCount, colspan = 7) {
    const row = document.createElement('tr');
    row.classList.add('kit-group-header');

    const displayName = kitName || 'Other Devices';
    const colorScheme = getKitColor(kitName);

    row.innerHTML = `
        <td colspan="${colspan}" style="background: ${colorScheme.bg}; padding: 16px 20px; border-top: 2px solid ${colorScheme.border}; border-bottom: 2px solid ${colorScheme.border};">
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="badge ${colorScheme.badge}" style="font-size: 15px; font-weight: 700; padding: 8px 16px;">${displayName}</span>
                <span style="color: var(--text-tertiary); font-size: 14px; font-weight: 600;">${itemCount} ${itemCount === 1 ? 'device' : 'devices'}</span>
            </div>
        </td>
    `;

    return row;
}

function createAggregatedTotalsRow(item) {
    const row = document.createElement('tr');

    // Determine vendor badges
    const badges = [];
    if (item.prosysOnHand > 0) {
        badges.push('<span class="badge badge-prosys">Prosys</span>');
    }
    if (item.connectionOnHand > 0) {
        badges.push('<span class="badge badge-connection">Connection</span>');
    }
    const vendorBadges = badges.length > 0 ? badges.join('') : '<span class="badge">-</span>';

    row.innerHTML = `
        <td><div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">${vendorBadges}</div></td>
        <td><strong>${item.device}</strong></td>
        <td class="text-right"><strong style="color: var(--accent-primary);">${formatNumber(item.totalOnHand)}</strong></td>
        <td class="text-right">${item.totalOnOrder > 0 ? formatNumber(item.totalOnOrder) : '-'}</td>
        <td class="text-right">${item.depotTotal > 0 ? formatNumber(item.depotTotal) : '-'}</td>
        <td class="text-right">${item.safetyTotal > 0 ? formatNumber(item.safetyTotal) : '-'}</td>
        <td class="text-right">${item.refurbTotal > 0 ? formatNumber(item.refurbTotal) : '-'}</td>
    `;
    row.classList.add('fade-in');
    return row;
}

function updateProsysStats() {
    const totalOnHand = prosysData.reduce((sum, item) => sum + item.totalOnHand, 0);
    const totalOnOrder = prosysData.reduce((sum, item) => sum + item.totalOnOrder, 0);

    updateElement('prosysDeviceCount', prosysData.length);
    updateElement('prosysOnHandTotal', formatNumber(totalOnHand));
    updateElement('prosysOnOrderTotal', formatNumber(totalOnOrder));
}

function updateConnectionStats() {
    const totalOnHand = connectionData.reduce((sum, item) => sum + item.totalOnHand, 0);
    const totalOnOrder = connectionData.reduce((sum, item) => sum + item.totalOnOrder, 0);

    updateElement('connectionDeviceCount', connectionData.length);
    updateElement('connectionOnHandTotal', formatNumber(totalOnHand));
    updateElement('connectionOnOrderTotal', formatNumber(totalOnOrder));
}

function updateTotalsStats() {
    const allData = [...prosysData, ...connectionData];

    const prosysTotal = prosysData.reduce((sum, item) => sum + item.totalOnHand, 0);
    const connectionTotal = connectionData.reduce((sum, item) => sum + item.totalOnHand, 0);
    const grandTotal = prosysTotal + connectionTotal;

    updateElement('prosysTotal', formatNumber(prosysTotal));
    updateElement('connectionTotal', formatNumber(connectionTotal));
    updateElement('grandTotal', formatNumber(grandTotal));
    updateElement('totalItems', allData.length);
}

// ==========================================
// Search Functions
// ==========================================

function handleGlobalSearch(event) {
    const query = event.target.value.toLowerCase();
    console.log('Global search:', query);
    // Implement global search across all data
}

function handlePageSearch(event) {
    const query = event.target.value.toLowerCase();
    const currentPage = getCurrentPage();

    let filteredData = [];

    switch(currentPage) {
        case 'prosys':
            filteredData = prosysData.filter(item =>
                item.device.toLowerCase().includes(query) ||
                item.kit.toLowerCase().includes(query) ||
                item.manufacturer.toLowerCase().includes(query)
            );
            displayFilteredProsysData(filteredData);
            break;
        case 'connection':
            filteredData = connectionData.filter(item =>
                item.device.toLowerCase().includes(query) ||
                item.kit.toLowerCase().includes(query)
            );
            displayFilteredConnectionData(filteredData);
            break;
        case 'totals':
            const allData = [...prosysData, ...connectionData];
            filteredData = allData.filter(item =>
                item.device.toLowerCase().includes(query) ||
                item.kit.toLowerCase().includes(query) ||
                item.vendor.toLowerCase().includes(query)
            );
            displayFilteredTotalsData(filteredData);
            break;
    }
}

function displayFilteredProsysData(data) {
    const tableBody = document.getElementById('prosysTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Sort data by kit (REMO Kit first) then by device name
    const sortedData = [...data].sort((a, b) => {
        const kitA = a.kit || 'zzz';
        const kitB = b.kit || 'zzz';

        if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
        if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

        const kitCompare = kitA.localeCompare(kitB);
        if (kitCompare !== 0) return kitCompare;

        return a.device.localeCompare(b.device);
    });

    // Add rows with kit group headers
    let currentKit = null;
    sortedData.forEach(item => {
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, sortedData.filter(i => i.kit === currentKit).length, 10);
            tableBody.appendChild(headerRow);
        }

        const row = createProsysRow(item);
        tableBody.appendChild(row);
    });
}

function displayFilteredConnectionData(data) {
    const tableBody = document.getElementById('connectionTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    // Sort data by kit (REMO Kit first) then by device name
    const sortedData = [...data].sort((a, b) => {
        const kitA = a.kit || 'zzz';
        const kitB = b.kit || 'zzz';

        if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
        if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

        const kitCompare = kitA.localeCompare(kitB);
        if (kitCompare !== 0) return kitCompare;

        return a.device.localeCompare(b.device);
    });

    // Add rows with kit group headers
    let currentKit = null;
    sortedData.forEach(item => {
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, sortedData.filter(i => i.kit === currentKit).length, 10);
            tableBody.appendChild(headerRow);
        }

        const row = createConnectionRow(item);
        tableBody.appendChild(row);
    });
}

function displayFilteredTotalsData(data) {
    const tableBody = document.getElementById('totalsTableBody');
    if (!tableBody) return;

    // For totals page, we need to aggregate the filtered data too
    // Create a temporary aggregation
    const deviceMap = new Map();

    data.forEach(item => {
        const key = normalizeDeviceName(item.device);
        if (!deviceMap.has(key)) {
            deviceMap.set(key, {
                device: item.device,
                kit: item.kit,
                vendor: item.vendor,
                prosysOnHand: 0,
                connectionOnHand: 0,
                totalOnHand: 0,
                totalOnOrder: 0,
                depotTotal: 0,
                safetyTotal: 0,
                refurbTotal: 0
            });
        }
        const aggregated = deviceMap.get(key);
        if (item.vendor === 'Prosys') {
            aggregated.prosysOnHand += item.totalOnHand || 0;
        } else {
            aggregated.connectionOnHand += item.totalOnHand || 0;
        }
        aggregated.totalOnHand += item.totalOnHand || 0;
        aggregated.totalOnOrder += item.totalOnOrder || 0;
        aggregated.depotTotal += getDepotTotal(item);
        aggregated.safetyTotal += getSafetyTotal(item);
        aggregated.refurbTotal += getRefurbTotal(item);
    });

    const aggregatedData = Array.from(deviceMap.values())
        .filter(item => item.totalOnHand > 0 || item.totalOnOrder > 0) // Filter zeros
        .sort((a, b) => {
            // Sort by kit first, then by device name (same logic as main aggregation)
            const kitA = a.kit || 'zzz';
            const kitB = b.kit || 'zzz';

            if (kitA === 'REMO Kit' && kitB !== 'REMO Kit') return -1;
            if (kitA !== 'REMO Kit' && kitB === 'REMO Kit') return 1;

            const kitCompare = kitA.localeCompare(kitB);
            if (kitCompare !== 0) return kitCompare;

            return a.device.localeCompare(b.device);
        });

    tableBody.innerHTML = '';

    // Add rows with kit group headers
    let currentKit = null;
    aggregatedData.forEach(item => {
        // Add group header when kit changes
        if (item.kit !== currentKit) {
            currentKit = item.kit;
            const headerRow = createKitGroupHeader(currentKit, aggregatedData.filter(i => i.kit === currentKit).length);
            tableBody.appendChild(headerRow);
        }

        const row = createAggregatedTotalsRow(item);
        tableBody.appendChild(row);
    });
}

// ==========================================
// Export Functions
// ==========================================

function exportAllData() {
    const allData = [...prosysData, ...connectionData];
    exportToCSV(allData, 'TMobile_Inventory_All_Data.csv');
}

function exportProsysData() {
    exportToCSV(prosysData, 'TMobile_Inventory_Prosys.csv');
}

function exportConnectionData() {
    exportToCSV(connectionData, 'TMobile_Inventory_Connection.csv');
}

function exportToCSV(data, filename) {
    if (data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get all unique keys
    const keys = Object.keys(data[0]);

    // Create CSV header
    const csvHeader = keys.join(',') + '\n';

    // Create CSV rows
    const csvRows = data.map(row => {
        return keys.map(key => {
            const value = row[key];
            // Escape values that contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

// ==========================================
// Quick Action Functions
// ==========================================

function viewREMOKits() {
    const remoData = [...prosysData, ...connectionData].filter(item => item.kit === 'REMO Kit');
    console.log('REMO Kit items:', remoData);
    alert(`Found ${remoData.length} REMO Kit items across both vendors`);
    // Could navigate to a filtered view
}

function compareVendors() {
    window.location.href = 'totals.html';
}

function refreshData() {
    loadInventoryData();
    alert('Data refreshed successfully!');
}

// ==========================================
// Utility Functions
// ==========================================

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function formatNumber(num) {
    if (num === 0 || num === null || num === undefined) return '0';
    return num.toLocaleString('en-US');
}

function formatCurrency(num) {
    if (num === 0 || num === null || num === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(num);
}

async function updateLastUpdated() {
    const now = new Date();
    const formatted = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    updateElement('footerDate', formatted);

    // Fetch last commit date from GitLab for the Excel files
    try {
        const lastCommitDate = await getLastGitLabCommitDate();
        const timeAgo = getTimeAgo(lastCommitDate);
        updateElement('lastUpdate', timeAgo);
    } catch (error) {
        console.error('Failed to fetch last commit date:', error);
        updateElement('lastUpdate', 'Just Now');
    }
}

async function getLastGitLabCommitDate() {
    const project = 'George.Gewinner%2Fae-inventory';
    const files = [
        'Mobility%20Hardware%20Report%2001.16.2026.xlsx',
        'T-Mobile%20Formatted%20Inventory%20Report%201.20.26.xlsx'
    ];

    let latestDate = null;

    for (const file of files) {
        const url = `https://gitlab.com/api/v4/projects/${project}/repository/files/${file}?ref=master`;

        try {
            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                const commitDate = new Date(data.last_commit_id ? data.last_commit_id : Date.now());

                // Get commit details for accurate date
                if (data.last_commit_id) {
                    const commitUrl = `https://gitlab.com/api/v4/projects/${project}/repository/commits/${data.last_commit_id}`;
                    const commitResponse = await fetch(commitUrl);
                    if (commitResponse.ok) {
                        const commitData = await commitResponse.json();
                        const actualDate = new Date(commitData.committed_date);
                        if (!latestDate || actualDate > latestDate) {
                            latestDate = actualDate;
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`Error fetching commit for ${file}:`, error);
        }
    }

    return latestDate || new Date();
}

function getTimeAgo(date) {
    const now = new Date();
    const secondsAgo = Math.floor((now - date) / 1000);

    if (secondsAgo < 60) return 'Just Now';
    if (secondsAgo < 3600) {
        const minutes = Math.floor(secondsAgo / 60);
        return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    }
    if (secondsAgo < 86400) {
        const hours = Math.floor(secondsAgo / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    if (secondsAgo < 604800) {
        const days = Math.floor(secondsAgo / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    // For older dates, show the actual date
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
}

// ==========================================
// Filter Functions
// ==========================================

function filterByKit(kitType) {
    const currentPage = getCurrentPage();
    let filteredData = [];

    switch(currentPage) {
        case 'prosys':
            filteredData = prosysData.filter(item => item.kit === kitType);
            displayFilteredProsysData(filteredData);
            break;
        case 'connection':
            filteredData = connectionData.filter(item => item.kit === kitType);
            displayFilteredConnectionData(filteredData);
            break;
        case 'totals':
            const allData = [...prosysData, ...connectionData];
            filteredData = allData.filter(item => item.kit === kitType);
            displayFilteredTotalsData(filteredData);
            break;
    }
}

function resetFilters() {
    const currentPage = getCurrentPage();

    switch(currentPage) {
        case 'prosys':
            displayProsysData();
            break;
        case 'connection':
            displayConnectionData();
            break;
        case 'totals':
            displayTotalsData();
            break;
    }

    // Clear search input
    const pageSearch = document.getElementById('pageSearch');
    if (pageSearch) {
        pageSearch.value = '';
    }

    // Reset kit filter dropdowns for all pages
    const kitFilter = document.getElementById('kitFilter');
    if (kitFilter) {
        kitFilter.value = '';
    }

    const prosysKitFilter = document.getElementById('prosysKitFilter');
    if (prosysKitFilter) {
        prosysKitFilter.value = '';
    }

    const connectionKitFilter = document.getElementById('connectionKitFilter');
    if (connectionKitFilter) {
        connectionKitFilter.value = '';
    }
}

// Make functions available globally
window.toggleTheme = toggleTheme;
window.exportAllData = exportAllData;
window.exportProsysData = exportProsysData;
window.exportConnectionData = exportConnectionData;
window.viewREMOKits = viewREMOKits;
window.compareVendors = compareVendors;
window.refreshData = refreshData;
window.filterByKit = filterByKit;
window.filterByKitDropdown = filterByKitDropdown;
window.resetFilters = resetFilters;
