import { useEffect, useRef, useState, useCallback } from 'react';
import type { GlobalVotes, QuestionOption } from '@world-pulse/shared';

// Check WebGL support
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    return !!gl;
  } catch {
    return false;
  }
}

// ISO 3166-1 numeric to alpha-2 mapping (common countries)
const COUNTRY_CODE_MAP: Record<string, string> = {
  '840': 'US', '826': 'GB', '276': 'DE', '250': 'FR', '380': 'IT',
  '724': 'ES', '620': 'PT', '528': 'NL', '056': 'BE', '040': 'AT',
  '756': 'CH', '616': 'PL', '203': 'CZ', '348': 'HU', '642': 'RO',
  '100': 'BG', '300': 'GR', '792': 'TR', '643': 'RU', '804': 'UA',
  '752': 'SE', '578': 'NO', '208': 'DK', '246': 'FI', '372': 'IE',
  '124': 'CA', '484': 'MX', '076': 'BR', '032': 'AR', '152': 'CL',
  '170': 'CO', '604': 'PE', '858': 'UY', '156': 'CN', '392': 'JP',
  '410': 'KR', '356': 'IN', '360': 'ID', '458': 'MY', '702': 'SG',
  '764': 'TH', '704': 'VN', '608': 'PH', '036': 'AU', '554': 'NZ',
  '710': 'ZA', '818': 'EG', '566': 'NG', '404': 'KE', '504': 'MA',
  '682': 'SA', '784': 'AE', '376': 'IL', '586': 'PK', '050': 'BD',
};

interface GlobeProps {
  votes: GlobalVotes | null;
  options?: QuestionOption[];
}

interface CountryDetails {
  name: string;
  countryCode: string;
  total: number;
  breakdown: { optionId: string; optionText: string; count: number; percentage: number; color: string }[];
}

export function Globe({ votes, options }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<any>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryDetails | null>(null);
  const [pulseRings, setPulseRings] = useState<{ lat: number; lng: number; color: string }[]>([]);
  const prevVotesRef = useRef<GlobalVotes | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const handleCountryClick = useCallback(
    (polygon: any) => {
      const cc = getCountryCode(polygon);
      const name = polygon.properties?.name || 'Unknown';
      const countryVotes = votes?.byCountry.find((c) => c.countryCode === cc);

      if (!countryVotes || countryVotes.total === 0) {
        setSelectedCountry({
          name,
          countryCode: cc,
          total: 0,
          breakdown: [],
        });
        return;
      }

      const breakdown = countryVotes.votes.map((v) => {
        const option = options?.find((o) => o.id === v.optionId);
        return {
          optionId: v.optionId,
          optionText: option?.text || 'Unknown',
          count: v.count,
          percentage: Math.round((v.count / countryVotes.total) * 100),
          color: option?.color || '#3B82F6',
        };
      });

      breakdown.sort((a, b) => b.count - a.count);

      setSelectedCountry({
        name,
        countryCode: cc,
        total: countryVotes.total,
        breakdown,
      });

      const coords = getCountryCoords(cc);
      if (coords && globeRef.current) {
        globeRef.current.pointOfView(
          { lat: coords.lat, lng: coords.lng, altitude: 1.5 },
          1000,
        );
      }
    },
    [votes, options],
  );

  // Initialize globe with dynamic imports
  useEffect(() => {
    if (!containerRef.current) return;

    // Check WebGL support first
    if (!isWebGLSupported()) {
      console.warn('WebGL not supported, globe will not render');
      setIsSupported(false);
      return;
    }

    let globe: any = null;
    let destroyed = false;

    async function initGlobe() {
      try {
        // Dynamic imports to avoid loading if WebGL fails
        const [GlobeGL, topojson] = await Promise.all([
          import('globe.gl').then(m => m.default),
          import('topojson-client'),
        ]);

        if (destroyed || !containerRef.current) return;

        globe = new GlobeGL(containerRef.current)
          .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
          .bumpImageUrl('//unpkg.com/three-globe/example/img/earth-topology.png')
          .backgroundImageUrl('//unpkg.com/three-globe/example/img/night-sky.png')
          .showAtmosphere(true)
          .atmosphereColor('#3a82f7')
          .atmosphereAltitude(0.15)
          .polygonAltitude(() => 0.01)
          .polygonCapColor(() => 'rgba(100, 116, 139, 0.2)')
          .polygonSideColor(() => 'rgba(100, 116, 139, 0.1)')
          .polygonStrokeColor(() => 'rgba(100, 116, 139, 0.4)')
          .polygonLabel((d: any) => {
            const cc = getCountryCode(d);
            const countryVotes = votes?.byCountry.find((c) => c.countryCode === cc);
            if (!countryVotes || countryVotes.total === 0) {
              return `<div class="globe-label">${d.properties?.name || 'Unknown'}<br/><small>No votes yet</small></div>`;
            }
            return `<div class="globe-label">${d.properties?.name || 'Unknown'}<br/><small>${countryVotes.total.toLocaleString()} votes</small><br/><small class="click-hint">Click for details</small></div>`;
          })
          .onPolygonClick(handleCountryClick);

        globe.controls().autoRotate = true;
        globe.controls().autoRotateSpeed = 0.3;
        globe.controls().enableZoom = true;
        globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });

        globeRef.current = globe;

        const handleResize = () => {
          if (containerRef.current && globeRef.current) {
            globeRef.current
              .width(containerRef.current.clientWidth)
              .height(containerRef.current.clientHeight);
          }
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        // Load country polygons
        const res = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
        const countries = await res.json();
        const land = topojson.feature(countries, countries.objects.countries) as any;

        if (!destroyed) {
          setPolygons(land.features);
          globe.polygonsData(land.features);
        }
      } catch (err) {
        console.error('Failed to initialize globe:', err);
        setIsSupported(false);
      }
    }

    initGlobe();

    return () => {
      destroyed = true;
      if (globe?._destructor) {
        globe._destructor();
      }
    };
  }, [handleCountryClick, votes]);

  // Track vote changes for pulse animations
  useEffect(() => {
    if (!votes || !prevVotesRef.current) {
      prevVotesRef.current = votes;
      return;
    }

    const newPulses: { lat: number; lng: number; color: string }[] = [];

    for (const cv of votes.byCountry) {
      if (cv.countryCode === 'XX' || cv.countryCode === 'T1') continue;

      const prevCountry = prevVotesRef.current.byCountry.find(
        (p) => p.countryCode === cv.countryCode,
      );
      const prevTotal = prevCountry?.total || 0;

      if (cv.total > prevTotal) {
        const coords = getCountryCoords(cv.countryCode);
        if (coords) {
          const winner = cv.votes.reduce((a, b) => (a.count > b.count ? a : b));
          const color = options?.find((o) => o.id === winner.optionId)?.color || '#3B82F6';
          newPulses.push({ ...coords, color });
        }
      }
    }

    if (newPulses.length > 0) {
      setPulseRings((prev) => [...prev, ...newPulses]);
      setTimeout(() => {
        setPulseRings((prev) => prev.slice(newPulses.length));
      }, 2000);
    }

    prevVotesRef.current = votes;
  }, [votes, options]);

  // Update pulse rings on globe
  useEffect(() => {
    if (!globeRef.current) return;

    globeRef.current
      .ringsData(pulseRings)
      .ringColor((d: any) => (t: number) => hexToRgba(d.color, 1 - t))
      .ringMaxRadius(4)
      .ringPropagationSpeed(2)
      .ringRepeatPeriod(800);
  }, [pulseRings]);

  // Update colors when votes change
  useEffect(() => {
    if (!globeRef.current || !polygons.length) return;

    const countryColors = new Map<string, string>();

    if (votes?.byCountry) {
      for (const cv of votes.byCountry) {
        if (cv.countryCode === 'XX' || cv.countryCode === 'T1') continue;

        if (cv.total > 0 && cv.votes.length > 0) {
          const winner = cv.votes.reduce((a, b) => (a.count > b.count ? a : b));
          let color = '#3B82F6';
          if (options) {
            const winningOption = options.find((o) => o.id === winner.optionId);
            if (winningOption) color = winningOption.color;
          } else {
            const winnerIndex = votes.options.findIndex((o) => o.optionId === winner.optionId);
            const defaultColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B'];
            color = defaultColors[winnerIndex] || defaultColors[0];
          }
          countryColors.set(cv.countryCode, color);
        }
      }
    }

    globeRef.current.polygonCapColor((d: any) => {
      const cc = getCountryCode(d);
      const color = countryColors.get(cc);
      return color ? hexToRgba(color, 0.7) : 'rgba(100, 116, 139, 0.15)';
    });
    globeRef.current.polygonsData(polygons);
  }, [votes, options, polygons]);

  // Don't render if WebGL not supported
  if (!isSupported) {
    return null;
  }

  return (
    <>
      <style>{`
        .globe-label {
          background: rgba(15, 23, 42, 0.9);
          padding: 8px 12px;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          text-align: center;
          border: 1px solid rgba(100, 116, 139, 0.3);
        }
        .globe-label .click-hint {
          color: #60A5FA;
          font-size: 11px;
        }
      `}</style>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ background: 'transparent' }}
      />

      {selectedCountry && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedCountry(null)}
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">{selectedCountry.name}</h3>
              <button
                onClick={() => setSelectedCountry(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedCountry.total === 0 ? (
              <p className="text-slate-400">No votes from this country yet.</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-slate-400">
                  {selectedCountry.total.toLocaleString()} total votes
                </p>
                <div className="space-y-3">
                  {selectedCountry.breakdown.map((item) => (
                    <div key={item.optionId}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span>{item.optionText}</span>
                        <span className="font-bold">{item.percentage}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                        <div
                          className="h-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function getCountryCode(feature: any): string {
  if (feature.properties?.iso_a2) {
    return feature.properties.iso_a2;
  }
  const numericId = String(feature.id).padStart(3, '0');
  return COUNTRY_CODE_MAP[numericId] || 'XX';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const COUNTRY_COORDS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.8, lng: -98.5 }, GB: { lat: 54.0, lng: -2.0 },
  DE: { lat: 51.0, lng: 10.0 }, FR: { lat: 46.0, lng: 2.0 },
  IT: { lat: 42.8, lng: 12.8 }, ES: { lat: 40.0, lng: -4.0 },
  PT: { lat: 39.5, lng: -8.0 }, NL: { lat: 52.5, lng: 5.75 },
  BE: { lat: 50.8, lng: 4.0 }, AT: { lat: 47.5, lng: 14.5 },
  CH: { lat: 46.8, lng: 8.2 }, PL: { lat: 52.0, lng: 19.0 },
  CZ: { lat: 49.8, lng: 15.5 }, HU: { lat: 47.0, lng: 20.0 },
  RO: { lat: 46.0, lng: 25.0 }, BG: { lat: 42.7, lng: 25.5 },
  GR: { lat: 39.0, lng: 22.0 }, TR: { lat: 39.0, lng: 35.0 },
  RU: { lat: 60.0, lng: 100.0 }, UA: { lat: 49.0, lng: 32.0 },
  SE: { lat: 62.0, lng: 15.0 }, NO: { lat: 62.0, lng: 10.0 },
  DK: { lat: 56.0, lng: 10.0 }, FI: { lat: 64.0, lng: 26.0 },
  IE: { lat: 53.0, lng: -8.0 }, CA: { lat: 56.0, lng: -106.0 },
  MX: { lat: 23.0, lng: -102.0 }, BR: { lat: -14.0, lng: -51.0 },
  AR: { lat: -34.0, lng: -64.0 }, CL: { lat: -35.0, lng: -71.0 },
  CO: { lat: 4.0, lng: -72.0 }, PE: { lat: -10.0, lng: -76.0 },
  UY: { lat: -33.0, lng: -56.0 }, CN: { lat: 35.0, lng: 105.0 },
  JP: { lat: 36.0, lng: 138.0 }, KR: { lat: 36.0, lng: 128.0 },
  IN: { lat: 21.0, lng: 78.0 }, ID: { lat: -5.0, lng: 120.0 },
  MY: { lat: 4.0, lng: 102.0 }, SG: { lat: 1.3, lng: 103.8 },
  TH: { lat: 15.0, lng: 101.0 }, VN: { lat: 16.0, lng: 108.0 },
  PH: { lat: 13.0, lng: 122.0 }, AU: { lat: -25.0, lng: 134.0 },
  NZ: { lat: -41.0, lng: 174.0 }, ZA: { lat: -29.0, lng: 24.0 },
  EG: { lat: 27.0, lng: 30.0 }, NG: { lat: 10.0, lng: 8.0 },
  KE: { lat: 1.0, lng: 38.0 }, MA: { lat: 32.0, lng: -6.0 },
  SA: { lat: 24.0, lng: 45.0 }, AE: { lat: 24.0, lng: 54.0 },
  IL: { lat: 31.0, lng: 35.0 }, PK: { lat: 30.0, lng: 70.0 },
  BD: { lat: 24.0, lng: 90.0 },
};

function getCountryCoords(code: string): { lat: number; lng: number } | null {
  return COUNTRY_COORDS[code] || null;
}
