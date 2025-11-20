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
        const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
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

    // Parse OpenWeather API data
    parseOpenWeatherData(data) {
        const daily = {};

        // Group forecasts by day
        data.list.forEach(item => {
            const date = new Date(item.dt * 1000);
            const dayKey = date.toLocaleDateString('en-US', { weekday: 'short' });

            if (!daily[dayKey]) {
                daily[dayKey] = {
                    day: dayKey,
                    temp: item.main.temp,
                    humidity: item.main.humidity,
                    wind: item.wind.speed,
                    desc: item.weather[0].description,
                    icon: this.getWeatherIcon(item.weather[0].main)
                };
            }
        });

        return Object.values(daily).slice(0, 7);
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
