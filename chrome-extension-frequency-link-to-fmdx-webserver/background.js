/////////////////////////////////////////////////////////
///                                                   ///
///  FREQUENCY LINK FOR FM-DX-WEBSERVER (V1.0)        ///
///                                                   ///
///  by Highpoint        last update: 15.09.24        ///
///                                                   ///
///  https://github.com/Highpoint2000/FrequencyLink   ///
///                                                   ///
/////////////////////////////////////////////////////////

let lastWebSocketUrl = null; // Store the last successful WebSocket address here
let textSocket = null;
let isConnected = false;
let checkedDomains = {}; // Cache for checked domains

// Function to connect to the WebSocket server
function connectWebSocket(host, port) {
    const webSocketUrl = `ws://${host}:${port}/text`;
    console.log('Trying to connect to WebSocket:', webSocketUrl);

    textSocket = new WebSocket(webSocketUrl);

    textSocket.onopen = function () {
        console.log('WebSocket connection established to', webSocketUrl);
        isConnected = true;
        lastWebSocketUrl = webSocketUrl; // Store the last successful connection
        console.log(`Stored WebSocket URL: ${lastWebSocketUrl}`);
        checkedDomains[host] = true; // Mark the domain as successfully checked
    };

    textSocket.onclose = function () {
        console.log('WebSocket connection closed');
        isConnected = false;
    };

    textSocket.onerror = function (error) {
        console.error('WebSocket error:', error);
        isConnected = false;
        checkedDomains[host] = false; // Mark the domain as unavailable
    };

    textSocket.onmessage = function (event) {
        // You can receive messages from the server here if needed
    };
}

// Function to send frequency data over WebSocket
function sendDataToClient(frequency) {
    if (isConnected && textSocket && textSocket.readyState === WebSocket.OPEN) {
        const dataToSend = `T${(frequency * 1000).toFixed(0)}`;
        textSocket.send(dataToSend);
        console.log("WebSocket sent:", dataToSend);
    } else if (lastWebSocketUrl) {
        console.log(`WebSocket not open. Reconnecting to ${lastWebSocketUrl}`);
        reconnectToLastWebSocket(frequency);
    } else {
        console.error('No WebSocket available to send data.');
    }
}

// Function to reconnect to the last WebSocket server
function reconnectToLastWebSocket(frequency) {
    if (lastWebSocketUrl) {
        console.log('Reconnecting to last known WebSocket URL:', lastWebSocketUrl);
        textSocket = new WebSocket(lastWebSocketUrl);

        textSocket.onopen = function () {
            console.log('Reconnected to WebSocket:', lastWebSocketUrl);
            isConnected = true;
            sendDataToClient(frequency); // Send the frequency after reconnecting
        };

        textSocket.onerror = function (error) {
            console.error('Error reconnecting to WebSocket:', error);
        };
    }
}

// Function to check WebSocket availability on a domain
function checkWebSocketAvailability(host, port, callback) {
    // Skip if the domain has already been checked
    if (checkedDomains[host] !== undefined) {
        console.log(`Skipping WebSocket check for previously checked domain: ${host}`);
        callback(checkedDomains[host], host, port);
        return;
    }

    const ws = new WebSocket(`ws://${host}:${port}/text`);

    let timeout = setTimeout(() => {
        ws.close();
        console.log(`WebSocket check timed out for: ${host}:${port}`);
        checkedDomains[host] = false; // Store that the domain doesn't have WebSocket connection
        callback(false, host, port);
    }, 2000); // 2-second timeout (adjustable)

    ws.onopen = function () {
        clearTimeout(timeout);
        console.log(`WebSocket available at ws://${host}:${port}/text`);
        ws.close();
        checkedDomains[host] = true; // Store that the domain has WebSocket connection
        callback(true, host, port);
    };

    ws.onerror = function () {
        clearTimeout(timeout);
        console.log(`WebSocket not available at ws://${host}:${port}/text`);
        checkedDomains[host] = false; // Store that the domain doesn't have WebSocket connection
        callback(false, host, port);
    };
}

// Tabs update listener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log("Visited URL:", changeInfo.url);

        const urlObj = new URL(changeInfo.url);
        const host = urlObj.hostname;

        // Check if the URL should be explicitly excluded
        const excludedHosts = ['newtab', 'maps.fmdx.org', 'fmscan.org', 'db.wtfda.org'];

        // If the site is excluded, don't perform WebSocket check, but still extract the frequency
        if (excludedHosts.includes(host)) {
            console.log(`Skipping WebSocket check for: ${host}`);
            
            // Extract frequency even for excluded hosts
            const frequency = extractFrequency(changeInfo.url);
            if (frequency) {
                console.log(`Extracted Frequency from excluded host: ${frequency}`);
                // Send the frequency to the last known WebSocket
                sendDataToClient(frequency);
            }

            makeFrequenciesClickable();
            return;
        }

        const port = urlObj.port || 8080; // Default to port 8080 if none is specified

        console.log(`Checking WebSocket availability for: ${host}:${port}`);

        // Check WebSocket availability (only once per domain)
        checkWebSocketAvailability(host, port, (isAvailable, validHost, validPort) => {
            if (isAvailable) {
                console.log(`WebSocket found and connected to ${validHost}:${validPort}/text`);
                // Connect to the found WebSocket server
                connectWebSocket(validHost, validPort);

                // Extract and send the frequency (if found in the URL)
                const frequency = extractFrequency(changeInfo.url);
                if (frequency) {
                    sendDataToClient(frequency);
                } else {
                    console.log("No frequency found in URL.");
                }
            } else {
                console.error(`WebSocket not available for this host: ${host}`);
                // Use the last successful WebSocket connection if available
                if (lastWebSocketUrl) {
                    console.log(`Using last known WebSocket URL: ${lastWebSocketUrl}`);
                    const frequency = extractFrequency(changeInfo.url);
                    if (frequency) {
                        sendDataToClient(frequency);
                    } else {
                        console.log("No frequency found in URL.");
                    }
                }
            }
        });
    }
});

// Function to extract the frequency from the URL and replace %2C or period with a period
function extractFrequency(url) {
    const decodedUrl = decodeURIComponent(url); // Decode the URL to convert %2C to a comma
    console.log(`Decoded URL: ${decodedUrl}`); // Debug log for decoded URL

    // Regular expressions for frequencies with comma or period
    const fmscanRegex = /[?&]f=([\d]+[.,][\d]*)/; // Accept both comma and period, e.g., ?f=106,4 or ?f=87.7
    const freqRegex = /#freq=([\d]+[.,][\d]*)/;   // Accept both comma and period, e.g., #freq=106,4 or #freq=87.7

    const fmscanMatch = decodedUrl.match(fmscanRegex);
    const freqMatch = decodedUrl.match(freqRegex);

    let frequency = null;

    if (fmscanMatch) {
        // Replace comma with period and process the frequency
        frequency = fmscanMatch[1].replace(',', '.');
    } else if (freqMatch) {
        // Replace comma with period and process the frequency
        frequency = freqMatch[1].replace(',', '.');
    }

    if (frequency) {
        // Check if there is a period, and if not, append ".0"
        if (!frequency.includes('.')) {
            frequency += '.0';
        }
        frequency = parseFloat(frequency); // Convert to a number for further calculations
    }

    console.log(`Extracted Frequency: ${frequency}`); // Debug log for extracted frequency
    return frequency;
}
