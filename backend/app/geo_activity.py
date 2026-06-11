"""
Geo Activity Resolver
Privacy-conscious approximate geolocation for the Community "World Activity Map".

Design principles
-----------------
1. PRIVACY FIRST: raw IP addresses are resolved to a coarse COUNTRY level only and
   are NEVER returned to clients. The public output contains aggregated counts per
   country plus a representative (country-centroid) coordinate — no IPs, no PII.
2. OFFLINE-PREFERRED: if an offline MaxMind GeoLite2 database is configured via the
   ``GEOIP_DB_PATH`` environment variable AND the optional ``geoip2`` package is
   installed, it is used (no external network calls). Otherwise a free best-effort
   HTTP batch lookup (ip-api.com) is used as a fallback.
3. GRACEFUL DEGRADATION: private/reserved IPs are skipped; network or library
   failures never raise — they simply yield fewer resolved entries.
4. CACHING: IP -> country resolutions are cached in-process to avoid repeat lookups.
"""

from __future__ import annotations

import ipaddress
import logging
import os
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# In-process cache: ip -> (country_code, country_name) or None when unresolvable.
_IP_CACHE: Dict[str, Optional[Tuple[str, str]]] = {}

# Representative country centroids [latitude, longitude]. Used for stable, privacy
# friendly marker placement (city-level coordinates never leave the server).
COUNTRY_CENTROIDS: Dict[str, Dict[str, object]] = {
    "US": {"name": "United States", "lat": 39.8, "lng": -98.6},
    "CA": {"name": "Canada", "lat": 56.1, "lng": -106.3},
    "MX": {"name": "Mexico", "lat": 23.6, "lng": -102.6},
    "BR": {"name": "Brazil", "lat": -14.2, "lng": -51.9},
    "AR": {"name": "Argentina", "lat": -38.4, "lng": -63.6},
    "CL": {"name": "Chile", "lat": -35.7, "lng": -71.5},
    "CO": {"name": "Colombia", "lat": 4.6, "lng": -74.3},
    "PE": {"name": "Peru", "lat": -9.2, "lng": -75.0},
    "VE": {"name": "Venezuela", "lat": 6.4, "lng": -66.6},
    "GB": {"name": "United Kingdom", "lat": 54.0, "lng": -2.0},
    "IE": {"name": "Ireland", "lat": 53.1, "lng": -7.7},
    "FR": {"name": "France", "lat": 46.6, "lng": 2.2},
    "ES": {"name": "Spain", "lat": 40.0, "lng": -3.7},
    "PT": {"name": "Portugal", "lat": 39.4, "lng": -8.2},
    "DE": {"name": "Germany", "lat": 51.2, "lng": 10.4},
    "IT": {"name": "Italy", "lat": 41.9, "lng": 12.6},
    "NL": {"name": "Netherlands", "lat": 52.1, "lng": 5.3},
    "BE": {"name": "Belgium", "lat": 50.5, "lng": 4.5},
    "CH": {"name": "Switzerland", "lat": 46.8, "lng": 8.2},
    "AT": {"name": "Austria", "lat": 47.5, "lng": 14.6},
    "PL": {"name": "Poland", "lat": 51.9, "lng": 19.1},
    "SE": {"name": "Sweden", "lat": 60.1, "lng": 18.6},
    "NO": {"name": "Norway", "lat": 60.5, "lng": 8.5},
    "FI": {"name": "Finland", "lat": 61.9, "lng": 25.7},
    "DK": {"name": "Denmark", "lat": 56.3, "lng": 9.5},
    "CZ": {"name": "Czechia", "lat": 49.8, "lng": 15.5},
    "GR": {"name": "Greece", "lat": 39.1, "lng": 21.8},
    "RO": {"name": "Romania", "lat": 45.9, "lng": 25.0},
    "UA": {"name": "Ukraine", "lat": 48.4, "lng": 31.2},
    "RU": {"name": "Russia", "lat": 61.5, "lng": 105.3},
    "TR": {"name": "Turkey", "lat": 39.0, "lng": 35.2},
    "IL": {"name": "Israel", "lat": 31.0, "lng": 34.9},
    "SA": {"name": "Saudi Arabia", "lat": 23.9, "lng": 45.1},
    "AE": {"name": "United Arab Emirates", "lat": 23.4, "lng": 53.8},
    "EG": {"name": "Egypt", "lat": 26.8, "lng": 30.8},
    "ZA": {"name": "South Africa", "lat": -30.6, "lng": 22.9},
    "NG": {"name": "Nigeria", "lat": 9.1, "lng": 8.7},
    "KE": {"name": "Kenya", "lat": -0.0, "lng": 37.9},
    "MA": {"name": "Morocco", "lat": 31.8, "lng": -7.1},
    "IN": {"name": "India", "lat": 20.6, "lng": 79.0},
    "PK": {"name": "Pakistan", "lat": 30.4, "lng": 69.3},
    "BD": {"name": "Bangladesh", "lat": 23.7, "lng": 90.4},
    "CN": {"name": "China", "lat": 35.9, "lng": 104.2},
    "JP": {"name": "Japan", "lat": 36.2, "lng": 138.3},
    "KR": {"name": "South Korea", "lat": 35.9, "lng": 127.8},
    "TW": {"name": "Taiwan", "lat": 23.7, "lng": 121.0},
    "HK": {"name": "Hong Kong", "lat": 22.3, "lng": 114.2},
    "TH": {"name": "Thailand", "lat": 15.9, "lng": 100.99},
    "VN": {"name": "Vietnam", "lat": 14.1, "lng": 108.3},
    "PH": {"name": "Philippines", "lat": 12.9, "lng": 121.8},
    "ID": {"name": "Indonesia", "lat": -0.8, "lng": 113.9},
    "MY": {"name": "Malaysia", "lat": 4.2, "lng": 101.98},
    "SG": {"name": "Singapore", "lat": 1.35, "lng": 103.8},
    "AU": {"name": "Australia", "lat": -25.3, "lng": 133.8},
    "NZ": {"name": "New Zealand", "lat": -40.9, "lng": 174.9},
}


def _is_public_ip(ip: str) -> bool:
    """Return True only for routable, public IP addresses."""
    try:
        addr = ipaddress.ip_address(ip.strip())
    except ValueError:
        return False
    return not (
        addr.is_private
        or addr.is_loopback
        or addr.is_link_local
        or addr.is_multicast
        or addr.is_reserved
        or addr.is_unspecified
    )


class GeoActivityResolver:
    """Resolves a set of IP-aggregated rows into country-level activity buckets."""

    def __init__(self) -> None:
        self._geoip_reader = self._try_open_geoip()

    @staticmethod
    def _try_open_geoip():
        """Open an offline GeoLite2 reader if available; else return None."""
        db_path = os.environ.get("GEOIP_DB_PATH")
        if not db_path or not os.path.isfile(db_path):
            return None
        try:
            import geoip2.database  # type: ignore

            return geoip2.database.Reader(db_path)
        except Exception as exc:  # pragma: no cover - optional dependency
            logger.info("GeoIP offline DB unavailable (%s); using fallback.", exc)
            return None

    # ------------------------------------------------------------------ resolve
    def _resolve_offline(self, ip: str) -> Optional[Tuple[str, str]]:
        if not self._geoip_reader:
            return None
        try:
            resp = self._geoip_reader.country(ip)
            code = (resp.country.iso_code or "").upper()
            name = resp.country.name or code
            return (code, name) if code else None
        except Exception:
            return None

    def _resolve_batch_http(self, ips: List[str]) -> Dict[str, Tuple[str, str]]:
        """Best-effort batch lookup via ip-api.com (only minimal fields requested)."""
        resolved: Dict[str, Tuple[str, str]] = {}
        if not ips:
            return resolved
        try:
            import requests  # already a project dependency

            # ip-api batch accepts up to 100 IPs per request.
            for start in range(0, len(ips), 100):
                chunk = ips[start:start + 100]
                payload = [{"query": ip, "fields": "status,countryCode,country,query"} for ip in chunk]
                resp = requests.post(
                    "http://ip-api.com/batch",
                    json=payload,
                    
                    timeout=4,
                )
                if resp.status_code != 200:
                    continue
                for entry in resp.json():
                    if entry.get("status") == "success" and entry.get("countryCode"):
                        resolved[entry["query"]] = (
                            entry["countryCode"].upper(),
                            entry.get("country") or entry["countryCode"],
                        )
        except Exception as exc:
            logger.info("HTTP geolocation fallback failed (%s).", exc)
        return resolved

    def _resolve_single_ip(self, ip: str, result: Dict[str, Tuple[str, str]]) -> bool:
        """Resolve one IP from cache or offline DB. Returns True if pending HTTP lookup."""
        if ip in _IP_CACHE:
            cached = _IP_CACHE[ip]
            if cached:
                result[ip] = cached
            return False
        offline = self._resolve_offline(ip)
        if offline:
            _IP_CACHE[ip] = offline
            result[ip] = offline
            return False
        return True

    def _resolve_ips(self, ips: List[str]) -> Dict[str, Tuple[str, str]]:
        """Resolve a list of public IPs to (country_code, country_name), using cache."""
        result: Dict[str, Tuple[str, str]] = {}
        pending = [ip for ip in ips if self._resolve_single_ip(ip, result)]

        if pending and not self._geoip_reader:
            http_resolved = self._resolve_batch_http(pending)
            for ip in pending:
                resolved = http_resolved.get(ip)
                _IP_CACHE[ip] = resolved  # cache None to avoid retrying
                if resolved:
                    result[ip] = resolved

        return result

    # ------------------------------------------------------------------ public
    @staticmethod
    def _get_or_create_bucket(
        buckets: Dict[str, Dict[str, object]],
        country: Tuple[str, str],
    ) -> Dict[str, object]:
        """Return the existing bucket for a country code, creating it if needed."""
        code, name = country
        bucket = buckets.get(code)
        if bucket:
            return bucket
        centroid = COUNTRY_CENTROIDS.get(code)
        bucket = {
            "country_code": code,
            "country": (centroid["name"] if centroid else name),
            "lat": (centroid["lat"] if centroid else None),
            "lng": (centroid["lng"] if centroid else None),
            "sessions": 0,
            "players": 0,
        }
        buckets[code] = bucket
        return bucket

    def aggregate(self, ip_rows: List[Dict[str, object]]) -> Dict[str, object]:
        """
        Aggregate IP-level rows into privacy-safe country buckets.

        Args:
            ip_rows: list of {ip_address, sessions_count, unique_players}

        Returns:
            {
              "countries": [
                  {country_code, country, lat, lng, sessions, players}
              ],
              "resolved_ips": int,
              "unresolved_ips": int,
              "total_sessions": int,
            }
        """
        public_rows = [r for r in ip_rows if _is_public_ip(str(r.get("ip_address", "")))]
        unique_ips = list({str(r["ip_address"]) for r in public_rows})
        resolved = self._resolve_ips(unique_ips)

        buckets: Dict[str, Dict[str, object]] = {}
        resolved_count = 0

        for row in public_rows:
            country = resolved.get(str(row["ip_address"]))
            if not country:
                continue
            resolved_count += 1
            bucket = self._get_or_create_bucket(buckets, country)
            bucket["sessions"] = int(bucket["sessions"]) + int(row.get("sessions_count", 0) or 0)
            bucket["players"] = int(bucket["players"]) + int(row.get("unique_players", 0) or 0)

        # Keep only buckets with known coordinates so the map can plot them.
        countries = [b for b in buckets.values() if b["lat"] is not None and b["lng"] is not None]
        countries.sort(key=lambda b: b["sessions"], reverse=True)

        return {
            "countries": countries,
            "resolved_ips": resolved_count,
            "unresolved_ips": len(public_rows) - resolved_count,
            "total_sessions": sum(int(b["sessions"]) for b in countries),
        }
