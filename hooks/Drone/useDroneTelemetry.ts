import AsyncStorage from '@react-native-async-storage/async-storage';
import Mapbox from "@rnmapbox/maps";
import * as turf from '@turf/turf';
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from "socket.io-client";

const SIMULATOR_URL = "http://192.168.1.10:3001";
const REAL_BE_URL = "http://192.168.1.10:5000";

export const useDroneTelemetry = (
  sessionId: string,
  simulatorDroneId: string,
  isActiveFlight: boolean,
  mapReady: boolean,
  zonesRef: React.MutableRefObject<any[]>,
  mapRef: React.RefObject<Mapbox.MapView>,
  cameraRef: React.RefObject<Mapbox.Camera>
) => {
  const [drones, setDrones] = useState<Record<string, any>>({});
  const [battery, setBattery] = useState(100);
  const [warningZone, setWarningZone] = useState<{ id: string, name: string, type: string, status: 'inside' | 'near' } | null>(null);
  const [buildingWarning, setBuildingWarning] = useState<{ isColliding: boolean, height: number, name: string } | null>(null);
  const [droneWarning, setDroneWarning] = useState<{ isColliding: boolean, droneId: string, distance: number } | null>(null);

  const simSocketRef = useRef<Socket | null>(null);
  const beSocketRef = useRef<Socket | null>(null);
  const lastRadarRequestTime = useRef<number>(0);
  const lastCollisionCheck = useRef<number>(0);

  useEffect(() => {
    if (!sessionId || !simulatorDroneId) return;

    const connectSockets = async () => {
      const JWT_TOKEN = await AsyncStorage.getItem('ACCESS_TOKEN');
      const simSocket = io(SIMULATOR_URL, { transports: ["polling", "websocket"] });
      simSocketRef.current = simSocket;

      simSocket.on("drone:position", async (data) => {
        if (!data) return;
        const dId = data.droneId || simulatorDroneId;
        const droneLng = parseFloat(data.lng);
        const droneLat = parseFloat(data.lat);
        const droneAlt = parseFloat(data.altitude ?? 0);

        setDrones(prev => ({
          ...prev,
          [dId]: {
            droneId: dId,
            lat: droneLat,
            lng: droneLng,
            altitude: droneAlt,
            speed: parseFloat(data.speed ?? prev[dId]?.speed ?? 0),
            heading: parseFloat(data.heading ?? prev[dId]?.heading ?? 0),
            batteryLevel: parseFloat(data.batteryLevel ?? prev[dId]?.batteryLevel ?? 100),
          }
        }));

        if (dId === simulatorDroneId) {
          if (beSocketRef.current) {
            const now = Date.now();
            if (now - lastRadarRequestTime.current > 2000) {
              lastRadarRequestTime.current = now;
              beSocketRef.current.emit("subscribe_nearby", { sessionId, lat: droneLat, lng: droneLng });
            }
          }

          const dronePoint = turf.point([droneLng, droneLat]);
          let currentWarning: any = null;
          for (const zone of zonesRef.current) {
            try {
              if (droneAlt <= (zone.maxAltitude || 120) && zone.geometry?.coordinates) {
                const polygon = turf.polygon(zone.geometry.coordinates);
                if (turf.booleanPointInPolygon(dronePoint, polygon as any)) {
                  currentWarning = { id: zone._id || zone.id, name: zone.name, type: zone.type, status: 'inside' };
                  break;
                }
                const buffered = turf.buffer(polygon, 0.5, { units: 'kilometers' });
                if (buffered && turf.booleanPointInPolygon(dronePoint, buffered)) {
                  currentWarning = { id: zone._id || zone.id, name: zone.name, type: zone.type, status: 'near' };
                }
              }
            } catch (e) {}
          }
          setWarningZone(currentWarning);

          if (mapReady && mapRef.current) {
            const now = Date.now();
            if (now - lastCollisionCheck.current > 200) {
              lastCollisionCheck.current = now;
              try {
                const screenPoint = await mapRef.current.getPointInView([droneLng, droneLat]);
                const features = await mapRef.current.queryRenderedFeaturesInRect(
                  [screenPoint[1] - 60, screenPoint[0] + 60, screenPoint[1] + 60, screenPoint[0] - 60],
                  undefined, ['3d-buildings']
                );
                if (features && features.features && features.features.length > 0) {
                  const tall = features.features
                    .map(f => ({
                      height: Number(f.properties?.height || f.properties?.render_height || 15),
                      name: String(f.properties?.name || "Vật cản/Tòa nhà")
                    }))
                    .filter(b => b.height >= droneAlt);
                  if (tall.length > 0) {
                    const dangerous = tall.reduce((p, c) => (p.height > c.height) ? p : c);
                    setBuildingWarning({ isColliding: true, height: dangerous.height, name: dangerous.name });
                  } else setBuildingWarning(null);
                } else setBuildingWarning(null);
              } catch (err) {}
            }
          }
          if (cameraRef.current) {
            cameraRef.current.setCamera({ centerCoordinate: [droneLng, droneLat], animationDuration: 500 });
          }
        }
      });

      simSocket.on("drone:battery", (data) => setBattery(data));

      const beSocket = io(REAL_BE_URL, { path: "/ws", auth: { token: JWT_TOKEN }, transports: ["polling", "websocket"] });
      beSocketRef.current = beSocket;
      beSocket.on("connect", () => { if (sessionId) beSocket.emit("watch_session", { sessionId }); });
      beSocket.on("nearby_drones", (data) => {
        const nearbyList = data?.drones || data;
        if (!Array.isArray(nearbyList)) return;
        setDrones(prev => {
          const nextState = { ...prev };
          nearbyList.forEach((d: any) => {
            if (String(d.droneId) === String(simulatorDroneId)) return;
            nextState[d.droneId] = {
              droneId: String(d.droneId),
              lat: Number(d.lat),
              lng: Number(d.lng),
              altitude: Number(d.altitude || 0),
              speed: Number(d.speed || 0),
              heading: Number(d.heading || 0),
              batteryLevel: d.batteryLevel || 100,
              isMock: true
            };
          });
          return nextState;
        });
      });
    };
    connectSockets();
    return () => { simSocketRef.current?.disconnect(); beSocketRef.current?.disconnect(); };
  }, [sessionId, simulatorDroneId, mapReady]);

  useEffect(() => {
    if (!simulatorDroneId || !drones[simulatorDroneId] || !isActiveFlight) return;
    const myDrone = drones[simulatorDroneId];
    const myPoint = turf.point([myDrone.lng, myDrone.lat]);
    let closest: any = null;
    let minDistance = Infinity;
    Object.values(drones).forEach((d: any) => {
      if (d.droneId === simulatorDroneId) return;
      const distM = turf.distance(myPoint, turf.point([d.lng, d.lat]), { units: 'kilometers' }) * 1000;
      if (distM < 500 && distM < minDistance) {
        minDistance = distM;
        closest = d;
      }
    });
    setDroneWarning(closest ? { isColliding: true, droneId: closest.droneId, distance: Math.round(minDistance) } : null);
  }, [drones, simulatorDroneId, isActiveFlight]);

  return { drones, battery, warningZone, buildingWarning, droneWarning };
};