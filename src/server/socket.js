let markers = [];
let radius = 804;

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket.on("markers", () => {
      io.emit("markers", markers);
      io.emit("radius", radius);
    });

    socket.on("room", (data) => {
      console.log(data);
    });

    socket.on("delete_location", ({ lat, lng }) => {
      markers = markers.filter(
        ({ lat: latitude, lng: longitude }) =>
          !(latitude === lat && longitude === lng)
      );
      io.emit("markers", markers);
    });

    socket.on("new_address", (data) => {
      markers.push(data);

      io.emit("markers", markers);
    });

    socket.on("radius", (data) => {
      radius = data;
      io.emit("radius", data);
    });

    socket.on("disconnect", () => {
      console.log(`Connection ${socket.id} has left the building`);
    });
  });
};
