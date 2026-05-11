# Get tasks list

# OpenAPI definition

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "GUESTY OPEN API",
    "description": "Guesty Open API documentation",
    "version": "1"
  },
  "servers": [
    {
      "url": "https://open-api.guesty.com/v1"
    }
  ],
  "security": [
    {
      "bearerAuth": []
    }
  ],
  "tags": [
    {
      "name": "Tasks"
    }
  ],
  "paths": {
    "/tasks-open-api/tasks": {
      "get": {
        "tags": [
          "Tasks"
        ],
        "summary": "Get tasks list",
        "parameters": [
          {
            "name": "filters",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Object of filters to query by",
            "example": "{'status':{'@nin':['completed']},'scheduledFor':{'@today':true}}"
          },
          {
            "name": "columns",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Selection of columns, separated by space",
            "example": "status taskTitle listing reservation scheduledFor endTime canStartAfter mustFinishBefore assignee id",
            "required": true
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "number"
            },
            "example": "25",
            "description": "Pagination"
          },
          {
            "name": "skip",
            "in": "query",
            "schema": {
              "type": "number"
            },
            "example": 0,
            "description": "Indication of number of results to skip"
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "properties": {
                      "status": {
                        "type": "object",
                        "description": "The status of the task.",
                        "properties": {
                          "children": {
                            "type": "string",
                            "enum": [
                              "pending",
                              "confirmed",
                              "in progress",
                              "completed",
                              "canceled"
                            ]
                          }
                        }
                      },
                      "taskTitle": {
                        "type": "object",
                        "description": "The name of the task.",
                        "properties": {
                          "children": {
                            "type": "string"
                          }
                        }
                      },
                      "type": {
                        "type": "string",
                        "description": "Task types help you with better identification and reporting.",
                        "properties": {
                          "children": {
                            "type": "string"
                          }
                        }
                      },
                      "shortTaskId": {
                        "type": "array",
                        "description": "A short task ID for quick reference.",
                        "properties": {
                          "items": {
                            "type": "string"
                          }
                        }
                      },
                      "listing": {
                        "type": "object",
                        "description": "The property to which the task is assigned.",
                        "properties": {
                          "listingId": {
                            "type": "string"
                          },
                          "img": {
                            "type": "string"
                          },
                          "title": {
                            "type": "string"
                          }
                        }
                      },
                      "reservation": {
                        "type": "object",
                        "description": "The reservation to which the task is assigned."
                      },
                      "scheduledFor": {
                        "type": "object",
                        "properties": {
                          "startTime": {
                            "type": "string",
                            "description": "The date and time the task must begin."
                          },
                          "canStartAfter": {
                            "type": "string",
                            "description": "The date and the time after which the task can begin."
                          },
                          "mustFinishBefore": {
                            "type": "string",
                            "description": "The date and time before which the task must be completed."
                          }
                        }
                      },
                      "endTime": {
                        "type": "object",
                        "format": "date-time",
                        "description": "The date and time the task was completed.",
                        "properties": {
                          "date": {
                            "type": "string"
                          }
                        }
                      },
                      "canStartAfter": {
                        "type": "object",
                        "format": "date-time",
                        "description": "The date and the time after which the task can begin.",
                        "properties": {
                          "date": {
                            "type": "string"
                          }
                        }
                      },
                      "mustFinishBefore": {
                        "type": "object",
                        "format": "date-time",
                        "description": "The date and time before which the task must be completed.",
                        "properties": {
                          "date": {
                            "type": "string"
                          }
                        }
                      },
                      "assignee": {
                        "type": "object",
                        "properties": {
                          "taskId": {
                            "type": "string",
                            "description": "The unique identifier of the task."
                          },
                          "assigneeId": {
                            "type": "string",
                            "description": "The unique Guesty identifier of the person assigned to the task."
                          },
                          "picture": {
                            "type": "string"
                          }
                        }
                      },
                      "id": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Bad request"
          },
          "403": {
            "description": "Forbidden",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "apiKey",
        "name": "authorization",
        "in": "header"
      }
    }
  }
}
```