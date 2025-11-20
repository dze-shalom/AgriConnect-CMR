/**
 * TensorFlow.js Advanced Machine Learning Module
 * Provides neural network predictions, anomaly detection, and time-series forecasting
 */

const TensorFlowML = {
    // Model instances
    yieldPredictionModel: null,
    anomalyDetectionModel: null,
    forecastingModel: null,

    // Training data cache
    historicalData: [],
    normalizedStats: {
        mean: {},
        std: {}
    },

    // Model configuration
    config: {
        yieldModel: {
            inputFeatures: 8, // temp, humidity, soil, ndvi, rainfall, sunlight, soil_temp, battery
            hiddenLayers: [32, 16, 8],
            outputUnits: 1, // yield prediction
            epochs: 50,
            batchSize: 16,
            learningRate: 0.001
        },
        anomalyModel: {
            encodingDim: 4,
            epochs: 30,
            threshold: 0.15 // reconstruction error threshold
        },
        forecastingModel: {
            lookBack: 24, // hours
            forecastHorizon: 48, // predict next 48 hours
            epochs: 40
        }
    },

    // Initialize TensorFlow ML module
    async init() {
        console.log('[INFO] Initializing TensorFlow.js ML module...');

        try {
            // Check if TensorFlow.js is loaded
            if (typeof tf === 'undefined') {
                throw new Error('TensorFlow.js not loaded');
            }

            console.log(`[INFO] TensorFlow.js version: ${tf.version.tfjs}`);
            console.log(`[INFO] Backend: ${tf.getBackend()}`);

            // Set backend (webgl for GPU acceleration if available)
            await tf.setBackend('webgl');
            await tf.ready();

            // Load or create models
            await this.initializeModels();

            // Load historical data for training
            await this.loadHistoricalData();

            console.log('[SUCCESS] TensorFlow ML module initialized');

        } catch (error) {
            console.error('[ERROR] Failed to initialize TensorFlow ML:', error);
            if (typeof Notifications !== 'undefined') {
                Notifications.warning('ML Module', 'Advanced ML features unavailable');
            }
        }
    },

    // Initialize or load ML models
    async initializeModels() {
        // Try to load saved models from IndexedDB
        try {
            this.yieldPredictionModel = await tf.loadLayersModel('indexeddb://yield-prediction-model');
            console.log('[INFO] Loaded saved yield prediction model');
        } catch (error) {
            console.log('[INFO] Creating new yield prediction model...');
            this.yieldPredictionModel = this.buildYieldPredictionModel();
        }

        try {
            this.anomalyDetectionModel = await tf.loadLayersModel('indexeddb://anomaly-detection-model');
            console.log('[INFO] Loaded saved anomaly detection model');
        } catch (error) {
            console.log('[INFO] Creating new anomaly detection model...');
            this.anomalyDetectionModel = this.buildAnomalyDetectionModel();
        }

        try {
            this.forecastingModel = await tf.loadLayersModel('indexeddb://forecasting-model');
            console.log('[INFO] Loaded saved forecasting model');
        } catch (error) {
            console.log('[INFO] Creating new forecasting model...');
            this.forecastingModel = this.buildForecastingModel();
        }
    },

    // Build neural network for yield prediction
    buildYieldPredictionModel() {
        const model = tf.sequential();

        // Input layer
        model.add(tf.layers.dense({
            inputShape: [this.config.yieldModel.inputFeatures],
            units: this.config.yieldModel.hiddenLayers[0],
            activation: 'relu',
            kernelInitializer: 'heNormal'
        }));

        model.add(tf.layers.dropout({ rate: 0.2 }));

        // Hidden layers
        for (let i = 1; i < this.config.yieldModel.hiddenLayers.length; i++) {
            model.add(tf.layers.dense({
                units: this.config.yieldModel.hiddenLayers[i],
                activation: 'relu',
                kernelInitializer: 'heNormal'
            }));
            model.add(tf.layers.dropout({ rate: 0.15 }));
        }

        // Output layer
        model.add(tf.layers.dense({
            units: this.config.yieldModel.outputUnits,
            activation: 'linear'
        }));

        // Compile model
        model.compile({
            optimizer: tf.train.adam(this.config.yieldModel.learningRate),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        console.log('[INFO] Yield prediction model architecture:');
        model.summary();

        return model;
    },

    // Build autoencoder for anomaly detection
    buildAnomalyDetectionModel() {
        const encodingDim = this.config.anomalyModel.encodingDim;
        const inputDim = this.config.yieldModel.inputFeatures;

        const input = tf.input({ shape: [inputDim] });

        // Encoder
        const encoded = tf.layers.dense({
            units: 16,
            activation: 'relu'
        }).apply(input);

        const encodedDrop = tf.layers.dropout({ rate: 0.1 }).apply(encoded);

        const bottleneck = tf.layers.dense({
            units: encodingDim,
            activation: 'relu',
            name: 'bottleneck'
        }).apply(encodedDrop);

        // Decoder
        const decoded = tf.layers.dense({
            units: 16,
            activation: 'relu'
        }).apply(bottleneck);

        const decodedDrop = tf.layers.dropout({ rate: 0.1 }).apply(decoded);

        const output = tf.layers.dense({
            units: inputDim,
            activation: 'linear'
        }).apply(decodedDrop);

        const model = tf.model({ inputs: input, outputs: output });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError'
        });

        console.log('[INFO] Anomaly detection model architecture:');
        model.summary();

        return model;
    },

    // Build LSTM for time-series forecasting
    buildForecastingModel() {
        const model = tf.sequential();

        // LSTM layers
        model.add(tf.layers.lstm({
            inputShape: [this.config.forecastingModel.lookBack, this.config.yieldModel.inputFeatures],
            units: 64,
            returnSequences: true
        }));

        model.add(tf.layers.dropout({ rate: 0.2 }));

        model.add(tf.layers.lstm({
            units: 32,
            returnSequences: false
        }));

        model.add(tf.layers.dropout({ rate: 0.2 }));

        // Dense layers
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu'
        }));

        // Output layer (predict next values)
        model.add(tf.layers.dense({
            units: this.config.yieldModel.inputFeatures,
            activation: 'linear'
        }));

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        console.log('[INFO] Forecasting model architecture:');
        model.summary();

        return model;
    },

    // Load historical sensor data for training
    async loadHistoricalData() {
        try {
            // Fetch last 30 days of data
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data, error } = await window.supabase
                .from('sensor_readings')
                .select('*')
                .gte('reading_time', thirtyDaysAgo.toISOString())
                .order('reading_time', { ascending: true });

            if (error) throw error;

            this.historicalData = data || [];
            console.log(`[INFO] Loaded ${this.historicalData.length} historical data points`);

            // Calculate normalization statistics
            this.calculateNormalizationStats();

        } catch (error) {
            console.error('[ERROR] Failed to load historical data:', error);
        }
    },

    // Calculate mean and standard deviation for normalization
    calculateNormalizationStats() {
        if (this.historicalData.length === 0) return;

        const features = [
            'air_temperature', 'air_humidity', 'soil_moisture',
            'soil_temperature', 'battery_level'
        ];

        features.forEach(feature => {
            const values = this.historicalData
                .map(d => d[feature])
                .filter(v => v != null && !isNaN(v));

            if (values.length > 0) {
                const sum = values.reduce((a, b) => a + b, 0);
                const mean = sum / values.length;
                const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
                const std = Math.sqrt(variance);

                this.normalizedStats.mean[feature] = mean;
                this.normalizedStats.std[feature] = std || 1; // Prevent division by zero
            }
        });

        console.log('[INFO] Normalization stats calculated:', this.normalizedStats);
    },

    // Normalize feature values
    normalize(value, feature) {
        const mean = this.normalizedStats.mean[feature] || 0;
        const std = this.normalizedStats.std[feature] || 1;
        return (value - mean) / std;
    },

    // Denormalize predicted values
    denormalize(normalizedValue, feature) {
        const mean = this.normalizedStats.mean[feature] || 0;
        const std = this.normalizedStats.std[feature] || 1;
        return normalizedValue * std + mean;
    },

    // Prepare input features from sensor reading
    prepareInputFeatures(reading, ndviScore = 0.7, rainfall = 0, sunlight = 8) {
        return [
            this.normalize(reading.air_temperature || 25, 'air_temperature'),
            this.normalize(reading.air_humidity || 60, 'air_humidity'),
            this.normalize(reading.soil_moisture || 500, 'soil_moisture'),
            ndviScore, // NDVI already 0-1
            rainfall / 100, // mm normalized
            sunlight / 12, // hours normalized
            this.normalize(reading.soil_temperature || 20, 'soil_temperature'),
            this.normalize(reading.battery_level || 100, 'battery_level')
        ];
    },

    // Predict yield using neural network
    async predictYield(sensorData, ndviScore = 0.7, rainfall = 0, sunlight = 8) {
        if (!this.yieldPredictionModel) {
            console.error('[ERROR] Yield prediction model not initialized');
            return null;
        }

        try {
            const features = this.prepareInputFeatures(sensorData, ndviScore, rainfall, sunlight);

            const prediction = await tf.tidy(() => {
                const inputTensor = tf.tensor2d([features]);
                const output = this.yieldPredictionModel.predict(inputTensor);
                return output.dataSync()[0];
            });

            // Denormalize prediction (assuming yield in tons/hectare, 0-10 range)
            const yieldPrediction = Math.max(0, prediction * 10);

            // Calculate confidence based on input quality
            const confidence = this.calculatePredictionConfidence(features);

            return {
                yield: yieldPrediction.toFixed(2),
                confidence: (confidence * 100).toFixed(1),
                unit: 'tons/hectare',
                factors: {
                    temperature: sensorData.air_temperature,
                    humidity: sensorData.air_humidity,
                    soilMoisture: sensorData.soil_moisture,
                    ndvi: ndviScore,
                    rainfall,
                    sunlight
                }
            };

        } catch (error) {
            console.error('[ERROR] Yield prediction failed:', error);
            return null;
        }
    },

    // Calculate prediction confidence
    calculatePredictionConfidence(features) {
        // Confidence based on feature quality (all normalized, should be close to 0)
        const deviation = features.reduce((sum, val) => sum + Math.abs(val), 0) / features.length;
        return Math.max(0.5, 1 - (deviation / 2));
    },

    // Detect anomalies in sensor readings
    async detectAnomalies(sensorData, ndviScore = 0.7, rainfall = 0, sunlight = 8) {
        if (!this.anomalyDetectionModel) {
            console.error('[ERROR] Anomaly detection model not initialized');
            return null;
        }

        try {
            const features = this.prepareInputFeatures(sensorData, ndviScore, rainfall, sunlight);

            const result = await tf.tidy(() => {
                const inputTensor = tf.tensor2d([features]);
                const reconstruction = this.anomalyDetectionModel.predict(inputTensor);

                // Calculate reconstruction error
                const error = tf.losses.meanSquaredError(inputTensor, reconstruction);
                return error.dataSync()[0];
            });

            const isAnomaly = result > this.config.anomalyModel.threshold;
            const anomalyScore = Math.min(1, result / this.config.anomalyModel.threshold);

            return {
                isAnomaly,
                score: anomalyScore.toFixed(3),
                reconstructionError: result.toFixed(4),
                severity: isAnomaly
                    ? (anomalyScore > 0.8 ? 'critical' : (anomalyScore > 0.5 ? 'high' : 'medium'))
                    : 'normal',
                message: isAnomaly
                    ? 'Unusual sensor pattern detected. Verify equipment and conditions.'
                    : 'Sensor readings within normal patterns.'
            };

        } catch (error) {
            console.error('[ERROR] Anomaly detection failed:', error);
            return null;
        }
    },

    // Forecast future sensor values
    async forecastTimeSeries(historicalReadings) {
        if (!this.forecastingModel || historicalReadings.length < this.config.forecastingModel.lookBack) {
            console.error('[ERROR] Insufficient data for forecasting');
            return null;
        }

        try {
            // Prepare sequence data
            const recentReadings = historicalReadings.slice(-this.config.forecastingModel.lookBack);
            const sequence = recentReadings.map(reading =>
                this.prepareInputFeatures(reading, 0.7, 0, 8)
            );

            const prediction = await tf.tidy(() => {
                const inputTensor = tf.tensor3d([sequence]);
                const output = this.forecastingModel.predict(inputTensor);
                return Array.from(output.dataSync());
            });

            // Denormalize predictions
            const forecast = {
                timestamp: new Date(Date.now() + 3600000 * this.config.forecastingModel.forecastHorizon),
                airTemperature: this.denormalize(prediction[0], 'air_temperature').toFixed(1),
                airHumidity: this.denormalize(prediction[1], 'air_humidity').toFixed(1),
                soilMoisture: this.denormalize(prediction[2], 'soil_moisture').toFixed(0),
                soilTemperature: this.denormalize(prediction[6], 'soil_temperature').toFixed(1),
                confidence: 0.75 // Simplified confidence
            };

            return forecast;

        } catch (error) {
            console.error('[ERROR] Time-series forecasting failed:', error);
            return null;
        }
    },

    // Analyze multi-variable correlations
    analyzeCorrelations(sensorReadings) {
        if (sensorReadings.length < 10) {
            return null;
        }

        const features = ['air_temperature', 'air_humidity', 'soil_moisture', 'soil_temperature'];
        const correlations = [];

        for (let i = 0; i < features.length; i++) {
            for (let j = i + 1; j < features.length; j++) {
                const feature1 = features[i];
                const feature2 = features[j];

                const values1 = sensorReadings.map(r => r[feature1]).filter(v => v != null);
                const values2 = sensorReadings.map(r => r[feature2]).filter(v => v != null);

                if (values1.length > 0 && values2.length > 0) {
                    const correlation = this.calculatePearsonCorrelation(values1, values2);

                    correlations.push({
                        feature1,
                        feature2,
                        correlation: correlation.toFixed(3),
                        strength: Math.abs(correlation) > 0.7 ? 'strong' :
                                 (Math.abs(correlation) > 0.4 ? 'moderate' : 'weak'),
                        direction: correlation > 0 ? 'positive' : 'negative'
                    });
                }
            }
        }

        return correlations.sort((a, b) => Math.abs(parseFloat(b.correlation)) - Math.abs(parseFloat(a.correlation)));
    },

    // Calculate Pearson correlation coefficient
    calculatePearsonCorrelation(x, y) {
        const n = Math.min(x.length, y.length);
        if (n === 0) return 0;

        const meanX = x.reduce((a, b) => a + b, 0) / n;
        const meanY = y.reduce((a, b) => a + b, 0) / n;

        let numerator = 0;
        let sumXSquare = 0;
        let sumYSquare = 0;

        for (let i = 0; i < n; i++) {
            const diffX = x[i] - meanX;
            const diffY = y[i] - meanY;
            numerator += diffX * diffY;
            sumXSquare += diffX * diffX;
            sumYSquare += diffY * diffY;
        }

        const denominator = Math.sqrt(sumXSquare * sumYSquare);
        return denominator === 0 ? 0 : numerator / denominator;
    },

    // Train models with new data
    async trainModels(progressCallback) {
        if (this.historicalData.length < 100) {
            console.warn('[WARN] Insufficient data for training (need at least 100 samples)');
            return false;
        }

        try {
            console.log('[INFO] Starting model training...');

            // Prepare training data
            const { inputs, outputs } = this.prepareTrainingData();

            if (inputs.length === 0) {
                console.warn('[WARN] No valid training samples');
                return false;
            }

            // Train yield prediction model
            await this.trainYieldModel(inputs, outputs, progressCallback);

            // Train anomaly detection model
            await this.trainAnomalyModel(inputs, progressCallback);

            // Save models to IndexedDB
            await this.saveModels();

            console.log('[SUCCESS] Model training completed');
            return true;

        } catch (error) {
            console.error('[ERROR] Model training failed:', error);
            return false;
        }
    },

    // Prepare training data from historical readings
    prepareTrainingData() {
        const inputs = [];
        const outputs = [];

        this.historicalData.forEach(reading => {
            if (reading.air_temperature != null && reading.soil_moisture != null) {
                const input = this.prepareInputFeatures(reading, 0.7, 0, 8);

                // Simulated yield output (in real scenario, would come from actual harvest data)
                const yieldValue = this.estimateYield(reading) / 10; // Normalized 0-1

                inputs.push(input);
                outputs.push([yieldValue]);
            }
        });

        return { inputs, outputs };
    },

    // Estimate yield from sensor readings (simplified)
    estimateYield(reading) {
        const tempScore = Math.max(0, 1 - Math.abs(reading.air_temperature - 25) / 15);
        const moistureScore = Math.max(0, 1 - Math.abs(reading.soil_moisture - 500) / 300);
        return (tempScore + moistureScore) * 5; // 0-10 tons/hectare
    },

    // Train yield prediction model
    async trainYieldModel(inputs, outputs, progressCallback) {
        const inputTensor = tf.tensor2d(inputs);
        const outputTensor = tf.tensor2d(outputs);

        const history = await this.yieldPredictionModel.fit(inputTensor, outputTensor, {
            epochs: this.config.yieldModel.epochs,
            batchSize: this.config.yieldModel.batchSize,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (progressCallback) {
                        progressCallback('yield', epoch + 1, this.config.yieldModel.epochs, logs);
                    }
                }
            }
        });

        inputTensor.dispose();
        outputTensor.dispose();

        return history;
    },

    // Train anomaly detection model
    async trainAnomalyModel(inputs, progressCallback) {
        const inputTensor = tf.tensor2d(inputs);

        const history = await this.anomalyDetectionModel.fit(inputTensor, inputTensor, {
            epochs: this.config.anomalyModel.epochs,
            batchSize: 16,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (progressCallback) {
                        progressCallback('anomaly', epoch + 1, this.config.anomalyModel.epochs, logs);
                    }
                }
            }
        });

        inputTensor.dispose();

        return history;
    },

    // Save trained models
    async saveModels() {
        try {
            await this.yieldPredictionModel.save('indexeddb://yield-prediction-model');
            await this.anomalyDetectionModel.save('indexeddb://anomaly-detection-model');
            await this.forecastingModel.save('indexeddb://forecasting-model');
            console.log('[SUCCESS] Models saved to IndexedDB');
        } catch (error) {
            console.error('[ERROR] Failed to save models:', error);
        }
    },

    // Get comprehensive ML insights
    async getMLInsights(currentReading, historicalReadings, ndviScore) {
        const insights = {
            yieldPrediction: null,
            anomalyDetection: null,
            forecast: null,
            correlations: null
        };

        try {
            // Yield prediction
            insights.yieldPrediction = await this.predictYield(currentReading, ndviScore);

            // Anomaly detection
            insights.anomalyDetection = await this.detectAnomalies(currentReading, ndviScore);

            // Time-series forecast
            if (historicalReadings && historicalReadings.length >= this.config.forecastingModel.lookBack) {
                insights.forecast = await this.forecastTimeSeries(historicalReadings);
            }

            // Correlation analysis
            if (historicalReadings && historicalReadings.length >= 10) {
                insights.correlations = this.analyzeCorrelations(historicalReadings);
            }

        } catch (error) {
            console.error('[ERROR] Failed to generate ML insights:', error);
        }

        return insights;
    }
};
