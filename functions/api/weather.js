export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return new Response(JSON.stringify({ error: "lat and lon query params required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }

  const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max&timezone=auto`;

  try {
    const response = await fetch(apiUrl, {
      headers: { "User-Agent": "weather-app/1.0" }
    });

    if (!response.ok) {
      throw new Error(`API responded with ${response.status}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300, s-maxage=600"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Weather API unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}