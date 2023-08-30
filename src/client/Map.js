import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  useLoadScript,
  useGoogleMap,
} from "@react-google-maps/api";

import React, { useState, useEffect } from "react";
import { HashRouter, Route } from "react-router-dom";
import { TextField, CircularProgress } from "@mui/material";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { getGeocode, getLatLng } from "use-places-autocomplete";

import socket from "./socket";

const containerStyle = {
  width: "900px",
  height: "900px",
};

const center = {
  lat: 40.7128,
  lng: -74.006,
};

const translateToLatLong = async (value) => {
  const results = await getGeocode({ address: value.label });

  const { lat, lng } = await getLatLng(results[0]);

  return {
    lat,
    lng,
  };
};

const calculateMid = (markers) => {
  const coords = markers.map((marker) => ({
    lat: marker.lat,
    lng: marker.lng,
  }));

  const avgX =
    markers.reduce((acc, marker) => acc + marker.lat, 0) / coords.length;
  const avgY =
    markers.reduce((acc, marker) => acc + marker.lng, 0) / coords.length;

  console.log(avgX, avgY);
  return { lat: avgX, lng: avgY };
};

const Input = ({ markers, setMarkers }) => {
  const [value, setValue] = useState(null);
  const map = useGoogleMap();

  useEffect(() => {
    socket.on("markers", (data) => {
      const mid = calculateMid(data);
      setMarkers([...data, mid]);
    });
  }, []);

  const onChange = async (value) => {
    const { lat, lng } = await translateToLatLong(value);

    const address = { ...value, lat, lng };
    setValue(address);
    socket.emit("new_address", address);
    map.panTo({ lat, lng });
  };

  return (
    <GooglePlacesAutocomplete
      selectProps={{
        value,
        onChange,
      }}
    />
  );
};

function Map({ isLoaded }) {
  const [map, setMap] = React.useState(null);
  const [markers, setMarkers] = useState([]);

  useEffect(() => {
    socket.emit("markers");
  }, []);

  const onLoad = React.useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds(center);

    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null);
  }, []);

  const onClick = (ev) => {
    const lat = ev.latLng.lat();
    const lng = ev.latLng.lng();

    socket.emit("delete_location", { lat, lng });
  };

  const deleteMarker = (lat, lng) => {
    socket.emit("delete_location", { lat, lng });
  };

  return isLoaded ? (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        <Input markers={markers} setMarkers={setMarkers} />

        {markers.map((marker) => (
          <Marker
            onClick={onClick}
            key={marker.label}
            position={{ lat: marker.lat, lng: marker.lng }}
          />
        ))}
      </GoogleMap>
      <ul>
        {markers.map((marker) => (
          <li
            key={marker.label}
            onClick={() => deleteMarker(marker.lat, marker.lng)}
          >
            {marker.label}
          </li>
        ))}
      </ul>
    </div>
  ) : (
    <></>
  );
}

export default Map;
