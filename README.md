# ssslogger

A super simple structured JSON logger for Node.js with TypeScript support.

## Features

- 🚀 **Lightweight**: Minimal dependencies, fast performance
- 📝 **Structured JSON**: All logs are formatted as JSON for easy parsing
- 🔧 **Configurable**: Set log levels, logger names, and custom hooks
- 🛡️ **TypeScript**: Full TypeScript support with type definitions
- 🔄 **Error Handling**: Graceful handling of circular references and errors
- ⚡ **Zero Config**: Works out of the box with sensible defaults

## Installation

```bash
npm install ssslogger
```

## Quick Start

```typescript
import { log } from "ssslogger";

// Simple logging
log.info("server_started");
log.warn("high_memory_usage_detected");
log.error("database_connection_failed");

// Logging with additional data
log.info("user_logged_in", { userId: 123, ip: "192.168.1.1" });
log.error("api_request_failed", {
  endpoint: "/api/users",
  statusCode: 500,
  error: new Error("Internal server error"),
});
```

## API

### Default Logger

The package exports a default logger instance:

```typescript
import { log } from 'ssslogger';

log.debug(message, obj?);
log.info(message, obj?);
log.warn(message, obj?);
log.error(message, obj?);
```

### Custom Logger

Create a custom logger with specific configuration:

```typescript
import { createLogger } from "ssslogger";

const logger = createLogger({
  logger: "my-app", // Logger name for identification
  level: "info", // Only log info, warn, and error
  hooks: [customHook], // Custom logging hooks
});
```

### Configuration Options

```typescript
interface LoggerConfig {
  logger: string; // Logger name (required)
  level?: "debug" | "info" | "warn" | "error"; // Default: 'debug'
  hooks?: LogHook[]; // Default: [consoleHook]
}
```

### Available Exports

```typescript
import { 
  createLogger, 
  consoleHook, 
  type LogLevel, 
  type LogHook, 
  type LogHookArgs,
  type Log 
} from "ssslogger";
```

- `createLogger`: Function to create custom loggers
- `consoleHook`: Default console logging hook
- `LogLevel`: Type for log levels ('debug' | 'info' | 'warn' | 'error')
- `LogHook`: Type for custom logging hooks
- `LogHookArgs`: Type for hook arguments
- `Log`: Type for logger instances

### Custom Hooks

Create custom logging hooks for advanced use cases:

```typescript
import { createLogger, type LogHook } from "ssslogger";

const fileHook: LogHook = (args) => {
  // Write to file, send to external service, etc.
  fs.appendFileSync("app.log", args.formatted + "\n");
};

const logger = createLogger({
  logger: "file-logger",
  hooks: [fileHook],
});
```

## Log Format

All logs are structured JSON with the following format:

```json
{
  "logger": "my-app",
  "ts": "2024-03-25T12:00:00.000Z",
  "msg": "user_logged_in",
  "obj": {
    "userId": 123,
    "ip": "192.168.1.1"
  }
}
```

## Examples

### Basic Usage

```typescript
import { log } from "ssslogger";

// Application startup
log.info("application_starting", {
  version: "1.0.0",
  environment: "production",
});

// Request logging
log.info("http_request", {
  method: "GET",
  url: "/api/users",
  duration: 150,
});

// Error logging
try {
  // Some operation
} catch (error) {
  log.error("operation_failed", {
    operation: "user.create",
    error: error,
  });
}
```

### Custom Logger with Different Names and Levels

```typescript
import { createLogger } from "ssslogger";

// Production logger - only warnings and errors
const prodLogger = createLogger({ 
  logger: "prod-app",
  level: "warn" 
});

// Development logger - all levels
const devLogger = createLogger({ 
  logger: "dev-app",
  level: "debug" 
});

// Database logger
const dbLogger = createLogger({ 
  logger: "database",
  level: "info" 
});

// Use appropriate logger based on environment
const logger = process.env.NODE_ENV === "production" ? prodLogger : devLogger;
```

### Custom Hooks for External Services

```typescript
import { createLogger, type LogHook } from "ssslogger";

// Send errors to external monitoring service
const monitoringHook: LogHook = (args) => {
  if (args.level === "error") {
    // Send to Sentry, DataDog, etc.
    externalService.captureException(args.obj?.error);
  }
};

// Write all logs to file
const fileHook: LogHook = (args) => {
  fs.appendFileSync("app.log", args.formatted + "\n");
};

const logger = createLogger({
  logger: "monitored-app",
  hooks: [monitoringHook, fileHook],
});
```

### Multiple Named Loggers

```typescript
import { createLogger } from "ssslogger";

// Create loggers for different parts of your application
const apiLogger = createLogger({ logger: "api" });
const dbLogger = createLogger({ logger: "database" });
const authLogger = createLogger({ logger: "auth" });

// Use them in different modules
apiLogger.info("request_received", { method: "POST", path: "/users" });
dbLogger.debug("query_executed", { sql: "SELECT * FROM users" });
authLogger.warn("invalid_token", { userId: 123 });
```

## Error Handling

The logger handles various edge cases gracefully:

- **Circular References**: Automatically detected and handled
- **Error Objects**: Properly serialized with stack traces
- **Hook Failures**: Isolated so one failing hook doesn't break others
- **Logger Errors**: Graceful fallback with error reporting

## Performance

- Minimal overhead with efficient JSON serialization
- Configurable log levels to reduce output in production
- Lazy evaluation of log objects (only serialized if level is enabled)

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
