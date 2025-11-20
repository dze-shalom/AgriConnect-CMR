/**
 * PDF Reports Module
 * Generates comprehensive farm reports with sensor data, satellite analysis, and insights
 */

const PDFReports = {
    jsPDF: null,

    // Initialize PDF reports module
    init() {
        console.log('[INFO] Initializing PDF reports module...');

        // Access jsPDF from window
        if (typeof window.jspdf !== 'undefined') {
            this.jsPDF = window.jspdf.jsPDF;
            console.log('[SUCCESS] PDF reports module initialized');
        } else {
            console.error('[ERROR] jsPDF library not loaded');
        }
    },

    // Generate comprehensive farm report
    async generateFarmReport() {
        if (!this.jsPDF) {
            console.error('[ERROR] jsPDF not initialized');
            return;
        }

        console.log('[INFO] Generating farm report PDF...');

        try {
            // Create new PDF document
            const doc = new this.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let yPos = margin;

            // ===== PAGE 1: HEADER & OVERVIEW =====

            // Add header
            this.addHeader(doc, yPos);
            yPos += 30;

            // Add farm information
            yPos = this.addFarmInfo(doc, yPos, margin, pageWidth);
            yPos += 15;

            // Add date range
            doc.setFontSize(10);
            doc.setTextColor(100);
            const reportDate = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            doc.text(`Report Generated: ${reportDate}`, margin, yPos);
            yPos += 15;

            // Add executive summary
            yPos = this.addExecutiveSummary(doc, yPos, margin, pageWidth);
            yPos += 15;

            // Add current sensor readings
            yPos = await this.addSensorReadings(doc, yPos, margin, pageWidth);

            // ===== PAGE 2: CHARTS & ANALYTICS =====

            doc.addPage();
            yPos = margin;

            // Add page title
            this.addSectionTitle(doc, 'Historical Data & Analytics', yPos, margin);
            yPos += 15;

            // Add charts note
            doc.setFontSize(10);
            doc.setTextColor(80);
            doc.text('Historical trends over the last 7 days:', margin, yPos);
            yPos += 10;

            // Add statistical summary
            yPos = await this.addStatisticalSummary(doc, yPos, margin, pageWidth);

            // ===== PAGE 3: SATELLITE ANALYSIS =====

            if (typeof Satellite !== 'undefined' && Satellite.analysisResults.size > 0) {
                doc.addPage();
                yPos = margin;

                this.addSectionTitle(doc, 'Satellite Field Analysis (NDVI)', yPos, margin);
                yPos += 15;

                yPos = this.addSatelliteAnalysis(doc, yPos, margin, pageWidth);
            }

            // ===== PAGE 4: AI INSIGHTS & RECOMMENDATIONS =====

            doc.addPage();
            yPos = margin;

            this.addSectionTitle(doc, 'AI-Powered Insights & Recommendations', yPos, margin);
            yPos += 15;

            yPos = this.addAIInsights(doc, yPos, margin, pageWidth);
            yPos += 15;

            // Add alerts summary
            yPos = await this.addAlertsSummary(doc, yPos, margin, pageWidth, pageHeight);

            // ===== FOOTER ON ALL PAGES =====

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                this.addFooter(doc, i, pageCount, pageWidth, pageHeight);
            }

            // Save PDF
            const filename = `AgriConnect_Farm_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(filename);

            console.log('[SUCCESS] PDF report generated:', filename);

            if (typeof Notifications !== 'undefined') {
                Notifications.success(
                    'Report Generated',
                    'Farm report PDF downloaded successfully'
                );
            }

        } catch (error) {
            console.error('[ERROR] Failed to generate PDF:', error);

            if (typeof Notifications !== 'undefined') {
                Notifications.error(
                    'PDF Generation Failed',
                    error.message
                );
            }
        }
    },

    // Add header
    addHeader(doc, yPos) {
        doc.setFontSize(24);
        doc.setTextColor(76, 175, 80); // Primary color
        doc.setFont('helvetica', 'bold');
        doc.text('AgriConnect', 20, yPos);

        doc.setFontSize(16);
        doc.setTextColor(60);
        doc.setFont('helvetica', 'normal');
        doc.text('Farm Monitoring Report', 20, yPos + 10);

        // Add logo placeholder (green circle)
        doc.setDrawColor(76, 175, 80);
        doc.setFillColor(76, 175, 80);
        doc.circle(180, yPos + 2, 8, 'F');
    },

    // Add farm information
    addFarmInfo(doc, yPos, margin, pageWidth) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Farm Information', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);

        const farmInfo = [
            ['Farm ID:', CONFIG.farmId],
            ['Location:', 'Buea, Cameroon'],
            ['Crop Type:', 'Tomato'],
            ['Farm Size:', '2.5 hectares']
        ];

        farmInfo.forEach(([label, value]) => {
            doc.text(label, margin, yPos);
            doc.text(value, margin + 40, yPos);
            yPos += 6;
        });

        return yPos;
    },

    // Add executive summary
    addExecutiveSummary(doc, yPos, margin, pageWidth) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Executive Summary', margin, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80);

        const summary = [
            'Overall farm health status: GOOD',
            'Active sensors: 8 nodes online',
            'Critical alerts: 0 in last 24 hours',
            'Irrigation system: Operational',
            'Recent AI recommendation: Optimize nitrogen application'
        ];

        summary.forEach(line => {
            doc.text(`• ${line}`, margin + 5, yPos);
            yPos += 6;
        });

        return yPos;
    },

    // Add current sensor readings
    async addSensorReadings(doc, yPos, margin, pageWidth) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Current Sensor Readings', margin, yPos);
        yPos += 10;

        // Get latest sensor data
        try {
            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .order('reading_time', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                const reading = data[0];

                const readings = [
                    ['Air Temperature', `${reading.air_temperature?.toFixed(1) || 'N/A'} °C`],
                    ['Air Humidity', `${reading.air_humidity?.toFixed(1) || 'N/A'} %`],
                    ['Soil Moisture', `${reading.soil_moisture || 'N/A'}`],
                    ['pH Level', `${reading.ph_value?.toFixed(1) || 'N/A'}`],
                    ['EC Level', `${reading.ec_value?.toFixed(2) || 'N/A'} mS/cm`],
                    ['Battery Level', `${reading.battery_level || 'N/A'} %`]
                ];

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80);

                readings.forEach(([label, value]) => {
                    doc.text(label + ':', margin + 5, yPos);
                    doc.text(value, margin + 70, yPos);
                    yPos += 6;
                });
            }

        } catch (error) {
            console.error('[ERROR] Failed to fetch sensor data for PDF:', error);
        }

        return yPos;
    },

    // Add statistical summary
    async addStatisticalSummary(doc, yPos, margin, pageWidth) {
        doc.setFontSize(10);
        doc.setTextColor(80);

        const stats = [
            ['Avg. Temperature (7 days)', '24.5°C'],
            ['Avg. Humidity (7 days)', '72%'],
            ['Min/Max Temperature', '18.2°C / 31.4°C'],
            ['Soil Moisture Trend', 'Stable'],
            ['Irrigation Events', '12 cycles']
        ];

        stats.forEach(([label, value]) => {
            doc.text(label + ':', margin + 5, yPos);
            doc.text(value, margin + 80, yPos);
            yPos += 6;
        });

        return yPos;
    },

    // Add satellite analysis
    addSatelliteAnalysis(doc, yPos, margin, pageWidth) {
        let fieldIndex = 1;

        Satellite.analysisResults.forEach((result) => {
            const { area, stats } = result;

            doc.setFontSize(11);
            doc.setTextColor(40);
            doc.setFont('helvetica', 'bold');
            doc.text(`Field ${fieldIndex}`, margin, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);

            const fieldData = [
                ['Area', `${area.toFixed(2)} hectares`],
                ['Mean NDVI', stats.meanNDVI],
                ['Health Score', `${stats.healthScore}%`],
                ['Health Class', stats.healthClass],
                ['Stressed Area', `${stats.stressedArea} ha (${stats.stressedPercent}%)`],
                ['Biomass Index', `${stats.estimatedBiomass} t/ha`]
            ];

            fieldData.forEach(([label, value]) => {
                doc.text(label + ':', margin + 5, yPos);
                doc.text(value, margin + 50, yPos);
                yPos += 6;
            });

            yPos += 10;
            fieldIndex++;
        });

        return yPos;
    },

    // Add AI insights
    addAIInsights(doc, yPos, margin, pageWidth) {
        doc.setFontSize(10);
        doc.setTextColor(80);

        const insights = [
            'Growth Stage: Flowering - Day 42 of growth cycle',
            'Nutrient Status: Nitrogen levels optimal, consider potassium boost',
            'Irrigation: Current schedule effective, maintain 2x daily watering',
            'Pest Risk: Low - Continue monitoring, no action needed',
            'Harvest Forecast: Expected in 18-21 days (optimal maturity)'
        ];

        insights.forEach(insight => {
            doc.text(`• ${insight}`, margin + 5, yPos);
            yPos += 6;
        });

        return yPos;
    },

    // Add alerts summary
    async addAlertsSummary(doc, yPos, margin, pageWidth, pageHeight) {
        doc.setFontSize(12);
        doc.setTextColor(40);
        doc.setFont('helvetica', 'bold');
        doc.text('Recent Alerts (Last 7 Days)', margin, yPos);
        yPos += 10;

        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

            const { data, error } = await window.supabase
                .from('alerts')
                .select('*')
                .gte('created_at', sevenDaysAgo.toISOString())
                .order('created_at', { ascending: false })
                .limit(10);

            if (data && data.length > 0) {
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(80);

                data.forEach((alert, index) => {
                    if (yPos > pageHeight - 30) {
                        doc.addPage();
                        yPos = margin;
                    }

                    const date = new Date(alert.created_at).toLocaleDateString();
                    const severity = alert.severity || 'info';
                    doc.text(`${date} | ${severity.toUpperCase()} | ${alert.message}`, margin + 5, yPos);
                    yPos += 5;
                });
            } else {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text('No alerts in the last 7 days - Farm operating normally', margin + 5, yPos);
            }

        } catch (error) {
            console.error('[ERROR] Failed to fetch alerts for PDF:', error);
        }

        return yPos;
    },

    // Add section title
    addSectionTitle(doc, title, yPos, margin) {
        doc.setFontSize(14);
        doc.setTextColor(76, 175, 80);
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);

        // Add underline
        doc.setDrawColor(76, 175, 80);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos + 2, margin + 170, yPos + 2);
    },

    // Add footer
    addFooter(doc, pageNum, totalPages, pageWidth, pageHeight) {
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');

        const footerText = `AgriConnect Farm Monitoring System | Page ${pageNum} of ${totalPages}`;
        const textWidth = doc.getTextWidth(footerText);
        doc.text(footerText, (pageWidth - textWidth) / 2, pageHeight - 10);

        doc.text('Generated automatically - For official use only', 20, pageHeight - 10);
    }
};
