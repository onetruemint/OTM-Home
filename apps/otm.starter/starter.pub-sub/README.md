# OTM Home Core Express Server

A barebones Express.js application built with TypeScript for use to quickstart an OTM Home application.

## Features

- Express.js server with TypeScript
- Basic routing with health check endpoint
- Request logging middleware
- Error handling middleware
- 404 route handling
- Environment variable configuration for port

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

### Clean Install

```bash
npm run clean
npm install
```

## Available Endpoints

- `GET /` - Welcome message and server status
- `GET /health` - Health check endpoint
- `*` - 404 handler for unmatched routes

## Environment Variables

- `PORT` - Server port (defaults to 3000)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint with auto-fix
- `npm run clean` - Remove dist and node_modules

## Project Structure

```
src/
├── server.ts          # Main server file
tsconfig.json          # TypeScript configuration
package.json           # Dependencies and scripts
README.md              # This file
```

## Dependencies

- **express** - Web framework
- **http-status-codes** - HTTP status code constants
- **typescript** - TypeScript compiler
- **ts-node** - TypeScript execution for development
- **nodemon** - Development server with auto-restart
