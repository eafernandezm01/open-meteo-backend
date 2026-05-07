import express from "express";

const app = express();
const PORT = 3000;

/*
========================================
ESTADO METEOROLÓGICO
========================================
*/

function obtenerEstado(codigo) {

  const estados = {

    0: "soleado",
    1: "mayormente_soleado",
    2: "parcialmente_nublado",
    3: "nublado",

    45: "niebla",
    48: "niebla",

    51: "llovizna",
    53: "llovizna",
    55: "llovizna",

    61: "lluvia",
    63: "lluvia",
    65: "lluvia",

    71: "nieve",
    73: "nieve",
    75: "nieve",

    80: "chubascos",
    81: "chubascos",
    82: "chubascos",

    95: "tormenta",
    96: "tormenta",
    99: "tormenta"

  };

  return estados[codigo] || "desconocido";
}

/*
========================================
DIRECCIÓN DEL VIENTO
========================================
*/

function obtenerDireccionViento(grados) {

  if (grados >= 337.5 || grados < 22.5) return "N";
  if (grados < 67.5) return "NE";
  if (grados < 112.5) return "E";
  if (grados < 157.5) return "SE";
  if (grados < 202.5) return "S";
  if (grados < 247.5) return "SO";
  if (grados < 292.5) return "O";

  return "NO";
}

/*
========================================
OBTENER COORDENADAS
========================================
*/

async function obtenerCoordenadas(ciudad) {

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${ciudad}&count=1&language=es&format=json`;

  const respuesta = await fetch(url);

  const datos = await respuesta.json();

  if (!datos.results || datos.results.length === 0) {

    throw new Error("Ciudad no encontrada");

  }

  return {

    nombre:
      datos.results[0].name,

    provincia:
      datos.results[0].admin1,

    pais:
      datos.results[0].country,

    latitud:
      datos.results[0].latitude,

    longitud:
      datos.results[0].longitude

  };
}

/*
========================================
TIEMPO ACTUAL
========================================
*/

app.get("/tiempo/hoy/:ciudad", async (req, res) => {

  try {

    const { ciudad } = req.params;

    const coordenadas =
      await obtenerCoordenadas(ciudad);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitud}&longitude=${coordenadas.longitud}&current=temperature_2m,relative_humidity_2m,rain,wind_speed_10m,wind_direction_10m,weather_code&daily=temperature_2m_max,temperature_2m_min`;

    const respuesta = await fetch(url);

    const datos = await respuesta.json();

    res.json({

      ubicacion: {

        ciudad:
          coordenadas.nombre,

        provincia:
          coordenadas.provincia,

        pais:
          coordenadas.pais,

        latitud:
          coordenadas.latitud,

        longitud:
          coordenadas.longitud

      },

      temperaturaActual:
        datos.current.temperature_2m,

      temperaturaMaxima:
        datos.daily.temperature_2m_max[0],

      temperaturaMinima:
        datos.daily.temperature_2m_min[0],

      humedad:
        datos.current.relative_humidity_2m,

      lluvia:
        datos.current.rain,

      viento: {

        velocidad:
          datos.current.wind_speed_10m,

        direccionGrados:
          datos.current.wind_direction_10m,

        direccionTexto:
          obtenerDireccionViento(
            datos.current.wind_direction_10m
          )

      },

      estado:
        obtenerEstado(
          datos.current.weather_code
        ),

      unidades: {

        temperatura: "°C",
        viento: "km/h",
        lluvia: "mm",
        humedad: "%"

      }

    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

/*
========================================
PRÓXIMOS DÍAS
========================================
*/

app.get("/tiempo/proximos/:ciudad/:dias", async (req, res) => {

  try {

    const { ciudad, dias } = req.params;

    const coordenadas =
      await obtenerCoordenadas(ciudad);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coordenadas.latitud}&longitude=${coordenadas.longitud}&daily=temperature_2m_max,temperature_2m_min,rain_sum,precipitation_probability_max,wind_speed_10m_max,weather_code&forecast_days=${dias}`;

    const respuesta = await fetch(url);

    const datos = await respuesta.json();

    const resultado = [];

    for (let i = 0; i < datos.daily.time.length; i++) {

      resultado.push({

        fecha:
          datos.daily.time[i],

        temperaturaMaxima:
          datos.daily.temperature_2m_max[i],

        temperaturaMinima:
          datos.daily.temperature_2m_min[i],

        lluvia:
          datos.daily.rain_sum[i],

        probabilidadLluvia:
          datos.daily.precipitation_probability_max[i],

        viento:
          datos.daily.wind_speed_10m_max[i],

        estado:
          obtenerEstado(
            datos.daily.weather_code[i]
          )

      });

    }

    res.json({

      ubicacion: {

        ciudad:
          coordenadas.nombre,

        provincia:
          coordenadas.provincia,

        pais:
          coordenadas.pais,

        latitud:
          coordenadas.latitud,

        longitud:
          coordenadas.longitud

      },

      dias:
        resultado,

      unidades: {

        temperatura: "°C",
        viento: "km/h",
        lluvia: "mm",
        probabilidadLluvia: "%"

      }

    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

});

/*
========================================
INICIAR SERVIDOR
========================================
*/

app.listen(PORT, () => {

  console.log(
    `Servidor funcionando en http://localhost:${PORT}`
  );

});