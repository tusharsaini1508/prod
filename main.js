class ProductivityDashboard {
    constructor() {
        this.initializeElements();
        this.initializeState();
        this.initializeCharts();
        this.setupEventListeners();
        this.initializeApp();
    }

    initializeElements() {
        // Core elements
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('overlay');
        this.ctx = this.canvas.getContext('2d');
        
        // Status elements
        this.currentStatusEl = document.getElementById('currentStatus');
        this.statusTextEl = document.getElementById('statusText');
        this.statusIndicatorEl = document.getElementById('statusIndicator');
        
        // Metric elements
        this.productivityScoreEl = document.getElementById('productivityScore');
        this.productivityBarEl = document.getElementById('productivityBar');
        this.workingTimeEl = document.getElementById('workingTime');
        this.idleTimeEl = document.getElementById('idleTime');
        this.personCountEl = document.getElementById('personCount');
        this.headCountEl = document.getElementById('headCount');
        this.fpsEl = document.getElementById('fps');
        
        // Daily overview elements
        this.totalWorkingHoursEl = document.getElementById('totalWorkingHours');
        this.overallProductivityEl = document.getElementById('overallProductivity');
        this.totalIdleHoursEl = document.getElementById('totalIdleHours');
        this.sessionDurationEl = document.getElementById('sessionDuration');
        this.currentDateEl = document.getElementById('currentDate');
        
        // Distribution elements
        this.workingPercentageEl = document.getElementById('workingPercentage');
        this.idlePercentageEl = document.getElementById('idlePercentage');
        this.absentPercentageEl = document.getElementById('absentPercentage');
        
        // Insights elements
        this.peakHourEl = document.getElementById('peakHour');
        this.idleHourEl = document.getElementById('idleHour');
        this.recommendationEl = document.getElementById('recommendation');
        this.insightsListEl = document.getElementById('insightsList');
        
        // Control elements
        this.confSlider = document.getElementById('confSlider');
        this.confValueEl = document.getElementById('confValue');
        this.personConfSlider = document.getElementById('personConfSlider');
        this.personConfValueEl = document.getElementById('personConfValue');
        this.headConfSlider = document.getElementById('headConfSlider');
        this.headConfValueEl = document.getElementById('headConfValue');
        this.showBoxesCheckbox = document.getElementById('showBoxes');
        this.enableAlertsCheckbox = document.getElementById('enableAlerts');
        this.autoSaveCheckbox = document.getElementById('autoSave');
        this.cameraSelect = document.getElementById('cameraSelect');
        
        // Button elements
        this.togglePauseBtn = document.getElementById('togglePause');
        this.captureSnapshotBtn = document.getElementById('captureSnapshot');
        this.toggleFullscreenBtn = document.getElementById('toggleFullscreen');
        this.restartCameraBtn = document.getElementById('restartCamera');
        this.exportReportBtn = document.getElementById('exportReport');
        this.refreshDataBtn = document.getElementById('refreshData');
        this.clearLogBtn = document.getElementById('clearLog');
        this.toggleHeatmapBtn = document.getElementById('toggleHeatmap');
        
        // Date elements
        this.dateSelector = document.getElementById('dateSelector');
        
        // Modal elements
        this.exportModal = document.getElementById('exportModal');
        this.exportConfirmBtn = document.getElementById('exportConfirm');
        this.exportCancelBtn = document.getElementById('exportCancel');
        
        // Loading overlay
        this.loadingOverlay = document.getElementById('loadingOverlay');
        
        // Activity log
        this.activityLogEl = document.getElementById('activityLog');
        
        // Inference engine
        this.engine = new inferencejs.InferenceEngine();
        
        // Chart instances
        this.timelineChart = null;
        this.distributionChart = null;
        
        // Hourly grid
        this.hourlyGridEl = document.querySelector('.hourly-grid');
    }

    initializeState() {
        // Configuration
        this.CONFIG = {
            PROJECT_SLUG: "aura_productivity-boric",
            VERSION: 2,
            PUBLISHABLE_KEY: "rf_57pP4SpVKOULokOdlAvAodyGRpm2",
            DATA_STORAGE_KEY: "productivity_data",
            SESSION_STORAGE_KEY: "current_session"
        };

        // State variables
        this.state = {
            // Detection settings
            confidence: 0.55,
            personConfidence: 0.40,
            headConfidence: 0.30,
            
            // UI settings
            showBoxes: true,
            enableAlerts: false,
            autoSave: true,
            flipCamera: false,
            isPaused: false,
            heatmapView: false,
            
            // Performance tracking
            fps: 0,
            frameTimes: [],
            prevTime: 0,
            
            // Detection tracking
            totalPersonsDetected: 0,
            totalHeadsDetected: 0,
            currentPersons: 0,
            currentHeads: 0,
            
            // Productivity tracking
            sessionStartTime: Date.now(),
            workingStartTime: null,
            idleStartTime: Date.now(),
            totalWorkingTime: 0,
            totalIdleTime: 0,
            lastStatus: null,
            currentDate: new Date().toISOString().split('T')[0],
            
            // Status history for smoothing
            statusHistory: [],
            statusWindow: 30,
            
            // Data storage
            hourlyData: {},
            dailyData: {},
            sessionData: {
                startTime: Date.now(),
                statusChanges: [],
                productivitySamples: []
            },
            
            // Model and camera
            workerId: null,
            stream: null,
            currentCamera: 'environment',
            isModelReady: false,
            isInitialized: false
        };

        // Initialize hourly data structure
        this.initializeHourlyData();
        
        // Load saved data
        this.loadSavedData();
    }

    initializeHourlyData() {
        const hours = Array.from({length: 24}, (_, i) => i);
        hours.forEach(hour => {
            this.state.hourlyData[hour] = {
                workingTime: 0,
                idleTime: 0,
                absentTime: 0,
                statusChanges: 0,
                productivityScore: 0,
                samples: []
            };
        });
    }

    loadSavedData() {
        try {
            const savedData = localStorage.getItem(this.CONFIG.DATA_STORAGE_KEY);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                this.state.dailyData = parsedData.dailyData || {};
                
                // Load today's data if exists
                const today = new Date().toISOString().split('T')[0];
                if (this.state.dailyData[today]) {
                    this.state.hourlyData = this.state.dailyData[today].hourlyData || this.state.hourlyData;
                    this.state.totalWorkingTime = this.state.dailyData[today].totalWorkingTime || 0;
                    this.state.totalIdleTime = this.state.dailyData[today].totalIdleTime || 0;
                }
            }
            
            const sessionData = localStorage.getItem(this.CONFIG.SESSION_STORAGE_KEY);
            if (sessionData) {
                const parsedSession = JSON.parse(sessionData);
                this.state.sessionData = parsedSession;
                
                // Calculate time differences
                const sessionDuration = Date.now() - this.state.sessionData.startTime;
                this.state.totalWorkingTime = this.state.sessionData.totalWorkingTime || 0;
                this.state.totalIdleTime = this.state.sessionData.totalIdleTime || 0;
            }
        } catch (error) {
            console.error('Error loading saved data:', error);
        }
    }

    saveData() {
        if (!this.state.autoSave) return;
        
        try {
            const today = this.state.currentDate;
            
            // Update daily data
            this.state.dailyData[today] = {
                date: today,
                totalWorkingTime: this.state.totalWorkingTime,
                totalIdleTime: this.state.totalIdleTime,
                hourlyData: this.state.hourlyData,
                sessionStart: this.state.sessionStartTime,
                sessionEnd: Date.now()
            };
            
            // Save to localStorage
            localStorage.setItem(this.CONFIG.DATA_STORAGE_KEY, JSON.stringify({
                dailyData: this.state.dailyData,
                lastUpdated: Date.now()
            }));
            
            localStorage.setItem(this.CONFIG.SESSION_STORAGE_KEY, JSON.stringify(this.state.sessionData));
        } catch (error) {
            console.error('Error saving data:', error);
        }
    }

    initializeCharts() {
        // Initialize timeline chart
        this.initTimelineChart();
        
        // Initialize distribution chart
        this.initDistributionChart();
    }

    initTimelineChart() {
        const ctx = document.getElementById('timelineChart').getContext('2d');
        
        this.timelineChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 24}, (_, i) => `${i}:00`),
                datasets: [{
                    label: 'Productivity Score',
                    data: Array(24).fill(0),
                    borderColor: '#4f46e5',
                    backgroundColor: 'rgba(79, 70, 229, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#4f46e5',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        borderWidth: 1,
                        callbacks: {
                            label: (context) => `Productivity: ${context.parsed.y.toFixed(1)}%`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxRotation: 0
                        },
                        title: {
                            display: true,
                            text: 'Time (Hours)',
                            color: '#cbd5e1'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            callback: value => value + '%'
                        },
                        title: {
                            display: true,
                            text: 'Productivity Score',
                            color: '#cbd5e1'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    initDistributionChart() {
        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        this.distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Working', 'Idle', 'Absent'],
                datasets: [{
                    data: [0, 0, 100],
                    backgroundColor: [
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderColor: [
                        '#0da271',
                        '#d97706',
                        '#dc2626'
                    ],
                    borderWidth: 2,
                    borderRadius: 8,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(30, 41, 59, 0.95)',
                        titleColor: '#f8fafc',
                        bodyColor: '#cbd5e1',
                        borderColor: '#475569',
                        callbacks: {
                            label: (context) => `${context.label}: ${context.parsed}%`
                        }
                    }
                }
            }
        });
    }

    setupEventListeners() {
        // Slider events
        this.confSlider.addEventListener('input', (e) => {
            this.state.confidence = e.target.value / 100;
            this.confValueEl.textContent = `${e.target.value}%`;
        });

        this.personConfSlider.addEventListener('input', (e) => {
            this.state.personConfidence = e.target.value / 100;
            this.personConfValueEl.textContent = `${e.target.value}%`;
        });

        this.headConfSlider.addEventListener('input', (e) => {
            this.state.headConfidence = e.target.value / 100;
            this.headConfValueEl.textContent = `${e.target.value}%`;
        });

        // Checkbox events
        this.showBoxesCheckbox.addEventListener('change', (e) => {
            this.state.showBoxes = e.target.checked;
        });

        this.enableAlertsCheckbox.addEventListener('change', (e) => {
            this.state.enableAlerts = e.target.checked;
        });

        this.autoSaveCheckbox.addEventListener('change', (e) => {
            this.state.autoSave = e.target.checked;
        });

        // Button events
        this.togglePauseBtn.addEventListener('click', () => this.togglePause());
        this.captureSnapshotBtn.addEventListener('click', () => this.captureSnapshot());
        this.toggleFullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.restartCameraBtn.addEventListener('click', () => this.restartCamera());
        this.exportReportBtn.addEventListener('click', () => this.showExportModal());
        this.refreshDataBtn.addEventListener('click', () => this.refreshData());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.toggleHeatmapBtn.addEventListener('click', () => this.toggleHeatmap());
        
        // Date selector
        this.dateSelector.addEventListener('change', (e) => {
            this.loadDateData(e.target.value);
        });
        
        // Chart control buttons
        document.querySelectorAll('.btn-chart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-chart').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateChartGranularity(e.target.dataset.granularity);
            });
        });
        
        // Modal events
        this.exportConfirmBtn.addEventListener('click', () => this.exportData());
        this.exportCancelBtn.addEventListener('click', () => this.hideExportModal());
        this.exportModal.querySelector('.modal-close').addEventListener('click', () => this.hideExportModal());
        
        // Window events
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('beforeunload', () => this.cleanup());
        
        // Auto-save interval
        setInterval(() => this.saveData(), 30000); // Save every 30 seconds
    }

    async initializeApp() {
        try {
            this.showLoading('Starting camera...');
            await this.startCamera();
            
            this.showLoading('Loading AI model...');
            await this.loadModel();
            
            this.setCurrentDate();
            this.updateHourlyGrid();
            this.hideLoading();
            
            this.state.isInitialized = true;
            this.startMainLoop();
            
            this.logActivity('Productivity monitoring session started', 'STARTING');
            this.showNotification('System initialized successfully', 'success');
        } catch (error) {
            console.error('Initialization error:', error);
            this.showError('Failed to initialize system. Please check your camera permissions.');
        }
    }

    async startCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: this.state.currentCamera,
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            };

            this.state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.video.srcObject = this.state.stream;

            await new Promise((resolve) => {
                this.video.onloadeddata = () => resolve();
            });

            await this.video.play();

            // Set canvas dimensions
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
            
            return true;
        } catch (error) {
            console.error('Camera error:', error);
            throw new Error('Camera access denied or unavailable.');
        }
    }

    async loadModel() {
        try {
            this.state.workerId = await this.engine.startWorker(
                this.CONFIG.PROJECT_SLUG,
                this.CONFIG.VERSION,
                this.CONFIG.PUBLISHABLE_KEY
            );
            this.state.isModelReady = true;
            console.log('AI model loaded successfully');
            return true;
        } catch (error) {
            console.error('Model loading error:', error);
            throw new Error('Failed to load AI model.');
        }
    }

    calculateIoU(box1, box2) {
        const x1 = Math.max(box1.x - box1.width / 2, box2.x - box2.width / 2);
        const y1 = Math.max(box1.y - box1.height / 2, box2.y - box2.height / 2);
        const x2 = Math.min(box1.x + box1.width / 2, box2.x + box2.width / 2);
        const y2 = Math.min(box1.y + box1.height / 2, box2.y + box2.height / 2);
        
        const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        const area1 = box1.width * box1.height;
        const area2 = box2.width * box2.height;
        
        return intersection / (area1 + area2 - intersection);
    }

    associateHeadsToPersons(persons, heads) {
        const associations = [];
        
        persons.forEach((person, personIndex) => {
            let bestHead = null;
            let bestIoU = 0;
            
            heads.forEach((head, headIndex) => {
                const iou = this.calculateIoU(person.bbox, head.bbox);
                if (iou > bestIoU && iou > 0.1) {
                    bestIoU = iou;
                    bestHead = headIndex;
                }
            });
            
            if (bestHead !== null) {
                associations.push({
                    person: person,
                    head: heads[bestHead],
                    iou: bestIoU
                });
                heads.splice(bestHead, 1);
            } else {
                associations.push({
                    person: person,
                    head: null,
                    iou: 0
                });
            }
        });
        
        return associations;
    }

    determineStatus(associations) {
        if (associations.length === 0) {
            return 'ABSENT';
        }
        
        const hasPersonWithHead = associations.some(assoc => assoc.head !== null);
        return hasPersonWithHead ? 'WORKING' : 'IDLE';
    }

    updateHourlyData(status, duration) {
        const now = new Date();
        const currentHour = now.getHours();
        const hourData = this.state.hourlyData[currentHour];
        
        if (!hourData) return;
        
        if (status === 'WORKING') {
            hourData.workingTime += duration;
        } else if (status === 'IDLE') {
            hourData.idleTime += duration;
        } else {
            hourData.absentTime += duration;
        }
        
        // Calculate productivity score for this hour
        const totalTime = hourData.workingTime + hourData.idleTime + hourData.absentTime;
        hourData.productivityScore = totalTime > 0 ? (hourData.workingTime / totalTime) * 100 : 0;
        
        // Store sample
        hourData.samples.push({
            timestamp: now.getTime(),
            status: status,
            duration: duration
        });
        
        // Keep only recent samples (last 100)
        if (hourData.samples.length > 100) {
            hourData.samples = hourData.samples.slice(-100);
        }
    }

    updateCharts() {
        // Update timeline chart
        const hourlyProductivity = Array.from({length: 24}, (_, i) => {
            const hourData = this.state.hourlyData[i];
            return hourData ? hourData.productivityScore : 0;
        });
        
        this.timelineChart.data.datasets[0].data = hourlyProductivity;
        this.timelineChart.update();
        
        // Update distribution chart
        const totalTime = this.state.totalWorkingTime + this.state.totalIdleTime;
        const workingPercentage = totalTime > 0 ? (this.state.totalWorkingTime / totalTime) * 100 : 0;
        const idlePercentage = totalTime > 0 ? (this.state.totalIdleTime / totalTime) * 100 : 0;
        const absentPercentage = totalTime > 0 ? 0 : 100;
        
        this.distributionChart.data.datasets[0].data = [
            workingPercentage,
            idlePercentage,
            absentPercentage
        ];
        this.distributionChart.update();
        
        // Update percentage displays
        this.workingPercentageEl.textContent = `${workingPercentage.toFixed(1)}%`;
        this.idlePercentageEl.textContent = `${idlePercentage.toFixed(1)}%`;
        this.absentPercentageEl.textContent = `${absentPercentage.toFixed(1)}%`;
    }

    updateHourlyGrid() {
        this.hourlyGridEl.innerHTML = '';
        
        Array.from({length: 24}, (_, hour) => {
            const hourData = this.state.hourlyData[hour];
            const productivityScore = hourData ? hourData.productivityScore : 0;
            
            const hourSlot = document.createElement('div');
            hourSlot.className = 'hour-slot';
            
            // Determine productivity level
            if (productivityScore >= 70) hourSlot.classList.add('productive');
            else if (productivityScore >= 30) hourSlot.classList.add('moderate');
            else hourSlot.classList.add('idle');
            
            // Format time
            const timeLabel = hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            
            hourSlot.innerHTML = `
                <div class="hour-time">${timeLabel}</div>
                <div class="hour-productivity">${productivityScore.toFixed(0)}%</div>
                <div class="hour-duration">${this.formatDuration(hourData ? hourData.workingTime : 0)}</div>
            `;
            
            hourSlot.addEventListener('click', () => this.showHourDetails(hour));
            this.hourlyGridEl.appendChild(hourSlot);
        });
    }

    showHourDetails(hour) {
        const hourData = this.state.hourlyData[hour];
        if (!hourData) return;
        
        const timeLabel = hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`;
        
        this.showNotification(
            `Hour ${timeLabel}: ${hourData.productivityScore.toFixed(1)}% productive ` +
            `(${this.formatDuration(hourData.workingTime)} working, ` +
            `${this.formatDuration(hourData.idleTime)} idle)`,
            'info'
        );
    }

    updateProductivityMetrics(status) {
        const now = Date.now();
        const isWorking = status === 'WORKING';
        const isIdle = status === 'IDLE';
        
        // Update time tracking
        if (isWorking) {
            if (!this.state.workingStartTime) {
                this.state.workingStartTime = now;
            }
            if (this.state.idleStartTime) {
                this.state.totalIdleTime += now - this.state.idleStartTime;
                this.state.idleStartTime = null;
            }
        } else if (isIdle) {
            if (!this.state.idleStartTime) {
                this.state.idleStartTime = now;
            }
            if (this.state.workingStartTime) {
                this.state.totalWorkingTime += now - this.state.workingStartTime;
                this.state.workingStartTime = null;
            }
        } else {
            // ABSENT status
            if (this.state.workingStartTime) {
                this.state.totalWorkingTime += now - this.state.workingStartTime;
                this.state.workingStartTime = null;
            }
            if (this.state.idleStartTime) {
                this.state.totalIdleTime += now - this.state.idleStartTime;
                this.state.idleStartTime = now;
            }
        }
        
        // Calculate durations for hourly data
        const timeDiff = this.state.lastStatusTime ? now - this.state.lastStatusTime : 1000; // 1 second default
        this.updateHourlyData(status, timeDiff);
        this.state.lastStatusTime = now;
        
        // Update UI displays
        this.workingTimeEl.textContent = this.formatDuration(this.state.totalWorkingTime);
        this.idleTimeEl.textContent = this.formatDuration(this.state.totalIdleTime);
        
        const sessionTime = now - this.state.sessionStartTime;
        this.sessionDurationEl.textContent = this.formatDuration(sessionTime);
        
        // Calculate overall productivity
        const totalTime = this.state.totalWorkingTime + this.state.totalIdleTime;
        const overallProductivity = totalTime > 0 ? (this.state.totalWorkingTime / totalTime) * 100 : 0;
        
        this.totalWorkingHoursEl.textContent = this.formatHoursMinutes(this.state.totalWorkingTime);
        this.totalIdleHoursEl.textContent = this.formatHoursMinutes(this.state.totalIdleTime);
        this.overallProductivityEl.textContent = `${overallProductivity.toFixed(1)}%`;
        
        // Update productivity score
        const recentSamples = this.state.statusHistory.slice(-60);
        const productiveSamples = recentSamples.filter(s => s === 'WORKING').length;
        const productivityScore = recentSamples.length > 0 ? (productiveSamples / recentSamples.length) * 100 : 0;
        
        this.productivityScoreEl.textContent = `${productivityScore.toFixed(1)}%`;
        this.productivityBarEl.style.width = `${productivityScore}%`;
        
        // Update status display
        this.updateStatusDisplay(status);
        
        // Update charts
        this.updateCharts();
        this.updateHourlyGrid();
        
        // Generate insights
        this.generateInsights();
    }

    updateStatusDisplay(status) {
        const isWorking = status === 'WORKING';
        const isIdle = status === 'IDLE';
        
        this.currentStatusEl.className = `status-badge ${status.toLowerCase()}`;
        this.statusTextEl.textContent = status;
        this.statusIndicatorEl.className = `status-dot ${status.toLowerCase()}`;
        
        // Update status icon
        const statusIcon = this.currentStatusEl.querySelector('.status-icon');
        if (statusIcon) {
            statusIcon.style.background = isWorking ? '#10b981' : isIdle ? '#f59e0b' : '#ef4444';
        }
    }

    generateInsights() {
        const insights = [];
        const now = new Date();
        
        // Calculate peak productivity hour
        let peakHour = 0;
        let peakProductivity = 0;
        
        Object.entries(this.state.hourlyData).forEach(([hour, data]) => {
            if (data.productivityScore > peakProductivity) {
                peakProductivity = data.productivityScore;
                peakHour = parseInt(hour);
            }
        });
        
        if (peakProductivity > 0) {
            const peakTime = peakHour < 12 ? `${peakHour} AM` : peakHour === 12 ? '12 PM' : `${peakHour - 12} PM`;
            this.peakHourEl.textContent = peakTime;
            insights.push(`Peak productivity at ${peakTime} (${peakProductivity.toFixed(1)}%)`);
        }
        
        // Calculate most idle hour
        let idleHour = 0;
        let maxIdleTime = 0;
        
        Object.entries(this.state.hourlyData).forEach(([hour, data]) => {
            if (data.idleTime > maxIdleTime) {
                maxIdleTime = data.idleTime;
                idleHour = parseInt(hour);
            }
        });
        
        if (maxIdleTime > 0) {
            const idleTimeLabel = idleHour < 12 ? `${idleHour} AM` : idleHour === 12 ? '12 PM' : `${idleHour - 12} PM`;
            this.idleHourEl.textContent = idleTimeLabel;
            insights.push(`Most idle time at ${idleTimeLabel}`);
        }
        
        // Generate recommendations
        const totalTime = this.state.totalWorkingTime + this.state.totalIdleTime;
        const productivityRatio = this.state.totalWorkingTime / totalTime;
        
        if (productivityRatio < 0.3) {
            this.recommendationEl.textContent = 'Focus needed - Consider scheduling breaks strategically';
            insights.push('Low productivity detected. Try the Pomodoro technique: 25 minutes work, 5 minutes break.');
        } else if (productivityRatio < 0.6) {
            this.recommendationEl.textContent = 'Moderate productivity - Room for improvement';
            insights.push('Consider eliminating distractions during peak hours.');
        } else {
            this.recommendationEl.textContent = 'Excellent productivity - Keep up the good work!';
            insights.push('Maintain current routine for optimal performance.');
        }
        
        // Update insights list
        this.updateInsightsList(insights);
    }

    updateInsightsList(insights) {
        this.insightsListEl.innerHTML = '';
        
        insights.slice(0, 3).forEach(insight => {
            const insightItem = document.createElement('div');
            insightItem.className = 'insight-item';
            insightItem.innerHTML = `
                <i class="fas fa-info-circle"></i>
                <span>${insight}</span>
            `;
            this.insightsListEl.appendChild(insightItem);
        });
    }

    drawDetections(persons, heads, associations) {
        if (!this.state.showBoxes) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw person boxes
        persons.forEach(person => {
            const { x, y, width, height } = person.bbox;
            const isWorking = associations.find(a => a.person === person)?.head !== null;
            const color = isWorking ? '#10b981' : '#ef4444';
            
            // Draw bounding box
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(
                x - width / 2,
                y - height / 2,
                width,
                height
            );
            
            // Draw label
            const label = `Person ${Math.round(person.confidence * 100)}%`;
            this.ctx.font = 'bold 16px Inter';
            const textWidth = this.ctx.measureText(label).width;
            
            this.ctx.fillStyle = color + 'CC';
            this.ctx.fillRect(
                x - width / 2,
                y - height / 2 - 25,
                textWidth + 10,
                25
            );
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(label, x - width / 2 + 5, y - height / 2 - 8);
        });
        
        // Draw head boxes
        heads.forEach(head => {
            const { x, y, width, height } = head.bbox;
            const color = '#f59e0b';
            
            // Draw bounding box
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                x - width / 2,
                y - height / 2,
                width,
                height
            );
            
            // Draw label
            const label = `Head ${Math.round(head.confidence * 100)}%`;
            this.ctx.font = '14px Inter';
            const textWidth = this.ctx.measureText(label).width;
            
            this.ctx.fillStyle = color + 'CC';
            this.ctx.fillRect(
                x - width / 2,
                y - height / 2 - 20,
                textWidth + 8,
                20
            );
            
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(label, x - width / 2 + 4, y - height / 2 - 6);
        });
    }

    updateFPS(currentTime) {
        if (this.state.prevTime) {
            const delta = currentTime - this.state.prevTime;
            this.state.frameTimes.push(delta);
            
            if (this.state.frameTimes.length > 30) {
                this.state.frameTimes.shift();
            }
            
            const avgDelta = this.state.frameTimes.reduce((a, b) => a + b) / this.state.frameTimes.length;
            this.state.fps = Math.round(1000 / avgDelta);
            this.fpsEl.textContent = this.state.fps;
            
            // Color code based on FPS
            if (this.state.fps < 15) {
                this.fpsEl.style.color = '#ef4444';
            } else if (this.state.fps < 25) {
                this.fpsEl.style.color = '#f59e0b';
            } else {
                this.fpsEl.style.color = '#10b981';
            }
        }
        this.state.prevTime = currentTime;
    }

    formatDuration(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        } else {
            return `${seconds}s`;
        }
    }

    formatHoursMinutes(ms) {
        const totalMinutes = Math.floor(ms / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        return `${hours}h ${minutes}m`;
    }

    logActivity(message, status = null) {
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${status ? status.toLowerCase() : ''}`;
        logEntry.innerHTML = `
            <span class="log-time">${timeString}</span>
            <span class="log-status ${status ? status.toLowerCase() : ''}">${status || 'INFO'}</span>
            <span class="log-message">${message}</span>
        `;

        this.activityLogEl.prepend(logEntry);
        
        // Keep only recent entries
        if (this.activityLogEl.children.length > 50) {
            this.activityLogEl.removeChild(this.activityLogEl.lastChild);
        }
        
        // Store in session data
        this.state.sessionData.statusChanges.push({
            time: now.getTime(),
            status: status,
            message: message
        });
    }

    clearLog() {
        this.activityLogEl.innerHTML = '';
        this.state.sessionData.statusChanges = [];
        this.logActivity('Activity log cleared', 'INFO');
        this.showNotification('Activity log cleared', 'success');
    }

    captureSnapshot() {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw video frame
        tempCtx.drawImage(this.video, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Overlay detections if showing
        if (this.state.showBoxes) {
            tempCtx.drawImage(this.canvas, 0, 0);
        }
        
        // Add timestamp and status
        tempCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        tempCtx.fillRect(0, tempCanvas.height - 40, tempCanvas.width, 40);
        tempCtx.font = '14px Inter';
        tempCtx.fillStyle = 'white';
        tempCtx.fillText(
            `Productivity Dashboard - ${new Date().toLocaleString()}`,
            10,
            tempCanvas.height - 25
        );
        tempCtx.fillText(
            `Status: ${this.statusTextEl.textContent} | Productivity: ${this.productivityScoreEl.textContent}`,
            10,
            tempCanvas.height - 10
        );

        // Create download link
        const link = document.createElement('a');
        link.download = `productivity-snapshot-${Date.now()}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
        
        this.logActivity('Snapshot captured', 'INFO');
        this.showNotification('Snapshot saved successfully', 'success');
    }

    togglePause() {
        this.state.isPaused = !this.state.isPaused;
        const icon = this.togglePauseBtn.querySelector('i');
        const text = this.togglePauseBtn.querySelector('span');
        
        if (this.state.isPaused) {
            icon.className = 'fas fa-play';
            text.textContent = 'Resume';
            this.logActivity('Detection paused', 'PAUSED');
            this.showNotification('Monitoring paused', 'warning');
        } else {
            icon.className = 'fas fa-pause';
            text.textContent = 'Pause';
            this.logActivity('Detection resumed', 'RESUMED');
            this.showNotification('Monitoring resumed', 'success');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.log(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    toggleHeatmap() {
        this.state.heatmapView = !this.state.heatmapView;
        const icon = this.toggleHeatmapBtn.querySelector('i');
        const text = this.toggleHeatmapBtn.querySelector('span');
        
        if (this.state.heatmapView) {
            icon.className = 'fas fa-table';
            text.textContent = 'Grid View';
            this.showNotification('Heatmap view enabled', 'info');
        } else {
            icon.className = 'fas fa-fire';
            text.textContent = 'Heatmap View';
            this.showNotification('Grid view enabled', 'info');
        }
        
        this.updateHourlyGrid();
    }

    async restartCamera() {
        this.showLoading('Restarting camera...');
        
        // Stop current stream
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
            this.state.stream = null;
        }
        
        // Stop model
        if (this.state.workerId) {
            await this.engine.stopWorker(this.state.workerId);
            this.state.workerId = null;
        }
        
        // Restart camera and model
        try {
            await this.startCamera();
            await this.loadModel();
            this.hideLoading();
            this.logActivity('Camera restarted', 'INFO');
            this.showNotification('Camera restarted successfully', 'success');
        } catch (error) {
            this.showError('Failed to restart camera. Please check permissions.');
        }
    }

    setCurrentDate() {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        this.currentDateEl.textContent = now.toLocaleDateString('en-US', options);
        this.dateSelector.value = now.toISOString().split('T')[0];
    }

    loadDateData(date) {
        // Implementation for loading specific date data
        console.log('Loading data for date:', date);
        this.showNotification(`Loading data for ${date}`, 'info');
    }

    showExportModal() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        document.getElementById('exportStartDate').value = weekAgo;
        document.getElementById('exportEndDate').value = today;
        
        this.exportModal.classList.add('active');
    }

    hideExportModal() {
        this.exportModal.classList.remove('active');
    }

    exportData() {
        const format = document.querySelector('input[name="exportFormat"]:checked').value;
        const startDate = document.getElementById('exportStartDate').value;
        const endDate = document.getElementById('exportEndDate').value;
        
        const exportData = {
            metadata: {
                exportedAt: new Date().toISOString(),
                dateRange: { start: startDate, end: endDate },
                format: format
            },
            summary: {
                totalWorkingTime: this.state.totalWorkingTime,
                totalIdleTime: this.state.totalIdleTime,
                overallProductivity: this.state.totalWorkingTime / (this.state.totalWorkingTime + this.state.totalIdleTime) * 100,
                sessionDuration: Date.now() - this.state.sessionStartTime
            },
            hourlyData: this.state.hourlyData,
            sessionData: this.state.sessionData,
            dailyData: this.state.dailyData
        };
        
        let dataStr, mimeType, extension;
        
        switch (format) {
            case 'csv':
                dataStr = this.convertToCSV(exportData);
                mimeType = 'text/csv';
                extension = 'csv';
                break;
            case 'json':
                dataStr = JSON.stringify(exportData, null, 2);
                mimeType = 'application/json';
                extension = 'json';
                break;
            case 'pdf':
                this.exportAsPDF(exportData);
                return;
        }
        
        const dataBlob = new Blob([dataStr], { type: mimeType });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.download = `productivity-report-${Date.now()}.${extension}`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        this.hideExportModal();
        this.showNotification('Report exported successfully', 'success');
        this.logActivity('Productivity report exported', 'EXPORT');
    }

    convertToCSV(data) {
        // Convert data to CSV format
        const headers = ['Hour', 'Working Time', 'Idle Time', 'Absent Time', 'Productivity Score'];
        const rows = [];
        
        Object.entries(data.hourlyData).forEach(([hour, hourData]) => {
            rows.push([
                hour,
                this.formatDuration(hourData.workingTime),
                this.formatDuration(hourData.idleTime),
                this.formatDuration(hourData.absentTime),
                hourData.productivityScore.toFixed(2)
            ]);
        });
        
        return [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');
    }

    exportAsPDF(data) {
        // For PDF export, we would typically use a library like jsPDF
        // This is a simplified implementation
        this.showNotification('PDF export requires additional libraries. Exporting as JSON instead.', 'warning');
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.download = `productivity-report-${Date.now()}.json`;
        link.href = url;
        link.click();
        
        URL.revokeObjectURL(url);
        this.hideExportModal();
    }

    refreshData() {
        this.loadSavedData();
        this.updateCharts();
        this.updateHourlyGrid();
        this.showNotification('Data refreshed', 'success');
        this.logActivity('Data refreshed from storage', 'REFRESH');
    }

    updateChartGranularity(granularity) {
        // Update chart based on selected granularity
        console.log('Updating chart granularity to:', granularity);
        this.showNotification(`Chart granularity changed to ${granularity}`, 'info');
    }

    showNotification(message, type = 'info') {
        const notificationCenter = document.getElementById('notificationCenter');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notificationCenter.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    showLoading(message) {
        this.loadingOverlay.style.display = 'flex';
        const loaderText = this.loadingOverlay.querySelector('.loader-text');
        if (loaderText) loaderText.textContent = message;
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showError(message) {
        this.showNotification(message, 'error');
        this.logActivity(`ERROR: ${message}`, 'ERROR');
    }

    handleResize() {
        if (this.video.videoWidth && this.video.videoHeight) {
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;
        }
    }

    async processFrame() {
        try {
            const currentTime = performance.now();
            this.updateFPS(currentTime);
            
            // Perform inference
            const image = new inferencejs.CVImage(this.video);
            const predictions = await this.engine.infer(this.state.workerId, image);
            
            // Filter predictions by confidence thresholds
            const persons = predictions.filter(p => 
                p.class.toLowerCase() === 'person' && 
                p.confidence >= this.state.personConfidence
            );
            
            const heads = predictions.filter(p => 
                p.class.toLowerCase() === 'head' && 
                p.confidence >= this.state.headConfidence
            );
            
            // Update detection counts
            this.personCountEl.textContent = persons.length;
            this.headCountEl.textContent = heads.length;
            
            // Associate heads to persons
            const associations = this.associateHeadsToPersons(persons, heads);
            
            // Determine status
            const status = this.determineStatus(associations);
            
            // Update status history for smoothing
            this.state.statusHistory.push(status);
            if (this.state.statusHistory.length > this.state.statusWindow) {
                this.state.statusHistory.shift();
            }
            
            // Get smoothed status (majority vote)
            const statusCounts = this.state.statusHistory.reduce((acc, curr) => {
                acc[curr] = (acc[curr] || 0) + 1;
                return acc;
            }, {});
            
            const smoothedStatus = Object.keys(statusCounts).reduce((a, b) => 
                statusCounts[a] > statusCounts[b] ? a : b
            );
            
            // Update productivity metrics
            this.updateProductivityMetrics(smoothedStatus);
            
            // Draw detections
            this.drawDetections(persons, heads, associations);
            
            // Log status changes
            if (this.state.lastStatus !== smoothedStatus) {
                const statusMessages = {
                    'WORKING': 'Now working',
                    'IDLE': 'Now idle (person detected but head not visible)',
                    'ABSENT': 'No person detected'
                };
                
                this.logActivity(statusMessages[smoothedStatus], smoothedStatus);
                
                // Play alert if enabled
                if (this.state.enableAlerts && this.state.lastStatus !== null) {
                    // Play alert sound
                    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
                    audio.volume = 0.3;
                    audio.play().catch(e => console.log('Audio play failed:', e));
                }
                
                this.state.lastStatus = smoothedStatus;
            }
            
        } catch (error) {
            console.error('Frame processing error:', error);
        }
    }

    startMainLoop() {
        const processFrameLoop = async () => {
            if (!this.state.isPaused && this.state.isModelReady && this.state.isInitialized) {
                await this.processFrame();
            }
            requestAnimationFrame(processFrameLoop);
        };
        
        processFrameLoop();
    }

    cleanup() {
        // Save data before unloading
        this.saveData();
        
        // Stop camera
        if (this.state.stream) {
            this.state.stream.getTracks().forEach(track => track.stop());
        }
        
        // Stop model
        if (this.state.workerId) {
            this.engine.stopWorker(this.state.workerId).catch(console.error);
        }
        
        this.logActivity('Monitoring session ended', 'ENDED');
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new ProductivityDashboard();
    window.dashboard = dashboard; // For debugging
});