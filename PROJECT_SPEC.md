# FieldOps — Retail Field Engineer Assistant

## 1. Project Overview

**FieldOps** is a web application for field service engineers who support IT and retail infrastructure across supermarkets, warehouses, production sites, and other distributed locations.

The system helps engineers:

- receive and manage incidents;
- view assigned stores and service locations;
- inspect installed equipment;
- follow troubleshooting checklists;
- track maintenance history;
- record the result of an on-site visit;
- simulate device health and failures;
- use an AI assistant for diagnostics;
- monitor the current status of store infrastructure.

This project is designed as a realistic portfolio project inspired by the work of retail IT support and field service engineers.

The application must not depend on any proprietary systems or real company data. All stores, equipment, incidents, employees, IP addresses, serial numbers, and other infrastructure data must be fictional.

---

# 2. Project Goals

The project should demonstrate knowledge of:

- TypeScript;
- modern frontend development;
- backend development;
- REST API design;
- PostgreSQL;
- authentication and authorization;
- distributed retail infrastructure;
- networking basics;
- incident management;
- field engineer workflows;
- equipment inventory;
- real-time updates;
- device monitoring;
- troubleshooting logic;
- AI-assisted diagnostics;
- Docker;
- production deployment.

The main goal is not to build another generic CRUD application.

FieldOps should look and behave like an internal enterprise tool used by an IT department supporting a large retail network.

---

# 3. Product Concept

A retail company has many locations:

- supermarkets;
- warehouses;
- production facilities;
- offices.

Each location contains IT and retail equipment.

Examples:

- POS terminals;
- PCs;
- laptops;
- DIGI-like scales;
- Bizerba-like scales;
- barcode scanners;
- fiscal devices;
- receipt printers;
- office printers;
- multifunction printers;
- handheld terminals / TSD;
- network switches;
- routers;
- access points;
- IP phones;
- cameras.

Employees report incidents.

Some incidents can be solved remotely.

Other incidents require a field engineer to visit the location.

FieldOps focuses on the work of the field engineer.

---

# 4. Main User Scenario

Example:

```text
Store employee
    ↓
Creates incident
    ↓
Support / Dispatcher
    ↓
Assigns incident to Field Engineer
    ↓
Engineer opens FieldOps
    ↓
Sees store + equipment + incident history
    ↓
Travels to location
    ↓
Runs diagnostic checklist
    ↓
Finds root cause
    ↓
Fixes / replaces / escalates issue
    ↓
Writes resolution
    ↓
Closes incident
```

Example incident:

```text
INC-1042

Location:
Store #014

Equipment:
Scale-03

Type:
Retail Scale

Vendor:
DIGI

Problem:
New PLU data is not being received.

Priority:
Medium

Status:
Assigned
```

---

# 5. Project Name

Product name:

**FieldOps**

Repository name:

```text
fieldops
```

Optional GitHub description:

> Retail field engineer assistant for incident management, equipment monitoring, diagnostics, maintenance history and on-site support workflows.

---

# 6. Suggested Tech Stack

## Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

## Maps

- MapLibre GL JS

## Backend

Preferred option:

- Next.js Route Handlers / Server Actions

Alternative for a larger architecture:

- NestJS

For the MVP, prefer a single Next.js full-stack application.

## Database

- PostgreSQL
- Prisma ORM

## Authentication

- Auth.js

Roles:

- ADMIN
- DISPATCHER
- FIELD_ENGINEER
- SUPPORT_ENGINEER
- VIEWER

## Realtime

Possible options:

- Server-Sent Events
- WebSocket
- Socket.IO

For the first version, polling is acceptable.

## AI

Use an abstract AI provider interface.

Example:

```ts
interface DiagnosticAIProvider {
  analyzeIncident(input: DiagnosticInput): Promise<DiagnosticSuggestion>;
}
```

The application must work without AI configured.

AI is an optional feature, not a core dependency.

## Deployment

- Docker
- Docker Compose
- Nginx
- PostgreSQL
- VPS

---

# 7. High-Level Architecture

```text
Browser
   │
   ▼
Next.js Application
   │
   ├── UI
   ├── API
   ├── Authentication
   ├── Incident Service
   ├── Equipment Service
   ├── Location Service
   ├── Diagnostic Service
   │
   ▼
PostgreSQL
   │
   ├── users
   ├── locations
   ├── devices
   ├── incidents
   ├── maintenance
   ├── diagnostic_sessions
   └── knowledge_base
```

Optional:

```text
Device Simulator
       │
       ▼
Monitoring API
       │
       ▼
FieldOps
```

---

# 8. Core Modules

## 8.1 Dashboard

The main dashboard should provide a quick overview.

Display:

- total locations;
- open incidents;
- critical incidents;
- assigned incidents;
- devices online;
- devices offline;
- incidents waiting for field visit;
- engineer workload.

Example:

```text
Open incidents        23
Critical               3
Assigned to me         6
Offline devices       11
Locations with issues  8
```

Also display:

- recent incidents;
- today's visits;
- equipment alerts;
- locations with the largest number of issues.

---

# 9. Locations

A location can be:

```text
STORE
WAREHOUSE
PRODUCTION
OFFICE
```

Location fields:

```text
id
name
code
type
address
city
latitude
longitude
phone
status
createdAt
updatedAt
```

Example:

```text
Store #014
Amsterdam Demo District
STORE

Devices: 28
Open incidents: 3
Critical incidents: 1
```

---

# 10. Map

Use MapLibre.

Display all locations on a map.

Marker status:

```text
Green  — no active incidents
Yellow — non-critical incidents
Red    — critical incident
Gray   — location disabled
```

Clicking a marker opens a small preview:

- location name;
- address;
- open incident count;
- device count;
- button: Open location.

---

# 11. Location Details Page

Route:

```text
/locations/[id]
```

Tabs:

```text
Overview
Equipment
Incidents
Maintenance
Network
```

Overview:

- address;
- location type;
- status;
- equipment count;
- active incidents;
- last service visit.

---

# 12. Equipment Inventory

Equipment categories:

```text
POS
PC
LAPTOP
SCALE
BARCODE_SCANNER
FISCAL_DEVICE
RECEIPT_PRINTER
OFFICE_PRINTER
MFP
TSD
SWITCH
ROUTER
ACCESS_POINT
IP_PHONE
CAMERA
OTHER
```

Device fields:

```text
id
assetTag
name
category
vendor
model
serialNumber
locationId

ipAddress
macAddress
hostname

status
monitoringStatus

installedAt
warrantyUntil

notes

createdAt
updatedAt
```

---

# 13. Equipment Status

Statuses:

```text
ONLINE
OFFLINE
DEGRADED
MAINTENANCE
UNKNOWN
RETIRED
```

Example device card:

```text
DIGI-SCALE-03

Vendor:
DIGI

Model:
Demo Scale 500

IP:
10.14.20.35

Status:
ONLINE

PLU sync:
FAILED

Last seen:
2 minutes ago
```

---

# 14. Retail Scale Support

Do not use proprietary implementations.

Create generic equipment profiles inspired by common retail scales.

Supported demo vendors:

```text
DIGI
BIZERBA
GENERIC
```

Scale-specific data:

```text
pluSyncStatus
lastPluSyncAt
printerStatus
paperStatus
scaleStatus
firmwareVersion
```

Example:

```text
Weight sensor: OK
Network: OK
Printer: OK
PLU sync: FAILED
```

---

# 15. Typical Scale Incidents

Include sample incidents.

## Scale offline

Possible diagnostic flow:

```text
1. Check device power.
2. Check Ethernet cable.
3. Check link indication.
4. Confirm IP address.
5. Ping the scale.
6. Confirm subnet configuration.
7. Check gateway.
8. Check switch port.
9. Check for duplicate IP.
```

## PLU data not updating

```text
1. Verify network connectivity.
2. Ping the device.
3. Check whether other scales receive PLU updates.
4. Check last successful sync.
5. Validate device identifier.
6. Check sync service.
7. Inspect application logs.
8. Escalate if multiple stores are affected.
```

## Scale printer does not print

```text
1. Check labels.
2. Check printer cover.
3. Check paper path.
4. Check printer status.
5. Check sensor status.
6. Clean printer components if allowed.
7. Test print.
8. Escalate hardware failure.
```

---

# 16. POS Equipment

Example POS workstation:

```text
POS Terminal
├── Windows
├── POS software
├── Barcode scanner
├── Fiscal device
├── Receipt printer
├── Customer display
└── Payment terminal
```

The application should allow linking child devices to a parent POS workstation.

Example:

```text
POS-03
├── Scanner-03
├── Fiscal-03
└── Printer-03
```

---

# 17. Incidents

Incident fields:

```text
id
number
title
description

priority
status
category

locationId
deviceId

createdById
assignedToId

createdAt
assignedAt
startedAt
resolvedAt
closedAt

resolution
rootCause
```

Incident number format:

```text
INC-000001
INC-000002
```

---

# 18. Incident Priorities

```text
P1_CRITICAL
P2_HIGH
P3_MEDIUM
P4_LOW
```

Examples:

### P1

```text
All checkout systems unavailable.
Store cannot process sales.
```

### P2

```text
Several checkout systems unavailable.
```

### P3

```text
One scale cannot receive PLU data.
```

### P4

```text
Planned PC replacement.
```

---

# 19. Incident Statuses

```text
NEW
TRIAGE
ASSIGNED
IN_PROGRESS
ON_SITE
WAITING
ESCALATED
RESOLVED
CLOSED
CANCELLED
```

Flow:

```text
NEW
 ↓
TRIAGE
 ↓
ASSIGNED
 ↓
IN_PROGRESS
 ↓
ON_SITE
 ↓
RESOLVED
 ↓
CLOSED
```

Alternative:

```text
IN_PROGRESS
 ↓
ESCALATED
```

---

# 20. Incident Details Page

Route:

```text
/incidents/[id]
```

Layout:

## Header

```text
INC-1042
Scale is not receiving PLU updates

P3 MEDIUM
ASSIGNED
```

## Information

- location;
- device;
- assigned engineer;
- reporter;
- creation time;
- SLA;
- description.

## Timeline

```text
09:20 Incident created
09:25 Assigned to L1
09:40 Remote troubleshooting failed
09:45 Assigned to Field Engineer
11:10 Engineer arrived
11:32 Network problem found
11:44 Incident resolved
```

## Actions

```text
Accept
Start work
Arrived on site
Escalate
Resolve
Close
```

---

# 21. Field Engineer Workspace

Route:

```text
/my-work
```

Show:

- assigned incidents;
- today's visits;
- priority;
- addresses;
- travel order;
- current incident.

Example:

```text
Today

09:30 Store #014
Scale PLU sync failed

12:00 Store #027
POS scanner unavailable

15:00 Warehouse #002
Printer replacement
```

---

# 22. Visit Management

Create entity:

```text
ServiceVisit
```

Fields:

```text
id
incidentId
engineerId
locationId

scheduledAt
arrivedAt
completedAt

travelNotes
workPerformed
result
```

Visit statuses:

```text
PLANNED
TRAVELING
ON_SITE
COMPLETED
CANCELLED
```

---

# 23. Maintenance History

Each device should have a service history.

Example:

```text
DIGI-SCALE-03

2026-10-02
Ethernet cable replaced

2026-09-14
Printer sensor cleaned

2026-08-21
PLU synchronization issue
IP configuration corrected

2026-07-03
Preventive maintenance
```

Entity:

```text
MaintenanceRecord
```

Fields:

```text
id
deviceId
engineerId
incidentId

type
description
result

performedAt
```

Maintenance types:

```text
DIAGNOSTIC
REPAIR
REPLACEMENT
PREVENTIVE
CONFIGURATION
CLEANING
SOFTWARE
NETWORK
```

---

# 24. Troubleshooting Checklists

Create reusable diagnostic templates.

Entity:

```text
DiagnosticTemplate
```

Example:

```text
Scale does not receive PLU
```

Steps:

```text
1. Check power.
2. Check Ethernet.
3. Verify IP.
4. Ping device.
5. Check other scales.
6. Check last PLU sync.
7. Check sync service.
8. Review logs.
```

Engineers can mark steps:

```text
PASS
FAIL
SKIPPED
NOT_APPLICABLE
```

---

# 25. Diagnostic Session

When an engineer starts diagnostics, create:

```text
DiagnosticSession
```

Fields:

```text
id
incidentId
templateId
engineerId
startedAt
completedAt
summary
```

Step result:

```text
DiagnosticStepResult
```

Fields:

```text
id
sessionId
stepId
status
comment
value
```

Example:

```text
Ethernet connected        PASS
Ping 10.14.20.35          FAIL
Switch port               PASS
Duplicate IP              PASS
```

---

# 26. Knowledge Base

Route:

```text
/knowledge
```

Categories:

```text
Windows
Networking
POS
Scales
TSD
Printers
Fiscal devices
Service Desk
```

Example article:

```text
DIGI-like scale is not receiving PLU updates
```

Article structure:

```text
Symptoms
Possible causes
Diagnostic steps
Resolution
Escalation criteria
```

Support search.

---

# 27. Networking Module

Each location may have basic network data.

Do not implement real network scanning.

Use simulated data only.

Example:

```text
Store #014

Subnet:
10.14.20.0/24

Gateway:
10.14.20.1

Devices:
10.14.20.20 POS-01
10.14.20.21 POS-02
10.14.20.35 SCALE-03
10.14.20.40 PRINTER-01
```

Optional network diagram.

---

# 28. Device Simulator

Create a separate service or internal module that simulates retail equipment.

Purpose:

- demonstrate monitoring;
- generate failures;
- update device health;
- create realistic demo scenarios.

The simulator must not perform real network scans.

---

# 29. Simulator Device State

Example:

```json
{
  "deviceId": "scale-03",
  "online": true,
  "latency": 14,
  "health": "degraded",
  "pluSync": false,
  "printer": "ok",
  "lastSeen": "2026-10-04T12:30:00Z"
}
```

---

# 30. Simulator Scenarios

Create predefined demo scenarios.

## Scenario A — Scale network failure

```text
Scale online → offline
Ping fails
PLU sync fails
```

## Scenario B — PLU synchronization failure

```text
Scale online
Ping works
PLU sync fails
```

## Scenario C — Printer problem

```text
Scale online
PLU sync OK
Printer error
```

## Scenario D — Store-wide outage

```text
All devices at location become unreachable
```

## Scenario E — POS peripheral failure

```text
POS online
Barcode scanner unavailable
```

---

# 31. Monitoring

Monitoring page:

```text
/monitoring
```

Display:

- devices online;
- devices offline;
- degraded devices;
- active alerts;
- last heartbeat.

Example:

```text
172 devices

ONLINE      158
DEGRADED      8
OFFLINE       6
```

---

# 32. Alerts

Entity:

```text
Alert
```

Fields:

```text
id
deviceId
locationId
type
severity
message
createdAt
resolvedAt
```

Severity:

```text
INFO
WARNING
CRITICAL
```

---

# 33. AI Diagnostic Assistant

AI should help the engineer reason about incidents.

It must not automatically close incidents.

Example input:

```text
Device:
Retail Scale

Symptoms:
Device powers on.
Weight measurement works.
New products are missing.
Other scales in the same store work normally.

Network:
Ping failed.
Ethernet link is active.
```

Example AI output:

```text
The issue is likely local to this device.

Recommended next checks:

1. Verify the configured IP address.
2. Confirm subnet mask.
3. Check for duplicate IP.
4. Check switch port/VLAN.
5. Compare network settings with another working scale.
```

---

# 34. AI Rules

AI must:

- use incident data;
- use equipment data;
- use diagnostic step results;
- reference knowledge base articles;
- suggest next steps;
- explain reasoning briefly.

AI must not:

- invent credentials;
- perform real infrastructure actions;
- scan networks;
- change production equipment;
- claim certainty without evidence.

---

# 35. AI Architecture

```text
Incident
   +
Device
   +
Diagnostic Results
   +
Knowledge Base
       ↓
Diagnostic Context Builder
       ↓
AI Provider
       ↓
Structured Suggestion
```

Response schema:

```ts
type DiagnosticSuggestion = {
  summary: string;
  likelyCauses: {
    title: string;
    confidence: "low" | "medium" | "high";
    explanation: string;
  }[];
  nextSteps: {
    order: number;
    action: string;
    reason: string;
  }[];
  escalationRecommended: boolean;
};
```

---

# 36. Users and Roles

## ADMIN

Can:

- manage users;
- manage locations;
- manage devices;
- manage templates;
- access all incidents.

## DISPATCHER

Can:

- create incidents;
- assign engineers;
- schedule visits;
- change priority.

## SUPPORT_ENGINEER

Can:

- triage incidents;
- perform remote diagnostics;
- escalate to field support.

## FIELD_ENGINEER

Can:

- see assigned incidents;
- start visits;
- run diagnostics;
- add maintenance records;
- resolve incidents.

## VIEWER

Read-only access.

---

# 37. Database Schema

Suggested Prisma models:

```text
User
Location
Device
Incident
IncidentComment
IncidentEvent
ServiceVisit
MaintenanceRecord
DiagnosticTemplate
DiagnosticStep
DiagnosticSession
DiagnosticStepResult
KnowledgeArticle
Alert
DeviceHeartbeat
```

---

# 38. Relationships

```text
Location
 ├── Devices
 ├── Incidents
 └── ServiceVisits

Device
 ├── Location
 ├── Incidents
 ├── MaintenanceRecords
 ├── Alerts
 └── Heartbeats

Incident
 ├── Location
 ├── Device
 ├── Reporter
 ├── AssignedEngineer
 ├── Comments
 ├── Events
 ├── DiagnosticSessions
 └── ServiceVisit
```

---

# 39. API Design

Suggested endpoints.

## Authentication

```text
POST /api/auth/*
```

## Locations

```text
GET    /api/locations
POST   /api/locations
GET    /api/locations/:id
PATCH  /api/locations/:id
```

## Devices

```text
GET    /api/devices
POST   /api/devices
GET    /api/devices/:id
PATCH  /api/devices/:id

GET    /api/locations/:id/devices
```

## Incidents

```text
GET    /api/incidents
POST   /api/incidents
GET    /api/incidents/:id
PATCH  /api/incidents/:id

POST /api/incidents/:id/assign
POST /api/incidents/:id/start
POST /api/incidents/:id/escalate
POST /api/incidents/:id/resolve
POST /api/incidents/:id/close
```

## Visits

```text
GET  /api/visits
POST /api/visits

POST /api/visits/:id/start-travel
POST /api/visits/:id/arrive
POST /api/visits/:id/complete
```

## Diagnostics

```text
GET  /api/diagnostic-templates
POST /api/incidents/:id/diagnostics

PATCH /api/diagnostics/:id/steps/:stepId
POST  /api/diagnostics/:id/complete
```

## Monitoring

```text
GET /api/monitoring
GET /api/alerts
```

## AI

```text
POST /api/incidents/:id/ai-diagnosis
```

---

# 40. Search

Global search should support:

- incident number;
- device name;
- IP address;
- asset tag;
- serial number;
- location name;
- location code.

Shortcut:

```text
Ctrl + K
```

---

# 41. UI Requirements

Design should feel like a professional internal enterprise application.

Avoid:

- excessive gradients;
- gaming UI;
- overly decorative animations;
- giant marketing blocks.

Prefer:

- dense but readable interfaces;
- tables;
- status badges;
- dashboards;
- cards;
- filters;
- timelines;
- side panels;
- responsive layouts.

---

# 42. Main Navigation

Desktop sidebar:

```text
FieldOps

Dashboard

Operations
  Incidents
  My Work
  Visits

Infrastructure
  Locations
  Equipment
  Monitoring
  Alerts

Knowledge
  Knowledge Base
  Diagnostics

Administration
  Users
  Settings
```

---

# 43. Dashboard Layout

Example:

```text
┌─────────────────────────────────────────────┐
│ FieldOps                         User       │
├──────────┬──────────────────────────────────┤
│ Sidebar  │ Dashboard                         │
│          │                                   │
│          │ [Open] [Critical] [Offline]      │
│          │                                   │
│          │ Recent incidents                  │
│          │                                   │
│          │ Map                               │
│          │                                   │
│          │ Today's visits                    │
└──────────┴──────────────────────────────────┘
```

---

# 44. Seed Data

Create realistic demo data.

Locations:

```text
12 stores
2 warehouses
1 production site
1 office
```

Devices:

```text
120+ devices
```

Example brands:

```text
DIGI
Bizerba
Zebra
Honeywell
Epson
HP
Cisco
Ubiquiti
Generic
```

Do not imply these brands are used by any specific real company.

---

# 45. Demo Accounts

Create:

```text
admin@fieldops.local
dispatcher@fieldops.local
support@fieldops.local
engineer@fieldops.local
viewer@fieldops.local
```

Passwords should only be used in local/demo seed data.

---

# 46. Demo Incident Scenarios

Seed at least 15 incidents.

Examples:

```text
Scale not receiving PLU updates
Receipt printer unavailable
Barcode scanner not detected
POS workstation has no network
Windows workstation cannot boot
TSD cannot connect to Wi-Fi
Office printer queue is stuck
Fiscal device unavailable
Store router unreachable
Multiple POS terminals offline
```

---

# 47. MVP

The first usable version must include:

- authentication;
- dashboard;
- locations;
- MapLibre map;
- equipment inventory;
- incident list;
- incident details;
- incident assignment;
- field engineer workspace;
- service visits;
- diagnostic checklists;
- maintenance history;
- seed data;
- PostgreSQL;
- Docker.

Do not implement AI before the core MVP works.

---

# 48. Development Phases

## Phase 1 — Project Foundation

Implement:

- Next.js;
- TypeScript;
- Tailwind;
- shadcn/ui;
- Prisma;
- PostgreSQL;
- Docker;
- Auth.js;
- project structure.

---

## Phase 2 — Locations and Equipment

Implement:

- locations CRUD;
- MapLibre;
- device inventory;
- device details;
- location details.

---

## Phase 3 — Incident Management

Implement:

- incidents;
- priorities;
- statuses;
- assignments;
- comments;
- incident timeline.

---

## Phase 4 — Field Engineer Workflow

Implement:

- My Work;
- service visits;
- travel status;
- arrival;
- repair notes;
- resolution workflow.

---

## Phase 5 — Diagnostics

Implement:

- diagnostic templates;
- step-by-step sessions;
- troubleshooting results;
- maintenance records.

---

## Phase 6 — Device Simulator

Implement:

- heartbeats;
- online/offline state;
- PLU sync simulation;
- printer errors;
- predefined failure scenarios.

---

## Phase 7 — Monitoring

Implement:

- monitoring dashboard;
- alerts;
- realtime/polling;
- location status.

---

## Phase 8 — AI Assistant

Implement:

- diagnostic context;
- AI abstraction;
- structured results;
- recommended next steps.

---

## Phase 9 — Production Quality

Implement:

- tests;
- loading states;
- error handling;
- validation;
- audit events;
- responsive layout;
- README;
- screenshots;
- demo GIF.

---

# 49. Suggested Folder Structure

```text
fieldops/
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   ├── incidents/
│   ├── locations/
│   ├── equipment/
│   ├── monitoring/
│   ├── knowledge/
│   ├── my-work/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── incidents/
│   ├── locations/
│   ├── equipment/
│   ├── diagnostics/
│   ├── monitoring/
│   └── maps/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── validation/
│   ├── incidents/
│   ├── diagnostics/
│   ├── monitoring/
│   └── ai/
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
├── simulator/
│
├── public/
│
├── tests/
│
├── docker-compose.yml
├── Dockerfile
├── README.md
└── PROJECT_SPEC.md
```

---

# 50. Coding Requirements

Use:

- strict TypeScript;
- ESLint;
- Prettier;
- Zod validation;
- reusable components;
- clear domain types;
- service layer where useful;
- database transactions for critical operations.

Avoid:

- giant page components;
- duplicated logic;
- hardcoded mock values inside UI;
- `any` unless absolutely necessary;
- mixing database logic directly into visual components.

---

# 51. Audit Trail

Important actions should generate events.

Example:

```text
Incident created
Priority changed
Engineer assigned
Work started
Engineer arrived
Diagnostic completed
Incident escalated
Incident resolved
Incident closed
```

Entity:

```text
IncidentEvent
```

---

# 52. Filters

Incident page filters:

```text
Status
Priority
Location
Engineer
Equipment type
Created date
```

Equipment filters:

```text
Location
Category
Vendor
Status
IP
```

---

# 53. SLA

Optional but recommended.

Example:

```text
P1
Response: 10 min
Resolution target: 1 hour

P2
Response: 30 min
Resolution target: 4 hours

P3
Response: 2 hours
Resolution target: 1 business day

P4
Response: 8 hours
Resolution target: planned
```

Display:

```text
SLA remaining: 01:42
```

---

# 54. Escalation

An engineer can escalate an incident.

Reasons:

```text
SOFTWARE
SERVER
NETWORK
DATABASE
VENDOR
HARDWARE_REPAIR
SECURITY
OTHER
```

Example:

```text
Scale reachable: yes
PLU sync failing: yes
Other stores affected: yes

Escalation:
APPLICATION / L2
```

---

# 55. Root Cause Categories

```text
POWER
CABLING
NETWORK
CONFIGURATION
DRIVER
OPERATING_SYSTEM
APPLICATION
DATABASE
SERVER
HARDWARE
USER_ERROR
VENDOR
UNKNOWN
```

Useful for analytics later.

---

# 56. Analytics

Optional dashboard:

- incidents by category;
- incidents by location;
- most unreliable devices;
- recurring failures;
- mean time to resolve;
- engineer workload;
- top root causes.

---

# 57. QR Code Feature

Optional.

Each device can have a QR code.

Example:

```text
fieldops.local/equipment/device-123
```

Engineer scans the QR code and immediately opens:

- device details;
- IP;
- history;
- open incidents;
- diagnostic actions.

---

# 58. Mobile Support

Field engineers may use the system from a phone.

Critical pages must be mobile-friendly:

- My Work;
- Incident details;
- Location details;
- Equipment details;
- Diagnostic checklist;
- Visit workflow.

---

# 59. Offline Mode — Future Feature

Possible future feature:

Allow the engineer to open an assigned visit before traveling and cache:

- incident details;
- location details;
- equipment;
- diagnostic checklist.

Sync after connectivity returns.

Do not include this in MVP.

---

# 60. README Requirements

README should contain:

- short description;
- screenshots;
- architecture;
- feature list;
- tech stack;
- local setup;
- Docker setup;
- environment variables;
- demo credentials;
- roadmap;
- disclaimer that all data is fictional.

---

# 61. GitHub Presentation

Repository should look professional.

Add:

```text
README.md
PROJECT_SPEC.md
LICENSE
.env.example
docker-compose.yml
```

README header example:

```md
# FieldOps

FieldOps is a retail field service engineering platform for managing incidents,
store infrastructure, equipment diagnostics and on-site maintenance workflows.
```

---

# 62. Important Disclaimer

This project is a portfolio project.

It must not:

- claim to be an official product of any retailer;
- use real internal company data;
- include real store infrastructure;
- contain production IP addresses;
- use proprietary documentation without permission;
- imply affiliation with Azbuka Vkusa, Magnit, DIGI, Bizerba, Naumen or any other company.

Brand names may only be used as examples where legally appropriate.

Prefer fictional demo vendors where possible.

---

# 63. Codex Instructions

Codex must work incrementally.

Do not attempt to build the entire application in one step.

For every phase:

1. inspect the existing repository;
2. propose the minimal architecture needed;
3. implement only the requested phase;
4. run lint;
5. run TypeScript checks;
6. run tests where available;
7. verify the build;
8. summarize changes.

Do not remove working functionality unless necessary.

Do not introduce unnecessary dependencies.

Prefer simple, maintainable solutions.

---

# 64. First Codex Task

Start with Phase 1.

Prompt:

```text
Read PROJECT_SPEC.md completely.

Create the initial FieldOps project foundation.

Requirements:

- Next.js latest stable version
- App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- Prisma
- PostgreSQL
- Auth.js
- Zod
- ESLint
- Prettier
- Dockerfile
- docker-compose.yml
- .env.example

Create a professional enterprise dashboard layout with a sidebar and header.

Create placeholder routes:

/dashboard
/incidents
/my-work
/locations
/equipment
/monitoring
/knowledge

Do not implement business logic yet.

Create the initial Prisma schema with:
User
Location
Device
Incident

Add seed data with:
- 5 demo locations
- 20 demo devices
- 5 incidents
- demo users for each role

Verify:
- TypeScript
- lint
- production build
- Prisma schema

At the end, summarize the project structure and suggest the next implementation step.
```

---

# 65. Definition of Success

The project is successful when a recruiter or engineering manager can open it and immediately understand:

> This developer understands not only frontend development, but also how IT support, retail infrastructure, equipment diagnostics, incidents and field engineering workflows work in a distributed business.

The final project should feel like a realistic internal IT product rather than a tutorial application.
