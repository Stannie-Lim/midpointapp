import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  useLoadScript,
  useGoogleMap,
  Circle,
} from "@react-google-maps/api";

import axios from "axios";

import React, { useState, useEffect } from "react";
import { HashRouter, Route } from "react-router-dom";
import {
  TextField,
  Grid,
  CircularProgress,
  Dialog,
  Button,
  DialogTitle,
  DialogHeader,
  DialogActions,
  DialogContent,
  Typography,
  Slider,
  Card,
  CardHeader,
  Avatar,
  CardMedia,
  Rating,
  CardContent,
} from "@mui/material";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { getGeocode, getLatLng } from "use-places-autocomplete";

import socket from "./socket";

const containerStyle = {
  width: "100%",
  height: "70vh",
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
  if (markers.length <= 1) {
    return null;
  }

  const coords = markers.map((marker) => ({
    lat: marker.lat,
    lng: marker.lng,
  }));

  const avgX =
    markers.reduce((acc, marker) => acc + marker.lat, 0) / coords.length;
  const avgY =
    markers.reduce((acc, marker) => acc + marker.lng, 0) / coords.length;

  return { lat: avgX, lng: avgY, isMidpoint: true };
};

const SingleBar = ({ isBordered, bar, onHover, onBlur, clickBar }) => {
  return (
    <Grid item sx={{ width: 400 }} ref={bar.ref}>
      <Card
        sx={{ width: "100%", border: isBordered ? "3px solid gold" : null }}
        variant="outlined"
        onMouseOut={() => onBlur(bar)}
        onMouseOver={() => onHover(bar)}
        onClick={() => clickBar(bar)}
      >
        <CardHeader title={bar.name} />
        <CardMedia
          component="img"
          height="194"
          image={bar.image_url}
          alt="Bar image"
        />
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            {bar.location.address1}
          </Typography>
          <Rating value={bar.rating} readOnly />
        </CardContent>
      </Card>
    </Grid>
  );
};

const Input = ({ markers, setMarkers, setBars, map, radius }) => {
  const [value, setValue] = useState(null);

  const findBars = async ({ lat, lng }) => {
    try {
      const { data } = await axios.get(`/api/bars/${lat}/${lng}/${radius}`);

      setBars({
        ...data,
        businesses: data.businesses.map((business) => ({
          ...business,
          ref: React.createRef(),
        })),
      });
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    socket.on("markers", (data) => {
      const mid = calculateMid(data);
      if (mid) {
        if (map) {
          map.setCenter({ lat: mid.lat, lng: mid.lng });
          map.setZoom(12);
        }
        findBars(mid);
      } else {
        setBars(null);
      }
      setMarkers(data);
    });
  }, [map]);

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

const ConfirmationModal = ({ close, destroy }) => {
  return (
    <Dialog open={true} onClose={close}>
      <DialogTitle>Are you sure you want to delete this address?</DialogTitle>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button onClick={destroy}>Delete</Button>
      </DialogActions>
    </Dialog>
  );
};

function Map({ isLoaded }) {
  const [map, setMap] = React.useState(null);
  const [markers, setMarkers] = useState([]);
  const [bars, setBars] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [modalOpen, setModalOpen] = useState(null);
  const [radius, setRadius] = useState(2218);

  const openConfirmation = (marker) => {
    setModalOpen(marker);
  };

  const close = () => {
    setModalOpen(null);
  };

  useEffect(() => {
    socket.emit("markers");

    socket.on("radius", (data) => {
      console.log(data);
      setRadius(data);
    });
  }, []);

  useEffect(() => {
    if (bars) {
      const businesses = bars.businesses.map(({ coordinates, id, ref }) => ({
        ref,
        id,
        lat: coordinates.latitude,
        lng: coordinates.longitude,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 3,
        },
        isBusiness: true,
      }));

      setMarkers([...markers, ...businesses]);
    }
  }, [bars]);

  const onLoad = React.useCallback(function callback(map) {
    const bounds = new window.google.maps.LatLngBounds(center);

    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback(map) {
    setMap(null);
  }, []);

  const onClick = (ev, isMidpoint, isBusiness) => {
    if (!isMidpoint && !isBusiness) {
      const lat = ev.latLng.lat();
      const lng = ev.latLng.lng();

      socket.emit("delete_location", { lat, lng });
    }
  };

  const deleteMarker = (lat, lng, isMidpoint, isBusiness) => {
    if (!isMidpoint && !isBusiness) {
      socket.emit("delete_location", { lat, lng });
    }
    close();
  };

  useEffect(() => {
    const gold = markers.find(
      (marker) => marker.icon && marker.icon.strokeColor === "gold"
    );

    setHovered(gold);
  }, [markers]);

  const onHover = (bar, shouldScroll = false) => {
    setMarkers(
      markers.map((marker) =>
        marker.id === bar.id && marker.isBusiness
          ? { ...marker, icon: { ...marker.icon, strokeColor: "gold" } }
          : marker.isBusiness
          ? { ...marker, icon: { ...marker.icon, strokeColor: "black" } }
          : marker
      )
    );

    if (shouldScroll && bar.ref && bar.ref.current) {
      bar.ref.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest",
      });
    }
  };

  const onBlur = (bar) => {
    setMarkers(
      markers.map((marker) =>
        marker.isBusiness
          ? {
              ...marker,
              icon: { ...marker.icon, strokeColor: "black" },
            }
          : marker
      )
    );
  };

  const clickBar = (bar) => {
    map.panTo({
      lat: bar.coordinates.latitude,
      lng: bar.coordinates.longitude,
    });
    map.setZoom(18);
  };

  const hoverAddress = (marker) => {
    map.panTo({
      lat: marker.lat,
      lng: marker.lng,
    });
    map.setZoom(16);
  };

  const onSliderChange = (ev) => {
    setRadius(ev.target.value);
  };

  const onSliderChangeCommitted = async () => {
    const lat = bars.region.center.latitude;
    const lng = bars.region.center.longitude;
    try {
      const { data } = await axios.get(`/api/bars/${lat}/${lng}/${radius}`);

      setBars({
        ...data,
        businesses: data.businesses.map((business) => ({
          ...business,
          ref: React.createRef(),
        })),
      });

      socket.emit("radius", radius);
    } catch (error) {
      console.log(error);
    }
  };

  return isLoaded ? (
    <Grid container>
      <Grid item xs={12}>
        <Input
          setBars={setBars}
          markers={markers}
          setMarkers={setMarkers}
          map={map}
          radius={radius}
        />
        <div style={{ marginBottom: "3rem" }} />
      </Grid>
      {/* <Grid container item justifyContent="center">
        <Grid item xs={3}>
          <Typography>Circle radius</Typography>
          <Slider
            onChangeCommitted={onSliderChangeCommitted}
            value={radius}
            onChange={onSliderChange}
            min={804}
            max={8046}
          />
          <div style={{ marginBottom: "3rem" }} />
        </Grid>
      </Grid> */}
      <Grid container item xs={10} spacing={3}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={onLoad}
          onUnmount={onUnmount}
        >
          <>
            {markers.map((marker, index) => (
              <Marker
                onMouseOver={() => onHover(marker, true)}
                onClick={(ev) => {
                  if (!marker.isBusiness && !marker.isMidpoint) {
                    openConfirmation(marker);
                  } else {
                    onClick(ev, marker.isMidpoint, marker.isBusiness);
                  }
                }}
                icon={marker.icon}
                key={index}
                label={marker.isMidpoint ? "Midpoint" : null}
                position={{ lat: marker.lat, lng: marker.lng }}
              />
            ))}

            {bars && (
              <Circle
                center={{
                  lat: bars.region.center.latitude,
                  lng: bars.region.center.longitude,
                }}
                radius={radius}
              />
            )}
          </>
        </GoogleMap>
      </Grid>
      <Grid container item xs={2}>
        <Grid>
          {markers.length ? <Typography>Addresses</Typography> : null}
          <ul>
            {markers
              .filter((marker) => !marker.isMidpoint && !marker.isBusiness)
              .map((marker, index) => (
                <li key={index} style={{ marginBottom: 16 }}>
                  <Typography onClick={() => openConfirmation(marker)}>
                    {marker.label}
                  </Typography>
                  <Button
                    variant="outlined"
                    onClick={() => hoverAddress(marker)}
                  >
                    See on map
                  </Button>
                </li>
              ))}
          </ul>
        </Grid>
      </Grid>
      <Grid container item>
        <Grid>
          {bars && bars.businesses.length ? (
            <Typography>Bars</Typography>
          ) : null}
          <Grid
            wrap="nowrap"
            container
            spacing={3}
            style={{ overflowX: "scroll", maxWidth: "100vw" }}
          >
            {bars &&
              bars.businesses.map((bar) => (
                <SingleBar
                  clickBar={clickBar}
                  isBordered={hovered && hovered.id === bar.id}
                  bar={bar}
                  key={bar.id}
                  onHover={onHover}
                  onBlur={onBlur}
                />
              ))}
          </Grid>
        </Grid>
      </Grid>
      {modalOpen && (
        <ConfirmationModal
          close={close}
          destroy={() =>
            deleteMarker(
              modalOpen.lat,
              modalOpen.lng,
              modalOpen.isMidpoint,
              modalOpen.isBusiness
            )
          }
        />
      )}
    </Grid>
  ) : (
    <></>
  );
}

export default Map;
