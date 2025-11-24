/**
 * Weather Module - Weather Forecast Integration
 * Fetches weather data for farm location
 */

const Weather = {
    // Buea, Cameroon coordinates
    location: {
        lat: 4.1560,
        lon: 9.2326,
        name: 'Buea, Cameroon'
    },

    // Note: OpenWeather API key should be configured
    // For demo, using mock data
    apiKey: 'DEMO_MODE', // Replace with actual API key

    // Initialize weather
    async init() {
        console.log('[INFO] Initializing weather module...');

        await this.loadWeather();

        // Refresh every 30 minutes
        setInterval(() => {
            this.loadWeather();
        }, 30 * 60 * 1000);

        console.log('[SUCCESS] Weather initialized');
    },

    // Load weather data
    async loadWeather() {
        try {
            // For demo purposes, using mock data
            // In production, fetch from OpenWeather API
            if (this.apiKey === 'DEMO_MODE') {
                this.renderWeather(this.getMockWeatherData());
                return;
            }

            // Real API call (uncomment when API key is available)
            /*
            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${this.location.lat}&lon=${this.location.lon}&units=metric&appid=${this.apiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            this.renderWeather(this.parseOpenWeatherData(data));
            */

        } catch (error) {
            console.error('[ERROR] Failed to load weather:', error.message);
            document.getElementById('weather-container').innerHTML =
                '<div class="loading">Weather data unavailable</div>';
        }
    },

    // Get mock weather data for demo
    getMockWeatherData() {
        // Generate dynamic day names based on current date
        const days = this.getRelativeDayNames(7);

        const conditions = [
            { icon: '🌤️', desc: 'Partly Cloudy', temp: 27, humidity: 68, wind: 12 },
            { icon: '⛅', desc: 'Cloudy', temp: 25, humidity: 72, wind: 15 },
            { icon: '🌧️', desc: 'Rainy', temp: 23, humidity: 85, wind: 18 },
            { icon: '🌤️', desc: 'Partly Cloudy', temp: 26, humidity: 70, wind: 10 },
            { icon: '☀️', desc: 'Sunny', temp: 28, humidity: 65, wind: 8 },
            { icon: '⛈️', desc: 'Thunderstorm', temp: 24, humidity: 88, wind: 22 },
            { icon: '🌤️', desc: 'Partly Cloudy', temp: 26, humidity: 69, wind: 13 }
        ];

        return days.map((day, i) => ({
            day: day,
            ...conditions[i]
        }));
    },

    // Get relative day names (Today, Tomorrow, Mon, Tue, etc.)
    getRelativeDayNames(count = 7) {
        const dayNames = [];
        const today = new Date();

        for (let i = 0; i < count; i++) {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + i);

            let dayName;
            if (i === 0) {
                dayName = 'Today';
            } else if (i === 1) {
                dayName = 'Tomorrow';
            } else {
                // Get short day name (Mon, Tue, Wed, etc.)
                dayName = futureDate.toLocaleDateString('en-US', { weekday: 'short' });
            }

            dayNames.push(dayName);
        }

        return dayNames;
    },

    // Parse OpenWeather API data
    parseOpenWeatherData(data) {
        const daily = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Group forecasts by day
        const dailyMap = {};
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dateKey = date.toLocaleDateString('en-US');

            if (!dailyMap[dateKey]) {
                // Calculate day offset from today
                const itemDate = new Date(date);
                itemDate.setHours(0, 0, 0, 0);
                const dayOffset = Math.floor((itemDate - today) / (1000 * 60 * 60 * 24));

                let dayName;
                if (dayOffset === 0) {
                    dayName = 'Today';
                } else if (dayOffset === 1) {
                    dayName = 'Tomorrow';
                } else {
                    dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                }

                dailyMap[dateKey] = {
                    day: dayName,
                    temp: Math.round(item.main.temp),
                    humidity: item.main.humidity,
                    wind: Math.round(item.wind.speed * 3.6), // Convert m/s to km/h
                    desc: item.weather[0].description,
                    icon: this.getWeatherIcon(item.weather[0].main)
                };
            }
        });

        return Object.values(dailyMap).slice(0, 7);
    },

    // Get weather icon emoji
    getWeatherIcon(condition) {
        const icons = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Drizzle': '🌦️',
            'Thunderstorm': '⛈️',
            'Snow': '❄️',
            'Mist': '🌫️',
            'Fog': '🌫️'
        };
        return icons[condition] || '🌤️';
    },

    // Render weather forecast
    renderWeather(weatherData) {
        const container = document.getElementById('weather-container');
        if (!container) return;

        container.innerHTML = weatherData.map(day => `
            <div class="weather-card">
                <div class="weather-day">${day.day}</div>
                <div class="weather-icon">${day.icon}</div>
                <div class="weather-temp">${day.temp}°C</div>
                <div class="weather-desc">${day.desc}</div>
                <div class="weather-details">
                    <div class="weather-detail">💧 ${day.humidity}%</div>
                    <div class="weather-detail">💨 ${day.wind} km/h</div>
                </div>
            </div>
        `).join('');
    },

    // Refresh weather
    async refresh() {
        await this.loadWeather();
    }
};
