export const SOCKET_REQUEST_TIMEOUT = 15000;

export function socketRequest(socket, event, data, timeout = SOCKET_REQUEST_TIMEOUT) {
  if (!socket?.connected) {
    return Promise.reject(new Error("No hi ha connexió amb el servidor. Torna-ho a provar quan es reconnecti."));
  }

  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (error, response) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket.off("disconnect", onDisconnect);
      if (error) reject(error);
      else if (response?.status === "ERROR") reject(new Error(response.error || "El servidor ha rebutjat l'operació."));
      else resolve(response);
    };
    const onDisconnect = () => finish(new Error("S'ha perdut la connexió. El resultat de l'operació és desconegut."));
    const timer = setTimeout(
      () => finish(new Error("El servidor no ha respost en 15 segons. El resultat de l'operació és desconegut.")),
      timeout
    );
    socket.on("disconnect", onDisconnect);
    try {
      socket.emit(event, data, (response) => finish(null, response));
    } catch (error) {
      finish(error);
    }
  });
}
