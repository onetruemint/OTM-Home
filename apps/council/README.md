# Council Express API

An Express.js REST API for interacting with the Council voting system, built with TypeScript.

## Overview

The Council API allows users to submit prompts to a multi-LLM council system that uses general discussion and elite voting to determine the best answer to a given question.

## Features

- Express.js server with TypeScript
- REST API for Council interactions
- Health check endpoint
- Council member and elite information retrieval
- Voting system integration with Ollama LLMs

## Quick Start

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### Run Council Directly

```bash
npm run council
```

## Docker Deployment

### Using the Backend Infrastructure

The Council service is integrated into the backend docker-compose infrastructure:

```bash
# From the project root
cd .devcontainer
docker-compose -f docker-compose.backend.yml up otm-home-council
```

This will start the Council service along with the required Ollama service on port 3001.

### Standalone Deployment

To run the Council app independently:

```bash
# From the council app directory
cd apps/council
docker-compose up
```

This creates an isolated environment with its own Ollama instance.

### Building the Image

```bash
# From the project root
docker build -t council-app -f apps/council/Dockerfile .
```

## Available Endpoints

### Base Routes
- `GET /` - Welcome message and API information
- `GET /api/council/health` - Health check endpoint

### Council Routes
- `GET /api/council/members` - Get list of council members
- `GET /api/council/elites` - Get list of elite voters
- `POST /api/council/vote` - Submit a prompt for council voting

#### POST /api/council/vote

Submit a prompt for the council to discuss and vote on.

**Request Body:**
```json
{
  "prompt": "What is the best place for an American to purchase PC parts from Shenzhen, China?"
}
```

**Response:**
```json
{
  "prompt": "What is the best place for an American to purchase PC parts from Shenzhen, China?",
  "result": "The council's final answer..."
}
```

## Environment Variables

- `PORT` - Server port (defaults to 3001)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run council` - Run the Council directly (non-server mode)
- `npm test` - Run tests

## Project Structure

```
src/
├── server.ts          # Express server entry point
├── app.ts             # Express app configuration
├── router.ts          # API routes definition
├── controller.ts      # Route handlers
├── Council.ts         # Council class implementation
├── types/
│   └── Council.ts     # TypeScript interfaces
└── members.json       # Council member configurations
```

## How It Works

1. **General Discussion**: Council members (multiple LLM models) discuss the prompt over a 7-minute period
2. **Elite Voting**: Elite members vote on the proposed solutions
3. **Final Answer**: The solution with the most elite votes is returned

## Dependencies

- **express** - Web framework
- **@platform/ollama** - Ollama LLM integration
- **@platform/utils** - Utility functions
- **typescript** - TypeScript compiler
- **tsx** - TypeScript execution for development
