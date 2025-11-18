// @ts-nocheck
import React, { useEffect, useState } from "react";

const WeatherTab = ({ onClose }) => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Open-Meteo API (Orlando, FL coordinates) with daily forecast
        const url =
          "https://api.open-meteo.com/v1/forecast?latitude=28.5383&longitude=-81.3792&current=apparent_temperature,temperature_2m,windspeed_10m,winddirection_10m,is_day,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=America/New_York";

        const response = await fetch(url);
        if (!response.ok) throw new Error("Network response was not ok");

        const data = await response.json();

        // Extract current weather data
        const current = data.current;
        const weatherData = {
          location: "Orlando, Florida",
          condition: getWeatherDescription(current.weathercode),
          temperature: `${current.temperature_2m}°C`,
          feelsLike: `${current.apparent_temperature}°C`,
          wind: `${current.windspeed_10m} km/h`,
          windDirection: getWindDirection(current.winddirection_10m),
          isDay: current.is_day === 1,
          forecast: data.daily.time.slice(0, 5).map((date, index) => ({
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            condition: getWeatherDescription(data.daily.weathercode[index]),
            maxTemp: `${data.daily.temperature_2m_max[index]}°C`,
            minTemp: `${data.daily.temperature_2m_min[index]}°C`,
          })),
        };

        setWeather(weatherData);
      } catch (error) {
        console.error("Weather fetch error:", error);
        setWeather({ error: "Failed to load weather data." });
      }
    };

    fetchWeather();
  }, []);

  // Helper function to map weather codes to text
  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      80: "Rain showers",
      81: "Heavy rain showers",
      82: "Violent rain showers",
      95: "Thunderstorm",
      96: "Thunderstorm with hail",
      99: "Thunderstorm with heavy hail",
    };
    return weatherCodes[code] || "Unknown";
  };

  // Helper function to get wind direction from degrees
  const getWindDirection = (degrees) => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  return (
    <section style={{ padding: "1rem", position: "relative" }}>
      <button
        className="close-tab-button"
        aria-label="Close weather tab"
        onClick={onClose}
      >
        ×
      </button>



      <h1>Weather</h1>
      <p>Current weather forecast for Orlando, Florida.</p>

      <div id="weather-content">
        {weather ? (
          weather.error ? (
            <p style={{ color: "red" }}>{weather.error}</p>
          ) : (
            <>
              <div style={{ marginBottom: "2rem" }}>
                <h2>Current Weather</h2>
                <ul>
                  <li>
                    <strong>Location:</strong> {weather.location}
                  </li>
                  <li>
                    <strong>Condition:</strong> {weather.condition} ({weather.isDay ? "Day" : "Night"})
                  </li>
                  <li>
                    <strong>Temperature:</strong> {weather.temperature}
                  </li>
                  <li>
                    <strong>Feels like:</strong> {weather.feelsLike}
                  </li>
                  <li>
                    <strong>Wind:</strong> {weather.wind} from {weather.windDirection}
                  </li>
                </ul>
              </div>

              <div>
                <h2>5-Day Forecast</h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
                  {weather.forecast.map((day, index) => (
                    <div
                      key={index}
                      style={{
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        padding: "1rem",
                        minWidth: "150px",
                        textAlign: "center",
                      }}
                    >
                      <h3>{day.date}</h3>
                      <p>{day.condition}</p>
                      <p>
                        <strong>High:</strong> {day.maxTemp}
                      </p>
                      <p>
                        <strong>Low:</strong> {day.minTemp}
                      </p>
                    </div>
                  ))}
                </div>
              </div>


            </>
          )
        ) : (
          <p>Loading weather...</p>
        )}
      </div>
    </section>
  );
};

export default WeatherTab;
