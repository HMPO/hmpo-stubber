# hmpo-stubber
`hmpo-stubber` is a Node.js middleware that allows you to create dynamic stub API services using simple JSON configurations. This is particularly useful for testing and development environments where you need to simulate API responses.

## Installation
You can install `hmpo-stubber` as a dependency in your project:
```
npm install hmpo-stubber
```

## Usage
hmpo-stubber can be used in your Express.js application as **middleware**, or as a **command-line interface** (CLI) to run as a standalone stub server.

### Middleware Usage
You can integrate hmpo-stubber into your Express.js application as middleware:

```
const express = require('express');
const stubber = require('hmpo-stubber');

const app = express();

// Mount the stubber middleware at the '/stubs' path
app.use('/stubs', stubber.middleware('./services.json', 'My Stub Server'));

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
```

The **stubber.middleware()** function accepts the following parameters:  
`stubber.middleware(services, [name], [basePath]);`

* `services` (Array or String): An array of service configuration objects or a path to a JSON file containing the service configurations.
* `name` (String, optional): A name for the stub server, useful for debug logging.
* `basePath` (String, optional): The base path to mount the stubber on. Defaults to './'.

### Command line interface
`hmpo-stubber` also provides a command-line interface (CLI) to run a standalone stub server:

```
hmpo-stubber [options] [services.json...]
```

#### Options
```
  -c, --config path::String  Use configuration from this file
  -p, --port Number          Specify port to listen on - default: 3030
  -m, --mount String         Base path to mount mocks on - default: /
  -s, --scenario String      Specify the default scenario - default: default
  -h, --help                 display help
```

#### Example CLI config file
You can specify a configuration file using the -c option. The configuration file should be a JSON object with the following properties:

```
{
  "port": 3030,
  "mount": "/",                                     // base URL to mount the standalone server
  "scenario": "default",                            // default scenario to use
  "stubs": ["./service1.json", "./service2.json"]   // array of service filenames or service lists
}
```
* `basePath`: Base path for the service routes.
* `scenarios`: An object defining different scenarios and their corresponding responses.
* `stubs`: This is an array of service config files, each of which can contain one or more stubbed services.  
 These files follow either: Simple Stub Format or Full Service Format (see below)

#### Running CLI service
```
hmpo-stubber -c config.json
```

## Configuration
There are two supported formats for service configuration:

### 1. Simple Stub Format
This is good for mocking one-off endpoints and standalone use via CLI.
```
{
  "name": "User Lookup",
  "method": "GET",
  "url": "/users",
  "scenarios": {
    "default": {
      "status": 200,
      "body": { "id": 123, "name": "Alice" }
    },
    "error": {
      "status": 500,
      "body": { "error": "Internal Server Error" }
    },
    "empty": {
      "status": 200,
      "body": []
    }
  },
  "defaultScenario": "default",
  "sessionID": {
    "header": "x-session-id"
  },
  "scenarioID": {
    "query": "scenario"
  }
}
```
### 2. Full Service Format
This is the more structured format, where you define a full "service" with a basePath, an array of routes, and scenarios that map paths to response types.
```
{
  "name": "User Service",
  "basePath": "/user",
  "routes": [
    {
      "path": "/profile",
      "methods": ["GET"],
      "responses": {
        "default": {
          "status": 200,
          "body": { "username": "john_doe" }
        },
        "error": {
          "status": 500,
          "body": { "error": "Something went wrong" }
        }
      }
    }
  ],
  "scenarios": {
    "default": {
      "/profile": "default"
    },
    "error": {
      "/profile": "error"
    }
  }
}
```
#### Service Configuration

* `name`: Name of the service.
* `basePath`: Base path for the service routes.
* `routes`: An array of route configurations.
* `scenarios`: An object defining different scenarios and their corresponding responses.

#### Route Configuration
Each route configuration specifies how a particular endpoint should behave:

* `path`: The endpoint path.
* `methods`: An array of HTTP methods supported by this route (e.g., GET, POST).
* `responses`: An object mapping response names to their details:
* `status`: HTTP status code to return.
* `body`: JSON object representing the response body.

### Scenario Configuration
The Scenario Object allows for defining complex, timed, or sequential behavior for a route. Instead of returning the same response every time, you define a series of responses that are returned in order on each call to that route.

Use Cases
* Simulating retry mechanisms or progressive failures
* Paginated APIs
* Eventual consistency patterns
* Long-running tasks with polling

**Scenario config object**
```
{
    responses: Array,      // array of Response config objects to step through on each call  
    loop: Boolean(false),  // loop around the response list instead of staying on the last response
}
```


**Response config object**
```
{
    body: Object,          // body to send as JSON (can be a filename or a function)
    status: Number(200),   // status code to respond with
    delay: Number(0),      // delay before sending the response(in milliseconds)
    repeat: Number(1),     // number of times to repeat this response
    close: Boolean(false), // close the connection before sending a response
}
```

#### Example
```
{
    "scenarios": {
        "default": {
            "responses": [
                {
                    "status": 200,
                    "body": { "step": 1 },
                    "repeat": 2
                },
                {
                     "status": 200,
                    "body": { "step": 2 }
                }
            ],
        "loop": true
    }
  }
}
```

## Exposed additions to the stub req object
When a stub is matched and served, hmpo-stubber adds some helpful properties to the request object so you can access details about what scenario or response was used.

Useful for:
* Debugging: Inspect why a certain response was selected
* Logging: Capture the scenario used per session

### Structure
```
req.stub = {
  stubtub,   // the full stub config matched
  service,   // the matched service (from services.json)
  scenario,  // the current scenario used
  response,  // the actual response object
  session: {
    services: {
      [service.name]: {
        scenario,        // scenario map for this service
        scenarioID,      // name like 'default', 'error'
        scenarioParam    // where scenario ID came from (e.g. 'query')
      }
    }
  }
}
```

### Example usage
`console.log(req.stub.session.services['User Service'].scenarioID); // 'error'`

## Complete Use Case Examples
Here is a complete example to integrate `hmpo-stubber` into an Express.js application to serve stubbed responses.

1. Create a services.json file:
```
[
    {
        "name": "User Service",
        "basePath": "/user",
        "routes": [
            {
                "path": "/profile",
                "methods": ["GET"],
                "responses": {
                    "default": {
                        "status": 200,
                        "body": { "username": "john_doe", "email": "john@example.com" }
                    },
                    "error": {
                        "status": 500,
                        "body": { "error": "Something broke" }
                    }
                }
            }
        ],
        "scenarios": {
            "default": {
                "/profile": "default"
            },
            "error": {
                "/profile": "error"
            }
        }
    }
]
```
2. Set up the Express.js application:
``` 
const express = require('express');
const stubber = require('hmpo-stubber');

const app = express();

app.use('/stubs', stubber.middleware('./services.json', 'User Stub Server'));

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
```

3. Access the stubbed endpoint:
```
GET http://localhost:3000/stubs/user/profile?scenario=default
```
This will return response:
```
{
    "username": "john_doe",
    "email": "john@example.com"
}
```
