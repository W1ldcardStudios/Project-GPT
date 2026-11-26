# Project GPT — Local AI Study Assistant

A Next.js website that runs a small language model in each visitor's browser using WebLLM and WebGPU. It does not require an OpenAI API key.

## Features in this starter

- Browser-based local AI chat using Qwen2.5 1.5B (quantized).
- Model download progress and browser-side model caching through WebLLM.
- Chat history stored in the current browser's local storage.
- Image text extraction using Tesseract.js OCR.
- TXT, Markdown and CSV import.
- A simple Wikipedia search panel.
- Responsive dark interface.

## Important limitations

- This is not unlimited computing. The model download is large, and the visitor's RAM, GPU, browser and battery determine performance.
- WebGPU is required for local model inference. Current Chrome or Edge versions are recommended, but support varies by device.
- This starter uses OCR for images, not a vision-language model. It extracts printed text; handwriting, equations, charts and diagrams may be misread.
- PDF and Word import are not included in this first starter.
- The website finder searches Wikipedia only. It is not a general web search engine.
- Chat history is stored in the visitor's browser. It is not synced between devices.
- First model download requires internet. The website itself also needs to be hosted over HTTPS for normal browser WebGPU use.
- The model is downloaded from its configured model source. Review the model licence and provider terms before public deployment.

## Run locally

Install Node.js 20 or newer, then:

```bash
npm install
npm run dev
```

Open http://localhost:3000 in a recent Chrome or Edge browser.

## Build

```bash
npm run build
npm start
```

## Deploy

Push the project to GitHub and import the repository into a Next.js-compatible host such as Vercel. GitHub stores the source code; it does not run the Next.js app by itself.

## Privacy

Chat prompts are passed to the local WebLLM model in the visitor's browser. The website finder sends search terms to the Wikipedia API. Image OCR is performed in the browser. No API key is needed in this starter.
