// ===================================
// T-Mobile A/E Inventory Dashboard
// Interactive Features & Data Visualization
// ===================================

let inventoryData = null;
let currentView = 'connection';
let lastRefreshTime = new Date();
let currentSort = { column: null, direction: null };
let tableDensity = 'comfortable'; // comfortable, compact, spacious
let hiddenColumns = [];
let activeFilters = {
    search: '',
    kit: 'all',
    device: 'all'
};

// ===================================
// Initialize on page load
// ===================================

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    initCustomCursor();
    initScrollReveal();
    initNavigation();
    initInventoryControls();
    renderPoolLegend();
    renderInventoryTable();
    renderCharts();
    animateStats();
    updateRefreshTime();
    generateExecutiveSummary();
    calculateHealthMetrics();
    initColumnSettings();
    updateFilterTags();
});

// ===================================
// Load Inventory Data
// ===================================

async function loadData() {
    try {
        const response = await fetch('inventory_data.json');
        inventoryData = await response.json();
        console.log('✓ Data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        // Fallback: show error message
        document.body.innerHTML = '<div style="color: white; padding: 2rem; text-align: center;"><h1>Error loading inventory data</h1><p>Please ensure inventory_data.json exists.</p></div>';
    }
}

// ===================================
// Custom Cursor - DISABLED
// ===================================

function initCustomCursor() {
    // Custom cursor disabled
    return;
}

// ===================================
// Scroll Reveal Animations
// ===================================

function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -100px 0px' });

    document.querySelectorAll('[data-scroll-reveal]').forEach(el => {
        observer.observe(el);
    });
}

// ===================================
// Smooth Navigation
// ===================================

function initNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

function scrollToInventory() {
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });
}

function scrollToAnalytics() {
    document.getElementById('analytics').scrollIntoView({ behavior: 'smooth' });
}

// ===================================
// Inventory Controls
// ===================================

function initInventoryControls() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        renderInventoryTable(e.target.value);
    });

    // Kit filter
    const kitFilter = document.getElementById('kitFilter');
    kitFilter.addEventListener('change', () => {
        renderInventoryTable();
    });

    // Device filter
    const deviceFilter = document.getElementById('deviceFilter');
    deviceFilter.addEventListener('change', () => {
        renderInventoryTable();
    });

    // View toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            renderInventoryTable();
        });
    });
}

// ===================================
// Render Pool Legend
// ===================================

function renderPoolLegend() {
    if (!inventoryData || !inventoryData['Spare Pool Legend']) return;

    const poolsGrid = document.querySelector('.pools-grid');
    const pools = inventoryData['Spare Pool Legend'];

    const poolIcons = {
        'Depot Pool': '🏢',
        'Deployment Pool': '🚀',
        'New/Remodel Pool': '🏗️',
        'Safety Pool': '🛡️',
        'Total Count': '📊',
        'Vendor Owned': '📦'
    };

    poolsGrid.innerHTML = pools.map(pool => `
        <div class="pool-card">
            <div class="pool-header">
                <div class="pool-icon">${poolIcons[pool['Pool Type '].trim()] || '📦'}</div>
                <h3 class="pool-title">${pool['Pool Type ']}</h3>
            </div>
            <p class="pool-definition">${pool.Definition}</p>
        </div>
    `).join('');
}

// ===================================
// Render Inventory Table
// ===================================

function renderInventoryTable(searchTerm = '') {
    if (!inventoryData) return;

    const tableBody = document.getElementById('inventoryTableBody');
    const kitFilter = document.getElementById('kitFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;

    // Select data source based on current view
    let dataSource;
    if (currentView === 'connection') {
        dataSource = inventoryData['Connection Depot On Hand'] || [];
    } else if (currentView === 'prosys') {
        dataSource = inventoryData['Prosys Spare Pool'] || [];
    } else {
        dataSource = inventoryData['inventory totals'] || [];
    }

    // Filter data
    let filteredData = dataSource.filter(item => {
        const matchesSearch = searchTerm === '' ||
            item.Device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item['Bundle /Kit']?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesKit = kitFilter === 'all' || item['Bundle /Kit'] === kitFilter;

        const matchesDevice = deviceFilter === 'all' || String(item['Device #s']) === deviceFilter;

        return matchesSearch && matchesKit && matchesDevice;
    });

    // Sort by Bundle #s and Device #s for grouping
    filteredData.sort((a, b) => {
        const bundleCompare = (a['Bundle #s'] || 0) - (b['Bundle #s'] || 0);
        if (bundleCompare !== 0) return bundleCompare;
        return (a['Device #s'] || 0) - (b['Device #s'] || 0);
    });

    // Render rows with device type grouping
    let currentDeviceType = null;
    let deviceTypeColor = 0;
    const deviceTypeColors = ['device-group-1', 'device-group-2', 'device-group-3'];

    tableBody.innerHTML = filteredData.map(item => {
        const deviceType = item['Device #s'];

        // Change color when device type changes
        if (deviceType !== currentDeviceType) {
            currentDeviceType = deviceType;
            deviceTypeColor = (deviceTypeColor + 1) % deviceTypeColors.length;
        }

        const totalOnHand = item['Total On Hand'] || 0;
        const quantityClass = totalOnHand > 5000 ? 'quantity-high' :
                             totalOnHand > 1000 ? 'quantity-medium' :
                             'quantity-low';

        return `
            <tr class="${deviceTypeColors[deviceTypeColor]}" data-device-type="${deviceType}">
                <td>${item['Bundle /Kit'] || '-'}</td>
                <td><strong>${item.Device || '-'}</strong></td>
                <td><span class="quantity-badge ${quantityClass}">${formatNumber(totalOnHand)}</span></td>
                <td>${formatNumber(item['Total On Order'] || 0)}</td>
                <td>${formatNumber(item['Depot On Hand'] || 0)}</td>
                <td>${formatNumber(item['Deployment On Hand'] || 0)}</td>
                <td>${formatNumber(item['New/Remodel On Hand'] || 0)}</td>
                <td>${formatNumber(item['Saftey On Hand'] || 0)}</td>
                <td>${formatNumber(item['Vendor On Hand'] || 0)}</td>
            </tr>
        `;
    }).join('');

    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    No results found
                </td>
            </tr>
        `;
    }
}

function formatNumber(num) {
    return num ? num.toLocaleString() : '0';
}

// ===================================
// Animate Statistics
// ===================================

function animateStats() {
    if (!inventoryData || !inventoryData['inventory totals']) return;

    const totals = inventoryData['inventory totals'];

    // Calculate totals
    const totalUnits = totals.reduce((sum, item) => sum + (item['Total On Hand'] || 0), 0);
    const depotStock = totals.reduce((sum, item) => sum + (item['Depot On Hand'] || 0), 0);
    const deployment = totals.reduce((sum, item) => sum + (item['Deployment On Hand'] || 0), 0);
    const safety = totals.reduce((sum, item) => sum + (item['Saftey On Hand'] || 0), 0);

    // Animate counters
    const statCards = document.querySelectorAll('.stat-number');
    const targets = [totalUnits, depotStock, deployment, safety];

    statCards.forEach((card, index) => {
        card.setAttribute('data-target', targets[index]);
        animateCounter(card, targets[index]);
    });
}

function animateCounter(element, target) {
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
        current += increment;
        step++;
        element.textContent = Math.floor(current).toLocaleString();

        if (step >= steps) {
            clearInterval(timer);
            element.textContent = target.toLocaleString();
        }
    }, duration / steps);
}

// ===================================
// Render Charts
// ===================================

function renderCharts() {
    if (!inventoryData) return;

    renderPoolDistributionChart();
    renderTopDevicesChart();
    renderProcurementChart();
}

// Pool Distribution Chart
function renderPoolDistributionChart() {
    const totals = inventoryData['inventory totals'] || [];

    const depotTotal = totals.reduce((sum, item) => sum + (item['Depot On Hand'] || 0), 0);
    const deploymentTotal = totals.reduce((sum, item) => sum + (item['Deployment On Hand'] || 0), 0);
    const newRemodelTotal = totals.reduce((sum, item) => sum + (item['New/Remodel On Hand'] || 0), 0);
    const safetyTotal = totals.reduce((sum, item) => sum + (item['Saftey On Hand'] || 0), 0);
    const vendorTotal = totals.reduce((sum, item) => sum + (item['Vendor On Hand'] || 0), 0);

    const ctx = document.getElementById('poolChart').getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Depot', 'Deployment', 'New/Remodel', 'Safety', 'Vendor'],
            datasets: [{
                data: [depotTotal, deploymentTotal, newRemodelTotal, safetyTotal, vendorTotal],
                backgroundColor: [
                    'rgba(226, 0, 116, 0.8)',
                    'rgba(0, 255, 255, 0.8)',
                    'rgba(255, 200, 0, 0.8)',
                    'rgba(0, 255, 100, 0.8)',
                    'rgba(150, 100, 255, 0.8)'
                ],
                borderColor: '#1C1C24',
                borderWidth: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#A0A0B0',
                        font: { size: 14, family: 'Inter' },
                        padding: 20
                    }
                }
            }
        }
    });
}

// Top Devices Chart
function renderTopDevicesChart() {
    const totals = inventoryData['inventory totals'] || [];

    // Get top 10 devices by total on hand
    const topDevices = totals
        .filter(item => item['Total On Hand'] > 0)
        .sort((a, b) => (b['Total On Hand'] || 0) - (a['Total On Hand'] || 0))
        .slice(0, 10);

    const ctx = document.getElementById('deviceChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topDevices.map(item => item.Device),
            datasets: [{
                label: 'Quantity',
                data: topDevices.map(item => item['Total On Hand']),
                backgroundColor: 'rgba(226, 0, 116, 0.8)',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#A0A0B0', font: { family: 'Inter' } }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#A0A0B0', font: { family: 'Inter' } }
                }
            }
        }
    });
}

// Procurement Timeline Chart
let procurementChartInstance = null;
let allProcurementOrders = [];

function renderProcurementChart(filterStoreNum = null) {
    const procurementData = inventoryData['REMO Case Procurement Data'] || [];

    // Get last 100 orders
    const recentOrders = procurementData.slice(-100);
    allProcurementOrders = recentOrders;

    // Filter by store if specified (case-insensitive)
    let ordersToDisplay = recentOrders;
    if (filterStoreNum) {
        ordersToDisplay = recentOrders.filter(order =>
            String(order['Store #']).toLowerCase().includes(filterStoreNum.toLowerCase())
        );
    }

    // Keep individual order data with store numbers
    const chartData = ordersToDisplay.map(order => ({
        x: order.Date,
        y: order.Qty || 0,
        storeNum: order['Store #'],
        date: order.Date,
        qty: order.Qty || 0
    }));

    // Sort by date
    chartData.sort((a, b) => {
        if (a.x < b.x) return -1;
        if (a.x > b.x) return 1;
        return 0;
    });

    const ctx = document.getElementById('procurementChart').getContext('2d');

    // Destroy previous chart instance if it exists
    if (procurementChartInstance) {
        procurementChartInstance.destroy();
    }

    // Update chart title with filter status
    const chartTitle = document.querySelector('.chart-header h3');
    if (filterStoreNum) {
        chartTitle.innerHTML = `REMO Case Store Orders <span style="color: #00FFFF; font-weight: 600;">(Filtered: ${ordersToDisplay.length} orders for stores matching "${filterStoreNum}")</span>`;
    } else {
        chartTitle.textContent = 'REMO Case Store Orders (Last 100)';
    }

    // Determine if we should use bar chart for sparse data (5 or fewer points)
    const isSparseData = chartData.length <= 5;
    const chartType = isSparseData ? 'bar' : 'line';

    procurementChartInstance = new Chart(ctx, {
        type: chartType,
        data: {
            datasets: [{
                label: 'REMO Cases Ordered',
                data: chartData,
                borderColor: filterStoreNum ? 'rgba(0, 255, 255, 1)' : 'rgba(226, 0, 116, 1)',
                backgroundColor: filterStoreNum ? 'rgba(0, 255, 255, 0.8)' : 'rgba(226, 0, 116, 0.8)',
                borderWidth: isSparseData ? 2 : 3,
                fill: !isSparseData,
                tension: 0.4,
                pointRadius: isSparseData ? 0 : 5,
                pointHoverRadius: isSparseData ? 0 : 7,
                pointBackgroundColor: filterStoreNum ? 'rgba(0, 255, 255, 1)' : 'rgba(226, 0, 116, 1)',
                pointBorderColor: '#1C1C24',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: 'rgba(226, 0, 116, 1)',
                pointHoverBorderColor: '#1C1C24',
                barThickness: isSparseData ? 40 : undefined,
                maxBarThickness: 60
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#A0A0B0',
                        font: { size: 14, family: 'Inter' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(28, 28, 36, 0.95)',
                    titleColor: '#FFFFFF',
                    bodyColor: '#A0A0B0',
                    borderColor: 'rgba(226, 0, 116, 0.5)',
                    borderWidth: 2,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            const item = tooltipItems[0];
                            const dataPoint = item.raw;
                            return `Store #${dataPoint.storeNum}`;
                        },
                        label: function(context) {
                            const dataPoint = context.raw;
                            return [
                                `Date: ${dataPoint.date}`,
                                `Quantity: ${dataPoint.qty} cases`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        display: !isSparseData
                    },
                    offset: isSparseData,
                    ticks: {
                        color: '#A0A0B0',
                        font: { family: 'Inter', size: 11 },
                        maxRotation: isSparseData ? 0 : 45,
                        minRotation: isSparseData ? 0 : 45,
                        callback: function(value, index, values) {
                            // Show all labels for sparse data
                            if (isSparseData) {
                                const dateStr = chartData[index]?.date || value;
                                if (dateStr && dateStr.includes('T')) {
                                    const date = new Date(dateStr);
                                    return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
                                } else if (dateStr && dateStr.includes('-')) {
                                    const parts = dateStr.split('-');
                                    if (parts.length === 3) {
                                        return `${parts[1]}/${parts[2]}/${parts[0]}`;
                                    }
                                }
                                return dateStr;
                            }

                            // Show every nth label to avoid crowding
                            const skipFactor = chartData.length > 50 ? 5 : chartData.length > 30 ? 3 : 2;
                            if (chartData.length > 20 && index % skipFactor !== 0) {
                                return '';
                            }
                            // Format date to be shorter (MM/DD/YY instead of full timestamp)
                            const dateStr = chartData[index]?.date || value;
                            if (dateStr && dateStr.includes('T')) {
                                const date = new Date(dateStr);
                                return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
                            } else if (dateStr && dateStr.includes('-')) {
                                // Handle YYYY-MM-DD format
                                const parts = dateStr.split('-');
                                if (parts.length === 3) {
                                    return `${parts[1]}/${parts[2]}`;
                                }
                            }
                            return dateStr;
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#A0A0B0',
                        font: { family: 'Inter' },
                        precision: 0
                    },
                    title: {
                        display: true,
                        text: 'Cases Ordered',
                        color: '#A0A0B0',
                        font: { family: 'Inter', size: 12 }
                    }
                }
            }
        }
    });

    // Set up search input event listener
    const storeSearchInput = document.getElementById('storeSearchInput');
    if (storeSearchInput && !storeSearchInput.hasAttribute('data-listener-attached')) {
        storeSearchInput.setAttribute('data-listener-attached', 'true');
        storeSearchInput.addEventListener('input', debounce((e) => {
            const searchValue = e.target.value.trim();
            renderProcurementChart(searchValue || null);
        }, 300));
    }
}

function resetProcurementFilter() {
    const storeSearchInput = document.getElementById('storeSearchInput');
    if (storeSearchInput) {
        storeSearchInput.value = '';
    }
    renderProcurementChart(null);
}

// ===================================
// Utility Functions
// ===================================

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export data functionality (bonus feature)
function exportToCSV() {
    if (!inventoryData) return;

    const data = inventoryData['inventory totals'] || [];
    const csv = [
        ['Bundle/Kit', 'Device', 'Total On Hand', 'Total On Order', 'Depot', 'Deployment', 'New/Remodel', 'Safety', 'Vendor'],
        ...data.map(item => [
            item['Bundle /Kit'],
            item.Device,
            item['Total On Hand'],
            item['Total On Order'],
            item['Depot On Hand'],
            item['Deployment On Hand'],
            item['New/Remodel On Hand'],
            item['Saftey On Hand'],
            item['Vendor On Hand']
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}

// ===================================
// Data Refresh
// ===================================

function updateRefreshTime() {
    const timeEl = document.getElementById('lastRefreshTime');
    const now = new Date();
    const diff = Math.floor((now - lastRefreshTime) / 1000);

    let timeString;
    if (diff < 60) {
        timeString = 'Just now';
    } else if (diff < 3600) {
        const mins = Math.floor(diff / 60);
        timeString = `${mins} min${mins > 1 ? 's' : ''} ago`;
    } else {
        const hours = Math.floor(diff / 3600);
        timeString = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    timeEl.textContent = timeString;
    setTimeout(updateRefreshTime, 10000); // Update every 10 seconds
}

async function refreshData() {
    const btn = document.querySelector('.refresh-btn');
    btn.classList.add('refreshing');

    try {
        await loadData();
        renderInventoryTable();
        renderCharts();
        animateStats();
        generateExecutiveSummary();
        calculateHealthMetrics();
        lastRefreshTime = new Date();
        updateRefreshTime();
    } catch (error) {
        console.error('Error refreshing data:', error);
    } finally {
        setTimeout(() => btn.classList.remove('refreshing'), 1000);
    }
}

// ===================================
// Interactive Drill-Downs
// ===================================

function drillDownFromStat(filterType) {
    // Scroll to inventory section
    document.getElementById('inventory').scrollIntoView({ behavior: 'smooth' });

    // Clear existing filters
    document.getElementById('searchInput').value = '';
    document.getElementById('kitFilter').value = 'all';
    document.getElementById('deviceFilter').value = 'all';

    activeFilters = {
        search: '',
        kit: 'all',
        device: 'all',
        drillDown: filterType
    };

    // Re-render table with drill-down context
    setTimeout(() => {
        renderInventoryTable();
        updateFilterTags();
    }, 500);
}

// ===================================
// Filter Tags
// ===================================

function updateFilterTags() {
    const activeFiltersEl = document.getElementById('activeFilters');
    const filterTagsEl = document.getElementById('filterTags');
    const tags = [];

    if (activeFilters.search) {
        tags.push({ type: 'search', label: `Search: "${activeFilters.search}"` });
    }
    if (activeFilters.kit !== 'all') {
        tags.push({ type: 'kit', label: `Kit: ${activeFilters.kit}` });
    }
    if (activeFilters.device !== 'all') {
        const deviceNames = {
            '1': 'MPDs', '2': 'iPads', '3': 'iPad Cases',
            '5': 'Accessories', '6': 'Phones/Scanners',
            '7': 'Carts/Cables', '9': 'Tablets'
        };
        tags.push({ type: 'device', label: `Device: ${deviceNames[activeFilters.device]}` });
    }
    if (activeFilters.drillDown) {
        const drillDownNames = {
            'total': 'Total Units',
            'depot': 'Depot Stock',
            'deployment': 'In Deployment',
            'safety': 'Safety Pool'
        };
        tags.push({ type: 'drillDown', label: `Focus: ${drillDownNames[activeFilters.drillDown]}` });
    }

    if (tags.length > 0) {
        activeFiltersEl.style.display = 'flex';
        filterTagsEl.innerHTML = tags.map(tag => `
            <div class="filter-tag">
                ${tag.label}
                <button class="filter-tag-remove" onclick="removeFilter('${tag.type}')">&times;</button>
            </div>
        `).join('');
    } else {
        activeFiltersEl.style.display = 'none';
    }
}

function removeFilter(type) {
    if (type === 'search') {
        document.getElementById('searchInput').value = '';
        activeFilters.search = '';
    } else if (type === 'kit') {
        document.getElementById('kitFilter').value = 'all';
        activeFilters.kit = 'all';
    } else if (type === 'device') {
        document.getElementById('deviceFilter').value = 'all';
        activeFilters.device = 'all';
    } else if (type === 'drillDown') {
        delete activeFilters.drillDown;
    }

    renderInventoryTable();
    updateFilterTags();
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('kitFilter').value = 'all';
    document.getElementById('deviceFilter').value = 'all';

    activeFilters = {
        search: '',
        kit: 'all',
        device: 'all'
    };

    renderInventoryTable();
    updateFilterTags();
}

// ===================================
// Table Sorting
// ===================================

function sortTable(column) {
    // Update sort state
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }

    // Update UI
    document.querySelectorAll('.sortable').forEach(th => {
        th.classList.remove('asc', 'desc');
    });
    const th = document.querySelector(`th[data-column="${column}"]`);
    if (th) {
        th.classList.add(currentSort.direction);
    }

    renderInventoryTable();
}

// ===================================
// Table Density
// ===================================

function changeTableDensity() {
    const densities = ['comfortable', 'compact', 'spacious'];
    const currentIndex = densities.indexOf(tableDensity);
    tableDensity = densities[(currentIndex + 1) % densities.length];

    const table = document.getElementById('inventoryTable');
    table.classList.remove('comfortable', 'compact', 'spacious');
    table.classList.add(tableDensity);
}

// ===================================
// Column Visibility
// ===================================

function initColumnSettings() {
    const columns = [
        { id: 'order', label: 'On Order' },
        { id: 'depot', label: 'Depot' },
        { id: 'deployment', label: 'Deployment' },
        { id: 'remodel', label: 'New/Remodel' },
        { id: 'safety', label: 'Safety' },
        { id: 'vendor', label: 'Vendor' }
    ];

    const container = document.getElementById('columnSettingsBody');
    container.innerHTML = columns.map(col => `
        <div class="column-toggle-item">
            <input type="checkbox" id="col-${col.id}" checked onchange="toggleColumn('${col.id}')">
            <label for="col-${col.id}">${col.label}</label>
        </div>
    `).join('');
}

function toggleColumnSettings() {
    const panel = document.getElementById('columnSettings');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleColumn(columnId) {
    const checkbox = document.getElementById(`col-${columnId}`);
    const headers = document.querySelectorAll(`th[data-column="${columnId}"]`);
    const cells = document.querySelectorAll(`td[data-column="${columnId}"]`);

    if (checkbox.checked) {
        hiddenColumns = hiddenColumns.filter(col => col !== columnId);
        headers.forEach(h => h.classList.remove('col-hidden'));
        cells.forEach(c => c.classList.remove('col-hidden'));
    } else {
        hiddenColumns.push(columnId);
        headers.forEach(h => h.classList.add('col-hidden'));
        cells.forEach(c => c.classList.add('col-hidden'));
    }
}

// ===================================
// Executive Summary
// ===================================

function toggleExecutiveSummary() {
    const content = document.getElementById('executiveContent');
    const btn = document.querySelector('.collapse-btn');
    content.classList.toggle('collapsed');
    btn.classList.toggle('collapsed');
}

function generateExecutiveSummary() {
    if (!inventoryData || !inventoryData['inventory totals']) return;

    const totals = inventoryData['inventory totals'];
    const totalUnits = totals.reduce((sum, item) => sum + (item['Total On Hand'] || 0), 0);
    const totalOnOrder = totals.reduce((sum, item) => sum + (item['Total On Order'] || 0), 0);

    // Calculate low stock items (less than 500 units)
    const lowStockItems = totals.filter(item => item['Total On Hand'] > 0 && item['Total On Hand'] < 500);

    // Find highest stock item
    const highestStock = totals.reduce((max, item) =>
        item['Total On Hand'] > max['Total On Hand'] ? item : max
    , totals[0]);

    // Status insight
    const statusText = `Total inventory: ${totalUnits.toLocaleString()} units across ${totals.length} device types. Overall stock levels are ${totalUnits > 100000 ? 'strong' : 'moderate'}.`;
    document.getElementById('insightStatus').textContent = statusText;

    // Alerts
    const alertsText = lowStockItems.length > 0
        ? `${lowStockItems.length} items below 500 units threshold. Review procurement for ${lowStockItems.slice(0, 3).map(i => i.Device).join(', ')}.`
        : 'All items are above minimum thresholds. No critical alerts.';
    document.getElementById('insightAlerts').textContent = alertsText;

    // Key insight
    const keyText = highestStock
        ? `${highestStock.Device} has highest inventory with ${highestStock['Total On Hand'].toLocaleString()} units.`
        : 'Inventory is well distributed across device types.';
    document.getElementById('insightKey').textContent = keyText;

    // Recommended action
    const actionText = totalOnOrder > 0
        ? `${totalOnOrder.toLocaleString()} units pending delivery. Monitor depot capacity for incoming shipments.`
        : 'Consider placing orders for items with declining stock levels.';
    document.getElementById('insightAction').textContent = actionText;
}

// ===================================
// Health Metrics
// ===================================

function calculateHealthMetrics() {
    if (!inventoryData || !inventoryData['inventory totals']) return;

    const totals = inventoryData['inventory totals'];
    const safetyThreshold = 500;
    const targetMax = 20000;

    const lowStock = totals.filter(item => item['Total On Hand'] > 0 && item['Total On Hand'] < safetyThreshold).length;
    const overstock = totals.filter(item => item['Total On Hand'] > targetMax).length;
    const pendingOrders = totals.reduce((sum, item) => sum + (item['Total On Order'] || 0), 0);
    const optimal = totals.filter(item =>
        item['Total On Hand'] >= safetyThreshold && item['Total On Hand'] <= targetMax
    ).length;

    const total = totals.filter(item => item['Total On Hand'] > 0).length;

    // Update counts
    document.getElementById('lowStockCount').textContent = lowStock;
    document.getElementById('overstockCount').textContent = overstock;
    document.getElementById('pendingOrdersCount').textContent = pendingOrders.toLocaleString();
    document.getElementById('optimalStockCount').textContent = optimal;

    // Update bars
    setTimeout(() => {
        document.getElementById('lowStockBar').style.width = `${(lowStock / total) * 100}%`;
        document.getElementById('overstockBar').style.width = `${(overstock / total) * 100}%`;
        document.getElementById('pendingOrdersBar').style.width = `${Math.min((pendingOrders / 50000) * 100, 100)}%`;
        document.getElementById('optimalStockBar').style.width = `${(optimal / total) * 100}%`;
    }, 100);

    // Update descriptions
    document.getElementById('lowStockDesc').textContent = lowStock > 0
        ? `${lowStock} items need restocking`
        : 'All items above threshold';
    document.getElementById('overstockDesc').textContent = overstock > 0
        ? `${overstock} items exceed target`
        : 'No overstock issues';
    document.getElementById('pendingOrdersDesc').textContent = `${pendingOrders.toLocaleString()} units incoming`;
    document.getElementById('optimalStockDesc').textContent = `${optimal} items in healthy range`;
}

// ===================================
// Export Functions
// ===================================

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Header
    pdf.setFillColor(226, 0, 116);
    pdf.rect(0, 0, pageWidth, 30, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.text('T-Mobile A/E Inventory Report', pageWidth / 2, 15, { align: 'center' });
    pdf.setFontSize(12);
    pdf.text(new Date().toLocaleDateString(), pageWidth / 2, 23, { align: 'center' });

    // Stats Summary
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text('Inventory Summary', 15, 45);

    if (inventoryData && inventoryData['inventory totals']) {
        const totals = inventoryData['inventory totals'];
        const totalUnits = totals.reduce((sum, item) => sum + (item['Total On Hand'] || 0), 0);
        const depotStock = totals.reduce((sum, item) => sum + (item['Depot On Hand'] || 0), 0);
        const deployment = totals.reduce((sum, item) => sum + (item['Deployment On Hand'] || 0), 0);
        const safety = totals.reduce((sum, item) => sum + (item['Saftey On Hand'] || 0), 0);

        pdf.setFontSize(12);
        let yPos = 55;
        pdf.text(`Total Units: ${totalUnits.toLocaleString()}`, 15, yPos);
        pdf.text(`Depot Stock: ${depotStock.toLocaleString()}`, 15, yPos + 10);
        pdf.text(`In Deployment: ${deployment.toLocaleString()}`, 15, yPos + 20);
        pdf.text(`Safety Pool: ${safety.toLocaleString()}`, 15, yPos + 30);
    }

    // Save
    pdf.save(`inventory-report-${new Date().toISOString().split('T')[0]}.pdf`);
}

async function exportToExcel() {
    if (!inventoryData || !inventoryData['inventory totals']) return;

    const data = inventoryData['inventory totals'];
    const worksheet = XLSX.utils.json_to_sheet(data.map(item => ({
        'Bundle/Kit': item['Bundle /Kit'],
        'Device': item.Device,
        'Total On Hand': item['Total On Hand'],
        'Total On Order': item['Total On Order'],
        'Depot': item['Depot On Hand'],
        'Deployment': item['Deployment On Hand'],
        'New/Remodel': item['New/Remodel On Hand'],
        'Safety': item['Saftey On Hand'],
        'Vendor': item['Vendor On Hand']
    })));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');

    XLSX.writeFile(workbook, `inventory-export-${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ===================================
// Enhanced Inventory Table Rendering
// ===================================

// Update the existing renderInventoryTable function
const originalRenderInventoryTable = renderInventoryTable;
renderInventoryTable = function(searchTerm) {
    if (!inventoryData) return;

    const tableBody = document.getElementById('inventoryTableBody');
    const kitFilter = document.getElementById('kitFilter').value;
    const deviceFilter = document.getElementById('deviceFilter').value;

    // Update active filters
    activeFilters.search = searchTerm || document.getElementById('searchInput').value;
    activeFilters.kit = kitFilter;
    activeFilters.device = deviceFilter;

    // Select data source based on current view
    let dataSource;
    if (currentView === 'connection') {
        dataSource = inventoryData['Connection Depot On Hand'] || [];
    } else if (currentView === 'prosys') {
        dataSource = inventoryData['Prosys Spare Pool'] || [];
    } else {
        dataSource = inventoryData['inventory totals'] || [];
    }

    // Filter data
    let filteredData = dataSource.filter(item => {
        const matchesSearch = !activeFilters.search ||
            item.Device?.toLowerCase().includes(activeFilters.search.toLowerCase()) ||
            item['Bundle /Kit']?.toLowerCase().includes(activeFilters.search.toLowerCase());

        const matchesKit = activeFilters.kit === 'all' || item['Bundle /Kit'] === activeFilters.kit;
        const matchesDevice = activeFilters.device === 'all' || String(item['Device #s']) === activeFilters.device;

        return matchesSearch && matchesKit && matchesDevice;
    });

    // Apply sorting
    if (currentSort.column) {
        filteredData.sort((a, b) => {
            let aVal, bVal;

            switch (currentSort.column) {
                case 'bundle': aVal = a['Bundle /Kit'] || ''; bVal = b['Bundle /Kit'] || ''; break;
                case 'device': aVal = a.Device || ''; bVal = b.Device || ''; break;
                case 'total': aVal = a['Total On Hand'] || 0; bVal = b['Total On Hand'] || 0; break;
                case 'order': aVal = a['Total On Order'] || 0; bVal = b['Total On Order'] || 0; break;
                case 'depot': aVal = a['Depot On Hand'] || 0; bVal = b['Depot On Hand'] || 0; break;
                case 'deployment': aVal = a['Deployment On Hand'] || 0; bVal = b['Deployment On Hand'] || 0; break;
                case 'remodel': aVal = a['New/Remodel On Hand'] || 0; bVal = b['New/Remodel On Hand'] || 0; break;
                case 'safety': aVal = a['Saftey On Hand'] || 0; bVal = b['Saftey On Hand'] || 0; break;
                case 'vendor': aVal = a['Vendor On Hand'] || 0; bVal = b['Vendor On Hand'] || 0; break;
                default: aVal = 0; bVal = 0;
            }

            if (typeof aVal === 'string') {
                return currentSort.direction === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            } else {
                return currentSort.direction === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });
    }

    // Sort by Bundle #s and Device #s for grouping if not already sorted
    if (!currentSort.column) {
        filteredData.sort((a, b) => {
            const bundleCompare = (a['Bundle #s'] || 0) - (b['Bundle #s'] || 0);
            if (bundleCompare !== 0) return bundleCompare;
            return (a['Device #s'] || 0) - (b['Device #s'] || 0);
        });
    }

    // Render rows with device type grouping
    let currentDeviceType = null;
    let deviceTypeColor = 0;
    const deviceTypeColors = ['device-group-1', 'device-group-2', 'device-group-3'];

    tableBody.innerHTML = filteredData.map(item => {
        const deviceType = item['Device #s'];

        if (deviceType !== currentDeviceType) {
            currentDeviceType = deviceType;
            deviceTypeColor = (deviceTypeColor + 1) % deviceTypeColors.length;
        }

        const totalOnHand = item['Total On Hand'] || 0;
        const quantityClass = totalOnHand > 5000 ? 'quantity-high' :
                             totalOnHand > 1000 ? 'quantity-medium' :
                             'quantity-low';

        return `
            <tr class="${deviceTypeColors[deviceTypeColor]}" data-device-type="${deviceType}">
                <td class="sticky-col" data-label="Bundle/Kit">${item['Bundle /Kit'] || '-'}</td>
                <td data-label="Device"><strong>${item.Device || '-'}</strong></td>
                <td data-label="Total On Hand"><span class="quantity-badge ${quantityClass}">${formatNumber(totalOnHand)}</span></td>
                <td class="col-toggle" data-column="order" data-label="On Order">${formatNumber(item['Total On Order'] || 0)}</td>
                <td class="col-toggle" data-column="depot" data-label="Depot">${formatNumber(item['Depot On Hand'] || 0)}</td>
                <td class="col-toggle" data-column="deployment" data-label="Deployment">${formatNumber(item['Deployment On Hand'] || 0)}</td>
                <td class="col-toggle" data-column="remodel" data-label="New/Remodel">${formatNumber(item['New/Remodel On Hand'] || 0)}</td>
                <td class="col-toggle" data-column="safety" data-label="Safety">${formatNumber(item['Saftey On Hand'] || 0)}</td>
                <td class="col-toggle" data-column="vendor" data-label="Vendor">${formatNumber(item['Vendor On Hand'] || 0)}</td>
            </tr>
        `;
    }).join('');

    if (filteredData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    No results found
                </td>
            </tr>
        `;
    }

    // Reapply hidden columns
    hiddenColumns.forEach(col => {
        document.querySelectorAll(`td[data-column="${col}"]`).forEach(cell => {
            cell.classList.add('col-hidden');
        });
    });

    updateFilterTags();
};

// Update controls to track filters
const originalInitInventoryControls = initInventoryControls;
initInventoryControls = function() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        renderInventoryTable(e.target.value);
    });

    const kitFilter = document.getElementById('kitFilter');
    kitFilter.addEventListener('change', () => {
        renderInventoryTable();
    });

    const deviceFilter = document.getElementById('deviceFilter');
    deviceFilter.addEventListener('change', () => {
        renderInventoryTable();
    });

    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentView = e.target.dataset.view;
            renderInventoryTable();
        });
    });
};

console.log('✓ T-Mobile A/E Inventory Dashboard initialized');
