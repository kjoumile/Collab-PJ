import "./styles.css";

const app = document.querySelector("#app");

const weatherCodes = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Cloudy",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

const state = {
  city: "",
  recentCities: JSON.parse(localStorage.getItem("recent-cities") || "[]"),
  weather: null,
  loading: false,
  error: "",
};

app.innerHTML = `
  <main class="page-shell">
    <section class="hero">
      <p class="eyebrow">Weather tracker</p>
      <h1>City Weather Board</h1>
      <p class="intro">Search a city and keep an eye on simple weather details.</p>
    </section>

    <section class="weather-panel" aria-label="City weather search">
      <form class="search-form" id="search-form">
        <label for="city-input">City</label>
        <div class="search-row">
          <input id="city-input" name="city" type="search" placeholder="London, Tokyo, Madrid..." autocomplete="off" required />
          <button type="submit">Search</button>
        </div>
      </form>

      <div class="status" id="status" role="status" aria-live="polite"></div>
      <div class="result" id="result"></div>
      <div class="recent" id="recent"></div>
    </section>
  </main>
`;

const form = document.querySelector("#search-form");
const input = document.querySelector("#city-input");
const statusBox = document.querySelector("#status");
const resultBox = document.querySelector("#result");
const recentBox = document.querySelector("#recent");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadWeather(input.value.trim());
});

recentBox.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-city]");

  if (!button) {
    return;
  }

  input.value = button.dataset.city;
  await loadWeather(button.dataset.city);
});

render();

async function loadWeather(city) {
  if (!city) {
    return;
  }

  state.city = city;
  state.loading = true;
  state.error = "";
  state.weather = null;
  render();

  try {
    const location = await findCity(city);
    const weather = await fetchWeather(location);

    state.weather = {
      ...weather,
      name: location.name,
      country: location.country,
    };
    state.recentCities = rememberCity(location.name);
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

async function findCity(city) {
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);

  if (!response.ok) {
    throw new Error("Could not reach the city search service.");
  }

  const data = await response.json();
  const [location] = data.results || [];

  if (!location) {
    throw new Error(`No city found for "${city}".`);
  }

  return location;
}

async function fetchWeather({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);

  if (!response.ok) {
    throw new Error("Could not load the weather forecast.");
  }

  const data = await response.json();
  return data.current;
}

function rememberCity(city) {
  const cities = [city, ...state.recentCities.filter((item) => item !== city)].slice(0, 5);
  localStorage.setItem("recent-cities", JSON.stringify(cities));
  return cities;
}

function render() {
  statusBox.textContent = state.loading ? `Loading weather for ${state.city}...` : state.error;
  statusBox.className = `status ${state.error ? "status-error" : ""}`;

  resultBox.innerHTML = state.weather ? createWeatherCard(state.weather) : createEmptyState();
  recentBox.innerHTML = createRecentCities(state.recentCities);
}

function createWeatherCard(weather) {
  return `
    <article class="weather-card">
      <div>
        <p class="label">Now in</p>
        <h2>${weather.name}, ${weather.country}</h2>
        <p class="condition">${weatherCodes[weather.weather_code] || "Weather update"}</p>
      </div>
      <div class="temperature">${Math.round(weather.temperature_2m)}&deg;C</div>
      <dl class="details">
        <div>
          <dt>Humidity</dt>
          <dd>${weather.relative_humidity_2m}%</dd>
        </div>
        <div>
          <dt>Wind</dt>
          <dd>${Math.round(weather.wind_speed_10m)} km/h</dd>
        </div>
      </dl>
    </article>
  `;
}

function createEmptyState() {
  return `
    <article class="empty-state">
      <h2>Ready for a forecast</h2>
      <p>Type a city name to see current temperature, humidity, and wind speed.</p>
    </article>
  `;
}

function createRecentCities(cities) {
  if (!cities.length) {
    return "";
  }

  return `
    <h2>Recent cities</h2>
    <div class="recent-list">
      ${cities.map((city) => `<button type="button" data-city="${city}">${city}</button>`).join("")}
    </div>
  `;
}
