/////////////////////////////////////////////////////////
///                                                   ///
///  FREQUENCY LINK FOR FM-DX-WEBSERVER (V1.0)        ///
///                                                   ///
///  by Highpoint        last update: 15.09.24        ///
///                                                   ///
///  https://github.com/Highpoint2000/FrequencyLink   ///
///                                                   ///
/////////////////////////////////////////////////////////

const frequencyRegex = /\b\d{2,3}[,.]\d{1,3}\b/g;

function makeFrequenciesClickable() {

    const baseUrl = window.location.origin;
  
  // Check if the current page is fmscan.org
  if (window.location.hostname.includes('fmscan.org')) {
    console.log('Frequencies are not marked on fmscan.org.');
    return; // Exit the function if the page is fmscan.org
  }

  // Retrieve all <td> elements on the page
  const cells = document.querySelectorAll('td');

  cells.forEach(cell => {
    let text = cell.textContent.trim(); // Use textContent and trim to remove white spaces
    const matches = [...text.matchAll(frequencyRegex)]; // Find all frequency matches

    if (matches.length > 0) {
      let updatedText = '';
      let lastIndex = 0;

      // Iterate through all the found frequencies in the cell text
      matches.forEach(match => {
        const matchText = match[0];
        const startIndex = match.index;
        
        // Convert to a number to check the frequency range
        const frequencyString = matchText.replace(',', '.'); // Replace comma with dot
        const frequency = parseFloat(frequencyString); // Convert to float

        console.log('Found frequency:', frequencyString); // Log for verification
        
        // Check if the frequency is in the range 65.5 to 108.0 MHz
        if (frequency >= 65.5 && frequency <= 108.0) {
          // Add text before the found frequency
          updatedText += text.slice(lastIndex, startIndex);

          // Build the URL with the frequency
          const linkUrl = `${baseUrl}?f=${encodeURIComponent(frequencyString)}`;
          console.log('Generated URL:', linkUrl); // Log for verification

          // Create a hidden link that opens immediately and closes outside the visible area
          const link = `<a href="javascript:void(0);" onclick="let w = window.open('${linkUrl}', '_blank', 'width=1,height=1,left=-9999,top=-9999,toolbar=no,scrollbars=no,menubar=no'); console.log('Opened URL: ${linkUrl}'); setTimeout(() => { w.close(); }, 1000);" style="text-decoration: underline; cursor: pointer;">${matchText}</a>`;

          updatedText += link;
        } else {
          // Add the text unchanged if the frequency is outside the range
          updatedText += text.slice(lastIndex, startIndex + matchText.length);
        }

        // Update the index to the end of the match
        lastIndex = startIndex + matchText.length;
      });

      // Add the remaining text after the last frequency
      updatedText += text.slice(lastIndex);

      // Update the cell's content
      cell.innerHTML = updatedText;
    }
  });
}

// Function to delay execution by 3 seconds
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('Starting frequency marking...');
    makeFrequenciesClickable();
  }, 500); 
});
