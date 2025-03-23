# 🦉 OWL Frontend Implementation

This is my implementation of a modern React frontend for the OWL Multi-Agent Collaboration System. It's built with React, TypeScript, Tailwind CSS, Framer Motion, GSAP, and enhanced UI components.

## Features

- 🎨 Modern, responsive UI with a clean aesthetic
- ✨ Smooth animations and transitions with Framer Motion and GSAP
- 🧩 Well-structured component architecture
- 🔄 API integration with the OWL backend
- 🌓 Dark/light mode support
- 📱 Mobile-friendly design

## Current Status

This is a work-in-progress implementation that I've developed to enhance the original OWL system's interface. The frontend is functional but has some limitations:

- API integration with the backend requires further refinement
- Some features from the backend are not yet fully implemented in the UI
- Real-time updates are partially implemented

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Development Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:5173](http://localhost:5173) to view the app in your browser.

### Building for Production

```bash
npm run build
```

## API Integration

The frontend communicates with the OWL backend API, which is implemented with Gradio. The API service is defined in `src/services/api.ts`.

### Environment Variables

The frontend uses the following environment variables (defined in `.env`):

- `VITE_API_URL` - Base URL for the OWL API (default: http://localhost:8000/api)
- `VITE_OPENAI_API_KEY` - OpenAI API key (optional, can be set in the backend)

## Project Structure

```
src/
├── components/        # UI components
│   ├── conversation/  # Conversation interface components
│   ├── layout/        # Layout components
│   ├── logs/          # Log display components
│   ├── settings/      # Settings and configuration components
│   └── ui/            # Base UI components (buttons, tabs, etc.)
├── lib/               # Utility functions and helpers
├── services/          # API services
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## Known Issues and Limitations

- WebSocket connection needs improvement for real-time updates
- Task management API needs further integration
- Some advanced settings from the backend are not yet exposed in the UI

## Next Steps

- Complete WebSocket integration for real-time updates
- Enhance error handling and feedback mechanisms
- Improve task and conversation management
- Add additional visualizations for agent interactions

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

Apache License 2.0 (same as the OWL project)
