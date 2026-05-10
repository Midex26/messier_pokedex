// Pure astronomy helpers. RA in decimal hours, Dec/lat/lon/altitude in degrees.

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

function julianDate(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function gmstDeg(jd) {
  const T = (jd - 2451545.0) / 36525;
  const g = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
          + T * T * 0.000387933 - T * T * T / 38710000;
  return ((g % 360) + 360) % 360;
}

function lstDeg(jd, lonDeg) {
  return ((gmstDeg(jd) + lonDeg) % 360 + 360) % 360;
}

function altFromHourAngle(haDeg, decDeg, latDeg) {
  const haR = haDeg * RAD, decR = decDeg * RAD, latR = latDeg * RAD;
  const sinAlt = Math.sin(decR) * Math.sin(latR)
               + Math.cos(decR) * Math.cos(latR) * Math.cos(haR);
  return Math.asin(sinAlt) * DEG;
}

export function objectAltitude(raH, decDeg, date, latDeg, lonDeg) {
  const jd = julianDate(date);
  const ha = (lstDeg(jd, lonDeg) - raH * 15 + 360) % 360;
  return altFromHourAngle(ha, decDeg, latDeg);
}

export function sunAltitude(date, latDeg, lonDeg) {
  const jd = julianDate(date);
  const n = jd - 2451545.0;
  const L = ((280.460 + 0.9856474 * n) % 360 + 360) % 360;
  const g = (((357.528 + 0.9856003 * n) % 360 + 360) % 360) * RAD;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * RAD;
  const eps = 23.439 * RAD;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda)) * DEG;
  const raH = ((ra * 12 / Math.PI) % 24 + 24) % 24;
  const ha = (lstDeg(jd, lonDeg) - raH * 15 + 360) % 360;
  return altFromHourAngle(ha, dec, latDeg);
}
