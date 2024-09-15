/////////////////////////////////////////////////////////
///                                                   ///
///  FREQUENCY LINK FOR FM-DX-WEBSERVER (V1.0a BETA)  ///
///                                                   ///
///  by Highpoint        last update: 15.09.24        ///
///                                                   ///
///  https://github.com/Highpoint2000/FrequencyLink   ///
///                                                   ///
/////////////////////////////////////////////////////////

let lastWebSocketUrl = null;
let isConnected = false;
let checkedDomains = {};
let socketPromise = null;
let currentSocket = null; // Halte den aktuellen WebSocket-Status

// Funktion zur Erstellung eines WebSocket-Promises
async function createWebSocketPromise(host, port) {
    const webSocketUrl = `ws://${host}:${port}/text`;
    console.log('Versuche, eine Verbindung zu WebSocket herzustellen:', webSocketUrl);

    // Wenn bereits eine Verbindung besteht, nutze diese
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        console.log('Verwende bestehende WebSocket-Verbindung:', webSocketUrl);
        return currentSocket;
    }

    return new Promise((resolve, reject) => {
        const socket = new WebSocket(webSocketUrl);

        socket.onopen = function () {
            console.log('WebSocket-Verbindung erfolgreich:', webSocketUrl);
            isConnected = true;
            lastWebSocketUrl = webSocketUrl; // Speichere die letzte erfolgreiche Verbindung
            console.log(`Gespeicherte WebSocket-URL: ${lastWebSocketUrl}`);
            checkedDomains[host] = true; // Markiere die Domain als erfolgreich überprüft
            currentSocket = socket; // Speichere den aktuellen Socket
            resolve(socket);
        };

        socket.onerror = function (error) {
            console.error('WebSocket-Fehler:', error);
            isConnected = false;
            checkedDomains[host] = false;
            currentSocket = null;
            reject(error);
        };

        socket.onclose = function () {
            console.log('WebSocket-Verbindung geschlossen');
            isConnected = false;
            currentSocket = null;
        };
    });
}

// Funktion, um die WebSocket-Verbindung aufzubauen
async function connectWebSocket(host, port) {
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        console.log('Bereits mit WebSocket verbunden:', lastWebSocketUrl);
        return;
    }
    socketPromise = createWebSocketPromise(host, port);
}

// Daten nur senden, wenn WebSocket verbunden ist
async function sendDataToClient(frequency) {
    if (!socketPromise) {
        console.error('Keine WebSocket-Verbindung verfügbar.');
        return;
    }

    try {
        const socket = await socketPromise; // await wird hier verwendet
        if (socket.readyState === WebSocket.OPEN) {
            const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
            socket.send(dataToSend);
            console.log("WebSocket sendet:", dataToSend);
        } else {
            console.error('WebSocket ist nicht geöffnet. Keine Daten gesendet.');
        }
    } catch (error) {
        console.error('WebSocket-Fehler. Verbindung konnte nicht hergestellt werden:', error);
    }
}

// Funktion zum erneuten Verbinden mit der letzten WebSocket-Verbindung
async function reconnectToLastWebSocket(frequency) {
    if (lastWebSocketUrl && currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        console.log('Erneutes Verwenden der letzten bekannten WebSocket-URL:', lastWebSocketUrl);
        await sendDataToClient(frequency); // await hier zur Nutzung der bestehenden Verbindung
    }
}

// Funktion zum Überprüfen der WebSocket-Verfügbarkeit für eine Domain
function checkWebSocketAvailability(host, port, callback) {
    if (checkedDomains[host] !== undefined) {
        console.log(`WebSocket-Überprüfung für bereits überprüfte Domain übersprungen: ${host}`);
        callback(checkedDomains[host], host, port);
        return;
    }

    const ws = new WebSocket(`ws://${host}:${port}/text`);

    let timeout = setTimeout(() => {
        ws.close();
        console.log(`WebSocket-Überprüfung abgelaufen für: ${host}:${port}`);
        checkedDomains[host] = false;
        callback(false, host, port);
    }, 2000);

    ws.onopen = function () {
        clearTimeout(timeout);
        console.log(`WebSocket verfügbar unter ws://${host}:${port}/text`);
        ws.close();
        checkedDomains[host] = true;
        callback(true, host, port);
    };

    ws.onerror = function () {
        clearTimeout(timeout);
        console.log(`WebSocket nicht verfügbar unter ws://${host}:${port}/text`);
        checkedDomains[host] = false;
        callback(false, host, port);
    };
}

// Tabs update listener
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log("Besuchte URL:", changeInfo.url);

        const urlObj = new URL(changeInfo.url);
        const host = urlObj.hostname;

        const excludedHosts = ['newtab', 'maps.fmdx.org', 'fmscan.org', 'db.wtfda.org'];

        if (excludedHosts.includes(host)) {
            console.log(`WebSocket-Überprüfung übersprungen für: ${host}`);
            
            const frequency = extractFrequency(changeInfo.url);
            if (frequency) {
                console.log(`Extrahierte Frequenz vom ausgeschlossenen Host: ${frequency}`);
                await sendDataToClient(frequency);
            }

            makeFrequenciesClickable();
            return;
        }

        const port = urlObj.port || 8080;

        console.log(`Überprüfe WebSocket-Verfügbarkeit für: ${host}:${port}`);

        checkWebSocketAvailability(host, port, async (isAvailable, validHost, validPort) => {
            if (isAvailable) {
                console.log(`WebSocket gefunden und verbunden zu ${validHost}:${validPort}/text`);
                await connectWebSocket(validHost, validPort);

                const frequency = extractFrequency(changeInfo.url);
                if (frequency) {
                    await sendDataToClient(frequency);
                } else {
                    console.log("Keine Frequenz in der URL gefunden.");
                }
            } else {
                console.error(`WebSocket für diesen Host nicht verfügbar: ${host}`);
                await reconnectToLastWebSocket(extractFrequency(changeInfo.url));
            }
        });
    }
});

// Funktion zum Extrahieren der Frequenz aus der URL und Ersetzen von %2C oder Komma durch einen Punkt
function extractFrequency(url) {
    const decodedUrl = decodeURIComponent(url);
    console.log(`Dekodierte URL: ${decodedUrl}`);

    const fmscanRegex = /[?&]f=([\d]+[.,][\d]*)/;
    const freqRegex = /#freq=([\d]+[.,][\d]*)/;

    const fmscanMatch = decodedUrl.match(fmscanRegex);
    const freqMatch = decodedUrl.match(freqRegex);

    let frequency = null;

    if (fmscanMatch) {
        frequency = fmscanMatch[1].replace(',', '.');
    } else if (freqMatch) {
        frequency = freqMatch[1].replace(',', '.');
    }

    if (frequency) {
        if (!frequency.includes('.')) {
            frequency += '.0';
        }
        frequency = parseFloat(frequency);
    }

    console.log(`Extrahierte Frequenz: ${frequency}`);
    return frequency;
}
