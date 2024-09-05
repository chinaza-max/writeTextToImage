const express = require('express');
const sharp = require('sharp');
const axios = require('axios');;


const app = express();
const port = process.env.PORT || 4000;

// Middleware to parse JSON bodies
app.use(express.json());

// Function to wrap text
function wrapText(text, maxWidth, fontSize) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';


  words.forEach(word => {
    if ((currentLine + word).length * (fontSize / 2) < maxWidth) {
      currentLine += (currentLine ? ' ' : '') + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });
  lines.push(currentLine);

  return lines;
}

app.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

// API endpoint to generate image with text
app.post('/generate-image', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const width = 800;
    const height = 800;
    const fontSize = 35; 
    const maxWidth = 700;

    // Path to your background image
    const imageUrl = `https://www.solana-daily-quiz.xyz/DailyQuiiz.jpg`;
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const backgroundImage = await sharp(response.data)
      .resize(width, height)
      .toBuffer();

    const wrappedText = wrapText(text, maxWidth, fontSize);
    const lineHeight = fontSize * 1.2;
    const totalTextHeight = wrappedText.length * lineHeight;
    const startY = (height - totalTextHeight) / 2;

    const svgText = `
      <svg width="${width}" height="${height}">
        <style>
          .text { fill: white; font-size: ${fontSize}px; font-family: Arial; }
        </style>
        ${wrappedText.map((line, index) => 
          `<text x="${width/2}" y="${startY + lineHeight * (index + 0.5)}" 
                 text-anchor="middle" class="text">${line}</text>`
        ).join('')}
      </svg>
    `;

    const imageBuffer = await sharp(backgroundImage)
      .composite([
        {
          input: Buffer.from(svgText),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

      
    const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;
    res.json({ imageUrl: base64Image });


  } catch (error) {
    console.error('Error generating image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});



function pingServer() {
  const url = process.env.SERVER_URL || 'https://writetexttoimage.onrender.com';
  axios.get(`${url}/ping`)
    .then(() => console.log('Server pinged successfully'))
    .catch(error => console.error('Failed to ping server:', error));
}

// Ping every 14 minutes (840000 ms)
const PING_INTERVAL = 1 * 60 * 60 * 1000;

setInterval(pingServer, PING_INTERVAL);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});