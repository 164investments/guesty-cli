# Delete a task

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
    "/tasks-open-api/{taskId}": {
      "delete": {
        "tags": [
          "Tasks"
        ],
        "summary": "Delete a task",
        "parameters": [
          {
            "name": "taskId",
            "in": "path",
            "description": "Task id",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Successful operation",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "_id": {
                      "type": "string",
                      "description": "The unique identifier of the task."
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
                    "assigneeGroup": {
                      "type": "array",
                      "description": "The team the assignees is part of. This is a tag",
                      "items": {
                        "type": "string"
                      }
                    },
                    "type": {
                      "type": "string",
                      "description": "Task types help you with better identification and reporting."
                    },
                    "checklistFinished": {
                      "type": "array",
                      "description": "A list of finished action items that help define the task.",
                      "items": {
                        "type": "string"
                      }
                    },
                    "checklist": {
                      "type": "array",
                      "description": "A list of action items that help define the task.",
                      "items": {
                        "type": "string"
                      }
                    },
                    "checklistAggregated": {
                      "type": "array",
                      "description": "A list of action items."
                    },
                    "tags": {
                      "type": "array",
                      "description": "List of tags the task is related to",
                      "items": {
                        "type": "string"
                      }
                    },
                    "status": {
                      "type": "string",
                      "description": "The status of the task, being one of the following enumerators: pending,confirmed, in progress,completed,canceled."
                    },
                    "comment": {
                      "type": "object",
                      "description": "Notes added to the task by the assignee and supervisor. Contains the text, user ID and date the comment was published.",
                      "properties": {
                        "_id": {
                          "type": "string",
                          "description": "The unique identifier of the comment."
                        },
                        "text": {
                          "type": "string",
                          "description": "The comment text."
                        },
                        "by": {
                          "type": "string",
                          "description": "The unique identifier of the user who made the comment."
                        },
                        "date": {
                          "type": "string",
                          "description": "The date and time the comment was posted."
                        }
                      }
                    },
                    "accountId": {
                      "type": "string",
                      "description": "The ID of the account the task is attached to"
                    },
                    "createdBy": {
                      "type": "string",
                      "description": "The ID of the user who created the task."
                    },
                    "title": {
                      "type": "string",
                      "description": "The name you call the task"
                    },
                    "description": {
                      "type": "string",
                      "description": "Add any additional information needed to define the task."
                    },
                    "priority": {
                      "type": "string",
                      "description": "Assign the level of importance to the task in enumerators - High,Medium,Low",
                      "enum": [
                        "medium",
                        "high",
                        "low"
                      ]
                    },
                    "assigneeId": {
                      "type": "string",
                      "description": "The unique Guesty identifier of the person assigned to the task."
                    },
                    "supervisorId": {
                      "type": "string",
                      "description": "The unique Guesty identifier of the person assigned to supervise the task."
                    },
                    "timezone": {
                      "type": "string",
                      "description": ""
                    },
                    "afterEffects": {
                      "type": "object",
                      "description": "Actions to be triggered upon the completion of the task.",
                      "properties": {
                        "action": {
                          "type": "string",
                          "description": "The action to be performed."
                        },
                        "_id": {
                          "type": "string",
                          "description": "The unique identifier of the action."
                        },
                        "payload": {
                          "type": "object",
                          "description": "The information or data to be included within the action.",
                          "properties": {
                            "target": {
                              "type": "string",
                              "description": "The intended recipient.",
                              "enum": [
                                "user",
                                "contact",
                                "guest",
                                "supervisor"
                              ]
                            },
                            "targetId": {
                              "type": "string",
                              "description": "The unique identifier of the target."
                            },
                            "message": {
                              "type": "object",
                              "description": "The message object.",
                              "properties": {
                                "subject": {
                                  "type": "string",
                                  "description": "States topic of the message."
                                },
                                "body": {
                                  "type": "string",
                                  "description": "Contains the message string."
                                },
                                "attachments": {
                                  "type": "object",
                                  "description": "Contains and describes an attached file.",
                                  "properties": {
                                    "_id": {
                                      "type": "string",
                                      "description": "Unique identifier of the attachment object."
                                    },
                                    "url": {
                                      "type": "string",
                                      "description": "URL location of the attached file."
                                    },
                                    "title": {
                                      "type": "string",
                                      "description": "Name of the file attachment."
                                    },
                                    "mimetype": {
                                      "type": "string",
                                      "description": "State the kind of file attached."
                                    },
                                    "size": {
                                      "type": "string",
                                      "description": "The storage size of the attachment."
                                    },
                                    "client": {
                                      "type": "string",
                                      "description": ""
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    },
                    "attachments": {
                      "type": "object",
                      "description": "The place to attach external files needed for the task.",
                      "properties": {
                        "title": {
                          "type": "string",
                          "description": "Title name of the attached file."
                        },
                        "url": {
                          "type": "string",
                          "description": "URL location of the attached file."
                        },
                        "mimetype": {
                          "type": "string",
                          "description": "State the kind of file attached."
                        },
                        "size": {
                          "type": "number",
                          "description": "The storage size of the attachment."
                        },
                        "client": {
                          "type": "string",
                          "description": "Add any additional information needed to define the task."
                        }
                      }
                    },
                    "timing": {
                      "type": "object",
                      "description": "",
                      "properties": {
                        "type": {
                          "type": "string",
                          "enum": [
                            "none",
                            "specific",
                            "flexible",
                            "legacy"
                          ]
                        },
                        "startTime": {
                          "type": "string",
                          "description": "The date and time the task must begin (fixed task). Each task scheduling should be set for fixed or flexible time. If “startTime” has value, leave “canStartFrom” and “mustFinishBefore” blank, and vice versa"
                        },
                        "canStartAfter": {
                          "type": "string",
                          "description": "The date and the time after which the task can begin (flexible task). Each task scheduling should be set for fixed or flexible time. If “startTime” has value, leave “canStartFrom” and “mustFinishBefore” blank, and vice versa"
                        },
                        "mustFinishBefore": {
                          "type": "string",
                          "description": "The date and time before which the task must be completed (flexible task). Each task scheduling should be set for fixed or flexible time. If “startTime” has value, leave “canStartFrom” and “mustFinishBefore” blank, and vice versa"
                        }
                      }
                    },
                    "apply": {
                      "type": "object",
                      "description": "",
                      "properties": {
                        "type": {
                          "type": "string",
                          "enum": [
                            "listing",
                            "reservation",
                            "owner-reservation"
                          ]
                        },
                        "listingId": {
                          "type": "string",
                          "description": "The object ID of the Guesty listing the task is attached to. Only when reservationId don't exist"
                        },
                        "reservationId": {
                          "type": "string",
                          "description": "The object ID of the Guesty reservation the task is attached to. Only when listingId don't exist"
                        },
                        "ownerReservationId": {
                          "type": "string",
                          "description": "The owner reservation ID of the listing the task is attached to. Only when owner reservation "
                        }
                      }
                    },
                    "plannedDuration": {
                      "type": "number",
                      "description": "The amount of time budgeted for the task (hours)."
                    },
                    "pendingExpenses": {
                      "description": "The list of expenses that will be created upon task completion",
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string",
                            "description": "Expense id",
                            "example": "66851bfe7ac4c20e71804f08"
                          },
                          "name": {
                            "type": "string",
                            "description": "Expense name",
                            "example": "Cleaning"
                          },
                          "description": {
                            "type": "string",
                            "description": "Expense description",
                            "example": "Expense details"
                          },
                          "shareSplit": {
                            "type": "number",
                            "description": "Expense split coefficient",
                            "example": "0.3"
                          },
                          "shareType": {
                            "enum": [
                              "percent"
                            ],
                            "description": "Share split type will be always `percent`",
                            "example": "percent"
                          },
                          "accounting": {
                            "type": "object",
                            "description": "Not available for Pending expenses",
                            "properties": {
                              "charges": {
                                "type": "array",
                                "items": {
                                  "type": "number",
                                  "description": "Charge ids"
                                }
                              }
                            }
                          },
                          "category": {
                            "type": "object",
                            "description": "Expense category",
                            "enum": [
                              "advertising",
                              "cleaning",
                              "electricity",
                              "furniture_appliances",
                              "gas",
                              "internet",
                              "lock_automation",
                              "management",
                              "mortgage",
                              "pest_control",
                              "pool_cleaning",
                              "property_taxes",
                              "repairs_maintenance",
                              "supplies_purchases",
                              "other_misc",
                              "taxes_paid",
                              "telephone",
                              "television",
                              "trash",
                              "water_septic",
                              "guest_cleaning",
                              "owner_cleaning",
                              "channel_commission",
                              "payment_charge",
                              "pet_fee",
                              "startup_fee",
                              "fotoshoot",
                              "vat"
                            ],
                            "example": "pool_cleaning"
                          },
                          "chargeable": {
                            "type": "object",
                            "properties": {
                              "amount": {
                                "type": "number",
                                "example": 25
                              }
                            }
                          },
                          "payTo": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string",
                                "example": "664c6a01b6d00de42dbda741",
                                "description": "Vendor id"
                              }
                            }
                          },
                          "attachments": {
                            "type": "object",
                            "properties": {
                              "url": {
                                "type": "string",
                                "description": "Url for cdc where attachment is uploaded"
                              },
                              "originalExtension": {
                                "type": "string",
                                "description": "Attachment extension"
                              },
                              "originalFilename": {
                                "type": "string",
                                "description": "Attachment file name"
                              },
                              "uploadedAt": {
                                "type": "string",
                                "description": "Date of attachment uploading"
                              },
                              "uploadedBy": {
                                "type": "string",
                                "example": "66851bfe7ac4c20e71804f08",
                                "description": "User id who upload attachment"
                              }
                            }
                          }
                        }
                      }
                    },
                    "postedExpenses": {
                      "type": "array",
                      "description": "The list of recognized expenses",
                      "items": {
                        "type": "object",
                        "properties": {
                          "_id": {
                            "type": "string",
                            "description": "Expense id",
                            "example": "66851bfe7ac4c20e71804f08"
                          },
                          "name": {
                            "type": "string",
                            "description": "Expense name",
                            "example": "Cleaning"
                          },
                          "description": {
                            "type": "string",
                            "description": "Expense description",
                            "example": "Expense details"
                          },
                          "shareSplit": {
                            "type": "number",
                            "description": "Expense split coefficient",
                            "example": "0.3"
                          },
                          "shareType": {
                            "enum": [
                              "percent"
                            ],
                            "description": "Share split type will be always `percent`",
                            "example": "percent"
                          },
                          "accounting": {
                            "type": "object",
                            "description": "Expense accounting data",
                            "properties": {
                              "charges": {
                                "type": "array",
                                "items": {
                                  "type": "number",
                                  "description": "Charge ids"
                                }
                              },
                              "failureCode": {
                                "type": "number",
                                "example": 10001,
                                "description": "Charge creation Error code"
                              },
                              "requestId": {
                                "type": "string",
                                "example": "456dd47bdb3862d2",
                                "description": "Request id for debugging"
                              }
                            }
                          },
                          "category": {
                            "type": "object",
                            "description": "Expense category",
                            "enum": [
                              "advertising",
                              "cleaning",
                              "electricity",
                              "furniture_appliances",
                              "gas",
                              "internet",
                              "lock_automation",
                              "management",
                              "mortgage",
                              "pest_control",
                              "pool_cleaning",
                              "property_taxes",
                              "repairs_maintenance",
                              "supplies_purchases",
                              "other_misc",
                              "taxes_paid",
                              "telephone",
                              "television",
                              "trash",
                              "water_septic",
                              "guest_cleaning",
                              "owner_cleaning",
                              "channel_commission",
                              "payment_charge",
                              "pet_fee",
                              "startup_fee",
                              "fotoshoot",
                              "vat"
                            ],
                            "example": "pool_cleaning"
                          },
                          "chargeable": {
                            "type": "object",
                            "properties": {
                              "amount": {
                                "type": "number",
                                "example": 25
                              }
                            }
                          },
                          "payTo": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string",
                                "example": "664c6a01b6d00de42dbda741",
                                "description": "Vendor id"
                              }
                            }
                          },
                          "attachments": {
                            "type": "object",
                            "properties": {
                              "url": {
                                "type": "string",
                                "description": "Url for cdc where attachment is uploaded"
                              },
                              "originalExtension": {
                                "type": "string",
                                "description": "Attachment extension"
                              },
                              "originalFilename": {
                                "type": "string",
                                "description": "Attachment file name"
                              },
                              "uploadedAt": {
                                "type": "string",
                                "description": "Date of attachment uploading"
                              },
                              "uploadedBy": {
                                "type": "string",
                                "example": "66851bfe7ac4c20e71804f08",
                                "description": "User id who upload attachment"
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                  "example": {
                    "_id": "5fc628f3d6391a00363234d",
                    "assigneeGroup": [
                      "cleaners"
                    ],
                    "checklistFinished": [
                      "Clean room A",
                      "Clean room B"
                    ],
                    "checklist": [
                      "Clean room A",
                      "Clean room B"
                    ],
                    "tags": [],
                    "status": "confirmed",
                    "accountId": "Q5fb67280e396Q77002e6c2683",
                    "createdBy": "Q5fb67280e39Q677002e6c268c",
                    "title": "Post Stay Clean",
                    "checklistAggregated": [
                      {
                        "name": "Clean room A",
                        "finished": "true",
                        "at": "2024-01-06T21:08:53.990Z",
                        "by": ""
                      },
                      {
                        "name": "Clean room B",
                        "finished": "False"
                      }
                    ],
                    "attachments": [
                      {
                        "_id": "6599c15c1d103f000e6464de",
                        "mimetype": "image/png",
                        "size": 31356,
                        "client": "cbt",
                        "title": "",
                        "url": ""
                      }
                    ],
                    "comments": [],
                    "createdAt": "2020-12-01T11:28:51.968Z",
                    "updatedAt": "2024-01-06T21:08:55.193Z",
                    "assigneeId": null,
                    "priority": "high",
                    "supervisorId": "64a6b8cfa08e0446a6f4b840",
                    "plannedDuration": 0.08,
                    "description": "A regular clean between guest stays.",
                    "startedAt": "2020-12-02T07:35:24.333Z",
                    "enumeratedStatus": 1,
                    "timezone": "Australia/Sydney",
                    "afterEffects": [],
                    "endTime": "2024-01-10T21:04:48.000Z",
                    "timing": {
                      "type": "specific",
                      "startTime": "2024-01-10T21:00:00.000Z"
                    },
                    "apply": {
                      "type": "reservation",
                      "listingId": "5fba2d97d8e638002d76d842",
                      "reservationId": "9fba3d97d8e62500Gd7f6d842"
                    },
                    "assignedToMyGroup": false
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