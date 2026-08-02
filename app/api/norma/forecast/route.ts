import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getNormaForecast, mergeForecastSignals, type NormaForecastResponse } from "@/lib/normaForecast";

export const dynamic = "force-dynamic";
export const revalidate = 900;

const cachePath = path.join(process.cwd(), "data", "norma-forecast-cache.json");

async function readForecastCache() {
  try {
    return JSON.parse(await readFile(cachePath, "utf8")) as NormaForecastResponse;
  } catch {
    return null;
  }
}

async function writeForecastCache(forecast: NormaForecastResponse) {
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(cachePath, JSON.stringify(forecast, null, 2), "utf8");
}

export async function GET() {
  const [freshForecast, cachedForecast] = await Promise.all([
    getNormaForecast(),
    readForecastCache()
  ]);

  const forecast: NormaForecastResponse =
    cachedForecast && freshForecast.sourceStatus === "FALLBACK"
      ? {
          ...freshForecast,
          sourceStatus: "DEGRADED",
          signals: cachedForecast.signals
        }
      : {
          ...freshForecast,
          signals: cachedForecast
            ? mergeForecastSignals(freshForecast.signals, cachedForecast.signals, 4)
            : freshForecast.signals
        };

  await writeForecastCache(forecast);

  return NextResponse.json(forecast, {
    headers: {
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800"
    }
  });
}
