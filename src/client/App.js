import React, { useState, useEffect } from "react";
import { HashRouter, Route } from "react-router-dom";
import { TextField, CircularProgress } from "@mui/material";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { getGeocode, getLatLng } from "use-places-autocomplete";
import { useLoadScript } from "@react-google-maps/api";
import { useGoogleMap } from "@react-google-maps/api";

import socket from "./socket";
import Map from "./Map";
import { GOOGLE_API_KEY } from "../../secrets";

const App = () => {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_API_KEY,
    libraries: ["places", "geocoding"],
  });

  if (!isLoaded) {
    return <CircularProgress />;
  }

  return <Map isLoaded={isLoaded} />;
};

export default App;
