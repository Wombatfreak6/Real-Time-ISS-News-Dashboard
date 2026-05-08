import axios from "axios";
import { haversineDistance } from "../utils/haversine";

const ISS_ENDPOINT = "http://api.open-notify.org/iss-now.json";
const POLL_INTERVAL_MS = 15000;

// ==================================================
// SINGLETON STATE
// ==================================================
let _pollingTimer = null;
let _isInflight = false;
let _storeRef = null;
let _started = false;
let _abortCtrl = null;

let _prevLat = null;
let _prevLon = null;
let _prevTimestamp = null;
let _prevSpeed = null;
let _failedAttempts = 0;

// ==================================================
// POLLING LOGIC
// ==================================================
const _pollOnce = async () => {
  if (_isInflight) return;
  _isInflight = true;

  if (_abortCtrl) {
    _abortCtrl.abort();
  }
  _abortCtrl = new AbortController();

  let nextInterval = POLL_INTERVAL_MS;

  try {
    const response = await axios.get(ISS_ENDPOINT, {
      timeout: 10000,
      signal: _abortCtrl.signal,
    });

    const d = response.data;

    if (d.message !== "success" || !d.iss_position) {
      throw new Error("Invalid response from Open Notify");
    }

    const lat = parseFloat(d.iss_position.latitude);
    const lon = parseFloat(d.iss_position.longitude);
    const ts = d.timestamp;
    const alt = 420; // Constant altitude as Open Notify does not provide it

    if (isNaN(lat) || isNaN(lon)) {
      throw new Error("Invalid coordinates received");
    }

    // Compute speed manually
    let computedSpeed = 27600; // default fallback
    if (_prevLat !== null && _prevLon !== null && _prevTimestamp !== null) {
      const distKm = haversineDistance(_prevLat, _prevLon, lat, lon);
      const timeDiffHours = (ts - _prevTimestamp) / 3600;
      if (timeDiffHours > 0) {
        const speedKmph = distKm / timeDiffHours;
        computedSpeed = speedKmph;
      }
    }

    if (!computedSpeed || computedSpeed < 1000 || computedSpeed > 40000) {
      computedSpeed = _prevSpeed || 27600;
    }

    _prevLat = lat;
    _prevLon = lon;
    _prevTimestamp = ts;
    _prevSpeed = computedSpeed;
    _failedAttempts = 0;

    const issData = {
      latitude: lat,
      longitude: lon,
      altitude: alt,
      velocity: computedSpeed,
      timestamp: ts,
    };

    // Store successful response
    _storeRef?.getState().setIssData(issData);
    _storeRef?.getState().setIssError(null);

  } catch (error) {
    if (axios.isCancel(error) || error.name === "AbortError") {
      // Ignored
    } else {
      _failedAttempts += 1;
      
      if (_failedAttempts === 1) nextInterval = 15000;
      else if (_failedAttempts === 2) nextInterval = 30000;
      else if (_failedAttempts === 3) nextInterval = 60000;
      else if (_failedAttempts > 3) {
        // SIMULATION MODE
        nextInterval = 45000;
        
        if (_prevLat !== null && _prevLon !== null) {
          _prevLat += 0.05;
          _prevLon += 0.08;
          
          if (_prevLon > 180) _prevLon -= 360;
          if (_prevLat > 90) _prevLat -= 180;
          
          _prevTimestamp = Math.floor(Date.now() / 1000);
          
          const simulatedData = {
            latitude: _prevLat,
            longitude: _prevLon,
            altitude: 420,
            velocity: _prevSpeed || 27600,
            timestamp: _prevTimestamp,
          };
          
          _storeRef?.getState().setIssData(simulatedData);
          _storeRef?.getState().setIssError("Using simulated telemetry");
        } else {
          // If we have NO previous data to simulate from, just wait 60s
          nextInterval = 60000;
          _storeRef?.getState().setIssError("API unavailable. Retrying in 60s...");
        }
      } else {
        _storeRef?.getState().setIssError(`Failed to fetch ISS data: ${error.message}`);
      }
    }
  } finally {
    _isInflight = false;
    _pollingTimer = setTimeout(_pollOnce, nextInterval);
  }
};

// ==================================================
// PUBLIC EXPORTS
// ==================================================
export const startIssPolling = (store) => {
  if (_started) return;
  _storeRef = store;
  _started = true;
  _pollOnce();
};

export const stopIssPolling = () => {
  clearTimeout(_pollingTimer);
  _abortCtrl?.abort();
  _pollingTimer = null;
  _abortCtrl = null;
  _started = false;
  _isInflight = false;
  _prevLat = null;
  _prevLon = null;
  _prevTimestamp = null;
  _prevSpeed = null;
};

export const refreshIssNow = () => {
  clearTimeout(_pollingTimer);
  _pollOnce();
};

const FALLBACK_CREW = [
  { name: 'Oleg Kononenko',      craft: 'ISS' },
  { name: 'Nikolai Chub',        craft: 'ISS' },
  { name: 'Tracy Dyson',         craft: 'ISS' },
  { name: 'Matthew Dominick',    craft: 'ISS' },
  { name: 'Michael Barratt',     craft: 'ISS' },
  { name: 'Jeanette Epps',       craft: 'ISS' },
  { name: 'Alexander Grebenkin', craft: 'ISS' },
];

export const fetchAstronauts = async () => {
  // Uses a CORS proxy as a safe fallback
  const endpoints = [
    'https://corsproxy.io/?url=http://api.open-notify.org/astros.json',
    'https://api.allorigins.win/raw?url=http://api.open-notify.org/astros.json',
  ];

  for (const url of endpoints) {
    try {
      const response = await axios.get(url, { timeout: 8_000 });
      if (response.data?.people?.length) {
        return response.data;
      }
    } catch {
      // Ignore and try next proxy
    }
  }
  return { number: FALLBACK_CREW.length, people: FALLBACK_CREW };
};
