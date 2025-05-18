import { debugLog, debugWarn } from '@/lib/logging';
import countries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import nl from 'i18n-iso-countries/langs/nl.json';

countries.registerLocale(en);
countries.registerLocale(nl);
function getFullCountryName(code: string, acceptLang: string = 'en') {
  const locale = acceptLang.slice(0, 2).toLowerCase();
  const fallback = ['en', 'nl'].includes(locale) ? locale : 'en';
  return countries.getName(code, fallback) || code;
}

export async function getGeoData(ip: string, acceptLanguage: string = 'en') {
  const provider = process.env.GEO_PROVIDER?.toLowerCase();

  debugLog("geoService:GEO_PROVIDER:", provider);
  debugLog("geoService:accountId:", process.env.MAXMIND_ACCOUNT_ID);
  debugLog("geoService:licenseKey:", process.env.MAXMIND_LICENSE_KEY);

  if (!ip) return { error: 'No IP provided' };

  switch (provider) {
    case 'maxmind':
      try {
        const accountId = parseInt(process.env.MAXMIND_ACCOUNT_ID || '', 10);
        const licenseKey = process.env.MAXMIND_LICENSE_KEY || '';
        if (!accountId || !licenseKey) throw new Error("Missing MaxMind credentials");

        const { WebServiceClient } = await import('@maxmind/geoip2-node');
        const client = new WebServiceClient(accountId, licenseKey);

        const response = await client.city(ip);
        return {
          provider: 'maxmind',
          country: response.country?.names?.en,
          city: response.city?.names?.en,
          latitude: response.location?.latitude,
          longitude: response.location?.longitude,
        };
      } catch (err: any) {
        console.error("❌ maxmind error:", err);
        return { error: 'MaxMind lookup failed', details: err.message || String(err) };
      }

    case 'ipinfo':
      try {
        const token = process.env.IPINFO_API_KEY || '';
        if (!token) throw new Error("Missing IPINFO_API_KEY");
        debugLog("📦 ipinfo token:", token);

        const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`);
        const data = await res.json();

        debugLog("📦 ipinfo raw response:", data); // 🧠 ADD THIS LINE

        if (!data.loc) throw new Error("Missing 'loc' in ipinfo response");

        const [lat, lon] = data.loc.split(',');
        const fullCountry = getFullCountryName(data.country, acceptLanguage);

        return {
          provider: 'ipinfo',
          country: fullCountry,
          city: data.city,
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
        };
      } catch (err: any) {
        console.error("❌ ipinfo error:", err);
        return { error: 'ipinfo lookup failed', details: err.message || String(err) };
      }

    case 'ipapi':
      try {
        const key = process.env.IPAPI_API_KEY;
        const res = await fetch(`https://api.ipapi.com/${ip}/?access_key=${key}`);
        const data = await res.json();

        return {
          provider: 'ipapi',
          country: data.country_name,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
        };
      } catch (err: any) {
        console.error("❌ ipapi error:", err);
        return { error: 'ipapi lookup failed', details: err.message || String(err) };
      }

    case 'geoip-lite':
    default:
      try {
        const geoip = await import('geoip-lite');
        const data = geoip.lookup(ip);
        if (!data) throw new Error("No result from geoip-lite");
        const fullCountry = getFullCountryName(data.country, acceptLanguage);

        return {
          provider: 'geoip-lite',
          country: fullCountry,
          city: data.city,
          latitude: data.ll?.[0],
          longitude: data.ll?.[1],
        };
      } catch (err: any) {
        console.error("❌ geoip-lite error:", err);
        return { error: 'geoip-lite lookup failed', details: err.message || String(err) };
      }
  }
}