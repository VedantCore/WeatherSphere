// Load environment variables (for security)
require('dotenv').config();

const express = require("express");
const axios = require("axios");
const app = express();

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// ROUTE 1: Landing Page (GET)
app.get("/", (req, res) => {
  res.render("index", { weather: null, error: null });
});

// ROUTE 2: Autocomplete Suggestions (GET - Background API Call)
// The frontend calls this route while the user types.
app.get("/suggest", async (req, res) => {
  const query = req.query.q;
  // Use the key from your .env file
  const apiKey = process.env.WEATHER_API_KEY;

  if (!query) return res.json([]);

  try {
    // Fetch up to 5 matching cities from the Geo API
    const url = `http://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${apiKey}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (err) {
    console.error("Autocomplete Error:", err.message);
    res.json([]);
  }
});

// ROUTE 3: Handle Weather Search (POST)
// This happens when the user hits "Enter" or clicks "Search"
app.post("/", async (req, res) => {
  const city = req.body.city;
  const apiKey = process.env.WEATHER_API_KEY;
  
  try {
    // STEP 1: Get Exact Location (Lat/Lon/State/Country)
    // We use the Geo API first to ensure we get the right "Paris" or "London"
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${apiKey}`;
    const geoResponse = await axios.get(geoUrl);
    
    if (geoResponse.data.length === 0) {
        return res.render("index", { weather: null, error: "City not found. Please try again." });
    }

    const location = geoResponse.data[0];
    // Format the state name nicely (e.g., ", Texas") if it exists
    const stateName = location.state ? `, ${location.state}` : ""; 

    // STEP 2: Get Weather for that specific Location
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=metric&appid=${apiKey}`;
    const weatherResponse = await axios.get(weatherUrl);
    const data = weatherResponse.data;

    // STEP 3: Format the Date (Day, Time)
    const date = new Date();
    const dateString = date.toLocaleDateString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' });

    // Prepare the data object to send to the frontend
    const weatherData = {
      city: location.name,
      state: stateName,
      country: location.country,
      temp: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      description: data.weather[0].description,
      icon: `http://openweathermap.org/img/wn/${data.weather[0].icon}@4x.png`,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      pressure: data.main.pressure,
      visibility: (data.visibility / 1000).toFixed(1), // Convert meters to km
      time: dateString
    };

    // Render the page with the new data
    res.render("index", { weather: weatherData, error: null });

  } catch (err) {
    console.error("Weather Fetch Error:", err.message);
    res.render("index", { weather: null, error: "Something went wrong. Please check your connection." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`WeatherSphere server running on port ${PORT}`);
});