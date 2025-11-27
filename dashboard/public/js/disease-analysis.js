/**
 * Disease Analysis Module
 * AI-powered tomato disease detection from leaf images
 */

const DiseaseAnalysis = {
    // Disease database for tomatoes
    diseases: {
        early_blight: {
            name: 'Early Blight (Alternaria)',
            severity: 'moderate',
            symptoms: [
                'Dark brown spots with concentric rings (target-like pattern)',
                'Spots start on lower, older leaves',
                'Yellow halo around spots',
                'Leaf yellowing and premature drop'
            ],
            causes: [
                'Fungus Alternaria solani',
                'Warm temperatures (24-29°C)',
                'High humidity (>90%)',
                'Poor air circulation'
            ],
            treatment: [
                'Remove and destroy infected leaves',
                'Apply copper-based fungicide',
                'Improve air circulation',
                'Avoid overhead watering',
                'Rotate crops yearly',
                'Mulch to prevent soil splash'
            ],
            prevention: [
                'Use resistant varieties',
                'Proper spacing between plants',
                'Drip irrigation instead of overhead',
                'Remove plant debris',
                'Apply preventive fungicide in humid conditions'
            ]
        },
        late_blight: {
            name: 'Late Blight (Phytophthora)',
            severity: 'critical',
            symptoms: [
                'Large, irregular brown/black blotches',
                'Water-soaked appearance on leaves',
                'White fuzzy growth on underside',
                'Rapid spread - can kill plant in days',
                'Brown spots on stems and fruits'
            ],
            causes: [
                'Oomycete Phytophthora infestans',
                'Cool temperatures (10-25°C)',
                'Very high humidity (>90%)',
                'Wet, rainy conditions'
            ],
            treatment: [
                ' URGENT: Apply fungicide immediately',
                'Remove severely infected plants',
                'Improve drainage',
                'Increase air circulation',
                'Use copper oxychloride or mancozeb',
                'Apply every 7-10 days in wet conditions'
            ],
            prevention: [
                'Use certified disease-free seeds',
                'Plant resistant varieties',
                'Avoid planting near potatoes',
                'Monitor weather - spray before rain',
                'Space plants widely for airflow'
            ]
        },
        septoria_leaf_spot: {
            name: 'Septoria Leaf Spot',
            severity: 'moderate',
            symptoms: [
                'Small circular spots with dark borders',
                'Gray/tan center with tiny black dots',
                'Starts on lower leaves',
                'Leaves turn yellow and drop',
                'Does not affect fruit directly'
            ],
            causes: [
                'Fungus Septoria lycopersici',
                'Warm wet weather',
                'Overhead watering',
                'Infected plant debris in soil'
            ],
            treatment: [
                'Remove infected lower leaves',
                'Apply chlorothalonil or copper fungicide',
                'Mulch heavily to prevent splash',
                'Prune for better air flow',
                'Water at soil level only'
            ],
            prevention: [
                'Crop rotation (3-4 years)',
                'Clean up all plant debris',
                'Stake plants off ground',
                'Use drip irrigation',
                'Apply preventive fungicide'
            ]
        },
        bacterial_spot: {
            name: 'Bacterial Spot',
            severity: 'moderate',
            symptoms: [
                'Small dark brown/black spots',
                'Yellow halo around spots',
                'Spots may join to form large patches',
                'Affects leaves, stems, and fruits',
                'Fruit spots are raised and scabby'
            ],
            causes: [
                'Bacteria Xanthomonas spp.',
                'Warm humid weather',
                'Water splash spreading bacteria',
                'Contaminated seeds or transplants'
            ],
            treatment: [
                'Remove and destroy infected plant parts',
                'Apply copper-based bactericide',
                'Reduce humidity around plants',
                'Avoid working with wet plants',
                'No cure - focus on prevention'
            ],
            prevention: [
                'Use certified disease-free seeds',
                'Treat seeds with hot water (50°C for 25 min)',
                'Avoid overhead irrigation',
                'Use resistant varieties',
                'Disinfect tools between plants'
            ]
        },
        leaf_mold: {
            name: 'Leaf Mold (Cladosporium)',
            severity: 'low',
            symptoms: [
                'Yellow spots on upper leaf surface',
                'Olive-green to brown fuzzy growth on underside',
                'Mainly affects leaves in greenhouse',
                'Older leaves affected first',
                'Rarely affects fruit'
            ],
            causes: [
                'Fungus Passalora fulva',
                'High humidity (>85%)',
                'Poor ventilation',
                'Common in greenhouse/tunnel'
            ],
            treatment: [
                'Improve ventilation and reduce humidity',
                'Remove infected leaves',
                'Apply sulfur or copper fungicide',
                'Increase spacing between plants',
                'Avoid overhead watering'
            ],
            prevention: [
                'Maintain humidity below 85%',
                'Ensure good air circulation',
                'Use resistant varieties',
                'Heat/ventilate greenhouse properly',
                'Remove lower leaves for airflow'
            ]
        },
        mosaic_virus: {
            name: 'Tomato Mosaic Virus (ToMV)',
            severity: 'high',
            symptoms: [
                'Mottled light and dark green pattern on leaves',
                'Distorted, curled leaves',
                'Stunted plant growth',
                'Reduced fruit size and yield',
                'Yellow streaking on fruits'
            ],
            causes: [
                'Tomato Mosaic Virus',
                'Spread by handling plants',
                'Contaminated tools',
                'Can survive in plant debris for years',
                'No insect vector - mechanical transmission'
            ],
            treatment: [
                '[WARNING] NO CURE - remove infected plants immediately',
                'Destroy infected plants (do not compost)',
                'Disinfect all tools with bleach solution',
                'Wash hands with soap after handling',
                'Plant virus-resistant varieties next season'
            ],
            prevention: [
                'Use certified virus-free seeds/transplants',
                'Do not smoke or use tobacco near plants',
                'Wash hands before working with plants',
                'Disinfect tools regularly',
                'Remove infected plants immediately',
                'Use resistant varieties (Tm-2 gene)'
            ]
        },
        powdery_mildew: {
            name: 'Powdery Mildew',
            severity: 'low',
            symptoms: [
                'White powdery coating on leaves',
                'Starts as small spots, spreads to cover leaf',
                'Leaves may yellow and die',
                'Affects upper leaf surface mainly',
                'Fruit usually not affected'
            ],
            causes: [
                'Fungus Leveillula taurica',
                'Warm days (20-30°C) + cool nights',
                'Moderate humidity (50-70%)',
                'Shaded, crowded conditions'
            ],
            treatment: [
                'Apply sulfur or potassium bicarbonate spray',
                'Neem oil as organic option',
                'Remove severely infected leaves',
                'Improve air circulation',
                'Spray early morning so leaves dry quickly'
            ],
            prevention: [
                'Plant in full sun location',
                'Space plants adequately',
                'Avoid excess nitrogen fertilizer',
                'Use resistant varieties',
                'Apply preventive sulfur in susceptible areas'
            ]
        },
        healthy: {
            name: 'Healthy Plant',
            severity: 'none',
            symptoms: [
                'Uniform dark green leaves',
                'No spots, discoloration, or wilting',
                'Vigorous growth',
                'Normal leaf shape and size'
            ],
            treatment: [
                ' Continue current care practices',
                'Maintain regular monitoring',
                'Keep providing optimal conditions'
            ],
            prevention: [
                'Maintain consistent watering schedule',
                'Apply balanced fertilizer regularly',
                'Monitor for early signs of problems',
                'Ensure good air circulation',
                'Practice crop rotation'
            ]
        }
    },

    // Initialize disease analysis
    init() {
        console.log('[INFO] Initializing disease analysis module...');
        this.setupImageUpload();
        console.log('[SUCCESS] Disease analysis initialized');
    },

    // Setup image upload interface
    setupImageUpload() {
        const uploadBtn = document.getElementById('upload-disease-image');
        const fileInput = document.getElementById('disease-image-input');
        const analyzeBtn = document.getElementById('analyze-disease-btn');

        if (uploadBtn && fileInput) {
            uploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleImageUpload(e.target.files[0]);
                }
            });
        }

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => {
                this.analyzeUploadedImage();
            });
        }
    },

    // Handle image upload
    async handleImageUpload(file) {
        console.log('[INFO] Image uploaded:', file.name);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            if (typeof Notifications !== 'undefined') {
                Notifications.error('Invalid File', 'Please upload an image file (JPG, PNG)');
            }
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            if (typeof Notifications !== 'undefined') {
                Notifications.error('File Too Large', 'Please upload an image smaller than 5MB');
            }
            return;
        }

        // Read and display image
        const reader = new FileReader();
        reader.onload = (e) => {
            this.currentImage = e.target.result;
            this.displayUploadedImage(e.target.result);

            // Auto-analyze
            setTimeout(() => {
                this.analyzeUploadedImage();
            }, 500);
        };
        reader.readAsDataURL(file);
    },

    // Display uploaded image
    displayUploadedImage(imageSrc) {
        const container = document.getElementById('disease-image-preview');
        if (!container) return;

        container.innerHTML = `
            <div class="disease-image-container">
                <img src="${imageSrc}" alt="Uploaded leaf" class="disease-image" />
                <div class="analyzing-overlay" id="analyzing-overlay">
                    <div class="spinner"></div>
                    <p>Analyzing image...</p>
                </div>
            </div>
        `;
    },

    // Analyze uploaded image
    async analyzeUploadedImage() {
        if (!this.currentImage) {
            if (typeof Notifications !== 'undefined') {
                Notifications.warning('No Image', 'Please upload an image first');
            }
            return;
        }

        console.log('[INFO] Analyzing image for diseases...');

        // Show analyzing overlay
        const overlay = document.getElementById('analyzing-overlay');
        if (overlay) overlay.classList.add('active');

        try {
            // Simulate analysis delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Analyze image
            const result = await this.detectDisease(this.currentImage);

            // Hide overlay
            if (overlay) overlay.classList.remove('active');

            // Display results
            this.displayAnalysisResults(result);

            if (typeof Notifications !== 'undefined') {
                Notifications.success('Analysis Complete', `Detected: ${result.disease.name}`);
            }

        } catch (error) {
            console.error('[ERROR] Disease analysis failed:', error);
            if (overlay) overlay.classList.remove('active');

            if (typeof Notifications !== 'undefined') {
                Notifications.error('Analysis Failed', 'Could not analyze image');
            }
        }
    },

    // Detect disease from image (AI analysis)
    async detectDisease(imageSrc) {
        // For now, use heuristic analysis based on image characteristics
        // In production, this would use a trained CNN model

        // Convert image to analyzable format
        const imageData = await this.preprocessImage(imageSrc);

        // Analyze image characteristics
        const features = this.extractImageFeatures(imageData);

        // Classify disease based on features
        const classification = this.classifyDisease(features);

        return classification;
    },

    // Preprocess image
    async preprocessImage(imageSrc) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Resize to 224x224 (standard for CNN models)
                canvas.width = 224;
                canvas.height = 224;
                ctx.drawImage(img, 0, 0, 224, 224);

                // Get image data
                const imageData = ctx.getImageData(0, 0, 224, 224);
                resolve(imageData);
            };
            img.onerror = reject;
            img.src = imageSrc;
        });
    },

    // Extract image features
    extractImageFeatures(imageData) {
        const data = imageData.data;
        let totalR = 0, totalG = 0, totalB = 0;
        let darkPixels = 0, spotCount = 0;
        let yellowishPixels = 0, brownPixels = 0;
        let greenVariance = 0;

        const pixelCount = data.length / 4;

        // Analyze pixel colors
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            totalR += r;
            totalG += g;
            totalB += b;

            // Detect dark spots (potential disease indicators)
            const brightness = (r + g + b) / 3;
            if (brightness < 80) darkPixels++;

            // Detect brownish colors (blight, spots)
            if (r > 100 && g > 50 && g < 150 && b < 100 && r > g) {
                brownPixels++;
            }

            // Detect yellowish colors (chlorosis, stress)
            if (r > 180 && g > 160 && b < 120 && r > b) {
                yellowishPixels++;
            }

            // Check green variance (healthy plants have uniform green)
            if (g > r && g > b) {
                greenVariance += Math.abs(g - 150); // 150 is target healthy green
            }
        }

        const avgR = totalR / pixelCount;
        const avgG = totalG / pixelCount;
        const avgB = totalB / pixelCount;

        const darkSpotRatio = darkPixels / pixelCount;
        const brownRatio = brownPixels / pixelCount;
        const yellowRatio = yellowishPixels / pixelCount;
        const avgGreenVariance = greenVariance / pixelCount;

        return {
            avgR, avgG, avgB,
            darkSpotRatio,
            brownRatio,
            yellowRatio,
            avgGreenVariance,
            brightness: (avgR + avgG + avgB) / 3
        };
    },

    // Classify disease based on features
    classifyDisease(features) {
        let disease = 'healthy';
        let confidence = 0.65; // Base confidence

        // Rule-based classification (simplified AI logic)

        // Check for dark spots - could be Early Blight or Septoria
        if (features.darkSpotRatio > 0.15 && features.brownRatio > 0.10) {
            disease = 'early_blight';
            confidence = 0.75 + (features.darkSpotRatio * 0.5);
        }
        // Large brown/black areas - Late Blight
        else if (features.darkSpotRatio > 0.25 && features.brightness < 100) {
            disease = 'late_blight';
            confidence = 0.80 + (features.darkSpotRatio * 0.4);
        }
        // Many small spots - Septoria or Bacterial Spot
        else if (features.darkSpotRatio > 0.10 && features.darkSpotRatio < 0.20) {
            disease = 'septoria_leaf_spot';
            confidence = 0.70;
        }
        // Yellowish discoloration - Mosaic Virus or nutrient deficiency
        else if (features.yellowRatio > 0.20 && features.avgGreenVariance > 40) {
            disease = 'mosaic_virus';
            confidence = 0.65;
        }
        // White/powdery appearance (low color saturation, high brightness)
        else if (features.avgR > 180 && features.avgG > 180 && features.avgB > 160) {
            disease = 'powdery_mildew';
            confidence = 0.72;
        }
        // Brown patches - could be bacterial
        else if (features.brownRatio > 0.08 && features.yellowRatio > 0.05) {
            disease = 'bacterial_spot';
            confidence = 0.68;
        }
        // Healthy if mostly green with low variance
        else if (features.avgG > features.avgR && features.avgG > features.avgB &&
                 features.avgGreenVariance < 30 && features.darkSpotRatio < 0.05) {
            disease = 'healthy';
            confidence = 0.85;
        }

        // Cap confidence at 95% for rule-based system
        confidence = Math.min(0.95, confidence);

        return {
            disease: this.diseases[disease],
            diseaseKey: disease,
            confidence: Math.round(confidence * 100),
            features
        };
    },

    // Display analysis results
    displayAnalysisResults(result) {
        const container = document.getElementById('disease-analysis-results');
        if (!container) return;

        const disease = result.disease;
        const severityClass = disease.severity || 'none';
        const severityIcon = {
            'critical': '🚨',
            'high': '[HIGH]',
            'moderate': '⚡',
            'low': '[LOW]',
            'none': '[NONE]'
        }[disease.severity] || 'ℹ️';

        let symptomsHTML = '';
        if (disease.symptoms) {
            symptomsHTML = `
                <div class="disease-section">
                    <h4>🔍 Symptoms:</h4>
                    <ul>
                        ${disease.symptoms.map(s => `<li>${s}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let causesHTML = '';
        if (disease.causes) {
            causesHTML = `
                <div class="disease-section">
                    <h4> Causes:</h4>
                    <ul>
                        ${disease.causes.map(c => `<li>${c}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        let treatmentHTML = '';
        if (disease.treatment) {
            treatmentHTML = `
                <div class="disease-section treatment">
                    <h4> Treatment:</h4>
                    <ol>
                        ${disease.treatment.map(t => `<li>${t}</li>`).join('')}
                    </ol>
                </div>
            `;
        }

        let preventionHTML = '';
        if (disease.prevention) {
            preventionHTML = `
                <div class="disease-section prevention">
                    <h4> Prevention:</h4>
                    <ul>
                        ${disease.prevention.map(p => `<li>${p}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="disease-result-card ${severityClass}">
                <div class="disease-header">
                    <h3>${severityIcon} ${disease.name}</h3>
                    <div class="confidence-badge">
                        Confidence: ${result.confidence}%
                    </div>
                </div>

                ${disease.severity !== 'none' ? `
                    <div class="severity-indicator ${severityClass}">
                        Severity: <strong>${disease.severity.toUpperCase()}</strong>
                    </div>
                ` : ''}

                ${symptomsHTML}
                ${causesHTML}
                ${treatmentHTML}
                ${preventionHTML}

                <div class="disease-actions">
                    <button onclick="DiseaseAnalysis.saveAnalysis('${result.diseaseKey}')" class="btn-secondary">
                         Save Analysis
                    </button>
                    <button onclick="DiseaseAnalysis.printReport()" class="btn-secondary">
                         Print Report
                    </button>
                </div>
            </div>
        `;

        // Scroll to results
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    // Save analysis to database
    async saveAnalysis(diseaseKey) {
        try {
            const { data, error } = await window.supabase
                .from('disease_detections')
                .insert([{
                    farm_id: CONFIG.farmId,
                    disease_type: diseaseKey,
                    detection_date: new Date().toISOString(),
                    confidence: this.lastResult?.confidence || 0,
                    status: 'detected'
                }]);

            if (error) throw error;

            if (typeof Notifications !== 'undefined') {
                Notifications.success('Saved', 'Disease analysis saved to records');
            }
        } catch (error) {
            console.error('[ERROR] Failed to save analysis:', error);
        }
    },

    // Print disease report
    printReport() {
        window.print();
    }
};
