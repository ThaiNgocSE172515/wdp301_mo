// app/index.tsx
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import io from "socket.io-client";

// ⚠️ REPLACE THIS WITH YOUR COMPUTER'S LAN IP ADDRESS
// If using Android Emulator, you can try "http://10.0.2.2:3000"
const SOCKET_URL = "http://192.168.2.103:3000"; 

const socket = io(SOCKET_URL);

export default function Index() {
  const [drone, setDrone] = useState<any>(null);

  useEffect(() => {
    // Connection debugging
    socket.on("connect", () => console.log("Connected to Socket Server"));
    socket.on("connect_error", (err) => console.log("Connection Error:", err));

    socket.on("drone:position", (data) => {
      console.log("Drone Data:", data); // Debug log
      setDrone(data);
    });

    return () => {
      socket.off("drone:position");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        // provider={PROVIDER_GOOGLE} // Uncomment if you specifically want Google Maps on iOS
        initialRegion={{
          latitude: 10.762622,
          longitude: 106.660172,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {drone && (
          <Marker
            coordinate={{
              latitude: drone.lat,
              longitude: drone.lng,
            }}
            title={drone.droneId || "Drone"}
            description={`Altitude: ${drone.altitude}m`}
          />
        )}
      </MapView>

      {drone && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>🛩️ {drone.droneId}</Text>
          <Text style={styles.infoText}>Altitude: {drone.altitude}m</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    position: "absolute",
    bottom: 40, // Moved up slightly to avoid bottom bar
    left: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoText: {
    fontSize: 16,
    fontWeight: "bold",
  }
});